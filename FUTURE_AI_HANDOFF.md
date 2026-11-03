# BridgeUX project handoff

## Product

BridgeUX is a Windows Electron accessibility prototype. It provides local Hindi/English speech input and read-aloud, an Ollama text assistant, user-started screen reading and approval-gated PC actions, and an experimental ASL video-to-text demo. It is not a screen-reader replacement, a certified interpreter, or an autonomous computer agent.

## Run and build

- Install dependencies: `npm ci`
- Run from source: `npm start`
- Build the x64 Windows installer: `npm run dist:win`
- The build output is `release/`, which is ignored by Git.
- Large ASR/TTS model assets are excluded from Git. Follow `README.md` for downloads and exact paths.
- Ollama is installed separately with `qwen2.5:1.5b-instruct` and `qwen3-vl:2b`.

## Main files

- `index.html`, `styles.css`, `voice.css`: accessible app interface.
- `app.js`: preferences, captions demo, read-aloud, and local page checks.
- `local.js`: local assistant and model status.
- `local-screen.js`: display selection, screen capture, live help, and approval flow.
- `sign-vision.js`: user-started camera frame sampling, experimental local ASL interpretation, and reviewed text entry.
- `voice.js`, `speech-capture.js`: speech UI and microphone capture.
- `electron/main.cjs`, `electron/preload.cjs`: local inference, capture, workers, and validated IPC.
- `electron/speech-asr-worker.cjs`, `electron/speech-tts-worker.cjs`: local speech engines.
- `server.py`, `browser-extension/`: optional local bridge and user-invoked Chrome helper.

## Product and safety constraints

- Keep all AI inference local. Do not add cloud AI, speech, telemetry, or screen-content APIs.
- Ask the user to start microphone, camera, or screen capture. Never save those recordings or snapshots.
- Keep desktop actions narrow, reversible where possible, and behind explicit user approval. Never submit, send, delete, purchase, or pay for a user.
- Qwen3-VL is a general vision model. The ASL feature is experimental and must not be described as accurate full ASL translation.
- Do not claim BridgeUX provides a complete screen reader or WCAG conformance. Test with assistive-technology users before making accessibility claims.
- Keep model licenses/provenance documented and do not commit model weights or private recordings.

## Current verification limits

Syntax and archive-content checks have passed for the latest screen prompt. A local synthetic image produced a partial OCR-style response. A complete packaged-app run and end-to-end camera, speech, screen-description, and approved-action test are still required before release.
