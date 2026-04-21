/**
 * Get ETH and collateral token (ERC-20) balances for the configured Delphi signer.
 * Uses the SDK default token address (network default or DELPHI_TOKEN_ADDRESS).
 * Usage: npx tsx scripts/get-wallet-balances.ts
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

  const tokenAddress = client.getTokenAddress();
  const { balance, decimals } = await client.getErc20BalanceWithDecimals();
  console.log("ERC-20 (collateral token): " + tokenAddress);
  console.log("  decimals: " + decimals);
  console.log("  raw:      " + balance.toString());
  console.log("  formatted: " + formatWithDecimals(balance, decimals));
}

main().catch((err) => {
  console.error("Error fetching wallet balances:", err);
  process.exit(1);
});
