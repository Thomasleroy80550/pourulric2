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
import { PlusCircle, Loader2, Edit, LogIn, Upload, Search, CreditCard, FileText, Trash2, ArrowRight, CheckCircle, Mail } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import OnboardingVisualProgress from '@/components/OnboardingVisualProgress';
import OnboardingConfettiDialog from '@/components/OnboardingConfettiDialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import OnboardingMiniProgress from '@/components/OnboardingMiniProgress';
import { sendEmail, createNotification } from '@/lib/notifications-api';

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
  const [bulkUpdatingSmartPricing, setBulkUpdatingSmartPricing] = useState(false);
  const [updatingAgencyFor, setUpdatingAgencyFor] = useState<string | null>(null);
  const AGENCIES = ["Côte d'opal", "Baie de somme"];
  const [isConfettiOpen, setIsConfettiOpen] = useState(false);
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [compactMode, setCompactMode] = useState(true);
  const navigate = useNavigate();

  const ONBOARDING_STAGES: OnboardingStatus[] = [
    'estimation_sent',
    'estimation_validated',
    'cguv_accepted',
    'keys_pending_reception',
    'keys_retrieved',
    'photoshoot_done',
    'live',
  ];

  // Styles de couleur par étape (header, accent carte, badge)
  const STAGE_STYLES: Record<OnboardingStatus, { headerBg: string; accent: string; badge: string }> = {
    estimation_sent: {
      headerBg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-900/20',
      accent: 'border-l-indigo-500',
      badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
    },
    estimation_validated: {
      headerBg: 'from-violet-50 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/20',
      accent: 'border-l-violet-500',
      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200',
    },
    cguv_accepted: {
      headerBg: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/20',
      accent: 'border-l-emerald-500',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    },
    keys_pending_reception: {
      headerBg: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/20',
      accent: 'border-l-amber-500',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    },
    keys_retrieved: {
      headerBg: 'from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-900/20',
      accent: 'border-l-teal-500',
      badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200',
    },
    photoshoot_done: {
      headerBg: 'from-sky-50 to-sky-100 dark:from-sky-900/30 dark:to-sky-900/20',
      accent: 'border-l-sky-500',
      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
    },
    live: {
      headerBg: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/20',
      accent: 'border-l-green-500',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200',
    },
  };

  const getStatusIndex = (status?: OnboardingStatus) => {
    const s = status ?? 'estimation_sent';
    const idx = ONBOARDING_STAGES.indexOf(s);
    return idx === -1 ? 0 : idx;
  };

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
        headers: {
          Authorization: `Bearer ${adminSession.access_token}`,
        },
      });

      if (error) throw error;

      // Fallback direct: si l'edge renvoie un OTP, on vérifie côté client pour établir la session sans redirection
      if (data?.email && data?.email_otp) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.email_otp,
          type: 'magiclink',
        });
        if (otpError) throw otpError;

        toast.success("Connexion établie via OTP.");
        navigate('/');
        window.location.reload();
        return;
      }

      // Si la fonction renvoie un lien d'action (magic link), on y redirige
      if (data?.action_link) {
        toast.success("Ouverture de la session du client...");
        window.location.href = data.action_link;
        return;
      }

      // Ancien flux: si des tokens sont fournis, on les utilise directement
      if (data?.access_token && data?.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;

        toast.success("Vous êtes maintenant connecté en tant que le client.");
        navigate('/');
        window.location.reload();
        return;
      }

      throw new Error("Réponse d'impersonation inattendue (ni OTP, ni lien, ni tokens).");

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

  const handleDisableSmartPricingForAll = async () => {
    const toUpdate = users.filter(u => !u.can_manage_prices);
    if (toUpdate.length === 0) {
      toast.info('Le Smart Pricing est déjà désactivé pour tous.');
      return;
    }
    setBulkUpdatingSmartPricing(true);
    try {
      await Promise.allSettled(
        toUpdate.map(u => updateUser({ user_id: u.id, can_manage_prices: true }))
      );
      toast.success(`Smart Pricing désactivé pour ${toUpdate.length} client(s).`);
      fetchUsers();
    } catch (error: any) {
      toast.error(`Erreur lors de la désactivation en masse : ${error.message}`);
    } finally {
      setBulkUpdatingSmartPricing(false);
    }
  };

  const handleUpdateAgency = async (user: UserProfile, agencyValue: string) => {
    setUpdatingAgencyFor(user.id);
    const newAgency = agencyValue === '__none__' ? null : agencyValue;

    // Optimistic UI: update local state immediately
    const previousUsers = users;
    setUsers((curr) =>
      curr.map((u) => (u.id === user.id ? { ...u, agency: newAgency ?? undefined } : u))
    );

    try {
      await updateUser({ user_id: user.id, agency: newAgency as any });
      toast.success('Agence mise à jour.');
      // IMPORTANT: ne plus rappeler fetchUsers() ici pour éviter le rechargement global
    } catch (error: any) {
      // Revert on error
      setUsers(previousUsers);
      toast.error(`Erreur lors de l'attribution de l'agence : ${error.message}`);
    } finally {
      setUpdatingAgencyFor(null);
    }
  };

  const handleAdvanceOnboarding = async (user: UserProfile) => {
    const currentIdx = getStatusIndex(user.onboarding_status);
    const nextIdx = Math.min(currentIdx + 1, ONBOARDING_STAGES.length - 1);
    const nextStatus = ONBOARDING_STAGES[nextIdx];

    // Optimistic UI
    const prev = users;
    setUsers(curr => curr.map(u => u.id === user.id ? { ...u, onboarding_status: nextStatus } : u));

    try {
      await updateUser({ user_id: user.id, onboarding_status: nextStatus });
      toast.success("Étape d'onboarding avancée.");
      if (nextStatus === 'live') {
        setIsConfettiOpen(true);
      }
    } catch (error: any) {
      setUsers(prev);
      toast.error(`Erreur lors de l'avancement: ${error.message}`);
    }
  };

  const handleMarkLive = async (user: UserProfile) => {
    if ((user.onboarding_status ?? 'estimation_sent') === 'live') return;
    const prev = users;
    setUsers(curr => curr.map(u => u.id === user.id ? { ...u, onboarding_status: 'live' } : u));
    try {
      await updateUser({ user_id: user.id, onboarding_status: 'live' });
      toast.success("Client marqué comme 'En ligne'.");
      setIsConfettiOpen(true);
    } catch (error: any) {
      setUsers(prev);
      toast.error(`Erreur lors du passage en ligne: ${error.message}`);
    }
  };

  // Bouton de relance: envoie un email adapté à l'étape
  const handleSendReminder = async (user: UserProfile) => {
    const stage = (user.onboarding_status ?? 'estimation_sent') as OnboardingStatus;
    const email = user.email;
    if (!email) {
      toast.error("Ce client n'a pas d'email.");
      return;
    }

    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Bonjour';
    let subject = '';
    let html = '';

    switch (stage) {
      case 'estimation_sent':
        subject = "Votre estimation Hello Keys – prochaine étape";
        html = `
          <p>${fullName},</p>
          <p>Nous avons partagé votre estimation. Pour avancer, merci de nous confirmer votre accord ou de planifier un appel de démarrage.</p>
          <p>Répondez directement à cet email ou connectez-vous pour continuer votre onboarding.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
      case 'estimation_validated':
        subject = "Signature des CGUV – action requise";
        html = `
          <p>${fullName},</p>
          <p>Votre estimation a été validée. Il vous reste à signer les CGUV afin de finaliser votre inscription.</p>
          <p>Rendez-vous dans votre espace pour signer, ou répondez à cet email pour recevoir le PDF à signer en agence.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
      case 'cguv_accepted':
        subject = "Livraison des clés – prochaine étape";
        html = `
          <p>${fullName},</p>
          <p>Les CGUV sont signées. Merci de nous transmettre les clés selon la méthode choisie (dépôt en agence ou envoi).</p>
          <p>Indiquez-nous la date et le mode de remise pour planifier la suite.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
      case 'keys_pending_reception':
        subject = "Rappel: remise des clés";
        html = `
          <p>${fullName},</p>
          <p>Nous sommes en attente de la remise des clés pour avancer votre onboarding.</p>
          <p>Merci de nous préciser la date et le mode de remise.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
      case 'keys_retrieved':
        subject = "Planification du shooting photo";
        html = `
          <p>${fullName},</p>
          <p>Nous avons récupéré les clés. Prochaine étape: le shooting photo.</p>
          <p>Merci de nous proposer des créneaux pour programmer la séance.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
      case 'photoshoot_done':
        subject = "Mise en ligne – dernières vérifications";
        html = `
          <p>${fullName},</p>
          <p>Le shooting est terminé. Nous finalisons la mise en ligne (textes, tarifs, disponibilité).</p>
          <p>Merci de vérifier les derniers détails dans votre espace et valider.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
      default:
        subject = "Relance Onboarding";
        html = `
          <p>${fullName},</p>
          <p>Petit rappel pour finaliser votre onboarding. Connectez-vous pour voir les prochaines étapes.</p>
          <p>Cordialement,<br/>L'équipe Hello Keys</p>
        `;
        break;
    }

    try {
      await sendEmail(email, subject, html);
      await createNotification(user.id, `Relance envoyée: ${subject}`, '/onboarding-status');
      toast.success("Relance envoyée par email.");
    } catch (e: any) {
      toast.error(e?.message || "Échec de l'envoi de la relance.");
    }
  };

  // Suppression douce d'un client (contrat résilié) avec mise à jour optimiste
  const confirmDeleteOnboardingClient = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const performDeleteOnboardingClient = async () => {
    if (!userToDelete) return;
    const target = userToDelete;
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);

    // Optimistic: retirer le client de la vue tout de suite
    const prevUsers = users;
    setUsers(curr => curr.filter(u => u.id !== target.id));

    try {
      await updateUser({ user_id: target.id, is_contract_terminated: true });
      toast.success('Client supprimé (contrat résilié).');
    } catch (error: any) {
      setUsers(prevUsers);
      toast.error(`Erreur lors de la suppression : ${error.message}`);
    }
  };

  // Drag & drop façon HubSpot CRM sur l'onboarding
  const onboardingClients = users
    .filter(user => (user.onboarding_status ?? 'estimation_sent') !== 'live')
    .filter(user => {
      const term = (searchTerm || '').toLowerCase();
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      return fullName.includes(term) || email.includes(term);
    });

  const STAGES_FOR_PIPELINE: OnboardingStatus[] = [
    'estimation_sent',
    'estimation_validated',
    'cguv_accepted',
    'keys_pending_reception',
    'keys_retrieved',
    'photoshoot_done',
  ];

  const onboardingColumns: Record<OnboardingStatus, UserProfile[]> = STAGES_FOR_PIPELINE.reduce((acc, st) => {
    acc[st] = onboardingClients.filter(u => (u.onboarding_status ?? 'estimation_sent') === st);
    return acc;
  }, {} as Record<OnboardingStatus, UserProfile[]>);

  const onOnboardingCardDragStart = (ev: React.DragEvent, userId: string) => {
    ev.dataTransfer.setData('text/userId', userId);
  };

  const findUserLocationInKanban = (id: string): { status: OnboardingStatus; index: number } | null => {
    for (const st of STAGES_FOR_PIPELINE) {
      const idx = onboardingColumns[st].findIndex((u) => u.id === id);
      if (idx !== -1) return { status: st, index: idx };
    }
    return null;
  };

  const onOnboardingColumnDragOver = (ev: React.DragEvent) => {
    ev.preventDefault();
  };

  const onOnboardingColumnDrop = async (ev: React.DragEvent, targetStatus: OnboardingStatus) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData('text/userId');
    if (!id) return;

    const loc = findUserLocationInKanban(id);
    if (!loc) return;

    const sourceStatus = loc.status;
    if (sourceStatus === targetStatus) return;

    // Optimistic UI: déplacer dans l'état local
    const prev = users;
    setUsers(curr =>
      curr.map(u => (u.id === id ? { ...u, onboarding_status: targetStatus } : u))
    );

    try {
      await updateUser({ user_id: id, onboarding_status: targetStatus });
      toast.success(`Client déplacé: ${onboardingStatusText[targetStatus]}`);
    } catch (e: any) {
      toast.error(`Échec du déplacement: ${e?.message || e}`);
      setUsers(prev);
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
  const noAgencyClients = filteredUsers.filter(user => !user.agency || user.agency.trim() === '');
  const onboardingFilteredClients = onboardingFilter === 'all'
    ? onboardingClients
    : onboardingClients.filter(u => (u.onboarding_status ?? 'estimation_sent') === onboardingFilter);

  const renderUserTable = (clientList: UserProfile[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Téléphone</TableHead>
          <TableHead>Rôle</TableHead>
          <TableHead>Agence</TableHead>
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
              <TableCell>{user.phone_number || 'N/A'}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                <div className="min-w-[180px]">
                  <Select
                    value={user.agency ?? ''}
                    onValueChange={(val) => handleUpdateAgency(user, val)}
                    disabled={updatingAgencyFor === user.id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sans agence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {AGENCIES.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
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
            <Button
              variant="outline"
              onClick={handleDisableSmartPricingForAll}
              disabled={bulkUpdatingSmartPricing || loading}
              title="Désactiver Smart Pricing pour tous les clients"
            >
              {bulkUpdatingSmartPricing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Désactiver Smart Pricing (Tous)
            </Button>
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
            <TabsTrigger value="noAgency">
              Sans agence
              {noAgencyClients.length > 0 && (
                <Badge className="ml-2">{noAgencyClients.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="onboarding">
              Onboarding
              {onboardingClients.length > 0 && (
                <Badge className="ml-2">{onboardingClients.length}</Badge>
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
          <TabsContent value="noAgency" className="mt-4">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Clients sans agence</CardTitle>
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
                  renderUserTable(noAgencyClients)
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="onboarding" className="mt-4">
            <Card className="shadow-md">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Onboarding – pipeline (style CRM)</CardTitle>
                  <p className="text-sm text-muted-foreground hidden sm:block">Glissez les cartes entre les colonnes pour changer d'étape.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[240px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Compact</span>
                    <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-56 w-full" />
                    <Skeleton className="h-56 w-full" />
                    <Skeleton className="h-56 w-full" />
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {STAGES_FOR_PIPELINE.map((st) => {
                        const styles = STAGE_STYLES[st];
                        return (
                          <div
                            key={st}
                            className="rounded-lg border bg-background/60 backdrop-blur-sm max-h-[70vh] flex flex-col"
                            onDragOver={onOnboardingColumnDragOver}
                            onDrop={(e) => onOnboardingColumnDrop(e, st)}
                          >
                            <div className={`flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r ${styles.headerBg} sticky top-0`}>
                              <div className="font-medium text-sm">{onboardingStatusText[st]}</div>
                              <Badge variant="secondary" className={styles.badge}>{onboardingColumns[st].length}</Badge>
                            </div>
                            <div className="p-3 space-y-3 overflow-y-auto">
                              {onboardingColumns[st].map((user) => {
                                const idx = getStatusIndex(user.onboarding_status);
                                const cardStyles = STAGE_STYLES[(user.onboarding_status ?? 'estimation_sent') as OnboardingStatus];
                                return (
                                  <div
                                    key={user.id}
                                    draggable
                                    onDragStart={(e) => onOnboardingCardDragStart(e, user.id)}
                                    className={`rounded-md border ${compactMode ? 'p-3' : 'p-4'} bg-card hover:shadow-sm transition cursor-grab active:cursor-grabbing ${cardStyles.accent} border-l-4`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="min-w-0">
                                        <div className="font-semibold truncate text-sm">
                                          {user.first_name} {user.last_name}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground truncate">
                                          {user.email ?? '—'}
                                        </div>
                                      </div>
                                      <Badge variant="secondary" className={`${cardStyles.badge} shrink-0 ml-2`}>
                                        {onboardingStatusText[user.onboarding_status || 'estimation_sent']}
                                      </Badge>
                                    </div>

                                    <div className={`mt-2 ${compactMode ? '' : 'mt-3'}`}>
                                      {compactMode ? (
                                        <OnboardingMiniProgress currentIndex={idx} totalSteps={ONBOARDING_STAGES.length} />
                                      ) : (
                                        <OnboardingVisualProgress currentStatusIndex={idx} />
                                      )}
                                    </div>

                                    <div className={`mt-2 flex items-center ${compactMode ? 'gap-1' : 'gap-2'}`}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleAdvanceOnboarding(user)}
                                            disabled={(user.onboarding_status ?? 'estimation_sent') === 'live'}
                                            title="Étape suivante"
                                          >
                                            <ArrowRight className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Étape suivante</TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleMarkLive(user)}
                                            title="Marquer en ligne"
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Marquer "En ligne"</TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleSendReminder(user)}
                                            title="Relancer par email"
                                          >
                                            <Mail className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Relancer par email</TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditClick(user)}
                                            title="Modifier"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Modifier le client</TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => confirmDeleteOnboardingClient(user)}
                                            title="Supprimer (résiliation douce)"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Supprimer le client</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                );
                              })}
                              {onboardingColumns[st].length === 0 && (
                                <div className="text-xs text-muted-foreground italic">Aucun client à cette étape.</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>

            {/* Confetti quand on passe en ligne */}
            <OnboardingConfettiDialog
              isOpen={isConfettiOpen}
              onClose={() => setIsConfettiOpen(false)}
            />

            {/* Confirmation de suppression */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce client en onboarding ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action marque le contrat comme résilié et retire le client de la vue. Vous pourrez le restaurer manuellement si nécessaire.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={performDeleteOnboardingClient}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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