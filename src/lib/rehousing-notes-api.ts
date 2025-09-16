import { supabase } from '@/integrations/supabase/client';

export interface RehousingNote {
  id: string;
  user_id: string;
  note_type: string;
  amount_received: number;
  amount_to_transfer: number;
  comment?: string;
  recipient_name: string;
  recipient_iban: string;
  recipient_bic?: string;
  created_at: string;
}

export type NewRehousingNote = Omit<RehousingNote, 'id' | 'created_at'>;

/**
 * Creates a new rehousing note in the database.
 * @param noteData The data for the new note.
 */
export const createRehousingNote = async (noteData: NewRehousingNote) => {
  const { data, error } = await supabase
    .from('rehousing_notes')
    .insert(noteData)
    .select()
    .single();

  if (error) {
    console.error('Error creating rehousing note:', error);
    throw new Error(`Erreur lors de la création de la note de relogement : ${error.message}`);
  }

  return data;
};

/**
 * Fetches all rehousing notes for a specific user.
 * @param userId The ID of the user.
 */
export const getRehousingNotesForUser = async (userId: string): Promise<RehousingNote[]> => {
  const { data, error } = await supabase
    .from('rehousing_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rehousing notes:', error);
    throw new Error('Impossible de récupérer les notes de relogement.');
  }

  return data || [];
};