import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getRehousingNotes, createRehousingNote, RehousingNote, resendRehousingNoteNotification } from '@/lib/rehousing-notes-api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Mail, RefreshCw } from 'lucide-react';

const noteSchema = z.object({
  note_type: z.string().min(1, "Le type de note est requis."),
  amount_received: z.coerce.number().min(0, "Le montant doit être positif."),
  amount_to_transfer: z.coerce.number().min(0, "Le montant doit être positif."),
  recipient_name: z.string().min(1, "Le nom du bénéficiaire est requis."),
  recipient_iban: z.string().min(1, "L'IBAN est requis."),
  recipient_bic: z.string().optional(),
  comment: z.string().optional(),
});

const RehousingNotesTab: React.FC = () => {
  const [notes, setNotes] = useState<RehousingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingNoteId, setResendingNoteId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      note_type: '',
      amount_received: 0,
      amount_to_transfer: 0,
      recipient_name: '',
      recipient_iban: '',
      recipient_bic: '',
      comment: '',
    },
  });

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const fetchedNotes = await getRehousingNotes();
      setNotes(fetchedNotes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const onSubmit = async (values: z.infer<typeof noteSchema>) => {
    setIsSubmitting(true);
    try {
      await createRehousingNote(values);
      toast.success('Note de relogement créée avec succès. Vous et les administrateurs recevrez une notification par e-mail.');
      form.reset();
      fetchNotes(); // Refresh the list
    } catch (error: any) {
      toast.error(`Erreur lors de la création de la note : ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendNotification = async (noteId: string) => {
    setResendingNoteId(noteId);
    try {
      await resendRehousingNoteNotification(noteId);
      toast.success('La notification par email a été renvoyée avec succès.');
    } catch (error: any) {
      toast.error(`Erreur lors du renvoi de la notification : ${error.message}`);
    } finally {
      setResendingNoteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Créer une nouvelle note de relogement</CardTitle>
          <CardDescription>
            Remplissez ce formulaire pour les cas où vous avez perçu des fonds (ex: caution) que Hello Keys doit vous rembourser ou transférer à un tiers.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="note_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de note</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Caution voyageur">Caution voyageur</SelectItem>
                          <SelectItem value="Remboursement plateforme">Remboursement plateforme</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount_received"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant perçu par le propriétaire (€)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="amount_to_transfer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant à virer par Hello Keys (€)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="150.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardTitle className="text-lg pt-4">Informations du bénéficiaire</CardTitle>
              <FormField
                control={form.control}
                name="recipient_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet du bénéficiaire</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipient_iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input placeholder="FR76..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recipient_bic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>BIC (Optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="PSSTFRPPPAR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commentaire (Optionnel)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ajoutez des détails pertinents ici..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création en cours...' : 'Créer la note'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique de vos notes de relogement</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Vous n'avez aucune note de relogement pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant Reçu</TableHead>
                    <TableHead className="text-right">Montant à Virer</TableHead>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Statut Virement</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell>{format(new Date(note.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                      <TableCell>{note.note_type}</TableCell>
                      <TableCell className="text-right">{note.amount_received.toFixed(2)} €</TableCell>
                      <TableCell className="text-right font-medium">{note.amount_to_transfer.toFixed(2)} €</TableCell>
                      <TableCell>{note.recipient_name}</TableCell>
                      <TableCell>
                        <Badge variant={note.transfer_completed ? 'default' : 'secondary'} className="flex items-center w-fit">
                          {note.transfer_completed ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {note.transfer_completed ? 'Effectué' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{note.comment || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendNotification(note.id)}
                          disabled={resendingNoteId === note.id}
                          aria-label="Renvoyer la notification"
                        >
                          {resendingNoteId === note.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden md:inline">Renvoyer</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RehousingNotesTab;