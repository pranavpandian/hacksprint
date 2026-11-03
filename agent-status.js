'use strict';
const $ = selector => document.querySelector(selector);
const state = { active: false, listening: false, captionsActive: false };
let micStream = null;
let micContext = null;
let micSource = null;
let micWorklet = null;
let micSink = null;

function renderStatus(value = {}) {
  Object.assign(state, value);
  const busy = state.active || state.listening || state.captionsActive;
  const pill = $('#statePill');
  pill.classList.toggle('active', busy);
  $('#stateLabel').textContent = state.captionsActive ? 'Captions on' : state.listening ? 'Listening' : state.active ? 'Working' : 'Ready';
  $('#message').textContent = state.message || (state.listening ? 'Listening for your request…' : state.active ? 'Working on your request…' : 'BridgeUX is ready');
  $('#statusIcon').textContent = state.listening ? '🎙' : state.captionsActive ? 'CC' : state.active ? '✦' : '◉';
  $('#statusIcon').classList.toggle('listening', state.listening);
  $('#listenLabel').textContent = state.listening ? 'Stop listening' : 'Start listening';
  $('#listen').classList.toggle('primary', !state.listening);
  $('#listen').classList.toggle('listening', state.listening);
  $('#captionsLabel').textContent = state.captionsActive ? 'Stop live captions' : 'Live captions';
}

window.bridgeux?.onAgentStatus(renderStatus);
window.bridgeux?.onSpeechResult(result => {
  if (result.channel !== 'voice' || !result.text) return;
  $('#transcript').textContent = result.text;
  if (result.final) renderStatus({ message: `Heard: ${result.text}` });
});
window.bridgeux?.onCaptionText(payload => {
  if (payload?.text) $('#transcript').textContent = payload.text;
});

async function startVoice() {
  if (state.listening) return;
  $('#listen').disabled = true;
  $('#message').textContent = 'Connecting microphone…';
  try {
    micContext = new AudioContext();
    await micContext.resume();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    const language = await window.bridgeux.getVoiceLanguage();
    const ready = await window.bridgeux.startSpeech(language, 'voice');
    await micContext.audioWorklet.addModule('speech-capture.js');
    micSource = micContext.createMediaStreamSource(micStream);
    micWorklet = new AudioWorkletNode(micContext, 'bridgeux-capture');
    micSink = micContext.createGain();
    micSink.gain.value = 0;
    micWorklet.port.onmessage = event => window.bridgeux.sendSpeechAudio(event.data, 'voice');
    micSource.connect(micWorklet);
    micWorklet.connect(micSink);
    micSink.connect(micContext.destination);
    micStream.getAudioTracks().forEach(track => track.addEventListener('ended', stopVoice, { once: true }));
    renderStatus({ listening: true, message: `Listening in ${language === 'hi' ? 'Hindi' : 'English'} · ${ready.model}` });
    window.bridgeux.setAgentStatus({ listening: true, message: 'Listening in the selected language…' }).catch(() => {});
  } catch (error) {
    await stopVoice();
    $('#message').textContent = `Could not start listening: ${error.message}`;
  } finally { $('#listen').disabled = false; }
}

async function stopVoice(stopWorker = true) {
  state.listening = false;
  for (const node of [micSource, micWorklet, micSink]) { try { node?.disconnect(); } catch {} }
  micSource = micWorklet = micSink = null;
  micStream?.getTracks().forEach(track => track.stop());
  micStream = null;
  try { await micContext?.close(); } catch {}
  micContext = null;
  if (stopWorker) await window.bridgeux?.stopSpeech('voice').catch(() => {});
  renderStatus({ listening: false, message: state.captionsActive ? 'Live captions are on.' : 'Listening stopped.' });
  window.bridgeux?.setAgentStatus({ listening: false, message: state.captionsActive ? 'Live captions are on.' : 'Listening stopped.' }).catch(() => {});
}

$('#listen').addEventListener('click', () => {
  if (micStream) stopVoice();
  else if (state.listening) window.bridgeux?.sendOverlayCommand({ type: 'toggle-listening' });
  else startVoice();
});
$('#screen').addEventListener('click', () => window.bridgeux?.sendOverlayCommand({ type: 'ask-screen' }));
$('#openApp').addEventListener('click', () => window.bridgeux?.showMainWindow());
$('#captions').addEventListener('click', async () => {
  if (state.captionsActive) { await window.bridgeuxStopSystemCaptions?.(); return; }
  try { await window.bridgeuxStartSystemCaptions?.(); }
  catch (error) { $('#message').textContent = error.message; }
});
$('#quickAsk').addEventListener('submit', event => {
  event.preventDefault();
  const text = $('#prompt').value.trim();
  if (!text) { $('#prompt').focus(); return; }
  window.bridgeux?.sendOverlayCommand({ type: 'ask', text });
  $('#prompt').value = '';
  $('#message').textContent = 'BridgeUX is working on your request…';
});
$('#stopAll').addEventListener('click', async () => {
  await stopVoice();
  await window.bridgeuxStopSystemCaptions?.();
  window.bridgeux?.requestAgentStop();
  window.bridgeux?.sendOverlayCommand({ type: 'stop-all' });
});
$('#hide').addEventListener('click', () => window.bridgeux?.sendOverlayCommand({ type: 'dismiss' }));
