import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { getProfile, UserProfile } from '@/lib/profile-api';
import { downloadEstimationPdf, getEstimationReference } from '@/lib/estimation-pdf';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Building2, CalendarDays, Download, FileText, Info, Landmark, Loader2, MapPin, TrendingUp, User, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const EstimationPage: React.FC = () => {
  const { profile: sessionProfile, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(sessionProfile);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (error: any) {
      toast.error(`Erreur de chargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionProfile) {
      setProfile(sessionProfile);
      setLoading(false);
    } else if (!sessionLoading) {
      fetchProfileData();
    }
  }, [sessionProfile, sessionLoading, fetchProfileData]);

  const handleDownload = async () => {
    if (!profile) return;
    setIsDownloading(true);
    try {
      await downloadEstimationPdf(profile);
      toast.success('Votre estimation PDF a été téléchargée !');
    } catch (error: any) {
      toast.error(`Erreur lors de la génération du PDF : ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-3xl space-y-6">
          <Skeleton className="h-10 w-1/2 mx-auto" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const gross = profile.estimated_revenue ?? 0;
  const monthly = gross / 12;
  const commissionRate = profile.commission_rate ?? null;
  const commissionAmount = commissionRate !== null ? gross * (commissionRate / 100) : null;
  const net = commissionAmount !== null ? gross - commissionAmount : null;
  const reference = getEstimationReference(profile);
  const today = new Date().toLocaleDateString('fr-FR');
  const backLink = profile.onboarding_status === 'live' ? '/' : '/onboarding-status';

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  const propertyLocation = [profile.property_zip_code, profile.property_city].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        {/* Barre d'actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to={backLink}>
            <Button variant="ghost" className="text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </Link>
          <Button onClick={handleDownload} disabled={isDownloading} className="text-sm">
            {isDownloading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
            Télécharger le PDF
          </Button>
        </div>

        {/* Document d'estimation */}
        <Card className="shadow-xl overflow-hidden border-0">
          {/* En-tête façon document */}
          <div className="bg-[#1e3a5f] text-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="bg-white rounded-lg p-2">
                <img src="/logo.png" alt="Hello Keys" className="h-10" />
              </div>
              <div className="text-right">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">ESTIMATION DE REVENUS LOCATIFS</h1>
                <p className="text-sm text-blue-100 mt-1">Location saisonnière — gestion par conciergerie Hello Keys</p>
                <p className="text-xs text-blue-200 mt-2 flex items-center justify-end gap-3">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Réf. {reference}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {today}</span>
                </p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 md:p-8 space-y-8">
            {/* Propriétaire / Bien */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#1e3a5f] dark:text-blue-300 flex items-center gap-1.5 mb-2">
                  <User className="h-3.5 w-3.5" /> Propriétaire
                </h3>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{fullName || '—'}</p>
                {profile.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
                {profile.phone_number && <p className="text-sm text-muted-foreground">{profile.phone_number}</p>}
              </div>
              <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#1e3a5f] dark:text-blue-300 flex items-center gap-1.5 mb-2">
                  <Building2 className="h-3.5 w-3.5" /> Bien concerné
                </h3>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.property_address || '—'}</p>
                {propertyLocation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {propertyLocation}
                  </p>
                )}
              </div>
            </div>

            {/* Chiffre clé */}
            <div className="rounded-xl bg-[#1e3a5f] text-white p-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-blue-200 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Revenu locatif brut annuel estimé
                </p>
                <p className="text-4xl font-extrabold mt-1">{formatEUR(gross)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-200">Moyenne mensuelle</p>
                <p className="text-2xl font-bold">{formatEUR(monthly)}</p>
              </div>
            </div>

            {/* Détail */}
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#1e3a5f] dark:text-blue-300" /> Détail de l'estimation
              </h3>
              <div className="rounded-lg border divide-y dark:divide-gray-700">
                <div className="flex justify-between items-center p-3.5 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Revenus locatifs bruts annuels estimés</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatEUR(gross)}</span>
                </div>
                <div className="flex justify-between items-center p-3.5 text-sm bg-gray-50 dark:bg-gray-800">
                  <span className="text-gray-700 dark:text-gray-300">Moyenne mensuelle estimée</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{formatEUR(monthly)}</span>
                </div>
                {commissionRate !== null && commissionAmount !== null && net !== null && (
                  <>
                    <div className="flex justify-between items-center p-3.5 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Frais de gestion Hello Keys ({commissionRate}%)</span>
                      <span className="font-bold text-red-600">- {formatEUR(commissionAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3.5 text-sm bg-blue-50 dark:bg-blue-950">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Revenu net propriétaire estimé <span className="font-normal text-muted-foreground">(avant charges et impôts)</span>
                      </span>
                      <span className="font-extrabold text-[#1e3a5f] dark:text-blue-300 text-base">{formatEUR(net)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Détails et remarques */}
            {profile.estimation_details && (
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1e3a5f] dark:text-blue-300" /> Détails et remarques
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {profile.estimation_details}
                </p>
              </div>
            )}

            {/* Méthodologie */}
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-[#1e3a5f] dark:text-blue-300" /> Méthodologie
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Cette estimation est établie par Hello Keys sur la base des caractéristiques du bien, des données de
                marché de la location saisonnière dans le secteur concerné (taux d'occupation, prix moyens par nuitée,
                saisonnalité) et de l'historique de performance des biens comparables gérés par notre conciergerie.
              </p>
            </div>

            {/* Avertissement */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1.5">Avertissement</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Document d'information établi à titre indicatif à la demande du propriétaire, notamment en vue de la
                constitution d'un dossier de financement bancaire. Les montants indiqués sont des estimations
                prévisionnelles et ne constituent ni une garantie de revenus, ni un engagement contractuel de la part
                de Hello Keys. Les revenus réels peuvent varier selon la saisonnalité, l'état du marché et la
                disponibilité du bien.
              </p>
            </div>

            <Separator />

            {/* Bloc banque + CTA */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <Landmark className="h-8 w-8 text-[#1e3a5f] dark:text-blue-300 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Un dossier pour votre banque ?</p>
                  <p className="text-sm text-muted-foreground">
                    Téléchargez cette estimation au format PDF, prête à joindre à votre dossier de financement.
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                Télécharger le PDF
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              Hello Keys — Conciergerie de location saisonnière — 14 rue Carnot, 80550 Le Crotoy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EstimationPage;
