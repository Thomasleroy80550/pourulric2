import { supabase } from "@/integrations/supabase/client";

export type StatementsExportClient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type StatementsExportInvoice = {
  id: string;
  user_id: string;
  period: string;
  invoice_data: any;
  totals: any;
  created_at: string;
  is_paid?: boolean | null;
  paid_at?: string | null;
};

export async function fetchStatementsExportData(): Promise<{
  invoices: StatementsExportInvoice[];
  clients: StatementsExportClient[];
}> {
  const { data, error } = await supabase.functions.invoke('export-statements');
  if (error) {
    throw new Error(error.message || "Erreur lors de la récupération des relevés.");
  }

  return {
    invoices: (data?.invoices ?? []) as StatementsExportInvoice[],
    clients: (data?.clients ?? []) as StatementsExportClient[],
  };
}