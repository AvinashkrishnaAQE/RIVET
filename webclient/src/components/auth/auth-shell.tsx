import type { ReactNode } from "react";
import Link from "next/link";
import { SmokeyBackground } from "@/components/ui/login-form";
import { BRAND } from "@/components/landing/content";

/**
 * Frame for every auth page, matching the landing page: near-black with the dot
 * grid, a dimmed gold smoke shader behind a centred glass card, and the logo
 * linking back home.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-dots relative min-h-svh w-full overflow-hidden bg-ink font-ui text-white selection:bg-gold/30">
      <SmokeyBackground className="absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-20 px-6 py-5 md:px-12">
        <Link href="/" className="font-display text-xl font-bold italic text-white">
          {BRAND}
        </Link>
      </header>

      <div className="relative z-10 flex min-h-svh w-full items-center justify-center px-4 pb-10 pt-24">{children}</div>
    </main>
  );
}
