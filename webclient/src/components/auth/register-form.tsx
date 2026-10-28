"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Accent, FloatingInput, FormMessage, GlassCard, SubmitButton, authLinkClass } from "./auth-form-parts";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // See LoginForm: the router keeps this page's state alive, so loading must end by itself.
  const [navigating, startNavigation] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.register(name, email, password); // registering also signs the user in
      setName("");
      setEmail("");
      setPassword("");
      startNavigation(() => router.push("/dashboard"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard title={<>Create your <Accent>account</Accent></>} subtitle="Sign up to get started">
      <form className="space-y-8" onSubmit={handleSubmit}>
        {error && <FormMessage kind="error">{error}</FormMessage>}

        <FloatingInput id="name" type="text" label="Full Name" icon={<User size={16} />} autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} required />
        <FloatingInput id="email" type="email" label="Email Address" icon={<Mail size={16} />} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div>
          <FloatingInput id="password" type="password" label="Password" icon={<Lock size={16} />} autoComplete="new-password" minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="mt-2 text-xs text-gray-400">At least 10 characters.</p>
        </div>

        <SubmitButton loading={submitting || navigating}>Create Account</SubmitButton>
      </form>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className={authLinkClass}>
          Sign In
        </Link>
      </p>
    </GlassCard>
  );
}
