import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { getAllProfiles, getAccountantRequests, updateAccountantRequestStatus, AccountantRequest } from '@/lib/admin-api';
import { UserProfile, OnboardingStatus } from '@/lib/profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Edit, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AddUserDialog from '@/components/admin/AddUserDialog';
import EditUserDialog from '@/components/admin/EditUserDialog';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [pendingApproval, setPendingApproval] = useState<AccountantRequest | null>(null);
  const [isSwitchingUser, setIsSwitchingUser] = useState<string | null>(null);
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

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
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

      toast.success(`Vous êtes maintenant connecté en tant que l'utilisateur.`);
      navigate('/');
      window.location.reload();

    } catch (error: any) {
      toast.error(`Erreur lors du changement de compte : ${error.message}`);
      localStorage.removeItem('admin_impersonation_session');
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

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onUserAdded={handleUserAdded}
        pendingApproval={pendingApproval}
        setPendingApproval={setPendingApproval}
      />

      <EditUserDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={editingUser}
        onUserUpdated={handleUserUpdated}
      />
    </AdminLayout>
  );
};

export default AdminUsersPage;