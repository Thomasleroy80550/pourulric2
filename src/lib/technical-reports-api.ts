import { supabase } from '../integrations/supabase/client';
import { Notification, sendEmail, createNotification } from './notifications-api'; // Import createNotification

export interface TechnicalReport {
  id: string;
  user_id: string;
  property_name: string;
  title: string;
  description: string | null;
  status: 'pending_owner_action' | 'admin_will_manage' | 'resolved' | 'archived';
  owner_response: string | null;
  resolved_at: string | null;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
  category: string | null;
  media_urls: string[] | null;
  is_archived: boolean;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface TechnicalReportUpdate {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_urls: string[] | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export async function createTechnicalReport(report: Omit<TechnicalReport, 'id' | 'created_at' | 'status' | 'is_archived' | 'resolved_at' | 'owner_response'>): Promise<TechnicalReport> {
  const { data, error } = await supabase
    .from('technical_reports')
    .insert({ ...report, status: 'pending_owner_action', is_archived: false })
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la création du rapport technique : ${error.message}`);

  // Add a notification for the user
  const notificationMessage = `Action requise : Un nouvel incident a été créé pour votre propriété : ${data.title}`;
  const notificationLink = `/reports/${data.id}`;
  await createNotification(data.user_id, notificationMessage, notificationLink);

  // Send email to the user
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('id', data.user_id)
      .single();

    if (profileError) {
      console.error("Erreur lors de la récupération de l'email de l'utilisateur pour le rapport technique :", profileError.message);
    } else if (profileData?.email) {
      const userFirstName = profileData.first_name || 'Cher utilisateur';
      const subject = `Action requise : Nouveau rapport technique créé : ${data.title}`;
      const htmlContent = `
        <p>Bonjour ${userFirstName},</p>
        <p>Un nouveau rapport technique a été créé pour votre propriété :</p>
        <p><strong>Titre :</strong> ${data.title}</p>
        <p><strong>Description :</strong> ${data.description || 'N/A'}</p>
        <p>Vous pouvez consulter les détails et suivre l'avancement de ce rapport en cliquant sur le lien ci-dessous :</p>
        <p><a href="${import.meta.env.VITE_APP_BASE_URL}/reports/${data.id}">Voir le rapport technique</a></p>
        <p>Merci de votre confiance.</p>
        <p>L'équipe Hello Keys</p>
      `;
      await sendEmail(profileData.email, subject, htmlContent);
      console.log(`Email de rapport technique envoyé à ${profileData.email}`);
    }
  } catch (emailError: any) {
    console.error("Erreur lors de l'envoi de l'email de rapport technique :", emailError.message);
  }

  return data;
}

export async function getTechnicalReportsByUserId(userId: string): Promise<TechnicalReport[]> {
  const { data, error } = await supabase
    .from('technical_reports')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erreur lors de la récupération des rapports techniques : ${error.message}`);
  return data || [];
}

export async function getTechnicalReportById(reportId: string): Promise<TechnicalReport | null> {
  const { data, error } = await supabase
    .from('technical_reports')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    throw new Error(`Erreur lors de la récupération du rapport technique : ${error.message}`);
  }
  return data;
}

export async function updateTechnicalReport(reportId: string, updates: Partial<Omit<TechnicalReport, 'id' | 'user_id' | 'created_at'>>): Promise<TechnicalReport> {
  const { data, error } = await supabase
    .from('technical_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la mise à jour du rapport technique : ${error.message}`);
  return data;
}

export async function deleteTechnicalReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('technical_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw new Error(`Erreur lors de la suppression du rapport technique : ${error.message}`);
}

export async function addTechnicalReportUpdate(update: Omit<TechnicalReportUpdate, 'id' | 'created_at'>): Promise<TechnicalReportUpdate> {
  const { data, error } = await supabase
    .from('technical_report_updates')
    .insert(update)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de l'ajout de la mise à jour du rapport technique : ${error.message}`);
  return data;
}

export async function getTechnicalReportUpdates(reportId: string): Promise<TechnicalReportUpdate[]> {
  const { data, error } = await supabase
    .from('technical_report_updates')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erreur lors de la récupération des mises à jour du rapport technique : ${error.message}`);
  return data || [];
}

// New function to get admin reports by status and archive status
export async function getAdminReportsByStatus(
  statuses: TechnicalReport['status'][],
  archived: boolean = false
): Promise<TechnicalReport[]> {
  const { data, error } = await supabase
    .from('technical_reports')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('is_archived', archived)
    .in('status', statuses)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erreur lors de la récupération des rapports par statut (admin): ${error.message}`);
  return data || [];
}

export async function archiveReport(reportId: string): Promise<TechnicalReport> {
  const { data, error } = await supabase
    .from('technical_reports')
    .update({ is_archived: true, status: 'archived' })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de l'archivage du rapport : ${error.message}`);
  return data;
}

// New function for admin to request owner action
export async function requestOwnerAction(reportId: string, adminId: string): Promise<TechnicalReport> {
  // First, get the report details to send notification to the correct user
  const { data: reportData, error: fetchError } = await supabase
    .from('technical_reports')
    .select('user_id, title')
    .eq('id', reportId)
    .single();

  if (fetchError || !reportData) {
    throw new Error(`Erreur lors de la récupération du rapport pour la réaffectation : ${fetchError?.message || 'Rapport non trouvé'}`);
  }

  // Update the report status
  const { data, error: updateError } = await supabase
    .from('technical_reports')
    .update({ status: 'pending_owner_action' })
    .eq('id', reportId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Erreur lors de la mise à jour du statut du rapport : ${updateError.message}`);
  }

  // Send notification to the user
  const notificationMessage = `Action requise : Votre rapport technique "${reportData.title}" nécessite votre attention.`;
  const notificationLink = `/reports/${reportId}`;
  await createNotification(reportData.user_id, notificationMessage, notificationLink);

  // Send email to the user
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name')
      .eq('id', reportData.user_id)
      .single();

    if (profileError) {
      console.error("Erreur lors de la récupération de l'email de l'utilisateur pour la notification de réaffectation :", profileError.message);
    } else if (profileData?.email) {
      const userFirstName = profileData.first_name || 'Cher utilisateur';
      const subject = `Action requise sur votre rapport technique : ${reportData.title}`;
      const htmlContent = `
        <p>Bonjour ${userFirstName},</p>
        <p>Votre rapport technique intitulé "<strong>${reportData.title}</strong>" nécessite votre attention.</p>
        <p>L'équipe Hello Keys vous demande de bien vouloir consulter ce rapport et d'y apporter les actions nécessaires.</p>
        <p>Vous pouvez consulter les détails et agir sur ce rapport en cliquant sur le lien ci-dessous :</p>
        <p><a href="${import.meta.env.VITE_APP_BASE_URL}/reports/${reportId}">Voir le rapport technique</a></p>
        <p>Merci de votre coopération.</p>
        <p>L'équipe Hello Keys</p>
      `;
      await sendEmail(profileData.email, subject, htmlContent);
      console.log(`Email de réaffectation de rapport technique envoyé à ${profileData.email}`);
    }
  } catch (emailError: any) {
    console.error("Erreur lors de l'envoi de l'email de réaffectation de rapport technique :", emailError.message);
  }

  return data;
}