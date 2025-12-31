"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PartyPopper, Sparkles, Music } from "lucide-react";

type NewYear2026CinematicProps = {
  auto?: boolean;
  className?: string;
};

const STORAGE_KEY = "ny2026_seen";

function isJanFirst2026Local(date: Date) {
  return date.getFullYear() === 2026 && date.getMonth() === 0 && date.getDate() === 1;
}

function getQueryFlag(name: string) {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) === "1";
}

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
    if ((isJanFirst2026Local(now) && !hasSeen) || shouldTest) {
      setOpen(true);
    }
  }, [auto, hasSeen, shouldTest]);

  useEffect(() => {
    if (!open) return;
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 0.95; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0.75; }
      }
      @keyframes floatUp {
        0% { transform: translateY(12px); opacity: 0.9; }
        100% { transform: translateY(-12px); opacity: 1; }
      }
      @keyframes glowPulse {
        0% { opacity: 0.9; filter: drop-shadow(0 0 2px rgba(255,255,255,0.25)); }
        50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,0.85)); }
        100% { opacity: 0.9; filter: drop-shadow(0 0 2px rgba(255,255,255,0.25)); }
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
      localStorage.setItem(STORAGE_KEY, "1");
    }
    toast({
      title: "Bonne année 2026 🎉",
      description: "Que 2026 vous apporte joie, santé et succès.",
    });
  };

  const Confetti = () => {
    const colors = ["#F472B6", "#60A5FA", "#F59E0B", "#34D399", "#A78BFA"];
    const pieces = Array.from({ length: 100 }).map((_, i) => {
      const left = Math.random() * 100;
      const duration = 3000 + Math.random() * 2500;
      const delay = Math.random() * 1200;
      const rotate = Math.random() * 360;
      const width = 6 + Math.random() * 6;
      const height = 10 + Math.random() * 8;
      const color = colors[i % colors.length];
      return (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${left}%`,
            top: "-24px",
            width,
            height,
            background: color,
            opacity: 0.9,
            transform: `rotate(${rotate}deg)`,
            animation: `confettiFall ${duration}ms ease-in forwards`,
            animationDelay: `${delay}ms`,
            borderRadius: "2px",
          }}
        />
      );
    });
    return <div className="absolute inset-0">{pieces}</div>;
  };

  return (
    <div className={className}>
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
          className="p-0 max-w-[900px] w-[95vw] overflow-hidden bg-black/90 border-0"
          aria-describedby={undefined}
        >
          <div className="relative flex flex-col items-center justify-center min-h-[70vh] w-full bg-gradient-to-b from-indigo-900 via-slate-900 to-black">
            <Confetti />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_60%)] animate-[glowPulse_4s_ease-in-out_infinite]" />
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <div className="mb-4 flex items-center gap-2 text-yellow-300/90">
                <PartyPopper className="h-6 w-6" />
                <span className="uppercase tracking-[0.3em] text-xs md:text-sm">Célébration</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg animate-[floatUp_1.8s_ease-in-out_alternate_infinite]">
                Bonne année <span className="text-yellow-300">2026</span>
              </h1>
              <p className="mt-4 md:mt-6 max-w-2xl text-sm md:text-lg text-white/85">
                Que cette nouvelle année soit pleine d’opportunités, de réussite et de moments heureux. À 2026 !
              </p>
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