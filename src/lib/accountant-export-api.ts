import { supabase } from "@/integrations/supabase/client";

export type AccountantExportClient = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type AccountantExportInvoice = {
  id: string;
  user_id: string;
  period: string;
  invoice_data: any;
  totals: any;
  created_at: string;
  is_paid?: boolean | null;
  paid_at?: string | null;
};

export async function fetchAccountantExportData(): Promise<{
  invoices: AccountantExportInvoice[];
  clients: AccountantExportClient[];
}> {
  const { data, error } = await supabase.functions.invoke('export-accountant-statements');
  if (error) {
    throw new Error(error.message || "Erreur lors de la récupération des relevés.");
  }

  return {
    invoices: (data?.invoices ?? []) as AccountantExportInvoice[],
    clients: (data?.clients ?? []) as AccountantExportClient[],
  };
}
