import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in environment variables.");
}
const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_RPS = 2;               // 2 requêtes par seconde
const MIN_DELAY_MS = Math.ceil(1000 / RATE_LIMIT_RPS) + 150; // marge de sécurité (~650ms)
let lastSentAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRate() {
  const now = Date.now();
  const elapsed = now - lastSentAt;
  if (elapsed < MIN_DELAY_MS) {
    await sleep(MIN_DELAY_MS - elapsed);
  }
  await sleep(Math.floor(Math.random() * 80));
  lastSentAt = Date.now();
}

// Nouveau: calculer un hash stable de la campagne (sujet + HTML)
async function hashContent(subject: string, html: string): Promise<string> {
  const data = new TextEncoder().encode(`${subject}::${html}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendEmailWithRetry(toEmail: string, subject: string, html: string, maxRetries = 3) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const { error } = await resend.emails.send({
        from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
        to: [toEmail],
        subject,
        html,
      });
      if (error) {
        const statusCode = (error as any)?.statusCode;
        const name = (error as any)?.name;
        if (statusCode === 429 || name === 'rate_limit_exceeded') {
          attempt += 1;
          await sleep(1200 + attempt * 300);
          continue;
        }
        return { ok: false, error };
      }
      return { ok: true };
    } catch (e) {
      const statusCode = (e as any)?.statusCode;
      const name = (e as any)?.name;
      if (statusCode === 429 || name === 'rate_limit_exceeded') {
        attempt += 1;
        await sleep(1200 + attempt * 300);
        continue;
      }
      return { ok: false, error: e };
    }
  }
  return { ok: false, error: new Error("Rate limit exceeded after retries") };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Auth requise
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Vérifier que l'utilisateur est admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Lire le corps UNE SEULE FOIS
    const body = await req.json().catch(() => null);
    const subject = body?.subject as string | undefined;
    const html = body?.html as string | undefined;
    const testMode = Boolean(body?.testMode);

    // Nouveaux paramètres pour l'étalement par lots
    const previewOnly = Boolean(body?.previewOnly);
    let maxEmails = Number(body?.maxEmails ?? 50);
    if (!Number.isFinite(maxEmails) || maxEmails <= 0) maxEmails = 50;
    let offset = Math.max(0, Number(body?.offset ?? 0));

    if (!subject || !html) {
      return new Response(JSON.stringify({ error: "Missing subject or html" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Calculer le hash de campagne
    const contentHash = await hashContent(subject, html);

    // Récupération des destinataires
    let recipients: Array<{ email: string; first_name?: string; last_name?: string; is_banned?: boolean }> = [];

    if (testMode) {
      recipients = [{ email: "thomasleroy80550@gmail.com", first_name: "Thomas", last_name: "Leroy", is_banned: false }];
    } else {
      const { data: list, error: recipientsError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, is_banned')
        .neq('email', null);

      if (recipientsError) {
        console.error("Recipients fetch error:", recipientsError);
        return new Response(JSON.stringify({ error: "Unable to fetch recipients" }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      recipients = list ?? [];

      // Dédupliquer: récupérer les emails déjà servis pour cette campagne
      const { data: alreadySent, error: alreadyError } = await supabase
        .from('newsletter_deliveries')
        .select('email')
        .eq('content_hash', contentHash);

      if (!alreadyError && Array.isArray(alreadySent)) {
        const sentSet = new Set(alreadySent.map(r => (r.email || '').toLowerCase()));
        recipients = recipients.filter(r => r?.email && !sentSet.has((r.email as string).toLowerCase()));
      }
    }

    // Mode preview: renvoyer uniquement le volume restant sans envoyer
    const totalRemainingAll = recipients.length;
    if (previewOnly) {
      return new Response(JSON.stringify({
        message: "Preview only",
        totalRemaining: totalRemainingAll,
        contentHash,
        testMode
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Envoi par lot (offset + maxEmails)
    const startIndex = Math.min(offset, totalRemainingAll);
    const endIndex = Math.min(startIndex + maxEmails, totalRemainingAll);
    const batchRecipients = recipients.slice(startIndex, endIndex);

    let sent = 0;
    let failed = 0;

    // Envoi séquentiel avec throttling et retry 429 (pour le lot seulement)
    for (const r of batchRecipients) {
      if (!r?.email || r.is_banned === true) continue;

      const toEmail = r.email as string;

      await ensureRate();
      const result = await sendEmailWithRetry(toEmail, subject, html, 3);

      if (result.ok) {
        sent += 1;
        // Enregistrer l'envoi réussi pour éviter futurs doublons
        const { error: insertErr } = await supabase
          .from('newsletter_deliveries')
          .insert({
            email: toEmail,
            subject,
            content_hash: contentHash,
            created_by: user.id,
          });
        if (insertErr) {
          console.error("Failed to record newsletter delivery for", toEmail, insertErr);
        }
      } else {
        failed += 1;
        console.error("Resend error for", toEmail, result.error);
      }
    }

    const totalRemainingLeft = Math.max(0, totalRemainingAll - endIndex);

    return new Response(JSON.stringify({
      message: "Newsletter processed",
      sent,
      failed,
      testMode,
      rateLimited: true,
      totalRemaining: totalRemainingLeft,
      nextOffset: endIndex,
      batchSizeUsed: batchRecipients.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message ?? "Unknown error" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});