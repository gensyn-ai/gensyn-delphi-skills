/**
 * Case-insensitive market address matching. The API returns lowercase addresses, while
 * wallets and explorers show checksummed ones (EIP-55); both spellings name the same market.
 */
export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Distinct outcome indices held in `marketAddress`, whatever the casing of either side. */
export function outcomeIndicesFor(
  positions: { marketProxy: string; outcomeIdx: number | string }[],
  marketAddress: string,
): number[] {
  return Array.from(
    new Set(positions.filter((p) => sameAddress(p.marketProxy, marketAddress)).map((p) => Number(p.outcomeIdx))),
  );
}
