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

export interface FreshdeskNote {
  id: number;
  body: string;
  body_text?: string;
  from_email?: string;
  user_id?: number;
  created_at: string;
  updated_at: string;
  ticket_id: number;
  private: boolean;
}

export interface FreshdeskTicketDetails extends FreshdeskTicket {
  conversations?: FreshdeskConversation[];
  notes?: FreshdeskNote[];
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

// Fonctions mock pour éviter les erreurs
export const getTickets = async (): Promise<FreshdeskTicket[]> => {
  return [];
};

export const getTicketDetails = async (ticketId: number): Promise<FreshdeskTicketDetails> => {
  throw new Error('La fonctionnalité des tickets est temporairement indisponible');
};

export const createTicket = async (payload: CreateTicketPayload) => {
  throw new Error('La fonctionnalité des tickets est temporairement indisponible');
};

export const replyToTicket = async (payload: ReplyToTicketPayload) => {
  throw new Error('La fonctionnalité des tickets est temporairement indisponible');
};