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
  let inputFrames = 0;
  let listeningWatchdog = null;
  let mutedOutput = null;
  let source = null;
  let finalText = '';
  let partialText = '';
  let replyText = '';
  let replyLanguage = 'en';
  let agentRequestInFlight = false;
  let lastVoiceAnswer = '';

  let playbackContext = null;
  let playbackCursor = 0;
  let activeTtsId = 0;
  let activeTtsText = '';
  let activeTtsLanguage = 'en';
  let activeSources = 0;
  let ttsFinished = false;
  let micPausedForReply = false;
  let micResumeInFlight = false;
  const activeAudioNodes = new Set();

  function speakWithSystemVoice(text = activeTtsText, language = activeTtsLanguage) {
    if (!text || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
    try {
      for (const node of activeAudioNodes) { try { node.stop(); } catch {} }
      activeAudioNodes.clear();
      activeSources = 0;
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      const voice = speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith(language === 'hi' ? 'hi' : 'en'));
      if (voice) utterance.voice = voice;
      utterance.onend = () => { ttsFinished = true; maybeResumeMic(); };
      utterance.onerror = () => { ttsFinished = true; maybeResumeMic(); };
      ttsFinished = false;
      speechSynthesis.speak(utterance);
      speechStatus.textContent = 'Using the Windows voice while the local voice recovers.';
      return true;
    } catch { return false; }
  }

  function getVoiceLanguage() {
    try { return JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}').interfaceLanguage === 'हिन्दी' ? 'hi' : 'en'; }
    catch { return 'en'; }
  }
  window.bridgeux.setVoiceLanguage(getVoiceLanguage());

  function setListening(active) {
    $('#startSpeech').disabled = active;
    $('#stopSpeech').disabled = !active;
  }

  async function pauseMicForReply() {
    const overlayListening = await window.bridgeux.isVoiceListening().catch(() => false);
    if (!stream && !overlayListening) return;
    micPausedForReply = true;
    if (stream && inputContext && inputContext.state !== 'closed' && inputContext.state === 'running') await inputContext.suspend();
    await window.bridgeux.pauseSpeech();
  }

  async function maybeResumeMic() {
    if (!ttsFinished || activeSources > 0 || micResumeInFlight) return;
    if (!micPausedForReply) return;
    const overlayListening = await window.bridgeux.isVoiceListening().catch(() => false);
    if ((!stream || !inputContext || inputContext.state === 'closed') && !overlayListening) {
      micPausedForReply = false;
      return;
    }

    micPausedForReply = false;
    micResumeInFlight = true;
    try {
      await window.bridgeux.startSpeech(getVoiceLanguage(), 'voice');
      if (stream && inputContext?.state === 'suspended') await inputContext.resume();
      speechStatus.textContent = 'Listening and replying locally.';
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
    activeTtsText = String(text).slice(0, 4000);
    activeTtsLanguage = language;
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
        text: activeTtsText,
        language,
        requestId
      });
    } catch (error) {
      speechStatus.textContent = `Local voice could not start: ${error.message}`;
      if (speakWithSystemVoice()) return;
      ttsFinished = true;
      await maybeResumeMic();
    }
  }

  window.bridgeuxSpeak = (text, language = getVoiceLanguage()) => playReply(text, language);

  async function stopListening(message = 'Microphone stopped.') {
    clearTimeout(listeningWatchdog);
    listeningWatchdog = null;
    try {
      if (worklet) {
        worklet.disconnect();
        worklet.port.close();
        worklet = null;
      }
      if (mutedOutput) { mutedOutput.disconnect(); mutedOutput = null; }
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
    window.bridgeux.setAgentStatus({ listening: false, message });
  }

  async function startListening() {
    setListening(true);
    speechStatus.textContent = 'Connecting microphone…';
    try {
      const language = getVoiceLanguage();
      if (!inputContext || inputContext.state === 'closed') inputContext = new AudioContext();
      await inputContext.resume();
      stream = stream || await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      localStorage.setItem('bridgeux-microphone-permission', 'granted');
      speechStatus.textContent = 'Loading the local speech model…';
      const ready = await window.bridgeux.startSpeech(language);
      await inputContext.audioWorklet.addModule('speech-capture.js');
      source = inputContext.createMediaStreamSource(stream);
      worklet = new AudioWorkletNode(inputContext, 'bridgeux-capture');
      inputFrames = 0;
      worklet.port.onmessage = event => {
        inputFrames++;
        if (inputFrames === 1) speechStatus.textContent = 'Microphone audio connected. Speak a short request.';
        window.bridgeux.sendSpeechAudio(event.data);
      };
      source.connect(worklet);
      // A worklet that is not connected to the render graph may never be pulled.
      // Route its silent output through a zero-gain node to keep capture running.
      mutedOutput = inputContext.createGain();
      mutedOutput.gain.value = 0;
      worklet.connect(mutedOutput);
      mutedOutput.connect(inputContext.destination);
      speechStatus.textContent = `${ready.model}. Microphone connected; listening in ${language === 'hi' ? 'Hindi' : 'English'}.`;
      listeningWatchdog = setTimeout(() => {
        if (inputFrames === 0) speechStatus.textContent = 'The microphone opened, but no audio is reaching the recognizer. Check the selected Windows microphone.';
        else if (!partialText) speechStatus.textContent = 'Microphone audio is reaching the recognizer, but it has not recognized words yet. Check the selected language and speak close to the microphone.';
      }, 8000);
      window.bridgeux.setAgentStatus({ listening: true, message: `Listening in ${language === 'hi' ? 'Hindi' : 'English'}…` });
      finalText = '';
      partialText = '';
      transcript.textContent = language === 'hi' ? 'सुन रहा हूँ… हिन्दी में बोलें।' : 'Listening… speak in English.';
      $('#speakTranscript').disabled = false;
      $('#sendTranscriptToHelper').disabled = false;
      $('#sendTranscriptToScreen').disabled = false;
    } catch (error) {
      const access = await window.bridgeux.getMicrophoneAccessStatus?.().catch(() => 'unknown');
      const message = error.name === 'NotAllowedError' || access === 'denied' || access === 'restricted'
        ? 'Windows blocked microphone access. Turn on microphone access for desktop apps in Windows Settings, then try again.'
        : `Could not start listening: ${error.message || 'Check microphone access and local speech model files.'}`;
      $('#openMicrophoneSettings').hidden = access !== 'denied' && access !== 'restricted' && error.name !== 'NotAllowedError';
      await stopListening(message);
    }
  }

  async function handleVoiceRequest(text, language) {
    const normalized = text.toLocaleLowerCase();
    replyLanguage = language;

    if (/\b(?:stop|halt|cancel) (?:the )?(?:agent|automation|computer|pc)\b|एजेंट बंद/.test(normalized)) {
      window.bridgeuxStopAgent?.();
      window.bridgeuxCancelPendingForm?.();
      replyText = language === 'hi' ? 'एजेंट रोक दिया।' : 'I stopped the agent.';
      playReply(replyText, language);
      return;
    }
    if (/\b(stop listening|stop microphone|pause listening)\b|सुनना बंद/.test(normalized)) {
      window.bridgeuxStopAgent?.();
      window.bridgeuxCancelPendingForm?.();
      await stopListening('Voice listening stopped by request.');
      replyText = 'I stopped listening.';
      playReply(replyText, language);
      return;
    }
    if (/\b(repeat that|say that again|read that again)\b|फिर से बोल/.test(normalized)) {
      playReply(replyText || 'I do not have a previous reply yet.', language);
      return;
    }
    if (window.bridgeuxHasPendingForm?.()) {
      replyText = await window.bridgeuxAnswerForm(text, language);
      playReply(replyText, language);
      return;
    }
    if (agentRequestInFlight) return;

    const websiteRequest = text.match(/\b(?:open|visit|go to|navigate to)\s+(?:(?:the\s+)?(?:website|site)\s+)?(https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[a-z0-9._~:/?#\[\]@!$&'()*+,;=%-]*)?)/i);
    const siteIntent = text.match(/\b(?:open|visit|go to|navigate to)\s+(?:(?:the\s+)?(?:website|site)\s+)?(.+?)(?:\s+(?:website|site))?[.!?]*$/i);
    const browserOnly = /^\s*(?:please\s+)?(?:open|launch|start) (?:my )?(?:default )?(?:web )?browser\s*[.!?]*$|^\s*(?:please\s+)?open brave\s*[.!?]*$/i.test(text);
    const requestedTarget = siteIntent?.[1] || '';
    const siteAliasUrl = siteIntent ? await window.bridgeux.resolveKnownWebsite(requestedTarget) : null;
    const namedWebsite = Boolean(siteIntent && (siteAliasUrl || /\b(?:website|site|homepage)\b/i.test(siteIntent[0]) && !/\b(?:first|video|screen|tab|link)\b/i.test(requestedTarget)));
    const afterWebsiteUrl = websiteRequest ? text.slice(websiteRequest.index + websiteRequest[0].length) : '';
    const websiteWithFollowup = Boolean((websiteRequest || siteIntent) && /\b(?:and then|then|and|to|so that)\b/i.test(afterWebsiteUrl || requestedTarget));
    if ((websiteRequest && !websiteWithFollowup) || siteAliasUrl || (namedWebsite && !websiteWithFollowup) || browserOnly) {
      try {
        let url = websiteRequest?.[1] || siteAliasUrl || (browserOnly ? 'https://www.google.com' : '');
        if (!url && namedWebsite && requestedTarget) {
          const found = await window.bridgeux.searchWeb({ query: `${requestedTarget} official website`, language: getVoiceLanguage() === 'hi' ? 'हिन्दी' : 'English' });
          url = found.sources[0]?.url;
        }
        if (!url) throw new Error('I could not find a website for that name. Try saying its web address.');
        const result = await window.bridgeux.openWebsite(url);
        replyText = language === 'hi' ? `वेबसाइट खोल दी: ${result.url}` : `Opened ${result.url}`;
      } catch (error) {
        replyText = error.message || 'I could not open your default browser.';
      }
      playReply(replyText, language);
      return;
    }

    const needsWebSearch = /\b(?:flights?|airfares?|weather|news|today|latest|current price|search (?:the )?web|search (?:the )?internet|look up (?:online|on the internet))\b/i.test(text);
    if (needsWebSearch && !websiteWithFollowup && window.bridgeux?.searchWeb) {
      const output = $('#assistAnswer');
      output.hidden = false;
      output.textContent = 'Searching the web for this question…';
      $('#assistant').scrollIntoView({ behavior: 'smooth' });
      try {
        const result = await window.bridgeux.searchWeb({ query: text, language: getVoiceLanguage() === 'hi' ? 'हिन्दी' : 'English' });
        replyText = result.answer;
        output.textContent = `${result.answer}\n\nSources:\n${result.sources.map((source, index) => `${index + 1}. ${source.title}\n${source.url}`).join('\n')}`;
      } catch (error) {
        replyText = error.message || 'I could not search the web right now.';
        output.textContent = replyText;
      }
      playReply(replyText, language);
      return;
    }

    const handsFree = Boolean(window.bridgeuxAgentEnabled?.());
    const screenRequest = handsFree || websiteWithFollowup || /\b(screen|this page|current page|what is visible|what.?s on (my )?screen|read (this|the page)|click|tap|press|type into|fill (this|the|my)|enter into|open this|open|visit|go to|navigate to|button|form field|submit this|pause|resume|unpause|mute|unmute)\b/i.test(text) || /स्क्रीन|पेज पर|बटन दब|फॉर्म भर|क्लिक|टाइप|खोलो|खोलें|चुनो|चुनें/.test(text);
    if (screenRequest) {
      $('#screenTask').value = text;
      const screenChoice = $('#screenChoice');
      localStorage.setItem('bridgeux-last-voice-language', language);
      speechStatus.textContent = 'Reading the screen and working on your request locally…';
      if (window.bridgeuxRunAgent) {
        agentRequestInFlight = true;
        try {
          if (!handsFree) await window.bridgeuxSetAgentMode(true, true);
          replyText = await window.bridgeuxRunAgent(text, language);
        }
        catch (error) { replyText = error.message || 'The local agent could not finish that request.'; }
        finally { agentRequestInFlight = false; await window.bridgeuxFinishOneShot?.(); }
        playReply(replyText, language);
        return;
      }
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
      replyText = result.answer;
      answer.textContent = `${result.answer}\n\n${result.source}`;
    } catch {
      replyText = 'I could not reach the local assistant. Check that Ollama is running and that Qwen is installed.';
      answer.textContent = replyText;
    }
    lastVoiceAnswer = replyText;
    playReply(replyText, language);
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
      $('#openMicrophoneSettings').hidden = true;
      dialog.close();
      await startListening();
      playReply(getVoiceLanguage() === 'hi' ? 'नमस्ते। बताइए, आपको किस चीज़ में मदद चाहिए।' : 'Hello. Tell me what you need, and I will answer out loud.', getVoiceLanguage());
    } catch (error) {
      const access = await window.bridgeux.getMicrophoneAccessStatus?.().catch(() => 'unknown');
      permissionStatus.textContent = error.name === 'NotAllowedError' || access === 'denied' || access === 'restricted'
        ? 'Windows blocked microphone access. Turn on microphone access for desktop apps in Windows Settings, then try again.'
        : error.message;
      $('#openMicrophoneSettings').hidden = access !== 'denied' && access !== 'restricted' && error.name !== 'NotAllowedError';
      button.disabled = false;
    }
  };
  $('#openMicrophoneSettings').onclick = () => window.bridgeux.openMicrophoneSettings().catch(error => {
    permissionStatus.textContent = `Could not open Windows microphone settings: ${error.message}`;
  });

  $('#talkToMe').onclick = () => playReply(getVoiceLanguage() === 'hi' ? 'ब्रिज यूएक्स में आपका स्वागत है। बताइए, आपको किस चीज़ में मदद चाहिए।' : 'Welcome to BridgeUX. Tell me what you need; I will listen and reply aloud.');
  $('#startSpeech').onclick = () => startListening();
  $('#stopSpeech').onclick = () => stopListening();
  window.addEventListener('bridgeux:preferences-changed', async () => {
    window.bridgeux.setVoiceLanguage(getVoiceLanguage());
    if (!stream || $('#stopSpeech').disabled) return;
    await stopListening('Restarting speech with your updated language…');
    await startListening();
  });

  window.bridgeux.onSpeechResult(result => {
    if (result.channel === 'captions') return;
    if (result.type === 'error') {
      speechStatus.textContent = `Speech recognizer error: ${result.message}`;
      return;
    }
    if (result.type !== 'transcript') return;
    const text = String(result.text || '').trim();
    if (!text) return;
    clearTimeout(listeningWatchdog);
    listeningWatchdog = null;
    if (result.final) {
      finalText = [finalText, text].filter(Boolean).join(' ');
      partialText = '';
      const language = getVoiceLanguage();
      replyLanguage = language;
      localStorage.setItem('bridgeux-last-voice-language', language);
      speechStatus.textContent = `Heard ${language === 'hi' ? 'Hindi' : 'English'} · working locally…`;
      window.bridgeux.setAgentStatus({ listening: true, message: `Heard: ${text}` });
      $('#liveRegion').textContent = `${language === 'hi' ? 'Hindi' : 'English'} speech: ${text}`;
      if (text.length >= 3) handleVoiceRequest(text, language).catch(error => {
        replyText = error.message || 'I could not complete that voice request.';
        speechStatus.textContent = replyText;
        playReply(replyText, language);
      });
    } else {
      partialText = text;
    }
    transcript.textContent = [finalText, partialText].filter(Boolean).join(' ') || 'Listening…';
  });
  window.bridgeux.onSpeechError?.(error => {
    if (error.channel !== 'voice') return;
    const message = `Speech recognition failed: ${error.message}`;
    stopListening(message).then(() => { speechStatus.textContent = message; $('#liveRegion').textContent = message; });
  });

  window.bridgeux.onOverlayCommand(async command => {
    const language = getVoiceLanguage();
    if (command.type === 'toggle-listening') {
      if (stream) await stopListening(); else await startListening();
    } else if (command.type === 'ask-screen') {
      await handleVoiceRequest('Read my current screen and explain it in simple language.', language);
    } else if (command.type === 'ask' && command.text) {
      await handleVoiceRequest(command.text, language);
    } else if (command.type === 'stop-all') {
      window.bridgeuxStopAgent?.();
      await stopListening();
      await window.bridgeuxStopSystemCaptions?.();
    }
  });

  window.bridgeux.onTtsAudio(message => {
    if (message.requestId != null && message.requestId !== activeTtsId) return;
    if (message.type === 'error') {
      speechStatus.textContent = 'The local voice failed. Trying the Windows voice instead.';
      if (speakWithSystemVoice()) return;
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
      if (lastVoiceAnswer && replyText === lastVoiceAnswer) { lastVoiceAnswer = ''; return; }
      if (localStorage.getItem('bridgeux-microphone-permission') === 'granted') {
        playReply(replyText, getVoiceLanguage());
      }
    }
  }).observe($('#assistAnswer'), { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });

})();
