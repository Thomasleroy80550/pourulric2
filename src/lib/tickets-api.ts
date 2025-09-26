import { supabase } from '@/integrations/supabase/client';

export interface FreshdeskTicket {
  id: number;
  subject: string;
  description: string;
  description_text?: string;
  description_html?: string;
  description_content?: string;
  status: number;
  priority: number;
  created_at: string;
  updated_at: string;
  requester_id: number;
  responder_id?: number;
  group_id?: number;
  ticket_type?: string;
  source: number;
  spam: boolean;
  deleted: boolean;
}

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text?: string;
  from_agent: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;
  ticket_id: number;
  incoming: boolean;
  private: boolean;
  support_email?: string;
}

export interface FreshdeskTicketDetails extends FreshdeskTicket {
  conversations?: FreshdeskConversation[];
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: number;
}

export interface ReplyToTicketPayload {
  ticketId: number;
  body: string;
}

export const getTickets = async (): Promise<FreshdeskTicket[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  const response = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Erreur lors de la récupération des tickets');
  }

  return response.data || [];
};

export const getTicketDetails = async (ticketId: number): Promise<FreshdeskTicketDetails> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  console.log('Récupération des détails du ticket:', ticketId);
  
  const response = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'X-Ticket-Id': ticketId.toString(),
    },
  });

  if (response.error) {
    console.error('Erreur lors de la récupération du ticket:', response.error);
    throw new Error(response.error.message || 'Erreur lors de la récupération du ticket');
  }

  console.log('Réponse API reçue:', response.data);
  
  if (!response.data) {
    throw new Error('Aucune donnée reçue du serveur');
  }

  return response.data as FreshdeskTicketDetails;
};

export const createTicket = async ({ subject, description, priority }: CreateTicketPayload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  const response = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: {
      subject,
      description,
      priority,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Erreur lors de la création du ticket');
  }

  return response.data;
};

export const replyToTicket = async ({ ticketId, body }: ReplyToTicketPayload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  const response = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: {
      ticketId,
      body,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Erreur lors de l\'envoi de la réponse');
  }

  return response.data;
};