import React from 'react';
import { SavedInvoice } from '@/lib/admin-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import logo from '../assets/logo.png';
interface StatementPrintLayoutProps {
  statement: SavedInvoice;
}

const StatementPrintLayout: React.FC<StatementPrintLayoutProps> = ({ statement }) => {
  const clientName = statement.profiles ? `${statement.profiles.first_name}` : 'Client';
  const totals = statement.totals;
  const invoiceData = statement.invoice_data;

  // Defensive checks for all needed values
  const totalMontantVerse = totals.totalMontantVerse || 0;
  const totalCommission = totals.totalCommission || 0;
  const totalFraisMenage = totals.totalFraisMenage || 0;
  const totalTaxeDeSejour = totals.totalTaxeDeSejour || 0;
  
  // Calculate totalFacture with a fallback for older records that might not have this field
  const totalFacture = totals.totalFacture !== undefined ? totals.totalFacture : (totalCommission + totalFraisMenage);
  
  // The final, correct calculation for the owner's payout, starting from the total amount transferred
  const netToPay = totalMontantVerse - totalTaxeDeSejour - totalFraisMenage - totalCommission;

  const transferDetails = totals.transferDetails;

  return (
    <div id="statement-to-print" className="bg-white text-black p-8 font-sans">
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src={logo} alt="Hello Keys Logo" className="w-40 h-auto mb-4" />
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
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Résumé de votre relevé</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Total perçu des plateformes</p>
              <p className="font-semibold text-lg">{totalMontantVerse.toFixed(2)}€</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Total de notre facture</p>
              <p className="font-semibold text-lg text-red-600">- {totalFacture.toFixed(2)}€</p>
            </div>
            {totalTaxeDeSejour > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Taxes de séjour collectées</p>
                <p className="font-semibold text-lg text-red-600">- {totalTaxeDeSejour.toFixed(2)}€</p>
              </div>
            )}
            <hr className="my-2 border-dashed" />
            <div className="flex justify-between items-center text-xl">
              <p className="font-bold">Résultat</p>
              <p className="font-extrabold text-2xl text-green-600">{netToPay.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        {/* Calculation Card */}
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Détail de notre facture</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Commission Hello Keys</p>
              <p className="font-semibold">{totalCommission.toFixed(2)}€</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Total frais de ménage</p>
              <p className="font-semibold">{totalFraisMenage.toFixed(2)}€</p>
            </div>
            <hr className="my-2 border-dashed" />
            <div className="flex justify-between items-center">
              <p className="font-bold">Total Facture Hello Keys</p>
              <p className="font-bold text-lg">{totalFacture.toFixed(2)}€</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Reservations Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Détail des réservations</h2>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead>Portail</TableHead>
                <TableHead>Voyageur</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead className="text-right">Prix Séjour</TableHead>
                <TableHead className="text-right">Frais Ménage</TableHead>
                <TableHead className="text-right">Taxe Séjour</TableHead>
                <TableHead className="text-right">Montant Versé</TableHead>
                <TableHead className="text-right">Revenu Généré</TableHead>
                <TableHead className="text-right">Commission</TableHead>
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
                  <TableCell className="text-right font-semibold">{row.montantVerse.toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-semibold">{row.revenuGenere.toFixed(2)}€</TableCell>
                  <TableCell className="text-right text-red-600">(-{row.commissionHelloKeys.toFixed(2)}€)</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Transfers Section */}
      {transferDetails && transferDetails.sources && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Virements à effectuer</h2>
          <p className="text-sm italic text-gray-600 mb-4">
            Le relevé permet de réaliser vos virements, il est donc normal de recevoir votre relevé facture avant de percevoir vos fonds.
          </p>
          <div className="space-y-6">
            {Object.entries(transferDetails.sources).map(([source, data]: [string, any]) => data.reservations.length > 0 && (
              <div key={source}>
                <h3 className="font-semibold mb-2 text-gray-800">Loyers encaissés via {source.charAt(0).toUpperCase() + source.slice(1)}</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead>Voyageur</TableHead>
                        <TableHead className="text-right">Montant à virer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.reservations.map((r: any, i: number) => (
                        <TableRow key={i} className="even:bg-gray-50">
                          <TableCell>{r.voyageur}</TableCell>
                          <TableCell className="text-right">{r.montantVerse.toFixed(2)}€</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="font-bold bg-gray-100">
                        <TableCell>Total à virer ({transferDetails.deductionInfo?.deducted && transferDetails.deductionInfo?.source === source ? "facture déduite" : ""})</TableCell>
                        <TableCell className="text-right">{data.total.toFixed(2)}€</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Comment Section */}
      {statement.admin_comment && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Commentaire de votre gestionnaire</h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <p className="text-gray-700 whitespace-pre-wrap">{statement.admin_comment}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementPrintLayout;