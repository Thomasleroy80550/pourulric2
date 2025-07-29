import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountingTab from '@/components/finance/AccountingTab';
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
      setShowExpensesTab(profile.expenses_module_enabled || false);
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
        <Tabs defaultValue="accounting" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 sm:grid-cols-3 ${showExpensesTab ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
            <TabsTrigger value="statements">Relevés</TabsTrigger>
            <TabsTrigger value="balances">Bilans</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            {showExpensesTab && <TabsTrigger value="expenses">Dépenses</TabsTrigger>}
          </TabsList>
          <TabsContent value="accounting">
            <AccountingTab />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>
          <TabsContent value="statements">
            <StatementsTab />
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