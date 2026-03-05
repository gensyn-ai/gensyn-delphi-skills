# Gensyn Delphi Skills

Claude Code skills for the [Gensyn Delphi](https://github.com/gensyn-ai/gensyn-delphi-sdk) prediction market platform.

Modelled after [Polymarket/agent-skills](https://github.com/Polymarket/agent-skills) and [Uniswap/uniswap-ai](https://github.com/Uniswap/uniswap-ai).

## What you can do

- **Browse markets** — list and filter by status, category, keyword
- **Market details** — REST metadata + live on-chain prices and pool state
- **Live prices** — spot prices and implied probabilities from the Gateway contract
- **Quote trades** — read-only buy/sell price quotes before committing
- **Buy shares** — on-chain buy with automatic approval and slippage protection
- **Sell shares** — on-chain sell with configurable slippage tolerance
- **Portfolio** — view positions across all markets, with estimated liquidation value
- **Trade history** — browse trades by wallet or market
- **Redeem** — claim winnings from settled markets, single or batch
- **Approvals** — check and set ERC-20 token allowances

## Setup

### 1. Install dependencies

```bash
npm install
```

This installs `@gensyn-ai/gensyn-delphi-sdk` and all other dependencies.

### 2. Set environment variables

Copy the template and fill in your credentials:

```bash
cp .env.example .env
```

**Required:**

```env
DELPHI_API_ACCESS_KEY=<your-key>
```

**Plus one signing option:**

```env
# Option A — Private key (simpler)
DELPHI_SIGNER_TYPE=private_key
WALLET_PRIVATE_KEY=0x<hex-private-key>

# Option B — CDP Server Wallet (default)
CDP_API_KEY_ID=<id>
CDP_API_KEY_SECRET=<secret>
CDP_WALLET_SECRET=<wallet-secret>
CDP_WALLET_ADDRESS=0x<address>
```

Network defaults (RPC URL, chain ID, gateway contract, API URL) are set automatically when `DELPHI_NETWORK=testnet` (the default). See [`.env.example`](.env.example) for optional overrides.

### 3. Add the skill to Claude Code

```bash
npx skills add gensyn-ai/gensyn-delphi-skills
```

## Usage

### Claude Code skill

Once the skill is installed, invoke `/delphi` in Claude Code, or describe what you want in natural language:

> "List all open prediction markets"
> "What are the current prices on market 0xabc...?"
> "Buy 10 shares of Yes on market 0xabc..."
> "Show my portfolio positions for wallet 0x..."
> "Redeem my winnings from this market"

### Scripts

Each operation has a corresponding script in `scripts/`. Run them directly with `npx tsx` or via the `npm run` aliases:

| Script | npm alias | Description |
|--------|-----------|-------------|
| `scripts/list-markets.ts` | `npm run list-markets` | List markets by status/category |
| `scripts/get-market.ts` | `npm run get-market` | Get market details + live prices |
| `scripts/quote-buy.ts` | `npm run quote-buy` | Quote USDC cost to buy shares |
| `scripts/quote-sell.ts` | `npm run quote-sell` | Quote USDC payout for selling shares |
| `scripts/buy-shares.ts` | `npm run buy-shares` | Buy outcome shares (on-chain) |
| `scripts/sell-shares.ts` | `npm run sell-shares` | Sell outcome shares (on-chain) |
| `scripts/list-positions.ts` | `npm run list-positions` | View portfolio positions |
| `scripts/redeem.ts` | `npm run redeem` | Redeem winnings from settled markets |
| `scripts/token-approval.ts` | `npm run token-approval` | Check or set USDC token approval |

**Examples:**

```bash
# List open markets
npx tsx scripts/list-markets.ts
npx tsx scripts/list-markets.ts open crypto 20

# Get a market with live prices
npx tsx scripts/get-market.ts 0x94d829cce7e8532aef2a829489c1c1296c111990

# Quote a buy (no gas)
npx tsx scripts/quote-buy.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10

# Buy 10 shares of outcome 0 with 2% slippage
npx tsx scripts/buy-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 10

# Sell 5 shares
npx tsx scripts/sell-shares.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 0 5

# View positions (defaults to CDP_WALLET_ADDRESS)
npx tsx scripts/list-positions.ts

# Redeem winnings
npx tsx scripts/redeem.ts 0x94d829cce7e8532aef2a829489c1c1296c111990

# Check token approval
npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990
npx tsx scripts/token-approval.ts 0x94d829cce7e8532aef2a829489c1c1296c111990 unlimited
```

## Repository structure

```
gensyn-delphi-skills/
├── SKILL.md               # Main skill entry (name: delphi)
├── .env.example           # Environment variable template
├── package.json           # Dependencies and npm script aliases
├── tsconfig.json          # TypeScript config
├── scripts/
│   ├── client.ts          # Shared DelphiClient + helper utilities
│   ├── list-markets.ts    # List/filter markets
│   ├── get-market.ts      # Get market details + live on-chain prices
│   ├── quote-buy.ts       # Quote USDC cost to buy shares
│   ├── quote-sell.ts      # Quote USDC payout for selling shares
│   ├── buy-shares.ts      # Buy outcome shares (on-chain)
│   ├── sell-shares.ts     # Sell outcome shares (on-chain)
│   ├── list-positions.ts  # View portfolio positions
│   ├── redeem.ts          # Redeem winnings from settled markets
│   └── token-approval.ts  # Check or set USDC token approval
└── reference/
    ├── markets.md         # listMarkets / getMarket full reference
    ├── trading.md         # Buy/sell mechanics, slippage, price impact
    ├── positions.md       # Positions, trades, batch redemption
    └── onchain.md         # Gateway ABI, viem patterns, signing config
```

## Network

All operations target **Gensyn Testnet** (chain ID 685685) by default.

## License

MIT
