import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getAllProfiles, listStripeAccounts, updateUser, StripeAccount } from '@/lib/admin-api';
import { UserProfile } from '@/lib/profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Link2, CheckCircle2 } from 'lucide-react';

const AdminStripeMatchPage: React.FC = () => {
  const [stripeAccounts, setStripeAccounts] = useState<StripeAccount[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null);
  const [isLinkingAll, setIsLinkingAll] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accounts, profiles] = await Promise.all([
        listStripeAccounts(),
        getAllProfiles(),
      ]);
      setStripeAccounts(accounts);
      setUserProfiles(profiles);
    } catch (error: any) {
      toast.error(`Erreur de chargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLinkAccount = async (stripeAccount: StripeAccount, user: UserProfile) => {
    if (!user) return;
    setLinkingAccountId(stripeAccount.id);
    try {
      await updateUser({
        user_id: user.id,
        stripe_account_id: stripeAccount.id,
      });
      toast.success(`Compte Stripe ${stripeAccount.id} lié à ${user.first_name} ${user.last_name}.`);
      fetchData();
    } catch (error: any) {
      toast.error(`Erreur lors de la liaison: ${error.message}`);
    } finally {
      setLinkingAccountId(null);
    }
  };

  const findUserByEmail = (email: string | null) => {
    if (!email) return null;
    return userProfiles.find(p => p.email?.toLowerCase() === email.toLowerCase());
  };

  const findUserByStripeId = (stripeId: string) => {
    return userProfiles.find(p => p.stripe_account_id === stripeId);
  };

  const linkableAccounts = stripeAccounts.filter(account => {
    const matchedUserByEmail = findUserByEmail(account.email);
    const linkedUser = findUserByStripeId(account.id);
    return matchedUserByEmail && !linkedUser;
  });

  const handleLinkAll = async () => {
    if (linkableAccounts.length === 0) {
      toast.info("Aucun nouveau compte à lier.");
      return;
    }
    setIsLinkingAll(true);
    try {
      const linkPromises = linkableAccounts.map(account => {
        const user = findUserByEmail(account.email)!;
        return updateUser({
          user_id: user.id,
          stripe_account_id: account.id,
        });
      });

      await Promise.all(linkPromises);
      toast.success(`${linkableAccounts.length} compte(s) ont été liés avec succès !`);
      fetchData();
    } catch (error: any) {
      toast.error(`Une erreur est survenue lors de la liaison en masse : ${error.message}`);
    } finally {
      setIsLinkingAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Rapprochement des Comptes Stripe</CardTitle>
            <CardDescription>
              Liez les comptes Stripe Connect aux utilisateurs de l'application via leur adresse e-mail.
            </CardDescription>
            <div className="pt-4">
              <Button onClick={handleLinkAll} disabled={loading || isLinkingAll || linkableAccounts.length === 0}>
                {isLinkingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Lier les {linkableAccounts.length} comptes correspondants
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom (Stripe)</TableHead>
                    <TableHead>Email (Stripe)</TableHead>
                    <TableHead>ID Compte Stripe</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Utilisateur App</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stripeAccounts.map((account) => {
                    const matchedUserByEmail = findUserByEmail(account.email);
                    const linkedUser = findUserByStripeId(account.id);
                    const isAlreadyLinked = !!linkedUser;
                    const isCorrectlyLinked = isAlreadyLinked && matchedUserByEmail && linkedUser.id === matchedUserByEmail.id;

                    return (
                      <TableRow key={account.id}>
                        <TableCell>{account.business_profile?.name || 'N/A'}</TableCell>
                        <TableCell>{account.email || 'N/A'}</TableCell>
                        <TableCell>{account.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={account.payouts_enabled ? 'default' : 'destructive'}>
                              Paiements {account.payouts_enabled ? 'activés' : 'désactivés'}
                            </Badge>
                            <Badge variant={account.details_submitted ? 'default' : 'secondary'}>
                              Infos {account.details_submitted ? 'fournies' : 'requises'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {linkedUser ? (
                            <div>{linkedUser.first_name} {linkedUser.last_name} ({linkedUser.email})</div>
                          ) : matchedUserByEmail ? (
                            <div>{matchedUserByEmail.first_name} {matchedUserByEmail.last_name} ({matchedUserByEmail.email})</div>
                          ) : (
                            <span className="text-muted-foreground">Aucun utilisateur trouvé</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isCorrectlyLinked ? (
                            <div className="flex items-center justify-end gap-2 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Lié
                            </div>
                          ) : isAlreadyLinked ? (
                             <Badge variant="destructive">Lié à un autre utilisateur</Badge>
                          ) : matchedUserByEmail ? (
                            <Button
                              size="sm"
                              onClick={() => handleLinkAccount(account, matchedUserByEmail)}
                              disabled={linkingAccountId === account.id}
                            >
                              {linkingAccountId === account.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Link2 className="mr-2 h-4 w-4" />
                              )}
                              Lier le compte
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminStripeMatchPage;