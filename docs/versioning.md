# Versioning

Three things have versions here: the Butler API, the public spec, and the packages.

## The API

- Paths carry a major version: `/v1/...`, `/v2/...`.
- Within a major version the API only grows. New endpoints, new optional fields and new response fields can
  appear; nothing is removed or renamed, and nothing optional becomes required.
- A breaking change needs a new major path. The old one keeps working for a deprecation period announced with
  the change, and answers with `Deprecation` and `Sunset` headers during that time.
- Clients must ignore response fields they do not know. That is what lets the API grow without breaking you.

## The spec

`spec/butler.client.openapi.json` is copied from Butler by `scripts/sync-spec.mjs`. Its `info.version` follows
the Butler release it came from. Each sync lands as a pull request, so you can see exactly what changed.

`operationId`s are part of the contract: SDK method names come from them, and they are never renamed.

## The packages

All official packages share one version number and follow [semantic versioning](https://semver.org):

| Change | Version bump | Example |
|---|---|---|
| Bug fix, no API change | Patch | 2.0.0 to 2.0.1 |
| New feature, nothing removed | Minor | 2.0.1 to 2.1.0 |
| Something removed or changed in a way that breaks callers | Major | 2.1.0 to 3.0.0 |

A package major version is only bumped together with a deprecation period: the old behaviour is marked
deprecated in a minor release first, with a note in [CHANGELOG.md](../CHANGELOG.md) saying what to use instead.

The latest minor release of each package gets fixes, including security fixes.

## Engine support

| Package | Supported |
|---|---|
| TypeScript | Node versions in active or maintenance LTS; browsers with `fetch`, `crypto.subtle` and ES2022 |
| Unity | 2022.3 LTS and newer, including WebGL builds |
| GameMaker | The GMS2 runtime current LTS and monthly releases |

Dropping support for an engine or runtime version is a major release, announced in a minor release first.
