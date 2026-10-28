"use client";

import { useRouter } from "next/navigation";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

/**
 * Landing-page call to action. Navigates with the router rather than wrapping the
 * button in a <Link>: LiquidButton renders decorative siblings that `asChild`
 * cannot merge into a single element, and a <button> inside an <a> is invalid HTML.
 */
export function GetStartedButton() {
  const router = useRouter();

  return (
    <LiquidButton
      className="text-white border rounded-full"
      size="xl"
      onMouseEnter={() => router.prefetch("/login")}
      onClick={() => router.push("/login")}
    >
      Get Started
    </LiquidButton>
  );
}
