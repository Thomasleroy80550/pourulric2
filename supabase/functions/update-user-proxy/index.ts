import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://beta.proprietaire.hellokeys.fr';

async function sendSuspensionEmail(adminClient: any, userId: string) {
  try {
    const { data: userInfo, error: userErr } = await adminClient.auth.admin.getUserById(userId);
    if (userErr || !userInfo?.user?.email) {
      console.warn('[update-user-proxy] Cannot send suspension email: user email not found', { userId });
      return;
    }
    const email = userInfo.user.email as string;

    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();
    const userName = `${profileRow?.first_name ?? ''} ${profileRow?.last_name ?? ''}`.trim() || 'Client';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 16px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Compte bloqué pour impayé</h2>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <p>Bonjour ${userName},</p>
          <p>Nous vous informons que <strong>votre compte est actuellement bloqué pour impayé</strong>.</p>
          <p>Il sera <strong>débloqué dès réception de vos paiements</strong>.</p>
          <p style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; color: #b91c1c;">
            ⚠️ <strong>Important :</strong> sans action de votre part, <strong>vos réservations seront bloquées d'ici 15 jours</strong>.
          </p>
          <p>Pour régulariser votre situation, merci de procéder au règlement des factures en attente dès que possible.</p>
          <p>Vous pouvez consulter vos relevés et factures depuis votre espace :<br>
            <a href="${APP_BASE_URL}/finances" target="_blank" rel="noopener noreferrer">${APP_BASE_URL}/finances</a>
          </p>
          <p>Pour toute question, n'hésitez pas à contacter notre équipe.</p>
          <p>Cordialement,<br>L'équipe Hello Keys</p>
        </div>
      </div>
    `;

    if (!RESEND_API_KEY) {
      console.warn('[update-user-proxy] RESEND_API_KEY not set, skipping suspension email');
    } else {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
          to: [email],
          subject: 'Votre compte est bloqué pour impayé – Action requise sous 15 jours',
          html: htmlBody,
        }),
      });
      if (!resendResponse.ok) {
        const errorBody = await resendResponse.json().catch(() => ({}));
        console.error('[update-user-proxy] Resend error while sending suspension email', errorBody);
      } else {
        console.log('[update-user-proxy] Suspension email sent', { userId });
      }
    }

    // Notification in-app
    await adminClient.from('notifications').insert({
      user_id: userId,
      message: "Votre compte est bloqué pour impayé. Il sera débloqué une fois vos paiements reçus. Sans action de votre part, vos réservations seront bloquées d'ici 15 jours.",
      link: '/finances',
    });
  } catch (e: any) {
    console.error('[update-user-proxy] Failed to send suspension email/notification:', e?.message || e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate calling user and check if admin
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: User not authenticated.");
    }

    const { data: profile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Get user data from request body
    const body = await req.json();
    console.log("Incoming request body:", JSON.stringify(body));
    const { user_id, ...updateData } = body;

    if (!user_id) {
      throw new Error("Missing required field: user_id.");
    }

    // 3. Create admin client
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Detect payment suspension activation (false -> true) to notify the client
    let suspensionActivated = false;
    if (updateData.is_payment_suspended === true) {
      const { data: currentProfile } = await adminSupabaseClient
        .from('profiles')
        .select('is_payment_suspended')
        .eq('id', user_id)
        .single();
      suspensionActivated = !currentProfile?.is_payment_suspended;
    }

    // 4. Prepare data for public.profiles, handling empty strings for optional fields
    const profileUpdatePayload: { [key: string]: any } = {};
    const authUpdatePayload: { [key: string]: any } = {};

    // Iterate over all keys in updateData
    for (const key in updateData) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        let value = updateData[key];

        // Convert empty strings to null for all fields, except for revyoos_holding_ids which is an array
        if (typeof value === 'string' && value.trim() === '') {
          value = null;
        }

        // Separate fields for auth.users metadata vs public.profiles
        if (key === 'first_name' || key === 'last_name' || key === 'role') {
          // These fields are part of auth.users metadata AND public.profiles
          authUpdatePayload[key] = value;
          profileUpdatePayload[key] = value;
        } else {
          // All other fields go directly to public.profiles
          profileUpdatePayload[key] = value;
        }
      }
    }

    // Ensure user_id is not in the payload for update
    delete profileUpdatePayload.user_id;

    console.log("Auth update payload:", JSON.stringify(authUpdatePayload));
    console.log("Profile data for public.profiles update:", JSON.stringify(profileUpdatePayload));

    // Update auth.users metadata if there's anything to update
    if (Object.keys(authUpdatePayload).length > 0) {
      console.log(`Attempting to update auth.users metadata for user_id: ${user_id}`);
      
      // Fetch existing user to merge metadata, preventing accidental overwrites
      const { data: { user: targetUser }, error: getUserError } = await adminSupabaseClient.auth.admin.getUserById(user_id);
      if (getUserError) {
        console.error("Error fetching user to update metadata:", getUserError);
        throw new Error(`Failed to get user for update: ${getUserError.message}`);
      }

      const newMetadata = { ...targetUser.user_metadata, ...authUpdatePayload };

      const { error: updateUserError } = await adminSupabaseClient.auth.admin.updateUserById(
        user_id,
        { user_metadata: newMetadata } // Use merged metadata
      );
      if (updateUserError) {
        console.error("Error updating auth.users metadata:", updateUserError);
        throw new Error(`Failed to update auth.users metadata: ${updateUserError.message}`);
      }
      console.log("Successfully updated auth.users metadata.");
    } else {
      console.log("No auth.users metadata to update.");
    }

    // 5. Update public.profiles table
    console.log(`Attempting to update public.profiles for user_id: ${user_id} with data: ${JSON.stringify(profileUpdatePayload)}`);
    const { data: updatedProfile, error: updateProfileError } = await adminSupabaseClient
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', user_id)
      .select()
      .single();

    if (updateProfileError) {
      console.error("Error updating public.profiles table:", updateProfileError);
      throw new Error(`Failed to update public.profiles: ${updateProfileError.message}`);
    }
    console.log("Successfully updated public.profiles table.");

    // 6. If the account was just suspended for non-payment, email + notify the client
    if (suspensionActivated) {
      await sendSuspensionEmail(adminSupabaseClient, user_id);
    }

    // 7. Return success response
    return new Response(JSON.stringify({ data: updatedProfile, message: "User updated successfully." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in update-user-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});