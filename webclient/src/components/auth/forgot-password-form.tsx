"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Accent, FloatingInput, FormMessage, GlassCard, SubmitButton, authLinkClass } from "./auth-form-parts";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message); // identical whether or not the account exists
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard title={<>Reset your <Accent>password</Accent></>} subtitle="We'll email you a reset link">
      <form className="space-y-8" onSubmit={handleSubmit}>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        {message && <FormMessage kind="success">{message}</FormMessage>}

        <FloatingInput id="email" type="email" label="Email Address" icon={<Mail size={16} />} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <SubmitButton loading={loading}>Send Reset Link</SubmitButton>
      </form>

      <p className="text-center text-xs text-gray-400">
        <Link href="/login" className={authLinkClass}>
          Back to Sign In
        </Link>
      </p>
    </GlassCard>
  );
}
