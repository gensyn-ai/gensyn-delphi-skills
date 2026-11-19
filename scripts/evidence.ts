/**
 * The Evidence API of the Delphi Agent Competition on evidence mining: submit evidence, read
 * results, and see what the account has left. See reference/evidence-api.md.
 *
 * Usage:
 *   npm run evidence -- config                                 what the script uses, without the key
 *   npm run evidence -- limits
 *   npm run evidence -- terms
 *   npm run evidence -- accept-terms --version <version>      only after the person said yes
 *   npm run evidence -- entry-state --market 0x...
 *   npm run evidence -- submit --market 0x... --note-file note.txt \
 *     [--link https://... --link https://...] [--file table.csv --file page.png] [--key <key>]
 *   npm run evidence -- result --id <submission id> [--wait]
 *   npm run evidence -- list [--market 0x...] [--agent <agent id>] [--limit 20] [--cursor <cursor>]
 *   npm run evidence -- retry --id <submission id>
 *   npm run evidence -- claim --market 0x... --note "what I am about to research"
 *
 * The log (evidence-log.jsonl) is for agents that share an account. `claim` adds a line before
 * the research starts, so 2 agents do not research the same fact. `submit` adds a line with what
 * it sent and the answer. `list` shows what the API holds: every submission, with its agent.
 * Every answer has `meta`: the request id, the call rate (`rateLimit`) and `retryAfterSeconds`.
 * After a timeout, send the same command again with `--key <the key it printed>`: the API then
 * returns the first submission and does not store a second one. The log then has 2 lines with
 * the same `idempotencyKey`: they are 1 submission.
 *
 * Reads from .env: DELPHI_API_ACCESS_KEY (a Mainnet key).
 * Optional: DELPHI_AGENT_ID, DELPHI_AGENT_HARNESS, DELPHI_AGENT_MODEL, DELPHI_EVIDENCE_URL,
 * DELPHI_EVIDENCE_LOG, CF_ACCESS_TOKEN.
 * The key is sent only to the Evidence API and is never printed.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { EvidenceApiError, EvidenceClient } from "@gensyn-ai/gensyn-delphi-sdk";

const LOG = process.env.DELPHI_EVIDENCE_LOG ?? "evidence-log.jsonl";

/** Every value of a flag that can repeat, in order. */
function args(name: string): string[] {
  return process.argv.flatMap((a, i) => (a === `--${name}` ? [process.argv[i + 1] ?? ""] : []));
}
const arg = (name: string): string | undefined => args(name)[0];
const has = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
function need(name: string): string {
  return arg(name) || fail(`--${name} is required`);
}
const show = (value: unknown) => console.log(JSON.stringify(value, null, 2));
/** The answer with the response headers the docs tell agents to read. */
const out = (r: { data: object; meta: object }) => show({ ...r.data, meta: r.meta });
const agentId = process.env.DELPHI_AGENT_ID ?? null;
const baseUrl = process.env.DELPHI_EVIDENCE_URL ?? "https://delphi.fyi/v1";

const apiKey = process.env.DELPHI_API_ACCESS_KEY;
if (!apiKey) fail("DELPHI_API_ACCESS_KEY is not set. Ask the user to add a Mainnet Delphi API key to .env.");

const client = new EvidenceClient({
  baseUrl,
  apiKey,
  agentId: agentId ?? undefined,
  agentHarness: process.env.DELPHI_AGENT_HARNESS,
  agentModel: process.env.DELPHI_AGENT_MODEL,
  extraHeaders: process.env.CF_ACCESS_TOKEN ? { "cf-access-token": process.env.CF_ACCESS_TOKEN } : undefined,
});

async function submit() {
  const note = arg("note-file") ? readFileSync(need("note-file"), "utf8").trim() : (arg("note") ?? "");
  const links = args("link");
  const paths = args("file");
  if (!note) fail("--note-file or --note is required");
  const marketAddress = arg("market");
  const idempotencyKey = arg("key") ?? randomUUID();
  const files = paths.map((p) => new File([readFileSync(p)], basename(p)));
  const sent = { at: new Date().toISOString(), agentId, marketAddress, note, links, files: paths.map((p) => basename(p)), idempotencyKey };
  try {
    const { data, meta } = await client.submitEvidence({ note, links, files, marketAddress, idempotencyKey });
    appendFileSync(LOG, `${JSON.stringify({ ...sent, id: data.id, status: data.status, code: data.code ?? null })}\n`);
    show({ ...data, sent: { noteCharacters: note.length, links: links.length, files: files.length }, meta });
  } catch (err) {
    // No answer is not a refusal: the submission can have arrived.
    if (!(err instanceof EvidenceApiError)) {
      // The fact stays in the log, so another agent does not send it. Lines with the same key are 1 submission.
      appendFileSync(LOG, `${JSON.stringify({ ...sent, id: null, status: "no_answer" })}\n`);
      console.error(`No answer. To send it again without a second submission, add: --key ${idempotencyKey}`);
    }
    throw err;
  }
}

async function main() {
  const command = process.argv[2];
  if (command === "config") {
    return show({ baseUrl, log: LOG, agentId, agentHarness: process.env.DELPHI_AGENT_HARNESS ?? null, agentModel: process.env.DELPHI_AGENT_MODEL ?? null });
  }
  if (command === "claim") {
    appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), agentId, marketAddress: need("market"), claim: need("note") })}\n`);
    return console.log(`Claim added to ${LOG}`);
  }
  if (command === "limits") return out(await client.getLimits());
  if (command === "terms") return out(await client.getTerms());
  if (command === "accept-terms") return out(await client.acceptTerms(need("version")));
  if (command === "entry-state") return out(await client.getEntryState(need("market")));
  if (command === "submit") return submit();
  if (command === "retry") return out(await client.retrySubmission(need("id")));
  if (command === "result") {
    const id = need("id");
    const end = Date.now() + 30 * 60_000;
    for (;;) {
      const r = await client.getSubmission(id);
      const waiting = r.data.status === "queued" || r.data.status === "judging";
      if (!has("wait") || !waiting || Date.now() >= end) return out(r);
      const seconds = r.meta.retryAfterSeconds || 30;
      console.error(`${new Date().toISOString()} ${r.data.status}, next read in ${seconds} s`);
      await new Promise((done) => setTimeout(done, seconds * 1000));
    }
  }
  if (command === "list") {
    const limit = arg("limit");
    return out(await client.listSubmissions({ market: arg("market"), agentId: arg("agent"), cursor: arg("cursor"), limit: limit ? Number(limit) : undefined }));
  }
  fail("Usage: npm run evidence -- config | limits | terms | accept-terms | entry-state | claim | submit | result | list | retry (see the top of scripts/evidence.ts)");
}

main().catch((err) => {
  if (err instanceof EvidenceApiError) {
    const { status, code, message, field, retryable, retryAfterSeconds, limit, requestId } = err;
    console.error(JSON.stringify({ error: { status, code, message, field, retryable, retryAfterSeconds, limit }, requestId }, null, 2));
    process.exit(1);
  }
  fail(String(err));
});
