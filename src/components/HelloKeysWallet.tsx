import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { amountInCents, euros, loadWallet, requestLabels, walletSteps } from '@/lib/hello-wallet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Gift, Wallet, Sparkles, Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReferralTimeline from '@/components/ReferralTimeline';
import WalletMobileSummary from '@/components/WalletMobileSummary';
import RecommendOwnerDialog from '@/components/RecommendOwnerDialog';

export default function HelloKeysWallet({ compact = false }: { compact?: boolean }) {
  const { session, profile } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [walletOpen, setWalletOpen] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['hello-wallet', userId], queryFn: () => loadWallet(userId!), enabled: !!userId });
  const [kind, setKind] = useState<'cleaning' | 'invoice' | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [requestId, setRequestId] = useState('');
  const [referralOpen, setReferralOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const balance = data?.entries.reduce((sum, entry) => sum + Number(entry.amount_cents), 0) ?? 0;
  const reserved = data?.requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount_cents), 0) ?? 0;
  const pendingRewards = data?.referrals.filter(r => !r.cancelled_at).reduce((sum, r) => sum + walletSteps.reduce((n, s) => n + (r[s.field] ? 0 : s.cents), 0), 0) ?? 0;
  const blocked = profile?.is_banned || profile?.is_contract_terminated;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hello-wallet'] });
  const openRequest = (type: 'cleaning' | 'invoice') => { setKind(type); setAmount((balance / 100).toFixed(2)); setDetails(''); setRequestId(crypto.randomUUID()); };
  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const cents = amountInCents(amount);
      if (cents > balance) throw new Error('Votre solde est insuffisant.');
      const { error } = await supabase.rpc('hello_wallet_request', { p_kind: kind, p_amount_cents: cents, p_details: details.trim(), p_id: requestId });
      if (error) throw error;
      toast.success('Demande envoyée. Le montant est réservé dans votre Wallet.'); setKind(null); await refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : (err as { message: string }).message); }
    finally { setBusy(false); }
  };
  if (!userId) return null;
  if (isLoading) return <div className="flex items-center gap-2 p-6"><Loader2 className="h-5 w-5 animate-spin" />Chargement de votre Wallet…</div>;
  if (error) return <Alert variant="destructive"><AlertDescription>Impossible de charger le Wallet. <Button variant="outline" onClick={() => refetch()}>Réessayer</Button></AlertDescription></Alert>;
  return <div className="space-y-6">
    {compact ? <ReferralTimeline referrals={data?.referrals ?? []} balance={balance} referralCode={profile?.referral_code} blocked={!!blocked} onRecommend={() => setReferralOpen(true)} onWallet={() => setWalletOpen(true)} /> : <>
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardHeader><p className="text-xs font-semibold tracking-[0.25em] text-primary">HELLO KEYS</p><CardTitle className="flex items-center gap-2 text-2xl"><Wallet />Mon Wallet</CardTitle><CardDescription>Vos récompenses de parrainage, en euros.</CardDescription></CardHeader>
      <CardContent className="space-y-6"><div><p className="text-sm text-muted-foreground">Solde disponible</p><p className="my-2 text-4xl font-bold tracking-tight text-primary">{euros(balance)}</p><p className="text-sm text-muted-foreground">{euros(reserved)} réservés pour vos demandes · {euros(pendingRewards)} de primes potentielles en attente de validation.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{(['cleaning', 'invoice'] as const).map(type => <div key={type} className="rounded-xl border bg-background/80 p-4">{type === 'cleaning' ? <Sparkles className="mb-3 text-primary" /> : <Receipt className="mb-3 text-primary" />}<h3 className="font-semibold">{type === 'cleaning' ? 'Ménage propriétaire' : 'Prochaine facture'}</h3><p className="mb-4 mt-1 text-sm text-muted-foreground">{type === 'cleaning' ? 'Financez tout ou partie de votre ménage personnel.' : 'Demandez une réduction sur votre prochaine facture éligible.'}</p><Button disabled={balance <= 0 || blocked} onClick={() => openRequest(type)}>{type === 'cleaning' ? 'Utiliser mon solde' : 'Déduire mon solde'}</Button></div>)}</div>
        <p className="text-xs text-muted-foreground">Crédits d’utilisation internes, non retirables par virement bancaire. Le montant demandé est réservé jusqu’à validation Hello Keys ; toute partie non utilisée vous est restituée. Une demande de ménage ne constitue pas une réservation confirmée.</p>
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Gift className="text-primary" />Parrainez vos proches, gagnez jusqu’à 160 € !</CardTitle><CardDescription>Vous connaissez un propriétaire qui souhaite confier la gestion de son logement à Hello Keys ? Recommandez-nous et recevez jusqu’à 160 € directement dans votre Wallet Hello Keys.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm">Utilisez vos récompenses pour financer vos ménages propriétaires ou bénéficier d’une réduction sur votre prochaine facture. Plus vous parrainez, plus vous économisez !</p>
      {walletSteps.map(step => <div key={step.key} className="flex items-center justify-between gap-3 border-b pb-3 text-sm"><span>{step.label}</span><span className="whitespace-nowrap font-semibold text-primary">+{euros(step.cents)}</span></div>)}<div className="flex justify-between font-semibold"><span>Total possible par parrainage</span><span>{euros(16000)}</span></div>
      <p className="text-xs text-muted-foreground">Chaque étape est vérifiée par l’équipe Hello Keys, puis sa prime est automatiquement créditée. Les primes en attente ne sont pas encore utilisables.</p>
      {profile?.referral_code && <div className="flex flex-wrap items-center gap-3"><span className="text-sm">Votre code : <strong className="font-mono">{profile.referral_code}</strong></span><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(profile.referral_code!); toast.success('Code copié'); } catch { toast.error('Impossible de copier le code.'); } }}><Copy className="mr-2 h-4 w-4" />Copier</Button></div>}
      <Button disabled={blocked} onClick={() => setReferralOpen(true)}>Recommander un propriétaire</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Mes parrainages et primes en attente</CardTitle></CardHeader><CardContent className="space-y-4">{!data?.referrals.length && <p className="text-sm text-muted-foreground">Aucun parrainage pour le moment. Votre première recommandation peut vous rapporter jusqu’à 160 €.</p>}{data?.referrals.map(r => <div key={r.id} className="rounded-lg border p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{r.contact_name}</h3>{r.cancelled_at && <Badge variant="secondary">Annulé</Badge>}</div><div className="mt-3 flex flex-wrap gap-2">{walletSteps.map(s => <Badge key={s.key} variant={r[s.field] ? 'default' : 'secondary'}>{euros(s.cents)} · {s.key === 'meeting' ? 'Rendez-vous' : s.key === 'mandate' ? 'Mandat' : 'Réservation'} : {r[s.field] ? 'Validé' : r.cancelled_at ? 'Annulé' : 'En attente'}</Badge>)}</div></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Mes demandes d’utilisation</CardTitle></CardHeader><CardContent className="space-y-3">{!data?.requests.length && <p className="text-sm text-muted-foreground">Aucune demande d’utilisation.</p>}{data?.requests.map(r => <div key={r.id} className="rounded-lg border p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{r.kind === 'cleaning' ? 'Ménage propriétaire' : 'Facture Hello Keys'} · {euros(Number(r.amount_cents))}</strong><Badge variant="secondary">{requestLabels[r.status]}</Badge></div><p className="mt-2 whitespace-pre-wrap">{r.details}</p>{r.reference && <p className="mt-2 text-muted-foreground">{r.status === 'applied' ? `Imputé : ${euros(Number(r.applied_cents))} · Référence` : 'Motif'} : {r.reference}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('fr-FR')}</p></div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Historique du Wallet</CardTitle><CardDescription>Crédits, réservations de solde et restitutions. Les anciens crédits ont été convertis à raison de 1 crédit = 1 € ; les primes historiques de 10 crédits ne sont pas versées deux fois.</CardDescription></CardHeader><CardContent>{!data?.entries.length && <p className="text-sm text-muted-foreground">Aucun mouvement pour le moment.</p>}{data?.entries.map(entry => <div key={entry.id} className="flex justify-between gap-4 border-b py-3 last:border-0"><div><p className="text-sm">{entry.description}</p><p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString('fr-FR')}</p></div><span className={`whitespace-nowrap font-semibold ${entry.amount_cents > 0 ? 'text-emerald-600' : ''}`}>{entry.amount_cents > 0 ? '+' : ''}{euros(Number(entry.amount_cents))}</span></div>)}</CardContent></Card>
    </>}
    {compact && <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
      <DialogContent className="max-h-[80dvh] w-[calc(100%-2rem)] max-w-sm gap-4 overflow-y-auto rounded-2xl p-4">
        <DialogHeader className="pr-6 text-left"><DialogTitle className="text-base">Mon Wallet</DialogTitle><DialogDescription className="text-xs">Vos primes de parrainage, prêtes à utiliser.</DialogDescription></DialogHeader>
        <WalletMobileSummary balance={balance} reserved={reserved} blocked={!!blocked} entries={data?.entries ?? []} requests={data?.requests ?? []} onUse={type => { setWalletOpen(false); openRequest(type); }} />
      </DialogContent>
    </Dialog>}
    <Dialog open={kind !== null} onOpenChange={open => { if (!open && !busy) setKind(null); }}><DialogContent><DialogHeader><DialogTitle>{kind === 'cleaning' ? 'Utiliser mon solde pour un ménage' : 'Déduire mon solde de ma prochaine facture'}</DialogTitle><DialogDescription>Hello Keys vérifiera l’éligibilité et vous confirmera la prestation ou l’imputation. Aucun virement bancaire n’est possible.</DialogDescription></DialogHeader><form onSubmit={submitRequest} className="space-y-4"><div><Label htmlFor="wallet-amount">Montant à réserver (€) · disponible {euros(balance)}</Label><Input id="wallet-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required /></div><div><Label htmlFor="wallet-details">{kind === 'cleaning' ? 'Logement, date souhaitée et précisions' : 'Facture ou période concernée'}</Label><Textarea id="wallet-details" value={details} onChange={e => setDetails(e.target.value)} minLength={5} maxLength={2000} required /></div><Button type="submit" disabled={busy}>{busy ? 'Envoi…' : 'Envoyer ma demande'}</Button></form></DialogContent></Dialog>
    <RecommendOwnerDialog open={referralOpen} onOpenChange={setReferralOpen} onSubmitted={refresh} />
  </div>;
}
