/**
 * Liquidate positions in one or more expired markets (for the signer's wallet).
 * Usage: npx tsx scripts/liquidate.ts <market-address> [market-address ...]
 *
 * Example:
 *   npx tsx scripts/liquidate.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 *   npx tsx scripts/liquidate.ts 0xabc... 0xdef... 0x123...
 *
 * Use `scripts/redeem.ts` for redemptions from settled markets.
 */
import { client, toUsdc } from "./client.js";

const addresses = process.argv.slice(2) as `0x${string}`[];
if (addresses.length === 0) {
  console.error("Usage: npx tsx scripts/liquidate.ts <market-address> [market-address ...]");
  process.exit(1);
}

const { address: wallet } = await client.getSigner();
const { positions } = await client.listPositions({
  wallet,
  redeemed: false,
  limit: 500,
});

const positionsInMarkets = (positions ?? []).filter((p) => addresses.includes(p.marketProxy as `0x${string}`));

function outcomeIndicesFor(marketAddress: string): number[] {
  return Array.from(
    new Set(
      positionsInMarkets
        .filter((p) => p.marketProxy === marketAddress)
        .map((p) => Number((p as { outcomeIdx?: number | string }).outcomeIdx)),
    ),
  );
}

if (addresses.length === 1) {
  const marketAddress = addresses[0];
  const outcomeIndices = outcomeIndicesFor(marketAddress);
  if (outcomeIndices.length === 0) {
    console.error("No unredeemed positions for this market. Nothing to liquidate.");
    process.exit(1);
  }
  const { transactionHash, sharesIn, totalTokensOut } = await client.liquidate({
    marketAddress,
    outcomeIndices,
  });
  console.log("Liquidated: " + marketAddress);
  console.log("Shares burned: " + (Number(sharesIn) / 1e18).toFixed(4));
  console.log("Tokens out:    " + toUsdc(totalTokensOut));
  console.log("Transaction:   " + transactionHash);
} else {
  const results: { marketAddress: `0x${string}`; success: boolean; tokensOut?: bigint; error?: string }[] = [];
  let totalTokensOut = 0n;
  for (const marketAddress of addresses) {
    const outcomeIndices = outcomeIndicesFor(marketAddress);
    if (outcomeIndices.length === 0) {
      results.push({ marketAddress, success: false, error: "No positions for this market" });
      continue;
    }
    try {
      const { totalTokensOut: tokensOut } = await client.liquidate({
        marketAddress,
        outcomeIndices,
      });
      results.push({ marketAddress, success: true, tokensOut });
      totalTokensOut += tokensOut;
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      results.push({
        marketAddress,
        success: false,
        error: err.shortMessage ?? err.message ?? "Unknown error",
      });
    }
  }
  for (const r of results) {
    if (r.success) {
      console.log("OK  " + r.marketAddress + " -> " + toUsdc(r.tokensOut!));
    } else {
      console.log("ERR " + r.marketAddress + " -> " + r.error);
    }
  }
  console.log("\nTotal recovered: " + toUsdc(totalTokensOut));
}

