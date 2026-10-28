"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

/** "Join Digest" sign-up. There is no newsletter backend yet, so it says so instead of pretending. */
export function NewsletterForm() {
  const [note, setNote] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNote("The digest isn't live yet. Check back soon.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-5 pr-1.5 transition-colors duration-300 ease-premium focus-within:border-gold/50">
        <label htmlFor="digest-email" className="sr-only">
          Email address
        </label>
        <input
          id="digest-email"
          type="email"
          required
          placeholder="Your email"
          autoComplete="email"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Join the digest"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors duration-300 ease-premium hover:bg-gold-hover"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {note && (
        <p role="status" className="text-xs text-gray-400">
          {note}
        </p>
      )}
    </form>
  );
}
