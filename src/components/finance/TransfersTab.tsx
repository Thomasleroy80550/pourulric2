import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Terminal, Banknote, CheckCircle2, Clock } from 'lucide-react';
import { getMyStatements } from '@/lib/statements-api';
import { SavedInvoice } from '@/lib/admin-api';
import { useIsMobile } from '@/hooks/use-mobile';

interface TransferRow {
  key: string;
  period: string;
  createdAt: string;
  source: string;
  amount: number;
  completed: boolean;
}

const getAmountsBySource = (statement: SavedInvoice): { [source: string]: number } => {
  const sources = statement.totals?.transferDetails?.sources;
  if (sources && Object.keys(sources).length > 0) {
    return Object.fromEntries(
      Object.entries(sources).map(([key, value]: [string, any]) => [key, value?.total ?? 0]),
    );
  }
  const fallback = statement.totals?.totalMontantVerse ?? 0;
  return fallback > 0 ? { total: fallback } : {};
};

const buildTransferRows = (statements: SavedInvoice[]): TransferRow[] => {
  const rows: TransferRow[] = [];
  statements.forEach((statement) => {
    const amountsBySource = getAmountsBySource(statement);
    Object.entries(amountsBySource).forEach(([source, amount]) => {
      if (!amount || amount <= 0) return;
      rows.push({
        key: `${statement.id}-${source}`,
        period: statement.period,
        createdAt: statement.created_at,
        source,
        amount,
        completed: statement.transfer_statuses?.[source] ?? false,
      });
    });
  });
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

const formatSource = (source: string) =>
  source === 'total' ? 'Virement' : source.charAt(0).toUpperCase() + source.slice(1);

const StatusBadge: React.FC<{ completed: boolean }> = ({ completed }) =>
  completed ? (
    <Badge className="bg-green-600 text-white hover:bg-green-600">
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
      Effectué
    </Badge>
  ) : (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3.5 w-3.5" />
      En attente
    </Badge>
  );

const TransfersTab: React.FC = () => {
  const [statements, setStatements] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const rows = buildTransferRows(statements);
  const totalCompleted = rows.filter((r) => r.completed).reduce((acc, r) => acc + r.amount, 0);
  const totalPending = rows.filter((r) => !r.completed).reduce((acc, r) => acc + r.amount, 0);

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

    if (rows.length === 0) {
      return <p className="py-8 text-center text-gray-500">Aucun virement à afficher pour le moment.</p>;
    }

    return (
      <>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-green-50 p-4 text-center">
            <p className="text-sm text-gray-600">Total virements effectués</p>
            <p className="text-2xl font-bold text-green-600">{totalCompleted.toFixed(2)}€</p>
          </div>
          <div className="rounded-lg border bg-amber-50 p-4 text-center">
            <p className="text-sm text-gray-600">En attente de virement</p>
            <p className="text-2xl font-bold text-amber-600">{totalPending.toFixed(2)}€</p>
          </div>
        </div>

        {isMobile ? (
          <div className="grid grid-cols-1 gap-3">
            {rows.map((row) => (
              <Card key={row.key} className="shadow-sm">
                <CardContent className="space-y-2 pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{row.period}</span>
                    <StatusBadge completed={row.completed} />
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>{formatSource(row.source)}</span>
                    <span className="font-bold text-gray-900">{row.amount.toFixed(2)}€</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Période</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.period}</TableCell>
                  <TableCell>{formatSource(row.source)}</TableCell>
                  <TableCell className="text-right font-bold">{row.amount.toFixed(2)}€</TableCell>
                  <TableCell className="flex justify-end">
                    <StatusBadge completed={row.completed} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </>
    );
  };

  return (
    <div className="mt-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Historique des virements
          </CardTitle>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
};

export default TransfersTab;
