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
  description: string; // HTML description
  // Additional fields from Freshdesk API
  cc_emails?: string[];
  fwd_emails?: string[];
  reply_cc_emails?: string[];
  fr_escalated?: boolean;
  spam?: boolean;
  email_config_id?: number | null;
  group_id?: number | null;
  responder_id?: number | null;
  to_emails?: string | null;
  product_id?: number | null;
  type?: string | null;
  due_by?: string;
  fr_due_by?: string;
  is_escalated?: boolean;
  custom_fields?: Record<string, any>;
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
    console.log('Appel de getTickets via supabase.functions.invoke...');
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy');

    console.log('Réponse reçue:', { data, error });

    if (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
      console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));
      
      // Amélioration du message d'erreur
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        throw new Error('Erreur de connexion au service de tickets. Veuillez réessayer plus tard.');
      }
      
      throw new Error(error.message || 'Erreur inconnue lors de la récupération des tickets');
    }

    if (!data) {
      console.error('Aucune donnée reçue du serveur');
      throw new Error('Aucune donnée reçue du serveur');
    }

    if (!Array.isArray(data)) {
      console.error('Format de données invalide reçu:', data);
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }
      throw new Error('Format de données invalide reçu pour les tickets.');
    }

    console.log('Tickets récupérés avec succès:', data.length, 'tickets');
    return data;
  } catch (error) {
    console.error('Erreur dans getTickets:', error);
    throw error;
  }
};

export const getTicketDetails = async (ticketId: number): Promise<FreshdeskTicketDetails> => {
  try {
    console.log(`Appel de getTicketDetails pour le ticket ${ticketId}...`);
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      headers: { 'X-Ticket-Id': String(ticketId) },
    });

    console.log('Réponse détails ticket:', { data, error });

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
    console.log('Création d\'un nouveau ticket avec payload:', payload);
    const { data, error } = await supabase.functions.invoke('freshdesk-proxy', {
      method: 'POST',
      body: payload,
    });

    console.log('Réponse création ticket:', { data, error });

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

    console.log('Ticket créé avec succès:', data);
    return data;
  } catch (error) {
    console.error('Erreur dans createTicket:', error);
    throw error;
  }
};