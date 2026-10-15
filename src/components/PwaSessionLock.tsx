import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PinKeypad from "@/components/PinKeypad";
import MobileAuthScreen from "@/components/MobileAuthScreen";
import { supabase } from "@/integrations/supabase/client";
import { forgetDeviceLock, getLockDeviceId, getLockDeviceKey, isInstalledPwa, lockRequest, readSavedDevice } from "@/lib/pwa-lock-api";

type Phase = "checking" | "setup" | "unlock" | "open" | "error";
const MOBILE_QUERY = "(max-width: 767px)";

export default function PwaSessionLock({ userId, children, sessionLoading = false }: { userId: string | undefined; children: ReactNode; sessionLoading?: boolean }) {
  const [mobile, setMobile] = useState(() => isInstalledPwa() || window.matchMedia(MOBILE_QUERY).matches);
  // Ce souvenir affiche le digicode au démarrage, mais n'autorise jamais l'accès sans vérification serveur.
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
  const deviceId = useRef("");
  const configured = useRef(false);
  const verifiedSignInUser = useRef<string>();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const savedOwner = userId ? null : cachedUser;

  const rememberLock = (owner: string | null) => {
    if (owner) localStorage.setItem("hk-pwa-lock-user", owner);
    else localStorage.removeItem("hk-pwa-lock-user");
    setCachedUser(owner);
  };

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const updateMobile = () => {
      const nextMobile = isInstalledPwa() || media.matches;
      if (nextMobile === mobile) return;
      setCheckedUser(undefined);
      setPhase("checking");
      setMobile(nextMobile);
    };
    media.addEventListener("change", updateMobile);
    return () => media.removeEventListener("change", updateMobile);
  }, [mobile]);

  useEffect(() => {
    let active = true;
    configured.current = false;
    setCheckedUser(undefined);
    setPin("");
    setConfirmPin("");
    setConfirming(false);
    setMessage("");
    if (!mobile || (!userId && sessionLoading)) return;
    if (userId && verifiedSignInUser.current === userId) {
      verifiedSignInUser.current = undefined;
      configured.current = true;
      setCheckedUser(userId);
      setPhase(document.visibilityState === "hidden" ? "unlock" : "open");
      return;
    }
    const savedDevice = readSavedDevice(savedOwner);
    if (!userId && !savedDevice) return;
    setPhase("checking");
    try {
      const owner = userId ?? savedOwner!;
      deviceId.current = userId ? getLockDeviceId(userId) : savedDevice!.deviceId;
      lockRequest(deviceId.current, userId ? "status" : "device-status", userId ? {} : { deviceKey: savedDevice!.deviceKey }).then(status => {
        if (!active) return;
        configured.current = status.configured;
        rememberLock(status.configured ? owner : null);
        setCheckedUser(userId);
        setPhase(status.configured ? "unlock" : "setup");
      }).catch(error => {
        if (active) { setMessage(error.message); setPhase("error"); }
      });
    } catch {
      setMessage("Autorisez le stockage de l’application sur cet appareil pour enregistrer votre code.");
      setPhase("error");
    }
    return () => { active = false; };
  }, [mobile, userId, sessionLoading, savedOwner]);

  useEffect(() => {
    const forget = () => {
      configured.current = false;
      setCachedUser(null);
      setCheckedUser(undefined);
      setPhase(userId ? "setup" : "checking");
    };
    window.addEventListener("hk-device-lock-forgotten", forget);
    return () => window.removeEventListener("hk-device-lock-forgotten", forget);
  }, [userId]);

  useEffect(() => {
    const lockOnBackground = (event: Event) => {
      if ((event.type === "pagehide" || document.visibilityState === "hidden") && configured.current && phaseRef.current === "open") {
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

  if (!mobile || (!userId && !sessionLoading && !readSavedDevice(cachedUser))) return <>{children}</>;
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
      setMessage(error instanceof Error ? error.message : "Impossible de vérifier votre code.");
      if (phase === "unlock") setPin("");
    } finally {
      setBusy(false);
    }
  };

  const savePin = () => run(async () => {
    if (!/^\d{4}$/.test(pin) || pin !== confirmPin) {
      setConfirmPin("");
      throw new Error("Les deux codes doivent être identiques. Confirmez à nouveau votre code.");
    }
    if (!userId) return;
    await lockRequest(deviceId.current, "setup", { pin, deviceKey: getLockDeviceKey(userId) });
    configured.current = true;
    rememberLock(userId);
    openApp();
  });

  const validatePin = () => run(async () => {
    if (userId) {
      await lockRequest(deviceId.current, "pin", { pin, deviceKey: getLockDeviceKey(userId) });
      rememberLock(userId);
      openApp();
      return;
    }
    const saved = readSavedDevice(cachedUser);
    if (!saved) throw new Error("Reconnectez-vous à votre compte pour autoriser ce téléphone.");
    const result = await lockRequest(saved.deviceId, "device-signin", { pin, deviceKey: saved.deviceKey });
    if (!result.session) throw new Error("La connexion n’a pas pu être créée.");
    verifiedSignInUser.current = result.session.userId;
    try {
      const { error } = await supabase.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
      if (error) throw error;
      setPin("");
    } catch (error) {
      verifiedSignInUser.current = undefined;
      throw error;
    }
  });

  const reconnect = () => run(async () => {
    const owner = userId ?? cachedUser;
    if (owner) await forgetDeviceLock(owner);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
    setCachedUser(null);
  });

  const retry = () => run(async () => {
    const owner = userId ?? cachedUser;
    if (!owner) return;
    const saved = readSavedDevice(owner);
    if (!userId && !saved) return;
    deviceId.current = userId ? getLockDeviceId(userId) : saved!.deviceId;
    const status = await lockRequest(deviceId.current, userId ? "status" : "device-status", userId ? {} : { deviceKey: saved!.deviceKey });
    configured.current = status.configured;
    rememberLock(status.configured ? owner : null);
    setCheckedUser(userId);
    setPhase(status.configured ? "unlock" : "setup");
  });

  return (
    <MobileAuthScreen overlay title={phase === "setup" ? confirming ? "Confirmez votre code" : "Choisissez votre code" : phase === "unlock" || showStartupKeypad ? "Bon retour" : "Vérification en cours"}>
      {phase === "checking" && (showStartupKeypad ? <>
        <PinKeypad value="" onChange={setPin} disabled label="Saisissez votre code à 4 chiffres" />
        <Button disabled className="h-14 w-full gap-2 rounded-full bg-[#e5ebe7] text-sm font-normal text-[#71868a] opacity-100"><Loader2 className="h-4 w-4 animate-spin" />Préparation du digicode…</Button>
      </> : <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-[#255f85]" aria-label="Chargement" /></div>)}
      {(phase === "setup" || phase === "unlock") && <form className="space-y-4" onSubmit={event => {
        event.preventDefault();
        if (busy || pin.length !== 4) return;
        if (phase === "unlock") validatePin();
        else if (!confirming) { setConfirming(true); setMessage(""); }
        else if (confirmPin.length === 4) savePin();
      }}>
        {phase === "setup" && !confirming && <p className="text-center text-sm text-slate-600">Créez votre code à 4 chiffres pour accéder à votre espace sur ce téléphone. Il vous sera demandé aux prochaines ouvertures.</p>}
        <PinKeypad value={phase === "setup" && confirming ? confirmPin : pin}
          onChange={phase === "setup" && confirming ? setConfirmPin : setPin}
          disabled={busy}
          label={phase === "setup" ? confirming ? "Saisissez à nouveau le même code" : "Code personnel à 4 chiffres" : "Saisissez votre code à 4 chiffres"} />
        {phase === "setup" && !confirming && <p className="text-center text-xs text-slate-500">Évitez 0000, 1234 et votre date de naissance.</p>}
        <Button type="submit" disabled={busy || pin.length !== 4 || (phase === "setup" && confirming && confirmPin.length !== 4)} className="h-14 w-full rounded-full bg-gradient-to-r from-[#255f85] to-[#1a4c65] text-sm font-normal shadow-[0_8px_22px_-8px_rgba(37,95,133,0.4)] disabled:bg-none disabled:bg-[#e5ebe7] disabled:text-[#99a9a7] disabled:opacity-100 disabled:shadow-none">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : phase === "setup" ? confirming ? "Enregistrer et accéder à mon espace" : "Continuer" : "Déverrouiller"}
        </Button>
        {phase === "setup" && confirming && <Button type="button" variant="ghost" className="w-full font-normal" disabled={busy} onClick={() => { setMessage(""); setConfirmPin(""); setConfirming(false); }}>Modifier mon code</Button>}
      </form>}
      {phase === "error" && <Button className="w-full bg-[#255f85] font-normal" disabled={busy} onClick={retry}>Réessayer</Button>}
      {message && <p role="alert" className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{message}</p>}
      {(phase === "unlock" || phase === "error") && <Button variant="ghost" className="h-auto w-full whitespace-normal text-sm font-normal text-slate-500" disabled={busy} onClick={reconnect}>Code oublié ? Me reconnecter à mon compte</Button>}
      {(phase === "unlock" || phase === "error") && <p className="text-center text-xs text-slate-500">Une connexion internet est nécessaire pour vérifier votre code.</p>}
    </MobileAuthScreen>
  );
}
