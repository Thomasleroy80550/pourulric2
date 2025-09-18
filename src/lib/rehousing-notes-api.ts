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
  transfer_completed: boolean;
}

export type NewRehousingNote = Omit<RehousingNote, 'id' | 'created_at' | 'transfer_completed'>;

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
 * Marks a rehousing note's transfer as completed.
 * @param noteId The ID of the note to update.
 */
export const markRehousingNoteAsCompleted = async (noteId: string) => {
  const { data, error } = await supabase
    .from('rehousing_notes')
    .update({ transfer_completed: true })
    .eq('id', noteId)
    .select()
    .single();

  if (error) {
    console.error('Error marking rehousing note as completed:', error);
    throw new Error('Erreur lors de la mise à jour de la note de relogement.');
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

/**
 * Fetches all rehousing notes (admin access).
 */
export const getAllRehousingNotes = async (): Promise<RehousingNote[]> => {
  const { data, error } = await supabase
    .from('rehousing_notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all rehousing notes:', error);
    throw new Error('Impossible de récupérer toutes les notes de relogement.');
  }

  return data || [];
};

/**
 * Resends the notification email for a rehousing note.
 * @param noteId The ID of the note.
 */
export const resendRehousingNoteNotification = async (noteId: string) => {
  const { data, error } = await supabase.functions.invoke('resend-rehousing-note-email', {
    body: { note_id: noteId },
  });

  if (error) {
    console.error('Error resending rehousing note notification:', error);
    throw new Error(`Erreur lors de la relance de la notification : ${error.message}`);
  }

  return data;
};