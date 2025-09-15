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
    // 1. Admin & Security Checks
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

    const { destination_account_id, amount, currency, invoice_ids, description } = await req.json();
    if (!destination_account_id || !amount || !currency || !invoice_ids) {
      throw new Error("Missing required parameters: destination_account_id, amount, currency, invoice_ids.");
    }

    // 2. Step 1: Create a Transfer to the connected account's Stripe balance
    const transferParams = new URLSearchParams({
      amount: amount.toString(),
      currency: currency,
      destination: destination_account_id,
      transfer_group: `INVOICES-${invoice_ids[0]}`,
    });
    // Add all invoice IDs to metadata for easier reconciliation
    if (invoice_ids && invoice_ids.length > 0) {
      transferParams.append('metadata[invoice_ids]', invoice_ids.join(','));
    }
    if (description) {
      transferParams.append('description', description);
    }

    const transferResponse = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: transferParams
    });

    if (!transferResponse.ok) {
      const errorBody = await transferResponse.json();
      throw new Error(`Stripe Transfer API error: ${errorBody.error.message}`);
    }
    const transfer = await transferResponse.json();

    // 3. Step 2: Create a Payout from the connected account's balance to their bank
    const payoutParams = new URLSearchParams({
        amount: amount.toString(),
        currency: currency,
    });
    if (description) {
        payoutParams.append('description', description);
    }

    const payoutResponse = await fetch('https://api.stripe.com/v1/payouts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Stripe-Account': destination_account_id, // IMPORTANT: Execute on behalf of the connected account
        },
        body: payoutParams
    });

    if (!payoutResponse.ok) {
        const errorBody = await payoutResponse.json();
        // Attempt to reverse the transfer if payout fails
        await fetch(`https://api.stripe.com/v1/transfers/${transfer.id}/reversals`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
        });
        throw new Error(`Stripe Payout API error: ${errorBody.error.message}. The initial transfer has been reversed.`);
    }
    const payout = await payoutResponse.json();

    // 4. Update invoice status in DB
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabaseAdmin
      .from('invoices')
      .update({ transfer_completed: true })
      .in('id', invoice_ids);

    if (dbError) {
      // Log this for manual correction, but don't fail the whole operation as money has moved.
      console.error(`CRITICAL: Stripe payout succeeded but DB update failed for invoices ${invoice_ids.join(', ')}. Error: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ success: true, transfer, payout }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in initiate-stripe-payout function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});