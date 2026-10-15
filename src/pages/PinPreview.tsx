import { useState } from "react";
import { ArrowRight, CheckCircle2, Fingerprint, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PinKeypad from "@/components/PinKeypad";

export default function PinPreview() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_#e7f0ed_0%,_#f5f7f3_45%,_#fafaf7_100%)] px-6 py-6">
      <div className="mx-auto max-w-sm">
        <div className="mb-7 flex items-center justify-between">
          <a href="/v4/login" className="text-xs font-medium tracking-wide text-[#71868a] transition-colors hover:text-[#255f85]">← Retour</a>
          <span className="rounded-full border border-[#255f85]/10 bg-white/60 px-3 py-1.5 text-[10px] font-medium tracking-wide text-[#547379]">Aperçu · code 1234</span>
        </div>
        <div className="mb-7 pt-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{unlocked ? "Vous voilà chez vous." : "Bon retour."}</h1>
          <p className="mt-2 text-sm text-slate-500">Votre espace, en toute confiance.</p>
        </div>
        <div className="px-2">
          {unlocked ? <div className="space-y-6 py-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#e2eee7]"><CheckCircle2 className="h-10 w-10 text-[#397961]" strokeWidth={1.5} /></div>
            <p className="text-sm leading-relaxed text-[#71868a]">Code de démonstration validé.<br />Votre compte réel n’a pas été ouvert.</p>
            <Button className="h-14 w-full gap-2 rounded-full bg-[#255f85] text-sm shadow-[0_8px_22px_-8px_rgba(37,95,133,0.4)]" onClick={() => { setUnlocked(false); setPin(""); setMessage(""); }}><RotateCcw className="h-4 w-4" />Recommencer la démo</Button>
          </div> : <form className="space-y-5" onSubmit={event => {
            event.preventDefault();
            if (pin.length !== 4) return;
            if (pin === "1234") { setUnlocked(true); setMessage(""); setPin(""); }
            else { setMessage("Code de démonstration incorrect. Essayez 1234."); setPin(""); }
          }}>
            <PinKeypad value={pin} onChange={value => { setPin(value); setMessage(""); }} label="Entrez votre code personnel" />
            <Button type="submit" disabled={pin.length !== 4} className="h-14 w-full justify-between rounded-full bg-gradient-to-r from-[#255f85] to-[#1a4c65] px-6 text-sm font-medium tracking-wide text-white shadow-[0_8px_22px_-8px_rgba(37,95,133,0.4)] transition-all hover:shadow-[0_10px_26px_-6px_rgba(37,95,133,0.4)] disabled:bg-none disabled:bg-[#e5ebe7] disabled:text-[#99a9a7] disabled:opacity-100 disabled:shadow-none"><span>Déverrouiller la démo</span><ArrowRight className="h-4 w-4" strokeWidth={1.5} /></Button>
            <Button type="button" variant="ghost" className="mx-auto flex h-11 gap-2.5 rounded-full px-5 text-xs font-medium text-[#547980] hover:bg-white/70" onClick={() => setMessage("Aperçu uniquement : Face ID n’est pas lancé ici. Dans la PWA, ce bouton ouvre la validation sécurisée de votre téléphone.")}><Fingerprint className="h-5 w-5" strokeWidth={1.5} />Utiliser Face ID / empreinte</Button>
          </form>}
          {message && <p role="status" className="mt-4 rounded-2xl border border-[#dfe6e4] bg-white/60 p-4 text-center text-xs leading-relaxed text-[#547379]">{message}</p>}
        </div>
        <div className="mt-7 space-y-2 pb-3 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium tracking-wide text-[#819693]"><ShieldCheck className="h-3 w-3" />Démonstration uniquement</p>
          <p className="text-[10px] text-[#8b9c99]">Aucun code enregistré · Aucun accès à votre compte</p>
        </div>
      </div>
    </main>
  );
}
