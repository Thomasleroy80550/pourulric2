import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const mockTransactions = [
  { id: 'T001', date: '2025-06-05', description: 'Paiement réservation BK001', type: 'Revenu', amount: '+450.00€' },
  { id: 'T002', date: '2025-06-03', description: 'Frais de ménage Appartement Paris', type: 'Dépense', amount: '-50.00€' },
  { id: 'T003', date: '2025-05-30', description: 'Paiement réservation BK002', type: 'Revenu', amount: '+280.00€' },
  { id: 'T004', date: '2025-05-28', description: 'Réparation plomberie Studio Nice', type: 'Dépense', amount: '-120.00€' },
];

const AccountingTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenues: '0.00€',
    expenses: '0.00€',
    netBalance: '0.00€',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactions(mockTransactions);
      setSummary({
        revenues: '730.00€',
        expenses: '170.00€',
        netBalance: '560.00€',
      });
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getStatusVariant = (type: string) => {
    return type === 'Revenu' ? 'default' : 'secondary';
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : (
          <>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Revenus du mois</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{summary.revenues}</p>
                <p className="text-sm text-gray-500">Total des entrées d'argent</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Dépenses du mois</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{summary.expenses}</p>
                <p className="text-sm text-gray-500">Total des sorties d'argent</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Solde Net</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{summary.netBalance}</p>
                <p className="text-sm text-gray-500">Revenus - Dépenses</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Historique des Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.id}</TableCell>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(transaction.type)}>
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${transaction.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountingTab;