import { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { MONTHS, StatsMonth, money, number, summarizeMonths } from '@/lib/hello-keys-stats';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];
const config = {
  revenue: { label: 'Revenus générés', color: COLORS[0] },
  commission: { label: 'Commissions', color: COLORS[0] },
  cleaning: { label: 'Ménage', color: COLORS[1] },
  billed: { label: 'Montant facturé', color: COLORS[2] },
  nights: { label: 'Nuitées', color: COLORS[0] },
  guests: { label: 'Voyageurs', color: COLORS[1] },
  invoices: { label: 'Relevés', color: COLORS[2] },
};
const compact = (value: number) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const grid = <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.35} />;
const euroTooltip = <Tooltip formatter={(value: number, name: string) => [money(value), name]} contentStyle={{ borderRadius: 12 }} />;
const countTooltip = <Tooltip formatter={(value: number, name: string) => [number(value), name]} contentStyle={{ borderRadius: 12 }} />;
function Panel({ title, description, children, className = '' }: { title: string; description: string; children: ReactNode; className?: string }) {
  return <Card className={`overflow-hidden rounded-2xl shadow-sm ${className}`}><CardHeader><CardTitle className="text-lg">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>;
}

export default function HelloKeysStatsCharts({ months, allMonths, year }: { months: StatsMonth[]; allMonths: StatsMonth[]; year: string }) {
  const summary = summarizeMonths(months);
  const first = months[0];
  const last = months.at(-1)!;
  const start = year === 'all' ? Number(first.year) * 12 + first.month : Number(year) * 12;
  const end = year === 'all' ? Number(last.year) * 12 + last.month : Number(year) * 12 + 11;
  const data = Array.from({ length: end - start + 1 }, (_, index) => {
    const position = start + index;
    const rowYear = String(Math.floor(position / 12));
    const month = position % 12;
    const row = months.find(item => item.year === rowYear && item.month === month);
    return {
      label: year === 'all' ? `${MONTHS[month].slice(0, 3)} ${rowYear}` : MONTHS[month].slice(0, 3),
      commission: row?.coverage.commission ? row.commission : null,
      cleaning: row?.coverage.cleaning ? row.cleaning : null,
      revenue: row?.coverage.revenue ? row.revenue : null,
      billed: row?.coverage.billed ? row.billed : null,
      nights: row?.coverage.nights ? row.nights : null,
      guests: row?.coverage.guests ? row.guests : null,
    };
  });
  let runningRevenue = 0;
  let runningBilled = 0;
  const cumulative = data.map(row => {
    runningRevenue += row.revenue ?? 0;
    runningBilled += row.billed ?? 0;
    return { label: row.label, revenue: row.revenue === null ? null : runningRevenue, billed: row.billed === null ? null : runningBilled };
  });
  const years = [...new Set(allMonths.map(row => row.year))].sort();
  const comparableYears = years.filter(value => value !== '2025');
  const comparisonYears = year === 'all' ? comparableYears.slice(-5) : [String(Number(year) - 1), year].filter(value => comparableYears.includes(value));
  const showComparison = year !== '2025' && year !== '2026' && comparisonYears.length >= 2;
  const comparison = MONTHS.map((month, index) => ({ label: month.slice(0, 3), ...Object.fromEntries(comparisonYears.map(value => {
    const row = allMonths.find(item => item.year === value && item.month === index);
    return [value, row?.coverage.revenue ? row.revenue : null];
  })) }));
  const payment = [{ name: 'Déclarés payés', value: summary.paid, color: COLORS[1] }, { name: 'Non déclarés payés', value: summary.unpaid, color: COLORS[2] }, { name: 'Non suivis / manuels', value: summary.paymentUnknown, color: '#94a3b8' }].filter(row => row.value > 0);
  const annual = comparableYears.map(value => ({ label: value, ...summarizeMonths(allMonths.filter(row => row.year === value)) }));
  return <div className="grid min-w-0 gap-5 lg:grid-cols-2">
    <Panel title="L’évolution de vos revenus" description="Revenus générés par mois • CA des saisies manuelles inclus" className="lg:col-span-2">
      <ChartContainer config={config} className="h-[320px] w-full aspect-auto">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 12 }} accessibilityLayer>
          <defs><linearGradient id="hkRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.35} /><stop offset="100%" stopColor={COLORS[0]} stopOpacity={0.02} /></linearGradient></defs>
          {grid}<XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} /><YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={65} />{euroTooltip}
          <Area type="monotone" dataKey="revenue" name="Revenus générés" stroke={COLORS[0]} fill="url(#hkRevenue)" strokeWidth={3} activeDot={{ r: 6 }} />
        </AreaChart>
      </ChartContainer>
    </Panel>
    <Panel title="Commissions & ménage" description="Postes renseignés des relevés générés • ne constitue pas une marge nette">
      <ChartContainer config={config} className="h-[280px] w-full aspect-auto"><BarChart data={data} accessibilityLayer>{grid}<XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} /><YAxis tickFormatter={compact} width={60} tickLine={false} axisLine={false} />{euroTooltip}<Legend /><Bar dataKey="commission" name="Commissions" fill={COLORS[0]} stackId="fees" /><Bar dataKey="cleaning" name="Ménage" fill={COLORS[1]} stackId="fees" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer>
    </Panel>
    <Panel title="Nuitées & voyageurs" description="Volumes renseignés dans les relevés • aucun taux d’occupation estimé">
      <ChartContainer config={config} className="h-[280px] w-full aspect-auto"><ComposedChart data={data} accessibilityLayer>{grid}<XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} /><YAxis tickFormatter={compact} width={55} tickLine={false} axisLine={false} />{countTooltip}<Legend /><Bar dataKey="nights" name="Nuitées" fill={COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={32} /><Line dataKey="guests" name="Voyageurs" type="monotone" stroke={COLORS[1]} strokeWidth={3} dot={false} /></ComposedChart></ChartContainer>
    </Panel>
    {showComparison && <Panel title="Comparaison annuelle des revenus" description={year === 'all' ? 'Jusqu’à cinq années disponibles • 2025 exclue • mois absents laissés vides' : `${year} et année précédente • mois absents laissés vides`}>
      <ChartContainer config={config} className="h-[280px] w-full aspect-auto"><LineChart data={comparison} accessibilityLayer>{grid}<XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickFormatter={compact} width={60} tickLine={false} axisLine={false} />{euroTooltip}<Legend />{comparisonYears.map((value, index) => <Line key={value} dataKey={value} name={value} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 3 }} type="monotone" />)}</LineChart></ChartContainer>
    </Panel>}
    <Panel title="Progression cumulée" description="Cumul sur la sélection • revenus générés et montants facturés sont deux indicateurs distincts">
      <ChartContainer config={config} className="h-[280px] w-full aspect-auto"><AreaChart data={cumulative} accessibilityLayer>{grid}<XAxis dataKey="label" minTickGap={24} tickLine={false} axisLine={false} /><YAxis tickFormatter={compact} width={60} tickLine={false} axisLine={false} />{euroTooltip}<Legend /><Area dataKey="revenue" name="Revenus cumulés" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.1} strokeWidth={2} type="monotone" /><Area dataKey="billed" name="Facturation cumulée" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.1} strokeWidth={2} type="monotone" /></AreaChart></ChartContainer>
    </Panel>
    <Panel title="Statut des paiements" description="Statuts enregistrés, pas un rapprochement bancaire • les saisies manuelles sont exclues du suivi">
      <div className="grid items-center gap-3 sm:grid-cols-2">
        <ChartContainer config={config} className="h-[230px] w-full aspect-auto"><PieChart><Pie data={payment} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={4} stroke="none">{payment.map(row => <Cell key={row.name} fill={row.color} />)}</Pie>{countTooltip}</PieChart></ChartContainer>
        <div className="space-y-4">{payment.map(row => <div key={row.name} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />{row.name}</span><strong>{number(row.value)}</strong></div>)}<div className="border-t pt-3 text-xs text-muted-foreground">Montant déclaré payé : <strong className="text-foreground">{money(summary.paidAmount)}</strong><br />Non déclaré payé : <strong className="text-foreground">{money(summary.unpaidAmount)}</strong></div></div>
      </div>
    </Panel>
    {annual.length > 0 && <Panel title="Vue d’ensemble des années" description="2025 exclue de la vue comparative • les années incomplètes ne sont pas extrapolées">
      <ChartContainer config={config} className="h-[280px] w-full aspect-auto"><BarChart data={annual} accessibilityLayer>{grid}<XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis tickFormatter={compact} width={60} tickLine={false} axisLine={false} />{euroTooltip}<Legend /><Bar dataKey="revenue" name="Revenus générés" fill={COLORS[0]} radius={[4, 4, 0, 0]} /><Bar dataKey="billed" name="Montant facturé" fill={COLORS[1]} radius={[4, 4, 0, 0]} /></BarChart></ChartContainer>
    </Panel>}
  </div>;
}
