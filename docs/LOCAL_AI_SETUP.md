# Local AI setup

1. Install Ollama for Windows version 0.12.7 or later.
2. Run `ollama pull hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M`, or launch `Install-Local-Vision-Model.bat` to download it.
3. Start Ollama and launch BridgeUX with `npm start` or its Windows app executable.

BridgeUX reads accessible foreground-window text and controls through Windows UI Automation first. When needed, visual screen images are sent to the local Qwen3.5 4B model. It is a single local assistant and vision model; it is not trained for sign-language translation. If Ollama/model is missing, screen analysis reports unavailable; text-only tasks fall back to limited deterministic guidance. It asks users for missing form values and submits a Google Form only when the user explicitly requests submission. Explicit web queries go to DuckDuckGo; the local assistant summarizes returned snippets.

The local assistant can still produce incorrect output. Verify facts, eligibility criteria, and deadlines against the original form or its issuer. Do not paste sensitive details unless you understand the local processing path.
