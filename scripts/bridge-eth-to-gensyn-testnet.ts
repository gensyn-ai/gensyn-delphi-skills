/**
 * Bridge ETH from Ethereum Sepolia to Gensyn Testnet via the OP Stack Canonical Bridge.
 * ETH arrives on Gensyn Testnet within a few minutes.
 * Usage: npx tsx scripts/bridge-eth-to-gensyn-testnet.ts <amount-eth>
 *
 * Example:
 *   npx tsx scripts/bridge-eth-to-gensyn-testnet.ts 0.0001
 */
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { client } from "./client.js";

// Public Sepolia RPCs often under-estimate gas for OP Stack depositETH, which
// OOGs the nested portal call even when the outer limit looks fine. Scale the
// estimate and floor it below. Override the endpoint with SEPOLIA_RPC_URL if needed.
const DEFAULT_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL ?? DEFAULT_SEPOLIA_RPC;
const L1_STANDARD_BRIDGE = "0xaf99ffa3281548a1c30fcb443f066eaff2d297d4" as const;
/** L2 execution gas the bridge forwards as depositETH's `_minGasLimit`. */
const L2_MIN_GAS_LIMIT = 200_000;
/** L1 transaction gas floor — public eth_estimateGas for this deposit runs too low. */
const L1_MIN_TX_GAS = 500_000n;

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
  console.error("Usage: npx tsx scripts/bridge-eth-to-gensyn-testnet.ts <amount-eth>");
  process.exit(1);
}

const amount = parseEther(amountStr);

// Borrow the account from the Gensyn-configured wallet client and point it at Sepolia
const { address, walletClient: gensynWalletClient } = await client.getSigner();
const sepoliaWalletClient = createWalletClient({
  account: gensynWalletClient.account,
  chain: sepolia,
  transport: http(SEPOLIA_RPC),
});
const sepoliaPublicClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });

const ethBalance = await sepoliaPublicClient.getBalance({ address });
console.log("Wallet:          " + address);
console.log("Sepolia RPC:     " + SEPOLIA_RPC);
console.log("Sepolia balance: " + formatEther(ethBalance) + " ETH");
console.log("Bridging:        " + amountStr + " ETH → Gensyn Testnet");
console.log("Bridge:          " + L1_STANDARD_BRIDGE);

if (ethBalance < amount) {
  console.error("\nInsufficient Sepolia ETH balance.");
  process.exit(1);
}

const depositArgs = {
  address: L1_STANDARD_BRIDGE,
  abi: L1_BRIDGE_ABI,
  functionName: "depositETH",
  args: [L2_MIN_GAS_LIMIT, "0x"],
  value: amount,
  account: gensynWalletClient.account,
} as const;

// Fail fast with a clear error if the call would revert (paused bridge / etc.).
await sepoliaPublicClient.simulateContract(depositArgs);

const estimated = await sepoliaPublicClient.estimateContractGas(depositArgs);
const scaled = (estimated * 3n) / 2n; // 1.5× estimate
const gas = scaled > L1_MIN_TX_GAS ? scaled : L1_MIN_TX_GAS;

console.log("\nSubmitting deposit...");
const hash = await sepoliaWalletClient.writeContract({
  ...depositArgs,
  gas,
});
console.log("Transaction: " + hash);
console.log("Waiting for Sepolia confirmation...");

const receipt = await sepoliaPublicClient.waitForTransactionReceipt({ hash });
if (receipt.status === "reverted") {
  console.error("Transaction reverted on Sepolia. No ETH was bridged.");
  if (SEPOLIA_RPC !== DEFAULT_SEPOLIA_RPC) {
    console.error(
      `Retry with SEPOLIA_RPC_URL=${DEFAULT_SEPOLIA_RPC} (current: ${SEPOLIA_RPC})`
    );
  } else {
    console.error("Check Sepolia explorer for the revert reason, then retry.");
  }
  process.exit(1);
}
console.log("Confirmed on Sepolia. ETH will arrive on Gensyn Testnet within a few minutes.");
console.log("Track on explorer: https://gensyn-testnet.explorer.alchemy.com/address/" + address);
