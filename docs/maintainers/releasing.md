# Releasing

Releases are cut by a maintainer. Nothing is published from a pull request.

## Before a release

1. `main` is green.
2. `CHANGELOG.md` has a section for the new version with every user-visible change.
3. If the spec changed, the spec sync pull request is merged and the conformance fixtures pass for every official
   package.

## Cutting it

1. Update the version in each package (`packages/ts/package.json`, `packages/unity/package.json`,
   `packages/gamemaker/` extension file). All official packages share one version.
2. Open a pull request with the version bump and changelog, and merge it.
3. Tag the merge commit: `git tag -s v2.0.0 -m "Butler SDK 2.0.0"` and push the tag.
4. The release workflow builds every package, then waits in the `release` environment. Approve it in the
   Actions tab.
5. It then publishes:
   - **npm:** `@indieaccord/butler`, using npm trusted publishing (no npm token stored in GitHub). npm adds a
     provenance statement automatically.
   - **Unity:** the `upm` branch is updated with the contents of `packages/unity`, and tagged `upm/v2.0.0`, so
     games can install from a git URL. OpenUPM picks the tag up from there.
   - **GameMaker:** `butler.yymps` is attached to the GitHub Release.

The release workflow itself is added before the first release; until then this page describes the plan.

## One-time setup

- Reserve the `@indieaccord` scope on npm and add this repo as a trusted publisher for `@indieaccord/butler`.
- Register `com.indieaccord.butler` on OpenUPM.
- Unity 6.3 and newer warn about unsigned packages. Sign the Unity package from the Unity Package Manager export
  before attaching it to a release.
