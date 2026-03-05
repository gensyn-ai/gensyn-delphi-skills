/**
 * List markets.
 * Usage: npx tsx scripts/list-markets.ts [status] [category] [limit]
 *   status   - open | closed | settled  (default: open)
 *   category - e.g. crypto, weather     (default: all)
 *   limit    - number of results        (default: 20)
 *
 * Examples:
 *   npx tsx scripts/list-markets.ts
 *   npx tsx scripts/list-markets.ts open crypto
 *   npx tsx scripts/list-markets.ts settled "" 50
 */
import { client } from "./client.js";

const status = (process.argv[2] ?? "open") as "open" | "closed" | "settled";
const category = process.argv[3] || undefined;
const limit = Number(process.argv[4] ?? 20);

const { markets } = await client.listMarkets({ status, category, limit, skip: 0 });

if (!markets || markets.length === 0) {
  console.log("No markets found.");
  process.exit(0);
}

console.log("Found " + markets.length + " market(s) [status=" + status + "]:\n");
for (const m of markets) {
  const meta = m.metadata as { question?: string; outcomes?: string[]; category?: string } | null;
  console.log("ID:       " + m.id);
  console.log("Question: " + (meta?.question ?? "(no metadata)"));
  console.log("Outcomes: " + (meta?.outcomes?.join(" / ") ?? "—"));
  console.log("Category: " + (meta?.category ?? "—"));
  console.log("Status:   " + m.status);
  console.log("Created:  " + new Date(m.createdAt).toLocaleString());
  console.log("Settled:  " + (m.settledAt ? new Date(m.settledAt).toLocaleString() : "—"));
  console.log("---");
}
