# com.indieaccord.butler

Unity SDK for Butler. Unity 2022.3 LTS or newer, including WebGL.

> Status: in development. The API below is the planned 2.0 surface.

## Install (after the first release)

Package Manager > Add package from git URL:

```
https://github.com/TheIndieAccord/butler-sdk.git#upm/v2.0.0
```

Or with OpenUPM:

```bash
openupm add com.indieaccord.butler
```

## Set up

1. Assets > Create > Butler > Settings. Fill in the publishable key from Backstairs, and the OAuth client id if
   you use sign-in.
2. Initialize once, early:

```csharp
using IndieAccord.Butler;
using UnityEngine;

public class Boot : MonoBehaviour
{
    [SerializeField] ButlerSettings butlerSettings;

    void Awake()
    {
        Butler.Initialize(butlerSettings);
        Butler.Analytics.SetConsent(PlayerPrefs.GetInt("analytics_ok", 0) == 1);
    }
}
```

## Track events

```csharp
Butler.Analytics.Track("level_complete", new Props { { "level", 3 }, { "seconds", 182 } });
Butler.Analytics.Track("run_ended", new Props { { "reason", "died" }, { "floor", 7 } });
Butler.Analytics.Track("settings_opened");   // details are optional
```

Events will be queued on disk, batched and retried. Nothing is sent before consent, and `SetConsent(false)`
deletes the queue.

## Sign a player in (desktop and WebGL)

```csharp
async void OnSignInClicked()
{
    var player = await Butler.Auth.SignInAsync();
    if (player != null) nameLabel.text = player.DisplayName;
}
```

Desktop builds open the system browser and listen on a local port for the result. WebGL builds redirect the page.

## What it is built from

The engine-free core (`Runtime/Core`) has no `UnityEngine` references and is tested outside Unity against the
[conformance fixtures](../../conformance). The Unity layer adds `UnityWebRequest` transport, storage and the
settings asset. JSON is handled without reflection, so IL2CPP and code stripping are safe.
