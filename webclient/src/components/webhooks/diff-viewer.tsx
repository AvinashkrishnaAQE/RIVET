"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, ExternalLink, FileCode2, FileMinus, FilePlus, FileText } from "lucide-react";
import type { GitHubFileDiff } from "@/lib/api";

interface DiffLine {
  type: "hunk" | "add" | "del" | "context" | "meta";
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

function parsePatchLines(patch: string): DiffLine[] {
  const rawLines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldNum = 0;
  let newNum = 0;
  let inHunk = false;

  for (const line of rawLines) {
    if (line.startsWith("@@")) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (match) {
        oldNum = Number(match[1]);
        newNum = Number(match[2]);
      }
      inHunk = true;
      result.push({ type: "hunk", text: line, oldLine: null, newLine: null });
      continue;
    }

    if (!inHunk) {
      result.push({ type: "meta", text: line, oldLine: null, newLine: null });
      continue;
    }

    if (line.startsWith("+")) {
      result.push({ type: "add", text: line, oldLine: null, newLine: newNum });
      newNum += 1;
    } else if (line.startsWith("-")) {
      result.push({ type: "del", text: line, oldLine: oldNum, newLine: null });
      oldNum += 1;
    } else if (line.startsWith("\\")) {
      result.push({ type: "meta", text: line, oldLine: null, newLine: null });
    } else {
      result.push({ type: "context", text: line, oldLine: oldNum, newLine: newNum });
      oldNum += 1;
      newNum += 1;
    }
  }

  return result;
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  added: {
    badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    label: "ADDED",
  },
  modified: {
    badge: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-300",
    label: "MODIFIED",
  },
  removed: {
    badge: "border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-300",
    label: "REMOVED",
  },
  renamed: {
    badge: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-300",
    label: "RENAMED",
  },
};

interface DiffViewerProps {
  file: GitHubFileDiff;
  defaultExpanded?: boolean;
  forceExpanded?: boolean | null;
}

export function DiffViewer({ file, defaultExpanded = true, forceExpanded = null }: DiffViewerProps) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const expanded = forceExpanded !== null ? forceExpanded : localExpanded;
  const parsedLines = useMemo(() => (file.patch ? parsePatchLines(file.patch) : []), [file.patch]);
  const style = STATUS_STYLES[file.status] ?? {
    badge: "border-zinc-500/30 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
    label: file.status.toUpperCase(),
  };

  const StatusIcon =
    file.status === "added"
      ? FilePlus
      : file.status === "removed"
        ? FileMinus
        : file.patch
          ? FileCode2
          : FileText;

  const handleCopyPatch = () => {
    if (!file.patch || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(file.patch).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white/80 dark:border-white/10 dark:bg-zinc-900/70 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-black/[0.02] px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setLocalExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
          )}
          <StatusIcon className="h-4 w-4 shrink-0 text-gold" />
          <span className="truncate font-mono text-xs font-medium text-foreground">
            {file.previousFilename ? `${file.previousFilename} → ${file.filename}` : file.filename}
          </span>
        </button>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {(file.additions !== null || file.deletions !== null) && (
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400">+{file.additions ?? 0}</span>
              <span className="text-rose-600 dark:text-rose-400">-{file.deletions ?? 0}</span>
            </span>
          )}

          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
            {style.label}
          </span>

          {file.patch && (
            <button
              type="button"
              onClick={handleCopyPatch}
              title="Copy patch"
              className="rounded border border-black/10 bg-white/80 p-1 text-zinc-500 hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}

          {file.blobUrl && (
            <a
              href={file.blobUrl}
              target="_blank"
              rel="noreferrer"
              title="View file on GitHub"
              className="rounded border border-black/10 bg-white/80 p-1 text-zinc-500 hover:border-gold hover:text-gold dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto bg-zinc-50/70 dark:bg-[#09090b]">
          {file.patch ? (
            <table className="w-full border-collapse font-mono text-[12px] leading-5">
              <tbody>
                {parsedLines.map((line, index) => {
                  const rowClass =
                    line.type === "hunk"
                      ? "bg-gold/10 text-gold dark:bg-gold/15 dark:text-gold-light"
                      : line.type === "add"
                        ? "bg-emerald-500/12 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                        : line.type === "del"
                          ? "bg-rose-500/12 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200"
                          : line.type === "meta"
                            ? "bg-black/[0.03] text-zinc-500 dark:bg-white/[0.03] dark:text-zinc-400"
                            : "text-zinc-700 dark:text-zinc-300";

                  return (
                    <tr key={index} className={rowClass}>
                      <td className="w-10 select-none border-r border-black/5 px-2 text-right text-[10px] text-zinc-400 dark:border-white/5">
                        {line.oldLine ?? ""}
                      </td>
                      <td className="w-10 select-none border-r border-black/5 px-2 text-right text-[10px] text-zinc-400 dark:border-white/5">
                        {line.newLine ?? ""}
                      </td>
                      <td className="whitespace-pre px-3 py-0.5">{line.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                Code patch is not loaded for this file (click <strong className="text-foreground">Sync Code Diff</strong> above, or this is a binary/large file).
              </span>
              {file.blobUrl && (
                <a
                  href={file.blobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-gold hover:underline"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
