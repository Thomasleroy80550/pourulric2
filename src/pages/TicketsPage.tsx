import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TicketsPage = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Fonctionnalité indisponible</AlertTitle>
            <AlertDescription>
              La gestion des tickets est temporairement indisponible. 
              Veuillez contacter le support directement par email.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate('/help')}>
              Retour à l'aide
            </Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default TicketsPage;