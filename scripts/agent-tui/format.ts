/** Pure formatting + terminal-visual helpers (no React). */

export const usd = (n: number): string =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const signedUsd = (n: number): string => (n > 0 ? "+" : n < 0 ? "-" : "") + "$" +
  Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct01 = (n: number | undefined): string => (n === undefined ? "—" : (n * 100).toFixed(0) + "%");

export const signedPct = (n: number): string => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

export const num = (n: number, dp = 1): string => n.toLocaleString(undefined, { maximumFractionDigits: dp });

export const shortAddr = (a?: string): string => (!a ? "—" : a.slice(0, 6) + "…" + a.slice(-4));

/** Truncate to at most `n` chars with a trailing ellipsis. Used to keep a gap
 * inside fixed-width columns so adjacent cells never visually collide. */
export const ellipsize = (s: string, n: number): string => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export const ago = (ms: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
};

export const clockStr = (): string =>
  new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Block-eighth glyphs — index 0 (empty) .. 8 (full). Borrowed from the
// delphi-monitoring-tui render_bar trick; the prettiest cheap sparkline going.
const BLOCKS = " ▁▂▃▄▅▆▇█";

export function sparkline(values: number[], maxWidth = 64): string {
  if (!values.length) return "";
  // Downsample (bucket mean) to maxWidth so long series fit on one line and show
  // the full-history shape rather than the tail. Short series render as-is.
  let vals = values;
  if (maxWidth > 0 && values.length > maxWidth) {
    const step = values.length / maxWidth;
    vals = Array.from({ length: maxWidth }, (_, i) => {
      const start = Math.floor(i * step);
      const end = Math.max(Math.floor((i + 1) * step), start + 1);
      const slice = values.slice(start, end);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }
  const max = Math.max(...vals);
  const min = Math.min(...vals, 0);
  const range = max - min;
  if (range <= 0) return BLOCKS[1].repeat(vals.length);
  return vals.map((v) => BLOCKS[Math.max(1, Math.min(8, Math.round(((v - min) / range) * 8)))]).join("");
}

/** A proportional bar like "████████░░░░" for a 0..1 value. */
export function bar(value01: number, width = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round((value01 || 0) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export const STATUS_NAMES: Record<string, string> = {
  open: "Open",
  awaiting_settlement: "Pending",
  settled: "Settled",
  expired: "Expired",
};

export function statusColor(status?: string): string {
  switch (status) {
    case "open":
      return "green";
    case "awaiting_settlement":
      return "yellow";
    case "settled":
      return "cyan";
    case "expired":
      return "red";
    default:
      return "gray";
  }
}

/** Color a probability: high = green, mid = yellow, low = gray. */
export function probColor(p?: number): string {
  if (p === undefined) return "gray";
  if (p >= 0.66) return "green";
  if (p >= 0.4) return "yellow";
  return "cyan";
}

export const pnlColor = (n: number): string => (n > 0 ? "green" : n < 0 ? "red" : "gray");
