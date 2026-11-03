# Model assets

Large speech and voice model weights are excluded from Git because of their size and separate licenses. Follow the [main README installation instructions](../README.md#local-model-setup) for downloads, exact folder layout, and source links. The small ASL classifier is included under `models/sign/` with its license and attribution below.

BridgeUX expects these local assets for its corresponding features:

```text
models/
├── asr-nemotron-3.5-560ms-int8/
│   ├── encoder.int8.onnx
│   ├── decoder.int8.onnx
│   ├── joiner.int8.onnx
│   └── tokens.txt
├── asr-zipformer-en/
│   └── sherpa-onnx-streaming-zipformer-en-20M-2023-02-17/
│       ├── encoder-epoch-99-avg-1.int8.onnx
│       ├── decoder-epoch-99-avg-1.int8.onnx
│       ├── joiner-epoch-99-avg-1.int8.onnx
│       └── tokens.txt
├── gesture/
│   └── gesture_recognizer.task
├── sign/
│   ├── mlp_asl.onnx
│   └── mlp_classes.json
├── tts/
│   ├── vits-piper-en_US-lessac-medium/
│   │   ├── en_US-lessac-medium.onnx
│   │   ├── tokens.txt
│   │   └── espeak-ng-data/
│   └── vits-piper-hi_IN-pratham-medium/
│       ├── hi_IN-pratham-medium.onnx
│       ├── tokens.txt
│       └── espeak-ng-data/
```

English voice and live captions use the compact streaming Zipformer model when installed. Hindi uses Nemotron. Live Windows playback captions are user-started, processed locally, and displayed in the selected recognition language; they do not translate between languages. See [the English model setup](../README.md#1-streaming-hindienglish-speech-recognition) for the download command.

The Windows installer build copies these assets only when they exist in the source tree. The packaged app still expects Ollama to be installed separately, with `hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M` pulled into the target Windows account's Ollama model store.

The static ASL spelling feature uses [nocontextdoruk/asl-landmark-mlp](https://huggingface.co/nocontextdoruk/asl-landmark-mlp), which classifies normalized MediaPipe landmarks into A–Z and 0–9. The model weights are 223 KB and use the **CC BY-NC 4.0** license; the model card credits the ASL-HG dataset. Keep the model attribution in the app and do not use or redistribute the weights commercially without permission. Its reported validation split is not a guarantee of live webcam accuracy. Static frames cannot distinguish some digits/signs or recognize moving J/Z, and this feature is fingerspelling support, not ASL translation. The gesture file is Google's MediaPipe Gesture Recognizer task model, downloaded separately.
