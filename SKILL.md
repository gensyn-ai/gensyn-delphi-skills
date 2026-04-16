---
name: delphi
description: "Gensyn Delphi information market tools. List and filter markets (including verifiable-only filter), fetch market details with live on-chain prices and implied probabilities, quote buy/sell trades, execute buy and sell transactions (with automatic token approval and slippage protection), view portfolio positions, browse trade history, query on-chain event data via Goldsky subgraph (buys, sells, redemptions, liquidations, winner submissions), check subgraph indexing status, redeem winnings from settled markets, manage ERC-20 token allowances, and check wallet ETH and token balances. Uses the @gensyn-ai/gensyn-delphi-sdk npm package on Gensyn testnet or mainnet. Invoke when the user wants to interact with Delphi information markets — browsing, researching, trading, querying historical on-chain data, managing positions, or checking balances."
compatibility: "Requires dependencies installed via `npm install`. Only DELPHI_API_ACCESS_KEY and wallet signing credentials are mandatory. Network defaults (RPC URL, chain ID, gateway contract, API URL) are set automatically based on DELPHI_NETWORK (default: testnet)."
---

# Delphi

Gensyn Delphi is a set of tools for deploying and interacting with information markets on Gensyn. Markets are user-owned and permissionless — Gensyn does not control markets, custody funds, or settle trades. The API is maintained for convenience. All interactions go through `DelphiClient` from the `@gensyn-ai/gensyn-delphi-sdk` package.

## How dynamic parimutuel markets work

Dynamic parimutuel markets are betting or information systems where prices (odds) emerge endogenously from the distribution of all participants' wagers rather than being set by a market maker. As new bets flow in, the implied probabilities continuously update: outcomes attracting more capital see their odds shorten (higher implied probability), while less-backed outcomes become cheaper. Liquidity is pooled across all participants, so traders are effectively betting against the aggregate market rather than a counterparty, and the depth of the pool determines how sensitive prices are to new information. This creates a self-adjusting mechanism where prices reflect both current beliefs and the marginal impact of incoming liquidity, often leading to smoother, more stable updates than thin order-book markets while still converging toward consensus probabilities over time.

## When to use this skill

- User wants to list, search, or browse information markets
- User wants prices, probabilities, or details for a specific market
- User wants to buy or sell outcome shares
- User wants to check their portfolio, positions, or trade history
- User wants to redeem winnings from a resolved market
- User wants to liquidate positions in an expired (unresolved) market
- If the user asks you to create a market, remind them that markets not created on the UI will not show up on the UI
- User wants to check or set token approval for trading
- User wants to query historical on-chain trade data (buys, sells, redemptions, liquidations)
- User wants recent trades for a market or wallet via the Goldsky subgraph
- User wants to check their wallet ETH or token balances
- User wants to get ETH or USDC to fund their wallet for trading (testnet faucet, bridging)
- Any question about Delphi information markets, or on-chain trading on Gensyn

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
| `scripts/redeem.ts` | Redeem winnings from settled markets | `npx tsx scripts/redeem.ts <market-address> [market-address ...]` |
| `scripts/liquidate.ts` | Liquidate positions in expired markets | `npx tsx scripts/liquidate.ts <market-address> [market-address ...]` |
| `scripts/token-approval.ts` | Check or set token approval | `npx tsx scripts/token-approval.ts <market-address> [amount\|unlimited]` |
| `scripts/list-recent-trades.ts` | List recent trades via subgraph | `npx tsx scripts/list-recent-trades.ts <market-proxy-address> [limit]` |
| `scripts/get-wallet-balances.ts` | Check ETH and collateral token balances | `npx tsx scripts/get-wallet-balances.ts` |
| `scripts/testnet-faucet.ts` | Claim 1,000 testnet USDC from the Gensyn faucet | `npx tsx scripts/testnet-faucet.ts` |
| `scripts/bridge-eth-to-gensyn-testnet.ts` | Bridge ETH from Sepolia to Gensyn Testnet | `npx tsx scripts/bridge-eth-to-gensyn-testnet.ts <amount-eth>` |
| `scripts/bridge-eth-to-gensyn-mainnet.ts` | Bridge ETH from Ethereum mainnet to Gensyn Mainnet | `npx tsx scripts/bridge-eth-to-gensyn-mainnet.ts <amount-eth>` |

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
| `DELPHI_API_ACCESS_KEY` | **Testnet:** Generate at https://delphi-api-access.gensyn.ai/ · **Mainnet:** Generate at https://api-access.delphi.fyi/ |

