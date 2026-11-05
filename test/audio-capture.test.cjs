const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('microphone worklet emits 16 kHz frames for the speech recognizer', () => {
  const source = fs.readFileSync('speech-capture.js', 'utf8');
  const chunks = [];
  let Processor;
  class AudioWorkletProcessor {
    constructor() { this.port = { postMessage: chunk => chunks.push(chunk) }; }
  }
  vm.runInNewContext(source, {
    AudioWorkletProcessor,
    sampleRate: 48000,
    registerProcessor: (name, processor) => { assert.equal(name, 'bridgeux-capture'); Processor = processor; }
  });
  const worklet = new Processor();
  worklet.process([[new Float32Array(48000 * 2).fill(0.25)]]);
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every(chunk => chunk.length === 8960));
  assert.ok(chunks.every(chunk => Math.abs(chunk[0] - 0.25) < 1e-6));
});

test('stereo system audio is downmixed before it reaches the recognizer', () => {
  const source = fs.readFileSync('speech-capture.js', 'utf8');
  const chunks = [];
  let Processor;
  class AudioWorkletProcessor { constructor() { this.port = { postMessage: chunk => chunks.push(chunk) }; } }
  vm.runInNewContext(source, {
    AudioWorkletProcessor, sampleRate: 48000,
    registerProcessor: (_name, processor) => { Processor = processor; }
  });
  new Processor().process([[new Float32Array(48000).fill(0.3), new Float32Array(48000).fill(0.1)]]);
  assert.equal(chunks.length, 1);
  assert.ok(Math.abs(chunks[0][0] - 0.2) < 1e-6);
});
