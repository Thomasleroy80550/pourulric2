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
  noteType: z.string().min(3, "Le type de note est requis (ex: Relogement, Compensation)."),
  amountReceived: z.coerce.number().min(0, "Le montant perçu doit être un nombre positif ou nul."),
  amountToTransfer: z.coerce.number().min(0, "Le montant à transférer doit être un nombre positif ou nul."),
  comment: z.string().optional(),
  recipientName: z.string().min(1, "Le nom du destinataire est requis."),
  recipientIban: z.string().min(1, "L'IBAN du destinataire est requis."),
  recipientBic: z.string().optional(),
});

const AdminRehousingNotePage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [formDataForPdf, setFormDataForPdf] = useState<z.infer<typeof rehousingNoteSchema> | null>(null);

  const form = useForm<z.infer<typeof rehousingNoteSchema>>({
    resolver: zodResolver(rehousingNoteSchema),
    defaultValues: {
      userId: '',
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

  const onSubmit = async (values: z.infer<typeof rehousingNoteSchema>) => {
    setIsGenerating(true);
    setFormDataForPdf(values);

    // Allow time for the off-screen component to render with new data
    setTimeout(async () => {
      if (!pdfContentRef.current) {
        toast.error("Erreur : Impossible de trouver le contenu à transformer en PDF.");
        setIsGenerating(false);
        return;
      }

      try {
        const selectedUser = users.find(u => u.id === values.userId);
        if (!selectedUser) {
          toast.error("Propriétaire sélectionné invalide.");
          setIsGenerating(false);
          return;
        }

        // 1. Generate PDF
        const canvas = await html2canvas(pdfContentRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const pdfBlob = pdf.output('blob');
        const fileName = `note_${values.noteType.toLowerCase().replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // 2. Upload PDF to Storage
        const filePath = `private/${selectedUser.id}/rehousing_notes/${pdfFile.name}`;
        const { path: uploadedPath } = await uploadFile(pdfFile, filePath);

        // 3. Create document record in database
        const deltaValue = values.amountReceived - values.amountToTransfer;
        await createDocument({
          user_id: selectedUser.id,
          name: `Note de ${values.noteType}`,
          description: `Montant perçu: ${values.amountReceived}€, Montant transféré: ${values.amountToTransfer}€, Delta: ${deltaValue}€`,
          file_path: uploadedPath,
          file_size: pdfFile.size,
          file_type: pdfFile.type,
          category: 'Relogements et Compensations',
        });

        // 4. Notify user
        await createNotification(
          selectedUser.id,
          `Une nouvelle note de ${values.noteType} a été ajoutée à votre coffre-fort.`,
          '/profile?tab=documents'
        );

        toast.success("Note de relogement générée et ajoutée au coffre-fort du propriétaire !");
        form.reset();
      } catch (error: any) {
        toast.error(`Erreur lors de la génération de la note : ${error.message}`);
      } finally {
        setIsGenerating(false);
        setFormDataForPdf(null);
      }
    }, 500);
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
              Créez un document pour un propriétaire qui doit transférer des fonds suite à un relogement ou une compensation. Le document sera ajouté à son coffre-fort.
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
                  name="recipientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet du destinataire</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipientIban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN du destinataire</FormLabel>
                      <FormControl>
                        <Input placeholder="FR76..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipientBic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BIC du destinataire (Optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="AGRIFRPP..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Générer et Sauvegarder la Note
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
            recipientName={formDataForPdf.recipientName}
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