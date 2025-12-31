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
  // ADDED: centre du burst et position précédente pour trails
  ox?: number;
  oy?: number;
  prevX?: number;
  prevY?: number;
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const burstCountRef = useRef<number>(0);
  // ADDED: flashes (éclat central) pour quelques frames
  const flashesRef = useRef<{ x: number; y: number; life: number; radius: number; color: string }[]>([]);

  // ADDED: helper pour jouer un petit "explosion" via Web Audio
  const playExplosion = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state !== "running") return;
    const ctx = audioCtxRef.current;

    // bruit court
    const duration = 0.35;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // bruit blanc avec enveloppe décroissante
      const t = i / sampleRate;
      const env = Math.max(0, 1 - t / duration);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // filtre bandpass pour un "pop" plus réaliste
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200 + Math.random() * 800;
    bp.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start();
  };

  // ADDED: créer le contexte audio et le déverrouiller via événement utilisateur
  useEffect(() => {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC && !audioCtxRef.current) {
      audioCtxRef.current = new AC();
    }
    const unlock = () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "running") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener("ny2026-unlock-audio", unlock);
    return () => {
      window.removeEventListener("ny2026-unlock-audio", unlock);
      if (audioCtxRef.current) {
        // ne pas fermer pour garder l'audio dispo sur toute la cinématique
        // audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // ADDED: helper pour burst maxi
  const spawnBurstAt = (cx: number, cy: number, count: number, colors: string[]) => {
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(1.1, 2.6);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particlesRef.current.push({
        x: cx,
        y: cy,
        ox: cx,
        oy: cy,
        prevX: cx,
        prevY: cy,
        vx,
        vy,
        life: random(42, 86),
        color: colors[i % colors.length],
        size: random(1.8, 2.8),
      });
    }
    // flash central
    flashesRef.current.push({
      x: cx,
      y: cy,
      life: 14,
      radius: random(22, 36),
      color: "#ffd54f",
    });
  };

  const spawnBurst = (width: number, height: number) => {
    const cx = random(width * 0.2, width * 0.8);
    const cy = random(height * 0.2, height * 0.5);
    const colors = ["#f59e0b", "#ef4444", "#4f46e5", "#0ea5e9", "#22c55e"];
    const counts = { low: 24, medium: 36, high: 52 } as const;
    const count = counts[intensity];

    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(1.0, 2.3);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      particlesRef.current.push({
        x: cx,
        y: cy,
        ox: cx,
        oy: cy,
        prevX: cx,
        prevY: cy,
        vx,
        vy,
        life: random(40, 80),
        color: colors[i % colors.length],
        size: random(1.6, 2.6),
      });
    }

    // ADDED: flash central court pour effet "pop"
    flashesRef.current.push({
      x: cx,
      y: cy,
      life: 12,
      radius: random(18, 34),
      color: "#ffd54f",
    });

    burstCountRef.current += 1;
    // ADDED: jouer SFX si non muet
    if (!muted) {
      playExplosion();
    }
  };

  useEffect(() => {
    // Écouter l'évènement global pour la maxi explosion
    const handleMaxBurst = () => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      const colors = ["#f59e0b", "#ef4444", "#4f46e5", "#0ea5e9", "#22c55e"];

      // 6 bursts répartis sur l'écran
      const centers = [
        [w * 0.25, h * 0.28],
        [w * 0.75, h * 0.30],
        [w * 0.50, h * 0.20],
        [w * 0.35, h * 0.42],
        [w * 0.65, h * 0.45],
        [w * 0.50, h * 0.36],
      ] as const;

      centers.forEach(([cx, cy]) => {
        spawnBurstAt(cx, cy, 68, colors);
      });

      // SFX en rafale si non muet
      if (audioCtxRef.current && audioCtxRef.current.state === "running") {
        // trois pops rapides
        playExplosion();
        setTimeout(() => playExplosion(), 120);
        setTimeout(() => playExplosion(), 240);
      }
    };

    window.addEventListener("ny2026-max-burst", handleMaxBurst);
    return () => window.removeEventListener("ny2026-max-burst", handleMaxBurst);
  }, []);

  const loop = (time: number) => {
    const ctx = ctxRef.current!;
    const w = canvasRef.current?.width || 0;
    const h = canvasRef.current?.height || 0;

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

    // ADDED: dessiner les flashes radiaux (éclat court au centre)
    for (let i = 0; i < flashesRef.current.length; i++) {
      const f = flashesRef.current[i];
      const alpha = Math.max(0, f.life / 12);
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      grad.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
      grad.addColorStop(0.4, `rgba(255,213,79,${0.6 * alpha})`);
      grad.addColorStop(1, `rgba(255,213,79,0)`);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
      f.life -= 1;
    }
    // nettoyer les flashes terminés
    flashesRef.current = flashesRef.current.filter(f => f.life > 0);

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

      // trail: ligne fine de la position précédente vers la nouvelle
      const trailAlpha = Math.max(0.12, Math.min(0.8, p.life / 80));
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = trailAlpha;
      ctx.lineWidth = p.size * 0.6;
      ctx.beginPath();
      ctx.moveTo(p.prevX ?? p.x, p.prevY ?? p.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // tête du rayon: cercle lumineux
      const headAlpha = Math.max(0.2, Math.min(1, p.life / 70));
      ctx.globalAlpha = headAlpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // update position précédente
      p.prevX = p.x;
      p.prevY = p.y;
    }

    // limiter total pour fluidité
    const maxParticles: Record<"low" | "medium" | "high", number> = { low: 200, medium: 280, high: 360 };
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