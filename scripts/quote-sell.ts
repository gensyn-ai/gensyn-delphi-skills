/**
 * Quote the USDC payout for selling a given number of shares (read-only, no gas).
 * Usage: npx tsx scripts/quote-sell.ts <market-address> <outcome-idx> <shares>
 *
 * Example:
 *   npx tsx scripts/quote-sell.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 5
 */
import { client, toUsdc, sharesToBigint } from "./client.js";

const [, , addr, idxStr, sharesStr] = process.argv;
if (!addr || !idxStr || !sharesStr) {
  console.error("Usage: npx tsx scripts/quote-sell.ts <market-address> <outcome-idx> <shares>");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const outcomeIdx = Number(idxStr);
const sharesIn = sharesToBigint(Number(sharesStr));

const { tokensOut } = await client.quoteSell({ marketAddress, outcomeIdx, sharesIn });

console.log("Market:    " + marketAddress);
console.log("Outcome:   " + outcomeIdx);
console.log("Shares:    " + sharesStr);
console.log("Payout:    " + toUsdc(tokensOut));
console.log("Min (2%):  " + toUsdc(tokensOut * 98n / 100n));
