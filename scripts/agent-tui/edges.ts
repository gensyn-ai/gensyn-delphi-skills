/** Shared agent-edge store: a JSONL file the `compute-edge` script appends edge
 * estimates to and the Agent TUI's Edge View reads. Single source of truth for
 * the path so the script and the TUI always agree. One JSON object per line:
 * { ts, market, outcomeIdx, prob, marketProb?, question?, outcome? }.
 *
 * The agent's probability (`prob`) is the source of truth. The Edge View re-joins
 * it against the *live* market-implied probability from the current snapshot so
 * the displayed edge stays current between `compute-edge` runs; `marketProb` /
 * `question` / `outcome` are cached at compute time only as a display fallback
 * for markets that aren't in the open-markets snapshot. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface AgentEdge {
  ts: number; // epoch ms
  market: string; // market id / proxy address
  outcomeIdx: number;
  prob: number; // agent's probability for the outcome, 0..1
  marketProb?: number; // market-implied prob captured at compute time
  question?: string; // cached question label (display fallback)
  outcome?: string; // cached outcome label (display fallback)
}

export function agentEdgePath(): string {
  return process.env.DELPHI_AGENT_EDGES ?? path.join(os.homedir(), ".delphi", "agent-edges.jsonl");
}

/** Read the most recent `limit` edge entries. Missing file → []. Bad lines are
 * skipped. Returns chronological order (oldest first). */
export function readAgentEdges(limit = 500): AgentEdge[] {
  let raw: string;
  try {
    raw = fs.readFileSync(agentEdgePath(), "utf8");
  } catch {
    return [];
  }
  const out: AgentEdge[] = [];
  for (const line of raw.split("\n").slice(-limit)) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e && typeof e === "object" && typeof e.ts === "number" && e.market != null) out.push(e as AgentEdge);
    } catch {
      /* skip malformed line */
    }
  }
  return out;
}

/** Append one edge entry to the store, creating the directory/file if needed. */
export function appendAgentEdge(edge: AgentEdge): void {
  const p = agentEdgePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, JSON.stringify(edge) + "\n");
}
