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

  const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    throw new Error(error.message || 'Erreur lors de la récupération des tickets');
  }

  return data || [];
};

export const getTicketDetails = async (ticketId: number): Promise<FreshdeskTicketDetails> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'X-Ticket-Id': ticketId.toString(),
    },
  });

  if (error) {
    console.error('Erreur lors de la récupération du ticket:', error);
    throw new Error(error.message || 'Erreur lors de la récupération du ticket');
  }
  
  if (!data) {
    throw new Error('Aucune donnée reçue du serveur');
  }

  return data as FreshdeskTicketDetails;
};

export const createTicket = async (payload: CreateTicketPayload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de la création du ticket');
  }

  return data;
};

export const replyToTicket = async ({ ticketId, body }: ReplyToTicketPayload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Utilisateur non authentifié');
  }

  console.log('=== API CLIENT (URL approach) ===');
  console.log('Ticket ID:', ticketId);
  console.log('Body:', body);

  try {
    // Essayons une approche différente : passer les données dans l'URL
    const url = `https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/freshdesk-proxy?ticketId=${ticketId}&body=${encodeURIComponent(body)}`;
    
    console.log('API URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      // Corps vide mais données dans l'URL
      body: JSON.stringify({}),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error response:', errorData);
      throw new Error(errorData.error || 'Erreur lors de l\'envoi de la réponse');
    }

    const data = await response.json();
    console.log('API Success:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};