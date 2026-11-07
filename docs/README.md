# Butler SDK docs

## Start here

- [First working request](start-here.md): choose a task, gather credentials and recognize success.
- [Architecture](architecture.md): three integration paths and the analytics event journey.

- [Concepts](concepts.md): the three tiers, publishable keys, player identity, consent.
- [Integration paths](integration-paths.md): what first-party, partner and third-party studios can use, and how.
- [Raw HTTP quickstart](quickstart-raw-http.md): send analytics with nothing but HTTP.

## Guides

- [Analytics](guides/analytics.md): events, batches, remote config, sampling, consent. Examples in curl, browser
  JavaScript, Node, Python, C# and GML.
- [Game server](guides/game-server.md): accolades, feats, play sessions and per-player data from your own server.
- [Player sign-in](guides/player-sign-in.md): OAuth with PKCE for browser and desktop games.

- [Troubleshooting](troubleshooting.md): common failures and what to check next.

## Reference

- [`spec/butler.client.openapi.json`](../spec/butler.client.openapi.json): every Butler operation an SDK may call.
- [`spec/doorman.openapi.json`](../spec/doorman.openapi.json): the game gateway for shipped clients.
- [Conformance suite](../conformance/README.md): the behaviour every SDK must have.
- [Versioning](versioning.md): how the API, the spec and the packages are versioned.

## Decisions

- [ADR 0001: the SDK is optional and clients hold no secrets](adr/0001-optional-sdk-and-trust-tiers.md)

## For maintainers

- [Repository settings](maintainers/repo-settings.md): branch rules, required checks, fork safety.
- [Releasing](maintainers/releasing.md): how a version gets from a merged PR to npm, UPM and GitHub Releases.

- [Documentation](maintainers/documentation.md): human onboarding checks and the visual language.
