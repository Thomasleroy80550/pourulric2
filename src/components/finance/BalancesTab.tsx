import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { triggerBlobDownload } from '@/lib/download-utils';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BILAN_YEAR = 2025;

const BalancesTab: React.FC = () => {
  const { session } = useSession();
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [isBilanAvailable, setIsBilanAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
        setIsBilanAvailable(
          (data ?? []).some((file) => file.name === `bilan-${BILAN_YEAR}.pdf`),
        );
      }

      setCheckingAvailability(false);
    };

    checkBilanAvailability();
  }, [session?.user.id]);

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

  if (checkingAvailability) {
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
            Retrouvez ici vos bilans annuels mis à disposition au format PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBilanAvailable ? (
            <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Bilan {BILAN_YEAR}</p>
                <p className="text-sm text-muted-foreground">
                  Téléchargez votre bilan annuel au format PDF.
                </p>
              </div>
              <Button onClick={handleDownloadBilan} disabled={isDownloading} className="sm:w-auto w-full">
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
            </div>
          ) : (
            <Alert>
              <AlertTitle>Bilan {BILAN_YEAR} indisponible</AlertTitle>
              <AlertDescription>
                Votre bilan {BILAN_YEAR} n'a pas encore été déposé dans votre espace client.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BalancesTab;
