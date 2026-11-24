"use client";

import { useState } from "react";

interface VelocityChartProps {
  range: "7D" | "14D" | "30D";
}

const DATASETS = {
  "7D": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    shipped: [9, 12, 11, 15, 14, 8, 13],
    cycle: [41, 38, 36, 33, 32, 35, 31],
  },
  "14D": {
    labels: ["D1", "D3", "D5", "D7", "D9", "D11", "D14"],
    shipped: [8, 10, 13, 12, 16, 15, 18],
    cycle: [44, 42, 39, 37, 35, 34, 32],
  },
  "30D": {
    labels: ["W1", "W2", "W3", "W4"],
    shipped: [42, 51, 58, 64],
    cycle: [45, 40, 36, 33],
  },
};

/**
 * High-performance, theme-reactive SVG line chart for Builds Shipped vs Cycle Time.
 */
export function VelocityChart({ range }: VelocityChartProps) {
  const data = DATASETS[range];
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 35 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxShipped = Math.max(...data.shipped) * 1.25;
  const maxCycle = Math.max(...data.cycle) * 1.25;

  const pointsShipped = data.shipped.map((val, i) => {
    const x = padding.left + (i / (data.labels.length - 1)) * innerW;
    const y = padding.top + innerH - (val / maxShipped) * innerH;
    return { x, y, val };
  });

  const pointsCycle = data.cycle.map((val, i) => {
    const x = padding.left + (i / (data.labels.length - 1)) * innerW;
    const y = padding.top + innerH - (val / maxCycle) * innerH;
    return { x, y, val };
  });

  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const lineShippedPath = createSmoothPath(pointsShipped);
  const areaShippedPath = `${lineShippedPath} L ${pointsShipped[pointsShipped.length - 1].x} ${padding.top + innerH} L ${pointsShipped[0].x} ${padding.top + innerH} Z`;

  const lineCyclePath = createSmoothPath(pointsCycle);

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Gold / Emerald Gradient */}
          <linearGradient id="velocityAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + innerH * ratio;
          return (
            <line
              key={ratio}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              className="text-black/5 dark:text-white/5"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Shipped Area */}
        <path d={areaShippedPath} fill="url(#velocityAreaGradient)" />

        {/* Shipped Line */}
        <path
          d={lineShippedPath}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cycle Line */}
        <path
          d={lineCyclePath}
          fill="none"
          stroke="#06B6D4"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points & Interactive Hover Zones */}
        {pointsShipped.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 6 : 4}
              fill="var(--gold-hover)"
              stroke="var(--ink)"
              strokeWidth="2"
              className="transition-all duration-200 cursor-pointer"
            />
            <circle
              cx={pointsCycle[i].x}
              cy={pointsCycle[i].y}
              r={hoverIndex === i ? 5 : 3.5}
              fill="#06B6D4"
              stroke="var(--ink)"
              strokeWidth="1.5"
              className="transition-all duration-200 cursor-pointer"
            />
            {/* Invisible expanded touch hit target */}
            <rect
              x={p.x - 20}
              y={padding.top}
              width={40}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            />
          </g>
        ))}

        {/* X Axis labels */}
        {data.labels.map((lbl, i) => {
          const x = padding.left + (i / (data.labels.length - 1)) * innerW;
          return (
            <text
              key={lbl}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[10px]"
            >
              {lbl}
            </text>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-2 z-20 rounded-lg border border-black/10 bg-surface/95 px-3 py-1.5 shadow-lg backdrop-blur-md dark:border-white/10 text-xs"
          style={{
            left: `${(pointsShipped[hoverIndex].x / width) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-mono text-[10px] text-zinc-400 font-semibold">{data.labels[hoverIndex]}</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5 text-gold font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {data.shipped[hoverIndex]} shipped
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {data.cycle[hoverIndex]}m cycle
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compute share donut chart by Agent Role.
 */
export function AgentShareChart() {
  const slices = [
    { label: "Frontend Motion", percent: 30, color: "#A855F7" },
    { label: "Backend & DB", percent: 25, color: "#10B981" },
    { label: "System Architect", percent: 18, color: "var(--gold)" },
    { label: "Security QA", percent: 13, color: "#F59E0B" },
    { label: "Intake Strategist", percent: 8, color: "#06B6D4" },
    { label: "Release Shipper", percent: 6, color: "var(--gold-hover)" },
  ];

  let cumulative = 0;
  const radius = 68;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative h-44 w-44 flex items-center justify-center">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          {slices.map((slice) => {
            const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulative / 100) * circumference);
            cumulative += slice.percent;

            return (
              <circle
                key={slice.label}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 hover:opacity-90 cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold font-display italic text-foreground">100%</span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400">Compute</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-[11px]">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="font-mono text-foreground font-medium shrink-0 ml-1">{s.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
