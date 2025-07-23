import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Eye } from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from '@/lib/admin-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import StatementDetailsDialog from '@/components/StatementDetailsDialog';

const StatementsTab: React.FC = () => {
  const [statements, setStatements] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<SavedInvoice | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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

  return (
    <div className="mt-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Historique des relevés générés</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : statements.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun relevé sauvegardé pour le moment.</p>
          ) : (
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
          )}
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