# Privacy

BridgeUX stores accessibility preferences in Electron's local browser storage on this device. Use **Reset preferences** in the app to clear those choices.

## Microphone and speech

On first launch, BridgeUX asks whether the user wants voice support. It requests microphone permission only after the user selects **Enable microphone**. If allowed, live listening starts for that session; BridgeUX does not silently restart the microphone on later launches. The app remembers that the welcome prompt was shown. The user can start or stop listening at any time. Audio is streamed to the local Nemotron speech-recognition model through the app's audio worker. BridgeUX does not write microphone recordings to disk or send audio to a cloud speech service. Reply audio is generated on-device by the local Piper voice model.

## Screen sharing

Screen capture is off until the user selects a display and starts a capture or live-help session. Live help samples the selected display periodically (about every five seconds while enabled). The app briefly minimizes during capture so it does not cover the content being read. Captured frames are held in memory and sent to the local Ollama service at `127.0.0.1`; BridgeUX does not save them to disk or send them to a hosted AI endpoint. Stop live help at any time.

The content visible on a screen can be sensitive. Review the screen before starting capture or live help. Ollama, its model downloads, and any other installed software have their own behavior and terms outside BridgeUX.

## Camera and experimental ASL demo

Camera access is optional and begins only after the user starts the camera and grants permission. A short rolling buffer of frames is kept in app memory and sent to the local Ollama Qwen3-VL model only when the user requests interpretation. The camera feed and frames are not saved by BridgeUX or sent to a cloud service. This general vision model is not trained for ASL and its guesses are experimental, not a reliable translation.

## Browser helper and network

The optional Chrome helper reads active-tab content only when the user invokes its button. If the user sends that content to the assistant, BridgeUX sends the text to local Ollama at `127.0.0.1`.

BridgeUX's direct AI requests use Ollama on the local machine. A network connection is needed to obtain BridgeUX dependencies and model files during installation; these files are then used locally. The application itself does not include analytics or cloud AI/speech API integrations.
