import { supabase } from "@/integrations/supabase/client";

const KROSSBOOKING_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-proxy";
const KROSSBOOKING_AI_REPLY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/krossbooking-ai-reply";

export type AuthorizedReservationSummary = Record<string, any>;
export type AuthorizedMessageThread = Record<string, any>;
export type AuthorizedMessageThreadSummary = Record<string, any>;
export type GenerateReplyPayload = Record<string, any>;
export type GeneratedReply = Record<string, any>;

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

function normalizeReservationId(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function normalizeThreadMessages(messages: unknown) {
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

function normalizeDetailedThreadPayload(threadPayload: any) {
  const rawThread = threadPayload?.thread && typeof threadPayload.thread === "object"
    ? threadPayload.thread
    : threadPayload;

  return {
    id_thread: Number(rawThread?.id_thread ?? threadPayload?.id_thread ?? 0),
    id_reservation: normalizeReservationId(rawThread?.id_reservation ?? threadPayload?.id_reservation),
    cod_channel: String(rawThread?.cod_channel || threadPayload?.cod_channel || "UNKNOWN"),
    last_message_date: String(rawThread?.last_message_date || threadPayload?.last_message_date || rawThread?.last_update || threadPayload?.last_update || ""),
    last_message_text: String(rawThread?.last_message_text || threadPayload?.last_message_text || rawThread?.last_message || threadPayload?.last_message || ""),
    messages: normalizeThreadMessages(rawThread?.messages ?? threadPayload?.messages),
  };
}

export async function listAuthorizedMessageThreads(filters?: {
  search?: string;
  unreadOnly?: boolean;
  codChannel?: string;
  lastUpdate?: string;
  dateTo?: string;
}) {
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

export async function getAuthorizedMessageThread(idThread: number, reservationId?: string | null) {
  const response = await postJson<{ data: { thread: any; reservation: any } }>(KROSSBOOKING_PROXY_URL, {
    action: "get_authorized_message_thread",
    id_thread: idThread,
    ...(reservationId ? { id_reservation: reservationId } : {}),
  });

  return {
    reservation: response.data.reservation || null,
    thread: normalizeDetailedThreadPayload(response.data.thread),
  };
}

export async function sendMessageToAuthorizedThread(idThread: number, message: string, reservationId?: string | null) {
  return postJson<{ data: unknown }>(KROSSBOOKING_PROXY_URL, {
    action: "send_message_to_thread",
    id_thread: idThread,
    message,
    ...(reservationId ? { id_reservation: reservationId } : {}),
  });
}

export async function generateKrossbookingReply(payload: GenerateReplyPayload) {
  return postJson<GeneratedReply>(KROSSBOOKING_AI_REPLY_URL, payload as Record<string, unknown>);
}