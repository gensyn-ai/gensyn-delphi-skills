/**
 * Delphi Agent TUI — a beautiful, read-only Ink dashboard for supervising an
 * agent's Delphi activity. Multi-screen: Overview (with Edge View + Agent Logs) ·
 * Portfolio · My Activity · Markets, with market drill-down. No signing — observe only.
 *
 * Usage:
 *   npx tsx scripts/agent-tui/index.tsx <wallet-address> <testnet|mainnet>
 *   npx tsx scripts/agent-tui/index.tsx 0x… mainnet --once   # one frame, then exit
 *
 * Args (any order): a 0x wallet address and the network testnet|mainnet are BOTH
 *   REQUIRED — the network alone selects the RPC/API endpoints (no env fallback),
 *   and there is no .env signer fallback for the wallet. Reads DELPHI_API_ACCESS_KEY
 *   from .env.
 * Keys: 1-4 switch screen · ↑↓ select · ⏎ detail · esc back · r refresh · q quit
 */
import { render } from "ink";
import React from "react";
import { isAddress } from "viem";
import { App } from "./app.js";

const argv = process.argv.slice(2);
const once = argv.includes("--once") || !process.stdout.isTTY;
const initialScreen = argv.find((a) => a.startsWith("--screen="))?.split("=")[1] ?? "overview";

// Both arguments are required and chosen explicitly: the 0x wallet to observe
// (no .env signer fallback) and the network, which alone selects the RPC/API
// endpoints (no DELPHI_NETWORK/GENSYN_RPC_URL env fallback).
const wallet = argv.find((a) => isAddress(a));
const network = argv.find((a) => a === "testnet" || a === "mainnet");
if (!wallet || !network) {
  console.error(
    "Usage: npx tsx scripts/agent-tui/index.tsx <wallet-address> <testnet|mainnet>\n" +
      "  Both a 0x wallet address and the network are required.",
  );
  process.exit(1);
}

// Full-screen mode: take over the alternate screen buffer (like htop / vim) so
// the dashboard launches on a clean screen and the user's scrollback is restored
// on quit. Skipped for --once / non-TTY so piped output stays plain.
const fullscreen = !once && Boolean(process.stdout.isTTY);
const enterAlt = () => process.stdout.write("\x1b[?1049h\x1b[2J\x1b[H");
const leaveAlt = () => process.stdout.write("\x1b[?1049l");
if (fullscreen) {
  enterAlt();
  process.on("exit", leaveAlt);
  process.on("SIGINT", () => process.exit(0));
}

const { waitUntilExit } = render(
  <App wallet={wallet} network={network} once={once} initialScreen={initialScreen} />,
  { exitOnCtrlC: !once },
);
if (fullscreen) waitUntilExit().then(leaveAlt, leaveAlt);
