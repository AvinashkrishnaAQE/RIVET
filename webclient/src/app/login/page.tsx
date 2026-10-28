import type { Metadata } from "next";
import { SmokeyBackground, LoginForm } from "@/components/ui/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-svh w-full bg-gray-900">
      <SmokeyBackground className="absolute inset-0" />
      <div className="relative z-10 flex min-h-svh w-full items-center justify-center p-4">
        <LoginForm />
      </div>
    </main>
  );
}
