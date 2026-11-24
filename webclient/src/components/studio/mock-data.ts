import { Agent, ActivityFeedItem, ChatMessage, Project, QACheck } from "./types";

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Client Logistics Portal",
    client: "Nordic Logistics",
    stage: "Generating Build",
    status: "building",
    progress: 76,
    branch: "main",
    stack: ["Next.js 15", "Framer Motion", "Postgres"],
  },
  {
    id: "p2",
    name: "Veloce Pay App",
    client: "Veloce FinTech",
    stage: "Active Build",
    status: "building",
    progress: 64,
    branch: "feat/stripe-v2",
    stack: ["React Native", "Rust Core", "Stripe"],
  },
  {
    id: "p3",
    name: "Kinetix Health EHR",
    client: "Kinetix Biotech",
    stage: "QA Staging",
    status: "staged",
    progress: 100,
    branch: "staging-v3",
    stack: ["TypeScript", "HIPAA Vault", "GraphQL"],
  },
  {
    id: "p4",
    name: "Apex Retail OS",
    client: "Apex Commerce",
    stage: "QA Staging",
    status: "staged",
    progress: 94,
    branch: "rc-1.8",
    stack: ["Tailwind", "Edge CDN", "Redis"],
  },
];

export const INITIAL_AGENTS: Record<string, Agent> = {
  intake: {
    id: "intake",
    name: "Intake Strategist",
    role: "Scope & PRD Extraction",
    status: "Active",
    color: "cyan",
    latency: "0.8s",
    tasks: 312,
    success: "99.8%",
    currentTask: "Extracting functional requirements & user flows from client brief.",
  },
  architect: {
    id: "architect",
    name: "System Architect",
    role: "Schema & API Topology",
    status: "Running",
    color: "gold",
    latency: "1.2s",
    tasks: 298,
    success: "99.5%",
    currentTask: "Compiling relational Postgres schema and REST/GraphQL contract.",
  },
  frontend: {
    id: "frontend",
    name: "Frontend Motion",
    role: "UI & 60fps Animations",
    status: "Running",
    color: "purple",
    latency: "1.5s",
    tasks: 410,
    success: "99.2%",
    currentTask: "Generating spring-physics cards and kinetic route transitions.",
  },
  backend: {
    id: "backend",
    name: "Backend & DB",
    role: "Endpoints & Webhooks",
    status: "Running",
    color: "emerald",
    latency: "1.1s",
    tasks: 345,
    success: "99.6%",
    currentTask: "Wiring Stripe webhooks, auth middleware, and edge caching.",
  },
  qa: {
    id: "qa",
    name: "Security QA",
    role: "E2E & Vulnerability Scan",
    status: "Queued",
    color: "amber",
    latency: "2.1s",
    tasks: 274,
    success: "99.9%",
    currentTask: "Running 142 Playwright E2E checks & dependency audit.",
  },
  shipper: {
    id: "shipper",
    name: "Release Shipper",
    role: "Edge Deploy & Handoff",
    status: "Standby",
    color: "gold",
    latency: "0.9s",
    tasks: 182,
    success: "100%",
    currentTask: "Preparing production URL, repo bundle, and client handoff.",
  },
};

export const INITIAL_MESSAGES: ChatMessage[] = [];

export const INITIAL_ACTIVITY: ActivityFeedItem[] = [];

export const INITIAL_QA_CHECKS: QACheck[] = [
  { id: "qa1", name: "End-to-End Playwright Suite", detail: "142 / 142 user flows passing", duration: "3m 12s", status: "PASS" },
  { id: "qa2", name: "Security & Dependency Audit", detail: "0 vulnerabilities across 142 packages", duration: "0m 44s", status: "PASS" },
  { id: "qa3", name: "TypeScript & AST Linter", detail: "Strict mode clean, zero unused exports", duration: "0m 18s", status: "PASS" },
  { id: "qa4", name: "60fps Animation Frame Budget", detail: "0 dropped frames on mobile & desktop", duration: "1m 05s", status: "PASS" },
];
