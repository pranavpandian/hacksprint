'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafeActionTask, validateSuggestedAction, isSafeAgentGoal, validateAgentAction } = require('../electron/screen-actions.cjs');

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
