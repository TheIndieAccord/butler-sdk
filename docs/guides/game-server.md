# Game server guide

Your game server holds a **client id** and **client secret** from Backstairs. With them it can award accolades
and feats, track play sessions, store small per-player values and send analytics. None of this can be done from
a game client, which is what keeps it trustworthy.

All examples use the staging host `https://api.butler.stg.theindieaccord.com`. Keep credentials in environment
variables or your platform's secret store, never in source control.

## 1. Get an access token

```bash
curl -X POST https://api.butler.stg.theindieaccord.com/v1/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"client_id\":\"$BUTLER_CLIENT_ID\",\"client_secret\":\"$BUTLER_CLIENT_SECRET\"}"
# { "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 3600 }
```

Tokens last an hour. Reuse one until it is close to expiring instead of asking for a new one per call.

A small Node helper that caches the token. Save it as `butler.mjs` (the `.mjs` extension makes Node treat it as
an ES module):

```js
// butler.mjs: a minimal server-side client. Node 20 or newer (built-in fetch).
export const BASE = process.env.BUTLER_URL ?? 'https://api.butler.stg.theindieaccord.com'
let cached = { token: null, expiresAt: 0 }
export const GAME = process.env.BUTLER_INTEGRATION_ID

async function token() {
  // Refresh a minute early so a request never goes out with an expired token.
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token
  const res = await fetch(`${BASE}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.BUTLER_CLIENT_ID, client_secret: process.env.BUTLER_CLIENT_SECRET }),
  })
  if (!res.ok) throw new Error(`Butler token request failed: ${res.status}`)
  const body = await res.json()
  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 }
  return cached.token
}

export async function butler(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw Object.assign(new Error(`Butler ${method} ${path}: ${res.status}`), { status: res.status, data })
  return data
}
```

## 2. Know which player you are acting for

Server calls name the player by `player_id`, the player's pseudonym for your game. **Never take a `player_id`
from the game client as it is.** A modified client could send someone else's id and collect their accolades.
Instead, have the client send its player access token once, look the player up with it, and remember the answer
in your own session:

```js
// When a player connects to your server (or calls your "link Butler" endpoint):
async function verifiedPlayerId(playerAccessToken) {
  const res = await fetch(`${BASE}/v2/games/${GAME}/me`, {
    headers: { Authorization: `Bearer ${playerAccessToken}` },
  })
  if (!res.ok) throw new Error(`Butler did not accept the player token: ${res.status}`)
  const me = await res.json()
  return me.player_id // Butler checked the token, so this id belongs to whoever holds it
}

// Store it with your own session, then use only this value in later calls.
session.butlerPlayerId = await verifiedPlayerId(req.body.butlerAccessToken)
```

Do this over HTTPS, and do not keep the player's token longer than you need it. The `profile:read` scope is
enough for this lookup.

A player must have signed in and approved your game, with the scopes for what you do next, before any of these
calls work. Otherwise they return `403 PLAYER_NOT_LINKED` or `403 SCOPE_NOT_GRANTED`. First-party games can be set
up in Backstairs to skip the approval step.

## 3. Award an accolade

```js
import { butler, GAME } from './butler.mjs' // GAME is the integration id shown in Backstairs

const playerId = session.butlerPlayerId // from step 2, never from the client

// Unlock outright, by the key you gave the accolade in Backstairs.
await butler('POST', `/v2/games/${GAME}/accolades/award`, {
  player_id: playerId,
  accolade_key: 'first_boss',
})

// Or add progress to a counted accolade ("defeat 100 eels").
const result = await butler('POST', `/v2/games/${GAME}/accolades/award`, {
  player_id: playerId,
  accolade_key: 'eel_hunter',
  progress: 1,
})
if (result.completed) console.log('Eel Hunter unlocked')
```

Several at once, for example at the end of a run, with `accolades/award-batch` (up to 50 per request).

## 4. Record a feat

```js
// feat_id is the id Backstairs shows for the feat.
await butler('POST', `/v2/games/${GAME}/feats/award`, { player_id: playerId, feat_id: 'your-feat-id' })
```

## 5. Track play sessions

```js
const { session_id } = await butler('POST', `/v2/games/${GAME}/sessions/start`, { player_id: playerId })
// ... the player plays ...
await butler('POST', `/v2/games/${GAME}/sessions/end`, { session_id })
```

## 6. Store small per-player values

Good for settings, unlock flags or a "last chapter reached" marker. Not a save-file store.

```js
// Write
await butler('PUT', `/v2/games/${GAME}/data/last_chapter`, { player_id: playerId, value: { chapter: 4 } })

// Read one
const row = await butler('GET', `/v2/games/${GAME}/data/last_chapter?player_id=${playerId}`)

// Read all of this player's keys, a page at a time
let cursor
do {
  const page = await butler('GET', `/v2/games/${GAME}/data?player_id=${playerId}&limit=50${cursor ? `&cursor=${cursor}` : ''}`)
  for (const item of page.data) console.log(item.key, item.value)
  cursor = page.next_cursor
} while (cursor)
```

`decisions` works the same way, for story choices you may want to show across games.

## Sending analytics from your server

Server analytics go straight to Butler, signed with your integration's **signing secret** (also in Backstairs).
The signature proves the body was not changed on the way:

```
X-Butler-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<exact body bytes>" using the signing secret>
```

Python 3.9 or newer, standard library only:

```python
import hashlib, hmac, json, os, time, urllib.request, uuid

BASE = os.environ.get("BUTLER_URL", "https://api.butler.stg.theindieaccord.com")

def get_token() -> str:
    """Exchange the client id and secret for an access token (valid one hour)."""
    body = json.dumps({
        "client_id": os.environ["BUTLER_CLIENT_ID"],
        "client_secret": os.environ["BUTLER_CLIENT_SECRET"],
    }).encode()
    req = urllib.request.Request(f"{BASE}/v1/auth/token", data=body, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        return json.load(res)["access_token"]

def send_events(access_token: str, events: list[dict]) -> dict:
    """Send up to 100 events in one signed request."""
    body = json.dumps({"events": events}, separators=(",", ":")).encode()
    t = str(int(time.time()))
    sig = hmac.new(os.environ["BUTLER_SIGNING_SECRET"].encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        f"{BASE}/v1/analytics/events/batch",
        data=body,  # sign exactly the bytes you send
        method="POST",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Butler-Signature": f"t={t},v1={sig}",
        },
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)

token = get_token()
result = send_events(token, [
    {"user_id": "match-server-7", "event_name": "match_finished", "event_id": str(uuid.uuid4()),
     "metadata": {"mode": "ranked", "won": True, "minutes": 14}},
])
print(result["accepted"], "accepted")
```

Signatures are valid for five minutes and each one can be used once, so sign right before sending.

## Errors you will see

| Status | Meaning | What to do |
|---|---|---|
| 401 | Token missing or expired | Get a new token and retry once. |
| 403 `PLAYER_NOT_LINKED` | The player has not approved your game, or removed approval | Ask the player to sign in again. |
| 403 `SCOPE_NOT_GRANTED` | Your game or the player's approval does not include this action | Check the integration's scopes in Backstairs. |
| 429 | Too many requests | Wait `Retry-After` seconds. |
