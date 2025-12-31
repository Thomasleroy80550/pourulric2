"use client";

import React, { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  // ADDED: mémoriser l'origine pour tracer un rayon depuis le centre du burst
  ox?: number;
  oy?: number;
};

const random = (min: number, max: number) => Math.random() * (max - min) + min;

const FireworksCanvas: React.FC<{ className?: string; muted?: boolean; intensity?: "low" | "medium" | "high" }> = ({ className, muted = true, intensity = "medium" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastBurstRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const sfxPoolRef = useRef<HTMLAudioElement[]>([]);
  const sfxIdxRef = useRef<number>(0);
  const burstCountRef = useRef<number>(0);

  const spawnBurst = (width: number, height: number) => {
    const cx = random(width * 0.2, width * 0.8);
    const cy = random(height * 0.2, height * 0.5);
    // Palette saturée, contrastée sur fond bleu clair
    const colors = ["#f59e0b", "#ef4444", "#4f46e5", "#0ea5e9", "#22c55e"];
    const counts = { low: 26, medium: 38, high: 54 } as const;
    const count = counts[intensity];

    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(1.0, 2.4); // vitesse d'ouverture du rayon
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particlesRef.current.push({
        // départ au centre du burst
        x: cx,
        y: cy,
        ox: cx,
        oy: cy,
        vx,
        vy,
        // durée de vie cohérente avec un rayon qui s'éteint
        life: random(38, 80),
        color: colors[i % colors.length],
        // taille utilisée comme largeur de trait visuel
        size: random(1.6, 2.6),
      });
    }

    burstCountRef.current += 1;
    // SFX: jouer moins souvent (une fois sur deux)
    if (!muted && sfxPoolRef.current.length && burstCountRef.current % 2 === 0) {
      sfxIdxRef.current = (sfxIdxRef.current + 1) % sfxPoolRef.current.length;
      const clip = sfxPoolRef.current[sfxIdxRef.current];
      try {
        clip.currentTime = 0;
        clip.volume = 0.25;
        clip.play();
      } catch {}
    }
  };

  useEffect(() => {
    const urls = [
      "https://cdn.pixabay.com/download/audio/2022/01/12/audio_0e5efd3a4a.mp3?filename=fireworks-9845.mp3",
      "https://cdn.pixabay.com/download/audio/2023/04/24/audio_3b8f2a4f2a.mp3?filename=firework-explosion-145308.mp3",
      "https://cdn.pixabay.com/download/audio/2022/03/08/audio_6a8a9d1a77.mp3?filename=fireworks-ambient-21968.mp3",
    ];
    sfxPoolRef.current = urls.map((u) => {
      const a = new Audio(u);
      a.preload = "auto";
      a.volume = 0.25;
      return a;
    });
    return () => {
      sfxPoolRef.current = [];
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const parent = canvas.parentElement;
    const fit = () => {
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w);
      canvas.height = Math.floor(h);
    };
    fit();

    resizeObsRef.current = new ResizeObserver(fit);
    if (parent) resizeObsRef.current.observe(parent);

    const loop = (time: number) => {
      const ctx = ctxRef.current!;
      const w = canvas.width;
      const h = canvas.height;

      // mesurer performance
      const dt = lastFrameRef.current ? time - lastFrameRef.current : 16;
      lastFrameRef.current = time;
      const lowPerf = dt > 22; // ~45fps ou moins

      rafRef.current = requestAnimationFrame(loop);

      // nettoyage complet pour garder des rayons nets
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      // bursts périodiques, plus espacés si perf basse
      const baseIntervals: Record<"low" | "medium" | "high", number> = { low: 1700, medium: 1200, high: 900 };
      const interval = baseIntervals[intensity] + (lowPerf ? 500 : 0);
      if (time - lastBurstRef.current > interval) {
        spawnBurst(w, h);
        lastBurstRef.current = time;
      }

      // Rendu des rayons: traits depuis (ox,oy) jusqu'à (x,y), blend additive
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      const gravity = 0.03;
      const friction = 0.99;
      const step = lowPerf ? 2 : 1; // dessiner une particule sur deux si perf basse

      for (let i = 0; i < particlesRef.current.length; i += step) {
        const p = particlesRef.current[i];
        p.vx *= friction;
        p.vy = p.vy * friction + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;

        // opacité décroissante pour un rayon qui s'éteint
        const alpha = Math.max(0.15, Math.min(1, p.life / 80));
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = p.size;

        ctx.beginPath();
        // tracer du centre du burst jusqu'à la pointe actuelle
        ctx.moveTo(p.ox ?? p.x, p.oy ?? p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // limiter total pour fluidité
      const maxParticles: Record<"low" | "medium" | "high", number> = { low: 180, medium: 260, high: 360 };
      if (particlesRef.current.length > maxParticles[intensity]) {
        particlesRef.current.splice(0, particlesRef.current.length - maxParticles[intensity]);
      }

      // filtrer mortes/hors cadre
      particlesRef.current = particlesRef.current.filter(
        (p) => p.life > 0 && p.x > -30 && p.x < w + 30 && p.y > -30 && p.y < h + 50
      );

      // reset alpha
      ctx.globalAlpha = 1;
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObsRef.current?.disconnect();
      particlesRef.current = [];
    };
  }, []);

  return <canvas ref={canvasRef} className={className || "absolute inset-0"} />;
};

export default FireworksCanvas;