import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { getAllProfiles, createUser, updateUser, UpdateUserPayload } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Edit, AlertTriangle } from 'lucide-react';

const newUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'email est invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  role: z.enum(['user', 'admin'], { required_error: "Le rôle est requis." }),
});

const editUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  role: z.enum(['user', 'admin'], { required_error: "Le rôle est requis." }),
  property_address: z.string().optional(),
  property_city: z.string().optional(),
  property_zip_code: z.string().optional(),
  iban_airbnb_booking: z.string().optional(),
  bic_airbnb_booking: z.string().optional(),
  sync_with_hellokeys: z.boolean().optional(),
  iban_abritel_hellokeys: z.string().optional(),
  bic_abritel_hellokeys: z.string().optional(),
  commission_rate: z.coerce.number().min(0).optional(),
  linen_type: z.string().optional(),
  agency: z.string().optional(),
  contract_start_date: z.string().optional(),
  notify_new_booking_email: z.boolean().optional(),
  notify_cancellation_email: z.boolean().optional(),
  notify_new_booking_sms: z.boolean().optional(),
  notify_cancellation_sms: z.boolean().optional(),
  is_banned: z.boolean().optional(),
});

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const addUserForm = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '', role: 'user' },
  });

  const editUserForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllProfiles();
      setUsers(fetchedUsers);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (values: z.infer<typeof newUserSchema>) => {
    try {
      await createUser(values);
      toast.success("Utilisateur créé avec succès !");
      setIsAddUserDialogOpen(false);
      addUserForm.reset();
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erreur lors de la création : ${error.message}`);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    editUserForm.reset({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role === 'admin' ? 'admin' : 'user',
      property_address: user.property_address || '',
      property_city: user.property_city || '',
      property_zip_code: user.property_zip_code || '',
      iban_airbnb_booking: user.iban_airbnb_booking || '',
      bic_airbnb_booking: user.bic_airbnb_booking || '',
      sync_with_hellokeys: user.sync_with_hellokeys || false,
      iban_abritel_hellokeys: user.iban_abritel_hellokeys || '',
      bic_abritel_hellokeys: user.bic_abritel_hellokeys || '',
      commission_rate: (user.commission_rate || 0) * 100,
      linen_type: user.linen_type || 'Hello Wash',
      agency: user.agency || '',
      contract_start_date: user.contract_start_date || '',
      notify_new_booking_email: user.notify_new_booking_email ?? true,
      notify_cancellation_email: user.notify_cancellation_email ?? true,
      notify_new_booking_sms: user.notify_new_booking_sms ?? false,
      notify_cancellation_sms: user.notify_cancellation_sms ?? false,
      is_banned: user.is_banned || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (values: z.infer<typeof editUserSchema>) => {
    if (!editingUser) return;
    try {
      const payload: UpdateUserPayload = {
        user_id: editingUser.id,
        ...values,
        commission_rate: values.commission_rate !== undefined ? values.commission_rate / 100 : undefined,
      };
      await updateUser(payload);
      toast.success("Utilisateur mis à jour avec succès !");
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Ajouter un utilisateur
          </Button>
        </div>

        <Card className="shadow-md">
          <CardHeader><CardTitle>Liste des utilisateurs</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={user.is_banned ? 'bg-red-100 dark:bg-red-900/30' : ''}>
                      <TableCell>{user.last_name}</TableCell>
                      <TableCell>{user.first_name}</TableCell>
                      <TableCell>{users.find(u => u.id === user.id)?.email || 'N/A'}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{user.is_banned ? <span className="text-red-500 font-bold">Banni</span> : 'Actif'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un nouvel utilisateur</DialogTitle><DialogDescription>Le nouvel utilisateur sera créé et un profil associé sera généré.</DialogDescription></DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-4">
              <FormField control={addUserForm.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={addUserForm.formState.isSubmitting}>{addUserForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer l'utilisateur"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Modifier les informations de {editingUser?.first_name} {editingUser?.last_name}.</DialogDescription>
          </DialogHeader>
          <Form {...editUserForm}>
            <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)} className="flex-grow overflow-y-auto pr-6 pl-2 space-y-4">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personnel</TabsTrigger>
                  <TabsTrigger value="payment">Paiement</TabsTrigger>
                  <TabsTrigger value="offer">Offre</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Données personnelles</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={editUserForm.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="property_address" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="property_city" render={({ field }) => (<FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="property_zip_code" render={({ field }) => (<FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card className="border-red-500 border-2">
                    <CardHeader><CardTitle className="text-red-500 flex items-center gap-2"><AlertTriangle /> Zone de danger</CardTitle></CardHeader>
                    <CardContent>
                      <FormField control={editUserForm.control} name="is_banned" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-red-50 dark:bg-red-900/20"><div className="space-y-0.5"><FormLabel className="text-red-600 dark:text-red-400">Bannir l'utilisateur</FormLabel><p className="text-xs text-red-500 dark:text-red-400/80">L'utilisateur sera déconnecté et ne pourra plus accéder à son compte.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="payment" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Paiement Airbnb & Booking.com</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={editUserForm.control} name="iban_airbnb_booking" render={({ field }) => (<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="bic_airbnb_booking" render={({ field }) => (<FormItem><FormLabel>BIC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card className="mt-4">
                    <CardHeader><CardTitle>Paiement Abritel & Hello Keys</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={editUserForm.control} name="sync_with_hellokeys" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Synchroniser avec Hello Keys</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={editUserForm.control} name="iban_abritel_hellokeys" render={({ field }) => (<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} disabled={!editUserForm.watch('sync_with_hellokeys')} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="bic_abritel_hellokeys" render={({ field }) => (<FormItem><FormLabel>BIC</FormLabel><FormControl><Input {...field} disabled={!editUserForm.watch('sync_with_hellokeys')} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="offer" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Détails de l'offre</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={editUserForm.control} name="commission_rate" render={({ field }) => (<FormItem><FormLabel>Forfait (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="linen_type" render={({ field }) => (<FormItem><FormLabel>Type de linge</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="agency" render={({ field }) => (<FormItem><FormLabel>Agence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Côte d'opal">Côte d'opal</SelectItem><SelectItem value="Baie de somme">Baie de somme</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="contract_start_date" render={({ field }) => (<FormItem><FormLabel>Date de début de contrat</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="notifications" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Préférences de notification</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={editUserForm.control} name="notify_new_booking_email" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Nouvelles réservations par email</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={editUserForm.control} name="notify_cancellation_email" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Annulations par email</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={editUserForm.control} name="notify_new_booking_sms" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Nouvelles réservations par SMS</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={editUserForm.control} name="notify_cancellation_sms" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Annulations par SMS</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={editUserForm.formState.isSubmitting}>{editUserForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsersPage;