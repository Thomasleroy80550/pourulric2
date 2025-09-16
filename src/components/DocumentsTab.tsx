import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getDocumentsForUser, AdminDocument } from '@/lib/documents-api';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils'; // Import cn utility

interface DocumentsTabProps {
  className?: string; // Add className prop
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ className }) => {
  const { session } = useSession();
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      const fetchDocuments = async () => {
        setLoading(true);
        try {
          const userDocs = await getDocumentsForUser(session.user.id);
          setDocuments(userDocs);
        } catch (error) {
          toast.error("Erreur lors de la récupération de vos documents.");
        } finally {
          setLoading(false);
        }
      };
      fetchDocuments();
    }
  }, [session]);

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('secure_documents').download(filePath);
    if (error) {
      toast.error("Erreur lors du téléchargement du fichier.", { description: error.message });
      return;
    }
    const blob = new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Extract the file extension from the file_path
    const fileExtension = filePath.split('.').pop();
    // Construct the download name with the original file name and its extension
    const downloadName = fileExtension ? `${fileName}.${fileExtension}` : fileName;

    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Card className={cn("w-full", className)}> {/* Apply className here */}
      <CardHeader>
        <CardTitle>Mon Coffre-Fort</CardTitle>
        <CardDescription>Retrouvez ici tous les documents importants partagés par votre gestionnaire.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du document</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Date d'ajout</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.category || 'N/A'}</TableCell>
                    <TableCell>
                      {doc.created_at && isValid(new Date(doc.created_at))
                        ? format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: fr })
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(doc.file_path, doc.name)}>
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Vous n'avez aucun document dans votre coffre-fort pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsTab;