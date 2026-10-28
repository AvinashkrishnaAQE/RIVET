import Link from "next/link";
import { BRAND, NAV_LINKS } from "./content";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink/60 backdrop-blur-[10px]">
      <nav className="mx-auto grid h-16 w-full grid-cols-[1fr_auto] items-center px-6 md:grid-cols-[1fr_auto_1fr] md:px-12" aria-label="Main">
        <Link href="/" className="font-display text-xl font-bold italic text-white">
          {BRAND}
        </Link>

        <ul className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-[11px] uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 ease-premium hover:text-gold-hover">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-self-end gap-5">
          <Link href="/login" className="hidden text-[11px] uppercase tracking-[0.18em] text-white/60 transition-colors duration-300 ease-premium hover:text-gold-hover sm:block">
            Sign in
          </Link>
          <Link href="/register" className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black transition-colors duration-300 ease-premium hover:bg-gold-hover">
            Start Free Trial
          </Link>
        </div>
      </nav>
    </header>
  );
}
