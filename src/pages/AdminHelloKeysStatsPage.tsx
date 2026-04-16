import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBillingStats, BillingStats } from '@/lib/admin-api';
import { toast } from 'sonner';
import { DollarSign, Loader2, ReceiptText, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const chartConfig = {
  totalCommission: {
    label: 'Commission Hello Keys',
    color: 'hsl(var(--chart-2))',
  },
  totalCleaningFees: {
    label: 'Frais de ménage',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });

const getYearFromPeriod = (period: string) => period.trim().split(' ').at(-1) ?? '';

type YearlySummary = {
  year: string;
  totalRevenue: number;
  totalCommission: number;
  totalCleaningFees: number;
  totalInvoices: number;
  months: number;
};

const AdminHelloKeysStatsPage: React.FC = () => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getBillingStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
        toast.error('Erreur lors de la récupération des statistiques de facturation.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const yearlyData = useMemo<YearlySummary[]>(() => {
    if (!stats) {
      return [];
    }

    const yearlyMap = new Map<string, YearlySummary>();

    stats.monthlyData.forEach((item) => {
      const year = getYearFromPeriod(item.period);

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, {
          year,
          totalRevenue: 0,
          totalCommission: 0,
          totalCleaningFees: 0,
          totalInvoices: 0,
          months: 0,
        });
      }

      const currentYear = yearlyMap.get(year)!;
      currentYear.totalRevenue += item.totalRevenue;
      currentYear.totalCommission += item.totalCommission;
      currentYear.totalCleaningFees += item.totalCleaningFees;
      currentYear.totalInvoices += item.invoiceCount;
      currentYear.months += 1;
    });

    return Array.from(yearlyMap.values()).sort((a, b) => Number(b.year) - Number(a.year));
  }, [stats]);

  useEffect(() => {
    if (yearlyData.length > 0 && selectedYear === 'all') {
      setSelectedYear(yearlyData[0].year);
    }
  }, [yearlyData, selectedYear]);

  const displayedMonthlyData = useMemo(() => {
    if (!stats) {
      return [];
    }

    if (selectedYear === 'all') {
      return stats.monthlyData;
    }

    return stats.monthlyData.filter((item) => getYearFromPeriod(item.period) === selectedYear);
  }, [selectedYear, stats]);

  const displayedSummary = useMemo(() => {
    if (!stats) {
      return null;
    }

    if (selectedYear === 'all') {
      return {
        totalRevenue: stats.totalRevenue,
        totalCommission: stats.totalCommission,
        totalCleaningFees: stats.totalCleaningFees,
        totalInvoices: stats.monthlyData.reduce((sum, item) => sum + item.invoiceCount, 0),
      };
    }

    const selectedYearSummary = yearlyData.find((item) => item.year === selectedYear);

    if (!selectedYearSummary) {
      return {
        totalRevenue: 0,
        totalCommission: 0,
        totalCleaningFees: 0,
        totalInvoices: 0,
      };
    }

    return selectedYearSummary;
  }, [selectedYear, stats, yearlyData]);

  const totalCommissionMenage =
    (displayedSummary?.totalCommission ?? 0) + (displayedSummary?.totalCleaningFees ?? 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Chargement des statistiques...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-4 text-center text-red-500">
          <p>Erreur : {error}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!stats || !displayedSummary) {
    return (
      <AdminLayout>
        <div className="p-4 text-center">
          <p>Aucune statistique disponible.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Statistiques de Facturation Hello Keys</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Consultez les résultats par année ou l&apos;historique complet.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <p className="text-sm font-medium">Vue annuelle</p>
              <Select onValueChange={setSelectedYear} value={selectedYear}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {yearlyData.map((item) => (
                    <SelectItem key={item.year} value={item.year}>
                      {item.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={() => setSelectedYear('all')}>
              Afficher tout l&apos;historique
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commission Hello Keys</CardTitle>
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(displayedSummary.totalCommission)}</div>
              <p className="text-xs text-muted-foreground">
                {selectedYear === 'all' ? 'Total cumulé sur toutes les années' : `Total des commissions en ${selectedYear}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Frais de ménage</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(displayedSummary.totalCleaningFees)}</div>
              <p className="text-xs text-muted-foreground">
                {selectedYear === 'all' ? 'Total cumulé sur toutes les années' : `Total des frais de ménage en ${selectedYear}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nombre de relevés</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayedSummary.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {selectedYear === 'all' ? 'Relevés générés sur tout l’historique' : `Relevés générés en ${selectedYear}`}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Tendances mensuelles {selectedYear === 'all' ? '— toutes les années' : `— ${selectedYear}`}
            </CardTitle>
            <CardDescription>
              Commission et frais de ménage mois par mois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayedMonthlyData.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Aucune donnée disponible pour cette année.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    accessibilityLayer
                    data={displayedMonthlyData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) =>
                        value.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />
                      }
                    />
                    <Legend />
                    <Line
                      dataKey="totalCommission"
                      name="Commission Hello Keys"
                      type="monotone"
                      stroke="var(--color-totalCommission)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      dataKey="totalCleaningFees"
                      name="Frais de ménage"
                      type="monotone"
                      stroke="var(--color-totalCleaningFees)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif année par année</CardTitle>
            <CardDescription>
              Cliquez sur une année pour filtrer rapidement les statistiques.
            </CardDescription>
            <p className="text-sm font-medium text-foreground">
              Total commission + ménage {selectedYear === 'all' ? 'sur tout l’historique' : `en ${selectedYear}`} : {formatCurrency(totalCommissionMenage)}
            </p>
          </CardHeader>
          <CardContent>
            {yearlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune année disponible.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {yearlyData.map((item) => {
                  const isActive = selectedYear === item.year;

                  return (
                    <button
                      key={item.year}
                      type="button"
                      onClick={() => setSelectedYear(item.year)}
                      className={`rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50 ${
                        isActive ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-lg font-semibold">{item.year}</span>
                        <span className="text-xs text-muted-foreground">{item.months} mois</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Commission</span>
                          <span className="font-medium">{formatCurrency(item.totalCommission)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Ménage</span>
                          <span className="font-medium">{formatCurrency(item.totalCleaningFees)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Total com. + ménage</span>
                          <span className="font-semibold">{formatCurrency(item.totalCommission + item.totalCleaningFees)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Revenu</span>
                          <span className="font-medium">{formatCurrency(item.totalRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Relevés</span>
                          <span className="font-medium">{item.totalInvoices}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHelloKeysStatsPage;