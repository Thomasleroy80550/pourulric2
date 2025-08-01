import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getAllProfiles, getAllStrategies, deleteStrategy } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { Strategy } from '@/lib/strategy-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Edit, Clock, CheckCircle, HelpCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StrategyDialog from '@/components/admin/StrategyDialog';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type UserWithStrategy = UserProfile & { strategy?: Strategy };

const AdminStrategiesPage: React.FC = () => {
  const [usersWithStrategies, setUsersWithStrategies] = useState<UserWithStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profiles, strategies] = await Promise.all([getAllProfiles(), getAllStrategies()]);
      const profilesWithStrategies = profiles
        .map(profile => {
          const strategy = strategies.find(s => s.user_id === profile.id);
          return { ...profile, strategy };
        });
      setUsersWithStrategies(profilesWithStrategies);
    } catch (err: any) {
      setError(`Erreur lors du chargement des données : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedUsers = useMemo(() => {
    return [...usersWithStrategies].sort((a, b) => {
      const statusA = a.strategy?.status;
      const statusB = b.strategy?.status;
      const priority: Record<string, number> = { 'creation_requested': 1, 'review_requested': 2 };
      const priorityA = statusA ? priority[statusA] || 99 : 100;
      const priorityB = statusB ? priority[statusB] || 99 : 100;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.first_name.localeCompare(b.first_name);
    });
  }, [usersWithStrategies]);

  const handleManageClick = (user: UserProfile, strategy?: Strategy) => {
    setSelectedUser(user);
    setSelectedStrategy(strategy || null);
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = async (strategyId: string) => {
    try {
      await deleteStrategy(strategyId);
      toast.success("La demande de stratégie a été supprimée.");
      fetchData();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const getStatusBadge = (strategy?: Strategy) => {
    if (!strategy) {
      return <Badge variant="secondary"><HelpCircle className="h-3 w-3 mr-1" />Aucune</Badge>;
    }
    switch (strategy.status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'review_requested':
        return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Révision Demandée</Badge>;
      case 'creation_requested':
        return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Création Demandée</Badge>;
      default:
        return <Badge variant="secondary">{strategy.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-4">Gestion des Stratégies</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedUsers.map(user => (
          <Card key={user.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{user.first_name} {user.last_name}</span>
                {getStatusBadge(user.strategy)}
              </CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => handleManageClick(user, user.strategy)}>
                <Edit className="h-4 w-4 mr-2" />
                {user.strategy ? 'Modifier' : 'Créer'} la stratégie
              </Button>
              {user.strategy?.status === 'creation_requested' && (
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>
                        Voulez-vous vraiment supprimer cette demande de création de stratégie ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteRequest(user.strategy!.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <StrategyDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={selectedUser}
        strategy={selectedStrategy}
        onStrategyUpdate={fetchData}
      />
    </AdminLayout>
  );
};

export default AdminStrategiesPage;