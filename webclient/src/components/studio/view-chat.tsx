"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowUp,
  Paperclip,
  SquarePen,
  Copy,
  Check,
  PanelRight,
  Sparkles,
  Layers,
  ShieldCheck,
  Cpu,
  Rocket,
} from "lucide-react";
import { ActivityFeedItem, ChatMessage, Project, StudioView } from "./types";

interface ViewChatProps {
  project: Project;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onNewChat: () => void;
  activityFeed: ActivityFeedItem[];
  onNavigateView: (view: StudioView) => void;
  isGenerating?: boolean;
}

export function ViewChat({
  project,
  messages,
  onSendMessage,
  onNewChat,
  activityFeed,
  onNavigateView,
  isGenerating = false,
}: ViewChatProps) {
  const [inputText, setInputText] = useState("");
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"activity" | "preview">("activity");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const starterPrompts = [
    {
      title: "Architect a multi-tenant SaaS",
      desc: "Schema, REST API topology, and Postgres relations",
      icon: Cpu,
    },
    {
      title: "Design a 60fps kinetic UI",
      desc: "Spring-physics components with luxury editorial theme",
      icon: Layers,
    },
    {
      title: "Run automated security & QA audit",
      desc: "End-to-end Playwright tests, Lighthouse, and WCAG",
      icon: ShieldCheck,
    },
    {
      title: "Prepare client handoff & edge deploy",
      desc: "Bundle production URLs, repo tokens, and CDN release",
      icon: Rocket,
    },
  ];

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden animate-view-in bg-ink transition-colors duration-500">
      {/* Main Chat Column */}
      <div className="flex flex-1 min-w-0 flex-col h-full relative">
        {/* Top Minimal Action Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 bg-ink/80 px-4 py-2.5 backdrop-blur-md dark:border-white/5 dark:bg-ink/60">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold italic text-foreground">
              {messages.length === 0 ? "New conversation" : messages[0].text.slice(0, 32) + "..."}
            </span>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[10px] text-gold">
              ReViT Swarm 3.4
            </span>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={onNewChat}
                title="New chat"
                className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold dark:border-white/10 dark:bg-white/[0.04]"
              >
                <SquarePen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}

            <button
              onClick={() => setShowInspector(!showInspector)}
              title="Toggle inspector / preview"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                showInspector
                  ? "border-gold bg-gold/15 text-gold font-semibold"
                  : "border-black/10 bg-black/[0.03] text-zinc-600 hover:border-gold hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
              }`}
            >
              <PanelRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Canvas</span>
            </button>
          </div>
        </div>

        {/* Conversation Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ChatGPT / Claude Empty State */
            <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
              <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                {/* Brand Monogram */}
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-hover text-2xl font-bold font-display italic text-white shadow-xl shadow-gold/20">
                  RV
                </div>

                <h1 className="font-display text-3xl font-normal italic tracking-tight text-foreground sm:text-4xl">
                  What would you like to build?
                </h1>
                <p className="mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Agents, sources, and creative code tools share one living canvas. Ask anything or dispatch your swarm.
                </p>

                {/* Starter Prompt Cards */}
                <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                  {starterPrompts.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.title}
                        onClick={() => {
                          setInputText(item.title);
                          onSendMessage(item.title);
                        }}
                        className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white/70 p-3.5 text-left transition-all duration-300 hover:border-gold/50 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-foreground group-hover:text-gold transition-colors">
                            {item.title}
                          </span>
                          <Icon className="h-4 w-4 text-zinc-400 group-hover:text-gold transition-colors shrink-0 ml-2" />
                        </div>
                        <span className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Active Message Thread (ChatGPT / Claude style) */
            <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-8">
              {messages.map((m) => {
                if (m.role === "user") {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-xl rounded-2xl rounded-tr-sm bg-black/[0.05] dark:bg-white/[0.08] px-4 py-3 text-sm text-foreground shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-hover text-xs font-bold font-display italic text-white shadow-md shadow-gold/20">
                      RV
                    </div>
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="text-sm leading-relaxed text-foreground space-y-2">
                        {m.text.split("\n\n").map((para, idx) => (
                          <p key={idx} className="whitespace-pre-wrap">
                            {para.split("**").map((chunk, i) =>
                              i % 2 === 1 ? (
                                <strong key={i} className="font-semibold text-gold">
                                  {chunk}
                                </strong>
                              ) : (
                                chunk
                              )
                            )}
                          </p>
                        ))}
                      </div>

                      {/* Agent Swarm Subtask Progress Cards */}
                      {m.agentCards && m.agentCards.length > 0 && (
                        <div className="my-3 space-y-2 rounded-xl border border-black/10 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.02]">
                          <div className="flex items-center justify-between font-mono text-[10px] uppercase text-zinc-400">
                            <span>Specialized Swarm Agents</span>
                            <span className="text-gold font-medium">Orchestrating</span>
                          </div>
                          <div className="space-y-2 pt-1">
                            {m.agentCards.map((card) => {
                              const isDone = card.status === "Completed";
                              return (
                                <div key={card.name} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2 font-medium text-foreground">
                                      <span
                                        className={`h-2 w-2 rounded-full ${
                                          isDone ? "bg-emerald-500" : "animate-ping bg-gold"
                                        }`}
                                      />
                                      {card.name}
                                    </span>
                                    <span
                                      className={`font-mono text-[10px] ${
                                        isDone
                                          ? "text-emerald-500 font-medium"
                                          : "text-gold font-medium"
                                      }`}
                                    >
                                      {card.status} • {card.progress}%
                                    </span>
                                  </div>
                                  <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                                    <div
                                      className={`h-full rounded-full bg-gradient-to-r from-gold to-gold-hover transition-all duration-500 ${
                                        card.progress < 100 ? "progress-shimmer" : ""
                                      }`}
                                      style={{ width: `${card.progress}%` }}
                                    />
                                  </div>
                                  <div className="font-mono text-[10px] text-zinc-400">
                                    {card.detail}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1 text-zinc-400">
                        <button
                          onClick={() => handleCopyMessage(m.id, m.text)}
                          title="Copy text"
                          className="flex items-center gap-1 rounded p-1 hover:text-foreground transition-colors"
                        >
                          {copiedId === m.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Streaming / Generating State */}
              {isGenerating && (
                <div className="flex items-start gap-4 animate-view-in">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-hover text-xs font-bold font-display italic text-white shadow-md shadow-gold/20">
                    RV
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gold py-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gold" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gold [animation-delay:0.4s]" />
                    <span className="font-mono text-[11px] ml-1">Swarm thinking & compiling...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar (Clean, Floating/Grounded ChatGPT/Claude Style) */}
        <div className="shrink-0 w-full px-4 pb-5 pt-2">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={handleSubmit}
              className="relative flex flex-col rounded-[24px] border border-black/10 bg-white/90 p-2 shadow-lg backdrop-blur-xl transition-all duration-200 focus-within:border-gold/50 focus-within:ring-2 focus-within:ring-gold/15 dark:border-white/10 dark:bg-zinc-900/90"
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask ReViT anything, brainstorm an idea, or instruct the swarm..."
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Attach file"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5 transition-colors"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-mono text-gold">
                    <Sparkles className="h-3 w-3" />
                    Swarm Mode
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-hover text-white shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              </div>
            </form>

            <p className="mt-2 text-center text-[11px] text-zinc-400">
              ReViT can coordinate specialized agents. Verify important technical code.
            </p>
          </div>
        </div>
      </div>

      {/* Slide-out Inspector / Preview Panel (Hidden by default, pure Claude/ChatGPT canvas style) */}
      {showInspector && (
        <aside className="w-96 shrink-0 flex flex-col border-l border-black/10 bg-ink/95 backdrop-blur-md dark:border-white/10 animate-view-in">
          <div className="flex items-center justify-between border-b border-black/10 p-2.5 dark:border-white/10">
            <div className="flex items-center gap-1 flex-1">
              <button
                onClick={() => setInspectorTab("activity")}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  inspectorTab === "activity"
                    ? "border border-gold/30 bg-gold/10 font-semibold text-gold"
                    : "text-zinc-400 hover:text-foreground"
                }`}
              >
                Swarm Activity
              </button>
              <button
                onClick={() => setInspectorTab("preview")}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                  inspectorTab === "preview"
                    ? "border border-gold/30 bg-gold/10 font-semibold text-gold"
                    : "text-zinc-400 hover:text-foreground"
                }`}
              >
                Live Preview
              </button>
            </div>
            <button
              onClick={() => setShowInspector(false)}
              className="ml-2 rounded p-1 text-zinc-400 hover:text-foreground"
            >
              &times;
            </button>
          </div>

          {inspectorTab === "activity" ? (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                <span>STREAMING EVENTS</span>
                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" /> LIVE
                </span>
              </div>
              <div className="space-y-2.5 font-mono text-xs">
                {activityFeed.length === 0 ? (
                  <p className="text-zinc-400 text-center py-8">No events recorded yet.</p>
                ) : (
                  activityFeed.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-black/10 bg-black/[0.02] p-2.5 animate-view-in dark:border-white/10 dark:bg-white/[0.02]"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="font-semibold text-gold">{item.agent}</span>
                        <span>{item.time}</span>
                      </div>
                      <div className="mt-1 leading-snug text-foreground/90">{item.msg}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900 shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">
                    staging-{project.name.toLowerCase().replace(/\s+/g, "-")}.revit.studio
                  </span>
                  <span className="font-mono text-[10px] text-emerald-500">60fps</span>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground">{project.name}</div>
                      <div className="text-[10px] text-zinc-400">Live Client Build Preview</div>
                    </div>
                    <span className="rounded border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-300">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                      <span>Route #409 • NYC → BOS</span>
                      <span className="text-gold font-medium">In Transit</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-gold to-emerald-400 progress-shimmer" />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateView("shipments")}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/10 py-2.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
              >
                <Rocket className="h-3.5 w-3.5 text-gold" />
                <span>Open Shipment Control</span>
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
