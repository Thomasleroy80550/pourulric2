import { supabase } from "@/integrations/supabase/client";

/**
 * Retourne l'ID du propriétaire effectif pour le contexte courant:
 * - Si l'utilisateur est viewer avec une invitation acceptée, retourne owner_id
 * - Sinon, retourne l'ID de l'utilisateur lui-même
 */
export async function getEffectiveOwnerId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('delegated_invoice_viewers')
    .select('owner_id')
    .eq('viewer_id', user.id)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1);

  const delegatedOwnerId = (data && data.length > 0) ? data[0].owner_id as string : null;
  return delegatedOwnerId ?? user.id;
}