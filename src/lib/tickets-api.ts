import { supabase } from '@/integrations/supabase/client';

export interface FreshdeskTicket {
  id: number;
  subject: string;
  status: number;
  priority: number;
  source: number;
  created_at: string;
  updated_at: string;
  requester_id: number;
  description_text: string;
}

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  created_at: string;
  user_id: number;
  private: boolean;
  from_email: string | null;
}

export interface FreshdeskRequester {
  id: number;
  name: string;
  email: string;
}

export interface FreshdeskTicketWithDetails extends FreshdeskTicket {
  conversations: FreshdeskConversation[];
  requester: FreshdeskRequester;
}

export const getTickets = async (): Promise<FreshdeskTicket[]> => {
  const { data, error } = await supabase.functions.invoke('freshdesk-proxy');

  if (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) {
    if (data && (data as any).error) {
      throw new Error((data as any).error);
    }
    throw new Error('Format de données invalide reçu pour les tickets.');
  }

  return data;
};

export const getTicketById = async (ticketId: string): Promise<FreshdeskTicketWithDetails> => {
  const { data, error } = await supabase.functions.invoke(`freshdesk-proxy?ticketId=${ticketId}`);
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

export const createTicket = async (payload: { subject: string; description: string }): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'POST',
    body: { action: 'create', ...payload },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

export const replyToTicket = async (payload: { ticketId: string; body: string }): Promise<any> => {
  const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
    method: 'POST',
    body: { action: 'reply', ...payload },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};