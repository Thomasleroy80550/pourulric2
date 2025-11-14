import { supabase } from "@/integrations/supabase/client";

function normalizePhoneFR(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  let p = phoneNumber.trim().replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (p.startsWith("33") && !p.startsWith("+")) p = `+${p}`;
  if (!p.startsWith("+") && p.length === 10 && p.startsWith("0")) p = `+33${p.slice(1)}`;
  if (p.startsWith("+0")) p = `+33${p.slice(2)}`;
  if (p.startsWith("+33") && p.length > 3 && p[3] === "0") p = `+33${p.slice(4)}`;
  return p;
}

export async function sendLoginOtp(phoneNumber: string): Promise<void> {
  const normalized = normalizePhoneFR(phoneNumber);
  const { data, error } = await supabase.functions.invoke('send-sms-otp', {
    body: { phoneNumber: normalized, mode: 'login' },
  });

  if (error) {
    console.error("Error sending login SMS OTP:", error);
    const serverMsg =
      (error as any)?.details?.error ||
      (error as any)?.message ||
      (error as any)?.error ||
      "Une erreur est survenue lors de l'envoi du code.";
    if ((error as any)?.status && (error as any).status >= 500) {
      throw new Error(`${serverMsg} Vérifiez la configuration Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID) dans Supabase.`);
    }
    throw new Error(serverMsg);
  }
  return data;
}

export async function verifyLoginOtp(phoneNumber: string, otp: string): Promise<{ access_token: string; refresh_token: string; }> {
  const normalized = normalizePhoneFR(phoneNumber);
  const { data, error } = await supabase.functions.invoke('verify-sms-otp', {
    body: { phoneNumber: normalized, otp, mode: 'login' },
  });

  if (error) {
    console.error("Error verifying login SMS OTP:", error);
    const errorMessage = (error as any).details?.error || error.message || "Une erreur est survenue lors de la vérification du code.";
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