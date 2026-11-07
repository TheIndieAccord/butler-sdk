# community

Butler SDKs written and maintained by other developers. They live in their own repositories. This folder only
lists them.

`REGISTRY.json` holds one entry per port:

```json
{
  "name": "butler-sdk-godot",
  "repo": "https://github.com/someone/butler-sdk-godot",
  "engines": ["Godot 4.4"],
  "language": "GDScript",
  "spec_version": "2.0.0",
  "conformance_run": "https://github.com/someone/butler-sdk-godot/actions/runs/123456789",
  "maintainer": "@someone"
}
```

## Getting listed

1. Run the fixtures in [`conformance/`](../conformance) in your CI against the current spec version.
2. Open an issue with the "List a community SDK" form, or a pull request adding your entry.
3. A maintainer checks the run and the naming rules in [CONTRIBUTING.md](../CONTRIBUTING.md).

Listings are re-checked when the spec gets a new minor version. A port whose run stays red for 30 days is removed
from the list, and can come back once it passes again.

Community ports are not reviewed for security by The Indie Accord. Check a port before shipping it.
