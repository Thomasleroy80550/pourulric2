import { supabase } from '@/integrations/supabase/client';

const SUPABASE_FUNCTIONS_BASE_URL = 'https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRramFlanp3bW13d3pob2twYmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MTQwMjAsImV4cCI6MjA2NDk5MDAyMH0.aTOtiL49-BYCyO4K3Bek37i5XQD3fWzim59j9fEMtJs';

export type OwnerTicketStatus = 'open' | 'pending' | 'closed' | string;
export type OwnerTicketPriority = 'low' | 'medium' | 'high' | string;
export type OwnerTicketConversationDirection = 'incoming' | 'outgoing' | 'internal' | 'unknown';

export interface OwnerTicketSummary {
  id: string;
  subject: string;
  from_email: string | null;
  status: OwnerTicketStatus;
  priority: OwnerTicketPriority | null;
  preview: string | null;
  created_at: string;
  last_activity_at: string | null;
  unread_count: number;
  source_provider: string | null;
  source_email_id: string | null;
  reopened_by_client_at: string | null;
  archived_at: string | null;
  spam_at: string | null;
}

export interface OwnerTicketConversation {
  id: string;
  created_at: string | null;
  author_name: string | null;
  author_email: string | null;
  direction: OwnerTicketConversationDirection;
  is_private: boolean;
  body: string | null;
  body_html: string | null;
}

export interface OwnerTicketDetail extends OwnerTicketSummary {
  description: string | null;
  description_html: string | null;
  conversations: OwnerTicketConversation[];
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error('Impossible de récupérer la session utilisateur.');
  }

  if (!session?.access_token) {
    throw new Error('Utilisateur non authentifié.');
  }

  return session.access_token;
}

async function callInternalFunction<T>(
  path: string,
  body: Record<string, unknown>,
  fallbackErrorMessage: string,
): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({ error: 'Réponse serveur invalide.' }));

  if (!response.ok) {
    throw new Error(payload.error || fallbackErrorMessage);
  }

  return payload as T;
}

export async function getTickets(): Promise<OwnerTicketSummary[]> {
  const data = await callInternalFunction<{ ok: true; tickets: OwnerTicketSummary[] }>(
    'proprio-tickets-list',
    {},
    'Une erreur est survenue lors du chargement des tickets.',
  );

  return Array.isArray(data.tickets) ? data.tickets : [];
}

export async function getTicketDetails(ticketId: string): Promise<OwnerTicketDetail> {
  const data = await callInternalFunction<{ ok: true; ticket: OwnerTicketDetail }>(
    'proprio-ticket-detail',
    { ticket_id: ticketId },
    'Une erreur est survenue lors du chargement du ticket.',
  );

  if (!data.ticket) {
    throw new Error('Ticket introuvable.');
  }

  return data.ticket;
}

export async function replyToTicket(ticketId: string, subject: string, body: string): Promise<void> {
  await callInternalFunction(
    'freshdesk-reply-by-email',
    { ticketId, subject, body },
    'Impossible d’envoyer votre réponse.',
  );
}
