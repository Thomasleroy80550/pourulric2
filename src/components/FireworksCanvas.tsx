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
    const x = random(width * 0.15, width * 0.85);
    const y = random(height * 0.15, height * 0.45);
    const colors = ["#f59e0b", "#ef4444", "#4f46e5", "#0ea5e9", "#22c55e"];
    const counts = { low: 18, medium: 30, high: 50 } as const;
    const count = counts[intensity];
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(1.0, 2.6);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: random(45, 95),
        color: colors[i % colors.length],
        size: random(2.0, 3.8),
      });
    }
    burstCountRef.current += 1;
    // SFX: jouer moins souvent (une fois sur deux) et sans clonage
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

      // nettoyage complet (plus rapide que voile + blend)
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      // bursts périodiques, plus espacés en cas de perf basse
      const baseIntervals: Record<"low" | "medium" | "high", number> = { low: 1800, medium: 1300, high: 900 };
      const interval = baseIntervals[intensity] + (lowPerf ? 600 : 0);
      if (time - lastBurstRef.current > interval) {
        spawnBurst(w, h);
        lastBurstRef.current = time;
      }

      // dessiner particules: rectangles rapides, sans shadow ni stroke
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

        ctx.fillStyle = p.color;
        // rectangle au lieu d'arc: beaucoup plus rapide
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      // limiter total pour fluidité
      const maxParticles: Record<"low" | "medium" | "high", number> = { low: 180, medium: 260, high: 380 };
      if (particlesRef.current.length > maxParticles[intensity]) {
        particlesRef.current.splice(0, particlesRef.current.length - maxParticles[intensity]);
      }

      // filtrer mortes/hors cadre
      particlesRef.current = particlesRef.current.filter(
        (p) => p.life > 0 && p.x > -20 && p.x < w + 20 && p.y > -20 && p.y < h + 40
      );
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