# BridgeUX

BridgeUX is a Windows desktop accessibility prototype that combines voice interaction, screen reading, and experimental ASL video-to-text. Its AI and speech inference run locally: prompts and short camera clips go to Ollama on `127.0.0.1`; audio and video are processed on the device.

> **Current scope:** BridgeUX is an accessibility prototype, not a replacement for a screen reader or interpreter. The agent reads the active app's Windows accessibility tree on each action, avoiding screenshots when the app exposes page content. It can submit a Google Form only when the user explicitly asks. The ASL feature classifies basic static fingerspelled letters and digits locally; it does not translate ASL words or sentences.

## What it includes

- Streaming English or Hindi speech-to-text through the local sherpa-onnx Nemotron 3.5 model. First launch requires the user to choose accessibility supports and a preferred language.
- Local English and Hindi Piper neural voices for replies and read-aloud.
- Local Ollama model selection uses installed compatible models: it prefers Qwen3.5 4B or Qwen3-VL for both assistant and vision, then can use Qwen2.5 for text and Moondream for vision. It no longer assumes one exact model tag is installed.
- A local OpenClaw-style agent loop. Pair the included Chrome/Brave extension once to read and act on the active tab DOM; Windows UI Automation controls other desktop apps. Screenshots are only the fallback for visual-only apps.
- Explicit spoken PC tasks start a one-shot agent automatically, with no display selection when Windows exposes accessible controls. For longer tasks, enable hands-free mode once; each step reads the current browser/app accessibility tree. It asks only for missing form values and can submit a Google Form after an explicit request. Say “stop agent” or press **Stop agent** to interrupt.
- Voice commands such as “open example.com”, “visit Wikipedia”, or “go to the NASA website” open that site in the default browser. It resolves named sites with web search and supports HTTP/HTTPS links.
- Spoken web searches for flights, weather, news, and other current information. BridgeUX sends the spoken search query to DuckDuckGo, then summarizes result snippets locally and displays source links. Check provider pages for live prices and availability.
- A user-started camera view with a compact ASL fingerspelling landmark model for static A–Z and 0–9 handshapes. It can match the spelled sequences `HELLO`, `HOW ARE YOU`, and `THANK YOU` and speak the matching phrase. Those shortcuts match spelled letters; they are not trained ASL phrase translation. J/Z motion and ASL grammar/sentence translation are not supported. Optional MediaPipe hand controls move the pointer, pinch to click, and use a V-sign swipe to scroll; GPU delegate is used when available.
- Adjustable text size, contrast/theme, spacing, live system captions, and an optional Chrome helper.
- Windows live captions for computer playback audio, shown in a bottom-of-screen caption bar and the floating controls. Click **Live captions** to start and **Stop** to end; audio is processed on-device. The tiny display video track required by the desktop-audio API stays active at 1 fps during captions; no video frames are stored or passed to the speech model. Captions recognize the selected English or Hindi speech language; they do not translate audio between languages.

See [Privacy](PRIVACY.md), [Security](SECURITY.md), [architecture](docs/ARCHITECTURE.md), and [model details](models/README.md) for limits and implementation notes.

## How to use BridgeUX

### Speak to BridgeUX

1. Finish the required setup by choosing support preferences and English or Hindi.
2. Choose **Enable microphone** in the welcome prompt, or **Start listening** in the Speak to BridgeUX section.
3. If Windows blocks the microphone, choose **Open Windows microphone settings** and turn on microphone access for desktop apps. Return to BridgeUX and start listening again.
4. Speak a request such as “open YouTube”, “read my screen”, or “fill this form”. BridgeUX shows the recognized words, routes screen and browser tasks to the agent, then reads the result aloud. Use **Stop listening** or say “stop listening” to stop microphone capture.

### Turn on live captions

1. Start audio playback in the app you want captioned.
2. In BridgeUX, select **Start live captions**. Allow the display-audio request if Windows shows it.
3. Read captions in the BridgeUX window or the floating caption bar. Captions follow the English or Hindi language selected during setup; they do not translate between languages.
4. Select **Stop captions** to end system-audio capture. If BridgeUX reports no system audio, resume playback and try starting captions again.

### Recognize ASL fingerspelling

1. Open **Recognize basic ASL letters and numbers**, select **Start camera**, then **Start ASL recognition**.
2. Hold one static letter or digit clearly in view. The letter model runs on-device; MediaPipe uses the GPU hand-tracking delegate when it is available.
3. Spell `HELLO`, `HOW ARE YOU`, or `THANK YOU` one character at a time. Select **Add space** between words. When a sequence matches one of these shortcuts, BridgeUX shows **Phrase match**.
4. Select **Read recognized text aloud** to hear the matching phrase (or the raw recognized spelling), and **Clear text** to start over. The feature recognizes fingerspelling; it does not interpret natural ASL signing or sentence grammar.

