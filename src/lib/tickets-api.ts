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