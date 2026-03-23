/**
 * List recent trades (buys and sells) for a given market via the Goldsky subgraph.
 * Usage: npx tsx scripts/list-recent-trades.ts <market-proxy-address> [limit]
 *   market-proxy-address - on-chain market proxy (0x...)
 *   limit                - max trades per side (default: 20)
 *
 * Examples:
 *   npx tsx scripts/list-recent-trades.ts 0x1234...abcd
 *   npx tsx scripts/list-recent-trades.ts 0x1234...abcd 50
 */
import { client, toUsdc, toShares } from "./client.js";

const marketProxy = process.argv[2];
if (!marketProxy) {
  console.error("Usage: npx tsx scripts/list-recent-trades.ts <market-proxy-address> [limit]");
  process.exit(1);
}

const first = Number(process.argv[3] ?? 20);

const subgraph = client.getSubgraph();
const { buys, sells } = await subgraph.getMarketTrades(marketProxy, { first });

type TradeRow = {
  side: "BUY" | "SELL";
  time: Date;
  wallet: string;
  outcomeIdx: number;
  usdc: number;
  shares: number;
  txHash: string;
};

const rows: TradeRow[] = [];

for (const b of buys) {
  rows.push({
    side: "BUY",
    time: new Date(Number(b.timestamp_) * 1000),
    wallet: b.buyer ?? "unknown",
    outcomeIdx: Number(b.outcomeIdx ?? "0"),
    usdc: Number(BigInt(b.tokensIn ?? "0")) / 1e6,
    shares: Number(BigInt(b.sharesOut ?? "0")) / 1e18,
    txHash: b.transactionHash_,
  });
}

for (const s of sells) {
  rows.push({
    side: "SELL",
    time: new Date(Number(s.timestamp_) * 1000),
    wallet: s.seller ?? "unknown",
    outcomeIdx: Number(s.outcomeIdx ?? "0"),
    usdc: Number(BigInt(s.tokensOut ?? "0")) / 1e6,
    shares: Number(BigInt(s.sharesIn ?? "0")) / 1e18,
    txHash: s.transactionHash_,
  });
}

rows.sort((a, b) => b.time.getTime() - a.time.getTime());

if (rows.length === 0) {
  console.log("No trades found for market " + marketProxy);
  process.exit(0);
}

console.log(`Recent trades for market ${marketProxy}:\n`);

for (const r of rows) {
  const pad = r.side === "BUY" ? " " : "";
  const dir = r.side === "BUY" ? "spent" : "received";
  console.log(
    `${r.side}${pad}  ${r.time.toLocaleString()}  ` +
    `outcome ${r.outcomeIdx}  ` +
    `${r.shares.toFixed(4)} shares  ` +
    `${dir} ${r.usdc.toFixed(4)} USDC  ` +
    `@ ${(r.usdc / r.shares).toFixed(4)} USDC/share`
  );
  console.log(`      wallet: ${r.wallet}`);
  console.log(`      tx:     ${r.txHash}`);
  console.log("---");
}

console.log(`\nTotal: ${buys.length} buys, ${sells.length} sells`);

const meta = await subgraph.getMeta();
console.log(`Subgraph indexed to block ${meta.block.number}` +
  (meta.hasIndexingErrors ? " (has indexing errors)" : ""));
