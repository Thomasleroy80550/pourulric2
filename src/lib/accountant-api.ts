import { supabase } from "@/integrations/supabase/client";

export interface NewAccountantRequest {
  accountant_name: string;
  accountant_email: string;
}

/**
 * Creates a new request for accountant access.
 * @param requestData The name and email of the accountant.
 */
export async function createAccountantRequest(requestData: NewAccountantRequest): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { error } = await supabase
    .from('accountant_requests')
    .insert({
      ...requestData,
      user_id: user.id,
    });

  if (error) {
    console.error("Error creating accountant request:", error);
    throw new Error(`Erreur lors de la création de la demande : ${error.message}`);
  }

  // Optionally, create a notification for admins.
  // This requires a more complex setup, so we'll notify the user for now.
}