import { supabase } from "@/integrations/supabase/client";

export interface PwaInstallRecord {
  user_id: string;
  is_installed: boolean;
  platform: string | null;
  installed_at: string | null;
  last_seen_at: string | null;
}

export const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

export const getPlatform = (): string => {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
};

export const isMobile = (): boolean => getPlatform() !== "desktop";

/**
 * Enregistre le statut PWA de l'utilisateur connecté.
 * - En mode standalone (app installée) : marque comme installée.
 * - Sinon : crée simplement une ligne "non installée" si elle n'existe pas encore
 *   (sans écraser un statut "installée" existant depuis un autre contexte).
 */
export async function reportPwaStatus(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (isStandalone()) {
    await supabase.from("pwa_installs").upsert(
      {
        user_id: user.id,
        is_installed: true,
        platform: getPlatform(),
        installed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } else {
    // Ne crée la ligne que si elle n'existe pas (ignoreDuplicates préserve un éventuel statut installé)
    await supabase.from("pwa_installs").upsert(
      {
        user_id: user.id,
        is_installed: false,
        platform: getPlatform(),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  }
}

/**
 * Marque explicitement la PWA comme installée (événement appinstalled).
 */
export async function reportPwaInstalled(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("pwa_installs").upsert(
    {
      user_id: user.id,
      is_installed: true,
      platform: getPlatform(),
      installed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/**
 * Récupère tous les statuts d'installation PWA (admin uniquement via RLS).
 */
export async function getAllPwaInstalls(): Promise<PwaInstallRecord[]> {
  const { data, error } = await supabase
    .from("pwa_installs")
    .select("*")
    .order("last_seen_at", { ascending: false });

  if (error) {
    console.error("Error fetching PWA installs:", error);
    throw new Error("Impossible de récupérer les statuts d'installation PWA.");
  }
  return data || [];
}
