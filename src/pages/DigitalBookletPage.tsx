import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooklet, saveBooklet } from '@/lib/booklet-api';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DigitalBookletForm, { TBookletSchema } from '@/components/DigitalBookletForm';
import { Loader2, QrCode, Printer } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import BookletPreview from '@/components/BookletPreview';

type Option = 'digital' | 'print';

export default function DigitalBookletPage() {
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [previewData, setPreviewData] = useState<TBookletSchema | null>(null);
  const queryClient = useQueryClient();

  const { data: bookletData, isLoading: isLoadingBooklet } = useQuery({
    queryKey: ['digital-booklet'],
    queryFn: getBooklet,
  });

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: saveBooklet,
    onSuccess: () => {
      toast.success("Livret d'accueil enregistré avec succès !");
      queryClient.invalidateQueries({ queryKey: ['digital-booklet'] });
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement.", { description: error.message });
    },
  });

  const handleSave = async (data: TBookletSchema) => {
    await save(data);
  };

  const handlePrintOrder = () => {
    toast.info("Bientôt disponible !", {
      description: "La commande de livrets imprimés sera bientôt activée.",
    });
  };
  
  const bookletUrl = bookletData ? `${window.location.origin}/booklet/preview` : '';

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Création de votre Livret d'Accueil</h1>
          <p className="text-muted-foreground">Choisissez une formule et remplissez les informations pour vos voyageurs.</p>
        </header>

        {!selectedOption && (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedOption('digital')}>
              <CardHeader>
                <QrCode className="w-10 h-10 mb-4 text-primary" />
                <CardTitle>Livret Numérique</CardTitle>
                <CardDescription>Gratuit</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Accessible via QR code</li>
                  <li>Modifiable à tout moment</li>
                  <li>Écologique et moderne</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedOption('print')}>
              <CardHeader>
                <Printer className="w-10 h-10 mb-4 text-primary" />
                <CardTitle>Livret Imprimé et Numérique</CardTitle>
                <CardDescription>29,99€ TTC</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Un livret format A4 de haute qualité livré chez vous</li>
                  <li>Inclus la version numérique avec QR code</li>
                  <li>Parfait pour une touche professionnelle</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedOption && (
          <div>
            <Button variant="outline" onClick={() => setSelectedOption(null)} className="mb-4">Changer de formule</Button>
            
            {isLoadingBooklet ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                <div className="xl:col-span-3">
                  <DigitalBookletForm 
                    initialData={bookletData} 
                    onSave={handleSave} 
                    isSaving={isSaving}
                    onDataChange={setPreviewData}
                  />
                </div>
                <div className="xl:col-span-2">
                  <BookletPreview data={previewData ?? bookletData} />
                  <div className="space-y-4 mt-8">
                    {selectedOption === 'digital' && bookletData && (
                      <Card>
                        <CardHeader><CardTitle>Votre QR Code</CardTitle></CardHeader>
                        <CardContent className="flex flex-col items-center space-y-2">
                          <QRCode value={bookletUrl} size={128} />
                          <p className="text-sm text-center text-muted-foreground">Scannez ce code pour voir votre livret numérique.</p>
                          <Button variant="link" size="sm" onClick={() => toast.info("Bientôt disponible !", { description: "Le lien public pour votre livret sera bientôt fonctionnel." })}>Copier le lien</Button>
                        </CardContent>
                      </Card>
                    )}
                    {selectedOption === 'print' && (
                       <Card>
                        <CardHeader><CardTitle>Finaliser la commande</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <p>Une fois votre livret enregistré, vous pourrez commander la version imprimée.</p>
                          <Button onClick={handlePrintOrder} className="w-full" disabled={!bookletData}>
                            <Printer className="mr-2 h-4 w-4" /> Commander l'impression (29,99€)
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}