# butler.yymps

GameMaker extension for Butler Analytics. GMS2 runtime.

> Status: planned. Analytics only in 2.0; player sign-in needs a device-code flow that Butler will add later.

## Install (after the first release)

Download `butler.yymps` from the latest release, then Tools > Import Local Package.

## Use

```gml
/// Create event of a persistent controller object
butler_init({
    ingest_token: "your-ingest-token",   // publishable, safe to ship
    proxy_key: "your-proxy-key",
    build: "1.0.2",
    consent: "required"
});

/// Step event of the same object
butler_step();   // sends queued events and handles retries

/// Async HTTP event of the same object
butler_async_http();   // lets the extension read its own responses

/// Anywhere
butler_set_consent(true);
butler_track("boss_defeated", { boss: "hollower", attempts: 4 });
butler_track("menu_opened");
```

`butler_flush()` sends immediately, for example before the game closes.
