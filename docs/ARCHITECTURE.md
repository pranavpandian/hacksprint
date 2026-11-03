# Architecture

## Current Electron prototype

- `electron/main.cjs` owns screen access, the persistent voice-driven agent loop, and a loopback-only browser bridge. The paired Chrome/Brave extension exposes the active tab DOM for fast page reading and click/fill actions; Windows UI Automation controls desktop apps, with screenshots as fallback. Ollama serves the single Qwen3.5 4B assistant/vision model. The user can stop agent runs at any time. Google Forms submit only after an explicit request.
- `electron/preload.cjs` exposes the renderer to a limited, validated set of IPC functions. Electron runs with context isolation, sandboxing, disabled Node integration, and a restrictive content security policy.
- `electron/speech-asr-worker.cjs` streams microphone samples into the local Nemotron 3.5 streaming model through sherpa-onnx. First-run setup requires accessibility support and English/Hindi language choices; the selected language is pinned to each speech stream and used for local replies.
- `electron/speech-tts-worker.cjs` generates Hindi or English speech locally using Piper models through sherpa-onnx and the Piper phonemizer.
- `sign-vision.js` samples a short rolling buffer from the user-started camera and submits a few frames to local Qwen3-VL when asked. Results are spoken. It is a general vision model, not ASL-trained or certified. `gesture-control.js` uses local MediaPipe landmarks for pointer, pinch-click, and scroll controls.
- Explicit voice web searches send the spoken query to DuckDuckGo. The local assistant summarizes result snippets and the app shows source links; use provider pages for live booking details.
- `browser-extension/` attaches a Chrome/Brave MV3 service worker to a loopback-only Electron browser bridge. It exposes active-tab DOM snapshots and click/fill actions to the local agent. A one-time random pairing key authorizes the extension.

## Model assets and packaging

Large ONNX and Piper assets are excluded from Git and downloaded separately. Ollama and its Qwen weights remain separate installs. See [the main README](../README.md#local-model-setup) for exact folders and setup commands. The browser extension pairs with the Electron loopback service using a local pairing key.

## Known limits

This is a prototype, not a certified interpreter or screen-reader replacement. The agent runs a bounded sequence of up to 24 actions for each spoken request and can be stopped at any time. The local vision model can misread visual-only screens and signing; review important results. Form submission requires an explicit request.
