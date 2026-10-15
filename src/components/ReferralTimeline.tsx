import { useState } from 'react';
import { Check, ChevronRight, Copy, Gift, LockKeyhole, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { euros, walletSteps, WalletReferral } from '@/lib/hello-wallet';
import { toast } from 'sonner';

const missions = [
  { title: 'Présentez un propriétaire', description: 'Il est qualifié et accepte un rendez-vous avec Hello Keys.' },
  { title: 'Il signe son mandat', description: 'Il nous confie la gestion de son logement.' },
  { title: 'Sa première réservation arrive', description: 'La réservation est confirmée et non annulée.' },
];

interface ReferralTimelineProps {
  referrals: WalletReferral[];
  balance: number;
  referralCode?: string;
  blocked: boolean;
  onRecommend: () => void;
  onWallet: () => void;
}

export default function ReferralTimeline({ referrals, balance, referralCode, blocked, onRecommend, onWallet }: ReferralTimelineProps) {
  const [selectedId, setSelectedId] = useState('');
  const selected = referrals.find(r => r.id === selectedId) ?? referrals[0];
  const completed = selected ? walletSteps.filter(s => selected[s.field]).length : 0;
  const nextStep = selected ? walletSteps.findIndex(s => !selected[s.field]) : 0;
  const cancelled = !!selected?.cancelled_at;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-hk-600 p-6 text-white shadow-sm">
        <Gift className="pointer-events-none absolute -right-5 -top-5 h-36 w-36 rotate-12 text-white/10" aria-hidden="true" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Un proche, un logement, une récompense</p>
        <h2 className="relative mt-4 text-4xl font-bold tracking-tight">Jusqu’à 160 €</h2>
        <p className="relative mt-2 text-sm text-white/90">par propriétaire parrainé, dans votre Wallet.</p>
        <Button onClick={onRecommend} disabled={blocked} className="relative mt-5 w-full rounded-xl bg-white text-hk-700 hover:bg-white/90">
          <Plus className="mr-2 h-4 w-4" />Parrainer un propriétaire
        </Button>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">{selected ? 'Votre progression' : '3 missions pour gagner'}</h2>
          {selected && <span className="rounded-full bg-hk-50 px-3 py-1 text-xs font-semibold text-hk-700">{cancelled ? 'Annulé' : `${completed}/3 validées`}</span>}
        </div>
        {selected && (
          <div className="mb-6">
            <label htmlFor="timeline-referral" className="mb-2 block text-xs font-medium text-slate-500">Mon propriétaire parrainé</label>
            <Select value={selected.id} onValueChange={setSelectedId}>
              <SelectTrigger id="timeline-referral" className="rounded-xl border-slate-200 bg-slate-50 text-slate-900"><SelectValue /></SelectTrigger>
              <SelectContent>{referrals.map(r => <SelectItem key={r.id} value={r.id}>{r.contact_name}{r.cancelled_at ? ' · Annulé' : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <ol>
          {walletSteps.map((step, index) => {
            const done = !!selected?.[step.field];
            const current = !cancelled && !done && index === nextStep;
            const status = done ? 'Validée' : cancelled ? 'Annulée' : current ? (selected ? 'En cours' : 'À vous de jouer') : 'Étape suivante';
            return (
              <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
                {index < walletSteps.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-[19px] top-10 w-0.5 ${done ? 'bg-hk-300' : 'bg-slate-100'}`} />}
                <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-hk-600 text-white' : current ? 'border-2 border-hk-500 bg-hk-50 text-hk-700' : 'bg-slate-100 text-slate-400'}`}>
                  {done ? <Check className="h-5 w-5" /> : cancelled ? <LockKeyhole className="h-4 w-4" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{missions[index].title}</h3>
                    <span className={`whitespace-nowrap rounded-lg px-2 py-1 text-sm font-bold ${done || current ? 'bg-hk-50 text-hk-700' : 'bg-slate-50 text-slate-500'}`}>+{step.cents / 100} €</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{missions[index].description}</p>
                  <p className={`mt-2 text-[11px] font-semibold ${done || current ? 'text-hk-600' : 'text-slate-400'}`}>{status}{done ? ' par Hello Keys' : ''}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-center text-xs leading-relaxed text-slate-500">Hello Keys vérifie chaque mission, puis crédite votre prime.</p>
        </div>
      </section>

      <button type="button" onClick={onWallet} className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hk-50 text-hk-600"><Wallet className="h-5 w-5" /></span>
        <span className="flex-1"><span className="block text-xs text-slate-500">Mon Wallet · solde disponible</span><span className="block text-lg font-bold text-slate-900">{euros(balance)}</span></span>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </button>
      {referralCode && <div className="flex items-center justify-center gap-2 pb-2 text-xs text-slate-500"><span>Votre code : <strong className="font-mono text-slate-700">{referralCode}</strong></span><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Copier mon code de parrainage" onClick={async () => { try { await navigator.clipboard.writeText(referralCode); toast.success('Code copié'); } catch { toast.error('Impossible de copier le code.'); } }}><Copy className="h-3.5 w-3.5" /></Button></div>}
    </div>
  );
}
