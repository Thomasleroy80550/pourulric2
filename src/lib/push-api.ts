import { supabase } from "@/integrations/supabase/client";

/**
 * Vérifie si les notifications push sont supportées par le navigateur.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ?? null;
}

/**
 * Retourne l'abonnement push actif du navigateur, s'il existe.
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Active les notifications push : demande la permission, s'abonne
 * et enregistre l'abonnement côté serveur.
 */
export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Les notifications push ne sont pas supportées par ce navigateur.");
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error(
      "Le service worker n'est pas encore actif. Rechargez la page ou installez l'application, puis réessayez."
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("La permission de notification a été refusée.");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Vous devez être connecté.");

  // Récupère la clé publique VAPID depuis le serveur
  const { data, error } = await supabase.functions.invoke("push-notifications", {
    method: "GET",
  });
  if (error || !data?.publicKey) {
    console.error("Failed to fetch VAPID public key:", error);
    throw new Error("Impossible de récupérer la configuration push.");
  }

  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  } catch (err) {
    console.error("Push subscribe failed:", err);
    throw new Error(
      "Le service push n'est pas disponible dans cet environnement. " +
        "Ouvrez le site déployé dans Chrome, Edge ou Firefox (ou l'app installée sur l'écran d'accueil sur iPhone) et réessayez."
    );
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Abonnement push invalide.");
  }

  const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" }
  );

  if (upsertError) {
    console.error("Failed to save push subscription:", upsertError);
    throw new Error("Impossible d'enregistrer l'abonnement push.");
  }
}

/**
 * Désactive les notifications push sur cet appareil.
 */
export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    console.error("Failed to delete push subscription:", error);
  }
}
