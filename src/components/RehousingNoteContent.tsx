import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RehousingNoteContentProps {
  ownerName: string;
  noteType: string;
  amountReceived: number;
  amountToTransfer: number;
  delta: number;
  comment?: string;
  recipientIban: string;
  recipientBic?: string;
  generationDate: Date;
}

const RehousingNoteContent = React.forwardRef<HTMLDivElement, RehousingNoteContentProps>(
  ({ ownerName, noteType, amountReceived, amountToTransfer, delta, comment, recipientIban, recipientBic, generationDate }, ref) => {
    return (
      <div ref={ref} className="p-10 bg-white w-[210mm] h-[297mm]">
        <Card className="shadow-none border-none">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <img src="/logo.png" alt="Hello Keys Logo" className="h-12 mb-4" />
                <CardTitle className="text-2xl">Note de {noteType}</CardTitle>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Généré le {format(generationDate, 'd MMMM yyyy', { locale: fr })}</p>
              </div>
            </div>
            <CardDescription className="pt-6">
              À l'attention de : <strong>{ownerName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-base">
            <p className="mb-6">
              Bonjour,
            </p>
            <p className="mb-6">
              Suite à un(e) <strong>{noteType.toLowerCase()}</strong>, veuillez trouver ci-dessous le détail de l'opération.
            </p>

            <Card className="mb-6 bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Détail financier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Montant perçu :</span> <span className="font-semibold">{amountReceived.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></div>
                  <div className="flex justify-between"><span>Montant à transférer :</span> <span className="font-semibold">{amountToTransfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></div>
                  <div className="flex justify-between border-t pt-2 mt-2 font-bold"><span>Solde (Delta) :</span> <span className={delta >= 0 ? 'text-green-700' : 'text-red-700'}>{delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span></div>
                </div>
              </CardContent>
            </Card>

            {comment && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-lg">Commentaire :</h3>
                <p className="text-sm italic bg-gray-50 p-4 rounded-md border">{comment}</p>
              </div>
            )}
            
            <p className="mb-6">
              Nous vous demandons de bien vouloir procéder à un virement du <strong>montant à transférer</strong> indiqué ci-dessus aux coordonnées bancaires suivantes.
            </p>

            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Informations pour le virement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="font-semibold">IBAN :</p>
                    <p className="font-mono">{recipientIban}</p>
                  </div>
                  {recipientBic && (
                    <div>
                      <p className="font-semibold">BIC :</p>
                      <p className="font-mono">{recipientBic}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="mt-8 text-sm text-gray-700">
              Ce document sert de justificatif pour votre comptabilité. Nous vous remercions de votre coopération.
            </p>
            <p className="mt-12 text-right">
              Cordialement,
              <br />
              L'équipe Hello Keys
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
);

export default RehousingNoteContent;