# Funding Your Wallet for Delphi

To trade on Delphi you need two things on the Gensyn chain:
- **ETH** — for gas fees
- **USDC** — the ERC-20 collateral token used for trading

The process differs between testnet and mainnet.

---

## Testnet

**Prerequisites:** You need **Sepolia ETH** in your wallet before you can do anything. Get it from a faucet first (Step 1 below), then bridge to Gensyn Testnet. Testnet USDC (MockToken) is minted directly on the Gensyn chain — no prior balance needed.

### Getting ETH (Sepolia → Gensyn Testnet)

Gensyn Testnet is an OP Stack L2 that settles on Ethereum Sepolia (chain ID 685685).

**Step 1: Get Sepolia ETH**

Use a Sepolia faucet to get ETH on Ethereum Sepolia:
- Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

**Step 2: Bridge to Gensyn Testnet via OP Stack Canonical Bridge**

Use the provided script to bridge ETH from Sepolia to Gensyn Testnet:

```bash
npx tsx scripts/bridge-eth-to-gensyn-testnet.ts <amount-eth>
# or
npm run bridge-eth-to-gensyn-testnet 0.0001
```

ETH appears on Gensyn Testnet within a few minutes after Sepolia confirmation. The deposit will show up under the **Internal txns** tab on https://gensyn-testnet.explorer.alchemy.com/ — not under regular Transactions — because OP Stack deposits are a special transaction type (type `0x7e`) triggered by the L1 bridge rather than a user-signed L2 transaction.

Alternatively, call `depositETH` directly on the L1StandardBridge at `0xaf99ffa3281548a1c30fcb443f066eaff2d297d4` on Sepolia:

```bash
# Using Foundry cast — deposit 0.1 ETH to your own address on Gensyn Testnet
cast send 0xaf99ffa3281548a1c30fcb443f066eaff2d297d4 \
  "depositETH(uint32,bytes)" 200000 "0x" \
  --value 0.1ether \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY

# To deposit to a different address
cast send 0xaf99ffa3281548a1c30fcb443f066eaff2d297d4 \
  "depositETHTo(address,uint32,bytes)" $RECIPIENT 200000 "0x" \
  --value 0.1ether \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

```typescript
// viem
import { createWalletClient, http, parseEther, encodeFunctionData } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

const hash = await walletClient.sendTransaction({
  to: "0xaf99ffa3281548a1c30fcb443f066eaff2d297d4",
  value: parseEther("0.1"),
  data: encodeFunctionData({
    abi: [{
      name: "depositETH",
      type: "function",
      inputs: [
        { name: "_minGasLimit", type: "uint32" },
        { name: "_extraData", type: "bytes" },
      ],
      stateMutability: "payable",
    }],
    functionName: "depositETH",
    args: [200000, "0x"],
  }),
});
```

**Key contracts (Sepolia L1):**

| Contract | Address |
|----------|---------|
| L1StandardBridge | `0xaf99ffa3281548a1c30fcb443f066eaff2d297d4` |
| OptimismPortal | `0xd77fdbc9eff43c74150479401d9ad431f979dd81` |
| L1CrossDomainMessenger | `0x57a0881abe0b3cc44885bcbd015c9a7bb8ee7bac` |

**Key predeploys (Gensyn Testnet L2):**

| Contract | Address |
|----------|---------|
| L2StandardBridge | `0x4200000000000000000000000000000000000010` |
| L2CrossDomainMessenger | `0x4200000000000000000000000000000000000007` |

See [gensyn-testnet-bridge-contracts.md](../gensyn-testnet-bridge-contracts.md) for the full contract list.

---

### Getting USDC (Testnet Faucet)

On testnet, USDC is a mock token (`MockToken`) that can be minted directly from a faucet contract deployed on the Gensyn chain — no bridging needed.

**Faucet contract:** `0xB5876320DdA1AEE3eFC03aD02dC2e2CB4b61B7D9` *(on Gensyn Testnet)*

The Delphi SDK collateral token address on testnet is `0x0724D6079b986F8e44bDafB8a09B60C0bd6A45a1`.

Use the provided script to claim from the faucet:

```bash
npx tsx scripts/testnet-faucet.ts
# or
npm run testnet-faucet
```

This calls `requestToken()` on the faucet contract, logs your USDC balance before and after, and waits for the transaction to confirm.

Each call dispenses 1,000 USDC. To call the faucet directly with cast:

```bash
cast send 0xB5876320DdA1AEE3eFC03aD02dC2e2CB4b61B7D9 \
  "requestToken()" \
  --rpc-url https://gensyn-testnet.g.alchemy.com/public \
  --private-key $PRIVATE_KEY
```

---

## Mainnet

**Prerequisites:** You need both **ETH** and **USDC** on Ethereum mainnet before bridging. ETH is needed to pay L1 gas for the bridge transactions themselves, and once bridged, to pay gas when trading on Gensyn. USDC is the collateral you'll bridge over to trade. Ensure your wallet on Ethereum mainnet is funded with both before proceeding.

### Getting ETH (Ethereum mainnet → Gensyn Mainnet)

Bridge ETH from Ethereum mainnet to Gensyn using the OP Stack Canonical Bridge. Requires `DELPHI_NETWORK=mainnet` in your `.env`.

```bash
npx tsx scripts/bridge-eth-to-gensyn-mainnet.ts <amount-eth>
# or
npm run bridge-eth-to-gensyn-mainnet 0.0001
```

ETH arrives within a few minutes and appears under the **Internal txns** tab on the Gensyn mainnet explorer — same as testnet.

**Key contracts:**

| Contract | Network | Address |
|----------|---------|---------|
| L1StandardBridge | Ethereum mainnet | `0x611718beda147c549bdfddf7b92d74da4407d63f` |
| L1CrossDomainMessenger | Ethereum mainnet | `0x0026ef2e0b5b163c3403e68d15ff2820b34e5c42` |
| L2StandardBridge | Gensyn mainnet | `0x4200000000000000000000000000000000000010` |
| L2CrossDomainMessenger | Gensyn mainnet | `0x4200000000000000000000000000000000000007` |

---

### Getting USDC (LayerZero Bridge)

On mainnet, USDC is bridged cross-chain via the LayerZero bridge. This allows USDC from supported source chains (e.g., Ethereum, Arbitrum, Base) to be bridged directly to the Gensyn chain.

**LayerZero bridge contract:** `<MAINNET_LAYERZERO_BRIDGE_ADDRESS>` *(on source chain)*

```bash
# Bridge USDC via LayerZero
# <details to be filled in with contract ABI and function signatures>
```

**Key mainnet bridge contracts:**

| Contract | Network | Address |
|----------|---------|---------|
| LayerZero USDC Bridge | Source chain | `<MAINNET_LAYERZERO_BRIDGE_ADDRESS>` |
| USDC (collateral token) | Gensyn mainnet | `<MAINNET_USDC_TOKEN_ADDRESS>` |

---

## Network Configuration

### Testnet

| Field | Value |
|-------|-------|
| Chain ID | 685685 |
| RPC URL | `https://gensyn-testnet.g.alchemy.com/public` |
| Explorer | `https://gensyn-testnet.explorer.alchemy.com` |
| L1 Settlement | Ethereum Sepolia (chain ID 11155111) |

### Mainnet

| Field | Value |
|-------|-------|
| Chain ID | *(to be filled)* |
| RPC URL | *(to be filled)* |
| L1 Settlement | Ethereum mainnet (chain ID 1) |

---

## Adding Gensyn Testnet to Your Wallet

| Field | Value |
|-------|-------|
| Network Name | Gensyn Testnet |
| RPC URL | `https://gensyn-testnet.g.alchemy.com/public` |
| Chain ID | 685685 |
| Currency | ETH |
| Explorer | `https://gensyn-testnet.explorer.alchemy.com` |
