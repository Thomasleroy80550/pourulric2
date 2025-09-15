import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getBillingStats, BillingStats, getAllInvoicePeriods } from '@/lib/admin-api';
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const chartConfig = {
  totalCommission: {
    label: "Commission Hello Keys",
    color: "hsl(var(--chart-2))",
  },
  totalCleaningFees: {
    label: "Frais de Ménage",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const AdminHelloKeysStatsPage: React.FC = () => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const periods = await getAllInvoicePeriods();
        setAvailablePeriods(periods);
        if (periods.length > 0) {
          setSelectedPeriod(periods[periods.length - 1]);
        }
      } catch (err: any) {
        toast.error("Erreur lors de la récupération des périodes disponibles.");
      }
    };
    fetchPeriods();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBillingStats(selectedPeriod);
        setStats(data);
      } catch (err: any) {
        setError(err.message);
        toast.error("Erreur lors de la récupération des statistiques de facturation.");
      } finally {
        setLoading(false);
      }
    };
    if (selectedPeriod !== undefined) {
      fetchStats();
    }
  }, [selectedPeriod]);

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

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select onValueChange={setSelectedPeriod} value={selectedPeriod}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map((period) => (
                <SelectItem key={period} value={period}>
                  {period}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSelectedPeriod(undefined)}>
            Afficher toutes les périodes
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
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
                Frais de Ménage
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCleaningFees.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total des frais de ménage facturés
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
              Commission et frais de ménage par mois.
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
                  tickFormatter={(value) => value}
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
                  dataKey="totalCommission"
                  type="monotone"
                  stroke="var(--color-totalCommission)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="totalCleaningFees"
                  type="monotone"
                  stroke="var(--color-totalCleaningFees)"
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