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

const AdminMissing2025StatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [invoices2025, setInvoices2025] = useState<InvoiceLite[]>([]);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
  const expectedHeaders = [
    "user_id",
    "period",
    "totalca",
    "totalmontantverse",
    "totalfacture",
    "totalnuits",
    "totalvoyageurs",
    "totalreservations",
  ];

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error("CSV vide.");
    const headerLine = lines[0];
    const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
    const headersRaw = headerLine.split(delimiter).map(h => h.trim());
    const headers = headersRaw.map(h => normalize(h));
    const missing = expectedHeaders.filter(h => !headers.includes(h));
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
    const header = "user_id,period,totalCA,totalMontantVerse,totalFacture,totalNuits,totalVoyageurs,totalReservations";
    const lines: string[] = [];
    rows.forEach(r => {
      if (r.missingMonths.length > 0) {
        r.missingMonths.forEach(m => {
          const period = `${m} 2025`;
          lines.push([r.userId, period, 0, 0, 0, 0, 0, 0].join(","));
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

  const handleImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier CSV.");
      return;
    }
    setIsImporting(true);
    const id = toast.loading("Import des statistiques en cours...");
    try {
      const text = await file.text();
      const rows = parseCsv(text);

      // Grouper par user_id
      const byUser: Record<string, { period: string; totalCA: number; totalMontantVerse: number; totalFacture: number; totalNuits: number; totalVoyageurs: number; totalReservations: number; }[]> = {};
      rows.forEach(r => {
        const userId = r["user_id"];
        const periodRaw = r["period"];
        if (!userId || !periodRaw) return;

        const period = periodRaw.trim();
        const lower = period.toLowerCase();
        // Ignorer Décembre 2025 à l'import
        if (lower.includes("decembre 2025") || lower.includes("décembre 2025")) {
          return;
        }

        const entry = {
          period,
          totalCA: Number(r["totalca"] ?? 0) || 0,
          totalMontantVerse: Number(r["totalmontantverse"] ?? 0) || 0,
          totalFacture: Number(r["totalfacture"] ?? 0) || 0,
          totalNuits: parseInt(r["totalnuits"] ?? "0") || 0,
          totalVoyageurs: parseInt(r["totalvoyageurs"] ?? "0") || 0,
          totalReservations: parseInt(r["totalreservations"] ?? "0") || 0,
        };
        if (!byUser[userId]) byUser[userId] = [];
        byUser[userId].push(entry);
      });

      // Import séquentiel par utilisateur
      for (const [userId, statements] of Object.entries(byUser)) {
        if (statements.length > 0) {
          await addManualStatements(userId, statements);
        }
      }

      toast.success("Import terminé avec succès.", { id });
      setIsImportOpen(false);
      setFile(null);
      await refreshInvoices2025();
    } catch (e: any) {
      toast.error(`Erreur d'import: ${e.message}`, { id });
    } finally {
      setIsImporting(false);
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
              <div className="flex gap-2">
                <Button onClick={downloadPrefilledCsvModel} variant="outline">
                  Télécharger le modèle CSV (pré-rempli)
                </Button>
                <Button onClick={() => setIsImportOpen(true)}>
                  Importer CSV
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
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importer des statistiques (CSV)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chargez un fichier CSV avec les colonnes: user_id, period, totalCA, totalMontantVerse, totalFacture, totalNuits, totalVoyageurs, totalReservations.
              Les lignes "Décembre 2025" seront ignorées automatiquement.
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Annuler</Button>
            <Button onClick={handleImport} disabled={isImporting || !file}>
              {isImporting ? "Import en cours..." : "Importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMissing2025StatsPage;