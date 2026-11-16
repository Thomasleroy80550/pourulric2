import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getMaintenanceQuestions, questionsPageSize, submitMaintenanceQuestion } from "@/lib/maintenance-questions-api";
import { formatMigrationNoteDate } from "@/lib/migration-notes-api";

export default function MaintenanceQuestions() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [website, setWebsite] = useState("");
  const [page, setPage] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({ queryKey: ["maintenance-questions", page], queryFn: () => getMaintenanceQuestions(page), enabled: open, refetchInterval: open ? 30000 : false, retry: false, networkMode: "always" });
  const valid = question.trim().length >= 10 && question.trim().length <= 1000;

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    setSending(true);
    setError(null);
    setSuccess(false);
    try {
      await submitMaintenanceQuestion(question.trim(), website);
      setQuestion("");
      setPage(0);
      setSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ["maintenance-questions"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de publier votre question.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1.5 rounded-full border-slate-200 bg-white text-[10px] text-slate-600 hover:border-slate-300 hover:bg-slate-50"><MessageSquare className="h-3 w-3" aria-hidden="true" />Questions & réponses</Button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>Questions & réponses</DialogTitle><DialogDescription>Posez une question sans compte ni nom. Les questions et les réponses sont publiques. Notre équipe répondra selon ses disponibilités pendant la migration.</DialogDescription></DialogHeader>
        <form onSubmit={(event) => void send(event)} className="space-y-3 rounded-xl border bg-slate-50 p-4">
          <Label htmlFor="maintenance-public-question">Votre question</Label>
          <Textarea id="maintenance-public-question" value={question} onChange={(event) => { setQuestion(event.target.value); setSuccess(false); }} minLength={10} maxLength={1000} rows={3} required disabled={sending} placeholder="Que souhaitez-vous savoir sur la migration ?" />
          <div className="hidden" aria-hidden="true"><label htmlFor="maintenance-question-website">Site web</label><input id="maintenance-question-website" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></div>
          <p className="text-xs text-slate-500">Ne publiez pas de données personnelles, de mot de passe ou d’informations de réservation. Limite : 3 questions par 10 minutes et par connexion réseau.</p>
          <div className="flex items-center justify-between gap-3"><Button type="submit" size="sm" disabled={sending || !valid}><Send className="mr-2 h-3.5 w-3.5" />{sending ? "Publication…" : "Publier anonymement"}</Button><span className="text-[10px] text-slate-400">{question.length} / 1 000</span></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {success && <p role="status" className="text-sm text-emerald-700">Votre question est publiée. Vous pourrez retrouver la réponse ici, sans vous connecter.</p>}
        </form>
        <section className="space-y-3" aria-labelledby="public-questions-title">
          <h2 id="public-questions-title" className="text-sm font-semibold">Questions des clients{data ? ` (${data.total})` : ""}</h2>
          {isPending && <p role="status" className="text-xs text-muted-foreground">Chargement des questions…</p>}
          {isError && <p role="alert" className="text-xs text-destructive">Impossible de charger les questions. <Button variant="link" size="sm" onClick={() => void refetch()}>Réessayer</Button></p>}
          {data?.total === 0 && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aucune question pour le moment. Vous pouvez poser la première.</p>}
          <Accordion type="multiple">
            {data?.questions.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="gap-3 text-left text-sm"><span className="min-w-0 whitespace-pre-wrap break-words">{item.question}<span className={`mt-1 block text-[10px] font-normal ${item.answer ? "text-emerald-600" : "text-slate-400"}`}>{item.answer ? "Réponse de l’équipe disponible" : "En attente de réponse"}</span></span></AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-[10px] text-slate-400">Client anonyme · {formatMigrationNoteDate(item.created_at)} (Paris)</p>
                  {item.answer ? <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3"><p className="mb-1 text-xs font-semibold text-emerald-800">L’équipe Hello Keys</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.answer}</p>{item.answered_at && <p className="mt-2 text-[10px] text-slate-500">{formatMigrationNoteDate(item.answered_at)} (Paris)</p>}</div> : <p className="text-xs text-slate-500">Notre équipe n’a pas encore répondu. Revenez consulter cette page ultérieurement.</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {data && data.total > questionsPageSize && <div className="flex items-center justify-between gap-3"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button><span className="text-xs text-slate-500">{page + 1} / {Math.ceil(data.total / questionsPageSize)}</span><Button variant="outline" size="sm" disabled={(page + 1) * questionsPageSize >= data.total} onClick={() => setPage(page + 1)}>Suivant</Button></div>}
        </section>
      </DialogContent>
    </Dialog>
  );
}
