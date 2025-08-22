import { supabase } from "@/integrations/supabase/client";

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  category: string;
}

export type ChangelogEntryPayload = Omit<ChangelogEntry, 'id' | 'created_at'>;

// For public users
export async function getPublicChangelog(): Promise<ChangelogEntry[]> {
  const { data, error } = await supabase
    .from('changelog')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching public changelog:", error);
    throw new Error("Erreur lors de la récupération des nouveautés.");
  }
  return data || [];
}

// For admins
export async function getAllChangelog(): Promise<ChangelogEntry[]> {
  const { data, error } = await supabase
    .from('changelog')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all changelog entries:", error);
    throw new Error("Erreur lors de la récupération du changelog.");
  }
  return data || [];
}

export async function createChangelogEntry(entry: ChangelogEntryPayload): Promise<ChangelogEntry> {
  const { data, error } = await supabase
    .from('changelog')
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error("Error creating changelog entry:", error);
    throw new Error("Erreur lors de la création de l'entrée de changelog.");
  }
  return data;
}

export async function updateChangelogEntry(id: string, updates: Partial<ChangelogEntryPayload>): Promise<ChangelogEntry> {
  const { data, error } = await supabase
    .from('changelog')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating changelog entry:", error);
    throw new Error("Erreur lors de la mise à jour de l'entrée de changelog.");
  }
  return data;
}

export async function deleteChangelogEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('changelog')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting changelog entry:", error);
    throw new Error("Erreur lors de la suppression de l'entrée de changelog.");
  }
}