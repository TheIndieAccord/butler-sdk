# Player sign-in

Sign-in lets a player connect their Butler account to your game. Your game then gets:

- the player's **pseudonym** for your game (`player_id`), plus their display name and avatar;
- permission, for the scopes the player approved, for your server to award accolades and store data for them.

Butler uses OAuth 2.0 authorization code flow with PKCE. Your game is a **public client**: it has a client id
but no secret, so the client id can ship in the build.

## The flow in one picture

```
1. game        makes a random code_verifier and state, keeps them
2. game        opens the browser at /v1/oauth/authorize?...&code_challenge=SHA256(verifier)&state=...
3. player      signs in to Butler and approves your game
4. browser     returns to your redirect_uri with ?code=...&state=...&iss=...
5. game        checks state and iss, then POSTs code + code_verifier to /v1/oauth/token
6. game        receives an access token (15 minutes) and a refresh token
```

The SDKs will do all six steps. The rest of this page shows them by hand.

## Before you start

In Backstairs, under your game's OAuth settings, note:

- your **client id**;
- the **redirect URIs** you registered. Butler only redirects to an exact match. For desktop games, register a
  loopback address such as `http://127.0.0.1/callback`; the port may change each run.
- the **scopes** your game may ask for. Ask only for what you use:

| Scope | Lets your game or server |
|---|---|
| `profile:read` | Read the player's display name and avatar, under an id unique to your game |
| `accolades:write` | Award the player your game's accolades |
| `feats:write` | Award the player your game's feats |
| `playtime:write` | Record play sessions |
| `playerdata:readwrite` | Read and write your game's data for the player |
| `decisions:readwrite` | Record and read story decisions |

The player sees each scope on the approval screen and can approve fewer than you asked for. The token response
has a `scope` field with what was actually granted; check it before showing features that need more.

The issuer is the API base URL for the environment, for example `https://api.butler.stg.theindieaccord.com`.

## Browser game example

```js
const BUTLER = 'https://api.butler.stg.theindieaccord.com'
const CLIENT_ID = 'your-client-id'
const REDIRECT_URI = 'https://mygame.example/callback'

// Random URL-safe string.
function randomString(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// S256 challenge: base64url(SHA-256(verifier)).
async function challengeFor(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Step 1 and 2: start sign-in.
export async function signIn() {
  const verifier = randomString()
  const state = randomString(16)
  sessionStorage.setItem('butler_pkce', JSON.stringify({ verifier, state }))

  const url = new URL(`${BUTLER}/v1/oauth/authorize`)
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'profile:read accolades:write', // space separated
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
  })
  location.assign(url)
}

// Step 4 and 5: on the callback page.
export async function handleRedirect() {
  const params = new URLSearchParams(location.search)
  const saved = JSON.parse(sessionStorage.getItem('butler_pkce') ?? 'null')
  sessionStorage.removeItem('butler_pkce') // state is single use

  // These two checks are what stop another site from injecting its own sign-in.
  if (!saved || params.get('state') !== saved.state) throw new Error('state mismatch')
  if (params.get('iss') !== BUTLER) throw new Error('issuer mismatch')
  if (params.get('error')) throw new Error(`sign-in failed: ${params.get('error')}`)

  const res = await fetch(`${BUTLER}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: params.get('code'),
      code_verifier: saved.verifier,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    }),
  })
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`)
  return res.json() // { access_token, refresh_token, expires_in, scope, token_type }
}
```

Read the player with the access token:

```js
const me = await fetch(`${BUTLER}/v2/games/${INTEGRATION_ID}/me`, {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
}).then((r) => r.json())
// {
//   "player_id": "<your game's id for this player>",
//   "display_name": "Tinsel",
//   "avatar": { "kind": "image", "image_url": "https://...", "initials": "T" }
// }

// kind is "image" (use image_url) or "initials" (draw the initials yourself).
if (me.avatar.kind === 'image') showPortrait(me.avatar.image_url)
else showInitialsBadge(me.avatar.initials)
```

## Desktop games

Desktop games open the system browser and listen on a loopback port for the redirect (RFC 8252). Do not use an
embedded web view for sign-in: players cannot see the address bar, so they cannot tell a real sign-in page from
a fake one.

The Unity SDK does this with one call:

```csharp
var player = await Butler.Auth.SignInAsync();   // opens the browser, waits for the redirect
Debug.Log($"Signed in as {player.DisplayName}");
```

## Keeping the player signed in

Access tokens last 15 minutes. Swap the refresh token for a new pair before then. Each refresh token works once,
so only one refresh may run at a time, and the new pair must replace the old one:

```js
let tokens = await handleRedirect() // { access_token, refresh_token, expires_in, ... }
let refreshing = null

// Every caller shares one refresh in flight instead of starting their own.
export function refresh() {
  refreshing ??= (async () => {
    const res = await fetch(`${BUTLER}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: CLIENT_ID }),
    })
    if (!res.ok) {
      tokens = null // signed out: the player removed your game, or the refresh token was refused
      throw new Error(`refresh failed: ${res.status}`)
    }
    tokens = await res.json() // replace both tokens at once
    return tokens
  })().finally(() => { refreshing = null })
  return refreshing
}
```

If a refresh token that was already used is sent again, Butler treats it as stolen and ends that sign-in (that
token family) for your game. The player then signs in again.

Where to keep tokens:

| Platform | Access token | Refresh token |
|---|---|---|
| Browser | Memory only | Memory, or `sessionStorage` if you accept a sign-in per tab |
| Desktop | Memory | The OS keychain or credential store |
| Mobile | Memory | Keychain (iOS) or Keystore (Android) |

## GameMaker

Sign-in is not available for GameMaker yet. It needs a flow where the player types a short code on another
device, which Butler does not have yet. Analytics works without it.

## When the player removes your game

A player can disconnect your game from their Butler account. After that, refreshing fails and server calls for
that player return `403 PLAYER_NOT_LINKED`. Treat it as signed out and offer sign-in again.
