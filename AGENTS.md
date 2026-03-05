# Gensyn Delphi Skills - Agent Context

This repository contains a Claude Code skill for the Gensyn Delphi prediction market platform.

## Project Structure

- `SKILL.md` - Defines the `delphi` skill (provides `/delphi` command)
- `reference/` - Reference documentation for deeper context:
  - `markets.md` - REST API params, Market type schema, metadata shape
  - `trading.md` - Buy/sell mechanics, slippage formulas, price impact
  - `positions.md` - Position/Trade types, batch redemption, portfolio estimation
  - `onchain.md` - Gateway ABI functions, viem read patterns, signing config

## Key Technologies

- Uses `@gensyn-ai/gensyn-delphi-sdk` npm package
- Prediction market platform integration
- REST API and on-chain interactions

## Working with This Project

When working on this codebase:
- Load reference docs from `reference/` directory when you need detailed API or type information
- The skill is defined in `SKILL.md` and provides the `/delphi` command
- Check `package.json` for dependencies and scripts
