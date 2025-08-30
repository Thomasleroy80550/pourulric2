import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getDocuments, downloadDocument, Document } from '@/lib/documents-api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const userDocuments = await getDocuments();
        setDocuments(userDocuments);
      } catch (err: any) {
        setError(err.message);
        toast.error("Erreur lors du chargement des documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await downloadDocument(doc.file_path);
      if (error) throw error;
      if (data) {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`Téléchargement de "${doc.name}" en cours.`);
      }
    } catch (err: any) {
      toast.error(`Erreur lors du téléchargement du fichier: ${err.message}`);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (documents.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <FileText className="mx-auto h-12 w-12" />
          <h3 className="mt-2 text-lg font-medium">Aucun document disponible</h3>
          <p className="mt-1 text-sm">Votre coffre-fort est actuellement vide.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom du document</TableHead>
            <TableHead className="hidden md:table-cell">Catégorie</TableHead>
            <TableHead className="hidden sm:table-cell">Date d'ajout</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.name}</TableCell>
              <TableCell className="hidden md:table-cell">{doc.category || 'Général'}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {format(new Date(doc.created_at), 'dd MMMM yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Télécharger</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Mon Coffre-Fort</h1>
        <Card>
          <CardHeader>
            <CardTitle>Mes Documents</CardTitle>
            <CardDescription>Retrouvez ici tous les documents importants mis à votre disposition.</CardDescription>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DocumentsPage;