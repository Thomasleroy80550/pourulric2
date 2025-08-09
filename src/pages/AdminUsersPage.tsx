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
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from 'sonner';
import { getAllProfiles, createUser, updateUser, UpdateUserPayload, getAccountantRequests, updateAccountantRequestStatus, AccountantRequest, createAccountantClientRelation } from '@/lib/admin-api';
import { UserProfile, OnboardingStatus } from '@/lib/profile-api';
import { UserRoom, getUserRoomsByUserId, adminAddUserRoom, deleteUserRoom } from '@/lib/user-room-api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Edit, AlertTriangle, LogIn, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } => 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EditUserRoomDialog from '@/components/EditUserRoomDialog';
import { Textarea } from '@/components/ui/textarea';

const newUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  email: z.string().email("L'email est invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  role: z.enum(['user', 'admin', 'accountant'], { required_error: "Le rôle est requis." }),
  estimated_revenue: z.coerce.number().min(0, "Le revenu estimé doit être positif.").optional(),
  estimation_details: z.string().optional(),
});

const editUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  role: z.enum(['user', 'admin', 'accountant'], { required_error: "Le rôle est requis." }),
  onboarding_status: z.enum(['estimation_sent', 'estimation_validated', 'cguv_accepted', 'keys_retrieved', 'photoshoot_done', 'live']).optional(),
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
  can_manage_prices: z.boolean().optional(),
  kyc_status: z.enum(['not_verified', 'pending_review', 'verified', 'rejected']).optional(),
});

// This schema is now only for the add room form, not for the edit dialog
const addRoomFormSchema = z.object({
  room_id: z.string().min(1, "L'ID de la chambre est requis."),
  room_name: z.string().min(1, "Le nom de la chambre est requis."),
  room_id_2: z.string().optional().nullable(),
});

const getKycStatusText = (status?: string) => {
  switch (status) {
    case 'verified': return 'Vérifié';
    case 'pending_review': return 'En attente';
    case 'rejected': return 'Rejeté';
    case 'not_verified':
    default:
      return 'Non vérifié';
  }
};

const getKycStatusVariant = (status?: string): "default" | "destructive" | "secondary" | "outline" => {
  switch (status) {
    case 'verified': return 'default';
    case 'pending_review': return 'secondary';
    case 'rejected': return 'destructive';
    case 'not_verified':
    default:
      return 'outline';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'En attente';
    case 'approved': return 'Approuvée';
    case 'rejected': return 'Rejetée';
    default: return status;
  }
};

const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
  switch (status) {
    case 'approved': return 'default';
    case 'pending': return 'secondary';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
};

