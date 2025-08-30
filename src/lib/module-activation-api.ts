import { supabase } from "@/integrations/supabase/client";

export interface ModuleActivationRequest {
  id: string;
  user_id: string;
  module_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

/**
 * Creates a new module activation request for the current user.
 * @param moduleName The name of the module to activate (e.g., 'revyoos').
 */
export async function createModuleActivationRequest(moduleName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Utilisateur non authentifié.");
  }

  // Check if a pending request for this module already exists
  const { data: existingRequests, error: fetchError } = await supabase
    .from('module_activation_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('module_name', moduleName)
    .eq('status', 'pending');

  if (fetchError) {
    console.error("Error checking existing module activation requests:", fetchError);
    throw new Error(`Erreur lors de la vérification des demandes existantes : ${fetchError.message}`);
  }

  if (existingRequests && existingRequests.length > 0) {
    throw new Error("Une demande d'activation pour ce module est déjà en attente.");
  }

  const { error: insertError } = await supabase
    .from('module_activation_requests')
    .insert({
      user_id: user.id,
      module_name: moduleName,
      status: 'pending',
    });

  if (insertError) {
    console.error("Error creating module activation request:", insertError);
    throw new Error(`Erreur lors de la création de la demande d'activation : ${insertError.message}`);
  }
}

/**
 * Fetches all module activation requests. (Admin only)
 */
export async function getAllModuleActivationRequests(): Promise<ModuleActivationRequest[]> {
  const { data, error } = await supabase
    .from('module_activation_requests')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching all module activation requests:", error);
    throw new Error(`Erreur lors de la récupération des demandes d'activation de modules : ${error.message}`);
  }
  return data || [];
}

/**
 * Updates the status of a module activation request. (Admin only)
 * @param requestId The ID of the request to update.
 * @param status The new status ('approved' or 'rejected').
 */
export async function updateModuleActivationRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('module_activation_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) {
    console.error("Error updating module activation request status:", error);
    throw new Error(`Erreur lors de la mise à jour du statut de la demande : ${error.message}`);
  }
}