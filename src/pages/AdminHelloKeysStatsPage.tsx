import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import HelloKeysStatsCharts from '@/components/HelloKeysStatsCharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Download, Euro, FileText, Info, Loader2, Moon, RefreshCw, Sparkles, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { METRICS, MONTHS, Metric, StatsInvoice, StatsSource, aggregateMonths, change, fetchHelloKeysInvoices, money, number, percent, summarizeMonths } from '@/lib/hello-keys-stats';

const labels: Record<Metric, string> = { revenue: 'Revenus générés', commission: 'Commissions Hello Keys', cleaning: 'Frais de ménage', billed: 'Montant facturé', payouts: 'Montants versés (relevés)', tax: 'Taxe de séjour', nights: 'Nuitées', guests: 'Voyageurs' };
function Variation({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Comparaison indisponible</span>;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}><Icon className="h-3.5 w-3.5" />{value > 0 ? '+' : ''}{percent(value)} vs N−1</span>;
}

export default function AdminHelloKeysStatsPage() {
  const [invoices, setInvoices] = useState<StatsInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [year, setYear] = useState('all');
  const [source, setSource] = useState<StatsSource>('all');
  const [agency, setAgency] = useState('all');
  const [heatMetric, setHeatMetric] = useState<Metric>('revenue');
  const [descending, setDescending] = useState(true);
  const fetchStats = useCallback(async (initial = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHelloKeysInvoices();
      setInvoices(data);
      setUpdatedAt(new Date());
      if (initial) {
        const { months } = aggregateMonths(data, 'all');
        setYear(months.at(-1)?.year ?? 'all');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les statistiques.');
      toast.error('La récupération des statistiques a échoué.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void fetchStats(true); }, [fetchStats]);

  const agencies = useMemo(() => [...new Set(["Côte d'opal", 'Baie de somme', ...invoices.flatMap(row => row.agency ? [row.agency] : [])])], [invoices]);
  const agencyInvoices = useMemo(() => invoices.filter(row => agency === 'all' || (agency === 'unassigned' ? !row.agency : row.agency === agency)), [invoices, agency]);
  const unassignedCount = invoices.filter(row => !row.agency).length;
  const agencyLabel = agency === 'all' ? 'Les deux agences' : agency === 'unassigned' ? 'Sans agence renseignée' : agency;
  const { months: allMonths, excluded } = useMemo(() => aggregateMonths(agencyInvoices, source), [agencyInvoices, source]);
  const years = useMemo(() => [...new Set(aggregateMonths(invoices, 'all').months.map(row => row.year))].sort().reverse(), [invoices]);
  const months = useMemo(() => allMonths.filter(row => year === 'all' || row.year === year), [allMonths, year]);
  const summary = useMemo(() => summarizeMonths(months), [months]);
  const previous = allMonths.filter(row => row.year === String(Number(year) - 1));
  const matched = months.filter(row => previous.some(item => item.month === row.month));
  const compare = (metric: Metric) => {
    if (year === 'all') return null;
    const comparable = matched.filter(row => row.coverage[metric] > 0 && previous.some(item => item.month === row.month && item.coverage[metric] > 0));
    if (!comparable.length) return null;
    const current = comparable.reduce((sum, row) => sum + row[metric], 0);
    const baseline = previous.filter(row => comparable.some(item => item.month === row.month)).reduce((sum, row) => sum + row[metric], 0);
    return change(current, baseline);
  };
  const best = [...months].filter(row => row.coverage.revenue > 0).sort((a, b) => b.revenue - a.revenue)[0];
  const latest = months.at(-1);
  const beforeLatest = months.at(-2);
  const latestChange = latest && beforeLatest && latest.coverage.revenue > 0 && beforeLatest.coverage.revenue > 0 && (Number(latest.year) * 12 + latest.month) - (Number(beforeLatest.year) * 12 + beforeLatest.month) === 1
    ? change(latest.revenue, beforeLatest.revenue) : null;
  const generatedMonths = aggregateMonths(agencyInvoices, 'generated').months.filter(row => year === 'all' || row.year === year);
  const generatedSummary = summarizeMonths(generatedMonths);
  const commissionRate = source !== 'manual' && generatedSummary.revenue > 0 ? generatedSummary.commission / generatedSummary.revenue * 100 : null;
  const revenuePerNight = summary.nights > 0 && summary.coverage.nights === summary.invoices && summary.coverage.revenue === summary.invoices ? summary.revenue / summary.nights : null;
  const maximum = Math.max(...allMonths.filter(row => year === 'all' || row.year === year).map(row => Math.abs(row[heatMetric])), 1);
  const heatYears = year === 'all' ? years : [year];
  const sortedMonths = descending ? [...months].reverse() : months;
  const displayMetric = (metric: Metric, value: number, coverage: number) => coverage === 0 ? '—' : ['nights', 'guests'].includes(metric) ? number(value) : money(value);

  const exportCsv = () => {
    const header = ['Agence', 'Période', ...METRICS.map(metric => labels[metric]), 'Relevés', 'Propriétaires distincts', 'Relevés générés', 'Saisies manuelles', 'Déclarés payés', 'Non déclarés payés', 'Paiement non suivi', ...METRICS.map(metric => `Relevés renseignés : ${labels[metric]}`)];
    const safeAgencyLabel = /^[=+@-]/.test(agencyLabel) ? `'${agencyLabel}` : agencyLabel;
    const rows = months.map(row => [safeAgencyLabel, row.period, ...METRICS.map(metric => row.coverage[metric] ? row[metric].toFixed(2).replace('.', ',') : ''), row.invoices, row.owners.length, row.generated, row.manual, row.paid, row.unpaid, row.paymentUnknown, ...METRICS.map(metric => row.coverage[metric])]);
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hello-keys-statistiques-${year}-${source}-${agency.replace(/[^a-z0-9-]/gi, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Le détail mensuel a été exporté.');
  };

  return <AdminLayout><div className="mx-auto max-w-[1600px] space-y-6 py-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-lg md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
        <div><Badge className="mb-4 border-white/20 bg-white/10 text-indigo-100 hover:bg-white/10"><Sparkles className="mr-1.5 h-3 w-3" />HELLO KEYS · ANALYTICS</Badge><h1 className="text-3xl font-bold tracking-tight md:text-4xl">Chaque chiffre raconte votre croissance.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-indigo-100/80">Finances, activité et historique : une vision complète de vos performances, à partir des relevés enregistrés.</p><p className="mt-4 text-xs text-indigo-200/70">{number(invoices.length)} relevés chargés · {years.length} années disponibles{updatedAt && ` · Actualisé à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</p></div>
        <div className="flex shrink-0 flex-wrap gap-2"><Button variant="secondary" onClick={() => void fetchStats()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</Button><Button onClick={exportCsv} disabled={loading || !months.length || !!error} className="bg-indigo-500 text-white hover:bg-indigo-400"><Download className="mr-2 h-4 w-4" />Exporter CSV</Button></div>
      </div>
    </section>

    <Card className="rounded-2xl border-indigo-200 dark:border-indigo-900">
      <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
        <div>
          <label htmlFor="stats-agency" className="text-base font-semibold">Vue par agence</label>
          <p className="mt-1 text-sm text-muted-foreground">Combinez les deux agences ou consultez les résultats d’une seule.</p>
          <p className="mt-1 text-xs text-muted-foreground">Selon l’agence actuellement renseignée sur le profil du propriétaire.{unassignedCount > 0 && ` ${unassignedCount} relevés sans agence sont inclus dans la vue globale, mais exclus des vues individuelles.`}</p>
        </div>
        <Select value={agency} onValueChange={setAgency}>
          <SelectTrigger id="stats-agency" className="w-full md:w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Les deux agences</SelectItem>
            {agencies.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            {unassignedCount > 0 && <SelectItem value="unassigned">Sans agence renseignée</SelectItem>}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>

    <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-4 md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-4"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-500" /><label htmlFor="stats-year" className="text-sm font-medium">Période</label><Select value={year} onValueChange={setYear}><SelectTrigger id="stats-year" className="w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tout l’historique</SelectItem>{years.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2"><label htmlFor="stats-source" className="text-sm font-medium">Source</label><Select value={source} onValueChange={value => setSource(value as StatsSource)}><SelectTrigger id="stats-source" className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous les relevés</SelectItem><SelectItem value="generated">Relevés générés</SelectItem><SelectItem value="manual">Saisies manuelles</SelectItem></SelectContent></Select></div></div>
      <Badge variant="outline" className="w-fit">{agencyLabel} · {months.length} mois renseignés{year !== 'all' ? ' / 12' : ''} · {number(summary.owners)} propriétaires</Badge>
    </div>

    {loading ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /><p>Chargement de l’ensemble des relevés…</p></div> : error ? <Card><CardContent className="space-y-3 p-6 text-center"><p className="text-destructive">Impossible de charger les statistiques : {error}</p><Button onClick={() => void fetchStats()}>Réessayer</Button></CardContent></Card> : !months.length ? <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><BarChart3 className="h-10 w-10 text-muted-foreground" /><h2 className="font-semibold">Aucun relevé pour cette sélection</h2><p className="text-sm text-muted-foreground">Choisissez une autre année ou une autre source.{excluded > 0 && ` ${excluded} périodes non reconnues ont été exclues.`}</p><Button variant="outline" onClick={() => { setYear('all'); setSource('all'); }}>Afficher tout l’historique</Button></CardContent></Card> : <>
      <div className="flex gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs leading-relaxed text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100"><Info className="mt-0.5 h-4 w-4 shrink-0" /><div>Les revenus incluent le CA des saisies manuelles. Commissions, ménage et taxe ne sont détaillés que sur les relevés générés. Les mois absents ne sont pas assimilés à zéro.{year !== 'all' && ` Comparaisons N−1 calculées sur ${matched.length} mois présents dans les deux années.`}{excluded > 0 && ` ${excluded} relevés exclus : période non reconnue.`}</div></div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric, index) => {
          const Icon = [Euro, Wallet, Sparkles, FileText, Wallet, Euro, Moon, Users][index];
          return <Card key={metric} className="rounded-2xl shadow-sm"><CardContent className="p-5"><div className="mb-3 flex items-center justify-between gap-2"><span className="text-sm font-medium text-muted-foreground">{labels[metric]}</span><span className={`rounded-lg p-2 ${index % 2 ? 'bg-teal-500/10 text-teal-600' : 'bg-indigo-500/10 text-indigo-500'}`}><Icon className="h-4 w-4" /></span></div><div className="text-2xl font-bold tracking-tight tabular-nums">{displayMetric(metric, summary[metric], summary.coverage[metric])}</div><div className="mt-2"><Variation value={compare(metric)} /></div><p className="mt-2 text-[11px] text-muted-foreground">{summary.coverage[metric]} / {summary.invoices} relevés renseignés{summary.coverage[metric] < summary.invoices ? ' · données partielles' : ''}</p></CardContent></Card>;
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: 'Relevés enregistrés', value: number(summary.invoices), note: `${summary.generated} générés · ${summary.manual} manuels`, icon: FileText }, { label: 'Propriétaires distincts', value: number(summary.owners), note: 'Propriétaires avec au moins un relevé', icon: Users }, { label: 'Facturation moyenne / relevé', value: summary.coverage.billed ? money(summary.billed / summary.coverage.billed) : '—', note: 'Sur les relevés avec un montant facturé', icon: Wallet }, { label: 'Revenu moyen / nuitée', value: revenuePerNight !== null ? money(revenuePerNight) : '—', note: revenuePerNight !== null ? 'Revenus générés ÷ nuitées renseignées' : 'Nécessite des revenus et nuitées complets', icon: Moon }].map(item => <Card key={item.label} className="rounded-2xl bg-muted/30 shadow-none"><CardContent className="p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><item.icon className="h-4 w-4" />{item.label}</div><p className="mt-3 text-2xl font-semibold tabular-nums">{item.value}</p><p className="mt-2 text-[11px] text-muted-foreground">{item.note}</p></CardContent></Card>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20"><CardContent className="p-5"><p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-indigo-500" />Meilleur mois de revenus</p><p className="mt-3 text-xl font-bold">{best?.period ?? '—'}</p><p className="mt-1 text-sm text-muted-foreground">{best ? `${money(best.revenue)} · ${summary.revenue > 0 ? percent(best.revenue / summary.revenue * 100) : '—'} des revenus sélectionnés` : 'Aucun revenu renseigné'}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-teal-500" />Dernier mois renseigné</p><p className="mt-3 text-xl font-bold">{latest?.period}</p><p className="mt-1 text-sm text-muted-foreground">{latest ? money(latest.revenue) : '—'}{latestChange !== null ? ` · ${latestChange > 0 ? '+' : ''}${percent(latestChange)} vs mois précédent` : ' · Pas de comparaison mensuelle disponible'}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5"><p className="flex items-center gap-2 text-sm font-medium"><Wallet className="h-4 w-4 text-amber-500" />Taux de commission observé</p><p className="mt-3 text-xl font-bold">{commissionRate !== null ? percent(commissionRate) : '—'}</p><p className="mt-1 text-sm text-muted-foreground">Commissions ÷ revenus des relevés générés uniquement</p></CardContent></Card>
      </div>

      <HelloKeysStatsCharts months={months} allMonths={allMonths} year={year} />

      <Card className="rounded-2xl"><CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><CardTitle className="text-lg">La saisonnalité, en un coup d’œil</CardTitle><CardDescription className="mt-1">Intensité relative à la sélection · survolez un mois pour son montant · « — » = donnée absente</CardDescription></div><Select value={heatMetric} onValueChange={value => setHeatMetric(value as Metric)}><SelectTrigger aria-label="Indicateur de saisonnalité" className="w-[210px]"><SelectValue /></SelectTrigger><SelectContent>{METRICS.map(metric => <SelectItem key={metric} value={metric}>{labels[metric]}</SelectItem>)}</SelectContent></Select></CardHeader><CardContent><div className="overflow-x-auto"><div className="min-w-[760px] space-y-2"><div className="grid grid-cols-[60px_repeat(12,minmax(0,1fr))] gap-2 text-center text-xs text-muted-foreground"><span />{MONTHS.map(month => <span key={month}>{month.slice(0, 3)}</span>)}</div>{heatYears.map(value => <div key={value} className="grid grid-cols-[60px_repeat(12,minmax(0,1fr))] items-center gap-2"><button onClick={() => setYear(value)} className="text-left text-sm font-semibold hover:text-indigo-500">{value}</button>{MONTHS.map((month, index) => {
          const row = allMonths.find(item => item.year === value && item.month === index);
          const available = row && row.coverage[heatMetric] > 0;
          const intensity = available ? Math.abs(row[heatMetric]) / maximum : 0;
          return <div key={month} tabIndex={0} title={`${month} ${value} : ${available ? displayMetric(heatMetric, row[heatMetric], row.coverage[heatMetric]) : 'Donnée absente'}`} aria-label={`${month} ${value} : ${available ? displayMetric(heatMetric, row[heatMetric], row.coverage[heatMetric]) : 'Donnée absente'}`} className={`flex h-12 items-center justify-center rounded-lg border text-[10px] tabular-nums ${!available ? 'border-dashed text-muted-foreground' : 'border-transparent'}`} style={available ? { backgroundColor: `rgba(99, 102, 241, ${0.12 + intensity * 0.8})`, color: intensity > 0.45 ? 'white' : undefined } : undefined}>{available ? (['nights', 'guests'].includes(heatMetric) ? number(row[heatMetric]) : new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(row[heatMetric]) + ' €') : '—'}</div>;
        })}</div>)}</div></div><div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">Faible{[0.12, 0.3, 0.5, 0.7, 0.92].map(opacity => <span key={opacity} className="h-3 w-6 rounded" style={{ backgroundColor: `rgba(99,102,241,${opacity})` }} />)}Élevé</div></CardContent></Card>

      <Card className="overflow-hidden rounded-2xl"><CardHeader className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><CardTitle className="text-lg">Tous les chiffres, mois par mois</CardTitle><CardDescription className="mt-1">Détail de la sélection · montants en euros · survolez un chiffre pour sa couverture</CardDescription></div><Button variant="outline" size="sm" onClick={() => setDescending(value => !value)}>{descending ? 'Plus récent d’abord' : 'Plus ancien d’abord'} ↕</Button></CardHeader><CardContent className="px-0 pb-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Période</TableHead>{METRICS.map(metric => <TableHead className="whitespace-nowrap text-right" key={metric}>{labels[metric]}</TableHead>)}<TableHead className="text-right">Relevés</TableHead><TableHead className="pr-6 text-right">Propriétaires</TableHead></TableRow></TableHeader><TableBody>{sortedMonths.map(row => <TableRow key={row.key}><TableCell className="whitespace-nowrap pl-6 font-medium">{row.period}</TableCell>{METRICS.map(metric => <TableCell key={metric} className="whitespace-nowrap text-right tabular-nums" title={`${row.coverage[metric]} / ${row.invoices} relevés renseignés`}>{displayMetric(metric, row[metric], row.coverage[metric])}{row.coverage[metric] > 0 && row.coverage[metric] < row.invoices ? ' *' : ''}</TableCell>)}<TableCell className="text-right">{row.invoices}</TableCell><TableCell className="pr-6 text-right">{row.owners.length}</TableCell></TableRow>)}<TableRow className="bg-muted/50 font-bold"><TableCell className="pl-6">TOTAL</TableCell>{METRICS.map(metric => <TableCell key={metric} className="whitespace-nowrap text-right tabular-nums">{displayMetric(metric, summary[metric], summary.coverage[metric])}</TableCell>)}<TableCell className="text-right">{summary.invoices}</TableCell><TableCell className="pr-6 text-right">{summary.owners}</TableCell></TableRow></TableBody></Table></CardContent></Card>
      <div className="space-y-1 pb-4 text-xs leading-relaxed text-muted-foreground"><p>* Valeur partielle : certains relevés ne détaillent pas ce poste. Les propriétaires sont dédupliqués dans le total ; leur nombre n’est pas la somme des mois.</p><p>Ces statistiques décrivent les relevés, pas un bénéfice net ni un rapprochement bancaire. Aucun taux d’occupation n’est calculé sans disponibilité réelle des logements. Les réservations ne sont pas déduites du nombre de relevés.</p></div>
    </>}
  </div></AdminLayout>;
}
