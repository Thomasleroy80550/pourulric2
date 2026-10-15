import { supabase } from "@/integrations/supabase/client";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export function isInstalledPwa() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function getLockDeviceId(userId: string) {
  const key = `hk-pwa-device:${userId}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function lockRequest(deviceId: string, action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("pwa-unlock", {
    body: { deviceId, action, ...extra },
  });
  if (error) {
    let message = "Connexion nécessaire pour déverrouiller. Vérifiez votre réseau puis réessayez.";
    if (error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null);
      if (typeof payload?.error === "string") message = payload.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function enableDeviceBiometrics(deviceId: string, pin: string) {
  const { options } = await lockRequest(deviceId, "register-options", { pin });
  const response = await startRegistration({ optionsJSON: options });
  await lockRequest(deviceId, "register-verify", { response });
}

export async function unlockWithBiometrics(deviceId: string) {
  const { options } = await lockRequest(deviceId, "auth-options");
  const response = await startAuthentication({ optionsJSON: options });
  await lockRequest(deviceId, "auth-verify", { response });
}
