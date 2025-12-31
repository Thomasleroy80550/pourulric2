"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, PartyPopper, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NewYear2026CinematicProps = {
  auto?: boolean;
  className?: string;
};

const STORAGE_KEY = "ny2026_seen";

function isJanFirst2026(date: Date) {
  return (
    date.getUTCFullYear() === 2026 &&
    date.getUTCMonth() === 0 &&
    date.getUTCDate() === 1
  );
}

function getQueryFlag(name: string) {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) === "1";
}

const FireworkBurst: React.FC<{ delay: number; x: string; y: string }> = ({ delay, x, y }) => {
  return (
    <div
      className="absolute animate-[pop_1s_ease-in-out_forwards] pointer-events-none"
      style={{
        animationDelay: `${delay}ms`,
        left: x,
        top: y,
      }}
    >
      <div className="relative w-1 h-1">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute block w-1 h-1 rounded-full bg-yellow-300"
            style={{
              transformOrigin: "center",
              transform: `rotate(${(360 / 12) * i}deg) translateX(0px)`,
              animation: "ray 700ms ease-out forwards",
              animationDelay: `${delay + 150}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ConfettiPiece: React.FC<{ i: number }> = ({ i }) => {
  const colors = ["bg-pink-400", "bg-blue-400", "bg-yellow-400", "bg-green-400", "bg-purple-400"];
  const color = colors[i % colors.length];
  const left = `${Math.random() * 100}%`;
  const duration = 3000 + Math.random() * 2000;
  const delay = Math.random() * 1000;
  const rotate = Math.random() * 360;

  return (
    <div
      className={`absolute ${color}`}
      style={{
        left,
        top: "-20px",
        width: "8px",
        height: "14px",
        transform: `rotate(${rotate}deg)`,
        animation: `fall ${duration}ms ease-in forwards`,
        animationDelay: `${delay}ms`,
        opacity: 0.9,
      }}
    />
  );
};

const NewYear2026Cinematic: React.FC<NewYear2026CinematicProps> = ({ auto = true, className }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);

  const shouldTest = useMemo(() => getQueryFlag("testNy2026"), []);
  const hasSeen = useMemo(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  }, []);

  useEffect(() => {
    if (!auto) return;
    const now = new Date();
    if ((isJanFirst2026(now) && !hasSeen) || shouldTest) {
      setOpen(true);
    }
  }, [auto, hasSeen, shouldTest]);

  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 0.95; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0.75; }
      }
      @keyframes pop {
        0% { transform: scale(0.2); opacity: 0; }
        40% { transform: scale(1.1); opacity: 1; }
        100% { transform: scale(1); opacity: 0; }
      }
      @keyframes ray {
        0% { transform: rotate(0deg) translateX(0); opacity: 1; }
        100% { transform: rotate(0deg) translateX(26px); opacity: 0; }
      }
      @keyframes floatUp {
        0% { transform: translateY(12px); opacity: 0.7; }
        100% { transform: translateY(-12px); opacity: 1; }
      }
      @keyframes glowPulse {
        0% { opacity: 0.9; filter: drop-shadow(0 0 2px rgba(255,255,255,0.2)); }
        50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,0.8)); }
        100% { opacity: 0.9; filter: drop-shadow(0 0 2px rgba(255,255,255,0.2)); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    if (!shouldTest) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
    toast({
      title: "Bonne année !",
      description: "Que 2026 vous apporte succès, joie et sérénité.",
    });
  };

  return (
    <div className={className}>
      {/* Bouton manuel pour tests en dehors de la date */}
      {!open && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Tester la cinématique <Sparkles className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Ou ajoutez ?testNy2026=1 à l’URL pour forcer l’ouverture.
          </span>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent
          className="p-0 max-w-[920px] w-[95vw] overflow-hidden bg-black/90 border-0"
          aria-describedby={undefined}
        >
          <div className="relative flex flex-col items-center justify-center min-h-[70vh] w-full bg-gradient-to-b from-indigo-900 via-slate-900 to-black">
            {/* Confettis */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 120 }).map((_, i) => (
                <ConfettiPiece key={i} i={i} />
              ))}
            </div>

            {/* Fireworks */}
            <FireworkBurst delay={200} x="12%" y="18%" />
            <FireworkBurst delay={550} x="78%" y="26%" />
            <FireworkBurst delay={900} x="35%" y="12%" />
            <FireworkBurst delay={1300} x="62%" y="20%" />

            {/* Halo lumineux */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_60%)] animate-[glowPulse_4s_ease-in-out_infinite]" />

            {/* Contenu principal */}
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <div className="mb-6 flex items-center gap-2 text-yellow-300/90">
                <PartyPopper className="h-6 w-6" />
                <span className="uppercase tracking-[0.3em] text-xs md:text-sm">Célébration</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg animate-[floatUp_1.8s_ease-in-out_alternate_infinite]">
                Bonne année <span className="text-yellow-300">2026</span>
              </h1>

              <p className="mt-4 md:mt-6 max-w-2xl text-sm md:text-lg text-white/85">
                Merci d’être avec nous. Que cette nouvelle année soit synonyme d’opportunités,
                de réussite et de belles histoires. À 2026 !
              </p>

              {/* Compteur décoratif */}
              <div className="mt-5 flex items-center gap-4 text-white/80">
                <div className="rounded-md bg-white/10 px-3 py-2 backdrop-blur">
                  <span className="text-xs">Joie</span>
                </div>
                <div className="rounded-md bg-white/10 px-3 py-2 backdrop-blur">
                  <span className="text-xs">Santé</span>
                </div>
                <div className="rounded-md bg-white/10 px-3 py-2 backdrop-blur">
                  <span className="text-xs">Succès</span>
                </div>
              </div>

              {/* Contrôles */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={handleClose} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  Continuer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMuted((m) => !m)}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {muted ? (
                    <>
                      Activer son <Music className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Couper son <Music className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Audio de fond */}
            <audio
              src="https://cdn.pixabay.com/download/audio/2022/03/01/audio_ba5d0e70b0.mp3?filename=new-year-ambient-21859.mp3"
              autoPlay
              loop
              muted={muted}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewYear2026Cinematic;