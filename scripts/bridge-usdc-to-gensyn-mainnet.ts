/**
 * Bridge USDC from Ethereum mainnet to Gensyn mainnet via LayerZero (Stargate V2).
 * Requires native USDC on Ethereum mainnet (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) —
 * the canonical Circle-issued token. USDC.e or other bridged variants will not work.
 * Requires DELPHI_NETWORK=mainnet in your .env.
 *
 * Steps: (1) approve Stargate pool to spend USDC, (2) quote LZ fee, (3) send.
 * USDC arrives on Gensyn mainnet in ~1–3 minutes.
 *
 * Usage: npx tsx scripts/bridge-usdc-to-gensyn-mainnet.ts <amount-usdc> [slippage-pct]
 *   slippage-pct defaults to 0.5 (0.5%)
 *
 * Example:
 *   npx tsx scripts/bridge-usdc-to-gensyn-mainnet.ts 10
 *   npx tsx scripts/bridge-usdc-to-gensyn-mainnet.ts 10 1
 */
import { createWalletClient, createPublicClient, http, formatEther, pad } from "viem";
import { mainnet } from "viem/chains";
import { client } from "./client.js";

const MAINNET_RPC = "https://ethereum.publicnode.com";

// Stargate V2 USDC pool on Ethereum — source of quoteSend / send calls
const STARGATE_USDC_POOL = "0xc026395860Db2d07ee33e05fE50ed7bD583189C7" as const;
// USDC on Ethereum mainnet
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;
// Gensyn mainnet LayerZero endpoint ID
const LZ_EID_GENSYN = 30412;
// Executor LzReceive option — 200k gas
const EXTRA_OPTIONS = "0x00030100110100000000000000000000000000030d40" as const;

const STARGATE_ABI = [
  {
    name: "quoteSend",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "sendParam", type: "tuple",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" },
        ],
      },
      { name: "payInLzToken", type: "bool" },
    ],
    outputs: [
      {
        name: "msgFee", type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "send",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "sendParam", type: "tuple",
        components: [
          { name: "dstEid", type: "uint32" },
          { name: "to", type: "bytes32" },
          { name: "amountLD", type: "uint256" },
          { name: "minAmountLD", type: "uint256" },
          { name: "extraOptions", type: "bytes" },
          { name: "composeMsg", type: "bytes" },
          { name: "oftCmd", type: "bytes" },
        ],
      },
      {
        name: "messagingFee", type: "tuple",
        components: [
          { name: "nativeFee", type: "uint256" },
          { name: "lzTokenFee", type: "uint256" },
        ],
      },
      { name: "refundAddress", type: "address" },
    ],
    outputs: [],
  },
] as const;

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const [, , amountStr, slippageStr] = process.argv;
if (!amountStr) {
  console.error("Usage: npx tsx scripts/bridge-usdc-to-gensyn-mainnet.ts <amount-usdc> [slippage-pct]");
  process.exit(1);
}

const slippagePct = Number(slippageStr ?? 0.5);
const amountLD = BigInt(Math.round(Number(amountStr) * 1e6));
const minAmountLD = amountLD * BigInt(Math.round((1 - slippagePct / 100) * 10000)) / 10000n;

const { address, walletClient: gensynWalletClient } = await client.getSigner();
const mainnetWalletClient = createWalletClient({
  account: gensynWalletClient.account,
  chain: mainnet,
  transport: http(MAINNET_RPC),
});
const mainnetPublicClient = createPublicClient({ chain: mainnet, transport: http(MAINNET_RPC) });

// Balances
const usdcBalance = await mainnetPublicClient.readContract({
  address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address],
}) as bigint;
const ethBalance = await mainnetPublicClient.getBalance({ address });

console.log("Wallet:           " + address);
console.log("USDC balance:     " + (Number(usdcBalance) / 1e6).toFixed(6) + " USDC");
console.log("ETH balance:      " + formatEther(ethBalance) + " ETH (for gas + LZ fee)");
console.log("Bridging:         " + amountStr + " USDC → Gensyn Mainnet");
console.log("Slippage:         " + slippagePct + "%");
console.log("Min received:     " + (Number(minAmountLD) / 1e6).toFixed(6) + " USDC");

if (usdcBalance < amountLD) {
  console.error("\nInsufficient USDC balance.");
  process.exit(1);
}

// Step 1: Approve if needed
const allowance = await mainnetPublicClient.readContract({
  address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
  args: [address, STARGATE_USDC_POOL],
}) as bigint;

if (allowance < amountLD) {
  console.log("\nApproving Stargate USDC pool...");
  const approveHash = await mainnetWalletClient.writeContract({
    address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve",
    args: [STARGATE_USDC_POOL, amountLD],
  });
  console.log("Approval tx: " + approveHash);
  await mainnetPublicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("Approved.");
} else {
  console.log("\nSufficient USDC allowance already set.");
}

// Step 2: Quote LZ fee
const sendParam = {
  dstEid: LZ_EID_GENSYN,
  to: pad(address, { size: 32 }),
  amountLD,
  minAmountLD,
  extraOptions: EXTRA_OPTIONS,
  composeMsg: "0x" as `0x${string}`,
  oftCmd: "0x" as `0x${string}`,
};

const { nativeFee } = await mainnetPublicClient.readContract({
  address: STARGATE_USDC_POOL, abi: STARGATE_ABI, functionName: "quoteSend",
  args: [sendParam, false],
}) as { nativeFee: bigint; lzTokenFee: bigint };

console.log("LZ fee:           " + formatEther(nativeFee) + " ETH");

if (ethBalance < nativeFee) {
  console.error("\nInsufficient ETH to pay LayerZero fee.");
  process.exit(1);
}

// Step 3: Bridge
console.log("\nSubmitting bridge transaction...");
const hash = await mainnetWalletClient.writeContract({
  address: STARGATE_USDC_POOL, abi: STARGATE_ABI, functionName: "send",
  args: [sendParam, { nativeFee, lzTokenFee: 0n }, address],
  value: nativeFee,
});
console.log("Transaction: " + hash);
console.log("Track on LayerZero: https://layerzeroscan.com/tx/" + hash);
console.log("Waiting for Ethereum mainnet confirmation...");

await mainnetPublicClient.waitForTransactionReceipt({ hash });
console.log("Confirmed. USDC will arrive on Gensyn mainnet in ~1–3 minutes.");
