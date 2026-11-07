# Documentation that works without an assistant

The first reader should be able to choose a path, make one request, recognize success and recover from a common error without reading the implementation.

## Keep the reading path short

- The root README explains the product, package status and next step.
- [Start here](../start-here.md) selects a single task and explains prerequisites and success.
- Guides contain the procedure. Concepts explain the vocabulary. Specs hold exact field definitions.
- Maintainer decisions and release mechanics stay out of the first-run path.

Do not repeat an API example across several pages unless it serves a different purpose. Link to the source procedure so a changed endpoint has fewer places to drift.

## Acceptance checklist

- [ ] Every installation command names an available release, or is explicitly labeled as future usage.
- [ ] Planned behavior is identified next to the example, including when a snippet is copied out of context.
- [ ] Each quickstart states access requirements, environment, required values, expected response and next step.
- [ ] Examples match the checked-in contract and have been exercised against a suitable local fixture or staging service before being called verified.
- [ ] Samples use serializers, handle HTTP failures and avoid persistent hardware identifiers for analytics.
- [ ] Server examples explain how the authenticated session is bound to `player_id` before a trusted write.
- [ ] A human new to Butler can complete one integration without AI assistance; record where they got stuck.
- [ ] Relative links and docs style pass `node scripts/check-docs.mjs`.
- [ ] Each diagram has useful alt text, a nearby text equivalent and readable labels at normal viewing size.

## Visual language

The SVGs in [assets](../assets/README.md) use Butler's Kept House palette: warm ink, linen and brass. Use quiet architectural linework and plain labels. Decoration should never obscure a credential boundary or imply a feature is released.

Edit the SVG source directly. Keep text as text, include a `viewBox`, `title` and `desc`, and avoid scripts, external fonts, remote images or embedded credentials. Do not rely on color alone to distinguish flows. Review a rendered export whenever labels or geometry change.

When the contract changes, update the relevant diagram and its text explanation together. Check the routes and tiers against both public specs; a diagram is an explanation, not another API specification.
