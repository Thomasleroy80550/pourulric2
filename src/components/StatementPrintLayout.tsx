import React from 'react';
import { SavedInvoice } from '@/lib/admin-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StatementPrintLayoutProps {
  statement: SavedInvoice;
}

const StatementPrintLayout: React.FC<StatementPrintLayoutProps> = ({ statement }) => {
  const clientName = statement.profiles ? `${statement.profiles.first_name}` : 'Client';
  const totals = statement.totals;
  const invoiceData = statement.invoice_data;
  const netToPay = totals.totalRevenuNet - totals.totalCommission - totals.totalFraisMenage;

  return (
    <div id="statement-to-print" className="bg-white text-black p-8 font-sans a4-container">
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src="/logo.png" alt="Hello Keys Logo" className="w-40 h-auto mb-4" />
        </div>
        <div className="text-right">
          <p className="font-semibold">Hello Keys</p>
          <p className="text-sm text-gray-500">1 Rue Carnot, 80550 Le Crotoy</p>
          <p className="text-sm text-gray-500">21 Rte de Waben, 62600 Groffliers</p>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold">Bonjour {clientName},</h1>
        <p className="text-gray-600 text-lg">Voici votre relevé pour la période de {statement.period}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Summary Card */}
        <div className="bg-gray-50 p-6 rounded-lg border">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Total des séjours (net de commission plateforme)</p>
              <p className="font-semibold text-lg">{totals.totalRevenuNet.toFixed(2)}€</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Total des frais (Ménage + Commission HK)</p>
              <p className="font-semibold text-lg text-red-600">- {totals.totalFacture.toFixed(2)}€</p>
            </div>
            <hr className="my-2 border-dashed" />
            <div className="flex justify-between items-center text-xl">
              <p className="font-bold">Montant net à vous verser</p>
              <p className="font-extrabold text-2xl text-green-600">{netToPay.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        {/* Calculation Card */}
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Calcul du montant net</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Revenu net total des séjours</p>
              <p className="font-semibold">{totals.totalRevenuNet.toFixed(2)}€</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Commission Hello Keys (26%)</p>
              <p className="font-semibold text-red-600">- {totals.totalCommission.toFixed(2)}€</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Total frais de ménage</p>
              <p className="font-semibold text-red-600">- {totals.totalFraisMenage.toFixed(2)}€</p>
            </div>
            <hr className="my-2 border-dashed" />
            <div className="flex justify-between items-center">
              <p className="font-bold">Net à payer</p>
              <p className="font-bold text-lg">{netToPay.toFixed(2)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reservations Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Détail des réservations</h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead>Portail</TableHead>
                <TableHead>Voyageur</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead className="text-right">Prix Séjour</TableHead>
                <TableHead className="text-right">Frais Ménage</TableHead>
                <TableHead className="text-right">Taxe Séjour</TableHead>
                <TableHead className="text-right">Revenu Net</TableHead>
                <TableHead className="text-right">Commission HK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceData.map((row, index) => (
                <TableRow key={index} className="even:bg-gray-50">
                  <TableCell className="font-medium">{row.portail}</TableCell>
                  <TableCell>{row.voyageur}</TableCell>
                  <TableCell>{row.arrivee}</TableCell>
                  <TableCell className="text-right">{row.prixSejour.toFixed(2)}€</TableCell>
                  <TableCell className="text-right">{row.fraisMenage.toFixed(2)}€</TableCell>
                  <TableCell className="text-right">{row.taxeDeSejour.toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-semibold">{row.revenuNet.toFixed(2)}€</TableCell>
                  <TableCell className="text-right text-red-600">(-{row.commissionHelloKeys.toFixed(2)}€)</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default StatementPrintLayout;