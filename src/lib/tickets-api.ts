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
  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy');

    if (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
      throw new Error(error.message || 'Erreur inconnue lors de la récupération des tickets');
    }

    // Vérifier si data est défini et est un tableau
    if (!data) {
      console.warn('Aucune donnée reçue de la fonction freshdesk-proxy');
      return [];
    }

    if (!Array.isArray(data)) {
      console.error('Format de données invalide reçu pour les tickets:', data);
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

export const getTicketById = async (ticketId: string): Promise<FreshdeskTicketWithDetails> => {
  try {
    const { data, error } = await supabase.functions.invoke(`freshdesk-proxy?ticketId=${ticketId}`);
    
    if (error) {
      console.error('Erreur lors de la récupération du ticket:', error);
      throw new Error(error.message || 'Erreur inconnue lors de la récupération du ticket');
    }

    if (!data) {
      throw new Error('Aucune donnée reçue pour le ticket');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Erreur dans getTicketById:', error);
    throw error;
  }
};

export const createTicket = async (payload: { subject: string; description: string }): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      method: 'POST',
      body: { action: 'create', ...payload },
    });
    
    if (error) {
      console.error('Erreur lors de la création du ticket:', error);
      throw new Error(error.message || 'Erreur inconnue lors de la création du ticket');
    }

    if (!data) {
      throw new Error('Aucune donnée reçue lors de la création du ticket');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Erreur dans createTicket:', error);
    throw error;
  }
};

export const replyToTicket = async (payload: { ticketId: string; body: string }): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      method: 'POST',
      body: { action: 'reply', ...payload },
    });
    
    if (error) {
      console.error('Erreur lors de la réponse au ticket:', error);
      throw new Error(error.message || 'Erreur inconnue lors de la réponse au ticket');
    }

    if (!data) {
      throw new Error('Aucune donnée reçue lors de la réponse au ticket');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error('Erreur dans replyToTicket:', error);
    throw error;
  }
};