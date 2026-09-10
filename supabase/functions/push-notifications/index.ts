import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-secret",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function base64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getConfig(admin: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await admin
    .from("push_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

async function ensureVapidKeys(
  admin: SupabaseClient,
): Promise<{ publicKey: string; privateKey: string }> {
  const publicKey = await getConfig(admin, "vapid_public_key");
  const privateKey = await getConfig(admin, "vapid_private_key");
  if (publicKey && privateKey) return { publicKey, privateKey };

  console.log("[push-notifications] Generating new VAPID key pair");
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);

  const newPublic = base64Url(rawPublic);
  const newPrivate = jwk.d as string; // already base64url

  const { error } = await admin.from("push_config").upsert([
    { key: "vapid_public_key", value: newPublic },
    { key: "vapid_private_key", value: newPrivate },
  ]);
  if (error) {
    console.error("[push-notifications] Failed to store VAPID keys", { error });
    throw new Error("Failed to store VAPID keys");
  }
  return { publicKey: newPublic, privateKey: newPrivate };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // GET: retourne la clé publique VAPID (nécessaire côté client pour s'abonner)
    if (req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const { publicKey } = await ensureVapidKeys(admin);
      return jsonResponse({ publicKey });
    }

    // POST: envoi d'une notification push (appelé par le trigger DB avec un secret partagé)
    if (req.method === "POST") {
      const providedSecret = req.headers.get("x-push-secret");
      const storedSecret = await getConfig(admin, "trigger_secret");
      if (!providedSecret || !storedSecret || providedSecret !== storedSecret) {
        console.warn("[push-notifications] Rejected POST: invalid secret");
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const { user_id, message, link } = await req.json();
      if (!user_id || !message) {
        return jsonResponse({ error: "user_id and message are required" }, 400);
      }

      const { data: subscriptions, error } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", user_id);

      if (error) {
        console.error("[push-notifications] Failed to load subscriptions", { error });
        return jsonResponse({ error: "Failed to load subscriptions" }, 500);
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log("[push-notifications] No subscriptions for user", { user_id });
        return jsonResponse({ sent: 0 });
      }

      const { publicKey, privateKey } = await ensureVapidKeys(admin);
      webpush.setVapidDetails("mailto:contact@hellokeys.fr", publicKey, privateKey);

      const payload = JSON.stringify({
        title: "Hello Keys",
        body: message,
        url: link && link !== "#" ? link : "/",
      });

      let sent = 0;
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
          sent++;
        } catch (err: any) {
          const statusCode = err?.statusCode;
          console.error("[push-notifications] Push send failed", {
            statusCode,
            endpoint: sub.endpoint?.slice(0, 60),
          });
          // Abonnement expiré ou invalide : on le supprime
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      console.log("[push-notifications] Done", { user_id, sent, total: subscriptions.length });
      return jsonResponse({ sent });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[push-notifications] Unexpected error", { err: String(err) });
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
