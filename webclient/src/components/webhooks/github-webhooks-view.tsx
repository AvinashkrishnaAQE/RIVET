"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Lock,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import {
  ApiError,
  api,
  errorMessage,
  type GitHubWebhookDeliveryDetail,
  type GitHubWebhookDeliverySummary,
  type User,
} from "@/lib/api";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { DiffViewer } from "./diff-viewer";

const EVENT_FILTERS = ["", "push", "pull_request", "ping", "workflow_run", "release", "issues"] as const;
const PAGE_SIZE = 20;

const EVENT_COLORS: Record<string, string> = {
  push: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pull_request: "border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300",
  ping: "border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  workflow_run: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  release: "border-gold/40 bg-gold/15 text-gold",
};

function formatRef(ref: string | null): string {
  if (!ref) return "—";
  return ref.replace(/^refs\/(heads|tags)\//, "");
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function GitHubWebhooksView() {
  const [user, setUser] = useState<User | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const [deliveries, setDeliveries] = useState<GitHubWebhookDeliverySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [eventFilter, setEventFilter] = useState<string>("");
  const [repoFilter, setRepoFilter] = useState<string>("");
  const [searchDraft, setSearchDraft] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GitHubWebhookDeliveryDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"changes" | "payload" | "headers">("changes");
  const [expandAllDiffs, setExpandAllDiffs] = useState<boolean | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [syncingDiff, setSyncingDiff] = useState(false);
  const [livePolling, setLivePolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadDeliveries = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoadingList(true);
      try {
        const [meResult, listResult] = await Promise.all([
          api.me().catch((err) => {
            if (err instanceof ApiError && err.status === 401) throw err;
            return null;
          }),
          api.listGitHubDeliveries({
            event: eventFilter || undefined,
            repository: repoFilter || undefined,
            limit: PAGE_SIZE,
            offset,
          }),
        ]);
        if (meResult) setUser(meResult);
        setUnauthorized(false);
        setError(null);
        setDeliveries(listResult.deliveries);
        setTotal(listResult.pagination.total);
        setSelectedId((prev) => {
          if (prev && listResult.deliveries.some((d) => d.id === prev || d.deliveryId === prev)) {
            return prev;
          }
          return listResult.deliveries[0]?.id ?? null;
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setUnauthorized(true);
          setError(null);
        } else {
          setError(errorMessage(err));
        }
      } finally {
        setLoadingList(false);
      }
    },
    [eventFilter, repoFilter, offset],
  );

  // Initial load & filter/page updates without synchronous setState in effect body.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [meResult, listResult] = await Promise.all([
          api.me().catch((err) => {
            if (err instanceof ApiError && err.status === 401) throw err;
            return null;
          }),
          api.listGitHubDeliveries({
            event: eventFilter || undefined,
            repository: repoFilter || undefined,
            limit: PAGE_SIZE,
            offset,
          }),
        ]);
        if (!active) return;
        if (meResult) setUser(meResult);
        setUnauthorized(false);
        setError(null);
        setDeliveries(listResult.deliveries);
        setTotal(listResult.pagination.total);
        setSelectedId((prev) => {
          if (prev && listResult.deliveries.some((d) => d.id === prev || d.deliveryId === prev)) {
            return prev;
          }
          return listResult.deliveries[0]?.id ?? null;
        });
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          setUnauthorized(true);
          setError(null);
        } else {
          setError(errorMessage(err));
        }
      } finally {
        if (active) setLoadingList(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [eventFilter, repoFilter, offset]);

  // Live 5s polling for new GitHub deliveries while authenticated.
  useEffect(() => {
    if (!livePolling || unauthorized) return;
    const timer = setInterval(() => {
      void loadDeliveries({ silent: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [livePolling, unauthorized, loadDeliveries]);

  // Fetch full delivery details (commits, file diffs, raw JSON, headers) when selection changes.
  useEffect(() => {
    if (!selectedId || unauthorized) return;
    let active = true;
    void (async () => {
      try {
        const fetched = await api.getGitHubDelivery(selectedId);
        if (!active) return;
        setDetail(fetched);
        setExpandAllDiffs(null);
        if (!fetched.changes && activeTab === "changes") {
          setActiveTab("payload");
        } else if (fetched.changes && activeTab !== "changes") {
          setActiveTab("changes");
        }
      } catch (err) {
        if (!active) return;
        setError(errorMessage(err));
      } finally {
        if (active) setLoadingDetail(false);
      }
    })();

    return () => {
      active = false;
    };
    // Intentionally omit activeTab so switching tabs does not re-fetch the delivery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, unauthorized]);

  const handleSelectDelivery = (id: string) => {
    if (id === selectedId) return;
    setLoadingDetail(true);
    setSelectedId(id);
  };

  const handleSyncDiff = async () => {
    if (!detail) return;
    setSyncingDiff(true);
    setError(null);
    try {
      const updated = await api.syncGitHubDeliveryDiff(detail.id);
      setDetail(updated);
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === updated.id
            ? {
                ...d,
                diffStatus: updated.diffStatus,
                diffError: updated.diffError,
                changeSummary: updated.changes?.summary ?? d.changeSummary,
              }
            : d,
        ),
      );
      setActiveTab("changes");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSyncingDiff(false);
    }
  };

  const handleCopy = (key: string, value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const pushCount = deliveries.filter((d) => d.event === "push").length;
  const prCount = deliveries.filter((d) => d.event === "pull_request").length;

  return (
    <div className="min-h-screen bg-ink bg-dots font-ui text-foreground transition-colors duration-500">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-ink/85 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-900/70"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Studio</span>
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-hover text-white shadow-md shadow-gold/20">
                <Webhook className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate font-display text-lg font-bold italic text-foreground">
                    GitHub Webhooks
                  </h1>
                  <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 sm:inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    HMAC-SHA256
                  </span>
                </div>
                <p className="hidden truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400 md:block">
                  POST /api/v1/webhooks/github • Inspect pushes, files &amp; code diffs
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!unauthorized && (
              <>
                <button
                  type="button"
                  onClick={() => setLivePolling((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                    livePolling
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "border-black/10 bg-white/70 text-zinc-500 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-400"
                  }`}
                >
                  <Radio className={`h-3.5 w-3.5 ${livePolling ? "animate-pulse" : ""}`} />
                  <span className="hidden sm:inline">{livePolling ? "Live 5s" : "Paused"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void loadDeliveries()}
                  disabled={loadingList}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/70"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </>
            )}

            <ThemeToggle />

            {user && (
              <span className="hidden rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold lg:inline-block">
                {user.name}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-4 lg:p-8">
        {unauthorized ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-black/10 bg-white/80 p-8 text-center backdrop-blur-xl shadow-xl dark:border-white/10 dark:bg-zinc-900/80">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold italic text-foreground">
              Sign in to inspect webhooks
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Webhook deliveries and code diffs are protected behind your ReViT session so private repository events stay secure.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/login?next=/webhooks/github"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold-hover px-6 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:brightness-110"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-view-in">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* KPI Strip */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Total Recorded Deliveries</div>
                <div className="mt-1 font-display text-2xl font-bold italic text-foreground">{total}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Push Events (Page)</div>
                <div className="mt-1 font-display text-2xl font-bold italic text-emerald-600 dark:text-emerald-400">
                  {pushCount}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Pull Requests (Page)</div>
                <div className="mt-1 font-display text-2xl font-bold italic text-purple-600 dark:text-purple-400">
                  {prCount}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/70 p-4 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Latest Repository</div>
                <div className="mt-1.5 truncate font-mono text-xs font-semibold text-gold">
                  {deliveries[0]?.repository ?? "Waiting for events..."}
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 p-3 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/60">
              <div className="flex flex-wrap items-center gap-1.5">
                {EVENT_FILTERS.map((ev) => {
                  const active = eventFilter === ev;
                  return (
                    <button
                      key={ev || "all"}
                      type="button"
                      onClick={() => {
                        setLoadingList(true);
                        setOffset(0);
                        setEventFilter(ev);
                      }}
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs transition-all ${
                        active
                          ? "border border-gold/40 bg-gold/15 font-semibold text-gold"
                          : "border border-transparent text-zinc-500 hover:bg-black/5 hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/5"
                      }`}
                    >
                      {ev || "all"}
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoadingList(true);
                  setOffset(0);
                  setRepoFilter(searchDraft.trim());
                }}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Filter owner/repo..."
                    className="h-8 w-48 rounded-lg border border-black/10 bg-white pl-8 pr-2.5 font-mono text-xs text-foreground placeholder:text-zinc-400 focus:border-gold focus:outline-none dark:border-white/10 dark:bg-zinc-950 sm:w-60"
                  />
                </div>
                {repoFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDraft("");
                      setLoadingList(true);
                      setOffset(0);
                      setRepoFilter("");
                    }}
                    className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-500 hover:text-foreground dark:border-white/10"
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            {/* Split Master-Detail Workspace */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Delivery Stream */}
              <section className="space-y-3 lg:col-span-4 xl:col-span-4">
                <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-mono uppercase tracking-wider text-[11px]">
                    Deliveries ({total})
                  </span>
                  {total > PAGE_SIZE && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <button
                        type="button"
                        disabled={offset === 0}
                        onClick={() => {
                          setLoadingList(true);
                          setOffset((o) => Math.max(0, o - PAGE_SIZE));
                        }}
                        className="rounded border border-black/10 px-2 py-0.5 disabled:opacity-40 dark:border-white/10"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={offset + PAGE_SIZE >= total}
                        onClick={() => {
                          setLoadingList(true);
                          setOffset((o) => o + PAGE_SIZE);
                        }}
                        className="rounded border border-black/10 px-2 py-0.5 disabled:opacity-40 dark:border-white/10"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {loadingList && deliveries.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-8 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-900/60">
                    Loading GitHub deliveries...
                  </div>
                ) : deliveries.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-8 text-center dark:border-white/10 dark:bg-zinc-900/60">
                    <Webhook className="mx-auto mb-2 h-6 w-6 text-zinc-400" />
                    <div className="text-sm font-medium text-foreground">No webhook deliveries found</div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Push a commit or redeliver an event in GitHub to see it appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {deliveries.map((item) => {
                      const active = item.id === detail?.id || item.id === selectedId;
                      const badgeStyle =
                        EVENT_COLORS[item.event] ??
                        "border-zinc-500/30 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectDelivery(item.id)}
                          className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                            active
                              ? "border-gold bg-white shadow-md ring-2 ring-gold/15 dark:bg-zinc-900"
                              : "border-black/10 bg-white/70 hover:border-gold/40 dark:border-white/10 dark:bg-zinc-900/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${badgeStyle}`}
                              >
                                {item.event}
                                {item.action ? `:${item.action}` : ""}
                              </span>
                              {item.diffStatus === "fetched" && (
                                <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-600 dark:text-emerald-300">
                                  DIFF
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {formatTimestamp(item.receivedAt)}
                            </span>
                          </div>

                          <div className="mt-2 truncate font-mono text-xs font-semibold text-foreground">
                            {item.repository ?? "Unknown repository"}
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 truncate font-mono">
                              <GitBranch className="h-3 w-3 shrink-0 text-gold" />
                              <span className="truncate">{formatRef(item.ref)}</span>
                            </span>
                            <span className="truncate">@{item.sender ?? "github"}</span>
                          </div>

                          {item.changeSummary && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-black/5 pt-2 font-mono text-[10px] dark:border-white/5">
                              {item.changeSummary.commitCount !== null && (
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  {item.changeSummary.commitCount} commit
                                  {item.changeSummary.commitCount === 1 ? "" : "s"}
                                </span>
                              )}
                              {typeof item.changeSummary.totalFiles === "number" && item.changeSummary.totalFiles > 0 && (
                                <span className="text-gold">{item.changeSummary.totalFiles} files</span>
                              )}
                              {typeof item.changeSummary.additions === "number" && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  +{item.changeSummary.additions}
                                </span>
                              )}
                              {typeof item.changeSummary.deletions === "number" && (
                                <span className="text-rose-600 dark:text-rose-400">
                                  -{item.changeSummary.deletions}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Right Column: Detailed Delivery Inspector */}
              <section className="lg:col-span-8 xl:col-span-8">
                {loadingDetail && !detail ? (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-12 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-900/60">
                    Loading delivery details...
                  </div>
                ) : !detail ? (
                  <div className="rounded-2xl border border-black/10 bg-white/70 p-12 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-zinc-900/60">
                    Select a webhook delivery on the left to view pushed files, commits, code diffs, and payloads.
                  </div>
                ) : (
                  <div className="space-y-4 rounded-2xl border border-black/10 bg-white/75 p-5 backdrop-blur-md shadow-sm dark:border-white/10 dark:bg-zinc-900/65">
                    {/* Detail Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/10">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${
                              EVENT_COLORS[detail.event] ??
                              "border-zinc-500/30 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            {detail.event}
                            {detail.action ? `:${detail.action}` : ""}
                          </span>
                          <span className="font-mono text-sm font-semibold text-foreground">
                            {detail.repository ?? "Repository event"}
                          </span>
                          {detail.ref && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[11px] text-gold">
                              <GitBranch className="h-3 w-3" />
                              {formatRef(detail.ref)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>Sender: @{detail.sender ?? "unknown"}</span>
                          <span>Received: {formatTimestamp(detail.receivedAt)}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy("deliveryId", detail.deliveryId)}
                            className="inline-flex items-center gap-1 hover:text-gold transition-colors"
                          >
                            <span>Delivery: {detail.deliveryId.slice(0, 14)}…</span>
                            {copiedKey === "deliveryId" ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                          {detail.signatureVerified && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Signature Verified
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(detail.event === "push" || detail.event === "pull_request") && (
                          <button
                            type="button"
                            onClick={handleSyncDiff}
                            disabled={syncingDiff}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-hover px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${syncingDiff ? "animate-spin" : ""}`} />
                            <span>{syncingDiff ? "Fetching Diff..." : "Sync Code Diff"}</span>
                          </button>
                        )}

                        {detail.changes?.compareUrl && (
                          <a
                            href={detail.changes.compareUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800"
                          >
                            <span>GitHub Compare</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Diff Warning / Error Callout */}
                    {detail.diffStatus === "failed" && detail.diffError && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <div className="font-semibold">Code diff could not be fetched from GitHub API</div>
                          <div className="mt-0.5 text-[11px] opacity-90">{detail.diffError}</div>
                        </div>
                      </div>
                    )}

                    {/* Tabs */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2 dark:border-white/10">
                      <div className="flex items-center gap-1.5">
                        {detail.changes && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("changes")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              activeTab === "changes"
                                ? "border border-gold/40 bg-gold/10 font-semibold text-gold"
                                : "text-zinc-500 hover:text-foreground dark:text-zinc-400"
                            }`}
                          >
                            <FileCode2 className="h-3.5 w-3.5" />
                            <span>Commits, Files &amp; Diffs</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTab("payload")}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            activeTab === "payload"
                              ? "border border-gold/40 bg-gold/10 font-semibold text-gold"
                              : "text-zinc-500 hover:text-foreground dark:text-zinc-400"
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span>Raw Payload JSON</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("headers")}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            activeTab === "headers"
                              ? "border border-gold/40 bg-gold/10 font-semibold text-gold"
                              : "text-zinc-500 hover:text-foreground dark:text-zinc-400"
                          }`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Headers &amp; Metadata</span>
                        </button>
                      </div>

                      {activeTab === "changes" && detail.changes && detail.changes.files.length > 0 && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <button
                            type="button"
                            onClick={() => setExpandAllDiffs(true)}
                            className="rounded border border-black/10 px-2 py-1 text-zinc-500 hover:border-gold hover:text-gold dark:border-white/10 dark:text-zinc-300"
                          >
                            Expand All
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandAllDiffs(false)}
                            className="rounded border border-black/10 px-2 py-1 text-zinc-500 hover:border-gold hover:text-gold dark:border-white/10 dark:text-zinc-300"
                          >
                            Collapse All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "changes" && detail.changes ? (
                      <div className="space-y-6">
                        {/* PR Banner if Pull Request */}
                        {detail.changes.pullRequest && (
                          <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <GitPullRequest className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-semibold text-foreground">
                                  #{detail.changes.pullRequest.number} {detail.changes.pullRequest.title}
                                </span>
                              </div>
                              <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                                {detail.changes.pullRequest.merged ? "merged" : detail.changes.pullRequest.state}
                              </span>
                            </div>
                            <div className="mt-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                              {detail.changes.pullRequest.headRef} &rarr; {detail.changes.pullRequest.baseRef}
                            </div>
                          </div>
                        )}

                        {/* Change Summary Strip */}
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="text-[10px] font-mono uppercase text-zinc-400">Commits</div>
                            <div className="mt-1 font-mono text-base font-bold text-foreground">
                              {detail.changes.summary.commitCount ?? 0}
                            </div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="text-[10px] font-mono uppercase text-zinc-400">Files Changed</div>
                            <div className="mt-1 font-mono text-base font-bold text-gold">
                              {detail.changes.summary.totalFiles ?? detail.changes.files.length}
                            </div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="text-[10px] font-mono uppercase text-zinc-400">Added</div>
                            <div className="mt-1 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                              {detail.changes.summary.added?.length ?? 0}
                            </div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="text-[10px] font-mono uppercase text-zinc-400">Modified</div>
                            <div className="mt-1 font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                              {detail.changes.summary.modified?.length ?? 0}
                            </div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
                            <div className="text-[10px] font-mono uppercase text-zinc-400">Lines +/-</div>
                            <div className="mt-1 font-mono text-sm font-bold">
                              {detail.changes.summary.additions !== null ? (
                                <>
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    +{detail.changes.summary.additions}
                                  </span>{" "}
                                  <span className="text-rose-600 dark:text-rose-400">
                                    -{detail.changes.summary.deletions ?? 0}
                                  </span>
                                </>
                              ) : (
                                <span className="text-zinc-400 text-xs">Sync diff</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Commits Section */}
                        {detail.changes.commits.length > 0 && (
                          <div className="space-y-2.5">
                            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              <GitCommitHorizontal className="h-4 w-4 text-gold" />
                              <span>Pushed Commits ({detail.changes.commits.length})</span>
                            </h3>
                            <div className="space-y-2">
                              {detail.changes.commits.map((commit) => (
                                <div
                                  key={commit.sha}
                                  className="rounded-xl border border-black/10 bg-black/[0.02] p-3.5 dark:border-white/10 dark:bg-white/[0.02]"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="whitespace-pre-wrap text-xs font-semibold text-foreground">
                                        {commit.message}
                                      </div>
                                      <div className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {commit.author ?? "Unknown author"}
                                        {commit.timestamp ? ` • ${formatTimestamp(commit.timestamp)}` : ""}
                                      </div>
                                    </div>
                                    {commit.url ? (
                                      <a
                                        href={commit.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[11px] text-gold hover:bg-gold/20"
                                      >
                                        <span>{commit.shortSha}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="rounded-md border border-black/10 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:border-white/10">
                                        {commit.shortSha}
                                      </span>
                                    )}
                                  </div>

                                  {(commit.added.length > 0 || commit.modified.length > 0 || commit.removed.length > 0) && (
                                    <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[10px]">
                                      {commit.added.map((f) => (
                                        <span
                                          key={`a-${f}`}
                                          className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300"
                                        >
                                          + {f}
                                        </span>
                                      ))}
                                      {commit.modified.map((f) => (
                                        <span
                                          key={`m-${f}`}
                                          className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300"
                                        >
                                          ~ {f}
                                        </span>
                                      ))}
                                      {commit.removed.map((f) => (
                                        <span
                                          key={`r-${f}`}
                                          className="rounded border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-rose-700 dark:text-rose-300"
                                        >
                                          - {f}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Files & Code Diffs Section */}
                        <div className="space-y-3">
                          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            <FileCode2 className="h-4 w-4 text-gold" />
                            <span>Changed Files &amp; Code Diff ({detail.changes.files.length})</span>
                          </h3>
                          {detail.changes.files.length === 0 ? (
                            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                              No changed files listed in this delivery. Click <strong className="text-foreground">Sync Code Diff</strong> to query GitHub directly.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {detail.changes.files.map((file, idx) => (
                                <DiffViewer
                                  key={`${file.filename}-${idx}`}
                                  file={file}
                                  defaultExpanded={idx < 5}
                                  forceExpanded={expandAllDiffs}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : activeTab === "payload" ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-zinc-400">Full Webhook JSON Payload</span>
                          <button
                            type="button"
                            onClick={() => handleCopy("payload", JSON.stringify(detail.payload, null, 2))}
                            className="inline-flex items-center gap-1 rounded border border-black/10 bg-white px-2.5 py-1 text-xs text-zinc-600 hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {copiedKey === "payload" ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{copiedKey === "payload" ? "Copied" : "Copy JSON"}</span>
                          </button>
                        </div>
                        <pre className="max-h-[600px] overflow-auto rounded-xl border border-black/10 bg-zinc-50 p-4 font-mono text-xs leading-5 text-zinc-800 dark:border-white/10 dark:bg-[#09090b] dark:text-zinc-200">
                          {JSON.stringify(detail.payload, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10">
                            <div className="font-mono text-[10px] uppercase text-zinc-400">Database ID</div>
                            <div className="mt-1 truncate font-mono text-foreground">{detail.id}</div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10">
                            <div className="font-mono text-[10px] uppercase text-zinc-400">X-GitHub-Delivery</div>
                            <div className="mt-1 truncate font-mono text-foreground">{detail.deliveryId}</div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10">
                            <div className="font-mono text-[10px] uppercase text-zinc-400">Hook ID</div>
                            <div className="mt-1 font-mono text-foreground">{detail.hookId ?? "—"}</div>
                          </div>
                          <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10">
                            <div className="font-mono text-[10px] uppercase text-zinc-400">Diff Sync Status</div>
                            <div className="mt-1 font-mono text-foreground">{detail.diffStatus}</div>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-black/10 bg-black/[0.03] font-mono text-[10px] uppercase text-zinc-400 dark:border-white/10 dark:bg-white/[0.03]">
                              <tr>
                                <th className="px-4 py-2.5">Header</th>
                                <th className="px-4 py-2.5">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 font-mono dark:divide-white/5">
                              {Object.entries(detail.headers).map(([key, value]) => (
                                <tr key={key}>
                                  <td className="px-4 py-2.5 text-gold">{key}</td>
                                  <td className="px-4 py-2.5 break-all text-foreground">{value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
