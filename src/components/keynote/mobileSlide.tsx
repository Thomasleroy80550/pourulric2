import { Check, Heart } from "lucide-react";
import { Glow, Reveal } from "./kit";
import type { KeynoteMobileSlide } from "./types";
import { cn } from "@/lib/utils";

/**
 * Version mobile native d'une slide : portrait, une idée par écran,
 * grande typographie. Tient dans la hauteur disponible, sans scroll.
 */
export function MobileSlide({ content }: { content: KeynoteMobileSlide }) {
  const centered = content.align === "center";

  return (
    <section
      className={cn(
        "relative isolate flex h-full flex-col overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f5f5f7_55%)] px-7 pb-7 pt-11",
        centered && "items-center text-center",
      )}
    >
      <Glow className="left-1/2 top-[-160px] h-[380px] w-[560px] -translate-x-1/2" />

      <Reveal>
        <p className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.24em] text-hk-600">
          <span aria-hidden className="h-px w-6 bg-hk-300" />
          {content.kicker}
          {centered && <span aria-hidden className="h-px w-6 bg-hk-300" />}
        </p>
      </Reveal>

      <Reveal delay={150}>
        <h2
          className={cn(
            "mt-3.5 text-balance text-[31px] font-semibold leading-[1.09] tracking-[-0.03em] text-neutral-950",
            centered && "mt-5",
          )}
        >
          {content.title}
        </h2>
      </Reveal>

      {content.lead && (
        <Reveal delay={300}>
          <p className={cn("mt-4 text-[16.5px] leading-relaxed text-neutral-600", centered && "max-w-[30ch]")}>
            {content.lead}
          </p>
        </Reveal>
      )}

      {content.figure && (
        <Reveal delay={420}>
          <div className={cn("mt-7", centered && "flex flex-col items-center")}>
            <p className="bg-gradient-to-b from-neutral-950 via-neutral-800 to-hk-600 bg-clip-text text-[68px] font-semibold leading-none tracking-[-0.05em] text-transparent">
              {content.figure.value}
            </p>
            {content.figure.caption && (
              <p className="mt-2 text-[14.5px] leading-snug text-neutral-500">{content.figure.caption}</p>
            )}
          </div>
        </Reveal>
      )}

      {content.bullets && (
        <ul className={cn("mt-6 space-y-3", centered && "inline-block text-left")}>
          {content.bullets.map((bullet, index) => (
            <Reveal as="li" key={bullet} delay={420 + index * 120} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-hk-500/10"
              >
                <Check className="h-3.5 w-3.5 text-hk-600" />
              </span>
              <span className="text-[15.5px] leading-snug text-neutral-700">{bullet}</span>
            </Reveal>
          ))}
        </ul>
      )}

      {content.chips && (
        <Reveal delay={700}>
          <div className={cn("mt-6 flex flex-wrap gap-2", centered && "justify-center")}>
            {content.chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-full border border-black/[0.08] bg-white/80 px-3 py-1.5 text-[13px] font-medium text-neutral-700 shadow-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        </Reveal>
      )}

      {content.signature && (
        <Reveal delay={850}>
          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-center gap-3" aria-hidden>
              <span className="h-px w-14 bg-gradient-to-r from-transparent to-hk-300" />
              <Heart className="h-4 w-4 fill-hk-500 text-hk-500" />
              <span className="h-px w-14 bg-gradient-to-l from-transparent to-hk-300" />
            </div>
            <p className="mt-3 text-[18px] font-medium italic tracking-[-0.01em] text-neutral-700">
              {content.signature.thanks}
            </p>
            <p className="mt-1.5 text-[14px] font-semibold tracking-[0.12em]">
              {content.signature.names.map((name, index) => (
                <span key={name}>
                  {index > 0 && <span className="mx-1.5 text-neutral-300">·</span>}
                  <span className="bg-gradient-to-r from-hk-700 to-hk-500 bg-clip-text text-transparent">{name}</span>
                </span>
              ))}
            </p>
          </div>
        </Reveal>
      )}

      <div className={cn("mt-auto pt-6", centered && "flex flex-col items-center")}>
        {content.footnote && (
          <Reveal delay={950}>
            <p className="text-[12px] leading-snug text-neutral-400">{content.footnote}</p>
          </Reveal>
        )}
        <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-neutral-300">
          Cadence · par Hello Keys
        </p>
      </div>
    </section>
  );
}
