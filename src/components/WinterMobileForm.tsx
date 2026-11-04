import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { Snowflake, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import type { HivernageInstructions } from '@/lib/hivernage-api';
import type { UserRoom } from '@/lib/user-room-api';
import { WINTER_ACTIONS, WINTER_NOTICE, winterClosureSummary } from '@/lib/winter-season';

export type WinterMobileValues = { user_room_id: string; instructions: HivernageInstructions; comments: string };
type Props = {
  form: UseFormReturn<WinterMobileValues>;
  rooms: UserRoom[];
  loading: boolean;
  error: boolean;
  submittedRoomIds: ReadonlySet<string | null | undefined>;
  sent: WinterMobileValues | null;
  onRetry: () => void;
  onSubmit: (values: WinterMobileValues) => Promise<void>;
  onReset: () => void;
};

export default function WinterMobileForm({ form, rooms, loading, error, submittedRoomIds, sent, onRetry, onSubmit, onReset }: Props) {
  const [index, setIndex] = useState(0);
  const content = useRef<HTMLDivElement>(null);
  const values = useWatch({ control: form.control });
  const instructions = values.instructions || {};
  const steps = ['room', 'closure', ...(instructions.close_for_winter ? ['dates'] : []), 'holidays', 'actions', 'comments', 'summary'];
  const step = steps[index];
  const room = rooms.find(r => r.id === values.user_room_id);
  const selected = WINTER_ACTIONS.filter(action => instructions[action.key]);
  const titles: Record<string, string> = { room: 'Quel logement ?', closure: 'Fermer cet hiver ?', dates: 'Quelles dates ?', holidays: 'Notre pause hivernale', actions: 'Avant notre départ', comments: 'Une précision ?', summary: 'Vérifiez, puis envoyez' };
  useEffect(() => { content.current?.scrollTo(0, 0); }, [step]);

  const next = async () => {
    let valid = true;
    if (step === 'room') valid = await form.trigger('user_room_id');
    if (step === 'closure') valid = await form.trigger('instructions.close_for_winter');
    if (step === 'dates') valid = await form.trigger(['instructions.closure_start', 'instructions.closure_end']);
    if (step === 'holidays') valid = await form.trigger('instructions.holiday_notice_acknowledged');
    if (valid) setIndex(i => i + 1);
  };

  return (
    <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900 [padding-top:env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9"><Link to="/v4" aria-label="Retour à l’accueil"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="flex items-center gap-2 text-base font-semibold"><Snowflake className="h-5 w-5 text-sky-600" />Hivernage 2027</h1>
        <span className="w-9 text-right text-xs text-slate-500">{sent ? <Check className="ml-auto h-5 w-5 text-emerald-600" /> : `${index + 1}/${steps.length}`}</span>
      </header>
      {sent ? <>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 py-5 text-center">
          <CheckCircle2 className="h-14 w-14 shrink-0 text-emerald-500" />
          <h2 className="text-xl font-semibold">Consignes envoyées !</h2>
          <p className="text-sm text-slate-600">{rooms.find(r => r.id === sent.user_room_id)?.room_name}</p>
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">Hello Keys a reçu votre demande. Les calendriers ne sont pas modifiés automatiquement par ce formulaire.</p>
        </div>
        <footer className="shrink-0 space-y-2 border-t bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="w-full bg-sky-700 hover:bg-sky-800" onClick={() => { onReset(); setIndex(0); }}>Préparer un autre logement</Button>
          <Button asChild variant="ghost" className="w-full"><Link to="/v4">Retour à l’accueil</Link></Button>
        </footer>
      </> : <>
        <Progress value={(index + 1) / steps.length * 100} className="h-1 shrink-0 rounded-none" />
        <Form {...form}>
          <form onSubmit={e => e.preventDefault()} className="flex min-h-0 flex-1 flex-col">
            <div ref={content} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <div key={step} className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
                <h2 className="text-xl font-semibold">{titles[step]}</h2>
                {step === 'room' && <>
                  <p className="text-sm text-slate-500">Une demande par logement.</p>
                  <FormField control={form.control} name="user_room_id" rules={{ required: 'Choisissez un logement.' }} render={({ field }) => <FormItem><FormLabel>Logement</FormLabel><FormControl><select {...field} disabled={loading || error} className="h-12 w-full rounded-xl border bg-white px-3 text-sm"><option value="">{loading ? 'Chargement…' : 'Choisir un logement'}</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}{submittedRoomIds.has(r.id) ? ' · Déjà envoyé' : ''}</option>)}</select></FormControl><FormMessage /></FormItem>} />
                  {values.user_room_id && submittedRoomIds.has(values.user_room_id) && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Déjà renseigné. Un nouvel envoi crée une nouvelle demande.</p>}
                  {error && <Button type="button" variant="outline" onClick={onRetry}>Réessayer</Button>}
                  {!loading && !error && !rooms.length && <p className="text-sm text-slate-500">Aucun logement disponible. Contactez Hello Keys.</p>}
                </>}
                {step === 'closure' && <>
                  <p className="text-sm text-slate-500">En dehors des vacances Hello Keys.</p>
                  <FormField control={form.control} name="instructions.close_for_winter" rules={{ validate: value => typeof value === 'boolean' || 'Choisissez une option.' }} render={({ field }) => <FormItem><FormLabel className="sr-only">Fermeture hivernale</FormLabel><div className="space-y-3">{[{ value: true, text: 'Oui, je choisis mes dates' }, { value: false, text: 'Non, poursuivre les locations' }].map(option => <Button key={String(option.value)} type="button" variant="outline" aria-pressed={field.value === option.value} className={`h-14 w-full justify-start rounded-xl text-sm ${field.value === option.value ? 'border-sky-600 bg-sky-50 text-sky-900' : 'bg-white'}`} onClick={() => { field.onChange(option.value); if (!option.value) { form.setValue('instructions.closure_start', ''); form.setValue('instructions.closure_end', ''); } }}>{option.text}{field.value === option.value && <Check className="ml-auto h-4 w-4" />}</Button>)}</div><FormMessage /></FormItem>} />
                </>}
                {step === 'dates' && <>
                  <p className="text-sm text-slate-500">Votre fermeture personnelle, dates incluses.</p>
                  <FormField control={form.control} name="instructions.closure_start" rules={{ validate: value => !form.getValues('instructions.close_for_winter') || !!value || 'Indiquez une date.' }} render={({ field }) => <FormItem><FormLabel>Du</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} className="h-12 bg-white" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="instructions.closure_end" rules={{ validate: value => !form.getValues('instructions.close_for_winter') || (!!value && value >= (form.getValues('instructions.closure_start') || '')) || 'La fin doit être après le début ou le même jour.' }} render={({ field }) => <FormItem><FormLabel>Au (inclus)</FormLabel><FormControl><Input type="date" min={instructions.closure_start || undefined} {...field} value={field.value || ''} className="h-12 bg-white" /></FormControl><FormMessage /></FormItem>} />
                </>}
                {step === 'holidays' && <>
                  <div className="rounded-xl bg-sky-50 p-4"><p className="mb-2 font-semibold text-sky-900">3 janvier → 5 février 2027</p><p className="text-sm leading-relaxed text-sky-950">{WINTER_NOTICE}</p></div>
                  <FormField control={form.control} name="instructions.holiday_notice_acknowledged" rules={{ validate: value => value === true || 'Confirmez avoir lu cette information.' }} render={({ field }) => <FormItem><div className="flex items-center gap-3 rounded-xl border bg-white p-4"><FormControl><Checkbox checked={!!field.value} onCheckedChange={value => field.onChange(value === true)} /></FormControl><FormLabel className="text-sm">J’ai pris connaissance de ces informations.</FormLabel></div><FormMessage /></FormItem>} />
                </>}
                {step === 'actions' && <>
                  <p className="text-xs text-slate-500">Sans linge pendant notre fermeture.</p>
                  <div className="divide-y rounded-xl border bg-white">
                    <FormField control={form.control} name="instructions.no_change" render={({ field }) => <FormItem className="flex min-h-12 items-center justify-between gap-3 px-3 py-2"><FormLabel className="text-sm">Ne rien modifier</FormLabel><FormControl><Switch checked={!!field.value} onCheckedChange={value => { field.onChange(value); if (value) WINTER_ACTIONS.forEach(action => form.setValue(`instructions.${action.key}`, false)); }} /></FormControl></FormItem>} />
                    {WINTER_ACTIONS.map(action => <FormField key={action.key} control={form.control} name={`instructions.${action.key}`} render={({ field }) => <FormItem className="flex min-h-12 items-center justify-between gap-3 px-3 py-2"><FormLabel className="text-sm">{action.label}</FormLabel><FormControl><Switch checked={!!field.value} onCheckedChange={value => { field.onChange(value); if (value) form.setValue('instructions.no_change', false); }} /></FormControl></FormItem>} />)}
                  </div>
                </>}
                {step === 'comments' && <>
                  <p className="text-sm text-slate-500">Facultatif : vous pouvez passer cette étape.</p>
                  <FormField control={form.control} name="comments" render={({ field }) => <FormItem><FormLabel>Autres consignes</FormLabel><FormControl><Textarea {...field} rows={4} className="resize-none bg-white" placeholder="Accès, équipements, précautions…" /></FormControl><FormMessage /></FormItem>} />
                </>}
                {step === 'summary' && <>
                  <div className="space-y-3 rounded-xl border bg-white p-4 text-sm">
                    <p className="break-words font-semibold">{room?.room_name}</p>
                    <p>{winterClosureSummary(instructions)}</p>
                    <div className="border-t pt-2">{instructions.no_change ? <p>Ne rien modifier</p> : selected.length ? <ul className="space-y-1">{selected.map(action => <li key={action.key} className="flex items-center gap-2"><Check className="h-3 w-3 text-sky-600" />{action.label}</li>)}</ul> : <p>Aucune action spécifique.</p>}</div>
                    {values.comments && <p className="line-clamp-2 break-words border-t pt-2 text-xs text-slate-500">{values.comments}</p>}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">Demande transmise à Hello Keys. Aucun blocage automatique du calendrier par ce formulaire.</p>
                </>}
              </div>
            </div>
            <footer className="flex shrink-0 justify-between gap-3 border-t bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button type="button" variant="ghost" disabled={index === 0 || form.formState.isSubmitting} onClick={() => setIndex(i => i - 1)}>Retour</Button>
              {step === 'summary' ? <Button type="button" disabled={form.formState.isSubmitting} onClick={form.handleSubmit(onSubmit)} className="bg-sky-700 hover:bg-sky-800">{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Envoyer</Button> : <Button type="button" disabled={loading || error || !rooms.length} onClick={next} className="bg-sky-700 hover:bg-sky-800">{step === 'comments' && !values.comments ? 'Passer' : 'Continuer'}<ArrowRight className="ml-2 h-4 w-4" /></Button>}
            </footer>
          </form>
        </Form>
      </>}
    </div>
  );
}