**Plus one of these signing options (tell the user to pick one):**

**Option A — Private key**
| Variable | Description |
|----------|-------------|
| `DELPHI_SIGNER_TYPE` | Set to `private_key` |
| `WALLET_PRIVATE_KEY` | `0x`-prefixed hex private key for their wallet |

**Option B — Coinbase CDP Server Wallet (default signer, no `DELPHI_SIGNER_TYPE` needed)**
| Variable | Where to get it |
|----------|----------------|
| `CDP_API_KEY_ID` | Server Wallet v2 Quickstart (https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart) |
| `CDP_API_KEY_SECRET` | Server Wallet v2 Quickstart (https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart) |
| `CDP_WALLET_SECRET` | Server Wallet v2 Quickstart (https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart) |
| `CDP_WALLET_ADDRESS` | Their CDP wallet address (`0x`-prefixed) (see https://docs.cdp.coinbase.com/server-wallets/v2/introduction/quickstart) |

Make sure to also convey the following 2 points to the user -
- For the CDP option, private keys are secured in Coinbase's Trusted Execution Environment (TEE) and never leave the TEE. See [Server Wallet v2 docs](https://docs.cdp.coinbase.com/server-wallets/v2/introduction/welcome) for details.

- To execute Delphi transactions, your signer wallet must have `ETH` (for gas) and `USDC` on the Gensyn chain.

### Network selection

| Variable | Values | Default |
|----------|--------|---------|
| `DELPHI_NETWORK` | `"testnet"` \| `"mainnet"` | `"testnet"` |

The SDK defaults to testnet — `DELPHI_NETWORK` is optional. Only set it if the user explicitly wants mainnet.

When `DELPHI_NETWORK=testnet` (default), the SDK automatically uses:
- RPC URL: `https://gensyn-testnet.g.alchemy.com/public`
- Chain ID: `685685`
- Gateway: `0x7b8FDBD187B0Be5e30e48B1995df574A62667147`
- Token: `0x0724D6079b986F8e44bDafB8a09B60C0bd6A45a1`
- API URL: `https://delphi-api.gensyn.ai/`
- Subgraph URL: `https://api.goldsky.com/api/public/project_cmnoqdag1obop01z3efnu8ssq/subgraphs/delphi-testnet/1.0.0/gn`

When `DELPHI_NETWORK=mainnet`, mainnet defaults are used instead.

### Optional overrides

These override the network defaults if you need to point at a custom endpoint:

| Variable | Description |
|----------|-------------|
| `GENSYN_RPC_URL` | Custom RPC endpoint |
| `GENSYN_CHAIN_ID` | Custom chain ID |
| `DELPHI_GATEWAY_CONTRACT` | Custom gateway contract address |
| `DELPHI_API_BASE_URL` | Custom API base URL |
| `DELPHI_SUBGRAPH_URL` | Custom Goldsky subgraph endpoint |
| `DELPHI_TOKEN_ADDRESS` | Override the ERC-20 collateral token address |
| `DELPHI_SIGNER_TYPE` | `"private_key"` or `"cdp_server_wallet"` (default) |

## Client setup

```typescript
import {
  DelphiClient,
  SubgraphClient,
  createPrivateKeySigner,
  createCdpSigner,
} from "@gensyn-ai/gensyn-delphi-sdk";

// All config is read from environment variables automatically.
const client = new DelphiClient();
```

## Units

| Type | Raw representation | Human conversion |
|------|-------------------|-----------------|
| Shares | 18-decimal bigint | `1n * 10n**18n` = 1 share |
| USDC | 6-decimal bigint | `1_000_000n` = 1 USDC |
| Implied probability | 18-decimal (1e18 = 100%) | `5n * 10n**17n` = 50% |
| Spot price | 6-decimal (1e6 = 1.0 USDC/share) | `600_000n` = 0.60 USDC/share |

```typescript
// Human → raw bigint (inputs to SDK)
const sharesToBigint = (n: number) => BigInt(Math.round(n * 1e18));
const usdcToBigint   = (n: number) => BigInt(Math.round(n * 1e6));

// Raw bigint → display string
const toUsdc      = (n: bigint) => `${(Number(n) / 1e6).toFixed(6)} USDC`;
const toShares    = (n: bigint) => `${(Number(n) / 1e18).toFixed(4)} shares`;
const toProb      = (n: bigint) => `${(Number(n) / 1e18 * 100).toFixed(2)}%`;
const toSpotPrice = (n: bigint) => `${(Number(n) / 1e6).toFixed(4)} USDC/share`;
```

## Core patterns

> **Tip**: See `scripts/list-markets.ts` for a complete working example.

### List markets

```typescript
const { markets } = await client.listMarkets({
  status: "open",        // "open" | "awaiting_settlement" | "settled" | "expired"
  category: "crypto",   // crypto, culture, economics, miscellaneous, politics, sports
  limit: 20,
  skip: 0,
  orderBy: "liquidity", // "liquidity" (default) | "created"
  verifiable: true,     // optional: filter to markets with verifiable settlement
});

for (const market of markets ?? []) {
  const meta = market.metadata as {
    question?: string;
    outcomes?: string[];
    model?: { model_identifier?: string; prompt_context?: string };
    initial_liquidity?: string;
    version?: string;
  } | null;
  console.log(market.id, meta?.question);
  // market.id                     = market address — use this as marketAddress in all SDK calls
  // market.implementation         = underlying logic contract (NOT used for SDK calls)
  // market.category               = market category string (e.g. "crypto")
  // market.verifiable             = true if market uses verifiable settlement
  // market.tradingFee             = 18-decimal bigint string (e.g. "20000000000000000" = 2%); null if no fee
  //                                 convert: Number(market.tradingFee) / 1e18 * 100 → fee percentage
  // market.winningOutcomeIdx      = set after settlement, otherwise null
  // market.resolvesAt             = ISO timestamp for when market resolves, or null
  // market.settlesAt              = ISO timestamp for scheduled settlement, or null
  // market.proof                  = settlement proof string, or null
  // market.error                  = resolution error message if settlement failed, or null
  // market.fetchResponseStatus    = metadata fetch status string (e.g. "success"), or null
  // market.metadataUriContentHash = hex hash of the fetched metadata content (e.g. "0x9434...")
  // market.dataSources            = data source identifiers, or null
}
```

### Get a single market

> **Tip**: See `scripts/get-market.ts` for a complete working example.

```typescript
const market = await client.getMarket({ id: "<market-id>" });
const meta = market.metadata as { question?: string; outcomes?: string[] } | null;
// market.id             = use as marketAddress for all SDK calls (quoteBuy, buyShares, etc.)
// market.implementation = the logic contract address — NOT the marketAddress for SDK calls
```

### Live prices (on-chain read via Gateway ABI)

```typescript
import { createPublicClient, http, defineChain, type Abi } from "viem";
import { DYNAMIC_PARIMUTUEL_GATEWAY_ABI, ERC20_ABI } from "@gensyn-ai/gensyn-delphi-sdk";
// ERC20_ABI is also exported for direct token interactions if needed

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

### Liquidate expired positions

> **Tip**: See `scripts/liquidate.ts` for a complete working example.

Liquidation is for positions in **expired** markets that were never settled. Unlike redemption (which is for settled markets with a winner), liquidation recovers tokens from markets that expired without resolution.

```typescript
// Liquidate a single market — pass all outcome indices you hold
const { transactionHash, sharesIn, totalTokensOut } = await client.liquidate({
  marketAddress: "0x..." as `0x${string}`,
  outcomeIndices: [0, 1],  // all outcome indices with positions
});
// sharesIn: bigint[] — shares burned per outcome index
// totalTokensOut: bigint — total USDC recovered across all outcomes

// Derive outcome indices from listPositions:
const { positions } = await client.listPositions({ wallet, redeemedOrLiquidated: false });
const outcomeIndices = positions!
  .filter(p => p.marketProxy === marketAddress && BigInt(p.shares) > 0n)
  .map(p => Number(p.outcomeIdx));
```

### Token approval

> **Tip**: See `scripts/token-approval.ts` for a complete working example.

```typescript
// Check current allowance
const { ownerAddress, allowance } = await client.getTokenAllowance({ marketAddress });

// Approve unlimited
await client.approveToken({ marketAddress });

// Approve specific amount (50 USDC)
await client.approveToken({ marketAddress, amount: 50_000_000n });

// Idempotent: only approves if current allowance is below minimum
// Response always includes current allowance, plus transactionHash if a tx was sent
const { approvalNeeded, allowance, transactionHash } = await client.ensureTokenApproval({
  marketAddress,
  minimumAmount: requiredTokens,
  approveAmount: 100_000_000n,  // optional: amount to approve if needed (defaults to max uint256)
});
```

### Check wallet balances

> **Tip**: See `scripts/get-wallet-balances.ts` for a complete working example.

```typescript
// ETH (native gas token)
const ethBalance = await client.getEthBalance();
console.log(`ETH: ${(Number(ethBalance) / 1e18).toFixed(6)}`);

// ERC-20 collateral token (defaults to SDK-configured token address)
const tokenAddress = client.getTokenAddress(); // inspect the configured token address
const { balance, decimals } = await client.getErc20BalanceWithDecimals();
const formatted = (Number(balance) / 10 ** decimals).toFixed(decimals > 6 ? 6 : decimals);
console.log(`Token (${tokenAddress}): ${formatted}`);

// Or fetch raw balance only (6-decimal for USDC)
const raw = await client.getErc20Balance(); // uses default token; pass address to override
```

### Query recent trades via subgraph

> **Tip**: See `scripts/list-recent-trades.ts` for a complete working example.

The SDK's `SubgraphClient` queries on-chain event data indexed by a Goldsky subgraph. Access it via `client.getSubgraph()`.

```typescript
const subgraph = client.getSubgraph();

// Convenience method: get buys and sells for a market
const { buys, sells } = await subgraph.getMarketTrades(
  "0x..." as string,  // market proxy address
  { first: 20 }
);

for (const buy of buys) {
  const cost = Number(BigInt(buy.tokensIn ?? "0")) / 1e6;
  const shares = Number(BigInt(buy.sharesOut ?? "0")) / 1e18;
  const time = new Date(Number(buy.timestamp_) * 1000).toLocaleString();
  console.log(`BUY ${time} | ${cost.toFixed(4)} USDC → ${shares.toFixed(4)} shares`);
}

// Arbitrary GraphQL: recent buys across all markets
// SubgraphBuy, SubgraphSell, SubgraphMeta are all exported from the SDK for typing:
//   import type { SubgraphBuy, SubgraphSell, SubgraphMeta } from "@gensyn-ai/gensyn-delphi-sdk";
const data = await subgraph.query<{ gatewayBuys: SubgraphBuy[] }>(`{
  gatewayBuys(first: 5, orderBy: timestamp_, orderDirection: desc) {
    id buyer marketProxy tokensIn sharesOut timestamp_
  }
}`);

// Check subgraph indexing status (block number, deployment, error flag)
const meta = await subgraph.getMeta();
console.log(`Block: ${meta.block.number}, indexing errors: ${meta.hasIndexingErrors}`);
```

Available entities: `gatewayBuys`, `gatewaySells`, `gatewayRedemptions`, `gatewayLiquidations`, `gatewayWinnerSubmitteds`. All support filtering (`where`), ordering (`orderBy` + `orderDirection`), and pagination (`first` + `skip`).

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
| [reference/subgraph.md](reference/subgraph.md) | Goldsky subgraph GraphQL schema, `SubgraphClient` API, entity types, filtering, raw query examples |
| [reference/funding.md](reference/funding.md) | Getting ETH and USDC onto Gensyn (testnet faucet, OP Stack bridge, LayerZero USDC bridge) |
