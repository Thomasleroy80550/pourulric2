import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function hashContent(subject: string, html: string): Promise<string> {
  const data = new TextEncoder().encode(`${subject}::${html}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth admin obligatoire
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => null);
    const action = (body?.action as string) ?? "enqueue";

    // --- Annulation d'une campagne en cours ---
    if (action === "cancel") {
      const campaignId = body?.campaignId as string | undefined;
      if (!campaignId) {
        return new Response(JSON.stringify({ error: "Missing campaignId" }), { status: 400, headers: corsHeaders });
      }
      const { error: cancelErr } = await supabaseAdmin
        .from("newsletter_queue")
        .update({ status: "cancelled" })
        .eq("campaign_id", campaignId)
        .eq("status", "pending");
      if (cancelErr) throw cancelErr;
      await supabaseAdmin
        .from("newsletter_campaigns")
        .update({ status: "cancelled" })
        .eq("id", campaignId);
      console.log(`[enqueue-newsletter] campaign ${campaignId} cancelled by ${user.id}`);
      return new Response(JSON.stringify({ message: "Campaign cancelled" }), { status: 200, headers: corsHeaders });
    }

    // --- Mise en file d'attente ---
    const subject = body?.subject as string | undefined;
    const html = body?.html as string | undefined; // HTML final (thémé) qui sera envoyé
    const rawHtml = (body?.rawHtml as string | undefined) ?? null; // HTML brut de l'éditeur
    const testMode = Boolean(body?.testMode);
    const existingCampaignId = body?.campaignId as string | undefined;

    if (!subject || !html) {
      return new Response(JSON.stringify({ error: "Missing subject or html" }), { status: 400, headers: corsHeaders });
    }

    const contentHash = await hashContent(subject, html);

    // Réutiliser ou créer la campagne
    let campaignId = existingCampaignId;
    if (campaignId) {
      const { data: existing } = await supabaseAdmin
        .from("newsletter_campaigns")
        .select("id")
        .eq("id", campaignId)
        .single();
      if (!existing) campaignId = undefined;
    }
    if (!campaignId) {
      const { data: sameHash } = await supabaseAdmin
        .from("newsletter_campaigns")
        .select("id")
        .eq("content_hash", contentHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      campaignId = sameHash?.id;
    }
    if (!campaignId) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("newsletter_campaigns")
        .insert({ subject, html, raw_html: rawHtml, content_hash: contentHash, status: "sending", created_by: user.id })
        .select("id")
        .single();
      if (createErr) throw createErr;
      campaignId = created.id;
    } else {
      // S'assurer que le contenu de la campagne est à jour et marquée en cours
      const updatePayload: Record<string, unknown> = { subject, html, content_hash: contentHash, status: "sending" };
      if (rawHtml) updatePayload.raw_html = rawHtml;
      await supabaseAdmin
        .from("newsletter_campaigns")
        .update(updatePayload)
        .eq("id", campaignId);
    }

    // Destinataires
    let emails: string[] = [];
    if (testMode) {
      emails = ["thomasleroy80550@gmail.com"];
    } else {
      const { data: profiles, error: profilesErr } = await supabaseAdmin
        .from("profiles")
        .select("email, is_banned")
        .not("email", "is", null);
      if (profilesErr) throw profilesErr;
      emails = (profiles ?? [])
        .filter((p) => p.email && p.is_banned !== true)
        .map((p) => (p.email as string).trim().toLowerCase())
        .filter((e) => e.length > 3 && e.includes("@"));
      emails = [...new Set(emails)];
    }

    // Déduplication : exclure les emails déjà servis pour ce contenu
    const { data: alreadySent } = await supabaseAdmin
      .from("newsletter_deliveries")
      .select("email")
      .eq("content_hash", contentHash);
    const sentSet = new Set((alreadySent ?? []).map((r) => (r.email as string).toLowerCase()));
    const toQueue = emails.filter((e) => !sentSet.has(e));

    if (toQueue.length === 0) {
      return new Response(JSON.stringify({ message: "Nothing to queue", queued: 0, campaignId }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Insertion en file (ignore les doublons déjà en file pour cette campagne)
    const rows = toQueue.map((email) => ({ campaign_id: campaignId, email, status: "pending" }));
    const CHUNK = 500;
    let queued = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error: insertErr } = await supabaseAdmin
        .from("newsletter_queue")
        .upsert(chunk, { onConflict: "campaign_id,email", ignoreDuplicates: true });
      if (insertErr) throw insertErr;
      queued += chunk.length;
    }

    console.log(`[enqueue-newsletter] campaign ${campaignId}: ${queued} recipients queued by ${user.id}`);

    return new Response(JSON.stringify({
      message: "Campaign queued",
      campaignId,
      queued,
      estimatedMinutes: Math.ceil(toQueue.length / 100),
    }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("[enqueue-newsletter] error", { error: (error as Error)?.message ?? error });
    return new Response(JSON.stringify({ error: (error as Error)?.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
