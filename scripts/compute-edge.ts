/**
 * Compute trading edge for one or more market outcomes and feed the Agent TUI's
 * Edge View. Read-only on-chain (no gas).
 *
 *   edge = your probability − the market's live implied probability
 *
 * A positive edge means the outcome looks underpriced relative to your view (a
 * buy candidate); a negative edge means it looks overpriced (sell / avoid). Run
 * this whenever you're deciding whether to buy or sell a market — the printed
 * edge is the signal, and each computed edge is persisted so it shows up in the
 * Agent TUI's Edge View, ranked by the size of the gap.
 *
 * Usage:
 *   npx tsx scripts/compute-edge.ts <market-address> <outcome-idx> <your-prob> [<market> <outcome> <prob> ...]
 *
 *   <your-prob>  your estimated probability for that outcome: 0–1 (e.g. 0.30)
 *                or a percent (e.g. 30). Pass one (market, outcome, prob) triple
 *                per outcome you have a view on.
 *
 * Examples:
 *   npx tsx scripts/compute-edge.ts 0x1234…abcd 1 0.30
 *   npx tsx scripts/compute-edge.ts 0x1234…abcd 1 30  0x5678…ef01 0 0.62
 *
 * Persists to $DELPHI_AGENT_EDGES (default ~/.delphi/agent-edges.jsonl).
 */
import { isAddress } from "viem";
import { client } from "./client.js";
import { appendAgentEdge } from "./agent-tui/edges.js";

const args = process.argv.slice(2);
if (args.length < 3 || args.length % 3 !== 0) {
  console.error(
    "Usage: npx tsx scripts/compute-edge.ts <market-address> <outcome-idx> <your-prob> [<market> <outcome> <prob> ...]",
  );
  console.error("  <your-prob> = your probability, 0–1 (e.g. 0.30) or a percent (e.g. 30)");
  process.exit(1);
}

const normProb = (s: string): number => {
  let p = Number(s);
  if (!Number.isFinite(p)) return NaN;
  if (p > 1) p = p / 100; // accept 30 as 0.30
  return Math.max(0, Math.min(1, p));
};

const pct = (n?: number) => (n === undefined ? "—" : (n * 100).toFixed(2) + "%");
const signedPct = (n: number) => (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";

for (let i = 0; i < args.length; i += 3) {
  const marketAddress = args[i] as `0x${string}`;
  const outcomeIdx = Number(args[i + 1]);
  const prob = normProb(args[i + 2]);
  if (!isAddress(marketAddress ?? "") || !Number.isInteger(outcomeIdx) || Number.isNaN(prob)) {
    console.error(`Skipping invalid triple: "${args[i]} ${args[i + 1]} ${args[i + 2]}"`);
    continue;
  }

  const market = await client.getMarket({ id: marketAddress, pricesAndImpliedProbabilities: true });
  const outcomes: string[] = market.metadata?.outcomes ?? [];
  const question: string = market.metadata?.question ?? marketAddress;
  const marketProb = market.spotImpliedProbabilities?.[outcomeIdx];
  const outcome = outcomes[outcomeIdx] ?? `#${outcomeIdx}`;
  const edge = marketProb !== undefined ? prob - marketProb : undefined;

  appendAgentEdge({ ts: Date.now(), market: marketAddress, outcomeIdx, prob, marketProb, question, outcome });

  console.log("");
  console.log(question);
  console.log(`  outcome:     [${outcomeIdx}] ${outcome}`);
  console.log(`  your prob:   ${pct(prob)}`);
  console.log(`  market prob: ${pct(marketProb)}`);
  if (edge === undefined) {
    console.log(`  edge:        —  (market has no implied probability for this outcome)`);
  } else {
    const dir = edge > 0 ? "underpriced — buy candidate" : edge < 0 ? "overpriced — sell / avoid" : "fairly priced";
    console.log(`  edge:        ${signedPct(edge)}  (${dir})`);
  }
}

console.log("");
console.log("Edges saved to the Edge View — see it in: npx tsx scripts/agent-tui/index.tsx");
