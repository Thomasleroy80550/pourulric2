import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Gift, Users, History } from 'lucide-react';
import { useSession } from './SessionContextProvider';
import { getReferralHistory, getCreditHistory, Referral, CreditTransaction } from '@/lib/referral-api';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';

const ReferralTab: React.FC = () => {
  const { profile } = useSession();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [credits, setCredits] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/login?ref=${profile?.referral_code}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [referralData, creditData] = await Promise.all([
          getReferralHistory(),
          getCreditHistory(),
        ]);
        setReferrals(referralData);
        setCredits(creditData);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Lien de parrainage copié !");
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift /> Votre Programme de Parrainage</CardTitle>
          <CardDescription>Partagez votre code et gagnez des crédits pour chaque nouveau propriétaire qui nous rejoint grâce à vous.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-4 border rounded-lg bg-muted/40">
            <div className="flex-grow">
              <p className="text-sm font-medium">Votre lien de parrainage unique</p>
              <Input readOnly value={referralLink} className="mt-1 text-muted-foreground" />
            </div>
            <Button onClick={handleCopy} size="icon" variant="outline" className="mt-2 sm:mt-0 flex-shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Votre solde de crédits</p>
            <p className="text-4xl font-bold">{profile.referral_credits ?? 0}</p>
            <p className="text-sm text-muted-foreground">Utilisables pour des ménages propriétaires gratuits.</p>
            <Button className="mt-4" disabled={(profile.referral_credits ?? 0) === 0}>
              Utiliser mes crédits
            </Button>
          </CardContent>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users /> Vos Filleuls</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.length > 0 ? referrals.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.referred_user?.first_name || 'Nouveau'} {r.referred_user?.last_name || 'propriétaire'}</TableCell>
                      <TableCell className="text-right">{format(new Date(r.created_at), 'd MMM yyyy', { locale: fr })}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">Vous n'avez pas encore de filleuls.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History /> Historique des Crédits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.length > 0 ? credits.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p>{c.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'd MMM yyyy, HH:mm', { locale: fr })}</p>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${c.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {c.amount > 0 ? `+${c.amount}` : c.amount}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">Aucune transaction de crédit.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferralTab;