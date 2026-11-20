import { useEffect, useState, type FormEvent } from "react";
import { Send, Star, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "keynote:open-feedback";

/** Déclenche l'ouverture du formulaire d'avis depuis n'importe quelle slide. */
export function openKeynoteFeedback() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

interface KeynoteFeedbackPanelProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Formulaire d'avis affiché par-dessus la présentation.
 * Rendu dans l'arbre de la keynote (pas de portail) : il reste visible en plein écran.
 */
export function KeynoteFeedbackPanel({ open, onOpen, onClose }: KeynoteFeedbackPanelProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const handle = () => onOpen();
    window.addEventListener(OPEN_EVENT, handle);
    return () => window.removeEventListener(OPEN_EVENT, handle);
  }, [onOpen]);

  const reset = () => {
    setRating(0);
    setHovered(0);
    setName("");
    setEmail("");
    setMessage("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (rating === 0) {
      toast.error("Choisissez une note globale, même rapide.");
      return;
    }
    if (!message.trim()) {
      toast.error("Dites-nous en quelques mots ce que vous en pensez.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("keynote_feedback").insert({
      rating,
      message: message.trim(),
      name: name.trim() || null,
      email: email.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error("Votre avis n’a pas pu être envoyé. Réessayez dans un instant.");
      return;
    }
    toast.success("Merci beaucoup pour votre avis !");
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Donner votre avis sur la présentation"
      className="absolute inset-0 z-30 flex items-end justify-center bg-black/25 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Votre avis compte</h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">
              Cette présentation vous a plu ? Dites-nous ce que vous en pensez — vos retours guident la suite.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le formulaire"
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-black/[0.04] hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hk-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-800">Votre note globale</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Note globale">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHovered(value)}
                  onMouseLeave={() => setHovered(0)}
                  className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hk-500"
                >
                  <Star
                    className={cn(
                      "h-7 w-7 transition-colors",
                      (hovered || rating) >= value ? "fill-amber-400 text-amber-400" : "text-neutral-300",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="keynote-feedback-message" className="mb-2 block text-sm font-medium text-neutral-800">
              Votre avis
            </label>
            <textarea
              id="keynote-feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="Ce qui vous plaît, ce qui vous manque, vos questions…"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-hk-500 focus:outline-none focus:ring-2 focus:ring-hk-500/20"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="keynote-feedback-name" className="mb-2 block text-sm font-medium text-neutral-800">
                Prénom <span className="font-normal text-neutral-400">(facultatif)</span>
              </label>
              <input
                id="keynote-feedback-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Votre prénom"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-hk-500 focus:outline-none focus:ring-2 focus:ring-hk-500/20"
              />
            </div>
            <div>
              <label htmlFor="keynote-feedback-email" className="mb-2 block text-sm font-medium text-neutral-800">
                E-mail <span className="font-normal text-neutral-400">(facultatif)</span>
              </label>
              <input
                id="keynote-feedback-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Pour vous répondre"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-hk-500 focus:outline-none focus:ring-2 focus:ring-hk-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-hk-500 px-6 py-3 text-base font-semibold text-white shadow-[0_12px_30px_rgba(0,113,227,0.22)] transition hover:bg-hk-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hk-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden />
            {sending ? "Envoi…" : "Envoyer mon avis"}
          </button>
        </form>
      </div>
    </div>
  );
}
