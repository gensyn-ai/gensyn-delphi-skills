import assert from "node:assert/strict";
import { test } from "node:test";
import type { Trade } from "./data.js";
import { basisKey, computePnl, isLiquidatable, valuePosition } from "./pnl.js";

const M = "0xMarket";
let ts = 0;
const buy = (shares: number, usd: number, outcomeIdx = 0): Trade => ({ kind: "BUY", market: M, outcomeIdx, shares, usd, ts: ++ts });
const sell = (shares: number, usd: number, outcomeIdx = 0): Trade => ({ kind: "SELL", market: M, outcomeIdx, shares, usd, ts: ++ts });
const noWinner = () => undefined;
// Held cost and unrealised P/L as the dashboard derives them for a position.
const held = (r: ReturnType<typeof computePnl>, outcomeIdx = 0) => r.held.get(basisKey(M, outcomeIdx));
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("buyback after a full sale leaves realised profit unchanged", () => {
  // Trades arrive newest first from the subgraph; order must not matter.
  const r = computePnl([buy(10, 2), sell(10, 4), buy(10, 8)].reverse(), noWinner);
  close(r.realised, 2);
  const b = held(r)!;
  close(b.cost, 8);
  close(b.shares, 10);
  const value = 8; // position now worth 8
  close(value - b.cost, 0); // unrealised
});

test("partial sale books against the average cost held", () => {
  const r = computePnl([buy(10, 2), buy(10, 4), sell(5, 3)], noWinner);
  close(r.realised, 3 - 5 * 0.3);
  close(held(r)!.cost, 6 - 1.5);
  close(held(r)!.shares, 15);
});

test("sale with no buy in the window is skipped", () => {
  const r = computePnl([sell(10, 4), buy(5, 1, 1)], noWinner);
  assert.equal(r.realised, 0);
  assert.equal(held(r), undefined);
});

test("redeem closes the winning outcome at its running cost", () => {
  const redeem: Trade = { kind: "REDEEM", market: M, outcomeIdx: -1, shares: 10, usd: 15, ts: 100 };
  const r = computePnl([buy(10, 4, 1), buy(10, 6, 0), redeem], (m) => (m === M ? 1 : undefined));
  close(r.realised, 11);
  close(held(r, 1)!.cost, 0);
  close(held(r, 0)!.cost, 6);
});

test("liquidation is booked only when every leg has a basis", () => {
  const liq = (legs: Trade["legs"], usd = 5): Trade => ({ kind: "LIQUIDATE", market: M, outcomeIdx: -1, shares: 0, usd, ts: 200, legs });
  close(computePnl([buy(10, 2, 0), buy(10, 3, 1), liq([{ outcomeIdx: 0, shares: 10 }, { outcomeIdx: 1, shares: 10 }], 7)], noWinner).realised, 2);
  assert.equal(computePnl([buy(10, 2, 0), liq([{ outcomeIdx: 0, shares: 10 }, { outcomeIdx: 1, shares: 10 }])], noWinner).realised, 0);
});

test("failed market positions are liquidated and valued like expired ones", () => {
  for (const status of ["expired", "failed"]) {
    assert.equal(isLiquidatable(status), true, status); // gets a liquidation quote
    const v = valuePosition({
      status,
      outcomeIdx: 0,
      shares: 10,
      price: undefined,
      winningOutcomeIdx: null,
      redeemQuote: undefined,
      liquidateQuote: 4_000_000n,
    });
    assert.deepEqual(v, { value: 4, valueBasis: "liquidate" }, status);
  }
  assert.equal(isLiquidatable("open"), false);
  assert.equal(isLiquidatable("settled"), false);
});
