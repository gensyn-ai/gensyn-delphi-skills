# Markets Reference

## listMarkets

```typescript
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

const client = new DelphiClient();
const { markets } = await client.listMarkets(params);
```

### Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | `number` | `0` | Pagination offset |
| `limit` | `number` | `50` | Max records returned |
| `status` | `string` | — | `"open"` \| `"closed"` \| `"settled"` |
| `category` | `string` | — | Filter by metadata category field |

### Market type

```typescript
interface Market {
  id: string;                       // REST API market ID — use with getMarket()
  status: string;                   // "open" | "closed" | "settled"
  deployer: string;                 // Deployer address
  implementation: string;           // On-chain proxy address — use as marketAddress
  metadataUri: string;              // IPFS/HTTP metadata URI
  metadataUriContentHash: string;
  metadata: unknown;                // Parsed metadata (see shape below)
  createdAt: string;                // ISO timestamp
  fetchedAt: string | null;
  fetchResponseStatus: string | null;
  settledAt: string | null;         // ISO timestamp if settled
  winningOutcomeIdx: string | null; // Winning outcome index string, if settled
  error: string | null;
}
```

### Metadata shape (cast from `unknown`)

```typescript
const meta = market.metadata as {
  question?: string;            // The market question
  title?: string;               // Alternative title
  description?: string;
  category?: string;
  outcomes?: string[];          // Outcome labels — index matches outcomeIdx
  resolutionCriteria?: string;
  endDate?: string;             // ISO date
} | null;
```

The `outcomes` array is critical for labelling: `outcomes[0]` is the label for `outcomeIdx: 0`.

### Key address fields

| Field | Purpose |
|-------|---------|
| `market.id` | Pass to `getMarket({ id })` |
| `market.implementation` | Pass as `marketAddress` to all SDK trading/quote/approval calls |

## getMarket

```typescript
const market = await client.getMarket({ id: "<market-id>" });
```

Returns the same `Market` type. The `id` comes from `listMarkets`.

## Market status values

```typescript
// API returns these values as strings.
// The underlying contract may expose them as an int enum:
// 0 -> "open", 1 -> "awaiting_settlement", 2 -> "settled", 3 -> "expired"
type MarketStatus = "open" | "awaiting_settlement" | "settled" | "expired";
```

| Status | Meaning |
|--------|---------|
| `open` | Trading active |
| `awaiting_settlement` | Trading deadline passed, awaiting settlement |
| `settled` | Winner submitted, positions redeemable |
| `expired` | Market expired without settlement (positions not redeemable) |

## Paginating through all markets

```typescript
let skip = 0;
const limit = 50;
const all: Market[] = [];

while (true) {
  const { markets } = await client.listMarkets({ status: "open", skip, limit });
  if (!markets || markets.length === 0) break;
  all.push(...markets);
  if (markets.length < limit) break;
  skip += limit;
}
```

## Finding a market by question keyword

```typescript
const { markets } = await client.listMarkets({ status: "open", limit: 100 });
const match = markets?.find(m => {
  const meta = m.metadata as { question?: string } | null;
  return meta?.question?.toLowerCase().includes("keyword");
});
```

