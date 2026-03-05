# Gensyn Delphi Skills - Agent Context

This repository contains a Claude Code skill for the Gensyn Delphi prediction market platform.

## Setup

Before running any scripts or using the skill, ensure:

1. **Install dependencies** (includes `@gensyn-ai/gensyn-delphi-sdk`):
   ```bash
   npm install
   ```

2. **Set required environment variables** — copy `.env.example` to `.env` and fill in:
   - `DELPHI_API_ACCESS_KEY` — API key (required for all REST calls)
   - One signing option:
     - Private key: `DELPHI_SIGNER_TYPE=private_key` + `WALLET_PRIVATE_KEY=0x...`
     - CDP Server Wallet (default): `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`, `CDP_WALLET_ADDRESS`
   - Network defaults are applied automatically (`DELPHI_NETWORK=testnet` by default)

## Project Structure

- `SKILL.md` - Defines the `delphi` skill (provides `/delphi` command)
- `package.json` - SDK dependency and npm script aliases for all scripts
- `scripts/` - Executable TypeScript scripts, one per operation:
  - `client.ts` - Shared `DelphiClient` instance and helper utilities
  - `list-markets.ts` - List/filter markets by status, category, keyword
  - `get-market.ts` - Get market details with live on-chain prices
  - `quote-buy.ts` - Quote USDC cost to buy shares (read-only)
  - `quote-sell.ts` - Quote USDC payout for selling shares (read-only)
  - `buy-shares.ts` - Buy outcome shares on-chain (with auto-approval)
  - `sell-shares.ts` - Sell outcome shares on-chain
  - `list-positions.ts` - View portfolio positions for a wallet
  - `redeem.ts` - Redeem winnings from settled markets
  - `token-approval.ts` - Check or set USDC token approval
- `reference/` - Reference documentation for deeper context:
  - `markets.md` - REST API params, Market type schema, metadata shape
  - `trading.md` - Buy/sell mechanics, slippage formulas, price impact
  - `positions.md` - Position/Trade types, batch redemption, portfolio estimation
  - `onchain.md` - Gateway ABI functions, viem read patterns, signing config

## Key Technologies

- Uses `@gensyn-ai/gensyn-delphi-sdk` npm package
- Prediction market platform on Gensyn Testnet (chain ID 685685)
- REST API and on-chain interactions via `DelphiClient`

## Working with This Project

When working on this codebase:
- Run `npm install` first if dependencies are not yet installed
- Verify required env vars are set before running scripts
- Load reference docs from `reference/` when you need detailed API or type information
- The skill is defined in `SKILL.md` and provides the `/delphi` command
- All scripts accept CLI arguments — run `npx tsx scripts/<name>.ts` with no args to see usage
