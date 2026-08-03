/**
 * Buy outcome shares on a market (on-chain, with auto collateral-token approval).
 * Usage: npx tsx scripts/buy-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]
 *   slippage-pct defaults to 2 (2%)
 *
 * Example:
 *   npx tsx scripts/buy-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10
 *   npx tsx scripts/buy-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10 5
 */
import { client, collateralSymbol, toUsdc, sharesToBigint } from "./client.js";

const [, , addr, idxStr, sharesStr, slippageStr] = process.argv;
if (!addr || !idxStr || !sharesStr) {
  console.error("Usage: npx tsx scripts/buy-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const outcomeIdx = Number(idxStr);
const sharesOut = sharesToBigint(Number(sharesStr));
const slippage = Number(slippageStr ?? 2);

// 1. Quote. Slippage is applied in basis points so fractional percentages work.
const { tokensIn } = await client.quoteBuy({ marketAddress, outcomeIdx, sharesOut });
const slippageBps = BigInt(Math.round(slippage * 100));
const maxTokensIn = tokensIn * (10_000n + slippageBps) / 10_000n;

console.log("Market:    " + marketAddress);
console.log("Outcome:   " + outcomeIdx);
console.log("Shares:    " + sharesStr);
console.log("Cost:      " + toUsdc(tokensIn));
console.log("Max cost (" + slippage + "% slippage): " + toUsdc(maxTokensIn));

// 2. Ensure approval. Approve the most the buy can spend, not the quote: the
// price can move anywhere up to maxTokensIn before the trade lands.
console.log("\nChecking " + collateralSymbol + " approval...");
const { approvalNeeded } = await client.ensureTokenApproval({ marketAddress, minimumAmount: maxTokensIn });
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
