import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { Resend } from "npm:resend";
import { format, parseISO, isValid } from 'https://deno.land/std@0.208.0/datetime/mod.ts';
import { fr } from 'npm:date-fns/locale/fr';

// --- Secrets d'environnement ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const CRON_SECRET = Deno.env.get('CRON_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Initialisation des clients ---
const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(RESEND_API_KEY);

interface UserProfile {
  id: string;
  first_name: string;
  email: string;
  user_rooms: { room_id: string, room_name: string }[];
}

interface KrossbookingReservation {
  id: string;
  guest_name: string;
  property_name: string;
  check_in_date: string;
  check_out_date: string;
  amount: string;
}

async function sendNotificationEmail(profile: UserProfile, reservation: KrossbookingReservation) {
  const checkInDate = isValid(parseISO(reservation.check_in_date)) ? format(parseISO(reservation.check_in_date), 'dd MMMM yyyy', { locale: fr }) : reservation.check_in_date;
  const checkOutDate = isValid(parseISO(reservation.check_out_date)) ? format(parseISO(reservation.check_out_date), 'dd MMMM yyyy', { locale: fr }) : reservation.check_out_date;
  
  const subject = `Nouvelle réservation pour ${reservation.property_name}`;
  const html = `
      <h1>Nouvelle réservation</h1>
      <p>Bonjour ${profile.first_name || ''},</p>
      <p>Une nouvelle réservation a été enregistrée pour votre logement <strong>${reservation.property_name}</strong>.</p>
      <ul>
          <li><strong>Client :</strong> ${reservation.guest_name}</li>
          <li><strong>Arrivée :</strong> ${checkInDate}</li>
          <li><strong>Départ :</strong> ${checkOutDate}</li>
          <li><strong>Montant :</strong> ${reservation.amount}</li>
      </ul>
      <p>Vous pouvez consulter les détails sur votre espace propriétaire.</p>
  `;

  try {
    await resend.emails.send({
      from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
      to: [profile.email],
      subject: subject,
      html: html,
    });
    console.log(`Email de nouvelle réservation envoyé à ${profile.email} pour la réservation ${reservation.id}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email pour la réservation ${reservation.id}:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Sécurité : Seul le cron job peut appeler cette fonction
  const authorization = req.headers.get('Authorization');
  if (authorization !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    // 1. Récupérer tous les profils qui veulent des notifications par email
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        first_name,
        user:users(email),
        user_rooms(room_id, room_name)
      `)
      .eq('notify_new_booking_email', true);

    if (profilesError) throw profilesError;
    
    const formattedProfiles = profiles.map(p => ({
        id: p.id,
        first_name: p.first_name,
        email: p.user.email,
        user_rooms: p.user_rooms
    }));

    // 2. Pour chaque profil, vérifier les réservations
    for (const profile of formattedProfiles) {
      if (!profile.user_rooms || profile.user_rooms.length === 0) continue;

      // Récupérer les réservations Krossbooking pour cet utilisateur
      // Note: On ne peut pas utiliser le proxy car il dépend d'une session utilisateur.
      // On doit appeler Krossbooking directement ou via un proxy qui utilise une clé API de service.
      // Pour l'instant, on simule en invoquant le proxy avec les droits admin.
      const { data: reservations, error: reservationsError } = await supabaseAdmin.functions.invoke('krossbooking-proxy', {
          body: { 
              action: 'get_reservations_for_user_rooms', // Action hypothétique à créer dans le proxy
              rooms: profile.user_rooms 
          }
      });

      if (reservationsError) {
          console.error(`Erreur Krossbooking pour l'utilisateur ${profile.id}:`, reservationsError.message);
          continue;
      }
      
      if (!Array.isArray(reservations)) continue;

      // 3. Vérifier quelles réservations sont nouvelles
      for (const res of reservations) {
        const reservation: KrossbookingReservation = {
            id: res.id_reservation.toString(),
            guest_name: res.label || 'N/A',
            property_name: profile.user_rooms.find(r => r.room_id == res.id_room)?.room_name || 'N/A',
            check_in_date: res.arrival || '',
            check_out_date: res.departure || '',
            amount: res.charge_total_amount ? `${res.charge_total_amount}€` : '0€',
        };

        const { data: existing, error: checkError } = await supabaseAdmin
          .from('processed_reservations')
          .select('id')
          .eq('user_id', profile.id)
          .eq('reservation_id', reservation.id)
          .maybeSingle();

        if (checkError) {
            console.error(`Erreur de vérification de la réservation ${reservation.id}:`, checkError.message);
            continue;
        }

        // Si la réservation n'existe pas dans notre registre, elle est nouvelle !
        if (!existing) {
          console.log(`Nouvelle réservation trouvée: ${reservation.id} pour l'utilisateur ${profile.id}`);
          await sendNotificationEmail(profile, reservation);

          // Ajouter la réservation au registre pour ne pas la notifier à nouveau
          await supabaseAdmin
            .from('processed_reservations')
            .insert({ user_id: profile.id, reservation_id: reservation.id });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Verification complete.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur dans la fonction check-new-reservations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});