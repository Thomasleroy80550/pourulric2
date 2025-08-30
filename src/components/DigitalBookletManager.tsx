import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooklet, saveBooklet } from '@/lib/booklet-api';
import { toast } from 'sonner';
import DigitalBookletForm, { TBookletSchema } from '@/components/DigitalBookletForm';
import { Loader2, QrCode } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import BookletPreview from '@/components/BookletPreview';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export default function DigitalBookletManager() {
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
  
  const bookletUrl = bookletData ? `${window.location.origin}/booklet/preview` : '';

  if (isLoadingBooklet) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
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
        {bookletData && (
          <Card className="mt-8">
            <CardHeader><CardTitle>Votre QR Code</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center space-y-2">
              <QRCode value={bookletUrl} size={128} />
              <p className="text-sm text-center text-muted-foreground">Scannez ce code pour voir votre livret numérique.</p>
              <Button variant="link" size="sm" onClick={() => toast.info("Bientôt disponible !", { description: "Le lien public pour votre livret sera bientôt fonctionnel." })}>Copier le lien</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}