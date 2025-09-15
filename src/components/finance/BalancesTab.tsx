import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMyStatements } from '@/lib/statements-api';
import { getExpenses, getRecurringExpenses, generateRecurringInstances } from '@/lib/expenses-api';
import { SavedInvoice } from '@/lib/admin-api';
import { Expense } from '@/lib/expenses-api';
import { startOfYear, startOfQuarter, startOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface BalanceSummary {
  revenues: number;
  expenses: number;
  net: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

const BalancesTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [annualBalance, setAnnualBalance] = useState<BalanceSummary>({ revenues: 0, expenses: 0, net: 0 });
  const [quarterlyBalance, setQuarterlyBalance] = useState<BalanceSummary>({ revenues: 0, expenses: 0, net: 0 });
  const [monthlyBalance, setMonthlyBalance] = useState<BalanceSummary>({ revenues: 0, expenses: 0, net: 0 });

  // Temporarily disable data fetching and show "in development"
  useEffect(() => {
    setLoading(false); // Set loading to false immediately
  }, []);

  return (
    <div className="mt-6 relative">
      <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">Fonctionnalité en développement</p>
      </div>
      <div className="opacity-50 pointer-events-none"> {/* Grays out and disables interaction */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </>
          ) : (
            <>
              {renderBalanceCard(`Bilan Annuel (${new Date().getFullYear()})`, annualBalance)}
              {renderBalanceCard(`Bilan Trimestriel (En cours)`, quarterlyBalance)}
              {renderBalanceCard(`Bilan Mensuel (En cours)`, monthlyBalance)}
            </>
          )}
        </div>
        <Card className="shadow-md mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Rapports Détaillés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Consultez ou générez des rapports financiers détaillés pour une analyse approfondie via l'onglet "Rapports".
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" disabled>Télécharger Bilan Annuel (Bientôt)</Button>
              <Button variant="outline" disabled>Générer Rapport Personnalisé (Bientôt)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BalancesTab;