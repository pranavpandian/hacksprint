'use strict';
const path = require('node:path');
const { parentPort, workerData } = require('node:worker_threads');
const sherpa = require('sherpa-onnx-node');
const phonemizer = require('piper-phonemize-node');
const dir = workerData.modelDir;
const voices = new Map();
const voiceLoads = new Map();
const queue = [];
let busy = false;
let phonemizerInitialized = false;
function initializePhonemizer() {
  if (phonemizerInitialized) return;
  const englishDataDir = path.join(dir, 'vits-piper-en_US-lessac-medium');
  if (phonemizer.initialize(englishDataDir) <= 0) throw new Error('Could not initialize the local English/Hindi phonemizer data.');
  phonemizerInitialized = true;
}
async function getVoice(language) {
  if (voices.has(language)) return voices.get(language);
  if (voiceLoads.has(language)) return voiceLoads.get(language);
  const folder = path.join(dir, language === 'hi' ? 'vits-piper-hi_IN-pratham-medium' : 'vits-piper-en_US-lessac-medium');
  const model = language === 'hi' ? 'hi_IN-pratham-medium.onnx' : 'en_US-lessac-medium.onnx';
  const load = sherpa.OfflineTts.createAsync({
    model: { vits: { model: path.join(folder, model), tokens: path.join(folder, 'tokens.txt') }, numThreads: 2, provider: 'cpu' },
    maxNumSentences: 1
  });
  voiceLoads.set(language, load);
  try {
    const voice = await load;
    voices.set(language, voice);
    return voice;
  } finally {
    voiceLoads.delete(language);
  }
}
async function processQueue(){
  if(busy)return;busy=true;
  while(queue.length){const message=queue.shift();
  try {
    const voice = await getVoice(message.language);
    initializePhonemizer();
    const phonemes = phonemizer.phonemize(message.text, message.language === 'hi' ? 'hi' : 'en-us');
    if (!phonemes?.length) throw new Error('The local phonemizer could not read this text.');
    await voice.generateAsync({
      text: message.text,
      generationConfig: new sherpa.GenerationConfig({ sid: 0, speed: 1.0, silenceScale: 0.2, phonemeCodepoints: phonemes }),
      onProgress: audio => {
        // Do not transfer the native addon's buffer: detaching it can make
        // generateAsync reject while it is still settling its final result.
        const samples = Float32Array.from(audio.samples);
        parentPort.postMessage({ type: 'audio', requestId: message.requestId, samples, sampleRate: voice.sampleRate }, [samples.buffer]);
        return 1;
      }
    });
    parentPort.postMessage({ type: 'done', requestId: message.requestId });
  } catch (error) {
    parentPort.postMessage({ type: 'error', requestId: message.requestId, message: error?.stack || String(error) });
  }
  }
  busy=false;
}
parentPort.on('message', message => {if(message.type==='speak'){queue.push(message);processQueue()}});
