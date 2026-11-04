import React, { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Snowflake, Home, CalendarDays, Check, ChevronLeft, ArrowRight, Droplet, Flame, Trash2, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { createHivernageRequest, getMyHivernageRequests, HivernageInstructions, HivernageRequest } from '@/lib/hivernage-api';
import { getUserRooms, UserRoom } from '@/lib/user-room-api';
import { WINTER_ACTIONS, WINTER_NOTICE, WINTER_SEASON, winterClosureSummary } from '@/lib/winter-season';
import WinterSubmittedRooms from '@/components/WinterSubmittedRooms';
import WinterMobileForm from '@/components/WinterMobileForm';
import { useIsMobile } from '@/hooks/use-mobile';

type FormValues = { user_room_id: string; instructions: HivernageInstructions; comments: string };
const steps = ['Votre logement', 'Votre hiver', 'Nos vacances', 'Récapitulatif'];
const icons = [Droplet, Flame, Snowflake, Trash2, Lock];
const defaults: FormValues = {
  user_room_id: '',
  instructions: { season: WINTER_SEASON, heating_frost_mode: true, close_shutters: true, no_change: false, holiday_notice_acknowledged: false },
  comments: '',
};

const Hivernage2026Page = () => {
  const isMobile = useIsMobile();
  const form = useForm<FormValues>({ defaultValues: defaults, shouldUnregister: false });
  const [rooms, setRooms] = useState<UserRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState(false);
  const [requests, setRequests] = useState<HivernageRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState(false);
  const submittedRoomIds = new Set(requests.filter(request => request.instructions?.season === WINTER_SEASON && request.user_room_id).map(request => request.user_room_id));
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState<FormValues | null>(null);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const values = useWatch({ control: form.control });
  const instructions = values.instructions || {};
  const room = rooms.find(r => r.id === values.user_room_id);
  const selected = WINTER_ACTIONS.filter(action => instructions[action.key]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    setRoomError(false);
    try {
      const list = await getUserRooms();
      setRooms(list);
      if (list.length === 1) form.setValue('user_room_id', list[0].id);
    } catch {
      setRoomError(true);
      toast.error('Impossible de charger vos logements. Veuillez réessayer.');
    } finally { setLoadingRooms(false); }
  };
  const loadRequests = async () => {
    setLoadingRequests(true);
    setRequestsError(false);
    try {
      setRequests(await getMyHivernageRequests());
    } catch {
      setRequestsError(true);
    } finally { setLoadingRequests(false); }
  };
  useEffect(() => { void loadRooms(); void loadRequests(); }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);

  const next = async () => {
    let valid = true;
    if (step === 0) valid = await form.trigger('user_room_id');
    if (step === 1) valid = await form.trigger(['instructions.close_for_winter', 'instructions.closure_start', 'instructions.closure_end']);
    if (step === 2) valid = await form.trigger('instructions.holiday_notice_acknowledged');
    if (valid) setStep(s => Math.min(s + 1, 3));
  };

  const onSubmit = async (data: FormValues) => {
    if (submitting.current) return;
    if (!rooms.some(r => r.id === data.user_room_id)) {
      toast.error('Veuillez sélectionner un de vos logements.');
      setStep(0);
      return;
    }
    if (typeof data.instructions.close_for_winter !== 'boolean' || (data.instructions.close_for_winter && (!data.instructions.closure_start || !data.instructions.closure_end || data.instructions.closure_end < data.instructions.closure_start))) {
      toast.error('Veuillez vérifier votre choix de fermeture et les dates.');
      setStep(1);
      return;
    }
    if (!data.instructions.holiday_notice_acknowledged) { setStep(2); return; }
    submitting.current = true;
    try {
      const request = await createHivernageRequest(data);
      setRequests(previous => [request, ...previous]);
      setSent(data);
      toast.success('Vos consignes ont été transmises à Hello Keys.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d’envoyer vos consignes. Veuillez réessayer.');
    } finally { submitting.current = false; }
  };

  if (isMobile) return <WinterMobileForm
    form={form}
    rooms={rooms}
    loading={loadingRooms}
    error={roomError}
    submittedRoomIds={submittedRoomIds}
    sent={sent}
    onRetry={loadRooms}
    onSubmit={onSubmit}
    onReset={() => { form.reset(defaults); setSent(null); setStep(0); }}
  />;

  return (
    <MainLayout>
      <div className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
        <header className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-6 text-white md:p-10">
          <Snowflake aria-hidden="true" className="absolute -right-8 -top-8 h-56 w-56 text-white/5 motion-safe:animate-[spin_40s_linear_infinite]" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium"><Snowflake className="h-4 w-4" /> Hiver {WINTER_SEASON}</span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">Un hiver serein commence ici.</h1>
            <p className="mt-3 text-sm leading-relaxed text-sky-100 md:text-base">Préparons ensemble votre logement : vos dates de fermeture, vos préférences et les consignes pour notre pause hivernale.</p>
            <div className="mt-6 flex items-center gap-3 text-sm text-sky-100"><CalendarDays className="h-5 w-5 shrink-0" /> Vacances Hello Keys · 3 janvier → 5 février 2027</div>
          </div>
        </header>

        <WinterSubmittedRooms requests={requests} rooms={rooms} loading={loadingRequests} error={requestsError} onRetry={loadRequests} />

        {sent ? (
          <Card className="mx-auto max-w-2xl rounded-2xl"><CardContent className="space-y-5 p-6 text-center md:p-10">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500 motion-safe:animate-in motion-safe:zoom-in" />
            <h2 className="text-2xl font-bold">Votre hiver est prêt à être organisé !</h2>
            <p className="text-muted-foreground">Les consignes pour <strong>{rooms.find(r => r.id === sent.user_room_id)?.room_name}</strong> ont bien été transmises à notre équipe.</p>
            <p className="rounded-xl bg-muted p-4 text-sm">Il s’agit d’une demande à organiser par Hello Keys : l’envoi ne modifie pas directement votre calendrier.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => { form.reset(defaults); setSent(null); setStep(0); }}>Préparer un autre logement</Button>
              <Button asChild variant="outline"><Link to="/">Retour à mon espace</Link></Button>
            </div>
          </CardContent></Card>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
            <Card className="overflow-hidden rounded-2xl">
              <CardContent className="p-5 md:p-8">
                <nav aria-label="Étapes du formulaire" className="mb-6 grid grid-cols-4 gap-2">
                  {steps.map((label, index) => <div key={label} className="text-center">
                    <span className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${index <= step ? 'bg-sky-700 text-white' : 'bg-muted text-muted-foreground'}`}>{index < step ? <Check className="h-4 w-4" /> : index + 1}</span>
                    <span className={`text-xs ${index === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}`} aria-current={index === step ? 'step' : undefined}>{label}</span>
                  </div>)}
                </nav>
                <Progress value={(step + 1) * 25} className="mb-8 h-1.5" />
                <Form {...form}>
                  <form onSubmit={e => { e.preventDefault(); }} className="space-y-6">
                    <div key={step} className="space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-300">
                      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{['Quel logement préparons-nous ?', 'Souhaitez-vous fermer votre logement cet hiver ?', 'Que devons-nous préparer avant nos vacances ?', 'Tout est correct ?'][step]}</h2>
                      {step === 0 && <>
                        <p className="text-sm text-muted-foreground">Une demande par logement, pour des consignes adaptées à chacun.</p>
                        <FormField control={form.control} name="user_room_id" rules={{ required: 'Sélectionnez le logement concerné.' }} render={({ field }) => <FormItem>
                          <FormLabel>Votre logement</FormLabel><FormControl><select {...field} disabled={loadingRooms || roomError} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm">
                            <option value="">{loadingRooms ? 'Chargement des logements…' : 'Sélectionner un logement'}</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}{submittedRoomIds.has(r.id) ? ' — ✓ Consignes déjà envoyées' : ''}</option>)}
                          </select></FormControl><FormMessage />
                        </FormItem>} />
                        {values.user_room_id && submittedRoomIds.has(values.user_room_id) && <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />Les consignes de ce logement ont déjà été envoyées pour cet hiver. Un nouvel envoi créera une nouvelle demande.</p>}
                        {roomError && <Button type="button" variant="outline" onClick={loadRooms}>Réessayer le chargement</Button>}
                        {!loadingRooms && !roomError && !rooms.length && <p className="text-sm text-muted-foreground">Aucun logement disponible. Contactez Hello Keys avant de renseigner vos consignes.</p>}
                      </>}
                      {step === 1 && <>
                        <p className="text-sm text-muted-foreground">Indiquez une fermeture personnelle pendant l’hiver. La fermeture à la location du 3 janvier au 5 février 2027 s’applique dans tous les cas.</p>
                        <FormField control={form.control} name="instructions.close_for_winter" rules={{ validate: value => typeof value === 'boolean' || 'Choisissez une des deux options.' }} render={({ field }) => <FormItem>
                          <FormLabel>Votre préférence</FormLabel>
                          <div className="grid gap-3 sm:grid-cols-2">{[{ value: true, title: 'Oui, fermer le logement', text: 'Je choisis mes dates de fermeture.' }, { value: false, title: 'Non, poursuivre les locations', text: 'Hors période de vacances Hello Keys.' }].map(option => <Button key={String(option.value)} type="button" variant="outline" aria-pressed={field.value === option.value} onClick={() => { field.onChange(option.value); if (!option.value) { form.setValue('instructions.closure_start', ''); form.setValue('instructions.closure_end', ''); } }} className={`h-auto whitespace-normal justify-start rounded-xl p-4 text-left ${field.value === option.value ? 'border-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100' : ''}`}><span><span className="block font-semibold">{option.title}</span><span className="mt-1 block text-xs font-normal">{option.text}</span></span></Button>)}</div><FormMessage />
                        </FormItem>} />
                        {instructions.close_for_winter && <div className="grid gap-4 rounded-xl bg-muted/40 p-4 sm:grid-cols-2 motion-safe:animate-in motion-safe:fade-in">
                          <FormField control={form.control} name="instructions.closure_start" rules={{ validate: value => !form.getValues('instructions.close_for_winter') || !!value || 'Indiquez la date de fermeture.' }} render={({ field }) => <FormItem><FormLabel>Fermeture à partir du</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>} />
                          <FormField control={form.control} name="instructions.closure_end" rules={{ validate: value => !form.getValues('instructions.close_for_winter') || (!!value && value >= (form.getValues('instructions.closure_start') || '')) || 'La fin doit être égale ou postérieure au début.' }} render={({ field }) => <FormItem><FormLabel>Dernier jour de fermeture (inclus)</FormLabel><FormControl><Input type="date" min={instructions.closure_start || undefined} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>} />
                        </div>}
                      </>}
                      {step === 2 && <>
                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">{WINTER_NOTICE}</div>
                        <p className="text-sm text-muted-foreground">Choisissez les actions à réaliser avant notre départ. Pour cette période, votre logement n’aura pas de linge.</p>
                        <FormField control={form.control} name="instructions.no_change" render={({ field }) => <FormItem className="flex items-center justify-between gap-3 rounded-xl border p-4"><FormLabel>Ne rien modifier dans mon logement</FormLabel><FormControl><Switch checked={!!field.value} onCheckedChange={checked => { field.onChange(checked); if (checked) WINTER_ACTIONS.forEach(action => form.setValue(`instructions.${action.key}`, false)); }} /></FormControl></FormItem>} />
                        <div className="grid gap-3 sm:grid-cols-2">{WINTER_ACTIONS.map((action, index) => {
                          const Icon = icons[index];
                          return <FormField key={action.key} control={form.control} name={`instructions.${action.key}`} render={({ field }) => <FormItem className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${field.value ? 'border-sky-300 bg-sky-50/70 dark:border-sky-800 dark:bg-sky-950/40' : ''}`}>
                            <div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /><div><FormLabel>{action.label}</FormLabel><p className="mt-1 text-xs text-muted-foreground">{action.description}</p></div></div>
                            <FormControl><Switch checked={!!field.value} onCheckedChange={checked => { field.onChange(checked); if (checked) form.setValue('instructions.no_change', false); }} /></FormControl>
                          </FormItem>} />;
                        })}</div>
                        <FormField control={form.control} name="comments" render={({ field }) => <FormItem><FormLabel>Autres consignes pour l’hiver (facultatif)</FormLabel><FormControl><Textarea {...field} rows={4} placeholder="Accès, équipements, précautions ou demandes particulières…" /></FormControl><FormMessage /></FormItem>} />
                        <FormField control={form.control} name="instructions.holiday_notice_acknowledged" rules={{ validate: value => value === true || 'Confirmez avoir pris connaissance de la période de vacances.' }} render={({ field }) => <FormItem><div className="flex items-start gap-3"><FormControl><Checkbox checked={!!field.value} onCheckedChange={checked => field.onChange(checked === true)} /></FormControl><FormLabel className="text-sm leading-relaxed">J’ai pris connaissance de la fermeture des calendriers du 3 janvier au 5 février 2027 et des délais de réponse potentiellement allongés.</FormLabel></div><FormMessage /></FormItem>} />
                      </>}
                      {step === 3 && <>
                        <div className="space-y-4 rounded-xl bg-muted/40 p-5 text-sm">
                          <div><span className="text-muted-foreground">Logement</span><p className="mt-1 font-semibold">{room?.room_name}</p></div>
                          <div><span className="text-muted-foreground">Organisation de l’hiver</span><p className="mt-1">{winterClosureSummary(instructions)}</p></div>
                          <div><span className="text-muted-foreground">Avant les vacances Hello Keys</span><ul className="mt-2 space-y-2">{instructions.no_change ? <li>Ne rien modifier</li> : selected.length ? selected.map(action => <li key={action.key} className="flex items-center gap-2"><Check className="h-4 w-4 text-sky-600" />{action.label}</li>) : <li>Aucune action spécifique sélectionnée</li>}</ul></div>
                          <div><span className="text-muted-foreground">Précisions</span><p className="mt-1 whitespace-pre-wrap break-words">{values.comments || 'Aucune précision supplémentaire'}</p></div>
                          <p className="border-t pt-3 text-muted-foreground">Calendriers fermés du 3 janvier au 5 février 2027 · Information prise en compte.</p>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">Votre demande sera transmise à l’équipe pour organisation. Les dates souhaitées ne sont pas automatiquement bloquées par ce formulaire.</p>
                      </>}
                    </div>
                    <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
                      <Button type="button" variant="ghost" disabled={step === 0 || form.formState.isSubmitting} onClick={() => setStep(s => s - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Retour</Button>
                      {step < 3 ? <Button type="button" disabled={loadingRooms || roomError || !rooms.length} onClick={next} className="bg-sky-700 text-white hover:bg-sky-800">Continuer<ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting} className="bg-sky-700 text-white hover:bg-sky-800">{form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Envoyer mes consignes</Button>}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            <aside className="space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border bg-card p-5"><Home className="mb-3 h-6 w-6 text-sky-600" /><h3 className="font-semibold">Votre préparation en direct</h3><p className="mt-2 text-sm text-muted-foreground">{room?.room_name || 'Sélectionnez votre logement'}</p><p className="mt-3 text-sm">{winterClosureSummary(instructions)}</p><p className="mt-3 text-xs text-muted-foreground">{instructions.no_change ? 'Aucune modification souhaitée' : `${selected.length} action${selected.length > 1 ? 's' : ''} sélectionnée${selected.length > 1 ? 's' : ''}`}</p></div>
              <div className="rounded-2xl bg-sky-950 p-5 text-sky-100"><CalendarDays className="mb-3 h-6 w-6" /><h3 className="font-semibold text-white">Notre pause hivernale</h3><p className="mt-2 text-sm font-medium">3 janvier — 5 février 2027</p><p className="mt-3 text-xs leading-relaxed">Votre espace reste accessible. Les calendriers seront fermés à la location et nos réponses pourront prendre plus de temps.</p></div>
            </aside>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
export default Hivernage2026Page;
