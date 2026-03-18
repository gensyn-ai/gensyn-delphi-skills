---
name: delphi
description: "Gensyn Delphi prediction market platform. List and filter markets, fetch market details with live on-chain prices and implied probabilities, quote buy/sell trades, execute buy and sell transactions (with automatic token approval and slippage protection), view portfolio positions, browse trade history, redeem winnings from settled markets, and manage ERC-20 token allowances. Uses the @gensyn-ai/gensyn-delphi-sdk npm package on Gensyn testnet or mainnet. Invoke when the user wants to interact with Delphi prediction markets — browsing, researching, trading, or managing positions."
compatibility: "Requires dependencies installed via `npm install`. Only DELPHI_API_ACCESS_KEY and wallet signing credentials are mandatory. Network defaults (RPC URL, chain ID, gateway contract, API URL) are set automatically based on DELPHI_NETWORK (default: testnet)."
---

# Delphi

Gensyn Delphi is a dynamic parimutuel prediction market on Gensyn. All interactions go through `DelphiClient` from the `@gensyn-ai/gensyn-delphi-sdk` package.

## How dynamic parimutuel markets work

Dynamic parimutuel markets are betting or prediction systems where prices (odds) emerge endogenously from the distribution of all participants' wagers rather than being set by a market maker. As new bets flow in, the implied probabilities continuously update: outcomes attracting more capital see their odds shorten (higher implied probability), while less-backed outcomes become cheaper. Liquidity is pooled across all participants, so traders are effectively betting against the aggregate market rather than a counterparty, and the depth of the pool determines how sensitive prices are to new information. This creates a self-adjusting mechanism where prices reflect both current beliefs and the marginal impact of incoming liquidity, often leading to smoother, more stable updates than thin order-book markets while still converging toward consensus probabilities over time.

## When to use this skill

- User wants to list, search, or browse prediction markets
- User wants prices, probabilities, or details for a specific market
- User wants to buy or sell outcome shares
- User wants to check their portfolio, positions, or trade history
- User wants to redeem winnings from a resolved market
- User wants to check or set token approval for trading
- Any question about Delphi, Gensyn prediction markets, or on-chain trading on Gensyn

## Installation

```bash
npm install
```

This will install all required dependencies including the SDK, dotenv, viem, and development tools.

## Example scripts

