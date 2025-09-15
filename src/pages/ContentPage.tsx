import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { getPageBySlug, Page } from '@/lib/page-api';

const ContentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [pageContent, setPageContent] = useState<Page | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setError("Aucun slug de page fourni.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const fetchedPage = await getPageBySlug(slug);
        if (fetchedPage) {
          setPageContent(fetchedPage);
        } else {
          setError("Page non trouvée ou non publiée.");
        }
      } catch (err: any) {
        setError(`Erreur lors du chargement de la page : ${err.message}`);
        console.error("Error fetching content page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <p className="text-gray-500">Chargement de la page...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (!pageContent) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <Alert>
            <AlertTitle>Page introuvable</AlertTitle>
            <AlertDescription>La page que vous recherchez n'existe pas ou n'est pas publiée.</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{pageContent.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none"> {/* Using prose for basic markdown-like styling */}
              <p>{pageContent.content}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ContentPage;