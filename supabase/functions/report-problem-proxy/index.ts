import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate with Supabase to get the user's session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const requestBody = await req.json();
    const { reservation_id, problem_type, description, contact_email, contact_phone, guest_name, property_name } = requestBody; // Added guest_name and property_name

    if (!reservation_id || !problem_type || !description) {
      return new Response(JSON.stringify({ error: "Missing required fields: reservation_id, problem_type, description." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 1. Save the report to the database
    const { data: reportData, error: insertError } = await supabaseClient
      .from('reports')
      .insert({
        user_id: user.id,
        reservation_id,
        problem_type,
        description,
        contact_email,
        contact_phone,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting report:", insertError.message);
      throw new Error(`Failed to submit report: ${insertError.message}`);
    }

    // 2. Send an email notification
    const EMAIL_SERVICE_API_KEY = Deno.env.get('EMAIL_SERVICE_API_KEY');
    const EMAIL_SENDER_ADDRESS = Deno.env.get('EMAIL_SENDER_ADDRESS');
    const EMAIL_RECEIVER_ADDRESS = 'contact@hellokeys.fr'; // Hardcoded recipient

    if (!EMAIL_SERVICE_API_KEY || !EMAIL_SENDER_ADDRESS) {
      console.warn("Missing email service environment variables. Email will not be sent.");
      // Continue without sending email, but log a warning
    } else {
      const emailSubject = `[${problem_type}] - Problème Réservation N° ${reservation_id}`;
      const emailBody = `
        Un nouveau problème a été signalé pour la réservation N° ${reservation_id}.

        Détails de la réservation :
        - Client : ${guest_name || 'N/A'}
        - Propriété : ${property_name || 'N/A'}

        Type de problème : ${problem_type}
        Description :
        ${description}

        Informations de contact de l'utilisateur :
        - Email : ${contact_email || 'Non fourni'}
        - Téléphone : ${contact_phone || 'Non fourni'}
        - ID Utilisateur Supabase : ${user.id}
      `;

      try {
        // This is a placeholder for your actual email sending API call.
        // Replace this with the specific API endpoint and payload for your chosen service (e.g., SendGrid, Resend, Mailgun).
        // Example using a generic API structure:
        const emailResponse = await fetch('YOUR_EMAIL_SERVICE_API_ENDPOINT', { // <-- REMPLACEZ CECI
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EMAIL_SERVICE_API_KEY}`, // Use your email service's API key
          },
          body: JSON.stringify({
            from: EMAIL_SENDER_ADDRESS,
            to: EMAIL_RECEIVER_ADDRESS,
            subject: emailSubject,
            text: emailBody,
            // Add any other parameters required by your email service (e.g., html, attachments)
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Failed to send email: ${emailResponse.status} ${emailResponse.statusText} - ${errorText}`);
          // Do not throw error here, as the report was already saved to DB.
          // Just log the email sending failure.
        } else {
          console.log("Email notification sent successfully.");
        }
      } catch (emailError: any) {
        console.error("Error sending email notification:", emailError.message);
      }
    }

    return new Response(JSON.stringify({ data: reportData, message: "Report submitted successfully." }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in report-problem-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});