import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addMonths, addQuarters, addYears, isBefore, isSameDay, parseISO } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: recurringExpenses, error } = await supabaseAdmin
      .from('recurring_expenses')
      .select('*')
      .lte('start_date', today.toISOString().split('T')[0])
      .or(`end_date.is.null,end_date.gte.${today.toISOString().split('T')[0]}`);

    if (error) throw error;

    for (const expense of recurringExpenses) {
      const lastCreated = expense.last_created_date ? parseISO(expense.last_created_date) : parseISO(expense.start_date);
      let nextDueDate = lastCreated;

      // Calculate the next due date based on frequency
      if (expense.frequency === 'monthly') {
        nextDueDate = addMonths(lastCreated, 1);
      } else if (expense.frequency === 'quarterly') {
        nextDueDate = addQuarters(lastCreated, 1);
      } else if (expense.frequency === 'yearly') {
        nextDueDate = addYears(lastCreated, 1);
      }

      // If the next due date is today or in the past, create the expense
      if (isBefore(nextDueDate, today) || isSameDay(nextDueDate, today)) {
        // 1. Insert into expenses table
        const { error: insertError } = await supabaseAdmin
          .from('expenses')
          .insert({
            user_id: expense.user_id,
            amount: expense.amount,
            description: expense.description,
            category: expense.category,
            expense_date: nextDueDate.toISOString().split('T')[0],
          });

        if (insertError) {
          console.error(`Failed to create expense for recurring ID ${expense.id}:`, insertError);
          continue; // Skip to the next one
        }

        // 2. Update the last_created_date in recurring_expenses
        const { error: updateError } = await supabaseAdmin
          .from('recurring_expenses')
          .update({ last_created_date: nextDueDate.toISOString().split('T')[0] })
          .eq('id', expense.id);

        if (updateError) {
          console.error(`Failed to update last_created_date for recurring ID ${expense.id}:`, updateError);
        }
      }
    }

    return new Response(JSON.stringify({ message: "Recurring expenses processed." }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in create-recurring-expenses function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});