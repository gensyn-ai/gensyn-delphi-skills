# Gensyn Delphi Skills

This repository contains a Claude Code skill for the Gensyn Delphi prediction market platform.

## Skill

The skill is defined in `SKILL.md` (name: `delphi`). It provides a `/delphi` command and teaches Claude how to use the `@gensyn-ai/gensyn-delphi-sdk` npm package.

## Reference docs

Load these on demand for deeper context:

- `reference/markets.md` — REST API params, Market type schema, metadata shape
- `reference/trading.md` — Buy/sell mechanics, slippage formulas, price impact
- `reference/positions.md` — Position/Trade types, batch redemption, portfolio estimation
- `reference/onchain.md` — Gateway ABI functions, viem read patterns, signing config
