import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getCompSetAnalysis, CompSetAnalysis } from '@/lib/comp-set-api';
import { getPerformanceAnalysis, PerformanceAnalysis } from '@/lib/performance-api';
import { getPricePositionAnalysis, PricePositionAnalysis } from '@/lib/price-position-api';
import { PricePositionChart } from '@/components/PricePositionChart';
import { AlertTriangle, Trophy, Users, TrendingUp, TrendingDown, Percent, Briefcase, BarChart, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CompSetPage: React.FC = () => {
  const [analysis, setAnalysis] = useState<CompSetAnalysis | null>(null);
  const [performance, setPerformance] = useState<PerformanceAnalysis | null>(null);
  const [priceAnalysis, setPriceAnalysis] = useState<PricePositionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perfLoading, setPerfLoading] = useState(true);
  const [perfError, setPerfError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getCompSetAnalysis();
        setAnalysis(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchPerformance = async () => {
      try {
        setPerfLoading(true);
        setPerfError(null);
        const result = await getPerformanceAnalysis();
        setPerformance(result);
      } catch (err: any) {
        setPerfError(err.message);
      } finally {
        setPerfLoading(false);
      }
    };

    const fetchPriceAnalysis = async () => {
      try {
        setPriceLoading(true);
        setPriceError(null);
        const result = await getPricePositionAnalysis();
        setPriceAnalysis(result);
      } catch (err: any) {
        setPriceError(err.message);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchAnalysis();
    fetchPerformance();
    fetchPriceAnalysis();
  }, []);

  const renderScoreCard = (title: string, score: number, maxScore: number, icon: React.ElementType) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const Icon = icon;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{score.toFixed(1)} / {maxScore}</div>
          <p className="text-xs text-muted-foreground">Score d'équipement</p>
          <Progress value={percentage} className="mt-2" />
        </CardContent>
      </Card>
    );
  };

  const renderPerfCard = (title: string, value: string, description: string, icon: React.ElementType) => {
    const Icon = icon;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    );
  };

  const getPerformanceMessage = () => {
    if (!analysis) return null;
    const difference = analysis.userScore - analysis.averageCompetitorScore;
    if (difference > 1) {
      return {
        Icon: TrendingUp,
        color: "text-green-600",
        message: "Votre logement est mieux équipé que la moyenne de vos concurrents. Excellent travail !",
      };
    }
    if (difference < -1) {
      return {
        Icon: TrendingDown,
        color: "text-red-600",
        message: "Vos concurrents sont en moyenne mieux équipés. Envisagez d'ajouter des équipements pour améliorer votre attractivité.",
      };
    }
    return {
      Icon: TrendingUp,
      color: "text-blue-600",
      message: "Votre logement a un niveau d'équipement similaire à celui de vos concurrents.",
    };
  };

  const getPriceMessage = () => {
    if (!priceAnalysis || priceAnalysis.competitorAveragePrice === 0) return null;
    const difference = priceAnalysis.userAveragePrice - priceAnalysis.competitorAveragePrice;
    const percentageDiff = (difference / priceAnalysis.competitorAveragePrice) * 100;

    if (percentageDiff > 5) {
      return {
        Icon: TrendingUp,
        color: "text-green-600",
        message: `Votre prix moyen est ${percentageDiff.toFixed(0)}% plus élevé que la concurrence.`,
      };
    }
    if (percentageDiff < -5) {
      return {
        Icon: TrendingDown,
        color: "text-orange-600",
        message: `Votre prix moyen est ${Math.abs(percentageDiff).toFixed(0)}% plus bas que la concurrence.`,
      };
    }
    return {
      Icon: DollarSign,
      color: "text-blue-600",
      message: "Votre prix moyen est aligné avec celui de la concurrence.",
    };
  };

  const performanceMessage = getPerformanceMessage();
  const priceMessage = getPriceMessage();

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">Analyse Concurrentielle & Performance</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Comparez vos équipements et analysez votre performance financière et d'occupation.</p>

        {loading && (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur d'analyse concurrentielle</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && analysis && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Synthèse de la Compétitivité (Équipements)</CardTitle>
                <CardDescription>Basé sur une comparaison avec {analysis.competitorCount} logement(s) similaire(s).</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMessage && (
                  <div className={`flex items-center ${performanceMessage.color}`}>
                    <performanceMessage.Icon className="h-6 w-6 mr-3" />
                    <p className="font-semibold">{performanceMessage.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {renderScoreCard("Votre Score", analysis.userScore, analysis.maxScore, Trophy)}
              {renderScoreCard("Moyenne des Concurrents", analysis.averageCompetitorScore, analysis.maxScore, Users)}
            </div>

            {priceLoading && <Skeleton className="h-80 w-full mt-6" />}
            {priceError && (
              <Alert variant="destructive" className="mt-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erreur d'analyse tarifaire</AlertTitle>
                <AlertDescription>{priceError}</AlertDescription>
              </Alert>
            )}
            {!priceLoading && !priceError && priceAnalysis && (
              <div className="mt-6 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Synthèse du Positionnement Tarifaire</CardTitle>
                        <CardDescription>Basé sur une comparaison avec {priceAnalysis.competitorCount} logement(s) similaire(s).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {priceMessage && (
                        <div className={`flex items-center ${priceMessage.color}`}>
                            <priceMessage.Icon className="h-6 w-6 mr-3" />
                            <p className="font-semibold">{priceMessage.message}</p>
                        </div>
                        )}
                    </CardContent>
                </Card>
                <PricePositionChart data={priceAnalysis} />
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold">Votre Performance Personnelle</h2>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Note sur les données</AlertTitle>
            <AlertDescription>
              L'analyse de performance financière et d'occupation est privée et concerne uniquement vos logements. Pour des raisons techniques et de confidentialité, il n'est pas possible d'afficher ces données pour vos concurrents.
            </AlertDescription>
          </Alert>

          {perfLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          )}

          {perfError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erreur d'analyse de performance</AlertTitle>
              <AlertDescription>{perfError}</AlertDescription>
            </Alert>
          )}

          {!perfLoading && !perfError && performance && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {renderPerfCard(
                "Taux d'occupation",
                `${performance.occupancyRate.toFixed(1)}%`,
                `Sur les ${performance.analysisPeriodDays} derniers jours`,
                Percent
              )}
              {renderPerfCard(
                "Prix moyen / nuit (ADR)",
                `${performance.adr.toFixed(2)}€`,
                `Basé sur ${performance.totalBookedNights} nuits réservées`,
                TrendingUp
              )}
              {renderPerfCard(
                "Revenu / logement (RevPAR)",
                `${performance.revPar.toFixed(2)}€`,
                `Sur les ${performance.analysisPeriodDays} derniers jours`,
                Briefcase
              )}
              {renderPerfCard(
                "Revenu Total",
                `${performance.totalRevenue.toFixed(2)}€`,
                `Sur les ${performance.analysisPeriodDays} derniers jours`,
                BarChart
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CompSetPage;