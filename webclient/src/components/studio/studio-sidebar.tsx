"use client";

import Link from "next/link";
import {
  Layers,
  MessageSquareCode,
  Cpu,
  BarChart3,
  ShieldCheck,
  Rocket,
  Plus,
  X,
  LogOut,
} from "lucide-react";
import { Project, StudioView } from "./types";
import { User } from "@/lib/api";

interface StudioSidebarProps {
  currentView: StudioView;
  onSelectView: (view: StudioView) => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onNewBuild: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: User | null;
  onSignOut: () => void;
  shippedCount: number;
}

export function StudioSidebar({
  currentView,
  onSelectView,
  projects,
  activeProjectId,
  onSelectProject,
  onNewBuild,
  mobileOpen,
  onCloseMobile,
  user,
  onSignOut,
  shippedCount,
}: StudioSidebarProps) {
  const navItems = [
    {
      id: "chat" as StudioView,
      label: "Agent Chat",
      icon: MessageSquareCode,
      badge: "Live",
      badgeClass: "bg-cyan-500/15 text-cyan-500 dark:text-cyan-300 border-cyan-500/25",
    },
    {
      id: "dashboard" as StudioView,
      label: "Swarm Dashboard",
      icon: Cpu,
      badge: "6/6",
      badgeClass: "bg-gold/15 text-gold border-gold/25",
    },
    {
      id: "metrics" as StudioView,
      label: "Metrics & Velocity",
      icon: BarChart3,
    },
    {
      id: "staging" as StudioView,
      label: "QA & Staging",
      icon: ShieldCheck,
      badge: "99%",
      badgeClass: "text-emerald-500 font-mono",
    },
    {
      id: "shipments" as StudioView,
      label: "Shipments",
      icon: Rocket,
      badge: `${shippedCount}`,
      badgeClass: "bg-black/5 dark:bg-white/10 text-foreground/80 font-mono",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Left Navigation Rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-black/10 bg-ink/95 backdrop-blur-xl transition-transform duration-300 ease-out dark:border-white/10 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 px-4 dark:border-white/10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-hover shadow-md shadow-gold/20">
              <Layers className="h-4 w-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
                <span className="font-display italic font-bold">ReViT</span> OS
                <span className="rounded border border-gold/30 bg-gold/10 px-1.5 py-0.2 text-[9px] font-mono font-medium text-gold">
                  v3.4
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Multi-Agent Studio</div>
            </div>
          </Link>
          <button
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-zinc-400 hover:text-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1 p-3">
          <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "border border-gold/30 bg-gold/10 text-foreground shadow-sm font-semibold"
                    : "text-zinc-600 hover:bg-black/5 hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${active ? "text-gold" : "text-zinc-500"}`} />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                      item.badgeClass || ""
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Client Builds List */}
        <div className="flex-1 overflow-y-auto border-t border-black/10 px-3 pb-2 pt-2 dark:border-white/10">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Active Builds
            </span>
            <button
              onClick={onNewBuild}
              className="flex items-center gap-1 text-[11px] font-medium text-gold hover:text-gold-hover transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </button>
          </div>
          <div className="mt-1 space-y-1">
            {projects.map((p) => {
              const isActive = p.id === activeProjectId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p.id);
                    onCloseMobile();
                  }}
                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition-all ${
                    isActive
                      ? "border-gold/40 bg-gold/10 text-foreground font-medium"
                      : "border-transparent text-zinc-600 hover:bg-black/5 hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-xs font-medium">{p.name}</span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] ${
                        p.status === "staged"
                          ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                          : "border-gold/30 bg-gold/10 text-gold"
                      }`}
                    >
                      {p.progress}%
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-zinc-400">{p.client}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Operator Profile Footer */}
        <div className="shrink-0 border-t border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-xs font-semibold text-gold">
                {user ? user.name.slice(0, 2).toUpperCase() : "OP"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-foreground">
                  {user ? user.name : "Alex K."}
                </div>
                <div className="truncate text-[10px] text-zinc-400">
                  {user ? user.role : "Delivery Lead"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                ON
              </span>
              <button
                onClick={onSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="rounded p-1 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
