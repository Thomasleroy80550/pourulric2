import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAllProfiles, UserProfile } from '@/lib/admin-api';
import { FileText, RefreshCcw, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LatestInvoice = {
  id: string;
  user_id: string;
  period: string;
  created_at: string;
  pennylane_status?: string | null;
};

const AdminBillingStatusPage: React.FC = () => {
  const [profiles, setProfiles] = React.useState<UserProfile[]>([]);
  const [latestByUser, setLatestByUser] = React.useState<Map<string, LatestInvoice>>(new Map());
  const [invoicesByUserAndPeriod, setInvoicesByUserAndPeriod] = React.useState<Map<string, Map<string, LatestInvoice>>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [onlyNotInvoiced, setOnlyNotInvoiced] = React.useState(true);

  const MONTHS_FR = [
    'Janvier','Février','Mars','Avril','Mai','Juin',
    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
  ];
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = React.useState<number>(new Date().getMonth());
  const selectedPeriod = `${MONTHS_FR[selectedMonthIndex]} ${selectedYear}`;

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Tous les profils (clients)
      const allProfiles = await getAllProfiles();

      // 2) Tous les relevés (ordonnés du plus récent au plus ancien)
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('id, user_id, period, created_at, pennylane_status')
        .order('created_at', { ascending: false });

      if (invErr) {
        throw new Error(invErr.message);
      }

      // 3) Construire un map user_id -> dernier relevé
      const latestMap = new Map<string, LatestInvoice>();
      const byPeriodMap = new Map<string, Map<string, LatestInvoice>>();
      (invoices || []).forEach((inv) => {
        const uid = inv.user_id as string;
        const record: LatestInvoice = {
          id: inv.id as string,
          user_id: uid,
          period: inv.period as string,
          created_at: inv.created_at as string,
          pennylane_status: inv.pennylane_status ?? null,
        };
        // dernier relevé pour l'utilisateur (grâce à l'ordre desc, on prend le premier)
        if (!latestMap.has(uid)) {
          latestMap.set(uid, record);
        }
        // relevé par période (mois année) pour l'utilisateur
        if (!byPeriodMap.has(uid)) {
          byPeriodMap.set(uid, new Map());
        }
        const perPeriod = byPeriodMap.get(uid)!;
        if (!perPeriod.has(record.period)) {
          perPeriod.set(record.period, record);
        }
      });

      setProfiles(allProfiles);
      setLatestByUser(latestMap);
      setInvoicesByUserAndPeriod(byPeriodMap);
    } catch (e: any) {
      console.error('Erreur chargement statuts de facturation:', e);
      setError(e.message || 'Erreur inconnue');
      toast.error('Impossible de charger les statuts de facturation.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProfiles = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return profiles.filter((p) => {
      const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim().toLowerCase();
      const email = (p.email ?? '').toLowerCase();
      const matches = !term || fullName.includes(term) || email.includes(term);
      const hasInvoiceForSelected =
        invoicesByUserAndPeriod.get(p.id)?.has(selectedPeriod) ?? false;
      const passesFilter = onlyNotInvoiced ? !hasInvoiceForSelected : true;
      return matches && passesFilter;
    });
  }, [profiles, search, invoicesByUserAndPeriod, onlyNotInvoiced, selectedPeriod]);

  const totalClients = profiles.length;
  const notInvoicedCount = profiles.filter(
    (p) => !(invoicesByUserAndPeriod.get(p.id)?.has(selectedPeriod) ?? false)
  ).length;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8" />
              <div>
                <CardTitle>Statuts de facturation</CardTitle>
                <CardDescription>
                  Liste des clients avec leur dernier relevé existant pour contrôler qui n&apos;a pas été facturé.
                </CardDescription>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="secondary">Clients: {totalClients}</Badge>
                <Badge variant="destructive">Non facturés: {notInvoicedCount}</Badge>
                <Button variant="outline" size="icon" onClick={fetchData} title="Rafraîchir">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Sélection d'année + onglets mois */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Année</span>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                      <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
                      <SelectItem value={String(currentYear + 1)}>{currentYear + 1}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 overflow-x-auto">
                  <Tabs value={String(selectedMonthIndex)} onValueChange={(v) => setSelectedMonthIndex(parseInt(v))}>
                    <TabsList className="w-full">
                      {MONTHS_FR.map((m, i) => (
                        <TabsTrigger key={m} value={String(i)} className="shrink-0">
                          {m}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Mois sélectionné: {selectedPeriod}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Rechercher un client (nom, email)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline" size="icon" title="Rechercher">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Checkbox
                  id="only-not-invoiced"
                  checked={onlyNotInvoiced}
                  onCheckedChange={(v) => setOnlyNotInvoiced(Boolean(v))}
                />
                <label htmlFor="only-not-invoiced" className="text-sm text-muted-foreground">
                  Afficher uniquement les non facturés pour {selectedPeriod}
                </label>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 mb-4">
                {error}
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Relevé: {selectedPeriod}</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Statut Pennylane</TableHead>
                    <TableHead>Dernier relevé existant</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredProfiles.length > 0 ? (
                    filteredProfiles.map((p) => {
                      const latest = latestByUser.get(p.id);
                      const selectedInv = invoicesByUserAndPeriod.get(p.id)?.get(selectedPeriod);
                      return (
                        <TableRow key={p.id} className={!selectedInv ? 'bg-red-50' : ''}>
                          <TableCell className="font-medium">
                            {(p.first_name ?? '') + ' ' + (p.last_name ?? '')}
                            {!selectedInv && (
                              <Badge variant="destructive" className="ml-2">Non facturé</Badge>
                            )}
                          </TableCell>
                          <TableCell>{p.email ?? '—'}</TableCell>
                          <TableCell>{selectedInv ? selectedInv.period : 'Aucun'}</TableCell>
                          <TableCell>
                            {selectedInv ? new Date(selectedInv.created_at).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="capitalize">
                            {selectedInv?.pennylane_status ?? '—'}
                          </TableCell>
                          <TableCell>{latest ? latest.period : 'Aucun'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.info('Ouverture des relevés…');
                                window.location.href = '/admin/statements';
                              }}
                            >
                              Voir les relevés
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Aucun client ne correspond aux critères.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBillingStatusPage;