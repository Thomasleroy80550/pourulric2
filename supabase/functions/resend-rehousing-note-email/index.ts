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
}

async function isAdmin(supabaseClient: any): Promise<boolean> {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return false;

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching user role:', error);
    return false;
  }

  return profile.role === 'admin';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const isUserAdmin = await isAdmin(supabaseClient);
    if (!isUserAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { note_id } = await req.json();

    if (!note_id) {
      return new Response(JSON.stringify({ error: 'Missing parameter: note_id is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: note, error: noteError } = await supabaseClient
      .from('rehousing_notes')
      .select('*')
      .eq('id', note_id)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: 'Rehousing note not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: userProfile, error: userProfileError } = await supabaseClient
      .from('profiles')
      .select('email, first_name')
      .eq('id', note.user_id)
      .single();

    if (userProfileError || !userProfile) {
        console.error(`Could not find profile for user ${note.user_id}`);
    }

    const { data: adminProfiles, error: adminProfilesError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('role', 'admin');

    if (adminProfilesError) {
        console.error('Error fetching admin profiles:', adminProfilesError);
    }

    const emailsToSend = [];

    if (userProfile && userProfile.email) {
      emailsToSend.push(resend.emails.send({
        from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
        to: [userProfile.email],
        subject: `Rappel: Confirmation de votre note de relogement`,
        html: `Bonjour ${userProfile.first_name || 'Client'},<br><br>Ceci est un rappel concernant votre note de relogement de type "${note.note_type}" d'un montant de ${note.amount_to_transfer}€.<br><br>Cordialement,<br>L'équipe`,
      }));
    }

    if (adminProfiles && adminProfiles.length > 0) {
      const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);
      if (adminEmails.length > 0) {
        emailsToSend.push(resend.emails.send({
          from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
          to: adminEmails,
          subject: `Rappel de notification pour une note de relogement`,
          html: `Une notification pour une note de relogement a été renvoyée à ${userProfile ? (userProfile.first_name || userProfile.email) : 'un utilisateur inconnu'}.<br><br>Détails :<br>Type : ${note.note_type}<br>Montant à transférer : ${note.amount_to_transfer}€<br>Bénéficiaire : ${note.recipient_name}`,
        }));
      }
    }

    await Promise.all(emailsToSend);

    return new Response(JSON.stringify({ message: 'Notification email resent successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Server Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
})