# Butler SDK conformance suite

Every Butler SDK, official or community, runs these fixtures. Passing them is the bar for being listed in
`community/REGISTRY.json`. The fixtures are language-neutral JSON; each SDK ships a small runner that drives
its public API from the fixture and checks what it sent.

## Why fixtures and not prose

Analytics works without any SDK: a game can POST the documented JSON itself. An SDK may only add behaviour
on top of that wire (queueing, retries, consent, sampling). The wire fixtures pin the exact requests an SDK
must produce, so "using the SDK" and "using curl" stay byte-for-byte the same request apart from generated ids
and timestamps.

## Layout

| Folder | What it checks |
|---|---|
| `fixtures/wire/` | A scripted sequence of SDK calls produces exactly these HTTP requests. |
| `fixtures/transport/` | Scripted server responses (429, 404, 5xx, 401, partial batch) lead to the right retries, fallbacks and queue state. |
| `fixtures/oauth/` | Sign-in builds a correct S256 authorize URL, completes a token exchange, and rejects a wrong `state` or a missing or wrong `iss`. |

## Fixture format

```jsonc
{
  "name": "batch-basic",
  "description": "...",
  "config": { /* SDK init config, see below */ },
  "steps": [
    { "call": "track", "name": "level_complete", "props": { "level": 3 } },
    { "advance_ms": 10000 },              // move the virtual clock
    { "call": "flush" },
    { "respond": { "status": 200, "body": { ... } } }  // answer the next request the SDK makes
  ],
  "expect": {
    "requests": [ { "method": "POST", "path": "/game/events/batch", "query": {...}, "headers": {...}, "body": {...} } ],
    "queue_length": 0,
    "state": { "sending": true }
  }
}
```

Rules for runners:

- **Virtual time.** The runner owns the clock and the random source. `advance_ms` moves the clock and runs any
  timers that fall due. Backoff jitter must come from the injected random source so fixtures are deterministic;
  `random` in `config` gives the sequence to return (values in [0, 1)).
- **Transport.** The runner replaces the HTTP layer. Before the first step it collects every `respond` step, in
  order, into a response queue; reaching a `respond` step later does nothing. Each request the SDK makes is
  recorded and answered with the next queued response. If the queue is empty the runner answers `200` with an
  accepted body shaped for that route (single event, batch or config defaults).
- **Settling.** After every step the runner lets the SDK finish all work that does not need the clock to move
  (pending promises, coroutines, callbacks), so a response is fully handled before the next step starts.
- **Placeholders** in expected bodies:
  - `"<uuidv7>"` matches an RFC 9562 version-7 UUID string.
  - `"<iso8601>"` matches an RFC 3339 timestamp with offset or `Z`.
  - `"<same:session>"` must equal every other `<same:session>` in this fixture.
  - `"<same:install>"` likewise for the install id.
  - `"<any>"` matches any present value. Keys not listed in an expected `headers` object are ignored; keys in an
    expected `body` must match exactly (no extra keys).
- **Context keys.** SDKs stamp `$sdk`, `$sdk_version`, `$platform` and, when configured, `$build` into `metadata`.
  Fixtures expect `"$sdk": "<any>"`, `"$sdk_version": "<any>"`, `"$platform": "<any>"`.
- **Config keys** (same meaning in every SDK): `doormanUrl`, `ingestToken`, `proxyKey`, `consent`
  (`"required"` or `"granted"`), `build`, `flushIntervalMs` (default 15000), `flushAt` (default 50),
  `maxQueue` (default 2000), `maxRetries` (default 8), `installId` (fixed value for fixtures).

Other fixture keys:

| Key | Meaning |
|---|---|
| `steps[].assert` | Check mid-fixture: `requests` = number recorded so far, `queue_length`. |
| `steps[].respond.network_error` | Fail the request at the transport (no HTTP status). |
| `steps[].respond.headers` | Response headers, lower-case names. |
| `steps[].capture` | Remember a value from the call (`authorizeUrl`); `<captured:state>` in a later URL is the `state` parameter it carried. |
| `expect.same_event_id` | List of `[requestIndex, bodyPath, requestIndex, bodyPath]`: the `event_id` at both places must be equal. Path `""` is the body root; `events.1` is the second batch item. |
| `expect.persisted_length` | Events left in the SDK's persisted storage. |
| `expect.state.sending` | `false` once the SDK has stopped sending for the session. |
| `expect.throws` / `logs_above_debug` | The call sequence threw nothing / logged nothing above debug. |
| `expect.error`, `expect.player` | Error code surfaced by sign-in (`state_mismatch`, `issuer_mismatch`), and the signed-in player (`null` = none). |
| `config.issuer` | Expected OAuth issuer (`iss`) for sign-in fixtures. |
| `config.oauth.testVerifier` | Use this PKCE `code_verifier` instead of a random one, so the challenge can be checked. |
| `config.oauth.integrationId` | The integration id the SDK uses for `GET /v2/games/{integrationId}/me` after sign-in. |
| `steps[].respond` with `token` or `me` bodies | Answers the token exchange and the player lookup in sign-in fixtures. |

## Which fixtures a package must pass

| Profile | Fixtures | Required for |
|---|---|---|
| Analytics | `wire/`, `transport/` | Every SDK |
| Sign-in | `oauth/` | SDKs that offer player sign-in |

A package's README says which profiles it implements. A community port can be listed with the analytics profile
alone.

`user_id` is a stable per-install value: the SDK derives it from `installId` (official SDKs hash it) and must use
the same value for every event of the install, which is what `<same:install>` checks.

## Behaviour every SDK must have (each is covered by a fixture)

1. Nothing is sent before consent when `consent: "required"`; revoking consent purges the queue, memory and disk.
2. Batches go to `/game/events/batch`; a 404 or 405 switches the session to single `/game/events` requests.
3. Every event carries a UUIDv7 `event_id`; a retried batch reuses the same ids (that is what makes retries safe).
4. 429 waits at least `Retry-After` seconds. 5xx and network errors back off with full jitter: the n-th retry of a
   batch (n starts at 0) waits `floor(random * min(60000, 1000 * 2^n))` ms, where `random` is the next value from
   `config.random` (the list repeats when it runs out). After `maxRetries` failed retries the batch is dropped and
   a debug message is logged. Every retry reuses the same `event_id`s.
5. 401/403 from Doorman stops sending for the session and keeps the queue (the key may be rotated next launch).
6. Per-index `rejected` events are dropped and never retried; `duplicate` counts as delivered.
7. Remote config is fetched lazily: right before a send, if the SDK has no config yet or its config is older
   than `ttl_s`. Nothing is fetched while there is nothing to send. A failed fetch keeps the last good config, or
   the defaults (`enabled: true`, no sampling, `max_batch: 100`, `ttl_s: 300`).
   - When a fetched config says `enabled: false`, everything queued is deleted (memory and storage). While that
     config is still fresh, new events are dropped when tracked. Once it is stale, events queue again and the next
     send fetches a new config.
   - `sample_rates[name]` is applied when the event is tracked, using the config the SDK has at that moment
     (before the first fetch every event is kept). Keep the event when
     `parseInt(last 8 hex digits of event_id, 16) / 2^32 < rate`. Rate `0` drops every event, `1` keeps every event.
   - `max_batch` caps batch size.
8. The queue is capped at `maxQueue`; when full the oldest event is dropped.
9. The SDK never throws into game code and never logs above debug level unless `debug: true` (games must be able
   to ship analytics silently).
