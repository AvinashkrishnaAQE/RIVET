"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/components/landing/content";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { api, ApiError, errorMessage, type User } from "@/lib/api";

/**
 * Signed-in home. Access is enforced by the API (every call here needs a live
 * session); this component only reacts to a 401 by sending the visitor to sign in.
 */
export function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .me()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(errorMessage(err));
      });

    return () => {
      active = false;
      setUser(null);
      setError(null);
      setBusy(false);
    };
  }, [router]);

  async function signOut(everywhere: boolean) {
    setBusy(true);
    try {
      await (everywhere ? api.logoutAll() : api.logout());
    } catch {
      // Whatever happened server-side, the user asked to leave: continue to sign-in.
    }
    router.replace("/login");
  }

  return (
    <div className="bg-dots min-h-svh bg-ink font-ui text-foreground selection:bg-gold/30 transition-colors duration-500">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-ink/80 backdrop-blur-[12px] transition-colors duration-500 dark:border-white/5 dark:bg-ink/60">
        <div className="flex h-16 items-center justify-between px-6 md:px-12">
          <Link href="/" className="font-display text-xl font-bold italic text-foreground transition-opacity hover:opacity-90">
            {BRAND}
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user && <span className="hidden text-[11px] uppercase tracking-[0.18em] text-foreground/50 sm:block">{user.email}</span>}
          </div>
        </div>
      </header>

      <main className="flex min-h-svh items-center justify-center px-4 pb-10 pt-24">
        <div className="glass w-full max-w-xl space-y-8 rounded-[32px] p-8 shadow-[0_0_100px_rgba(167,139,113,0.18)] sm:p-10 transition-colors duration-500">
          {error ? (
            <div className="space-y-4 text-center">
              <p role="alert" className="text-sm text-red-600 dark:text-red-200">{error}</p>
              <Link href="/login" className="inline-block text-sm font-semibold text-gold transition-colors duration-300 ease-premium hover:text-gold-hover">
                Back to sign in
              </Link>
            </div>
          ) : !user ? (
            <p role="status" className="animate-pulse text-center text-[11px] uppercase tracking-[0.3em] text-gold">
              Loading
            </p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.35em] text-gold">Dashboard</p>
                <h1 className="mt-4 font-display text-4xl italic leading-tight text-foreground sm:text-5xl">
                  Welcome, <span className="text-gold">{user.name}</span>
                </h1>
                <p className="mt-3 text-sm text-zinc-600 dark:text-gray-400">You are signed in.</p>
              </div>

              <dl className="divide-y divide-black/10 rounded-[24px] border border-black/10 bg-black/[0.02] px-6 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="text-[10px] uppercase tracking-[0.3em] text-gold">Email</dt>
                  <dd className="break-all text-right text-sm text-foreground">{user.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 py-4">
                  <dt className="text-[10px] uppercase tracking-[0.3em] text-gold">Role</dt>
                  <dd className="text-sm capitalize text-foreground">{user.role}</dd>
                </div>
              </dl>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => signOut(false)}
                  className="w-full rounded-full bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-300 ease-premium hover:bg-gold hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gold-hover"
                >
                  {busy ? "Signing out..." : "Sign out"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => signOut(true)}
                  className="w-full rounded-full border border-black/15 px-4 py-3 text-sm font-medium text-foreground transition-colors duration-300 ease-premium hover:border-gold hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/25 dark:text-white dark:hover:border-gold-hover dark:hover:text-gold-hover"
                >
                  Sign out everywhere
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
