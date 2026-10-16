import { ChevronRight, Receipt, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { euros, requestLabels, WalletEntry, WalletRequest } from '@/lib/hello-wallet';

interface WalletMobileSummaryProps {
  balance: number;
  reserved: number;
  blocked: boolean;
  entries: WalletEntry[];
  requests: WalletRequest[];
  onUse: (kind: 'cleaning' | 'invoice') => void;
}

export default function WalletMobileSummary({ balance, reserved, blocked, entries, requests, onUse }: WalletMobileSummaryProps) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-xl bg-primary/5 px-4 py-3">
        <p className="text-xs text-muted-foreground">Disponible pour vos dépenses Hello Keys</p>
        <p className="mt-1 text-2xl font-bold text-primary">{euros(balance)}</p>
        {reserved > 0 && <p className="mt-1 text-xs text-muted-foreground">{euros(reserved)} mis de côté pour vos demandes en cours.</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">À quoi sert votre solde ?</p>
        <Button variant="outline" className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal rounded-xl px-3 py-2 text-left" disabled={balance <= 0 || blocked} onClick={() => onUse('cleaning')}>
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Payer un ménage</span><span className="block text-xs font-normal text-muted-foreground">Pour votre séjour personnel</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
        <Button variant="outline" className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal rounded-xl px-3 py-2 text-left" disabled={balance <= 0 || blocked} onClick={() => onUse('invoice')}>
          <Receipt className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Réduire ma prochaine facture</span><span className="block text-xs font-normal text-muted-foreground">Sur une facture Hello Keys éligible</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
        {balance <= 0 && <p className="text-xs text-muted-foreground">Vos primes validées apparaîtront ici.</p>}
        <p className="text-xs leading-relaxed text-muted-foreground">Vous choisissez un montant, puis Hello Keys valide votre demande. Le reste reste disponible. Aucun retrait bancaire.</p>
      </div>

      <Accordion type="single" collapsible className="border-t">
        <AccordionItem value="requests">
          <AccordionTrigger className="py-3 text-sm">Mes demandes ({requests.length})</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {!requests.length && <p className="text-xs text-muted-foreground">Vous n’avez pas encore utilisé votre solde.</p>}
            {requests.map(request => <div key={request.id} className="min-w-0 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-2 text-xs"><strong>{request.kind === 'cleaning' ? 'Ménage personnel' : 'Réduction de facture'}</strong><span className="shrink-0 font-semibold">{euros(Number(request.amount_cents))}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">{requestLabels[request.status]}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs">{request.details}</p>
              {request.reference && <p className="mt-1 break-words text-xs text-muted-foreground">{request.status === 'applied' ? `${euros(Number(request.applied_cents))} utilisés · Référence` : 'Motif'} : {request.reference}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">{new Date(request.created_at).toLocaleDateString('fr-FR')}</p>
            </div>)}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="history" className="border-b-0">
          <AccordionTrigger className="py-3 text-sm">Historique du solde</AccordionTrigger>
          <AccordionContent>
            {!entries.length && <p className="text-xs text-muted-foreground">Aucun mouvement pour le moment.</p>}
            {entries.map(entry => <div key={entry.id} className="flex items-start justify-between gap-3 border-b py-2 first:pt-0 last:border-0">
              <div className="min-w-0"><p className="break-words text-xs">{entry.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString('fr-FR')}</p></div>
              <span className={`shrink-0 text-xs font-semibold ${entry.amount_cents > 0 ? 'text-emerald-600' : ''}`}>{entry.amount_cents > 0 ? '+' : ''}{euros(Number(entry.amount_cents))}</span>
            </div>)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
