/**
 * Check or set collateral-token approval for a market's gateway (USDC on Delphi,
 * TST on the competition — both 6-decimal).
 * Usage: npx tsx scripts/token-approval.ts <market-address> [amount]
 *   If amount is omitted, shows current allowance only.
 *   If amount is provided, approves that amount (use "unlimited" for max approval).
 *
 * Examples:
 *   npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 *   npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 100
 *   npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 unlimited
 */
import { client, collateralSymbol, toUsdc } from "./client.js";

const [, , addr, amountStr] = process.argv;
if (!addr) {
  console.error("Usage: npx tsx scripts/token-approval.ts <market-address> [amount|unlimited]");
  process.exit(1);
}

const MAX_UINT256 = 2n ** 256n - 1n;
const marketAddress = addr as `0x${string}`;
const { ownerAddress, allowance } = await client.getTokenAllowance({ marketAddress });
const allowanceDisplay = allowance === MAX_UINT256 ? "unlimited" : toUsdc(allowance);

console.log("Wallet:    " + ownerAddress);
console.log("Allowance: " + allowanceDisplay);

if (!amountStr) {
  process.exit(0);
}

if (amountStr === "unlimited") {
  console.log("\nApproving unlimited...");
  await client.approveToken({ marketAddress });
} else {
  const amount = BigInt(Math.round(Number(amountStr) * 1e6));
  console.log("\nApproving " + amountStr + " " + collateralSymbol + "...");
  await client.approveToken({ marketAddress, amount });
}

const { allowance: newAllowance } = await client.getTokenAllowance({ marketAddress });
const newAllowanceDisplay = newAllowance === MAX_UINT256 ? "unlimited" : toUsdc(newAllowance);
console.log("New allowance: " + newAllowanceDisplay);
