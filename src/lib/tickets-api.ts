import { supabase } from '@/integrations/supabase/client';

const OWNER_TICKETS_LIST_URL = 'https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/proprio-tickets-list';
const OWNER_TICKET_DETAIL_URL = 'https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/proprio-ticket-detail';

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
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error("Impossible de récupérer la session utilisateur.");
  }

  if (!session?.access_token) {
    throw new Error("Utilisateur non authentifié.");
  }

  return session.access_token;
}

async function callTicketsApi<T>(url: string): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json().catch(() => ({ error: 'Réponse serveur invalide.' }));

  if (!response.ok) {
    throw new Error(payload.error || 'Une erreur est survenue lors du chargement des tickets.');
  }

  return payload as T;
}

export async function getTickets(): Promise<OwnerTicketSummary[]> {
  const payload = await callTicketsApi<{ ok: true; tickets: OwnerTicketSummary[] }>(OWNER_TICKETS_LIST_URL);
  return Array.isArray(payload.tickets) ? payload.tickets : [];
}

export async function getTicketDetails(ticketId: string): Promise<OwnerTicketDetail> {
  const detailUrl = new URL(OWNER_TICKET_DETAIL_URL);
  detailUrl.searchParams.set('ticket_id', ticketId);

  const payload = await callTicketsApi<{ ok: true; ticket: OwnerTicketDetail }>(detailUrl.toString());
  return payload.ticket;
}
