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
import { createRehousingNote, getAllRehousingNotes, RehousingNote } from '@/lib/rehousing-notes-api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import RehousingNoteContent from '@/components/RehousingNoteContent';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

const rehousingNoteSchema = z.object({
  userId: z.string().min(1, "Veuillez sélectionner un propriétaire."),
  noteType: z.string().min(3, "Le type de note est requis (ex: Relogement, Compensation)."),
  amountReceived: z.coerce.number().min(0, "Le montant perçu doit être un nombre positif ou nul."),
  amountToTransfer: z.coerce.number().min(0, "Le montant à transférer doit être un nombre positif ou nul."),
  comment: z.string().optional(),
  recipientName: z.string().default("HELLO KEYS COMPTE TAMPON"),
  recipientIban: z.string().default("FR76 3000 4001 3300 0100 5986 417"),
});

const AdminRehousingNotePage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualIbanInput, setShowManualIbanInput] = useState(false);
  const [rehousingNotes, setRehousingNotes] = useState<RehousingNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<RehousingNote | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);

  const form = useForm<z.infer<typeof rehousingNoteSchema>>({
    resolver: zodResolver(rehousingNoteSchema),
    defaultValues: {
      userId: '',
      noteType: 'Relogement',
      amountReceived: 0,
      amountToTransfer: 0,
      comment: '',
      recipientName: 'HELLO KEYS COMPTE TAMPON',
      recipientIban: 'FR76 3000 4001 3300 0100 5986 417',
    },
  });

  const amountReceived = form.watch('amountReceived');
  const amountToTransfer = form.watch('amountToTransfer');
  const delta = (amountReceived || 0) - (amountToTransfer || 0);
  const recipientId = form.watch('recipientId');
  const recipientIban = form.watch('recipientIban');

  const fetchAllNotes = async () => {
    setNotesLoading(true);
    try {
      const notes = await getAllRehousingNotes();
      setRehousingNotes(notes);
    } catch (error) {
      toast.error("Erreur lors du chargement des notes de relogement.");
    } finally {
      setNotesLoading(false);
    }
  };

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
    fetchAllNotes();
  }, []);

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
        recipient_bic: undefined,
      });

      // 2. Notify user
      await createNotification(
        selectedUser.id,
        `Une nouvelle note de ${values.noteType} est disponible dans vos finances.`,
        '/finance?tab=rehousing'
      );

      toast.success("Note de relogement ajoutée avec succès dans les finances du propriétaire !");
      form.reset();
      fetchAllNotes();
      
    } catch (error: any) {
      toast.error(`Erreur lors de la création de la note : ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card className="mb-8">
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
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <p className="font-medium">Destinataire :</p>
                  <p className="font-mono">{form.getValues('recipientName')}</p>
                  <p className="font-medium mt-2">IBAN :</p>
                  <p className="font-mono">{form.getValues('recipientIban')}</p>
                </div>

                <Button type="submit" disabled={isGenerating}>
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer la Note
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes de Relogement & Compensation existantes</CardTitle>
            <CardDescription>Liste de toutes les notes de relogement et compensation créées.</CardDescription>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant à transférer</TableHead>
                    <TableHead>Statut Virement</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rehousingNotes.length > 0 ? (
                    rehousingNotes.map(note => {
                      const owner = users.find(u => u.id === note.user_id);
                      return (
                        <TableRow key={note.id}>
                          <TableCell>{format(new Date(note.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                          <TableCell>{owner ? `${owner.first_name} ${owner.last_name}` : 'Inconnu'}</TableCell>
                          <TableCell className="font-medium">{note.note_type}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(note.amount_to_transfer)}</TableCell>
                          <TableCell>
                            {note.transfer_completed ? (
                              <Badge variant="success">Effectué</Badge>
                            ) : (
                              <Badge variant="warning">En attente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog onOpenChange={(open) => !open && setSelectedNote(null)}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedNote(note)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Détails
                                </Button>
                              </DialogTrigger>
                              {selectedNote && selectedNote.id === note.id && (
                                <DialogContent className="sm:max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Détail de la note de {selectedNote.note_type}</DialogTitle>
                                  </DialogHeader>
                                  <div className="py-4 space-y-6">
                                    <div className="flex justify-between items-center">
                                      <p>Propriétaire : <strong>{owner ? `${owner.first_name} ${owner.last_name} (${owner.email})` : 'Inconnu'}</strong></p>
                                      {selectedNote.transfer_completed ? (
                                        <Badge variant="success">Virement Effectué</Badge>
                                      ) : (
                                        <Badge variant="warning">Virement en attente</Badge>
                                      )}
                                    </div>
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Détail financier</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between"><span>Montant perçu :</span> <span className="font-semibold">{formatCurrency(selectedNote.amount_received)}</span></div>
                                          <div className="flex justify-between"><span>Montant à transférer :</span> <span className="font-semibold">{formatCurrency(selectedNote.amount_to_transfer)}</span></div>
                                          <div className="flex justify-between border-t pt-2 mt-2 font-bold"><span>Solde (Delta) :</span> <span className={(selectedNote.amount_received - selectedNote.amount_to_transfer) >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(selectedNote.amount_received - selectedNote.amount_to_transfer)}</span></div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    {selectedNote.comment && (
                                      <div>
                                        <h3 className="font-semibold mb-2">Commentaire :</h3>
                                        <p className="text-sm italic bg-muted p-3 rounded-md border">{selectedNote.comment}</p>
                                      </div>
                                    )}

                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Informations pour le virement</CardTitle>
                                      </CardHeader>
                                      <CardContent className="text-sm">
                                        <p>Virement à effectuer vers :</p>
                                        <div className="mt-2 p-3 bg-muted rounded-md font-mono">
                                          <p><strong>Destinataire:</strong> {selectedNote.recipient_name}</p>
                                          <p><strong>IBAN:</strong> {selectedNote.recipient_iban}</p>
                                          {selectedNote.recipient_bic && <p><strong>BIC:</strong> {selectedNote.recipient_bic}</p>}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </DialogContent>
                              )}
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucune note de relogement ou compensation n'a été créée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRehousingNotePage;