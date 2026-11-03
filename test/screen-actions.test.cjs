'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafeActionTask, validateSuggestedAction, isSafeAgentGoal, validateAgentAction, validateUiAgentAction } = require('../electron/screen-actions.cjs');

const screen = { width: 1280, height: 720 };

test('only an explicit, low-risk action request can ask the model for an action', () => {
  assert.equal(isSafeActionTask('Click the settings button'), true);
  assert.equal(isSafeActionTask('Please type hello in the search field'), true);
  assert.equal(isSafeActionTask('Describe the settings button'), false);
  assert.equal(isSafeActionTask('Submit this form'), false);
  assert.equal(isSafeActionTask('Do not click the button'), false);
  assert.equal(isSafeActionTask('बटन दबाएं'), true);
  assert.equal(isSafeActionTask('कृपया टाइप नमस्ते'), true);
  assert.equal(isSafeActionTask('भुगतान करें'), false);
});

test('click proposals must be in bounds and match the user request', () => {
  const action = { type: 'click', x: 50, y: 60, reason: 'Open settings' };
  assert.deepEqual(validateSuggestedAction(action, screen, 'Click settings'), action);
  assert.deepEqual(validateSuggestedAction(action, screen, 'बटन दबाएं'), action);
  assert.equal(validateSuggestedAction({ ...action, x: 1280 }, screen, 'Click settings'), null);
  assert.equal(validateSuggestedAction(action, screen, 'Type settings'), null);
});

test('text proposals require an explicit type request and bounded text', () => {
  const action = { type: 'type', text: 'hello', reason: 'Enter the requested text' };
  assert.deepEqual(validateSuggestedAction(action, screen, 'Type hello'), action);
  assert.equal(validateSuggestedAction({ ...action, text: 'x'.repeat(1001) }, screen, 'Type text'), null);
  assert.equal(validateSuggestedAction(action, screen, 'Fill and submit this form'), null);
});

test('key proposals are restricted to the approved key allowlist', () => {
  const action = { type: 'press', key: 'TAB', reason: 'Move to the next field' };
  assert.deepEqual(validateSuggestedAction(action, screen, 'Press Tab'), action);
  assert.equal(validateSuggestedAction({ ...action, key: 'ALT+F4' }, screen, 'Press Alt+F4'), null);
});

test('agent goals and autonomous actions stay within the low-risk allowlist', () => {
  assert.equal(isSafeAgentGoal('Open the help menu'), true);
  assert.equal(isSafeAgentGoal('Send this message'), false);
  assert.equal(isSafeAgentGoal('Delete the file'), false);
  assert.equal(isSafeAgentGoal('Add this item to my cart'), false);
  const click = { type: 'click', x: 50, y: 60, target: 'Help menu', reason: 'Open help' };
  assert.deepEqual(validateAgentAction(click, screen, 'Open the help menu'), click);
  assert.equal(validateAgentAction({ ...click, target: 'Submit button' }, screen, 'Open the help menu'), null);
  assert.equal(validateAgentAction({ ...click, x: 1280 }, screen, 'Open the help menu'), null);
  const type = { type: 'type', target: 'Search field', text: 'cats', reason: 'Search for cats' };
  assert.deepEqual(validateAgentAction(type, screen, 'Search the web for cats'), type);
  assert.equal(validateAgentAction({ ...type, text: 'private data' }, screen, 'Search the web for cats'), null);
  assert.equal(validateAgentAction({ type: 'press', key: 'ENTER', target: 'Form submit button', reason: 'Continue' }, screen, 'Open help'), null);
  const enterSearch = { type: 'press', key: 'ENTER', target: 'Google search field', reason: 'Search' };
  assert.deepEqual(validateAgentAction(enterSearch, screen, 'Search for cats'), enterSearch);
});

test('Windows UI actions target named safe controls and exact user-provided search text', () => {
  const snapshot = { elements: [
    { id: 'e1', name: 'Help', role: 'Hyperlink', automationId: '', password: false },
    { id: 'e2', name: 'Search', role: 'Edit', automationId: 'q', password: false },
    { id: 'e3', name: 'Password', role: 'Edit', automationId: 'pw', password: true },
    { id: 'e4', name: 'Delete account', role: 'Button', automationId: '', password: false }
  ] };
  const openHelp = { type: 'invoke', elementId: 'e1', reason: 'Open help' };
  assert.deepEqual(validateUiAgentAction(openHelp, snapshot, 'Open the help page'), openHelp);
  const search = { type: 'setValue', elementId: 'e2', value: 'Chennai to Jodhpur flights', reason: 'Search the requested route' };
  assert.deepEqual(validateUiAgentAction(search, snapshot, 'Search for Chennai to Jodhpur flights'), search);
  assert.equal(validateUiAgentAction({ ...search, value: 'another route' }, snapshot, 'Search for Chennai to Jodhpur flights'), null);
  assert.equal(validateUiAgentAction({ ...search, elementId: 'e3' }, snapshot, 'Search for Chennai to Jodhpur flights'), null);
  assert.equal(validateUiAgentAction({ ...openHelp, elementId: 'e4' }, snapshot, 'Open the help page'), null);
});

