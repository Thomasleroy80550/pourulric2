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