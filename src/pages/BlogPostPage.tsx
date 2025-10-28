import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { getBlogPostBySlug, BlogPost } from '@/lib/blog-api';
import { Loader2, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setError("Aucun slug d'article de blog fourni.");
        setLoading(false);
        return;
      }
      try {
        const post = await getBlogPostBySlug(slug);
        if (post) {
          setBlogPost(post);
        } else {
          setError("Article de blog introuvable.");
        }
      } catch (err: any) {
        setError("Impossible de charger l'article de blog. Veuillez réessayer plus tard.");
        toast.error("Erreur lors du chargement de l'article.");
        console.error("Failed to fetch blog post by slug:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement de l'article...</p>
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

  if (!blogPost) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 text-center">
          <p className="text-gray-500">L'article demandé n'existe pas ou n'est pas publié.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-4xl font-bold mb-4">{blogPost.title}</h1>
        <p className="text-sm text-gray-500 mb-6">Publié le {new Date(blogPost.created_at).toLocaleDateString()}</p>
        <div
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blogPost.content) }}
        />
      </div>
    </MainLayout>
  );
};

export default BlogPostPage;