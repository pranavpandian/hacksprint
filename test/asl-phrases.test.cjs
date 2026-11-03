'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('ASL fingerspelling phrase shortcuts match only supported exact phrases', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync('asl-phrases.js', 'utf8'), { window });
  assert.equal(window.bridgeuxResolveAslPhrase('HELLO'), 'Hello!');
  assert.equal(window.bridgeuxResolveAslPhrase('how   are you'), 'How are you?');
  assert.equal(window.bridgeuxResolveAslPhrase('THANK YOU'), 'Thank you!');
  assert.equal(window.bridgeuxResolveAslPhrase('HOW ARE'), '');
  assert.equal(window.bridgeuxResolveAslPhrase('HELLO THERE'), '');
});
