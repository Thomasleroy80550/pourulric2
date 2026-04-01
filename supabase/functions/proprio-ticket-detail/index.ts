import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const REMOTE_TICKETS_URL = "https://hnvaqfcfjqhjupellfhk.supabase.co/functions/v1/proprio-tickets";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

type TicketMessageDirection = "incoming" | "outgoing" | "internal" | "unknown";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getFirst(source: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return null;
}

function normalizeTicketSummary(source: JsonRecord) {
  return {
    id: stringOrNull(getFirst(source, ["id", "ticket_id"])) ?? "",
    subject: stringOrNull(source.subject) ?? "Sans objet",
    from_email: stringOrNull(getFirst(source, ["from_email", "email", "requester_email"])),
    status: stringOrNull(source.status) ?? "open",
    priority: stringOrNull(source.priority),
    preview: stringOrNull(getFirst(source, ["preview", "snippet", "description_text", "description"])),
    created_at: stringOrNull(source.created_at) ?? new Date().toISOString(),
    last_activity_at: stringOrNull(getFirst(source, ["last_activity_at", "updated_at", "last_message_at"])),
    unread_count: numberOrZero(source.unread_count),
    source_provider: stringOrNull(source.source_provider),
    source_email_id: stringOrNull(source.source_email_id),
    reopened_by_client_at: stringOrNull(source.reopened_by_client_at),
    archived_at: stringOrNull(source.archived_at),
    spam_at: stringOrNull(source.spam_at),
  };
}

function normalizeDirection(source: JsonRecord): TicketMessageDirection {
  const explicitDirection = stringOrNull(getFirst(source, ["direction", "message_direction"]));
  if (explicitDirection === "incoming" || explicitDirection === "inbound") {
    return "incoming";
  }
  if (explicitDirection === "outgoing" || explicitDirection === "outbound") {
    return "outgoing";
  }
  if (explicitDirection === "internal") {
    return "internal";
  }

  if (source.private === true || source.is_private === true) {
    return "internal";
  }
  if (source.incoming === true || source.from_client === true) {
    return "incoming";
  }
  if (source.outgoing === true || source.from_agent === true || source.from_support === true) {
    return "outgoing";
  }

  return "unknown";
}

function normalizeConversation(source: JsonRecord, index: number) {
  const htmlCandidate = stringOrNull(getFirst(source, ["body_html", "html", "message_html"]));
  const rawBody = stringOrNull(getFirst(source, ["body_text", "text", "body", "content", "message", "preview"]));
  const bodyHtml = htmlCandidate ?? (rawBody && /<[^>]+>/.test(rawBody) ? rawBody : null);
  const body = rawBody ? (bodyHtml === rawBody ? stripHtml(rawBody) : rawBody) : (bodyHtml ? stripHtml(bodyHtml) : null);

  return {
    id: stringOrNull(getFirst(source, ["id", "conversation_id", "message_id"])) ?? `message-${index}`,
    created_at: stringOrNull(getFirst(source, ["created_at", "sent_at", "date", "updated_at"])),
    author_name: stringOrNull(getFirst(source, ["author_name", "from_name", "sender_name", "name"])),
    author_email: stringOrNull(getFirst(source, ["author_email", "from_email", "sender_email", "email", "user_email"])),
    direction: normalizeDirection(source),
    is_private: Boolean(source.private ?? source.is_private),
    body,
    body_html: bodyHtml,
  };
}

function collectConversationSources(payload: JsonRecord, ticketSource: JsonRecord) {
  const collection: JsonRecord[] = [];

  for (const source of [ticketSource, payload]) {
    for (const key of ["conversations", "messages", "history", "thread", "notes"]) {
      const candidate = source[key];
      if (Array.isArray(candidate)) {
        collection.push(...candidate.filter(isRecord));
      }
    }
  }

  return collection;
}

async function extractTicketId(req: Request): Promise<string | null> {
  if (req.method === "GET") {
    return new URL(req.url).searchParams.get("ticket_id")?.trim() ?? null;
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  const body = await req.json().catch(() => null);
  if (!isRecord(body)) {
    return null;
  }

  return stringOrNull(body.ticket_id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("[proprio-ticket-detail] missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ticketId = await extractTicketId(req);
    if (!ticketId) {
      return new Response(JSON.stringify({ error: "Le paramètre ticket_id est requis." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.warn("[proprio-ticket-detail] unauthorized request", { error: authError?.message ?? "missing-user" });
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ownerEmail = user.email?.trim().toLowerCase();
    if (!ownerEmail) {
      console.error("[proprio-ticket-detail] authenticated user has no email", { userId: user.id });
      return new Response(JSON.stringify({ error: "Impossible de déterminer l'email du propriétaire connecté." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const apiToken = Deno.env.get("PROPRIO_TICKETS_API_TOKEN")?.trim();
    if (!apiToken) {
      console.error("[proprio-ticket-detail] missing PROPRIO_TICKETS_API_TOKEN secret");
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const remoteUrl = new URL(REMOTE_TICKETS_URL);
    remoteUrl.searchParams.set("email", ownerEmail);
    remoteUrl.searchParams.set("ticket_id", ticketId);

    const remoteResponse = await fetch(remoteUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
    });

    const rawText = await remoteResponse.text();
    let remotePayload: unknown = null;

    try {
      remotePayload = rawText ? JSON.parse(rawText) : null;
    } catch {
      remotePayload = { error: rawText || "Invalid JSON response" };
    }

    if (!remoteResponse.ok) {
      const message = isRecord(remotePayload) ? stringOrNull(remotePayload.error) ?? stringOrNull(remotePayload.message) : null;
      console.error("[proprio-ticket-detail] remote API request failed", {
        status: remoteResponse.status,
        message,
        userId: user.id,
        ticketId,
      });

      const userMessage = remoteResponse.status === 401
        ? "L'API distante des tickets a refusé le token serveur PROPRIO_TICKETS_API_TOKEN."
        : message ?? "Impossible de récupérer le détail du ticket.";

      return new Response(JSON.stringify({ error: userMessage }), {
        status: remoteResponse.status === 401 ? 502 : remoteResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = isRecord(remotePayload) ? remotePayload : {};
    const ticketSource = isRecord(payload.ticket)
      ? payload.ticket
      : isRecord(payload.data)
        ? payload.data
        : payload;

    const summary = normalizeTicketSummary(ticketSource);
    const conversations = collectConversationSources(payload, ticketSource)
      .map(normalizeConversation)
      .sort((a, b) => {
        const left = a.created_at ? Date.parse(a.created_at) : 0;
        const right = b.created_at ? Date.parse(b.created_at) : 0;
        return left - right;
      });

    const ticket = {
      ...summary,
      description: stringOrNull(getFirst(ticketSource, ["description_text", "description", "body", "content"])),
      description_html: stringOrNull(getFirst(ticketSource, ["description_html", "body_html", "html"])),
      conversations,
    };

    console.info("[proprio-ticket-detail] ticket detail loaded", {
      userId: user.id,
      ticketId,
      conversations: conversations.length,
    });

    return new Response(JSON.stringify({ ok: true, ticket }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[proprio-ticket-detail] unexpected error", { message });
    return new Response(JSON.stringify({ error: "Erreur serveur lors du chargement du ticket." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
