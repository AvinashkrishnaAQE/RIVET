"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      // Cache Components keeps this page's state alive after navigating away and
      // re-runs the effect when it is shown again. Without this reset the next
      // visit starts with the previous one's state: `busy` still true (buttons
      // disabled until a refresh) and the previous user's name on screen.
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
    <main className="flex min-h-svh w-full items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        {error ? (
          <p role="alert" className="text-center text-sm text-red-200">{error}</p>
        ) : !user ? (
          <p className="text-center text-sm text-gray-300">Loading…</p>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Welcome, {user.name}</h1>
              <p className="mt-2 text-sm text-gray-300">You are signed in.</p>
            </div>

            <dl className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-white break-all">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Role</dt>
                <dd className="text-white capitalize">{user.role}</dd>
              </div>
            </dl>

            <div className="space-y-3">
              <button
                onClick={() => signOut(false)}
                disabled={busy}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign out
              </button>
              <button
                onClick={() => signOut(true)}
                disabled={busy}
                className="w-full rounded-lg border border-white/20 px-4 py-2.5 text-sm text-gray-200 transition hover:bg-white/10 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign out of all devices
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
