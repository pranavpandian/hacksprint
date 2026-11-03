'use strict';

let active = false;
let token = '';
const bridge = 'http://127.0.0.1:18765';

async function postResult(id, result) {
  await fetch(`${bridge}/v1/result`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, result })
  });
}

async function pageTask(job) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || '')) throw Error('The active tab is not a readable web page.');
  const [injected] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'ISOLATED',
    args: [job],
    func: async task => {
      const visible = element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const labelFor = element => {
        const external = element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        return element.getAttribute('aria-label') || external?.innerText || element.closest('label')?.innerText ||
          element.innerText || element.getAttribute('placeholder') || element.name || element.title || '';
      };
      if (task.type === 'snapshot') {
        const nodes = [...document.querySelectorAll('a,button,input,textarea,select,[role="button"],[role="link"],[role="textbox"],[contenteditable="true"],h1,h2,h3,label')].filter(visible).slice(0, 900);
        const elements = nodes.map((element, index) => {
          if (!element.__bridgeuxAgentId) Object.defineProperty(element, '__bridgeuxAgentId', { value: `b${index}-${crypto.randomUUID()}` });
          const role = element.getAttribute('role') || ({ A: 'Hyperlink', BUTTON: 'Button', INPUT: 'Edit', TEXTAREA: 'Edit', SELECT: 'ComboBox', H1: 'Heading', H2: 'Heading', H3: 'Heading', LABEL: 'Text' }[element.tagName] || 'Text');
          const password = element.type === 'password';
          return {
            id: element.__bridgeuxAgentId,
            name: String(labelFor(element)).trim().slice(0, 220),
            role,
            value: password ? '[password hidden]' : String(element.value || element.href || '').slice(0, 300),
            password,
            inputType: element.type || '',
            focused: element === document.activeElement,
            tag: element.tagName.toLowerCase()
          };
        }).filter(item => item.name || item.value);
        return { windowTitle: document.title, url: location.href, source: 'browser', elements, text: (document.body?.innerText || '').slice(0, 12000) };
      }
      const element = [...document.querySelectorAll('*')].find(node => node.__bridgeuxAgentId === task.elementId);
      if (!element || !visible(element)) throw Error('Page changed; read the active tab again.');
      if (task.action.type === 'invoke') {
        if (!['A', 'BUTTON'].includes(element.tagName) && !['button', 'link'].includes(element.getAttribute('role'))) throw Error('That page control cannot be opened.');
        element.click();
        return { ok: true };
      }
      if (task.action.type === 'setValue') {
        if (element.type === 'password' || element.type === 'checkbox' || element.type === 'radio' || element.type === 'file') throw Error('Only visible non-password text fields can be filled.');
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) && !element.isContentEditable) throw Error('That page control is not a text field.');
        if (element.tagName === 'SELECT') {
          const option = [...element.options].find(item => item.value === task.action.value || item.textContent.trim() === task.action.value.trim());
          if (!option) throw Error('The requested choice is not available in this menu.');
          element.value = option.value;
        } else if (element.isContentEditable) {
          element.textContent = task.action.value;
        } else {
          const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, task.action.value);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true };
      }
      throw Error('Unsupported browser action.');
    }
  });
  return injected.result;
}

async function run() {
  while (active) {
    try {
      const response = await fetch(`${bridge}/v1/poll`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw Error('BridgeUX is unavailable.');
      const job = await response.json();
      if (job.type === 'idle') { await new Promise(resolve => setTimeout(resolve, 400)); continue; }
      try { await postResult(job.id, await pageTask(job)); }
      catch (error) { await postResult(job.id, { error: error.message || 'Browser task failed.' }); }
    } catch {
      active = false;
      await chrome.storage.local.set({ connected: false });
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'connect') {
    token = String(message.token || '');
    active = Boolean(token);
    chrome.storage.local.set({ token, connected: active });
    if (active) run();
    sendResponse({ connected: active });
  } else if (message.type === 'disconnect') {
    active = false;
    token = '';
    chrome.storage.local.set({ token: '', connected: false });
    sendResponse({ connected: false });
  } else if (message.type === 'status') sendResponse({ connected: active });
  return true;
});

chrome.runtime.onStartup.addListener(async () => {
  const saved = await chrome.storage.local.get(['token', 'connected']);
  if (saved.connected && saved.token) { token = saved.token; active = true; run(); }
});
