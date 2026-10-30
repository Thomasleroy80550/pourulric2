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
  const audio = useRef<AudioContext | null>(null);

  const stopSound = () => {
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  };

  useEffect(() => () => stopSound(), []);

  const reveal = async () => {
    setRevealed(true);
    setAudioError(false);
    if (muted) return;
    stopSound();
    try {
      const context = new AudioContext();
      audio.current = context;
      await context.resume();
      if (audio.current !== context) return;
      // Des syllabes « ha » graves, modulées, composent un rire sans fichier externe.
      const master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
      for (let i = 0; i < 15; i++) {
        const start = context.currentTime + 0.05 + i * 0.24;
        const voice = context.createOscillator();
        const envelope = context.createGain();
        const filter = context.createBiquadFilter();
        voice.type = "sawtooth";
        voice.frequency.setValueAtTime(185 - i * 4, start);
        voice.frequency.exponentialRampToValueAtTime(85, start + 0.19);
        filter.type = "bandpass";
        filter.frequency.value = 650;
        filter.Q.value = 0.7;
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(0.8, start + 0.025);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        voice.connect(filter);
        filter.connect(envelope);
        envelope.connect(master);
        voice.start(start);
        voice.stop(start + 0.22);
      }
    } catch {
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
            <p className="relative z-30 mt-5 text-xs text-purple-300/70" role="status">{audioError ? "Le son n’est pas disponible dans ce navigateur." : "Une petite frayeur, rien de méchant. 🖤"}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
