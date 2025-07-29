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

  // Temporarily disable functionality and show "in development"
  const handleGenerateReport = async () => {
    toast.info("Cette fonctionnalité est en développement.");
  };

  return (
    <div className="mt-6 relative">
      <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">Fonctionnalité en développement</p>
      </div>
      <div className="opacity-50 pointer-events-none"> {/* Grays out and disables interaction */}
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
    </div>
  );
};

export default ReportsTab;