test('an explicit Google Forms request can submit only the actual Google Forms Submit button', () => {
  const snapshot = { url: 'https://docs.google.com/forms/d/e/example/viewform', elements: [
    { id: 'send', name: 'Submit', role: 'Button', password: false },
    { id: 'other', name: 'Submit', role: 'Button', password: false }
  ] };
  const submit = { type: 'invoke', elementId: 'send', reason: 'Submit the filled form' };
  assert.equal(isSafeAgentGoal('Fill this Google Form and submit it', snapshot), true);
  assert.deepEqual(validateUiAgentAction(submit, snapshot, 'Fill this Google Form and submit it'), submit);
  assert.equal(isSafeAgentGoal('Submit this other form', snapshot), false);
  assert.equal(validateUiAgentAction({ ...submit, elementId: 'send' }, { ...snapshot, url: 'https://example.com/form' }, 'Fill this Google Form and submit it'), null);
});

test('first-video shortcut selects the first visible YouTube watch link from the active page tree', () => {
  const { firstVisibleYoutubeVideo, youtubeMediaControl, browserMediaIntent, routeAgentTask } = require('../electron/browser-intents.cjs');
  const first = { id: 'e1', name: 'Video one', role: 'Hyperlink', value: 'https://www.youtube.com/watch?v=abc123' };
  const second = { id: 'e2', name: 'Video two', role: 'Hyperlink', value: 'https://www.youtube.com/watch?v=def456' };
  assert.equal(firstVisibleYoutubeVideo('Open the first video', { windowTitle: 'YouTube - Brave', elements: [first, second] }), first);
  assert.equal(firstVisibleYoutubeVideo('Open the first video', { windowTitle: 'Search - Brave', elements: [first, second] }), null);
  assert.equal(firstVisibleYoutubeVideo('Play music', { windowTitle: 'YouTube - Brave', elements: [first, second] }), null);
  assert.equal(browserMediaIntent('Pause the video'), 'pause');
  assert.equal(browserMediaIntent('Resume it'), 'play');
  assert.equal(browserMediaIntent('Mute the YouTube video'), 'mute');
  assert.equal(browserMediaIntent('Unmute it'), 'unmute');
  assert.equal(browserMediaIntent('Play the first video on YouTube'), null);
  assert.equal(routeAgentTask('Pause the video', { source: 'browser' }).agent, 'browser-control');
  assert.equal(youtubeMediaControl('pause', { windowTitle: 'YouTube - Brave', elements: [{ id: 'pause', name: 'Pause (k)', role: 'Button' }] }).id, 'pause');
});

test('local browser bridge authenticates the extension and returns page task results', async () => {
  const { createBrowserBridge } = require('../electron/browser-bridge.cjs');
  const token = 'test-pairing-token';
  const bridge = createBrowserBridge(token, 0, async request => ({ answer: `Explained: ${request.text}`, source: 'test-local-model' }));
  try {
    await new Promise(resolve => setTimeout(resolve, 20));
    const base = `http://127.0.0.1:${bridge.port}`;
    const unauthorized = await fetch(`${base}/v1/poll`);
    assert.equal(unauthorized.status, 401);
    const status = await fetch(`${base}/v1/status`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await status.json()).ok, true);
    const assist = await fetch(`${base}/v1/assist`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'explain', text: 'a visible page', language: 'English' }) });
    assert.equal((await assist.json()).answer, 'Explained: a visible page');
    await fetch(`${base}/v1/poll`, { headers: { Authorization: `Bearer ${token}` } });
    const result = bridge.request('snapshot');
    const response = await fetch(`${base}/v1/poll`, { headers: { Authorization: `Bearer ${token}` } });
    const job = await response.json();
    assert.equal(job.type, 'snapshot');
    await fetch(`${base}/v1/result`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id, result: { url: 'https://example.com', elements: [] } }) });
    assert.equal((await result).url, 'https://example.com');
    const mediaAction = bridge.request('action', { action: { type: 'media', intent: 'pause' } });
    const mediaPoll = await fetch(`${base}/v1/poll`, { headers: { Authorization: `Bearer ${token}` } });
    const mediaJob = await mediaPoll.json();
    assert.equal(mediaJob.type, 'action');
    assert.equal(mediaJob.payload.action.intent, 'pause');
    await fetch(`${base}/v1/result`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: mediaJob.id, result: { ok: true, message: 'Paused the YouTube video.' } }) });
    assert.equal((await mediaAction).message, 'Paused the YouTube video.');
  } finally { bridge.close(); }
});

test('an occupied browser bridge port is reported without crashing the app', async () => {
  const http = require('node:http');
  const { createBrowserBridge } = require('../electron/browser-bridge.cjs');
  const owner = http.createServer();
  await new Promise(resolve => owner.listen(0, '127.0.0.1', resolve));
  const bridge = createBrowserBridge('test-pairing-token', owner.address().port);
  try {
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.match(bridge.error, /port is in use/i);
    await assert.rejects(bridge.request('snapshot'), /port is in use/i);
  } finally {
    bridge.close();
    await new Promise(resolve => owner.close(resolve));
  }
});
