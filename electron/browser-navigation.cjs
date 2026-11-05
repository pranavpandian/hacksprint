'use strict';

const knownWebsites = {
  youtube: 'https://www.youtube.com',
  'you tube': 'https://www.youtube.com',
  google: 'https://www.google.com',
  wikipedia: 'https://www.wikipedia.org',
  amazon: 'https://www.amazon.com',
  facebook: 'https://www.facebook.com',
  instagram: 'https://www.instagram.com',
  reddit: 'https://www.reddit.com',
  github: 'https://github.com',
  'stack overflow': 'https://stackoverflow.com',
  bbc: 'https://www.bbc.com',
  brave: 'https://search.brave.com'
};

function resolveKnownWebsite(value) {
  if (typeof value !== 'string') return null;
  const target = value.trim().toLocaleLowerCase()
    .replace(/^(?:please\s+)?(?:a|an|the|my)\s+/, '')
    .replace(/\s+(?:on|by|using)\s+(?:voice\s+)?(?:cmd|command)$/, '')
    .replace(/\s+(?:(?:web|home)\s+)?(?:page|webpage|website|site)$/, '')
    .replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  return knownWebsites[target] || null;
}

function normalizeWebsiteUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new Error('Say a website address, such as example.com.');
  const input = value.trim().replace(/[),.!?;]+$/, '');
  const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Only regular http or https websites can be opened.');
  return url.href;
}

module.exports = { normalizeWebsiteUrl, resolveKnownWebsite };
