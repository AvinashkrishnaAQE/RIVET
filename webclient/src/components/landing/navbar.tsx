import Link from "next/link";
import { BRAND, NAV_LINKS } from "./content";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-ink/80 backdrop-blur-[12px] transition-colors duration-500 dark:border-white/5 dark:bg-ink/60">
      <nav className="mx-auto grid h-16 w-full grid-cols-[1fr_auto] items-center px-6 md:grid-cols-[1fr_auto_1fr] md:px-12" aria-label="Main">
        <Link href="/" className="font-display text-xl font-bold italic text-foreground transition-opacity hover:opacity-90">
          {BRAND}
        </Link>

        <ul className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[11px] uppercase tracking-[0.18em] text-foreground/70 transition-colors duration-300 ease-premium hover:text-gold dark:text-white/60 dark:hover:text-gold-hover"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-self-end gap-3 sm:gap-5">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-[11px] uppercase tracking-[0.18em] text-foreground/70 transition-colors duration-300 ease-premium hover:text-gold dark:text-white/60 dark:hover:text-gold-hover sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-zinc-950 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-premium hover:bg-gold hover:text-white dark:bg-white dark:text-black dark:hover:bg-gold-hover"
          >
            Start Free Trial
          </Link>
        </div>
      </nav>
    </header>
  );
}
