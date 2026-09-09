import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SavedInvoice } from '@/lib/admin-api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface StatementFigures {
  statement: SavedInvoice;
  montantVerse: number;
  taxeDeSejour: number;
  fraisMenage: number;
  commission: number;
  netProprio: number;
  totalFacture: number;
}

export const getStatementFigures = (statement: SavedInvoice): StatementFigures => {
  const totals: any = statement.totals || {};
  const montantVerse = Number(totals.totalMontantVerse) || 0;
  const taxeDeSejour = Number(totals.totalTaxeDeSejour) || 0;
  const fraisMenage = (Number(totals.totalFraisMenage) || 0) + (Number(totals.ownerCleaningFee) || 0);
  const commission = Number(totals.totalCommission) || 0;
  const netProprio = montantVerse - taxeDeSejour - fraisMenage - commission;
  const totalFacture = Number(totals.totalFacture) || 0;
  return { statement, montantVerse, taxeDeSejour, fraisMenage, commission, netProprio, totalFacture };
};

interface MonthlyStatementTotalsProps {
  statements: SavedInvoice[];
  monthLabel: string;
  getAgency?: (statement: SavedInvoice) => string;
}

const MonthlyStatementTotals: React.FC<MonthlyStatementTotalsProps> = ({ statements, monthLabel, getAgency }) => {
  const rows = statements.map(getStatementFigures);

  const grand = rows.reduce(
    (acc, r) => ({
      montantVerse: acc.montantVerse + r.montantVerse,
      taxeDeSejour: acc.taxeDeSejour + r.taxeDeSejour,
      fraisMenage: acc.fraisMenage + r.fraisMenage,
      commission: acc.commission + r.commission,
      netProprio: acc.netProprio + r.netProprio,
      totalFacture: acc.totalFacture + r.totalFacture,
    }),
    { montantVerse: 0, taxeDeSejour: 0, fraisMenage: 0, commission: 0, netProprio: 0, totalFacture: 0 }
  );

  return (
    <Card className="shadow-md border-[hsl(var(--primary))]/30">
      <CardHeader>
        <CardTitle className="text-lg">
          Totaux des relevés de la période {monthLabel} ({rows.length} relevé(s))
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Détail ligne par ligne de tous les relevés de cette période, avec le total général en bas du tableau.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-gray-500 py-6">Aucun relevé émis sur ce mois.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  {getAgency && <TableHead>Agence</TableHead>}
                  <TableHead>Période</TableHead>
                  <TableHead>Émis le</TableHead>
                  <TableHead className="text-right">Montant versé</TableHead>
                  <TableHead className="text-right">Taxe de séjour</TableHead>
                  <TableHead className="text-right">Frais de ménage</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Net propriétaire</TableHead>
                  <TableHead className="text-right">Montant facturé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const clientName = r.statement.profiles
                    ? `${r.statement.profiles.first_name} ${r.statement.profiles.last_name}`
                    : 'Client supprimé';
                  return (
                    <TableRow key={r.statement.id}>
                      <TableCell className="font-medium">{clientName}</TableCell>
                      {getAgency && <TableCell>{getAgency(r.statement) || 'Sans agence'}</TableCell>}
                      <TableCell>{r.statement.period}</TableCell>
                      <TableCell>
                        {format(parseISO(r.statement.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.montantVerse)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.taxeDeSejour)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.fraisMenage)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.commission)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.netProprio)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{fmt(r.totalFacture)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                    <TableCell colSpan={getAgency ? 4 : 3}>Total de la période</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(grand.montantVerse)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(grand.taxeDeSejour)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(grand.fraisMenage)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(grand.commission)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(grand.netProprio)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(grand.totalFacture)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyStatementTotals;
