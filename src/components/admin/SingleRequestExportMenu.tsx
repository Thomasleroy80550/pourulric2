"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SeasonPricingRequest } from "@/lib/season-pricing-api";

type Props = {
  request: SeasonPricingRequest;
};

const SingleRequestExportMenu: React.FC<Props> = ({ request }) => {
  const fileBaseName = `demande_${request.id}_${request.status}_${format(new Date(request.created_at), "yyyyMMdd")}`;

  const toRequestRow = () => ({
    ID: request.id,
    Utilisateur: request.profiles ? `${(request.profiles.first_name || "").trim()} ${(request.profiles.last_name || "").trim()}`.trim() : "",
    Logement: request.room_name || request.room_id || "",
    Année: request.season_year,
    "Nb périodes": Array.isArray(request.items) ? request.items.length : 0,
    Statut: request.status,
    Date: format(new Date(request.created_at), "dd/MM/yyyy", { locale: fr }),
  });

  const toItemRows = () => {
    const items = Array.isArray(request.items) ? request.items : [];
    return items.map((it: any, idx: number) => ({
      "Période #": idx + 1,
      Du: it.start_date || "",
      Au: it.end_date || "",
      Type: it.period_type || "",
      Saison: it.season || "",
      Prix: typeof it.price === "number" ? it.price : "",
      "Min séjour": typeof it.min_stay === "number" ? it.min_stay : "",
      Fermé: it.closed ? "Oui" : "Non",
      "Arrivée fermée": it.closed_on_arrival ? "Oui" : "Non",
      "Départ fermé": it.closed_on_departure ? "Oui" : "Non",
      Commentaire: it.comment || "",
    }));
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCSV = async () => {
    const id = toast.loading("Génération du CSV…");
    const ws = XLSX.utils.json_to_sheet([toRequestRow()]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demande");
    const csv = XLSX.write(wb, { type: "string", bookType: "csv" });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${fileBaseName}.csv`);
    URL.revokeObjectURL(url);
    toast.success("CSV prêt au téléchargement.", { id });
  };

  const handleXLSX = async () => {
    const id = toast.loading("Génération de l’Excel…");
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet([toRequestRow()]);
    XLSX.utils.book_append_sheet(wb, ws1, "Demande");
    const ws2 = XLSX.utils.json_to_sheet(toItemRows());
    XLSX.utils.book_append_sheet(wb, ws2, "Périodes");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${fileBaseName}.xlsx`);
    URL.revokeObjectURL(url);
    toast.success("Excel prêt au téléchargement.", { id });
  };

  const handlePDF = async () => {
    const id = toast.loading("Génération du PDF…");
    const pdf = new jsPDF("p", "mm", "a4");
    let y = 10;

    pdf.setFontSize(14);
    pdf.text("Demande Saison 2026", 10, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.text(`ID: ${request.id}`, 10, y); y += 5;
    const userName = request.profiles ? `${(request.profiles.first_name || "").trim()} ${(request.profiles.last_name || "").trim()}`.trim() : "—";
    pdf.text(`Utilisateur: ${userName}`, 10, y); y += 5;
    pdf.text(`Logement: ${request.room_name || request.room_id || "—"}`, 10, y); y += 5;
    pdf.text(`Année: ${request.season_year}`, 10, y); y += 5;
    pdf.text(`Statut: ${request.status}`, 10, y); y += 5;
    pdf.text(`Date: ${format(new Date(request.created_at), "dd/MM/yyyy", { locale: fr })}`, 10, y); y += 8;

    pdf.setFontSize(12);
    pdf.text("Périodes:", 10, y);
    y += 6;

    pdf.setFontSize(10);
    const items = Array.isArray(request.items) ? request.items : [];
    if (items.length === 0) {
      pdf.text("Aucun détail fourni.", 10, y);
    } else {
      items.forEach((it: any, idx: number) => {
        const line1 = `#${idx + 1} Du: ${it.start_date || "—"}  Au: ${it.end_date || "—"}  Type: ${it.period_type || "—"}  Saison: ${it.season || "—"}`;
        const line2 = `Prix: ${typeof it.price === "number" ? `${it.price} €` : "—"}  Min séjour: ${typeof it.min_stay === "number" ? it.min_stay : "—"}`;
        const line3 = `Fermé: ${it.closed ? "Oui" : "Non"}  Arrivée fermée: ${it.closed_on_arrival ? "Oui" : "Non"}  Départ fermé: ${it.closed_on_departure ? "Oui" : "Non"}`;

        // Gestion des sauts de page simples
        const addLine = (text: string) => {
          if (y > 275) {
            pdf.addPage();
            y = 10;
          }
          pdf.text(text, 10, y);
          y += 5;
        };

        addLine(line1);
        addLine(line2);
        addLine(line3);

        if (it.comment) {
          addLine(`Commentaire: ${it.comment}`);
        }
        y += 3;
      });
    }

    pdf.save(`${fileBaseName}.pdf`);
    toast.success("PDF prêt au téléchargement.", { id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="px-2">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Exporter la demande</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCSV}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleXLSX}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SingleRequestExportMenu;