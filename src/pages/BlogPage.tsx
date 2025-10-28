import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Terminal } from 'lucide-react';
import { getBlogPosts, BlogPost } from '@/lib/blog-api';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

const BlogPage: React.FC = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const posts = await getBlogPosts();
        setBlogPosts(posts);
      } catch (err: any) {
        setError("Impossible de charger les articles de blog. Veuillez réessayer plus tard.");
        toast.error("Erreur lors du chargement des articles de blog.");
        console.error("Failed to fetch blog posts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement des articles de blog...</p>
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

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Notre Blog</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Retrouvez ici nos articles et conseils pour optimiser la gestion de vos propriétés et améliorer l'expérience de vos voyageurs.
        </p>

        {/*
          Extrait lisible: on retire le HTML pour afficher un résumé propre.
        */}
        {/*
          Helper pour extraire le texte d'un contenu HTML
        */}
        {/*
          NOTE: placé ici pour limiter les changements; pourrait être refactorisé ensuite.
        */}

        {blogPosts.length === 0 ? (
          <p className="text-gray-500 text-center">Aucun article de blog n'est disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <Card key={post.id} className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {(() => {
                      const div = document.createElement('div');
                      div.innerHTML = post.content || '';
                      const plain = (div.textContent || div.innerText || '').trim();
                      const snippet = plain.length > 150 ? plain.slice(0, 150) + '…' : plain;
                      return snippet || 'Aperçu indisponible.';
                    })()}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">Publié le {new Date(post.created_at).toLocaleDateString()}</p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/blog/${post.slug}`}>
                      Lire l'article <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BlogPage;