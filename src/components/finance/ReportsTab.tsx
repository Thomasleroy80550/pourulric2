import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMyStatements } from '@/lib/statements-api';
import { getExpenses, getRecurringExpenses, generateRecurringInstances } from '@/lib/expenses-api';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { Loader2 } from 'lucide-react';

type ReportType = 'financial' | 'bookings' | 'performance' | 'reviews';
type TimePeriod = 'current-month' | 'last-month' | 'current-quarter' | 'last-quarter' | 'current-year' | 'last-year' | 'custom';

interface Transaction {
  date: string;
  description: string;
  type: 'Revenu' | 'Dépense';
  amount: number;
}

const ReportsTab: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('current-month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<Transaction[] | null>(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setReportData(null);

    let interval: { start: Date, end: Date };
    const now = new Date();

    switch (timePeriod) {
      case 'current-month':
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        interval = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        break;
      case 'current-quarter':
        interval = { start: startOfQuarter(now), end: endOfQuarter(now) };
        break;
      case 'last-quarter':
        const lastQuarter = subQuarters(now, 1);
        interval = { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
        break;
      case 'current-year':
        interval = { start: startOfYear(now), end: endOfYear(now) };
        break;
      case 'last-year':
        const lastYear = subYears(now, 1);
        interval = { start: startOfYear(lastYear), end: endOfYear(lastYear) };
        break;
      case 'custom':
        if (!startDate || !endDate) {
          toast.error("Veuillez sélectionner une date de début et de fin pour la période personnalisée.");
          setLoading(false);
          return;
        }
        interval = { start: parseISO(startDate), end: parseISO(endDate) };
        break;
    }

    try {
      if (reportType === 'financial') {
        const year = interval.start.getFullYear();
        const [statements, singleExpenses, recurringExpenses] = await Promise.all([
          getMyStatements(),
          getExpenses(year), // Fetch for the start year, then filter
          getRecurringExpenses()
        ]);

        const allExpenses = [...singleExpenses, ...generateRecurringInstances(recurringExpenses, year)];
        
        const revenueTransactions: Transaction[] = statements
          .filter(s => isWithinInterval(parseISO(s.created_at), interval))
          .map(s => ({
            date: format(parseISO(s.created_at), 'yyyy-MM-dd'),
            description: `Relevé Période ${s.period}`,
            type: 'Revenu',
            amount: s.totals?.total_brut_ht || 0, // Changed to total_brut_ht for gross revenue
          }));

        const expenseTransactions: Transaction[] = allExpenses
          .filter(e => isWithinInterval(parseISO(e.expense_date), interval))
          .map(e => ({
            date: e.expense_date,
            description: e.description,
            type: 'Dépense',
            amount: e.amount,
          }));

        // Add HelloKeys commission and payment fees as expenses
        const statementFeeTransactions: Transaction[] = statements
          .filter(s => isWithinInterval(parseISO(s.created_at), interval))
          .flatMap(s => {
            const fees: Transaction[] = [];
            if (s.totals?.total_commission_hk) {
              fees.push({
                date: format(parseISO(s.created_at), 'yyyy-MM-dd'),
                description: `Commission HelloKeys (${s.period})`,
                type: 'Dépense',
                amount: s.totals.total_commission_hk,
              });
            }
            if (s.totals?.total_frais_paiement) {
              fees.push({
                date: format(parseISO(s.created_at), 'yyyy-MM-dd'),
                description: `Frais de paiement (${s.period})`,
                type: 'Dépense',
                amount: s.totals.total_frais_paiement,
              });
            }
            return fees;
          });

        const combinedTransactions = [...revenueTransactions, ...expenseTransactions, ...statementFeeTransactions] // Include new fee transactions
          .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        
        setReportData(combinedTransactions);
        toast.success(`Rapport financier généré pour la période sélectionnée.`);
      } else {
        toast.info(`Le type de rapport "${reportType}" n'est pas encore implémenté.`);
      }
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error("Erreur lors de la génération du rapport.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Génération de rapports personnalisés</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="report-type">Type de Rapport</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger id="report-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">Financier</SelectItem>
                  <SelectItem value="bookings" disabled>Réservations (Bientôt)</SelectItem>
                  <SelectItem value="performance" disabled>Performances (Bientôt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="time-period">Période</Label>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger id="time-period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Mois en cours</SelectItem>
                  <SelectItem value="last-month">Mois dernier</SelectItem>
                  <SelectItem value="current-quarter">Trimestre en cours</SelectItem>
                  <SelectItem value="last-quarter">Trimestre dernier</SelectItem>
                  <SelectItem value="current-year">Année en cours</SelectItem>
                  <SelectItem value="last-year">Année dernière</SelectItem>
                  <SelectItem value="custom">Personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {timePeriod === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Date de début</Label>
                <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end-date">Date de fin</Label>
                <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          )}
          <Button className="w-full md:w-auto" onClick={handleGenerateReport} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération...</> : 'Générer le Rapport'}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <Card className="shadow-md mt-6">
          <CardHeader>
            <CardTitle>Résultats du Rapport</CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'Revenu' ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p>Aucune transaction trouvée pour la période sélectionnée.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsTab;