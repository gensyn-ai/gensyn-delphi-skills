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

// The competition trades its own token (TST), not USDC. Both are 6-decimal, so
// only the label differs — but printing "USDC" for competition balances is
// actively misleading, so the symbol follows the network.
export const isCompetition = (process.env.DELPHI_NETWORK ?? "").startsWith("competition");
export const collateralSymbol = isCompetition ? "TST" : "USDC";

/** Competition UUID to scope market reads to (competition networks only).
 *  Unset = the API's active competition. Only `listMarkets`/`getMarket` take it.
 *  Gated on the network so a leftover value in `.env` is not forwarded to the
 *  Delphi API as a query param on a plain testnet/mainnet call. */
export const competitionId = isCompetition ? process.env.DELPHI_COMPETITION_ID || undefined : undefined;

/** Spread into `listMarkets`/`getMarket` params — `{ ...competitionScope }` —
 *  rather than passing `competitionId` directly. Excess-property checking does
 *  not apply to spread properties, so this typechecks against the pinned SDK
 *  2.0.0 (whose param types predate `competitionId`) while still forwarding the
 *  value at runtime on the versions that support it. Drop the indirection once
 *  package.json pins an SDK that declares the param. */
export const competitionScope = (competitionId ? { competitionId } : {}) as { competitionId?: string };

// Unit helpers
export const toUsdc = (n: bigint) => (Number(n) / 1e6).toFixed(6) + " " + collateralSymbol;
export const toShares = (n: bigint) => (Number(n) / 1e18).toFixed(4) + " shares";
export const toProb = (n: bigint) => (Number(n) / 1e18 * 100).toFixed(2) + "%";
export const toSpotPrice = (n: bigint) => (Number(n) / 1e6).toFixed(4) + " " + collateralSymbol + "/share";

export const usdcToBigint = (n: number) => BigInt(Math.round(n * 1e6));
export const sharesToBigint = (n: number) => BigInt(Math.round(n * 1e18));
