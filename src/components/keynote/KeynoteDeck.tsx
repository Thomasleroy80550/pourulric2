import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Maximize, Minimize, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { keynoteSlides as slides } from "./deck";
import { KeynoteFeedbackPanel } from "./feedback";
import { Glow } from "./kit";
import { MobileSlide } from "./mobileSlide";

const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;


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
        "gap-2 text-neutral-500 hover:bg-black/[0.04] hover:text-neutral-950 focus-visible:ring-hk-500 focus-visible:ring-offset-0 max-sm:px-2 [&_svg]:h-4 [&_svg]:w-4",
        pressed && "bg-black/[0.05] text-neutral-950",
        className,
      )}
      {...props}
    />
  );
}

function Shortcut({ children }: { children: string }) {
  return (
    <kbd className="hidden rounded border border-black/10 px-1.5 font-sans text-[11px] text-neutral-400 sm:inline">
      {children}
    </kbd>
  );
}

// Aligné sur le point de rupture md de Tailwind (767px).
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

function NavigationArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isPrevious ? "Slide précédente" : "Slide suivante"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pointer-events-auto h-12 w-12 rounded-full border border-black/10 bg-white/85 text-neutral-700 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur-xl hover:bg-white hover:text-neutral-950 focus-visible:ring-hk-500 focus-visible:ring-offset-0 disabled:opacity-30 sm:h-14 sm:w-14",
        isPrevious ? "mr-auto" : "ml-auto",
      )}
    >
      <Icon className="h-6 w-6" aria-hidden />
    </Button>
  );
}

