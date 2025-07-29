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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        
        // Define date ranges
        const annualInterval = { start: startOfYear(now), end: now };
        const quarterlyInterval = { start: startOfQuarter(now), end: now };
        const monthlyInterval = { start: startOfMonth(now), end: now };

        // Fetch all data concurrently
        const [statements, singleExpenses, recurringExpenses] = await Promise.all([
          getMyStatements(),
          getExpenses(year),
          getRecurringExpenses()
        ]);

        const allExpenses = [...singleExpenses, ...generateRecurringInstances(recurringExpenses, year)];

        // Calculate revenues
        const calculateRevenues = (interval: { start: Date, end: Date }) => statements
          .filter(s => isWithinInterval(parseISO(s.created_at), interval))
          .reduce((acc, s) => acc + (s.totals?.total_brut_ht || 0), 0);

        const annualRevenues = calculateRevenues(annualInterval);
        const quarterlyRevenues = calculateRevenues(quarterlyInterval);
        const monthlyRevenues = calculateRevenues(monthlyInterval);

        // Calculate expenses
        const calculateExpenses = (interval: { start: Date, end: Date }) => {
          const regularExpenses = allExpenses
            .filter(e => isWithinInterval(parseISO(e.expense_date), interval))
            .reduce((acc, e) => acc + e.amount, 0);

          const statementFees = statements
            .filter(s => isWithinInterval(parseISO(s.created_at), interval))
            .reduce((acc, s) => acc + (s.totals?.total_commission_hk || 0) + (s.totals?.total_frais_paiement || 0), 0);

          return regularExpenses + statementFees;
        };

        const annualExpenses = calculateExpenses(annualInterval);
        const quarterlyExpenses = calculateExpenses(quarterlyInterval);
        const monthlyExpenses = calculateExpenses(monthlyInterval);

        // Set state
        setAnnualBalance({ revenues: annualRevenues, expenses: annualExpenses, net: annualRevenues - annualExpenses });
        setQuarterlyBalance({ revenues: quarterlyRevenues, expenses: quarterlyExpenses, net: quarterlyRevenues - quarterlyExpenses });
        setMonthlyBalance({ revenues: monthlyRevenues, expenses: monthlyExpenses, net: monthlyRevenues - monthlyExpenses });

      } catch (error: any) {
        console.error("Error fetching balance data:", error);
        toast.error("Erreur lors de la récupération des données de bilan.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderBalanceCard = (title: string, balance: BalanceSummary) => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xl font-bold text-green-600">Revenus: {formatCurrency(balance.revenues)}</p>
        <p className="text-xl font-bold text-red-600">Dépenses: {formatCurrency(balance.expenses)}</p>
        <p className="text-xl font-bold text-blue-600">Bénéfice Net: {formatCurrency(balance.net)}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="mt-6">
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
  );
};

export default BalancesTab;