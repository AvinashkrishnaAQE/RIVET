import { useId } from "react";
import type { ArtVariant } from "./content";

/**
 * Abstract gold-on-dark artwork standing in for photography. Each variant is a
 * self-contained SVG, so cards can be grayscale by default and bloom to colour on
 * hover just like real images would. Swap for <Image> once real assets exist.
 */
export function Art({ variant, className = "" }: { variant: ArtVariant; className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={`block h-full w-full ${className}`}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a211a" />
          <stop offset="1" stopColor="#0f0c0a" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8d5b7" />
          <stop offset="1" stopColor="#a78b71" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#a78b71" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a78b71" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-bg)`} />
      <rect width="400" height="300" fill={`url(#${id}-glow)`} />

      {variant === "concept" && (
        <g fill="none" stroke={`url(#${id}-gold)`} strokeWidth="2">
          {[28, 56, 84, 112].map((r) => (
            <circle key={r} cx="200" cy="150" r={r} opacity={1 - r / 160} />
          ))}
          <circle cx="200" cy="150" r="10" fill={`url(#${id}-gold)`} stroke="none" />
          <path d="M60 230 C 140 160, 260 260, 350 90" strokeOpacity="0.7" />
        </g>
      )}

      {variant === "audio" && (
        <g fill={`url(#${id}-gold)`}>
          {Array.from({ length: 23 }, (_, i) => {
            const h = 30 + Math.abs(Math.sin(i * 0.7) * 120) + (i % 3) * 14;
            return <rect key={i} x={30 + i * 15.5} y={150 - h / 2} width="7" height={h} rx="3.5" opacity={0.45 + (i % 4) * 0.14} />;
          })}
        </g>
      )}

      {variant === "graph" && (
        <g>
          <g stroke={`url(#${id}-gold)`} strokeWidth="1.5" opacity="0.7">
            <path d="M90 90 L200 150 L320 80 M200 150 L120 230 M200 150 L310 220 M90 90 L120 230" fill="none" />
          </g>
          {[[90, 90, 9], [200, 150, 16], [320, 80, 10], [120, 230, 8], [310, 220, 11]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={`url(#${id}-gold)`} />
          ))}
        </g>
      )}

      {variant === "code" && (
        <g fill={`url(#${id}-gold)`}>
          {[[50, 60, 150], [80, 90, 210], [80, 120, 120], [110, 150, 180], [80, 180, 90], [50, 210, 140]].map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height="10" rx="5" opacity={0.4 + (i % 3) * 0.2} />
          ))}
        </g>
      )}

      {variant === "portrait" && (
        <g fill={`url(#${id}-gold)`} opacity="0.85">
          <circle cx="200" cy="120" r="48" />
          <path d="M80 300 C 80 210, 140 185, 200 185 C 260 185, 320 210, 320 300 Z" />
        </g>
      )}
    </svg>
  );
}
