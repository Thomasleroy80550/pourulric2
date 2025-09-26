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

  console.log('=== API CLIENT ===');
  console.log('Ticket ID:', ticketId);
  console.log('Body:', body);
  console.log('Body type:', typeof body);
  console.log('Body length:', body?.length);

  const requestBody = {
    ticketId: ticketId,
    body: body,
  };
  
  console.log('Request body object:', requestBody);
  console.log('JSON.stringify(requestBody):', JSON.stringify(requestBody));

  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    console.log('API Response data:', data);
    console.log('API Response error:', error);

    if (error) {
      console.error('API Error:', error);
      throw new Error(error.message || 'Erreur lors de l\'envoi de la réponse');
    }

    console.log('API Success:', data);
    return data;
  } catch (invokeError) {
    console.error('Invoke error:', invokeError);
    throw invokeError;
  }
};