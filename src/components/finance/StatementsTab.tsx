import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Eye, Calendar, FileText, Euro } from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from '@/lib/admin-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import StatementDetailsDialog from '@/components/StatementDetailsDialog';
import { useIsMobile } from '@/hooks/use-mobile';

const StatementsTab: React.FC = () => {
  const [statements, setStatements] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<SavedInvoice | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadStatements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMyStatements();
        setStatements(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadStatements();
  }, []);

  const handleViewDetails = (statement: SavedInvoice) => {
    setSelectedStatement(statement);
    setIsDetailDialogOpen(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (statements.length === 0) {
      return <p className="text-center text-gray-500 py-8">Aucun relevé sauvegardé pour le moment.</p>;
    }

    if (isMobile) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {statements.map((statement) => (
            <Card key={statement.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  Relevé: {statement.period}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  Créé le: {format(parseISO(statement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </p>
                <p className="flex items-center">
                  <Euro className="h-4 w-4 mr-2 text-gray-500" />
                  Montant Facturé: <span className="font-bold ml-1">{statement.totals.totalFacture.toFixed(2)}€</span>
                </p>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewDetails(statement)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Voir les détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Période</TableHead>
            <TableHead>Date de Création</TableHead>
            <TableHead className="text-right">Montant Facturé</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statements.map((statement) => (
            <TableRow key={statement.id}>
              <TableCell>{statement.period}</TableCell>
              <TableCell>{format(parseISO(statement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
              <TableCell className="text-right font-bold">{statement.totals.totalFacture.toFixed(2)}€</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => handleViewDetails(statement)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="mt-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Historique des relevés générés</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      <StatementDetailsDialog
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        statement={selectedStatement}
      />
    </div>
  );
};

export default StatementsTab;