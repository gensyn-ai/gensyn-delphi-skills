/**
 * List markets.
 * Usage: npx tsx scripts/list-markets.ts [status] [category] [limit]
 *   status   - open | awaiting_settlement | settled | expired | failed  (default: open)
 *   category - e.g. crypto, weather     (default: all)
 *   limit    - number of results        (default: 20)
 *
 * Examples:
 *   npx tsx scripts/list-markets.ts
 *   npx tsx scripts/list-markets.ts open crypto
 *   npx tsx scripts/list-markets.ts settled "" 50
 *
 * Competition: set DELPHI_NETWORK=competition-testnet. Markets default to the
 * active competition; set DELPHI_COMPETITION_ID=<uuid> to read a specific one.
 */
import type { MarketStatus } from "@gensyn-ai/gensyn-delphi-sdk";
import { client, competitionId, competitionScope, isCompetition, collateralSymbol } from "./client.js";

// `failed` = automated settlement ran but could not resolve the question —
// no winning outcome; recover with liquidate(), same as expired.
const status = (process.argv[2] ?? "open") as MarketStatus;
const category = process.argv[3] || undefined;
const limit = Number(process.argv[4] ?? 20);

const { markets } = await client.listMarkets({ status, category, limit, skip: 0, ...competitionScope, pricesAndImpliedProbabilities: true });

if (!markets || markets.length === 0) {
  console.log("No markets found.");
  if (isCompetition && competitionId === undefined) {
    console.log("(Competition network with no DELPHI_COMPETITION_ID set — this reads the *active*");
    console.log(" competition, which may be unset or empty. Set DELPHI_COMPETITION_ID=<uuid> to pick one.)");
  }
  process.exit(0);
}

console.log("Found " + markets.length + " market(s) [status=" + status + "]:\n");
for (const m of markets) {
  const meta = m.metadata;
  const outcomes = meta?.outcomes ?? [];
  console.log("ID:       " + m.id);
  console.log("URL:      " + m.marketUrl);
  console.log("Question: " + (meta?.question ?? "(no metadata)"));
  console.log("Category: " + (m.category ?? "—"));
  console.log("Status:   " + m.status);
  console.log("Created:  " + new Date(m.createdAt).toLocaleString());
  console.log("Settled:  " + (m.settledAt ? new Date(m.settledAt).toLocaleString() : "—"));
  if (outcomes.length > 0 && m.spotPrices && m.spotImpliedProbabilities) {
    for (let i = 0; i < outcomes.length; i++) {
      console.log("  [" + outcomes[i] + "] " + (m.spotImpliedProbabilities[i] * 100).toFixed(1) + "% | " + m.spotPrices[i].toFixed(4) + " " + collateralSymbol + "/share");
    }
  }
  console.log("---");
}
