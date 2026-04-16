/**
 * Bridge ETH from Ethereum mainnet to Gensyn mainnet via the OP Stack Canonical Bridge.
 * ETH arrives on Gensyn mainnet within a few minutes.
 * Requires DELPHI_NETWORK=mainnet in your .env.
 * Usage: npx tsx scripts/bridge-eth-to-gensyn-mainnet.ts <amount-eth>
 *
 * Example:
 *   npx tsx scripts/bridge-eth-to-gensyn-mainnet.ts 0.0001
 */
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { client } from "./client.js";

const MAINNET_RPC = "https://ethereum.publicnode.com";
const L1_STANDARD_BRIDGE = "0x611718beda147c549bdfddf7b92d74da4407d63f" as const;
const MIN_GAS_LIMIT = 200_000;

const L1_BRIDGE_ABI = [{
  name: "depositETH",
  type: "function",
  inputs: [
    { name: "_minGasLimit", type: "uint32" },
    { name: "_extraData", type: "bytes" },
  ],
  outputs: [],
  stateMutability: "payable",
}] as const;

const [, , amountStr] = process.argv;
if (!amountStr) {
  console.error("Usage: npx tsx scripts/bridge-eth-to-gensyn-mainnet.ts <amount-eth>");
  process.exit(1);
}

const amount = parseEther(amountStr);

// Borrow the account from the Gensyn-configured wallet client and point it at Ethereum mainnet
const { address, walletClient: gensynWalletClient } = await client.getSigner();
const mainnetWalletClient = createWalletClient({
  account: gensynWalletClient.account,
  chain: mainnet,
  transport: http(MAINNET_RPC),
});
const mainnetPublicClient = createPublicClient({ chain: mainnet, transport: http(MAINNET_RPC) });

const ethBalance = await mainnetPublicClient.getBalance({ address });
console.log("Wallet:           " + address);
console.log("Mainnet balance:  " + formatEther(ethBalance) + " ETH");
console.log("Bridging:         " + amountStr + " ETH → Gensyn Mainnet");
console.log("Bridge:           " + L1_STANDARD_BRIDGE);

if (ethBalance < amount) {
  console.error("\nInsufficient Ethereum mainnet ETH balance.");
  process.exit(1);
}

console.log("\nSubmitting deposit...");
const hash = await mainnetWalletClient.writeContract({
  address: L1_STANDARD_BRIDGE,
  abi: L1_BRIDGE_ABI,
  functionName: "depositETH",
  args: [MIN_GAS_LIMIT, "0x"],
  value: amount,
});
console.log("Transaction: " + hash);
console.log("Waiting for Ethereum mainnet confirmation...");

await mainnetPublicClient.waitForTransactionReceipt({ hash });
console.log("Confirmed on Ethereum mainnet. ETH will arrive on Gensyn mainnet within a few minutes.");
console.log("Deposits appear under the Internal txns tab on the Gensyn explorer.");
