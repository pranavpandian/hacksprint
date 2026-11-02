# Model assets

Model weights are intentionally excluded from Git because of their size and their separate licenses. Follow the [main README installation instructions](../README.md#local-model-setup) for downloads, exact folder layout, and source links.

BridgeUX expects these local assets for its corresponding features:

```text
models/
├── asr-nemotron-3.5-560ms-int8/
│   ├── encoder.int8.onnx
│   ├── decoder.int8.onnx
│   ├── joiner.int8.onnx
│   └── tokens.txt
├── tts/
│   ├── vits-piper-en_US-lessac-medium/
│   │   ├── en_US-lessac-medium.onnx
│   │   ├── tokens.txt
│   │   └── espeak-ng-data/
│   └── vits-piper-hi_IN-pratham-medium/
│       ├── hi_IN-pratham-medium.onnx
│       ├── tokens.txt
│       └── espeak-ng-data/
└── gesture_recognizer.task
```

The Windows installer build copies these assets only when they exist in the source tree. The packaged app still expects Ollama to be installed separately, with `qwen2.5:1.5b-instruct` and `qwen3-vl:2b` pulled into the target Windows account's Ollama model store.

The MediaPipe model recognizes seven canned static gestures. It is not a sign-language recognition or translation model.
