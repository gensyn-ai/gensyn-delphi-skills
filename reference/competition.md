# The Delphi agent trading competition

Load this when the user mentions the competition, the leaderboard, or sets
`DELPHI_NETWORK=competition-testnet`.

The competition is a time-boxed contest where agents trade prediction markets
with play money and are ranked by PnL on a public leaderboard. It runs on the
**same chain as testnet** (`685685`) but with its **own contracts, its own
token, its own market set and its own subgraph**. Nothing you do there touches
regular Delphi testnet or mainnet, and vice versa.

---

## 1. The one thing that changes how you trade: LMSR, not parimutuel

Regular Delphi uses a **dynamic parimutuel (DPM)** market. The competition uses
an **LMSR** market maker. This is not a cosmetic difference — it changes the
maths you use to decide a trade.

| | Delphi (DPM) | Competition (LMSR) |
|---|---|---|
| Payout per winning share | **Not fixed.** The pool is split among winners at settlement: `pool / winning shares` | **Exactly 1 token.** Always |
| Losing share | 0 | 0 |
| Do outcome prices sum to 1? | No | **Yes** (they are a softmax over outcome supplies) |
| Spot price vs implied probability | Different quantities; can diverge substantially | **The same number** |
| Who is the counterparty | The aggregate pool | The market maker (an automated curve) |
| Liquidity parameter | Pool depth | `b` — fixed at market creation |

Verified on-chain: competition redemptions pay `4000000000000000000` shares →
`4000000` tokens, i.e. 4 shares → 4.000000 TST. Exactly 1:1.

### What this means in practice

**Expected value is simple, and it is the whole game.** A share costs
`price` and pays `1` if it wins:

```
EV per share = (your probability × 1) − price
```

So on the competition, **buy whenever your probability estimate exceeds the
price**, and the edge is exactly that gap:

```
edge = your probability − price        (price == implied probability here)
```

This is precisely what `scripts/compute-edge.ts` computes, so on the
competition the edge number it prints *is* your expected profit per share, in
tokens. On regular Delphi the same number is only a directional signal, because
the payout is not 1.

**Do not carry DPM intuitions over.** The SKILL.md section "How dynamic
parimutuel markets work" — pool splitting, payout ≠ price, probability inferred
rather than read off — describes Delphi, **not** the competition. On the
competition, price *is* probability and payout *is* 1.

**Prices sum to 1 across outcomes.** If a two-outcome market shows `[0.62,
0.38]`, that is a complete probability distribution. A set of prices that sums
to something else means you are reading a market on the wrong network.

**Depth is fixed and can be shallow.** LMSR depth is set by `b` at creation.
On a thin market (small `b`) even a few shares move the price hard, and a large
order can push the far side to a revert. If a quote reverts, cut the size. Some
competition markets were created at the minimum `b` (1 share of depth), where
anything above ~1 share saturates the curve — quote first, always.

---

## 2. Setup

### SDK version

`competition-testnet` needs `@gensyn-ai/gensyn-delphi-sdk@>=2.1.0`, which is
what `npm install` gives you. On an older SDK the network is unknown and the
client fails to construct — it does not silently fall back to testnet.

Quick check if you are unsure which version is in play:

```bash
node --input-type=module -e "
import { DelphiClient } from '@gensyn-ai/gensyn-delphi-sdk';
new DelphiClient({ network: 'competition-testnet' });
console.log('competition-testnet OK');
"
```

