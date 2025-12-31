"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ImmersiveSlides from "@/components/ImmersiveSlides";
import { Sparkles } from "lucide-react";

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

const NewYear2026Cinematic: React.FC<NewYear2026CinematicProps> = ({ auto = true, className }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const explosionRef = useRef<HTMLAudioElement | null>(null);

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
    style.setAttribute("data-ny2026-overlay", "true");
    // Neutraliser l'overlay noir du Dialog pendant la cinématique
    style.innerHTML = `
      .bg-black\\/80 { background-color: transparent !important; }
    `;
    document.head.appendChild(style);
    return () => {
      const s = document.head.querySelector('style[data-ny2026-overlay="true"]');
      if (s) document.head.removeChild(s);
    };
  }, [open]);

  const handleFinish = () => {
    setOpen(false);
    if (!shouldTest) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    toast({
      title: "Bonne année 2026 🎉",
      description: "Plongez dans une année pleine de joie, santé et succès.",
    });
  };

  const handleOpenCinematic = () => {
    setOpen(true);
    const el = explosionRef.current;
    if (el) {
      el.currentTime = 0;
      el.volume = 0.6;
      el.play().catch(() => {});
    }
    // déverrouiller Web Audio si présent
    window.dispatchEvent(new Event("ny2026-unlock-audio"));
  };

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
        if (!next) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          window.dispatchEvent(new Event("ny2026-unlock-audio"));
        }
      } else {
        if (!next) window.dispatchEvent(new Event("ny2026-unlock-audio"));
      }
      return next;
    });
  };

  return (
    <div className={className}>
      {!open && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleOpenCinematic}>
            Tester la cinématique <Sparkles className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Ou ajoutez ?testNy2026=1 à l'URL pour forcer l'ouverture.
          </span>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleFinish())}>
        <DialogContent
          className="p-0 max-w-none w-[100vw] sm:w-[96vw] h-[86vh] sm:h-[88vh] overflow-hidden bg-transparent border-0"
          aria-describedby={undefined}
        >
          <div className="relative w-full h-full">
            <ImmersiveSlides
              muted={muted}
              onToggleMute={handleToggleMute}
              onFinish={handleFinish}
              autoPlayMs={7000}
            />
            {/* Audio global (musique de fond) */}
            <audio
              ref={audioRef}
              src="https://cdn.pixabay.com/download/audio/2022/03/01/audio_ba5d0e70b0.mp3?filename=new-year-ambient-21859.mp3"
              autoPlay
              loop
              muted={muted}
            />
            {/* SFX explosion à l'ouverture */}
            <audio
              ref={explosionRef}
              src="https://cdn.pixabay.com/download/audio/2022/01/12/audio_0e5efd3a4a.mp3?filename=fireworks-9845.mp3"
              preload="auto"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewYear2026Cinematic;