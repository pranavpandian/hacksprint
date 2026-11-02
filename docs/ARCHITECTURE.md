# Architecture

## Current prototype

The Electron renderer uses semantic views, adjustable presentation, local preferences, sample captions, form validation, and basic local checks. `electron/main.cjs` calls local Ollama and validates proposed actions; `electron/preload.cjs` exposes only narrow IPC methods. The screen helper captures a user-selected display, sends a still image to local Moondream, and requires approval before mouse or keyboard input. `browser-extension/` offers user-invoked page readability controls. The camera preview is local only. The local vision model is for screen/UI understanding; no sign-language classifier or licensed sign dataset is included.

## Boundaries for future phases

Add local offline speech recognition and translation models behind independent providers. Add an on-device hand-landmark runtime and separately evaluated, licensed sign vocabulary classifier; do not conflate gesture classification with language translation. Sign packs must identify language, license, provenance, vocabulary, limitations, and held-out signer evaluation. For Electron, use isolated context and a narrow validated preload bridge.

## Current limitations

The Electron app is now configured, but the NSIS installer was not generated in the earlier build. Moondream requires separate Ollama installation and model download. There is no axe-core integration, speech model, translation model, or sign-language classifier.
