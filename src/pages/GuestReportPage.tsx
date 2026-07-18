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

const problemTypes = [
  { value: 'equipment', label: 'Équipement en panne' },
  { value: 'cleanliness', label: 'Problème de propreté' },
  { value: 'plumbing', label: 'Plomberie / eau' },
  { value: 'heating', label: 'Chauffage / climatisation' },
  { value: 'electricity', label: 'Électricité' },
  { value: 'wifi', label: 'Internet / Wi-Fi' },
  { value: 'access', label: 'Accès / clés / serrure' },
  { value: 'noise', label: 'Nuisance / bruit' },
  { value: 'other', label: 'Autre' },
];

const formSchema = z.object({
  guestName: z.string().max(80, 'Nom trop long.').optional(),
  problemType: z.string().min(1, { message: 'Veuillez sélectionner un type de problème.' }),
  description: z
    .string()
    .min(5, { message: 'Veuillez décrire le problème (minimum 5 caractères).' })
    .max(1000, { message: 'La description est trop longue.' }),
  contact: z.string().max(120, 'Contact trop long.').optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const data = await response.json().catch(() => ({ error: 'Réponse serveur invalide.' }));
  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
}

const GuestReportPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [roomName, setRoomName] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
        setRoomError('Logement introuvable.');
        setLoadingRoom(false);
        return;
      }
      try {
        const data = await callPortal({ action: 'info', room_id: roomId });
        if (active) {
          setRoomName(data.room?.room_name || 'Votre logement');
        }
      } catch (err) {
        if (active) {
          setRoomError((err as Error).message);
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
      toast.error(`Erreur : ${(err as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10 flex justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
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
                Logement introuvable
              </CardTitle>
              <CardDescription>
                Ce QR code ne semble plus valide. Merci de contacter votre hôte.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : submitted ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Merci pour votre signalement !</CardTitle>
              <CardDescription>
                Votre demande a bien été transmise au responsable du logement. Il en sera informé
                immédiatement.
              </CardDescription>
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
                Signaler un autre problème
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
              <CardDescription>
                Un souci pendant votre séjour ? Signalez-le ici, votre hôte sera prévenu directement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Votre nom (facultatif)</FormLabel>
                        <FormControl>
                          <Input placeholder="Prénom / Nom" {...field} />
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
                        <FormLabel>Type de problème</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {problemTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
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
                        <FormLabel>Décrivez le problème</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Expliquez ce qui ne va pas, dans quelle pièce, depuis quand..."
                            rows={5}
                            {...field}
                          />
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
                        <FormLabel>Votre contact (facultatif)</FormLabel>
                        <FormControl>
                          <Input placeholder="Email ou téléphone pour vous recontacter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      'Envoyer le signalement'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Signalement transmis en toute confidentialité à votre hôte.
        </p>
      </div>
    </div>
  );
};

export default GuestReportPage;
