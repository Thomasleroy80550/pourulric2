// ... existing imports and interfaces ...

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

// ... rest of the file ...