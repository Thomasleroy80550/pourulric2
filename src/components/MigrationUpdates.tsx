import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMigrationNoteDate, getMigrationNotes, type MigrationNote } from "@/lib/migration-notes-api";

function Note({ note, compact = false }: { note: MigrationNote; compact?: boolean }) {
  return (
    <article className="relative border-l border-slate-200 pb-5 pl-5 last:pb-0">
      <span aria-hidden="true" className="absolute -left-[4px] top-1 h-[7px] w-[7px] rounded-full bg-red-500 ring-4 ring-white" />
      <time dateTime={note.created_at} className="text-[10px] font-medium text-slate-400">{formatMigrationNoteDate(note.created_at)} · Paris</time>
      <p className={`mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600 ${compact ? "line-clamp-3" : ""}`}>{note.content}</p>
      {note.updated_at !== note.created_at && <p className="mt-1 text-[10px] text-slate-400">Modifiée le {formatMigrationNoteDate(note.updated_at)}</p>}
    </article>
  );
}

export default function MigrationUpdates() {
  const titleId = useId();
  const { data: notes, isPending, isError } = useQuery({ queryKey: ["migration-notes"], queryFn: getMigrationNotes, refetchInterval: 30000, refetchOnWindowFocus: true, retry: false, networkMode: "always" });

  return (
    <section aria-labelledby={titleId} className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-sm font-semibold tracking-tight text-slate-900">Journal de migration</h2>
        <MessageSquare className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      {isPending && <p role="status" className="text-xs text-slate-500">Chargement des mises à jour…</p>}
      {isError && <p role="alert" className="text-xs text-amber-700">Le journal est momentanément indisponible. Actualisation automatique en cours.</p>}
      {notes?.length === 0 && <div className="flex flex-1 flex-col justify-center rounded-xl border border-dashed border-slate-200 p-4 text-center"><p className="text-xs font-medium text-slate-600">Les nouvelles de notre équipe, ici.</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">Les prochaines informations sur le transfert seront publiées dans ce journal.</p></div>}
      {notes && notes.length > 0 && (
        <>
          <div className="ml-1"><Note note={notes[0]} compact /><div className="hidden lg:block">{notes.slice(1, 3).map((note) => <Note key={note.id} note={note} compact />)}</div></div>
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" className="mt-3 h-8 w-full justify-between rounded-lg bg-slate-50 px-3 text-xs text-slate-600 hover:bg-slate-100">Lire toutes les notes ({notes.length})<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Button></DialogTrigger>
            <DialogContent className="bottom-0 left-0 top-auto max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl rounded-b-none border-x-0 border-b-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[85dvh] lg:w-[calc(100%-2rem)] lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:border">
              <DialogHeader><DialogTitle>Journal de migration</DialogTitle><DialogDescription>Les mises à jour publiées par l’équipe Hello Keys, de la plus récente à la plus ancienne.</DialogDescription></DialogHeader>
              <div className="ml-1 pt-3">{notes.map((note) => <Note key={note.id} note={note} />)}</div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </section>
  );
}
