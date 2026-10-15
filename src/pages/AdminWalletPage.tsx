import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { amountInCents, euros, loadWallet, requestLabels, walletSteps, WalletRequest } from '@/lib/hello-wallet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminWalletPage() {
  const { profile } = useSession();
  const isAdmin = profile?.role === 'admin';
  const client = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['hello-wallet', 'admin'], enabled: isAdmin, queryFn: async () => {
    const [wallet, owners] = await Promise.all([loadWallet(), supabase.from('profiles').select('id,first_name,last_name,email')]);
    if (owners.error) throw owners.error;
    return { ...wallet, owners: owners.data };
  } });
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<WalletRequest | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState<{ id: string; step: string; name: string } | null>(null);
  const ownerLabel = (id: string) => { const p = data?.owners.find(o => o.id === id); return p ? `${p.first_name ?? ''} ${p.last_name ?? ''} · ${p.email ?? ''}` : id; };
  const refresh = () => client.invalidateQueries({ queryKey: ['hello-wallet'] });
  const validate = async () => {
    if (!validation) return; setBusy(true);
    try { const { error } = await supabase.rpc('hello_wallet_validate_referral', { p_id: validation.id, p_step: validation.step }); if (error) throw error; toast.success(validation.step === 'cancel' ? 'Parrainage annulé' : 'Étape validée : Wallet crédité automatiquement (hors prime historique déjà convertie).'); setValidation(null); await refresh(); }
    catch (err) { toast.error((err as { message: string }).message); } finally { setBusy(false); }
  };
  const reviewRequest = async (apply: boolean) => {
    if (!review || (apply && !confirmed)) return; setBusy(true);
    try { const cents = apply ? amountInCents(amount) : 0; const { error } = await supabase.rpc('hello_wallet_review', { p_id: review.id, p_apply: apply, p_applied_cents: cents, p_reference: reference.trim() }); if (error) throw error; toast.success(apply ? 'Imputation enregistrée ; solde inutilisé restitué.' : 'Demande refusée ; solde restitué.'); setReview(null); await refresh(); }
    catch (err) { toast.error((err as { message: string }).message); } finally { setBusy(false); }
  };
  if (!isAdmin) return <AdminLayout><p className="p-6">Accès réservé à l’équipe Hello Keys.</p></AdminLayout>;
  return <AdminLayout><div className="space-y-6 p-4 sm:p-6"><h1 className="text-2xl font-bold">Wallet & parrainage Hello Keys</h1>
    <Alert><AlertDescription>Les validations déclenchent les primes de 10 €, 140 € et 10 €. Une demande d’utilisation ne crée ni facture ni réservation : vérifiez l’éligibilité, effectuez l’imputation dans votre outil de facturation selon les règles comptables/TVA validées, puis enregistrez ici sa référence. Le solde réservé non utilisé est restitué.</AlertDescription></Alert>
    {isLoading && <p>Chargement…</p>}{error && <Alert variant="destructive"><AlertDescription>Chargement impossible. <Button onClick={() => refetch()}>Réessayer</Button></AlertDescription></Alert>}
    <Card><CardHeader><CardTitle>Parrainages</CardTitle><CardDescription>Vérifiez chaque preuve avant de confirmer l’étape. Pour une réservation, assurez-vous qu’elle est confirmée et non annulée.</CardDescription></CardHeader><CardContent className="space-y-4">{data && !data.referrals.length && <p>Aucun parrainage.</p>}{data?.referrals.map(r => <div key={r.id} className="space-y-3 rounded-lg border p-4"><div><h3 className="font-semibold">{r.contact_name} · {r.contact_email}</h3><p className="text-sm text-muted-foreground">Parrain : {ownerLabel(r.user_id)}</p><p className="whitespace-pre-wrap text-sm">{r.property_details}</p></div>{r.cancelled_at ? <Badge variant="secondary">Annulé</Badge> : <div className="flex flex-wrap gap-2">{walletSteps.map((s, i) => <Button key={s.key} size="sm" variant={r[s.field] ? 'secondary' : 'outline'} disabled={busy || !!r[s.field] || (i > 0 && !r[walletSteps[i - 1].field])} onClick={() => setValidation({ id: r.id, step: s.key, name: `${r.contact_name} — ${s.label}` })}>{r[s.field] ? '✓ Validé' : `Valider ${euros(s.cents)}`} · {s.key === 'meeting' ? 'Rendez-vous' : s.key === 'mandate' ? 'Mandat' : 'Réservation'}</Button>)}{!r.meeting_at && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setValidation({ id: r.id, step: 'cancel', name: r.contact_name })}>Annuler le parrainage</Button>}</div>}</div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Demandes d’utilisation</CardTitle></CardHeader><CardContent className="space-y-4">{data && !data.requests.length && <p>Aucune demande.</p>}{data?.requests.map(r => <div key={r.id} className="space-y-2 rounded-lg border p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{r.kind === 'cleaning' ? 'Ménage propriétaire' : 'Facture'} · {euros(Number(r.amount_cents))}</strong><Badge variant="secondary">{requestLabels[r.status]}</Badge></div><p className="text-sm text-muted-foreground">{ownerLabel(r.user_id)} · {new Date(r.created_at).toLocaleString('fr-FR')}</p><p className="whitespace-pre-wrap text-sm">{r.details}</p>{r.reference && <p className="text-sm">{r.status === 'applied' ? `Imputé : ${euros(Number(r.applied_cents))} · Référence` : 'Motif'} : {r.reference}</p>}{r.status === 'pending' && <Button disabled={busy} onClick={() => { setReview(r); setAmount((Number(r.amount_cents) / 100).toFixed(2)); setReference(''); setConfirmed(false); }}>Traiter la demande</Button>}</div>)}</CardContent></Card>
    <Card><CardHeader><CardTitle>Journal financier</CardTitle></CardHeader><CardContent>{data?.entries.map(e => <div key={e.id} className="flex justify-between gap-3 border-b py-3 text-sm"><div><p>{ownerLabel(e.user_id)}</p><p>{e.description}</p><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('fr-FR')}</p></div><strong className="whitespace-nowrap">{e.amount_cents > 0 ? '+' : ''}{euros(Number(e.amount_cents))}</strong></div>)}</CardContent></Card>
    <Dialog open={!!validation} onOpenChange={open => { if (!open && !busy) setValidation(null); }}><DialogContent><DialogHeader><DialogTitle>{validation?.step === 'cancel' ? 'Annuler ce parrainage ?' : 'Confirmer l’étape vérifiée'}</DialogTitle><DialogDescription>{validation?.name}. {validation?.step !== 'cancel' && 'Cette confirmation crédite le Wallet automatiquement, sans doublon.'}</DialogDescription></DialogHeader><Button disabled={busy} onClick={validate}>{busy ? 'Traitement…' : 'Confirmer'}</Button></DialogContent></Dialog>
    <Dialog open={!!review} onOpenChange={open => { if (!open && !busy) setReview(null); }}><DialogContent><DialogHeader><DialogTitle>Traiter l’utilisation du Wallet</DialogTitle><DialogDescription>Maximum réservé : {euros(Number(review?.amount_cents ?? 0))}. Tout reliquat sera restitué au propriétaire.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="applied-wallet">Montant effectivement imputé (€)</Label><Input id="applied-wallet" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /></div><div><Label htmlFor="wallet-reference">Référence facture / prestation, ou motif du refus</Label><Input id="wallet-reference" value={reference} onChange={e => setReference(e.target.value)} maxLength={500} /></div><div className="flex items-start gap-2"><Checkbox id="wallet-confirm" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><Label htmlFor="wallet-confirm" className="text-sm leading-relaxed">J’ai vérifié l’éligibilité et effectué l’imputation sur la facture ou la prestation, selon le traitement comptable validé.</Label></div><div className="flex flex-wrap gap-2"><Button disabled={busy || !confirmed || reference.trim().length < 3} onClick={() => reviewRequest(true)}>Confirmer l’imputation</Button><Button variant="destructive" disabled={busy || reference.trim().length < 3} onClick={() => reviewRequest(false)}>Refuser et restituer</Button></div></div></DialogContent></Dialog>
  </div></AdminLayout>;
}
