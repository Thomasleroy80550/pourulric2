import React from 'react';
import CGUV_HTML_CONTENT from '@/assets/cguv.html?raw';

const CguvPrintLayout: React.FC = () => {
  // Nettoyer le contenu HTML en supprimant toutes les déclarations background-color
  const cleanedHtmlContent = CGUV_HTML_CONTENT.replace(/background-color: #[0-9a-fA-F]{3,6}(; background-color: rgba\([0-9\., ]+\))?/g, '');
  const finalCleanedHtmlContent = cleanedHtmlContent.replace(/background-color: rgba\([0-9\., ]+\)/g, '');

  return (
    <div id="cguv-to-print" className="p-8 bg-white text-black">
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: finalCleanedHtmlContent }} />
      <div className="mt-16 pt-8 border-t">
        <h3 className="text-lg font-bold mb-4">Signature du Client</h3>
        <p className="mb-12">
          Je soussigné(e), ...................................................................., reconnais avoir lu, compris et accepté l'intégralité des Conditions Générales d'Utilisation et de Vente ci-dessus.
        </p>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p>Fait à : ....................................................</p>
            <p className="mt-8">Le : ..... / ..... / ..........</p>
          </div>
          <div>
            <p>Signature (précédée de la mention "Lu et approuvé") :</p>
            <div className="h-24 border-b border-gray-400 mt-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CguvPrintLayout;