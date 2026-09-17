import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useSession } from "@/components/SessionContextProvider";
import { getMyAppRating, upsertAppRating, AppRating } from "@/lib/app-rating-api";
import { cn } from "@/lib/utils";

const PROMPT_KEY = (userId: string) => `app_rating_prompt_shown_${userId}`;

const Stars: React.FC<{
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}> = ({ value, onChange, size = "h-6 w-6" }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        onClick={onChange ? () => onChange(i) : undefined}
        disabled={!onChange}
        aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
        className={onChange ? "p-1 transition-transform active:scale-110" : ""}
      >
        <Star
          className={cn(
            size,
            i <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"
          )}
        />
      </button>
    ))}
  </div>
);

const RateAppDrawer: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: AppRating | null;
}> = ({ open, onOpenChange, initial }) => {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setRating(initial?.rating ?? 0);
      setComment(initial?.comment ?? "");
    }
  }, [open, initial]);

  const mutation = useMutation({
    mutationFn: () => upsertAppRating(rating, comment),
    onSuccess: () => {
      toast.success("Merci pour votre avis ! 💙");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["my-app-rating"] });
    },
    onError: (e: any) => toast.error(e.message || "Une erreur est survenue."),
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-1 text-center">
          <DrawerTitle>Que pensez-vous de l'app ?</DrawerTitle>
          <DrawerDescription>
            Votre avis nous aide à l'améliorer pour vous.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
          <div className="flex justify-center">
            <Stars value={rating} onChange={setRating} size="h-9 w-9" />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Un commentaire ? Ce que vous aimez, ce qui manque… (facultatif)"
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-hk-400"
          />
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || rating === 0}
            className="w-full rounded-2xl bg-hk-600 py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
          >
            {mutation.isPending ? "Envoi…" : "Envoyer mon avis"}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-1 text-sm font-semibold text-slate-400"
          >
            Plus tard
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

/**
 * Popup automatique : s'affiche une seule fois par utilisateur,
 * uniquement s'il n'a pas encore noté l'application.
 */
export const RateAppPromptV4: React.FC = () => {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { data: myRating, isLoading } = useQuery({
    queryKey: ["my-app-rating"],
    queryFn: getMyAppRating,
    enabled: !!userId,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || isLoading || myRating) return;
    if (localStorage.getItem(PROMPT_KEY(userId))) return;
    const timer = setTimeout(() => {
      localStorage.setItem(PROMPT_KEY(userId), "1");
      setOpen(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [userId, isLoading, myRating]);

  return <RateAppDrawer open={open} onOpenChange={setOpen} initial={null} />;
};

/** Carte « Notez l'application » dans l'onglet Plus. */
const RateAppV4: React.FC = () => {
  const { data: myRating } = useQuery({
    queryKey: ["my-app-rating"],
    queryFn: getMyAppRating,
  });
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
          <Star size={18} className={myRating ? "fill-amber-400 text-amber-400" : ""} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {myRating ? "Merci pour votre note !" : "Notez l'application"}
          </p>
          <p className="text-xs text-slate-400">
            {myRating
              ? "Touchez pour modifier votre avis"
              : "Dites-nous ce que vous pensez de la nouvelle app"}
          </p>
        </div>
        {myRating && <Stars value={myRating.rating} size="h-3.5 w-3.5" />}
      </button>

      <RateAppDrawer open={open} onOpenChange={setOpen} initial={myRating ?? null} />
    </>
  );
};

export default RateAppV4;
