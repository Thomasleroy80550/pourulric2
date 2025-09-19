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
  description: string; // Ajout de la description HTML
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority: number;
}

export interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  user_id: number;
  created_at: string;
  private: boolean;
  source: number;
  support_email: string | null;
  attachments: any[];
  from_agent: boolean;
}

export interface FreshdeskTicketDetails extends FreshdeskTicket {
  conversations: FreshdeskConversation[];
}

export const getTickets = async (): Promise<FreshdeskTicket[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy');

    if (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
      throw new Error(error.message || 'Erreur inconnue lors de la récupération des tickets');
    }

    if (!data) {
      throw new Error('Aucune donnée reçue du serveur');
    }

    if (!Array.isArray(data)) {
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }
      throw new Error('Format de données invalide reçu pour les tickets.');
    }

    return data;
  } catch (error) {
    console.error('Erreur dans getTickets:', error);
    throw error;
  }
};

export const getTicketDetails = async (ticketId: number): Promise<FreshdeskTicketDetails> => {
  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      headers: { 'X-Ticket-Id': String(ticketId) },
    });

    if (error) {
      throw new Error(error.message || 'Erreur inconnue lors de la récupération des détails du ticket');
    }

    if (!data) {
      throw new Error('Aucune donnée reçue du serveur pour les détails du ticket');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Erreur dans getTicketDetails:', error);
    throw error;
  }
};

export const createTicket = async (payload: CreateTicketPayload): Promise<FreshdeskTicket> => {
  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      method: 'POST',
      body: payload,
    });

    if (error) {
      console.error('Erreur lors de la création du ticket:', error);
      throw new Error(error.message || 'Erreur inconnue lors de la création du ticket');
    }

    if (!data) {
      throw new Error('Aucune donnée reçue du serveur après la création');
    }
    
    // Check for application-level error from the edge function
    if (data.error) {
      throw new Error(data.details?.errors?.[0]?.message || data.error);
    }

    return data;
  } catch (error) {
    console.error('Erreur dans createTicket:', error);
    throw error;
  }
};