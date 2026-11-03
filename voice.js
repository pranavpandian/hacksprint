(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const dialog = $('#voiceWelcome');
  if (!dialog) return;

  const permissionStatus = $('#voicePermissionStatus');
  const transcript = $('#speechTranscript');
  const speechStatus = $('#speechStatus');
  let stream = null;
  let inputContext = null;
  let worklet = null;
  let source = null;
  let finalText = '';
  let partialText = '';
  let replyText = '';
  let replyLanguage = 'en';

  let playbackContext = null;
  let playbackCursor = 0;
  let activeTtsId = 0;
  let activeSources = 0;
  let ttsFinished = false;
  let micPausedForReply = false;
  let micResumeInFlight = false;
  const activeAudioNodes = new Set();

  function getVoiceLanguage() {
    try { return JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}').interfaceLanguage === 'हिन्दी' ? 'hi' : 'en'; }
    catch { return 'en'; }
  }

  function setListening(active) {
    $('#startSpeech').disabled = active;
    $('#stopSpeech').disabled = !active;
  }

  async function pauseMicForReply() {
    if (!stream || !inputContext || inputContext.state === 'closed') return;
    micPausedForReply = true;
    if (inputContext.state === 'running') await inputContext.suspend();
    await window.bridgeux.pauseSpeech();
  }

  async function maybeResumeMic() {
    if (!ttsFinished || activeSources > 0 || micResumeInFlight) return;
    if (!micPausedForReply) return;
    if (!stream || !inputContext || inputContext.state === 'closed') {
      micPausedForReply = false;
      return;
    }

    micPausedForReply = false;
    micResumeInFlight = true;
    try {
      await window.bridgeux.startSpeech(getVoiceLanguage());
      if (stream && inputContext?.state === 'suspended') await inputContext.resume();
      if (stream) speechStatus.textContent = 'Listening and replying locally.';
    } catch (error) {
      speechStatus.textContent = `Speech recognition could not resume: ${error.message}`;
      setListening(false);
    } finally {
      micResumeInFlight = false;
    }
  }

  async function playReply(text, language = getVoiceLanguage()) {
    if (!text || !window.bridgeux?.speakText) return;

    activeTtsId += 1;
    const requestId = activeTtsId;
    for (const node of activeAudioNodes) {
      try { node.stop(); } catch {}
    }
    activeAudioNodes.clear();
    activeSources = 0;
    playbackCursor = 0;
    ttsFinished = false;

    try {
      await pauseMicForReply();
      if (!playbackContext) playbackContext = new AudioContext();
      if (playbackContext.state === 'suspended') await playbackContext.resume();
      await window.bridgeux.speakText({
        text: String(text).slice(0, 4000),
        language,
        requestId
      });
    } catch (error) {
      speechStatus.textContent = `Local voice could not start: ${error.message}`;
      ttsFinished = true;
      await maybeResumeMic();
    }
  }

  window.bridgeuxSpeak = (text, language = getVoiceLanguage()) => playReply(text, language);

  async function stopListening(message = 'Microphone stopped.') {
    try {
      if (worklet) {
        worklet.disconnect();
        worklet.port.close();
        worklet = null;
      }
      if (source) {
        source.disconnect();
        source = null;
      }
      if (inputContext) {
        await inputContext.close();
        inputContext = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      micPausedForReply = false;
      await window.bridgeux.stopSpeech();
    } catch {}
    setListening(false);
    speechStatus.textContent = message;
  }

  async function startListening() {
    setListening(true);
    speechStatus.textContent = 'Starting local Hindi/English recognition…';
    try {
      const language = getVoiceLanguage();
      const ready = await window.bridgeux.startSpeech(language);
      stream = stream || await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      speechStatus.textContent = `${ready.model}. Listening and replying locally.`;
      inputContext = new AudioContext();
      await inputContext.audioWorklet.addModule('speech-capture.js');
      source = inputContext.createMediaStreamSource(stream);
      worklet = new AudioWorkletNode(inputContext, 'bridgeux-capture');
      worklet.port.onmessage = event => window.bridgeux.sendSpeechAudio(event.data);
      source.connect(worklet);
      finalText = '';
      partialText = '';
      transcript.textContent = language === 'hi' ? 'सुन रहा हूँ… हिन्दी में बोलें।' : 'Listening… speak in English.';
      $('#speakTranscript').disabled = false;
      $('#sendTranscriptToHelper').disabled = false;
      $('#sendTranscriptToScreen').disabled = false;
    } catch (error) {
      await stopListening(error.message || 'Could not start local speech recognition.');
    }
  }

  async function handleVoiceRequest(text, language) {
    const normalized = text.toLocaleLowerCase();
    replyLanguage = language;

    if (/\b(stop listening|stop microphone|pause listening)\b|सुनना बंद/.test(normalized)) {
      await stopListening('Voice listening stopped by request.');
      replyText = 'I stopped listening.';
      playReply(replyText, language);
      return;
    }
    if (/\b(repeat that|say that again|read that again)\b|फिर से बोल/.test(normalized)) {
      playReply(replyText || 'I do not have a previous reply yet.', language);
      return;
    }

    const screenRequest = /\b(screen|this page|current page|what is visible|what.?s on (my )?screen|read (this|the page)|click|tap|press|type into|fill (this|the|my)|enter into|open this|button|form field|submit this)\b/i.test(text) || /स्क्रीन|पेज पर|बटन दब|फॉर्म भर|क्लिक|टाइप|खोलो|खोलें|चुनो|चुनें/.test(text);
    if (screenRequest) {
      $('#screenTask').value = text;
      $('#screenHelper').scrollIntoView({ behavior: 'smooth' });
      const screenChoice = $('#screenChoice');
      if (!screenChoice.value) {
        replyText = 'Choose the display you want me to read once. After that, you can ask me about it by voice.';
        playReply(replyText, language);
        speechStatus.textContent = 'Select a screen once, then ask for screen help by voice.';
        return;
      }
      localStorage.setItem('bridgeux-last-voice-language', language);
      speechStatus.textContent = 'Reading the screen and working on your request locally…';
      window.bridgeuxScreenSpeakNext = true;
      $('#captureScreen').click();
      return;
    }

    const answer = $('#assistAnswer');
    answer.hidden = false;
    answer.textContent = 'Working on your request locally…';
    $('#assistText').value = text;
    $('#assistant').scrollIntoView({ behavior: 'smooth' });
    speechStatus.textContent = 'The local assistant is working; you can keep speaking.';
    try {
      const preferences = JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}');
      const language = getVoiceLanguage() === 'hi' ? 'हिन्दी' : 'English';
      const result = await window.bridgeux.askLocal({ task: $('#assistTask').value || 'help', text, language, supports: preferences.supports || [] });
      answer.textContent = `${result.answer}\n\n${result.source}`;
    } catch {
      answer.textContent = 'I could not reach the local assistant. Check that Ollama is running and that Qwen is installed.';
    }
  }

  window.addEventListener('bridgeux:setup-complete', () => dialog.showModal());
  $('#voiceSetup').onclick = () => dialog.showModal();
  dialog.addEventListener('close', () => localStorage.setItem('bridgeux-voice-prompted', 'yes'));

  $('#enableVoice').onclick = async () => {
    const button = $('#enableVoice');
    button.disabled = true;
    permissionStatus.textContent = 'Asking Windows for microphone permission…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      localStorage.setItem('bridgeux-microphone-permission', 'granted');
      permissionStatus.textContent = 'Microphone approved. BridgeUX is listening now; say “stop listening” at any time.';
      dialog.close();
      await startListening();
      playReply(getVoiceLanguage() === 'hi' ? 'नमस्ते। बताइए, आपको किस चीज़ में मदद चाहिए।' : 'Hello. Tell me what you need, and I will answer out loud.', getVoiceLanguage());
    } catch (error) {
      permissionStatus.textContent = error.name === 'NotAllowedError' ? 'Microphone permission was denied. You can continue without voice.' : error.message;
      button.disabled = false;
    }
  };

  $('#talkToMe').onclick = () => playReply(getVoiceLanguage() === 'hi' ? 'ब्रिज यूएक्स में आपका स्वागत है। बताइए, आपको किस चीज़ में मदद चाहिए।' : 'Welcome to BridgeUX. Tell me what you need; I will listen and reply aloud.');
  $('#startSpeech').onclick = () => startListening();
  $('#stopSpeech').onclick = () => stopListening();
  window.addEventListener('bridgeux:preferences-changed', async () => {
    if (!stream || $('#stopSpeech').disabled) return;
    await stopListening('Restarting speech with your updated language…');
    await startListening();
  });

  window.bridgeux.onSpeechResult(result => {
    if (result.type === 'error') {
      speechStatus.textContent = `Speech recognizer error: ${result.message}`;
      return;
    }
    if (result.type !== 'transcript') return;
    const text = String(result.text || '').trim();
    if (!text) return;
    if (result.final) {
      finalText = [finalText, text].filter(Boolean).join(' ');
      partialText = '';
      const language = getVoiceLanguage();
      replyLanguage = language;
      localStorage.setItem('bridgeux-last-voice-language', language);
      speechStatus.textContent = `Heard ${language === 'hi' ? 'Hindi' : 'English'} · working locally…`;
      $('#liveRegion').textContent = `${language === 'hi' ? 'Hindi' : 'English'} speech: ${text}`;
      if (text.length >= 3) handleVoiceRequest(text, language);
    } else {
      partialText = text;
    }
    transcript.textContent = [finalText, partialText].filter(Boolean).join(' ') || 'Listening…';
  });

  window.bridgeux.onTtsAudio(message => {
    if (message.requestId != null && message.requestId !== activeTtsId) return;
    if (message.type === 'error') {
      speechStatus.textContent = `Neural voice error: ${message.message}`;
      ttsFinished = true;
      maybeResumeMic();
      return;
    }
    if (message.type === 'done') {
      ttsFinished = true;
      maybeResumeMic();
      return;
    }
    if (message.type !== 'audio' || !(message.samples instanceof Float32Array)) return;

    try {
      const buffer = playbackContext.createBuffer(1, message.samples.length, message.sampleRate);
      buffer.copyToChannel(message.samples, 0);
      const node = playbackContext.createBufferSource();
      node.buffer = buffer;
      node.connect(playbackContext.destination);
      const start = Math.max(playbackContext.currentTime, playbackCursor);
      node.start(start);
      playbackCursor = start + buffer.duration;
      activeSources += 1;
      activeAudioNodes.add(node);
      node.onended = () => {
        activeAudioNodes.delete(node);
        activeSources = Math.max(0, activeSources - 1);
        maybeResumeMic();
      };
    } catch (error) {
      speechStatus.textContent = `Could not play the local neural voice: ${error.message}`;
      ttsFinished = true;
      maybeResumeMic();
    }
  });

  $('#speakTranscript').onclick = () => {
    const text = [finalText, partialText].filter(Boolean).join(' ');
    if (text) playReply(text, replyLanguage);
  };
  $('#sendTranscriptToHelper').onclick = () => {
    const text = [finalText, partialText].filter(Boolean).join(' ');
    if (text) handleVoiceRequest(text, getVoiceLanguage());
  };
  $('#sendTranscriptToScreen').onclick = () => {
    const text = [finalText, partialText].filter(Boolean).join(' ');
    if (text) handleVoiceRequest(`Read my screen and help with this: ${text}`, getVoiceLanguage());
  };

  new MutationObserver(() => {
    const answer = $('#assistAnswer');
    if (!answer.hidden && answer.textContent.trim() && !answer.textContent.startsWith('Working on')) {
      replyText = answer.textContent.split('\n\n')[0];
      if (localStorage.getItem('bridgeux-microphone-permission') === 'granted') {
        playReply(replyText, getVoiceLanguage());
      }
    }
  }).observe($('#assistAnswer'), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });

})();
