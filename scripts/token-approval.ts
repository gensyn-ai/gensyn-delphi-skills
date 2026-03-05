/**
 * Check or set USDC token approval for a market's gateway.
 * Usage: npx tsx scripts/token-approval.ts <market-address> [amount-usdc]
 *   If amount-usdc is omitted, shows current allowance only.
 *   If amount-usdc is provided, approves that amount (use "unlimited" for max approval).
 *
 * Examples:
 *   npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 *   npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 100
 *   npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 unlimited
 */
import { client, toUsdc } from "./client.js";

const [, , addr, amountStr] = process.argv;
if (!addr) {
  console.error("Usage: npx tsx scripts/token-approval.ts <market-address> [amount-usdc|unlimited]");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const { ownerAddress, allowance } = await client.getTokenAllowance({ marketAddress });

console.log("Wallet:    " + ownerAddress);
console.log("Allowance: " + toUsdc(allowance));

if (!amountStr) {
  process.exit(0);
}

if (amountStr === "unlimited") {
  console.log("\nApproving unlimited...");
  await client.approveToken({ marketAddress });
} else {
  const amount = BigInt(Math.round(Number(amountStr) * 1e6));
  console.log("\nApproving " + amountStr + " USDC...");
  await client.approveToken({ marketAddress, amount });
}

const { allowance: newAllowance } = await client.getTokenAllowance({ marketAddress });
console.log("New allowance: " + toUsdc(newAllowance));
