import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getCompSetAnalysis, CompSetAnalysis } from '@/lib/comp-set-api';
import { AlertTriangle, Trophy, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const CompSetPage: React.FC = () => {
  const [analysis, setAnalysis] = useState<CompSetAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchAnalysis();
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

  const performance = getPerformanceMessage();

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-2">Analyse Concurrentielle</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Comparez la performance de votre logement par rapport à des biens similaires.</p>

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
            <AlertTitle>Erreur d'analyse</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && analysis && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Synthèse de la performance</CardTitle>
                <CardDescription>Basé sur une comparaison avec {analysis.competitorCount} logement(s) similaire(s) dans votre ville.</CardDescription>
              </CardHeader>
              <CardContent>
                {performance && (
                  <div className={`flex items-center ${performance.color}`}>
                    <performance.Icon className="h-6 w-6 mr-3" />
                    <p className="font-semibold">{performance.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {renderScoreCard("Votre Score", analysis.userScore, analysis.maxScore, Trophy)}
              {renderScoreCard("Moyenne des Concurrents", analysis.averageCompetitorScore, analysis.maxScore, Users)}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CompSetPage;