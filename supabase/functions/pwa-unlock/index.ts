import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function hashPin(pin: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: decode(salt), iterations: 600000 }, key, 256);
  return encode(new Uint8Array(bits));
}
async function hashDeviceKey(value: string) {
  return encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}
function equalHash(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
const deviceExpiry = () => new Date(Date.now() + 30 * 86400000).toISOString();

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Méthode non autorisée." }, 405);
  try {
    const body = await req.json();
    if (!body || typeof body.deviceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.deviceId)) {
      return reply({ error: "Appareil invalide." }, 400);
    }
    const rawOrigin = req.headers.get("Origin");
    if (!rawOrigin) return reply({ error: "Origine manquante." }, 400);
    const originURL = new URL(rawOrigin);
    if (originURL.protocol !== "https:" && !(originURL.protocol === "http:" && ["localhost", "127.0.0.1"].includes(originURL.hostname))) {
      return reply({ error: "Une connexion HTTPS est nécessaire." }, 400);
    }
    const origin = originURL.origin;
    const url = Deno.env.get("SUPABASE_URL")!;
    const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const publicAction = ["device-status", "device-signin", "forget"].includes(body.action);
    let callerId: string | null = null;
    if (!publicAction || body.action === "forget") {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (token) {
        const { data: { user }, error } = await db.auth.getUser(token);
        if (!error && user) callerId = user.id;
      }
      if (!publicAction && !callerId) return reply({ error: "Reconnectez-vous une fois avec votre compte pour activer le code sur ce téléphone." }, 401);
    }
    let query = db.from("pwa_device_locks").select("*").eq("id", body.deviceId);
    if (!publicAction) query = query.eq("user_id", callerId!);
    const { data: device, error: readError } = await query.maybeSingle();
    if (readError) throw readError;
    const validKeyFormat = typeof body.deviceKey === "string" && /^[0-9a-f]{64}$/.test(body.deviceKey);
    const suppliedKeyHash = validKeyFormat ? await hashDeviceKey(body.deviceKey) : null;
    const ownsKey = !!device?.device_key_hash && !!suppliedKeyHash && equalHash(suppliedKeyHash, device.device_key_hash);
    if (device && device.origin !== origin) return reply({ error: "Cet appareil est associé à une autre adresse de l’application." }, 401);
    if (body.action === "forget" && !device) return reply({ forgotten: true });
    if (publicAction && !(body.action === "forget" && callerId === device?.user_id) && !ownsKey) {
      return reply({ error: "Ce téléphone n’est pas encore autorisé. Reconnectez-vous une fois avec votre compte puis entrez votre code." }, 401);
    }
    if (body.action === "forget") {
      if (device) {
        const { error } = await db.from("pwa_device_locks").delete().eq("id", device.id).eq("user_id", device.user_id);
        if (error) throw error;
      }
      console.info("[pwa-unlock] Autorisation appareil supprimée");
      return reply({ forgotten: true });
    }
    if (body.action === "status") return reply({ configured: !!device });
    if (body.action === "setup") {
      if (device) return reply({ error: "Un code est déjà enregistré sur cet appareil." }, 409);
      if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin) || !suppliedKeyHash) return reply({ error: "Code ou clé d’appareil invalide." }, 400);
      const salt = encode(crypto.getRandomValues(new Uint8Array(32)));
      const { error } = await db.from("pwa_device_locks").insert({
        id: body.deviceId, user_id: callerId, origin, pin_salt: salt, pin_hash: await hashPin(body.pin, salt),
        device_key_hash: suppliedKeyHash, device_valid_until: deviceExpiry(),
      });
      if (error) throw error;
      console.info("[pwa-unlock] Code et appareil enregistrés", { userId: callerId });
      return reply({ verified: true });
    }
    if (!device) return reply({ error: "Code non configuré." }, 404);
    if (publicAction && (!device.device_valid_until || new Date(device.device_valid_until).getTime() <= Date.now())) {
      return reply({ error: "L’autorisation de ce téléphone a expiré. Reconnectez-vous à votre compte pour la renouveler." }, 401);
    }
    if (device.total_attempts >= 10) return reply({ error: "Code bloqué après 10 essais. Utilisez « Code oublié » pour vous reconnecter à votre compte." }, 429);
    if (device.locked_until && new Date(device.locked_until).getTime() > Date.now()) {
      return reply({ error: "Trop de tentatives. Réessayez dans 5 minutes." }, 429);
    }
    if (body.action === "device-status") return reply({ configured: true });
    if (body.action !== "pin" && body.action !== "device-signin") return reply({ error: "Action invalide." }, 400);
    if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) return reply({ error: "Saisissez votre code à 4 chiffres." }, 400);
    const { data: reserved, error: reserveError } = await db.rpc("reserve_pwa_unlock_attempt", { device_id: device.id, owner_id: device.user_id });
    if (reserveError) throw reserveError;
    if (!reserved) return reply({ error: "Code temporairement ou définitivement bloqué. Réessayez plus tard ou utilisez « Code oublié »." }, 429);
    if (!equalHash(await hashPin(body.pin, device.pin_salt), device.pin_hash)) {
      console.warn("[pwa-unlock] Code refusé", { deviceId: device.id });
      return reply({ error: "Code incorrect. Blocage de 5 minutes après 5 essais, puis réinitialisation obligatoire après 10 essais consécutifs." }, 403);
    }
    let sessionTokens: { access_token: string; refresh_token: string; userId: string } | null = null;
    if (body.action === "device-signin") {
      // Une session neuve n'est émise qu'après preuve de possession de la clé ET vérification du PIN.
      const { data: accountData, error: accountError } = await db.auth.admin.getUserById(device.user_id);
      if (accountError) throw accountError;
      const account = accountData.user;
      if (!account?.email || !account.email_confirmed_at) return reply({ error: "Reconnectez-vous et confirmez votre email pour utiliser la connexion par code." }, 401);
      const { data: factors, error: factorError } = await db.auth.admin.mfa.listFactors({ userId: account.id });
      if (factorError) throw factorError;
      if (factors.factors.some(factor => factor.status === "verified")) {
        return reply({ error: "Ce compte utilise une double authentification. Reconnectez-vous avec votre compte." }, 401);
      }
      const { data: profile, error: profileError } = await db.from("profiles").select("is_banned,is_contract_terminated").eq("id", account.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile || profile.is_banned || profile.is_contract_terminated) return reply({ error: "Ce compte ne peut pas utiliser la connexion par code. Contactez Hello Keys." }, 403);
      const { data: link, error: linkError } = await db.auth.admin.generateLink({
        type: "magiclink", email: account.email, options: { redirectTo: new URL("/v4/login", origin).href },
      });
      if (linkError) throw linkError;
      if (link.user.id !== device.user_id) throw new Error("Unexpected account identity");
      const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: signedIn, error: signInError } = await authClient.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
      if (signInError) throw signInError;
      if (!signedIn.session || signedIn.user?.id !== device.user_id) throw new Error("Session identity mismatch");
      sessionTokens = { access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token, userId: signedIn.user.id };
    }
    const { data: saved, error: saveError } = await db.from("pwa_device_locks").update({
      attempts: 0, total_attempts: 0, locked_until: null, device_valid_until: deviceExpiry(),
      ...(body.action === "pin" && suppliedKeyHash ? { device_key_hash: suppliedKeyHash } : {}),
    }).eq("id", device.id).eq("user_id", device.user_id).select("id");
    if (saveError) throw saveError;
    if (!saved?.length) return reply({ error: "L’autorisation de cet appareil a été supprimée." }, 401);
    console.info("[pwa-unlock] Connexion par code validée", { userId: device.user_id, newSession: !!sessionTokens });
    return reply({ verified: true, ...(sessionTokens ? { session: sessionTokens } : {}) });
  } catch (error) {
    console.error("[pwa-unlock] Échec", { message: error instanceof Error ? error.message : "Database error" });
    return reply({ error: "Impossible de vérifier votre code. Réessayez ou reconnectez-vous à votre compte." }, 400);
  }
});
