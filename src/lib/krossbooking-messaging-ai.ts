import { supabase } from "@/integrations/supabase/client";
import type { KrossbookingMessage } from "@/lib/krossbooking";
import type { UserRoom } from "@/lib/user-room-api";

const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";
const KROSSBOOKING_AI_REPLY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-ai-reply";

export interface AuthorizedReservationSummary {
  id_reservation?: number | null;
  label?: string;
  cod_channel?: string;
  arrival?: string;
  departure?: string;
  email?: string;
  phone?: string;
  room_id?: string;
  room_name?: string | null;
}

export interface AuthorizedMessageThreadSummary {
  id_thread: number;
  id_reservation: number | null;
  cod_channel: string;
  last_message_date: string;
  last_message_text: string;
  to_read?: boolean;
  reservation: AuthorizedReservationSummary | null;
}

export interface AuthorizedMessageThread {
  thread: {
    id_thread: number;
    id_reservation: number | null;
    cod_channel: string;
    last_message_date: string;
    last_message_text: string;
    messages: KrossbookingMessage[];
  };
  reservation: AuthorizedReservationSummary | null;
}

export interface GenerateReplyPayload {
  thread: AuthorizedMessageThread["thread"];
  reservation: AuthorizedReservationSummary | null;
  room: UserRoom | null;
  additionalInstructions?: string;
}

export interface GeneratedReply {
  intentCategory: string;
  intentSummary: string;
  confidence: number;
  suggestedReply: string;
  missingInformation: string[];
  factsUsed: string[];
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error("Impossible de récupérer la session utilisateur.");
  }

  if (!data.session?.access_token) {
    throw new Error("Utilisateur non authentifié.");
  }

  return data.session.access_token;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  const parsed = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(parsed?.error || "Une erreur est survenue.");
  }

  return parsed as T;
}

function normalizeReservationId(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeThreadMessages(messages: any): KrossbookingMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.map((message: any, index: number) => ({
    id_message: Number(message.id_message ?? index + 1),
    id_thread: Number(message.id_thread ?? 0),
    date: String(message.date || message.created_at || message.last_update || ""),
    sender: message.sender === "host" || message.sender === "system" ? message.sender : "guest",
    text: String(message.text || message.message || message.body || ""),
    is_read: Boolean(message.is_read),
  }));
}

export async function listAuthorizedMessageThreads(filters?: {
  search?: string;
  unreadOnly?: boolean;
  codChannel?: string;
  lastUpdate?: string;
  dateTo?: string;
}): Promise<AuthorizedMessageThreadSummary[]> {
  const response = await postJson<{ data: any[] }>(KROSSBOOKING_PROXY_URL, {
    action: "list_message_threads",
    ...(filters?.search ? { search: filters.search } : {}),
    ...(typeof filters?.unreadOnly === "boolean" ? { to_read: filters.unreadOnly } : {}),
    ...(filters?.codChannel ? { cod_channel: filters.codChannel } : {}),
    ...(filters?.lastUpdate ? { last_update: filters.lastUpdate } : {}),
    ...(filters?.dateTo ? { date_to: filters.dateTo } : {}),
  });

  return (response.data || []).map((thread) => ({
    id_thread: Number(thread.id_thread),
    id_reservation: normalizeReservationId(thread.id_reservation),
    cod_channel: String(thread.cod_channel || "UNKNOWN"),
    last_message_date: String(thread.last_message_date || thread.last_update || ""),
    last_message_text: String(thread.last_message_text || thread.last_message || ""),
    to_read: typeof thread.to_read === "boolean" ? thread.to_read : undefined,
    reservation: thread.reservation || null,
  }));
}

export async function getAuthorizedMessageThread(
  idThread: number,
  reservationId?: number | null,
): Promise<AuthorizedMessageThread> {
  const response = await postJson<{ data: { thread: any; reservation: any } }>(KROSSBOOKING_PROXY_URL, {
    action: "get_authorized_message_thread",
    id_thread: idThread,
    ...(typeof reservationId === "number" ? { id_reservation: reservationId } : {}),
  });

  const thread = response.data.thread;

  return {
    reservation: response.data.reservation || null,
    thread: {
      id_thread: Number(thread.id_thread),
      id_reservation: normalizeReservationId(thread.id_reservation),
      cod_channel: String(thread.cod_channel || "UNKNOWN"),
      last_message_date: String(thread.last_message_date || thread.last_update || ""),
      last_message_text: String(thread.last_message_text || thread.last_message || ""),
      messages: normalizeThreadMessages(thread.messages),
    },
  };
}

export async function sendMessageToAuthorizedThread(
  idThread: number,
  message: string,
  reservationId?: number | null,
) {
  return postJson<{ data: unknown }>(KROSSBOOKING_PROXY_URL, {
    action: "send_message_to_thread",
    id_thread: idThread,
    message,
    ...(typeof reservationId === "number" ? { id_reservation: reservationId } : {}),
  });
}

export async function generateKrossbookingReply(payload: GenerateReplyPayload): Promise<GeneratedReply> {
  return postJson<GeneratedReply>(KROSSBOOKING_AI_REPLY_URL, payload as unknown as Record<string, unknown>);
}