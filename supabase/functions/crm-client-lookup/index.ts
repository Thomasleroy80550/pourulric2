import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PENNYLANE_API_URL = "https://app.pennylane.com/api/external/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getPennylaneApiKey(agency: string | null): string | undefined {
  if (agency === "Baie de somme") {
    return Deno.env.get("PENNYLANE_API_KEYV1") ?? "5bQxM4IVAKkriUqwKBqt_h15gpS99qmptC1el_E9r8s";
  }
  return Deno.env.get("PENNYLANE_API_KEYV1_BERCK");
}

async function fetchPennylaneInvoices(customerId: string, agency: string | null) {
  const key = getPennylaneApiKey(agency);
  if (!key) {
    console.error("[crm-client-lookup] missing Pennylane API key for agency", { agency });
    return { invoices: [], error: "Clé API Pennylane manquante sur le serveur." };
  }

  const params = new URLSearchParams();
  const filter = [{ field: "customer_id", operator: "eq", value: parseInt(customerId, 10) }];
  params.append("filter", JSON.stringify(filter));
  params.append("per_page", "100");

  const url = `${PENNYLANE_API_URL}/customer_invoices?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${key}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (Array.isArray(data?.errors) && data.errors[0]?.detail) ||
        data?.error ||
        data?.message ||
        `Pennylane API error (status ${response.status})`;
      console.error("[crm-client-lookup] Pennylane API error", { status: response.status, message });
      return { invoices: [], error: String(message) };
    }

    const rawInvoices = Array.isArray(data?.invoices) ? data.invoices : [];
    const invoices = rawInvoices.map((inv: Record<string, unknown>) => ({
      id: inv.id ?? null,
      invoice_number: inv.invoice_number ?? null,
      date: inv.date ?? null,
      deadline: inv.deadline ?? null,
      amount: inv.amount ?? null,
      currency_amount: inv.currency_amount ?? null,
      remaining_amount: inv.remaining_amount ?? null,
      status: inv.status ?? null,
      label: inv.label ?? null,
      file_url: inv.file_url ?? inv.public_file_url ?? null,
    }));

    return { invoices, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[crm-client-lookup] Pennylane fetch failed", { message });
    return { invoices: [], error: message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use GET or POST." }, 405);
  }

  // --- Authentification par token API (CRM externe) ---
  const expectedToken = Deno.env.get("CRM_SUPPORT_API_TOKEN")?.trim();
  if (!expectedToken) {
    console.error("[crm-client-lookup] missing CRM_SUPPORT_API_TOKEN secret");
    return jsonResponse({ error: "Configuration serveur incomplète (CRM_SUPPORT_API_TOKEN manquant)." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKeyHeader = req.headers.get("x-api-key") ?? "";
  const providedToken = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : apiKeyHeader.trim();

  if (!providedToken || providedToken !== expectedToken) {
    console.warn("[crm-client-lookup] unauthorized request");
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  try {
    // --- Récupération de l'email recherché ---
    let email: string | null = null;

    if (req.method === "GET") {
      email = new URL(req.url).searchParams.get("email");
    } else {
      const body = await req.json().catch(() => ({}));
      email = typeof body?.email === "string" ? body.email : null;
    }

    email = email?.trim().toLowerCase() ?? null;

    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Paramètre 'email' requis et valide." }, 400);
    }

    console.info("[crm-client-lookup] lookup requested", { email });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // --- Recherche du client dans les profils ---
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, phone_number, role, agency, onboarding_status, contract_start_date, is_contract_terminated, is_banned, pennylane_customer_id, property_address, property_city, property_zip_code")
      .ilike("email", email)
      .limit(1);

    if (profileError) {
      console.error("[crm-client-lookup] profile lookup failed", { error: profileError.message });
      return jsonResponse({ error: "Erreur lors de la recherche du client." }, 500);
    }

    const profile = profiles?.[0] ?? null;

    if (!profile) {
      console.info("[crm-client-lookup] client not found", { email });
      return jsonResponse({
        found: false,
        is_owner: false,
        client: null,
        statements: [],
        pennylane_invoices: [],
      });
    }

    const isOwner = profile.role !== "accountant";

    // --- Relevés (table invoices) ---
    const { data: statements, error: statementsError } = await supabaseAdmin
      .from("invoices")
      .select("id, period, totals, source_type, is_paid, paid_at, pennylane_status, pennylane_invoice_url, stripe_transfer_completed, airbnb_transfer_completed, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (statementsError) {
      console.error("[crm-client-lookup] statements lookup failed", { error: statementsError.message });
    }

    // --- Factures Pennylane ---
    let pennylaneInvoices: unknown[] = [];
    let pennylaneError: string | null = null;

    if (profile.pennylane_customer_id) {
      const result = await fetchPennylaneInvoices(profile.pennylane_customer_id, profile.agency);
      pennylaneInvoices = result.invoices;
      pennylaneError = result.error;
    } else {
      pennylaneError = "Aucun identifiant client Pennylane configuré pour ce propriétaire.";
    }

    console.info("[crm-client-lookup] lookup success", {
      email,
      userId: profile.id,
      statements: statements?.length ?? 0,
      pennylaneInvoices: pennylaneInvoices.length,
    });

    return jsonResponse({
      found: true,
      is_owner: isOwner,
      client: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone_number: profile.phone_number,
        role: profile.role,
        agency: profile.agency,
        onboarding_status: profile.onboarding_status,
        contract_start_date: profile.contract_start_date,
        is_contract_terminated: profile.is_contract_terminated ?? false,
        is_banned: profile.is_banned ?? false,
        property_address: profile.property_address,
        property_city: profile.property_city,
        property_zip_code: profile.property_zip_code,
        has_pennylane_account: Boolean(profile.pennylane_customer_id),
      },
      statements: (statements ?? []).map((s) => ({
        id: s.id,
        period: s.period,
        totals: s.totals,
        source_type: s.source_type,
        is_paid: s.is_paid ?? false,
        paid_at: s.paid_at,
        pennylane_status: s.pennylane_status,
        pennylane_invoice_url: s.pennylane_invoice_url,
        stripe_transfer_completed: s.stripe_transfer_completed ?? false,
        airbnb_transfer_completed: s.airbnb_transfer_completed ?? false,
        created_at: s.created_at,
      })),
      pennylane_invoices: pennylaneInvoices,
      pennylane_error: pennylaneError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[crm-client-lookup] unexpected error", { message });
    return jsonResponse({ error: "Erreur serveur." }, 500);
  }
});
