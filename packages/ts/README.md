# @indieaccord/butler

TypeScript SDK for Butler. For browsers and for Node versions in active or maintenance LTS.

> Status: in development. The API below is the planned 2.0 surface.

## Install (after the first release)

```bash
npm install @indieaccord/butler
```

## Analytics in a browser game

```ts
import { Butler } from '@indieaccord/butler'

const butler = Butler.init({
  env: 'staging', // or 'production'
  ingest: {
    ingestToken: import.meta.env.VITE_BUTLER_INGEST_TOKEN, // publishable, safe to ship
    proxyKey: import.meta.env.VITE_BUTLER_PROXY_KEY,
  },
  build: '1.4.0',
  consent: 'required',
})

// From your consent prompt:
butler.analytics.setConsent(true)

butler.analytics.track('level_complete', { level: 3, seconds: 182 })
butler.analytics.track('item_bought', { item: 'lantern', price: 40 })
```

Events will be queued, batched, retried and kept across reloads. When the page is hidden the SDK will flush what
it has.

## Signing a player in

```ts
const butler = Butler.init({
  env: 'staging',
  ingest: { ingestToken, proxyKey },
  oauth: { clientId: 'your-client-id', redirectUri: 'https://mygame.example/callback', scopes: ['profile:read'] },
})

// On your "Sign in with Butler" button:
await butler.auth.signIn({ mode: 'popup' })

// Or with a full-page redirect, then on the callback page:
await butler.auth.handleRedirect()

console.log(butler.auth.player?.displayName)
butler.auth.onChange((player) => updateMenu(player))
```

After sign-in, analytics events use the player's id for your game instead of the install id.

## On a Node game server

```ts
import { ButlerServer } from '@indieaccord/butler/server'

const butler = new ButlerServer({
  env: 'staging',
  clientId: process.env.BUTLER_CLIENT_ID!,
  clientSecret: process.env.BUTLER_CLIENT_SECRET!, // server only, never in a game build
  integrationId: process.env.BUTLER_INTEGRATION_ID!,
})

await butler.accolades.award({ playerId, accoladeKey: 'first_boss' })
const { sessionId } = await butler.sessions.start({ playerId })
await butler.data.put({ playerId, key: 'last_chapter', value: { chapter: 4 } })
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `env` | required | `'staging'` or `'production'`. |
| `ingest.ingestToken`, `ingest.proxyKey` | none | Publishable key from Backstairs. Without it, analytics is off. |
| `consent` | `'required'` | `'required'` sends nothing until `setConsent(true)`. Use `'granted'` only where no consent is needed. |
| `build` | none | Your build string, for per-build remote config. |
| `flushIntervalMs` | `15000` | How often to send queued events. |
| `flushAt` | `50` | Send as soon as this many events are queued. |
| `maxQueue` | `2000` | Oldest events are dropped past this. |
| `debug` | `false` | Log every event and request to the console. |
