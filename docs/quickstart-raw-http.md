# Quickstart: Butler Analytics with plain HTTP

No SDK required. You need your game's **publishable ingest key**: an `ingest_token` and an `X-Proxy-Key`, both
shown in Backstairs under your game's analytics settings. They are safe to ship in your build. They can only send
analytics for your game.

Use the staging host and sandbox keys while you develop: `https://doorman.stg.theindieaccord.com`.

## Send one event

```bash
curl -X POST "https://doorman.stg.theindieaccord.com/game/events?ingest_token=$BUTLER_INGEST_TOKEN" \
  -H "X-Proxy-Key: $BUTLER_PROXY_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"install-3f2a9c\",
    \"event_name\": \"level_complete\",
    \"metadata\": { \"level\": 3, \"seconds\": 182 },
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"event_id\": \"$(uuidgen | tr A-Z a-z)\",
    \"session_id\": \"session-1\"
  }"
```

The command makes a new `event_id` and timestamp each time it runs. When you retry the *same* event after an
error, send the same `event_id` again; that is what lets Butler store it once.

| Field | Required | Notes |
|---|---|---|
| `user_id` | yes | Your id for the player or install, up to 128 characters. Not an authenticated identity. Do not send emails or real names. |
| `event_name` | yes | Up to 128 characters, for example `level_complete`. |
| `metadata` | no | JSON object: at most 8 KB, 64 keys, 5 levels deep. |
| `timestamp` | no | When it happened on the device (RFC 3339). Butler records its own receive time too. |
| `event_id` | recommended | A UUID (v7 recommended). Re-sending the same id is reported as `duplicate` and stored once, so retries are safe. |
| `session_id` | no | Your play-session id, up to 64 characters. |

## Send a batch (up to 100 events)

```bash
curl -X POST "https://doorman.stg.theindieaccord.com/game/events/batch?ingest_token=$BUTLER_INGEST_TOKEN" \
  -H "X-Proxy-Key: $BUTLER_PROXY_KEY" -H "Content-Type: application/json" \
  -d '{ "events": [ { "user_id": "install-3f2a9c", "event_name": "level_start" },
                    { "user_id": "install-3f2a9c", "event_name": "player_died", "metadata": { "cause": "eel" } } ] }'
```

The answer lists each event by index as `accepted`, `duplicate` or `rejected`. A rejected event never fails the
rest of the batch; do not retry it.

## Respect the remote switch

```bash
curl "https://doorman.stg.theindieaccord.com/game/config?ingest_token=$BUTLER_INGEST_TOKEN&build=1.0.0" \
  -H "X-Proxy-Key: $BUTLER_PROXY_KEY"
# { "enabled": true, "sample_rates": { "footstep": 0.1 }, "max_batch": 100, "ttl_s": 300 }
```

Stop sending when `enabled` is `false`, keep a share of each event name given by `sample_rates`, and check again
after `ttl_s` seconds.

## Handle errors

| Status | Do |
|---|---|
| 429 | Wait for `Retry-After` seconds, then retry the same events (same `event_id`s). |
| 5xx, network error | Retry with exponential backoff and jitter; give up after a few tries. |
| 401, 403 | Your key was refused. Stop sending until the next launch. |
| 404 on `/game/events/batch` | Older gateway: send events one at a time to `/game/events`. |

## Consent

Only send analytics after the player has agreed where the law requires it, and stop (and delete anything queued)
when they opt out. The official SDKs do this for you with `setConsent`.
