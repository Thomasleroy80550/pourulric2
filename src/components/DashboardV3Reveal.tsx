"use client";

import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardV3RevealProps = {
  onFinish: () => void;
};

const DashboardV3Reveal: React.FC<DashboardV3RevealProps> = ({ onFinish }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [confettiActive, setConfettiActive] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setConfettiActive(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onFinish, 650);
  };

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm transition-opacity duration-500 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      style={{ perspective: "1400px" }}
    >
      <style>{`
        @keyframes hkZoomIn {
          0%   { opacity: 0; transform: translateZ(-680px) scale(0.6); filter: blur(10px); }
          70%  { opacity: 1; }
          100% { opacity: 1; transform: translateZ(0) scale(1); filter: blur(0); }
        }
        @keyframes hkDiveIn {
          0%   { opacity: 1; transform: translateZ(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateZ(520px) scale(1.7); filter: blur(8px); }
        }
        @keyframes hkFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hkPop {
          0%   { opacity: 0; transform: scale(0.4); }
          60%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes hkShine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes hkSpinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes hkBlob {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-8%, 6%) scale(1.15); }
        }
        .hk-anim { opacity: 0; animation-fill-mode: forwards; }
      `}</style>

      {/* Confettis (burst unique) */}
      {size.width > 0 && (
        <Confetti
          width={size.width}
          height={size.height}
          numberOfPieces={confettiActive ? 180 : 0}
          recycle={false}
          gravity={0.25}
          colors={["#ffffff", "#e1f2ff", "#7dd3fc", "#38bdf8", "#255F85", "#fbbf24"]}
        />
      )}

      {/* Carte modale */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-900"
        style={{
          transformStyle: "preserve-3d",
          animation: closing
            ? "hkDiveIn 0.65s cubic-bezier(.5,0,.75,0) forwards"
            : "hkZoomIn 0.7s cubic-bezier(.2,.8,.2,1) forwards",
        }}
      >
        {/* Bandeau dégradé de marque */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--sidebar-foreground))] via-[hsl(var(--primary))] to-[hsl(var(--accent))] px-6 pb-10 pt-9 text-center">
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl"
            style={{ animation: "hkBlob 8s ease-in-out infinite" }}
          />
          <div
            className="pointer-events-none absolute -bottom-12 right-[-3rem] h-44 w-44 rounded-full bg-white/15 blur-2xl"
            style={{ animation: "hkBlob 10s ease-in-out infinite reverse" }}
          />

          <div
            className="hk-anim mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur"
            style={{ animation: "hkPop 0.8s cubic-bezier(.2,.8,.2,1) 0.25s forwards" }}
          >
            <Sparkles
              className="h-8 w-8 text-white"
              style={{ animation: "hkSpinSlow 8s linear infinite" }}
            />
          </div>

          <span
            className="hk-anim mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-white ring-1 ring-white/25"
            style={{ animation: "hkFadeUp 0.6s ease-out 0.45s forwards" }}
          >
            <Star className="h-3 w-3 fill-current" />
            Nouveauté
          </span>
        </div>

        {/* Corps */}
        <div className="px-6 pb-7 pt-6 text-center">
          <h1
            className="hk-anim text-2xl font-extrabold tracking-tight sm:text-3xl"
            style={{ animation: "hkFadeUp 0.6s ease-out 0.55s forwards" }}
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, hsl(var(--sidebar-foreground)) 0%, hsl(var(--accent)) 40%, hsl(var(--sidebar-foreground)) 60%, hsl(var(--accent)) 100%)",
                backgroundSize: "200% auto",
                animation: "hkShine 4s linear infinite",
              }}
            >
              Votre nouveau tableau de bord
            </span>
          </h1>

          <p
            className="hk-anim mt-3 text-sm leading-relaxed text-muted-foreground"
            style={{ animation: "hkFadeUp 0.6s ease-out 0.7s forwards" }}
          >
            Vos performances en un coup d'œil, la comparaison d'une année à l'autre,
            et un design entièrement aux couleurs Hello Keys.
          </p>

          <div
            className="hk-anim mt-7"
            style={{ animation: "hkFadeUp 0.6s ease-out 0.85s forwards" }}
          >
            <Button
              size="lg"
              onClick={handleClose}
              className="group w-full rounded-full bg-[hsl(var(--sidebar-foreground))] text-base font-semibold text-white shadow-lg hover:bg-[hsl(var(--primary))]"
            >
              Découvrir mon dashboard
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardV3Reveal;
