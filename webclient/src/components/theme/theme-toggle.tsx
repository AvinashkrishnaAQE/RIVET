"use client";

import { useTheme } from "./theme-provider";

interface ThemeToggleProps {
  className?: string;
  variant?: "segmented" | "button";
}

/**
 * Sun Icon with animated radial rays.
 */
function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.25" />
      <line x1="12" y1="1.5" x2="12" y2="3.5" />
      <line x1="12" y1="20.5" x2="12" y2="22.5" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1.5" y1="12" x2="3.5" y2="12" />
      <line x1="20.5" y1="12" x2="22.5" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/**
 * Moon Icon with luxury crescent curve and star glint.
 */
function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <circle cx="17.5" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="19" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeToggle({ className = "", variant = "segmented" }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, setTheme, isMounted } = useTheme();

  // Guard against SSR hydration mismatches
  const isDark = isMounted ? resolvedTheme === "dark" : true;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
        title={`Switch to ${isDark ? "light" : "dark"} theme`}
        className={`group relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black/5 backdrop-blur-[10px] transition-all duration-300 ease-premium hover:border-gold hover:shadow-[0_0_15px_rgba(167,139,113,0.3)] active:scale-95 dark:border-white/15 dark:bg-white/5 dark:hover:border-gold-hover ${className}`}
      >
        <span className="sr-only">Toggle theme</span>
        <div className="relative flex items-center justify-center">
          <span
            className={`transition-all duration-500 ease-premium ${
              isDark
                ? "scale-100 rotate-0 opacity-100 text-gold"
                : "scale-0 rotate-90 opacity-0 text-muted-foreground absolute"
            }`}
          >
            <MoonIcon className="h-4 w-4" />
          </span>
          <span
            className={`transition-all duration-500 ease-premium ${
              isDark
                ? "scale-0 -rotate-90 opacity-0 text-muted-foreground absolute"
                : "scale-100 rotate-0 opacity-100 text-gold"
            }`}
          >
            <SunIcon className="h-4 w-4" />
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme switcher"
      className={`relative inline-flex items-center rounded-full border border-black/10 bg-black/[0.04] p-1 backdrop-blur-[12px] transition-colors duration-300 dark:border-white/10 dark:bg-white/[0.05] ${className}`}
    >
      {/* Animated Sliding Pill Thumb */}
      <span
        className={`pointer-events-none absolute h-7 w-7 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08),0_0_15px_rgba(150,109,61,0.25)] transition-transform duration-300 ease-out dark:bg-zinc-800 dark:shadow-[0_0_16px_rgba(167,139,113,0.35)] ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
        aria-hidden="true"
      />

      {/* Light Option Button */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        title="Light theme"
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          !isDark
            ? "text-gold font-semibold"
            : "text-zinc-500 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white/80"
        }`}
      >
        <SunIcon className={`h-3.5 w-3.5 transition-transform duration-300 ${!isDark ? "scale-110" : "scale-95"}`} />
      </button>

      {/* Dark Option Button */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        title="Dark theme"
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          isDark
            ? "text-gold font-semibold"
            : "text-zinc-500 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white/80"
        }`}
      >
        <MoonIcon className={`h-3.5 w-3.5 transition-transform duration-300 ${isDark ? "scale-110" : "scale-95"}`} />
      </button>
    </div>
  );
}
