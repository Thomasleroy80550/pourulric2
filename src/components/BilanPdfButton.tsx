"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { generateBilanAnalysis, BilanInput } from "@/lib/bilan-ai";

type BilanPdfButtonProps = {
  year: number;
  totals: {
    ca: number;
    montantVerse: number;
    frais: number;
    depenses: number;
    resultatNet: number;
  };
  monthly: Array<{
    name: string;
    ca: number;
    montantVerse: number;
    frais: number;
    benef: number;
    nuits: number;
    reservations: number;
    prixParNuit: number;
  }>;
  className?: string;
};

const BilanPdfButton: React.FC<BilanPdfButtonProps> = ({ year, totals, monthly, className }) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const toastId = toast.loading("Génération du bilan…");

    try {
      const input: BilanInput = {
        year,
        totals: {
          totalCA: totals.ca,
          totalMontantVerse: totals.montantVerse,
          totalFrais: totals.frais,
          totalDepenses: totals.depenses,
          resultatNet: totals.resultatNet,
        },
        monthly: monthly.map(m => ({
          name: m.name,
          ca: m.ca,
          montantVerse: m.montantVerse,
          frais: m.frais,
          benef: m.benef,
          nuits: m.nuits,
          reservations: m.reservations,
          prixParNuit: m.prixParNuit,
        })),
      };

      const analysis = await generateBilanAnalysis(input);

      const pdf = new jsPDF("p", "mm", "a4");

      // Couverture
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(`Bilan ${year}`, 20, 25);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text("Synthèse annuelle", 20, 35);
      pdf.line(20, 37, 100, 37);

      // Bloc synthèse
      let y = 45;
      pdf.setFontSize(11);
      pdf.text(`Chiffre d'affaires: ${totals.ca.toFixed(2)} €`, 20, y); y += 6;
      pdf.text(`Montant versé: ${totals.montantVerse.toFixed(2)} €`, 20, y); y += 6;
      pdf.text(`Frais de gestion: ${totals.frais.toFixed(2)} €`, 20, y); y += 6;
      pdf.text(`Autres dépenses: ${totals.depenses.toFixed(2)} €`, 20, y); y += 6;
      pdf.text(`Résultat net: ${totals.resultatNet.toFixed(2)} €`, 20, y); y += 10;

      // Tableau mensuel
      autoTable(pdf, {
        startY: y,
        head: [[
          "Mois", "CA (€)", "Versé (€)", "Frais (€)", "Bénéf (€)", "Nuits", "Réserv.", "Prix/Nuit (€)"
        ]],
        body: monthly.map(m => [
          m.name,
          m.ca.toFixed(2),
          m.montantVerse.toFixed(2),
          m.frais.toFixed(2),
          m.benef.toFixed(2),
          String(m.nuits),
          String(m.reservations),
          m.prixParNuit.toFixed(2),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [34, 197, 94] },
      });

      // Nouvelle page pour l'analyse IA
      pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("Analyse IA (ChatGPT)", 20, 25);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      // Découper le texte en lignes pour le PDF
      const maxWidth = 170;
      const lines = pdf.splitTextToSize(analysis, maxWidth);
      pdf.text(lines, 20, 35);

      const stamp = new Date();
      const filename = `Bilan_${year}_${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}.pdf`;
      pdf.save(filename);

      toast.success("Bilan PDF généré !", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur lors de la génération du bilan.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
      className={className}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      Générer mon bilan
    </Button>
  );
};

export default BilanPdfButton;