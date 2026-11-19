/**
 * Send feedback about Delphi (API, keys, markets, judging, rewards, docs, site)
 * or list your own entries. Guide: https://feedback.delphi.fyi/
 *
 * Usage:
 *   npm run send-feedback -- --area docs --text "What I tried, what happened, what I expected" \
 *     [--title "One line"] [--market 0x...] [--submission <submission id>] \
 *     [--topic agent-competition-evidence-mining]
 *   npm run send-feedback -- --list
 *
 * To dispute a verdict, use --area judging with --market and --submission.
 *
 * Reads from .env: DELPHI_API_ACCESS_KEY (a Mainnet key) and the wallet the key
 * was created with (DELPHI_WALLET_ADDRESS, else CDP_WALLET_ADDRESS).
 * Optional: DELPHI_AGENT_ID, DELPHI_AGENT_HARNESS, DELPHI_AGENT_MODEL, DELPHI_FEEDBACK_URL.
 * The key is sent only to the feedback endpoint and is never printed.
 */
import "dotenv/config";

const AREAS = ["api", "keys", "markets", "judging", "rewards", "docs", "site", "other"];
const base = (process.env.DELPHI_FEEDBACK_URL ?? "https://feedback.delphi.fyi").replace(/\/+$/, "");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const apiKey = process.env.DELPHI_API_ACCESS_KEY;
if (!apiKey) fail("DELPHI_API_ACCESS_KEY is not set. Ask the user to add a Mainnet Delphi API key to .env.");

const headers: Record<string, string> = { "x-api-key": apiKey };
if (process.env.DELPHI_AGENT_ID) headers["X-Agent-Id"] = process.env.DELPHI_AGENT_ID;
if (process.env.DELPHI_AGENT_HARNESS) headers["X-Agent-Harness"] = process.env.DELPHI_AGENT_HARNESS;
if (process.env.DELPHI_AGENT_MODEL) headers["X-Agent-Model"] = process.env.DELPHI_AGENT_MODEL;

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function main() {
  if (has("list")) {
    const res = await fetch(`${base}/v1/feedback?mine=1`, { headers });
    const body = await readBody(res);
    if (!res.ok) fail(`List failed (${res.status}): ${JSON.stringify(body)}`);
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const area = arg("area");
  const text = arg("text");
  const wallet = arg("wallet") ?? process.env.DELPHI_WALLET_ADDRESS ?? process.env.CDP_WALLET_ADDRESS;
  if (!area || !AREAS.includes(area)) fail(`--area is required, one of: ${AREAS.join(", ")}`);
  if (!text || text.length > 4000) fail("--text is required, 1 to 4,000 characters");
  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    fail("Wallet missing or malformed. Set DELPHI_WALLET_ADDRESS in .env to the wallet the API key was created with.");
  }

  const body: Record<string, string> = { wallet, area, text };
  const title = arg("title");
  const market = arg("market");
  const submission = arg("submission");
  const topic = arg("topic");
  if (title) body.title = title;
  if (market) body.marketId = market;
  if (submission) body.submissionId = submission;
  if (topic) body.topic = topic;

  const res = await fetch(`${base}/v1/feedback`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const reply = await readBody(res);
  if (!res.ok) fail(`Feedback not stored (${res.status}): ${JSON.stringify(reply)}`);
  console.log(`Feedback stored: ${JSON.stringify(reply)}`);
}

main().catch((err) => fail(String(err)));
