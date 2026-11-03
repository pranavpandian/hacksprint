# Roadmap

## Available in the current prototype

- Windows Electron app with local accessibility preferences, larger text, themes, spacing, and reduced motion.
- User-started Hindi/English voice input and local read-aloud using separately installed speech assets.
- Local Qwen assistant for explanations and drafting guidance.
- User-selected, one-shot or periodic screen capture with local Qwen3-VL descriptions. A requested safe action can be suggested for explicit approval.
- Opt-in, voice-driven agent for up to six constrained screen navigation/search actions per request.
- An experimental ASL video-to-text demo using a general vision model. This is not a trained sign-language translator.
- An optional Chrome extension for user-invoked page readability through the local Python helper.

## Work needed before a production accessibility release

- Evaluate screen descriptions, voice, captions, and action proposals with disabled users and assistive-technology users; fix issues found in that testing.
- Replace the general-vision ASL demo with a licensed, language-specific model trained and evaluated on consenting signers, or clearly keep it as a demo.
- Add repeatable automated checks for renderer flows, model-unavailable states, IPC validation, and packaged Windows builds.
- Publish a reproducible signed installer and setup guide, including verified model assets, licenses, and supported hardware.

Do not describe the prototype as a screen-reader replacement, certified interpreter, or unrestricted autonomous computer agent.
