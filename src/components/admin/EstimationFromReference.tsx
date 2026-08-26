import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllProfiles, getInvoicesByUserId } from '@/lib/admin-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Check, Loader2, MoonStar } from 'lucide-react';

const MONTHS_FR: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
};

const formatEUR = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

interface YearSummary {
  year: number;
  monthCount: number;
  brut: number; // CA total (prix séjour + ménage + taxe)
  prixSejour: number;
  montantVerse: number;
  revenuGenere: number;
  commission: number;
  nuits: number;
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
    const byYear = new Map<number, Omit<YearSummary, 'year' | 'monthCount'> & { months: Set<number> }>();
    invoices.forEach(inv => {
      const parts = (inv.period || '').trim().split(' ');
      if (parts.length < 2) return;
      const monthIndex = MONTHS_FR[parts[0].toLowerCase()];
      const year = parseInt(parts[1], 10);
      if (monthIndex === undefined || isNaN(year)) return;

      const t = inv.totals || {};
      const prixSejour = t.totalPrixSejour || 0;
      const menage = t.totalFraisMenage || 0;
      const taxe = t.totalTaxeDeSejour || 0;

      if (!byYear.has(year)) {
        byYear.set(year, { brut: 0, prixSejour: 0, montantVerse: 0, revenuGenere: 0, commission: 0, nuits: 0, months: new Set() });
      }
      const entry = byYear.get(year)!;
      entry.brut += prixSejour + menage + taxe;
      entry.prixSejour += prixSejour;
      entry.montantVerse += t.totalMontantVerse || 0;
      entry.revenuGenere += t.totalRevenuGenere || 0;
      entry.commission += t.totalCommission || 0;
      entry.nuits += t.totalNuits || 0;
      entry.months.add(monthIndex);
    });
    return Array.from(byYear.entries())
      .map(([year, { months, ...rest }]) => ({ year, monthCount: months.size, ...rest }))
      .sort((a, b) => b.year - a.year);
  }, [invoices]);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Estimer depuis un logement existant
        </CardTitle>
        <CardDescription>
          Basez l'estimation sur les chiffres réels des relevés d'un client comparable (brut, versé, revenu généré...).
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

        {yearSummaries.map((s) => (
          <div key={s.year} className="rounded-md border overflow-hidden">
            <div className="flex items-center justify-between bg-muted/60 px-3 py-2">
              <p className="font-semibold text-sm">{s.year}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {s.monthCount} relevé{s.monthCount > 1 ? 's' : ''}
                <span className="flex items-center gap-1"><MoonStar className="h-3 w-3" /> {s.nuits} nuits</span>
              </p>
            </div>
            <div className="divide-y text-sm">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">CA brut total</p>
                  <p className="text-xs text-muted-foreground">Prix séjour + ménage + taxe = {formatEUR(s.brut)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatEUR(s.brut)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onApply(Math.round(s.brut), `CA brut réel ${s.year} d'un logement comparable (${selectedClientName})`)}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Utiliser
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">Prix séjour (loyers)</p>
                  <p className="text-xs text-muted-foreground">Hors ménage et taxe de séjour</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatEUR(s.prixSejour)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onApply(Math.round(s.prixSejour), `loyers réels ${s.year} d'un logement comparable (${selectedClientName})`)}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Utiliser
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">Montant versé par les plateformes</p>
                  <p className="text-xs text-muted-foreground">Après commissions OTA et frais de paiement</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatEUR(s.montantVerse)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onApply(Math.round(s.montantVerse), `montant versé réel ${s.year} d'un logement comparable (${selectedClientName})`)}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Utiliser
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">Revenu généré</p>
                  <p className="text-xs text-muted-foreground">
                    Base de commission — commission HK réelle : {formatEUR(s.commission)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatEUR(s.revenuGenere)}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onApply(Math.round(s.revenuGenere), `revenu généré réel ${s.year} d'un logement comparable (${selectedClientName})`)}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Utiliser
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {yearSummaries.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Cliquez sur « Utiliser » pour reporter le montant choisi dans « Revenu Annuel Estimé ».
            Le nom du client de référence n'est jamais visible par le prospect.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EstimationFromReference;
