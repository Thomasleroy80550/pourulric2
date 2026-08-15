import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/SessionContextProvider";
import BannedUserMessage from "@/components/BannedUserMessage";
import SuspendedAccountMessage from "@/components/SuspendedAccountMessage";
import LmnpPaywall from "@/components/lmnp/LmnpPaywall";
import LmnpAssetsTab from "@/components/lmnp/LmnpAssetsTab";
import LmnpSettingsTab from "@/components/lmnp/LmnpSettingsTab";
import LmnpLiasseTab from "@/components/lmnp/LmnpLiasseTab";
import { getLmnpSettings, getLmnpFixedAssets } from "@/lib/lmnp-api";
import { getMyStatements } from "@/lib/statements-api";
import { getExpenses, getRecurringExpenses, generateRecurringInstances } from "@/lib/expenses-api";
import { computeLmnpYear } from "@/lib/lmnp-engine";
import { buildSampleLmnpData } from "@/lib/lmnp-sample";
import { exportLiassePdf } from "@/lib/lmnp-pdf";
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

const LmnpPage: React.FC = () => {
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  // Par défaut, l'exercice à déclarer est l'année précédente
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);

  const enabled = !!profile?.lmnp_module_enabled;

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["lmnpSettings"],
    queryFn: getLmnpSettings,
    enabled,
  });

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ["lmnpAssets"],
    queryFn: getLmnpFixedAssets,
    enabled,
  });

  const { data: statements = [], isLoading: loadingStatements } = useQuery({
    queryKey: ["lmnpStatements"],
    queryFn: getMyStatements,
    enabled,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["lmnpExpenses", selectedYear],
    queryFn: async () => {
      const [single, recurring] = await Promise.all([
        getExpenses(selectedYear),
        getRecurringExpenses(),
      ]);
      return [...single, ...generateRecurringInstances(recurring, selectedYear)];
    },
    enabled,
  });

  const loading = loadingSettings || loadingAssets || loadingStatements || loadingExpenses;

  const computation = useMemo(
    () => computeLmnpYear(selectedYear, statements, expenses, assets, settings ?? null),
    [selectedYear, statements, expenses, assets, settings],
  );

  const yearOptions = useMemo(
    () => Array.from({ length: 4 }, (_, i) => currentYear - i),
    [currentYear],
  );

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["lmnpSettings"] });
    queryClient.invalidateQueries({ queryKey: ["lmnpAssets"] });
  };

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  if (profile?.is_payment_suspended) {
    return (
      <MainLayout>
        <SuspendedAccountMessage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-3 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Compta LMNP</h1>
            <Badge variant="secondary">Régime réel simplifié</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profile?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const year = new Date().getFullYear() - 1;
                  const { computation, settings: sampleSettings } = buildSampleLmnpData(year);
                  exportLiassePdf(computation, sampleSettings, { specimen: true });
                  toast.success("Bilan de test généré ! Envoyez-le à votre expert-comptable.");
                }}
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                Bilan de test (PDF)
              </Button>
            )}
            {enabled && (
              <>
                <span className="text-sm font-medium text-muted-foreground">Exercice</span>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                  <SelectTrigger className="h-9 w-[130px] rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        {!profile ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !enabled ? (
          <LmnpPaywall />
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="liasse" className="w-full">
            <TabsList className="w-full flex overflow-x-auto gap-2 whitespace-nowrap md:grid md:grid-cols-3 max-w-full mx-auto">
              <TabsTrigger value="liasse" className="flex-shrink-0 min-w-[140px] md:min-w-0">Liasse fiscale</TabsTrigger>
              <TabsTrigger value="assets" className="flex-shrink-0 min-w-[160px] md:min-w-0">Immobilisations</TabsTrigger>
              <TabsTrigger value="settings" className="flex-shrink-0 min-w-[140px] md:min-w-0">Paramètres</TabsTrigger>
            </TabsList>
            <TabsContent value="liasse">
              <LmnpLiasseTab computation={computation} settings={settings ?? null} />
            </TabsContent>
            <TabsContent value="assets">
              <LmnpAssetsTab
                assets={assets}
                amortizationRows={computation.amortizationRows}
                year={selectedYear}
                onChanged={refreshData}
              />
            </TabsContent>
            <TabsContent value="settings">
              <LmnpSettingsTab settings={settings ?? null} onSaved={refreshData} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
};

export default LmnpPage;
