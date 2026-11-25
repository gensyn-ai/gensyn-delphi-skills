// Pure P/L and valuation helpers for the Agent TUI (no API access, unit-tested
// in pnl.test.ts).
import type { EnrichedPosition, Trade } from "./data.js";

/** Markets exited by liquidation: `expired` (never resolved) and `failed`
 * (oracle could not resolve, so there is no winner to redeem). */
export const isLiquidatable = (status: string | undefined): boolean =>
  status === "expired" || status === "failed";

/** Running cost basis of the shares still held for one (market, outcome). */
export interface Basis {
  shares: number;
  cost: number;
}

export const basisKey = (market: string, outcomeIdx: number): string => market.toLowerCase() + "-" + outcomeIdx;

/**
 * Average-cost P/L computed in trade order. Each buy adds to the held shares and
 * cost; each sale, redeem or liquidation leg books profit against the average
 * cost of the shares held at that moment and removes that cost from the basis,
 * so a later buy never changes the profit of an earlier sale. A close with no
 * held basis (its buys fell outside the trade window) is skipped rather than
 * booked as pure profit; a liquidation is booked only when every leg's basis is
 * known. `winningOutcome` resolves a redemption's outcome (not on-chain).
 */
export function computePnl(
  trades: Trade[],
  winningOutcome: (market: string) => number | null | undefined,
): { realised: number; held: Map<string, Basis> } {
  const held = new Map<string, Basis>();
  // Remove `shares` from the basis; returns the cost removed, or undefined when
  // nothing was held (unknown basis).
  const close = (key: string, shares: number): number | undefined => {
    const b = held.get(key);
    if (!b || b.shares <= 0) return undefined;
    const cost = (shares * b.cost) / b.shares;
    b.shares = Math.max(0, b.shares - shares);
    b.cost = b.shares > 0 ? b.cost - cost : 0;
    return cost;
  };
  // Chronological; within the same timestamp (same block) buys go first.
  const asc = [...trades].sort((a, b) => a.ts - b.ts || Number(b.kind === "BUY") - Number(a.kind === "BUY"));
  let realised = 0;
  for (const t of asc) {
    if (t.kind === "BUY") {
      const key = basisKey(t.market, t.outcomeIdx);
      const b = held.get(key) ?? { shares: 0, cost: 0 };
      b.shares += t.shares;
      b.cost += t.usd;
      held.set(key, b);
    } else if (t.kind === "SELL") {
      const cost = close(basisKey(t.market, t.outcomeIdx), t.shares);
      if (cost !== undefined) realised += t.usd - cost;
    } else if (t.kind === "REDEEM") {
      const win = winningOutcome(t.market);
      const cost = win != null ? close(basisKey(t.market, win), t.shares) : undefined;
      if (cost !== undefined) realised += t.usd - cost;
    } else if (t.kind === "LIQUIDATE") {
      const legs = t.legs ?? [];
      const costs = legs.map((leg) => close(basisKey(t.market, leg.outcomeIdx), leg.shares));
      if (legs.length && costs.every((c) => c !== undefined)) {
        realised += t.usd - costs.reduce((s: number, c) => s + (c as number), 0);
      }
    }
  }
  return { realised, held };
}

/**
 * Value of a held position by market status: spot while open, redemption once
 * settled (winning outcome only; losing shares are worth 0), liquidation once
 * expired or failed. Undefined ("—") when the needed quote did not resolve.
 * Quotes are raw 6-decimal token amounts.
 */
export function valuePosition(p: {
  status: string | undefined;
  outcomeIdx: number;
  shares: number;
  price: number | undefined;
  winningOutcomeIdx: number | null | undefined;
  redeemQuote: bigint | undefined;
  liquidateQuote: bigint | undefined;
}): { value?: number; valueBasis?: EnrichedPosition["valueBasis"] } {
  if (p.status === "settled") {
    const win = p.winningOutcomeIdx;
    if (win != null && win === p.outcomeIdx) {
      if (p.redeemQuote !== undefined) return { value: Number(p.redeemQuote) / 1e6, valueBasis: "redeem" };
    } else if (win != null) return { value: 0, valueBasis: "settled-loss" };
    return {};
  }
  if (isLiquidatable(p.status)) {
    return p.liquidateQuote !== undefined ? { value: Number(p.liquidateQuote) / 1e6, valueBasis: "liquidate" } : {};
  }
  return p.price !== undefined ? { value: p.shares * p.price, valueBasis: "spot" } : {};
}
