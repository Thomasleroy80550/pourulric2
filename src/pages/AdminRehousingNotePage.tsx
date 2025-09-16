import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllProfiles, UserProfile } from '@/lib/admin-api';
import { createDocument } from '@/lib/documents-api';
import { uploadFile } from '@/lib/storage-api';
import { createNotification } from '@/lib/notifications-api';
import { createRehousingNote } from '@/lib/rehousing-notes-api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import RehousingNoteContent from '@/components/RehousingNoteContent';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const rehousingNoteSchema = z.object({
  userId: z.string().min(1, "Veuillez sélectionner un propriétaire."),
  recipientId: z.string().min(1, "Veuillez sélectionner un destinataire."),
  noteType: z.string().min(3, "Le type de note est requis (ex: Relogement, Compensation)."),
  amountReceived: z.coerce.number().min(0, "Le montant perçu doit être un nombre positif ou nul."),
  amountToTransfer: z.coerce.number().min(0, "Le montant à transférer doit être un nombre positif ou nul."),
  comment: z.string().optional(),
  // Auto-populated fields, validated on submit
  recipientName: z.string(),
  recipientIban: z.string().min(1, "L'IBAN du destinataire n'a pas pu être trouvé. Veuillez le configurer dans son profil ou le saisir manuellement."),
  recipientBic: z.string().optional(),
});

const AdminRehousingNotePage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualIbanInput, setShowManualIbanInput] = useState(false);

  const form = useForm<z.infer<typeof rehousingNoteSchema>>({
    resolver: zodResolver(rehousingNoteSchema),
    defaultValues: {
      userId: '',
      recipientId: '',
      noteType: 'Relogement',
      amountReceived: 0,
      amountToTransfer: 0,
      comment: '',
      recipientName: '',
      recipientIban: '',
      recipientBic: '',
    },
  });

  const amountReceived = form.watch('amountReceived');
  const amountToTransfer = form.watch('amountToTransfer');
  const delta = (amountReceived || 0) - (amountToTransfer || 0);
  const recipientId = form.watch('recipientId');
  const recipientIban = form.watch('recipientIban');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const profiles = await getAllProfiles();
        setUsers(profiles.filter(p => p.role === 'user'));
      } catch (error) {
        toast.error("Erreur lors du chargement des propriétaires.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (recipientId) {
      const recipientUser = users.find(u => u.id === recipientId);
      if (recipientUser) {
        const autoDetectedIban = recipientUser.iban_airbnb_booking || recipientUser.iban_abritel_hellokeys || '';
        const bic = recipientUser.bic_airbnb_booking || recipientUser.bic_abritel_hellokeys || '';
        
        form.setValue('recipientName', `${recipientUser.first_name || ''} ${recipientUser.last_name || ''}`.trim());
        form.setValue('recipientBic', bic || '');

        if (!autoDetectedIban) {
          form.setValue('recipientIban', ''); // Clear IBAN if not found, to allow manual input
          setShowManualIbanInput(true);
          toast.warning("Ce destinataire n'a pas d'IBAN configuré dans son profil.", {
            description: "Veuillez le saisir manuellement ou mettre à jour son profil.",
          });
        } else {
          form.setValue('recipientIban', autoDetectedIban);
          setShowManualIbanInput(false);
        }
      }
    } else {
      // Reset when no recipient is selected
      setShowManualIbanInput(false);
      form.setValue('recipientIban', '');
      form.setValue('recipientBic', '');
      form.setValue('recipientName', '');
    }
  }, [recipientId, users, form]);

  const onSubmit = async (values: z.infer<typeof rehousingNoteSchema>) => {
    setIsGenerating(true);
    try {
      const selectedUser = users.find(u => u.id === values.userId);
      if (!selectedUser) {
        toast.error("Propriétaire sélectionné invalide.");
        return;
      }

      // 1. Create rehousing note record in database
      await createRehousingNote({
        user_id: values.userId,
        note_type: values.noteType,
        amount_received: values.amountReceived,
        amount_to_transfer: values.amountToTransfer,
        comment: values.comment,
        recipient_name: values.recipientName,
        recipient_iban: values.recipientIban,
        recipient_bic: values.recipientBic,
      });

      // 2. Notify user
      await createNotification(
        selectedUser.id,
        `Une nouvelle note de ${values.noteType} est disponible dans vos finances.`,
        '/finance?tab=rehousing'
      );

      toast.success("Note de relogement ajoutée avec succès dans les finances du propriétaire !");
      form.reset();
      
    } catch (error: any) {
      toast.error(`Erreur lors de la création de la note : ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedUserForPdf = users.find(u => u.id === formDataForPdf?.userId);
  const deltaForPdf = formDataForPdf ? formDataForPdf.amountReceived - formDataForPdf.amountToTransfer : 0;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Générer une note de relogement / compensation</CardTitle>
            <CardDescription>
              Créez une note pour un propriétaire qui doit transférer des fonds. La note sera ajoutée à son espace finances.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Propriétaire qui doit payer</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loading}
                            >
                              {field.value
                                ? users.find(
                                    (user) => user.id === field.value
                                  )?.first_name + " " + users.find(
                                    (user) => user.id === field.value
                                  )?.last_name + " (" + users.find(
                                    (user) => user.id === field.value
                                  )?.email + ")"
                                : "Sélectionnez un propriétaire..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Rechercher un propriétaire..." />
                            <CommandEmpty>Aucun propriétaire trouvé.</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => (
                                <CommandItem
                                  value={`${user.first_name} ${user.last_name} ${user.email}`}
                                  key={user.id}
                                  onSelect={() => {
                                    form.setValue("userId", user.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      user.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {user.first_name} {user.last_name} ({user.email})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="noteType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de note</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Relogement, Compensation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amountReceived"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant perçu (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amountToTransfer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant à transférer (€)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-sm font-medium text-muted-foreground">Delta (Solde pour le propriétaire)</p>
                  <p className={`text-lg font-bold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {delta.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commentaire (Optionnel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ajoutez des détails sur l'opération..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <h3 className="text-lg font-medium pt-4 border-t">Informations du destinataire</h3>
                <FormField
                  control={form.control}
                  name="recipientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Destinataire du virement</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loading}
                            >
                              {field.value
                                ? users.find(u => u.id === field.value)?.first_name + ' ' + users.find(u => u.id === field.value)?.last_name
                                : "Sélectionnez un destinataire..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Rechercher un destinataire..." />
                            <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => (
                                <CommandItem
                                  value={`${user.first_name} ${user.last_name} ${user.email}`}
                                  key={user.id}
                                  onSelect={() => {
                                    form.setValue("recipientId", user.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      user.id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {user.first_name} {user.last_name} ({user.email})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recipientId && (
                  <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                    {showManualIbanInput ? (
                      <FormField
                        control={form.control}
                        name="recipientIban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN du destinataire (saisie manuelle)</FormLabel>
                            <FormControl>
                              <Input placeholder="FRXX XXXX XXXX XXXX XXXX XXXX XXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <p className="font-medium">IBAN détecté :</p>
                        {recipientIban ? (
                          <p className="font-mono">{recipientIban}</p>
                        ) : (
                          <p className="text-destructive-foreground">IBAN non disponible.</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer la Note
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      {/* Off-screen component for PDF generation */}
      <div className="absolute -left-[9999px] top-0" aria-hidden="true">
        {formDataForPdf && selectedUserForPdf && (
          <RehousingNoteContent
            ref={pdfContentRef}
            ownerName={`${selectedUserForPdf.first_name} ${selectedUserForPdf.last_name}`}
            noteType={formDataForPdf.noteType}
            amountReceived={formDataForPdf.amountReceived}
            amountToTransfer={formDataForPdf.amountToTransfer}
            delta={deltaForPdf}
            comment={formDataForPdf.comment}
            recipientIban={formDataForPdf.recipientIban}
            recipientBic={formDataForPdf.recipientBic}
            generationDate={new Date()}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRehousingNotePage;