# Local AI setup

1. Install Ollama for Windows version 0.12.7 or later.
2. Run `ollama pull qwen2.5:1.5b-instruct` and `ollama pull qwen3-vl:2b`, or launch `Install-Local-Vision-Model.bat` to download both after confirmation.
3. Start Ollama and launch BridgeUX with `npm start` or its Windows app executable.

BridgeUX's Electron main process sends prompts to Ollama's local chat endpoint at `http://127.0.0.1:11434/api/chat`, including an image only after the user selects a display and presses capture. The app briefly minimizes to avoid covering the screen being read. The model can answer text questions and inspect screenshot content. It is not a sign-language translation model. If Ollama/model is missing, screen analysis reports unavailable; text-only tasks fall back to limited deterministic guidance. The helper never fills personal facts automatically. The user approves each proposed OS action.

The local assistant can still produce incorrect output. Verify facts, eligibility criteria, and deadlines against the original form or its issuer. Do not paste sensitive details unless you understand the local processing path.
