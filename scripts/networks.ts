/** Gensyn Mainnet RPC. Served by Conduit; keyless, 25 requests per second per client IP. */
export const MAINNET_RPC_URL = "https://rpc-gensyn-mainnet.t.conduit.xyz";

/**
 * The RPC URL to hand to `DelphiClient` for a network, or `undefined` to let
 * the SDK use its own default.
 *
 * SDK releases up to 2.1.0 default mainnet to Alchemy's public endpoint, which
 * stops on 2026-11-23 when Gensyn Mainnet moves to Conduit. Until the pinned SDK
 * ships the Conduit default, mainnet is pinned here. `GENSYN_RPC_URL` still wins:
 * the SDK reads it when no `rpcUrl` is passed, so it is returned explicitly.
 */
export function rpcUrlFor(network: string | undefined): string | undefined {
  if (process.env.GENSYN_RPC_URL) return process.env.GENSYN_RPC_URL;
  return network === "mainnet" ? MAINNET_RPC_URL : undefined;
}
