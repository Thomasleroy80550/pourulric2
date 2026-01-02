"use client";

import { supabase } from "@/integrations/supabase/client";

export type BilanInput = {
  year: number;
  totals: {
    totalCA: number;
    totalMontantVerse: number;
    totalFrais: number;
    totalDepenses: number;
    resultatNet: number;
    totalReservations?: number; // AJOUT
  };
  monthly: Array<{
    name: string; // mois court "Jan", "Fév"...
    ca: number;
    montantVerse: number;
    frais: number;
    benef: number;
    nuits: number;
    reservations: number;
    prixParNuit: number;
  }>;
};

export async function generateBilanAnalysis(input: BilanInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-bilan-analysis', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || "Erreur lors de la génération de l'analyse IA.");
  }

  if (!data || typeof data.analysis !== 'string') {
    throw new Error("Réponse invalide de l'IA.");
  }

  return data.analysis;
}