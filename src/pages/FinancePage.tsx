import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InvoicesTab from '@/components/finance/InvoicesTab';
import StatementsTab from '@/components/finance/StatementsTab';
import BalancesTab from '@/components/finance/BalancesTab';
import ReportsTab from '@/components/finance/ReportsTab';
import ExpensesTab from '@/components/finance/ExpensesTab';
import RehousingNotesTab from '@/components/finance/RehousingNotesTab';
import { useSession } from '@/components/SessionContextProvider';
import BannedUserMessage from "@/components/BannedUserMessage";
import SuspendedAccountMessage from "@/components/SuspendedAccountMessage";
import FinanceTutorial from '@/components/finance/FinanceTutorial';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const FinancePage: React.FC = () => {
  const { profile } = useSession();
  const [showExpensesTab, setShowExpensesTab] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const isMobile = useIsMobile();

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

  if (profile?.is_payment_suspended) {
    return (
      <MainLayout>
        <SuspendedAccountMessage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-3 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-3xl font-bold">Finances</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTutorial(true)}
            className="flex items-center space-x-2 w-full md:w-auto"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Aide</span>
          </Button>
        </div>

        {/* Message d'information Pennylane */}
        <div className="mb-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Information concernant les factures Pennylane</AlertTitle>
            <AlertDescription>
              <p>
                Notre fournisseur de logiciel Pennylane a réalisé une mise à jour sur son outil, notre connexion est donc perturbée,
                d&apos;où le fait de ne pas voir vos factures.
              </p>
              <p className="mt-2">
                Pour payer votre dernière facture, c&apos;est simple&nbsp;: il suffit de payer le montant total de votre relevé,
                soit <span className="font-semibold">Total Facture Hello Keys</span>.
              </p>
              <p className="mt-2">
                Nous contrôlons chaque jour la réception des virements, hormis le lundi.
              </p>
            </AlertDescription>
          </Alert>
        </div>
        
        {showTutorial && <FinanceTutorial onClose={() => setShowTutorial(false)} />}
        
        <Tabs defaultValue="statements" className="w-full">
          {profile?.role === 'accountant' ? (
            <TabsList className="w-full flex overflow-x-auto gap-2 whitespace-nowrap md:grid md:grid-cols-2 max-w-full mx-auto">
              <TabsTrigger value="statements" className="flex-shrink-0 min-w-[140px] md:min-w-0 justify-center">Relevés</TabsTrigger>
              <TabsTrigger value="invoices" className="flex-shrink-0 min-w-[140px] md:min-w-0 justify-center">Factures</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className={`w-full flex overflow-x-auto gap-2 whitespace-nowrap md:grid ${showExpensesTab ? 'md:grid-cols-6' : 'md:grid-cols-5'} max-w-full mx-auto text-center`}>
              <TabsTrigger value="statements" className="flex-shrink-0 min-w-[140px] md:min-w-0">Relevés</TabsTrigger>
              <TabsTrigger value="invoices" className="flex-shrink-0 min-w-[140px] md:min-w-0">Factures</TabsTrigger>
              <TabsTrigger value="rehousing" className="flex-shrink-0 min-w-[140px] md:min-w-0">Relogements</TabsTrigger>
              <TabsTrigger value="balances" disabled className="flex-shrink-0 min-w-[180px] md:min-w-0">Bilans (En développement)</TabsTrigger>
              <TabsTrigger value="reports" disabled className="flex-shrink-0 min-w-[200px] md:min-w-0">Rapports (En développement)</TabsTrigger>
              {showExpensesTab && <TabsTrigger value="expenses" className="flex-shrink-0 min-w-[140px] md:min-w-0">Dépenses</TabsTrigger>}
            </TabsList>
          )}
          <TabsContent value="statements">
            <StatementsTab />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab />
          </TabsContent>
          <TabsContent value="rehousing">
            <RehousingNotesTab />
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