(() => {
  let stream = null;
  let context = null;
  let source = null;
  let capture = null;
  let sink = null;
  let running = false;
  let starting = false;

  const setStatus = text => {
    const element = document.querySelector('#liveCaptionStatus');
    if (element) element.textContent = text;
    window.bridgeux?.setAgentStatus({ captionsActive: running, message: text }).catch(() => {});
    window.dispatchEvent(new CustomEvent('bridgeux:captions-changed', { detail: { running, busy: running || starting, text } }));
  };

  async function start() {
    if (running || starting) return true;
    if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('System audio capture is unavailable in this app version.');
    starting = true;
    try {
    setStatus('Connecting to computer audio…');
    const request = navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: { ideal: 1, max: 1 }, width: { ideal: 1 }, height: { ideal: 1 } } });
    context = new AudioContext();
    await context.resume();
    stream = await request;
    if (!stream.getAudioTracks().some(track => track.readyState === 'live')) throw new Error('Windows did not provide system audio. Play audio in another app, then start captions again.');
    const language = await window.bridgeux.getVoiceLanguage();
    const ready = await window.bridgeux.startSpeech(language, 'captions');
    await context.audioWorklet.addModule('speech-capture.js');
    source = context.createMediaStreamSource(stream);
    capture = new AudioWorkletNode(context, 'bridgeux-capture');
    sink = context.createGain();
    sink.gain.value = 0;
    capture.port.onmessage = event => window.bridgeux.sendSpeechAudio(event.data, 'captions');
    source.connect(capture);
    capture.connect(sink);
    sink.connect(context.destination);
    running = true;
    setStatus(`Live captions on · ${language === 'hi' ? 'Hindi' : 'English'} · ${ready.model}`);
    await window.bridgeux.updateCaptionOverlay(true, 'Listening to computer audio…');
    stream.getAudioTracks().forEach(track => {
      track.addEventListener('ended', stop, { once: true });
      track.addEventListener('mute', () => { if (running) setStatus('System audio paused or unavailable. Resume playback to continue captions.'); });
      track.addEventListener('unmute', () => { if (running) setStatus(`Live captions on · ${language === 'hi' ? 'Hindi' : 'English'}`); });
    });
    return true;
    } finally { starting = false; }
  }

  async function stop() {
    if (!running && !stream && !context) return;
    running = false;
    for (const node of [source, capture, sink]) { try { node?.disconnect(); } catch {} }
    source = capture = sink = null;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    try { await context?.close(); } catch {}
    context = null;
    await window.bridgeux?.stopSpeech('captions').catch(() => {});
    await window.bridgeux?.updateCaptionOverlay(false).catch(() => {});
    setStatus('Live captions stopped.');
  }

  window.bridgeuxStartSystemCaptions = async () => {
    if (running || starting) return true;
    try { return await start(); }
    catch (error) { await stop(); setStatus(`Could not start live captions: ${error.message}`); throw error; }
    finally { starting = false; }
  };
  window.bridgeuxStopSystemCaptions = stop;
  window.bridgeux?.onSpeechResult(result => {
    if (result.channel !== 'captions' || !result.text) return;
    const text = String(result.text).slice(-280);
    const line = document.querySelector('#captionText');
    if (line) line.textContent = text;
    window.bridgeux.updateCaptionOverlay(true, text).catch(() => {});
    if (running) setStatus(`Live captions · ${text}`);
  });
  window.addEventListener('pagehide', () => { stop(); });
  window.addEventListener('bridgeux:preferences-changed', () => {
    if (running) stop().then(() => setStatus('Captions stopped because the preferred language changed. Start captions again to use the new language.'));
  });
})();
