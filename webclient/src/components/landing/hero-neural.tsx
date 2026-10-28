"use client";

import { useEffect, useRef, useState } from "react";
import { Art } from "./art";
import { SATELLITES } from "./content";

interface Line {
  d: string;
  ex: number;
  ey: number;
}

/**
 * The hero's interactive canvas: a glowing central node with four satellite cards
 * linked to it by SVG bezier curves. The curves are measured from the real card
 * positions (and re-measured on resize), so they stay attached at any width.
 * Below `xl` the satellites and lines are hidden and only the central node shows.
 */
export function NeuralHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const satRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const center = centerRef.current;
      if (!center || container.offsetParent === null) return;

      const box = container.getBoundingClientRect();
      const mid = center.getBoundingClientRect();

      setLines(
        SATELLITES.flatMap((sat, i) => {
          const el = satRefs.current[i];
          if (!el || el.offsetParent === null) return []; // hidden at this breakpoint
          const r = el.getBoundingClientRect();

          const sx = (sat.side === "left" ? r.right : r.left) - box.left;
          const sy = r.top + r.height / 2 - box.top;
          const ex = (sat.side === "left" ? mid.left : mid.right) - box.left;
          const ey = mid.top - box.top + mid.height * sat.anchor;
          const pull = Math.abs(ex - sx) * 0.55 * (sat.side === "left" ? 1 : -1);

          return [{ d: `M ${sx} ${sy} C ${sx + pull} ${sy}, ${ex - pull} ${ey}, ${ex} ${ey}`, ex, ey }];
        }),
      );
    };

    // ResizeObserver reports once on observe(), which gives the first measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-[1200px] xl:h-[600px]">
      {/* Neural connection lines */}
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible xl:block" aria-hidden="true">
        <defs>
          <linearGradient id="neural-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100%" y2="0">
            <stop offset="0.1" stopColor="#a78b71" />
            <stop offset="0.9" stopColor="#c9b8a0" />
          </linearGradient>
        </defs>
        {lines.map((line, i) => (
          <g key={i}>
            <path d={line.d} fill="none" stroke="url(#neural-gradient)" strokeWidth="2.5" strokeLinecap="round" className="node-line motion-safe:animate-pulsing-branch" style={{ animationDelay: `${i * -0.7}s` }} />
            <path d={line.d} fill="none" stroke="#e8d5b7" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="5 15" className="motion-safe:animate-flow" />
            <circle cx={line.ex} cy={line.ey} r="9" fill="#a78b71" fillOpacity="0.18" />
            <circle cx={line.ex} cy={line.ey} r="3.5" fill="#e8d5b7" />
          </g>
        ))}
      </svg>

      {/* Central node */}
      <div className="relative z-10 mx-auto w-full max-w-xl xl:absolute xl:left-1/2 xl:top-1/2 xl:w-[42%] xl:max-w-none xl:-translate-x-1/2 xl:-translate-y-1/2">
        <div className="absolute -top-5 left-1/2 z-20 -translate-x-1/2 motion-safe:animate-breathe">
          <div className="glass flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-[8px] font-bold tracking-[0.25em] text-green-400">LIVE</span>
            <span className="text-xs text-white">12 agents syncing</span>
          </div>
        </div>

        <div ref={centerRef} className="glass relative aspect-video overflow-hidden rounded-[32px] shadow-[0_0_100px_rgba(167,139,113,0.2)]">
          <div className="bg-dots absolute inset-0 opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(167,139,113,0.28),transparent_62%)]" />

          <div className="absolute left-5 top-4 text-[9px] uppercase tracking-[0.3em] text-white/40">Core workspace</div>
          <div className="absolute right-5 top-4 flex gap-1.5">
            {[0, 1, 2].map((n) => (
              <span key={n} className="h-1.5 w-1.5 rounded-full bg-white/25" />
            ))}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
              {[100, 74, 48].map((size, i) => (
                <span
                  key={size}
                  className="absolute rounded-full border border-gold/40 motion-safe:animate-pulsing-branch"
                  style={{ width: `${size}%`, height: `${size}%`, animationDelay: `${i * -1}s` }}
                />
              ))}
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-gold-hover to-gold shadow-[0_0_30px_rgba(232,213,183,0.7)]" />
            </div>
            <p className="mt-3 font-display text-2xl italic text-white sm:text-3xl">Neural core</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.3em] text-gold-light/70">4 sources · 12 agents · 1 canvas</p>
          </div>
        </div>
      </div>

      {/* Satellite cards */}
      {SATELLITES.map((sat, i) => (
        <div
          key={sat.title}
          ref={(el) => {
            satRefs.current[i] = el;
          }}
          className={`absolute z-10 hidden xl:block ${sat.className}`}
        >
          <div className="group transition-transform duration-500 ease-premium hover:scale-105">
            <div className="motion-safe:animate-float" style={{ animationDelay: sat.delay }}>
              <div className="glass rounded-[24px] p-2 transition-[box-shadow,border-color] duration-700 ease-premium group-hover:border-white/25 group-hover:shadow-[0_0_60px_rgba(167,139,113,0.3)]">
                <div className="aspect-[4/3] overflow-hidden rounded-[20px] grayscale transition-[filter] duration-700 ease-premium group-hover:grayscale-0">
                  <Art variant={sat.art} />
                </div>
                <div className="px-2 pb-1 pt-3">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-gold">{sat.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-white">{sat.title}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
