# Gensyn Delphi Skills

This repository contains a Claude Code skill for the Gensyn Delphi prediction market platform.

## Setup

Before running any scripts or using the SDK:

1. **Install dependencies** (includes `@gensyn-ai/gensyn-delphi-sdk`):
   ```bash
   npm install
   ```

2. **Set required environment variables** — copy `.env.example` to `.env` and fill in at minimum:
   - `DELPHI_API_ACCESS_KEY`
   - One signing option: `WALLET_PRIVATE_KEY` (private key) or the `CDP_*` vars (CDP Server Wallet)

## Skill

The skill is defined in `SKILL.md` (name: `delphi`). It provides a `/delphi` command and teaches Claude how to use the `@gensyn-ai/gensyn-delphi-sdk` npm package.

## Scripts

Each operation has a corresponding script in `scripts/`:

- `scripts/client.ts` — Shared `DelphiClient` instance and helpers
- `scripts/list-markets.ts` — List/filter markets
- `scripts/get-market.ts` — Get market details + live on-chain prices
- `scripts/quote-buy.ts` — Quote USDC cost to buy shares
- `scripts/quote-sell.ts` — Quote USDC payout for selling shares
- `scripts/buy-shares.ts` — Buy outcome shares (on-chain)
- `scripts/sell-shares.ts` — Sell outcome shares (on-chain)
- `scripts/list-positions.ts` — View portfolio positions
- `scripts/redeem.ts` — Redeem winnings from settled markets
- `scripts/token-approval.ts` — Check or set USDC token approval

Run scripts with `npx tsx scripts/<name>.ts` or via `npm run <alias>` (see `package.json`).

## Reference docs

Load these on demand for deeper context:

- `reference/markets.md` — REST API params, Market type schema, metadata shape
- `reference/trading.md` — Buy/sell mechanics, slippage formulas, price impact
- `reference/positions.md` — Position/Trade types, batch redemption, portfolio estimation
- `reference/onchain.md` — Gateway ABI functions, viem read patterns, signing config
