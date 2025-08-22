import { supabase } from "@/integrations/supabase/client";

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export type IdeaPayload = Omit<Idea, 'id' | 'created_at' | 'user_id' | 'status'>;

export async function submitIdea(idea: IdeaPayload): Promise<Idea> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Vous devez être connecté pour soumettre une idée.");
  }

  const { data, error } = await supabase
    .from('ideas')
    .insert(idea)
    .select()
    .single();

  if (error) {
    console.error("Error submitting idea:", error);
    throw new Error("Erreur lors de la soumission de l'idée.");
  }
  return data;
}