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
import { getAllProfiles, UserProfile } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const fetchedProfiles = await getAllProfiles();
        // Filtrer uniquement les clients (éviter admins dans la liste)
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

  const rows: MissingStatsRow[] = useMemo(() => {
    if (profiles.length === 0) return [];

    // Regrouper factures 2025 par utilisateur
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
        // Sécuriser: ne tenir compte que des mois FR attendus
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
          // contrat postérieur à 2025: rien attendu en 2025
          startIndex = 12;
        } else if (y === 2025) {
          startIndex = d.getMonth(); // 0-11
        } else {
          startIndex = 0; // avant 2025 -> tous les mois attendus
        }
      }
      const expectedMonths = MONTHS_2025.slice(startIndex, 12);
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
              Liste des clients et des mois de 2025 sans relevé/statistiques (ajuste automatiquement selon la date de début de contrat).
            </CardDescription>
            <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative w-full md:w-1/3">
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
                    <TableHead className="text-right">Mois manquants</TableHead>
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
    </AdminLayout>
  );
};

export default AdminMissing2025StatsPage;