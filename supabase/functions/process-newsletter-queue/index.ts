import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const CRON_SECRETS = [Deno.env.get("CRON_SECRET"), Deno.env.get("CRON_SECRET_2")]
  .map((v) => (v ?? "").trim())
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

// Limites prudentes : 100 emails max par exécution (1 exécution/minute),
// envoyés par lots de 25 via l'API batch (1 requête HTTP = 25 emails),
// avec 700ms entre chaque requête → très loin de la limite Resend (2 req/s).
const MAX_EMAILS_PER_RUN = 100;
const BATCH_CHUNK_SIZE = 25;
const DELAY_BETWEEN_CALLS_MS = 700;
const MAX_ATTEMPTS = 3;

const FROM_ADDRESS = "Hello Keys <noreply@notifications.hellokeys.fr>";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type QueueRow = {
  id: string;
  campaign_id: string;
  email: string;
  attempts: number;
};

type Campaign = {
  id: string;
  subject: string;
  html: string;
  content_hash: string;
  created_by: string | null;
};

async function sendChunkWithRetry(
  campaign: Campaign,
  rows: QueueRow[],
): Promise<{ ok: boolean; error?: string }> {
  const payload = rows.map((r) => ({
    from: FROM_ADDRESS,
    to: [r.email],
    subject: campaign.subject,
    html: campaign.html,
  }));

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const { error } = await resend.batch.send(payload);
      if (!error) return { ok: true };
      const statusCode = (error as any)?.statusCode;
      const name = (error as any)?.name;
      if (statusCode === 429 || name === "rate_limit_exceeded") {
        console.warn("[process-newsletter-queue] rate limited, backing off", { attempt });
        await sleep(1500 + attempt * 1000);
        continue;
      }
      return { ok: false, error: (error as any)?.message ?? JSON.stringify(error) };
    } catch (e) {
      return { ok: false, error: (e as Error)?.message ?? String(e) };
    }
  }
  return { ok: false, error: "Rate limit exceeded after retries" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Sécurisé par secret cron uniquement
  const authHeader = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!authHeader || !CRON_SECRETS.includes(authHeader)) {
    console.warn("[process-newsletter-queue] unauthorized call");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    // 1) Récupérer les emails en attente
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from("newsletter_queue")
      .select("id, campaign_id, email, attempts")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(MAX_EMAILS_PER_RUN);

    if (pendingError) throw pendingError;

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ message: "Queue empty", processed: 0 }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    console.log(`[process-newsletter-queue] processing ${pending.length} pending emails`);

    // 2) Charger les campagnes concernées
    const campaignIds = [...new Set(pending.map((r) => r.campaign_id))];
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from("newsletter_campaigns")
      .select("id, subject, html, content_hash, created_by")
      .in("id", campaignIds);

    if (campaignsError) throw campaignsError;
    const campaignMap = new Map<string, Campaign>((campaigns ?? []).map((c) => [c.id, c as Campaign]));

    let sent = 0;
    let failed = 0;

    // 3) Traiter par campagne, par lots de BATCH_CHUNK_SIZE
    for (const campaignId of campaignIds) {
      const campaign = campaignMap.get(campaignId);
      const rows = (pending as QueueRow[]).filter((r) => r.campaign_id === campaignId);

      if (!campaign) {
        // Campagne supprimée : annuler ces lignes
        const ids = rows.map((r) => r.id);
        await supabaseAdmin
          .from("newsletter_queue")
          .update({ status: "cancelled", last_error: "Campaign not found" })
          .in("id", ids);
        continue;
      }

      for (let i = 0; i < rows.length; i += BATCH_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + BATCH_CHUNK_SIZE);
        const result = await sendChunkWithRetry(campaign, chunk);
        const ids = chunk.map((r) => r.id);

        if (result.ok) {
          sent += chunk.length;
          await supabaseAdmin
            .from("newsletter_queue")
            .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
            .in("id", ids);

          // Enregistrer les livraisons (déduplication inter-campagnes par content_hash)
          const deliveries = chunk.map((r) => ({
            email: r.email,
            subject: campaign.subject,
            content_hash: campaign.content_hash,
            created_by: campaign.created_by,
          }));
          const { error: delivErr } = await supabaseAdmin
            .from("newsletter_deliveries")
            .upsert(deliveries, { onConflict: "content_hash,email", ignoreDuplicates: true });
          if (delivErr) {
            console.error("[process-newsletter-queue] failed to record deliveries", { delivErr });
          }
        } else {
          console.error("[process-newsletter-queue] chunk send failed", { error: result.error });
          // Incrémenter les tentatives ; marquer failed après MAX_ATTEMPTS
          for (const r of chunk) {
            const nextAttempts = r.attempts + 1;
            const isFinal = nextAttempts >= MAX_ATTEMPTS;
            if (isFinal) failed += 1;
            await supabaseAdmin
              .from("newsletter_queue")
              .update({
                attempts: nextAttempts,
                status: isFinal ? "failed" : "pending",
                last_error: result.error ?? "Unknown error",
              })
              .eq("id", r.id);
          }
        }

        await sleep(DELAY_BETWEEN_CALLS_MS);
      }

      // 4) Marquer la campagne comme envoyée si plus rien en attente
      const { count } = await supabaseAdmin
        .from("newsletter_queue")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "pending");

      if ((count ?? 0) === 0) {
        await supabaseAdmin
          .from("newsletter_campaigns")
          .update({ status: "sent" })
          .eq("id", campaignId)
          .eq("status", "sending");
        console.log(`[process-newsletter-queue] campaign ${campaignId} completed`);
      }
    }

    console.log(`[process-newsletter-queue] run done`, { sent, failed });
    return new Response(JSON.stringify({ message: "Processed", sent, failed }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[process-newsletter-queue] error", { error: (error as Error)?.message ?? error });
    return new Response(JSON.stringify({ error: (error as Error)?.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
