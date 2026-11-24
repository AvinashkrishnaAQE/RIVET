import type { InputHTMLAttributes, ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/** Gold emphasis inside a heading, as on the landing page. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-gold">{children}</span>;
}

/** Glass card shared by every auth form. */
export function GlassCard({ title, subtitle, children }: { title: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <div className="glass w-full max-w-md space-y-8 rounded-[32px] p-8 shadow-[0_0_100px_rgba(167,139,113,0.18)] sm:p-10 transition-colors duration-500">
      <div className="text-center">
        <h1 className="font-display text-4xl italic leading-tight text-foreground">{title}</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: ReactNode;
}

/** Underlined input whose label floats up on focus / when filled. */
export function FloatingInput({ id, label, icon, ...props }: FloatingInputProps) {
  return (
    <div className="relative z-0">
      <input
        id={id}
        name={id}
        className="peer block w-full appearance-none border-0 border-b border-black/20 bg-transparent px-0 py-2.5 text-sm text-foreground transition-colors duration-300 ease-premium focus:border-gold focus:outline-none focus:ring-0 autofill:[-webkit-text-fill-color:currentColor] autofill:[transition:background-color_5000s_ease-in-out_0s] dark:border-white/25"
        placeholder=" "
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-zinc-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:left-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-gold dark:text-gray-400"
      >
        <span className="mr-2 -mt-1 inline-block align-middle">{icon}</span>
        {label}
      </label>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex w-full items-center justify-center rounded-full bg-zinc-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-300 ease-premium hover:bg-gold hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gold-hover"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Please wait" />
      ) : (
        <>
          {children}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-premium group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}

/** Inline error / success banner, announced to screen readers. */
export function FormMessage({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

/** Small tracked-out text link used under forms. */
export const authLinkClass = "font-semibold text-gold transition-colors duration-300 ease-premium hover:text-gold-hover";
