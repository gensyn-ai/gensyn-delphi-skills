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
| `status` | `string` | — | `"open"` \| `"awaiting_settlement"` \| `"settled"` \| `"expired"` |
| `category` | `string` | — | `"crypto"` \| `"culture"` \| `"economics"` \| `"miscellaneous"` \| `"politics"` \| `"sports"` |
| `orderBy` | `string` | `"liquidity"` | `"liquidity"` \| `"created"` \| `"settles_at"` (earliest settlement first) |
| `verifiable` | `boolean` | — | If `true`, filter to markets with verifiable settlement only |
| `pricesAndImpliedProbabilities` | `boolean` | `false` | When `true`, fetches on-chain spot prices and implied probabilities for each market via multicall |

### Market type

```typescript
interface Market {
  id: string;                          // Market proxy address — use as marketAddress in all SDK calls
  appMarketId: string;                 // UUID identifying the market in the Delphi app
  marketUrl: string;                   // Direct link to the market on the Delphi app
  status: string;                      // "open" | "awaiting_settlement" | "settled" | "expired"
  deployer: string;                    // Deployer address
  implementation: string;              // Logic contract address — NOT used for SDK calls
  category: string | null;             // Market category (e.g. "crypto")
  verifiable: boolean;                 // true if market uses verifiable settlement
  tradingFee: string | null;           // 18-decimal bigint string (e.g. "20000000000000000" = 2%); null if no fee
  metadataUri: string;                 // IPFS/HTTP metadata URI
  metadataUriContentHash: string;      // Hex hash of fetched metadata content
  metadata: MarketMetadata | null;     // Parsed and typed metadata
  dataSources: unknown | null;         // Data source identifiers, or null
  createdAt: string;                   // ISO timestamp
  fetchedAt: string | null;
  fetchResponseStatus: string | null;
  resolvesAt: string | null;           // ISO timestamp for when market resolves
  settlesAt: string | null;            // ISO timestamp for scheduled settlement
  winningOutcomeIdx: string | null;    // Winning outcome index string, if settled
  proof: string | null;                // Settlement proof string, or null
  error: string | null;                // Resolution error message if settlement failed, or null
  // Only present when pricesAndImpliedProbabilities: true is passed:
  spotPrices?: number[];               // Spot price per outcome as decimal-adjusted float (e.g. 0.6 = 0.60 USDC/share)
  spotImpliedProbabilities?: number[]; // Implied probability per outcome as 0–1 float (e.g. 0.6 = 60%)
}
```

### MarketMetadata type

`market.metadata` is now typed as `MarketMetadata | null` — no cast needed.

```typescript
interface MarketMetadata {
  question: string;          // The market question
  outcomes: string[];        // Outcome labels — index matches outcomeIdx
  model?: {
    model_identifier?: string;
    prompt_context?: string;
  };
  initial_liquidity?: string;
  initial_pool?: string;
  refund?: string;
  market_creation_fee?: string;
  version?: string;
  [key: string]: unknown;    // extensible for future fields
}
```

The `outcomes` array is critical for labelling: `outcomes[0]` is the label for `outcomeIdx: 0`.

### Key address fields

| Field | Purpose |
|-------|---------|
| `market.id` | Pass as `marketAddress` to all SDK trading/quote/approval calls; also pass to `getMarket({ id })` |
| `market.implementation` | Logic contract — not used in SDK calls |

## getMarket

```typescript
const market = await client.getMarket({
  id: "<market-id>",
  pricesAndImpliedProbabilities: true, // optional: fetch spot prices and implied probabilities
});
```

Returns the same `Market` type. Pass `market.id` from `listMarkets` as the `id`.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | — | Market proxy contract address (required) — this is `market.id` from `listMarkets`, e.g. `"0xf8022b5c02ab07ad52c3067a70578aa639483697"` |
| `pricesAndImpliedProbabilities` | `boolean` | `false` | When `true`, populates `market.spotPrices` and `market.spotImpliedProbabilities` |

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

## Finding a market by question keyword

```typescript
const { markets } = await client.listMarkets({ status: "open", limit: 100 });
const match = markets?.find(m =>
  m.metadata?.question?.toLowerCase().includes("keyword")
);
```
