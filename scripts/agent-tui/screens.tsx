/** The five screens + the market drill-down. Each is a pure function of the
 * snapshot (plus selection state for the table screens). Layout is responsive:
 * numeric columns are fixed-width, the text column flexes, and multi-column
 * rows split via equal flexGrow — so it adapts to any terminal width. */
import { Box, Text } from "ink";
import React from "react";
import type { MarketRow, Snapshot } from "./data.js";
import { agentEdgePath, type AgentEdge } from "./edges.js";
import { agentLogPath, type AgentEvent } from "./events.js";
import { ago, ellipsize, num, pct01, pnlColor, probColor, shortAddr, signedPct, signedUsd, usd } from "./format.js";
import { Badge, Cell, FlexCell, Gauge, Panel, Sparkline, Stat } from "./ui.js";

// Show only as many list rows as fit the terminal, scrolling to keep the
// selected row visible — otherwise long lists (70+ positions) overflow the
// screen. `reserve` is the non-list chrome (menu, panel borders, summary, etc.).
const rowBudget = (reserve: number) => Math.max(3, (process.stdout.rows || 24) - reserve);
function windowSlice<T>(items: T[], selected: number, size: number): { start: number; rows: T[] } {
  if (items.length <= size) return { start: 0, rows: items };
  const start = Math.max(0, Math.min(selected - Math.floor(size / 2), items.length - size));
  return { start, rows: items.slice(start, start + size) };
}

// Compact labels for the on-chain trade feed (REDEEM/LIQUIDATE proceeds are
// cash-in, like sells). The colours mirror EVENT_COLOR so a kind reads the same
// in the trade rows and the Agent Logs panel. "LIQ" is shortened to fit.
const TRADE_SIDE: Record<string, string> = { BUY: "BUY", SELL: "SELL", REDEEM: "REDEEM", LIQUIDATE: "LIQ" };
// Buys are cash out (red, "−"); sells/redeems/liquidations are cash in (green, "+").
const isCashIn = (kind: string) => kind !== "BUY";
const tradeAmount = (t: { kind: string; usd: number }) => (isCashIn(t.kind) ? "+" : "-") + usd(t.usd);

// ─── Overview ─────────────────────────────────────────────────────────────────
export function Overview({ snap, events, edges }: { snap: Snapshot; events: AgentEvent[]; edges: AgentEdge[] }) {
  const buys = snap.trades.filter((t) => t.kind === "BUY").length;
  const sells = snap.trades.filter((t) => t.kind === "SELL").length;
  const redeems = snap.trades.filter((t) => t.kind === "REDEEM").length;
  const liqs = snap.trades.filter((t) => t.kind === "LIQUIDATE").length;
  return (
    <Box flexDirection="column">
      <Box>
        <Panel title="WALLET" flexGrow={1}>
          <Stat label="ETH" value={snap.eth !== undefined ? num(snap.eth, 5) : "—"} />
          <Stat label="USDC" value={snap.usdc !== undefined ? usd(snap.usdc) : "—"} color="green" />
          <Stat label="address" value={shortAddr(snap.wallet)} color="gray" />
          <Stat label="network" value={snap.network} color="cyan" />
        </Panel>
        <Panel title="PnL (mark-to-market)" flexGrow={1}>
          <Stat label="realised" value={signedUsd(snap.realised)} color={pnlColor(snap.realised)} />
          <Stat label="unrealised" value={signedUsd(snap.unrealised)} color={pnlColor(snap.unrealised)} />
          <Stat label="total MtM" value={signedUsd(snap.mtm)} color={pnlColor(snap.mtm)} />
          <Stat label="volume" value={usd(snap.bought + snap.sold)} />
        </Panel>
        <Panel title="PORTFOLIO" flexGrow={1}>
          <Stat label="positions" value={snap.positions.length} />
          <Stat label="held value" value={usd(snap.totalValue)} color="green" />
          <Stat label="open markets" value={snap.markets.length} />
          <Stat label="events" value={`${buys}B/${sells}S/${redeems}R/${liqs}L`} />
        </Panel>
      </Box>

      <Panel title="REALIZED CASH FLOW & ACTIVITY">
        <Box>
          <Box width={11}>
            <Text dimColor>cash flow</Text>
          </Box>
          <Sparkline values={snap.equityCurve.length ? snap.equityCurve : [0]} color={pnlColor(snap.mtm)} />
        </Box>
        <Box>
          <Box width={11}>
            <Text dimColor>trades/h</Text>
          </Box>
          <Sparkline values={snap.hourlyActivity} color="magenta" />
        </Box>
      </Panel>

      <Box>
        <Panel title="RECENT TRADES" flexGrow={1}>
          <TradeRows snap={snap} limit={6} />
        </Panel>
        <Panel title="TOP POSITIONS" flexGrow={1}>
          {snap.positions.slice(0, 6).map((p, i) => (
            <Box key={i}>
              <FlexCell>{p.question}</FlexCell>
              <Cell w={9}>{p.outcomeLabel}</Cell>
              <Cell w={11} align="right" color="green">{p.value !== undefined ? usd(p.value) : "—"}</Cell>
            </Box>
          ))}
          {snap.positions.length === 0 && <Text dimColor>no positions</Text>}
        </Panel>
      </Box>

      <EdgeView snap={snap} edges={edges} />
      <AgentLogs events={events} reserve={32} />
    </Box>
  );
}

function TradeRows({ snap, limit }: { snap: Snapshot; limit: number }) {
  return (
    <>
      {snap.trades.slice(0, limit).map((t, i) => (
        <Box key={i}>
          <Cell w={6} dim>{ago(t.ts)}</Cell>
          <Cell w={7} color={EVENT_COLOR[t.kind] ?? "white"} bold>{TRADE_SIDE[t.kind] ?? t.kind}</Cell>
          <Cell w={9} align="right">{num(t.shares)}</Cell>
          <FlexCell>{"  " + (snap.marketById.get(t.market.toLowerCase())?.question ?? shortAddr(t.market))}</FlexCell>
          <Cell w={11} align="right" color={isCashIn(t.kind) ? "green" : "red"}>
            {tradeAmount(t)}
          </Cell>
        </Box>
      ))}
      {snap.trades.length === 0 && <Text dimColor>no trades</Text>}
    </>
  );
}

// ─── Markets ──────────────────────────────────────────────────────────────────
export function Markets({ snap, selected }: { snap: Snapshot; selected: number }) {
  const { start, rows } = windowSlice(snap.markets, selected, rowBudget(8));
  return (
    <Panel title={`MARKETS — ${snap.markets.length} open   ↑↓ select · ⏎ detail`} flexGrow={1}>
      <Box>
        <FlexCell dim>Question</FlexCell>
        <Cell w={14} dim>Top outcome</Cell>
        <Cell w={18} dim>Probability</Cell>
        <Cell w={12} dim align="right">Init Liq</Cell>
      </Box>
      {start > 0 && <Text dimColor>{`  ▲ ${start} more`}</Text>}
      {rows.map((m, k) => {
        const i = start + k;
        const p = m.probs[m.topIdx];
        const sel = i === selected;
        return (
          <Box key={m.id}>
            <FlexCell inverse={sel} bold={sel}>{(sel ? "▸ " : "  ") + m.question}</FlexCell>
            <Cell w={14}>{m.outcomes[m.topIdx] ?? "#" + m.topIdx}</Cell>
            <Box width={18}>
              <Gauge value={p ?? 0} width={9} />
              <Text color={probColor(p)}> {pct01(p)}</Text>
            </Box>
            <Cell w={12} align="right">{usd(m.liquidity)}</Cell>
          </Box>
        );
      })}
      {start + rows.length < snap.markets.length && (
        <Text dimColor>{`  ▼ ${snap.markets.length - start - rows.length} more`}</Text>
      )}
      {snap.markets.length === 0 && <Text dimColor>no open markets</Text>}
    </Panel>
  );
}

// ─── Portfolio ──────────────────────────────────────────────────────────────────
export function Portfolio({ snap, selected }: { snap: Snapshot; selected: number }) {
  return (
    <Box flexDirection="column">
      <Panel title="PORTFOLIO">
        <Box flexWrap="wrap">
          <Text dimColor>value </Text>
          <Text color="green" bold>{usd(snap.totalValue)}</Text>
          <Text dimColor>   cost basis </Text>
          <Text>{usd(snap.totalCost)}</Text>
          <Text dimColor>   unrealised </Text>
          <Text color={pnlColor(snap.unrealised)}>
            {signedUsd(snap.unrealised)}
            {snap.returnPct !== undefined ? ` (${signedPct(snap.returnPct)})` : ""}
          </Text>
          <Text dimColor>   realised </Text>
          <Text color={pnlColor(snap.realised)}>{signedUsd(snap.realised)}</Text>
          <Text dimColor>   MtM </Text>
          <Text color={pnlColor(snap.mtm)} bold>{signedUsd(snap.mtm)}</Text>
        </Box>
        <Box>
          <Box width={11}>
            <Text dimColor>cash flow</Text>
          </Box>
          <Sparkline values={snap.equityCurve.length ? snap.equityCurve : [0]} color={pnlColor(snap.mtm)} />
        </Box>
      </Panel>
      <Panel title={`POSITIONS — ${snap.positions.length}   ↑↓ select · ⏎ detail`} flexGrow={1}>
        <Box>
          <FlexCell dim>Market</FlexCell>
          <Cell w={14} dim>Outcome</Cell>
          <Cell w={9} dim>Status</Cell>
          <Cell w={10} dim align="right">Shares</Cell>
          <Cell w={11} dim align="right">Cost</Cell>
          <Cell w={11} dim align="right">Value</Cell>
          <Cell w={10} dim align="right">P/L %</Cell>
        </Box>
        {(() => {
          const { start, rows } = windowSlice(snap.positions, selected, rowBudget(15));
          return (
            <>
              {start > 0 && <Text dimColor>{`  ▲ ${start} more`}</Text>}
              {rows.map((p, k) => {
                const i = start + k;
                const sel = i === selected;
                return (
                  <Box key={i}>
                    <FlexCell inverse={sel} bold={sel}>
                      {(sel ? "▸ " : "  ") + p.question}
                      {p.unlisted ? <Text dimColor> (unlisted)</Text> : null}
                    </FlexCell>
                    <Cell w={14}>{ellipsize(p.outcomeLabel, 12)}</Cell>
                    <Box width={9}><Badge status={p.status} /></Box>
                    <Cell w={10} align="right">{num(p.shares)}</Cell>
                    <Cell w={11} align="right" dim>{p.cost !== undefined ? usd(p.cost) : "—"}</Cell>
                    <Cell w={11} align="right" color={p.valueBasis === "settled-loss" ? "gray" : "green"}>{p.value !== undefined ? usd(p.value) : "—"}</Cell>
                    <Cell w={10} align="right" color={p.pnlPct !== undefined ? pnlColor(p.pnlPct) : "gray"}>
                      {p.pnlPct !== undefined ? signedPct(p.pnlPct) : "—"}
                    </Cell>
                  </Box>
                );
              })}
              {start + rows.length < snap.positions.length && (
                <Text dimColor>{`  ▼ ${snap.positions.length - start - rows.length} more`}</Text>
              )}
            </>
          );
        })()}
        {snap.positions.length === 0 && <Text dimColor>no active positions</Text>}
      </Panel>
    </Box>
  );
}

// ─── Activity ──────────────────────────────────────────────────────────────────
export function Activity({ snap, selected }: { snap: Snapshot; selected: number }) {
  const { start, rows } = windowSlice(snap.trades, selected, rowBudget(8));
  return (
    <Panel title={`MY ACTIVITY — ${snap.trades.length} events   ↑↓ scroll · ⏎ market`} flexGrow={1}>
      <Box>
        <Cell w={9} dim>When</Cell>
        <Cell w={6} dim>Side</Cell>
        <Cell w={11} dim align="right">Shares</Cell>
        <FlexCell dim>{"  Market"}</FlexCell>
        <Cell w={12} dim align="right">Amount</Cell>
      </Box>
      {start > 0 && <Text dimColor>{`  ▲ ${start} more`}</Text>}
      {rows.map((t, k) => {
        const i = start + k;
        const sel = i === selected;
        return (
          <Box key={i}>
            <Cell w={9} dim>{ago(t.ts) + " ago"}</Cell>
            <Cell w={8} color={EVENT_COLOR[t.kind] ?? "white"} bold>{TRADE_SIDE[t.kind] ?? t.kind}</Cell>
            <Cell w={11} align="right">{num(t.shares)}</Cell>
            <FlexCell inverse={sel} bold={sel}>
              {(sel ? "▸ " : "  ") + (snap.marketById.get(t.market.toLowerCase())?.question ?? shortAddr(t.market))}
            </FlexCell>
            <Cell w={12} align="right" color={isCashIn(t.kind) ? "green" : "red"}>
              {tradeAmount(t)}
            </Cell>
          </Box>
        );
      })}
      {start + rows.length < snap.trades.length && (
        <Text dimColor>{`  ▼ ${snap.trades.length - start - rows.length} more`}</Text>
      )}
      {snap.trades.length === 0 && <Text dimColor>no trades for this wallet</Text>}
    </Panel>
  );
}

// ─── Agent (supervision) ─────────────────────────────────────────────────────────
const EVENT_COLOR: Record<string, string> = {
  THINK: "gray",
  BUY: "green",
  SELL: "yellow",
  LIQUIDATE: "magenta",
  REDEEM: "cyan",
  SKIP: "white",
};

interface EdgeRow {
  market: string;
  outcomeIdx: number;
  prob: number; // agent's probability, 0..1
  question: string;
  outcome: string;
  marketProb?: number; // live market implied prob for that outcome
  edge?: number; // agent − market, 0..1
}

// Reduce the edge store to the latest entry per (market, outcome), join with the
// live market-implied probability from the snapshot (falling back to the value
// captured at compute time), and rank by the size of the gap.
function edgeRows(snap: Snapshot, edges: AgentEdge[]): EdgeRow[] {
  const latest = new Map<string, AgentEdge>();
  for (const e of edges) {
    const key = String(e.market).toLowerCase() + "-" + Number(e.outcomeIdx ?? 0);
    const prev = latest.get(key);
    if (!prev || e.ts > prev.ts) latest.set(key, e);
  }
  const rows: EdgeRow[] = [];
  for (const e of latest.values()) {
    const market = String(e.market);
    const outcomeIdx = Number(e.outcomeIdx ?? 0);
    const prob = Number(e.prob);
    const m = snap.marketById.get(market.toLowerCase());
    const marketProb = m?.probs?.[outcomeIdx] ?? e.marketProb; // live, fallback to captured
    rows.push({
      market,
      outcomeIdx,
      prob,
      question: m?.question ?? e.question ?? shortAddr(market),
      outcome: m?.outcomes?.[outcomeIdx] ?? e.outcome ?? "#" + outcomeIdx,
      marketProb,
      edge: marketProb !== undefined ? prob - marketProb : undefined,
    });
  }
  rows.sort((a, b) => Math.abs(b.edge ?? -1) - Math.abs(a.edge ?? -1));
  return rows;
}

// Edge View — agent's probability vs the live market-implied probability, ranked
// by the size of the gap. Populated by `scripts/compute-edge.ts`. Surfaced on the
// Overview.
function EdgeView({ snap, edges }: { snap: Snapshot; edges: AgentEdge[] }) {
  const rows = edgeRows(snap, edges).slice(0, 6);
  return (
    <Panel title="EDGE VIEW — agent probability vs market">
      {rows.length === 0 ? (
        <Text dimColor>{`no edges yet — agent logs edges to ${agentEdgePath()}`}</Text>
      ) : (
        <>
          <Box>
            <FlexCell dim>Market</FlexCell>
            <Cell w={12} dim>Outcome</Cell>
            <Cell w={8} dim align="right">Agent</Cell>
            <Cell w={8} dim align="right">Market</Cell>
            <Cell w={11} dim align="right">Edge</Cell>
          </Box>
          {rows.map((r, i) => (
            <Box key={i}>
              <FlexCell>{r.question}</FlexCell>
              <Cell w={12}>{r.outcome}</Cell>
              <Cell w={8} align="right">{pct01(r.prob)}</Cell>
              <Cell w={8} align="right" color={probColor(r.marketProb)}>{pct01(r.marketProb)}</Cell>
              <Cell w={11} align="right" color={r.edge === undefined ? "gray" : r.edge > 0 ? "green" : r.edge < 0 ? "red" : "gray"}>
                {r.edge === undefined ? "—" : `${signedPct(r.edge * 100)} ${r.edge > 0 ? "▲" : r.edge < 0 ? "▼" : ""}`}
              </Cell>
            </Box>
          ))}
        </>
      )}
    </Panel>
  );
}

// Agent Logs — the agent's reasoning and action stream, newest first. Surfaced
// on the Overview; windows to the newest rows that fit and flags the overflow.
function AgentLogs({ events, reserve }: { events: AgentEvent[]; reserve: number }) {
  const logs = events
    .filter((e) => typeof e.text === "string" && e.text.trim().length > 0)
    .slice()
    .reverse(); // newest first
  const size = rowBudget(reserve);
  return (
    <Panel title="AGENT LOGS" flexGrow={1}>
      {logs.length === 0 ? (
        <Text dimColor>{`no agent events yet — agent logs to ${agentLogPath()}`}</Text>
      ) : (
        <>
          {logs.slice(0, size).map((e, i) => (
            <Box key={i}>
              <Cell w={7} dim>{ago(e.ts)}</Cell>
              <Cell w={8} color={EVENT_COLOR[e.type] ?? "white"} bold>{e.type}</Cell>
              <FlexCell>{e.text}</FlexCell>
            </Box>
          ))}
          {logs.length > size && <Text dimColor>{`  ▼ ${logs.length - size} more`}</Text>}
        </>
      )}
    </Panel>
  );
}

// ─── Market detail (drill-down) ───────────────────────────────────────────────────
export function MarketDetail({ snap, market }: { snap: Snapshot; market: MarketRow }) {
  const myPos = snap.positions.filter((p) => p.market.toLowerCase() === market.id.toLowerCase());
  const trades = snap.trades.filter((t) => t.market.toLowerCase() === market.id.toLowerCase()).slice(0, 10);
  return (
    <Box flexDirection="column">
      <Panel title="MARKET">
        <Text bold>{market.question}</Text>
        <Box flexWrap="wrap">
          <Text dimColor>status </Text>
          <Badge status={market.status} />
          <Text dimColor>   category </Text>
          <Text>{market.category ?? "—"}</Text>
          <Text dimColor>   liquidity </Text>
          <Text color="green">{usd(market.liquidity)}</Text>
          <Text dimColor>   {shortAddr(market.id)}</Text>
        </Box>
      </Panel>
      <Panel title="OUTCOMES">
        {market.outcomes.map((o, i) => (
          <Box key={i}>
            <Cell w={24}>{o}</Cell>
            <Box width={18}>
              <Gauge value={market.probs[i] ?? 0} width={14} />
            </Box>
            <Cell w={8} align="right" color={probColor(market.probs[i])}>{pct01(market.probs[i])}</Cell>
            <Cell w={16} align="right" dim>{market.prices[i] !== undefined ? market.prices[i].toFixed(4) + " /share" : "—"}</Cell>
          </Box>
        ))}
      </Panel>
      <Box>
        <Panel title="YOUR POSITION" flexGrow={1}>
          {myPos.length ? (
            myPos.map((p, i) => (
              <Box key={i}>
                <FlexCell>{p.outcomeLabel}</FlexCell>
                <Cell w={14} align="right">{num(p.shares)} sh</Cell>
                <Cell w={12} align="right" color="green">{p.value !== undefined ? usd(p.value) : "—"}</Cell>
              </Box>
            ))
          ) : (
            <Text dimColor>no position in this market</Text>
          )}
        </Panel>
        <Panel title="RECENT TRADES" flexGrow={1}>
          {trades.length ? (
            trades.map((t, i) => (
              <Box key={i}>
                <Cell w={7} dim>{ago(t.ts)}</Cell>
                <Cell w={8} color={EVENT_COLOR[t.kind] ?? "white"} bold>{TRADE_SIDE[t.kind] ?? t.kind}</Cell>
                <FlexCell>{num(t.shares) + " sh"}</FlexCell>
                <Cell w={12} align="right" color={isCashIn(t.kind) ? "green" : "red"}>{tradeAmount(t)}</Cell>
              </Box>
            ))
          ) : (
            <Text dimColor>no indexed trades</Text>
          )}
        </Panel>
      </Box>
      <Text dimColor>  ⏎/esc back to list</Text>
    </Box>
  );
}
