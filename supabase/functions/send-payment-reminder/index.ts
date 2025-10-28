import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://beta.proprietaire.hellokeys.fr";

// Pennylane
const PENNYLANE_API_KEY = Deno.env.get("PENNYLANE_API_KEY") ?? null;
const PENNYLANE_API_URL = "https://app.pennylane.com/api/external/v2";

const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024; // 12MB maximum par pièce jointe pour éviter OOM

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set.");
}

async function getRemoteFileSize(url: string, headers?: HeadersInit): Promise<number | null> {
  try {
    const head = await fetch(url, { method: "HEAD", headers });
    if (!head.ok) return null;
    const len = head.headers.get("content-length");
    return len ? parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

async function fetchPdfAsBase64(url: string, headers?: HeadersInit): Promise<{ base64: string; filename: string } | null> {
  try {
    const size = await getRemoteFileSize(url, headers);
    if (size !== null && size > MAX_ATTACHMENT_BYTES) {
      console.warn(`Skip attachment (too large): ${size} bytes > ${MAX_ATTACHMENT_BYTES}`);
      return null;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`Failed to fetch PDF at ${url}: ${res.status}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    if (size === null && arrayBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
      console.warn(`Skip attachment after fetch (too large): ${arrayBuffer.byteLength} bytes > ${MAX_ATTACHMENT_BYTES}`);
      return null;
    }

    const base64 = encodeBase64(new Uint8Array(arrayBuffer));
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.split("/").pop() || "document.pdf";
    const filename = pathname.endsWith(".pdf") ? pathname : `${pathname}.pdf`;
    return { base64, filename };
  } catch (e) {
    console.error("Error fetching PDF:", e);
    return null;
  }
}

// Parse "Juillet 2024" ou "07/2024" -> { month, year }
function parsePeriodToMonthYear(period: string): { month: number; year: number } | null {
  if (!period) return null;
  const p = period.trim().toLowerCase();

  const months: Record<string, number> = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
    "juillet": 7, "août": 8, "aout": 8, "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12,
  };

  // Forme "Mois YYYY"
  const parts = p.split(/\s+/);
  if (parts.length >= 2 && months[parts[0]]) {
    const year = parseInt(parts[1], 10);
    if (!isNaN(year)) return { month: months[parts[0]], year };
  }

  // Forme "MM/YYYY"
  const m = p.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{4})/);
  if (m) {
    const month = parseInt(m[1], 10);
    const year = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && year > 1900) return { month, year };
  }

  return null;
}

async function findPennylaneInvoiceUrl(customerId: number, targetMonth: number, targetYear: number): Promise<string | null> {
  if (!PENNYLANE_API_KEY) return null;

  const params = new URLSearchParams();
  params.append("q[s]", `customer_id eq ${customerId}`);
  params.append("limit", "200");

  const url = `${PENNYLANE_API_URL}/customer_invoices?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "X-Api-Key": PENNYLANE_API_KEY,
    },
  });

  if (!response.ok) {
    console.warn("Pennylane API response not ok for list_invoices:", response.status);
    return null;
  }

  const data = await response.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  // Cherche une facture dont la date (YYYY-MM-DD) correspond au mois/année cible
  const match = items.find((inv: any) => {
    const d = inv?.date;
    if (!d || typeof d !== "string") return false;
    const mm = parseInt(d.slice(5, 7), 10);
    const yy = parseInt(d.slice(0, 4), 10);
    return mm === targetMonth && yy === targetYear;
  });

  if (match) {
    // Préférence à file_url, sinon public_file_url
    return match.file_url || match.public_file_url || null;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Auth check
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin check
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { invoice_id, statement_path } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "Missing 'invoice_id' in body." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Load invoice with user profile (incl. pennylane_customer_id)
    const { data: invoice, error: invErr } = await adminClient
      .from("invoices")
      .select("*, profiles!user_id(first_name,last_name,pennylane_customer_id)")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Load user email
    const { data: userInfo, error: userErr } = await adminClient.auth.admin.getUserById(invoice.user_id);
    if (userErr || !userInfo?.user?.email) {
      return new Response(JSON.stringify({ error: "User email not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const recipientEmail = userInfo.user.email as string;
    const userName = `${invoice.profiles?.first_name ?? ""} ${invoice.profiles?.last_name ?? ""}`.trim() || "Client";
    const period = invoice.period;

    // Determine due date (issued + 15 days) and lateness
    const createdAt = new Date(invoice.created_at);
    const dueDate = new Date(createdAt.getTime() + 15 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLate = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    const reminderLevel = daysLate >= 30 ? 3 : daysLate >= 15 ? 2 : daysLate > 0 ? 1 : 0;

    const subject =
      reminderLevel === 0
        ? `Rappel de paiement – Relevé ${period}`
        : reminderLevel === 1
        ? `Relance 1 – Paiement en retard pour ${period}`
        : reminderLevel === 2
        ? `Relance 2 – Paiement en retard (${daysLate} jours) – ${period}`
        : `Dernière relance – Paiement très en retard (${daysLate} jours) – ${period}`;

    const bodyLines = [
      `Bonjour ${userName},`,
      "",
      `Nous vous rappelons que le règlement du relevé pour la période « ${period} » est en attente.`,
      `Date d'échéance: ${dueDate.toLocaleDateString("fr-FR")}.`,
      daysLate > 0 ? `Le retard actuel est de ${daysLate} jour(s).` : `Le paiement est à effectuer avant la date ci-dessus.`,
      "",
      "Vous trouverez en pièces jointes:",
      "• Le relevé au format PDF (Hello Keys).",
      "• La facture Pennylane (PDF) si disponible.",
      "",
      `Pour toute question, vous pouvez vous connecter à votre espace: ${APP_BASE_URL}/finances`,
      "",
      "Merci de procéder au paiement dès que possible.",
      "",
      "Cordialement,",
      "L'équipe Hello Keys",
    ];
    const htmlBody = `<p>${bodyLines.join("<br>")}</p>`;

    // Attachments
    const attachments: Array<{ filename: string; content: string }> = [];

    // 1) Statement PDF from storage
    const statementPathFinal = statement_path ?? `${invoice.user_id}/${invoice.id}.pdf`;
    const { data: signed } = await adminClient.storage
      .from("statements")
      .createSignedUrl(statementPathFinal, 3600);

    if (signed?.signedUrl) {
      const statementPdf = await fetchPdfAsBase64(signed.signedUrl);
      if (statementPdf) {
        attachments.push({
          filename: `Releve_${userName.replace(/\s+/g, "_")}_${String(period).replace(/\s/g, "_")}.pdf`,
          content: statementPdf.base64,
        });
      }
    } else {
      console.warn("No signed URL for statement PDF; attachment skipped.");
    }

    // 2) Pennylane invoice PDF (if available or retrievable)
    let pennylaneUrl: string | null = invoice.pennylane_invoice_url || null;

    if (!pennylaneUrl && PENNYLANE_API_KEY && invoice.profiles?.pennylane_customer_id) {
      // Essaye de trouver la facture du même mois/année
      const target = parsePeriodToMonthYear(period) || { month: createdAt.getMonth() + 1, year: createdAt.getFullYear() };
      const customerId = parseInt(invoice.profiles.pennylane_customer_id, 10);
      if (!isNaN(customerId)) {
        try {
          const candidateUrl = await findPennylaneInvoiceUrl(customerId, target.month, target.year);
          if (candidateUrl) {
            pennylaneUrl = candidateUrl;
          }
        } catch (e) {
          console.warn("Fallback Pennylane lookup failed:", e);
        }
      }
    }

    if (pennylaneUrl) {
      const needsPennylaneAuth = /pennylane\.com/i.test(pennylaneUrl) && !!PENNYLANE_API_KEY;
      const pennylaneHeaders: HeadersInit | undefined = needsPennylaneAuth
        ? { "accept": "application/pdf", "X-Api-Key": PENNYLANE_API_KEY as string }
        : undefined;

      const pennylanePdf = await fetchPdfAsBase64(pennylaneUrl, pennylaneHeaders);
      if (pennylanePdf) {
        attachments.push({
          filename: pennylanePdf.filename || `Facture_Pennylane_${String(period).replace(/\s/g, "_")}.pdf`,
          content: pennylanePdf.base64,
        });
      } else {
        console.warn("Pennylane PDF fetch returned null; attachment skipped.");
      }
    } else {
      console.info("No Pennylane invoice URL available for attachment.");
    }

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hello Keys <noreply@notifications.hellokeys.fr>",
        to: [recipientEmail],
        subject,
        html: htmlBody,
        attachments,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.json().catch(() => ({}));
      console.error("Resend error:", errorBody);
      return new Response(JSON.stringify({ error: "Failed to send reminder email." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log notification for the user
    await adminClient
      .from("notifications")
      .insert({
        user_id: invoice.user_id,
        message: `Une relance de paiement a été envoyée pour votre relevé (${period}).`,
        link: "/finances",
      });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-payment-reminder:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});