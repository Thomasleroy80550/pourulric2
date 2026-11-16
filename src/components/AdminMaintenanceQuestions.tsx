import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { answerMaintenanceQuestion, deleteMaintenanceQuestion, getMaintenanceQuestions, questionsPageSize, type MaintenanceQuestion } from "@/lib/maintenance-questions-api";
import { formatMigrationNoteDate } from "@/lib/migration-notes-api";

function QuestionEditor({ item, onDeleted }: { item: MaintenanceQuestion; onDeleted: () => void }) {
  const [answer, setAnswer] = useState(item.answer ?? "");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const save = async () => {
    setBusy(true);
    try {
      await answerMaintenanceQuestion(item.id, answer);
      await queryClient.invalidateQueries({ queryKey: ["maintenance-questions"] });
      toast.success(answer.trim() ? "Réponse publiée sur la page de maintenance." : "Réponse retirée de la page publique.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de publier la réponse.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Supprimer définitivement cette question et sa réponse de la page publique ?")) return;
    setBusy(true);
    try {
      await deleteMaintenanceQuestion(item.id);
      onDeleted();
      await queryClient.invalidateQueries({ queryKey: ["maintenance-questions"] });
      toast.success("Question supprimée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de supprimer la question.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Client anonyme · {formatMigrationNoteDate(item.created_at)} (Paris)</p><span className={`shrink-0 text-xs ${item.answer ? "text-emerald-600" : "text-orange-600"}`}>{item.answer ? "Répondu" : "Sans réponse"}</span></div>
      <p className="whitespace-pre-wrap break-words text-sm font-medium">{item.question}</p>
      <Label htmlFor={`maintenance-answer-${item.id}`}>Réponse publique de l’équipe</Label>
      <Textarea id={`maintenance-answer-${item.id}`} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={4000} rows={3} disabled={busy} placeholder="Votre réponse sera visible par tous les visiteurs…" />
      <div className="flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => void save()} disabled={busy || answer.trim() === (item.answer ?? "")}><Save className="mr-2 h-3.5 w-3.5" />{busy ? "Enregistrement…" : "Publier la réponse"}</Button><Button variant="outline" size="sm" onClick={() => void remove()} disabled={busy} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />Supprimer la question</Button><span className="ml-auto text-xs text-muted-foreground">{answer.length} / 4 000</span></div>
      {item.answer && <p className="text-xs text-muted-foreground">Pour retirer uniquement la réponse, videz le champ puis publiez.</p>}
    </div>
  );
}

export default function AdminMaintenanceQuestions() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["maintenance-questions", page], queryFn: () => getMaintenanceQuestions(page), retry: false });

  return (
    <Card>
      <CardHeader><CardTitle>Questions anonymes des clients</CardTitle><p className="text-sm text-muted-foreground">Les questions sont publiques dès leur envoi. Répondez ici, modifiez une réponse ou supprimez les contenus inappropriés.</p></CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => void refetch()}>Actualiser les questions</Button>
        {isPending && <p role="status" className="text-sm text-muted-foreground">Chargement…</p>}
        {isError && <p role="alert" className="text-sm text-destructive">Impossible de charger les questions. Cliquez sur Actualiser pour réessayer.</p>}
        {data?.total === 0 && <p className="text-sm text-muted-foreground">Aucune question reçue pour le moment.</p>}
        {data?.questions.map((item) => <QuestionEditor key={`${item.id}:${item.answered_at ?? "pending"}`} item={item} onDeleted={() => { if (data.questions.length === 1 && page > 0) setPage(page - 1); }} />)}
        {data && data.total > questionsPageSize && <div className="flex items-center justify-between gap-3"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button><span className="text-xs text-muted-foreground">{page + 1} / {Math.ceil(data.total / questionsPageSize)}</span><Button variant="outline" size="sm" disabled={(page + 1) * questionsPageSize >= data.total} onClick={() => setPage(page + 1)}>Suivant</Button></div>}
      </CardContent>
    </Card>
  );
}
