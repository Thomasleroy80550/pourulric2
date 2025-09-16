import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RehousingNoteContentProps {
  ownerName: string;
  noteType: string;
  amount: number;
  recipientName: string;
  recipientIban: string;
  recipientBic?: string;
  generationDate: Date;
}

const RehousingNoteContent = React.forwardRef<HTMLDivElement, RehousingNoteContentProps>(
  ({ ownerName, noteType, amount, recipientName, recipientIban, recipientBic, generationDate }, ref) => {
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
              Suite à un(e) <strong>{noteType.toLowerCase()}</strong>, nous vous demandons de bien vouloir procéder à un virement d'un montant de <strong>{amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong> aux coordonnées bancaires ci-dessous.
            </p>
            
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Informations pour le virement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="font-semibold">Bénéficiaire :</p>
                    <p>{recipientName}</p>
                  </div>
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