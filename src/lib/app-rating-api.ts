import { supabase } from "@/integrations/supabase/client";

export interface AppRating {
  user_id: string;
  rating: number;
  comment: string | null;
  updated_at: string;
}

export interface AdminAppRating extends AppRating {
  profiles: { first_name: string | null; last_name: string | null } | null;
}

/** Note de l'utilisateur connecté, s'il a déjà noté l'app. */
export async function getMyAppRating(): Promise<AppRating | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_ratings")
    .select("user_id, rating, comment, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching app rating:", error);
    return null;
  }
  return data as AppRating | null;
}

/** Enregistre ou met à jour la note de l'utilisateur connecté. */
export async function upsertAppRating(rating: number, comment: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Vous devez être connecté.");

  const { error } = await supabase.from("app_ratings").upsert(
    {
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Error saving app rating:", error);
    throw new Error("Impossible d'enregistrer votre note.");
  }
}

/** Toutes les notes avec le nom du client. Admin uniquement (RLS). */
export async function adminGetAppRatings(): Promise<AdminAppRating[]> {
  const { data, error } = await supabase
    .from("app_ratings")
    .select("user_id, rating, comment, updated_at, profiles (first_name, last_name)")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching app ratings:", error);
    throw new Error("Impossible de récupérer les notes de l'application.");
  }
  return (data || []) as unknown as AdminAppRating[];
}
