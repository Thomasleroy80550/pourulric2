"use client";

import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { ArrowRight, BarChart3, LineChart, Sparkles, Star } from "lucide-react";
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

  // Stoppe l'émission de confettis après quelques secondes (les pièces finissent de tomber).
  useEffect(() => {
    const timer = setTimeout(() => setConfettiActive(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onFinish, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[hsl(var(--sidebar-foreground))] transition-opacity duration-500 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes hkFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hkPop {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { opacity: 1; transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes hkBlob {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(6%, -8%) scale(1.15); }
          66%     { transform: translate(-6%, 6%) scale(0.9); }
        }
        @keyframes hkShine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes hkRing {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes hkSpinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .hk-anim { opacity: 0; animation-fill-mode: forwards; }
      `}</style>

      {/* Aurore / blobs animés */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[hsl(var(--primary))] opacity-40 blur-3xl"
          style={{ animation: "hkBlob 9s ease-in-out infinite" }}
        />
        <div
          className="absolute right-[-6rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-[hsl(var(--accent))] opacity-40 blur-3xl"
          style={{ animation: "hkBlob 11s ease-in-out infinite reverse" }}
        />
        <div
          className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-sky-300 opacity-30 blur-3xl"
          style={{ animation: "hkBlob 13s ease-in-out infinite" }}
        />
      </div>

      {/* Confettis */}
      {size.width > 0 && (
        <Confetti
          width={size.width}
          height={size.height}
          numberOfPieces={confettiActive ? 260 : 0}
          recycle={confettiActive}
          gravity={0.22}
          colors={["#ffffff", "#e1f2ff", "#7dd3fc", "#38bdf8", "#255F85", "#fbbf24"]}
        />
      )}

      {/* Contenu central */}
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
        {/* Halo + icône */}
        <div className="relative mb-8">
          <span
            className="absolute inset-0 -z-10 m-auto h-24 w-24 rounded-full border border-white/40"
            style={{ animation: "hkRing 2.4s ease-out infinite" }}
          />
          <span
            className="absolute inset-0 -z-10 m-auto h-24 w-24 rounded-full border border-white/40"
            style={{ animation: "hkRing 2.4s ease-out 1.2s infinite" }}
          />
          <div
            className="hk-anim relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md ring-1 ring-white/30"
            style={{ animation: "hkPop 0.9s cubic-bezier(.2,.8,.2,1) forwards" }}
          >
            <Sparkles
              className="h-11 w-11 text-white"
              style={{ animation: "hkSpinSlow 8s linear infinite" }}
            />
          </div>
        </div>

        {/* Badge */}
        <span
          className="hk-anim mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white ring-1 ring-white/25 backdrop-blur"
          style={{ animation: "hkFadeUp 0.7s ease-out 0.3s forwards" }}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          Nouveauté
        </span>

        {/* Titre avec shimmer */}
        <h1
          className="hk-anim text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl"
          style={{ animation: "hkFadeUp 0.8s ease-out 0.5s forwards" }}
        >
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(100deg, #ffffff 0%, #bae6fd 25%, #ffffff 50%, #bae6fd 75%, #ffffff 100%)",
              backgroundSize: "200% auto",
              animation: "hkShine 4s linear infinite",
            }}
          >
            Votre nouveau tableau de bord
          </span>
        </h1>

        {/* Sous-titre */}
        <p
          className="hk-anim mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg"
          style={{ animation: "hkFadeUp 0.8s ease-out 0.7s forwards" }}
        >
          Une expérience repensée : vos performances en un coup d'œil, la comparaison
          d'une année à l'autre, et un design entièrement aux couleurs Hello Keys.
        </p>

        {/* Mini features */}
        <div
          className="hk-anim mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animation: "hkFadeUp 0.8s ease-out 0.9s forwards" }}
        >
          {[
            { icon: BarChart3, label: "KPIs en direct" },
            { icon: LineChart, label: "Comparaison d'années" },
            { icon: Sparkles, label: "Design Hello Keys" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur"
            >
              <f.icon className="h-4 w-4" />
              {f.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="hk-anim mt-10"
          style={{ animation: "hkFadeUp 0.8s ease-out 1.15s forwards" }}
        >
          <Button
            size="lg"
            onClick={handleClose}
            className="group rounded-full bg-white px-8 text-base font-semibold text-[hsl(var(--sidebar-foreground))] shadow-xl hover:bg-white/90"
          >
            Découvrir mon dashboard
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardV3Reveal;
