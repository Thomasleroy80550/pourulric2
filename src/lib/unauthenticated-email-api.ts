export async function sendUnauthenticatedEmail(to: string, subject: string, html: string): Promise<void> {
  const SEND_UNAUTHENTICATED_EMAIL_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/send-unauthenticated-email";

  const response = await fetch(SEND_UNAUTHENTICATED_EMAIL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, html }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Failed to send unauthenticated email:", errorData);
    throw new Error(`Failed to send email: ${errorData.error || 'Unknown error'}`);
  }
}