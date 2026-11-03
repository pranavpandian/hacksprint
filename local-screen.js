(()=>{'use strict';
const $=s=>document.querySelector(s);let frame=null,live=false,busy=false,liveTimer=null;
const preview=$('#screenPreview'),status=$('#screenStatus');
window.bridgeux?.browserBridge().then(info=>{$('#browserPairingKey').value=info.token;$('#browserExtensionPath').textContent=info.extensionPath;$('#browserBridgeStatus').textContent=info.connected?'Browser agent connected.':info.error||'Paste the pairing key into the extension popup to attach this browser.'}).catch(()=>{});
$('#copyBrowserPairingKey').onclick=async()=>{try{await navigator.clipboard.writeText($('#browserPairingKey').value);$('#browserBridgeStatus').textContent='Pairing key copied.'}catch{$('#browserBridgeStatus').textContent='Select and copy the pairing key.'}};
function speechLanguage(text){return /[\u0900-\u097F]/.test(text)?'hi':'en'}
function say(text,language=speechLanguage(text)){return window.bridgeuxSpeak?.(text,language)}
if(!window.bridgeux){status.textContent='Screen reading and computer actions require the Electron app.';$('#refreshScreens').disabled=true;return}
async function refresh(){const select=$('#screenChoice');select.replaceChildren(new Option('Choose a display…',''));try{for(const source of await window.bridgeux.listScreens())select.add(new Option(source.name,source.id));status.textContent=select.options.length>1?'Choose the display you want BridgeUX to read.':'No displays found.'}catch{status.textContent='Could not list displays.'}}
$('#refreshScreens').onclick=refresh;
let agentRunning=false,agentMode=false,pendingForm=null,agentOneShot=false,recentAgentContext=[];
$('#screenChoice').onchange=async e=>{const id=e.target.value;$('#captureScreen').disabled=!id;$('#startLive').disabled=!id;if(agentMode)window.bridgeuxStopAgent();try{if(id)await window.bridgeux.chooseScreen(id)}catch(err){status.textContent=err.message;$('#captureScreen').disabled=true;$('#startLive').disabled=true}};
$('#agentConsent').onchange=async e=>{try{const result=await window.bridgeux.setAgentMode(e.target.checked);agentMode=result.enabled;e.target.checked=agentMode;if(!agentMode)window.bridgeuxStopAgent();status.textContent=agentMode?'Hands-free agent ready. Ask by voice to navigate or search.':'Hands-free agent is off.'}catch{e.target.checked=false;agentMode=false;status.textContent='Could not enable hands-free mode.'}};
window.bridgeuxStopAgent=()=>{agentRunning=false;pendingForm=null;agentMode=false;$('#agentConsent').checked=false;$('#stopAgent').hidden=true;window.bridgeux.setAgentMode(false).catch(()=>{});window.bridgeux.setAgentStatus({active:false}).catch(()=>{});status.textContent='Hands-free agent stopped.'};window.bridgeux.onAgentStop(()=>window.bridgeuxStopAgent());
window.bridgeuxAgentEnabled=()=>agentMode;
window.bridgeuxSetAgentMode=async(enabled,oneShot=false)=>{const result=await window.bridgeux.setAgentMode(enabled);agentMode=result.enabled;agentOneShot=enabled&&oneShot;return result};
window.bridgeuxFinishOneShot=async()=>{if(agentOneShot&&!pendingForm){agentOneShot=false;agentMode=false;await window.bridgeux.setAgentMode(false).catch(()=>{})}};
window.bridgeuxHasPendingForm=()=>Boolean(pendingForm);
window.bridgeuxCancelPendingForm=()=>{pendingForm=null;};
window.bridgeuxAnswerForm=async(value,voiceLanguage)=>{if(!pendingForm)return 'There is no form field waiting for an answer.';const field=pendingForm.fields[pendingForm.index];const spoken=String(value||'').trim();if(!spoken)return `What should I enter for ${field.label}? Say just the value.`;try{await window.bridgeux.performUiAction({goal:pendingForm.goal,snapshotId:pendingForm.snapshotId,action:{type:'setValue',elementId:field.elementId,value:spoken,reason:'Use the exact value the user just spoke.'},spokenValue:spoken});pendingForm.index++;if(pendingForm.index<pendingForm.fields.length)return `I filled ${field.label}. What should I enter for ${pendingForm.fields[pendingForm.index].label}? Say just the value.`;const finished=pendingForm;pendingForm=null;if(/\bgoogle\s+forms?\b/i.test(finished.goal)&&/\bsubmit\b/i.test(finished.goal)){const current=await window.bridgeux.getUiSnapshot(),page=`${current.url||''} ${current.windowTitle||''}`;if(/(?:docs\.google\.com\/forms|forms\.gle)/i.test(page)){const submit=current.elements.find(item=>item.role==='Button'&&/^submit$/i.test(item.name.trim()));if(submit){await window.bridgeux.performUiAction({goal:finished.goal,snapshotId:current.snapshotId,action:{type:'invoke',elementId:submit.id,reason:'Submit the Google Form as explicitly requested.'}});return 'I filled the answers you gave me and submitted the Google Form.'}}}return 'I filled the values you gave me. Please review the form before submitting.'}catch(error){return `I could not fill or submit the form: ${error.message}. I stopped.`}};
const answerPendingForm=window.bridgeuxAnswerForm;window.bridgeuxAnswerForm=async(...args)=>{const answer=await answerPendingForm(...args);await window.bridgeuxFinishOneShot();return answer};
$('#stopAgent').onclick=window.bridgeuxStopAgent;
window.bridgeuxRunAgent=async(goal,voiceLanguage)=>{
  if(!agentMode||agentRunning)return 'Hands-free agent is off or already working.';
  const id=$('#screenChoice').value;
  agentRunning=true;
  $('#stopAgent').hidden=false;
  const history=[],context=recentAgentContext.slice(-4);
  let message='';
  const updateStatus=async(text,active=true)=>{status.textContent=text;await window.bridgeux.setAgentStatus({active,message:text}).catch(()=>{})};
  try{
    await updateStatus('BridgeUX is checking the active page');
    const ui=await window.bridgeux.getUiSnapshot().catch(()=>null);
    if(ui?.elements?.length){
      const route=await window.bridgeux.routeAgentTask({goal,snapshotId:ui.snapshotId});
      if(route.action){
        if(!route.available)return 'I can control YouTube playback when its browser extension is connected. Open the YouTube video tab, connect BridgeUX Browser Agent once, and say that again.';
        await updateStatus(`BridgeUX is ${route.action==='pause'?'pausing':route.action==='play'?'resuming':route.action==='mute'?'muting':'unmuting'} the YouTube video`);
        const result=await window.bridgeux.performBrowserMedia({goal,snapshotId:ui.snapshotId});
        message=result.message||'Done.';
        $('#screenAnswer').hidden=false;
        $('#screenAnswer').textContent=message;
        return message;
      }
    }
    for(let step=0;step<24&&agentRunning;step++){
      await updateStatus(`BridgeUX is working · step ${step+1} of 24`);
      let freshUi=null,shot=null,plan;
      try{freshUi=await window.bridgeux.getUiSnapshot();if(!freshUi.elements.length)freshUi=null}catch{}
      const language=voiceLanguage==='hi'?'हिन्दी':'English';
      if(freshUi)plan=await window.bridgeux.planAgentStep({goal,uiSnapshot:freshUi,language,history,context});
      else{
        if(!id)return 'Windows could not read the active app. Select a display to use visual fallback.';
        shot=await window.bridgeux.captureScreen(id);frame={width:shot.width,height:shot.height};preview.src='data:image/jpeg;base64,'+shot.image;preview.hidden=false;
        plan=await window.bridgeux.planAgentStep({goal,image:shot.image,width:shot.width,height:shot.height,language,history,context});
      }
      message=plan.message||'';
      $('#screenAnswer').hidden=false;$('#screenAnswer').textContent=message;
      if(!agentRunning)return 'Agent stopped.';
      if(plan.status==='needs_input'&&freshUi&&plan.fields?.length){pendingForm={goal,snapshotId:freshUi.snapshotId,fields:plan.fields,index:0};message=`I found ${plan.fields.map(field=>field.label).join(', ')}. I will not guess any answers. What should I enter for ${plan.fields[0].label}?`;$('#screenAnswer').textContent=message;return message}
      if(plan.status==='done'||plan.status==='blocked')return message;
      if(plan.status!=='continue'||!plan.action)return 'I stopped because I could not choose a safe next step.';
      await updateStatus(message||'BridgeUX is completing the next step');
      if(plan.mode==='uia'&&freshUi)await window.bridgeux.performUiAction({goal,snapshotId:freshUi.snapshotId,action:plan.action});
      else if(shot)await window.bridgeux.performAgentAction({goal,action:plan.action,width:shot.width,height:shot.height});
      else return 'I could not safely reach that control.';
      if(plan.completeAfterAction)return message;
      history.push(plan.action.reason);
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    message=agentRunning?'I stopped after 24 actions. Tell me what to do next.':'Agent stopped.';
    return message;
  }catch(error){message=error.message||'The local agent could not complete that step.';return message}
  finally{
    if(goal&&message)recentAgentContext=recentAgentContext.concat(['Task: '+goal+'. Result: '+message]).slice(-4);
    agentRunning=false;$('#stopAgent').hidden=true;await window.bridgeux.setAgentStatus({active:false}).catch(()=>{});status.textContent=message||'Agent run finished.';
  }
};
async function capture(){if(busy)return;const shouldSpeak=Boolean(window.bridgeuxScreenSpeakNext)||$('#speakScreenUpdates').checked;window.bridgeuxScreenSpeakNext=false;const id=$('#screenChoice').value;if(!id){status.textContent='Choose a display first.';if(shouldSpeak)say('Choose a display first, and then I can read it.');return}busy=true;const button=$('#captureScreen');button.disabled=true;button.textContent='Reading screen locally…';status.textContent='BridgeUX briefly minimizes while it captures one screen image.';$('#screenIndicator').textContent=live?'LIVE HELP ACTIVE · Analyzing this screen snapshot locally.':'CAPTURING ONE STILL · No continuous recording.';$('#proposedAction').hidden=true;$('#screenAnswer').hidden=false;$('#screenAnswer').textContent='Capturing screen…';try{const shot=await window.bridgeux.captureScreen(id);frame={width:shot.width,height:shot.height};preview.src='data:image/jpeg;base64,'+shot.image;preview.hidden=false;$('#screenAnswer').textContent='The local vision model is reading the screen…';let language='English';try{language=JSON.parse(localStorage.getItem('bridgeux-preferences')||'{}').interfaceLanguage||language}catch{}const voiceLanguage=localStorage.getItem('bridgeux-last-voice-language');if(voiceLanguage)language=voiceLanguage==='hi'?'हिन्दी':voiceLanguage==='hi-IN'?'हिन्दी':voiceLanguage==='Hindi'?'हिन्दी':language;const result=await window.bridgeux.inspectScreen({task:$('#screenTask').value.trim()||'Describe what is visible and suggest one helpful next step.',image:shot.image,width:shot.width,height:shot.height,language});$('#screenAnswer').textContent=result.summary+'\n\n'+result.source;$('#screenIndicator').textContent=live?'LIVE HELP ACTIVE · Screen checked locally.':'CAPTURE COMPLETE · Snapshot stays in app memory only.';if(shouldSpeak)say(result.summary,language==='हिन्दी'?'hi':'en');if(result.nextAction){live=false;$('#startLive').disabled=!id;$('#stopLive').disabled=true;const a=result.nextAction;$('#proposedAction').hidden=false;$('#actionReason').textContent=a.type==='type'?a.reason+' Text to enter: '+a.text:a.type==='click'?a.reason+' (screen coordinate '+a.x+', '+a.y+')':a.reason;$('#approveAction').textContent=a.type==='click'?'Approve click':a.type==='type'?'Approve text entry':'Approve key press';$('#approveAction').dataset.action=JSON.stringify(a);status.textContent='Review the suggested action. BridgeUX will not perform it until you approve it.'}}catch(e){const message=e.message||'Local vision model unavailable. Install hf.co/gguf/Qwen3.5-4B-GGUF:Q4_K_M in Ollama.';$('#screenAnswer').textContent=message;$('#screenIndicator').textContent='CAPTURE FAILED · No screen image was saved.';if(shouldSpeak)say(message)}finally{busy=false;button.disabled=false;button.textContent='Read screen now'}}
async function captureFast(){if(busy)return;busy=true;const button=$('#captureScreen');button.disabled=true;button.textContent='Reading active window…';$('#screenAnswer').hidden=false;$('#screenAnswer').textContent='Reading accessible text and controls locally…';status.textContent='Using Windows accessibility data where the active app provides it.';try{const snapshot=await window.bridgeux.getUiSnapshot();if(!snapshot.elements.length){busy=false;button.disabled=false;button.textContent='Read screen now';return capture()}let language='English';try{language=JSON.parse(localStorage.getItem('bridgeux-preferences')||'{}').interfaceLanguage||language}catch{}const result=await window.bridgeux.analyzeUiScreen({task:$('#screenTask').value.trim()||'Explain what is visible and what I should do next.',language,snapshotId:snapshot.snapshotId});$('#screenAnswer').textContent=result.summary+'\n\n'+result.source;$('#screenIndicator').textContent='ACTIVE WINDOW READ · Used Windows accessibility data without a screenshot.';if($('#speakScreenUpdates').checked||window.bridgeuxScreenSpeakNext)say(result.summary,language==='हिन्दी'?'hi':'en')}catch{busy=false;button.disabled=false;button.textContent='Read screen now';return capture()}finally{busy=false;button.disabled=false;button.textContent='Read screen now'}}
$('#captureScreen').onclick=captureFast;
$('#startLive').onclick=()=>{live=true;$('#startLive').disabled=true;$('#stopLive').disabled=false;status.textContent='Live screen help is on. It checks one frame at a time, every 5 seconds.';capture();liveTimer=setTimeout(tick,5000)};
function tick(){if(!live)return;if(!busy)capture();liveTimer=setTimeout(tick,5000)}
$('#stopLive').onclick=()=>{live=false;clearTimeout(liveTimer);liveTimer=null;$('#startLive').disabled=!$('#screenChoice').value;$('#stopLive').disabled=true;status.textContent='Live screen help stopped.';$('#screenIndicator').textContent='BridgeUX is not capturing your screen.'};
$('#approveAction').onclick=async()=>{let action;try{action=JSON.parse($('#approveAction').dataset.action)}catch{return}if(action.type==='click'){action.frameWidth=frame.width;action.frameHeight=frame.height}$('#approveAction').disabled=true;status.textContent='Performing the action you approved…';try{await window.bridgeux.performApprovedAction(action);status.textContent='Action done. Read the screen again to check the result.';$('#proposedAction').hidden=true;say('Done. I performed the action you approved.')}catch(e){status.textContent='Action failed: '+e.message;say('I could not perform that action. '+e.message)}finally{$('#approveAction').disabled=false}};
$('#rejectAction').onclick=()=>{$('#proposedAction').hidden=true;status.textContent='Suggested action dismissed.'};refresh()
})();
