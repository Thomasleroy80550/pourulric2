import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

interface MobileAuthScreenProps {
  title: string;
  children: ReactNode;
  overlay?: boolean;
  compact?: boolean;
  leading?: ReactNode;
  footer?: ReactNode;
}

export default function MobileAuthScreen({ title, children, overlay = false, compact = false, leading, footer }: MobileAuthScreenProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    if (!compact) return;
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;

    // Mesurer le contenu non transformé, y compris les messages d’erreur.
    const fit = () => setScale(Math.min(1, frame.clientHeight / content.offsetHeight));
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    observer.observe(content);
    fit();
    return () => observer.disconnect();
  }, [compact]);

  return (
    <main className={`${compact ? "fixed inset-x-0 top-0 h-dvh overflow-hidden px-4" : `${overlay ? "fixed inset-0 overflow-y-auto " : ""}min-h-dvh px-6 py-8`} ${overlay ? "z-[10000]" : ""} bg-[radial-gradient(ellipse_at_top,_#e7f0ed_0%,_#f5f7f3_45%,_#fafaf7_100%)] font-normal tracking-normal`}
      style={compact ? { paddingTop: "max(12px, env(safe-area-inset-top))", paddingBottom: "max(12px, env(safe-area-inset-bottom))" } : undefined}>
      <div ref={frameRef} className={compact ? "flex h-full items-center justify-center" : "mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col justify-center"}>
        <div ref={contentRef} className="w-full max-w-sm shrink-0" style={compact ? { transform: `scale(${scale})`, transformOrigin: "center" } : undefined}>
          {leading}
          <header className={`${compact ? "mb-4" : "mb-7"} text-center`}>
            <img
              src="https://www.hellokeys.fr/assets/hello-keys-logo.png"
              alt="Hello Keys"
              width={176}
              height={56}
              className={`mx-auto ${compact ? "mb-3 h-10" : "mb-6 h-14"} w-44 object-contain`}
            />
            <h1 className="text-2xl font-normal text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">Votre espace, en toute confiance.</p>
          </header>
          <div className={`${compact ? "space-y-3" : "space-y-5"} px-2`}>{children}</div>
          <footer className={`${compact ? "mt-3" : "mt-6"} text-center`}>
            {footer ?? <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />Connexion sécurisée · Votre espace est protégé</p>}
          </footer>
        </div>
      </div>
    </main>
  );
}
