import { useState } from "react";
import { ArrowRight, CheckCircle2, Fingerprint, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PinKeypad from "@/components/PinKeypad";
import MobileAuthScreen from "@/components/MobileAuthScreen";

export default function PinPreview() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <MobileAuthScreen title={unlocked ? "Vous voilà chez vous." : "Bon retour."}
      leading={<div className="mb-7 flex items-center justify-between">
        <a href="/v4/login" className="text-xs font-medium text-[#71868a] transition-colors hover:text-[#255f85]">← Retour</a>
        <span className="rounded-full border border-[#255f85]/10 bg-white/60 px-3 py-1.5 text-[10px] font-medium text-[#547379]">Aperçu · code 1234</span>
      </div>}
      footer={<div className="space-y-2 pb-3">
        <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#819693]"><ShieldCheck className="h-3 w-3" />Démonstration uniquement</p>
        <p className="text-[10px] text-[#8b9c99]">Aucun code enregistré · Aucun accès à votre compte</p>
      </div>}>
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
    </MobileAuthScreen>
  );
}
