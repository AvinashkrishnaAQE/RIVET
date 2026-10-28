import type { ReactNode } from "react";
import { SmokeyBackground } from "@/components/ui/login-form";

/** Full-screen smoky shader with a centred card on top; the frame for every auth page. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-svh w-full bg-gray-900">
      <SmokeyBackground className="absolute inset-0" />
      <div className="relative z-10 flex min-h-svh w-full items-center justify-center p-4">{children}</div>
    </main>
  );
}
