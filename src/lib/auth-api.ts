import { supabase } from "@/integrations/supabase/client";

export async function sendLoginOtp(phoneNumber: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('auth-send-sms', {
    body: { phoneNumber },
  });

  if (error) {
    console.error("Error sending login SMS OTP:", error);
    // The error object from invoke for non-2xx status often has a 'details' property
    // that contains the JSON body returned by the Edge Function.
    const errorMessage = (error as any).details?.error || error.message || "Une erreur est survenue lors de l'envoi du code.";
    throw new Error(errorMessage);
  }
  return data;
}

export async function verifyLoginOtp(phoneNumber: string, otp: string): Promise<{ access_token: string; refresh_token: string; }> {
  const { data, error } = await supabase.functions.invoke('auth-verify-sms', {
    body: { phoneNumber, otp },
  });

  if (error) {
    console.error("Error verifying login SMS OTP:", error);
    const errorMessage = (error as any).context?.error || error.message || "Une erreur est survenue lors de la vérification du code.";
    throw new Error(errorMessage);
  }
  
  if (!data.access_token || !data.refresh_token) {
    throw new Error("La vérification a échoué. Tokens non reçus.");
  }

  return data;
}

export async function updateUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("Error updating password:", error);
    throw new Error(error.message || "Une erreur est survenue lors de la mise à jour du mot de passe.");
  }
}