This repository includes working example scripts in the `scripts/` folder that demonstrate all common operations. These provide a paved path for agents to reference or run directly:

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/list-markets.ts` | List and filter markets | `npx tsx scripts/list-markets.ts [status] [category] [limit]` |
| `scripts/get-market.ts` | Get details for a specific market | `npx tsx scripts/get-market.ts <market-id>` |
| `scripts/quote-buy.ts` | Get buy quote (read-only) | `npx tsx scripts/quote-buy.ts <market-address> <outcome-idx> <shares>` |
| `scripts/quote-sell.ts` | Get sell quote (read-only) | `npx tsx scripts/quote-sell.ts <market-address> <outcome-idx> <shares>` |
| `scripts/buy-shares.ts` | Buy shares (on-chain) | `npx tsx scripts/buy-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]` |
| `scripts/sell-shares.ts` | Sell shares (on-chain) | `npx tsx scripts/sell-shares.ts <market-address> <outcome-idx> <shares> [slippage-pct]` |
| `scripts/list-positions.ts` | List wallet positions | `npx tsx scripts/list-positions.ts [wallet-address]` |
| `scripts/redeem.ts` | Redeem winnings from settled markets | `npx tsx scripts/redeem.ts <market-address>` |
| `scripts/token-approval.ts` | Check or set token approval | `npx tsx scripts/token-approval.ts <market-address> [amount]` |

All scripts use the shared client setup from `scripts/client.ts` which handles environment variable configuration automatically. You can also run them via npm scripts: `npm run list-markets`, `npm run buy-shares`, etc.

### Before running scripts

Before running any script in `scripts/`, ensure the runtime is prepared.

**Required setup checklist:**
1. Install dependencies by running `npm install`.
2. Verify required environment variables are set:
   - Check for a `.env` file in the project root (preferred), or
   - Verify environment variables are exported in the shell session
3. If either check fails, fix it before running any task script.
4. Do not call `scripts/*.ts` until setup succeeds.
5. **Do not pass environment variables inline with commands** - use `.env` file or `export` statements instead.

## Environment variables

Only two things are **mandatory**: your API key and wallet signing credentials. Everything else has sensible defaults. The SDK defaults to `testnet` if `DELPHI_NETWORK` is not set.

**Agent instructions for missing env vars:**

When required environment variables are not set, do NOT ask the user for their values in chat. Instead:

1. Tell the user which variables are needed (list them below).
2. Tell them where to get each value.
3. Ask them to create a `.env` file in the project root themselves with those values.
4. Wait for them to confirm the file is created before proceeding.
5. **NEVER read the `.env` file** — treat it as a secret store the agent must not access.
6. Only as a **last resort** (if the user explicitly asks you to create the file for them after already being prompted): offer to write the `.env` file using values they paste directly into chat.

**Mandatory variables to communicate to the user:**

| Variable | Where to get it |
|----------|----------------|
| `DELPHI_API_ACCESS_KEY` | Generate at https://delphi-api.gensyn.ai |

**Plus one of these signing options (tell the user to pick one):**

**Option A — Private key (simpler)**
| Variable | Description |
|----------|-------------|
| `DELPHI_SIGNER_TYPE` | Set to `private_key` |
| `WALLET_PRIVATE_KEY` | `0x`-prefixed hex private key for their wallet |

**Option B — Coinbase CDP Server Wallet (default signer, no `DELPHI_SIGNER_TYPE` needed)**
| Variable | Where to get it |
|----------|----------------|
| `CDP_API_KEY_ID` | Coinbase CDP portal (https://portal.cdp.coinbase.com) |
| `CDP_API_KEY_SECRET` | Coinbase CDP portal |
| `CDP_WALLET_SECRET` | Coinbase CDP portal |
| `CDP_WALLET_ADDRESS` | Their CDP wallet address (`0x`-prefixed) |

### Network selection

| Variable | Values | Default |
|----------|--------|---------|
| `DELPHI_NETWORK` | `"testnet"` \| `"mainnet"` | `"testnet"` |

The SDK defaults to testnet — `DELPHI_NETWORK` is optional. Only set it if the user explicitly wants mainnet.

When `DELPHI_NETWORK=testnet` (default), the SDK automatically uses:
- RPC URL: `https://gensyn-testnet.g.alchemy.com/public`
- Chain ID: `685685`
- Gateway: `0x469388CD2498b43925f562FaA333D95135b66c06`
- API URL: `https://delphi-agentic-trading-api.gensyn-staging.ai/`

When `DELPHI_NETWORK=mainnet`, mainnet defaults are used instead.

### Optional overrides

These override the network defaults if you need to point at a custom endpoint:

| Variable | Description |
|----------|-------------|
| `GENSYN_RPC_URL` | Custom RPC endpoint |
| `GENSYN_CHAIN_ID` | Custom chain ID |
| `DELPHI_GATEWAY_CONTRACT` | Custom gateway contract address |
| `DELPHI_API_BASE_URL` | Custom API base URL |
| `DELPHI_SIGNER_TYPE` | `"private_key"` or `"cdp_server_wallet"` (default) |
| `CF_ACCESS_ID` | Cloudflare Access client ID |
| `CF_ACCESS_SECRET` | Cloudflare Access client secret |

## Client setup

```typescript
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

// All config is read from environment variables automatically.
const client = new DelphiClient();

// With Cloudflare Access:
const client = new DelphiClient({
  extraHeaders: {
    "CF-Access-Client-Id": process.env.CF_ACCESS_ID!,
    "CF-Access-Client-Secret": process.env.CF_ACCESS_SECRET!,
  },
});
```

## Units

| Type | Raw representation | Human conversion |
|------|-------------------|-----------------|
| Shares | 18-decimal bigint | `1n * 10n**18n` = 1 share |
| USDC | 6-decimal bigint | `1_000_000n` = 1 USDC |
| Implied probability | 18-decimal (1e18 = 100%) | `5n * 10n**17n` = 50% |
| Spot price | 18-decimal (1e18 = 1.0 USDC/share) | `6n * 10n**17n` = 0.60 USDC/share |

```typescript
// Human → raw bigint (inputs to SDK)
const sharesToBigint = (n: number) => BigInt(Math.round(n * 1e18));
const usdcToBigint   = (n: number) => BigInt(Math.round(n * 1e6));

// Raw bigint → display string
const toUsdc      = (n: bigint) => `${(Number(n) / 1e6).toFixed(6)} USDC`;
const toShares    = (n: bigint) => `${(Number(n) / 1e18).toFixed(4)} shares`;
const toProb      = (n: bigint) => `${(Number(n) / 1e18 * 100).toFixed(2)}%`;
const toSpotPrice = (n: bigint) => `${(Number(n) / 1e18).toFixed(4)} USDC/share`;
```

## Core patterns

> **Tip**: See `scripts/list-markets.ts` for a complete working example.

### List markets

```typescript
const { markets } = await client.listMarkets({
  status: "open",   // "open" | "closed" | "settled"
  category: "crypto",
  limit: 20,
  skip: 0,
});

for (const market of markets ?? []) {
  const meta = market.metadata as { question?: string; outcomes?: string[] } | null;
  console.log(market.id, meta?.question);
  // market.implementation = on-chain proxy address (use as marketAddress)
}
```

### Get a single market

> **Tip**: See `scripts/get-market.ts` for a complete working example.

```typescript
const market = await client.getMarket({ id: "<market-id>" });
const meta = market.metadata as { question?: string; outcomes?: string[] } | null;
// market.implementation = marketAddress for all on-chain calls
```

### Live prices (on-chain read via Gateway ABI)

```typescript
import { createPublicClient, http, defineChain, type Abi } from "viem";
import { DYNAMIC_PARIMUTUEL_GATEWAY_ABI } from "@gensyn-ai/gensyn-delphi-sdk";

const chain = defineChain({
  id: Number(process.env.GENSYN_CHAIN_ID),
  name: "Gensyn Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [process.env.GENSYN_RPC_URL!] } },
});
const publicClient = createPublicClient({ chain, transport: http(process.env.GENSYN_RPC_URL!) });
const gateway = process.env.DELPHI_GATEWAY_CONTRACT as `0x${string}`;

// Get implied probabilities for all outcomes
const outcomeIndices = [0n, 1n]; // adjust for outcome count
const probs = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "spotImpliedProbabilities",
  args: [marketProxy, outcomeIndices],
}) as bigint[];

// Get spot prices
const prices = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "spotPrices",
  args: [marketProxy, outcomeIndices],
}) as bigint[];
```

### Quote buy (read-only, no gas)

> **Tip**: See `scripts/quote-buy.ts` for a complete working example.

```typescript
const { tokensIn } = await client.quoteBuy({
  marketAddress: "0x..." as `0x${string}`,
  outcomeIdx: 0,
  sharesOut: BigInt(Math.round(10 * 1e18)),  // 10 shares
});
// tokensIn = USDC cost in 6-decimal bigint
const costUsdc = Number(tokensIn) / 1e6;
```

### Quote sell (read-only, no gas)

> **Tip**: See `scripts/quote-sell.ts` for a complete working example.

```typescript
const { tokensOut } = await client.quoteSell({
  marketAddress: "0x..." as `0x${string}`,
  outcomeIdx: 0,
  sharesIn: BigInt(Math.round(5 * 1e18)),  // 5 shares
});
const payoutUsdc = Number(tokensOut) / 1e6;
```

### Buy shares (on-chain, with auto-approval)

> **Tip**: See `scripts/buy-shares.ts` for a complete working example.

```typescript
const marketAddress = "0x..." as `0x${string}`;
const outcomeIdx = 0;
const sharesOut = BigInt(Math.round(10 * 1e18));  // 10 shares

// 1. Quote
const { tokensIn } = await client.quoteBuy({ marketAddress, outcomeIdx, sharesOut });

// 2. Ensure USDC approval (idempotent — only sends tx if needed)
await client.ensureTokenApproval({ marketAddress, minimumAmount: tokensIn });

// 3. Buy with 2% slippage
const maxTokensIn = tokensIn * 102n / 100n;
const { transactionHash } = await client.buyShares({
  marketAddress,
  outcomeIdx,
  sharesOut,
  maxTokensIn,
});
```

### Sell shares (on-chain)

> **Tip**: See `scripts/sell-shares.ts` for a complete working example.

```typescript
const sharesIn = BigInt(Math.round(5 * 1e18));

// 1. Quote
const { tokensOut } = await client.quoteSell({ marketAddress, outcomeIdx, sharesIn });

// 2. Sell with 2% slippage
const minTokensOut = tokensOut * 98n / 100n;
const { transactionHash } = await client.sellShares({
  marketAddress,
  outcomeIdx,
  sharesIn,
  minTokensOut,
});
```

### List positions

> **Tip**: See `scripts/list-positions.ts` for a complete working example.

> **Important**: Positions with `shares` equal to `0` (i.e. `BigInt(p.shares) === 0n`) represent fully exited stakes. These cannot be redeemed or liquidated since the wallet holds no shares. Always filter out zero-share positions before attempting redeem or liquidate operations.

```typescript
const { positions } = await client.listPositions({
  wallet: "0x...",
  redeemedOrLiquidated: false,  // only active positions
  limit: 50,
});

for (const p of positions ?? []) {
  const shares = Number(BigInt(p.shares)) / 1e18;
  if (shares === 0) continue; // no stake — skip
  console.log(`Market ${p.marketProxy} | Outcome ${p.outcomeIdx} | ${shares} shares`);
}
```

### List trades

```typescript
const { trades } = await client.listTrades({
  trader: "0x...",
  limit: 50,
});
```

### Redeem settled positions

> **Tip**: See `scripts/redeem.ts` for a complete working example.

> **Important**: Only positions with non-zero shares can be redeemed. If `listPositions` returns a position with `shares === "0"`, the wallet has no stake in that market and calling `redeemMarket` will fail or return nothing. Always check shares > 0 before redeeming.

```typescript
// Single market
const { transactionHash, sharesIn, tokensOut } = await client.redeemMarket({
  marketAddress: "0x..." as `0x${string}`,
});

// Batch
const { results, totalTokensOut } = await client.redeemPositions({
  marketAddresses: ["0x...", "0x..."],
});
for (const r of results) {
  if (r.success) console.log(`Redeemed ${Number(r.tokensOut!) / 1e6} USDC from ${r.marketAddress}`);
  else console.error(`Failed ${r.marketAddress}: ${r.error}`);
}
```

### Token approval

> **Tip**: See `scripts/token-approval.ts` for a complete working example.

```typescript
// Check current allowance
const { ownerAddress, allowance } = await client.getTokenAllowance({ marketAddress });

// Approve unlimited (recommended)
await client.approveToken({ marketAddress });

// Approve specific amount (50 USDC)
await client.approveToken({ marketAddress, amount: 50_000_000n });

// Idempotent: only approves if current allowance is below minimum
const { approvalNeeded } = await client.ensureTokenApproval({
  marketAddress,
  minimumAmount: requiredTokens,
});
```

## Error handling

| Error | Cause | Fix |
|-------|-------|-----|
| `TokensInExceedsMax` | Price moved above `maxTokensIn` | Re-quote, increase slippage |
| `TokensOutBelowMin` | Price moved below `minTokensOut` | Re-quote, increase slippage |
| `MarketNotOpen` | Market is closed or settled | Check `market.status` first |
| `SharesInExceedSupply` | Selling more shares than held | Check position before selling |
| `Requires apiKey` | Missing `DELPHI_API_ACCESS_KEY` | Set env var |
| `Requires rpcUrl` | Missing `GENSYN_RPC_URL` | Set env var or let network default apply |
| `Requires privateKey` | Missing `WALLET_PRIVATE_KEY` | Set env var or switch to CDP signer |
| `CDP signing requires ...` | Missing CDP env vars | Set all `CDP_` vars |

## Reference files (load on demand)

| File | When to load |
|------|-------------|
| [reference/markets.md](reference/markets.md) | Full `listMarkets`/`getMarket` params, `Market` type schema, metadata structure |
| [reference/trading.md](reference/trading.md) | Trading mechanics, slippage formulas, parimutuel pricing explainer |
| [reference/positions.md](reference/positions.md) | `Position`/`Trade` type schemas, batch redemption patterns, portfolio estimation |
| [reference/onchain.md](reference/onchain.md) | Full Gateway ABI function list, direct `viem` read patterns, signing config |
