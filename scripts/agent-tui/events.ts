/** Shared agent-event log: a JSONL file the agent appends traceable events to and
 * the Agent TUI tails. Single source of truth for the path so the logger script
 * and the TUI always agree. One JSON object per line: { ts, type, text, ... }. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AgentEvent {
  ts: number; // epoch ms
  type: string; // BUY | SELL | LIQUIDATE | REDEEM | SKIP | THINK
  text: string;
  [k: string]: unknown;
}

export function agentLogPath(): string {
  return process.env.DELPHI_AGENT_LOG ?? path.join(os.homedir(), ".delphi", "agent-events.jsonl");
}

/** Read the most recent `limit` events from the log. Missing file → []. Bad lines
 * are skipped. Returns chronological order (oldest first) for tail rendering. */
export function readAgentEvents(limit = 300): AgentEvent[] {
  let raw: string;
  try {
    raw = fs.readFileSync(agentLogPath(), "utf8");
  } catch {
    return [];
  }
  const out: AgentEvent[] = [];
  for (const line of raw.split("\n").slice(-limit)) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e && typeof e === "object" && typeof e.ts === "number") out.push(e as AgentEvent);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}
