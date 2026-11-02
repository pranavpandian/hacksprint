# BridgeUX handoff for future AI work

This file is a practical context handoff for an AI agent or developer continuing BridgeUX. Read it together with `README.md`, `docs/ARCHITECTURE.md`, `PRIVACY.md`, `SECURITY.md`, and `models/README.md`.

## Goal and product shape

BridgeUX is a Windows Electron accessibility prototype. The intended experience is voice-first, Hindi/English, and usable by people who may be unfamiliar with computers. It combines local speech recognition and neural speech output, a local text assistant, user-selected screen reading/assistance, and an optional camera gesture demo. The UI should remain large, clear, keyboard accessible, and plain spoken.

Be precise about current capabilities: the gesture feature recognizes seven canned static MediaPipe gesture labels. It is not ASL/ISL or sign-language translation. Screen help uses local Ollama models and offers limited, user-approved actions. Do not represent either feature as a fully autonomous general browser agent or a screen-reader replacement.

## Repository and run/build commands

- Repository: `https://github.com/pranavpandian/hacksprint.git`
- Branch currently used: `main`
- Electron entry point: `electron/main.cjs`
- Install JavaScript dependencies: `npm ci`
- Run the app from source: `npm start`
- Build x64 Windows NSIS installer: `npm run dist:win`
- Build output folder: ignored `release/`
- `node_modules/`, `release/`, downloaded model assets, and `OllamaSetup.exe` are ignored by Git. The source repository does not contain the installer or model weights.

The latest local build before this handoff was `release/BridgeUX Setup 0.1.0.exe` (about 730 MB, built 2026-11-03 local time). It was not committed. Rebuild after any source edits and test the new packaged installer, rather than relying on an older installed copy.

## Local model stack

- ASR: sherpa-onnx Nemotron 3.5 streaming multilingual 0.6B, configured for Hindi and English language detection. It runs in `electron/speech-asr-worker.cjs`.
- TTS: local English Piper `en_US-lessac-medium` and Hindi Piper `hi_IN-pratham-medium`, using sherpa-onnx/Piper phonemizer in `electron/speech-tts-worker.cjs`.
- General assistant: Ollama `qwen2.5:1.5b-instruct` on the local machine.
- Screen vision: Ollama `qwen3-vl:2b` on the local machine.
- Hand gestures: MediaPipe Tasks Vision Gesture Recognizer `.task` model, with the four MediaPipe WASM loader/runtime files shipped separately in packaged app resources.

Large model assets are downloaded locally and not stored in Git. See the README's **Local model setup** section for exact upstream URLs, archive extraction commands, filenames, Ollama pull commands, hardware/storage notes, and installer details. Ollama models are separate from packaged assets. The app expects Ollama at `127.0.0.1`.

## Architecture map

- `index.html`, `styles.css`, `voice.css`: accessible UI and layout.
- `app.js`: UI actions, local model state, general assistant interactions.
- `local.js`: local Ollama assistant requests and Ollama/model status.
- `local-screen.js`: display selection, screen capture request flow, local visual assistant, and approved actions.
- `voice.js`: microphone permission/start/stop, audio worklet wiring, Hindi/English transcript handling, intent routing, and streamed TTS playback.
- `speech-capture.js`: AudioWorklet microphone resampling/capture path.
- `sign-vision.js`: local MediaPipe gesture model and camera lifecycle.
- `electron/main.cjs`: BrowserWindow security, app-local asset protocol, screen capture, narrow IPC handlers, workers, Ollama access, and approval-gated desktop action handling.
- `electron/preload.cjs`: the constrained `window.bridgeux` renderer API.
- `electron/speech-asr-worker.cjs`: streaming local ASR.
- `electron/speech-tts-worker.cjs`: local queued TTS generation.
- `browser-extension/`: optional Chrome page helper, not bundled into Electron installer.

Review the security model before changing IPC: Electron uses context isolation, sandboxing, no Node integration in renderer, CSP, and constrained preload methods. Screen/click/type/key actions must stay narrowly validated and require explicit user confirmation.

## Pending changes in the current handoff

Seven tracked files were modified and still needed a commit at handoff:

1. `electron/main.cjs`: adds ASR pause IPC and serves MediaPipe WASM from `process.resourcesPath/vision/wasm` in packaged builds; development resolves WASM from `node_modules`.
2. `electron/preload.cjs`: exposes `pauseSpeech()` to renderer.
3. `electron/speech-asr-worker.cjs`: supports pausing by discarding the partial ASR stream during local voice playback.
4. `electron/speech-tts-worker.cjs`: copies native-addon audio samples into a transferable `Float32Array` and includes a stack/string in worker errors. This was intended to avoid buffer-transfer problems during Piper async generation and improve diagnosis.
5. `package.json`: copies four MediaPipe wasm/js files as packaged resources under `vision/wasm`.
6. `sign-vision.js`: exposes more detailed local gesture model/camera errors.
7. `voice.js`: coordinates TTS request IDs/queue and streamed audio playback with mic suspension and ASR pausing; resumes ASR after playback; supports voice-driven screen helper requests and English/Hindi responses.

These edits had been syntax-checked earlier, and the 730 MB installer was successfully built. No claim is made here that the final installed-app interaction was verified.

## Known unresolved verification items

An interactive test of the packaged app was interrupted by the user pressing Escape, and Computer Use explicitly instructed the agent to stop. Do not report these checks as passed until they are performed again:

1. Install the newest `release/BridgeUX Setup 0.1.0.exe`, launch it, and confirm the correct updated executable opens.
2. Stop microphone listening while doing other tests to avoid its auto-start/voice-intent loop.
3. In the app, choose **Check gesture model**. Earlier installed build showed `Gesture model could not load: undefined` (the old error did not expose enough detail). The new build ships MediaPipe WASM outside ASAR to address a suspected packaged-asset resolution issue. Confirm status becomes “Gesture model ready”, start camera, and check an actual hand produces a recognized supported label. Stop camera after verification. Camera test permission was explicitly granted by the user previously.
4. Test neural voice through the installed Electron UI in both English and Hindi. Direct worker/Node probes produced audio, but app UI previously showed `TTS settlement failed`; this remains unresolved until reproduced/fixed and one utterance visibly completes and is audible. The patched worker now returns a detailed error stack. If still failing, capture exact status/stack and fix the actual failure path, then rebuild and repeat.
5. Test live Hindi and English ASR transcripts without TTS echo, and verify an assistant request is handled by local Qwen and spoken once.
6. Test local screen helper against benign nonsensitive content, including one screen summary and the approval flow for a supported action. Do not use a screen containing private material during capture.
7. Confirm no microphone/camera is active after stopping the respective feature.

No web/browser-based or cloud AI APIs should be introduced. Preserve the user-started capture and local-only design.

## Git handoff checklist

The user authorized committing and pushing this work to the configured GitHub repository. Before commit, inspect `git status` and diff. Add the context handoff plus the seven tracked source changes. Do not add ignored model files, `node_modules`, local voice-test profiles, Ollama installer, or generated `release/` artifacts. Push to `origin main`. Record the resulting commit hash and push result for the user.

Suggested commit subject: `Fix local voice coordination and package gesture runtime`.

## Continuation guidance

Make one narrow fix per unresolved runtime issue, rebuild the installer, and repeat the installed-app test that exposed it. Distinguish source-level checks from packaged-app behavior. Update this handoff and README/architecture docs when actual behavior changes. Keep limitations honest and add no claims of full sign-language understanding unless a real language-specific model and rigorous evaluation are implemented.
