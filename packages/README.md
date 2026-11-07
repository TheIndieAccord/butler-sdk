# packages

Official SDKs. Each folder is published on its own and has its own README.

| Folder | Published as | Language |
|---|---|---|
| [`ts/`](ts) | `@indieaccord/butler` on npm | TypeScript (browser and Node) |
| [`unity/`](unity) | `com.indieaccord.butler` (UPM, git URL and OpenUPM) | C# |
| [`gamemaker/`](gamemaker) | `butler.yymps` on GitHub Releases | GML |

All three:

- send only requests defined in [`spec/`](../spec);
- pass the [conformance](../conformance) fixtures for the profiles they implement (analytics for all three,
  sign-in for TypeScript and Unity);
- share one version number (see [versioning](../docs/versioning.md));
- never throw into game code and stay quiet unless debug logging is on;
- contain no keys or secrets.
