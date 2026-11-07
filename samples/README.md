# samples

Small, complete examples. Each reads its keys from environment variables or a local settings file that is
ignored by git, never from source:

| Variable | Used by |
|---|---|
| `BUTLER_INGEST_TOKEN`, `BUTLER_PROXY_KEY` | Client analytics |
| `BUTLER_CLIENT_ID` | Player sign-in |
| `BUTLER_CLIENT_SECRET`, `BUTLER_SIGNING_SECRET`, `BUTLER_INTEGRATION_ID` | Server examples only |

Planned samples:

| Folder | Shows |
|---|---|
| `web/` | A tiny browser game: analytics with consent, sign-in, a leaderboard of accolades through its own server |
| `unity/` | A Unity scene with the consent prompt, events and sign-in |
| `node-server/` | Awarding accolades and storing player data from a game server |
| `curl/` | Every public and server call as a shell script |

Ask for staging keys at dev@theindieaccord.com.
