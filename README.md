# BridgeUX

BridgeUX is a local-first Electron accessibility helper. It can listen to Hindi and English, answer spoken requests, read a screen the user shares, and speak its replies. Speech, screen, and gesture processing runs on the device; AI requests use local models only.

## Features

- Nemotron streaming speech recognition with automatic Hindi/English detection.
- Piper neural English and Hindi voices for replies and read-aloud.
- Qwen2.5 1.5B for the local assistant and Qwen3-VL 2B for screen understanding through Ollama.
- Screen actions are proposed for approval; Enter is blocked unless the user clearly asks to press it.
- On-device MediaPipe recognition for seven common static hand gestures. This is a limited gesture demo, not full sign-language translation.
- Optional Chrome helper, captions demo, text scaling, contrast, spacing, and theme controls.

## Run and build

Install Node.js and npm, install the model files described in [models/README.md](models/README.md), then run:

```powershell
npm install
npm start
```

Build the Windows x64 installer with:

```powershell
npm run dist:win
```

The installer bundles the speech, voice, and gesture assets when those files are present in `models/`. It expects Ollama to be installed separately and the two Ollama models to be available in the current Windows account. BridgeUX starts the local Ollama service when needed.

## Local AI models

Install Ollama, then run:

```powershell
ollama pull qwen2.5:1.5b-instruct
ollama pull qwen3-vl:2b
```

No cloud AI or speech APIs are used. The models and screen images are processed locally.

## Chrome helper

In Chrome, open `chrome://extensions`, enable Developer mode, select **Load unpacked**, and choose `browser-extension`. The extension reads a page only after you invoke its helper button.

## Privacy and limits

The microphone prompt appears before voice input is enabled. Microphone audio is processed locally and is not saved. Screen capture is off until the user chooses a display. Camera access is off until the user starts gesture detection. The gesture model recognizes a small fixed list of static hand poses; it does not translate a sign language.
