"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/lib/api";
import {
  StudioView,
  Project,
  AgentId,
  ChatMessage,
  ActivityFeedItem,
  QACheck,
  ToastItem,
} from "@/components/studio/types";
import {
  INITIAL_PROJECTS,
  INITIAL_AGENTS,
  INITIAL_ACTIVITY,
  INITIAL_QA_CHECKS,
} from "@/components/studio/mock-data";
import { StudioSidebar } from "@/components/studio/studio-sidebar";
import { StudioHeader } from "@/components/studio/studio-header";
import { ViewChat } from "@/components/studio/view-chat";
import { ViewDashboard } from "@/components/studio/view-dashboard";
import { ViewMetrics } from "@/components/studio/view-metrics";
import { ViewStaging } from "@/components/studio/view-staging";
import { ViewShipments } from "@/components/studio/view-shipments";

export function Dashboard() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Authentication State
  const [user, setUser] = useState<User | null>(null);

  // Studio State
  const [currentView, setCurrentView] = useState<StudioView>("chat");
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>("p1");
  const [agents] = useState(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("architect");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(INITIAL_ACTIVITY);
  const [qaChecks, setQaChecks] = useState<QACheck[]>(INITIAL_QA_CHECKS);
  const [buildFilter, setBuildFilter] = useState<"all" | "building" | "staged">("all");
  const [tokensPerSec, setTokensPerSec] = useState<number>(14.2);
  const [shippedCount, setShippedCount] = useState<number>(182);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isQARunning, setIsQARunning] = useState(false);
  const [isShipped, setIsShipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Toast Notification Trigger
  const showToast = useCallback((message: string, tone: "gold" | "emerald" | "cyan" = "gold") => {
    const id = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    showToast("New conversation started", "gold");
  }, [showToast]);

  // Fetch logged in user or fall back gracefully to a Demo Delivery Lead
  useEffect(() => {
    let active = true;

    api
      .me()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch(() => {
        if (!active) return;
        // Graceful fallback for preview & development without active cookie session
        setUser({
          id: "usr_demo",
          name: "Alex K.",
          email: "alex.k@revit.ai",
          role: "admin",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  // Sign out handler
  async function handleSignOut(everywhere = false) {
    try {
      if (everywhere) await api.logoutAll();
      else await api.logout();
    } catch {
      // Continue to sign in
    }
    startTransition(() => {
      router.replace("/login");
    });
  }

  // Active Project Reference
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0];

  // Send message & simulate agent swarm iteration
  const handleSendMessage = useCallback(
    (text: string) => {
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const userMsg: ChatMessage = {
        id: "m_" + Date.now(),
        role: "user",
        time: now,
        text,
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);

      const assistantMsgId = "m_ai_" + (Date.now() + 1);

      setTimeout(() => {
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          text: `I've analyzed your instruction: **"${text}"**.\n\nThe ReViT Swarm is coordinating specialist agents to architect the system, design responsive components, and audit the deliverable:`,
          agentCards: [
            {
              name: "System Architect",
              status: "Active",
              progress: 35,
              detail: "Compiling relational schemas & API endpoints...",
              color: "gold",
            },
            {
              name: "Frontend Motion",
              status: "Queued",
              progress: 15,
              detail: "Preparing 60fps spring-physics UI transitions...",
              color: "cyan",
            },
            {
              name: "Security QA",
              status: "Queued",
              progress: 5,
              detail: "Awaiting build artifact for E2E sweep...",
              color: "purple",
            },
          ],
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Push activity event
        const newActivity: ActivityFeedItem = {
          id: "a_" + Date.now(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          agent: "architect",
          msg: `Started task: "${text.slice(0, 42)}..."`,
          type: "info",
        };
        setActivityFeed((prev) => [newActivity, ...prev.slice(0, 14)]);
        showToast("Swarm dispatched for new iteration", "cyan");

        // Progressive progress updates simulating real execution
        let step = 0;
        const interval = setInterval(() => {
          step++;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantMsgId || !m.agentCards) return m;
              const updated = [...m.agentCards];
              if (step <= 3) {
                updated[0] = {
                  ...updated[0],
                  progress: Math.min(100, updated[0].progress + 25),
                  status: updated[0].progress >= 75 ? "Completed" : "Active",
                };
                updated[1] = {
                  ...updated[1],
                  progress: Math.min(75, updated[1].progress + 20),
                  status: "Active",
                };
              } else if (step <= 6) {
                updated[0] = { ...updated[0], progress: 100, status: "Completed" };
                updated[1] = { ...updated[1], progress: 100, status: "Completed" };
                updated[2] = {
                  ...updated[2],
                  progress: Math.min(100, updated[2].progress + 35),
                  status: updated[2].progress >= 65 ? "Completed" : "Active",
                };
              }
              return { ...m, agentCards: updated };
            })
          );

          if (step >= 6) {
            clearInterval(interval);
            setIsGenerating(false);
            setActivityFeed((prev) => [
              {
                id: "a_done_" + Date.now(),
                time: new Date().toLocaleTimeString([], { hour12: false }),
                agent: "qa-bot",
                msg: "All E2E & accessibility checks passed cleanly",
                type: "ok",
              },
              ...prev.slice(0, 14),
            ]);
            showToast("Agent swarm completed build iteration!", "emerald");
          }
        }, 700);
      }, 500);
    },
    [showToast]
  );

  // Turbo Swarm token boost
  const handleTurboBoost = useCallback(() => {
    const boost = Number((14.2 + Math.random() * 5.2).toFixed(1));
    setTokensPerSec(boost);
    showToast(`Turbo Swarm activated — parallel threads boosted to ${boost}k tok/s!`, "emerald");
  }, [showToast]);

  // Simulate agent handoff
  const handleSimulateHandoff = useCallback(() => {
    const keys = Object.keys(agents) as AgentId[];
    const nextKey = keys[Math.floor(Math.random() * keys.length)];
    setSelectedAgentId(nextKey);
    setActivityFeed((prev) => [
      {
        id: "a_h_" + Date.now(),
        time: new Date().toLocaleTimeString([], { hour12: false }),
        agent: nextKey,
        msg: `Swarm handoff packet verified and routed to ${agents[nextKey].name}`,
        type: "ok",
      },
      ...prev.slice(0, 14),
    ]);
    showToast(`Handoff packet routed to ${agents[nextKey].name}`, "gold");
  }, [agents, showToast]);

  // Boost individual project
  const handleBoostProject = useCallback(
    (id: string) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const nextProg = Math.min(100, p.progress + 18);
          return {
            ...p,
            progress: nextProg,
            status: nextProg === 100 ? "staged" : p.status,
            stage: nextProg === 100 ? "QA Staging" : p.stage,
          };
        })
      );
      const target = projects.find((x) => x.id === id);
      showToast(`Boosted ${target ? target.name : "project"} progress`, "emerald");
    },
    [projects, showToast]
  );

  // Create new build
  const handleNewBuild = useCallback(() => {
    const id = "p_" + (projects.length + 1);
    const newProj: Project = {
      id,
      name: `New Client Idea #${projects.length + 1}`,
      client: "Internal Intake",
      stage: "Intake Brief",
      status: "building",
      progress: 14,
      branch: "main",
      stack: ["Next.js 15", "Tailwind", "Supabase"],
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(id);
    setCurrentView("chat");
    setMessages([]);
    showToast("New build workspace initialized", "gold");
  }, [projects.length, showToast]);

  // Run full QA Sweep
  const handleRunQaSweep = useCallback(() => {
    setIsQARunning(true);
    setQaChecks((prev) => prev.map((q) => ({ ...q, status: "RUNNING" })));
    showToast("Security QA Agent running verification sweep...", "cyan");

    setTimeout(() => {
      setQaChecks((prev) => prev.map((q) => ({ ...q, status: "PASS" })));
      setIsQARunning(false);
      showToast("All 4 QA suites passed with 0 errors!", "emerald");
    }, 1300);
  }, [showToast]);

  // Slide-to-Ship Success
  const handleShipSuccess = useCallback(() => {
    setIsShipped(true);
    setShippedCount((prev) => prev + 1);
    showToast("Build shipped! Production release dispatched to edge.", "emerald");
  }, [showToast]);

  // Copy helper with toast
  const handleCopy = useCallback(
    (text: string) => {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      showToast(`Copied to clipboard: ${text}`, "gold");
    },
    [showToast]
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink font-ui text-foreground transition-colors duration-500">
      {/* Left Navigation Rail */}
      <StudioSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          setIsShipped(false);
        }}
        onNewBuild={handleNewBuild}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        user={user}
        onSignOut={() => handleSignOut(false)}
        shippedCount={shippedCount}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Command Bar */}
        <StudioHeader
          currentView={currentView}
          onSelectView={setCurrentView}
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
          tokensPerSec={tokensPerSec}
          onTurboBoost={handleTurboBoost}
        />

        {/* Dynamic Studio Workspace Views */}
        <main className="flex-1 overflow-y-auto relative">
          {currentView === "chat" && (
            <ViewChat
              project={activeProject}
              messages={messages}
              onSendMessage={handleSendMessage}
              onNewChat={handleNewChat}
              activityFeed={activityFeed}
              onNavigateView={setCurrentView}
              isGenerating={isGenerating}
            />
          )}

          {currentView === "dashboard" && (
            <ViewDashboard
              agents={agents}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              onSimulateHandoff={handleSimulateHandoff}
              projects={projects}
              onSelectProject={setActiveProjectId}
              onBoostProject={handleBoostProject}
              buildFilter={buildFilter}
              onSetBuildFilter={setBuildFilter}
              onNavigateView={setCurrentView}
              tokensPerSec={tokensPerSec}
              shippedCount={shippedCount}
            />
          )}

          {currentView === "metrics" && <ViewMetrics agents={agents} />}

          {currentView === "staging" && (
            <ViewStaging
              qaChecks={qaChecks}
              onRunQaSweep={handleRunQaSweep}
              isRunning={isQARunning}
            />
          )}

          {currentView === "shipments" && (
            <ViewShipments
              project={activeProject}
              onShipSuccess={handleShipSuccess}
              onCopy={handleCopy}
              isShipped={isShipped}
            />
          )}
        </main>
      </div>

      {/* Toast Notification Container */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => {
          const border =
            toast.tone === "emerald"
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
              : toast.tone === "cyan"
              ? "border-cyan-500/40 text-cyan-600 dark:text-cyan-300"
              : "border-gold/40 text-gold";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2 rounded-xl border bg-white/95 px-4 py-2.5 text-xs font-medium shadow-xl backdrop-blur-md animate-view-in dark:bg-zinc-900/95 ${border}`}
            >
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
