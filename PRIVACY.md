# Privacy

BridgeUX stores accessibility preferences in Electron's local browser storage on this device. Use **Reset preferences** in the app to clear those choices.

## Microphone and speech

On first launch, BridgeUX requires the user to choose at least one accessibility support and a preferred English or Hindi language. It then asks whether to use voice. Microphone permission is requested only after the user selects **Enable microphone**. If allowed, live listening starts for that session; BridgeUX does not silently restart the microphone on later launches. The user can start or stop listening at any time. Audio is streamed to the local Nemotron speech-recognition model in the selected language. BridgeUX does not write microphone recordings to disk or send audio to a cloud speech service. Reply audio is generated on-device by the local Piper voice model.

## Screen sharing

Screen access starts only when the user asks for screen reading or enables hands-free mode. BridgeUX first reads the active window's accessible text and controls through Windows UI Automation; this avoids screenshots when apps expose accessibility data. Visual-only content can use a selected-display screenshot fallback. Hands-free mode plans up to 24 constrained navigation/search actions. For forms it asks only for information the user has not provided, fills exact supplied values, and never submits. It stops on unclear or sensitive requests and does not send, delete, purchase, change settings, or enter credentials. Visual fallback frames stay in memory and go to local Ollama at `127.0.0.1`; BridgeUX does not save them to disk or send them to hosted AI. Say “stop agent” or press **Stop agent** to interrupt.

The content visible on a screen can be sensitive. Review the screen before starting capture or live help. Ollama, its model downloads, and any other installed software have their own behavior and terms outside BridgeUX.

When the user asks for current information or explicitly requests a web search, BridgeUX sends that spoken query to DuckDuckGo over the internet. It displays result links and uses local Ollama to summarize titles and snippets. Screen contents are not included in the search query. Search snippets can be incomplete; confirm flight prices and availability with the provider.

## Camera and experimental ASL demo

Camera access is optional and begins only after the user starts the camera and grants permission. A short rolling buffer of frames is kept in app memory and sent to the local Ollama Qwen3-VL model only when the user requests interpretation. The camera feed and frames are not saved by BridgeUX or sent to a cloud service. Optional hand controls run Google's MediaPipe recognizer on-device while enabled. This general vision model is not trained for ASL and its guesses are experimental, not a reliable translation.

## Browser helper and network

The optional Chrome helper reads active-tab content only when the user invokes its button. If the user sends that content to the assistant, BridgeUX sends the text to local Ollama at `127.0.0.1`.

BridgeUX's direct AI requests use Ollama on the local machine. A network connection is needed to obtain BridgeUX dependencies and model files during installation; these files are then used locally. The application itself does not include analytics or cloud AI/speech API integrations.
