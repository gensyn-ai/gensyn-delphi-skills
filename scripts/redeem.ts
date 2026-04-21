/**
 * Redeem winnings from one or more settled markets.
 * Usage: npx tsx scripts/redeem.ts <market-address> [market-address ...]
 *
 * Example:
 *   npx tsx scripts/redeem.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 *   npx tsx scripts/redeem.ts 0xabc... 0xdef... 0x123...
 */
import { client, toUsdc } from "./client.js";

const addresses = process.argv.slice(2) as `0x${string}`[];
if (addresses.length === 0) {
  console.error("Usage: npx tsx scripts/redeem.ts <market-address> [market-address ...]");
  process.exit(1);
}

if (addresses.length === 1) {
  const { transactionHash, sharesIn, tokensOut } = await client.redeemMarket({ marketAddress: addresses[0] });
  console.log("Redeemed from: " + addresses[0]);
  console.log("Shares burned: " + (Number(sharesIn) / 1e18).toFixed(4));
  console.log("Tokens out:    " + toUsdc(tokensOut));
  console.log("Transaction:   " + transactionHash);
} else {
  const { results, totalTokensOut } = await client.redeemPositions({ marketAddresses: addresses });
  for (const r of results) {
    if (r.success) {
      console.log("OK  " + r.marketAddress + " -> " + toUsdc(r.tokensOut!));
    } else {
      console.log("ERR " + r.marketAddress + " -> " + r.error);
    }
  }
  console.log("\nTotal redeemed: " + toUsdc(totalTokensOut));
}
