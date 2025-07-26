import { supabase } from "@/integrations/supabase/client";
import { addMonths, addQuarters, addYears, isBefore, parseISO, startOfYear, endOfYear } from 'date-fns';

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
  created_at: string;
}

export type NewRecurringExpense = Omit<RecurringExpense, 'id' | 'user_id' | 'created_at'>;

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

// --- Helper Function ---

export function generateRecurringInstances(recurringExpenses: RecurringExpense[], year: number): Expense[] {
  const instances: Expense[] = [];
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  recurringExpenses.forEach(recurring => {
    let currentDate = parseISO(recurring.start_date);
    const recurringEndDate = recurring.end_date ? parseISO(recurring.end_date) : null;

    while (isBefore(currentDate, yearStart)) {
      if (recurring.frequency === 'monthly') currentDate = addMonths(currentDate, 1);
      else if (recurring.frequency === 'quarterly') currentDate = addQuarters(currentDate, 1);
      else if (recurring.frequency === 'yearly') currentDate = addYears(currentDate, 1);
      else break;
    }

    while (isBefore(currentDate, yearEnd) || currentDate.getTime() === yearEnd.getTime()) {
      if (recurringEndDate && isBefore(recurringEndDate, currentDate)) {
        break;
      }

      instances.push({
        id: `recurring-${recurring.id}-${currentDate.toISOString()}`,
        user_id: recurring.user_id,
        amount: recurring.amount,
        description: `${recurring.description} (Récurrent)`,
        category: recurring.category,
        expense_date: currentDate.toISOString().split('T')[0],
        created_at: recurring.created_at,
      });

      if (recurring.frequency === 'monthly') currentDate = addMonths(currentDate, 1);
      else if (recurring.frequency === 'quarterly') currentDate = addQuarters(currentDate, 1);
      else if (recurring.frequency === 'yearly') currentDate = addYears(currentDate, 1);
      else break;
    }
  });

  return instances;
}