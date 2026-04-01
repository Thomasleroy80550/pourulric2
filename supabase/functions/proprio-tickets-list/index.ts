import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const REMOTE_TICKETS_URL = "https://hnvaqfcfjqhjupellfhk.supabase.co/functions/v1/proprio-tickets";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

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

function normalizeTicketSummary(source: JsonRecord) {
  return {
    id: stringOrNull(source.id) ?? "",
    subject: stringOrNull(source.subject) ?? "Sans objet",
    from_email: stringOrNull(source.from_email),
    status: stringOrNull(source.status) ?? "open",
    priority: stringOrNull(source.priority),
    preview: stringOrNull(source.preview),
    created_at: stringOrNull(source.created_at) ?? new Date().toISOString(),
    last_activity_at: stringOrNull(source.last_activity_at),
    unread_count: numberOrZero(source.unread_count),
    source_provider: stringOrNull(source.source_provider),
    source_email_id: stringOrNull(source.source_email_id),
    reopened_by_client_at: stringOrNull(source.reopened_by_client_at),
    archived_at: stringOrNull(source.archived_at),
    spam_at: stringOrNull(source.spam_at),
  };
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
      console.warn("[proprio-tickets-list] missing authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
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
      console.warn("[proprio-tickets-list] unauthorized request", { error: authError?.message ?? "missing-user" });
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ownerEmail = user.email?.trim().toLowerCase();
    if (!ownerEmail) {
      console.error("[proprio-tickets-list] authenticated user has no email", { userId: user.id });
      return new Response(JSON.stringify({ error: "Impossible de déterminer l'email du propriétaire connecté." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const apiToken = Deno.env.get("PROPRIO_TICKETS_API_TOKEN")?.trim();
    if (!apiToken) {
      console.error("[proprio-tickets-list] missing PROPRIO_TICKETS_API_TOKEN secret");
      return new Response(JSON.stringify({ error: "Configuration serveur incomplète." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const remoteUrl = new URL(REMOTE_TICKETS_URL);
    remoteUrl.searchParams.set("email", ownerEmail);

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
      console.error("[proprio-tickets-list] remote API request failed", {
        status: remoteResponse.status,
        message,
        userId: user.id,
      });

      const userMessage = remoteResponse.status === 401
        ? "L'API distante des tickets a refusé le token serveur ORDER_TICKET_API_TOKEN."
        : message ?? "Impossible de récupérer vos tickets.";

      return new Response(JSON.stringify({ error: userMessage }), {
        status: remoteResponse.status === 401 ? 502 : remoteResponse.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const tickets = isRecord(remotePayload) && Array.isArray(remotePayload.tickets)
      ? remotePayload.tickets.filter(isRecord).map(normalizeTicketSummary)
      : [];

    console.info("[proprio-tickets-list] tickets loaded", { userId: user.id, count: tickets.length });

    return new Response(JSON.stringify({ ok: true, tickets }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[proprio-tickets-list] unexpected error", { message });
    return new Response(JSON.stringify({ error: "Erreur serveur lors du chargement des tickets." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
