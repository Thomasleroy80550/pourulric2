import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InvoicesTab from '@/components/finance/InvoicesTab';
import StatementsTab from '@/components/finance/StatementsTab';
import BalancesTab from '@/components/finance/BalancesTab';
import ReportsTab from '@/components/finance/ReportsTab';
import ExpensesTab from '@/components/finance/ExpensesTab';
import { useSession } from '@/components/SessionContextProvider';
import BannedUserMessage from "@/components/BannedUserMessage";

const FinancePage: React.FC = () => {
  const { profile } = useSession();
  const [showExpensesTab, setShowExpensesTab] = useState(false);

  useEffect(() => {
    if (profile) {
      // Accountants should not see the expenses tab, regardless of the main user's settings.
      setShowExpensesTab(profile.expenses_module_enabled && profile.role !== 'accountant' || false);
    }
  }, [profile]);

  if (profile?.is_banned) {
    return (
      <MainLayout>
        <BannedUserMessage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Finances</h1>
        <Tabs defaultValue="statements" className="w-full">
          {profile?.role === 'accountant' ? (
<TabsList className="grid w-full grid-cols-2 max-w-md mx-auto text-center justify-items-center">
  <TabsTrigger value="statements" className="w-full justify-center">Relevés</TabsTrigger>
  <TabsTrigger value="invoices" className="w-full justify-center">Factures</TabsTrigger>
</TabsList>

          ) : (
            <TabsList className={`grid w-full grid-cols-2 sm:grid-cols-3 ${showExpensesTab ? 'md:grid-cols-5' : 'md:grid-cols-4'} max-w-full mx-auto text-center`}>
              <TabsTrigger value="statements" className="text-center">Relevés</TabsTrigger>
              <TabsTrigger value="invoices" className="text-center">Factures</TabsTrigger>
              <TabsTrigger value="balances" disabled className="text-center">Bilans (En développement)</TabsTrigger>
              <TabsTrigger value="reports" disabled className="w-full justify-center">Rapports (En développement)</TabsTrigger>
              {showExpensesTab && <TabsTrigger value="expenses" className="text-center">Dépenses</TabsTrigger>}
            </TabsList>
          )}
          <TabsContent value="statements">
            <StatementsTab />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>
          <TabsContent value="balances">
            <BalancesTab />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
          {showExpensesTab && (
            <TabsContent value="expenses">
              <ExpensesTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default FinancePage;