'use strict';

let active = false;
let token = '';
const bridge = 'http://127.0.0.1:18765';

async function postResult(id, result) {
  await fetch(`${bridge}/v1/result`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, result }) });
}

async function pageTask(job) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || '')) throw Error('The active tab is not a readable web page.');
  const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'ISOLATED', func: async task => {
    const visible = e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; };
    if (task.type === 'snapshot') {
      const nodes=[...document.querySelectorAll('a,button,input,textarea,select,[role="button"],[role="link"],[role="textbox"],h1,h2,h3,label')].filter(visible).slice(0,900);
      const elements=nodes.map((e,i)=>{if(!e.__bridgeuxAgentId)Object.defineProperty(e,'__bridgeuxAgentId',{value:`b${i}-${Math.random().toString(36).slice(2,7)}`});const id=e.__bridgeuxAgentId;let label=e.getAttribute('aria-label')||e.innerText||e.getAttribute('placeholder')||e.name||e.title||'';const role=e.getAttribute('role')||({A:'Hyperlink',BUTTON:'Button',INPUT:'Edit',TEXTAREA:'Edit',SELECT:'ComboBox',H1:'Heading',H2:'Heading',H3:'Heading',LABEL:'Text'}[e.tagName]||'Text');const value=e.type==='password'?'[password hidden]':(e.value||e.href||'');return{id,name:String(label).trim().slice(0,220),role,value:String(value).slice(0,400),password:e.type==='password',focused:e===document.activeElement,tag:e.tagName.toLowerCase()};}).filter(e=>e.name||e.value);
      return{windowTitle:document.title,url:location.href,source:'browser',elements,text:(document.body?.innerText||'').slice(0,12000)};
    }
    const e=[...document.querySelectorAll('*')].find(n=>n.__bridgeuxAgentId===task.elementId);if(!e)throw Error('Page changed; read the active tab again.');
    if(task.action.type==='invoke'){if(!['A','BUTTON'].includes(e.tagName)&&!['button','link'].includes(e.getAttribute('role')))throw Error('That page control cannot be opened.');e.click();return{ok:true};}
    if(task.action.type==='setValue'){if(!['INPUT','TEXTAREA'].includes(e.tagName)||e.type==='password')throw Error('Only visible non-password text fields can be filled.');const setter=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(e,task.action.value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return{ok:true};}
    throw Error('Unsupported browser action.');
  }, args: [job] });
  return result.result;
}

async function run() {
  while (active) {
    try {
      const response=await fetch(`${bridge}/v1/poll`,{headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok)throw Error('BridgeUX is unavailable.');
      const job=await response.json();
      if(job.type!=='idle')try{await postResult(job.id,await pageTask(job))}catch(error){await postResult(job.id,{error:error.message||'Browser task failed.'})}
      else await new Promise(resolve=>setTimeout(resolve,400));
    } catch { active=false; await chrome.storage.local.set({connected:false}); }
  }
}

chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(message.type==='connect'){token=String(message.token||'');active=Boolean(token);chrome.storage.local.set({token,connected:active});if(active)run();sendResponse({connected:active});}
  if(message.type==='disconnect'){active=false;token='';chrome.storage.local.set({token:'',connected:false});sendResponse({connected:false});}
  if(message.type==='status')sendResponse({connected:active});
  return true;
});
chrome.runtime.onStartup.addListener(async()=>{const s=await chrome.storage.local.get(['token','connected']);if(s.connected&&s.token){token=s.token;active=true;run();}});
