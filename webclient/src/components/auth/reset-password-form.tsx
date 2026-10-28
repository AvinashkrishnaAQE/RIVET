"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Accent, FloatingInput, FormMessage, GlassCard, SubmitButton, authLinkClass } from "./auth-form-parts";

/** Landing page for the link in the reset email: /reset-password?token=... */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard title={<>Choose a <Accent>new</Accent> password</>} subtitle="Pick something only you would know">
      {!token ? (
        <FormMessage kind="error">This reset link is incomplete. Request a new one.</FormMessage>
      ) : done ? (
        <FormMessage kind="success">Your password has been changed. You can now sign in.</FormMessage>
      ) : (
        <form className="space-y-8" onSubmit={handleSubmit}>
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div>
            <FloatingInput id="password" type="password" label="New Password" icon={<Lock size={16} />} autoComplete="new-password" minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="mt-2 text-xs text-gray-400">At least 10 characters.</p>
          </div>
          <SubmitButton loading={loading}>Change Password</SubmitButton>
        </form>
      )}

      <p className="text-center text-xs text-gray-400">
        <Link href={done ? "/login" : "/forgot-password"} className={authLinkClass}>
          {done ? "Go to Sign In" : "Request a new link"}
        </Link>
      </p>
    </GlassCard>
  );
}
