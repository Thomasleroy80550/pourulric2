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

    if (!subject || !html) {
      return new Response(JSON.stringify({ error: "Missing subject or html" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

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
    }

    let sent = 0;
    let failed = 0;

    // Envoi un par un
    for (const r of recipients) {
      if (!r?.email || r.is_banned === true) continue;

      const toEmail = r.email as string;
      try {
        const { error } = await resend.emails.send({
          from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
          to: [toEmail],
          subject,
          html,
        });
        if (error) {
          console.error("Resend error for", toEmail, error);
          failed += 1;
        } else {
          sent += 1;
        }
      } catch (e) {
        console.error("Send error for", toEmail, e);
        failed += 1;
      }
    }

    return new Response(JSON.stringify({ message: "Newsletter processed", sent, failed, testMode }), {
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