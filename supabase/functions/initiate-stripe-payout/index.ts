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

    const {
      destination_account_id,
      amount,
      currency,
      invoice_ids,
      description,
    } = await req.json();

    if (
      !destination_account_id ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !currency ||
      !Array.isArray(invoice_ids) ||
      invoice_ids.length === 0
    ) {
      throw new Error('Missing or invalid parameters: destination_account_id, amount, currency, invoice_ids.');
    }

    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${destination_account_id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    if (!accountResponse.ok) {
      const errorBody = await accountResponse.json();
      throw new Error(`Stripe Account API error: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const account = await accountResponse.json();

    if (!account.payouts_enabled) {
      throw new Error('Les virements Stripe ne sont pas activés sur ce compte connecté.');
    }

    if (account.requirements?.disabled_reason) {
      throw new Error(`Le compte Stripe est restreint : ${account.requirements.disabled_reason}.`);
    }

    const transferParams = new URLSearchParams({
      amount: String(amount),
      currency,
      destination: destination_account_id,
      transfer_group: `INVOICES-${invoice_ids[0]}`,
    });

    // Stripe limite chaque valeur de métadonnée à 500 caractères.
    // On découpe donc la liste des IDs en plusieurs clés pour ne jamais dépasser cette limite.
    const MAX_METADATA_VALUE_LENGTH = 500;
    const invoiceIdChunks: string[] = [];
    let currentChunk = '';

    for (const id of invoice_ids) {
      const candidate = currentChunk ? `${currentChunk},${id}` : String(id);
      if (candidate.length > MAX_METADATA_VALUE_LENGTH) {
        if (currentChunk) invoiceIdChunks.push(currentChunk);
        currentChunk = String(id);
      } else {
        currentChunk = candidate;
      }
    }
    if (currentChunk) invoiceIdChunks.push(currentChunk);

    transferParams.append('metadata[invoice_count]', String(invoice_ids.length));
    invoiceIdChunks.forEach((chunk, index) => {
      const key = invoiceIdChunks.length === 1 ? 'invoice_ids' : `invoice_ids_${index + 1}`;
      transferParams.append(`metadata[${key}]`, chunk);
    });

    if (description) {
      transferParams.append('description', description);
    }

    const transferResponse = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: transferParams,
    });

    if (!transferResponse.ok) {
      const errorBody = await transferResponse.json();
      throw new Error(`Stripe Transfer API error: ${errorBody.error?.message || 'Unknown error'}`);
    }

    const transfer = await transferResponse.json();

    const payoutParams = new URLSearchParams({
      amount: String(amount),
      currency,
    });

    if (description) {
      payoutParams.append('description', description);
    }

    const payoutResponse = await fetch('https://api.stripe.com/v1/payouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Account': destination_account_id,
      },
      body: payoutParams,
    });

    if (!payoutResponse.ok) {
      const errorBody = await payoutResponse.json();

      await fetch(`https://api.stripe.com/v1/transfers/${transfer.id}/reversals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      });

      throw new Error(`Stripe Payout API error: ${errorBody.error?.message || 'Unknown error'}. Le transfert initial a été annulé.`);
    }

    const payout = await payoutResponse.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('id, transfer_statuses')
      .in('id', invoice_ids);

    if (invoicesError) {
      console.error('[initiate-stripe-payout] failed to load invoices after Stripe payout', {
        message: invoicesError.message,
        invoice_ids,
      });
    } else if (invoices?.length) {
      const updates = invoices.map((invoice) => {
        const currentStatuses =
          invoice.transfer_statuses && typeof invoice.transfer_statuses === 'object'
            ? invoice.transfer_statuses
            : {};

        return supabaseAdmin
          .from('invoices')
          .update({ transfer_statuses: { ...currentStatuses, stripe: true } })
          .eq('id', invoice.id);
      });

      const results = await Promise.all(updates);
      const failedUpdates = results.filter((result) => result.error);

      if (failedUpdates.length > 0) {
        console.error('[initiate-stripe-payout] stripe payout succeeded but invoice status update failed', {
          failed_count: failedUpdates.length,
          invoice_ids,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, transfer, payout }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('[initiate-stripe-payout] request failed', { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
