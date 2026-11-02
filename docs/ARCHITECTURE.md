# Architecture

## Current Electron prototype

- `electron/main.cjs` owns screen capture and narrow IPC handlers. It calls Ollama at `127.0.0.1` for the local Qwen2.5 assistant and Qwen3-VL screen understanding. Screen capture starts only after the user selects a display. Proposed click/type/key actions are validated and require user approval before execution.
- `electron/preload.cjs` exposes the renderer to a limited, validated set of IPC functions. Electron runs with context isolation, sandboxing, disabled Node integration, and a restrictive content security policy.
- `electron/speech-asr-worker.cjs` streams microphone samples into the local Nemotron 3.5 streaming model through sherpa-onnx. The current model configuration leaves language unset for automatic language detection; the app targets Hindi and English.
- `electron/speech-tts-worker.cjs` generates Hindi or English speech locally using Piper models through sherpa-onnx and the Piper phonemizer.
- `sign-vision.js` uses MediaPipe's local canned gesture recognizer when the user starts camera recognition. It labels seven common hand gestures and does not translate sign languages.
- `browser-extension/` provides user-invoked page readability and assistant support. It is optional and not bundled in the Electron installer.

## Model assets and packaging

Large ONNX, Piper, and MediaPipe assets are excluded from Git and downloaded separately. The NSIS build copies the assets present under `models/` into the installer. Ollama and its Qwen weights remain separate installs. See [the main README](../README.md#local-model-setup) for exact folders and setup commands.

## Known limits

This is a prototype, not a general-purpose autonomous agent or a screen-reader replacement. The screen model can make mistakes; the user must review suggestions and approve every supported OS action. The built-in MediaPipe labels are gestures, not a sign-language vocabulary. A future sign-language feature would need a language-specific, licensed dataset and classifier, plus evaluation across held-out signers, varied lighting, backgrounds, and signing styles. Do not present isolated pose labels as sign-language translation.
