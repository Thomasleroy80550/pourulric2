import { supabase } from "@/integrations/supabase/client";

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

export function getLockDeviceKey(userId: string) {
  const storageKey = `hk-pwa-device-key:${userId}`;
  let key = localStorage.getItem(storageKey);
  if (!key) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(storageKey, key);
  }
  return key;
}

export function readSavedDevice(userId: string | null) {
  if (!userId) return null;
  try {
    const deviceId = localStorage.getItem(`hk-pwa-device:${userId}`);
    const deviceKey = localStorage.getItem(`hk-pwa-device-key:${userId}`);
    return deviceId && deviceKey && /^[0-9a-f]{64}$/.test(deviceKey) ? { deviceId, deviceKey } : null;
  } catch { return null; }
}

export async function lockRequest(deviceId: string, action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("pwa-unlock", {
    body: { deviceId, action, ...extra },
  });
  if (error) {
    let message = "Connexion nécessaire pour vérifier le code. Vérifiez votre réseau puis réessayez.";
    if (error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null);
      if (typeof payload?.error === "string") message = payload.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function forgetDeviceLock(userId: string) {
  const deviceId = localStorage.getItem(`hk-pwa-device:${userId}`);
  const deviceKey = localStorage.getItem(`hk-pwa-device-key:${userId}`);
  if (deviceId) await lockRequest(deviceId, "forget", { deviceKey });
  localStorage.removeItem(`hk-pwa-device:${userId}`);
  localStorage.removeItem(`hk-pwa-device-key:${userId}`);
  localStorage.removeItem("hk-pwa-lock-user");
  window.dispatchEvent(new Event("hk-device-lock-forgotten"));
}
