import { useState } from "react";
import { CheckCircle2, Fingerprint, LockKeyhole, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PinKeypad from "@/components/PinKeypad";

export default function PinPreview() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <main className="min-h-dvh bg-[#ecf3f7] px-5 py-6">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 rounded-2xl border border-[#255f85]/15 bg-white/80 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#255f85]">Prévisualisation interactive</p>
          <p className="mt-2 text-sm text-slate-600">Code de démonstration : <strong className="text-slate-900">1234</strong></p>
          <p className="mt-1 text-xs text-slate-500">Aucun accès à votre compte. Aucun code enregistré.</p>
        </div>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#255f85] text-white shadow-lg">
            <LockKeyhole className="h-9 w-9" />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#255f85]">Hello Keys</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">{unlocked ? "Digicode validé !" : "Déverrouillez votre espace"}</h1>
        </div>
        <div className="space-y-5 rounded-3xl bg-white p-6 shadow-sm">
          {unlocked ? <div className="space-y-5 py-6 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <p className="text-slate-600">Le code de démonstration est correct. Dans la vraie PWA, votre code est vérifié par le serveur avant d’afficher votre espace.</p>
            <Button className="h-14 w-full gap-2 rounded-2xl bg-[#255f85]" onClick={() => { setUnlocked(false); setPin(""); setMessage(""); }}><RotateCcw className="h-4 w-4" />Recommencer la démo</Button>
          </div> : <>
            <Button type="button" className="h-12 w-full gap-2 bg-[#255f85]" onClick={() => setMessage("Aperçu uniquement : Face ID n’est pas lancé ici. Dans la PWA, ce bouton ouvre la validation sécurisée de votre téléphone.")}><Fingerprint className="h-5 w-5" />Face ID / empreinte</Button>
            <form className="space-y-5" onSubmit={event => {
              event.preventDefault();
              if (pin.length !== 4) return;
              if (pin === "1234") { setUnlocked(true); setMessage(""); setPin(""); }
              else { setMessage("Code de démonstration incorrect. Essayez 1234."); setPin(""); }
            }}>
              <PinKeypad value={pin} onChange={value => { setPin(value); setMessage(""); }} label="Saisissez votre code personnel" />
              <Button type="submit" disabled={pin.length !== 4} className="h-14 w-full rounded-2xl bg-[#255f85] text-base">Déverrouiller la démo</Button>
            </form>
          </>}
          {message && <p role="status" className="rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-600">{message}</p>}
        </div>
        <a href="/v4/login" className="mt-6 block text-center text-sm font-medium text-[#255f85] underline underline-offset-4">Retour à l’application</a>
      </div>
    </main>
  );
}
