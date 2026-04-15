import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { triggerBlobDownload } from '@/lib/download-utils';
import { getMyStatements } from '@/lib/statements-api';
import { getExpenses, getRecurringExpenses, generateRecurringInstances } from '@/lib/expenses-api';
import BilanPdfButton from '@/components/BilanPdfButton';
import { SavedInvoice } from '@/lib/admin-api';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { eachMonthOfInterval, endOfMonth, format, isValid, parse, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const BILAN_YEAR = 2025;

type BilanMonthlyRow = {
  name: string;
  ca: number;
  montantVerse: number;
  frais: number;
  benef: number;
  depenses: number;
  nuits: number;
  reservations: number;
  prixParNuit: number;
};

type BilanGenerationData = {
  totals: {
    ca: number;
    montantVerse: number;
    frais: number;
    depenses: number;
    resultatNet: number;
  };
  monthly: BilanMonthlyRow[];
};

const BalancesTab: React.FC = () => {
  const { session, profile } = useSession();
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [isBilanAvailable, setIsBilanAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingGenerationData, setIsLoadingGenerationData] = useState(true);
  const [generationData, setGenerationData] = useState<BilanGenerationData | null>(null);

  useEffect(() => {
    const checkBilanAvailability = async () => {
      if (!session?.user.id) {
        setCheckingAvailability(false);
        setIsBilanAvailable(false);
        return;
      }

      setCheckingAvailability(true);

      const { data, error } = await supabase.storage
        .from('statements')
        .list(`bilans/${session.user.id}`, {
          limit: 100,
          search: `bilan-${BILAN_YEAR}.pdf`,
        });

      if (error) {
        setIsBilanAvailable(false);
      } else {
        setIsBilanAvailable((data ?? []).some((file) => file.name === `bilan-${BILAN_YEAR}.pdf`));
      }

      setCheckingAvailability(false);
    };

    checkBilanAvailability();
  }, [session?.user.id]);

  useEffect(() => {
    const loadGenerationData = async () => {
      setIsLoadingGenerationData(true);

      try {
        const statements = await getMyStatements();
        const monthly = buildMonthlyForPdf(
          statements,
          BILAN_YEAR,
          profile?.expenses_module_enabled ? await getAllExpensesForYear(BILAN_YEAR) : [],
        );

        const totals = monthly.reduce(
          (acc, month) => ({
            ca: acc.ca + month.ca,
            montantVerse: acc.montantVerse + month.montantVerse,
            frais: acc.frais + month.frais,
            depenses: acc.depenses + month.depenses,
            resultatNet: acc.resultatNet + month.benef,
          }),
          { ca: 0, montantVerse: 0, frais: 0, depenses: 0, resultatNet: 0 },
        );

        setGenerationData({ totals, monthly });
      } catch (error: any) {
        toast.error(error?.message || 'Impossible de préparer le bilan 2025.');
        setGenerationData(null);
      } finally {
        setIsLoadingGenerationData(false);
      }
    };

    loadGenerationData();
  }, [profile?.expenses_module_enabled]);

  const hasStatementData = useMemo(() => {
    if (!generationData) return false;

    return generationData.monthly.some(
      (month) =>
        month.ca > 0 ||
        month.montantVerse > 0 ||
        month.frais > 0 ||
        month.depenses > 0 ||
        month.reservations > 0 ||
        month.nuits > 0,
    );
  }, [generationData]);

  const handleDownloadBilan = async () => {
    if (!session?.user.id) return;

    setIsDownloading(true);

    const filePath = `bilans/${session.user.id}/bilan-${BILAN_YEAR}.pdf`;
    const { data, error } = await supabase.storage.from('statements').download(filePath);

    if (error || !data) {
      toast.error(`Le bilan ${BILAN_YEAR} n'est pas encore disponible au téléchargement.`);
      setIsDownloading(false);
      return;
    }

    triggerBlobDownload(data, `Bilan_${BILAN_YEAR}.pdf`);
    toast.success(`Le bilan ${BILAN_YEAR} a été téléchargé.`);
    setIsDownloading(false);
  };

  if (checkingAvailability || isLoadingGenerationData) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bilans disponibles
          </CardTitle>
          <CardDescription>
            Retrouvez ici vos bilans annuels au format PDF, en téléchargement ou en génération immédiate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasStatementData ? (
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <div>
                <p className="font-semibold">Bilan {BILAN_YEAR}</p>
                <p className="text-sm text-muted-foreground">
                  Téléchargez le bilan déposé par Hello Keys ou générez instantanément votre propre PDF.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button onClick={handleDownloadBilan} disabled={isDownloading || !isBilanAvailable} className="sm:w-auto w-full">
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </>
                  )}
                </Button>
                {generationData && (
                  <BilanPdfButton
                    year={BILAN_YEAR}
                    totals={generationData.totals}
                    monthly={generationData.monthly}
                    className="sm:w-auto w-full"
                  />
                )}
              </div>
              {!isBilanAvailable && (
                <p className="text-sm text-muted-foreground">
                  Le PDF déposé par Hello Keys n'est pas encore disponible, mais vous pouvez générer votre bilan ci-dessus.
                </p>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTitle>Bilan {BILAN_YEAR} indisponible</AlertTitle>
              <AlertDescription>
                Nous n'avons pas trouvé de données suffisantes pour générer votre bilan {BILAN_YEAR} pour le moment.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

async function getAllExpensesForYear(year: number) {
  const [expenses, recurringExpenses] = await Promise.all([
    getExpenses(year),
    getRecurringExpenses(),
  ]);

  return [...expenses, ...generateRecurringInstances(recurringExpenses, year)];
}

function buildMonthlyForPdf(statements: SavedInvoice[], year: number, expenses: Array<{ amount: number; expense_date: string }>): BilanMonthlyRow[] {
  const statementsForYear = statements.filter((statement) => statement.period.includes(year.toString()));

  const monthsOfYear = eachMonthOfInterval({
    start: startOfMonth(new Date(year, 0, 1)),
    end: endOfMonth(new Date(year, 11, 1)),
  });

  const monthly = monthsOfYear.map((month) => ({
    name: format(month, 'MMM', { locale: fr }),
    ca: 0,
    montantVerse: 0,
    frais: 0,
    benef: 0,
    depenses: 0,
    nuits: 0,
    reservations: 0,
    prixParNuit: 0,
  }));

  const monthMapFallback: Record<string, number> = {
    janvier: 0,
    février: 1,
    fevrier: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    août: 7,
    aout: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    décembre: 11,
    decembre: 11,
  };

  statementsForYear.forEach((statement) => {
    const invoiceData = Array.isArray(statement.invoice_data) ? statement.invoice_data : [];
    const statementCA = statement.totals?.totalCA ?? invoiceData.reduce(
      (sum: number, item: any) => sum + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0),
      0,
    );
    const montantVerse = statement.totals?.totalMontantVerse || 0;
    const frais = statement.totals?.totalFacture || 0;
    const nuits = statement.totals?.totalNuits || 0;
    const reservations = typeof statement.totals?.totalReservations === 'number'
      ? statement.totals.totalReservations
      : invoiceData.length;

    let monthIndex: number | undefined;
    let parsed = parse(statement.period, 'MMMM yyyy', new Date(), { locale: fr });

    if (!isValid(parsed)) {
      parsed = parse(statement.period, 'MMM yyyy', new Date(), { locale: fr });
    }

    if (isValid(parsed)) {
      monthIndex = parsed.getMonth();
    } else {
      const monthName = statement.period.toLowerCase().split(' ')[0].replace('.', '');
      monthIndex = monthMapFallback[monthName];
    }

    if (monthIndex === undefined) return;

    monthly[monthIndex].ca += statementCA;
    monthly[monthIndex].montantVerse += montantVerse;
    monthly[monthIndex].frais += frais;
    monthly[monthIndex].benef += montantVerse - frais;
    monthly[monthIndex].nuits += nuits;
    monthly[monthIndex].reservations += reservations;
  });

  expenses.forEach((expense) => {
    const expenseDate = parseISO(expense.expense_date);
    if (!isValid(expenseDate) || expenseDate.getFullYear() !== year) return;

    const monthIndex = expenseDate.getMonth();
    monthly[monthIndex].depenses += expense.amount || 0;
  });

  monthly.forEach((month) => {
    month.benef -= month.depenses;
    month.prixParNuit = month.nuits > 0 ? month.benef / month.nuits : 0;
  });

  return monthly;
}

export default BalancesTab;
