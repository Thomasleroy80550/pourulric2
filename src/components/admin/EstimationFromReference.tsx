import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllProfiles, getInvoicesByUserId } from '@/lib/admin-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Check, Loader2 } from 'lucide-react';

const MONTHS_FR: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
};

const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

interface YearSummary {
  year: number;
  total: number;
  monthCount: number;
}

interface EstimationFromReferenceProps {
  currentUserId: string;
  onApply: (amount: number, sourceLabel: string) => void;
}

const EstimationFromReference: React.FC<EstimationFromReferenceProps> = ({ currentUserId, onApply }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ['all-profiles-for-estimation'],
    queryFn: getAllProfiles,
    staleTime: 5 * 60 * 1000,
  });

  const referenceClients = useMemo(
    () =>
      (profiles || [])
        .filter(p => p.id !== currentUserId && p.role !== 'admin')
        .sort((a, b) => {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
        }),
    [profiles, currentUserId],
  );

  const selectedClient = referenceClients.find(p => p.id === selectedUserId);
  const selectedClientName = selectedClient
    ? `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim()
    : '';

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices-for-estimation', selectedUserId],
    queryFn: () => getInvoicesByUserId(selectedUserId),
    enabled: !!selectedUserId,
  });

  const yearSummaries: YearSummary[] = useMemo(() => {
    if (!invoices) return [];
    const byYear = new Map<number, { total: number; months: Set<number> }>();
    invoices.forEach(inv => {
      const parts = (inv.period || '').trim().split(' ');
      if (parts.length < 2) return;
      const monthIndex = MONTHS_FR[parts[0].toLowerCase()];
      const year = parseInt(parts[1], 10);
      if (monthIndex === undefined || isNaN(year)) return;
      const revenue = inv.totals?.totalRevenuGenere || 0;
      if (!byYear.has(year)) byYear.set(year, { total: 0, months: new Set() });
      const entry = byYear.get(year)!;
      entry.total += revenue;
      entry.months.add(monthIndex);
    });
    return Array.from(byYear.entries())
      .map(([year, { total, months }]) => ({ year, total, monthCount: months.size }))
      .sort((a, b) => b.year - a.year);
  }, [invoices]);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Estimer depuis un logement existant
        </CardTitle>
        <CardDescription>
          Basez l'estimation sur les revenus réels (Revenu Généré des relevés) d'un client comparable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingProfiles ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un client de référence..." />
            </SelectTrigger>
            <SelectContent>
              {referenceClients.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.id}
                  {p.property_city ? ` — ${p.property_city}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedUserId && loadingInvoices && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse des relevés...
          </div>
        )}

        {selectedUserId && !loadingInvoices && yearSummaries.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Aucun relevé trouvé pour ce client.
          </p>
        )}

        {yearSummaries.length > 0 && (
          <div className="space-y-2">
            {yearSummaries.map(({ year, total, monthCount }) => (
              <div
                key={year}
                className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold">{year}</p>
                  <p className="text-xs text-muted-foreground">
                    {monthCount} relevé{monthCount > 1 ? 's' : ''} — Revenu généré : <strong>{formatEUR(total)}</strong>
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onApply(Math.round(total), `logement comparable, revenus réels ${year} (${selectedClientName})`)}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Utiliser
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Cliquez sur « Utiliser » pour reporter le montant dans le champ « Revenu Annuel Estimé ».
              Le nom du client de référence n'est jamais visible par le prospect.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EstimationFromReference;
