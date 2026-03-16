---
name: delphi
description: "Gensyn Delphi prediction market platform. List and filter markets, fetch market details with live on-chain prices and implied probabilities, quote buy/sell trades, execute buy and sell transactions (with automatic token approval and slippage protection), view portfolio positions, browse trade history, redeem winnings from settled markets, and manage ERC-20 token allowances. Uses the @gensyn-ai/gensyn-delphi-sdk npm package on Gensyn testnet or mainnet. Invoke when the user wants to interact with Delphi prediction markets — browsing, researching, trading, or managing positions."
compatibility: "Requires dependencies installed via `npm install`. Only DELPHI_API_ACCESS_KEY and wallet signing credentials are mandatory. Network defaults (RPC URL, chain ID, gateway contract, API URL) are set automatically based on DELPHI_NETWORK (default: testnet)."
---

# Delphi

Gensyn Delphi is a dynamic parimutuel prediction market on Gensyn. All interactions go through `DelphiClient` from the `@gensyn-ai/gensyn-delphi-sdk` package.

## When to use this skill

- User wants to list, search, or browse prediction markets
- User wants prices, probabilities, or details for a specific market
- User wants to buy or sell outcome shares
- User wants to check their portfolio, positions, or trade history
- User wants to redeem winnings from a resolved market
- User wants to recover funds from expired markets they participated in (liquidations)
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
| `scripts/liquidate.ts` | Liquidate positions in expired markets | `npx tsx scripts/liquidate.ts <market-address> [market-address ...]` |

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

Only two things are **mandatory**: your API key and wallet signing credentials. Everything else has sensible defaults. Make sure to ask the user to set these if they are not available.

**Before setting up environment variables, always ask the user:**
1. "Do you want to use testnet or mainnet?" - Set `DELPHI_NETWORK` accordingly.
2. Ask for their API key and wallet signing credentials.

**Important**: All scripts use `dotenv/config` to automatically load environment variables from a `.env` file in the project root. When setting environment variables:

1. **Preferred**: Create or update a `.env` file in the project root with the required variables. The scripts will automatically load them.
2. **Alternative**: Export variables in the shell session using `export VARIABLE_NAME="value"` before running scripts.
3. **Avoid**: Do not pass environment variables inline with commands (e.g., `VAR="value" command`) as this exposes secrets in command history and is less maintainable.

Example `.env` file:
```env
DELPHI_NETWORK=testnet
DELPHI_API_ACCESS_KEY=your-api-key
CDP_API_KEY_ID=your-cdp-key-id
CDP_API_KEY_SECRET=your-cdp-secret
CDP_WALLET_SECRET=your-wallet-secret
CDP_WALLET_ADDRESS=0x...
```

### Mandatory

| Variable | Description |
|----------|-------------|
| `DELPHI_API_ACCESS_KEY` | API key — required for all REST calls |

**Plus one of these signing options:**

**Option A — Private key (simpler)**
| Variable | Description |
|----------|-------------|
| `WALLET_PRIVATE_KEY` | `0x`-prefixed hex private key |

Set `DELPHI_SIGNER_TYPE=private_key` (or pass `signerType: "private_key"` in config).

**Option B — Coinbase CDP Server Wallet (default signer)**
| Variable | Description |
|----------|-------------|
| `CDP_API_KEY_ID` | Coinbase CDP API key ID |
| `CDP_API_KEY_SECRET` | Coinbase CDP API key secret |
| `CDP_WALLET_SECRET` | CDP wallet encryption secret |
| `CDP_WALLET_ADDRESS` | CDP wallet address (`0x`-prefixed) |

### Network selection

**Important**: Always ask the user whether they want to use testnet or mainnet before setting up environment variables. Set `DELPHI_NETWORK` accordingly.

| Variable | Values | Default |
|----------|--------|---------|
| `DELPHI_NETWORK` | `"testnet"` \| `"mainnet"` | `"testnet"` |

When `DELPHI_NETWORK=testnet` (default), the SDK automatically uses:
- RPC URL: `https://gensyn-testnet.g.alchemy.com/public`
- Chain ID: `685685`
- Gateway: `0x469388CD2498b43925f562FaA333D95135b66c06`
- API URL: `https://delphi-agentic-trading-api.gensyn-staging.ai/`

When `DELPHI_NETWORK=mainnet`, mainnet defaults are used instead.

**Agent instructions**: Before setting up environment variables, explicitly ask the user: "Do you want to use testnet or mainnet?" Then set `DELPHI_NETWORK` in the `.env` file (or export it) based on their response.

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

```typescript
const { positions } = await client.listPositions({
  wallet: "0x...",
  redeemed: false,  // only active positions
  limit: 50,
});

for (const p of positions ?? []) {
  const shares = Number(BigInt(p.shares)) / 1e18;
  const marketStatus = (p as any).marketStatus ?? "unknown";
  console.log(`Market ${p.marketProxy} | Status ${marketStatus} | Outcome ${p.outcomeIdx} | ${shares} shares`);
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

### Liquidate expired markets (portfolio recovery for unredeemable markets)

Use this pattern when the user wants to recover what they can from **expired** markets they participated in:

```typescript
const wallet = "0x..." as `0x${string}`;
const { positions } = await client.listPositions({ wallet, redeemed: false, limit: 100 });

type LiquidationResult = {
  marketAddress: `0x${string}`;
  success: boolean;
  tokensOut?: bigint;
  error?: string;
};

const expiredMarkets = new Set<string>();

for (const p of positions ?? []) {
  const status = (p as any).marketStatus;
  if (status === "expired") expiredMarkets.add(p.marketProxy);
}

const expired = Array.from(expiredMarkets) as `0x${string}`[];

const results: LiquidationResult[] = [];
let totalTokensOut = 0n;

for (const marketAddress of expired) {
  const outcomeIndices = Array.from(
    new Set(
      (positions ?? [])
        .filter((p) => p.marketProxy === marketAddress)
        .map((p) => Number((p as any).outcomeIdx)),
    ),
  );

  if (outcomeIndices.length === 0) continue;

  try {
    const { totalTokensOut: tokensOut } = await client.liquidate({
      marketAddress,
      outcomeIndices,
    });
    results.push({ marketAddress, success: true, tokensOut });
    totalTokensOut += tokensOut;
  } catch (e: any) {
    results.push({
      marketAddress,
      success: false,
      error: e.shortMessage ?? e.message ?? "Unknown error",
    });
  }
}

// handle results / display totalTokensOut...
```

The `scripts/liquidate.ts` script takes one or more market addresses (like `redeem.ts`), resolves the signer’s positions in those markets, and calls `client.liquidate` for each.

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
