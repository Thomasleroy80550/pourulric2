import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { createPage, getPages, updatePage, deletePage, Page } from '@/lib/page-api';
import { toast } from 'sonner';

const PageCreator: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Partial<Page>>({
    slug: '',
    title: '',
    content: '',
    is_published: true,
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPages = await getPages();
      setPages(fetchedPages);
    } catch (err: any) {
      setError(`Erreur lors du chargement des pages : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setCurrentPage((prev) => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setCurrentPage((prev) => ({ ...prev, is_published: checked }));
  };

  const handleSavePage = async () => {
    if (!currentPage.title || !currentPage.slug || !currentPage.content) {
      toast.error("Veuillez remplir tous les champs obligatoires (Titre, Slug, Contenu).");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && currentPage.id) {
        await updatePage(currentPage as Page);
        toast.success("Page mise à jour avec succès !");
      } else {
        await createPage(currentPage as { slug: string; title: string; content: string; is_published?: boolean });
        toast.success("Page créée avec succès !");
      }
      setCurrentPage({ slug: '', title: '', content: '', is_published: true });
      setIsEditing(false);
      await fetchPages(); // Refresh the list
    } catch (err: any) {
      setError(`Erreur lors de la sauvegarde de la page : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPage = (page: Page) => {
    setCurrentPage(page);
    setIsEditing(true);
  };

  const handleDeletePage = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette page ?")) {
      return;
    }
    setLoading(true);
    try {
      await deletePage(id);
      toast.success("Page supprimée avec succès !");
      await fetchPages(); // Refresh the list
    } catch (err: any) {
      setError(`Erreur lors de la suppression de la page : ${err.message}`);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setCurrentPage({ slug: '', title: '', content: '', is_published: true });
    setIsEditing(false);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Créateur de Pages</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{isEditing ? 'Modifier une Page' : 'Créer une Nouvelle Page'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la Page</Label>
            <Input
              id="title"
              type="text"
              placeholder="Ex: À propos de nous"
              value={currentPage.title || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              type="text"
              placeholder="Ex: a-propos-de-nous (sans / au début)"
              value={currentPage.slug || ''}
              onChange={handleInputChange}
              disabled={loading}
            />
            <p className="text-sm text-gray-500">L'URL sera : `/pages/{currentPage.slug || 'votre-slug'}`</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Contenu de la Page</Label>
            <Textarea
              id="content"
              placeholder="Écrivez le contenu de votre page ici..."
              value={currentPage.content || ''}
              onChange={handleInputChange}
              rows={8}
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_published">Publier la page</Label>
            <Switch
              id="is_published"
              checked={currentPage.is_published}
              onCheckedChange={handleSwitchChange}
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSavePage} disabled={loading}>
              {loading ? 'Sauvegarde en cours...' : (isEditing ? 'Mettre à jour la Page' : 'Créer la Page')}
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
          <CardTitle className="text-lg font-semibold">Pages Existantes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && pages.length === 0 ? (
            <p className="text-gray-500">Chargement des pages...</p>
          ) : pages.length === 0 ? (
            <p className="text-gray-500">Aucune page créée pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Publiée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell>/pages/{page.slug}</TableCell>
                      <TableCell>{page.is_published ? 'Oui' : 'Non'}</TableCell>
                      <TableCell className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditPage(page)} disabled={loading}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePage(page.id)} disabled={loading}>
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
  );
};

export default PageCreator;