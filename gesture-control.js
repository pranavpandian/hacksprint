import { FilesetResolver, GestureRecognizer } from './node_modules/@mediapipe/tasks-vision/vision_bundle.mjs';

(() => {
  const $ = selector => document.querySelector(selector);
  const video = $('#cameraPreview');
  const status = $('#gestureStatus');
  const enable = $('#enableGestures');
  const disable = $('#disableGestures');
  let recognizer = null;
  let active = false;
  let lastFrame = 0;
  let lastClick = 0;
  let lastScroll = 0;
  let pinching = false;
  let previousVictoryY = null;

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  async function loadRecognizer() {
    if (recognizer) return recognizer;
    const assets = await window.bridgeux.getGestureAssets();
    const vision = await FilesetResolver.forVisionTasks(assets.wasmUrl);
    const options = { baseOptions: { modelAssetPath: assets.modelUrl, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 };
    try { recognizer = await GestureRecognizer.createFromOptions(vision, options); }
    catch { options.baseOptions.delegate = 'CPU'; recognizer = await GestureRecognizer.createFromOptions(vision, options); }
    return recognizer;
  }

  async function stopGestures() {
    active = false;
    window.bridgeux.setGestureMode(false).catch(() => {});
    disable.hidden = true;
    enable.disabled = !(video.srcObject && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    pinching = false;
    previousVictoryY = null;
    status.textContent = 'Hand controls are off. Camera frames stay on this device.';
  }

  enable.onclick = async () => {
    if (!video.srcObject) { status.textContent = 'Start the camera first.'; return; }
    enable.disabled = true;
    status.textContent = 'Loading the on-device hand tracker…';
    try {
      await loadRecognizer();
      await window.bridgeux.setGestureMode(true);
      active = true;
      disable.hidden = false;
      status.textContent = 'Hand controls on: point to move, pinch to click, V-sign swipe to scroll, fist to pause movement. Say “stop agent” or press Stop hand controls.';
      requestAnimationFrame(track);
    } catch (error) {
      await stopGestures();
      status.textContent = `Could not start local gesture controls: ${error.message}`;
    } finally { enable.disabled = false; }
  };
  disable.onclick = stopGestures;
  $('#stopCamera').addEventListener('click', stopGestures);
  window.addEventListener('pagehide', stopGestures);

  function track(now) {
    if (!active) return;
    requestAnimationFrame(track);
    if (!video.srcObject || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || now - lastFrame < 110) return;
    lastFrame = now;
    try {
      const result = recognizer.recognizeForVideo(video, now);
      const hand = result.landmarks?.[0];
      if (!hand) { pinching = false; previousVictoryY = null; status.textContent = 'Show one hand clearly to the camera.'; return; }
      const category = result.gestures?.[0]?.[0]?.categoryName || 'None';
      const index = hand[8];
      const pinch = distance(hand[4], hand[8]) < 0.055;
      if (pinch && !pinching && Date.now() - lastClick > 750) {
        lastClick = Date.now();
        window.bridgeux.movePointer({ x: 1 - index.x, y: index.y, click: 'left' }).catch(error => { status.textContent = error.message; });
        status.textContent = 'Pinch click.';
      } else if (category === 'Pointing_Up' && !pinch) {
        window.bridgeux.movePointer({ x: 1 - index.x, y: index.y }).catch(error => { status.textContent = error.message; });
        status.textContent = 'Pointer follows your index finger.';
      }
      if (category === 'Victory') {
        if (previousVictoryY != null && Math.abs(index.y - previousVictoryY) > 0.055 && Date.now() - lastScroll > 450) {
          lastScroll = Date.now();
          window.bridgeux.movePointer({ x: 1 - index.x, y: index.y, scroll: index.y < previousVictoryY ? 'up' : 'down' }).catch(error => { status.textContent = error.message; });
          status.textContent = index.y < previousVictoryY ? 'Scrolled up.' : 'Scrolled down.';
        }
        previousVictoryY = index.y;
      } else previousVictoryY = null;
      if (category === 'Closed_Fist') status.textContent = 'Fist detected. Pointer is paused.';
      pinching = pinch;
    } catch (error) { status.textContent = `Gesture tracking paused: ${error.message}`; }
  }
})();
