import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Maximize, Minimize, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { keynoteSlides as slides } from "./deck";

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;

const notesHeading = "text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500";

// Espaces insécables de la typographie française : jamais de « ? » ou de « : » en début de ligne.
const frenchSpacing = (text: string) => text.replace(/ (?=[:;?!»])/g, "\u00A0").replace(/« /g, "«\u00A0");

function ToolbarButton({
  label,
  pressed,
  className,
  ...props
}: ButtonProps & { label: string; pressed?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "gap-2 text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-950 focus-visible:ring-hk-500 focus-visible:ring-offset-0 [&_svg]:h-4 [&_svg]:w-4",
        pressed && "bg-black/[0.05] text-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

function Shortcut({ children }: { children: string }) {
  return <kbd className="rounded border border-black/10 px-1.5 font-sans text-[11px] text-neutral-400">{children}</kbd>;
}

export default function KeynoteDeck({ onExit }: { onExit: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // L'URL porte la slide courante : un rechargement ou un lien partagé retombe au même endroit.
  const requested = Number(searchParams.get("slide"));
  const index = Number.isInteger(requested) && requested >= 1 && requested <= slides.length ? requested - 1 : 0;
  const slide = slides[index];
  const nextSlide = slides[index + 1];
  const Slide = slide.Component;

  const goTo = (target: number) => {
    const next = Math.min(Math.max(target, 0), slides.length - 1);
    if (next === index) return;
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set("slide", String(next + 1));
        return params;
      },
      { replace: true },
    );
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current!.requestFullscreen();
    } catch {
      toast.error("Plein écran indisponible dans cette fenêtre. Ouvrez la présentation dans son propre onglet.");
    }
  };

  // La scène garde ses 1280 × 720 et se met à l'échelle de l'espace disponible.
  useLayoutEffect(() => {
    const host = hostRef.current!;
    const fit = () => setScale(Math.min(host.clientWidth / STAGE_WIDTH, host.clientHeight / STAGE_HEIGHT));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // Réabonné à chaque rendu : le gestionnaire lit toujours la slide courante.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      // Une fenêtre modale ou un champ de saisie garde son clavier.
      if (target.closest('[role="dialog"], input, textarea, select')) return;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          goTo(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          goTo(index - 1);
          break;
        case " ":
        case "Enter":
          // Sur un bouton, Espace et Entrée gardent leur rôle habituel.
          if (target.closest("button, a")) return;
          goTo(index + 1);
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(slides.length - 1);
          break;
        case "f":
        case "F":
          if (!event.repeat) void toggleFullscreen();
          break;
        case "n":
        case "N":
          if (!event.repeat) setNotesOpen((open) => !open);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#f5f5f7] text-neutral-950 antialiased"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div ref={hostRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} sur ${slides.length} : ${slide.label}`}
          className="absolute left-1/2 top-1/2"
          style={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {/* La clé rejoue les animations d'entrée à chaque changement de slide. */}
          <div key={slide.id} className="h-full w-full animate-in fade-in duration-500 motion-reduce:animate-none">
            <Slide />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/[0.05]">
          <div
            className="h-full bg-hk-500 transition-[width] duration-500"
            style={{ width: `${((index + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {notesOpen && (
        <aside
          key={slide.id}
          aria-label="Notes orateur"
          className="h-[40%] shrink-0 overflow-y-auto border-t border-black/10 bg-white/95 px-8 pb-14 pt-6 backdrop-blur-xl"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section>
                <h2 className={notesHeading}>Notes orateur · {slide.label}</h2>
                <div className="mt-3 space-y-3 text-[17px] leading-relaxed text-neutral-700">
                  {slide.notes.map((paragraph) => (
                    <p key={paragraph}>{frenchSpacing(paragraph)}</p>
                  ))}
                </div>
              </section>
              <section className="space-y-6">
                <div>
                  <h2 className={notesHeading}>Transition</h2>
                  <p className="mt-3 text-[17px] leading-relaxed text-hk-700">{frenchSpacing(slide.transition)}</p>
                </div>
                {nextSlide && (
                  <div>
                    <h2 className={notesHeading}>Slide suivante</h2>
                    <p className="mt-3 text-[17px] text-neutral-500">
                      {index + 2}. {nextSlide.label}
                    </p>
                  </div>
                )}
              </section>
            </div>

            {slide.cheatSheet && (
              <table className="mt-8 w-full border-collapse text-left text-sm">
                <caption className={cn(notesHeading, "mb-2 text-left")}>
                  Antisèche : réponses simples aux questions propriétaires
                </caption>
                <thead>
                  <tr className="border-b border-black/10 text-neutral-500">
                    <th className="py-2 pr-6 font-medium">Capacité</th>
                    <th className="py-2 pr-6 font-medium">Où ?</th>
                    <th className="py-2 font-medium">À dire simplement</th>
                  </tr>
                </thead>
                <tbody>
                  {slide.cheatSheet.map((row, rowIndex) => (
                    <tr key={row.capacity} className="border-b border-black/[0.06] align-top">
                      <td className="whitespace-nowrap py-2 pr-6 text-neutral-800">
                        {rowIndex + 1}. {row.capacity}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-6 font-mono text-[12.5px] text-hk-700">{row.source}</td>
                      <td className="py-2 leading-relaxed text-neutral-600">{frenchSpacing(row.say)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </aside>
      )}

      {/* preventDefault au mousedown : un clic ne prend pas le focus, Espace continue d'avancer. */}
      <div
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "flex h-12 shrink-0 items-center gap-1 border-t border-black/10 bg-white/85 px-2 text-sm backdrop-blur-xl",
          isFullscreen &&
            "absolute inset-x-0 bottom-0 opacity-0 transition-opacity duration-300 focus-within:opacity-100 hover:opacity-100",
        )}
      >
        <ToolbarButton label="Quitter la présentation" onClick={onExit}>
          <X />
          Quitter
        </ToolbarButton>
        <span className="ml-3 tabular-nums text-neutral-700">
          {index + 1} / {slides.length}
        </span>
        <span className="ml-3 truncate text-neutral-400">{slide.label}</span>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ToolbarButton label="Slide précédente (←)" disabled={index === 0} onClick={() => goTo(index - 1)}>
            <ChevronLeft />
          </ToolbarButton>
          <ToolbarButton
            label="Slide suivante (→)"
            disabled={index === slides.length - 1}
            onClick={() => goTo(index + 1)}
          >
            <ChevronRight />
          </ToolbarButton>
          <ToolbarButton label="Notes orateur (N)" pressed={notesOpen} onClick={() => setNotesOpen((open) => !open)}>
            <StickyNote />
            Notes
            <Shortcut>N</Shortcut>
          </ToolbarButton>
          <ToolbarButton label="Plein écran (F)" pressed={isFullscreen} onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize /> : <Maximize />}
            Plein écran
            <Shortcut>F</Shortcut>
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
}
