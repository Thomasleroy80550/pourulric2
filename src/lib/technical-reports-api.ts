import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications-api";

export interface TechnicalReportUpdate {
  id: string;
  report_id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_urls?: string[];
  profiles: { // For joining author data
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface TechnicalReport {
  id: string;
  user_id: string;
  property_name: string;
  title: string;
  description?: string;
  status: 'pending_owner_action' | 'owner_will_manage' | 'admin_will_manage' | 'resolved';
  owner_response?: string;
  resolved_at?: string;
  created_at: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  media_urls?: string[];
  profiles?: { // For joining user data
    first_name: string;
    last_name: string;
  };
  technical_report_updates?: TechnicalReportUpdate[]; // To hold updates
}

export type NewTechnicalReport = Omit<TechnicalReport, 'id' | 'created_at' | 'status' | 'owner_response' | 'resolved_at' | 'profiles' | 'technical_report_updates' | 'media_urls'> & {
  media_files?: FileList;
};

// For Admins: Get all reports
export async function getAdminReports(): Promise<TechnicalReport[]> {
  const { data, error } = await supabase
    .from('technical_reports')
    .select(`
      *,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erreur (admin): ${error.message}`);
  return data || [];
}

// For Owners: Get their own reports
export async function getUserReports(): Promise<TechnicalReport[]> {
  const { data, error } = await supabase
    .from('technical_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erreur (user): ${error.message}`);
  return data || [];
}

// Get a single report by ID, including its updates
export async function getReportById(id: string): Promise<TechnicalReport | null> {
  const { data, error } = await supabase
    .from('technical_reports')
    .select(`
      *,
      profiles (first_name, last_name),
      technical_report_updates (
        *,
        profiles (first_name, last_name, role)
      )
    `)
    .eq('id', id)
    .order('created_at', { referencedTable: 'technical_report_updates', ascending: true })
    .single();

  if (error) throw new Error(`Erreur lors de la récupération du rapport: ${error.message}`);
  return data;
}

// For Admins: Create a new report
export async function createReport(reportData: NewTechnicalReport): Promise<TechnicalReport> {
  const { media_files, ...reportDbData } = reportData;
  let mediaUrls: string[] = [];

  if (media_files && media_files.length > 0) {
    for (const file of Array.from(media_files)) {
      const filePath = `${reportData.user_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('technical_reports_media')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Erreur lors du téléversement du fichier: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('technical_reports_media')
        .getPublicUrl(filePath);
      
      mediaUrls.push(urlData.publicUrl);
    }
  }

  const { data, error } = await supabase
    .from('technical_reports')
    .insert({ ...reportDbData, media_urls: mediaUrls })
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la création du rapport: ${error.message}`);
  
  await createNotification(
    reportData.user_id,
    `Nouveau rapport technique pour ${reportData.property_name}: "${reportData.title}"`,
    `/reports/${data.id}`
  );

  return data;
}

// For Owners: Respond to a report (updates status)
export async function respondToReport(reportId: string, response: 'owner_will_manage' | 'admin_will_manage', comment?: string): Promise<TechnicalReport> {
  const { data, error } = await supabase
    .from('technical_reports')
    .update({ status: response, owner_response: comment })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la réponse au rapport: ${error.message}`);
  return data;
}

// For Admins or Owners: Mark a report as resolved
export async function markReportAsResolved(reportId: string): Promise<TechnicalReport> {
  const { data, error } = await supabase
    .from('technical_reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la résolution du rapport: ${error.message}`);
  return data;
}

// Add an update/comment to a report, now with media
export async function addReportUpdate(reportId: string, content: string, mediaFiles?: FileList | null): Promise<TechnicalReportUpdate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  let mediaUrls: string[] = [];
  if (mediaFiles && mediaFiles.length > 0) {
    for (const file of Array.from(mediaFiles)) {
      const filePath = `${user.id}/${reportId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('technical_reports_media')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Erreur lors du téléversement du fichier: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('technical_reports_media')
        .getPublicUrl(filePath);
      
      mediaUrls.push(urlData.publicUrl);
    }
  }

  const { data, error } = await supabase
    .from('technical_report_updates')
    .insert({ report_id: reportId, user_id: user.id, content, media_urls: mediaUrls.length > 0 ? mediaUrls : undefined })
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de l'ajout de la mise à jour: ${error.message}`);
  return data;
}