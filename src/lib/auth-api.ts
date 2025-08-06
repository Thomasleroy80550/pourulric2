import { supabase } from "@/integrations/supabase/client";

export async function sendLoginOtp(phoneNumber: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('auth-send-sms', {
    body: { phoneNumber },
  });

  if (error) {
    console.error("Error sending login SMS OTP:", error);
    const context = (error as any).context;
    throw new Error(context?.error || error.message || "Une erreur est survenue lors de l'envoi du code.");
  }
  return data;
}

export async function verifyLoginOtp(phoneNumber: string, otp: string): Promise<{ access_token: string; refresh_token: string; }> {
  const { data, error } = await supabase.functions.invoke('auth-verify-sms', {
    body: { phoneNumber, otp },
  });

  if (error) {
    console.error("Error verifying login SMS OTP:", error);
    const context = (error as any).context;
    throw new Error(context?.error || error.message || "Une erreur est survenue lors de la vérification du code.");
  }
  
  if (!data.access_token || !data.refresh_token) {
    throw new Error("La vérification a échoué. Tokens non reçus.");
  }

  return data;
}