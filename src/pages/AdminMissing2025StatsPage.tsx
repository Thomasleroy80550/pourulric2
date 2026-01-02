import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getAllProfiles, UserProfile, addManualStatements } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ManualStatementEntry } from "@/lib/admin-api";
import * as XLSX from "xlsx";

type InvoiceLite = {
  user_id: string;
  period: string;
  created_at: string;
};

type MissingStatsRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  contractStartDate?: string | null;
  missingMonths: string[];
  presentMonths: string[];
  invoiceCount: number;
  lastStatementDate?: string | null;
};

const MONTHS_2025 = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getMonthIndex = (monthName: string): number | undefined => {
  const normalized = monthName.toLowerCase().replace(".", "");
  const map: Record<string, number> = {
    "janvier": 0, "février": 1, "fevrier": 1, "mars": 2, "avril": 3, "mai": 4,
    "juin": 5, "juillet": 6, "août": 7, "aout": 7, "septembre": 8,
    "octobre": 9, "novembre": 10, "décembre": 11, "decembre": 11
  };
  return map[normalized];
};

// Helper: vérifier si le nom d'onglet correspond à un mois 2025 (hors décembre)
const is2025MonthTitle = (title: string) => {
  const parts = title.split(" ");
  if (parts.length < 2) return false;
  const month = parts[0];
  const year = parts[1];
  const idx = getMonthIndex(month);
  return idx !== undefined && year === "2025" && idx !== 11; // exclure décembre (index 11)
};

