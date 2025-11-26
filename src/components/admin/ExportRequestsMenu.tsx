"use client";

import React, { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { SeasonPricingRequest } from "@/lib/season-pricing-api";

type Props = {
  data: SeasonPricingRequest[];
  tableRef: RefObject<HTMLDivElement>;
  currentStatus: string;
};

const ExportRequestsMenu: React.FC<Props> = ({ data, tableRef, currentStatus }) => {
  const fileBaseName = `demandes_saison_2026_${currentStatus}_${format(new Date(), "yyyyMMdd")}`;

  const toRequestRows = () => {
    return (data || []).map((req) => ({
      Utilisateur: req.profiles ? `${(req.profiles.first_name || "").trim()} ${(req.profiles.last_name || "").trim()}`.trim() : "",
      Logement: req.room_name || req.room_id || "",
      Année: req.season_year,
      "Nb périodes": Array.isArray(req.items) ? req.items.length : 0,
      Statut: req.status,
      Date: format(new Date(req.created_at), "dd/MM/yyyy", { locale: fr }),
    }));
  };

  const toItemRows = () => {
    const rows: any[] = [];
    (data || []).forEach((req) => {
      const items = Array.isArray(req.items) ? req.items : [];
      items.forEach((it: any, idx: number) => {
        rows.push({
          DemandeID: req.id,
          Utilisateur: req.profiles ? `${(req.profiles.first_name || "").trim()} ${(req.profiles.last_name || "").trim()}`.trim() : "",
          Logement: req.room_name || req.room_id || "",
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
        });
      });
    });
    return rows;
  };

  const handleCSV = async () => {
    const id = toast.loading("Génération du CSV…");
    const ws = XLSX.utils.json_to_sheet(toRequestRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demandes");
    const csv = XLSX.write(wb, { type: "string", bookType: "csv" });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${fileBaseName}.csv`);
    URL.revokeObjectURL(url);
    toast.success("CSV prêt au téléchargement.", { id });
  };

  const handleXLSX = async () => {
    const id = toast.loading("Génération du fichier Excel…");
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(toRequestRows());
    XLSX.utils.book_append_sheet(wb, ws1, "Demandes");
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
    const container = tableRef.current;
    if (!container) {
      toast.error("Tableau introuvable pour export PDF.", { id });
      return;
    }
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calcul pour garder le ratio
    const imgWidth = pageWidth - 20; // marges
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let y = 10;
    pdf.setFontSize(14);
    pdf.text("Demandes Saison 2026", 10, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.text(`Statut: ${currentStatus} — Export du ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`, 10, y);
    y += 6;

    // Si l'image dépasse la page, on ajoute des pages
    if (imgHeight <= pageHeight - y - 10) {
      pdf.addImage(imgData, "PNG", 10, y, imgWidth, imgHeight);
    } else {
      let remainingHeight = imgHeight;
      let positionY = y;
      const sliceHeight = pageHeight - y - 10;

      // Ajouter la première portion
      pdf.addImage(imgData, "PNG", 10, positionY, imgWidth, sliceHeight);
      remainingHeight -= sliceHeight;

      // Ajouter des pages pour le reste
      while (remainingHeight > 0) {
        pdf.addPage();
        positionY = 10;
        const heightForPage = Math.min(pageHeight - 20, remainingHeight);
        // Re-add the same img and let PDF clip; simple approach
        pdf.addImage(imgData, "PNG", 10, positionY, imgWidth, imgHeight);
        remainingHeight -= heightForPage;
      }
    }

    pdf.save(`${fileBaseName}.pdf`);
    toast.success("PDF prêt au téléchargement.", { id });
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Exporter les demandes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCSV}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={handleXLSX}>Excel (.xlsx)</DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportRequestsMenu;