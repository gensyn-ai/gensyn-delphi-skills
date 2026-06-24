/** Data layer: pulls a full read-only snapshot from the Delphi SDK and derives
 * the portfolio / PnL / activity shapes the screens render. No React, no I/O
 * besides the SDK. Every source is fetched independently so one failure (e.g.
 * the subgraph) degrades to an empty section instead of crashing the UI. */
import { DelphiClient, ERC20_ABI } from "@gensyn-ai/gensyn-delphi-sdk";
import { createPublicClient, http } from "viem";
import { shortAddr } from "./format.js";

// Per-network Delphi clients so the network can be switched at runtime from the
// TUI. The API key and signer fall back to env (DELPHI_API_ACCESS_KEY etc.); we
// only pin the network and forward the Cloudflare Access headers.
const clients = new Map<string, DelphiClient>();
function delphi(network: string): DelphiClient {
  let c = clients.get(network);
  if (!c) {
    c = new DelphiClient({
      network: network as "testnet" | "mainnet",
      extraHeaders: {
        "CF-Access-Client-Id": process.env.CF_ACCESS_ID ?? "",
        "CF-Access-Client-Secret": process.env.CF_ACCESS_SECRET ?? "",
      },
    });
    clients.set(network, c);
  }
  return c;
}

// A read-only on-chain client (per network) so balances reflect the *viewed*
// wallet, not the configured signer (the SDK's balance helpers only read the
// signer's address).
const publics = new Map<string, ReturnType<typeof createPublicClient>>();
function publicClient(network: string) {
  let c = publics.get(network);
  if (!c) {
    // RPC endpoint is determined solely by the selected network — no env override.
    const url =
      network === "mainnet"
        ? "https://gensyn-mainnet.g.alchemy.com/public"
        : "https://gensyn-testnet.g.alchemy.com/public";
    c = createPublicClient({ transport: http(url) });
    publics.set(network, c);
  }
  return c;
}

export interface Trade {
  kind: "BUY" | "SELL" | "REDEEM" | "LIQUIDATE";
  market: string;
  outcomeIdx: number; // BUY/SELL: the traded outcome. REDEEM/LIQUIDATE: -1 (see `legs`).
  shares: number; // shares in/out; for REDEEM/LIQUIDATE the total shares burned.
  usd: number; // BUY: cost paid. SELL/REDEEM/LIQUIDATE: proceeds received.
  ts: number;
  // REDEEM/LIQUIDATE close positions whose cost basis sits under specific
  // outcomes. Redemptions carry no outcome on-chain (the winning outcome is
  // resolved from the market); liquidations span one or more outcomes, so we
  // keep the per-outcome share breakdown here to value the basis.
  legs?: { outcomeIdx: number; shares: number }[];
}

export interface EnrichedPosition {
  market: string;
  question: string;
  outcomeIdx: number;
  outcomeLabel: string;
  shares: number;
  prob?: number;
  price?: number;
  value?: number;
  /** How `value` was derived: live spot, redemption (settled win), liquidation
   * (expired), or a settled loss (worth 0). Undefined when no value resolved. */
  valueBasis?: "spot" | "redeem" | "liquidate" | "settled-loss";
  cost?: number; // average-cost basis of the held shares (undefined if no buys in window)
  pnl?: number; // value - cost
  pnlPct?: number; // (value - cost) / cost * 100
  status?: string;
  unlisted?: boolean; // market not returned by the Delphi API (off-UI / flagged)
}

export interface MarketRow {
  id: string;
  question: string;
  category?: string;
  status?: string;
  outcomes: string[];
  probs: number[];
  prices: number[];
  topIdx: number;
  liquidity: number;
  winningOutcomeIdx?: number | null; // set once settled, else null
}

export interface Snapshot {
  wallet: string;
  network: string;
  ts: number;
  eth?: number;
  usdc?: number;
  markets: MarketRow[];
  marketById: Map<string, MarketRow>;
  positions: EnrichedPosition[];
  trades: Trade[];
  totalValue: number; // current market value of held shares
  totalCost: number; // average-cost basis of held shares (known positions only)
  returnPct?: number; // unrealised return on cost across positions with known cost
  realised: number; // realised P/L on shares sold (avg-cost)
  unrealised: number; // value - cost of held shares
  mtm: number; // realised + unrealised
  bought: number;
  sold: number;
  equityCurve: number[];
  hourlyActivity: number[];
  errors: string[];
}

