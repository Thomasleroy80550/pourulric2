import { useEffect, useRef, useState, type ReactNode } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PinKeypad from "@/components/PinKeypad";
import MobileAuthScreen from "@/components/MobileAuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { enableDeviceBiometrics, getLockDeviceId, isInstalledPwa, lockRequest, unlockWithBiometrics } from "@/lib/pwa-lock-api";

type Phase = "checking" | "offer" | "setup" | "biometric" | "unlock" | "open" | "error";

export default function PwaSessionLock({ userId, children, sessionLoading = false }: { userId: string | undefined; children: ReactNode; sessionLoading?: boolean }) {
  const [installed] = useState(isInstalledPwa);
  // Ce souvenir sert uniquement à afficher l'écran : le serveur décide toujours du déverrouillage.
  const [cachedUser, setCachedUser] = useState<string | null>(() => {
    try { return localStorage.getItem("hk-pwa-lock-user"); } catch { return null; }
  });
  const [phase, setPhase] = useState<Phase>("checking");
  const [checkedUser, setCheckedUser] = useState<string>();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [confirming, setConfirming] = useState(false);
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

  const rememberLock = (owner: string | null) => {
    if (owner) localStorage.setItem("hk-pwa-lock-user", owner);
    else localStorage.removeItem("hk-pwa-lock-user");
    setCachedUser(owner);
  };

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
    setConfirming(false);
    setMessage("");
    setBiometric(false);
    if (!installed) return;
    if (!userId) {
      if (!sessionLoading) {
        try { rememberLock(null); } catch { setCachedUser(null); }
      }
      return;
    }
    setPhase("checking");
    try {
      deviceId.current = getLockDeviceId(userId);
      lockRequest(deviceId.current, "status").then((status) => {
        if (!active) return;
        configured.current = status.configured;
        rememberLock(status.configured ? userId : null);
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
  }, [installed, userId, sessionLoading]);

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

  if (!installed || (!userId && !sessionLoading)) return <>{children}</>;
  if (userId && phase === "open" && checkedUser === userId) return <>{children}</>;
  const showStartupKeypad = phase === "checking" && !!cachedUser && (!userId || cachedUser === userId);

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
    rememberLock(userId ?? null);
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
    if (!userId) return;
    deviceId.current = getLockDeviceId(userId);
    const status = await lockRequest(deviceId.current, "status");
    configured.current = status.configured;
    rememberLock(status.configured ? userId : null);
    setCheckedUser(userId);
    setBiometric(status.biometric);
    setPhase(status.configured ? "unlock" : "offer");
  });

  return (
    <MobileAuthScreen overlay title={phase === "offer" ? "Votre espace, protégé." : phase === "setup" ? "Votre code personnel." : phase === "biometric" ? "Un geste suffit." : phase === "unlock" || showStartupKeypad ? "Bon retour." : "Vérification en cours."}>
          {phase === "checking" && (showStartupKeypad ? <>
            <PinKeypad value="" onChange={() => {}} disabled label="Saisissez votre code personnel" />
            <Button disabled className="h-14 w-full gap-2 rounded-full bg-[#e5ebe7] text-sm text-[#71868a] opacity-100"><Loader2 className="h-4 w-4 animate-spin" />Préparation du déverrouillage…</Button>
          </> : <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-[#255f85]" aria-label="Chargement" /></div>)}
          {phase === "offer" && <>
            <p className="text-center text-sm leading-relaxed text-slate-600">À chaque réouverture et après un passage en arrière-plan, déverrouillez votre session avec un code à 4 chiffres ou Face ID / empreinte selon votre téléphone.</p>
            <Button className="w-full bg-[#255f85]" onClick={() => setPhase("setup")}>Activer la protection</Button>
            <Button variant="ghost" className="w-full" onClick={() => {
              sessionStorage.setItem(`hk-pwa-lock-skipped:${userId}`, "1");
              setPhase("open");
            }}>Pas maintenant</Button>
          </>}
          {(phase === "setup" || phase === "unlock") && <form className="space-y-4" onSubmit={e => {
            e.preventDefault();
            if (busy || pin.length !== 4) return;
            if (phase === "unlock") validatePin();
            else if (!confirming) { setConfirming(true); setMessage(""); }
            else if (confirmPin.length === 4) savePin();
          }}>
            <PinKeypad
              value={phase === "setup" && confirming ? confirmPin : pin}
              onChange={phase === "setup" && confirming ? setConfirmPin : setPin}
              disabled={busy}
              label={phase === "setup" ? confirming ? "Confirmez votre code à 4 chiffres" : "Choisissez votre code à 4 chiffres" : "Saisissez votre code personnel"}
            />
            {phase === "setup" && <p className="text-center text-xs text-slate-500">{confirming ? "Saisissez à nouveau le même code." : "Évitez 0000, 1234 et votre date de naissance. Ce code est distinct de celui du téléphone."}</p>}
            <Button type="submit" disabled={busy || pin.length !== 4 || (phase === "setup" && confirming && confirmPin.length !== 4)} className="h-14 w-full rounded-full bg-gradient-to-r from-[#255f85] to-[#1a4c65] text-sm font-medium tracking-wide shadow-[0_8px_22px_-8px_rgba(37,95,133,0.4)] disabled:bg-none disabled:bg-[#e5ebe7] disabled:text-[#99a9a7] disabled:opacity-100 disabled:shadow-none">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : phase === "setup" ? confirming ? "Enregistrer mon code" : "Continuer" : "Déverrouiller"}</Button>
            {phase === "unlock" && biometric && <div className="text-center">
              <Button type="button" variant="ghost" className="mx-auto flex h-11 gap-2.5 rounded-full px-5 text-xs font-medium text-[#547980] hover:bg-white/70" disabled={busy} onClick={validateBiometric}><Fingerprint className="h-5 w-5" strokeWidth={1.5} />Utiliser Face ID / empreinte</Button>
              <p className="mt-1 text-[10px] leading-relaxed text-[#8b9c99]">Le téléphone peut aussi proposer son code de déverrouillage.</p>
            </div>}
            {phase === "setup" && <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={() => {
              setMessage("");
              setConfirmPin("");
              if (confirming) setConfirming(false);
              else { setPin(""); setPhase("offer"); }
            }}>{confirming ? "Modifier mon code" : "Retour"}</Button>}
          </form>}
          {phase === "biometric" && <>
            <p className="text-center text-sm text-slate-600">Votre code personnel est enregistré. Ajoutez Face ID, Touch ID ou votre empreinte. Votre téléphone peut aussi proposer son code de déverrouillage : Hello Keys ne le voit jamais.</p>
            <Button className="h-12 w-full gap-2 bg-[#255f85]" disabled={busy} onClick={activateBiometric}><Fingerprint className="h-5 w-5" />{busy ? "Validation…" : "Activer sur ce téléphone"}</Button>
            <Button variant="ghost" className="w-full" disabled={busy} onClick={openApp}>Utiliser uniquement mon code personnel</Button>
          </>}
          {phase === "error" && <Button className="w-full bg-[#255f85]" disabled={busy} onClick={retry}>Réessayer</Button>}
          {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{message}</p>}
          {(phase === "unlock" || phase === "error") && <Button variant="ghost" className="h-auto w-full whitespace-normal text-sm text-slate-500" disabled={busy} onClick={reconnect}>Code oublié ? Se reconnecter avec mon compte</Button>}
          {(phase === "unlock" || phase === "error") && <p className="text-center text-[10px] text-slate-500">Une connexion internet est nécessaire pour vérifier votre code.</p>}
    </MobileAuthScreen>
  );
}
