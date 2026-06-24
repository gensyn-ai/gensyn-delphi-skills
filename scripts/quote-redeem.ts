/**
 * Quote the USDC you would receive by redeeming your winning shares in a SETTLED
 * market (read-only, no gas). Simulates the on-chain redeem, so it reverts if the
 * market isn't settled yet or the wallet holds no winning shares.
 *
 * Usage: npx tsx scripts/quote-redeem.ts <market-address> [wallet-address]
 *   wallet-address defaults to the configured signer.
 *
 * Example:
 *   npx tsx scripts/quote-redeem.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 */
import { client, toUsdc, toShares } from "./client.js";

const [, , addr, walletArg] = process.argv;
if (!addr) {
  console.error("Usage: npx tsx scripts/quote-redeem.ts <market-address> [wallet-address]");
  process.exit(1);
}

const marketAddress = addr as `0x${string}`;
const account = walletArg ? (walletArg as `0x${string}`) : undefined;

try {
  const { sharesIn, tokensOut } = await client.quoteRedeem({ marketAddress, account });
  console.log("Market:   " + marketAddress);
  console.log("Shares:   " + toShares(sharesIn));
  console.log("Payout:   " + toUsdc(tokensOut));
} catch (e: any) {
  console.error("Not redeemable: " + (e?.shortMessage ?? e?.message ?? String(e)));
  console.error("(The market may not be settled, or the wallet holds no winning shares.)");
  process.exit(1);
}
