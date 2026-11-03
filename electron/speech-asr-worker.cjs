'use strict';
const path = require('node:path');
const { parentPort, workerData } = require('node:worker_threads');
const sherpa = require('sherpa-onnx-node');
const dir = workerData.modelDir;
const channel = message => message.channel === 'captions' ? 'captions' : 'voice';
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
const streams = { voice: null, captions: null };
const lastText = { voice: '', captions: '' };
parentPort.postMessage({ type: 'ready' });
parentPort.on('message', message => {
  try {
    if (message.type === 'start') {
      const key = channel(message);
      streams[key] = recognizer.createStream();
      streams[key].setOption('language', message.language === 'hi' ? 'hi' : 'en');
      lastText[key] = '';
      return;
    }
    if (message.type === 'stop') {
      const key = channel(message);
      const stream = streams[key];
      if (stream) {
        stream.inputFinished();
        while (recognizer.isReady(stream)) recognizer.decode(stream);
        const finalText = String(recognizer.getResult(stream).text || '').trim();
        if (finalText) parentPort.postMessage({ type: 'transcript', text: finalText, final: true, channel: key });
      }
      streams[key] = null;
      return;
    }
    if (message.type === 'pause') {
      // TTS replies are played through speakers. Drop the unfinished ASR
      // stream while speaking so playback cannot be transcribed as a command.
      streams.voice = null;
      lastText.voice = '';
      return;
    }
    const key = channel(message);
    const stream = streams[key];
    if (message.type !== 'audio' || !stream) return;
    stream.acceptWaveform({ samples: message.samples, sampleRate: 16000 });
    while (recognizer.isReady(stream)) recognizer.decode(stream);
    const text = String(recognizer.getResult(stream).text || '').trim();
    const final = recognizer.isEndpoint(stream);
    if (text && (text !== lastText[key] || final)) {
      parentPort.postMessage({ type: 'transcript', text, final, channel: key });
      lastText[key] = text;
    }
    if (final) { recognizer.reset(stream); lastText[key] = ''; }
  } catch (error) { parentPort.postMessage({ type: 'error', message: error.message, channel: channel(message) }); }
});
