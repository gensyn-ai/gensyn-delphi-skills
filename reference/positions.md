# Positions & Trades Reference

## Positions

```typescript
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

const client = new DelphiClient();
```

### listPositions

```typescript
const { positions } = await client.listPositions({
  wallet: "0x...",     // required
  redeemed: false,     // optional: filter by redemption status
  limit: 50,
  skip: 0,
});
```

### Position type

```typescript
interface Position {
  id: string;
  marketProxy: string;      // Market proxy address (use as marketAddress)
  wallet: string;
  outcomeIdx: string;       // Outcome index as string — parse with parseInt()
  shares: string;           // 18-decimal bigint as string — parse with BigInt()
  redeemed: boolean;
  tokensRedeemed: string;   // 6-decimal bigint as string — parse with BigInt()
  // Current market status (API returns the string value, contract returns the int enum):
  // 0 -> "open", 1 -> "awaiting_settlement", 2 -> "settled", 3 -> "expired"
  marketStatus: "open" | "awaiting_settlement" | "settled" | "expired";
}
```

**Parse carefully** — `shares` and `tokensRedeemed` are string representations of bigints:
```typescript
const shares = Number(BigInt(position.shares)) / 1e18;
const tokensRedeemed = Number(BigInt(position.tokensRedeemed)) / 1e6;
const outcomeIdx = parseInt(position.outcomeIdx);
```

## Trades

### listTrades

```typescript
const { trades } = await client.listTrades({
  trader: "0x...",          // filter by trader wallet
  marketProxy: "0x...",     // filter by market
  marketEOA: "0x...",       // filter by market EOA
  limit: 50,
  skip: 0,
});
```

### Trade type

```typescript
interface Trade {
  marketId: string;
  marketProxy: string;
  marketEOA: string;
  trader: string;
  outcomeIdx: string;     // parse with parseInt()
  isBuy: boolean;
  sharesDelta: string;    // 18-decimal bigint as string (always positive)
  tokensDelta: string;    // 6-decimal bigint as string (always positive)
  timestamp: string;      // ISO timestamp
  unixTs: string;         // Unix timestamp as string
}
```

```typescript
for (const t of trades ?? []) {
  const direction = t.isBuy ? "BUY" : "SELL";
  const shares = Number(BigInt(t.sharesDelta)) / 1e18;
  const tokens = Number(BigInt(t.tokensDelta)) / 1e6;
  console.log(`${direction} ${shares.toFixed(4)} shares @ ${(tokens / shares).toFixed(4)} USDC/share`);
}
```

## Redemption

Markets must be `settled` (winner submitted) before redeeming. Only holders of the **winning** outcome receive tokens.

> **Important**: Positions with `shares === "0"` cannot be redeemed or liquidated — the wallet holds no stake. The positions API may return zero-share entries for markets the wallet previously participated in but fully exited. Always check `BigInt(position.shares) > 0n` before attempting redeem or liquidate calls.

### redeemMarket — single market

```typescript
const { transactionHash, sharesIn, tokensOut } = await client.redeemMarket({
  marketAddress: "0x..." as `0x${string}`,
});
console.log(`Redeemed ${Number(sharesIn) / 1e18} shares → ${Number(tokensOut) / 1e6} USDC`);
```

### redeemPositions — batch

```typescript
const { results, totalTokensOut } = await client.redeemPositions({
  marketAddresses: ["0x...", "0x..."],
});

for (const r of results) {
  if (r.success) {
    console.log(`✓ ${r.marketAddress}: ${Number(r.tokensOut!) / 1e6} USDC`);
  } else {
    console.error(`✗ ${r.marketAddress}: ${r.error}`);
  }
}
console.log(`Total redeemed: ${Number(totalTokensOut) / 1e6} USDC`);
```

### Batch-redeem all unredeemed settled positions

```typescript
// 1. Get all active positions
const { positions } = await client.listPositions({ wallet: myAddress, redeemed: false });

// 2. Find which ones are in settled markets (skip zero-share positions)
const settledProxies: `0x${string}`[] = [];
for (const p of positions ?? []) {
  if (BigInt(p.shares) === 0n) continue; // no stake — cannot redeem
  const market = await client.getMarket({ id: p.marketProxy }); // or use id if available
  if (market.status === "settled") {
    settledProxies.push(p.marketProxy as `0x${string}`);
  }
}

// 3. Redeem in batch
if (settledProxies.length > 0) {
  const { results, totalTokensOut } = await client.redeemPositions({
    marketAddresses: settledProxies,
  });
}
```

## Portfolio value estimation

Estimate the current liquidation value of all active positions:

```typescript
const { positions } = await client.listPositions({ wallet: myAddress, redeemed: false });

let totalValue = 0;
for (const p of positions ?? []) {
  const shares = BigInt(p.shares);
  if (shares === 0n) continue;

  const marketAddress = p.marketProxy as `0x${string}`;
  const outcomeIdx = parseInt(p.outcomeIdx);

  try {
    const { tokensOut } = await client.quoteSell({ marketAddress, outcomeIdx, sharesIn: shares });
    const valueUsdc = Number(tokensOut) / 1e6;
    totalValue += valueUsdc;
    console.log(`${marketAddress} outcome ${outcomeIdx}: ~${valueUsdc.toFixed(4)} USDC`);
  } catch {
    // Market may be closed (no sells) — use spot price as estimate
    console.log(`${marketAddress} outcome ${outcomeIdx}: cannot quote (market may be closed)`);
  }
}
console.log(`Total estimated value: ${totalValue.toFixed(4)} USDC`);
```
