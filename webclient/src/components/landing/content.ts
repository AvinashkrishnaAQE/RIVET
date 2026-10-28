import { BrainCircuit, Workflow, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

/**
 * All landing-page copy lives here. Everything below is PLACEHOLDER content written
 * to fit the design -- replace it with the real product's wording, prices and people.
 */

export const BRAND = "ReViT";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Team", href: "#team" },
];

export type ArtVariant = "concept" | "audio" | "graph" | "code" | "portrait";

export interface Satellite {
  label: string;
  title: string;
  art: ArtVariant;
  side: "left" | "right";
  /** Where the connecting line meets the central card, as a fraction of its height. */
  anchor: number;
  className: string;
  delay: string;
}

export const SATELLITES: Satellite[] = [
  { label: "Studio", title: "Concept board", art: "concept", side: "left", anchor: 0.28, className: "left-0 top-[1%] w-[300px]", delay: "0s" },
  { label: "Voice", title: "Audio lab", art: "audio", side: "left", anchor: 0.74, className: "left-[3%] bottom-[1%] w-[240px]", delay: "-2.5s" },
  { label: "Research", title: "Knowledge graph", art: "graph", side: "right", anchor: 0.3, className: "right-0 top-[7%] w-[260px]", delay: "-1.2s" },
  { label: "Build", title: "Code canvas", art: "code", side: "right", anchor: 0.72, className: "right-[1%] bottom-[0%] w-[250px]", delay: "-4s" },
];

export interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

export const FEATURES: Feature[] = [
  { icon: BrainCircuit, title: "Adaptive agents", body: "Specialist agents that learn how your team works and hand tasks to each other without friction." },
  { icon: Workflow, title: "Connected workflows", body: "Wire sources, models and tools into one living graph, then watch work flow through it in real time." },
  { icon: ShieldCheck, title: "Private by design", body: "Your data stays yours. Granular access, encrypted storage and a full audit trail on every action." },
  { icon: Zap, title: "Instant collaboration", body: "Co-create with teammates and agents in the same canvas, with changes synced as they happen." },
];

export interface Plan {
  name: string;
  blurb: string;
  monthly: number;
  /** Per-month price when billed annually. */
  annual: number;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  { name: "Starter", blurb: "For exploring ideas on your own.", monthly: 0, annual: 0, cta: "Start for free", features: ["1 workspace", "3 active agents", "Community support"] },
  { name: "Pro", blurb: "For creators who ship every week.", monthly: 29, annual: 23, cta: "Start Free Trial", highlighted: true, features: ["Unlimited workspaces", "25 active agents", "Priority models", "Version history"] },
  { name: "Team", blurb: "For teams building together.", monthly: 99, annual: 79, cta: "Start Free Trial", features: ["Everything in Pro", "Shared agent library", "SSO & audit log", "Dedicated support"] },
];

export interface TeamMember {
  name: string;
  role: string;
  /** Path under /public (e.g. "/team/avinash.jpg"). Omit to show placeholder art. */
  image?: string;
}

export const TEAM: TeamMember[] = [
  { name: "Avinash", role: "Co-founder" },
  { name: "Yash", role: "Co-founder" },
];

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Team", href: "#team" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "Forgot password", href: "/forgot-password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];
