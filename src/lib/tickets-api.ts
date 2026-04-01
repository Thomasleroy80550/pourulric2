import { supabase } from '@/integrations/supabase/client';

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
    throw new Error('Impossible de récupérer la session utilisateur.');
  }

  if (!session?.access_token) {
    throw new Error('Utilisateur non authentifié.');
  }

  return session.access_token;
}

export async function getTickets(): Promise<OwnerTicketSummary[]> {
  const accessToken = await getAccessToken();

  const { data, error } = await supabase.functions.invoke('proprio-tickets-list', {
    body: {},
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Une erreur est survenue lors du chargement des tickets.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return Array.isArray(data?.tickets) ? data.tickets : [];
}

export async function getTicketDetails(ticketId: string): Promise<OwnerTicketDetail> {
  const accessToken = await getAccessToken();

  const { data, error } = await supabase.functions.invoke('proprio-ticket-detail', {
    body: { ticket_id: ticketId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Une erreur est survenue lors du chargement du ticket.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.ticket) {
    throw new Error('Ticket introuvable.');
  }

  return data.ticket;
}
