import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { getProfile, UserProfile } from '@/lib/profile-api';
import { downloadEstimationPdf } from '@/lib/estimation-pdf';
import { computeEstimation, formatEUR } from '@/lib/estimation-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowUpRight, Building2, CalendarDays, Download, FileText, Info,
  Landmark, Loader2, MapPin, Percent, PiggyBank, Sparkles, TrendingUp, User, Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
      toast.success('Votre rapport PDF a été téléchargé !');
    } catch (error: any) {
      toast.error(`Erreur lors de la génération du PDF : ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-4xl space-y-6">
          <Skeleton className="h-10 w-1/2 mx-auto" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const est = computeEstimation(profile);
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const backLink = profile.onboarding_status === 'live' ? '/' : '/onboarding-status';
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  const propertyLocation = [profile.property_zip_code, profile.property_city].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900">
      {/* ===== Hero ===== */}
      <div className="bg-[#0f2847] text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-16">
          <div className="flex items-center justify-between gap-3 mb-10">
            <Link to={backLink}>
              <Button variant="ghost" className="text-blue-100 hover:text-white hover:bg-white/10 text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </Link>
            <div className="bg-white rounded-lg px-3 py-1.5">
              <img src="/logo.png" alt="Hello Keys" className="h-7" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/20">
              <FileText className="h-3 w-3 mr-1" /> Réf. {est.reference}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/20">
              <CalendarDays className="h-3 w-3 mr-1" /> {today}
            </Badge>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Rapport d'estimation de revenus locatifs
          </h1>
          <p className="text-blue-200 mt-2 text-sm md:text-base">
            Location saisonnière meublée — établi par Hello Keys pour {fullName || 'vous'}
          </p>

          <div className="mt-8 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-sm text-blue-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Revenu brut annuel estimé
              </p>
              <p className="text-5xl md:text-6xl font-extrabold mt-1 tracking-tight">{formatEUR(est.gross)}</p>
              <p className="text-blue-300 text-sm mt-2">
                Fourchette : {formatEUR(est.low)} — {formatEUR(est.high)} <span className="opacity-70">(±10%)</span>
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-white text-[#0f2847] hover:bg-blue-50 font-bold shadow-lg"
            >
              {isDownloading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />}
              Télécharger le rapport PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Contenu ===== */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-8 pb-16 space-y-6">
        {/* Cartes indicateurs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <Wallet className="h-4 w-4 text-blue-600" /> Moyenne mensuelle brute
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">{formatEUR(est.grossMonthly)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
                <Percent className="h-4 w-4 text-blue-600" /> Frais de gestion
              </div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                {est.commissionRate} % <span className="text-sm font-semibold text-muted-foreground">TTC</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">soit {formatEUR(est.commissionAmount)} / an</p>
            </CardContent>
          </Card>
          <Card className="shadow-md border-0 bg-blue-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-blue-100 text-xs font-medium uppercase tracking-wide">
                <PiggyBank className="h-4 w-4" /> Net propriétaire estimé
              </div>
              <p className="text-2xl font-extrabold mt-2">{formatEUR(est.net)}</p>
              <p className="text-xs text-blue-100 mt-1">soit {formatEUR(est.netMonthly)} / mois en moyenne</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphique saisonnalité */}
        <Card className="shadow-md border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" /> Répartition saisonnière prévisionnelle
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Répartition indicative de vos revenus bruts sur l'année, selon la saisonnalité du marché local.
              L'activité est fermée en janvier (fermeture annuelle).
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={est.monthlyBreakdown} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="short" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k€`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatEUR(value), 'Revenu brut estimé']}
                    labelFormatter={(label: string) => {
                      const m = est.monthlyBreakdown.find(x => x.short === label);
                      return m?.month ?? label;
                    }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {est.monthlyBreakdown.map((m) => (
                      <Cell key={m.month} fill={m.weight >= 0.15 ? '#2563eb' : '#93c5fd'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600 inline-block" /> Haute saison</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-300 inline-block" /> Reste de l'année</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Détail du calcul */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" /> Détail du calcul
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="divide-y dark:divide-gray-700">
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-muted-foreground">Revenus bruts annuels</span>
                  <span className="font-bold">{formatEUR(est.gross)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-muted-foreground">Moyenne mensuelle brute</span>
                  <span className="font-bold">{formatEUR(est.grossMonthly)}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-muted-foreground">Frais de gestion ({est.commissionRate}% TTC)</span>
                  <span className="font-bold text-red-500">- {formatEUR(est.commissionAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold text-sm">Net propriétaire annuel</span>
                  <span className="font-extrabold text-blue-600 text-lg">{formatEUR(est.net)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-3">
                Taux TTC (TVA 20 % incluse). Conformément à votre contrat, la commission est calculée sur votre revenu
                locatif net (hors frais de plateforme, ménage et taxe de séjour). Montants avant charges et impôts.
              </p>
            </CardContent>
          </Card>

          {/* Propriétaire & bien */}
          <Card className="shadow-md border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" /> Informations du dossier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1.5 mb-1">
                  <User className="h-3.5 w-3.5" /> Propriétaire
                </p>
                <p className="font-semibold text-sm">{fullName || '—'}</p>
                {profile.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
                {profile.phone_number && <p className="text-sm text-muted-foreground">{profile.phone_number}</p>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600 flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5" /> Bien estimé
                </p>
                <p className="font-semibold text-sm">{profile.property_address || 'Adresse à renseigner'}</p>
                {propertyLocation && <p className="text-sm text-muted-foreground">{propertyLocation}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remarques des experts */}
        {profile.estimation_details && (
          <Card className="shadow-md border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> Remarques de nos experts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {profile.estimation_details}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bloc banque */}
        <Card className="shadow-md border-0 bg-[#0f2847] text-white overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <Landmark className="h-7 w-7 text-blue-300" />
                </div>
                <div>
                  <p className="font-bold text-lg">Un dossier pour votre banque ?</p>
                  <p className="text-blue-200 text-sm mt-1 max-w-md">
                    Téléchargez ce rapport complet au format PDF : synthèse chiffrée, répartition
                    saisonnière et méthodologie, prêt à joindre à votre dossier de financement.
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-white text-[#0f2847] hover:bg-blue-50 font-bold"
              >
                {isDownloading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <ArrowUpRight className="mr-2 h-5 w-5" />}
                Télécharger le PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Méthodologie + avertissement */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Méthodologie :</span> estimation établie
              à partir des caractéristiques du bien, des données de marché de la location saisonnière du secteur
              (occupation, prix par nuitée, saisonnalité) et de l'historique des biens comparables gérés par Hello Keys.
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
            Document d'information établi à titre indicatif, notamment en vue de la constitution d'un dossier de
            financement bancaire. Les montants indiqués sont des estimations prévisionnelles et ne constituent ni une
            garantie de revenus, ni un engagement contractuel de la part de Hello Keys. — Hello Keys, Conciergerie de
            location saisonnière, 14 rue Carnot, 80550 Le Crotoy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EstimationPage;