export default function KeynoteDeck({ onExit }: { onExit?: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  // L'URL porte la slide courante : un rechargement ou un lien partagé retombe au même endroit.
  const requested = Number(searchParams.get("slide"));
  const index = Number.isInteger(requested) && requested >= 1 && requested <= slides.length ? requested - 1 : 0;
  const slide = slides[index];
  const Slide = slide.Component;

  // Écran d'accueil : un lien direct vers une slide (?slide=N) saute l'opener.
  const [started, setStarted] = useState(() => index !== 0);

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
    const host = hostRef.current;
    if (!host) return;
    const fit = () => setScale(Math.min(host.clientWidth / STAGE_WIDTH, host.clientHeight / STAGE_HEIGHT));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [started]);

  // L'indication tactile disparaît dès la première navigation.
  useEffect(() => {
    if (index !== 0) setHintVisible(false);
  }, [index]);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    goTo(index + (deltaX < 0 ? 1 : -1));
  };

  // Réabonné à chaque rendu : le gestionnaire lit toujours la slide courante.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      // Une fenêtre modale ou un champ de saisie garde son clavier.
      if (target.closest('[role="dialog"], input, textarea, select')) return;

      // Sur l'écran d'accueil, les touches d'avancement lancent la présentation.
      if (!started) {
        if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
          event.preventDefault();
          setStarted(true);
        }
        return;
      }

      // Le formulaire d'avis garde son clavier ; Échap le ferme.
      if (feedbackOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setFeedbackOpen(false);
        }
        return;
      }

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
      {!started ? (
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6">
          <Glow className="left-1/2 top-1/2 h-[620px] w-[920px] -translate-x-1/2 -translate-y-1/2" />
          <div className="relative flex max-w-2xl animate-in flex-col items-center text-center fade-in zoom-in-95 duration-700 motion-reduce:animate-none">
            <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.3em] text-hk-600">
              <span aria-hidden className="h-px w-8 bg-hk-300" />
              Hello Keys présente
              <span aria-hidden className="h-px w-8 bg-hk-300" />
            </p>
            <h1 className="mt-6 bg-gradient-to-b from-neutral-950 via-neutral-800 to-hk-600 bg-clip-text text-[72px] font-semibold leading-none tracking-[-0.055em] text-transparent md:text-[104px]">
              Cadence
            </h1>
            <p className="mt-4 text-[19px] font-medium text-neutral-500 md:text-[22px]">
              Votre location, en toute confiance.
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="group mt-10 inline-flex items-center gap-2.5 rounded-full bg-hk-500 px-8 py-4 text-lg font-semibold text-white shadow-[0_18px_45px_rgba(0,113,227,0.25)] transition hover:bg-hk-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hk-500 focus-visible:ring-offset-2"
            >
              Découvrir la keynote
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
            </button>
            <p className="mt-6 text-sm text-neutral-400">
              {slides.length} slides · ~10 minutes
            </p>
            <p className="mt-2 hidden text-xs text-neutral-400 md:block">Astuce : ← → pour naviguer</p>
            <p className="mt-2 text-xs text-neutral-400 md:hidden">Glissez ou utilisez les flèches pour naviguer</p>
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-300">
              Cadence · par Hello Keys
            </p>
          </div>
        </div>
      ) : (
      <div
        ref={hostRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isMobile ? (
          <div
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} sur ${slides.length} : ${slide.label}`}
            className="h-full w-full"
          >
            {/* La clé rejoue les animations d'entrée à chaque changement de slide. */}
            <div key={slide.id} className="h-full animate-in fade-in duration-500 motion-reduce:animate-none">
              <MobileSlide content={slide.mobile} />
            </div>
          </div>
        ) : (
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
        )}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/[0.05] max-md:hidden">
          <div
            className="h-full bg-hk-500 transition-[width] duration-500"
            style={{ width: `${((index + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>
      )}

      {started && hintVisible && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-black/[0.06] bg-white/85 px-3 py-1.5 text-xs font-medium text-neutral-500 shadow-sm backdrop-blur-xl md:hidden">
          Glissez ou utilisez les flèches
        </div>
      )}

      {/* Grandes flèches latérales : ordinateur uniquement, pour ne jamais couvrir le texte sur mobile. */}
      {started && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center px-3 md:flex sm:px-5">
          <NavigationArrow direction="previous" disabled={index === 0} onClick={() => goTo(index - 1)} />
          <NavigationArrow
            direction="next"
            disabled={index === slides.length - 1}
            onClick={() => goTo(index + 1)}
          />
        </div>
      )}

      {/* preventDefault au mousedown : un clic ne prend pas le focus, Espace continue d'avancer. */}
      {started && (
      <div
        onMouseDown={(event) => event.preventDefault()}
        className={cn(
          "flex h-12 shrink-0 items-center gap-1 border-t border-black/10 bg-white/85 px-2 text-sm backdrop-blur-xl",
          isFullscreen &&
            "absolute inset-x-0 bottom-0 opacity-0 transition-opacity duration-300 focus-within:opacity-100 hover:opacity-100",
        )}
      >
        {onExit && (
          <ToolbarButton label="Quitter la présentation" onClick={onExit}>
            <X />
            <span className="hidden sm:inline">Quitter</span>
          </ToolbarButton>
        )}
        <span className="ml-1 tabular-nums text-neutral-700 sm:ml-3">
          {index + 1} / {slides.length}
        </span>
        <span className="ml-3 hidden truncate text-neutral-400 md:inline">{slide.label}</span>

        {/* Sur mobile, les flèches de la barre deviennent de gros boutons tactiles. */}
        <div className="ml-auto flex shrink-0 items-center gap-1 max-sm:gap-2">
          <ToolbarButton
            label="Slide précédente (←)"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            className="max-sm:h-10 max-sm:w-10 max-sm:rounded-full max-sm:border max-sm:border-black/10 max-sm:bg-white max-sm:px-0 max-sm:shadow-sm max-sm:[&_svg]:h-5 max-sm:[&_svg]:w-5"
          >
            <ChevronLeft />
          </ToolbarButton>
          <ToolbarButton
            label="Slide suivante (→)"
            disabled={index === slides.length - 1}
            onClick={() => goTo(index + 1)}
            className="max-sm:h-10 max-sm:w-10 max-sm:rounded-full max-sm:border max-sm:border-hk-500/25 max-sm:bg-hk-50 max-sm:px-0 max-sm:text-hk-700 max-sm:shadow-sm max-sm:[&_svg]:h-5 max-sm:[&_svg]:w-5"
          >
            <ChevronRight />
          </ToolbarButton>
          <ToolbarButton label="Donner votre avis" onClick={() => setFeedbackOpen(true)}>
            <Star />
            <span className="hidden sm:inline">Avis</span>
          </ToolbarButton>
          <ToolbarButton label="Plein écran (F)" pressed={isFullscreen} onClick={() => void toggleFullscreen()}>
            {isFullscreen ? <Minimize /> : <Maximize />}
            <span className="hidden sm:inline">Plein écran</span>
            <Shortcut>F</Shortcut>
          </ToolbarButton>
        </div>
      </div>
      )}

      <KeynoteFeedbackPanel
        open={feedbackOpen}
        onOpen={() => setFeedbackOpen(true)}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  );
}
