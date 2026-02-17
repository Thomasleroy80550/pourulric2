import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { getInvoicesByUserId, SavedInvoice } from "@/lib/admin-api";
import { generateStatementPdf } from "@/lib/pdf-utils";
import { createZipBlob } from "@/lib/zip-utils";
import { triggerBlobDownload } from "@/lib/download-utils";

function safeFileSegment(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export default function DownloadUserStatementsButton(props: {
  userId: string;
  clientName?: string | null;
  className?: string;
}) {
  const { userId, clientName, className } = props;
  const [loading, setLoading] = useState(false);

  const zipName = useMemo(() => {
    const base = clientName?.trim() ? safeFileSegment(clientName.trim()) : `user_${userId.slice(0, 8)}`;
    return `releves_${base}.zip`;
  }, [clientName, userId]);

  const handleClick = async () => {
    setLoading(true);
    const toastId = toast.loading("Préparation du téléchargement…");

    try {
      const invoices = await getInvoicesByUserId(userId);
      if (!invoices.length) {
        toast.info("Aucun relevé trouvé pour cet utilisateur.", { id: toastId });
        return;
      }

      // Génération séquentielle pour éviter de saturer le navigateur
      const files: Array<{ path: string; data: Blob }> = [];
      for (let i = 0; i < invoices.length; i++) {
        const inv: SavedInvoice = invoices[i];
        toast.message(`Génération des PDFs… (${i + 1}/${invoices.length})`, { id: toastId });

        const pdfFile = await generateStatementPdf(inv);
        const fileName = safeFileSegment(pdfFile.name || `releve_${inv.period}.pdf`);
        files.push({ path: `${i + 1}_${fileName}`.replace(/\.pdf$/i, ".pdf"), data: pdfFile });
      }

      toast.message("Création du ZIP…", { id: toastId });
      const zipBlob = await createZipBlob(files);

      triggerBlobDownload(zipBlob, zipName);
      toast.success("Téléchargement prêt.", { id: toastId });
    } catch (e: any) {
      console.error("Error creating ZIP of statements:", e);
      toast.error(`Impossible de télécharger les relevés : ${e?.message || "Erreur inconnue"}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={loading} className={className}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Téléchargement…
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Télécharger tous les relevés
        </>
      )}
    </Button>
  );
}