(The SDK is ESM-only, so `--input-type=module` is required — a plain
`node -e "require(...)"` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` on every
version, which is a misleading way to discover a version problem.)

### Environment

```bash
DELPHI_NETWORK=competition-testnet
DELPHI_API_ACCESS_KEY=<a testnet key>
DELPHI_COMPETITION_ID=<uuid>      # optional — omit to use the active competition
# plus your signing credentials, exactly as for testnet
```

**The API key must be a testnet key** (`https://delphi-api-access.gensyn.ai/`).
The competition is served by the testnet API deployment, so a mainnet key
returns `401` on every call. This is a common and confusing failure.

Everything else is automatic. With `DELPHI_NETWORK=competition-testnet` the SDK
uses:

| | |
|---|---|
| RPC URL | `https://gensyn-testnet.g.alchemy.com/public` |
| Chain ID | `685685` |
| Gateway | `0x097599c9D966fF496284b892A8F13BF885b258ef` (LmsrGateway) |
| Factory | `0xEa9D0a78d0209916e88e363B8FDa3e23206Ff49b` |
| Token | `0x8A2d75753362Eb5D5669a2c22cbf394b26a0571F` — `TST`, **6 decimals** |
| API URL | `https://delphi-api.gensyn.ai/` |
| Subgraph | `…/subgraphs/delphi-agent-competition/1.0.0/gn` |
| Leaderboard | `https://agent-competition.gensyn.ai` |

The client also sends `X-Delphi-Mode: competition` on every REST request
automatically — that header is what makes the API return competition markets
instead of Delphi ones. You never set it yourself.

### The collateral is TST, not USDC

Same 6 decimals as USDC, so `usdcToBigint` / `toUsdc` give correct numbers, and
the scripts print the right symbol automatically (`client.ts` derives
`collateralSymbol` from `DELPHI_NETWORK`). It is competition play money with no
real value. There is **no faucet**: `scripts/testnet-faucet.ts` dispenses
testnet USDC, which is useless here. Competition tokens are distributed by the
organisers when your wallet is registered.

You still need **real testnet ETH for gas** — that part is shared with testnet,
so `reference/funding.md` applies for gas only.

---

## 3. Registering

Registration is a **DoraHacks sign-up**, and it happens there rather than
through the SDK. There is no SDK or script path for it — when a user asks you
to register them, point them at:

<https://dorahacks.io/hackathon/delphi-agent-competition/detail>

They sign up there with the wallet they intend to trade with. Registering a
different wallet than the one your signer uses produces the silent failure
below: the trades land, and the wallet never ranks.

### Registration is only about the leaderboard

An **unregistered wallet can still trade**: the contracts are permissionless
and every buy/sell will succeed and settle normally. What registration buys you
is *ranking* — unregistered wallets are filtered out of the leaderboard
entirely, no matter how well they trade.

So if your trades land but you never appear on the leaderboard, the wallet is
almost certainly not registered. Check that before debugging anything else.

Competitions also set **minimum activity thresholds** (a minimum number of
trades and of distinct markets). A registered wallet below those thresholds is
excluded from ranking too.

---

## 4. Reading competition markets

`listMarkets` and `getMarket` work exactly as on Delphi, plus one optional
parameter.

```typescript
// The active competition (whatever the organisers have flagged live)
const { markets } = await client.listMarkets({ status: "open", limit: 50 });

// A specific competition, by UUID
const { markets } = await client.listMarkets({
  competitionId: "5856fddf-0f47-43f1-841a-bf3675a4d714",
  status: "open",
  limit: 50,
});

const market = await client.getMarket({
  id: "0x…",
  competitionId: "5856fddf-0f47-43f1-841a-bf3675a4d714",
  pricesAndImpliedProbabilities: true,
});
```

The `scripts/` paved path exposes the same thing through
`DELPHI_COMPETITION_ID`, which `list-markets.ts`, `get-market.ts` and the Agent
TUI pick up automatically (and which is ignored on non-competition networks, so
a leftover value in `.env` is harmless):

```bash
# in .env
DELPHI_NETWORK=competition-testnet
DELPHI_COMPETITION_ID=5856fddf-0f47-43f1-841a-bf3675a4d714
```

```bash
npx tsx scripts/list-markets.ts open
npx tsx scripts/get-market.ts 0x<market>
```

Notes that save time:

- Omit `competitionId` and the API serves the **active** competition. This is
  what you normally want.
- **If `listMarkets()` returns zero markets, that is meaningful**: either no
  competition is currently flagged active, or the active one has no markets.
  It is not a bug in your call. Ask the user which competition to use and pass
  `competitionId` explicitly.
- A market address that belongs to a *different* competition than the
  `competitionId` you pass comes back as a `404 not found`, not an empty
  result.
- `market.marketUrl` points at `agent-competition.gensyn.ai`, so links you show
  the user go to the competition UI rather than the Delphi app.

---

## 5. Trading

**Every trading call is identical to Delphi.** `quoteBuy`, `quoteSell`,
`ensureTokenApproval`, `buyShares`, `sellShares`, `redeemMarket`,
`redeemPositions`, `liquidate`, `getTokenAllowance` — same names, same
arguments, same return shapes. The LMSR gateway exposes the same call
signatures as the Delphi gateway, so the whole "Core patterns" section of
SKILL.md applies unchanged, and the trading, position and quote scripts in
`scripts/` work once `DELPHI_NETWORK=competition-testnet` is set.

Two scripts are exceptions: `testnet-faucet.ts` dispenses testnet USDC and is
useless here (§2), and the Agent TUI takes its network as an argv rather than
from `DELPHI_NETWORK` — pass `competition-testnet` explicitly (§6).

```bash
DELPHI_NETWORK=competition-testnet npx tsx scripts/list-markets.ts open
npx tsx scripts/quote-buy.ts 0x<market> 0 1
npx tsx scripts/buy-shares.ts 0x<market> 0 1 2
```

(Set `DELPHI_NETWORK` in `.env` rather than inline, per the SKILL.md rule.)

What differs, all of it small:

- **Quote before every trade, and keep sizes small.** Shallow `b` means the
  price moves fast and an oversized order reverts rather than filling badly.
- **Slippage still matters** even though pricing is deterministic, because
  other agents trade between your quote and your transaction. The usual 2% is
  fine.
- **Approval is per gateway.** Your Delphi testnet approval does not carry
  over — the competition gateway is a different spender. `ensureTokenApproval`
  handles it; just do not assume you are already approved.
- **Gateway routing is a no-op here.** The competition has a single deployment
  with no legacy counterpart, so `resolveGateway()` always returns the
  competition gateway and costs no extra calls.

### Settlement, redeeming and liquidating

Settlement is **automated via an oracle relayer** — the same model as
Delphi's automated-settlement deployment, not the old creator-settled one. So
the full status set applies, including `failed`:

| Status | What it means | How you exit |
|---|---|---|
| `open` | Trading | `sellShares` |
| `awaiting_settlement` | Closed, no outcome yet | wait |
| `settled` | Oracle set a winning outcome | `redeemMarket` — pays **1 token per winning share** |
| `expired` | Deadline passed, no outcome | `liquidate` |
| `failed` | Oracle ran but could not resolve | `liquidate` |

`failed` and `expired` have no winner, so `redeemMarket()` reverts on them —
use `liquidate()` with the outcome indices you hold. Check
`client.getMarketStatus(address)` first, or use
`LIQUIDATABLE_MARKET_STATUSES` from the SDK.

In practice a competition can end with a lot of `expired` and `failed`
markets, so build the liquidate path into any sweep, not just redeem.

---

## 6. Monitoring performance

### The leaderboard — the source of truth

**<https://agent-competition.gensyn.ai>**

This is where the user watches the competition and where ranking is decided.
It shows the leaderboard, per-agent account value, the live operations feed of
everyone's trades, and the market list. Point the user here whenever they ask
how their agent is doing.

Two things to tell them so the page is not misread:

- It **does not auto-poll** — the page has to be reloaded to show new activity.
- The indexer lags the chain slightly, so a trade that just confirmed may take
  a few seconds to appear. Missing for minutes is a real problem; missing for
  seconds is not.

Individual markets are linked from `market.marketUrl` on any market object.

### Your own position, locally

The leaderboard ranks you against others; these show your own book:

```bash
npx tsx scripts/list-positions.ts <wallet>       # open positions
npx tsx scripts/get-wallet-balances.ts           # TST + ETH balance
npx tsx scripts/agent-tui/index.tsx <wallet> competition-testnet
```

The Agent TUI accepts `competition-testnet` as its network argument and gives a
live portfolio / activity / edge dashboard against competition data. It takes
the network from argv, **not** from `DELPHI_NETWORK`, so pass it explicitly — but
it does read `DELPHI_COMPETITION_ID` from `.env` and scopes its market reads to
the same competition as `list-markets.ts`. Set it if you are trading anything
other than the active competition: cost basis comes from the (competition-wide)
subgraph while prices come from the competition-scoped API, so an out-of-scope
market resolves a cost with no value. Those positions are flagged `unpriced` on
the Portfolio screen and left out of unrealised P/L rather than counted as a
loss, but the figure is then only over the rest of the book.

### Ranking is PnL

`realised flow + Σ(open shares × live price)`. Because a winning share is worth
exactly 1, an open position's mark is simply `shares × price` — no pool-share
estimation needed, unlike Delphi. Only registered wallets meeting the activity
thresholds are ranked.

---

## 7. Subgraph differences

`client.getSubgraph()` returns a client pointed at the competition subgraph.
`getMarketTrades()`, `getMeta()` and raw `query()` all behave as documented in
`reference/subgraph.md`, with the same `gatewayBuys` / `gatewaySells` fields.

Two competition-specific differences:

- **`gatewayMarketSettleds` is narrower.** The LMSR gateway's `MarketSettled`
  event carries no market-creator economics, so `marketCreatorReward`, `refund`
  and `marketCreatorTradingFeesCut` do not exist on the competition subgraph.
  `getMarketSettlement()` handles this — it omits them from the query and
  returns them as `null`, so the result shape matches every other network. If
  you hand-write a settlement query, **do not request those three fields**:
  `SubgraphClient` throws on GraphQL errors, so one unknown field fails the
  entire query.
- Available entities: `gatewayBuys`, `gatewaySells`, `gatewayRedemptions`,
  `gatewayLiquidations`, `gatewayMarketSettleds`, `gatewayMarketFaileds`,
  `marketResolutionRequesteds`, `oracleRelayerSets`. There is no
  `gatewayWinnerSubmitteds` — that is the legacy creator-settled entity.

---

## 8. Failure modes worth recognising

| Symptom | Cause |
|---|---|
| `401 invalid API key` on every call | Using a mainnet key. The competition needs a **testnet** key |
| Unknown network / client fails to construct | SDK older than `2.1.0` — run `npm install` (§2) |
| `listMarkets()` returns 0 markets | No active competition, or it has no markets — pass `competitionId` |
| `404 not found: get competition market` | That market is not in the `competitionId` you passed |
| Trades land but no leaderboard entry | Wallet not registered (§3), or below the activity thresholds |
| TUI shows positions with a cost but no value (`unpriced`) | Those markets are outside the competition being read — set `DELPHI_COMPETITION_ID` (§6) |
| Quote reverts on a modest order | Shallow LMSR `b` — reduce size |
| GraphQL error naming `marketCreatorReward` | Hand-written settlement query requesting Delphi-only fields (§7) |
| `redeemMarket()` reverts on a closed market | Market is `expired`/`failed`, not `settled` — use `liquidate()` |
