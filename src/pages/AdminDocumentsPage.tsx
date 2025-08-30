import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllProfiles, UserProfile } from '@/lib/admin-api';
import { uploadDocument, getDocumentsForUser, deleteDocument, AdminDocument } from '@/lib/documents-api';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const AdminDocumentsPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await getAllProfiles();
        setUsers(allUsers);
      } catch (error) {
        toast.error("Erreur lors de la récupération des utilisateurs.");
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
    } else {
      setDocuments([]);
    }
  }, [selectedUserId]);

  const fetchUserDocuments = async (userId: string) => {
    setLoading(true);
    try {
      const userDocs = await getDocumentsForUser(userId);
      setDocuments(userDocs);
    } catch (error) {
      toast.error("Erreur lors de la récupération des documents de l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedUserId || !name) {
      toast.warning("Veuillez sélectionner un utilisateur, un fichier et donner un nom au document.");
      return;
    }

    setLoading(true);
    try {
      await uploadDocument(selectedUserId, file, { name, description, category });
      toast.success("Document téléversé avec succès !");
      setFile(null);
      setName('');
      setDescription('');
      setCategory('');
      if (document.getElementById('file-upload')) {
        (document.getElementById('file-upload') as HTMLInputElement).value = '';
      }
      fetchUserDocuments(selectedUserId);
    } catch (error: any) {
      toast.error(`Erreur lors du téléversement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string, filePath: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.")) {
      return;
    }
    try {
      await deleteDocument(docId, filePath);
      toast.success("Document supprimé avec succès.");
      setDocuments(docs => docs.filter(d => d.id !== docId));
    } catch (error: any) {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Gestion des Documents (Coffre-Fort)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Ajouter un document</CardTitle>
            <CardDescription>Sélectionnez un utilisateur et téléversez un fichier.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="user-select">Utilisateur</Label>
                <Select onValueChange={setSelectedUserId} value={selectedUserId} disabled={loadingUsers}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder={loadingUsers ? "Chargement..." : "Sélectionner un utilisateur"} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="doc-name">Nom du document</Label>
                <Input id="doc-name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="doc-desc">Description (optionnel)</Label>
                <Textarea id="doc-desc" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="doc-cat">Catégorie (optionnel)</Label>
                <Input id="doc-cat" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Facture, Contrat..." />
              </div>
              <div>
                <Label htmlFor="file-upload">Fichier</Label>
                <Input id="file-upload" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required />
              </div>
              <Button type="submit" disabled={loading || !selectedUserId}>
                {loading ? 'Téléversement...' : 'Ajouter le document'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Documents de l'utilisateur</CardTitle>
            <CardDescription>
              {selectedUserId ? `Documents pour ${users.find(u => u.id === selectedUserId)?.first_name || 'Utilisateur sélectionné'}` : 'Veuillez sélectionner un utilisateur.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p>Chargement...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.name}</TableCell>
                      <TableCell>{doc.category || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(doc.id, doc.file_path)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {documents.length === 0 && !loading && selectedUserId && <p className="text-center text-gray-500 py-4">Aucun document pour cet utilisateur.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDocumentsPage;