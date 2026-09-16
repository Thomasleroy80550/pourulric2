import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lightbulb, Plus, ThumbsUp, UserRound } from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useSession } from "@/components/SessionContextProvider";
import {
  getPublicIdeas,
  getIdeaVotes,
  submitIdea,
  toggleIdeaVote,
  Idea,
} from "@/lib/ideas-api";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: "Proposée", className: "bg-slate-100 text-slate-600" },
  under_review: { label: "À l'étude", className: "bg-amber-50 text-amber-600" },
  planned: { label: "Prévue", className: "bg-hk-50 text-hk-600" },
  in_progress: { label: "En développement", className: "bg-violet-50 text-violet-600" },
  completed: { label: "Développée ✅", className: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Non retenue", className: "bg-slate-100 text-slate-400" },
};

const IdeasV4: React.FC = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const myUserId = session?.user?.id;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: ideas, isLoading } = useQuery({
    queryKey: ["public-ideas"],
    queryFn: getPublicIdeas,
  });
  const { data: votes } = useQuery({
    queryKey: ["idea-votes"],
    queryFn: getIdeaVotes,
  });

  const voteCounts = new Map<string, number>();
  const myVotes = new Set<string>();
  (votes ?? []).forEach((v) => {
    voteCounts.set(v.idea_id, (voteCounts.get(v.idea_id) ?? 0) + 1);
    if (v.user_id === myUserId) myVotes.add(v.idea_id);
  });

  const sortedIdeas = [...(ideas ?? [])].sort((a, b) => {
    const diff = (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0);
    return diff !== 0 ? diff : b.created_at.localeCompare(a.created_at);
  });

  const submitMutation = useMutation({
    mutationFn: () => submitIdea({ title: title.trim(), description: description.trim() }),
    onSuccess: () => {
      toast.success("Merci ! Votre idée a bien été transmise 💡");
      setTitle("");
      setDescription("");
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["public-ideas"] });
    },
    onError: (e: any) => toast.error(e.message || "Une erreur est survenue."),
  });

  const voteMutation = useMutation({
    mutationFn: ({ ideaId, hasVoted }: { ideaId: string; hasVoted: boolean }) =>
      toggleIdeaVote(ideaId, hasVoted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["idea-votes"] }),
    onError: (e: any) => toast.error(e.message || "Une erreur est survenue."),
  });

  const relative = (iso: string) => {
    const d = parseISO(iso);
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true, locale: fr }) : "";
  };

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        <div className="flex items-center gap-3">
          <Link
            to="/v4/plus"
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Boîte à idées</h1>
        </div>

        {/* Explication */}
        <div className="rounded-2xl bg-hk-600 p-4 text-white shadow-md">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Votre app, vos idées !</p>
              <p className="mt-1 text-sm text-hk-100">
                Proposez une idée, votez pour celles des autres propriétaires :
                nous développons les plus demandées. Les idées sont publiques
                mais <strong>votre nom reste toujours caché</strong>.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-hk-600 shadow-sm ring-1 ring-hk-100"
        >
          <Plus className="h-5 w-5" />
          Proposer une idée
        </button>

        {/* Liste */}
        <div className="space-y-2 pb-4">
          {isLoading && (
            <>
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </>
          )}
          {!isLoading && sortedIdeas.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucune idée pour le moment. Soyez le premier à en proposer une !
            </p>
          )}
          {sortedIdeas.map((idea: Idea) => {
            const status = STATUS_LABELS[idea.status] ?? STATUS_LABELS.new;
            const count = voteCounts.get(idea.id) ?? 0;
            const hasVoted = myVotes.has(idea.id);
            const isMine = idea.user_id === myUserId;
            return (
              <div key={idea.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{idea.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{idea.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      voteMutation.mutate({ ideaId: idea.id, hasVoted })
                    }
                    disabled={voteMutation.isPending}
                    className={cn(
                      "flex min-w-12 shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition-colors",
                      hasVoted
                        ? "bg-hk-600 text-white"
                        : "bg-slate-50 text-slate-500"
                    )}
                    aria-label={hasVoted ? "Retirer mon vote" : "Voter pour cette idée"}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-xs font-bold">{count}</span>
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <UserRound className="h-3 w-3" />
                    {isMine ? "Vous" : "Un propriétaire"} · {relative(idea.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulaire de proposition */}
      <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DrawerContent>
          <DrawerHeader className="pb-1">
            <DrawerTitle>Proposer une idée</DrawerTitle>
            <DrawerDescription>
              Elle sera visible par tous les propriétaires, sans votre nom.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de votre idée"
              maxLength={100}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-hk-400"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre idée : que voudriez-vous voir dans l'application ou le service ?"
              rows={4}
              maxLength={1000}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-hk-400"
            />
            <button
              onClick={() => submitMutation.mutate()}
              disabled={
                submitMutation.isPending || !title.trim() || !description.trim()
              }
              className="w-full rounded-2xl bg-hk-600 py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
            >
              {submitMutation.isPending ? "Envoi…" : "Envoyer mon idée"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </V4Layout>
  );
};

export default IdeasV4;
