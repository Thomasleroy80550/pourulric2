import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Gift, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./halloween-prank.css";

const bats = Array.from({ length: 45 }, (_, i) => ({
  x: `${Math.cos(i * 2.4) * (40 + (i % 5) * 12)}vw`,
  y: `${Math.sin(i * 2.4) * (35 + (i % 7) * 9)}vh`,
  delay: `${(i % 9) * 0.09}s`,
  size: 30 + (i % 6) * 12,
}));

export default function HalloweenPrank({ featured = false }: { featured?: boolean }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const stopSound = () => {
    if (audio.current) {
      audio.current.pause();
      audio.current.currentTime = 0;
    }
  };

  useEffect(() => {
    const sound = audio.current;
    return () => { sound?.pause(); };
  }, []);

  const reveal = async () => {
    setRevealed(true);
    setAudioError(false);
    if (muted || !audio.current) return;
    stopSound();
    try {
      audio.current.volume = 0.7;
      await audio.current.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAudioError(true);
      stopSound();
    }
  };

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setRevealed(false);
    stopSound();
  };

  return (
    <>
      <audio ref={audio} preload="auto" src="https://upload.wikimedia.org/wikipedia/commons/2/23/Evil_laugh_2.oga" />
      <Button
        onClick={() => changeOpen(true)}
        className={featured
          ? "h-auto gap-3 rounded-full bg-orange-500 px-8 py-5 text-lg text-black hover:bg-orange-400"
          : "fixed bottom-24 right-4 z-50 h-auto gap-2 rounded-full border border-orange-300/40 bg-violet-950 px-5 py-3 text-orange-100 shadow-xl hover:bg-violet-900"}
      >
        <Gift className="h-5 w-5" /> Un cadeau pour toi…
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-purple-500/30 bg-[#10091e] p-0 text-white [&>button]:z-30 [&>button]:text-white">
          <div className="relative flex min-h-[510px] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_#382048_0%,_#10091e_70%)] px-6 py-12 text-center">
            <div aria-hidden="true" className="absolute left-8 top-8 text-5xl opacity-40">☾</div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-orange-300">Une mystérieuse surprise</p>
            <DialogTitle className="text-3xl font-black sm:text-5xl">{revealed ? "BOUH ! 👻" : "Ce cadeau est pour toi."}</DialogTitle>
            <DialogDescription className="mt-4 max-w-sm text-base text-purple-200">
              {revealed ? "Piégé ! Les chauves-souris étaient impatientes de sortir. Joyeux Halloween !" : "On l’a trouvé devant ta porte… Tu oses l’ouvrir ?"}
            </DialogDescription>
            {!revealed ? (
              <button onClick={() => void reveal()} className="halloween-gift my-7 rounded-3xl p-5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300" aria-label="Ouvrir le faux cadeau et déclencher la surprise Halloween">
                <span aria-hidden="true" className="block text-[110px] leading-none">🎁</span>
              </button>
            ) : (
              <div className="my-8 text-8xl" aria-hidden="true">🎃</div>
            )}
            {revealed && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
              {bats.map((bat, i) => <span key={i} className="halloween-bat absolute left-1/2 top-1/2" style={{ "--bat-x": bat.x, "--bat-y": bat.y, animationDelay: bat.delay, fontSize: bat.size } as CSSProperties}>🦇</span>)}
            </div>}
            <div className="relative z-30 flex flex-wrap items-center justify-center gap-3">
              {revealed ? <Button onClick={() => { stopSound(); setRevealed(false); }} className="bg-orange-500 text-black hover:bg-orange-400"><RotateCcw className="mr-2 h-4 w-4" /> Rejouer la blague</Button>
                : <Button onClick={() => void reveal()} className="bg-orange-500 text-black hover:bg-orange-400">Ouvrir mon cadeau</Button>}
              <Button variant="ghost" className="text-purple-200 hover:bg-white/10 hover:text-white" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={() => { if (!muted) stopSound(); setMuted(!muted); }}>
                {muted ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}{muted ? "Son coupé" : "Son activé"}
              </Button>
            </div>
            <p className="relative z-30 mt-5 text-xs text-purple-300/70" role="status">{audioError ? "Impossible de charger le rire. Vérifie ta connexion et réessaie." : "Une petite frayeur, rien de méchant. 🖤"}</p>
            <p className="relative z-30 mt-2 text-[10px] text-purple-300/60">
              Rire : <a className="underline" href="https://commons.wikimedia.org/wiki/File:Evil_laugh_2.oga" target="_blank" rel="noopener noreferrer">Ondra Krist (Witeg)</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
