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

const STORAGE_KEY = "ny2025_seen";

// ADDED: fenêtre d'ouverture 2025 (1er au 10 janvier inclus)
function isInLaunchWindow2025(date: Date) {
  return (
    date.getFullYear() === 2025 &&
    date.getMonth() === 0 &&
    date.getDate() >= 1 &&
    date.getDate() <= 10
  );
}

const NewYear2026Cinematic: React.FC<NewYear2026CinematicProps> = ({ auto = true, className }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // ADDED: état test pour ne pas marquer "vu"
  const [isTesting, setIsTesting] = useState(false);

  // CHANGED: lecture du flag "déjà vu" sur la nouvelle clé
  const hasSeen = useMemo(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  }, []);

  // CHANGED: ouverture auto pendant la fenêtre 2025, une seule fois par utilisateur
  useEffect(() => {
    if (!auto) return;
    const now = new Date();
    if (isInLaunchWindow2025(now) && !hasSeen) {
      setOpen(true);
    }
  }, [auto, hasSeen]);

  const handleFinish = () => {
    setOpen(false);
    // CHANGED: ne pas marquer comme vu si c'est un test
    if (!isTesting) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setIsTesting(false);
    toast({
      title: "Bonne année 2026 🎉",
      description: "Plongez dans une année pleine de joie, santé et succès.",
    });
  };

  // CHANGED: Activer/Couper le son (sans test)
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

  // ADDED: ouvrir en mode test (sans marquer "vu")
  const handleOpenTest = () => {
    setIsTesting(true);
    setOpen(true);
  };

  return (
    <div className={className}>
      {/* Bouton de test pour ouvrir la cinématique à la demande */}
      {!open && (
        <div className="mb-2 flex items-center gap-2">
          <Button variant="secondary" onClick={handleOpenTest}>
            Tester la cinématique <Sparkles className="ml-2 h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Ouvre sans marquer comme "déjà vue".
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
            <audio
              ref={audioRef}
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