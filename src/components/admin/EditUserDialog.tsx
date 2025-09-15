import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Edit, AlertTriangle, Trash2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { updateUser, UpdateUserPayload } from '@/lib/admin-api';
import { UserProfile, OnboardingStatus } from '@/lib/profile-api';
import { UserRoom, getUserRoomsByUserId, adminAddUserRoom, deleteUserRoom } from '@/lib/user-room-api';
import { supabase } from '@/integrations/supabase/client';
import EditUserRoomDialog from '@/components/EditUserRoomDialog';
import { generateCguvPdf } from '@/lib/pdf-utils';
import { uploadFile } from '@/lib/storage-api';
import CGUV_HTML_CONTENT from '@/assets/cguv.html?raw';
import { Label } from '@/components/ui/label';

const editUserSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis."),
  last_name: z.string().min(1, "Le nom est requis."),
  role: z.enum(['user', 'admin', 'accountant'], { required_error: "Le rôle est requis." }),
  onboarding_status: z.enum(['estimation_sent', 'estimation_validated', 'cguv_accepted', 'keys_pending_reception', 'keys_retrieved', 'photoshoot_done', 'live']).optional(),
  property_address: z.string().optional().nullable(),
  property_city: z.string().optional().nullable(),
  property_zip_code: z.string().optional().nullable(),
  iban_airbnb_booking: z.string().optional().nullable(),
  bic_airbnb_booking: z.string().optional().nullable(),
  sync_with_hellokeys: z.boolean().optional(),
  iban_abritel_hellokeys: z.string().optional().nullable(),
  bic_abritel_hellokeys: z.string().optional().nullable(),
  commission_rate: z.coerce.number().min(0).optional().nullable(),
  linen_type: z.string().optional().nullable(),
  agency: z.string().optional().nullable(),
  contract_start_date: z.string().optional().nullable(),
  notify_new_booking_email: z.boolean().optional(),
  notify_cancellation_email: z.boolean().optional(),
  notify_new_booking_sms: z.boolean().optional(),
  notify_cancellation_sms: z.boolean().optional(),
  is_banned: z.boolean().optional(),
  can_manage_prices: z.boolean().optional(),
  kyc_status: z.enum(['not_verified', 'pending_review', 'verified', 'rejected']).optional().nullable(),
  estimated_revenue: z.coerce.number().min(0, "Le revenu estimé doit être positif.").optional().nullable(),
  estimation_details: z.string().optional().nullable(),
  revyoos_holding_ids: z.string().optional().nullable(),
  referral_credits: z.coerce.number().min(0, "Les crédits de parrainage doivent être positifs.").optional().nullable(),
  krossbooking_property_id: z.coerce.number().optional().nullable(),
  stripe_account_id: z.string().optional().nullable(),
});

const addRoomFormSchema = z.object({
  room_id: z.string().min(1, "L'ID de la chambre est requis."),
  room_name: z.string().min(1, "Le nom de la chambre est requis."),
  room_id_2: z.string().optional().nullable(),
});

