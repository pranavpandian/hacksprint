import { FilesetResolver, GestureRecognizer } from './node_modules/@mediapipe/tasks-vision/vision_bundle.mjs';

(() => {
  const $ = selector => document.querySelector(selector);
  const video = $('#cameraPreview');
  if (!video) return;
  let camera = null;
  let recognizer = null;
  let running = false;
  let lastVideoTime = -1;
  let lastLabel = '';

  async function stopCamera() {
    running = false;
    if (camera) camera.getTracks().forEach(track => track.stop());
    camera = null;
    video.srcObject = null;
    video.style.display = 'none';
    $('#cameraPlaceholder').hidden = false;
    $('#startCamera').disabled = false;
    $('#stopCamera').disabled = true;
    $('#cameraStatus').textContent = recognizer ? 'Camera is off. The local gesture model is ready.' : 'Camera is off.';
  }

  async function initializeGestureModel() {
    if (recognizer) return;
    $('#cameraStatus').textContent = 'Loading the local hand gesture model…';
    const vision = await FilesetResolver.forVisionTasks(window.bridgeux.gestureWasmUrl(), true);
    recognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: window.bridgeux.gestureModelUrl() },
      runningMode: 'VIDEO', numHands: 2,
      cannedGesturesClassifierOptions: { scoreThreshold: 0.55 }
    });
  }

  function classifyFrame() {
    if (!running) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const result = recognizer.recognizeForVideo(video, performance.now());
        const labels = (result.gestures || []).map(hand => hand[0]).filter(item => item && item.categoryName !== 'None' && item.score >= 0.55);
        const label = labels.length ? labels.map(item => `${item.categoryName.replaceAll('_', ' ')} (${Math.round(item.score * 100)}%)`).join(' · ') : 'No known hand gesture detected.';
        if (label !== lastLabel) {
          lastLabel = label;
          $('#cameraStatus').textContent = label;
        }
      } catch (error) {
        $('#cameraStatus').textContent = `Local gesture recognition stopped: ${error.message}`;
        stopCamera();
        return;
      }
    }
    setTimeout(classifyFrame, 120);
  }

  $('#loadGestureModel').onclick = async () => {
    const button = $('#loadGestureModel');
    button.disabled = true;
    try {
      await initializeGestureModel();
      $('#cameraStatus').textContent = 'Gesture model ready. Start camera when you want live recognition.';
    } catch (error) {
      $('#cameraStatus').textContent = `Gesture model could not load: ${error.message}`;
    } finally { button.disabled = false; }
  };

  $('#startCamera').onclick = async () => {
    $('#startCamera').disabled = true;
    $('#cameraStatus').textContent = 'Loading the local hand gesture model…';
    try {
      await initializeGestureModel();
      camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      video.srcObject = camera;
      video.style.display = 'block';
      $('#cameraPlaceholder').hidden = true;
      $('#stopCamera').disabled = false;
      $('#cameraStatus').textContent = 'Local model ready. Hold one of its listed gestures in view.';
      await video.play();
      running = true;
      lastLabel = '';
      classifyFrame();
    } catch (error) {
      await stopCamera();
      $('#cameraStatus').textContent = error.name === 'NotAllowedError' ? 'Camera permission was denied. You can still use voice or text support.' : `Could not start local gesture recognition: ${error.message}`;
    }
  };
  $('#stopCamera').onclick = stopCamera;
  window.addEventListener('pagehide', stopCamera);
})();
