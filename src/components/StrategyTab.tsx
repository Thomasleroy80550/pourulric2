import React, { useState, useEffect, useCallback } from 'react';
import { getMyStrategies, requestStrategyReview, Strategy, requestStrategyCreation } from '@/lib/strategy-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const StrategyTab: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyStrategies();
      setStrategies(data);
    } catch (err: any) {
      setError(`Erreur lors du chargement de la stratégie : ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const handleRequestReview = async (strategyId: string) => {
    try {
      await requestStrategyReview(strategyId);
      toast.success('Votre demande de révision a été envoyée.');
      fetchStrategies(); // Refresh the data
    } catch (err: any) {
      toast.error(`Erreur lors de la demande de révision : ${err.message}`);
      console.error(err);
    }
  };

  const handleRequestCreation = async () => {
    setIsRequesting(true);
    try {
      await requestStrategyCreation();
      toast.success('Votre demande de stratégie a été envoyée.');
      fetchStrategies(); // Refresh the data
    } catch (err: any) {
      toast.error(`Erreur lors de la demande : ${err.message}`);
      console.error(err);
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/4 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-36" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (strategies.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Aucune stratégie définie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Aucune stratégie n'a encore été définie pour votre compte. Vous pouvez en demander une à l'équipe administrative.</p>
          <Button onClick={handleRequestCreation} disabled={isRequesting}>
            {isRequesting ? 'Envoi en cours...' : 'Demander une stratégie'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latestStrategy = strategies[0];

  if (latestStrategy.status === 'creation_requested') {
    return (
       <Card className="mt-6">
        <CardHeader>
          <CardTitle>Demande de Stratégie en Cours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-yellow-600 font-semibold">
            <Clock className="h-5 w-5 mr-2" />
            <span>Votre demande de création de stratégie est en attente de traitement par un administrateur.</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Votre Stratégie Actuelle</CardTitle>
        <CardDescription>
          Définie le {format(new Date(latestStrategy.created_at), 'd MMMM yyyy', { locale: fr })}.
          Dernière mise à jour le {format(new Date(latestStrategy.updated_at), 'd MMMM yyyy', { locale: fr })}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose dark:prose-invert max-w-none">
          <p style={{ whiteSpace: 'pre-wrap' }}>{latestStrategy.strategy_content}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        {latestStrategy.status === 'review_requested' ? (
          <div className="flex items-center text-yellow-600 font-semibold">
            <Clock className="h-5 w-5 mr-2" />
            <span>Révision en attente</span>
          </div>
        ) : (
          <div className="flex items-center text-green-600 font-semibold">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span>Stratégie active</span>
          </div>
        )}
        <Button
          onClick={() => handleRequestReview(latestStrategy.id)}
          disabled={latestStrategy.status === 'review_requested'}
        >
          Demander une révision
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StrategyTab;