function toMarketRow(m: any): MarketRow {
  const probs: number[] = m.spotImpliedProbabilities ?? [];
  let topIdx = 0;
  for (let i = 1; i < probs.length; i++) if ((probs[i] ?? 0) > (probs[topIdx] ?? 0)) topIdx = i;
  // initial_liquidity is a 6-decimal USDC base-unit string ("100000000" = $100).
  // The SDK doesn't expose live total_position_value, so this is the market's
  // seeded (initial) liquidity, not current TVL.
  const liquidity = Number(m.metadata?.initial_liquidity ?? 0) / 1e6;
  return {
    id: String(m.id),
    question: m.metadata?.question ?? "(no metadata)",
    category: m.category ?? undefined,
    status: m.status,
    outcomes: m.metadata?.outcomes ?? [],
    probs,
    prices: m.spotPrices ?? [],
    topIdx,
    liquidity,
    winningOutcomeIdx: m.winningOutcomeIdx != null ? Number(m.winningOutcomeIdx) : null,
  };
}

// ── Market cache ────────────────────────────────────────────────────────────
// Held- and traded-market lookups (getMarket) fire one request per referenced
// market — a parallel burst that trips the Delphi API's Cloudflare rate limit.
// Cache rows across refreshes, only refetch past the TTL, cap concurrency, and
// fall back to a stale row if a refetch fails so a position never regresses to
// showing its raw proxy address once it has resolved.
//
// These getMarket rows are overwhelmingly *closed* markets (settled / expired /
// historical) whose metadata, status and winner never change — open markets are
// refreshed live from listMarkets every cycle and overwrite their cache entry. So
// the TTL only governs how often we re-fetch immutable data; a long TTL is safe
// and keeps steady-state API load at ~2 requests / refresh instead of re-bursting
// every cycle (which is what tripped the 429s).
const MARKET_TTL_MS = 300_000; // 5 min — closed-market data is immutable
const MISS_TTL_MS = 300_000; // don't re-request a 404'd (off-UI / flagged) market for 5 min
const marketCache = new Map<string, { row: MarketRow; ts: number }>();
const marketMiss = new Map<string, number>();

function cacheMarket(row: MarketRow, ts: number): void {
  marketCache.set(row.id.toLowerCase(), { row, ts });
}

