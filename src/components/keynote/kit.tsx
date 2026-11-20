import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseProps {
  className?: string;
  children: ReactNode;
}

/**
 * Apparition en fondu, éventuellement retardée. L'animation pilote `transform` :
 * ne pas positionner cet élément avec une classe translate ou scale.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: BaseProps & { as?: "div" | "span" | "li"; delay?: number }) {
  return (
    <Tag
      className={cn(
        "animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-backwards motion-reduce:animate-none",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Cadre d'une slide : scène fixe de 1280 × 720, mise à l'échelle par la présentation. */
export function SlideFrame({ className, children }: BaseProps) {
  return (
    <section
      className={cn(
        "relative isolate flex h-full w-full flex-col overflow-hidden bg-black px-20 py-14 text-white",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Halo décoratif : le dégradé s'éteint avant les bords de sa boîte, donc sans coupure visible. */
export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 bg-[radial-gradient(closest-side,hsl(200_65%_40%/0.22),transparent)]",
        className,
      )}
    />
  );
}

export function SlideHeader({
  kicker,
  muted,
  className,
  children,
}: BaseProps & { kicker: string; muted?: boolean }) {
  return (
    <header>
      <Reveal>
        <p
          className={cn(
            "mb-4 text-sm font-semibold uppercase tracking-[0.28em]",
            muted ? "text-zinc-500" : "text-hk-300",
          )}
        >
          {kicker}
        </p>
      </Reveal>
      <Reveal delay={150}>
        <h2 className={cn("text-balance text-[50px] font-semibold leading-[1.1] tracking-tight", className)}>
          {children}
        </h2>
      </Reveal>
    </header>
  );
}

export function Bullets({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("space-y-4 text-[21px] leading-snug text-zinc-200", className)}>
      {items.map((item, index) => (
        <Reveal as="li" key={index} delay={450 + index * 170} className="flex gap-4">
          <span aria-hidden className="mt-[0.5em] h-2 w-2 shrink-0 rounded-full bg-hk-300" />
          <span>{item}</span>
        </Reveal>
      ))}
    </ul>
  );
}

export function BigFigure({
  value,
  caption,
  muted,
  className,
}: {
  value: string;
  caption?: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div>
      <p
        className={cn(
          "whitespace-nowrap bg-gradient-to-b bg-clip-text pb-1 text-[104px] font-semibold leading-none tracking-tighter text-transparent",
          muted ? "from-zinc-400 to-zinc-700" : "from-white to-hk-300",
          className,
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-2 text-lg leading-snug text-zinc-400">{caption}</p>}
    </div>
  );
}

export function Panel({ className, children }: BaseProps) {
  return <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04]", className)}>{children}</div>;
}

export function IconBadge({
  icon: Icon,
  muted,
  className,
}: {
  icon: LucideIcon;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        muted ? "bg-white/[0.06] text-zinc-400" : "bg-hk-500/20 text-hk-300",
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

export function Chip({ className, children }: BaseProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[13px] leading-none text-zinc-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Légende technique, volontairement discrète. */
export function TechNote({ className, children }: BaseProps) {
  return <p className={cn("font-mono text-[12.5px] text-zinc-500", className)}>{children}</p>;
}

/** Mot-symbole typographique : aucun logo Cadence n'est fourni dans le projet. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("text-2xl font-semibold tracking-tight text-white", className)}>Cadence</span>;
}
