import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { deleteMigrationNote, formatMigrationNoteDate, getMigrationNotes, saveMigrationNote } from "@/lib/migration-notes-api";

export default function AdminMigrationNotes() {
  const queryClient = useQueryClient();
  const { data: notes, isPending, isError, refetch } = useQuery({ queryKey: ["migration-notes"], queryFn: getMigrationNotes });
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    setBusy(true);
    try {
      await saveMigrationNote(content, editingId);
      setContent("");
      setEditingId(undefined);
      await queryClient.invalidateQueries({ queryKey: ["migration-notes"] });
      toast.success("Note publiée sur la page de maintenance.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de publier la note.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Supprimer cette note de la page publique ?")) return;
    setBusy(true);
    try {
      await deleteMigrationNote(id);
      if (editingId === id) { setEditingId(undefined); setContent(""); }
      await queryClient.invalidateQueries({ queryKey: ["migration-notes"] });
      toast.success("Note supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer la note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes de migration</CardTitle>
        <p className="text-sm text-muted-foreground">Publiez des informations datées pour vos clients. Elles apparaissent sur la maintenance sous 30 secondes.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <fieldset disabled={busy} className="space-y-3">
          <Label htmlFor="migration-note">{editingId ? "Modifier la note publique" : "Nouvelle note publique"}</Label>
          <Textarea id="migration-note" value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={4} placeholder="Informez vos clients de l’avancement du transfert…" />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void publish()} disabled={busy || !content.trim()}><Send className="mr-2 h-4 w-4" />{busy ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Publier la note"}</Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(undefined); setContent(""); }}>Annuler</Button>}
            <span className="ml-auto text-xs text-muted-foreground">{content.length} / 2 000</span>
          </div>
        </fieldset>
        {isPending && <p role="status" className="text-sm text-muted-foreground">Chargement des notes…</p>}
        {isError && <div role="alert" className="text-sm text-destructive">Impossible de charger les notes. <Button variant="link" onClick={() => void refetch()}>Réessayer</Button></div>}
        {notes?.length === 0 && <p className="text-sm text-muted-foreground">Aucune note publiée pour le moment.</p>}
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {notes?.map((note) => (
            <div key={note.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{formatMigrationNoteDate(note.created_at)} (Paris){note.updated_at !== note.created_at ? " · Modifiée" : ""}</p>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" disabled={busy} aria-label="Modifier cette note" onClick={() => { setEditingId(note.id); setContent(note.content); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={busy} aria-label="Supprimer cette note" onClick={() => void remove(note.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{note.content}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
