# Subgraph (Goldsky) Reference

The Delphi SDK includes a `SubgraphClient` that queries on-chain event data indexed by a [Goldsky](https://goldsky.com/) subgraph. This gives read-only access to historical buys, sells, redemptions, liquidations, and winner submissions — without needing an archive node or parsing raw logs.

## Accessing the subgraph client

```typescript
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

const client = new DelphiClient();
const subgraph = client.getSubgraph();
```

`getSubgraph()` returns a `SubgraphClient` instance configured with the correct Goldsky endpoint for the active network.

### URL resolution order

1. `config.subgraphUrl` (constructor option on `DelphiClient`)
2. `DELPHI_SUBGRAPH_URL` environment variable
3. Network default (testnet or mainnet)

| Network | Default endpoint |
|---------|-----------------|
| testnet | `https://api.goldsky.com/api/public/project_cmnoqdag1obop01z3efnu8ssq/subgraphs/delphi-testnet/1.0.0/gn` |
| mainnet | Not yet available |

## SubgraphClient API

### query — arbitrary GraphQL

```typescript
query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>
```

Execute any GraphQL query against the subgraph. Returns the `data` field from the response or throws on errors.

### getMarketTrades — buy/sell history for a market

```typescript
getMarketTrades(
  marketProxy: string,
  params?: { first?: number; skip?: number }
): Promise<{ buys: SubgraphBuy[]; sells: SubgraphSell[] }>
```

Returns all buy and sell events for a given market proxy address, sorted most-recent-first. Defaults: `first = 100`, `skip = 0`.

### getMeta — indexing metadata

```typescript
getMeta(): Promise<SubgraphMeta>
```

Returns the current indexed block, deployment hash, and whether the subgraph has indexing errors. Useful for checking data freshness.

## Types

`SubgraphBuy`, `SubgraphSell`, and `SubgraphMeta` are exported directly from the SDK:

```typescript
import type { SubgraphBuy, SubgraphSell, SubgraphMeta } from "@gensyn-ai/gensyn-delphi-sdk";
```

For other entities (redemptions, liquidations, winner submissions) define inline types as shown in the examples below.

### SubgraphBuy

```typescript
interface SubgraphBuy {
  id: string;
  block_number: string;
  timestamp_: string;          // Unix seconds as string
  transactionHash_: string;
  contractId_: string;
  marketProxy: string | null;
  buyer: string | null;        // Wallet address
  outcomeIdx: string | null;   // Outcome index as string
  tokensIn: string | null;     // USDC spent (6-decimal bigint as string)
  sharesOut: string | null;    // Shares received (18-decimal bigint as string)
}
```

### SubgraphSell

```typescript
interface SubgraphSell {
  id: string;
  block_number: string;
  timestamp_: string;
  transactionHash_: string;
  contractId_: string;
  marketProxy: string | null;
  seller: string | null;
  outcomeIdx: string | null;
  sharesIn: string | null;     // Shares sold (18-decimal bigint as string)
  tokensOut: string | null;    // USDC received (6-decimal bigint as string)
}
```

### SubgraphMeta

```typescript
interface SubgraphMeta {
  block: {
    number: number;
    timestamp: number | null;
    hash: string | null;
  };
  deployment: string;
  hasIndexingErrors: boolean;
}
```

## GraphQL schema entities

The subgraph indexes six on-chain event types. Each entity is available as both a singular query (by `id`) and a plural collection query with filtering, ordering, and pagination.

| Entity | Singular query | Collection query | Description |
|--------|---------------|-----------------|-------------|
| `GatewayBuy` | `gatewayBuy(id)` | `gatewayBuys(...)` | Share purchase events |
| `GatewaySell` | `gatewaySell(id)` | `gatewaySells(...)` | Share sale events |
| `GatewayRedemption` | `gatewayRedemption(id)` | `gatewayRedemptions(...)` | Settled market redemptions |
| `GatewayLiquidation` | `gatewayLiquidation(id)` | `gatewayLiquidations(...)` | Position liquidations |
| `GatewayWinnerSubmitted` | `gatewayWinnerSubmitted(id)` | `gatewayWinnerSubmitteds(...)` | Winner declaration events |
| `Initialized` | `initialized(id)` | `initializeds(...)` | Contract initialization events |

### Common fields (all entities)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `ID!` | Unique event identifier |
| `block_number` | `BigInt!` | Block number of the event |
| `timestamp_` | `BigInt!` | Unix timestamp (seconds) |
| `transactionHash_` | `String!` | Transaction hash |
| `contractId_` | `String!` | Gateway contract address |

### GatewayBuy fields

| Field | Type | Description |
|-------|------|-------------|
| `marketProxy` | `String` | Market proxy address |
| `buyer` | `String` | Buyer wallet address |
| `outcomeIdx` | `BigInt` | Outcome index |
| `tokensIn` | `BigInt` | USDC spent (6-decimal) |
| `sharesOut` | `BigInt` | Shares received (18-decimal) |

### GatewaySell fields

| Field | Type | Description |
|-------|------|-------------|
| `marketProxy` | `String` | Market proxy address |
| `seller` | `String` | Seller wallet address |
| `outcomeIdx` | `BigInt` | Outcome index |
| `sharesIn` | `BigInt` | Shares sold (18-decimal) |
| `tokensOut` | `BigInt` | USDC received (6-decimal) |

### GatewayRedemption fields

| Field | Type | Description |
|-------|------|-------------|
| `marketProxy` | `String` | Market proxy address |
| `redeemer` | `String` | Redeemer wallet address |
| `sharesIn` | `BigInt` | Shares redeemed (18-decimal) |
| `tokensOut` | `BigInt` | USDC received (6-decimal) |

### GatewayLiquidation fields

| Field | Type | Description |
|-------|------|-------------|
| `marketProxy` | `String` | Market proxy address |
| `liquidator` | `String` | Liquidator wallet address |
| `outcomeIndices` | `String` | Comma-separated outcome indices |
| `sharesIn` | `String` | Shares liquidated |
| `totalTokensOut` | `BigInt` | Total USDC received (6-decimal) |

### GatewayWinnerSubmitted fields

| Field | Type | Description |
|-------|------|-------------|
| `marketProxy` | `String` | Market proxy address |
| `winningOutcomeIdx` | `BigInt` | Index of the winning outcome |

## Collection query parameters

All plural queries (`gatewayBuys`, `gatewaySells`, etc.) accept:

| Parameter | Type | Description |
|-----------|------|-------------|
| `first` | `Int` | Max results to return (default 100, max 1000) |
| `skip` | `Int` | Number of results to skip (for pagination) |
| `orderBy` | `<Entity>_orderBy` | Field to sort by (e.g. `timestamp_`, `block_number`, `tokensIn`) |
| `orderDirection` | `OrderDirection` | `asc` or `desc` |
| `where` | `<Entity>_filter` | Filter conditions (see below) |
| `block` | `Block_height` | Query at a specific block height |

### Filtering (where clause)

Every field supports comparison operators in the filter:

| Suffix | Operator | Example |
|--------|----------|---------|
| _(none)_ | equals | `{ marketProxy: "0x..." }` |
| `_not` | not equals | `{ buyer_not: "0x..." }` |
| `_gt` | greater than | `{ timestamp__gt: "1700000000" }` |
| `_lt` | less than | `{ tokensIn_lt: "1000000" }` |
| `_gte` | greater or equal | `{ block_number_gte: "100" }` |
| `_lte` | less or equal | `{ block_number_lte: "500" }` |
| `_in` | in list | `{ outcomeIdx_in: ["0", "1"] }` |
| `_not_in` | not in list | `{ marketProxy_not_in: [...] }` |

String fields also support: `_contains`, `_contains_nocase`, `_not_contains`, `_not_contains_nocase`, `_starts_with`, `_starts_with_nocase`, `_ends_with`, `_ends_with_nocase`, `_not_starts_with`, `_not_starts_with_nocase`, `_not_ends_with`, `_not_ends_with_nocase`.

## Usage examples

### List recent trades for a market (SDK convenience method)

> **Tip**: See `scripts/list-recent-trades.ts` for a complete working example.

```typescript
const subgraph = client.getSubgraph();
const { buys, sells } = await subgraph.getMarketTrades(
  "0x1234...abcd",
  { first: 20 }
);

for (const buy of buys) {
  const cost = Number(BigInt(buy.tokensIn ?? "0")) / 1e6;
  const shares = Number(BigInt(buy.sharesOut ?? "0")) / 1e18;
  const time = new Date(Number(buy.timestamp_) * 1000).toLocaleString();
  console.log(`BUY  ${time} | ${buy.buyer} | outcome ${buy.outcomeIdx} | ${cost.toFixed(4)} USDC → ${shares.toFixed(4)} shares`);
}
```

### Query global recent buys (raw GraphQL)

```typescript
const subgraph = client.getSubgraph();
const data = await subgraph.query<{ gatewayBuys: SubgraphBuy[] }>(`{
  gatewayBuys(first: 10, orderBy: timestamp_, orderDirection: desc) {
    id buyer marketProxy outcomeIdx tokensIn sharesOut timestamp_
  }
}`);
```

### Filter buys by wallet address

```typescript
const data = await subgraph.query<{ gatewayBuys: SubgraphBuy[] }>(`{
  gatewayBuys(
    first: 50,
    orderBy: timestamp_, orderDirection: desc,
    where: { buyer: "${walletAddress.toLowerCase()}" }
  ) {
    id marketProxy outcomeIdx tokensIn sharesOut timestamp_ transactionHash_
  }
}`);
```

### Filter buys by time range

```typescript
const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
const data = await subgraph.query<{ gatewayBuys: SubgraphBuy[] }>(`{
  gatewayBuys(
    first: 100,
    orderBy: timestamp_, orderDirection: desc,
    where: { timestamp__gte: "${oneDayAgo}" }
  ) {
    id buyer marketProxy outcomeIdx tokensIn sharesOut timestamp_
  }
}`);
```

### Query redemptions for a market

```typescript
interface GatewayRedemption {
  id: string;
  timestamp_: string;
  marketProxy: string | null;
  redeemer: string | null;
  sharesIn: string | null;
  tokensOut: string | null;
}

const data = await subgraph.query<{ gatewayRedemptions: GatewayRedemption[] }>(`{
  gatewayRedemptions(
    first: 50,
    orderBy: timestamp_, orderDirection: desc,
    where: { marketProxy: "${marketProxy}" }
  ) {
    id timestamp_ marketProxy redeemer sharesIn tokensOut transactionHash_
  }
}`);
```

### Query liquidations for a market

```typescript
interface GatewayLiquidation {
  id: string;
  timestamp_: string;
  marketProxy: string | null;
  liquidator: string | null;
  outcomeIndices: string | null;  // Comma-separated outcome indices
  sharesIn: string | null;        // Shares liquidated per outcome
  totalTokensOut: string | null;  // Total USDC recovered (6-decimal bigint as string)
}

const data = await subgraph.query<{ gatewayLiquidations: GatewayLiquidation[] }>(`{
  gatewayLiquidations(
    first: 50,
    orderBy: timestamp_, orderDirection: desc,
    where: { marketProxy: "${marketProxy}" }
  ) {
    id timestamp_ marketProxy liquidator outcomeIndices sharesIn totalTokensOut transactionHash_
  }
}`);

for (const liq of data.gatewayLiquidations) {
  const recovered = Number(BigInt(liq.totalTokensOut ?? "0")) / 1e6;
  console.log(`${liq.liquidator} recovered ${recovered.toFixed(4)} USDC`);
}
```

### Query winner submissions

```typescript
interface GatewayWinnerSubmitted {
  id: string;
  timestamp_: string;
  marketProxy: string | null;
  winningOutcomeIdx: string | null;
}

const data = await subgraph.query<{ gatewayWinnerSubmitteds: GatewayWinnerSubmitted[] }>(`{
  gatewayWinnerSubmitteds(
    first: 10,
    orderBy: timestamp_, orderDirection: desc,
    where: { marketProxy: "${marketProxy}" }
  ) {
    id timestamp_ marketProxy winningOutcomeIdx transactionHash_
  }
}`);
```

### Check subgraph indexing status

```typescript
const meta = await subgraph.getMeta();
console.log(`Indexed up to block ${meta.block.number}`);
console.log(`Has errors: ${meta.hasIndexingErrors}`);
```

### Pagination

```typescript
let skip = 0;
const pageSize = 100;
const allBuys: SubgraphBuy[] = [];

while (true) {
  const { buys } = await subgraph.getMarketTrades(marketProxy, { first: pageSize, skip });
  allBuys.push(...buys);
  if (buys.length < pageSize) break;
  skip += pageSize;
}
```

## Parsing subgraph values

Subgraph values are returned as strings. Parse them carefully:

```typescript
// Timestamps → Date
const date = new Date(Number(event.timestamp_) * 1000);

// USDC amounts (6 decimals)
const usdc = Number(BigInt(event.tokensIn ?? "0")) / 1e6;

// Share amounts (18 decimals)
const shares = Number(BigInt(event.sharesOut ?? "0")) / 1e18;

// Outcome index
const outcomeIdx = Number(event.outcomeIdx ?? "0");

// Effective price per share (from a buy event)
const pricePerShare = usdc / shares;
```
