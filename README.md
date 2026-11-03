# BridgeUX

BridgeUX is a Windows desktop accessibility prototype that combines voice interaction, screen reading, and experimental ASL video-to-text. Its AI and speech inference run locally: prompts and short camera clips go to Ollama on `127.0.0.1`; audio and video are processed on the device.

> **Current scope:** BridgeUX is an accessibility prototype, not a replacement for a screen reader or interpreter. The agent reads the active app's Windows accessibility tree on each action, avoiding screenshots when the app exposes page content. It can submit a Google Form only when the user explicitly asks. ASL interpretation uses a general local vision model and is not reliable or ASL-trained.

## What it includes

- Streaming English or Hindi speech-to-text using the local NVIDIA Nemotron 3.5 model through sherpa-onnx. First launch requires the user to choose accessibility supports and a preferred language; speech recognition and replies then use that choice.
- Local English and Hindi Piper neural voices for replies and read-aloud.
- One Hugging Face Qwen3.5 4B model for the local assistant, screen vision, and experimental ASL clips, served by Ollama.
- Fast screen reading through Windows UI Automation when the foreground app exposes accessible text and controls; selected-display screenshots remain the fallback for visual-only content.
- Explicit spoken PC tasks start a one-shot agent automatically, with no display selection when Windows exposes accessible controls. For longer tasks, enable hands-free mode once; each step reads the current browser/app accessibility tree. It asks only for missing form values and can submit a Google Form after an explicit request. Say “stop agent” or press **Stop agent** to interrupt.
- Voice commands such as “open example.com”, “visit Wikipedia”, or “go to the NASA website” open that site in the default browser. It resolves named sites with web search and supports HTTP/HTTPS links.
- Spoken web searches for flights, weather, news, and other current information. BridgeUX sends the spoken search query to DuckDuckGo, then summarizes result snippets locally and displays source links. Check provider pages for live prices and availability.
- A user-started camera view that samples a few recent frames for experimental ASL video-to-text using the local Qwen3-VL model, with spoken replies. Optional MediaPipe hand controls move the pointer, pinch to click, and use a V-sign swipe to scroll. ASL translation quality is not guaranteed; the model is not ASL-trained.
- Adjustable text size, contrast/theme, spacing, captions demo, and an optional Chrome helper.

See [Privacy](PRIVACY.md), [Security](SECURITY.md), [architecture](docs/ARCHITECTURE.md), and [model details](models/README.md) for limits and implementation notes.

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
   ollama pull hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M
   ```

5. Start BridgeUX and complete the required support and preferred-language setup. Choose whether to enable the microphone when prompted; speech follows the selected English or Hindi language. Select a display to analyze screen content. Camera permission is only needed for the experimental ASL demo.

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
ollama pull hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M
```

Launch BridgeUX:

```powershell
npm start
```

Ollama normally runs as a local background service. BridgeUX tries to start it if it is installed but not already running. AI status in the app should show the Qwen3.5 model as ready.

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
ollama pull hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M
ollama list
```

The assistant, visual screen fallback, and experimental ASL clips use Hugging Face's [Qwen3.5-4B-GGUF Q4_K_M](https://huggingface.co/gguf/Qwen3.5-4B-GGUF), around 3.5 GB in Ollama's model store. Browser pages are read through Windows UI Automation first, so actions such as opening the first visible YouTube video use the page's actual link instead of image interpretation. Qwen3.5 is a general vision model, not trained to reliably translate ASL.

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

The x64 NSIS installer is written to `release/`. The installer includes the local speech and voice model files when present. It does **not** include Ollama or the Ollama Qwen weights; install Ollama and pull the model separately on each target machine. Model binaries and the generated installer are excluded from Git.

## Optional Chrome helper

The helper uses Python 3 to serve the local assistant bridge. From the repository folder, start `Start-BridgeUX.bat` and leave its window open while using the extension.

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose this repository's `browser-extension` folder.
4. Use its button on a page when you want the extension to apply display adjustments or send selected page text to local Ollama for explanation.

The helper is optional and is not included in the Windows Electron installer. It reads page content only when the user invokes it. Stop the local bridge by closing the `Start-BridgeUX.bat` window.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Ollama/model status is unavailable | Open PowerShell and run `ollama list`. Pull the exact tag above and confirm Ollama responds locally before restarting BridgeUX. |
| Screen vision or local assistant returns HTTP 404 or says the model is missing | Run `ollama pull hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M`, then verify that `ollama list` contains that exact tag. |
| Speech recognition says the model is missing | Check that the four ASR files are directly inside `models/asr-nemotron-3.5-560ms-int8/`, then restart the app. |
| Neural voice fails | Check the requested language's `.onnx`, `tokens.txt`, and `espeak-ng-data` files in its folder under `models/tts/`. |
| ASL interpretation unavailable | Check Ollama is running and the Qwen3.5 4B tag is installed; start the camera and try a short, well-lit signing clip. Results are experimental. |
| Hand controls fail to load | Start the camera, allow camera access, then press **Enable hand controls**. The on-device MediaPipe asset is bundled with the installer. |
| Active-window reading is incomplete | Some apps do not expose their content through Windows accessibility APIs. Choose a display and use **Read screen now** for visual fallback. |
| npm install fails on a native dependency | Use 64-bit Node.js 22 LTS or newer. If npm specifically requests a C++ toolchain, install Visual Studio Build Tools with **Desktop development with C++**, then retry `npm ci`. |

## Privacy and safety

- AI, speech, and screen analysis run locally through Ollama. If you explicitly ask for current information or a web search, BridgeUX sends that spoken query to DuckDuckGo and shows source links; it does not attach screen contents.
- The microphone is requested only for voice features. Audio is streamed to the local ASR model and is not saved by BridgeUX.
- Camera access is optional and starts only when the user starts ASL interpretation. A rolling buffer of recent frames is sent only to local Ollama when the user requests interpretation; frames are not saved by BridgeUX.
- Active-window reading uses Windows accessibility data. Screenshot fallback and hands-free control are user-started; captured frames are processed locally in memory. Review [Privacy](PRIVACY.md) before using it with sensitive content.
- Model quality is imperfect. Verify important information with its original source. BridgeUX does not invent personal facts or submit forms without an explicit user-approved action.

## Model and dependency licenses

The app's source, bundled model weights, npm dependencies, and Ollama models may have different licenses and terms. Review the license and model card at each upstream source before redistribution or commercial use. BridgeUX does not redistribute excluded model weights through this Git repository.
