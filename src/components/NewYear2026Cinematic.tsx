"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Music, Sparkles } from "lucide-react";
import FireworksCanvas from "@/components/FireworksCanvas";
import NeonYearTitle from "@/components/NeonYearTitle";

type NewYear2026CinematicProps = {
  auto?: boolean;
  className?: string;
};

const STORAGE_KEY = "ny2026_seen";

const isJanFirst2026 = (d: Date) => d.getFullYear() === 2026 && d.getMonth() === 0 && d.getDate() === 1;
const getFlag = (name: string) => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) === "1";
};

const ConfettiPiece: React.FC<{ i: number }> = ({ i }) => {
  const palette = ["#F472B6", "#60A5FA", "#F59E0B", "#34D399", "#A78BFA", "#22C55E"];
  const color = palette[i % palette.length];
  const left = `${Math.random() * 100}%`;
  const duration = 3200 + Math.random() * 2800;
  const delay = Math.random() * 1200;
  const rotate = Math.random() * 360;
  const width = 6 + Math.random() * 7;
  const height = 10 + Math.random() * 10;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top: "-24px",
        width,
        height,
        background: color,
        opacity: 0.95,
        transform: `rotate(${rotate}deg)`,
        animation: `confettiFall ${duration}ms ease-in forwards`,
        animationDelay: `${delay}ms`,
        borderRadius: "2px",
      }}
    />
  );
};

const NewYear2026Cinematic: React.FC<NewYear2026CinematicProps> = ({ auto = true, className }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);

  const shouldTest = useMemo(() => getFlag("testNy2026"), []);
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
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 0.95; }
        100% { transform: translateY(100vh) rotate(360deg); opacity: 0.75; }
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

  return (
    <div className={className}>
      {!open && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Tester la cinématique <Sparkles className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Ou ajoutez ?testNy2026=1 à l’URL.</span>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent
          className="p-0 max-w-[1100px] w-[96vw] overflow-hidden bg-black border-0"
          aria-describedby={undefined}
        >
          <div className="relative min-h-[72vh] w-full flex items-center justify-center bg-gradient-to-b from-indigo-900 via-slate-900 to-black">
            {/* Feux d’artifice */}
            <FireworksCanvas className="absolute inset-0" />

            {/* Confettis */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 120 }).map((_, i) => (
                <ConfettiPiece key={i} i={i} />
              ))}
            </div>

            {/* Halo doux */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_60%)]" />

            {/* Contenu */}
            <div className="relative z-10 w-full px-6 py-10 flex flex-col items-center">
              <NeonYearTitle />
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button onClick={handleClose} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  Continuer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMuted((m) => !m)}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  {muted ? "Activer son" : "Couper son"} <Music className="ml-2 h-4 w-4" />
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