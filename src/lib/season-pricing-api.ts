import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/notifications-api";
import { buildNewsletterHtml } from "@/components/EmailNewsletterTheme";
import DOMPurify from "dompurify";

export interface SeasonPricingItem {
  start_date: string; // yyyy-MM-dd
  end_date: string;   // yyyy-MM-dd
  period_type?: string;
  season?: string;
  price?: number | null;
  min_stay?: number | null;
  closed?: boolean;
  closed_on_arrival?: boolean;
  closed_on_departure?: boolean;
  comment?: string;
}

export interface CreateSeasonPricingRequestPayload {
  season_year: number;
  room_id?: string;
  room_name?: string;
  items: SeasonPricingItem[];
}

export interface SeasonPricingRequest {
  id: string;
  user_id: string;
  season_year: number;
  room_id?: string | null;
  room_name?: string | null;
  items: SeasonPricingItem[];
  status: 'pending' | 'processing' | 'done' | 'cancelled';
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export type SeasonPricingStatus = 'pending' | 'processing' | 'done' | 'cancelled';

export const getAllSeasonPricingRequests = async (): Promise<SeasonPricingRequest[]> => {
  // Récupère les demandes sans embed
  const { data: requests, error } = await supabase
    .from('season_price_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching season pricing requests:", error);
    throw new Error(error.message);
  }

  const list = requests || [];
  const userIds = Array.from(new Set(list.map(r => r.user_id).filter(Boolean)));

  if (userIds.length === 0) {
    return list.map(r => ({ ...r, profiles: null })) as SeasonPricingRequest[];
  }

  // Récupère les profils pour associer prénom/nom
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (profilesError) {
    console.error("Error fetching profiles for season pricing requests:", profilesError);
    // Si l'embed échoue, on retourne quand même les demandes sans profils
    return list.map(r => ({ ...r, profiles: null })) as SeasonPricingRequest[];
  }

  const profileMap = new Map<string, { first_name: string | null; last_name: string | null }>();
  (profiles || []).forEach(p => {
    profileMap.set(p.id, { first_name: p.first_name ?? null, last_name: p.last_name ?? null });
  });

  return list.map(r => ({
    ...r,
    profiles: profileMap.get(r.user_id) ?? null,
  })) as SeasonPricingRequest[];
};

export const updateSeasonPricingRequestStatus = async (id: string, status: SeasonPricingStatus): Promise<void> => {
  // Récupérer la demande pour connaître l'ancien statut et l'utilisateur
  const { data: current, error: fetchError } = await supabase
    .from('season_price_requests')
    .select('id, user_id, season_year, room_name, status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    console.error("Error fetching season pricing request before update:", fetchError);
    throw new Error(fetchError?.message || "Impossible de charger la demande.");
  }

  const previousStatus = current.status;

  const { error: updateError } = await supabase
    .from('season_price_requests')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    console.error("Error updating season pricing request status:", updateError);
    throw new Error(updateError.message);
  }

  // Déterminer si l'on doit envoyer un email pour cette transition
  const shouldEmail =
    (previousStatus === 'pending' && status === 'processing') ||
    (previousStatus === 'processing' && status === 'done') ||
    (status === 'cancelled' && previousStatus !== 'cancelled');

  if (!shouldEmail) {
    return;
  }

  // Récupérer l'email du propriétaire
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', current.user_id)
    .single();

  if (profileError || !profile?.email) {
    console.error("Error fetching user email for season request status change:", profileError);
    throw new Error(profileError?.message || "Email du propriétaire introuvable.");
  }

  const userName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Bonjour';
  const year = current.season_year;
  const room = current.room_name ? ` (${current.room_name})` : '';

  let subject = '';
  let bodyHtml = '';

  if (previousStatus === 'pending' && status === 'processing') {
    subject = `Votre demande de tarifs saison ${year} est en cours`;
    bodyHtml = `
      <p>${userName},</p>
      <p>Votre demande de tarifs pour la saison ${year}${room} est passée d’<strong>en attente</strong> à <strong>en cours</strong>.</p>
      <p>Notre équipe traite actuellement vos informations. Vous serez notifié dès que la demande sera terminée.</p>
      <p><a data-btn href="https://beta.proprietaire.hellokeys.fr">Accéder à mon espace</a></p>
      <p>Cordialement,<br/>L'équipe Hello Keys</p>
    `;
  } else if (previousStatus === 'processing' && status === 'done') {
    subject = `Votre demande de tarifs saison ${year} est terminée`;
    bodyHtml = `
      <p>${userName},</p>
      <p>Bonne nouvelle&nbsp;! Votre demande de tarifs pour la saison ${year}${room} est <strong>terminée</strong>.</p>
      <p>Vous pouvez consulter les détails depuis votre espace client Hello Keys.</p>
      <p><a data-btn href="https://beta.proprietaire.hellokeys.fr">Accéder à mon espace</a></p>
      <p>Cordialement,<br/>L'équipe Hello Keys</p>
    `;
  } else if (status === 'cancelled') {
    subject = `Votre demande de tarifs saison ${year} a été annulée`;
    bodyHtml = `
      <p>${userName},</p>
      <p>Votre demande de tarifs pour la saison ${year}${room} a été <strong>annulée</strong>.</p>
      <p>Si vous pensez qu'il s'agit d'une erreur ou souhaitez la relancer, contactez-nous.</p>
      <p><a data-btn href="https://beta.proprietaire.hellokeys.fr">Accéder à mon espace</a></p>
      <p>Cordialement,<br/>L'équipe Hello Keys</p>
    `;
  }

  // Construire l'email avec le thème Hello Keys + nettoyage HTML
  const themedHtml = buildNewsletterHtml({
    subject,
    bodyHtml: DOMPurify.sanitize(bodyHtml),
  });

  await sendEmail(profile.email, subject, themedHtml);
};

export const createSeasonPricingRequest = async (payload: CreateSeasonPricingRequestPayload) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("Utilisateur non authentifié.");

  const insertPayload = {
    user_id: user.id,
    season_year: payload.season_year,
    room_id: payload.room_id ?? null,
    room_name: payload.room_name ?? null,
    items: payload.items,
    status: 'pending' as const,
  };

  const { data, error } = await supabase
    .from('season_price_requests')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error("Error creating season pricing request:", error);
    throw new Error(error.message);
  }

  return data;
};