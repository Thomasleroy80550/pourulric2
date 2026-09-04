import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getAllProfiles, updateUser } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { Search, Loader2, ClipboardList, CheckCircle, AlertTriangle } from 'lucide-react';

const AdminHousingRegistrationsPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await getAllProfiles();
      setUsers((fetched as UserProfile[]).filter(u => u.role !== 'admin'));
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDraftChange = (userId: string, value: string) => {
    setDrafts(curr => ({ ...curr, [userId]: value.toUpperCase() }));
  };

  const handleSave = async (user: UserProfile) => {
    const next = (drafts[user.id] ?? user.housing_registration_number ?? '').trim().toUpperCase();
    const current = (user.housing_registration_number ?? '').trim();

    if (next === current) return;

    if (next !== '' && next.length !== 13) {
      toast.error('Le numéro doit contenir exactement 13 caractères.');
      return;
    }

    setSavingFor(user.id);
    try {
      await updateUser({ user_id: user.id, housing_registration_number: next || null });
      setUsers(curr =>
        curr.map(u => (u.id === user.id ? { ...u, housing_registration_number: next || undefined } : u))
      );
      setDrafts(curr => {
        const copy = { ...curr };
        delete copy[user.id];
        return copy;
      });
      toast.success("Numéro d'enregistrement mis à jour.");
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`);
    } finally {
      setSavingFor(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const number = (user.housing_registration_number || '').toLowerCase();
    return fullName.includes(term) || email.includes(term) || number.includes(term);
  });

  const withNumber = users.filter(u => !!u.housing_registration_number).length;
  const withoutNumber = users.length - withNumber;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Numéros d'enregistrement des logements</h1>
            <p className="text-muted-foreground text-sm">
              Numéros d'enregistrement (13 caractères) communiqués par les clients.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : withNumber}</p>
                <p className="text-sm text-muted-foreground">Numéro renseigné</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : withoutNumber}</p>
                <p className="text-sm text-muted-foreground">Numéro manquant</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Liste des clients</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-1/3"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Adresse du logement</TableHead>
                    <TableHead>Numéro d'enregistrement</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const draft = drafts[user.id] ?? user.housing_registration_number ?? '';
                    const hasChanged = draft.trim() !== (user.housing_registration_number ?? '').trim();
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell className="max-w-[240px] truncate">
                          {[user.property_address, user.property_zip_code, user.property_city]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-[240px] items-center gap-2">
                            <Input
                              value={draft}
                              maxLength={13}
                              placeholder="13 caractères"
                              className="h-8 font-mono"
                              disabled={savingFor === user.id}
                              onChange={(e) => handleDraftChange(user.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSave(user);
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingFor === user.id || !hasChanged}
                              onClick={() => handleSave(user)}
                            >
                              {savingFor === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'OK'}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.housing_registration_number ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200" variant="secondary">
                              Renseigné
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Manquant</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground italic">
                        Aucun client trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHousingRegistrationsPage;
