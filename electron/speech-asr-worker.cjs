'use strict';
const path = require('node:path');
const { parentPort, workerData } = require('node:worker_threads');
const sherpa = require('sherpa-onnx-node');
const dir = workerData.modelDir;
const recognizer = new sherpa.OnlineRecognizer({
  featConfig: { sampleRate: 16000, featureDim: 80 },
  modelConfig: {
    transducer: {
      encoder: path.join(dir, 'encoder.int8.onnx'),
      decoder: path.join(dir, 'decoder.int8.onnx'),
      joiner: path.join(dir, 'joiner.int8.onnx')
    },
    tokens: path.join(dir, 'tokens.txt'), numThreads: 4, provider: 'cpu'
  },
  decodingMethod: 'greedy_search', enableEndpoint: true, numThreads: 4
});
let stream = null;
let lastText = '';
parentPort.postMessage({ type: 'ready' });
parentPort.on('message', message => {
  try {
    if (message.type === 'start') {
      stream = recognizer.createStream();
      const language = message.language === 'hi' ? 'hi' : 'en';
      stream.setOption('language', language);
      lastText = '';
      return;
    }
    if (message.type === 'stop') {
      if (stream) {
        stream.inputFinished();
        while (recognizer.isReady(stream)) recognizer.decode(stream);
        const finalText = String(recognizer.getResult(stream).text || '').trim();
        if (finalText) parentPort.postMessage({ type: 'transcript', text: finalText, final: true });
      }
      stream = null;
      return;
    }
    if (message.type === 'pause') {
      // TTS replies are played through speakers. Drop the unfinished ASR
      // stream while speaking so playback cannot be transcribed as a command.
      stream = null;
      lastText = '';
      return;
    }
    if (message.type !== 'audio' || !stream) return;
    stream.acceptWaveform({ samples: message.samples, sampleRate: 16000 });
    while (recognizer.isReady(stream)) recognizer.decode(stream);
    const text = String(recognizer.getResult(stream).text || '').trim();
    const final = recognizer.isEndpoint(stream);
    if (text && (text !== lastText || final)) {
      parentPort.postMessage({ type: 'transcript', text, final });
      lastText = text;
    }
    if (final) { recognizer.reset(stream); lastText = ''; }
  } catch (error) { parentPort.postMessage({ type: 'error', message: error.message }); }
});
