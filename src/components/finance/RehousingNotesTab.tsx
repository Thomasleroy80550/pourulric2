import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { Loader2, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getRehousingNotesForUser, markRehousingNoteAsCompleted, RehousingNote } from '@/lib/rehousing-notes-api';
import { Badge } from '@/components/ui/badge';

const RehousingNotesTab: React.FC = () => {
  const { session } = useSession();
  const [notes, setNotes] = useState<RehousingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<RehousingNote | null>(null);
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      const fetchNotes = async () => {
        setLoading(true);
        try {
          const userNotes = await getRehousingNotesForUser(session.user.id);
          setNotes(userNotes);
        } catch (error) {
          toast.error("Erreur lors de la récupération de vos notes de relogement.");
        } finally {
          setLoading(false);
        }
      };
      fetchNotes();
    }
  }, [session]);

  const handleMarkAsCompleted = async (noteId: string) => {
    setUpdatingNoteId(noteId);
    try {
      await markRehousingNoteAsCompleted(noteId);
      setNotes(notes.map(n => n.id === noteId ? { ...n, transfer_completed: true } : n));
      toast.success("Le virement a bien été marqué comme effectué.");
    } catch (error) {
      toast.error("Une erreur est survenue lors de la mise à jour.");
    } finally {
      setUpdatingNoteId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes de Relogement & Compensation</CardTitle>
        <CardDescription>Retrouvez ici l'historique des notes concernant les relogements ou compensations.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Montant à transférer</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.length > 0 ? (
                notes.map(note => (
                  <TableRow key={note.id}>
                    <TableCell>{format(new Date(note.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                    <TableCell className="font-medium">{note.note_type}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(note.amount_to_transfer)}</TableCell>
                    <TableCell>
                      {note.transfer_completed ? (
                        <Badge variant="success">Effectué</Badge>
                      ) : (
                        <Badge variant="warning">En attente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
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
                                        <p>Veuillez procéder à un virement du montant à transférer aux coordonnées bancaires suivantes :</p>
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
                      {!note.transfer_completed && (
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkAsCompleted(note.id)}
                          disabled={updatingNoteId === note.id}
                        >
                          {updatingNoteId === note.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Marquer comme effectué
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Vous n'avez aucune note de relogement ou compensation pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default RehousingNotesTab;