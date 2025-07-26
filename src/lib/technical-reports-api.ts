import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications-api";

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
  profiles?: { // For joining user data
    first_name: string;
    last_name: string;
  };
}

export type NewTechnicalReport = Omit<TechnicalReport, 'id' | 'created_at' | 'status' | 'owner_response' | 'resolved_at' | 'profiles'>;

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

// For Admins: Create a new report
export async function createReport(reportData: NewTechnicalReport): Promise<TechnicalReport> {
  const { data, error } = await supabase
    .from('technical_reports')
    .insert(reportData)
    .select()
    .single();

  if (error) throw new Error(`Erreur lors de la création du rapport: ${error.message}`);
  
  // Notify the user
  await createNotification(
    reportData.user_id,
    `Nouveau rapport technique pour ${reportData.property_name}: "${reportData.title}"`,
    '/reports'
  );

  return data;
}

// For Owners: Respond to a report
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

// For Admins: Mark a report as resolved
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