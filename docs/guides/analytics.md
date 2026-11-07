# Analytics

Butler Analytics stores named events from your game and shows them per game in Backstairs: funnels, retention,
release comparisons. An event is a name, a player or install id, and a small JSON object of details.

```json
{ "user_id": "install-3f2a9c", "event_name": "level_complete", "metadata": { "level": 3, "seconds": 182 } }
```

This guide shows the same ideas with and without an SDK. The HTTP details (field limits, status codes) are in the
[raw HTTP quickstart](../quickstart-raw-http.md).

## Naming events

Pick short, lower-case, past-tense names and keep the details in `metadata`:

| Good | Avoid | Why |
|---|---|---|
| `level_complete` with `{ "level": 3 }` | `level_3_complete` | One name per kind of thing keeps funnels simple. |
| `item_bought` with `{ "item": "lantern", "price": 40 }` | `Bought Lantern!!` | Names are matched exactly. |
| `run_ended` with `{ "reason": "died", "floor": 7 }` | one event per enemy hit | Send summaries, not every frame. |

Never put emails, real names or chat text in an event.

## Sending from the browser

No SDK, using `fetch`. `keepalive` lets the request finish even if the tab is closing. This example reads keys
the way a Vite project does; with plain `<script type="module">` and no bundler, paste the values in instead.

```js
// Publishable keys, so shipping them in the page is fine.
const DOORMAN = 'https://doorman.stg.theindieaccord.com'
const INGEST_TOKEN = import.meta.env.VITE_BUTLER_INGEST_TOKEN // or 'your-ingest-token'
const PROXY_KEY = import.meta.env.VITE_BUTLER_PROXY_KEY // or 'your-proxy-key'

// One id per install, kept in localStorage.
const installId = localStorage.getItem('butler_install') ?? crypto.randomUUID()
localStorage.setItem('butler_install', installId)

export function track(eventName, metadata = {}) {
  return fetch(`${DOORMAN}/game/events?ingest_token=${INGEST_TOKEN}`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', 'X-Proxy-Key': PROXY_KEY },
    body: JSON.stringify({
      user_id: installId,
      event_name: eventName,
      metadata,
      timestamp: new Date().toISOString(),
      event_id: crypto.randomUUID(), // lets Butler drop duplicates if this is ever retried
    }),
  }).catch(() => {}) // analytics should never break the game
}

track('game_started', { mode: 'story' })
```

With the TypeScript SDK (planned API), queueing, batching and retries will be handled for you:

```ts
import { Butler } from '@indieaccord/butler'

const butler = Butler.init({
  env: 'staging',
  ingest: { ingestToken: import.meta.env.VITE_BUTLER_INGEST_TOKEN, proxyKey: import.meta.env.VITE_BUTLER_PROXY_KEY },
  build: '1.4.0',          // lets you turn analytics off for one build from Backstairs
  consent: 'required',     // nothing is sent until setConsent(true)
})

// Later, from your settings screen:
butler.analytics.setConsent(true)

butler.analytics.track('run_ended', { reason: 'died', floor: 7, seconds: 412 })
```

## Sending from Unity

No SDK, a coroutine with `UnityWebRequest` (works in WebGL builds too). It keeps a random id per install and
builds the JSON with escaping, so names and values with quotes cannot break the request:

```csharp
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

public class SimpleAnalytics : MonoBehaviour
{
    // Publishable keys from Backstairs. Safe to ship.
    [SerializeField] string ingestToken;
    [SerializeField] string proxyKey;
    const string Doorman = "https://doorman.stg.theindieaccord.com";

    // A random id created on first launch. Reinstalling the game makes a new one.
    static string InstallId
    {
        get
        {
            if (!PlayerPrefs.HasKey("butler_install"))
                PlayerPrefs.SetString("butler_install", System.Guid.NewGuid().ToString());
            return PlayerPrefs.GetString("butler_install");
        }
    }

    // Track("boss_defeated", new Dictionary<string, object> { { "boss", "hollower" }, { "attempts", 4 } })
    public void Track(string eventName, Dictionary<string, object> details = null)
    {
        var json = new StringBuilder("{");
        json.Append("\"user_id\":").Append(Quote(InstallId));
        json.Append(",\"event_name\":").Append(Quote(eventName));
        json.Append(",\"event_id\":").Append(Quote(System.Guid.NewGuid().ToString()));
        json.Append(",\"metadata\":{");
        var first = true;
        foreach (var pair in details ?? new Dictionary<string, object>())
        {
            if (!first) json.Append(',');
            first = false;
            json.Append(Quote(pair.Key)).Append(':').Append(Value(pair.Value));
        }
        json.Append("}}");
        StartCoroutine(Send(json.ToString()));
    }

    IEnumerator Send(string body)
    {
        using var req = new UnityWebRequest($"{Doorman}/game/events?ingest_token={ingestToken}", "POST");
        req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.SetRequestHeader("X-Proxy-Key", proxyKey);
        yield return req.SendWebRequest();
        // Failures are ignored here. A real game would queue and retry (the SDK does).
    }

    // Numbers and true/false as JSON values, everything else as an escaped string.
    static string Value(object v) => v switch
    {
        null => "null",
        bool b => b ? "true" : "false",
        int or long or float or double => System.Convert.ToString(v, CultureInfo.InvariantCulture),
        _ => Quote(v.ToString()),
    };

    static string Quote(string s)
    {
        var sb = new StringBuilder("\"");
        foreach (var c in s)
        {
            switch (c)
            {
                case '"': sb.Append("\\\""); break;
                case '\\': sb.Append("\\\\"); break;
                case '\n': sb.Append("\\n"); break;
                case '\r': sb.Append("\\r"); break;
                case '\t': sb.Append("\\t"); break;
                default:
                    if (c < ' ') sb.Append("\\u").Append(((int)c).ToString("x4"));
                    else sb.Append(c);
                    break;
            }
        }
        return sb.Append('"').ToString();
    }
}
```

