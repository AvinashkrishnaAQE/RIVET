import type { InputHTMLAttributes, ReactNode } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/** Frosted-glass card shared by every auth form. */
export function GlassCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-gray-300">{subtitle}</p>
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
        className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
        placeholder=" "
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
      >
        <span className="inline-block mr-2 -mt-1 align-middle">{icon}</span>
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
      className="group w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Please wait" />
      ) : (
        <>
          {children}
          <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}

/** Inline error / success banner, announced to screen readers. */
export function FormMessage({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "bg-red-500/15 border-red-400/40 text-red-200"
      : "bg-green-500/15 border-green-400/40 text-green-200";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
