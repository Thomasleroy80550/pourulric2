import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "./notifications-api";

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

/**
 * Fetches rehousing notes for the currently logged-in user.
 */
export async function getRehousingNotes(): Promise<RehousingNote[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('rehousing_notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching rehousing notes:", error);
    throw new Error("Impossible de récupérer les notes de relogement.");
  }

  return data || [];
}

/**
 * Fetches all rehousing notes for administrators.
 */
export async function getAllRehousingNotes(): Promise<RehousingNote[]> {
  const { data, error } = await supabase
    .from('rehousing_notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all rehousing notes:", error);
    throw new Error("Impossible de récupérer toutes les notes de relogement.");
  }

  return data || [];
}

/**
 * Creates a new rehousing note for the currently logged-in user.
 * @param noteData The data for the new note.
 */
export async function createRehousingNote(noteData: Omit<RehousingNote, 'id' | 'user_id' | 'created_at' | 'transfer_completed'>): Promise<RehousingNote> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from('rehousing_notes')
    .insert({ ...noteData, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error creating rehousing note:", error);
    throw new Error("Impossible de créer la note de relogement.");
  }

  return data;
}

/**
 * Updates the transfer status of a rehousing note.
 * This is an admin-only function.
 * @param noteId The ID of the note to update.
 * @param completed The new transfer status.
 */
export async function updateRehousingNoteTransferStatus(noteId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('rehousing_notes')
    .update({ transfer_completed: completed })
    .eq('id', noteId);

  if (error) {
    console.error("Error updating transfer status:", error);
    throw new Error("Impossible de mettre à jour le statut du virement.");
  }
}

/**
 * Resends the notification email for a rehousing note to the owner.
 * @param noteId The ID of the rehousing note.
 */
export async function resendRehousingNoteNotification(noteId: string): Promise<void> {
  // 1. Fetch the rehousing note
  const { data: note, error: noteError } = await supabase
    .from('rehousing_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (noteError || !note) {
    console.error('Error fetching rehousing note:', noteError);
    throw new Error('Impossible de trouver la note de relogement.');
  }

  // 2. Fetch the user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', note.user_id)
    .single();

  if (profileError || !profile || !profile.email) {
    console.error('Error fetching user profile or email missing:', profileError);
    throw new Error("Impossible de trouver l'email de l'utilisateur pour envoyer la notification.");
  }

  // 3. Construct and send the email
  const subject = 'Rappel : Confirmation de votre note de relogement';
  const html = `Bonjour ${profile.first_name || 'Client'},<br><br>
  
  Ceci est un rappel concernant votre <strong>note de relogement</strong> de type "${note.note_type}" d'un montant de ${note.amount_to_transfer}€.<br><br>
  
  <strong>Qu'est-ce qu'une note de relogement ?</strong><br>
  C'est un document qui confirme que nous devons vous reverser de l'argent. Cela arrive quand un locataire a payé trop cher ou quand il y a un changement dans votre réservation. C'est comme un petit papier qui dit "on vous doit de l'argent".<br><br>
  
  <strong>Connectez-vous à votre espace Hello Keys</strong><br>
  Pour voir tous les détails et suivre votre remboursement, connectez-vous à votre espace personnel :<br>
  <a href="https://hellokeys.fr" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Accéder à mon espace Hello Keys</a><br><br>
  
  <strong>Montant à vous reverser :</strong> ${note.amount_to_transfer}€<br>
  <strong>Bénéficiaire :</strong> ${note.recipient_name}<br><br>
  
  Si vous avez des questions, n'hésitez pas à nous contacter.<br><br>
  
  Cordialement,<br>
  L'équipe Hello Keys`;

  await sendEmail(profile.email, subject, html);
}