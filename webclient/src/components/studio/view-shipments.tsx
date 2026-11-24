"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Project } from "./types";
import { ConfettiTrigger } from "./studio-confetti";

interface ViewShipmentsProps {
  project: Project;
  onShipSuccess: () => void;
  onCopy: (text: string) => void;
  isShipped: boolean;
}

export function ViewShipments({
  project,
  onShipSuccess,
  onCopy,
  isShipped,
}: ViewShipmentsProps) {
  const [sliderVal, setSliderVal] = useState(isShipped ? 100 : 0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    onCopy(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSliderChange = (val: number) => {
    setSliderVal(val);
    if (val >= 95 && !isShipped) {
      setSliderVal(100);
      onShipSuccess();
    }
  };

  const prodUrl = `https://${project.name.toLowerCase().replace(/\s+/g, "-")}.revit.studio`;
  const repoUrl = `github.com/revit-studios/${project.name.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="space-y-6 p-4 animate-view-in lg:p-6">
      <ConfettiTrigger active={isShipped} />

      <div>
        <h2 className="text-base font-semibold text-foreground">
          Shipment & Client Handoff Control
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Package verified builds and trigger instant production deployment with one gesture.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Client Handoff Bundle */}
        <div className="space-y-4 rounded-xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Client Handoff Bundle • {project.name}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                isShipped
                  ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                  : "border-gold/30 bg-gold/15 text-gold"
              }`}
            >
              {isShipped ? "Shipped • Live" : "Ready to Ship"}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="min-w-0 pr-3">
                <div className="text-zinc-400">Production URL</div>
                <div className="mt-0.5 truncate font-mono text-gold font-medium">{prodUrl}</div>
              </div>
              <button
                onClick={() => handleCopy("prod", prodUrl)}
                className="flex items-center gap-1 rounded border border-black/10 bg-white px-2.5 py-1 text-zinc-600 hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
              >
                {copiedKey === "prod" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "prod" ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="min-w-0 pr-3">
                <div className="text-zinc-400">Source Repository</div>
                <div className="mt-0.5 truncate font-mono text-foreground font-medium">{repoUrl}</div>
              </div>
              <button
                onClick={() => handleCopy("repo", repoUrl)}
                className="flex items-center gap-1 rounded border border-black/10 bg-white px-2.5 py-1 text-zinc-600 hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
              >
                {copiedKey === "repo" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "repo" ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div>
                <div className="text-zinc-400">Design System & Motion Tokens</div>
                <div className="mt-0.5 font-mono text-emerald-500 font-medium">
                  Synced • 428 Components • 60fps
                </div>
              </div>
              <span className="font-mono text-emerald-500 font-semibold">VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Interactive Slide-to-Ship Control */}
        <div className="flex flex-col justify-between space-y-5 rounded-xl border border-black/10 bg-white/70 p-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Final Release Trigger</span>
              <span className="font-mono text-xs text-emerald-500 font-semibold">
                14/14 Pre-flight checks passed
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Slide to 100% to deploy to production edge nodes and dispatch the client handoff package.
            </p>
          </div>

          <div className="relative rounded-xl border border-black/10 bg-black/[0.03] p-1.5 dark:border-white/10 dark:bg-black/30">
            <div
              className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-lg bg-gradient-to-r from-gold/30 to-gold-hover/40 transition-all duration-75"
              style={{ width: `${sliderVal}%` }}
            />
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                disabled={isShipped}
                className="ship-slider z-10 h-11 w-full"
                aria-label="Slide to ship to client"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold tracking-wider text-foreground/80">
                {isShipped ? "SHIPPED TO CLIENT ✓" : "SLIDE TO SHIP TO CLIENT >>>"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
            <span>Release Manager: Lead Operator</span>
            <span className="text-gold">
              {isShipped ? "Deployed to 244 global edge nodes" : "Awaiting confirmation"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
