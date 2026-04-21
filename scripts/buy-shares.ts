/**
 * Buy outcome shares on a market (on-chain, with auto USDC approval).
 * Usage: npx tsx scripts/buy-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]
 *   slippage-pct defaults to 2 (2%)
 *
 * Example:
 *   npx tsx scripts/buy-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10
 *   npx tsx scripts/buy-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10 5
 */
import { client, toUsdc, sharesToBigint } from "./client.js";

const [, , addr, idxStr, sharesStr, slippageStr] = process.argv;
if (!addr || !idxStr || !sharesStr) {
  console.error("Usage: npx tsx scripts/buy-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const outcomeIdx = Number(idxStr);
const sharesOut = sharesToBigint(Number(sharesStr));
const slippage = Number(slippageStr ?? 2);

// 1. Quote
const { tokensIn } = await client.quoteBuy({ marketAddress, outcomeIdx, sharesOut });
const maxTokensIn = tokensIn * BigInt(100 + slippage) / 100n;

console.log("Market:    " + marketAddress);
console.log("Outcome:   " + outcomeIdx);
console.log("Shares:    " + sharesStr);
console.log("Cost:      " + toUsdc(tokensIn));
console.log("Max cost (" + slippage + "% slippage): " + toUsdc(maxTokensIn));

// 2. Ensure approval
console.log("\nChecking USDC approval...");
const { approvalNeeded } = await client.ensureTokenApproval({ marketAddress, minimumAmount: tokensIn });
if (approvalNeeded) {
  console.log("Approval submitted.");
} else {
  console.log("Sufficient allowance already set.");
}

// 3. Buy
console.log("Submitting buy transaction...");
const { transactionHash } = await client.buyShares({ marketAddress, outcomeIdx, sharesOut, maxTokensIn });
console.log("Transaction: " + transactionHash);
console.log("Done.");
