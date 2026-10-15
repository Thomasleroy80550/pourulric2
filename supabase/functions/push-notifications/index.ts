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

    // Les diffusions nécessitent une session administrateur vérifiée ; les triggers restent inchangés.
    if (req.method === "POST") {
      const { action, user_id, message, link, title } = await req.json();
      const broadcast = action === "broadcast";
      if (broadcast) {
        const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return jsonResponse({ error: "Unauthorized" }, 401);
        const { data: { user }, error: authError } = await admin.auth.getUser(token);
        if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);
        const { data: profile, error: profileError } = await admin.from("profiles")
          .select("role").eq("id", user.id).maybeSingle();
        if (profileError || profile?.role !== "admin") {
          return jsonResponse({ error: "Envoi réservé aux administrateurs." }, 403);
        }
        console.log("[push-notifications] Broadcast requested", { adminId: user.id });
      } else {
        const providedSecret = req.headers.get("x-push-secret");
        const storedSecret = await getConfig(admin, "trigger_secret");
        if (!providedSecret || !storedSecret || providedSecret !== storedSecret) {
          console.warn("[push-notifications] Rejected POST: invalid secret");
          return jsonResponse({ error: "Unauthorized" }, 401);
        }
      }

      if ((!broadcast && !user_id) || typeof message !== "string" || !message.trim() || message.length > 2000) {
        return jsonResponse({ error: "Message requis (2 000 caractères maximum)." }, 400);
      }
      if (broadcast && (typeof title !== "string" || !title.trim() || title.length > 100 ||
        typeof link !== "string" || !/^\/(?!\/)/.test(link) || /[\\\\\s]/.test(link))) {
        return jsonResponse({ error: "Titre requis (100 caractères maximum) et lien interne valide requis." }, 400);
      }

      const { publicKey, privateKey } = await ensureVapidKeys(admin);
      webpush.setVapidDetails("mailto:contact@hellokeys.fr", publicKey, privateKey);
      const payload = JSON.stringify({
        title: broadcast ? title.trim() : "Hello Keys",
        body: message.trim(),
        url: link && link !== "#" ? link : "/",
      });

      let sent = 0;
      let failed = 0;
      let expired = 0;
      let cursor: string | null = null;
      // Pagination par clé : la suppression des abonnements expirés ne décale pas les pages.
      while (true) {
        let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth")
          .order("id").limit(200);
        if (!broadcast) query = query.eq("user_id", user_id);
        if (cursor) query = query.gt("id", cursor);
        const { data: subscriptions, error } = await query;
        if (error) {
          console.error("[push-notifications] Failed to load subscriptions", { error });
          return jsonResponse({ error: "Lecture des appareils interrompue.", sent, failed, expired }, 500);
        }
        if (!subscriptions?.length) break;
        cursor = subscriptions[subscriptions.length - 1].id;
        for (let offset = 0; offset < subscriptions.length; offset += 20) {
          await Promise.all(subscriptions.slice(offset, offset + 20).map(async (sub) => {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400, timeout: 10000 });
              sent++;
            } catch (err: any) {
              const statusCode = err?.statusCode;
              console.error("[push-notifications] Push send failed", { statusCode });
              if (statusCode === 404 || statusCode === 410) {
                expired++;
                await admin.from("push_subscriptions").delete().eq("id", sub.id);
              } else {
                failed++;
              }
            }
          }));
        }
      }
      console.log("[push-notifications] Done", { broadcast, user_id, sent, failed, expired });
      return jsonResponse({ sent, failed, expired, total: sent + failed + expired });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("[push-notifications] Unexpected error", { err: String(err) });
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
