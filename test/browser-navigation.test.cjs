'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWebsiteUrl, resolveKnownWebsite } = require('../electron/browser-navigation.cjs');

test('spoken website requests normalize bare domains and preserve valid web paths', () => {
  assert.equal(normalizeWebsiteUrl('example.com'), 'https://example.com/');
  assert.equal(normalizeWebsiteUrl('https://example.com/flights?from=JDH'), 'https://example.com/flights?from=JDH');
  assert.equal(normalizeWebsiteUrl('http://localhost:8080/'), 'http://localhost:8080/');
  assert.equal(normalizeWebsiteUrl('https://example.com.'), 'https://example.com/');
});

test('website requests cannot use executable or credential-bearing URLs', () => {
  for (const value of ['javascript:alert(1)', 'file:///C:/secret.txt', 'data:text/html,hi', 'https://user:pass@example.com', '']) {
    assert.throws(() => normalizeWebsiteUrl(value));
  }
  assert.throws(() => normalizeWebsiteUrl('a'.repeat(2049)));
});

test('spoken YouTube page requests open YouTube and video-on-screen requests remain agent tasks', () => {
  assert.equal(resolveKnownWebsite('a YouTube page on cmd'), 'https://www.youtube.com');
  assert.equal(resolveKnownWebsite('you tube webpage'), 'https://www.youtube.com');
  assert.equal(resolveKnownWebsite('the first video on YouTube'), null);
});
