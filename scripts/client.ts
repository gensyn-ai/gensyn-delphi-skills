import "dotenv/config";
import { DelphiClient } from "@gensyn-ai/gensyn-delphi-sdk";

export const client = new DelphiClient({
  extraHeaders: {
    "CF-Access-Client-Id": process.env.CF_ACCESS_ID ?? "",
    "CF-Access-Client-Secret": process.env.CF_ACCESS_SECRET ?? "",
  },
});

export async function getWalletAddress(): Promise<`0x${string}`> {
  const { address } = await client.getSigner();
  return address;
}
// No `gatewayAddress` export: there are two gateways (automated settlement and
// legacy) and each rejects the other's markets, so the correct one depends on the
// market. Use `client.resolveGateway(marketAddress)` when you need it.
export const rpcUrl = process.env.GENSYN_RPC_URL ?? "https://gensyn-testnet.g.alchemy.com/public";
export const chainId = Number(process.env.GENSYN_CHAIN_ID ?? 685685);

// Unit helpers
export const toUsdc = (n: bigint) => (Number(n) / 1e6).toFixed(6) + " USDC";
export const toShares = (n: bigint) => (Number(n) / 1e18).toFixed(4) + " shares";
export const toProb = (n: bigint) => (Number(n) / 1e18 * 100).toFixed(2) + "%";
export const toSpotPrice = (n: bigint) => (Number(n) / 1e6).toFixed(4) + " USDC/share";

export const usdcToBigint = (n: number) => BigInt(Math.round(n * 1e6));
export const sharesToBigint = (n: number) => BigInt(Math.round(n * 1e18));
