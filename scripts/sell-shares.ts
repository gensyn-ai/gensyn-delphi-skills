/**
 * Sell outcome shares on a market (on-chain).
 * Usage: npx tsx scripts/sell-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]
 *   slippage-pct defaults to 2 (2%)
 *
 * Example:
 *   npx tsx scripts/sell-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 5
 *   npx tsx scripts/sell-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 5 5
 */
import { client, toUsdc, sharesToBigint } from "./client.js";

const [, , addr, idxStr, sharesStr, slippageStr] = process.argv;
if (!addr || !idxStr || !sharesStr) {
  console.error("Usage: npx tsx scripts/sell-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const outcomeIdx = Number(idxStr);
const sharesIn = sharesToBigint(Number(sharesStr));
const slippage = Number(slippageStr ?? 2);

// 1. Quote
const { tokensOut } = await client.quoteSell({ marketAddress, outcomeIdx, sharesIn });
const minTokensOut = tokensOut * BigInt(100 - slippage) / 100n;

console.log("Market:    " + marketAddress);
console.log("Outcome:   " + outcomeIdx);
console.log("Shares:    " + sharesStr);
console.log("Payout:    " + toUsdc(tokensOut));
console.log("Min payout (" + slippage + "% slippage): " + toUsdc(minTokensOut));

// 2. Sell
console.log("\nSubmitting sell transaction...");
const { transactionHash } = await client.sellShares({ marketAddress, outcomeIdx, sharesIn, minTokensOut });
console.log("Transaction: " + transactionHash);
console.log("Done.");
