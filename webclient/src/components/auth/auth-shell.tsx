import type { ReactNode } from "react";
import Link from "next/link";
import { SmokeyBackground } from "@/components/ui/login-form";
import { BRAND } from "@/components/landing/content";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Frame for every auth page, matching the landing page: near-black/ivory with the dot
 * grid, a gold smoke shader behind a centred glass card, and the logo and theme toggle.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-dots relative min-h-svh w-full overflow-hidden bg-ink font-ui text-foreground selection:bg-gold/30 transition-colors duration-500">
      <SmokeyBackground className="absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-ink/75 dark:bg-ink/55 transition-colors duration-500" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="font-display text-xl font-bold italic text-foreground transition-opacity hover:opacity-90">
          {BRAND}
        </Link>
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex min-h-svh w-full items-center justify-center px-4 pb-10 pt-24">{children}</div>
    </main>
  );
}
