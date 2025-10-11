import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllProfiles, getInvoicesByUserId, type SavedInvoice } from '@/lib/admin-api';
import { getUserRoomsByUserId } from '@/lib/user-room-api';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, CalendarDays, BedDouble, TrendingUp, Euro } from 'lucide-react';
import { getDaysInMonth } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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

const monthsFrOrdered = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

function parsePeriod(period: string): { year: number; monthIndex: number; monthLabel: string } | null {
  if (!period) return null;
  const [mois, anneeRaw] = period.toLowerCase().split(' ');
  const year = parseInt(anneeRaw, 10);
  const monthIndex = monthIndexFr[mois];
  if (Number.isNaN(year) || monthIndex === undefined) return null;
  return { year, monthIndex, monthLabel: monthsFrOrdered[monthIndex] };
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
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userInvoices, setUserInvoices] = useState<SavedInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [roomsCount, setRoomsCount] = useState<number>(0);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");

  // Fetch clients
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

  // Fetch invoices + rooms when client changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedUserId) {
        setUserInvoices([]);
        setSelectedPeriod("");
        setRoomsCount(0);
        setSelectedYear("");
        return;
      }
      
      try {
        setLoadingInvoices(true);
        const invs = await getInvoicesByUserId(selectedUserId);
        
        // tri du plus récent au plus ancien par created_at (si dispo) sinon par période
        const sorted = [...invs].sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
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
          const firstParsed = parsePeriod(sorted[0].period);
          setSelectedYear(firstParsed ? firstParsed.year : "");
        } else {
          setSelectedPeriod("");
          setSelectedYear("");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des invoices:", error);
        setUserInvoices([]);
        setSelectedPeriod("");
        setSelectedYear("");
      } finally {
        setLoadingInvoices(false);
      }

      try {
        setLoadingRooms(true);
        const rooms = await getUserRoomsByUserId(selectedUserId);
        setRoomsCount(rooms?.length || 0);
      } catch (error) {
        console.error("Erreur lors du chargement des rooms:", error);
        setRoomsCount(0);
      } finally {
        setLoadingRooms(false);
      }
    };
    
    fetchData();
  }, [selectedUserId]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const email = (p.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [profiles, searchQuery]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    userInvoices.forEach(inv => {
      const parsed = parsePeriod(inv.period);
      if (parsed) years.add(parsed.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [userInvoices]);

  const selectedInvoice = useMemo(
    () => userInvoices.find((i) => i.period === selectedPeriod) || null,
    [userInvoices, selectedPeriod]
  );

  const kpis = useMemo(() => {
    if (!selectedInvoice) {
      return null;
    }
    const t = selectedInvoice.totals || {};
    const totalCA = typeof t.totalCA === 'number'
      ? t.totalCA
      : (typeof t.totalRevenuGenere === 'number' ? t.totalRevenuGenere : 0);

    const totalMontantVerse = typeof t.totalMontantVerse === 'number' ? t.totalMontantVerse : 0;
    const totalFacture = typeof t.totalFacture === 'number' ? t.totalFacture : (typeof t.totalCommission === 'number' ? t.totalCommission : 0);

    const totalNuits = typeof t.totalNuits === 'number' ? t.totalNuits : 0;
    const totalReservations = typeof t.totalReservations === 'number' ? t.totalReservations : (selectedInvoice.invoice_data?.length || 0);
    const totalVoyageurs = typeof t.totalVoyageurs === 'number' ? t.totalVoyageurs : 0;

    const adr = totalNuits > 0 ? totalCA / totalNuits : 0;

    let revpar = 0;
    let monthlyOccupation = 0;
    const periodParsed = parsePeriod(selectedInvoice.period);
    if (periodParsed && roomsCount > 0) {
      const days = getDaysInMonth(new Date(periodParsed.year, periodParsed.monthIndex, 1));
      const totalAvailableNights = roomsCount * days;
      revpar = totalAvailableNights > 0 ? totalCA / totalAvailableNights : 0;
      monthlyOccupation = totalAvailableNights > 0 ? (totalNuits / totalAvailableNights) * 100 : 0;
    }

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

  // Build monthly series for selected year
  const monthlySeries = useMemo(() => {
    if (!selectedYear || !selectedUserId) return [];

    return monthsFrOrdered.map((monthLabel, idx) => {
      const period = `${monthLabel} ${selectedYear}`;
      const inv = userInvoices.find(i => i.period === period);
      const t = inv?.totals || {};
      const ca = typeof t.totalCA === 'number'
        ? t.totalCA
        : (typeof t.totalRevenuGenere === 'number' ? t.totalRevenuGenere : 0);
      const verse = typeof t.totalMontantVerse === 'number' ? t.totalMontantVerse : 0;
      const hkFees = typeof t.totalFacture === 'number' ? t.totalFacture : (typeof t.totalCommission === 'number' ? t.totalCommission : 0);
      const nuits = typeof t.totalNuits === 'number' ? t.totalNuits : 0;

      const days = getDaysInMonth(new Date(Number(selectedYear), idx, 1));
      const totalAvailableNights = roomsCount > 0 ? roomsCount * days : 0;
      const adr = nuits > 0 ? ca / nuits : 0;
      const revpar = totalAvailableNights > 0 ? ca / totalAvailableNights : 0;
      const occupation = totalAvailableNights > 0 ? (nuits / totalAvailableNights) * 100 : 0;

      return {
        month: monthLabel.slice(0, 3), // court pour XAxis
        totalCA: ca,
        totalMontantVerse: verse,
        totalFacture: hkFees,
        totalNuits: nuits,
        adr,
        revpar,
        occupation: Number(occupation.toFixed(1)),
      };
    });
  }, [selectedYear, selectedUserId, userInvoices, roomsCount]);

  const chartConfig = {
    totalCA: { label: "CA", color: "#3b82f6" }, // blue-500
    totalMontantVerse: { label: "Versé", color: "#10b981" }, // emerald-500
    totalFacture: { label: "Frais HK", color: "#f43f5e" }, // rose-500
    occupation: { label: "Occupation (%)", color: "#f59e0b" }, // amber-500
  };

  const selectedProfile = useMemo(() => {
    return profiles.find(p => p.id === selectedUserId) || null;
  }, [profiles, selectedUserId]);

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    if (!selectedYear || !selectedUserId) return null;

    const yearlyData = monthsFrOrdered.map((monthLabel, idx) => {
      const period = `${monthLabel} ${selectedYear}`;
      const inv = userInvoices.find(i => i.period === period);
      const t = inv?.totals || {};
      const ca = typeof t.totalCA === 'number'
        ? t.totalCA
        : (typeof t.totalRevenuGenere === 'number' ? t.totalRevenuGenere : 0);
      const verse = typeof t.totalMontantVerse === 'number' ? t.totalMontantVerse : 0;
      const hkFees = typeof t.totalFacture === 'number' ? t.totalFacture : (typeof t.totalCommission === 'number' ? t.totalCommission : 0);
      const nuits = typeof t.totalNuits === 'number' ? t.totalNuits : 0;

      const days = getDaysInMonth(new Date(Number(selectedYear), idx, 1));
      const totalAvailableNights = roomsCount > 0 ? roomsCount * days : 0;
      const adr = nuits > 0 ? ca / nuits : 0;
      const revpar = totalAvailableNights > 0 ? ca / totalAvailableNights : 0;
      const occupation = totalAvailableNights > 0 ? (nuits / totalAvailableNights) * 100 : 0;

      return {
        month: monthLabel.slice(0, 3),
        totalCA: ca,
        totalMontantVerse: verse,
        totalFacture: hkFees,
        totalNuits: nuits,
        adr,
        revpar,
        occupation: Number(occupation.toFixed(1)),
      };
    });

    const totalCA = yearlyData.reduce((sum, item) => sum + item.totalCA, 0);
    const totalMontantVerse = yearlyData.reduce((sum, item) => sum + item.totalMontantVerse, 0);
    const totalFacture = yearlyData.reduce((sum, item) => sum + item.totalFacture, 0);
    const totalNuits = yearlyData.reduce((sum, item) => sum + item.totalNuits, 0);
    const totalReservations = yearlyData.reduce((sum, item) => sum + item.totalReservations, 0);
    const totalVoyageurs = yearlyData.reduce((sum, item) => sum + item.totalVoyageurs, 0);

    const yearlyOccupation = totalNuits > 0 ? (totalNuits / (roomsCount * 365)) * 100 : 0;
    const net = totalMontantVerse - totalFacture;

    return {
      totalCA,
      totalMontantVerse,
      totalFacture,
      totalNuits,
      totalReservations,
      totalVoyageurs,
      adr: totalNuits > 0 ? totalCA / totalNuits : 0,
      revpar: totalNuits > 0 ? totalCA / (roomsCount * 365) : 0,
      yearlyOccupation,
      net,
    };
  }, [selectedYear, selectedUserId, userInvoices, roomsCount]);

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
          <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Rechercher un client</div>
              <Input
                placeholder="Nom ou email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Client</div>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingProfiles}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingProfiles ? "Chargement..." : "Choisir un client"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.first_name || '') + ' ' + (p.last_name || '')} {p.email ? `(${p.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Période (mois)</div>
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

        {/* Vue annuelle avec graphiques */}
        {selectedUserId && availableYears.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vue annuelle</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">Année</div>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(v) => setSelectedYear(v ? Number(v) : "")}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* KPIs annuels */}
              {yearlyTotals && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Synthèse annuelle</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard title="CA Annuel" value={formatCurrencyEUR(yearlyTotals.totalCA || 0)} icon={Euro} colorClass="text-green-600" />
                    <KpiCard title="Montant Versé Annuel" value={formatCurrencyEUR(yearlyTotals.totalMontantVerse || 0)} icon={Euro} colorClass="text-emerald-600" />
                    <KpiCard title="Frais HK Annuel" value={formatCurrencyEUR(yearlyTotals.totalFacture || 0)} icon={Euro} colorClass="text-rose-600" />
                    <KpiCard title="Nuits Annuelles" value={(yearlyTotals.totalNuits || 0).toLocaleString('fr-FR')} icon={BedDouble} colorClass="text-blue-600" />
                    <KpiCard title="Réservations Annuelles" value={(yearlyTotals.totalReservations || 0).toLocaleString('fr-FR')} icon={CalendarDays} colorClass="text-indigo-600" />
                    <KpiCard title="ADR Annuel" value={formatCurrencyEUR(yearlyTotals.adr || 0)} icon={TrendingUp} colorClass="text-orange-600" />
                    <KpiCard title="Bénéfice Net Annuel" value={formatCurrencyEUR(yearlyTotals.net || 0)} icon={Euro} colorClass="text-teal-600" />
                    <KpiCard title="Taux d'Occupation Annuel" value={`${(yearlyTotals.yearlyOccupation || 0).toFixed(1)} %`} icon={TrendingUp} colorClass="text-cyan-600" />
                  </div>
                </div>
              )}

              {/* Tableau récapitulatif mensuel */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Détail mensuel</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mois</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">Montant Versé</TableHead>
                        <TableHead className="text-right">Frais HK</TableHead>
                        <TableHead className="text-right">Nuits</TableHead>
                        <TableHead className="text-right">Réservations</TableHead>
                        <TableHead className="text-right">ADR</TableHead>
                        <TableHead className="text-right">Occupation (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySeries.map((month, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{month.month}</TableCell>
                          <TableCell className="text-right">{formatCurrencyEUR(month.totalCA)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyEUR(month.totalMontantVerse)}</TableCell>
                          <TableCell className="text-right">{formatCurrencyEUR(month.totalFacture)}</TableCell>
                          <TableCell className="text-right">{month.totalNuits.toLocaleString('fr-FR')}</TableCell>
                          <TableCell className="text-right">{month.totalReservations.toLocaleString('fr-FR')}</TableCell>
                          <TableCell className="text-right">{formatCurrencyEUR(month.adr)}</TableCell>
                          <TableCell className="text-right">{month.occupation.toFixed(1)} %</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* CA vs Versé */}
              <div>
                <div className="mb-2 text-sm text-muted-foreground">CA vs Montant versé (mensuel)</div>
                <ChartContainer config={chartConfig} className="h-72">
                  <LineChart
                    data={monthlySeries}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="totalCA"
                      stroke="var(--color-totalCA)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalMontantVerse"
                      stroke="var(--color-totalMontantVerse)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Occupation (%) */}
              <div>
                <div className="mb-2 text-sm text-muted-foreground">Taux d'occupation mensuel (%)</div>
                <ChartContainer config={chartConfig} className="h-72">
                  <BarChart
                    data={monthlySeries}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="occupation"
                      fill="var(--color-occupation)"
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
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