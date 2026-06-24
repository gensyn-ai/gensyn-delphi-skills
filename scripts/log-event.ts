/**
 * Append one traceable event to the agent event log (JSONL) that the Agent TUI
 * tails and renders in its Agent Logs panel. Use at meaningful moments — a
 * decision or an action — not every step.
 *
 * Usage: npx tsx scripts/log-event.ts <type> "<message>"
 *   <type>  = BUY | SELL | LIQUIDATE | REDEEM | SKIP | THINK
 *             THINK = your reasoning/why; the rest = the action you took.
 *             Case-insensitive; normalised to upper case.
 *
 * Examples:
 *   npx tsx scripts/log-event.ts THINK "BTC move too far for the time left → taking NO"
 *   npx tsx scripts/log-event.ts BUY "10 NO on BTC $99,999 — validating edge with small testnet size"
 *   npx tsx scripts/log-event.ts SKIP "Wild Pandas: spread too wide, no edge — passing"
 *
 * Writes to $DELPHI_AGENT_LOG (default ~/.delphi/agent-events.jsonl).
 */
import fs from "node:fs";
import path from "node:path";
import { agentLogPath } from "./agent-tui/events.js";

const TYPES = ["BUY", "SELL", "LIQUIDATE", "REDEEM", "SKIP", "THINK"] as const;

const argv = process.argv.slice(2);
const type = (argv[0] ?? "").toUpperCase();
if (!type || !TYPES.includes(type as (typeof TYPES)[number])) {
  console.error(`usage: npx tsx scripts/log-event.ts <type> "<message>"`);
  console.error(`  <type> = ${TYPES.join(" | ")}`);
  process.exit(1);
}

const text = argv.slice(1).join(" ");
const event: Record<string, unknown> = { ts: Date.now(), type, text };

const p = agentLogPath();
fs.mkdirSync(path.dirname(p), { recursive: true });
fs.appendFileSync(p, JSON.stringify(event) + "\n");
