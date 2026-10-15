import { useEffect, useRef, useState, type ReactNode } from "react";
import { Fingerprint, LockKeyhole, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { enableDeviceBiometrics, getLockDeviceId, isInstalledPwa, lockRequest, unlockWithBiometrics } from "@/lib/pwa-lock-api";

type Phase = "checking" | "offer" | "setup" | "biometric" | "unlock" | "open" | "error";

export default function PwaSessionLock({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  const [installed] = useState(isInstalledPwa);
  const [phase, setPhase] = useState<Phase>("checking");
  const [checkedUser, setCheckedUser] = useState<string>();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const deviceId = useRef("");
  const configured = useRef(false);
  const nativePrompt = useRef(false);
  const previousUser = useRef<string>();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (window.PublicKeyCredential && window.isSecureContext) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setCanUseBiometric).catch(() => setCanUseBiometric(false));
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!userId && previousUser.current) {
      sessionStorage.removeItem(`hk-pwa-lock-skipped:${previousUser.current}`);
    }
    previousUser.current = userId;
    configured.current = false;
    setCheckedUser(undefined);
    setPin("");
    setConfirmPin("");
    setMessage("");
    setBiometric(false);
    if (!installed || !userId) return;
    setPhase("checking");
    try {
      deviceId.current = getLockDeviceId(userId);
      lockRequest(deviceId.current, "status").then((status) => {
        if (!active) return;
        configured.current = status.configured;
        setCheckedUser(userId);
        setBiometric(status.biometric);
        setPhase(status.configured ? "unlock" : sessionStorage.getItem(`hk-pwa-lock-skipped:${userId}`) ? "open" : "offer");
      }).catch((error) => {
        if (active) { setMessage(error.message); setPhase("error"); }
      });
    } catch {
      setMessage("Autorisez le stockage de l’application sur cet appareil pour activer la protection.");
      setPhase("error");
    }
    return () => { active = false; };
  }, [installed, userId]);

  useEffect(() => {
    const lockOnBackground = () => {
      if (document.visibilityState === "hidden" && configured.current && !nativePrompt.current && phaseRef.current === "open") {
        setPin("");
        setConfirmPin("");
        setMessage("");
        setPhase("unlock");
      }
    };
    document.addEventListener("visibilitychange", lockOnBackground);
    window.addEventListener("pagehide", lockOnBackground);
    return () => {
      document.removeEventListener("visibilitychange", lockOnBackground);
      window.removeEventListener("pagehide", lockOnBackground);
    };
  }, []);

  if (!installed || !userId) return <>{children}</>;
  if (phase === "open" && checkedUser === userId) return <>{children}</>;

  const openApp = () => {
    setPin("");
    setConfirmPin("");
    setMessage("");
    setPhase(document.visibilityState === "hidden" ? "unlock" : "open");
  };

  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      setMessage(name === "NotAllowedError" || name === "AbortError"
        ? "Validation annulée. Vous pouvez réessayer ou utiliser votre code personnel."
        : error instanceof Error ? error.message : "Impossible de déverrouiller.");
      if (phase === "unlock") setPin("");
    } finally {
      nativePrompt.current = false;
      setBusy(false);
    }
  };

  const savePin = () => run(async () => {
    if (!/^\d{4}$/.test(pin) || pin !== confirmPin) throw new Error("Les deux codes à 4 chiffres doivent être identiques.");
    await lockRequest(deviceId.current, "setup", { pin });
    configured.current = true;
    setConfirmPin("");
    if (canUseBiometric) setPhase("biometric");
    else openApp();
  });

  const validatePin = () => run(async () => {
    await lockRequest(deviceId.current, "pin", { pin });
    openApp();
  });

  const activateBiometric = () => run(async () => {
    nativePrompt.current = true;
    await enableDeviceBiometrics(deviceId.current, pin);
    setBiometric(true);
    openApp();
  });

  const validateBiometric = () => run(async () => {
    nativePrompt.current = true;
    await unlockWithBiometrics(deviceId.current);
    openApp();
  });

  const reconnect = () => run(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    // Une nouvelle connexion complète permettra de choisir un nouveau code sur cet appareil.
    localStorage.removeItem(`hk-pwa-device:${userId}`);
    sessionStorage.removeItem(`hk-pwa-lock-skipped:${userId}`);
  });

  const retry = () => run(async () => {
    deviceId.current = getLockDeviceId(userId);
    const status = await lockRequest(deviceId.current, "status");
    configured.current = status.configured;
    setCheckedUser(userId);
    setBiometric(status.biometric);
    setPhase(status.configured ? "unlock" : "offer");
  });

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#ecf3f7] px-5 py-10" role="main" aria-label="Protection de votre espace">
      <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#255f85] text-white shadow-lg">
            {phase === "biometric" ? <Fingerprint className="h-10 w-10" /> : <LockKeyhole className="h-9 w-9" />}
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#255f85]">Hello Keys</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {phase === "offer" ? "Protégez votre application" : phase === "setup" ? "Votre code personnel" : phase === "biometric" ? "Activez la biométrie" : phase === "unlock" ? "Déverrouillez votre espace" : "Vérification de la protection"}
          </h1>
        </div>
        <div className="space-y-5 rounded-3xl bg-white p-6 shadow-sm">
          {phase === "checking" && <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-[#255f85]" aria-label="Chargement" /></div>}
          {phase === "offer" && <>
            <p className="text-center text-sm leading-relaxed text-slate-600">À chaque réouverture et après un passage en arrière-plan, déverrouillez votre session avec un code à 4 chiffres ou Face ID / empreinte selon votre téléphone.</p>
            <Button className="w-full bg-[#255f85]" onClick={() => setPhase("setup")}>Activer la protection</Button>
            <Button variant="ghost" className="w-full" onClick={() => {
              sessionStorage.setItem(`hk-pwa-lock-skipped:${userId}`, "1");
              setPhase("open");
            }}>Pas maintenant</Button>
          </>}
          {(phase === "setup" || phase === "unlock") && <form className="space-y-4" onSubmit={e => { e.preventDefault(); phase === "setup" ? savePin() : validatePin(); }}>
            {phase === "unlock" && biometric && <>
              <Button type="button" className="h-12 w-full gap-2 bg-[#255f85]" disabled={busy} onClick={validateBiometric}><Fingerprint className="h-5 w-5" />Face ID / empreinte</Button>
              <p className="text-center text-xs text-slate-500">Le téléphone peut aussi proposer son code de déverrouillage. Ou utilisez votre code personnel Hello Keys ci-dessous.</p>
            </>}
            <div>
              <label htmlFor="pwa-pin" className="text-sm font-medium text-slate-700">{phase === "setup" ? "Choisissez un code à 4 chiffres" : "Code personnel à 4 chiffres"}</label>
              <Input id="pwa-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={pin} disabled={busy} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="mt-2 h-14 text-center text-[24px] tracking-[0.6em]" required />
            </div>
            {phase === "setup" && <div>
              <label htmlFor="pwa-pin-confirm" className="text-sm font-medium text-slate-700">Confirmez le code</label>
              <Input id="pwa-pin-confirm" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={confirmPin} disabled={busy} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="mt-2 h-14 text-center text-[24px] tracking-[0.6em]" required />
              <p className="mt-2 text-xs text-slate-500">Évitez 0000, 1234 et votre date de naissance. Ce code est distinct du code du téléphone.</p>
            </div>}
            <Button type="submit" disabled={busy || pin.length !== 4 || (phase === "setup" && confirmPin.length !== 4)} className="h-12 w-full bg-[#255f85]">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : phase === "setup" ? "Enregistrer mon code" : "Déverrouiller"}</Button>
            {phase === "setup" && <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => { setPin(""); setConfirmPin(""); setPhase("offer"); }}>Retour</Button>}
          </form>}
          {phase === "biometric" && <>
            <p className="text-center text-sm text-slate-600">Votre code personnel est enregistré. Ajoutez Face ID, Touch ID ou votre empreinte. Votre téléphone peut aussi proposer son code de déverrouillage : Hello Keys ne le voit jamais.</p>
            <Button className="h-12 w-full gap-2 bg-[#255f85]" disabled={busy} onClick={activateBiometric}><Fingerprint className="h-5 w-5" />{busy ? "Validation…" : "Activer sur ce téléphone"}</Button>
            <Button variant="ghost" className="w-full" disabled={busy} onClick={openApp}>Utiliser uniquement mon code personnel</Button>
          </>}
          {phase === "error" && <Button className="w-full bg-[#255f85]" disabled={busy} onClick={retry}>Réessayer</Button>}
          {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{message}</p>}
          {(phase === "unlock" || phase === "error") && <Button variant="ghost" className="h-auto w-full whitespace-normal text-sm text-slate-500" disabled={busy} onClick={reconnect}>Code oublié ? Se reconnecter avec mon compte</Button>}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />Vérification sécurisée · Une connexion internet est nécessaire</p>
      </div>
    </div>
  );
}
