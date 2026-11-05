'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectLocalModels } = require('../electron/local-models.cjs');

test('BridgeUX selects available local vision and assistant models before the configured fallback', () => {
  const selected = selectLocalModels(
    ['moondream:latest', 'qwen2.5:1.5b-instruct', 'qwen3-vl:2b'],
    ['qwen3.5:4b', 'qwen3.5:4b', 'qwen3-vl:2b-instruct', 'moondream:latest'],
    ['qwen3.5:4b', 'qwen3.5:4b', 'qwen3-vl:2b-instruct', 'qwen2.5:1.5b-instruct'],
    'qwen3.5:4b'
  );
  assert.deepEqual(selected, { vision: 'moondream:latest', assistant: 'qwen2.5:1.5b-instruct' });
});

test('BridgeUX keeps the preferred model as a clear fallback when no compatible model is installed', () => {
  const fallback = 'qwen3.5:4b';
  assert.deepEqual(selectLocalModels([], ['qwen3-vl:2b'], ['qwen3-vl:2b'], fallback), { vision: fallback, assistant: fallback });
});

test('legacy Qwen3-VL thinking tags are skipped for short JSON agent plans', () => {
  const fallback = 'qwen3.5:4b';
  assert.deepEqual(selectLocalModels(['qwen3-vl:2b'], ['qwen3-vl:2b-instruct', 'moondream:latest'], ['qwen3-vl:2b-instruct', 'qwen2.5:1.5b-instruct'], fallback), { vision: fallback, assistant: fallback });
});
