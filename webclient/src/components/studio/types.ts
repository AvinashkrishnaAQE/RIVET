export type StudioView = "chat" | "dashboard" | "metrics" | "staging" | "shipments";

export interface Project {
  id: string;
  name: string;
  client: string;
  stage: string;
  status: "building" | "staged";
  progress: number;
  branch: string;
  stack: string[];
}

export type AgentId = "intake" | "architect" | "frontend" | "backend" | "qa" | "shipper";

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  status: "Active" | "Running" | "Queued" | "Standby";
  color: "cyan" | "emerald" | "purple" | "amber" | "gold";
  latency: string;
  tasks: number;
  success: string;
  currentTask: string;
}

export interface AgentProgressCard {
  name: string;
  status: "Active" | "Completed" | "Queued";
  progress: number;
  detail: string;
  color: "emerald" | "purple" | "cyan" | "gold";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  time: string;
  text: string;
  agentCards?: AgentProgressCard[];
}

export interface ActivityFeedItem {
  id: string;
  time: string;
  agent: string;
  msg: string;
  type: "ok" | "info" | "warn";
}

export interface QACheck {
  id: string;
  name: string;
  detail: string;
  duration: string;
  status: "PASS" | "RUNNING" | "QUEUED";
}

export interface ToastItem {
  id: string;
  message: string;
  tone?: "gold" | "emerald" | "cyan";
}
