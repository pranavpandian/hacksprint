# Local AI setup

1. Install Ollama for Windows version 0.12.7 or later.
2. BridgeUX selects installed Ollama models automatically. For a fresh setup, run `ollama pull qwen3-vl:4b-instruct`, or launch `Install-Local-Vision-Model.bat`. If `qwen2.5:1.5b-instruct` and `moondream:latest` are installed, BridgeUX uses them for agent planning and vision without another download.
3. Start Ollama and launch BridgeUX with `npm start` or its Windows app executable.

BridgeUX reads accessible foreground-window text and controls through Windows UI Automation first. It selects a compatible text model and vision model from Ollama's installed tags. Qwen3-VL instruct can serve both; Qwen2.5 1.5B can plan text actions, and Moondream can read images. Avoid older Qwen3-VL thinking tags for short JSON plans because their reasoning can use the full output limit. These models are not trained for sign-language translation. If no compatible model is installed, the app reports the model install command. It asks users for missing form values and submits a Google Form only when the user explicitly requests submission. Explicit web queries go to DuckDuckGo; the local assistant summarizes returned snippets.

The local assistant can still produce incorrect output. Verify facts, eligibility criteria, and deadlines against the original form or its issuer. Do not paste sensitive details unless you understand the local processing path.
