'use strict';

const http = require('node:http');
const { randomUUID } = require('node:crypto');

function createBrowserBridge(token, port = 18765, assist = null) {
  const jobs = [];
  const waiting = new Map();
  let connectedAt = 0;
  let listenError = null;
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401).end(); return; }
    const route = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
    if (req.method === 'GET' && route === '/v1/status') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, connected: Date.now() - connectedAt < 120000 }));
      return;
    }
    if (req.method === 'POST' && route === '/v1/assist') {
      let data = '';
      req.on('data', chunk => { data += chunk; if (data.length > 16000) req.destroy(); });
      req.on('end', async () => {
        try {
          if (typeof assist !== 'function') throw new Error('Local page help is unavailable.');
          const result = await assist(JSON.parse(data));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message || 'Local page help failed.' }));
        }
      });
      return;
    }
    if (req.method === 'GET' && route === '/v1/poll') {
      connectedAt = Date.now();
      const job = jobs.shift();
      res.setHeader('Content-Type', 'application/json');
      if (job) res.end(JSON.stringify(job));
      else setTimeout(() => { if (!res.destroyed) res.end('{"type":"idle"}'); }, 500);
      return;
    }
    if (req.method === 'POST' && route === '/v1/result') {
      let data = '';
      req.on('data', chunk => { data += chunk; if (data.length > 2_000_000) req.destroy(); });
      req.on('end', () => {
        try {
          const message = JSON.parse(data);
          const pending = waiting.get(message.id);
          if (!pending) { res.writeHead(404).end(); return; }
          waiting.delete(message.id); clearTimeout(pending.timer); pending.resolve(message.result);
          res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}');
        } catch { res.writeHead(400).end(); }
      }); return;
    }
    res.writeHead(404).end();
  });
  // A previous app version may still own the port during an update. Keep the
  // accessibility app usable and report the browser bridge issue in its UI.
  server.on('error', error => { listenError = error; });
  server.listen(port, '127.0.0.1');
  return {
    get port() { return server.address()?.port; },
    get error() { return listenError?.code === 'EADDRINUSE' ? 'The browser bridge port is in use. Close any older BridgeUX window and restart this app.' : listenError?.message || ''; },
    get connected() { return Date.now() - connectedAt < 120000; },
    request(type, payload = {}, timeoutMs = 8000) {
      if (listenError) return Promise.reject(new Error(this.error || 'The local browser bridge could not start.'));
      if (!this.connected) return Promise.reject(new Error('Attach the BridgeUX extension to your browser first.'));
      const id = randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiting.delete(id); reject(new Error('Browser did not respond. Keep the active tab open and try again.')); }, timeoutMs);
        waiting.set(id, { resolve, reject, timer }); jobs.push({ id, type, payload });
      });
    },
    close() { for (const item of waiting.values()) { clearTimeout(item.timer); item.reject(new Error('Browser bridge closed.')); } waiting.clear(); if (server.listening) server.close(); }
  };
}

module.exports = { createBrowserBridge };
