# Privacy

BridgeUX stores accessibility preferences in Electron's local browser storage on this device. Use **Reset preferences** in the app to clear those choices.

## Microphone and speech

On first launch, BridgeUX asks whether the user wants voice support. It requests microphone permission only after the user selects **Enable microphone**. If allowed, live listening starts and is remembered for later launches; the user can stop it at any time in the app. Audio is streamed to the local Nemotron speech-recognition model through the app's audio worker. BridgeUX does not write microphone recordings to disk or send audio to a cloud speech service. Reply audio is generated on-device by the local Piper voice model.

## Screen sharing

Screen capture is off until the user selects a display and starts a capture or live-help session. Live help samples the selected display periodically (about every five seconds while enabled). The app briefly minimizes during capture so it does not cover the content being read. Captured frames are held in memory and sent to the local Ollama service at `127.0.0.1`; BridgeUX does not save them to disk or send them to a hosted AI endpoint. Stop live help at any time.

The content visible on a screen can be sensitive. Review the screen before starting capture or live help. Ollama, its model downloads, and any other installed software have their own behavior and terms outside BridgeUX.

## Camera and gestures

Camera access is optional and begins only when the user starts the gesture feature and grants permission. The local MediaPipe model processes frames for seven common static gesture labels. BridgeUX does not record or upload the camera video. This is not sign-language translation.

## Browser helper and network

The optional Chrome helper reads active-tab content only when the user invokes its button. If the user sends that content to the assistant, BridgeUX sends the text to local Ollama at `127.0.0.1`.

BridgeUX's direct AI requests use Ollama on the local machine. A network connection is needed to obtain BridgeUX dependencies and model files during installation; these files are then used locally. The application itself does not include analytics or cloud AI/speech API integrations.
