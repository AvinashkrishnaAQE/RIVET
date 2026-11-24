"use client";

import { Play, ShieldCheck } from "lucide-react";
import { QACheck } from "./types";

interface ViewStagingProps {
  qaChecks: QACheck[];
  onRunQaSweep: () => void;
  isRunning: boolean;
}

export function ViewStaging({ qaChecks, onRunQaSweep, isRunning }: ViewStagingProps) {
  return (
    <div className="space-y-6 p-4 animate-view-in lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Automated QA & Staging Verification
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Pre-shipment checks executed and audited by the Security QA Agent before final release.
          </p>
        </div>
        <button
          onClick={onRunQaSweep}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-hover px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>{isRunning ? "Running Verification..." : "Run Full QA Sweep"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Lighthouse Performance</div>
            <div className="mt-1 font-display text-2xl font-bold text-emerald-500">
              99 / 100
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-emerald-500 font-mono text-xs font-bold text-foreground">
            99
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Accessibility (WCAG)</div>
            <div className="mt-1 font-display text-2xl font-bold text-gold">100 / 100</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-gold font-mono text-xs font-bold text-foreground">
            100
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Security & Deps</div>
            <div className="mt-1 font-display text-2xl font-bold text-foreground">0 Vulns</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-emerald-500/60 text-emerald-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {qaChecks.map((q) => {
          const isPass = q.status === "PASS";
          return (
            <div
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isPass ? "bg-emerald-500" : "animate-ping bg-gold"
                  }`}
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{q.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{q.detail}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-zinc-400">{q.duration}</span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 ${
                    isPass
                      ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold"
                      : "border-gold/30 bg-gold/15 text-gold font-semibold"
                  }`}
                >
                  {q.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
