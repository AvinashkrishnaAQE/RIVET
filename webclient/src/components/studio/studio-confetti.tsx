"use client";

import { useEffect, useRef } from "react";

/**
 * Lightweight, zero-dependency canvas particle burst for shipment celebration.
 */
export function fireStudioConfetti() {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ["#a78b71", "#e8d5b7", "#10B981", "#06B6D4", "#A855F7", "#ffffff"];
  const particles = Array.from({ length: 90 }, () => ({
    x: window.innerWidth * 0.75,
    y: window.innerHeight * 0.65,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 14 - 4,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    vr: (Math.random() - 0.5) * 12,
    alpha: 1,
    decay: Math.random() * 0.015 + 0.01,
  }));

  let animationFrameId: number;

  const render = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = false;

    for (const p of particles) {
      if (p.alpha > 0) {
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // drag
        p.rotation += p.vr;
        p.alpha = Math.max(0, p.alpha - p.decay);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    }

    if (alive) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  };

  render();
}

export function ConfettiTrigger({ active }: { active: boolean }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (active && !firedRef.current) {
      firedRef.current = true;
      fireStudioConfetti();
    } else if (!active) {
      firedRef.current = false;
    }
  }, [active]);

  return null;
}
