# Architecture

## Current Electron prototype

- `electron/main.cjs` owns screen capture and narrow IPC handlers. It calls Ollama at `127.0.0.1` for the local Qwen2.5 assistant and Qwen3-VL screen understanding. Screen capture starts only after the user selects a display. A second model request is made only when the user's task explicitly asks for a supported safe action; click/type/key actions are validated and require user approval before execution. Submit, send, delete, purchase, payment, and similar tasks do not get action proposals.
- `electron/preload.cjs` exposes the renderer to a limited, validated set of IPC functions. Electron runs with context isolation, sandboxing, disabled Node integration, and a restrictive content security policy.
- `electron/speech-asr-worker.cjs` streams microphone samples into the local Nemotron 3.5 streaming model through sherpa-onnx. First-run setup requires accessibility support and English/Hindi language choices; the selected language is pinned to each speech stream and used for local replies.
- `electron/speech-tts-worker.cjs` generates Hindi or English speech locally using Piper models through sherpa-onnx and the Piper phonemizer.
- `sign-vision.js` samples a short rolling buffer from the user-started camera and submits a few frames to local Qwen3-VL when asked. It is a general vision model, not an ASL-trained or certified interpreter. Uncertain responses disable the typing button; otherwise the user must review and explicitly approve typing the result into the focused control.
- `browser-extension/` provides user-invoked page readability and assistant support. It is optional and not bundled in the Electron installer.

## Model assets and packaging

Large ONNX and Piper assets are excluded from Git and downloaded separately. Ollama and its Qwen weights remain separate installs. See [the main README](../README.md#local-model-setup) for exact folders and setup commands. The optional Chrome extension also needs the local Python bridge started with `Start-BridgeUX.bat`.

## Known limits

This is a prototype, not a general-purpose autonomous agent, certified interpreter, or screen-reader replacement. The general vision model can misinterpret signing; review translations before use. The user must explicitly approve typing translated text or any supported OS action.
