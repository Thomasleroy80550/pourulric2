"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

type BilanExportButtonProps = {
  targetRef: React.RefObject<HTMLElement>;
  filename?: string;
  className?: string;
};

const BilanExportButton: React.FC<BilanExportButtonProps> = ({ targetRef, filename = "Bilan_2025", className }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!targetRef.current) {
      toast.error("Impossible de capturer le tableau de bord. Élément introuvable.");
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading("Génération du bilan en PDF…");

    try {
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        windowWidth: document.documentElement.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width
      const pageHeight = 297; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
      pdf.save(`${filename}_${stamp}.pdf`);

      toast.success("Bilan PDF généré avec succès !", { id: toastId });
    } catch (error: any) {
      console.error("Erreur export PDF:", error);
      toast.error(`Erreur lors de la génération du PDF : ${error.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportPdf}
      disabled={isExporting}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Export…" : "Générer mon bilan"}
    </Button>
  );
};

export default BilanExportButton;