import React, { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { getSavedInvoices, getAllProfiles, SavedInvoice } from '@/lib/admin-api';
import { formatMonthLabel } from '@/lib/user-room-api';
import { generateAgencyComparisonPdf, AgencyComparisonRow } from '@/lib/agency-comparison-pdf';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building2, Download, Terminal, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const MONTHS_FR: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
};

const periodToMonthKey = (period: string): string | null => {
  const parts = (period || '').trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const monthIndex = MONTHS_FR[parts[0]];
  const year = parseInt(parts[parts.length - 1], 10);
  if (monthIndex === undefined || isNaN(year)) return null;
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
};

const aggregateStatement = (statement: SavedInvoice) => {
  const totals: any = statement.totals || {};
  const lines: any[] = Array.isArray(statement.invoice_data) ? statement.invoice_data : [];
  const sumOf = (key: string) => lines.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);

  const montantVerse = Number(totals.totalMontantVerse) || sumOf('montantVerse');
  const taxeDeSejour = Number(totals.totalTaxeDeSejour) || 0;
  const fraisMenage = (Number(totals.totalFraisMenage) || 0) + (Number(totals.ownerCleaningFee) || 0);
  const commission = Number(totals.totalCommission) || 0;
  const ca = sumOf('ca') || sumOf('originalTotalPaye') || montantVerse;
  const nuits = Number(totals.totalNuits) || sumOf('nuits');
  const reservations = lines.filter((r) => r && (r.voyageur || r.arrivee)).length;

  return {
    montantVerse,
    ca,
    commission,
    nuits,
    reservations,
    netProprio: montantVerse - taxeDeSejour - fraisMenage - commission,
  };
};

type MetricKey = 'montantVerse' | 'ca' | 'commission' | 'netProprio' | 'nuits' | 'reservations';

const METRICS: { key: MetricKey; label: string; isMoney: boolean }[] = [
  { key: 'montantVerse', label: 'Montant versé', isMoney: true },
  { key: 'ca', label: 'CA (payé par les voyageurs)', isMoney: true },
  { key: 'commission', label: 'Commission conciergerie', isMoney: true },
  { key: 'netProprio', label: 'Net propriétaire', isMoney: true },
  { key: 'nuits', label: 'Nuits louées', isMoney: false },
  { key: 'reservations', label: 'Réservations', isMoney: false },
];

type Mode = 'year' | 'month';

const AdminAgencyComparisonPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('year');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [metric, setMetric] = useState<MetricKey>('montantVerse');

  const { data: statements, isLoading, error } = useQuery({
    queryKey: ['adminAgencyComparisonStatements'],
    queryFn: getSavedInvoices,
  });

  const { data: profiles } = useQuery({
    queryKey: ['adminAllProfiles'],
    queryFn: getAllProfiles,
    staleTime: 5 * 60 * 1000,
  });

  const agencyByUser = useMemo(() => {
    const map = new Map<string, string>();
    (profiles || []).forEach((p) => map.set(p.id, (p.agency ?? '').trim()));
    return map;
  }, [profiles]);

  // Mois disponibles (clés yyyy-MM), triés du plus récent au plus ancien
  const availableMonths = useMemo(() => {
    return [...new Set(
      (statements || []).map((s) => periodToMonthKey(s.period)).filter((k): k is string => k !== null)
    )].sort().reverse();
  }, [statements]);

  const availableYears = useMemo(
    () => [...new Set(availableMonths.map((m) => m.slice(0, 4)))].sort().reverse(),
    [availableMonths]
  );

  const effectiveYear = selectedYear || availableYears[0] || '';
  const monthsOfYear = useMemo(
    () => availableMonths.filter((m) => m.startsWith(effectiveYear)),
    [availableMonths, effectiveYear]
  );
  const effectiveMonth =
    selectedMonth && selectedMonth.startsWith(effectiveYear) ? selectedMonth : monthsOfYear[0] || '';

  // Relevés de la période sélectionnée, avec leur clé mois et agence
  const scopedStatements = useMemo(() => {
    if (!statements) return [];
    return statements
      .map((s) => ({ statement: s, monthKey: periodToMonthKey(s.period) }))
      .filter((x): x is { statement: SavedInvoice; monthKey: string } => x.monthKey !== null)
      .filter((x) =>
        mode === 'year' ? x.monthKey.startsWith(effectiveYear) : x.monthKey === effectiveMonth
      );
  }, [statements, mode, effectiveYear, effectiveMonth]);

  // Synthèse par agence
  const agencyRows: AgencyComparisonRow[] = useMemo(() => {
    const byAgency = new Map<string, AgencyComparisonRow & { users: Set<string> }>();
    scopedStatements.forEach(({ statement }) => {
      const agency = agencyByUser.get(statement.user_id) || 'Sans agence';
      const agg = aggregateStatement(statement);
      const entry = byAgency.get(agency) || {
        agency, clients: 0, statements: 0, montantVerse: 0, ca: 0,
        commission: 0, netProprio: 0, nuits: 0, reservations: 0,
        users: new Set<string>(),
      };
      entry.users.add(statement.user_id);
      entry.statements += 1;
      entry.montantVerse += agg.montantVerse;
      entry.ca += agg.ca;
      entry.commission += agg.commission;
      entry.netProprio += agg.netProprio;
      entry.nuits += agg.nuits;
      entry.reservations += agg.reservations;
      byAgency.set(agency, entry);
    });
    return [...byAgency.values()]
      .map(({ users, ...rest }) => ({ ...rest, clients: users.size }))
      .sort((a, b) => b[metric] - a[metric]);
  }, [scopedStatements, agencyByUser, metric]);

  const agencies = useMemo(() => agencyRows.map((r) => r.agency), [agencyRows]);

  // Détail mois par mois (mode année) : valeur de la métrique par agence et par mois
  const monthlyBreakdown = useMemo(() => {
    if (mode !== 'year') return [];
    const byMonth = new Map<string, Record<string, number>>();
    scopedStatements.forEach(({ statement, monthKey }) => {
      const agency = agencyByUser.get(statement.user_id) || 'Sans agence';
      const agg = aggregateStatement(statement);
      const entry = byMonth.get(monthKey) || {};
      entry[agency] = (entry[agency] || 0) + agg[metric];
      byMonth.set(monthKey, entry);
    });
    return [...byMonth.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([monthKey, valuesByAgency]) => ({
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        valuesByAgency,
      }));
  }, [mode, scopedStatements, agencyByUser, metric]);

  const metricInfo = METRICS.find((m) => m.key === metric)!;
  const formatMetric = (v: number) => (metricInfo.isMoney ? fmt(v) : String(Math.round(v)));

  const monthLabel = effectiveMonth ? formatMonthLabel(effectiveMonth) : '';
  const periodLabel =
    mode === 'year'
      ? `Année ${effectiveYear}`
      : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const totals = agencyRows.reduce(
    (acc, r) => ({
      montantVerse: acc.montantVerse + r.montantVerse,
      ca: acc.ca + r.ca,
      commission: acc.commission + r.commission,
      netProprio: acc.netProprio + r.netProprio,
      nuits: acc.nuits + r.nuits,
      reservations: acc.reservations + r.reservations,
      clients: acc.clients + r.clients,
      statements: acc.statements + r.statements,
    }),
    { montantVerse: 0, ca: 0, commission: 0, netProprio: 0, nuits: 0, reservations: 0, clients: 0, statements: 0 }
  );

  const handleExportPdf = () => {
    if (agencyRows.length === 0) {
      toast.error('Aucune donnée à exporter pour cette période.');
      return;
    }
    generateAgencyComparisonPdf({
      periodLabel,
      rows: agencyRows,
      monthlyBreakdown:
        mode === 'year'
          ? {
              metricLabel: metricInfo.label,
              isMoney: metricInfo.isMoney,
              agencies,
              rows: monthlyBreakdown.map((m) => ({
                monthLabel: m.monthLabel.charAt(0).toUpperCase() + m.monthLabel.slice(1),
                valuesByAgency: m.valuesByAgency,
              })),
            }
          : undefined,
    });
    toast.success('PDF généré et téléchargé.');
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Comparatif Agences</h1>
              <p className="text-sm text-muted-foreground">
                Comparatif agence vs agence sur l'année complète ou sur un mois, basé sur les relevés sauvegardés.
              </p>
            </div>
          </div>
          <Button onClick={handleExportPdf} disabled={agencyRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter en PDF
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList>
              <TabsTrigger value="year">Année complète</TabsTrigger>
              <TabsTrigger value="month">Mois</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={effectiveYear} onValueChange={(v) => { setSelectedYear(v); setSelectedMonth(''); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode === 'month' && (
            <Select value={effectiveMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {monthsOfYear.map((m) => {
                  const label = formatMonthLabel(m);
                  return (
                    <SelectItem key={m} value={m}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Métrique" />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        ) : agencyRows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucun relevé trouvé pour cette période.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cartes agence vs agence */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {agencyRows.map((a, i) => (
                <Card
                  key={a.agency}
                  className={i === 0 ? 'border-2 border-amber-400 bg-amber-50/50' : ''}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold">{a.agency}</p>
                      {i === 0 && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                          <Trophy className="mr-1 h-3 w-3" /> 1ère
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{formatMetric(a[metric])}</p>
                    <p className="text-xs text-muted-foreground">{metricInfo.label} — {periodLabel}</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Clients / Relevés</span><span className="tabular-nums font-medium">{a.clients} / {a.statements}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Montant versé</span><span className="tabular-nums font-medium">{fmt(a.montantVerse)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">CA voyageurs</span><span className="tabular-nums font-medium">{fmt(a.ca)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Commission</span><span className="tabular-nums font-medium">{fmt(a.commission)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Net propriétaires</span><span className="tabular-nums font-medium">{fmt(a.netProprio)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Nuits / Résa</span><span className="tabular-nums font-medium">{Math.round(a.nuits)} / {a.reservations}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tableau de synthèse */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Synthèse par agence — {periodLabel}</CardTitle>
                <CardDescription>
                  {agencyRows.length} agence(s), classées par {metricInfo.label.toLowerCase()}. Ce tableau est repris dans l'export PDF.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agence</TableHead>
                        <TableHead className="text-right">Clients</TableHead>
                        <TableHead className="text-right">Relevés</TableHead>
                        <TableHead className="text-right">Montant versé</TableHead>
                        <TableHead className="text-right">CA voyageurs</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Net proprio</TableHead>
                        <TableHead className="text-right">Nuits</TableHead>
                        <TableHead className="text-right">Résa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencyRows.map((r) => (
                        <TableRow key={r.agency}>
                          <TableCell className="font-medium whitespace-nowrap">{r.agency}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.clients}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.statements}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.montantVerse)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.ca)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(r.commission)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{fmt(r.netProprio)}</TableCell>
                          <TableCell className="text-right tabular-nums">{Math.round(r.nuits)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.reservations}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right tabular-nums">{totals.clients}</TableCell>
                        <TableCell className="text-right tabular-nums">{totals.statements}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totals.montantVerse)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totals.ca)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totals.commission)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totals.netProprio)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Math.round(totals.nuits)}</TableCell>
                        <TableCell className="text-right tabular-nums">{totals.reservations}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Détail mois par mois (année complète) */}
            {mode === 'year' && monthlyBreakdown.length > 0 && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Détail mois par mois — {metricInfo.label}</CardTitle>
                  <CardDescription>
                    Valeur de la métrique sélectionnée par agence et par mois sur {effectiveYear}. Ce tableau est repris dans l'export PDF.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mois</TableHead>
                          {agencies.map((a) => (
                            <TableHead key={a} className="text-right">{a}</TableHead>
                          ))}
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyBreakdown.map((m) => {
                          const rowTotal = agencies.reduce((s, a) => s + (m.valuesByAgency[a] || 0), 0);
                          return (
                            <TableRow key={m.monthKey}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {m.monthLabel.charAt(0).toUpperCase() + m.monthLabel.slice(1)}
                              </TableCell>
                              {agencies.map((a) => (
                                <TableCell key={a} className="text-right tabular-nums">
                                  {formatMetric(m.valuesByAgency[a] || 0)}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-semibold tabular-nums">
                                {formatMetric(rowTotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold">
                          <TableCell>Total {effectiveYear}</TableCell>
                          {agencies.map((a) => (
                            <TableCell key={a} className="text-right tabular-nums">
                              {formatMetric(monthlyBreakdown.reduce((s, m) => s + (m.valuesByAgency[a] || 0), 0))}
                            </TableCell>
                          ))}
                          <TableCell className="text-right tabular-nums">
                            {formatMetric(
                              monthlyBreakdown.reduce(
                                (s, m) => s + agencies.reduce((x, a) => x + (m.valuesByAgency[a] || 0), 0),
                                0
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAgencyComparisonPage;
