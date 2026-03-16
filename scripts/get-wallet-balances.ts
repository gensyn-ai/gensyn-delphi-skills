/**
 * Get ETH and optional ERC-20 (e.g. USDC) balances for the configured Delphi signer.
 * Usage: npx tsx scripts/get-wallet-balances.ts
 *
 * Set optional DELPHI_USDC_ADDRESS in .env to include USDC (or other token) balance.
 * Example: npx tsx scripts/get-wallet-balances.ts
 */
import { client } from "./client.js";

function formatWithDecimals(amount: bigint, decimals: number): string {
  const factor = 10 ** decimals;
  return (Number(amount) / factor).toFixed(decimals > 6 ? 6 : decimals);
}

async function main() {
  console.log("Fetching wallet balances for configured Delphi signer...\n");

  const ethBalance = await client.getEthBalance();
  console.log("ETH (native)");
  console.log("  raw:    " + ethBalance.toString());
  console.log("  approx: " + (Number(ethBalance) / 1e18).toFixed(6) + " ETH\n");

  const usdcAddress = process.env.DELPHI_USDC_ADDRESS as `0x${string}` | undefined;
  if (!usdcAddress) {
    console.log(
      "Tip: Set DELPHI_USDC_ADDRESS in .env to show USDC (or other ERC-20) balance.",
    );
    return;
  }

  const { balance, decimals } = await client.getErc20BalanceWithDecimals(
    usdcAddress,
  );
  console.log("ERC-20 token: " + usdcAddress);
  console.log("  decimals: " + decimals);
  console.log("  raw:      " + balance.toString());
  console.log("  formatted: " + formatWithDecimals(balance, decimals));
}

main().catch((err) => {
  console.error("Error fetching wallet balances:", err);
  process.exit(1);
});
