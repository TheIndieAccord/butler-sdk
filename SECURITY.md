# Security policy

## Reporting a vulnerability

Please report security problems privately, by either:

- GitHub private vulnerability reporting: the "Report a vulnerability" button on this repository's Security tab, or
- email to **security@theindieaccord.com**.

Do not open a public issue. We aim to reply within a few working days and will keep you updated until it is
fixed.

A good report includes the package and version, what an attacker could do, and the steps to reproduce it.
Problems in the Butler service itself (not just this repo) are welcome through the same channels.

## What is expected behaviour

These are by design and not vulnerabilities:

- Publishable ingest keys (`ingest_token` and `X-Proxy-Key`) can be read out of a shipped game. They only allow
  sending analytics for that one game, and can be rotated in Backstairs.
- OAuth client ids are public.
- Analytics `user_id` values are not verified and are not used for anything that needs trust.

A client secret or signing secret found in a game build, sample or public repository is a real problem. Report it
and rotate it.

## Supported versions

The latest minor release of each package receives security fixes.
