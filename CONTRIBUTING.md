# Contributing

Bug reports, fixes, docs and new ports are all welcome.

## Before you start

- **Small fixes** (typos, docs, an obvious bug): open a pull request.
- **New features or behaviour changes**: open an issue first so we can agree on the shape.
- **A port for another engine**: build it in your own repo, see [Community ports](#community-ports).
- **A security problem**: follow [SECURITY.md](SECURITY.md) instead of opening an issue.

## Making a change

```bash
git clone https://github.com/TheIndieAccord/butler-sdk.git
cd butler-sdk
git switch -c fix/short-description

# Repo checks need only Node 22, no install step:
node scripts/check-json.mjs
node scripts/check-spec-allowlist.mjs
node scripts/check-docs.mjs
```

Each package has its own build and test commands in its README.

### Sign your commits off

Every commit needs a `Signed-off-by` line, which says you wrote the change or have the right to submit it under
the project's license (the [Developer Certificate of Origin](https://developercertificate.org/)):

```bash
git commit -s -m "Fix retry delay when Retry-After is a date"
```

Forgot? `git commit --amend -s` for the last commit, or `git rebase --signoff main` for all of them.

### Pull requests

- Keep each pull request to one change.
- Fill in the template, including how you checked it.
- CI must pass. A maintainer reviews every pull request before it merges.

## Rules every SDK follows

These keep official packages, community ports and plain HTTP interchangeable.

1. **Send only what the spec defines.** Extra context goes inside `metadata` with a `$` prefix
   (`$sdk`, `$sdk_version`, `$platform`, `$build`), never as a new top-level field.
2. **Behaviour changes start with a fixture.** If you change how an SDK queues, retries or handles consent, change
   or add the fixture in `conformance/` in the same pull request.
3. **No secrets anywhere.** Not in code, samples, tests, fixtures or CI. Samples read keys from environment
   variables.
4. **Never break the game.** SDK calls do not throw into game code and do not log above debug level unless debug
   logging is on.
5. **Keep it readable.** Add a comment wherever a choice is not obvious from the code, such as a limit, a retry
   rule or a platform workaround. Prefer a plain loop to a clever one-liner.

## Writing docs

- Short sentences and plain words. Write for someone integrating Butler for the first time.
- Show an example for each idea, and vary them: browser, Unity, GameMaker, a server.
- Use plain punctuation. `scripts/check-docs.mjs` rejects em dashes, en dashes and curly quotes, and checks that
  relative links work.

## Community ports

You are welcome to build and publish a Butler SDK for any engine or language. To keep players and developers from
mistaking it for an official package:

- name it `butler-sdk-<engine>` or `<your-name>-butler-<engine>`. "for Butler" and "Butler-compatible" are fine;
- do not call it official, and do not use The Indie Accord logo, the `@indieaccord` npm scope or the
  `com.indieaccord` package prefix.

To be listed, see [community/README.md](community/README.md).

## Code of conduct

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