const onboardingStatusText: Record<OnboardingStatus, string> = {
  estimation_sent: "Estimation envoyée",
  estimation_validated: "Estimation validée",
  cguv_accepted: "CGUV acceptées",
  keys_retrieved: "Clés récupérées",
  photoshoot_done: "Shooting photo terminé",
  live: "En ligne",
};

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AccountantRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<AccountantRequest | null>(null);
  const [isSwitchingUser, setIsSwitchingUser] = useState<string | null>(null);
  const [documentUrls, setDocumentUrls] = useState<{ identity?: string; address?: string }>({});
  const navigate = useNavigate();

  // State for editing rooms
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<UserRoom | null>(null);

  const addUserForm = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '', role: 'user', estimation_details: '', estimated_revenue: 0 },
  });

  const editUserForm = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });

  const addRoomForm = useForm<z.infer<typeof addRoomFormSchema>>({
    resolver: zodResolver(addRoomFormSchema),
    defaultValues: { room_id: '', room_name: '', room_id_2: '' },
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

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const fetchedRequests = await getAccountantRequests();
      setRequests(fetchedRequests);
    } catch (error: any) {
      toast.error(`Erreur lors de la récupération des demandes: ${error.message}`);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRequests();
  }, []);

  const handleAddUser = async (values: z.infer<typeof newUserSchema>) => {
    try {
      // Pass the values directly as they match the CreateUserPayload interface
      const result = await createUser(values);
      
      toast.success("Prospect créé avec succès ! Un email sera envoyé pour l'inviter à s'inscrire.");

      if (pendingApproval && result?.data?.user?.id) {
        await createAccountantClientRelation(result.data.user.id, pendingApproval.user_id);
        toast.success("Lien comptable-client établi.");

        await updateAccountantRequestStatus(pendingApproval.id, 'approved');
        toast.success("Demande d'accès approuvée.");
        setPendingApproval(null);
        fetchRequests();
      }

      setIsAddUserDialogOpen(false);
      addUserForm.reset();
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erreur lors de la création : ${error.message}`);
    }
  };

  const handleEditClick = async (user: UserProfile) => {
    setEditingUser(user);
    editUserForm.reset({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role === 'admin' ? 'admin' : (user.role === 'accountant' ? 'accountant' : 'user'),
      onboarding_status: user.onboarding_status || 'estimation_sent',
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
      can_manage_prices: user.can_manage_prices || false,
      kyc_status: user.kyc_status || 'not_verified',
    });
    setIsEditDialogOpen(true);

    // Fetch user rooms
    setLoadingRooms(true);
    try {
        const rooms = await getUserRoomsByUserId(user.id);
        setUserRooms(rooms);
    } catch (error: any) {
        toast.error(`Erreur de chargement des chambres: ${error.message}`);
        setUserRooms([]);
    } finally {
        setLoadingRooms(false);
    }

    // Fetch signed URLs for KYC documents
    setDocumentUrls({}); // Reset first
    if (user.kyc_documents) {
        const urls: { identity?: string; address?: string } = {};
        const expiresIn = 60 * 5; // 5 minutes

        try {
            if (user.kyc_documents.identity) {
                const { data, error } = await supabase.storage
                    .from('kyc-documents')
                    .createSignedUrl(user.kyc_documents.identity, expiresIn);
                if (error) throw error;
                urls.identity = data.signedUrl;
            }
            if (user.kyc_documents.address) {
                const { data, error } = await supabase.storage
                    .from('kyc-documents')
                    .createSignedUrl(user.kyc_documents.address, expiresIn);
                if (error) throw error;
                urls.address = data.signedUrl;
            }
            setDocumentUrls(urls);
        } catch (error: any) {
            toast.error(`Erreur de chargement des documents: ${error.message}`);
        }
    }
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

  const handleAddRoom = async (values: z.infer<typeof addRoomFormSchema>) => {
    if (!editingUser) return;
    try {
        const newRoom = await adminAddUserRoom(editingUser.id, values.room_id, values.room_name, values.room_id_2 || undefined);
        setUserRooms(prev => [...prev, newRoom]);
        addRoomForm.reset();
        toast.success("Chambre ajoutée avec succès !");
    } catch (error: any) {
        toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleEditRoomClick = (room: UserRoom) => {
    setRoomToEdit(room);
    setIsEditRoomDialogOpen(true);
  };

  const handleRoomSaved = (savedRoom: UserRoom) => {
    // Update the list of user rooms after an add or edit operation
    setUserRooms(prevRooms => {
      const existingIndex = prevRooms.findIndex(r => r.id === savedRoom.id);
      if (existingIndex > -1) {
        // Room was updated
        const updatedRooms = [...prevRooms];
        updatedRooms[existingIndex] = savedRoom;
        return updatedRooms;
      } else {
        // Room was added
        return [...prevRooms, savedRoom];
      }
    });
    setRoomToEdit(null); // Clear the room being edited
  };

  const handleDeleteRoom = async (roomId: string) => {
      if (!editingUser) return;
      try {
          await deleteUserRoom(roomId);
          setUserRooms(prev => prev.filter(room => room.id !== roomId));
          toast.success("Chambre supprimée avec succès !");
      } catch (error: any) {
          toast.error(`Erreur: ${error.message}`);
      }
  };

  const handleApproveClick = (request: AccountantRequest) => {
    setPendingApproval(request);
    const nameParts = request.accountant_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || request.accountant_name;

    addUserForm.reset({
      first_name: firstName,
      last_name: lastName,
      email: request.accountant_email,
      password: '',
      role: 'accountant',
    });
    setIsAddUserDialogOpen(true);
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateAccountantRequestStatus(requestId, 'rejected');
      toast.success("Demande rejetée.");
      fetchRequests();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleSwitchUser = async (targetUserId: string) => {
    setIsSwitchingUser(targetUserId);
    try {
      // 1. Sauvegarder la session admin actuelle
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (!adminSession) throw new Error("Session admin non trouvée.");
      localStorage.setItem('admin_impersonation_session', JSON.stringify(adminSession));

      // 2. Appeler la fonction Edge pour obtenir la session de l'utilisateur cible
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { target_user_id: targetUserId },
      });

      if (error) throw error;
      if (!data.access_token || !data.refresh_token) throw new Error("Tokens de session invalides reçus.");

      // 3. Définir la nouvelle session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      // 4. Naviguer et recharger
      toast.success(`Vous êtes maintenant connecté en tant que l'utilisateur.`);
      navigate('/');
      window.location.reload(); // Forcer un rechargement complet pour que le SessionContextProvider se réinitialise

    } catch (error: any) {
      toast.error(`Erreur lors du changement de compte : ${error.message}`);
      localStorage.removeItem('admin_impersonation_session'); // Nettoyer en cas d'erreur
    } finally {
      setIsSwitchingUser(null);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Ajouter un prospect
          </Button>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="requests">
              Demandes Comptable
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="ml-2">{requests.filter(r => r.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
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
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut Intégration</TableHead>
                        <TableHead>Statut KYC</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className={user.is_banned ? 'bg-red-100 dark:bg-red-900/30' : ''}>
                          <TableCell>{user.first_name} {user.last_name}</TableCell>
                          <TableCell>{users.find(u => u.id === user.id)?.email || 'N/A'}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <Badge variant={user.onboarding_status === 'live' ? 'default' : 'secondary'}>
                              {onboardingStatusText[user.onboarding_status || 'estimation_sent']}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getKycStatusVariant(user.kyc_status)}>
                              {getKycStatusText(user.kyc_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)} title="Modifier l'utilisateur">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSwitchUser(user.id)}
                              disabled={isSwitchingUser === user.id}
                              title="Se connecter en tant que cet utilisateur"
                            >
                              {isSwitchingUser === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="requests" className="mt-4">
            <Card className="shadow-md">
              <CardHeader><CardTitle>Demandes d'accès comptable</CardTitle></CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Demandé par</TableHead>
                        <TableHead>Nom Comptable</TableHead>
                        <TableHead>Email Comptable</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => {
                        const requestingUser = users.find(u => u.id === request.user_id);
                        return (
                          <TableRow key={request.id}>
                            <TableCell>{requestingUser ? `${requestingUser.first_name} ${requestingUser.last_name}` : 'Utilisateur inconnu'}</TableCell>
                            <TableCell>{request.accountant_name}</TableCell>
                            <TableCell>{request.accountant_email}</TableCell>
                            <TableCell>{format(new Date(request.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(request.status)}>
                                {getStatusText(request.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleApproveClick(request)}>Approuver</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(request.id)}>Rejeter</Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={(isOpen) => {
        setIsAddUserDialogOpen(isOpen);
        if (!isOpen) {
          setPendingApproval(null);
          addUserForm.reset({ first_name: '', last_name: '', email: '', password: '', role: 'user' });
        }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un nouveau prospect</DialogTitle><DialogDescription>Le prospect recevra une invitation à s'inscrire pour voir son estimation.</DialogDescription></DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4 py-4">
              <FormField control={addUserForm.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="password" render={({ field }) => (<FormItem><FormLabel>Mot de passe temporaire</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="accountant">Comptable</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="estimated_revenue" render={({ field }) => (<FormItem><FormLabel>Revenu Annuel Estimé (€)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={addUserForm.control} name="estimation_details" render={({ field }) => (<FormItem><FormLabel>Détails de l'estimation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormDescription>Ces détails seront visibles par le prospect.</FormDescription><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={addUserForm.formState.isSubmitting}>{addUserForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le prospect"}</Button>
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
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="personal">Personnel</TabsTrigger>
                  <TabsTrigger value="onboarding">Intégration</TabsTrigger>
                  <TabsTrigger value="payment">Paiement</TabsTrigger>
                  <TabsTrigger value="offer">Offre</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="kyc">KYC</TabsTrigger>
                  <TabsTrigger value="rooms">Chambres</TabsTrigger>
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
                      <FormField control={editUserForm.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="accountant">Comptable</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card className="border-red-500 border-2">
                    <CardHeader><CardTitle className="text-red-500 flex items-center gap-2"><AlertTriangle /> Zone de danger</CardTitle></CardHeader>
                    <CardContent>
                      <FormField control={editUserForm.control} name="is_banned" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-red-50 dark:bg-red-900/20"><div className="space-y-0.5"><FormLabel className="text-red-600 dark:text-red-400">Bannir l'utilisateur</FormLabel><p className="text-xs text-red-500 dark:text-red-400/80">L'utilisateur sera déconnecté et ne pourra plus accéder à son compte.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="onboarding" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Statut d'intégration</CardTitle></CardHeader>
                    <CardContent>
                      <FormField
                        control={editUserForm.control}
                        name="onboarding_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut actuel</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {Object.entries(onboardingStatusText).map(([key, value]) => (
                                  <SelectItem key={key} value={key}>{value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Modifiez le statut pour faire avancer le prospect dans le parcours.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
                <TabsContent value="offer" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Détails de l'offre</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={editUserForm.control} name="commission_rate" render={({ field }) => (<FormItem><FormLabel>Forfait (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="linen_type" render={({ field }) => (<FormItem><FormLabel>Type de linge</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="agency" render={({ field }) => (<FormItem><FormLabel>Agence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Côte d'opal">Côte d'opal</SelectItem><SelectItem value="Baie de somme">Baie de somme</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={editUserForm.control} name="contract_start_date" render={({ field }) => (<FormItem><FormLabel>Date de début de contrat</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
                    <CardContent>
                      <FormField
                        control={editUserForm.control}
                        name="can_manage_prices"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Gérer les prix/restrictions</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Autoriser cet utilisateur à modifier les prix et à bloquer des dates sur le calendrier.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
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
                <TabsContent value="kyc" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Vérification d'identité (KYC)</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={editUserForm.control}
                        name="kyc_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut KYC</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un statut" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="not_verified">Non vérifié</SelectItem>
                                <SelectItem value="pending_review">En attente de révision</SelectItem>
                                <SelectItem value="verified">Vérifié</SelectItem>
                                <SelectItem value="rejected">Rejeté</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <Label>Documents fournis</Label>
                        <div className="mt-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-800/50 min-h-[60px]">
                          {!editingUser?.kyc_documents || (!editingUser.kyc_documents.identity && !editingUser.kyc_documents.address) ? (
                            <p className="text-sm text-muted-foreground">Aucun document n'a été fourni.</p>
                          ) : (
                            <ul className="space-y-2 text-sm">
                              {editingUser.kyc_documents.identity && (
                                <li className="flex items-center justify-between">
                                  <span>Pièce d'identité</span>
                                  {documentUrls.identity ? (
                                    <Button asChild variant="link" className="p-0 h-auto">
                                      <a href={documentUrls.identity} target="_blank" rel="noopener noreferrer">
                                        Voir le document
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">Chargement...</span>
                                  )}
                                </li>
                              )}
                              {editingUser.kyc_documents.address && (
                                <li className="flex items-center justify-between">
                                  <span>Justificatif de domicile</span>
                                  {documentUrls.address ? (
                                    <Button asChild variant="link" className="p-0 h-auto">
                                      <a href={documentUrls.address} target="_blank" rel="noopener noreferrer">
                                        Voir le document
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">Chargement...</span>
                                  )}
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="rooms" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Chambres Assignées</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Ajouter une chambre</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={addRoomForm.control} name="room_id" render={({ field }) => (<FormItem><FormLabel>ID Chambre (Krossbooking)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={addRoomForm.control} name="room_name" render={({ field }) => (<FormItem><FormLabel>Nom de la chambre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={addRoomForm.control} name="room_id_2" render={({ field }) => (<FormItem><FormLabel>ID Chambre Numéro 2 (Prix/Restrictions)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            type="button"
                            onClick={addRoomForm.handleSubmit(handleAddRoom)}
                            disabled={addRoomForm.formState.isSubmitting}
                          >
                            {addRoomForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium mb-2">Chambres actuelles</h3>
                        {loadingRooms ? (
                          <Skeleton className="h-20 w-full" />
                        ) : userRooms.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>ID Krossbooking</TableHead>
                                <TableHead>ID 2</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userRooms.map(room => (
                                <TableRow key={room.id}>
                                  <TableCell>{room.room_name}</TableCell>
                                  <TableCell>{room.room_id}</TableCell>
                                  <TableCell>{room.room_id_2 || 'N/A'}</TableCell>
                                  <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditRoomClick(room)} title="Modifier la chambre">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteRoom(room.id)} title="Supprimer la chambre">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucune chambre assignée à cet utilisateur.</p>
                        )}
                      </div>
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

      {/* Edit Room Dialog (newly added) */}
      {editingUser && (
        <EditUserRoomDialog
          isOpen={isEditRoomDialogOpen}
          onOpenChange={setIsEditRoomDialogOpen}
          userId={editingUser.id}
          initialRoom={roomToEdit}
          onRoomSaved={handleRoomSaved}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsersPage;