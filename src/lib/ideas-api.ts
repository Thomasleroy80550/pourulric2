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

/**
 * Liste publique des idées (tous les clients). Le nom de l'auteur n'est
 * jamais exposé : seul l'user_id permet de repérer ses propres idées.
 */
export async function getPublicIdeas(): Promise<Idea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('id, user_id, title, description, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching public ideas:", error);
    throw new Error("Impossible de récupérer les idées.");
  }
  return (data || []) as Idea[];
}

/** Tous les votes (idea_id + user_id) pour compter et repérer les siens. */
export async function getIdeaVotes(): Promise<{ idea_id: string; user_id: string }[]> {
  const { data, error } = await supabase
    .from('idea_votes')
    .select('idea_id, user_id');

  if (error) {
    console.error("Error fetching idea votes:", error);
    throw new Error("Impossible de récupérer les votes.");
  }
  return data || [];
}

/** Ajoute ou retire le vote de l'utilisateur connecté sur une idée. */
export async function toggleIdeaVote(ideaId: string, hasVoted: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Vous devez être connecté pour voter.");

  if (hasVoted) {
    const { error } = await supabase
      .from('idea_votes')
      .delete()
      .eq('idea_id', ideaId)
      .eq('user_id', user.id);
    if (error) throw new Error("Impossible de retirer votre vote.");
  } else {
    const { error } = await supabase
      .from('idea_votes')
      .insert({ idea_id: ideaId, user_id: user.id });
    if (error) throw new Error("Impossible d'enregistrer votre vote.");
  }
}