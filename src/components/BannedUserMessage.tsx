import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const BannedUserMessage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
      <Card className="w-full max-w-lg text-center border-destructive border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex flex-col items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-12 w-12" />
            <span className="mt-2 text-2xl">Accès Restreint</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium">Votre compte a été suspendu.</p>
          <p className="text-muted-foreground mt-2">
            Certaines fonctionnalités de l'application ont été désactivées. Veuillez contacter le support pour régulariser votre situation et retrouver un accès complet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BannedUserMessage;