// Transient-failure retry. On a cold open every source fires at once, tripping
// the Delphi API's Cloudflare rate limit (429) and occasionally a subgraph 502;
// these clear within a few seconds, so retrying with exponential backoff + jitter
// recovers inside the first load instead of surfacing as an error banner. Only
// retries clearly-transient HTTP statuses — a 404 (off-UI market) throws at once.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function httpStatus(e: any): number | undefined {
  const s = String(e?.message ?? e);
  // Delphi API errors read "API request failed (429): …"; subgraph/RPC errors
  // tend to embed a bare 5xx/429. Prefer the parenthesised form, then fall back.
  const m = /\((\d{3})\)/.exec(s) ?? /\b(429|5\d{2})\b/.exec(s);
  return m ? Number(m[1]) : undefined;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, tries = 4, baseMs = 600): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const code = httpStatus(e);
      if (code !== undefined && !RETRYABLE.has(code)) throw e; // e.g. 404 — don't retry
      if (attempt === tries - 1) throw e;
      await sleep(baseMs * 2 ** attempt + Math.random() * 250); // backoff + jitter
    }
  }
  throw lastErr;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx]) };
      } catch (reason) {
        results[idx] = { status: "rejected", reason } as PromiseSettledResult<R>;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// The subgraph caps `first` at 1000 and `skip` at 5000, so we page through the
// wallet's full buy/sell history (up to ~5000 of each). Fetching only the latest
// 100 left active wallets with no cost basis for positions bought earlier.
const PAGE = 1000;
const MAX_SKIP = 5000;

async function pageAll<T>(sub: any, entity: string, who: string, w: string, fields: string): Promise<T[]> {
  const out: T[] = [];
  for (let skip = 0; skip < MAX_SKIP; skip += PAGE) {
    const data = await withRetry<any>(() =>
      sub.query(
        `{ ${entity}(first: ${PAGE}, skip: ${skip}, orderBy: timestamp_, orderDirection: desc, where: { ${who}: "${w}" }) { ${fields} } }`,
      ),
    );
    const rows: T[] = data[entity] ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function fetchTrades(wallet: string, network: string): Promise<Trade[]> {
  const w = wallet.toLowerCase();
  const sub = delphi(network).getSubgraph();
  const [buyRows, sellRows, redeemRows, liqRows] = await Promise.all([
    pageAll<{ marketProxy: string; outcomeIdx: string; tokensIn: string; sharesOut: string; timestamp_: string }>(
      sub, "gatewayBuys", "buyer", w, "marketProxy outcomeIdx tokensIn sharesOut timestamp_",
    ),
    pageAll<{ marketProxy: string; outcomeIdx: string; tokensOut: string; sharesIn: string; timestamp_: string }>(
      sub, "gatewaySells", "seller", w, "marketProxy outcomeIdx tokensOut sharesIn timestamp_",
    ),
    // Redemptions (settled-market winnings) and liquidations (expired-market
    // recoveries) are cash-in events the buy/sell stream misses entirely.
    pageAll<{ marketProxy: string; sharesIn: string; tokensOut: string; timestamp_: string }>(
      sub, "gatewayRedemptions", "redeemer", w, "marketProxy sharesIn tokensOut timestamp_",
    ),
    pageAll<{ marketProxy: string; outcomeIndices: string; sharesIn: string; totalTokensOut: string; timestamp_: string }>(
      sub, "gatewayLiquidations", "liquidator", w, "marketProxy outcomeIndices sharesIn totalTokensOut timestamp_",
    ),
  ]);
  const buys: Trade[] = buyRows.map((b) => ({
    kind: "BUY",
    market: b.marketProxy,
    outcomeIdx: Number(b.outcomeIdx ?? 0),
    shares: Number(BigInt(b.sharesOut ?? "0")) / 1e18,
    usd: Number(BigInt(b.tokensIn ?? "0")) / 1e6,
    ts: Number(b.timestamp_) * 1000,
  }));
  const sells: Trade[] = sellRows.map((s) => ({
    kind: "SELL",
    market: s.marketProxy,
    outcomeIdx: Number(s.outcomeIdx ?? 0),
    shares: Number(BigInt(s.sharesIn ?? "0")) / 1e18,
    usd: Number(BigInt(s.tokensOut ?? "0")) / 1e6,
    ts: Number(s.timestamp_) * 1000,
  }));
  const redeems: Trade[] = redeemRows.map((r) => ({
    kind: "REDEEM",
    market: r.marketProxy,
    outcomeIdx: -1, // not on-chain; winning outcome resolved from the market later
    shares: Number(BigInt(r.sharesIn ?? "0")) / 1e18,
    usd: Number(BigInt(r.tokensOut ?? "0")) / 1e6,
    ts: Number(r.timestamp_) * 1000,
  }));
  const liquidations: Trade[] = liqRows.map((l) => {
    // outcomeIndices and sharesIn are parallel comma-separated lists.
    const idxs = String(l.outcomeIndices ?? "").split(",").filter((s) => s.length);
    const shareParts = String(l.sharesIn ?? "").split(",");
    const legs = idxs.map((idx, i) => ({
      outcomeIdx: Number(idx),
      shares: Number(BigInt(shareParts[i] ?? "0")) / 1e18,
    }));
    return {
      kind: "LIQUIDATE",
      market: l.marketProxy,
      outcomeIdx: -1,
      shares: legs.reduce((s, leg) => s + leg.shares, 0),
      usd: Number(BigInt(l.totalTokensOut ?? "0")) / 1e6,
      ts: Number(l.timestamp_) * 1000,
      legs,
    } as Trade;
  });
  return [...buys, ...sells, ...redeems, ...liquidations].sort((a, b) => b.ts - a.ts);
}

/** Progress over the snapshot's eight loading stages, surfaced by the cold-start
 * loading screen as a rough bar. `done`/`total` are stage counts, not bytes. */
export interface LoadProgress {
  done: number;
  total: number;
  label: string;
}

const LOAD_STAGES = 8;

export async function fetchSnapshot(
  wallet: string,
  network: string,
  onProgress?: (p: LoadProgress) => void,
): Promise<Snapshot> {
  const errors: string[] = [];
  const now = Date.now();
  const d = delphi(network);
  const pub = publicClient(network);
  const owner = wallet as `0x${string}`;

  // Report each stage as it settles so the cold-start screen can show a rough
  // progress bar. The first five sources run in parallel, so each reports on its
  // own completion (order varies); the later derive phases report in sequence.
  let done = 0;
  const tick = (label: string) => onProgress?.({ done: Math.min(++done, LOAD_STAGES), total: LOAD_STAGES, label });
  const tap = <T,>(p: Promise<T>, label: string): Promise<T> =>
    p.then(
      (v) => (tick(label), v),
      (e) => {
        tick(label);
        throw e;
      },
    );

  const [marketsR, positionsR, ethR, usdcR, tradesR] = await Promise.allSettled([
    tap(withRetry(() => d.listMarkets({ status: "open", limit: 40, pricesAndImpliedProbabilities: true })), "markets"),
    tap(withRetry(() => d.listPositions({ wallet, redeemedOrLiquidated: false, limit: 200 })), "positions"),
    tap(withRetry(() => pub.getBalance({ address: owner })), "ETH balance"),
    tap(withRetry(() => pub.readContract({ address: d.getTokenAddress(), abi: ERC20_ABI, functionName: "balanceOf", args: [owner] })), "token balance"),
    tap(fetchTrades(wallet, network), "trade history"),
  ]);

  const marketById = new Map<string, MarketRow>();
  const markets: MarketRow[] = [];
  if (marketsR.status === "fulfilled") {
    for (const m of marketsR.value.markets ?? []) {
      const row = toMarketRow(m);
      markets.push(row);
      marketById.set(row.id.toLowerCase(), row);
      cacheMarket(row, now);
    }
  } else errors.push("markets: " + errMsg(marketsR.reason));

  const rawPositions = positionsR.status === "fulfilled" ? positionsR.value.positions ?? [] : [];
  if (positionsR.status === "rejected") errors.push("positions: " + errMsg(positionsR.reason));

  const trades = tradesR.status === "fulfilled" ? tradesR.value : [];
  if (tradesR.status === "rejected") errors.push("trades: " + errMsg(tradesR.reason));

  // Resolve every market referenced by a position *or* a trade that isn't already
  // in the open-markets list. Held markets are often outside it (settled,
  // low-liquidity, beyond the limit); traded markets even more so — a market you
  // bought and fully exited (or that has since settled) appears in trade history
  // but not in listMarkets, so without this its Activity rows fall back to the raw
  // proxy address instead of the question. Serve fresh cache hits without a
  // request; only the cache-miss / stale ids hit the API, and those are
  // concurrency-capped to avoid the Cloudflare-tripping burst.
  const referenced = new Set<string>([
    ...rawPositions.map((p: any) => String(p.marketProxy).toLowerCase()),
    ...trades.map((t) => t.market.toLowerCase()),
  ]);
  const needed = [...referenced].filter((id) => !marketById.has(id));
  const toFetch: string[] = [];
  for (const id of needed) {
    const cached = marketCache.get(id);
    const missedAt = marketMiss.get(id);
    if (cached && now - cached.ts < MARKET_TTL_MS) marketById.set(id, cached.row);
    else if (missedAt && now - missedAt < MISS_TTL_MS) continue; // known-missing; skip the request
    else toFetch.push(id);
  }
  const fetched = await mapLimit(toFetch, 3, (id) =>
    withRetry(() => d.getMarket({ id, pricesAndImpliedProbabilities: true })),
  );
  fetched.forEach((r, k) => {
    const id = toFetch[k];
    if (r.status === "fulfilled" && r.value) {
      const row = toMarketRow(r.value);
      marketById.set(id, row);
      cacheMarket(row, now);
      marketMiss.delete(id);
    } else {
      const stale = marketCache.get(id); // fall back to a previously-resolved row
      if (stale) marketById.set(id, stale.row);
      else marketMiss.set(id, now); // record the miss so we stop hammering a 404
    }
  });
  tick("market details");

  // Average buy price per (market, outcome) from the trade window — the basis
  // for cost / realised / unrealised P/L. Keyed lowercase "market-outcomeIdx".
  const buyAgg = new Map<string, { usd: number; shares: number }>();
  for (const t of trades)
    if (t.kind === "BUY") {
      const k = t.market.toLowerCase() + "-" + t.outcomeIdx;
      const a = buyAgg.get(k) ?? { usd: 0, shares: 0 };
      a.usd += t.usd;
      a.shares += t.shares;
      buyAgg.set(k, a);
    }
  const avgPrice = (market: string, outcomeIdx: number): number | undefined => {
    const a = buyAgg.get(market.toLowerCase() + "-" + outcomeIdx);
    return a && a.shares > 0 ? a.usd / a.shares : undefined;
  };

  const activePositions = rawPositions.filter((p: any) => BigInt(p.shares) > 0n);

  // Spot price is meaningless once a market closes, so closed-market positions are
  // valued at their real exit amount via read-only gateway simulations (no gas):
  // settled markets redeem, expired markets liquidate. One redeem quote per
  // settled market (redeem pays out the wallet's entire winning side); one
  // liquidate quote per expired (market, outcome). Concurrency-capped; a revert
  // (nothing to redeem, not yet closed) leaves the value unset so the row shows
  // "—" rather than a misleading spot figure.
  const statusOf = (proxy: string) => marketById.get(proxy.toLowerCase())?.status;

  // Only quote redeem where the wallet holds the *winning* outcome — losing
  // settled shares redeem for nothing (the call would just revert), so they're
  // valued at 0 below without wasting an RPC round-trip.
  const settledMarketIds = [
    ...new Set(
      activePositions
        .filter((p: any) => {
          const m = marketById.get(String(p.marketProxy).toLowerCase());
          return (
            m?.status === "settled" &&
            m.winningOutcomeIdx != null &&
            m.winningOutcomeIdx === Number(p.outcomeIdx)
          );
        })
        .map((p: any) => String(p.marketProxy).toLowerCase()),
    ),
  ];
  const redeemByMarket = new Map<string, bigint>();
  await mapLimit(settledMarketIds, 4, async (id) => {
    try {
      const { tokensOut } = await d.quoteRedeem({ marketAddress: id as `0x${string}`, account: owner });
      redeemByMarket.set(id, tokensOut);
    } catch {
      /* not redeemable (losing side / already redeemed) — leave unset */
    }
  });
  tick("settled payouts");

  const expiredPositions = activePositions.filter(
    (p: any) => statusOf(String(p.marketProxy)) === "expired",
  );
  const liquidateByKey = new Map<string, bigint>();
  await mapLimit(expiredPositions, 4, async (p: any) => {
    const id = String(p.marketProxy).toLowerCase();
    const idx = Number(p.outcomeIdx);
    try {
      const { totalTokensOut } = await d.quoteLiquidate({
        marketAddress: id as `0x${string}`,
        outcomeIndices: [idx],
        account: owner,
      });
      liquidateByKey.set(id + "-" + idx, totalTokensOut);
    } catch {
      /* not liquidatable — leave unset */
    }
  });
  tick("expired values");

  const positions: EnrichedPosition[] = activePositions
    .map((p: any) => {
      const id = String(p.marketProxy).toLowerCase();
      const m = marketById.get(id);
      const idx = Number(p.outcomeIdx);
      const shares = Number(BigInt(p.shares)) / 1e18;
      const status = m?.status ?? p.marketStatus;
      const price = m?.prices?.[idx];

      // Value basis follows market status: spot while open, redemption once
      // settled (winning outcome only; losing shares are worth 0), liquidation
      // once expired. Falls back to undefined ("—") when a quote couldn't resolve.
      let value: number | undefined;
      let valueBasis: EnrichedPosition["valueBasis"];
      if (status === "settled") {
        const win = m?.winningOutcomeIdx;
        if (win != null && win === idx) {
          const t = redeemByMarket.get(id);
          if (t !== undefined) {
            value = Number(t) / 1e6;
            valueBasis = "redeem";
          }
        } else if (win != null) {
          value = 0;
          valueBasis = "settled-loss";
        }
      } else if (status === "expired") {
        const t = liquidateByKey.get(id + "-" + idx);
        if (t !== undefined) {
          value = Number(t) / 1e6;
          valueBasis = "liquidate";
        }
      } else if (price !== undefined) {
        value = shares * price;
        valueBasis = "spot";
      }

      const avg = avgPrice(p.marketProxy, idx);
      const cost = avg !== undefined ? avg * shares : undefined;
      const pnl = cost !== undefined && value !== undefined ? value - cost : undefined;
      const pnlPct =
        cost !== undefined && cost > 0 && value !== undefined ? ((value - cost) / cost) * 100 : undefined;
      return {
        market: p.marketProxy,
        question: m?.question ?? shortAddr(p.marketProxy),
        unlisted: !m,
        outcomeIdx: idx,
        outcomeLabel: m?.outcomes?.[idx] ?? "#" + idx,
        shares,
        prob: m?.probs?.[idx],
        price,
        value,
        valueBasis,
        cost,
        pnl,
        pnlPct,
        status,
      };
    })
    .sort((a: EnrichedPosition, b: EnrichedPosition) => (b.value ?? 0) - (a.value ?? 0));

  const totalValue = positions.reduce((s, p) => s + (p.value ?? 0), 0);
  const totalCost = positions.reduce((s, p) => s + (p.cost ?? 0), 0);
  const valueWithCost = positions
    .filter((p) => p.cost !== undefined)
    .reduce((s, p) => s + (p.value ?? 0), 0);
  const returnPct = totalCost > 0 ? ((valueWithCost - totalCost) / totalCost) * 100 : undefined;

  const bought = trades.filter((t) => t.kind === "BUY").reduce((s, t) => s + t.usd, 0);
  const sold = trades.filter((t) => t.kind === "SELL").reduce((s, t) => s + t.usd, 0);

  // Realised P/L on closed positions (avg-cost): proceeds − closedShares ×
  // avgBuyPrice. Sells close the traded outcome; redemptions close the market's
  // *winning* outcome (resolved from the market, since the event carries none);
  // liquidations close one or more outcomes (per-leg basis). As with sells, a
  // leg whose cost basis is unknown (buys outside the trade window) is skipped
  // rather than booked as pure profit.
  let realised = 0;
  for (const t of trades) {
    if (t.kind === "SELL") {
      const avg = avgPrice(t.market, t.outcomeIdx);
      if (avg !== undefined) realised += t.usd - t.shares * avg;
    } else if (t.kind === "REDEEM") {
      const win = marketById.get(t.market.toLowerCase())?.winningOutcomeIdx;
      const avg = win != null ? avgPrice(t.market, win) : undefined;
      if (avg !== undefined) realised += t.usd - t.shares * avg;
    } else if (t.kind === "LIQUIDATE") {
      const legs = t.legs ?? [];
      const avgs = legs.map((leg) => avgPrice(t.market, leg.outcomeIdx));
      // Only book it when every leg's basis is known, so proceeds and cost match.
      if (legs.length && avgs.every((a) => a !== undefined)) {
        const cost = legs.reduce((s, leg, i) => s + leg.shares * (avgs[i] as number), 0);
        realised += t.usd - cost;
      }
    }
  }
  const unrealised = valueWithCost - totalCost; // held value above cost basis
  const mtm = realised + unrealised;

  // Equity curve: cumulative net cash, chronological. Buys are cash out;
  // sells, redemptions and liquidations are all cash in.
  const asc = [...trades].sort((a, b) => a.ts - b.ts);
  let cash = 0;
  const equityCurve: number[] = [];
  for (const t of asc) {
    cash += t.kind === "BUY" ? -t.usd : t.usd;
    equityCurve.push(cash);
  }

  // Hourly trade count over the last 24h.
  const hourlyActivity = new Array(24).fill(0);
  for (const t of trades) {
    const h = Math.floor((now - t.ts) / 3600000);
    if (h >= 0 && h < 24) hourlyActivity[23 - h]++;
  }

  return {
    wallet,
    network,
    ts: now,
    eth: ethR.status === "fulfilled" ? Number(ethR.value as bigint) / 1e18 : undefined,
    usdc: usdcR.status === "fulfilled" ? Number(usdcR.value as bigint) / 1e6 : undefined,
    markets,
    marketById,
    positions,
    trades,
    totalValue,
    totalCost,
    returnPct,
    realised,
    unrealised,
    mtm,
    bought,
    sold,
    equityCurve,
    hourlyActivity,
    errors,
  };
}

function errMsg(e: any): string {
  return String(e?.message ?? e).slice(0, 60);
}
