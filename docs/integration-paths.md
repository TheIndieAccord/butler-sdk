# Integration paths

Butler works with three kinds of studios. The kind is set on your studio in Backstairs and decides what your
games are allowed to do.

| Studio | Also called | Who |
|---|---|---|
| First party | `internal` | Games made by The Indie Accord. |
| Second party | `partner` | Studios working with The Indie Accord under an agreement. |
| Third party | `external` | Any other studio with a Backstairs account. |

## What each path looks like

### Analytics from the game client (public tier)

```
game build --publishable key--> Doorman --signed--> Butler Analytics
```

Use this when your game has no server, or when you want events straight from players' devices. You need a
publishable ingest key from Backstairs. Today these keys are issued for first-party games; if your studio does
not see one in Backstairs yet, use the server path below for now.

### Analytics and game features from your server (server tier)

```
game build --your own protocol--> your game server --client secret--> Butler
```

Use this for anything that must be trusted: accolades, feats, play sessions, per-player data. It also works for
analytics: your server can send events directly to Butler with its own credential, for any studio kind. See the
[game server guide](guides/game-server.md).

### Player sign-in (player tier)

```
game --opens browser--> Butler sign-in and consent --code--> game --PKCE token exchange--> player token
```

Use this to show a player's Butler name and avatar, and so your server can act for that player with their
consent. See the [player sign-in guide](guides/player-sign-in.md).

## Which features each studio kind can use

| Feature | First party | Partner | Third party |
|---|---|---|---|
| Analytics from your server | Yes | Yes | Yes |
| Analytics from the client with a publishable key | Yes | Ask us | Ask us |
| Player sign-in (OAuth) | Yes | Yes | Yes |
| Accolades and feats for linked players | Yes | Yes | Yes, except ones that pay out currency |
| Per-player game data and decisions | Yes | Yes | Yes |

Partner and third-party games act for a player only after that player has signed in and approved the game. A
player can remove that approval at any time from their Butler account, and calls for that player then return
`403 PLAYER_NOT_LINKED`. Handle that case by asking the player to sign in again.

"Ask us" means the feature exists but is turned on per studio. Write to dev@theindieaccord.com.

## Picking a path

- **A small web or desktop game with no server:** client analytics only. Add sign-in later if you want names
  and avatars.
- **A game with a server or backend functions:** send analytics from either side, and keep accolades and saves on
  the server.
- **A tool, bot or website around a game:** the server tier, from Node, Python or anything that speaks HTTP.
