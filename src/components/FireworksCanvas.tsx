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
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const sfxPoolRef = useRef<HTMLAudioElement[]>([]);
  const sfxIdxRef = useRef<number>(0);

  const spawnBurst = (width: number, height: number) => {
    const x = random(width * 0.15, width * 0.85);
    const y = random(height * 0.15, height * 0.45);
    const colors = ["#f59e0b", "#ef4444", "#4f46e5", "#0ea5e9", "#22c55e"];
    const counts = { low: 28, medium: 45, high: 70 } as const;
    const count = counts[intensity];
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(1.1, 3.2);
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: random(55, 115),
        color: colors[i % colors.length],
        size: random(1.8, 3.8),
      });
    }
    // SFX: jouer un son si non muet
    if (!muted && sfxPoolRef.current.length) {
      sfxIdxRef.current = (sfxIdxRef.current + 1) % sfxPoolRef.current.length;
      const clip = sfxPoolRef.current[sfxIdxRef.current];
      try {
        clip.currentTime = 0;
        clip.volume = 0.3;
        clip.play();
      } catch {}
    }
  };

  useEffect(() => {
    const urls = [
      "https://cdn.pixabay.com/download/audio/2022/01/12/audio_0e5efd3a4a.mp3?filename=fireworks-9845.mp3",
      "https://cdn.pixabay.com/download/audio/2023/04/24/audio_3b8f2a4f2a.mp3?filename=firework-explosion-145308.mp3",
      "https://cdn.pixabay.com/download/audio/2022/03/08/audio_6a8a9d1a77.mp3?filename=fireworks-ambient-21968.mp3"
    ];
    sfxPoolRef.current = urls.map((u) => {
      const a = new Audio(u);
      a.preload = "auto";
      a.volume = 0.3;
      return a;
    });
    return () => { sfxPoolRef.current = []; };
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
      rafRef.current = requestAnimationFrame(loop);
      const ctx = ctxRef.current!;
      const w = canvas.width;
      const h = canvas.height;

      // voile quasi nul pour garder les couleurs punchy
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,255,255,0.01)";
      ctx.fillRect(0, 0, w, h);

      // bursts périodiques selon intensité
      const intervals: Record<"low" | "medium" | "high", number> = { low: 1500, medium: 1100, high: 800 };
      if (time - lastBurstRef.current > intervals[intensity]) {
        spawnBurst(w, h);
        lastBurstRef.current = time;
      }

      // dessiner particules (glow léger)
      ctx.globalCompositeOperation = "lighter";
      const gravity = 0.03;
      const friction = 0.99;
      particlesRef.current.forEach((p) => {
        p.vx *= friction;
        p.vy = p.vy * friction + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;

        ctx.beginPath();
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = 0.98;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      // limite légèrement abaissée pour fluidité
      const maxParticles: Record<"low" | "medium" | "high", number> = { low: 260, medium: 400, high: 560 };
      if (particlesRef.current.length > maxParticles[intensity]) {
        particlesRef.current.splice(0, particlesRef.current.length - maxParticles[intensity]);
      }

      // retirer celles qui sont mortes ou hors cadre
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