'use strict';

function normalizeWebsiteUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error('Say a website address, such as example.com.');
  const input = value.trim().replace(/[),.!?;]+$/, '');
  const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Only regular http or https websites can be opened.');
  return url.href;
}

module.exports = { normalizeWebsiteUrl };
