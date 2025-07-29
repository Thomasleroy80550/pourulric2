import React, { useState } from 'react';
import { UserProfile, updateProfile } from '@/lib/profile-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { uploadFiles } from '@/lib/storage-api';
import { toast } from 'sonner';
import { ShieldCheck, ShieldX, Hourglass, FileUp, AlertCircle } from 'lucide-react';

interface KycFormProps {
  profile: UserProfile;
  onUpdate: () => void; // Callback to refresh profile data
}

const KycForm: React.FC<KycFormProps> = ({ profile, onUpdate }) => {
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityFile || !addressFile) {
      toast.error("Veuillez fournir les deux documents.");
      return;
    }
    setLoading(true);

    try {
      const filesToUpload = new DataTransfer();
      filesToUpload.items.add(identityFile);
      filesToUpload.items.add(addressFile);

      // Note: The storage API needs to handle file naming to distinguish them.
      // For this example, we assume the upload function can return distinct URLs.
      // A better implementation would upload them with specific names.
      const [identityUrl, addressUrl] = await uploadFiles(filesToUpload.files, 'kyc-documents', profile.id);

      await updateProfile({
        kyc_status: 'pending_review',
        kyc_documents: {
          identity: identityUrl,
          address: addressUrl,
        },
      });

      toast.success("Documents soumis pour vérification !");
      onUpdate(); // Refresh profile page
    } catch (error: any) {
      console.error("Error submitting KYC:", error);
      toast.error(`Erreur lors de la soumission : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (profile.kyc_status) {
      case 'verified':
        return <Badge variant="success" className="flex items-center gap-2"><ShieldCheck size={16} /> Vérifié</Badge>;
      case 'pending_review':
        return <Badge variant="secondary" className="flex items-center gap-2"><Hourglass size={16} /> En cours d'examen</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-2"><ShieldX size={16} /> Rejeté</Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-2"><AlertCircle size={16} /> Non vérifié</Badge>;
    }
  };

  const isVerified = profile.kyc_status === 'verified';
  const isPending = profile.kyc_status === 'pending_review';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">Vérification d'Identité (KYC)</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>Pour des raisons de sécurité, veuillez téléverser les documents requis.</CardDescription>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <Alert variant="success">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Profil Vérifié</AlertTitle>
            <AlertDescription>
              Votre identité a été vérifiée avec succès. Aucune autre action n'est requise.
            </AlertDescription>
          </Alert>
        ) : isPending ? (
          <Alert>
            <Hourglass className="h-4 w-4" />
            <AlertTitle>Examen en cours</AlertTitle>
            <AlertDescription>
              Vos documents sont en cours de vérification. Nous vous informerons du résultat prochainement.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {profile.kyc_status === 'rejected' && (
              <Alert variant="destructive">
                <ShieldX className="h-4 w-4" />
                <AlertTitle>Vérification Échouée</AlertTitle>
                <AlertDescription>
                  Vos documents n'ont pas pu être validés. Veuillez soumettre de nouveaux documents valides.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="identity-doc">Pièce d'identité (Passeport, CNI)</Label>
              <Input
                id="identity-doc"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setIdentityFile(e.target.files ? e.target.files[0] : null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-doc">Justificatif de domicile (- de 3 mois)</Label>
              <Input
                id="address-doc"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setAddressFile(e.target.files ? e.target.files[0] : null)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Hourglass className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {loading ? 'Envoi en cours...' : 'Soumettre pour vérification'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default KycForm;