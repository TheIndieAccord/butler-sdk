# Troubleshooting your first integration

Start with the HTTP status, response body, endpoint and environment. Keep credentials out of screenshots, logs and support reports. The ingest token appears in the request URL, so redact the query string too.

| Symptom | Check next |
|---|---|
| An SDK import or install does not work | Read the package status first. The current package docs describe planned APIs; use the [HTTP path](quickstart-raw-http.md) until a release is available. |
| `401` or `403` from Doorman | Confirm both publishable key parts belong to this integration and environment. Do not retry in a tight loop. SDK behavior is to stop sending for that session. |
| `400` or an event marked `rejected` | Read the error and compare the payload with the contract. Correct the data before sending again. A successful batch HTTP response can still contain rejected items. |
| `429` | Honor `Retry-After`; preserve event ids on retry. Avoid one request per frame. |
| Network failure or `5xx` | Use bounded retries with backoff and jitter. A timeout does not prove that the event was not stored. Reuse its event id. |
| Batch endpoint returns `404` | The deployed gateway may predate batching. Follow the [gateway contract](../spec/doorman.openapi.json) fallback to single-event delivery. |
| `status: "duplicate"` | That event id was already received. Use a fresh id for a new event, the same id for a retry. |
| An accepted event is not visible | Check the selected game, environment, time range and event timestamp in Backstairs. Capture the response and event id before escalating; do not assume a dashboard refresh is immediate. |
| No requests leave the game | Check consent, remote `enabled`, sampling and whether initialization actually ran. Planned SDK behavior and handwritten HTTP code are different implementations. |
| Browser request fails but curl works | Inspect the browser network panel and preflight response. Confirm the deployed gateway allows your origin and required headers. `no-cors` does not fix authenticated JSON requests. |
| Sign-in returns a state or issuer mismatch | Discard the callback and restart sign-in. Check that the callback and stored transaction belong to the same environment and browser session. Do not remove the checks. |
| `403 PLAYER_NOT_LINKED` or `SCOPE_NOT_GRANTED` | Check the player's game approval and the requested scopes. Follow the recovery steps in the [server guide](guides/game-server.md). |

## Ask for help with a small reproduction

Include your engine/runtime, package version (or "raw HTTP"), staging or production, route without credentials, status, redacted response, approximate time and steps to reproduce. Include a request id if the response provides one. Replace player identifiers and personal data with placeholders.

Use the repository's bug-report template or the contact in [contributing](../CONTRIBUTING.md). For a suspected vulnerability, follow [security reporting](../SECURITY.md) instead of opening a public issue.
