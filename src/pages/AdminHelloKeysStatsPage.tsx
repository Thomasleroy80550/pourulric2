import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getBillingStats, BillingStats } from '@/lib/admin-api';
import { toast } from 'sonner';
import { Loader2, DollarSign, ReceiptText, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  totalRevenue: {
    label: "Revenu Total",
    color: "hsl(var(--chart-1))",
  },
  totalCommission: {
    label: "Commission Hello Keys",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const AdminHelloKeysStatsPage: React.FC = () => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getBillingStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
        toast.error("Erreur lors de la récupération des statistiques de facturation.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Chargement des statistiques...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-red-500 text-center p-4">
          <p>Erreur: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center p-4">
          <p>Aucune statistique disponible.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Statistiques de Facturation Hello Keys</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenu Total Généré
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Cumul de tous les relevés
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Commission Hello Keys
              </CardTitle>
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCommission.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total des commissions perçues
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Nombre de Relevés
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                Relevés générés à ce jour
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tendances Mensuelles</CardTitle>
            <CardDescription>
              Revenu total et commission par mois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <LineChart
                accessibilityLayer
                data={stats.monthlyData}
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
                  tickFormatter={(value) => value.slice(0, 3)} // Show first 3 chars of month
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent formatter={(value: number) => `${value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`} />}
                />
                <Legend />
                <Line
                  dataKey="totalRevenue"
                  type="monotone"
                  stroke="var(--color-totalRevenue)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="totalCommission"
                  type="monotone"
                  stroke="var(--color-totalCommission)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHelloKeysStatsPage;