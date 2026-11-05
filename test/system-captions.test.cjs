const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('system caption capture keeps its display tracks live until captions stop', async () => {
  const source = fs.readFileSync('system-captions.js', 'utf8');
  const stopped = { audio: 0, video: 0 };
  const tracks = ['audio', 'video'].map(kind => ({
    kind,
    readyState: 'live',
    stop() { stopped[kind]++; this.readyState = 'ended'; },
    addEventListener() {}
  }));
  let constraints;
  const stream = { getAudioTracks: () => [tracks[0]], getVideoTracks: () => [tracks[1]], getTracks: () => tracks };
  class AudioContext {
    destination = {};
    audioWorklet = { addModule: async () => {} };
    async resume() {}
    async close() {}
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createGain() { return { gain: {}, connect() {}, disconnect() {} }; }
  }
  class AudioWorkletNode {
    constructor() { this.port = {}; }
    connect() {}
    disconnect() {}
  }
  const listeners = {};
  const bridgeux = {
    setAgentStatus: async () => {}, getVoiceLanguage: async () => 'en',
    startSpeech: async () => ({ model: 'test model' }), stopSpeech: async () => {},
    sendSpeechAudio() {}, updateCaptionOverlay: async () => {}, onSpeechResult() {}, onSpeechError() {}
  };
  const window = {
    bridgeux,
    addEventListener: (name, listener) => { listeners[name] = listener; },
    dispatchEvent() {}
  };
  vm.runInNewContext(source, {
    window,
    document: { querySelector: () => null },
    navigator: { mediaDevices: { getDisplayMedia: options => { constraints = options; return Promise.resolve(stream); } } },
    AudioContext,
    AudioWorkletNode,
    setTimeout,
    clearTimeout,
    CustomEvent: class {}
  });

  await window.bridgeuxStartSystemCaptions();
  assert.equal(constraints.audio, true);
  assert.equal(tracks[0].readyState, 'live');
  assert.equal(tracks[1].readyState, 'live');
  assert.deepEqual(stopped, { audio: 0, video: 0 });
  await window.bridgeuxStopSystemCaptions();
  assert.deepEqual(stopped, { audio: 1, video: 1 });
});
