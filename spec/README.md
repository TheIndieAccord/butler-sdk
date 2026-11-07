# spec

The public API contract. Every SDK request must match these documents.

| File | What it is | Edit by hand? |
|---|---|---|
| `butler.client.openapi.json` | The Butler operations games and game servers call, copied from Butler's own spec | No, regenerate it |
| `client-operations.json` | The allowlist that decides which Butler operations are copied, and their tier | Yes, in a reviewed PR |
| `doorman.openapi.json` | The gateway shipped games send analytics to | Yes, when Doorman changes |

## How `butler.client.openapi.json` is made

```bash
node scripts/sync-spec.mjs path/to/butler/docs/openapi.json
```

The script copies only the operations on the allowlist, plus the schemas they use, and labels each operation with
`x-butler-tier` (`public`, `player` or `server`). Operations that are not on the list, such as Backstairs and admin
routes, are never published. CI runs `scripts/check-spec-allowlist.mjs` to make sure the file still matches the
list.

## Reading an operation

```jsonc
"/v1/analytics/events/batch": {
  "post": {
    "x-butler-tier": "public",          // safe to call from a shipped game
    "x-butler-via": "doorman",          // games reach it through Doorman, not directly
    "x-doorman-route": "events/batch",  // so the game calls POST /game/events/batch
    ...
  }
}
```

## Generating your own client

Any OpenAPI 3.1 generator works. For example, types for TypeScript:

```bash
npx openapi-typescript spec/butler.client.openapi.json -o butler-types.ts
```

Or a C# client:

```bash
npx @openapitools/openapi-generator-cli generate -i spec/butler.client.openapi.json -g csharp -o out/csharp
```

Generated clients only cover the HTTP calls. Queueing, retries and consent are up to you, or use an official
package. Whatever you build, run it against the [conformance fixtures](../conformance).
