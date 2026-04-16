import { supabase } from "@/integrations/supabase/client";
import { SavedInvoice } from "./admin-api";

const STATEMENTS_PAGE_SIZE = 1000;

/**
 * Fetches all saved invoices/statements for the currently logged-in user.
 * @returns A promise that resolves to an array of SavedInvoice objects.
 */
export async function getMyStatements(): Promise<SavedInvoice[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const statements: SavedInvoice[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + STATEMENTS_PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching user's statements:", error);
      throw new Error(`Erreur lors de la récupération de vos relevés : ${error.message}`);
    }

    const batch = data || [];
    statements.push(...batch);

    if (batch.length < STATEMENTS_PAGE_SIZE) {
      break;
    }

    from += STATEMENTS_PAGE_SIZE;
  }

  return statements;
}
