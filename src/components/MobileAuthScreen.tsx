import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

interface MobileAuthScreenProps {
  title: string;
  children: ReactNode;
  overlay?: boolean;
  leading?: ReactNode;
  footer?: ReactNode;
}

export default function MobileAuthScreen({ title, children, overlay = false, leading, footer }: MobileAuthScreenProps) {
  return (
    <main className={`${overlay ? "fixed inset-0 z-[10000] overflow-y-auto " : ""}min-h-dvh bg-[radial-gradient(ellipse_at_top,_#e7f0ed_0%,_#f5f7f3_45%,_#fafaf7_100%)] px-6 py-8 font-normal tracking-normal`}>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col justify-center">
        {leading}
        <header className="mb-7 text-center">
          <img
            src="https://www.hellokeys.fr/assets/hello-keys-logo.png"
            alt="Hello Keys"
            width={176}
            height={56}
            className="mx-auto mb-6 h-14 w-44 object-contain"
          />
          <h1 className="text-2xl font-normal text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Votre espace, en toute confiance.</p>
        </header>
        <div className="space-y-5 px-2">{children}</div>
        <footer className="mt-6 text-center">
          {footer ?? <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />Connexion sécurisée · Votre espace est protégé</p>}
        </footer>
      </div>
    </main>
  );
}
