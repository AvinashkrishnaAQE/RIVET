"use client";

import { useState } from "react";
import { VelocityChart, AgentShareChart } from "./studio-charts";
import { Agent } from "./types";

interface ViewMetricsProps {
  agents: Record<string, Agent>;
}

export function ViewMetrics({ agents }: ViewMetricsProps) {
  const [range, setRange] = useState<"7D" | "14D" | "30D">("14D");

  return (
    <div className="space-y-6 p-4 animate-view-in lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Agency Velocity & Swarm Telemetry
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time build throughput, cycle times, and compute allocation across your multi-agent swarm.
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-black/10 bg-black/[0.03] p-0.5 dark:border-white/10 dark:bg-white/[0.04]">
          {(["7D", "14D", "30D"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                range === r
                  ? "border border-gold/40 bg-gold/15 font-semibold text-gold shadow-sm"
                  : "text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Velocity Chart */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Builds Shipped vs. Avg Cycle Time (min)
            </span>
            <span className="font-mono text-[11px] text-gold">Live Telemetry</span>
          </div>
          <VelocityChart range={range} />
        </div>

        {/* Compute by Role Donut Chart */}
        <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Compute by Agent Role
            </span>
            <span className="font-mono text-[11px] text-gold">% Share</span>
          </div>
          <AgentShareChart />
        </div>
      </div>

      {/* Swarm Agent Scorecard Table */}
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
          <span className="text-sm font-semibold text-foreground">Swarm Agent Scorecard</span>
          <span className="font-mono text-xs text-zinc-400">6 Specialized Agents</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-black/5 bg-black/[0.02] font-mono text-[10px] uppercase text-zinc-400 dark:border-white/5 dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tasks Done</th>
                <th className="px-4 py-3">Avg Latency</th>
                <th className="px-4 py-3">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {Object.values(agents).map((a) => (
                <tr
                  key={a.id}
                  className="transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 font-mono text-[10px] text-gold">
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground/80">{a.tasks}</td>
                  <td className="px-4 py-3 font-mono text-gold">{a.latency}</td>
                  <td className="px-4 py-3 font-mono text-emerald-500 font-medium">{a.success}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
