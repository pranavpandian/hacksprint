# Privacy

BridgeUX stores accessibility display and onboarding preferences in this browser's local storage.  Sample captions do not use a microphone. Camera preview requires a user click and browser permission; video is displayed locally and stopped when the page closes. It is not recorded or uploaded.

The local assistant sends text and, after an explicit capture/live-help action, screen snapshots to Ollama at `127.0.0.1` only. Live help takes one frame about every 5 seconds while enabled. BridgeUX briefly minimizes during each capture; images stay in memory and are not written to disk. Stop live help at any time. The Chrome extension reads active-tab content only after the user clicks a button and can send that text to the same local assistant. This content may be sensitive; consider it before invoking the assistant. There are no cloud APIs, analytics, or telemetry. Clear browser site data to remove local preferences, or use Reset preferences in the app.


On first launch, BridgeUX asks whether to request microphone permission. If allowed, it opens the microphone briefly to verify permission, then immediately stops the stream. It does not record audio. A local speech-to-text model is not included, so voice commands and automatic listening are not active.
