import type { Metadata } from "next";
import { GitHubWebhooksView } from "@/components/webhooks/github-webhooks-view";

export const metadata: Metadata = { title: "GitHub Webhooks" };

export default function GitHubWebhooksPage() {
  return <GitHubWebhooksView />;
}
