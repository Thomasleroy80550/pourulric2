import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const transactions = [
  { id: 'T001', date: '2025-06-05', description: 'Paiement réservation BK001', type: 'Revenu', amount: '+450.00€' },
  { id: 'T002', date: '2025-06-03', description: 'Frais de ménage Appartement Paris', type: 'Dépense', amount: '-50.00€' },
  { id: 'T003', date: '2025-05-30', description: 'Paiement réservation BK002', type: 'Revenu', amount: '+280.00€' },
  { id: 'T004', date: '2025-05-28', description: 'Réparation plomberie Studio Nice', type: 'Dépense', amount: '-120.00€' },
];

const AccountingPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Comptabilité</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Revenus du mois</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">730.00€</p>
              <p className="text-sm text-gray-500">Total des entrées d'argent</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Dépenses du mois</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">170.00€</p>
              <p className="text-sm text-gray-500">Total des sorties d'argent</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Solde Net</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">560.00€</p>
              <p className="text-sm text-gray-500">Revenus - Dépenses</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Historique des Transactions</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <Badge variant={transaction.type === 'Revenu' ? 'default' : 'secondary'}>
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AccountingPage;