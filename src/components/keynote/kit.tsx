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
        "relative isolate flex h-full w-full flex-col overflow-hidden bg-[#f5f5f7] px-20 py-14 text-neutral-950",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Halo pastel : le dégradé s'éteint avant les bords de sa boîte, donc sans coupure visible. */
export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 bg-[radial-gradient(closest-side,hsl(204_100%_60%/0.18),transparent)]",
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
            muted ? "text-neutral-500" : "text-hk-600",
          )}
        >
          {kicker}
        </p>
      </Reveal>
      <Reveal delay={150}>
        <h2 className={cn("text-balance text-[56px] font-semibold leading-[1.02] tracking-[-0.04em] text-neutral-950", className)}>
          {children}
        </h2>
      </Reveal>
    </header>
  );
}

export function Bullets({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <ul className={cn("space-y-4 text-[21px] leading-snug text-neutral-600", className)}>
      {items.map((item, index) => (
        <Reveal as="li" key={index} delay={450 + index * 170} className="flex gap-4">
          <span aria-hidden className="mt-[0.5em] h-2 w-2 shrink-0 rounded-full bg-hk-500" />
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
          "whitespace-nowrap bg-gradient-to-b bg-clip-text pb-1 text-[104px] font-semibold leading-none tracking-[-0.06em] text-transparent",
          muted ? "from-neutral-500 to-neutral-300" : "from-neutral-950 via-neutral-800 to-hk-600",
          className,
        )}
      >
        {value}
      </p>
      {caption && <p className="mt-2 text-lg leading-snug text-neutral-500">{caption}</p>}
    </div>
  );
}

export function Panel({ className, children }: BaseProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-black/[0.06] bg-white/85 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
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
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        muted ? "bg-black/[0.04] text-neutral-500" : "bg-hk-500/10 text-hk-600",
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
        "inline-flex items-center rounded-full border border-black/[0.08] bg-white/75 px-2.5 py-1.5 text-[13px] leading-none text-neutral-700 shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Légende technique, volontairement discrète. */
export function TechNote({ className, children }: BaseProps) {
  return <p className={cn("font-mono text-[12.5px] text-neutral-500", className)}>{children}</p>;
}

/** Mot-symbole typographique : aucun logo Cadence n'est fourni dans le projet. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col items-center", className)}>
      <span className="text-[26px] font-semibold tracking-[-0.04em] text-neutral-950">Cadence</span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
        par Hello Keys
      </span>
    </span>
  );
}
