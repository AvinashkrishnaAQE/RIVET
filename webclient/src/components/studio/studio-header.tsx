"use client";

import Link from "next/link";
import { Menu, Webhook, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StudioView } from "./types";

interface StudioHeaderProps {
  currentView: StudioView;
  onSelectView: (view: StudioView) => void;
  onToggleMobile: () => void;
  tokensPerSec: number;
  onTurboBoost: () => void;
}

const VIEW_TITLES: Record<StudioView, string> = {
  chat: "Agent Chat Workspace",
  dashboard: "Swarm Orchestration Dashboard",
  metrics: "Metrics & Velocity Telemetry",
  staging: "QA & Automated Staging",
  shipments: "Shipments & Client Handoff",
};

export function StudioHeader({
  currentView,
  onSelectView,
  onToggleMobile,
  tokensPerSec,
  onTurboBoost,
}: StudioHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-ink/80 px-4 backdrop-blur-md transition-colors duration-500 dark:border-white/10 dark:bg-ink/60 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="rounded-lg border border-black/10 p-2 text-foreground hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 truncate text-sm">
          <span className="hidden text-zinc-500 sm:inline">Agency Engine</span>
          <span className="hidden text-zinc-400 sm:inline">/</span>
          <span className="truncate font-semibold text-foreground">
            {VIEW_TITLES[currentView]}
          </span>
        </div>

        {/* Live Swarm Beacon Pill */}
        <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-300 md:inline-flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>{tokensPerSec.toFixed(1)}k tok/s</span>
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick View Switcher */}
        <div className="hidden items-center rounded-lg border border-black/10 bg-black/[0.03] p-0.5 dark:border-white/10 dark:bg-white/[0.04] sm:flex">
          {(["chat", "dashboard", "metrics"] as StudioView[]).map((v) => {
            const active = currentView === v;
            const labels: Record<string, string> = {
              chat: "Chat",
              dashboard: "Swarm",
              metrics: "Metrics",
            };
            return (
              <button
                key={v}
                onClick={() => onSelectView(v)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  active
                    ? "border border-black/10 bg-white font-semibold text-foreground shadow-sm dark:border-white/15 dark:bg-zinc-800"
                    : "text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {labels[v]}
              </button>
            );
          })}
          <Link
            href="/webhooks/github"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gold transition-all hover:bg-gold/10"
          >
            <Webhook className="h-3 w-3" />
            <span>Webhooks</span>
          </Link>
        </div>

        {/* Universal Theme Toggle */}
        <ThemeToggle />

        {/* Turbo Swarm Boost Button */}
        <button
          onClick={onTurboBoost}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-hover px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-95"
        >
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Turbo Swarm</span>
        </button>
      </div>
    </header>
  );
}
