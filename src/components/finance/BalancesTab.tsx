import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { triggerBlobDownload } from '@/lib/download-utils';
import { getMyStatements } from '@/lib/statements-api';
import { getUserRooms } from '@/lib/user-room-api';
import BilanPdfButton from '@/components/BilanPdfButton';
import type { SavedInvoice } from '@/lib/admin-api';
import type { AdminBilan2025PreviewData } from '@/components/admin/AdminBilan2025PreviewDialog';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { eachMonthOfInterval, endOfMonth, format, getDaysInMonth, isValid, parse, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const BILAN_YEAR = 2025;

const BalancesTab: React.FC = () => {
  const { session, profile } = useSession();
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [isBilanAvailable, setIsBilanAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingGenerationData, setIsLoadingGenerationData] = useState(true);
  const [generationPayload, setGenerationPayload] = useState<AdminBilan2025PreviewData | null>(null);

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
        const [statements, userRooms] = await Promise.all([
          getMyStatements(),
          getUserRooms(),
        ]);

        const clientName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Client';
        setGenerationPayload(buildBilanPayload(statements, BILAN_YEAR, clientName, userRooms.length));
      } catch (error: any) {
        toast.error(error?.message || 'Impossible de préparer le bilan 2025.');
        setGenerationPayload(null);
      } finally {
        setIsLoadingGenerationData(false);
      }
    };

    loadGenerationData();
  }, [profile?.first_name, profile?.last_name]);

  const hasStatementData = useMemo(() => {
    if (!generationPayload) return false;

    return (
      generationPayload.yearlyTotals.totalCA > 0 ||
      generationPayload.yearlyTotals.totalReservations > 0 ||
      generationPayload.yearlyTotals.totalNuits > 0
    );
  }, [generationPayload]);

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
            Retrouvez ici vos bilans annuels au format PDF, avec un rendu identique à celui préparé côté admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasStatementData && generationPayload ? (
            <div className="flex flex-col gap-4 rounded-lg border p-4">
              <div>
                <p className="font-semibold">Bilan {BILAN_YEAR}</p>
                <p className="text-sm text-muted-foreground">
                  Téléchargez le bilan déposé par Hello Keys ou générez la même version de PDF avec une mise en page propre.
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
                <BilanPdfButton payload={generationPayload} className="sm:w-auto w-full" />
              </div>
              {!isBilanAvailable && (
                <p className="text-sm text-muted-foreground">
                  Le PDF déposé par Hello Keys n'est pas encore disponible, mais vous pouvez générer le même format ici.
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

function buildBilanPayload(
  statements: SavedInvoice[],
  year: number,
  clientName: string,
  roomsCount: number,
): AdminBilan2025PreviewData {
  const statementsForYear = statements.filter((statement) => statement.period.includes(year.toString()));

  const monthsOfYear = eachMonthOfInterval({
    start: startOfMonth(new Date(year, 0, 1)),
    end: endOfMonth(new Date(year, 11, 1)),
  });

  const monthly = monthsOfYear.map((month) => ({
    month: format(month, 'MMM', { locale: fr }),
    totalCA: 0,
    totalNuits: 0,
    occupation: 0,
  }));

  let totalCA = 0;
  let totalMontantVerse = 0;
  let totalFacture = 0;
  let totalNuits = 0;
  let totalReservations = 0;
  let totalVoyageurs = 0;

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
    const totals = statement.totals || {};
    const statementCA = typeof totals.totalCA === 'number'
      ? totals.totalCA
      : (typeof totals.totalRevenuGenere === 'number'
        ? totals.totalRevenuGenere
        : invoiceData.reduce(
            (sum: number, item: any) => sum + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0),
            0,
          ));

    totalCA += statementCA;
    totalMontantVerse += typeof totals.totalMontantVerse === 'number' ? totals.totalMontantVerse : 0;
    totalFacture += typeof totals.totalFacture === 'number' ? totals.totalFacture : 0;
    totalNuits += typeof totals.totalNuits === 'number' ? totals.totalNuits : 0;
    totalReservations += typeof totals.totalReservations === 'number' ? totals.totalReservations : invoiceData.length;
    totalVoyageurs += typeof totals.totalVoyageurs === 'number' ? totals.totalVoyageurs : 0;

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

    monthly[monthIndex].totalCA += statementCA;
    monthly[monthIndex].totalNuits += typeof totals.totalNuits === 'number' ? totals.totalNuits : 0;
  });

  monthly.forEach((month, index) => {
    const monthDate = monthsOfYear[index];
    const availableNightsInMonth = roomsCount > 0 ? roomsCount * getDaysInMonth(monthDate) : 0;
    month.occupation = availableNightsInMonth > 0 ? (month.totalNuits / availableNightsInMonth) * 100 : 0;
  });

  const daysInYear = year % 4 === 0 ? 366 : 365;
  const totalAvailableNights = roomsCount > 0 ? roomsCount * daysInYear : 0;
  const adr = totalNuits > 0 ? totalCA / totalNuits : 0;
  const revpar = totalAvailableNights > 0 ? totalCA / totalAvailableNights : 0;
  const yearlyOccupation = totalAvailableNights > 0 ? (totalNuits / totalAvailableNights) * 100 : 0;

  return {
    clientName,
    year,
    yearlyTotals: {
      totalCA,
      totalMontantVerse,
      totalFacture,
      net: totalMontantVerse - totalFacture,
      adr,
      revpar,
      yearlyOccupation,
      totalNuits,
      totalReservations,
      totalVoyageurs,
    },
    monthly: monthly.map(({ month, totalCA: monthlyCA, occupation }) => ({
      month,
      totalCA: monthlyCA,
      occupation,
    })),
  };
}

export default BalancesTab;
