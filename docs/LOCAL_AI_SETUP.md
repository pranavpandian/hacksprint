# Local AI setup

1. Install Ollama for Windows version 0.12.7 or later.
2. Run `ollama pull qwen2.5:1.5b-instruct` and `ollama pull hf.co/Qwen/Qwen3-VL-4B-Instruct-GGUF:Q4_K_M`, or launch `Install-Local-Vision-Model.bat` to download both after confirmation.
3. Start Ollama and launch BridgeUX with `npm start` or its Windows app executable.

BridgeUX reads accessible foreground-window text and controls through Windows UI Automation first. When needed, visual screen images are sent to the local Qwen3-VL 4B model. The model can answer text questions and inspect screenshot content; it is not trained for sign-language translation. If Ollama/model is missing, screen analysis reports unavailable; text-only tasks fall back to limited deterministic guidance. In hands-free mode, the assistant asks the user to provide form values and does not submit. Explicit web queries go to DuckDuckGo; the local assistant summarizes returned snippets.

The local assistant can still produce incorrect output. Verify facts, eligibility criteria, and deadlines against the original form or its issuer. Do not paste sensitive details unless you understand the local processing path.
