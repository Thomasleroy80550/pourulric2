import { supabase } from "@/integrations/supabase/client";
import { maintenanceClient } from "@/integrations/supabase/maintenance-client";

export interface MaintenanceQuestion {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
  answered_at: string | null;
}

export const questionsPageSize = 10;

export async function getMaintenanceQuestions(page: number) {
  const { data, error, count } = await maintenanceClient.from("maintenance_questions")
    .select("id, question, answer, created_at, answered_at", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(page * questionsPageSize, (page + 1) * questionsPageSize - 1)
    .abortSignal(AbortSignal.timeout(12000));
  if (error) throw new Error("Impossible de charger les questions.");
  return { questions: data as MaintenanceQuestion[], total: count ?? 0 };
}

export async function submitMaintenanceQuestion(question: string, website: string): Promise<void> {
  const { data, error } = await maintenanceClient.functions.invoke("maintenance-question", { body: { question, website } });
  if (error) {
    let message = "Impossible de publier votre question. Veuillez réessayer.";
    if (error.context instanceof Response) {
      try {
        const body = await error.context.json();
        if (typeof body.error === "string") message = body.error;
      } catch {}
    }
    throw new Error(message);
  }
  if (!data?.id) throw new Error("Impossible de publier votre question.");
}

export async function answerMaintenanceQuestion(id: string, answer: string): Promise<void> {
  const text = answer.trim();
  if (text.length > 4000) throw new Error("La réponse ne doit pas dépasser 4 000 caractères.");
  const { error } = await supabase.from("maintenance_questions")
    .update({ answer: text || null, answered_at: text ? new Date().toISOString() : null })
    .eq("id", id).select("id").single();
  if (error) throw new Error("Impossible de publier la réponse.");
}

export async function deleteMaintenanceQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_questions").delete().eq("id", id).select("id").single();
  if (error) throw new Error("Impossible de supprimer la question.");
}
