import { FilesetResolver, GestureRecognizer } from './node_modules/@mediapipe/tasks-vision/vision_bundle.mjs';
import * as ort from './node_modules/onnxruntime-web/dist/ort.wasm.min.mjs';

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
  let aslActive = false;
  let aslSession = null;
  let aslLabels = [];
  let aslVotes = [];
  let lastAslCharacter = '';
  let lastHandAt = 0;
  let gpuDelegate = false;
  let aslBusy = false;

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  async function loadRecognizer() {
    if (recognizer) return recognizer;
    const assets = await window.bridgeux.getGestureAssets();
    const vision = await FilesetResolver.forVisionTasks(assets.wasmUrl);
    const options = { baseOptions: { modelAssetPath: assets.modelUrl, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5 };
    try { recognizer = await GestureRecognizer.createFromOptions(vision, options); gpuDelegate = true; }
    catch { options.baseOptions.delegate = 'CPU'; recognizer = await GestureRecognizer.createFromOptions(vision, options); }
    return recognizer;
  }

  async function loadAslModel() {
    if (aslSession) return;
    $('#aslModelStatus').textContent = 'Loading the local ASL letters model…';
    const assets = await window.bridgeux.getSignAssets();
    aslLabels = JSON.parse(assets.labels);
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = { 'ort-wasm-simd-threaded.wasm': assets.ortWasmUrl };
    aslSession = await ort.InferenceSession.create(assets.model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    $('#aslModelStatus').textContent = 'ASL model ready · lightweight local CPU classifier; hand tracking uses GPU when available.';
  }

  function normalizedLandmarks(hand) {
    const wrist = hand[0];
    const scale = Math.hypot(hand[9].x - wrist.x, hand[9].y - wrist.y, hand[9].z - wrist.z) || 1;
    return new Float32Array(hand.flatMap(point => [(point.x - wrist.x) / scale, (point.y - wrist.y) / scale, (point.z - wrist.z) / scale]));
  }

  async function classifyAsl(hand) {
    if (aslBusy) return;
    aslBusy = true;
    try {
    const tensor = new ort.Tensor('float32', normalizedLandmarks(hand), [1, 63]);
    const output = await aslSession.run({ [aslSession.inputNames[0]]: tensor });
    const scores = output[aslSession.outputNames[0]].data;
    let best = 0;
    for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
    const label = aslLabels[best];
    const confidence = 1 / scores.reduce((sum, value) => sum + Math.exp(value - scores[best]), 0);
    if (!label || confidence < 0.72) {
      aslVotes = [];
      $('#aslLiveResult').textContent = 'Hand seen, but the sign is unclear. Hold one letter closer to the camera.';
      return;
    }
    aslVotes.push(label);
    if (aslVotes.length > 5) aslVotes.shift();
    const stable = aslVotes.filter(value => value === label).length >= 4;
    $('#aslLiveResult').textContent = stable ? `Detected: ${label} · ${(confidence * 100).toFixed(0)}% confidence` : `Reading handshape… ${label}`;
    if (stable && label !== lastAslCharacter) {
      lastAslCharacter = label;
      const result = $('#aslLiveResult');
      result.dataset.text = `${result.dataset.text || ''}${label}`;
      const phrase = window.bridgeuxResolveAslPhrase?.(result.dataset.text);
      result.textContent = `Detected: ${label} · ${(confidence * 100).toFixed(0)}% confidence\nFingerspelled: ${result.dataset.text}${phrase ? `\nPhrase match: ${phrase}` : ''}`;
      $('#speakAslText').disabled = false;
      $('#typeSignText').disabled = false;
      if ($('#aslVoiceOn').checked) {
        const language = JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}').interfaceLanguage || 'English';
        window.bridgeuxSpeak?.(label, language === 'हिन्दी' ? 'hi' : 'en');
      }
    }
    } finally { aslBusy = false; }
  }

  $('#startAslRecognition').onclick = async () => {
    if (!video.srcObject) { $('#aslModelStatus').textContent = 'Start the camera first.'; return; }
    $('#startAslRecognition').disabled = true;
    try {
      await loadRecognizer();
      await loadAslModel();
      aslActive = true;
      aslVotes = [];
      lastAslCharacter = '';
      $('#stopAslRecognition').disabled = false;
      $('#aslModelStatus').textContent = `ASL recognition is on · ${gpuDelegate ? 'GPU' : 'CPU'} hand tracking · one character at a time.`;
      requestAnimationFrame(track);
    } catch (error) {
      aslActive = false;
      $('#aslModelStatus').textContent = `Could not load the local ASL model: ${error.message}`;
      $('#startAslRecognition').disabled = false;
    }
  };
  $('#stopAslRecognition').onclick = () => { aslActive = false; $('#stopAslRecognition').disabled = true; $('#startAslRecognition').disabled = !video.srcObject; };
  $('#clearAslText').onclick = () => { $('#aslLiveResult').dataset.text = ''; $('#aslLiveResult').textContent = 'Your recognized letters and numbers will appear here.'; $('#speakAslText').disabled = true; $('#typeSignText').disabled = true; lastAslCharacter = ''; aslVotes = []; };
  $('#speakAslText').onclick = () => { const text = $('#aslLiveResult').dataset.text || ''; if (text) { const language = JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}').interfaceLanguage || 'English'; window.bridgeuxSpeak?.(window.bridgeuxResolveAslPhrase?.(text) || text, language === 'हिन्दी' ? 'hi' : 'en'); } };
  $('#addAslSpace').onclick = () => { const result = $('#aslLiveResult'); result.dataset.text = `${result.dataset.text || ''} `; const phrase = window.bridgeuxResolveAslPhrase?.(result.dataset.text); result.textContent = `Fingerspelled: ${result.dataset.text}${phrase ? `\nPhrase match: ${phrase}` : ''}`; lastAslCharacter = ''; aslVotes = []; };
  $('#typeSignText').onclick = async () => {
    const text = $('#aslLiveResult').dataset.text || '';
    if (!text || !window.confirm(`Type these recognized characters into the focused field?\n\n${text}`)) return;
    try { await window.bridgeux.performApprovedAction({ type: 'type', text }); $('#cameraStatus').textContent = 'Typed recognized text into the focused field.'; }
    catch (error) { $('#cameraStatus').textContent = `Could not type text: ${error.message}`; }
  };
  $('#stopCamera').addEventListener('click', () => { aslActive = false; $('#stopAslRecognition').disabled = true; });

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
      status.textContent = `Hand controls on (${gpuDelegate ? 'GPU' : 'CPU'}): point to move, pinch to click, V-sign swipe to scroll, fist to pause movement.`;
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
    if (!active && !aslActive) return;
    requestAnimationFrame(track);
    if (!video.srcObject || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || now - lastFrame < 110) return;
    lastFrame = now;
    try {
      const result = recognizer.recognizeForVideo(video, now);
      const hand = result.landmarks?.[0];
      if (!hand) { pinching = false; previousVictoryY = null; if (aslActive && Date.now() - lastHandAt > 700) { aslVotes = []; lastAslCharacter = ''; $('#aslLiveResult').textContent = 'Show one hand clearly to the camera.'; } if (active) status.textContent = 'Show one hand clearly to the camera.'; return; }
      lastHandAt = Date.now();
      if (aslActive) classifyAsl(hand).catch(error => { aslActive = false; $('#aslModelStatus').textContent = `ASL recognition stopped: ${error.message}`; });
      if (!active) return;
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
