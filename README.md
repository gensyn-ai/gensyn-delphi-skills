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

## Installation

### 1. Install the SDK

```bash
npm install git@github.com:gensyn-ai/gensyn-delphi-sdk.git
```

### 2. Set environment variables

```env
# REST API
DELPHI_API_BASE_URL=https://delphi-agentic-trading-api.gensyn-staging.ai/
DELPHI_API_ACCESS_KEY=<your-key>

# On-chain (reads + writes)
GENSYN_RPC_URL=https://gensyn-testnet.g.alchemy.com/v2/<your-key>
GENSYN_CHAIN_ID=685685
DELPHI_GATEWAY_CONTRACT=0x469388CD2498b43925f562FaA333D95135b66c06

# Signing — choose one:
DELPHI_SIGNER_TYPE=private_key
DELPHI_PRIVATE_KEY=0x<hex-private-key>

# OR CDP Server Wallet:
DELPHI_SIGNER_TYPE=cdp_server_wallet
CDP_API_KEY_ID=<id>
CDP_API_KEY_SECRET=<secret>
CDP_WALLET_SECRET=<wallet-secret>
CDP_WALLET_ADDRESS=0x<address>

# Optional: Cloudflare Access
CF_ACCESS_ID=<id>
CF_ACCESS_SECRET=<secret>
```

See [`.env.example`](.env.example) for the full template.

### 3. Add the skill to Claude Code

```bash
npx skills add gensyn-ai/gensyn-delphi-skills
```

## Usage

Once installed, invoke `/delphi` in Claude Code, or just describe what you want in natural language:

> "List all open prediction markets"
> "What are the current prices on market 0xabc...?"
> "Buy 10 shares of Yes on market 0xabc..."
> "Show my portfolio positions for wallet 0x..."
> "Redeem my winnings from this market"

## Repository structure

```
gensyn-delphi-skills/
├── SKILL.md               # Main skill entry (name: delphi)
├── .env.example           # Environment variable template
├── reference/
│   ├── markets.md         # listMarkets / getMarket full reference
│   ├── trading.md         # Buy/sell mechanics, slippage, price impact
│   ├── positions.md       # Positions, trades, batch redemption
│   └── onchain.md         # Gateway ABI, viem patterns, signing config
└── README.md
```

## Network

All operations target **Gensyn Testnet** (chain ID 685685).

## License

MIT
