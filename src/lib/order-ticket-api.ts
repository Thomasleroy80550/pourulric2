import { supabase } from '@/integrations/supabase/client';

export interface OrderTicketCreatePayload {
  customer_email: string;
  customer_name: string;
  subject: string;
  message: string;
  reference?: string;
  source_provider?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'open' | 'pending' | 'closed';
}

interface OrderTicketCreateResponse {
  ok: boolean;
  ticket_id: string;
  conversation_id: string;
  error?: string;
}

export async function createExternalOrderTicket(
  payload: OrderTicketCreatePayload,
): Promise<OrderTicketCreateResponse> {
  const { data, error } = await supabase.functions.invoke('proprio-ticket-create', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Impossible de créer le ticket.');
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Impossible de créer le ticket.');
  }

  return data as OrderTicketCreateResponse;
}