const AdminMissing2025StatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [invoices2025, setInvoices2025] = useState<InvoiceLite[]>([]);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  // Prévisualisation CSV
  const [previewCsvByUser, setPreviewCsvByUser] = useState<Record<string, ManualStatementEntry[]>>({});
  const [csvPreviewStats, setCsvPreviewStats] = useState<{ total: number; included: number; skippedDec: number; skippedExisting: number }>({ total: 0, included: 0, skippedDec: 0, skippedExisting: 0 });

  // Google Sheet import
  const [isGoogleImportOpen, setIsGoogleImportOpen] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isGoogleImporting, setIsGoogleImporting] = useState(false);
  const [previewGoogleEntries, setPreviewGoogleEntries] = useState<ManualStatementEntry[]>([]);
  const [googlePreviewStats, setGooglePreviewStats] = useState<{ included: number }>({ included: 0 });
  const [googleErrorInfo, setGoogleErrorInfo] = useState<{ message?: string; hint?: string; serviceAccountEmail?: string } | null>(null);

  // XLSX import (Google Sheets export)
  const [isXlsxImportOpen, setIsXlsxImportOpen] = useState(false);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [selectedUserIdXlsx, setSelectedUserIdXlsx] = useState<string>("");
  const [isXlsxImporting, setIsXlsxImporting] = useState(false);
  const [previewXlsxEntries, setPreviewXlsxEntries] = useState<ManualStatementEntry[]>([]);
  const [xlsxPreviewStats, setXlsxPreviewStats] = useState<{ included: number; tabsChecked: number }>({ included: 0, tabsChecked: 0 });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const fetchedProfiles = await getAllProfiles();
        const clientProfiles = fetchedProfiles.filter((p: any) => (p.role ?? "user") === "user");
        setProfiles(clientProfiles);

        const { data, error } = await supabase
          .from("invoices")
          .select("user_id, period, created_at")
          .ilike("period", "% 2025");

        if (error) {
          throw new Error(error.message);
        }
        setInvoices2025((data ?? []) as InvoiceLite[]);
      } catch (err: any) {
        toast.error(`Erreur de chargement: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const refreshInvoices2025 = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("user_id, period, created_at")
      .ilike("period", "% 2025");
    if (!error && data) setInvoices2025(data as InvoiceLite[]);
  };

  const rows: MissingStatsRow[] = useMemo(() => {
    if (profiles.length === 0) return [];

    const invoicesByUser = new Map<string, InvoiceLite[]>();
    invoices2025.forEach(inv => {
      const list = invoicesByUser.get(inv.user_id) ?? [];
      list.push(inv);
      invoicesByUser.set(inv.user_id, list);
    });

    return profiles.map(profile => {
      const userInvoices = invoicesByUser.get(profile.id) ?? [];
      const presentMonthsSet = new Set<string>();

      userInvoices.forEach(inv => {
        const parts = inv.period.split(" ");
        const month = parts[0];
        const idx = getMonthIndex(month);
        if (idx !== undefined) {
          presentMonthsSet.add(MONTHS_2025[idx]);
        }
      });

      // Déterminer les mois attendus selon la date de début de contrat
      let startIndex = 0;
      if (profile.contract_start_date) {
        const d = parseISO(profile.contract_start_date);
        const y = d.getFullYear();
        if (y > 2025) {
          startIndex = 12; // aucun mois attendu en 2025
        } else if (y === 2025) {
          startIndex = d.getMonth(); // 0-11
        } else {
          startIndex = 0;
        }
      }
      // IMPORTANT: ignorer Décembre 2025 (index 11)
      const expectedMonths = MONTHS_2025.slice(startIndex, 11);
      const missingMonths = expectedMonths.filter(m => !presentMonthsSet.has(m));

      const lastStatementDate = userInvoices.length > 0
        ? userInvoices
            .map(i => i.created_at)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : undefined;

      return {
        userId: profile.id,
        firstName: profile.first_name ?? null,
        lastName: profile.last_name ?? null,
        contractStartDate: profile.contract_start_date ?? null,
        missingMonths,
        presentMonths: Array.from(presentMonthsSet),
        invoiceCount: userInvoices.length,
        lastStatementDate
      };
    });
  }, [profiles, invoices2025]);

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "");
  const requiredHeaders = [
    "user_id",
    "period",
    "totalca",
    "totalmontantverse",
    "totalfacture",
    "totalnuits",
    "totalvoyageurs",
    "totalreservations",
  ];
  const optionalHeaders = ["client_name"];

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error("CSV vide.");
    const headerLine = lines[0];
    const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
    const headersRaw = headerLine.split(delimiter).map(h => h.trim());
    const headers = headersRaw.map(h => normalize(h));
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`Colonnes manquantes dans le CSV: ${missing.join(", ")}`);
    }
    const rows = lines.slice(1).map(line => {
      const cells = line.split(delimiter);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (cells[idx] ?? "").trim();
      });
      return obj;
    });
    return rows;
  };

  const downloadPrefilledCsvModel = () => {
    const header = "user_id,client_name,period,totalCA,totalMontantVerse,totalFacture,totalNuits,totalVoyageurs,totalReservations";
    const lines: string[] = [];
    rows.forEach(r => {
      if (r.missingMonths.length > 0) {
        const clientName = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "Inconnu";
        r.missingMonths.forEach(m => {
          const period = `${m} 2025`;
          lines.push([r.userId, clientName, period, 0, 0, 0, 0, 0, 0].join(","));
        });
      }
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MODELE_STATS_2025.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Prévisualisation CSV (ne fait pas l'insert)
  const previewCsvImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier CSV.");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);

    let total = parsed.length;
    let skippedDec = 0;
    let skippedExisting = 0;
    let included = 0;

    const byUser: Record<string, ManualStatementEntry[]> = {};
    parsed.forEach(r => {
      const userId = r["user_id"];
      const periodRaw = r["period"];
      if (!userId || !periodRaw) return;
      const period = periodRaw.trim();
      const lower = period.toLowerCase();
      // Ignorer Décembre 2025
      if (lower.includes("decembre 2025") || lower.includes("décembre 2025")) {
        skippedDec++;
        return;
      }
      const entry: ManualStatementEntry = {
        period,
        totalCA: Number(r["totalca"] ?? 0) || 0,
        totalMontantVerse: Number(r["totalmontantverse"] ?? 0) || 0,
        totalFacture: Number(r["totalfacture"] ?? 0) || 0,
        totalNuits: parseInt(r["totalnuits"] ?? "0") || 0,
        totalVoyageurs: parseInt(r["totalvoyageurs"] ?? "0") || 0,
        totalReservations: parseInt(r["totalreservations"] ?? "0") || 0,
      };
      // Garder uniquement les mois manquants pour ce user
      const userRow = rows.find(rr => rr.userId === userId);
      const missingSet = new Set((userRow?.missingMonths ?? []).map(m => `${m} 2025`));
      if (!missingSet.has(entry.period)) {
        skippedExisting++;
        return;
      }
      if (!byUser[userId]) byUser[userId] = [];
      byUser[userId].push(entry);
      included++;
    });

    setPreviewCsvByUser(byUser);
    setCsvPreviewStats({ total, included, skippedDec, skippedExisting });
    toast.success(`Prévisualisation prête: ${included} lignes seront importées (sur ${total}).`);
  };

  // Import effectif CSV (utilise la prévisualisation)
  const confirmCsvImport = async () => {
    const groups = Object.entries(previewCsvByUser);
    if (groups.length === 0) {
      toast.error("Aucune ligne sélectionnée pour import.");
      return;
    }
    setIsImporting(true);
    const id = toast.loading("Import des statistiques en cours...");
    try {
      for (const [userId, statements] of groups) {
        if (statements.length > 0) {
          await addManualStatements(userId, statements);
        }
      }
      toast.success("Import CSV effectué.", { id });
      setIsImportOpen(false);
      setFile(null);
      setPreviewCsvByUser({});
      await refreshInvoices2025();
    } catch (e: any) {
      toast.error(`Erreur d'import: ${e.message}`, { id });
    } finally {
      setIsImporting(false);
    }
  };

  // Prévisualisation Google Sheet
  const previewImportFromGoogle = async () => {
    if (!selectedUserId) {
      toast.error("Veuillez sélectionner un client.");
      return;
    }
    if (!googleSheetUrl) {
      toast.error("Veuillez coller l'URL du Google Sheet.");
      return;
    }
    setIsGoogleImporting(true);
    const toastId = toast.loading("Prévisualisation Google Sheet...");
    try {
      const { data, error } = await supabase.functions.invoke('import-stats-from-sheet', {
        body: { sheetUrl: googleSheetUrl },
      });
      if (error) {
        // Essayer de parser un JSON retourné par la fonction
        let info: any = null;
        try {
          info = JSON.parse(error.message || "{}");
        } catch {
          info = null;
        }
        setGoogleErrorInfo(info && (info.hint || info.serviceAccountEmail) ? info : { message: error.message });
        throw new Error(info?.error || error.message || "Erreur Edge function.");
      }
      setGoogleErrorInfo(null);
      const entries = (data?.entries ?? []) as ManualStatementEntry[];

      const userRow = rows.find(r => r.userId === selectedUserId);
      const missingSet = new Set((userRow?.missingMonths ?? []).map(m => `${m} 2025`));
      const toPreview = entries.filter(e => missingSet.has(e.period));

      setPreviewGoogleEntries(toPreview);
      setGooglePreviewStats({ included: toPreview.length });
      toast.success(`Prévisualisation: ${toPreview.length} mois à importer.`, { id: toastId });
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`, { id: toastId });
    } finally {
      setIsGoogleImporting(false);
    }
  };

  // Import effectif Google (utilise la prévisualisation)
  const confirmImportFromGoogle = async () => {
    if (!selectedUserId) {
      toast.error("Client non sélectionné.");
      return;
    }
    if (previewGoogleEntries.length === 0) {
      toast.error("Rien à importer. Lancez la prévisualisation d'abord.");
      return;
    }
    setIsGoogleImporting(true);
    const toastId = toast.loading("Import Google Sheet en cours...");
    try {
      await addManualStatements(selectedUserId, previewGoogleEntries);
      toast.success(`Import réussi: ${previewGoogleEntries.length} mois ajoutés.`, { id: toastId });
      setIsGoogleImportOpen(false);
      setGoogleSheetUrl("");
      setPreviewGoogleEntries([]);
      await refreshInvoices2025();
    } catch (e: any) {
      toast.error(`Erreur import: ${e.message}`, { id: toastId });
    } finally {
      setIsGoogleImporting(false);
    }
  };

  // Prévisualisation XLSX (ne fait pas l'insert)
  const previewImportFromXlsx = async () => {
    if (!selectedUserIdXlsx) {
      toast.error("Veuillez sélectionner un client.");
      return;
    }
    if (!xlsxFile) {
      toast.error("Veuillez sélectionner un fichier .xlsx exporté depuis Google Sheets.");
      return;
    }
    setIsXlsxImporting(true);
    const toastId = toast.loading("Prévisualisation XLSX en cours...");
    try {
      const buffer = await xlsxFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const entries: ManualStatementEntry[] = [];
      let tabsChecked = 0;

      for (const title of workbook.SheetNames) {
        if (!is2025MonthTitle(title)) continue;
        const sheet = workbook.Sheets[title];
        tabsChecked++;

        // Lire C1, F1, Q1, J1, K1
        const readNum = (addr: string) => {
          const cell = sheet[addr];
          const raw = cell?.v ?? 0;
          const num = typeof raw === "string" ? parseFloat(raw.replace(",", ".").trim()) : Number(raw);
          return isNaN(num) ? 0 : num;
        };

        const totalCA = readNum("C1");
        const totalMontantVerse = readNum("F1");
        const totalFacture = readNum("Q1");
        const totalNuits = readNum("J1");
        const totalVoyageurs = readNum("K1");

        // Somme L1:P1
        const letters = ["L", "M", "N", "O", "P"];
        let totalReservations = 0;
        for (const col of letters) {
          totalReservations += readNum(`${col}1`);
        }

        entries.push({
          period: title,
          totalCA,
          totalMontantVerse,
          totalFacture,
          totalNuits,
          totalVoyageurs,
          totalReservations,
        });
      }

      // Filtrer selon les mois manquants pour ce client
      const userRow = rows.find(r => r.userId === selectedUserIdXlsx);
      const missingSet = new Set((userRow?.missingMonths ?? []).map(m => `${m} 2025`));
      const toPreview = entries.filter(e => missingSet.has(e.period));

      setPreviewXlsxEntries(toPreview);
      setXlsxPreviewStats({ included: toPreview.length, tabsChecked });
      toast.success(`Prévisualisation: ${toPreview.length} mois à importer (${tabsChecked} onglets 2025 analysés).`, { id: toastId });
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`, { id: toastId });
    } finally {
      setIsXlsxImporting(false);
    }
  };

  // Import effectif XLSX (utilise la prévisualisation)
  const confirmImportFromXlsx = async () => {
    if (!selectedUserIdXlsx) {
      toast.error("Client non sélectionné.");
      return;
    }
    if (previewXlsxEntries.length === 0) {
      toast.error("Rien à importer. Lancez la prévisualisation d'abord.");
      return;
    }
    setIsXlsxImporting(true);
    const toastId = toast.loading("Import XLSX en cours...");
    try {
      await addManualStatements(selectedUserIdXlsx, previewXlsxEntries);
      toast.success(`Import réussi: ${previewXlsxEntries.length} mois ajoutés.`, { id: toastId });
      setIsXlsxImportOpen(false);
      setXlsxFile(null);
      setSelectedUserIdXlsx("");
      setPreviewXlsxEntries([]);
      await refreshInvoices2025();
    } catch (e: any) {
      toast.error(`Erreur import: ${e.message}`, { id: toastId });
    } finally {
      setIsXlsxImporting(false);
    }
  };

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter(r => {
      const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.toLowerCase();
      const matchesSearch = term === "" || name.includes(term);
      const matchesMissing = !onlyMissing || r.missingMonths.length > 0;
      return matchesSearch && matchesMissing;
    });
  }, [rows, searchTerm, onlyMissing]);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Statistiques 2025 manquantes</CardTitle>
            <CardDescription>
              Liste des clients et des mois de 2025 sans relevé/statistiques (décembre 2025 est ignoré).
            </CardDescription>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative w-full md:w-72">
                  <Input
                    placeholder="Rechercher un client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={onlyMissing} onCheckedChange={setOnlyMissing} id="only-missing" />
                  <Label htmlFor="only-missing">Afficher uniquement ceux avec mois manquants</Label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadPrefilledCsvModel} variant="outline">
                  Télécharger le modèle CSV (pré-rempli)
                </Button>
                <Button onClick={() => setIsImportOpen(true)}>
                  Importer CSV
                </Button>
                <Button onClick={() => setIsGoogleImportOpen(true)}>
                  Importer depuis Google Sheet
                </Button>
                <Button onClick={() => setIsXlsxImportOpen(true)}>
                  Importer fichier XLSX (Google Sheets)
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun utilisateur à afficher selon vos filtres.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Début de contrat</TableHead>
                    <TableHead>Mois présents (2025)</TableHead>
                    <TableHead className="text-right">Mois manquants (hors décembre)</TableHead>
                    <TableHead>Dernier relevé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">
                        {(row.firstName ?? "") + " " + (row.lastName ?? "")}
                      </TableCell>
                      <TableCell>
                        {row.contractStartDate
                          ? format(parseISO(row.contractStartDate), "dd/MM/yyyy", { locale: fr })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.presentMonths.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.presentMonths
                              .sort((a, b) => MONTHS_2025.indexOf(a) - MONTHS_2025.indexOf(b))
                              .map(m => <Badge key={m} variant="secondary">{m}</Badge>)
                            }
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.missingMonths.length > 0 ? (
                          <div className="flex flex-wrap gap-2 justify-end">
                            {row.missingMonths
                              .sort((a, b) => MONTHS_2025.indexOf(a) - MONTHS_2025.indexOf(b))
                              .map(m => <Badge key={m} className="bg-red-100 text-red-700">{m}</Badge>)
                            }
                          </div>
                        ) : (
                          <Badge className="bg-green-100 text-green-700">Complet</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.lastStatementDate
                          ? format(parseISO(row.lastStatementDate), "dd/MM/yyyy HH:mm", { locale: fr })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Import CSV */}
      <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if (!open) { setPreviewCsvByUser({}); setCsvPreviewStats({ total: 0, included: 0, skippedDec: 0, skippedExisting: 0 }); } }}>
        <DialogContent className="sm:max-w-5xl w-full max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Importer des statistiques (CSV)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chargez un fichier CSV avec les colonnes: user_id, client_name (optionnel), period, totalCA, totalMontantVerse, totalFacture, totalNuits, totalVoyageurs, totalReservations.
              Décembre 2025 est ignoré automatiquement. Utilisez "Prévisualiser" pour vérifier avant import.
            </p>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {csvPreviewStats.total > 0 && (
              <div className="text-xs text-muted-foreground">
                Total lignes: {csvPreviewStats.total} • À importer: {csvPreviewStats.included} • Ignorées (déc.): {csvPreviewStats.skippedDec} • Ignorées (déjà présentes): {csvPreviewStats.skippedExisting}
              </div>
            )}
            {Object.keys(previewCsvByUser).length > 0 && (
              <div className="max-h-[60vh] overflow-auto overflow-x-auto border rounded-md p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead>Montant Versé</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Nuits</TableHead>
                      <TableHead>Voyageurs</TableHead>
                      <TableHead>Réservations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(previewCsvByUser).flatMap(([userId, entries]) => {
                      const name = (() => {
                        const p = profiles.find(pp => pp.id === userId);
                        return ((p?.first_name ?? "") + " " + (p?.last_name ?? "")).trim() || "—";
                      })();
                      return entries.map((e, idx) => (
                        <TableRow key={`${userId}-${e.period}-${idx}`}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{userId}</TableCell>
                          <TableCell>{e.period}</TableCell>
                          <TableCell>{e.totalCA}</TableCell>
                          <TableCell>{e.totalMontantVerse}</TableCell>
                          <TableCell>{e.totalFacture}</TableCell>
                          <TableCell>{e.totalNuits}</TableCell>
                          <TableCell>{e.totalVoyageurs}</TableCell>
                          <TableCell>{e.totalReservations}</TableCell>
                        </TableRow>
                      ));
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Annuler</Button>
            <Button variant="outline" onClick={previewCsvImport} disabled={!file}>Prévisualiser</Button>
            <Button onClick={confirmCsvImport} disabled={isImporting || Object.keys(previewCsvByUser).length === 0}>
              {isImporting ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Import depuis Google Sheet */}
      <Dialog open={isGoogleImportOpen} onOpenChange={(open) => { setIsGoogleImportOpen(open); if (!open) { setPreviewGoogleEntries([]); setGooglePreviewStats({ included: 0 }); setGoogleErrorInfo(null); } }}>
        <DialogContent className="sm:max-w-5xl w-full max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Importer depuis Google Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.first_name ?? '') + ' ' + (p.last_name ?? '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL du Google Sheet</Label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Les onglets doivent être nommés avec les mois, ex: "Janvier 2025", "Mai 2025"...
                Décembre 2025 est ignoré automatiquement. Cliquez sur Prévisualiser pour voir les données avant import.
              </p>
            </div>
            {googleErrorInfo && (
              <Alert variant="destructive">
                <AlertTitle>Accès refusé au Google Sheet</AlertTitle>
                <AlertDescription>
                  {googleErrorInfo.hint ? (
                    <div className="space-y-2">
                      <p>{googleErrorInfo.hint}</p>
                      {googleErrorInfo.serviceAccountEmail && (
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded text-xs">{googleErrorInfo.serviceAccountEmail}</code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(googleErrorInfo.serviceAccountEmail!)}
                          >
                            Copier l'email
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{googleErrorInfo.message || "Veuillez vérifier les permissions du fichier."}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {googlePreviewStats.included > 0 && (
              <div className="text-xs text-muted-foreground">À importer: {googlePreviewStats.included} mois</div>
            )}
            {previewGoogleEntries.length > 0 && (
              <div className="max-h-[60vh] overflow-auto overflow-x-auto border rounded-md p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead>Montant Versé</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Nuits</TableHead>
                      <TableHead>Voyageurs</TableHead>
                      <TableHead>Réservations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewGoogleEntries.map((e, idx) => (
                      <TableRow key={`${e.period}-${idx}`}>
                        <TableCell>{e.period}</TableCell>
                        <TableCell>{e.totalCA}</TableCell>
                        <TableCell>{e.totalMontantVerse}</TableCell>
                        <TableCell>{e.totalFacture}</TableCell>
                        <TableCell>{e.totalNuits}</TableCell>
                        <TableCell>{e.totalVoyageurs}</TableCell>
                        <TableCell>{e.totalReservations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoogleImportOpen(false)}>Annuler</Button>
            <Button variant="outline" onClick={previewImportFromGoogle} disabled={isGoogleImporting || !googleSheetUrl || !selectedUserId}>
              {isGoogleImporting ? "Prévisualisation..." : "Prévisualiser"}
            </Button>
            <Button onClick={confirmImportFromGoogle} disabled={isGoogleImporting || previewGoogleEntries.length === 0}>
              {isGoogleImporting ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Import XLSX */}
      <Dialog open={isXlsxImportOpen} onOpenChange={(open) => { setIsXlsxImportOpen(open); if (!open) { setPreviewXlsxEntries([]); setXlsxPreviewStats({ included: 0, tabsChecked: 0 }); setXlsxFile(null); setSelectedUserIdXlsx(""); } }}>
        <DialogContent className="sm:max-w-5xl w-full max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Importer depuis fichier XLSX</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chargez le fichier .xlsx exporté depuis Google Sheets. Les onglets doivent être nommés "Mois 2025" (ex: "Janvier 2025", "Mai 2025"). Décembre 2025 est ignoré automatiquement.
            </p>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedUserIdXlsx} onValueChange={setSelectedUserIdXlsx}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.first_name ?? '') + ' ' + (p.last_name ?? '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fichier XLSX</Label>
              <Input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(e) => setXlsxFile(e.target.files?.[0] ?? null)} />
              {xlsxPreviewStats.tabsChecked > 0 && (
                <div className="text-xs text-muted-foreground">
                  Onglets analysés: {xlsxPreviewStats.tabsChecked} • À importer: {xlsxPreviewStats.included}
                </div>
              )}
            </div>
            {previewXlsxEntries.length > 0 && (
              <div className="max-h-[60vh] overflow-auto overflow-x-auto border rounded-md p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>CA</TableHead>
                      <TableHead>Montant Versé</TableHead>
                      <TableHead>Facture</TableHead>
                      <TableHead>Nuits</TableHead>
                      <TableHead>Voyageurs</TableHead>
                      <TableHead>Réservations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewXlsxEntries.map((e, idx) => (
                      <TableRow key={`${e.period}-${idx}`}>
                        <TableCell>{e.period}</TableCell>
                        <TableCell>{e.totalCA}</TableCell>
                        <TableCell>{e.totalMontantVerse}</TableCell>
                        <TableCell>{e.totalFacture}</TableCell>
                        <TableCell>{e.totalNuits}</TableCell>
                        <TableCell>{e.totalVoyageurs}</TableCell>
                        <TableCell>{e.totalReservations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsXlsxImportOpen(false)}>Annuler</Button>
            <Button variant="outline" onClick={previewImportFromXlsx} disabled={isXlsxImporting || !xlsxFile || !selectedUserIdXlsx}>
              {isXlsxImporting ? "Prévisualisation..." : "Prévisualiser"}
            </Button>
            <Button onClick={confirmImportFromXlsx} disabled={isXlsxImporting || previewXlsxEntries.length === 0}>
              {isXlsxImporting ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMissing2025StatsPage;