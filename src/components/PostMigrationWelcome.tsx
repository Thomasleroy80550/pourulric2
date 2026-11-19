import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import useWindowSize from "react-use/lib/useWindowSize";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isReopenPreview, useReopened } from "@/lib/migration-api";
import "@/styles/welcome.css";

const SEEN_KEY = "hk-welcome-reouverture-2026";

export default function PostMigrationWelcome() {
  const reopened = useReopened();
  const [visible, setVisible] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!reopened) return;
    const preview = isReopenPreview();
    if (!preview && window.localStorage.getItem(SEEN_KEY)) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setVisible(true);
      setConfettiOn(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };
    void supabase.auth.getSession().then(({ data }) => { if (data.session) show(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) show();
    });
    return () => subscription.unsubscribe();
  }, [reopened]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [visible]);

  useEffect(() => {
    if (!confettiOn) return;
    const stop = window.setTimeout(() => setConfettiOn(false), 9000);
    return () => window.clearTimeout(stop);
  }, [confettiOn]);

  if (!visible) return null;

  const close = () => {
    if (!isReopenPreview()) window.localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Bienvenue sur votre nouvelle plateforme" className="welcome-overlay fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-slate-950/95 text-white">
      {confettiOn && (
        <Confetti
          width={width}
          height={height}
          recycle
          numberOfPieces={340}
          gravity={0.12}
          tweenDuration={6000}
          colors={["#e11d48", "#f43f5e", "#fb7185", "#fbbf24", "#ffffff"]}
        />
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="welcome-glow absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-rose-600/20 blur-3xl" />
        <div className="welcome-glow absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-red-600/20 blur-3xl" style={{ animationDelay: "-2s" }} />
      </div>

      <div className="relative flex max-w-lg flex-col items-center px-6 text-center">
        <div className="relative mb-8 flex items-center justify-center">
          <span aria-hidden="true" className="welcome-ring absolute h-28 w-28 rounded-full border-2 border-rose-500/50" />
          <span aria-hidden="true" className="welcome-ring absolute h-28 w-28 rounded-full border-2 border-rose-400/40" style={{ animationDelay: "-1.2s" }} />
          <div className="welcome-logo-card rounded-3xl bg-white p-5 shadow-[0_20px_60px_-15px_rgba(225,29,72,0.5)]">
            <img src="/logo.png" alt="Hello Keys" className="h-14 w-auto object-contain" />
          </div>
        </div>

        <p className="welcome-rise flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300" style={{ "--d": "0.7s" } as React.CSSProperties}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> La migration est terminée
        </p>
        <h1 className="welcome-rise mt-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl" style={{ "--d": "0.9s" } as React.CSSProperties}>
          Bienvenue sur votre<br />nouvelle plateforme
        </h1>
        <p className="welcome-rise mt-4 max-w-md text-sm leading-relaxed text-slate-300" style={{ "--d": "1.1s" } as React.CSSProperties}>
          Toutes vos données ont été transférées avec succès vers le nouveau logiciel Hello Keys. Votre espace est prêt — et ce n’est que le début.
        </p>
        <p className="welcome-rise mt-3 text-[11px] leading-relaxed text-slate-500" style={{ "--d": "1.25s" } as React.CSSProperties}>
          Canal Abritel : activation en cours, finalisation prévue lundi 23 novembre.
        </p>
        <Button onClick={close} size="lg" className="welcome-rise mt-8 gap-2 rounded-full bg-red-600 px-8 text-white shadow-lg shadow-red-600/30 hover:bg-red-500" style={{ "--d": "1.4s" } as React.CSSProperties}>
          Découvrir mon espace <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
