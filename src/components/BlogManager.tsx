import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import RichTextEditor from '@/components/RichTextEditor';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { createBlogPost, getBlogPosts, updateBlogPost, deleteBlogPost, BlogPost } from '@/lib/blog-api';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';

const BlogManager: React.FC = () => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBlogPost, setCurrentBlogPost] = useState<Partial<BlogPost>>({
    slug: '',
    title: '',
    content: '',
    is_published: false,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const fetchBlogPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedBlogPosts = await getBlogPosts();
      setBlogPosts(fetchedBlogPosts);
    } catch (err: any) {
      setError(`Erreur lors du chargement des articles de blog : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setCurrentBlogPost((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setCurrentBlogPost((prev) => ({ ...prev, is_published: checked }));
  };

  const handleSaveBlogPost = async () => {
    if (!currentBlogPost.title || !currentBlogPost.slug || !currentBlogPost.content) {
      toast.error("Veuillez remplir tous les champs obligatoires (Titre, Slug, Contenu).");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && currentBlogPost.id) {
        await updateBlogPost(currentBlogPost as BlogPost);
        toast.success("Article de blog mis à jour avec succès !");
      } else {
        await createBlogPost(currentBlogPost as { slug: string; title: string; content: string; is_published?: boolean });
        toast.success("Article de blog créé avec succès !");
      }
      setCurrentBlogPost({ slug: '', title: '', content: '', is_published: false });
      setIsEditing(false);
      await fetchBlogPosts(); // Refresh the list
    } catch (err: any) {
      setError(`Erreur lors de la sauvegarde de l'article de blog : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBlogPost = (blogPost: BlogPost) => {
    setCurrentBlogPost(blogPost);
    setIsEditing(true);
  };

  const handleDeleteBlogPost = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet article de blog ?")) {
      return;
    }
    setLoading(true);
    try {
      await deleteBlogPost(id);
      toast.success("Article de blog supprimé avec succès !");
      await fetchBlogPosts(); // Refresh the list
    } catch (err: any) {
      setError(`Erreur lors de la suppression de l'article de blog : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setCurrentBlogPost({ slug: '', title: '', content: '', is_published: false });
    setIsEditing(false);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Gestion du Blog</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{isEditing ? 'Modifier un Article' : 'Créer un Nouvel Article'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'Article</Label>
              <Input
                id="title"
                type="text"
                placeholder="Ex: Les meilleures pratiques pour la gestion locative"
                value={currentBlogPost.title || ''}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                type="text"
                placeholder="Ex: meilleures-pratiques-gestion-locative (sans / au début)"
                value={currentBlogPost.slug || ''}
                onChange={handleInputChange}
                disabled={loading}
              />
              <p className="text-sm text-gray-500">L'URL sera : `/blog/{currentBlogPost.slug || 'votre-slug'}`</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Contenu de l'Article</Label>
              <RichTextEditor
                value={currentBlogPost.content || ''}
                onChange={(html) =>
                  setCurrentBlogPost((prev) => ({ ...prev, content: html }))
                }
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="is_published">Publier l'article</Label>
              <Switch
                id="is_published"
                checked={currentBlogPost.is_published}
                onCheckedChange={handleSwitchChange}
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveBlogPost} disabled={loading}>
                {loading ? 'Sauvegarde en cours...' : (isEditing ? 'Mettre à jour l\'Article' : 'Créer l\'Article')}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={handleCancelEdit} disabled={loading}>
                  Annuler
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Articles Existants</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && blogPosts.length === 0 ? (
              <p className="text-gray-500">Chargement des articles...</p>
            ) : blogPosts.length === 0 ? (
              <p className="text-gray-500">Aucun article de blog créé pour le moment.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Publié</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogPosts.map((blogPost) => (
                      <TableRow key={blogPost.id}>
                        <TableCell className="font-medium">{blogPost.title}</TableCell>
                        <TableCell>/blog/{blogPost.slug}</TableCell>
                        <TableCell>{blogPost.is_published ? 'Oui' : 'Non'}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditBlogPost(blogPost)} disabled={loading}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteBlogPost(blogPost.id)} disabled={loading}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default BlogManager;