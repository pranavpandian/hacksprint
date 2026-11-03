# Architecture

## Current Electron prototype

- `electron/main.cjs` owns screen access and narrow IPC handlers. It reads the active window's controls through Windows UI Automation first and uses selected-display captures as visual fallback. It calls Ollama at `127.0.0.1` for Qwen2.5 and Hugging Face Qwen3-VL 4B. Optional hands-free mode plans up to six steps and rechecks after acting. For forms, it asks the user for each value and does not submit. Sending, deleting, purchasing, changing settings, and credential entry are blocked.
- `electron/preload.cjs` exposes the renderer to a limited, validated set of IPC functions. Electron runs with context isolation, sandboxing, disabled Node integration, and a restrictive content security policy.
- `electron/speech-asr-worker.cjs` streams microphone samples into the local Nemotron 3.5 streaming model through sherpa-onnx. First-run setup requires accessibility support and English/Hindi language choices; the selected language is pinned to each speech stream and used for local replies.
- `electron/speech-tts-worker.cjs` generates Hindi or English speech locally using Piper models through sherpa-onnx and the Piper phonemizer.
- `sign-vision.js` samples a short rolling buffer from the user-started camera and submits a few frames to local Qwen3-VL when asked. Results are spoken. It is a general vision model, not ASL-trained or certified. `gesture-control.js` uses local MediaPipe landmarks for pointer, pinch-click, and scroll controls.
- Explicit voice web searches send the spoken query to DuckDuckGo. The local assistant summarizes result snippets and the app shows source links; use provider pages for live booking details.
- `browser-extension/` provides user-invoked page readability and assistant support. It is optional and not bundled in the Electron installer.

## Model assets and packaging

Large ONNX and Piper assets are excluded from Git and downloaded separately. Ollama and its Qwen weights remain separate installs. See [the main README](../README.md#local-model-setup) for exact folders and setup commands. The optional Chrome extension also needs the local Python bridge started with `Start-BridgeUX.bat`.

## Known limits

This is a prototype, not an unrestricted autonomous agent, certified interpreter, or screen-reader replacement. Hands-free mode is off by default, requires explicit enabling, and performs at most six low-risk navigation/search steps per spoken request. The general vision model can misinterpret screens and signing; review important results. Screen actions are never allowed to submit forms, send messages, delete, purchase, change settings, or enter credentials.
