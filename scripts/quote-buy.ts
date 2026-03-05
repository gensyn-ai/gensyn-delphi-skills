/**
 * Quote the USDC cost to buy a given number of shares (read-only, no gas).
 * Usage: npx tsx scripts/quote-buy.ts <market-address> <outcome-idx> <shares>
 *
 * Example:
 *   npx tsx scripts/quote-buy.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10
 */
import { client, toUsdc, sharesToBigint } from "./client.js";

const [, , addr, idxStr, sharesStr] = process.argv;
if (!addr || !idxStr || !sharesStr) {
  console.error("Usage: npx tsx scripts/quote-buy.ts <market-address> <outcome-idx> <shares>");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const outcomeIdx = Number(idxStr);
const sharesOut = sharesToBigint(Number(sharesStr));

const { tokensIn } = await client.quoteBuy({ marketAddress, outcomeIdx, sharesOut });

console.log("Market:    " + marketAddress);
console.log("Outcome:   " + outcomeIdx);
console.log("Shares:    " + sharesStr);
console.log("Cost:      " + toUsdc(tokensIn));
console.log("Max (2%):  " + toUsdc(tokensIn * 102n / 100n));
