import { supabase } from './supabase/client';

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