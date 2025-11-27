import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { getAllProfiles, getAccountantRequests, updateAccountantRequestStatus, AccountantRequest, updateUser, createStripeAccount } from '@/lib/admin-api';
import { UserProfile, OnboardingStatus } from '@/lib/profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Edit, LogIn, Upload, Search, CreditCard, FileText, Checkbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import AddUserDialog from '@/components/admin/AddUserDialog';
import EditUserDialog from '@/components/admin/EditUserDialog';
import ImportUsersDialog from '@/components/admin/ImportUsersDialog';
import { Input } from '@/components/ui/input';
import StripeAccountDetailsDialog from '@/components/admin/StripeAccountDetailsDialog';
import { createStripeAccountLink } from '@/lib/admin-api';

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
  keys_pending_reception: "En attente réception clés",
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [pendingApproval, setPendingApproval] = useState<AccountantRequest | null>(null);
  const [isSwitchingUser, setIsSwitchingUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isStripeDetailsOpen, setIsStripeDetailsOpen] = useState(false);
  const [selectedStripeAccountId, setSelectedStripeAccountId] = useState<string | null>(null);
  const [creatingStripeAccountFor, setCreatingStripeAccountFor] = useState<string | null>(null);
  const [updatingPricingFor, setUpdatingPricingFor] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllProfiles();
      setUsers(fetchedUsers);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const fetchedRequests = await getAccountantRequests();
      setRequests(fetchedRequests);
    } catch (error: any) {
      toast.error(`Erreur lors de la récupération des demandes: ${error.message}`);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRequests();
  }, [fetchUsers, fetchRequests]);

  const handleUserAdded = () => {
    fetchUsers();
    fetchRequests();
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };

  const handleImportComplete = () => {
    fetchUsers();
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleShowStripeDetails = (stripeAccountId: string) => {
    setSelectedStripeAccountId(stripeAccountId);
    setIsStripeDetailsOpen(true);
  };

  const handleCreateStripeAccount = async (user: UserProfile) => {
    if (!user.email) {
      toast.error("L'email de l'utilisateur est manquant, impossible de créer un compte Stripe.");
      return;
    }
    setCreatingStripeAccountFor(user.id);
    try {
      // On suppose que le pays est la France pour le moment.
      const newAccount = await createStripeAccount(user.email, 'FR');
      if (!newAccount || !newAccount.id) {
        throw new Error("La création du compte Stripe n'a pas retourné un ID valide.");
      }

      await updateUser({ user_id: user.id, stripe_account_id: newAccount.id });

      toast.success(`Compte Stripe créé avec succès pour ${user.first_name} ${user.last_name}.`);
      fetchUsers(); // Rafraîchir la liste des utilisateurs
    } catch (error: any) {
      console.error('Erreur complète lors de la création du compte Stripe:', error);
      const errorMessage = error.message || 'Erreur inconnue';
      const errorDetails = error.details || '';
      
      if (errorDetails) {
        toast.error(`Erreur lors de la création du compte Stripe : ${errorMessage} - ${JSON.stringify(errorDetails)}`);
      } else {
        toast.error(`Erreur lors de la création du compte Stripe : ${errorMessage}`);
      }
    } finally {
      setCreatingStripeAccountFor(null);
    }
  };

  const handleApproveClick = (request: AccountantRequest) => {
    setPendingApproval(request);
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
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (!adminSession) throw new Error("Session admin non trouvée.");
      localStorage.setItem('admin_impersonation_session', JSON.stringify(adminSession));

      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { target_user_id: targetUserId },
      });

      if (error) throw error;
      if (!data.access_token || !data.refresh_token) throw new Error("Tokens de session invalides reçus.");

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      toast.success(`Vous êtes maintenant connecté en tant que le client.`);
      navigate('/');
      window.location.reload();

    } catch (error: any) {
      toast.error(`Erreur lors du changement de compte : ${error.message}`);
      localStorage.removeItem('admin_impersonation_session');
    } finally {
      setIsSwitchingUser(null);
    }
  };

  const handleSmartPricingToggle = async (user: UserProfile, active: boolean) => {
    if (typeof active !== 'boolean') return;
    setUpdatingPricingFor(user.id);
    try {
      // Smart Pricing actif => can_manage_prices = false
      // Désactivé => can_manage_prices = true
      await updateUser({ user_id: user.id, can_manage_prices: !active });
      toast.success(active ? 'Smart Pricing activé' : 'Smart Pricing désactivé');
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setUpdatingPricingFor(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  const crotoyClients = filteredUsers.filter(user => user.krossbooking_property_id === 1);
  const berckClients = filteredUsers.filter(user => user.krossbooking_property_id === 2);
  const allClients = filteredUsers;
  const smartPricingClients = filteredUsers.filter(user => !user.can_manage_prices);

  const renderUserTable = (clientList: UserProfile[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Statut Intégration</TableHead>
          <TableHead>Statut KYC</TableHead>
          <TableHead>Smart Pricing</TableHead>
          <TableHead>Compte Stripe</TableHead>
          <TableHead>Dernière Connexion</TableHead>
          <TableHead>Acceptation CGUV</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientList.map((user) => {
          const isOnline = user.last_seen_at && (new Date().getTime() - new Date(user.last_seen_at).getTime()) < 2 * 60 * 1000;
          const smartPricingActive = !user.can_manage_prices;
          return (
            <TableRow key={user.id} className={user.is_banned ? 'bg-red-100 dark:bg-red-900/30' : ''}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {isOnline && <span className="h-2 w-2 rounded-full bg-green-500" title="En ligne"></span>}
                  {user.first_name} {user.last_name}
                </div>
              </TableCell>
              <TableCell>{user.email || 'N/A'}</TableCell>
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
              <TableCell>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={smartPricingActive}
                    onCheckedChange={(val) => handleSmartPricingToggle(user, val === true)}
                    disabled={updatingPricingFor === user.id}
                  />
                  <span className="text-sm text-muted-foreground">
                    {smartPricingActive ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {user.stripe_account_id ? (
                  <Button variant="outline" size="sm" onClick={() => handleShowStripeDetails(user.stripe_account_id!)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Voir
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateStripeAccount(user)}
                    disabled={creatingStripeAccountFor === user.id}
                  >
                    {creatingStripeAccountFor === user.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PlusCircle className="h-4 w-4 mr-2" />
                    )}
                    Créer compte
                  </Button>
                )}
              </TableCell>
              <TableCell>
                {user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: fr }) : 'Jamais'}
              </TableCell>
              <TableCell>
                {user.cguv_accepted_at ? format(new Date(user.cguv_accepted_at), 'dd/MM/yy HH:mm', { locale: fr }) : 'Non accepté'}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/statements?userId=${user.id}`)} title="Voir les relevés">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)} title="Modifier le client">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSwitchUser(user.id)}
                  disabled={isSwitchingUser === user.id}
                  title="Se connecter en tant que ce client"
                >
                  {isSwitchingUser === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestion des Clients</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importer des clients
            </Button>
            <Button onClick={() => setIsAddUserDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Ajouter un client
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              Tous les clients
              {allClients.length > 0 && (
                <Badge className="ml-2">{allClients.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="crotoy">Clients Crotoy</TabsTrigger>
            <TabsTrigger value="berck">Clients Berck</TabsTrigger>
            <TabsTrigger value="smartPricing">
              Smart Pricing
              {smartPricingClients.length > 0 && (
                <Badge className="ml-2">{smartPricingClients.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Demandes Comptable
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="ml-2">{requests.filter(r => r.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Liste de tous les clients</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-1/3"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  renderUserTable(allClients)
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="crotoy" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Clients Crotoy</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-1/3"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  renderUserTable(crotoyClients)
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="berck" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Clients Berck</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-1/3"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  renderUserTable(berckClients)
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="smartPricing" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Clients en Smart Pricing</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-1/3"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  renderUserTable(smartPricingClients)
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
                            <TableCell>{requestingUser ? `${requestingUser.first_name} ${requestingUser.last_name}` : 'Client inconnu'}</TableCell>
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

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onUserAdded={handleUserAdded}
        pendingApproval={pendingApproval}
        setPendingApproval={setPendingApproval}
      />

      <ImportUsersDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={handleImportComplete}
      />

      <EditUserDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={editingUser}
        onUserUpdated={handleUserUpdated}
      />

      <StripeAccountDetailsDialog
        isOpen={isStripeDetailsOpen}
        onOpenChange={setIsStripeDetailsOpen}
        stripeAccountId={selectedStripeAccountId}
      />
    </AdminLayout>
  );
};

export default AdminUsersPage;