### Fill a web form

1. Load and connect the BridgeUX browser extension once using the steps below. Open the form page in that browser.
2. Start BridgeUX voice listening and say **“Fill this form”** or **“Fill this form with my details”**. For a link, say the link in your request or open it first in the browser.
3. BridgeUX reads visible field labels and asks for each missing value. Say the value exactly as it should appear. It fills only visible, empty, non-password fields; it does not guess personal details or enter passwords.
4. Review the completed page. BridgeUX leaves ordinary forms unsubmitted. It submits only a Google Form when you explicitly ask it to submit that Google Form.

If the form does not expose labels or accessible fields to the browser, BridgeUX may not be able to identify every field. Keep the form tab active and make sure the extension shows **Connected**.

## Requirements

### For the Windows app

- Windows 10 or 11, 64-bit x64.
- A microphone for voice input and speakers/headphones for spoken replies. Camera use is optional.
- Ollama for the local assistant and visual screen understanding. It is installed separately from BridgeUX.
- Internet access for the first-time setup: application dependencies and model weights are downloaded once. After setup, inference uses the local models.
- Storage for the application and model weights. The Ollama assistant and 4B vision model download roughly 4 GB; reserve at least 8 GB of free disk space for models, npm dependencies, and build/cache files.
- 8 GB RAM is a practical minimum; 16 GB is recommended when running both AI models. A compatible GPU can speed up Ollama inference but is optional; the app's speech recognition and neural voices use CPU inference.

These are practical recommendations, not a hardware compatibility guarantee. Performance depends on the CPU/GPU, available memory, screen size, and concurrent applications.

### To run from source or build the installer

- Git (to clone the repository).
- Node.js 22 LTS or newer with npm.
- Ollama for Windows.
- The local assets listed in [Local model setup](#local-model-setup). They are large and are intentionally excluded from Git.
- Visual Studio Build Tools with the **Desktop development with C++** workload only if npm reports that a native dependency needs compiling and no compatible prebuilt binary is available.

## Install and run on Windows

### Option A: use a packaged installer

1. Download the latest `BridgeUX Setup <version>.exe` from the project's GitHub Releases, if a release is available.
2. Run the installer and follow its prompts. The installer includes the Nemotron speech model and Piper voices when they were present during packaging.
3. Install [Ollama for Windows](https://ollama.com/download/windows) if it is not already installed.
4. In the BridgeUX folder, run `Install-Local-Vision-Model.bat`, or open PowerShell and run:

   ```powershell
   ollama pull qwen3-vl:4b-instruct
   ```

5. Start BridgeUX and complete the required support and preferred-language setup. Choose whether to enable the microphone when prompted; speech follows the selected English or Hindi language. Select a display to analyze screen content. Camera permission is only needed for ASL spelling or hand controls.

If the repository has no published GitHub Release yet, use Option B to build the app, or ask the project maintainer for the installer.

### Option B: run the source checkout

In PowerShell:

```powershell
git clone https://github.com/pranavpandian/hacksprint.git
cd hacksprint
npm ci
```

Download and place the model files using [Local model setup](#local-model-setup), then download the local Ollama models:

```powershell
ollama pull qwen3-vl:4b-instruct
```

Launch BridgeUX:

```powershell
npm start
```

Ollama normally runs as a local background service. BridgeUX tries to start it if it is installed but not already running, then selects compatible installed models automatically. On this project PC, it uses `moondream:latest` for screen images and `qwen2.5:1.5b-instruct` for agent decisions; the unused `qwen3-vl:2b` tag is a thinking build that may not return short action plans promptly.

## Local model setup

Model binaries are not committed to this repository. Download them from their upstream project/model pages, review the model cards and licenses, and put them at the exact paths below. These PowerShell commands download the current packages used by this source tree. Run them from the repository root; they require internet access and several gigabytes of free space.

### 1. Streaming Hindi/English speech recognition

Download the [sherpa-onnx Nemotron multilingual streaming model package](https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-560ms-int8-2026-06-11.tar.bz2), extract it, and rename its extracted folder to the name expected by BridgeUX:

```powershell
New-Item -ItemType Directory -Force models | Out-Null
$asrArchive = Join-Path $env:TEMP 'bridgeux-nemotron.tar.bz2'
Invoke-WebRequest 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-560ms-int8-2026-06-11.tar.bz2' -OutFile $asrArchive
tar -xjf $asrArchive -C models
Move-Item 'models/sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-560ms-int8-2026-06-11' 'models/asr-nemotron-3.5-560ms-int8'
```

The folder must contain `encoder.int8.onnx`, `decoder.int8.onnx`, `joiner.int8.onnx`, and `tokens.txt` directly inside it. This build runs speech recognition on CPU.

The same multilingual Nemotron model is used for both voice requests and captions, with its language set to English or Hindi from the user's preference. It runs locally on the CPU. Captions transcribe speech in the selected language; they do not translate other languages.

### 2. English and Hindi neural voices

The following packages are published by [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models):

```powershell
$enArchive = Join-Path $env:TEMP 'bridgeux-en-voice.tar.bz2'
$hiArchive = Join-Path $env:TEMP 'bridgeux-hi-voice.tar.bz2'
New-Item -ItemType Directory -Force 'models/tts' | Out-Null
Invoke-WebRequest 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-lessac-medium.tar.bz2' -OutFile $enArchive
Invoke-WebRequest 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-hi_IN-pratham-medium.tar.bz2' -OutFile $hiArchive
tar -xjf $enArchive -C models/tts
tar -xjf $hiArchive -C models/tts
```

BridgeUX expects these files in each voice folder: the `.onnx` model, `tokens.txt`, and `espeak-ng-data`. The commands above extract directly under `models/tts/`, so the final paths are:

```text
models/tts/vits-piper-en_US-lessac-medium/en_US-lessac-medium.onnx
models/tts/vits-piper-en_US-lessac-medium/tokens.txt
models/tts/vits-piper-en_US-lessac-medium/espeak-ng-data/
models/tts/vits-piper-hi_IN-pratham-medium/hi_IN-pratham-medium.onnx
models/tts/vits-piper-hi_IN-pratham-medium/tokens.txt
models/tts/vits-piper-hi_IN-pratham-medium/espeak-ng-data/
```

### 3. Local assistant, screen vision, and experimental sign interpretation

Install [Ollama](https://ollama.com/download/windows), then download the exact model names BridgeUX uses:

```powershell
ollama pull qwen3-vl:4b-instruct
ollama list
```

BridgeUX checks Ollama's installed tags before making a model request. It prefers the configured Hugging Face Qwen3.5 model, then Qwen3-VL instruct models, for both vision and agent tasks. Otherwise it uses Qwen2.5 1.5B for short text plans and Moondream for screen images. Install [Qwen3-VL 4B Instruct](https://ollama.com/library/qwen3-vl:4b-instruct) for a stronger unified vision and agent model; the 3.3 GB model can run locally. Older Qwen3-VL thinking tags are a last resort because their long reasoning can consume the agent's short output limit. Browser pages are read through the browser extension or Windows UI Automation first, so actions such as opening the first visible YouTube video use the page's actual link instead of image interpretation. These general vision models are not trained to translate ASL.

### 4. On-device hand gesture controls

The project uses Google's MediaPipe Gesture Recognizer task model for real-time hand landmarks. Download its model before building the installer; it is ignored by Git because it is a binary asset:

```powershell
New-Item -ItemType Directory -Force 'models/gesture' | Out-Null
Invoke-WebRequest 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task' -OutFile 'models/gesture/gesture_recognizer.task'
```

The hand-control feature needs camera permission. It runs locally while enabled; pointing moves the cursor, pinching clicks, and a moving V-sign scrolls.

## Build a Windows installer

First complete all steps under [Local model setup](#local-model-setup). The builder copies any model assets it finds in `models/` into the installer; missing files are not downloaded automatically.

```powershell
npm ci
npm run dist:win
```

The x64 NSIS installer is written to `release/`. The installer includes local speech models and voice model files when present. It does **not** include Ollama or the Ollama Qwen weights; install Ollama and pull the model separately on each target machine. Model binaries and the generated installer are excluded from Git.

## Connect the browser agent

1. In Chrome or Brave, open Extensions and enable Developer mode.
2. Choose Load unpacked and select the `browser-extension` folder shown in BridgeUX Screen helper. Do not open `popup.html` as a normal browser file; the popup only works as an installed extension.
3. Copy the pairing key from BridgeUX, open the BridgeUX Browser Agent extension popup, and choose Connect. Wait for the popup to confirm the local connection. After installing an updated BridgeUX build, use Reload on the extension's card in the browser Extensions page before reconnecting.

The browser extension reads the active tab page structure locally when BridgeUX requests it. It can click links/buttons and fill visible non-password fields. Do not connect on pages you do not want the local agent to control.

## Browser extension tools

The bundled Chrome/Brave extension provides browser-agent access, direct YouTube play/pause/mute controls, and page readability controls. Its popup reads and explains the active page through BridgeUX's local assistant; it does not need the older Python helper or port 8765. Load it from the extension path shown in BridgeUX, connect with the pairing key, and reload the extension after app updates. Keep it disconnected when you do not want browser access. It communicates only with the local BridgeUX service.
