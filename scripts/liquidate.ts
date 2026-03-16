/**
 * Liquidate positions in expired markets for a wallet.
 * Usage: npx tsx scripts/liquidate.ts [wallet-address]
 *
 * Examples:
 *   npx tsx scripts/liquidate.ts
 *   npx tsx scripts/liquidate.ts 0xabc...
 *
 * This script is intentionally scoped only to **expired** markets.
 * Use `scripts/redeem.ts` for redemptions from settled markets.
 */
import { client, walletAddress, toUsdc } from "./client.js";

const wallet = (process.argv[2] ?? walletAddress) as `0x${string}`;

if (!wallet) {
  console.error("Provide a wallet address or set CDP_WALLET_ADDRESS in .env");
  process.exit(1);
}

console.log("Wallet: " + wallet + "\n");

const { positions } = await client.listPositions({
  wallet,
  redeemed: false,
  limit: 100,
});

if (!positions || positions.length === 0) {
  console.log("No active positions found.");
  process.exit(0);
}

const expiredMarkets = new Set<string>();

for (const p of positions) {
  const status = (p as any).marketStatus as string | undefined;
  if (status === "expired") {
    expiredMarkets.add(p.marketProxy);
  }
}

const expiredAddresses = Array.from(expiredMarkets) as `0x${string}`[];

if (expiredAddresses.length === 0) {
  console.log("No expired markets found for this wallet.");
  process.exit(0);
}

console.log("Liquidating positions in expired markets:\n");

// NOTE: This assumes the liquidation-capable SDK branch exposes a batch
// helper similar to redeemPositions. Adjust the method name/signature here
// if the final SDK API differs.
const { results, totalTokensOut } = await (client as any).liquidatePositions({
  marketAddresses: expiredAddresses,
});

for (const r of results) {
  if (r.success) {
    console.log("OK  " + r.marketAddress + " -> " + toUsdc(r.tokensOut!));
  } else {
    console.log("ERR " + r.marketAddress + " -> " + r.error);
  }
}

console.log("\nTotal recovered from expired markets: " + toUsdc(totalTokensOut));

