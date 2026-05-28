import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Server configuration error: Missing required Supabase environment variables.');
    }

    const userSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') ?? '',
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userSupabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized: User not authenticated.');
    }

    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured.');
    }

    const transferResponse = await fetch('https://api.stripe.com/v1/transfers?limit=100', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    if (!transferResponse.ok) {
      const errorBody = await transferResponse.json();
      throw new Error(`Stripe API error: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const { data: transfers } = await transferResponse.json();
    const invoiceIdsToUpdate = new Set<string>();

    for (const transfer of transfers ?? []) {
      if (transfer.metadata?.invoice_ids && !transfer.reversed) {
        for (const invoiceId of String(transfer.metadata.invoice_ids).split(',')) {
          const trimmedInvoiceId = invoiceId.trim();
          if (trimmedInvoiceId) {
            invoiceIdsToUpdate.add(trimmedInvoiceId);
          }
        }
      }
    }

    if (invoiceIdsToUpdate.size === 0) {
      return new Response(JSON.stringify({ updatedCount: 0, message: 'No transfers found with reconciliation metadata.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id, transfer_statuses')
      .in('id', Array.from(invoiceIdsToUpdate));

    if (invoicesError) {
      throw new Error(`DB fetch error: ${invoicesError.message}`);
    }

    const invoicesNeedingUpdate = (invoices ?? []).filter((invoice) => !invoice.transfer_statuses?.stripe);

    if (invoicesNeedingUpdate.length === 0) {
      return new Response(JSON.stringify({ updatedCount: 0, message: 'All relevant invoices are already marked as completed.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const results = await Promise.all(
      invoicesNeedingUpdate.map((invoice) => {
        const currentStatuses =
          invoice.transfer_statuses && typeof invoice.transfer_statuses === 'object'
            ? invoice.transfer_statuses
            : {};

        return supabaseAdmin
          .from('invoices')
          .update({ transfer_statuses: { ...currentStatuses, stripe: true } })
          .eq('id', invoice.id);
      })
    );

    const failedUpdates = results.filter((result) => result.error);

    if (failedUpdates.length > 0) {
      throw new Error(`DB update error: ${failedUpdates[0].error?.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ updatedCount: invoicesNeedingUpdate.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('[reconcile-stripe-transfers] request failed', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
