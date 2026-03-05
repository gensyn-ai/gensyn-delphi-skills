/**
 * Get a single market with live on-chain prices and implied probabilities.
 * Usage: npx tsx scripts/get-market.ts <market-id>
 *
 * Example:
 *   npx tsx scripts/get-market.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
 */
import { createPublicClient, http, defineChain, type Abi } from "viem";
import { DYNAMIC_PARIMUTUEL_GATEWAY_ABI } from "@gensyn-ai/gensyn-delphi-sdk";
import { client, gatewayAddress, rpcUrl, chainId, toProb, toSpotPrice } from "./client.js";

const marketId = process.argv[2];
if (!marketId) {
  console.error("Usage: npx tsx scripts/get-market.ts <market-id>");
  process.exit(1);
}

const market = await client.getMarket({ id: marketId });
const meta = market.metadata as { question?: string; outcomes?: string[]; category?: string } | null;
const outcomes = meta?.outcomes ?? [];

console.log("ID:       " + market.id);
console.log("Question: " + (meta?.question ?? "(no metadata)"));
console.log("Category: " + (meta?.category ?? "—"));
console.log("Status:   " + market.status);
console.log("Outcomes: " + (outcomes.join(" / ") || "—"));
console.log("Created:  " + new Date(market.createdAt).toLocaleString());
console.log("Settled:  " + (market.settledAt ? new Date(market.settledAt).toLocaleString() : "—"));

if (outcomes.length > 0) {
  const chain = defineChain({
    id: chainId,
    name: "Gensyn Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const marketProxy = market.id as `0x${string}`;
  const outcomeIndices = outcomes.map((_, i) => BigInt(i));

  const [prices, probs] = await Promise.all([
    publicClient.readContract({
      address: gatewayAddress,
      abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
      functionName: "spotPrices",
      args: [marketProxy, outcomeIndices],
    }) as Promise<bigint[]>,
    publicClient.readContract({
      address: gatewayAddress,
      abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI as Abi,
      functionName: "spotImpliedProbabilities",
      args: [marketProxy, outcomeIndices],
    }) as Promise<bigint[]>,
  ]);

  console.log("\nLive prices:");
  for (let i = 0; i < outcomes.length; i++) {
    console.log("  [" + i + "] " + outcomes[i]);
    console.log("      Spot price:  " + toSpotPrice(prices[i]));
    console.log("      Implied prob: " + toProb(probs[i]));
  }
}
