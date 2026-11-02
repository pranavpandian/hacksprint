# Local model assets

Large model weight files are intentionally not stored in this Git repository. The Windows installer packages these assets when they are present locally.

Required folders under this directory:

- `asr-nemotron-3.5-560ms-int8/` — Nemotron streaming ASR ONNX files (`encoder.int8.onnx`, `decoder.int8.onnx`, `joiner.int8.onnx`, `tokens.txt`).
- `tts/vits-piper-en_US-lessac-medium/` — English Piper ONNX voice, tokens, and `espeak-ng-data`.
- `tts/vits-piper-hi_IN-pratham-medium/` — Hindi Piper ONNX voice, tokens, and `espeak-ng-data`.
- `gesture_recognizer.task` — MediaPipe hand gesture task model.

The Ollama weights are installed separately in the Windows user model store:

```powershell
ollama pull qwen2.5:1.5b-instruct
ollama pull qwen3-vl:2b
```

If you have the packaged BridgeUX installer, it already includes the Nemotron, Piper, and MediaPipe assets. The source installer build requires restoring the listed files before running `npm run dist:win`.
