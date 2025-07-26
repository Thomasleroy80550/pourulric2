import { supabase } from "@/integrations/supabase/client";

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category?: string;
  expense_date: string; // ISO date string
  created_at: string;
}

export type NewExpense = Omit<Expense, 'id' | 'user_id' | 'created_at'>;

/**
 * Fetches all expenses for the current user for a given year.
 * @param year The year to fetch expenses for.
 * @returns A promise that resolves to an array of Expense objects.
 */
export async function getExpenses(year: number): Promise<Expense[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    throw new Error(`Erreur lors de la récupération des dépenses : ${error.message}`);
  }
  return data || [];
}

/**
 * Adds a new expense for the current user.
 * @param expenseData The data for the new expense.
 * @returns The created Expense object.
 */
export async function addExpense(expenseData: NewExpense): Promise<Expense> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...expenseData, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("Error adding expense:", error);
    throw new Error(`Erreur lors de l'ajout de la dépense : ${error.message}`);
  }
  return data;
}

/**
 * Deletes an expense by its ID.
 * @param id The ID of the expense to delete.
 */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting expense:", error);
    throw new Error(`Erreur lors de la suppression de la dépense : ${error.message}`);
  }
}