const onboardingStatusText: Record<OnboardingStatus, string> = {
  estimation_sent: "Estimation envoyée",
  estimation_validated: "Estimation validée",
  cguv_accepted: "CGUV acceptées",
  keys_pending_reception: "En attente réception clés",
  keys_retrieved: "Clés récupérées",
  photoshoot_done: "Shooting photo terminé",
  live: "En ligne",
};

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ isOpen, onOpenChange, user, onUserUpdated }) => {
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<{ identity?: string; address?: string; cguv?: string }>({});
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<UserRoom | null>(null);
  const [cguvFile, setCguvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.infer<typeof editUserSchema>>({
    resolver: zodResolver(editUserSchema),
  });

  const addRoomForm = useForm<z.infer<typeof addRoomFormSchema>>({
    resolver: zodResolver(addRoomFormSchema),
    defaultValues: { room_id: '', room_name: '', room_id_2: '' },
  });

  useEffect(() => {
    if (isOpen && user) {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role === 'admin' ? 'admin' : (user.role === 'accountant' ? 'accountant' : 'user'),
        onboarding_status: user.onboarding_status || 'estimation_sent',
        property_address: user.property_address || '',
        property_city: user.property_city || '',
        property_zip_code: user.property_zip_code || '',
        iban_airbnb_booking: user.iban_airbnb_booking || '',
        bic_airbnb_booking: user.bic_airbnb_booking || '',
        sync_with_hellokeys: user.sync_with_hellokeys || false,
        iban_abritel_hellokeys: user.iban_abritel_hellokeys || '',
        bic_abritel_hellokeys: user.bic_abritel_hellokeys || '',
        commission_rate: (user.commission_rate || 0) * 100,
        linen_type: user.linen_type || 'Hello Wash',
        agency: user.agency || '',
        contract_start_date: user.contract_start_date || '',
        notify_new_booking_email: user.notify_new_booking_email ?? true,
        notify_cancellation_email: user.notify_cancellation_email ?? true,
        notify_new_booking_sms: user.notify_new_booking_sms ?? false,
        notify_cancellation_sms: user.notify_cancellation_sms ?? false,
        is_banned: user.is_banned || false,
        can_manage_prices: user.can_manage_prices || false,
        kyc_status: user.kyc_status || 'not_verified',
        estimated_revenue: user.estimated_revenue || 0,
        estimation_details: user.estimation_details || '',
        revyoos_holding_ids: user.revyoos_holding_ids?.join(', ') || '',
        referral_credits: user.referral_credits || 0,
        krossbooking_property_id: user.krossbooking_property_id || undefined,
        stripe_account_id: user.stripe_account_id || '',
      });

      setLoadingRooms(true);
      getUserRoomsByUserId(user.id)
        .then(rooms => setUserRooms(rooms))
        .catch(error => toast.error(`Erreur de chargement des chambres: ${error.message}`))
        .finally(() => setLoadingRooms(false));

      setDocumentUrls({});
      if (user.kyc_documents || user.cguv_signed_document_url) {
        const fetchUrls = async () => {
          const urls: { identity?: string; address?: string; cguv?: string } = {};
          const expiresIn = 60 * 5;
          try {
            if (user.kyc_documents?.identity) {
              const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(user.kyc_documents.identity, expiresIn);
              if (error) throw error;
              urls.identity = data.signedUrl;
            }
            if (user.kyc_documents?.address) {
              const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(user.kyc_documents.address, expiresIn);
              if (error) throw error;
              urls.address = data.signedUrl;
            }
            if (user.cguv_signed_document_url) {
              const { data, error } = await supabase.storage.from('cguv-documents').createSignedUrl(user.cguv_signed_document_url, expiresIn);
              if (error) throw error;
              urls.cguv = data.signedUrl;
            }
            setDocumentUrls(urls);
          } catch (error: any) {
            toast.error(`Erreur de chargement des documents: ${error.message}`);
          }
        };
        fetchUrls();
      }
    }
  }, [isOpen, user, form]);

  const handleDownloadCguv = async () => {
    try {
      toast.info("Génération du PDF en cours...");
      await generateCguvPdf();
    } catch (error: any) {
      toast.error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  };

  const handleCguvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error("Veuillez sélectionner un fichier PDF.");
        return;
      }
      setCguvFile(file);
    }
  };

  const handleConfirmCguvSignature = async () => {
    if (!user || !cguvFile) return;

    setIsUploading(true);
    try {
      const versionMatch = CGUV_HTML_CONTENT.match(/Version ([\d\.]+)/i);
      const cguvVersion = versionMatch ? versionMatch[1] : 'unknown';

      const filePath = `${user.id}/cguv-signed-v${cguvVersion}-${Date.now()}.pdf`;
      const publicUrl = await uploadFile('cguv-documents', filePath, cguvFile);

      const payload: UpdateUserPayload = {
        user_id: user.id,
        onboarding_status: 'cguv_accepted',
        cguv_accepted_at: new Date().toISOString(),
        cguv_version: cguvVersion,
        cguv_signed_document_url: filePath, // Store the path, not the full URL
      };

      await updateUser(payload);
      toast.success("CGUV signées et document téléversé avec succès !");
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur lors de la confirmation : ${error.message}`);
    } finally {
      setIsUploading(false);
      setCguvFile(null);
    }
  };

  const handleUpdateUser = async (values: z.infer<typeof editUserSchema>) => {
    if (!user) return;
    try {
      const { revyoos_holding_ids, referral_credits, ...restOfValues } = values;
      const payload: UpdateUserPayload = {
        user_id: user.id,
        ...restOfValues,
        commission_rate: values.commission_rate !== undefined ? values.commission_rate / 100 : undefined,
        revyoos_holding_ids: revyoos_holding_ids ? revyoos_holding_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
        referral_credits: referral_credits !== undefined ? referral_credits : undefined,
      };
      await updateUser(payload);
      toast.success("Utilisateur mis à jour avec succès !");
      onOpenChange(false);
      onUserUpdated();
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`);
    }
  };

  const handleAddRoom = async (values: z.infer<typeof addRoomFormSchema>) => {
    if (!user) return;
    try {
        const newRoom = await adminAddUserRoom(user.id, values.room_id, values.room_name, values.room_id_2 || undefined);
        setUserRooms(prev => [...prev, newRoom]);
        addRoomForm.reset();
        toast.success("Chambre ajoutée avec succès !");
    } catch (error: any) {
        toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleEditRoomClick = (room: UserRoom) => {
    setRoomToEdit(room);
    setIsEditRoomDialogOpen(true);
  };

  const handleRoomSaved = (savedRoom: UserRoom) => {
    setUserRooms(prevRooms => {
      const existingIndex = prevRooms.findIndex(r => r.id === savedRoom.id);
      if (existingIndex > -1) {
        const updatedRooms = [...prevRooms];
        updatedRooms[existingIndex] = savedRoom;
        return updatedRooms;
      } else {
        return [...prevRooms, savedRoom];
      }
    });
    setRoomToEdit(null);
  };

  const handleDeleteRoom = async (roomId: string) => {
      if (!user) return;
      try {
          await deleteUserRoom(roomId);
          setUserRooms(prev => prev.filter(room => room.id !== roomId));
          toast.success("Chambre supprimée avec succès !");
      } catch (error: any) {
          toast.error(`Erreur: ${error.message}`);
      }
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Modifier les informations de {user.first_name} {user.last_name}.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="flex-grow overflow-y-auto pr-6 pl-2 space-y-4">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="personal">Personnel</TabsTrigger>
                  <TabsTrigger value="onboarding">Intégration</TabsTrigger>
                  <TabsTrigger value="payment">Paiement</TabsTrigger>
                  <TabsTrigger value="offer">Offre</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="kyc">KYC</TabsTrigger>
                  <TabsTrigger value="rooms">Chambres</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Données personnelles</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="first_name" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="last_name" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="property_address" render={({ field }) => (<FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="property_city" render={({ field }) => (<FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="property_zip_code" render={({ field }) => (<FormItem><FormLabel>Code Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Rôle</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="user">Utilisateur</SelectItem><SelectItem value="admin">Administrateur</SelectItem><SelectItem value="accountant">Comptable</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card className="border-red-500 border-2">
                    <CardHeader><CardTitle className="text-red-500 flex items-center gap-2"><AlertTriangle /> Zone de danger</CardTitle></CardHeader>
                    <CardContent>
                      <FormField control={form.control} name="is_banned" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-red-50 dark:bg-red-900/20"><div className="space-y-0.5"><FormLabel className="text-red-600 dark:text-red-400">Bannir l'utilisateur</FormLabel><p className="text-xs text-red-500 dark:text-red-400/80">L'utilisateur sera déconnecté et ne pourra plus accéder à son compte.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="onboarding" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Statut d'intégration</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="onboarding_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut actuel</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {Object.entries(onboardingStatusText).map(([key, value]) => (
                                  <SelectItem key={key} value={key}>{value}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Modifiez le statut pour faire avancer le prospect dans le parcours.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {user?.key_delivery_method && (
                        <div>
                          <FormLabel>Méthode de livraison des clés choisie</FormLabel>
                          <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                            {user.key_delivery_method === 'deposit' ? 'Dépôt en agence' : 'Envoi par courrier'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Signature des CGUV en Agence</CardTitle>
                      <CardDescription>Pour les clients signant les documents en format papier.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button type="button" variant="outline" className="w-full" onClick={handleDownloadCguv}>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger les CGUV pour impression
                      </Button>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cguv-upload">Téléverser le document signé (PDF)</Label>
                        <Input id="cguv-upload" type="file" accept="application/pdf" onChange={handleCguvFileUpload} />
                        {cguvFile && <p className="text-sm text-muted-foreground">Fichier sélectionné : {cguvFile.name}</p>}
                      </div>

                      <Button type="button" className="w-full" onClick={handleConfirmCguvSignature} disabled={!cguvFile || isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Marquer comme signé et téléverser
                      </Button>

                      {documentUrls.cguv && (
                        <div className="text-sm">
                          <a href={documentUrls.cguv} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                            Voir le dernier document CGUV téléversé
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="payment" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Paiement Airbnb & Booking.com</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="iban_airbnb_booking" render={({ field }) => (<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="bic_airbnb_booking" render={({ field }) => (<FormItem><FormLabel>BIC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card className="mt-4">
                    <CardHeader><CardTitle>Paiement Stripe</CardTitle></CardHeader>
                    <CardContent>
                      <FormField control={form.control} name="stripe_account_id" render={({ field }) => (<FormItem><FormLabel>ID Compte Stripe</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormDescription>L'ID du compte Stripe Connect associé à cet utilisateur.</FormDescription><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                  <Card className="mt-4">
                    <CardHeader><CardTitle>Paiement Abritel & Hello Keys</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="sync_with_hellokeys" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Synchroniser avec Hello Keys</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="iban_abritel_hellokeys" render={({ field }) => (<FormItem><FormLabel>IBAN</FormLabel><FormControl><Input {...field} disabled={!form.watch('sync_with_hellokeys')} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="bic_abritel_hellokeys" render={({ field }) => (<FormItem><FormLabel>BIC</FormLabel><FormControl><Input {...field} disabled={!form.watch('sync_with_hellokeys')} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="offer" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Détails de l'offre</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="commission_rate" render={({ field }) => (<FormItem><FormLabel>Forfait (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="krossbooking_property_id" render={({ field }) => (<FormItem><FormLabel>ID Propriété Krossbooking</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormDescription>ID de la propriété (agence) principale de l'utilisateur sur Krossbooking.</FormDescription><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="linen_type" render={({ field }) => (<FormItem><FormLabel>Type de linge</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="agency" render={({ field }) => (<FormItem><FormLabel>Agence</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une agence" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Côte d'opal">Côte d'opal</SelectItem><SelectItem value="Baie de somme">Baie de somme</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="contract_start_date" render={({ field }) => (<FormItem><FormLabel>Date de début de contrat</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="estimated_revenue" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revenu Annuel Estimé (€)</FormLabel>
                          <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="estimation_details" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Détails de l'estimation</FormLabel>
                          <FormControl><Textarea {...field} /></FormControl>
                          <FormDescription>Ces détails seront visibles par le prospect sur sa page d'intégration.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="revyoos_holding_ids" render={({ field }) => (
                        <FormItem>
                          <FormLabel>IDs Revyoos</FormLabel>
                          <FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Entrez les IDs séparés par des virgules" /></FormControl>
                          <FormDescription>IDs des propriétés sur Revyoos pour récupérer les avis.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="referral_credits" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crédits de parrainage</FormLabel>
                          <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                          <FormDescription>Nombre de crédits de parrainage disponibles pour l'utilisateur.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Permissions</CardTitle></CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="can_manage_prices"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>Gérer les prix/restrictions</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Autoriser cet utilisateur à modifier les prix et à bloquer des dates sur le calendrier.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="notifications" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Préférences de notification</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <FormField control={form.control} name="notify_new_booking_email" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Nouvelles réservations par email</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="notify_cancellation_email" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Annulations par email</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="notify_new_booking_sms" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Nouvelles réservations par SMS</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="notify_cancellation_sms" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>Annulations par SMS</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="kyc" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Vérification d'identité (KYC)</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="kyc_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Statut KYC</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un statut" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="not_verified">Non vérifié</SelectItem>
                                <SelectItem value="pending_review">En attente de révision</SelectItem>
                                <SelectItem value="verified">Vérifié</SelectItem>
                                <SelectItem value="rejected">Rejeté</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <FormLabel>Documents fournis</FormLabel>
                        <div className="mt-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-800/50 min-h-[60px]">
                          {!user?.kyc_documents || (!user.kyc_documents.identity && !user.kyc_documents.address) ? (
                            <p className="text-sm text-muted-foreground">Aucun document n'a été fourni.</p>
                          ) : (
                            <ul className="space-y-2 text-sm">
                              {user.kyc_documents.identity && (
                                <li className="flex items-center justify-between">
                                  <span>Pièce d'identité</span>
                                  {documentUrls.identity ? (
                                    <Button asChild variant="link" className="p-0 h-auto">
                                      <a href={documentUrls.identity} target="_blank" rel="noopener noreferrer">
                                        Voir le document
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">Chargement...</span>
                                  )}
                                </li>
                              )}
                              {user.kyc_documents.address && (
                                <li className="flex items-center justify-between">
                                  <span>Justificatif de domicile</span>
                                  {documentUrls.address ? (
                                    <Button asChild variant="link" className="p-0 h-auto">
                                      <a href={documentUrls.address} target="_blank" rel="noopener noreferrer">
                                        Voir le document
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">Chargement...</span>
                                  )}
                                </li>
                              )}
                              {user.cguv_signed_document_url && (
                                <li className="flex items-center justify-between">
                                  <span>CGUV signées</span>
                                  {documentUrls.cguv ? (
                                    <Button asChild variant="link" className="p-0 h-auto">
                                      <a href={documentUrls.cguv} target="_blank" rel="noopener noreferrer">
                                        Voir le document
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground">Chargement...</span>
                                  )}
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="rooms" className="mt-4">
                  <Card>
                    <CardHeader><CardTitle>Chambres Assignées</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <Form {...addRoomForm}>
                        <div>
                          <h3 className="text-lg font-medium mb-2">Ajouter une chambre</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField control={addRoomForm.control} name="room_id" render={({ field }) => (<FormItem><FormLabel>ID Chambre (Krossbooking)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={addRoomForm.control} name="room_name" render={({ field }) => (<FormItem><FormLabel>Nom de la chambre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                              <FormField control={addRoomForm.control} name="room_id_2" render={({ field }) => (<FormItem><FormLabel>ID Chambre Numéro 2 (Prix/Restrictions)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                          <div className="flex justify-end mt-4">
                            <Button
                              type="button"
                              onClick={addRoomForm.handleSubmit(handleAddRoom)}
                              disabled={addRoomForm.formState.isSubmitting}
                            >
                              {addRoomForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                            </Button>
                          </div>
                        </div>
                      </Form>
                      <div>
                        <h3 className="text-lg font-medium mb-2">Chambres actuelles</h3>
                        {loadingRooms ? (
                          <Skeleton className="h-20 w-full" />
                        ) : userRooms.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>ID Krossbooking</TableHead>
                                <TableHead>ID 2</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userRooms.map(room => (
                                <TableRow key={room.id}>
                                  <TableCell>{room.room_name}</TableCell>
                                  <TableCell>{room.room_id}</TableCell>
                                  <TableCell>{room.room_id_2 || 'N/A'}</TableCell>
                                  <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditRoomClick(room)} title="Modifier la chambre">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteRoom(room.id)} title="Supprimer la chambre">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucune chambre assignée à cet utilisateur.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <EditUserRoomDialog
        isOpen={isEditRoomDialogOpen}
        onOpenChange={setIsEditRoomDialogOpen}
        userId={user.id}
        initialRoom={roomToEdit}
        onRoomSaved={handleRoomSaved}
      />
    </>
  );
};

export default EditUserDialog;