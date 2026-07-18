import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const GUEST_PORTAL_URL =
  'https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/guest-logement-portal';
const SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRramFlanp3bW13d3pob2twYmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MTQwMjAsImV4cCI6MjA2NDk5MDAyMH0.aTOtiL49-BYCyO4K3Bek37i5XQD3fWzim59j9fEMtJs';

type Lang = 'fr' | 'en';

const problemTypes: { value: string; fr: string; en: string }[] = [
  { value: 'equipment', fr: 'Équipement en panne', en: 'Broken equipment' },
  { value: 'cleanliness', fr: 'Problème de propreté', en: 'Cleanliness issue' },
  { value: 'plumbing', fr: 'Plomberie / eau', en: 'Plumbing / water' },
  { value: 'heating', fr: 'Chauffage / climatisation', en: 'Heating / air conditioning' },
  { value: 'electricity', fr: 'Électricité', en: 'Electricity' },
  { value: 'wifi', fr: 'Internet / Wi-Fi', en: 'Internet / Wi-Fi' },
  { value: 'access', fr: 'Accès / clés / serrure', en: 'Access / keys / lock' },
  { value: 'noise', fr: 'Nuisance / bruit', en: 'Nuisance / noise' },
  { value: 'other', fr: 'Autre', en: 'Other' },
];

const t = {
  fr: {
    intro: 'Un souci pendant votre séjour ? Signalez-le ici, votre hôte sera prévenu directement.',
    nameLabel: 'Votre nom (facultatif)',
    namePlaceholder: 'Prénom / Nom',
    typeLabel: 'Type de problème',
    typePlaceholder: 'Sélectionner un type',
    descLabel: 'Décrivez le problème',
    descPlaceholder: 'Expliquez ce qui ne va pas, dans quelle pièce, depuis quand...',
    contactLabel: 'Votre contact (facultatif)',
    contactPlaceholder: 'Email ou téléphone pour vous recontacter',
    submit: 'Envoyer le signalement',
    sending: 'Envoi...',
    successTitle: 'Merci pour votre signalement !',
    successDesc:
      'Votre demande a bien été transmise au responsable du logement. Il en sera informé immédiatement.',
    another: 'Signaler un autre problème',
    notFoundTitle: 'Logement introuvable',
    notFoundDesc: 'Ce QR code ne semble plus valide. Merci de contacter votre hôte.',
    footer: 'Signalement transmis en toute confidentialité à votre hôte.',
    errorType: 'Veuillez sélectionner un type de problème.',
    errorDesc: 'Veuillez décrire le problème (minimum 5 caractères).',
    errorLong: 'La description est trop longue.',
    errorName: 'Nom trop long.',
    errorContact: 'Contact trop long.',
  },
  en: {
    intro: 'An issue during your stay? Report it here and your host will be notified right away.',
    nameLabel: 'Your name (optional)',
    namePlaceholder: 'First / Last name',
    typeLabel: 'Type of problem',
    typePlaceholder: 'Select a type',
    descLabel: 'Describe the problem',
    descPlaceholder: 'Explain what is wrong, in which room, since when...',
    contactLabel: 'Your contact (optional)',
    contactPlaceholder: 'Email or phone so we can reach you',
    submit: 'Send report',
    sending: 'Sending...',
    successTitle: 'Thank you for your report!',
    successDesc:
      'Your request has been sent to the property manager. They will be notified immediately.',
    another: 'Report another problem',
    notFoundTitle: 'Property not found',
    notFoundDesc: 'This QR code no longer seems valid. Please contact your host.',
    footer: 'Your report is sent confidentially to your host.',
    errorType: 'Please select a type of problem.',
    errorDesc: 'Please describe the problem (minimum 5 characters).',
    errorLong: 'The description is too long.',
    errorName: 'Name too long.',
    errorContact: 'Contact too long.',
  },
};

async function callPortal(payload: Record<string, unknown>) {
  const response = await fetch(GUEST_PORTAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({ error: 'Server error.' }));
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred.');
  }
  return data;
}

const GuestReportPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [lang, setLang] = useState<Lang>(
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en',
  );
  const [roomName, setRoomName] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const tr = t[lang];

  const formSchema = z.object({
    guestName: z.string().max(80, tr.errorName).optional(),
    problemType: z.string().min(1, { message: tr.errorType }),
    description: z.string().min(5, { message: tr.errorDesc }).max(1000, { message: tr.errorLong }),
    contact: z.string().max(120, tr.errorContact).optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: '',
      problemType: '',
      description: '',
      contact: '',
    },
  });

  useEffect(() => {
    let active = true;
    async function loadRoom() {
      if (!roomId) {
        setRoomError('not_found');
        setLoadingRoom(false);
        return;
      }
      try {
        const data = await callPortal({ action: 'info', room_id: roomId });
        if (active) {
          setRoomName(data.room?.room_name || 'Your stay');
        }
      } catch {
        if (active) {
          setRoomError('not_found');
        }
      } finally {
        if (active) {
          setLoadingRoom(false);
        }
      }
    }
    loadRoom();
    return () => {
      active = false;
    };
  }, [roomId]);

  const onSubmit = async (values: FormValues) => {
    if (!roomId) return;
    try {
      await callPortal({
        action: 'report',
        room_id: roomId,
        guest_name: values.guestName,
        problem_type: values.problemType,
        description: values.description,
        contact: values.contact,
      });
      setSubmitted(true);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10 flex justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
          <div className="flex overflow-hidden rounded-lg border text-sm">
            <button
              type="button"
              onClick={() => setLang('fr')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                lang === 'fr' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                lang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {loadingRoom ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : roomError ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {tr.notFoundTitle}
              </CardTitle>
              <CardDescription>{tr.notFoundDesc}</CardDescription>
            </CardHeader>
          </Card>
        ) : submitted ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>{tr.successTitle}</CardTitle>
              <CardDescription>{tr.successDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  form.reset();
                  setSubmitted(false);
                }}
              >
                {tr.another}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                {roomName}
              </CardTitle>
              <CardDescription>{tr.intro}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tr.nameLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder={tr.namePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="problemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tr.typeLabel}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={tr.typePlaceholder} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {problemTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type[lang]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tr.descLabel}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={tr.descPlaceholder} rows={5} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tr.contactLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder={tr.contactPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tr.sending}
                      </>
                    ) : (
                      tr.submit
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">{tr.footer}</p>
      </div>
    </div>
  );
};

export default GuestReportPage;
