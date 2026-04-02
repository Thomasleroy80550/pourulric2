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

const ORDER_TICKET_CREATE_URL = 'https://hnvaqfcfjqhjupellfhk.supabase.co/functions/v1/order-ticket-create';

export async function createExternalOrderTicket(payload: OrderTicketCreatePayload): Promise<OrderTicketCreateResponse> {
  const response = await fetch(ORDER_TICKET_CREATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as OrderTicketCreateResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Impossible de créer le ticket.');
  }

  return data;
}
