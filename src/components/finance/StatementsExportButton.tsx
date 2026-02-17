import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { triggerBlobDownload } from "@/lib/download-utils";
import { fetchStatementsExportData } from "@/lib/statements-export-api";

function safeFileSegment(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function formatDateFr(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString('fr-FR');
}

export default function StatementsExportButton() {
  const [loading, setLoading] = useState(false);

  const filename = useMemo(() => {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return `export_releves_${stamp}.xlsx`;
  }, []);

  const handleExport = async () => {
    setLoading(true);
    const toastId = toast.loading("Préparation de l'export Excel…");

    try {
      const { invoices, clients } = await fetchStatementsExportData();

      if (!invoices.length) {
        toast.info("Aucun relevé à exporter.", { id: toastId });
        return;
      }

      const clientById = new Map(clients.map((c) => [c.id, c] as const));

      const summaryRows = invoices.map((inv) => {
        const c = clientById.get(inv.user_id);
        const totals = inv.totals || {};

        const clientName = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim();

        return {
          client_id: inv.user_id,
          client_nom: clientName,
          client_email: c?.email ?? '',
          periode: inv.period,
          cree_le: formatDateFr(inv.created_at),
          paye: inv.is_paid ? 'Oui' : 'Non',
          paye_le: formatDateFr(inv.paid_at ?? null),
          total_facture: totals.totalFacture ?? '',
          total_commission: totals.totalCommission ?? '',
          total_frais_menage: totals.totalFraisMenage ?? '',
          total_frais_menage_proprietaire: totals.ownerCleaningFee ?? '',
          total_taxe_de_sejour: totals.totalTaxeDeSejour ?? '',
          total_montant_verse: totals.totalMontantVerse ?? '',
        };
      });

      const detailRows: any[] = [];
      for (const inv of invoices) {
        const c = clientById.get(inv.user_id);
        const clientName = `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim();
        const invoiceData = Array.isArray(inv.invoice_data) ? inv.invoice_data : [];

        for (const row of invoiceData) {
          detailRows.push({
            client_id: inv.user_id,
            client_nom: clientName,
            client_email: c?.email ?? '',
            periode: inv.period,
            portail: row?.portail ?? '',
            voyageur: row?.voyageur ?? '',
            arrivee: row?.arrivee ?? '',
            prix_sejour: row?.prixSejour ?? '',
            frais_menage: row?.fraisMenage ?? '',
            taxe_de_sejour: row?.taxeDeSejour ?? '',
            frais_paiement: row?.originalFraisPaiement ?? '',
            commission_ota: row?.originalCommissionPlateforme ?? '',
            montant_verse: row?.montantVerse ?? '',
            revenu_genere: row?.revenuGenere ?? '',
            commission_hk: row?.commissionHelloKeys ?? '',
          });
        }
      }

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Releves");

      const wsDetails = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetails, "Details");

      const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      triggerBlobDownload(blob, safeFileSegment(filename));
      toast.success("Export prêt.", { id: toastId });
    } catch (e: any) {
      console.error('Statements export failed:', e);
      toast.error(`Impossible de générer l'export : ${e?.message || 'Erreur inconnue'}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Export…
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </>
      )}
    </Button>
  );
}