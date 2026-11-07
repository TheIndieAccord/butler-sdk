# Concepts

These five ideas come up in every Butler integration.

## 1. Three tiers of access

Every Butler call belongs to one tier. The tier decides what credential the caller needs and whether that
credential may ever ship inside a game build.

| Tier | Who calls | Examples | Credential | In a shipped build? |
|---|---|---|---|---|
| Public | The game itself | Send analytics, read remote config | Publishable ingest key | Yes |
| Player | The game, for one signed-in player | Read that player's display name and avatar | Player access token from OAuth | Yes, per player and short-lived |
| Server | Your own game server | Award accolades and feats, start play sessions, save per-player data | Game-server client id and secret | Never |

Each operation in [`spec/butler.client.openapi.json`](../spec/butler.client.openapi.json) is labelled with
`x-butler-tier` so you can always check.

## 2. Publishable keys are public on purpose

A publishable ingest key has two parts, both shown in Backstairs:

- `ingest_token`: identifies your game.
- `X-Proxy-Key`: a key for that game.

Anyone with your build can read them, and that is fine. They only let someone send analytics events for your
game. They cannot read data, award anything or touch a player account. If one is abused you can rotate it in
Backstairs, and the remote kill switch can stop a build from sending at all.

Publishable keys are sent to **Doorman**, a gateway in front of Butler. Doorman holds your game's real Butler
credentials, signs each request and forwards it, so your build never contains a secret.

## 3. Secrets live on servers

The server tier uses a client id and client secret. They stay on a machine you control: a game server, a
serverless function, a build tool. If a secret appears in a game build, treat it as leaked and rotate it.

Anything that has value to players (accolades, feats, currency, saves that unlock things) is written from the
server tier. A game client can report "the player finished level 3" as an analytics event, but only your
server can turn that into an accolade.

## 4. Player identity

Butler gives each player a different id in every game, called a **pseudonym**. Your game never sees the
player's Butler account id, and two games cannot match up the same player.

- **Before sign-in**, analytics events use an id you choose for the install, for example a random value stored on
  first launch. The SDKs will do this for you.
- **After sign-in**, your game knows the player's pseudonym (`player_id`) and can use it for analytics too.

Analytics `user_id` values are never checked by Butler. Do not use them for anything that needs to be trusted.
That is what the player and server tiers are for.

Players under 13 cannot have Butler accounts. A planned addition will tell games a signed-in player's age band
(`13-17` or `18+`) so they can adjust content.

## 5. Consent

Where the law asks for consent before analytics, ask first, and only send once the player agrees. If they say
no later, stop sending and delete anything still queued on the device.

The SDKs will have one switch for this (planned API):

```ts
butler.analytics.setConsent(true)   // start sending, including anything queued while waiting
butler.analytics.setConsent(false)  // stop, and delete everything queued
```

Initialize with `consent: 'required'` and the SDK sends nothing, not even a config request, until consent is
granted.

## Words used in these docs

| Word | Meaning |
|---|---|
| Butler | The backend: accounts, analytics, accolades, game data. |
| Backstairs | The developer portal where studios set up games, keys and analytics dashboards. |
| Doorman | The gateway that shipped games send analytics to. |
| Integration | One game (or one build target) registered in Backstairs. Keys belong to an integration. |
| Accolade | An achievement a player earns in a game. |
| Feat | A smaller recorded accomplishment, often counted. |
| Pseudonym | A player's id within one game. |
