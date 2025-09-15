import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, Eye, Trash2, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UserProfile, updateProfile, KycDocument } from '@/lib/profile-api'; // Import KycDocument
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/components/SessionContextProvider';

// Removed local KycDocument interface as it's now imported

interface KycFormProps {
  profile: UserProfile;
  onUpdate: () => void;
  className?: string;
}

const KycForm: React.FC<KycFormProps> = ({ profile, onUpdate, className }) => {
  const { session } = useSession();
  const [kycStatus, setKycStatus] = useState(profile.kyc_status || 'not_verified');
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>(Array.isArray(profile.kyc_documents) ? profile.kyc_documents : []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKycStatus(profile.kyc_status || 'not_verified');
    setKycDocuments(Array.isArray(profile.kyc_documents) ? profile.kyc_documents : []);
  }, [profile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Le fichier est trop volumineux. La taille maximale est de 5 Mo.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const filePath = `${session?.user?.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('kyc_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });

    if (error) {
      toast.error("Erreur lors de l'upload du fichier: " + error.message);
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    const newDoc: KycDocument = {
      name: file.name,
      path: data.path,
      uploaded_at: new Date().toISOString(),
      status: 'pending',
    };

    const updatedDocuments = [...kycDocuments, newDoc];
    setKycDocuments(updatedDocuments);

    try {
      await updateProfile({ kyc_documents: updatedDocuments });
      toast.success("Document uploadé avec succès et mis à jour !");
      onUpdate(); // Re-fetch profile to ensure consistency
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour du profil avec le document: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (docPath: string) => {
    const { error: deleteError } = await supabase.storage
      .from('kyc_documents')
      .remove([docPath]);

    if (deleteError) {
      toast.error("Erreur lors de la suppression du fichier: " + deleteError.message);
      return;
    }

    const updatedDocuments = kycDocuments.filter(doc => doc.path !== docPath);
    setKycDocuments(updatedDocuments);

    try {
      await updateProfile({ kyc_documents: updatedDocuments });
      toast.success("Document supprimé avec succès !");
      onUpdate();
    } catch (err: any) {
      toast.error("Erreur lors de la mise à jour du profil après suppression: " + err.message);
    }
  };

  const getDocumentUrl = (path: string) => {
    const { data } = supabase.storage.from('kyc_documents').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck /> KYC / Vérification</CardTitle>
        <CardDescription>Gérez vos documents de vérification d'identité (KYC).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Statut de vérification</Label>
          <Badge
            className={cn(
              "px-3 py-1 text-sm font-medium",
              kycStatus === 'verified' && "bg-green-500 text-white",
              kycStatus === 'pending' && "bg-yellow-500 text-white",
              kycStatus === 'rejected' && "bg-red-500 text-white",
              kycStatus === 'not_verified' && "bg-gray-500 text-white",
            )}
          >
            {kycStatus === 'verified' && "Vérifié"}
            {kycStatus === 'pending' && "En attente de vérification"}
            {kycStatus === 'rejected' && "Rejeté"}
            {kycStatus === 'not_verified' && "Non vérifié"}
          </Badge>
          {kycStatus === 'rejected' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Vérification rejetée</AlertTitle>
              <AlertDescription>
                Vos documents ont été rejetés. Veuillez contacter le support pour plus d'informations ou téléchargez de nouveaux documents.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <Label>Documents téléchargés</Label>
          {kycDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document téléchargé pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {kycDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span>{doc.name}</span>
                    <Badge
                      className={cn(
                        "ml-2 px-2 py-0.5 text-xs",
                        doc.status === 'pending' && "bg-yellow-500 text-white",
                        doc.status === 'approved' && "bg-green-500 text-white",
                        doc.status === 'rejected' && "bg-red-500 text-white",
                      )}
                    >
                      {doc.status === 'pending' && "En attente"}
                      {doc.status === 'approved' && "Approuvé"}
                      {doc.status === 'rejected' && "Rejeté"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={getDocumentUrl(doc.path)} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-1" /> Voir
                      </a>
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteDocument(doc.path)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Télécharger un nouveau document</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            ref={fileInputRef}
            disabled={isUploading}
          />
          {isUploading && (
            <Progress value={uploadProgress} className="w-full mt-2" />
          )}
          <p className="text-sm text-muted-foreground">Formats acceptés : PDF, JPG, JPEG, PNG. Taille maximale : 5 Mo.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default KycForm;