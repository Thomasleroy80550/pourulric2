import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
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
  notify_new_booking_email: boolean;
  notify_cancellation_email: boolean;
}

interface KrossbookingReservation {
  id: string;
  guest_name: string;
  property_name: string;
  check_in_date: string;
  check_out_date: string;
  amount: string;
  status: string; // 'PROP0', 'PROPRI', 'CANC'
}

async function sendNewBookingEmail(profile: UserProfile, reservation: KrossbookingReservation) {
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

async function sendCancellationEmail(profile: UserProfile, reservation: KrossbookingReservation) {
  const checkInDate = isValid(parseISO(reservation.check_in_date)) ? format(parseISO(reservation.check_in_date), 'dd MMMM yyyy', { locale: fr }) : reservation.check_in_date;
  
  const subject = `Annulation de réservation pour ${reservation.property_name}`;
  const html = `
      <h1>Annulation de réservation</h1>
      <p>Bonjour ${profile.first_name || ''},</p>
      <p>La réservation suivante pour votre logement <strong>${reservation.property_name}</strong> a été annulée :</p>
      <ul>
          <li><strong>Client :</strong> ${reservation.guest_name}</li>
          <li><strong>Date d'arrivée prévue :</strong> ${checkInDate}</li>
      </ul>
      <p>Cette réservation a été retirée de votre calendrier.</p>
  `;

  try {
    await resend.emails.send({
      from: 'Hello Keys <noreply@notifications.hellokeys.fr>',
      to: [profile.email],
      subject: subject,
      html: html,
    });
    console.log(`Email d'annulation envoyé à ${profile.email} pour la réservation ${reservation.id}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email d'annulation pour la réservation ${reservation.id}:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authorization = req.headers.get('Authorization');
  if (authorization !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        first_name,
        email,
        notify_new_booking_email,
        notify_cancellation_email,
        user_rooms(room_id, room_name)
      `)
      .or('notify_new_booking_email.eq.true,notify_cancellation_email.eq.true')
      .not('email', 'is', null);

    if (profilesError) throw profilesError;
    
    const formattedProfiles: UserProfile[] = profiles;

    for (const profile of formattedProfiles) {
      if (!profile.user_rooms || profile.user_rooms.length === 0) continue;

      const proxyResponse = await fetch(`${SUPABASE_URL}/functions/v1/krossbooking-proxy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`
        },
        body: JSON.stringify({
            action: 'get_reservations_for_user_rooms',
            rooms: profile.user_rooms
        })
      });

      if (!proxyResponse.ok) {
          const errorText = await proxyResponse.text();
          console.error(`Erreur Krossbooking pour l'utilisateur ${profile.id}: Proxy a retourné ${proxyResponse.status}. ${errorText}`);
          continue;
      }

      const reservationsResponse = await proxyResponse.json();
      const reservations = reservationsResponse.data;

      if (!Array.isArray(reservations)) {
        console.warn(`La réponse de Krossbooking n'est pas un tableau pour l'utilisateur ${profile.id}`);
        continue;
      }

      const { data: processedReservations, error: processedError } = await supabaseAdmin
        .from('processed_reservations')
        .select('reservation_id, status')
        .eq('user_id', profile.id);

      if (processedError) {
        console.error(`Erreur de récupération des réservations traitées pour ${profile.id}:`, processedError.message);
        continue;
      }

      const processedMap = new Map(processedReservations.map(p => [p.reservation_id.toString(), p.status]));

      for (const res of reservations) {
        const currentReservation: KrossbookingReservation = {
            id: res.id_reservation.toString(),
            guest_name: res.label || 'N/A',
            property_name: profile.user_rooms.find(r => r.room_id == res.id_room)?.room_name || 'N/A',
            check_in_date: res.arrival || '',
            check_out_date: res.departure || '',
            amount: res.charge_total_amount ? `${res.charge_total_amount}€` : '0€',
            status: res.cod_reservation_status,
        };

        const storedStatus = processedMap.get(currentReservation.id);
        
        console.log(`Traitement résa ${currentReservation.id}: Statut Actuel='${currentReservation.status}', Statut Stocké='${storedStatus}'`);

        if (storedStatus) {
          // Réservation existante, on vérifie si le statut a changé
          if (storedStatus !== currentReservation.status) {
            console.log(`Changement de statut détecté pour la réservation ${currentReservation.id}: de '${storedStatus}' à '${currentReservation.status}'`);
            // On vérifie si c'est une annulation
            if (storedStatus !== 'CANC' && currentReservation.status === 'CANC' && profile.notify_cancellation_email) {
              console.log(`-> Condition d'annulation remplie. Envoi de l'email.`);
              await sendCancellationEmail(profile, currentReservation);
            }
          }
        } else {
          // Nouvelle réservation
          if (currentReservation.status !== 'CANC' && profile.notify_new_booking_email) {
            console.log(`-> Condition de nouvelle réservation remplie. Envoi de l'email.`);
            await sendNewBookingEmail(profile, currentReservation);
          }
        }

        const { error: upsertError } = await supabaseAdmin
          .from('processed_reservations')
          .upsert(
            {
              user_id: profile.id,
              reservation_id: currentReservation.id,
              status: currentReservation.status,
              last_processed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,reservation_id' }
          );

        if (upsertError) {
          console.error(`Erreur lors de l'upsert de la réservation ${currentReservation.id} pour l'utilisateur ${profile.id}:`, upsertError.message);
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