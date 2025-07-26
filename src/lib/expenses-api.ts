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

export interface RecurringExpense {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category?: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  start_date: string; // ISO date string
  end_date?: string; // ISO date string
  last_created_date?: string;
  created_at: string;
}

export type NewRecurringExpense = Omit<RecurringExpense, 'id' | 'user_id' | 'created_at' | 'last_created_date'>;

// --- Single Expenses ---

export async function getExpenses(year: number): Promise<Expense[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false });

  if (error) throw new Error(`Erreur lors de la récupération des dépenses : ${error.message}`);
  return data || [];
}

export async function addExpense(expenseData: NewExpense): Promise<Expense> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...expenseData, user_id: user.id })
    .select().single();

  if (error) throw new Error(`Erreur lors de l'ajout de la dépense : ${error.message}`);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(`Erreur lors de la suppression de la dépense : ${error.message}`);
}

// --- Recurring Expenses ---

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) throw new Error(`Erreur lors de la récupération des dépenses récurrentes : ${error.message}`);
  return data || [];
}

export async function addRecurringExpense(expenseData: NewRecurringExpense): Promise<RecurringExpense> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({ ...expenseData, user_id: user.id })
    .select().single();

  if (error) throw new Error(`Erreur lors de l'ajout de la dépense récurrente : ${error.message}`);
  return data;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
  if (error) throw new Error(`Erreur lors de la suppression de la dépense récurrente : ${error.message}`);
}