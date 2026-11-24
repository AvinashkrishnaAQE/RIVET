"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

/** "Join Digest" sign-up. */
export function NewsletterForm() {
  const [note, setNote] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNote("The digest isn't live yet. Check back soon.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center rounded-full border border-black/10 bg-black/[0.03] py-1.5 pl-5 pr-1.5 transition-colors duration-300 ease-premium focus-within:border-gold/50 dark:border-white/10 dark:bg-white/[0.04]">
        <label htmlFor="digest-email" className="sr-only">
          Email address
        </label>
        <input
          id="digest-email"
          type="email"
          required
          placeholder="Your email"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Join the digest"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm transition-colors duration-300 ease-premium hover:bg-gold dark:bg-white dark:text-black dark:hover:bg-gold-hover"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {note && (
        <p role="status" className="text-xs text-zinc-600 dark:text-gray-400">
          {note}
        </p>
      )}
    </form>
  );
}
