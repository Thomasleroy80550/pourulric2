import { supabase } from "@/integrations/supabase/client";

export interface MigrationNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getMigrationNotes(): Promise<MigrationNote[]> {
  const { data, error } = await supabase.from("migration_notes").select("*").order("created_at", { ascending: false }).order("id", { ascending: false });
  if (error) throw new Error("Impossible de charger les notes de migration.");
  return data;
}

export async function saveMigrationNote(content: string, id?: string): Promise<void> {
  const text = content.trim();
  if (!text || text.length > 2000) throw new Error("La note doit contenir entre 1 et 2 000 caractères.");
  const result = id
    ? await supabase.from("migration_notes").update({ content: text, updated_at: new Date().toISOString() }).eq("id", id).select("id").single()
    : await supabase.from("migration_notes").insert({ content: text }).select("id").single();
  if (result.error) throw new Error("Impossible de publier la note.");
}

export async function deleteMigrationNote(id: string): Promise<void> {
  const { error } = await supabase.from("migration_notes").delete().eq("id", id).select("id").single();
  if (error) throw new Error("Impossible de supprimer la note.");
}

export function formatMigrationNoteDate(date: string): string {
  return new Date(date).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
