/**
 * Quote the USDC you would receive by liquidating positions in an EXPIRED
 * (unsettled) market (read-only, no gas). Simulates the on-chain liquidate, so it
 * reverts if the market isn't liquidatable or the wallet holds no shares in the
 * given outcomes.
 *
 * Usage: npx tsx scripts/quote-liquidate.ts <market-address> <outcome-idx>[,<outcome-idx>...] [wallet-address]
 *   outcome indices are comma-separated (pass every outcome you hold).
 *   wallet-address defaults to the configured signer.
 *
 * Example:
 *   npx tsx scripts/quote-liquidate.ts 0x94d8…1990 0,1
 */
import { client, toUsdc, toShares } from "./client.js";

const [, , addr, idxStr, walletArg] = process.argv;
if (!addr || !idxStr) {
  console.error(
    "Usage: npx tsx scripts/quote-liquidate.ts <market-address> <outcome-idx>[,<idx>...] [wallet-address]",
  );
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const outcomeIndices = idxStr.split(",").map((s) => Number(s.trim()));
const account = walletArg ? (walletArg as `0x${string}`) : undefined;

if (outcomeIndices.some((n) => !Number.isInteger(n) || n < 0)) {
  console.error("outcome indices must be non-negative integers (e.g. 0 or 0,1)");
  process.exit(1);
}

try {
  const { sharesIn, totalTokensOut } = await client.quoteLiquidate({ marketAddress, outcomeIndices, account });
  console.log("Market:   " + marketAddress);
  outcomeIndices.forEach((idx, i) => console.log(`  outcome ${idx}: ${toShares(sharesIn[i] ?? 0n)}`));
  console.log("Total:    " + toUsdc(totalTokensOut));
} catch (e: any) {
  console.error("Not liquidatable: " + (e?.shortMessage ?? e?.message ?? String(e)));
  console.error("(The market may not be expired, or the wallet holds no shares in those outcomes.)");
  process.exit(1);
}
