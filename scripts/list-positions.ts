/**
 * List active (unredeemed) positions for a wallet.
 * Usage: npx tsx scripts/list-positions.ts [wallet-address]
 *   Defaults to the configured signer's address.
 *
 * Example:
 *   npx tsx scripts/list-positions.ts
 *   npx tsx scripts/list-positions.ts 0xabc...
 */
import { client, getWalletAddress } from "./client.js";

const wallet = (process.argv[2] ?? await getWalletAddress()) as `0x${string}`;
if (!wallet) {
  console.error("Provide a wallet address or configure a signer in .env");
  process.exit(1);
}

console.log("Wallet: " + wallet + "\n");
const { positions } = await client.listPositions({ wallet, redeemed: false, limit: 50 });

if (!positions || positions.length === 0) {
  console.log("No active positions found.");
  process.exit(0);
}

console.log("Found " + positions.length + " active position(s):\n");
for (const p of positions) {
  const shares = (Number(BigInt(p.shares)) / 1e18).toFixed(4);
  const marketStatus = (p as any).marketStatus ?? "unknown";

  console.log("Market:  " + p.marketProxy);
  console.log("Status:  " + marketStatus);
  console.log("Outcome: " + p.outcomeIdx);
  console.log("Shares:  " + shares);
  console.log("---");
}
