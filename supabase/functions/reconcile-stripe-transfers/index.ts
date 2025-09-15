import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Admin check
    const userSupabaseClient = createClient(
      SUPABASE_URL ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: User not authenticated.");
    
    const { data: profile } = await userSupabaseClient.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error("Forbidden: Admin access required.");

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Server configuration error: Missing required environment variables.");
    }

    // 1. Fetch recent transfers from Stripe
    const stripeResponse = await fetch('https://api.stripe.com/v1/transfers?limit=100', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        }
    });

    if (!stripeResponse.ok) {
        const errorBody = await stripeResponse.json();
        throw new Error(`Stripe API error: ${errorBody.error.message}`);
    }

    const { data: transfers } = await stripeResponse.json();

    // 2. Filter transfers and collect invoice IDs
    const invoiceIdsToUpdate = new Set<string>();
    for (const transfer of transfers) {
      if (transfer.metadata && transfer.metadata.invoice_ids && !transfer.reversed) {
        const ids = transfer.metadata.invoice_ids.split(',');
        ids.forEach((id: string) => invoiceIdsToUpdate.add(id.trim()));
      }
    }

    if (invoiceIdsToUpdate.size === 0) {
      return new Response(JSON.stringify({ updatedCount: 0, message: "No transfers found with reconciliation metadata." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Find which of these invoices are not yet marked as completed
    const { data: invoicesToUpdate, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .in('id', Array.from(invoiceIdsToUpdate))
      .eq('transfer_completed', false);

    if (fetchError) {
      throw new Error(`DB fetch error: ${fetchError.message}`);
    }

    if (!invoicesToUpdate || invoicesToUpdate.length === 0) {
      return new Response(JSON.stringify({ updatedCount: 0, message: "All relevant invoices are already marked as completed." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const finalInvoiceIds = invoicesToUpdate.map(inv => inv.id);

    // 4. Update their status
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ transfer_completed: true })
      .in('id', finalInvoiceIds);

    if (updateError) {
      throw new Error(`DB update error: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ updatedCount: finalInvoiceIds.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in reconcile-stripe-transfers function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});