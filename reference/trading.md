# Trading Reference

## Pricing mechanism

Delphi uses **Dynamic Parimutuel** markets:
- Prices shift continuously with every trade (no fixed order book)
- `spotImpliedProbability` reflects the market's current consensus probability
- For a binary market: `prob[0] + prob[1] = 1e18` (100%)
- A spot price of `0.65 USDC/share` means ~65% implied probability

## Quotes (read-only, no gas)

### quoteBuy — cost to receive an exact number of shares

```typescript
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

const client = new DelphiClient();

const { tokensIn } = await client.quoteBuy({
  marketAddress: "0x..." as `0x${string}`,
  outcomeIdx: 0,
  sharesOut: BigInt(Math.round(10 * 1e18)),  // exact shares to receive
});
// tokensIn: USDC required, 6-decimal bigint
const costUsdc = Number(tokensIn) / 1e6;
```

### quoteSell — payout for selling an exact number of shares

```typescript
const { tokensOut } = await client.quoteSell({
  marketAddress: "0x..." as `0x${string}`,
  outcomeIdx: 0,
  sharesIn: BigInt(Math.round(5 * 1e18)),  // exact shares to sell
});
const payoutUsdc = Number(tokensOut) / 1e6;
```

## Executing trades

### buyShares

```typescript
interface BuySharesParams {
  marketAddress: `0x${string}`;
  outcomeIdx: number;
  sharesOut: bigint;    // exact shares to receive (18 dec)
  maxTokensIn: bigint;  // max USDC to spend — slippage cap (6 dec)
}
```

Full flow with approval and slippage:
```typescript
const marketAddress = "0x..." as `0x${string}`;
const outcomeIdx = 0;
const sharesOut = BigInt(Math.round(10 * 1e18));

const { tokensIn } = await client.quoteBuy({ marketAddress, outcomeIdx, sharesOut });

// Ensure USDC approval (no-op if already approved)
await client.ensureTokenApproval({ marketAddress, minimumAmount: tokensIn });

// 2% slippage
const maxTokensIn = tokensIn * 102n / 100n;
const { transactionHash } = await client.buyShares({ marketAddress, outcomeIdx, sharesOut, maxTokensIn });
```

### sellShares

```typescript
interface SellSharesParams {
  marketAddress: `0x${string}`;
  outcomeIdx: number;
  sharesIn: bigint;      // exact shares to sell (18 dec)
  minTokensOut: bigint;  // min USDC to receive — slippage floor (6 dec)
}
```

```typescript
const sharesIn = BigInt(Math.round(5 * 1e18));

const { tokensOut } = await client.quoteSell({ marketAddress, outcomeIdx, sharesIn });

// 2% slippage tolerance
const minTokensOut = tokensOut * 98n / 100n;
const { transactionHash } = await client.sellShares({ marketAddress, outcomeIdx, sharesIn, minTokensOut });
```

## Slippage guidelines

| Scenario | Recommended slippage |
|----------|---------------------|
| Quiet market | 1–2% |
| Active market | 2–5% |
| Large trade (>$100) | 5–10% |
| Time-sensitive execution | 5% |

**Buy:** `maxTokensIn = quotedCost * (100 + slippage%) / 100`
**Sell:** `minTokensOut = quotedPayout * (100 - slippage%) / 100`

Using integer arithmetic to avoid floating point:
```typescript
const slippageBps = 200n; // 200 = 2%
const maxTokensIn  = tokensIn  * (10000n + slippageBps) / 10000n;
const minTokensOut = tokensOut * (10000n - slippageBps) / 10000n;
```

## Common contract errors

| Error | Cause | Fix |
|-------|-------|-----|
| `TokensInExceedsMax` | Actual cost > `maxTokensIn` | Re-quote and increase slippage |
| `TokensOutBelowMin` | Actual payout < `minTokensOut` | Re-quote and increase slippage |
| `MarketNotOpen` | Market closed or settled | Cannot trade; check status |
| `SharesInExceedSupply` | Selling more than held | Query balance first |
| `GrossTokensOutNotPositive` | Nothing to sell | Position is empty |
| `ZeroTokensIn` | `sharesOut` too small | Use a larger share amount |

## Checking share balance before selling

Use the Gateway `balanceOf` directly via viem:

```typescript
import { createPublicClient, http, defineChain, type Abi } from "viem";
import { DYNAMIC_PARIMUTUEL_GATEWAY_ABI } from "@gensyn-ai/gensyn-delphi-sdk";

// (set up publicClient as in onchain.md)

const balance = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "balanceOf",
  args: [marketProxy, walletAddress as `0x${string}`, BigInt(outcomeIdx)],
}) as bigint;

console.log(`Balance: ${Number(balance) / 1e18} shares`);
```

Or use the REST API positions endpoint (see positions.md) which is simpler but may lag slightly.

## Price impact estimation

For large trades, compare the quote to the current spot price to estimate price impact:

```typescript
const spotPrices = await publicClient.readContract({
  address: gateway,
  abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
  functionName: "spotPrices",
  args: [marketProxy, [0n, 1n]],
}) as bigint[];

const currentPricePerShare = Number(spotPrices[outcomeIdx]) / 1e18;
const { tokensIn } = await client.quoteBuy({ marketAddress, outcomeIdx, sharesOut });
const quotedPricePerShare = (Number(tokensIn) / 1e6) / sharesHuman;
const priceImpact = ((quotedPricePerShare - currentPricePerShare) / currentPricePerShare) * 100;
console.log(`Price impact: ${priceImpact.toFixed(2)}%`);
```
