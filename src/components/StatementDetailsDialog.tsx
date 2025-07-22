import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SavedInvoice } from '@/lib/admin-api';

interface StatementDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  statement: SavedInvoice | null;
}

const StatementDetailsDialog: React.FC<StatementDetailsDialogProps> = ({ isOpen, onOpenChange, statement }) => {
  if (!statement) return null;

  const clientName = statement.profiles ? `${statement.profiles.first_name} ${statement.profiles.last_name}` : 'Client inconnu';
  const totals = statement.totals;
  const invoiceData = statement.invoice_data;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Détail du Relevé - {clientName}</DialogTitle>
          <DialogDescription>
            Période: {statement.period} | Généré le: {format(parseISO(statement.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portail</TableHead>
                <TableHead>Voyageur</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead>Prix Séjour</TableHead>
                <TableHead>Frais Ménage</TableHead>
                <TableHead>Taxe Séjour</TableHead>
                <TableHead>Montant Versé</TableHead>
                <TableHead>Revenu Net</TableHead>
                <TableHead>Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.portail}</TableCell>
                  <TableCell>{row.voyageur}</TableCell>
                  <TableCell>{row.arrivee}</TableCell>
                  <TableCell>{row.prixSejour.toFixed(2)}€</TableCell>
                  <TableCell>{row.fraisMenage.toFixed(2)}€</TableCell>
                  <TableCell>{row.taxeDeSejour.toFixed(2)}€</TableCell>
                  <TableCell>{row.montantVerse.toFixed(2)}€</TableCell>
                  <TableCell>{row.revenuNet.toFixed(2)}€</TableCell>
                  <TableCell>{row.commissionHelloKeys.toFixed(2)}€</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold bg-secondary">
                <TableCell colSpan={3}>Totaux</TableCell>
                <TableCell>{totals.totalPrixSejour.toFixed(2)}€</TableCell>
                <TableCell>{totals.totalFraisMenage.toFixed(2)}€</TableCell>
                <TableCell>{totals.totalTaxeDeSejour.toFixed(2)}€</TableCell>
                <TableCell>{totals.totalMontantVerse.toFixed(2)}€</TableCell>
                <TableCell>{totals.totalRevenuNet.toFixed(2)}€</TableCell>
                <TableCell>{totals.totalCommission.toFixed(2)}€</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
        <div className="text-right mt-4 p-4 border-t">
          <p className="text-sm">Total Commission: <span className="font-bold">{totals.totalCommission.toFixed(2)}€</span></p>
          <p className="text-sm">Total Frais de Ménage: <span className="font-bold">{totals.totalFraisMenage.toFixed(2)}€</span></p>
          <p className="text-lg font-bold mt-2">Total Facture TTC: <span className="text-green-600">{totals.totalFacture.toFixed(2)}€</span></p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatementDetailsDialog;