import { useEffect, useState } from 'react';
import { Loader2, Pencil, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ClientNote {
  id: string;
  content: string;
  created_at: string;
}

export default function ClientStatementNotes({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientNote | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    const load = async () => {
      const { data, error } = await supabase.from('client_statement_notes')
        .select('id, content, created_at').eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setLoadError(true);
      else setNotes(data || []);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [clientId, retry]);

  const saveNote = async () => {
    const text = content.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const query = editingId
        ? supabase.from('client_statement_notes').update({ content: text, updated_at: new Date().toISOString() })
          .eq('id', editingId).eq('client_id', clientId)
        : supabase.from('client_statement_notes').insert({ client_id: clientId, content: text });
      const { data, error } = await query.select('id, content, created_at').single();
      if (error) throw error;
      setNotes(previous => editingId
        ? previous.map(note => note.id === editingId ? data : note)
        : [data, ...previous]);
      setContent('');
      setEditingId(null);
      toast.success('Note enregistrée pour les prochains relevés.');
    } catch {
      toast.error("Impossible d’enregistrer la note. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (note: ClientNote) => {
    setDeletingId(note.id);
    try {
      const { error } = await supabase.from('client_statement_notes').delete()
        .eq('id', note.id).eq('client_id', clientId).select('id').single();
      if (error) throw error;
      setNotes(previous => previous.filter(item => item.id !== note.id));
      if (editingId === note.id) {
        setEditingId(null);
        setContent('');
      }
      toast.success('Note supprimée.');
    } catch {
      toast.error('Impossible de supprimer la note. Réessayez.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <StickyNote className="h-4 w-4 text-amber-600" /> Notes internes du client
      </h3>
      <p className="text-xs text-muted-foreground">Rappels conservés d’un mois à l’autre, partagés entre agents. Non visibles par le client et non inclus dans le relevé.</p>
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des notes…</p>
      ) : loadError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Impossible de charger les notes.
            <Button variant="link" size="sm" onClick={() => setRetry(value => value + 1)}>Réessayer</Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {notes.length === 0 && <p className="text-sm text-muted-foreground">Aucune note pour ce client.</p>}
          {notes.map(note => (
            <div key={note.id} className="space-y-2 rounded-md border bg-background p-3">
              <p className="whitespace-pre-wrap break-words text-sm">{note.content}</p>
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground">Ajoutée le {new Date(note.created_at).toLocaleDateString('fr-FR')}</span>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" aria-label="Modifier la note" disabled={saving || !!deletingId} onClick={() => { setEditingId(note.id); setContent(note.content); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la note" disabled={saving || !!deletingId} onClick={() => setDeleteTarget(note)}>
                    {deletingId === note.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="client-statement-note">{editingId ? 'Modifier la note' : 'Ajouter un rappel'}</Label>
            <Textarea id="client-statement-note" placeholder="Ex. : vérifier les frais de ménage avant chaque relevé…" value={content} onChange={event => setContent(event.target.value)} maxLength={5000} disabled={saving} className="bg-background" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={saveNote} disabled={saving || !!deletingId || !content.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Enregistrer' : 'Ajouter la note'}
              </Button>
              {editingId && <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setEditingId(null); setContent(''); }}>Annuler</Button>}
            </div>
          </div>
        </>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette note ?</AlertDialogTitle>
            <AlertDialogDescription>Ce rappel ne s’affichera plus lors de la création des prochains relevés du client.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) void deleteNote(deleteTarget); }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
