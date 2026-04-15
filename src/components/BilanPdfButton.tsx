import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { triggerBlobDownload } from "@/lib/download-utils";
import { generateBilan2025PdfFile } from "@/lib/bilan-2025-api";
import type { AdminBilan2025PreviewData } from "@/components/admin/AdminBilan2025PreviewDialog";

type BilanPdfButtonProps = {
  payload: AdminBilan2025PreviewData;
  className?: string;
};

const BilanPdfButton: React.FC<BilanPdfButtonProps> = ({ payload, className }) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const toastId = toast.loading("Génération du bilan…");

    try {
      const pdfFile = await generateBilan2025PdfFile(payload);
      triggerBlobDownload(pdfFile, pdfFile.name);
      toast.success("Bilan PDF généré !", { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erreur lors de la génération du bilan.", { id: toastId });
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
