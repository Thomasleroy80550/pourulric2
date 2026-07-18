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
import {
  Building,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Paperclip,
  X,
  Wifi,
  Copy,
  Check,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    phoneLabel: 'Numéro de téléphone',
    phonePlaceholder: 'Ex. 06 12 34 56 78',
    descLabel: 'Décrivez le problème',
    descPlaceholder: 'Expliquez ce qui ne va pas, dans quelle pièce, depuis quand...',
    contactLabel: 'Votre email (facultatif)',
    contactPlaceholder: 'Email pour vous recontacter',
    photosLabel: 'Photos (facultatif)',
    photosAdd: 'Ajouter des photos',
    photosHint: '5 photos maximum, 10 Mo par photo.',
    wifiTitle: 'Connexion Wi-Fi',
    wifiNetwork: 'Réseau',
    wifiPassword: 'Mot de passe',
    wifiLocation: 'Box internet',
    copied: 'Copié !',
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
    errorContact: 'Email trop long.',
    errorPhone: 'Le numéro de téléphone est obligatoire.',
    uploadError: "Échec de l'envoi d'une photo.",
  },
  en: {
    intro: 'An issue during your stay? Report it here and your host will be notified right away.',
    nameLabel: 'Your name (optional)',
    namePlaceholder: 'First / Last name',
    typeLabel: 'Type of problem',
    typePlaceholder: 'Select a type',
    phoneLabel: 'Phone number',
    phonePlaceholder: 'e.g. +33 6 12 34 56 78',
    descLabel: 'Describe the problem',
    descPlaceholder: 'Explain what is wrong, in which room, since when...',
    contactLabel: 'Your email (optional)',
    contactPlaceholder: 'Email so we can reach you',
    photosLabel: 'Photos (optional)',
    photosAdd: 'Add photos',
    photosHint: 'Up to 5 photos, 10 MB each.',
    wifiTitle: 'Wi-Fi connection',
    wifiNetwork: 'Network',
    wifiPassword: 'Password',
    wifiLocation: 'Internet box',
    copied: 'Copied!',
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
    errorContact: 'Email too long.',
    errorPhone: 'Phone number is required.',
    uploadError: 'Failed to upload a photo.',
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

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-sky-700/80">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-sky-950">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sky-700 hover:bg-sky-100"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};

const GuestReportPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [lang, setLang] = useState<Lang>(
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en',
  );
  const [roomName, setRoomName] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const [wifiCode, setWifiCode] = useState<string | null>(null);
  const [wifiLocation, setWifiLocation] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const tr = t[lang];

  const formSchema = z.object({
    guestName: z.string().max(80, tr.errorName).optional(),
    phone: z.string().min(5, { message: tr.errorPhone }).max(30, { message: tr.errorPhone }),
    problemType: z.string().min(1, { message: tr.errorType }),
    description: z.string().min(5, { message: tr.errorDesc }).max(1000, { message: tr.errorLong }),
    contact: z.string().max(120, tr.errorContact).optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: '',
      phone: '',
      problemType: '',
      description: '',
      contact: '',
    },
  });

  const handleFilesSelected = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function uploadPhotos(): Promise<string[]> {
    if (files.length === 0) return [];
    const folder = crypto.randomUUID();
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${roomId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('guest_report_media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Upload error:', error);
        toast.error(tr.uploadError);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from('guest_report_media').getPublicUrl(path);
      urls.push(publicUrl);
    }
    return urls;
  }

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
          setWifiSsid(data.room?.wifi_ssid || null);
          setWifiCode(data.room?.wifi_code || null);
          setWifiLocation(data.room?.wifi_box_location || null);
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
      const mediaUrls = await uploadPhotos();
      await callPortal({
        action: 'report',
        room_id: roomId,
        guest_name: values.guestName,
        phone: values.phone,
        problem_type: values.problemType,
        description: values.description,
        contact: values.contact,
        media_urls: mediaUrls,
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

        {!loadingRoom && !roomError && wifiCode && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sky-900">
              <Wifi className="h-5 w-5" />
              <span className="font-semibold">{tr.wifiTitle}</span>
            </div>
            <div className="space-y-2">
              {wifiSsid && <CopyRow label={tr.wifiNetwork} value={wifiSsid} />}
              <CopyRow label={tr.wifiPassword} value={wifiCode} />
            </div>
            {wifiLocation && (
              <div className="mt-3 flex items-start gap-1.5 text-xs text-sky-800">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {tr.wifiLocation} : {wifiLocation}
                </span>
              </div>
            )}
          </div>
        )}

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
                  setFiles([]);
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tr.phoneLabel} *</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={tr.phonePlaceholder} {...field} />
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

                  <div className="space-y-2">
                    <FormLabel>{tr.photosLabel}</FormLabel>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50">
                      <Paperclip className="h-4 w-4" />
                      {tr.photosAdd}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">{tr.photosHint}</p>
                    {files.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {files.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-20 w-full rounded-md border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
