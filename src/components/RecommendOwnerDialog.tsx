import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Send, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecommendOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => Promise<unknown>;
}

export default function RecommendOwnerDialog({ open, onOpenChange, onSubmitted }: RecommendOwnerDialogProps) {
  const { session, profile } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [property, setProperty] = useState('');
  const [consent, setConsent] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = profile?.is_banned || profile?.is_contract_terminated;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !consent || !session || blocked) return;
    setError(null);
    if (name.trim().length < 2) { setError('Indiquez le prénom et le nom du propriétaire.'); return; }
    if (email.trim().toLowerCase() === session.user.email?.toLowerCase()) { setError('Indiquez l’email du propriétaire, pas le vôtre.'); return; }
    setBusy(true);
    try {
      const { error: saveError } = await supabase.from('hello_wallet_referrals').insert({
        user_id: session.user.id,
        contact_name: name.trim(),
        contact_email: email.trim().toLowerCase(),
        property_details: property.trim(),
        contact_consent: true,
      });
      if (saveError) throw new Error(saveError.code === '23505' ? 'Ce propriétaire a déjà été recommandé.' : 'Envoi impossible pour le moment. Réessayez dans un instant.');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
      return;
    }
    setBusy(false);
    onOpenChange(false);
    setName(''); setEmail(''); setProperty(''); setConsent(false); setDetailsOpen(false);
    toast.success('Recommandation envoyée ! Hello Keys contactera ce propriétaire.');
    await onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!busy) { setError(null); onOpenChange(value); } }}>
      <DialogContent
        className="flex max-h-[90dvh] w-full max-w-md flex-col gap-0 overflow-hidden p-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-t-2xl sm:w-[calc(100%-2rem)] sm:rounded-2xl"
        onOpenAutoFocus={event => event.preventDefault()}
        onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
        onPointerDownOutside={event => { if (busy) event.preventDefault(); }}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-10 text-left">
          <DialogTitle className="text-lg leading-snug">Recommander un propriétaire</DialogTitle>
          <DialogDescription className="text-sm">Ses coordonnées suffisent. Nous prenons le relais.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} aria-busy={busy} className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <fieldset disabled={busy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recommend-owner-name" className="text-sm">Son prénom et son nom</Label>
                <Input
                  id="recommend-owner-name" name="contact_name" autoComplete="section-referral name"
                  value={name} onChange={event => { setName(event.target.value); setError(null); }}
                  placeholder="Ex. : Marie Dupont" minLength={2} maxLength={150} required
                  enterKeyHint="next" className="h-12 rounded-xl text-base md:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recommend-owner-email" className="text-sm">Son adresse email</Label>
                <Input
                  id="recommend-owner-email" name="contact_email" type="email" inputMode="email"
                  autoComplete="section-referral email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  value={email} onChange={event => { setEmail(event.target.value); setError(null); }}
                  placeholder="marie@exemple.fr" maxLength={254} required
                  enterKeyHint="done" className="h-12 rounded-xl text-base md:text-base"
                />
              </div>

              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button type="button" variant="ghost" className="h-auto min-h-11 w-full justify-between whitespace-normal px-0 text-left text-sm" disabled={busy}>
                    <span>Préciser le logement <span className="font-normal text-muted-foreground">(facultatif)</span></span>
                    {detailsOpen ? <ChevronUp className="ml-2 h-4 w-4 shrink-0" /> : <ChevronDown className="ml-2 h-4 w-4 shrink-0" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Label htmlFor="recommend-owner-property" className="sr-only">Logement et précisions facultatives</Label>
                  <Textarea
                    id="recommend-owner-property" name="property_details" value={property}
                    onChange={event => setProperty(event.target.value)} maxLength={2000} rows={3}
                    placeholder="Ville du logement, type de bien, informations utiles…"
                    className="min-h-24 resize-none rounded-xl text-base md:text-base"
                  />
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
                <Checkbox id="recommend-owner-consent" checked={consent} onCheckedChange={value => setConsent(value === true)} className="mt-0.5 h-5 w-5 shrink-0" />
                <Label htmlFor="recommend-owner-consent" className="cursor-pointer text-sm font-normal leading-relaxed">Il m’a donné son accord pour être contacté par Hello Keys.</Label>
              </div>
            </fieldset>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />La première prime est créditée après validation d’un rendez-vous qualifié, pas à l’envoi du formulaire.</p>
          </div>

          <div className="shrink-0 border-t bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button type="submit" disabled={busy || !consent || !name.trim() || !email.trim() || !!blocked} className="h-12 w-full rounded-xl text-sm">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {busy ? 'Envoi en cours…' : 'Envoyer ma recommandation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
