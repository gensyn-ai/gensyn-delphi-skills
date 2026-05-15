/**
 * Get a single market with live on-chain prices and implied probabilities.
 * Usage: npx tsx scripts/get-market.ts <market-id>
 *
 * Example:
 *   npx tsx scripts/get-market.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 */
import { client } from "./client.js";

const marketId = process.argv[2];
if (!marketId) {
  console.error("Usage: npx tsx scripts/get-market.ts <market-id>");
  process.exit(1);
}

const market = await client.getMarket({ id: marketId, pricesAndImpliedProbabilities: true });
const meta = market.metadata; // typed as MarketMetadata | null via the Market type
const outcomes = meta?.outcomes ?? [];

console.log("ID:       " + market.id);
console.log("URL:      " + market.marketUrl);
console.log("Question: " + (meta?.question ?? "(no metadata)"));
console.log("Category: " + (market.category ?? "—"));
console.log("Status:   " + market.status);
console.log("Outcomes: " + (outcomes.join(" / ") || "—"));
console.log("Created:  " + new Date(market.createdAt).toLocaleString());
console.log("Settled:  " + (market.settledAt ? new Date(market.settledAt).toLocaleString() : "—"));

if (outcomes.length > 0 && market.spotPrices && market.spotImpliedProbabilities) {
  console.log("\nLive prices:");
  for (let i = 0; i < outcomes.length; i++) {
    console.log("  [" + i + "] " + outcomes[i]);
    console.log("      Spot price:   " + market.spotPrices[i].toFixed(4) + " USDC/share");
    console.log("      Implied prob: " + (market.spotImpliedProbabilities[i] * 100).toFixed(2) + "%");
  }
}
