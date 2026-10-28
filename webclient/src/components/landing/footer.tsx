import Link from "next/link";
import { BRAND, FOOTER_COLUMNS } from "./content";
import { NewsletterForm } from "./newsletter-form";

// Brand marks are drawn inline: lucide-react no longer ships them.
const SOCIALS = [
  { label: "X", viewBox: "0 0 24 24", d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { label: "GitHub", viewBox: "0 0 16 16", d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" },
  { label: "LinkedIn", viewBox: "0 0 24 24", d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" className="font-display text-2xl font-bold italic text-white">
            {BRAND}
          </Link>
          <p className="mt-4 max-w-[16rem] text-sm leading-relaxed text-gray-400">Intelligence, connected to everything you create.</p>
          <div className="mt-6 flex gap-3">
            {/* Placeholder "#" targets: point these at the real profiles. */}
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors duration-300 ease-premium hover:border-gold-hover hover:text-gold-hover"
              >
                <svg viewBox={social.viewBox} className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d={social.d} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-[10px] uppercase tracking-[0.3em] text-gold">{column.title}</h2>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-gray-400 transition-colors duration-300 ease-premium hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-gold">Join Digest</h2>
          <p className="mb-5 mt-5 text-sm text-gray-400">Occasional notes on what we&apos;re building.</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-white/5 px-6 py-6 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
        © {BRAND}. All rights reserved.
      </div>
    </footer>
  );
}
