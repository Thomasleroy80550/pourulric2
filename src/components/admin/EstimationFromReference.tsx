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
  onApply: (amount: number, details: string) => void;
}

const buildDetails = (s: YearSummary): string =>
  `Estimation basée sur les revenus réels d'un logement comparable sur l'année ${s.year} ` +
  `(${s.monthCount} mois d'activité, ${s.nuits} nuits louées) :\n` +
  `• Chiffre d'affaires brut (séjours + ménage + taxe) : ${formatEUR(s.brut)}\n` +
  `• Prix des séjours (loyers) : ${formatEUR(s.prixSejour)}\n` +
  `• Montant versé par les plateformes : ${formatEUR(s.montantVerse)}\n` +
  `• Revenu généré (base de calcul de la commission) : ${formatEUR(s.revenuGenere)}`;

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

      // On privilégie les lignes de réservation (invoice_data) : elles contiennent
      // les vrais chiffres, y compris quand les totaux du relevé sont incomplets.
      const lines: any[] = Array.isArray(inv.invoice_data) ? inv.invoice_data : [];
      let brut = 0, prixSejour = 0, montantVerse = 0, revenuGenere = 0, commission = 0, nuits = 0;

      if (lines.length > 0) {
        lines.forEach(l => {
          const ps = l.prixSejour || 0;
          const menage = l.fraisMenage || 0;
          const taxe = l.taxeDeSejour || 0;
          brut += l.ca ?? l.originalTotalPaye ?? (ps + menage + taxe);
          prixSejour += ps;
          montantVerse += l.montantVerse || 0;
          revenuGenere += l.revenuGenere || 0;
          commission += l.commissionHelloKeys || 0;
          nuits += l.nuits || 0;
        });
      } else {
        const t = inv.totals || {};
        prixSejour = t.totalPrixSejour || 0;
        brut = prixSejour + (t.totalFraisMenage || 0) + (t.totalTaxeDeSejour || 0);
        montantVerse = t.totalMontantVerse || 0;
        revenuGenere = t.totalRevenuGenere || 0;
        commission = t.totalCommission || 0;
        nuits = t.totalNuits || 0;
      }

      // Relevés manuels : souvent seul le montant versé est renseigné.
      // Le voyageur a payé au moins ce qui a été reversé : on l'utilise comme plancher.
      if (brut < montantVerse) brut = montantVerse;
      if (revenuGenere === 0 && montantVerse > 0) revenuGenere = montantVerse;

      if (!byYear.has(year)) {
        byYear.set(year, { brut: 0, prixSejour: 0, montantVerse: 0, revenuGenere: 0, commission: 0, nuits: 0, months: new Set() });
      }
      const entry = byYear.get(year)!;
      entry.brut += brut;
      entry.prixSejour += prixSejour;
      entry.montantVerse += montantVerse;
      entry.revenuGenere += revenuGenere;
      entry.commission += commission;
      entry.nuits += nuits;
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
                  <p className="text-xs text-muted-foreground">Prix séjour + ménage + taxe</p>
                </div>
                <span className="font-bold">{formatEUR(s.brut)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">Prix séjour (loyers)</p>
                  <p className="text-xs text-muted-foreground">Hors ménage et taxe de séjour</p>
                </div>
                <span className="font-bold">{formatEUR(s.prixSejour)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">Montant versé par les plateformes</p>
                  <p className="text-xs text-muted-foreground">Après commissions OTA et frais de paiement</p>
                </div>
                <span className="font-bold">{formatEUR(s.montantVerse)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">Revenu généré</p>
                  <p className="text-xs text-muted-foreground">
                    Base de commission — commission HK réelle : {formatEUR(s.commission)}
                  </p>
                </div>
                <span className="font-bold">{formatEUR(s.revenuGenere)}</span>
              </div>
            </div>
            <div className="p-3 bg-muted/40 border-t">
              <Button
                type="button"
                className="w-full"
                onClick={() => onApply(Math.round(s.brut), buildDetails(s))}
              >
                <Check className="mr-2 h-4 w-4" /> Utiliser l'année complète {s.year}
              </Button>
            </div>
          </div>
        ))}

        {yearSummaries.length > 0 && (
          <p className="text-xs text-muted-foreground">
            « Utiliser l'année complète » reporte le CA brut dans « Revenu Annuel Estimé » et remplit
            automatiquement les « Détails de l'estimation » avec l'ensemble des chiffres (brut, loyers, versé,
            revenu généré). Le nom du client de référence ({selectedClientName || '...'}) n'est jamais visible par le prospect.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EstimationFromReference;
