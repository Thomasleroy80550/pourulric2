import React from 'react';
import { SavedInvoice } from '@/lib/admin-api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';

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
  const totalFraisMenage = totals.totalFraisMenage || 0; // This is from reservations
  const totalTaxeDeSejour = totals.totalTaxeDeSejour || 0;
  const ownerCleaningFee = totals.ownerCleaningFee || 0; // New field
  
  // Calculate totalFacture with a fallback for older records that might not have this field
  const totalFacture = totals.totalFacture !== undefined ? totals.totalFacture : (totalCommission + totalFraisMenage + ownerCleaningFee); // Updated calculation
  
  // The final, correct calculation for the owner's payout, starting from the total amount transferred
  const netToPay = totalMontantVerse - totalTaxeDeSejour - totalFraisMenage - totalCommission - ownerCleaningFee; // Updated calculation

  const transferDetails = totals.transferDetails;

  // Calculate totals for the "Détail des réservations" table
  const sumPrixSejour = invoiceData.reduce((sum, row) => sum + row.prixSejour, 0);
  const sumFraisMenage = invoiceData.reduce((sum, row) => sum + row.fraisMenage, 0);
  const sumTaxeDeSejour = invoiceData.reduce((sum, row) => sum + row.taxeDeSejour, 0);
  const sumMontantVerse = invoiceData.reduce((sum, row) => sum + row.montantVerse, 0);
  const sumRevenuGenere = invoiceData.reduce((sum, row) => sum + row.revenuGenere, 0);
  const sumCommissionHelloKeys = invoiceData.reduce((sum, row) => sum + row.commissionHelloKeys, 0);
  const sumOriginalFraisPaiement = invoiceData.reduce((sum, row) => sum + row.originalFraisPaiement, 0);
  const sumOtaCommission = invoiceData.reduce((sum, row) => sum + row.originalCommissionPlateforme, 0); // Corrected to use originalCommissionPlateforme

  return (
    <div id="statement-to-print" className="bg-white text-black p-8 font-sans">
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
        <h1 className="text-4xl font-bold">Bonjour {clientName}, </h1>
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
              <p className="font-semibold text-lg text-red-600">- {totalFacture.toFixed(2)}€ TTC</p>
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
            {transferDetails?.deductionInfo?.deducted && Math.abs(netToPay) < 0.01 && (
              <p className="text-sm text-gray-500 mt-2">
                Comme Hello Keys perçoit les loyers et que la facture a été déduite, vous n'avez rien à nous régler.
              </p>
            )}
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
            {ownerCleaningFee > 0 && ( // Display only if greater than 0
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Frais de ménage propriétaire</p>
                <p className="font-semibold">{ownerCleaningFee.toFixed(2)}€</p>
              </div>
            )}
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
        <div className="border rounded-lg">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="min-w-[30px] p-1">Portail</TableHead>
                <TableHead className="min-w-[50px] p-1">Client</TableHead>
                <TableHead className="min-w-[50px] p-1">Arrivée</TableHead>
                <TableHead className="text-right min-w-[60px] p-1">Prix Séjour</TableHead>
                <TableHead className="text-right min-w-[60px] p-1">Frais Ménage</TableHead>
                <TableHead className="text-right min-w-[60px] p-1">Taxe Séjour</TableHead>
                <TableHead className="text-right min-w-[60px] p-1">Frais Paiement</TableHead>
                <TableHead className="text-right min-w-[70px] p-1">Commission OTA</TableHead>
                <TableHead className="text-right min-w-[60px] p-1">Montant Versé</TableHead>
                <TableHead className="text-right min-w-[60px] p-1">Revenu Généré</TableHead>
                <TableHead className="text-right min-w-[70px] p-1">Commission HK</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceData.map((row, index) => (
                <TableRow key={index} className="even:bg-gray-50">
                  <TableCell className="font-medium py-2 px-1">{row.portail}</TableCell>
                  <TableCell className="py-2 px-1">{row.voyageur}</TableCell>
                  <TableCell className="py-2 px-1">{row.arrivee}</TableCell>
                  <TableCell className="text-right py-2 px-1">{row.prixSejour.toFixed(2)}€</TableCell>
                  <TableCell className="text-right py-2 px-1">{row.fraisMenage.toFixed(2)}€</TableCell>
                  <TableCell className="text-right py-2 px-1">{row.taxeDeSejour.toFixed(2)}€</TableCell>
                  <TableCell className="text-right py-2 px-1">{row.originalFraisPaiement.toFixed(2)}€</TableCell>
                  <TableCell className="text-right py-2 px-1">{row.originalCommissionPlateforme.toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-semibold py-2 px-1">{row.montantVerse.toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-semibold py-2 px-1">{row.revenuGenere.toFixed(2)}€</TableCell>
                  <TableCell className="text-right text-red-600 py-2 px-1">(-{row.commissionHelloKeys.toFixed(2)}€)</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-gray-100 font-bold">
                <TableCell colSpan={3} className="py-2 px-1">Totaux</TableCell>
                <TableCell className="text-right py-2 px-1">{sumPrixSejour.toFixed(2)}€</TableCell>
                <TableCell className="text-right py-2 px-1">{sumFraisMenage.toFixed(2)}€</TableCell>
                <TableCell className="text-right py-2 px-1">{sumTaxeDeSejour.toFixed(2)}€</TableCell>
                <TableCell className="text-right py-2 px-1">{sumOriginalFraisPaiement.toFixed(2)}€</TableCell>
                <TableCell className="text-right py-2 px-1">{sumOtaCommission.toFixed(2)}€</TableCell>
                <TableCell className="text-right py-2 px-1">{sumMontantVerse.toFixed(2)}€</TableCell>
                <TableCell className="text-right py-2 px-1">{sumRevenuGenere.toFixed(2)}€</TableCell>
                <TableCell className="text-right text-red-600 py-2 px-1">(-{sumCommissionHelloKeys.toFixed(2)}€)</TableCell>
              </TableRow>
            </TableFooter>
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
            {Object.entries(transferDetails.sources).map(([source, data]: [string, any]) => {
              if (data.reservations.length === 0) return null;

              const rawSubtotal = data.reservations.reduce((sum: number, r: any) => sum + r.montantVerse, 0);

              return (
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
                          <TableCell>Sous-total (montant à virer)</TableCell>
                          <TableCell className="text-right">{rawSubtotal.toFixed(2)}€</TableCell>
                        </TableRow>
                        {transferDetails.deductionInfo?.deducted && transferDetails.deductionInfo?.source === source ? (
                          <>
                            <TableRow className="font-bold bg-gray-100">
                              <TableCell>Déduction facture Hello Keys</TableCell>
                              <TableCell className="text-right text-red-600">- {totalFacture.toFixed(2)}€</TableCell>
                            </TableRow>
                            <TableRow className="font-bold bg-gray-100">
                              <TableCell>Virement en transit vers votre compte</TableCell>
                              <TableCell className="text-right text-green-600">{(rawSubtotal - totalFacture).toFixed(2)}€</TableCell>
                            </TableRow>
                          </>
                        ) : (
                          <TableRow className="font-bold bg-gray-100">
                            <TableCell>Total à virer</TableCell>
                            <TableCell className="text-right">{rawSubtotal.toFixed(2)}€</TableCell>
                          </TableRow>
                        )}
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              );
            })}
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

      <div className="mt-8 text-xs text-gray-500 border-t pt-4">
        <p className="font-semibold mb-2">Légende :</p>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="font-bold">Total perçu des plateformes :</span> Somme des montants versés par les plateformes de réservation.</li>
          <li><span className="font-bold">Total de notre facture :</span> Montant total facturé par Hello Keys pour ses services.</li>
          <li><span className="font-bold">Taxes de séjour collectées :</span> Taxes collectées auprès des voyageurs et reversées aux autorités.</li>
          <li><span className="font-bold">Résultat :</span> Montant net qui vous sera versé (Total perçu - Facture - Taxes).</li>
          <li><span className="font-bold">Commission Hello Keys :</span> Nos frais de gestion pour l'ensemble des services.</li>
          <li><span className="font-bold">Total frais de ménage :</span> Coût total des prestations de ménage après chaque départ.</li>
          <li><span className="font-bold">Frais de ménage propriétaire :</span> Frais de ménage spécifiques facturés au propriétaire.</li>
          <li><span className="font-bold">Détail des réservations :</span> Tableau récapitulatif de chaque réservation et ses montants associés.</li>
          <li><span className="font-bold">Virements à effectuer :</span> Section détaillant les flux financiers vers votre compte.</li>
        </ul>
      </div>
    </div>
  );
};

export default StatementPrintLayout;