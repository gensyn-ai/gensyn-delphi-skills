# Evidence API

The API lets a caller sell information to Delphi: submit evidence, read the result and any reward, and see what the account has left. It has no call that lists markets (use the competition market list or the Delphi API, see [markets.md](markets.md)) and no balance call (rewards show on each result and in the Delphi app under My information).

The full reference (every input, output, limit and error) is the OpenAPI document at `GET https://delphi.fyi/v1/openapi.json`. If this file and that document differ, the document wins.

## Base URL and auth

| | |
|---|---|
| Base URL | `https://delphi.fyi/v1` |
| Auth | The entrant's existing Mainnet Delphi API key, sent as `Authorization: Bearer <key>`. `X-API-Key: <key>` also works. If you send both and they differ, the call fails with `invalid_request` |
| Version | `/v1` in the path, plus an `X-Contract-Version` header on responses. New fields can appear at any time, so ignore fields you do not know |
| Agent headers | `X-Agent-Id`, `X-Agent-Harness`, `X-Agent-Model`. Optional, 1 to 64 printable ASCII characters each. A missing one adds a line to the `X-Delphi-Warnings` response header. One that is not valid fails with `invalid_request` and names the header |
| Request id | Every response to a call that needs the key carries an `X-Request-Id` header, and an error body has `requestId`. Quote it in feedback. `GET /v1/openapi.json` needs no key and carries only `X-Contract-Version` |
| Terms | Accepted once per account, not per submission. Until the account accepts the current version, every submission fails with `403 terms_not_accepted`. A new terms version needs a new acceptance. See [Terms](competition.md#terms) |
| Call rate | Every response to a call that needs the key carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` (seconds until the bucket refills). Reads and submissions have separate buckets per minute, shared by every key and agent on the account. A call that is refused or fails validation still uses 1 call of its bucket |

Limits, results and rewards belong to the account, whichever key or agent made the call. A key can never read another account's submissions. Delphi keeps a record of each call (route, status, agent headers, a hash of the key) for 90 days.

## Calls

| What | Call | Notes |
|---|---|---|
| Submit evidence | `POST /v1/submissions` | Multipart. `202 Accepted` with `Location` (the result path, `/v1/submissions/{id}`) and `Retry-After` when queued. `200` with `status: rejected` and a `code` when the submission failed a check and was saved as rejected |
| Read a result | `GET /v1/submissions/{id}` | Per market the submission went to: status, verdict, reason, reward and its state, the most it can still earn at settlement. `Retry-After` while it is judged |
| List my submissions | `GET /v1/submissions?market=&agentId=&cursor=&limit=` | For one market or all, a page at a time (`nextCursor`). Includes unmatched submissions and ones rejected before they reached a market. Each item has what was sent (`note`, `links`, `files`) and which agent sent it (`agentId`); `agentId=` shows one agent's. **Read it for the market before you submit**, so your agents do not send the same fact twice |
| Can I submit on this market | `GET /v1/markets/{market}/entry-state` | `canSubmit`, `reason` when not, `remainingOnMarket`, `judgementPotRemainingBaseUnits` (what is left in the market's judgment reward pot, USDC.e base units; an empty pot pays 0 but does not block), and when the hour ends. See [Entry state](#entry-state) |
| What my account has left | `GET /v1/limits` | Submissions left this hour and when the hour ends (the UTC clock hour), daily reward cap left and when the oldest counted reward turns 24 hours old (`null` while no reward has counted) |
| Retry a failed judgment | `POST /v1/submissions/{id}/retry` | Failed judgments are retried automatically first. Use this only when the result says `status: failed` with `canRetry: true` |
| Read the terms | `GET /v1/terms` | `{ version, url }` of the current terms, and when this account accepted them (`acceptedAt`, `null` until then) |
| Accept the terms | `POST /v1/terms/acceptance` | JSON `{ "termsVersion": "<version>" }`. Only with the person's yes. A version that is not current fails with `invalid_request` (`field: termsVersion`). A second acceptance of the same version returns the first record |

There is no call to propose a new question. Feedback has its own endpoint, which is live: see [feedback.md](feedback.md).

The SDK wraps all eight calls: `EvidenceClient` in `@gensyn-ai/gensyn-delphi-sdk` 2.4.0 and later. See [SDK and starter agent](#sdk-and-starter-agent).

## Submit

Multipart fields:

| Field | Required | Notes |
|---|---|---|
| `marketAddress` | For the competition, yes | The market address (`0x` plus 40 hex characters) from the market list. Without a market, Delphi matches the submission to up to 3 markets, which may not be competition markets |
| `note` | One of note, links or files | Up to 8,000 characters |
| `links[]` | | Original sources. One URL per field, no spaces. Send the field once per link. The name has the brackets: a field named `links` is ignored without an error |
| `files` | | Up to 3, 10 MB in total, 20 pages per PDF. PNG, JPEG, WebP, PDF, TXT, DOC, DOCX, CSV. The type is detected from the file's content, not its name |

A submission holds at most 8 items: the note, each link and each file count as 1. The size limits apply to the whole bundle. A bundle is judged as one submission.

Send an `Idempotency-Key` header (1 to 128 printable ASCII characters) so a retry after a timeout cannot submit twice. The same key and the same body within 24 hours return the first answer (the same `id`, `createdAt` and `Location`, with a new request id) and store nothing new. The same key with a different body fails with `409 idempotency_conflict`. An error answer is not kept: after an error you can resend with the same key. The SDK sets one for you.

From the skill repository, `npm run evidence -- submit --market 0x… --note-file note.txt --link https://… --file table.csv` sends this call for you, with the key from `.env`. The same call with `curl`:

```bash
curl -X POST "https://delphi.fyi/v1/submissions" \
  -H "Authorization: Bearer $DELPHI_API_ACCESS_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "X-Agent-Id: my-agent" -H "X-Agent-Harness: claude-code" -H "X-Agent-Model: claude-opus-5-5" \
  --form-string "marketAddress=0x…" \
  --form-string "note=…" \
  --form-string "links[]=https://example.org/original-record" \
  -F "files=@table.csv;type=text/csv"
```

With `curl`, send text fields with `--form-string`, not `-F`. `-F` cuts a value at the first `;` and treats a leading `@` or `<` as a file.

The answer comes at once:

- **`202` queued**: the submission has an id and is queued for judging. `Location` is its result path. The body has `id`, `createdAt`, `status` and `markets`. `markets` is empty at first, also when you sent a `marketAddress`: the market line appears on a later read. To check what arrived, read the result: it shows the `note`, the `links` and the `files` of the submission.
- **`200` rejected with a `code`**: the submission failed a check. It is saved as rejected and **counts toward your 3 per market**.
- **An `error` object**: nothing was saved and nothing counts. See [Errors](#errors).

## Results

Wait the `Retry-After` seconds, then read the result again until it is judged, for at most about 30 minutes. When a submission is still `queued` or `judging` then, stop polling. Read it again later, and send feedback with its id if it stays that way.

| Field | Values |
|---|---|
| `status` | `queued`, `judging`, `judged`, `rejected`, `failed` (with `canRetry` and `retryAt`), `unmatched` |
| `judgingEstimateSeconds` | While it waits for the judge: about how long judging takes |
| `markets[].marketAddress` | The market the line is for |
| `markets[].status` | The state of the line for that market: `queued`, `judging`, then `accepted` or `not_accepted` |
| `markets[].verdict` | Accepted, duplicate, unverifiable, irrelevant, no information, manipulation |
| `markets[].reason` | A short explanation. On an accepted submission it is often a standard sentence. On a manipulation verdict only the verdict is shown |
| `markets[].bounty` | The judgment reward: `amount` in USDC.e base units (6 decimals, as a string) and `state`: `held` (the 24 hours before payment), `paid`, `voided` or `none`. An accepted submission whose reward is 0 shows `none`; `zeroPayReason` says why. API fields call a reward a "bounty" |
| `agentId`, `note`, `links`, `files` | What this submission sent and which agent sent it (`X-Agent-Id`). Your own content only |
| `markets[].zeroPayReason` | Why an accepted submission earned nothing: `daily_cap` (your daily reward cap), `pot_empty` (the market's judgment pot was empty), `below_minimum` (the evidence moved the forecast too little to pay; it still counts for the settlement reward) |
| `markets[].settlementUpTo` | The most the submission can still earn when the market settles, in USDC.e base units like `amount` |

A result never includes the forecaster's odds, how far or which way your evidence moved them, a quality score, or anyone else's submissions.

## Errors

A call that fails with an error saves nothing and does not count toward the per-market, hourly or daily limits, so retrying after an error does not cost a submission. It does use 1 call of the per-minute call rate.

Shape:

```json
{ "error": { "code": "rate_limited", "message": "…", "retryable": true, "retryAfterSeconds": 1200, "field": null, "limit": "hourly" }, "requestId": "…" }
```

| HTTP | Code | Meaning | What to do |
|---|---|---|---|
| 400 | `invalid_request` | A field or header is wrong (shape, size, a `termsVersion` that is not current, agent header, two different keys). `field` names it. On `marketAddress`, "This market does not take information." means a market that does not take evidence | Fix and resend. For `marketAddress`, read the market's entry-state |
| 401 | `unauthorized` | Any key problem. The message is the same in every case | Ask the person to check the key in `.env`. It must be a Mainnet key for the registered wallet |
| 403 | `terms_not_accepted` | The account has not accepted the current terms. The error has `terms: { version, url }`. Nothing was saved and nothing counts | Show the person the terms URL. Only with their yes, accept that version (`POST /v1/terms/acceptance`), then resend |
| 403 | `forbidden` | The request comes from a sanctioned region | Stop |
| 404 | `not_found` | No such submission, it belongs to another account, or the API is not open to the account yet | Check the id. The API opens to registered entrants: if every route answers `not_found`, check that the wallet is registered |
| 404 | `market_not_found` | The `marketAddress` is no market (a typo). `field: marketAddress` | Copy the address from the market list and resend |
| 409 | `idempotency_conflict` | The same `Idempotency-Key` with a different body | Use a new key for a new submission |
| 429 | `rate_limited` | A limit. `limit` names it: `call_rate`, `hourly`, `bytes_24h` (file bytes in 24 hours), `failed_keys` (from your address) or `retry_backoff`. `retryAfterSeconds` says when it resets | Wait until then. Never loop |
| 429 | `cap_reached` | Your account used all its submissions on this market. `retryable: false`. This never resets | Stop sending to this market. Pick another one |
| 500, 503 | `server_error` | A fault on Delphi's side, `retryable: true` | Retry after a short wait, then send feedback with the request id |

A submission that passes these checks but fails the content checks (screening, duplicate content) is saved as rejected: `200` with `status: rejected` and a `code`, and it counts toward the per-market limit. Repeated rejections and manipulation verdicts can block the account. See [evidence.md](evidence.md).

## Entry state

`GET /v1/markets/{market}/entry-state` returns `{ canSubmit, reason?, remainingOnMarket, judgementPotRemainingBaseUnits, rateLimit: { resetAt } }`. Read it before you research a market, not only before you submit.

| `reason` | Meaning |
|---|---|
| `terms_not_accepted` | The account has not accepted the current terms. See [Terms](competition.md#terms) |
| `not_open` | The market does not take evidence. A market can be open for trading and still answer this |
| `closed` | The evidence cutoff of the market has passed |
| `cap_reached` | The account has used all its submissions on this market. `remainingOnMarket` is `0` |
| `blocked` | The account is blocked |
| `rate_limited` | The account has no submission left this hour. `rateLimit.resetAt` says when the hour ends |

The reasons of the terms and of the market come first, then `rate_limited`. `rateLimit.resetAt` is the end of the current UTC hour, the same value as `hourEndsAt` in `GET /v1/limits`.

## SDK and starter agent

- **Script.** `npm run evidence` in the skill repository (`scripts/evidence.ts`) wraps the SDK for all eight calls. It reads the key from `.env`, and keeps a shared log (`evidence-log.jsonl`) for agents that work on one account. See [The 8 routes](competition.md#the-8-routes).
- **SDK.** `@gensyn-ai/gensyn-delphi-sdk` 2.4.0 and later has `EvidenceClient`: `submitEvidence` (multipart, sets `Idempotency-Key`), `getSubmission`, `listSubmissions`, `getEntryState`, `retrySubmission`, `getLimits`, `getTerms`, `acceptTerms(version)`, and `waitForSubmission` (polls with `Retry-After`). Every call returns `{ data, meta }`, where `meta` has the request id, the call-rate headers and the warnings. Failures throw `EvidenceApiError` with `code`, `retryable`, `retryAfterSeconds`, `field` and `limit`. A `403 terms_not_accepted` throws `TermsNotAcceptedError` with `terms`.

  ```ts
  import { EvidenceClient } from "@gensyn-ai/gensyn-delphi-sdk";

  const evidence = new EvidenceClient({ baseUrl: "https://delphi.fyi/v1", apiKey: process.env.DELPHI_API_ACCESS_KEY!, agentId: "my-agent" });
  const { data } = await evidence.submitEvidence({ note: "…", links: ["https://…"], marketAddress: "0x…" });
  const { data: result } = await evidence.waitForSubmission(data.id);
  ```

- **Starter agent.** [`examples/evidence-starter/`](https://github.com/gensyn-ai/gensyn-delphi-sdk/tree/main/examples/evidence-starter) in the SDK repository reads the competition market list, picks markets between 20% and 80%, submits one dated fact with a source and polls the result. Use it as a base, not as a strategy.
