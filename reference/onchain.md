# On-Chain Reference

## Contract addresses (Gensyn Testnet)

| Contract | Address |
|----------|---------|
| Gateway | `0x469388CD2498b43925f562FaA333D95135b66c06` (set via `DELPHI_GATEWAY_CONTRACT`) |
| Chain ID | `685685` |

The Gateway is the single entry point for all on-chain interactions. Market proxy addresses (from `market.implementation`) are passed as arguments to Gateway functions.

## viem client setup

```typescript
import { createPublicClient, http, defineChain, type Abi } from "viem";
import { DYNAMIC_PARIMUTUEL_GATEWAY_ABI } from "@gensyn-ai/gensyn-delphi-sdk";

const chain = defineChain({
  id: Number(process.env.GENSYN_CHAIN_ID),   // 685685
  name: "Gensyn Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.GENSYN_RPC_URL!] } },
});

const publicClient = createPublicClient({ chain, transport: http(process.env.GENSYN_RPC_URL!) });
const gateway = process.env.DELPHI_GATEWAY_CONTRACT as `0x${string}`;
```

## Gateway read functions

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `quoteBuyExactOut` | `marketProxy, outcomeIdx, sharesOut` | `tokensIn: uint256` | USDC cost (6 dec) |
| `quoteSellExactIn` | `marketProxy, outcomeIdx, sharesIn` | `tokensOut: uint256` | USDC payout (6 dec) |
| `spotImpliedProbability` | `marketProxy, outcomeIdx` | `uint256` | 1e18 = 100% |
| `spotImpliedProbabilities` | `marketProxy, outcomeIndices[]` | `uint256[]` | Batch |
| `spotPrice` | `marketProxy, outcomeIdx` | `uint256` | 1e18 = 1.0 USDC/share |
| `spotPrices` | `marketProxy, outcomeIndices[]` | `uint256[]` | Batch |
| `balanceOf` | `marketProxy, owner, outcomeIdx` | `uint256` | Shares (18 dec) |
| `batchBalanceOf` | `marketProxy, owners[], outcomeIndices[]` | `uint256[]` | Batch |
| `totalSupply` | `marketProxy, outcomeIdx` | `uint256` | Total shares (18 dec) |
| `totalSupplies` | `marketProxy, outcomeIndices[]` | `uint256[]` | Batch |
| `getMarket` | `marketProxy` | `Market struct` | Full on-chain state |
| `marketStatus` | `marketProxy` | `uint8` | 0=Open, 1=Closed, 2=Settled |
| `token` | `marketProxy` | `address` | Collateral token address |

## Gateway write functions

| Function | Args | Notes |
|----------|------|-------|
| `buyExactOut` | `marketProxy, outcomeIdx, sharesOut, maxTokensIn` | Use `DelphiClient.buyShares()` |
| `sellExactIn` | `marketProxy, outcomeIdx, sharesIn, minTokensOut` | Use `DelphiClient.sellShares()` |
| `redeem` | `marketProxy` | Use `DelphiClient.redeemMarket()` |

Prefer the SDK methods over calling the Gateway directly — they handle simulation, approval, and receipt waiting.

## Read patterns

### Implied probabilities for all outcomes
```typescript
const probs = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "spotImpliedProbabilities",
  args: [marketProxy, [0n, 1n]],  // adjust indices for outcome count
}) as bigint[];
// probs[i] / 1e18 * 100 = implied probability %
```

### Spot prices for all outcomes
```typescript
const prices = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "spotPrices",
  args: [marketProxy, [0n, 1n]],
}) as bigint[];
// prices[i] / 1e18 = USDC per share
```

### Full market state
```typescript
const onchainMarket = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "getMarket",
  args: [marketProxy],
}) as {
  config: {
    outcomeCount: bigint;
    k: bigint;
    tradingFee: bigint;         // 1e18 = 100%
    tradingDeadline: bigint;    // Unix timestamp
    settlementDeadline: bigint; // Unix timestamp
  };
  pool: bigint;        // Total collateral (18 dec)
  tradingFees: bigint; // Accumulated fees
};

const feePercent = Number(onchainMarket.config.tradingFee) / 1e18 * 100;
const deadline = new Date(Number(onchainMarket.config.tradingDeadline) * 1000);
```

### Share balance for a wallet
```typescript
const balance = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "balanceOf",
  args: [marketProxy, walletAddress as `0x${string}`, BigInt(outcomeIdx)],
}) as bigint;
// balance / 1e18 = shares
```

### Total supply per outcome
```typescript
const supplies = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "totalSupplies",
  args: [marketProxy, [0n, 1n]],
}) as bigint[];
```

## Token approval

The SDK resolves the collateral token address from `Gateway.token(marketProxy)` automatically — no need to hardcode it.

```typescript
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

const client = new DelphiClient();

// Check allowance
const { ownerAddress, allowance } = await client.getTokenAllowance({ marketAddress });

// Approve unlimited
await client.approveToken({ marketAddress });

// Approve exact amount (e.g. 100 USDC)
await client.approveToken({ marketAddress, amount: 100_000_000n });

// Idempotent — only sends tx if current allowance < minimumAmount
const { approvalNeeded, transactionHash } = await client.ensureTokenApproval({
  marketAddress,
  minimumAmount: requiredTokens,
  approveAmount: undefined,  // undefined = approve unlimited
});
```

## Signing configuration

### Private key (development)
```env
DELPHI_SIGNER_TYPE=private_key
WALLET_PRIVATE_KEY=0x<hex-private-key>
# Optional overrides (defaults are set automatically by DELPHI_NETWORK=testnet):
# GENSYN_RPC_URL=https://gensyn-testnet.g.alchemy.com/public
# GENSYN_CHAIN_ID=685685
# DELPHI_GATEWAY_CONTRACT=0x469388CD2498b43925f562FaA333D95135b66c06
```

### CDP Server Wallet (production)
```env
DELPHI_SIGNER_TYPE=cdp_server_wallet
CDP_API_KEY_ID=<key-id>
CDP_API_KEY_SECRET=<key-secret>
CDP_WALLET_SECRET=<wallet-secret>
CDP_WALLET_ADDRESS=0x<wallet-address>
# Optional overrides (defaults are set automatically by DELPHI_NETWORK=testnet):
# GENSYN_RPC_URL=https://gensyn-testnet.g.alchemy.com/public
# GENSYN_CHAIN_ID=685685
# DELPHI_GATEWAY_CONTRACT=0x469388CD2498b43925f562FaA333D95135b66c06
```

CDP Server Wallets are managed by Coinbase Developer Platform. The SDK uses `@coinbase/cdp-sdk` under the hood.