With the Unity SDK (planned API):

```csharp
Butler.Initialize(butlerSettings);                // ButlerSettings asset holds the keys
Butler.Analytics.SetConsent(playerAgreed);        // from your consent prompt
Butler.Analytics.Track("item_bought", new Props { { "item", "lantern" }, { "price", 40 } });
```

## Sending from GameMaker

No SDK, using `http_request` and the Async HTTP event:

```gml
/// Create event of obj_analytics
doorman = "https://doorman.stg.theindieaccord.com";
ingest_token = "your-ingest-token";   // publishable, safe to ship
proxy_key = "your-proxy-key";

// One id per install, saved the first time the game runs.
ini_open("butler.ini");
install_id = ini_read_string("butler", "install", "");
if (install_id == "") {
    install_id = sha1_string_utf8(string(date_current_datetime()) + string(random(1000000)));
    ini_write_string("butler", "install", install_id);
}
ini_close();

/// A script: analytics_track(name, details_struct)
function analytics_track(_name, _details) {
    var _body = json_stringify({
        user_id: obj_analytics.install_id,
        event_name: _name,
        metadata: _details
    });
    var _headers = ds_map_create();
    ds_map_add(_headers, "Content-Type", "application/json");
    ds_map_add(_headers, "X-Proxy-Key", obj_analytics.proxy_key);
    http_request(obj_analytics.doorman + "/game/events?ingest_token=" + obj_analytics.ingest_token,
                 "POST", _headers, _body);
    ds_map_destroy(_headers);
}

analytics_track("boss_defeated", { boss: "hollower", attempts: 4 });
```

With the GameMaker extension (planned API), you will call `butler_step()` once per frame and the extension will
handle the queue and the Async HTTP results:

```gml
butler_init({ ingest_token: "your-ingest-token", proxy_key: "your-proxy-key", build: "1.0.2" });
butler_set_consent(true);
butler_track("boss_defeated", { boss: "hollower", attempts: 4 });
```

## Sending in batches

Up to 100 events in one request to `/game/events/batch`. Each event gets its own result, so one bad event does
not lose the others:

```json
{ "accepted": 2, "duplicates": 1, "rejected": 1,
  "results": [
    { "index": 0, "accepted": true,  "status": "accepted",  "duplicate": false },
    { "index": 1, "accepted": true,  "status": "accepted",  "duplicate": false },
    { "index": 2, "accepted": true,  "status": "duplicate", "duplicate": true },
    { "index": 3, "accepted": false, "status": "rejected",  "duplicate": false, "error": "metadata must be 8 KB or smaller" } ] }
```

Retry the whole batch on 429 or 5xx with the same `event_id`s. Do not retry rejected events.

## Remote config: the kill switch and sampling

`GET /game/config` tells a build whether to send and how much:

```json
{ "enabled": true, "sample_rates": { "footstep": 0.1, "frame_time": 0.01 }, "max_batch": 100, "ttl_s": 300 }
```

- `enabled: false`: stop sending. Use it in Backstairs if a build is sending something it should not.
- `sample_rates`: keep only that share of an event name. `0.1` keeps about one in ten.
- `max_batch`: largest batch to send.
- `ttl_s`: ask again after this many seconds.

The SDKs will read this for you. Without an SDK, fetch it at start-up and again once `ttl_s` seconds have passed.

## Sending from a server

Servers can skip Doorman and send straight to Butler with their own credential. This works for every studio
kind. See [Sending analytics from your server](game-server.md#sending-analytics-from-your-server).
