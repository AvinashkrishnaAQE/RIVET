import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/ui/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell>
      {/* useSearchParams needs a Suspense boundary so the rest of the page can prerender. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
