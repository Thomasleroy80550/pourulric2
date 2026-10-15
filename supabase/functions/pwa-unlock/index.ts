import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@13.2.2";

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
function equalHash(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Méthode non autorisée." }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Reconnectez-vous à votre compte." }, 401);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return reply({ error: "Reconnectez-vous à votre compte." }, 401);
    const body = await req.json();
    if (typeof body.deviceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.deviceId)) {
      return reply({ error: "Appareil invalide." }, 400);
    }
    const rawOrigin = req.headers.get("Origin");
    if (!rawOrigin) return reply({ error: "Origine manquante." }, 400);
    const originURL = new URL(rawOrigin);
    if (originURL.protocol !== "https:" && !(originURL.protocol === "http:" && ["localhost", "127.0.0.1"].includes(originURL.hostname))) {
      return reply({ error: "Une connexion HTTPS est nécessaire." }, 400);
    }
    const origin = originURL.origin;
    const rpID = originURL.hostname;
    const { data: device, error: readError } = await db.from("pwa_device_locks").select("*")
      .eq("id", body.deviceId).eq("user_id", user.id).maybeSingle();
    if (readError) throw readError;
    if (device && device.origin !== origin) return reply({ error: "Cet appareil est associé à une autre adresse de l’application." }, 400);
    if (body.action === "status") {
      return reply({ configured: !!device, biometric: !!device?.credential, lockedUntil: device?.locked_until });
    }
    if (body.action === "setup") {
      if (device) return reply({ error: "La protection est déjà activée." }, 409);
      if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) return reply({ error: "Choisissez un code à 4 chiffres." }, 400);
      const salt = encode(crypto.getRandomValues(new Uint8Array(32)));
      const { error } = await db.from("pwa_device_locks").insert({
        id: body.deviceId, user_id: user.id, origin, pin_salt: salt, pin_hash: await hashPin(body.pin, salt),
      });
      if (error) throw error;
      console.info("[pwa-unlock] Protection activée", { userId: user.id });
      return reply({ verified: true });
    }
    if (!device) return reply({ error: "Protection non configurée." }, 404);
    if (device.locked_until && new Date(device.locked_until).getTime() > Date.now()) {
      return reply({ error: "Trop de tentatives. Réessayez dans 5 minutes.", lockedUntil: device.locked_until }, 429);
    }
    async function reserveAttempt() {
      const { data, error } = await db.rpc("reserve_pwa_unlock_attempt", { device_id: device.id, owner_id: user.id });
      if (error) throw error;
      return data === true;
    }
    async function save(values: Record<string, unknown>) {
      const { error } = await db.from("pwa_device_locks").update(values).eq("id", device.id).eq("user_id", user.id);
      if (error) throw error;
    }
    if (body.action === "pin" || body.action === "register-options") {
      if (typeof body.pin !== "string" || !/^\d{4}$/.test(body.pin)) return reply({ error: "Code à 4 chiffres requis." }, 400);
      if (!await reserveAttempt()) return reply({ error: "Trop de tentatives. Réessayez dans 5 minutes." }, 429);
      if (!equalHash(await hashPin(body.pin, device.pin_salt), device.pin_hash)) {
        console.warn("[pwa-unlock] Code incorrect", { userId: user.id });
        return reply({ error: "Code incorrect. Après 5 essais, accès bloqué pendant 5 minutes." }, 403);
      }
      await save({ attempts: 0, locked_until: null });
      if (body.action === "pin") return reply({ verified: true });
      if (device.credential) return reply({ error: "La biométrie est déjà activée." }, 409);
      const options = await generateRegistrationOptions({
        rpName: "Hello Keys", rpID, userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
        attestationType: "none",
      });
      await save({ challenge: options.challenge, challenge_kind: "register", challenge_expires_at: new Date(Date.now() + 120000).toISOString() });
      return reply({ options });
    }
    if (body.action === "auth-options") {
      if (!device.credential) return reply({ error: "Biométrie non configurée." }, 400);
      const options = await generateAuthenticationOptions({
        rpID, userVerification: "required",
        allowCredentials: [{ id: device.credential.id, transports: device.credential.transports }],
      });
      await save({ challenge: options.challenge, challenge_kind: "auth", challenge_expires_at: new Date(Date.now() + 120000).toISOString() });
      return reply({ options });
    }
    if (body.action !== "register-verify" && body.action !== "auth-verify") return reply({ error: "Action invalide." }, 400);
    const kind = body.action === "register-verify" ? "register" : "auth";
    if (!device.challenge || device.challenge_kind !== kind || new Date(device.challenge_expires_at).getTime() < Date.now()) {
      return reply({ error: "Demande expirée. Réessayez." }, 400);
    }
    if (!await reserveAttempt()) return reply({ error: "Trop de tentatives. Réessayez dans 5 minutes." }, 429);
    // Consommer le challenge avant la vérification, y compris lors d'un échec.
    const { data: consumed, error: consumeError } = await db.from("pwa_device_locks")
      .update({ challenge: null, challenge_kind: null, challenge_expires_at: null })
      .eq("id", device.id).eq("user_id", user.id).eq("challenge", device.challenge).select("id");
    if (consumeError) throw consumeError;
    if (!consumed?.length) return reply({ error: "Demande déjà utilisée. Réessayez." }, 400);
    if (kind === "register") {
      if (device.credential) return reply({ error: "Biométrie déjà configurée." }, 409);
      const result = await verifyRegistrationResponse({
        response: body.response, expectedChallenge: device.challenge, expectedOrigin: device.origin,
        expectedRPID: rpID, requireUserVerification: true,
      });
      if (!result.verified || !result.registrationInfo) return reply({ error: "Activation refusée par l’appareil." }, 403);
      const credential = result.registrationInfo.credential;
      await save({ credential: { id: credential.id, publicKey: encode(credential.publicKey), counter: credential.counter, transports: body.response.response.transports || [] }, attempts: 0, locked_until: null });
    } else {
      if (!device.credential || body.response?.id !== device.credential.id) return reply({ error: "Clé inconnue." }, 403);
      const result = await verifyAuthenticationResponse({
        response: body.response, expectedChallenge: device.challenge, expectedOrigin: device.origin,
        expectedRPID: rpID, requireUserVerification: true,
        credential: { ...device.credential, publicKey: decode(device.credential.publicKey) },
      });
      if (!result.verified) return reply({ error: "Déverrouillage refusé." }, 403);
      await save({ credential: { ...device.credential, counter: result.authenticationInfo.newCounter }, attempts: 0, locked_until: null });
    }
    console.info("[pwa-unlock] Vérification biométrique réussie", { userId: user.id, kind });
    return reply({ verified: true });
  } catch (error) {
    console.error("[pwa-unlock] Échec de la demande", { message: error instanceof Error ? error.message : "Database error" });
    return reply({ error: "Impossible de vérifier la protection. Réessayez." }, 400);
  }
});
