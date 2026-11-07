# ADR 0001: The Butler SDK is optional, and clients hold no secrets

- Status: Proposed
- Date: 2026-11-07

## Context

Butler is The Indie Accord's cross-game backend: player identity, profiles, accolades and first-party game
analytics. Games already send analytics with plain HTTP through Doorman, a gateway that holds each game's Butler
credentials so shipped builds carry none. We want SDKs for the web, Unity and GameMaker without making them a
requirement, and we want other developers to be able to build and maintain their own.

## Decision

1. **Analytics needs no SDK.** The contract is HTTP: `POST /game/events`, `POST /game/events/batch` and
   `GET /game/config` on Doorman (`spec/doorman.openapi.json`), with bodies from `spec/butler.client.openapi.json`.
   SDKs are a convenience on that exact wire.
2. **Wire rule.** An SDK may only send request bodies that validate against the published spec. Extra context goes
   inside `metadata` (`$sdk`, `$sdk_version`, `$platform`, `$build`), never as new top-level fields. The
   conformance suite checks the SDK's requests against fixtures written from the spec.
3. **Three trust tiers.**
   | Tier | Who | What | Credential |
   |---|---|---|---|
   | Public | any shipped game | send analytics, read remote config | publishable ingest key (`ingest_token` + `X-Proxy-Key`): public, write-only, rotatable |
   | Player | a signed-in player | read their own Butler profile for this game | OAuth 2.0 authorization code + PKCE, public client, short-lived token |
   | Server | the studio's game server | award accolades and feats, sessions, game data | game-server client id and secret, called directly on Butler; never in a client |
4. **Client secrets do not exist.** Publishable keys are assumed extracted. Nothing a client can send creates or
   changes accolades, feats, currency or another player's data. Analytics `user_id` is not an authenticated
   identity; it is a per-install id, or the player's game-scoped pseudonym after sign-in.
5. **The SDK is open source** (this repository). Because no part of the trust model depends on client code staying
   secret, publishing it removes no protection. The public spec is an allowlist of client-facing operations
   (`spec/client-operations.json`); admin and studio routes are not published.
6. **One version line.** The packages share a semver line that follows the public spec's version. The API itself
   only grows within a major version; breaking changes get a new major path.

## Consequences

- A game can integrate with curl, a hand-written client, an official SDK or a community port, and Butler cannot tell
  them apart.
- Spam with an extracted key is bounded by Doorman rate limits, key rotation and the server-enforced kill switch;
  it can only affect the owning studio's analytics.
- GameMaker gets analytics only in 2.0: it has no local redirect listener, and the device-code grant that would
  let it sign players in comes later.
- Guest (anonymous) Butler accounts are out of scope for 2.0; they would bypass the account age gate.

## Rejected

- **Signing requests in the client.** It needs a secret in the build. Doorman signs instead.
- **A publishable key accepted directly by Butler.** Doorman already does this job; revisit if it becomes a bottleneck.
- **Separate repositories per engine.** The spec and fixtures would drift; one repo, one version line.
- **A shared native core (Rust or C) with bindings.** Too heavy for the team size and awkward for GML and TypeScript.
