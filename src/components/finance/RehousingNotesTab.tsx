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
import { getRehousingNotes, RehousingNote, resendRehousingNoteNotification } from '@/lib/rehousing-notes-api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Mail, RefreshCw } from 'lucide-react';

const RehousingNotesTab: React.FC = () => {
  const [notes, setNotes] = useState<RehousingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingNoteId, setResendingNoteId] = useState<string | null>(null);

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
          <CardTitle>Vos notes de relogement</CardTitle>
          <CardDescription>
            Visualisez l'historique de vos notes de relogement créées par l'équipe Hello Keys.
          </CardDescription>
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