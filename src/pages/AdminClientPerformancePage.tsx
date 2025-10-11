import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllProfiles, getInvoicesByUserId, type SavedInvoice } from '@/lib/admin-api';
import { getUserRoomsByUserId } from '@/lib/user-room-api';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, CalendarDays, BedDouble, TrendingUp, Euro } from 'lucide-react';
import { getDaysInMonth } from 'date-fns';

type SimpleProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

const monthIndexFr: Record<string, number> = {
  "janvier": 0, "février": 1, "fevrier": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5,
  "juillet": 6, "août": 7, "aout": 7, "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11, "decembre": 11
};

function parsePeriod(period: string): { year: number; monthIndex: number } | null {
  if (!period) return null;
  const [mois, anneeRaw] = period.toLowerCase().split(' ');
  const year = parseInt(anneeRaw, 10);
  const monthIndex = monthIndexFr[mois];
  if (Number.isNaN(year) || monthIndex === undefined) return null;
  return { year, monthIndex };
}

function formatCurrencyEUR(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

const KpiCard = ({ title, value, icon: Icon, colorClass = "" }: { title: string; value: string; icon: any; colorClass?: string }) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-500" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </CardContent>
  </Card>
);

const AdminClientPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<SimpleProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userInvoices, setUserInvoices] = useState<SavedInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [roomsCount, setRoomsCount] = useState<number>(0);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  useEffect(() => {
    setLoadingProfiles(true);
    getAllProfiles().then((list: any[]) => {
      const mapped: SimpleProfile[] = list.map((p) => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
      }));
      setProfiles(mapped);
    }).finally(() => setLoadingProfiles(false));
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setUserInvoices([]);
      setSelectedPeriod("");
      setRoomsCount(0);
      return;
    }
    setLoadingInvoices(true);
    getInvoicesByUserId(selectedUserId).then((invs) => {
      // tri du plus récent au plus ancien par created_at (si dispo) sinon par période
      const sorted = [...invs].sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // fallback: essai de tri par période
        const pa = parsePeriod(a.period);
        const pb = parsePeriod(b.period);
        if (pa && pb) {
          const da = new Date(pa.year, pa.monthIndex).getTime();
          const db = new Date(pb.year, pb.monthIndex).getTime();
          return db - da;
        }
        return 0;
      });
      setUserInvoices(sorted);
      if (sorted.length > 0) {
        setSelectedPeriod(sorted[0].period);
      } else {
        setSelectedPeriod("");
      }
    }).finally(() => setLoadingInvoices(false));

    setLoadingRooms(true);
    getUserRoomsByUserId(selectedUserId).then((rooms) => {
      setRoomsCount(rooms?.length || 0);
    }).finally(() => setLoadingRooms(false));
  }, [selectedUserId]);

  const selectedInvoice = useMemo(
    () => userInvoices.find((i) => i.period === selectedPeriod) || null,
    [userInvoices, selectedPeriod]
  );

  const kpis = useMemo(() => {
    if (!selectedInvoice) {
      return null;
    }
    const t = selectedInvoice.totals || {};
    // CA brut
    const totalCA = typeof t.totalCA === 'number'
      ? t.totalCA
      : 0;

    // Montant versé au total sur la période
    const totalMontantVerse = typeof t.totalMontantVerse === 'number' ? t.totalMontantVerse : 0;

    // Facture HK (frais)
    const totalFacture = typeof t.totalFacture === 'number' ? t.totalFacture : 0;

    // Nuits, Réservations, Voyageurs
    const totalNuits = typeof t.totalNuits === 'number' ? t.totalNuits : 0;
    const totalReservations = typeof t.totalReservations === 'number' ? t.totalReservations : (selectedInvoice.invoice_data?.length || 0);
    const totalVoyageurs = typeof t.totalVoyageurs === 'number' ? t.totalVoyageurs : 0;

    // ADR = CA / Nuits (si nuits > 0)
    const adr = totalNuits > 0 ? totalCA / totalNuits : 0;

    // RevPAR et Occupation mensuelle si période + roomsCount
    let revpar = 0;
    let monthlyOccupation = 0;
    const periodParsed = parsePeriod(selectedInvoice.period);
    if (periodParsed && roomsCount > 0) {
      const days = getDaysInMonth(new Date(periodParsed.year, periodParsed.monthIndex, 1));
      const totalAvailableNights = roomsCount * days;
      revpar = totalAvailableNights > 0 ? totalCA / totalAvailableNights : 0;
      monthlyOccupation = totalAvailableNights > 0 ? (totalNuits / totalAvailableNights) * 100 : 0;
    }

    // Net de la période (versé - facture HK) en restant cohérent avec les relevés
    const net = totalMontantVerse - totalFacture;

    return {
      totalCA,
      totalMontantVerse,
      totalFacture,
      totalNuits,
      totalReservations,
      totalVoyageurs,
      adr,
      revpar,
      monthlyOccupation,
      net,
    };
  }, [selectedInvoice, roomsCount]);

  const selectedProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedUserId) || null;
  }, [profiles, selectedUserId]);

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Revue Client</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/statements' + (selectedUserId ? `?userId=${selectedUserId}` : ''))}>
              Voir les relevés
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sélection</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Client</div>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingProfiles}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingProfiles ? "Chargement..." : "Choisir un client"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.first_name || '') + ' ' + (p.last_name || '')} {p.email ? `(${p.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Période</div>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
                disabled={loadingInvoices || userInvoices.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingInvoices ? "Chargement..." : "Choisir une période"} />
                </SelectTrigger>
                <SelectContent>
                  {userInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.period}>
                      {inv.period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {(loadingInvoices || loadingRooms) && (
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des données…
          </div>
        )}

        {selectedInvoice && kpis && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <KpiCard title="Chiffre d'Affaires" value={formatCurrencyEUR(kpis.totalCA)} icon={Euro} colorClass="text-green-600" />
              <KpiCard title="Montant Versé" value={formatCurrencyEUR(kpis.totalMontantVerse)} icon={Euro} colorClass="text-emerald-600" />
              <KpiCard title="Frais HK" value={formatCurrencyEUR(kpis.totalFacture)} icon={Euro} colorClass="text-rose-600" />

              <KpiCard title="Nuits" value={kpis.totalNuits.toLocaleString('fr-FR')} icon={BedDouble} colorClass="text-blue-600" />
              <KpiCard title="Réservations" value={kpis.totalReservations.toLocaleString('fr-FR')} icon={CalendarDays} colorClass="text-indigo-600" />
              <KpiCard title="Voyageurs" value={kpis.totalVoyageurs.toLocaleString('fr-FR')} icon={Users} colorClass="text-purple-600" />

              <KpiCard title="ADR (€/nuit vendue)" value={formatCurrencyEUR(kpis.adr)} icon={TrendingUp} colorClass="text-orange-600" />
              <KpiCard title="RevPAR (€/nuit dispo)" value={formatCurrencyEUR(kpis.revpar)} icon={TrendingUp} colorClass="text-cyan-600" />
              <KpiCard title="Occupation (%)" value={`${kpis.monthlyOccupation.toFixed(1)} %`} icon={TrendingUp} colorClass="text-teal-600" />
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Détail rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground mb-1">Client</div>
                    <div className="font-medium">
                      {(selectedProfile?.first_name || '') + ' ' + (selectedProfile?.last_name || '')}
                    </div>
                    {selectedProfile?.email && (
                      <div className="text-sm text-muted-foreground">{selectedProfile.email}</div>
                    )}
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground mb-1">Période</div>
                    <div className="font-medium">{selectedInvoice.period}</div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground mb-1">Logements actifs (mois)</div>
                    <div className="font-medium">{roomsCount}</div>
                  </div>
                </div>

                <Table className="mt-6">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicateur</TableHead>
                      <TableHead className="text-right">Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Bénéfice Net (Versé - Frais HK)</TableCell>
                      <TableCell className="text-right">{formatCurrencyEUR(kpis.net)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>ADR</TableCell>
                      <TableCell className="text-right">{formatCurrencyEUR(kpis.adr)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>RevPAR</TableCell>
                      <TableCell className="text-right">{formatCurrencyEUR(kpis.revpar)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Taux d'occupation</TableCell>
                      <TableCell className="text-right">{kpis.monthlyOccupation.toFixed(1)} %</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {!loadingInvoices && selectedUserId && userInvoices.length === 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Aucun relevé trouvé</CardTitle>
            </CardHeader>
            <CardContent>
              Ce client n'a pas encore de relevés sauvegardés.
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminClientPerformancePage;