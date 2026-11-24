"use client";

import { Sparkles, ArrowRight, Layers, Cpu, Timer, CheckCircle2 } from "lucide-react";
import { Agent, AgentId, Project, StudioView } from "./types";

interface ViewDashboardProps {
  agents: Record<string, Agent>;
  selectedAgentId: AgentId;
  onSelectAgent: (id: AgentId) => void;
  onSimulateHandoff: () => void;
  projects: Project[];
  onSelectProject: (id: string) => void;
  onBoostProject: (id: string) => void;
  buildFilter: "all" | "building" | "staged";
  onSetBuildFilter: (filter: "all" | "building" | "staged") => void;
  onNavigateView: (view: StudioView) => void;
  tokensPerSec: number;
  shippedCount: number;
}

export function ViewDashboard({
  agents,
  selectedAgentId,
  onSelectAgent,
  onSimulateHandoff,
  projects,
  onSelectProject,
  onBoostProject,
  buildFilter,
  onSetBuildFilter,
  onNavigateView,
  tokensPerSec,
  shippedCount,
}: ViewDashboardProps) {
  const selectedAgent = agents[selectedAgentId] || agents.architect;

  const filteredProjects =
    buildFilter === "all" ? projects : projects.filter((p) => p.status === buildFilter);

  return (
    <div className="space-y-6 p-4 animate-view-in lg:p-6">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md transition-all hover:border-gold/40 dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Active Client Builds</span>
            <Layers className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold italic text-foreground">
              {projects.length}
            </span>
            <span className="font-mono text-xs text-emerald-500 font-semibold">+2 today</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full w-4/5 rounded-full bg-gold progress-shimmer" />
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md transition-all hover:border-emerald-500/40 dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Swarm Throughput</span>
            <Cpu className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold italic text-foreground">
              {tokensPerSec.toFixed(1)}k{" "}
              <span className="font-sans text-xs font-normal text-zinc-400">tok/s</span>
            </span>
            <span className="font-mono text-xs text-emerald-500 font-semibold">6/6 active</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full w-11/12 rounded-full bg-emerald-500 progress-shimmer" />
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md transition-all hover:border-purple-500/40 dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Avg Idea-to-Ship</span>
            <Timer className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold italic text-foreground">
              34m 12s
            </span>
            <span className="font-mono text-xs text-emerald-500 font-semibold">-18% vs avg</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full w-2/3 rounded-full bg-purple-500" />
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md transition-all hover:border-gold/40 dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>QA Pass Rate</span>
            <CheckCircle2 className="h-4 w-4 text-gold" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold italic text-foreground">99.4%</span>
            <span className="font-mono text-xs text-zinc-400">{shippedCount} shipped</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div className="h-full w-[99%] rounded-full bg-gold" />
          </div>
        </div>
      </div>

      {/* Kinetic Live Agent Orchestration Map */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">
              Live Agent Orchestration Swarm
            </span>
            <span className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[11px] text-gold">
              Click any agent to inspect
            </span>
          </div>
          <button
            onClick={onSimulateHandoff}
            className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/20 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simulate Handoff</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3">
          {/* SVG & Interactive Node Graph */}
          <div className="bg-dots relative flex min-h-[320px] items-center justify-center overflow-x-auto p-4 lg:p-6 xl:col-span-2">
            <div className="relative h-[270px] w-full min-w-[580px] max-w-3xl">
              {/* Dynamic SVG Flow Connections */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 760 270"
                fill="none"
              >
                {/* Intake -> Architect */}
                <path d="M 145 135 C 185 135, 195 135, 235 135" stroke="currentColor" className="text-black/10 dark:text-white/10" strokeWidth="2.5" />
                <path d="M 145 135 C 185 135, 195 135, 235 135" stroke="#06B6D4" strokeWidth="2.5" className="svg-flow-line" />

                {/* Architect -> Frontend */}
                <path d="M 365 135 C 405 135, 410 65, 455 65" stroke="currentColor" className="text-black/10 dark:text-white/10" strokeWidth="2.5" />
                <path d="M 365 135 C 405 135, 410 65, 455 65" stroke="#A855F7" strokeWidth="2.5" className="svg-flow-line-fast" />

                {/* Architect -> Backend */}
                <path d="M 365 135 C 405 135, 410 205, 455 205" stroke="currentColor" className="text-black/10 dark:text-white/10" strokeWidth="2.5" />
                <path d="M 365 135 C 405 135, 410 205, 455 205" stroke="#10B981" strokeWidth="2.5" className="svg-flow-line-fast" />

                {/* Frontend -> QA */}
                <path d="M 585 65 C 615 65, 615 95, 635 100" stroke="currentColor" className="text-black/10 dark:text-white/10" strokeWidth="2.5" />
                <path d="M 585 65 C 615 65, 615 95, 635 100" stroke="#F59E0B" strokeWidth="2.5" className="svg-flow-line" />

                {/* Backend -> QA */}
                <path d="M 585 205 C 615 205, 615 165, 635 140" stroke="currentColor" className="text-black/10 dark:text-white/10" strokeWidth="2.5" />
                <path d="M 585 205 C 615 205, 615 165, 635 140" stroke="#10B981" strokeWidth="2.5" className="svg-flow-line" />
              </svg>

              {/* Agent Node Buttons */}
              <button
                onClick={() => onSelectAgent("intake")}
                className={`agent-node absolute left-2 top-[102px] w-36 rounded-xl border p-2.5 text-left transition-all hover:scale-105 ${
                  selectedAgentId === "intake"
                    ? "border-cyan-500 bg-white dark:bg-zinc-900 shadow-md ring-2 ring-cyan-500/20"
                    : "border-black/10 bg-white/90 dark:border-white/10 dark:bg-zinc-900/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Intake Strategist</span>
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                </div>
                <div className="mt-1 font-mono text-[10px] text-zinc-400">Parsing brief...</div>
              </button>

              <button
                onClick={() => onSelectAgent("architect")}
                className={`agent-node absolute left-[235px] top-[102px] w-36 rounded-xl border p-2.5 text-left transition-all hover:scale-105 active-agent-glow ${
                  selectedAgentId === "architect"
                    ? "border-gold bg-white dark:bg-zinc-900 shadow-md ring-2 ring-gold/20"
                    : "border-gold/40 bg-white/90 dark:border-gold/40 dark:bg-zinc-900/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">System Architect</span>
                  <span className="h-2 w-2 animate-ping rounded-full bg-gold" />
                </div>
                <div className="mt-1 font-mono text-[10px] text-gold">Schema & API tree</div>
              </button>

              <button
                onClick={() => onSelectAgent("frontend")}
                className={`agent-node absolute left-[455px] top-[32px] w-36 rounded-xl border p-2.5 text-left transition-all hover:scale-105 ${
                  selectedAgentId === "frontend"
                    ? "border-purple-500 bg-white dark:bg-zinc-900 shadow-md ring-2 ring-purple-500/20"
                    : "border-black/10 bg-white/90 dark:border-white/10 dark:bg-zinc-900/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Frontend Motion</span>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
                </div>
                <div className="mt-1 font-mono text-[10px] text-purple-600 dark:text-purple-300">
                  60fps UI & Motion
                </div>
              </button>

              <button
                onClick={() => onSelectAgent("backend")}
                className={`agent-node absolute left-[455px] top-[172px] w-36 rounded-xl border p-2.5 text-left transition-all hover:scale-105 ${
                  selectedAgentId === "backend"
                    ? "border-emerald-500 bg-white dark:bg-zinc-900 shadow-md ring-2 ring-emerald-500/20"
                    : "border-black/10 bg-white/90 dark:border-white/10 dark:bg-zinc-900/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Backend & DB</span>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                </div>
                <div className="mt-1 font-mono text-[10px] text-zinc-400">Edge endpoints</div>
              </button>

              <button
                onClick={() => onSelectAgent("qa")}
                className={`agent-node absolute right-2 top-[72px] w-32 rounded-xl border p-2.5 text-left transition-all hover:scale-105 ${
                  selectedAgentId === "qa"
                    ? "border-amber-500 bg-white dark:bg-zinc-900 shadow-md ring-2 ring-amber-500/20"
                    : "border-black/10 bg-white/90 dark:border-white/10 dark:bg-zinc-900/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Security QA</span>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <div className="mt-1 font-mono text-[10px] text-amber-600 dark:text-amber-300">
                  E2E & Audit
                </div>
              </button>

              <button
                onClick={() => onSelectAgent("shipper")}
                className={`agent-node absolute right-2 top-[168px] w-32 rounded-xl border p-2.5 text-left transition-all hover:scale-105 ${
                  selectedAgentId === "shipper"
                    ? "border-gold bg-white dark:bg-zinc-900 shadow-md ring-2 ring-gold/20"
                    : "border-black/10 bg-white/90 dark:border-white/10 dark:bg-zinc-900/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">Release Shipper</span>
                  <span className="h-2 w-2 rounded-full bg-gold" />
                </div>
                <div className="mt-1 font-mono text-[10px] text-zinc-400">Client Handoff</div>
              </button>
            </div>
          </div>

          {/* Selected Agent Inspector Card */}
          <div className="flex flex-col justify-between border-t border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02] xl:border-l xl:border-t-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">{selectedAgent.name}</div>
                  <div className="text-[11px] text-zinc-400">{selectedAgent.role}</div>
                </div>
                <span className="rounded-full border border-gold/30 bg-gold/15 px-2 py-0.5 font-mono text-[10px] text-gold">
                  {selectedAgent.status}
                </span>
              </div>

              <div className="rounded-lg border border-black/10 bg-white/80 p-3 text-xs leading-relaxed text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                <div className="mb-1 font-mono text-[10px] uppercase text-zinc-400">Active Task</div>
                {selectedAgent.currentTask}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-black/10 bg-white/80 p-2 dark:border-white/10 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400">Tasks</div>
                  <div className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                    {selectedAgent.tasks}
                  </div>
                </div>
                <div className="rounded-lg border border-black/10 bg-white/80 p-2 dark:border-white/10 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400">Latency</div>
                  <div className="mt-0.5 font-mono text-xs font-semibold text-gold">
                    {selectedAgent.latency}
                  </div>
                </div>
                <div className="rounded-lg border border-black/10 bg-white/80 p-2 dark:border-white/10 dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400">Success</div>
                  <div className="mt-0.5 font-mono text-xs font-semibold text-emerald-500">
                    {selectedAgent.success}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
              <span className="font-mono text-[11px] text-zinc-400">Auto-Handoff Enabled</span>
              <button
                onClick={() => onNavigateView("chat")}
                className="flex items-center gap-1 text-xs font-medium text-gold hover:text-gold-hover transition-colors"
              >
                <span>Chat with Agent</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Client Builds Pipeline Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Active Idea-to-Shipment Pipelines
          </h2>
          <div className="flex items-center gap-1.5">
            {(["all", "building", "staged"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onSetBuildFilter(filter)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                  buildFilter === filter
                    ? "border border-gold/40 bg-gold/10 font-semibold text-gold shadow-sm"
                    : "text-zinc-400 hover:text-foreground"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="space-y-3 rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md transition-all hover:border-gold/40 dark:border-white/10 dark:bg-zinc-900/60 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {p.client} • <span className="font-mono text-zinc-400">{p.branch}</span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                    p.progress === 100
                      ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      : "border border-gold/30 bg-gold/10 text-gold"
                  }`}
                >
                  {p.progress}%
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-gold to-gold-hover ${
                    p.progress < 100 ? "progress-shimmer" : ""
                  }`}
                  style={{ width: `${p.progress}%` }}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.stack.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-black/10 bg-black/[0.03] px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => {
                    onSelectProject(p.id);
                    onNavigateView("chat");
                  }}
                  className="text-xs font-medium text-gold hover:text-gold-hover transition-colors"
                >
                  Open in Agent Chat &rarr;
                </button>
                <button
                  onClick={() => onBoostProject(p.id)}
                  className="rounded-md border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/20"
                >
                  Boost Build
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
