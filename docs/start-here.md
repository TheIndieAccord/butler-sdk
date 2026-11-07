# Start with one working request

Butler connects your game to analytics, player sign-in and server-side game features. You can use ordinary HTTP; an SDK is optional.

**This repository is still being built.** The TypeScript and Unity packages are in development, and GameMaker is planned. Package examples describe the intended API. Start with the HTTP guides until a package release and its runnable sample are available. A published contract does not confirm that every environment has deployed it.

## Choose one outcome

| I want to... | Start with | What I need |
|---|---|---|
| Send a gameplay event | [HTTP quickstart](quickstart-raw-http.md) | A staging integration and its publishable ingest key |
| Show a player's name and avatar | [Player sign-in](guides/player-sign-in.md) | An OAuth client id, registered redirect URI and allowed scopes |
| Award an accolade or save player data | [Game server guide](guides/game-server.md) | A server you control, server credentials and a verified player session |
| Understand where requests go | [Architecture](architecture.md) | No setup |

Backstairs is Butler's developer portal. Ask your studio administrator for access to the integration and the matching environment. Client analytics keys are currently provisioned for first-party studios; partners and third parties should check [integration availability](integration-paths.md) before starting. If you do not have keys, read the contract locally; the examples do not include shared credentials.

## Make the first request observable

1. Use staging credentials with the staging host. Never put a server client secret in a game build.
2. Set `BUTLER_INGEST_TOKEN` and `BUTLER_PROXY_KEY` in your shell to the two publishable values supplied for that integration. Do not substitute your OAuth client id or server secret.
3. Run the single-event command in the [HTTP quickstart](quickstart-raw-http.md). Add `--include` to `curl` so you can see the HTTP status and headers alongside the JSON body. This sends a real test event to staging.
4. Check the body as well as the status. The single-event contract returns `accepted`, `duplicate` and `status`. A normal new event has `accepted: true`, `duplicate: false`, `status: "accepted"`. A retry of the same event id can return `status: "duplicate"`; it is not a second stored event.
5. If you have analytics access in Backstairs, check the same game and environment. If the request fails or the event is absent, use [troubleshooting](troubleshooting.md).

The quickstart uses a fixed example `event_id`. Use a fresh UUID for each new event in your game, and keep that UUID when retrying the same event. Do not change it just to make a retry appear new.

## Before putting it in a game

- Decide when analytics may start and how players can turn it off. The raw HTTP examples do not implement a complete consent or queue system for you.
- Read remote config, respect the kill switch and sampling, and bound retries and local storage. See the [analytics guide](guides/analytics.md) and [conformance expectations](../conformance/README.md).
- Use an install id for anonymous analytics. Treat analytics `user_id` as unverified input, never proof that a player earned a reward.
- Keep failures out of the gameplay loop. Show actionable diagnostics in development without logging tokens or personal data.

You do not need to read the whole repository. Finish one guide, verify its result, then add the next feature.
