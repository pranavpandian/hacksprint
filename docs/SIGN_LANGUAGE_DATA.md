# Local sign-language recognition status

No sign-recognition model or dataset is included in this repository. The camera preview is local and user-initiated, but it does not classify signs. BridgeUX deliberately shows no guessed labels.

A real implementation needs a locally installed hand/pose/face landmark runtime and a separate language-specific sign classifier. Still-image hand-shape recognition cannot translate a language that uses motion, two hands, facial expression, posture, grammar, and context. A pack must document its language, vocabulary, model format, dataset provenance, license, consent, limitations, unknown-class behavior, and evaluation split by signer. Evaluate precision, recall, and confusion matrix across held-out signers and varied lighting, distance, handedness, and backgrounds before exposing predictions.

Future model assets must be downloaded or installed by the developer/user with license and provenance recorded. They must remain on device during inference. Do not add recordings or model binaries to Git without documented consent and license.
