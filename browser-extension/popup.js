'use strict';
const $ = selector => document.querySelector(selector);
const connection = $('#connection');
const result = $('#result');
const pairing = $('#pairingKey');

async function refreshConnection() {
  const state = await chrome.runtime.sendMessage({ type: 'status' }).catch(() => ({ connected: false }));
  connection.textContent = state?.connected ? 'Connected to BridgeUX on this computer.' : 'Not connected. Open BridgeUX and pair this extension.';
  connection.dataset.connected = String(Boolean(state?.connected));
}

$('#connect').addEventListener('click', async () => {
  const token = pairing.value.trim();
  if (!token) { connection.textContent = 'Paste the pairing key shown in BridgeUX first.'; return; }
  $('#connect').disabled = true;
  connection.textContent = 'Checking the local BridgeUX connection…';
  try {
    const state = await chrome.runtime.sendMessage({ type: 'connect', token });
    connection.textContent = state?.connected ? 'Connected. BridgeUX can read the active tab when you ask.' : (state?.error || 'Could not connect.');
    connection.dataset.connected = String(Boolean(state?.connected));
    if (state?.connected) pairing.value = '';
  } catch { connection.textContent = 'BridgeUX is not running. Open the desktop app and try again.'; }
  finally { $('#connect').disabled = false; }
});

$('#disconnect').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'disconnect' }).catch(() => {});
  connection.textContent = 'Disconnected. BridgeUX can no longer access browser tabs.';
  connection.dataset.connected = 'false';
});

$('#read').addEventListener('click', async () => {
  const button = $('#read');
  button.disabled = true;
  result.textContent = 'Reading the active tab and asking the local assistant…';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'assist', task: $('#task').value, selectedOnly: false });
    if (!response?.ok) throw Error(response?.error || 'Could not read this tab.');
    result.textContent = `${response.result.title}\n${response.result.answer}\n\n${response.result.source}`;
  } catch (error) { result.textContent = error.message || 'Could not read the active tab.'; }
  finally { button.disabled = false; }
});

$('#selected').addEventListener('click', async () => {
  const button = $('#selected');
  button.disabled = true;
  result.textContent = 'Explaining the selected text locally…';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'assist', task: 'explain', selectedOnly: true });
    if (!response?.ok) throw Error(response?.error || 'Could not explain selected text.');
    result.textContent = response.result.answer + '\n\n' + response.result.source;
  } catch (error) { result.textContent = error.message || 'Could not explain the selected text.'; }
  finally { button.disabled = false; }
});

async function stylePage(kind) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw Error('No active tab.');
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, args: [kind], func: mode => {
    const root = document.documentElement;
    if (!root.dataset.bridgeuxOriginalRoot) root.dataset.bridgeuxOriginalRoot = root.getAttribute('style') || ' ';
    if (mode === 'large') root.style.setProperty('font-size', '125%', 'important');
    else if (mode === 'contrast') root.style.setProperty('filter', 'contrast(1.6)', 'important');
    else {
      const original = root.dataset.bridgeuxOriginalRoot;
      if (original === ' ') root.removeAttribute('style'); else root.setAttribute('style', original);
      delete root.dataset.bridgeuxOriginalRoot;
    }
  }});
  result.textContent = kind === 'reset' ? 'Page display settings reset.' : 'Display adjustment applied to this tab.';
}
$('#larger').addEventListener('click', () => stylePage('large').catch(error => result.textContent = error.message));
$('#contrast').addEventListener('click', () => stylePage('contrast').catch(error => result.textContent = error.message));
$('#reset').addEventListener('click', () => stylePage('reset').catch(error => result.textContent = error.message));

refreshConnection();
