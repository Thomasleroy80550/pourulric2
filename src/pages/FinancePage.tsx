import React from 'react';
import MainLayout from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AccountingTab from '@/components/finance/AccountingTab';
import InvoicesTab from '@/components/finance/InvoicesTab';
import StatementsTab from '@/components/finance/StatementsTab';
import BalancesTab from '@/components/finance/BalancesTab';
import ReportsTab from '@/components/finance/ReportsTab';

const FinancePage: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Finances</h1>
        <Tabs defaultValue="accounting" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="accounting">Comptabilité</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
            <TabsTrigger value="statements">Relevés</TabsTrigger>
            <TabsTrigger value="balances">Bilans</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
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
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default FinancePage;