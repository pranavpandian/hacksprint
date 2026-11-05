(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const announce = text => { $('#liveRegion').textContent = text; };
  let prefs = { supports: [], interfaceLanguage: 'English', textSize: 100, theme: 'dark', spacious: false, reduceMotion: false };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}') }; } catch {}

  function save() { localStorage.setItem('bridgeux-preferences', JSON.stringify(prefs)); }
  function apply() {
    document.body.classList.remove('dark', 'light', 'contrast', 'spacious');
    document.body.classList.add(prefs.theme);
    if (prefs.spacious) document.body.classList.add('spacious');
    document.documentElement.style.fontSize = `${prefs.textSize}%`;
    $('#textSize').value = prefs.textSize;
    $('#sizeValue').textContent = `${prefs.textSize}%`;
    $('#theme').value = prefs.theme;
    $('#spacious').checked = prefs.spacious;
    $('#reduceMotion').checked = prefs.reduceMotion;
    document.documentElement.style.scrollBehavior = prefs.reduceMotion ? 'auto' : '';
    $('#interfaceLanguage').value = prefs.interfaceLanguage;
    document.querySelectorAll('#setupForm [name=support]').forEach(input => { input.checked = prefs.supports.includes(input.value); });
  }
  apply();

  const railLinks = [...document.querySelectorAll('.rail-link')];
  function updateNavigation() {
    const current = location.hash || '#home';
    railLinks.forEach(link => link.hash === current ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current'));
  }
  window.addEventListener('hashchange', updateNavigation);
  updateNavigation();

  const gate = $('#setupGate');
  const gateSupports = [...document.querySelectorAll('[name=setupSupport]')];
  if (!prefs.setupComplete) gate.showModal();
  gate.addEventListener('cancel', event => { if (!prefs.setupComplete) event.preventDefault(); });
  $('#setupNext').onclick = () => {
    if (!gateSupports.some(input => input.checked)) {
      $('#setupGateError').textContent = 'Choose at least one support to continue.';
      gateSupports[0].focus();
      return;
    }
    $('#setupStepLabel').textContent = 'STEP 2 OF 2';
    $('#setupGateTitle').textContent = 'What language should BridgeUX use?';
    $('#setupGateHint').hidden = true;
    $('#setupGateSupports').hidden = true;
    $('#setupGateError').textContent = '';
    $('#setupLanguageStep').hidden = false;
    $('#setupNext').hidden = true;
    $('#setupBack').hidden = false;
    $('#setupFinish').hidden = false;
    $('#setupLanguage').focus();
  };
  $('#setupBack').onclick = () => {
    $('#setupStepLabel').textContent = 'STEP 1 OF 2';
    $('#setupGateTitle').textContent = 'What support would help you?';
    $('#setupGateHint').hidden = false;
    $('#setupGateSupports').hidden = false;
    $('#setupLanguageStep').hidden = true;
    $('#setupNext').hidden = false;
    $('#setupBack').hidden = true;
    $('#setupFinish').hidden = true;
  };
  $('#setupFinish').onclick = () => {
    const language = $('#setupLanguage').value;
    if (!language) {
      $('#setupGateError').textContent = 'Choose English or Hindi to continue.';
      $('#setupLanguage').focus();
      return;
    }
    prefs.supports = gateSupports.filter(input => input.checked).map(input => input.value);
    prefs.interfaceLanguage = language;
    prefs.setupComplete = true;
    localStorage.setItem('bridgeux-last-voice-language', language === 'हिन्दी' ? 'hi' : 'en');
    document.querySelectorAll('#setupForm [name=support]').forEach(input => { input.checked = prefs.supports.includes(input.value); });
    $('#interfaceLanguage').value = language;
    save();
    apply();
    gate.close();
    announce(`Setup saved. BridgeUX will listen and reply in ${language === 'हिन्दी' ? 'Hindi' : 'English'}.`);
    window.dispatchEvent(new Event('bridgeux:setup-complete'));
  };

  $('#setupForm').addEventListener('submit', event => {
    event.preventDefault();
    const selected = [...document.querySelectorAll('#setupForm [name=support]:checked')].map(input => input.value);
    if (!selected.length) {
      $('#setupStatus').textContent = 'Choose at least one support.';
      return;
    }
    prefs.supports = selected;
    prefs.interfaceLanguage = $('#interfaceLanguage').value;
    localStorage.setItem('bridgeux-last-voice-language', prefs.interfaceLanguage === 'हिन्दी' ? 'hi' : 'en');
    save();
    $('#setupStatus').textContent = 'Your choices are saved on this device.';
    announce('Your accessibility choices are saved.');
    window.dispatchEvent(new Event('bridgeux:preferences-changed'));
  });
  $('#skipSetup').onclick = () => { $('#supportChoices').open = true; $('#onboarding').scrollIntoView(); };
  document.querySelectorAll('a[href="#onboarding"]').forEach(link => link.addEventListener('click', () => { $('#supportChoices').open = true; }));
  $('#textSize').oninput = event => { prefs.textSize = Number(event.target.value); apply(); save(); };
  $('#theme').onchange = event => { prefs.theme = event.target.value; apply(); save(); };
  $('#spacious').onchange = event => { prefs.spacious = event.target.checked; apply(); save(); };
  $('#reduceMotion').onchange = event => { prefs.reduceMotion = event.target.checked; apply(); save(); };

  function speak(text) {
    if (!('speechSynthesis' in window)) { announce('Speech synthesis is unavailable in this browser.'); return; }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = prefs.interfaceLanguage === 'हिन्दी' ? 'hi-IN' : 'en-US';
    speechSynthesis.speak(utterance);
  }
  $('#readPage').onclick = () => speak(prefs.interfaceLanguage === 'हिन्दी' ? 'ब्रिज यूएक्स में आपका स्वागत है। यहां आप स्क्रीन समझने, पढ़ने और स्थानीय सहायता पाने के विकल्प चुन सकते हैं।' : 'BridgeUX. Technology that meets you where you are. Choose supports that work for you, then use the local helper or screen tools below.');
  $('#readTip').onclick = () => speak(prefs.interfaceLanguage === 'हिन्दी' ? 'ब्रिज यूएक्स निर्देश पढ़ सकता है, आपकी चुनी हुई भाषा सुन सकता है और स्क्रीन समझने में मदद कर सकता है।' : 'BridgeUX can read instructions aloud, listen in your selected language, and help explain selected screen content.');
  $('#onboardingSpeak').onclick = () => speak(prefs.interfaceLanguage === 'हिन्दी' ? 'जो सहायता आपके लिए उपयोगी हो, उसे चुनें। आपकी सहायता और भाषा की पसंद से ब्रिज यूएक्स अपनी मदद तय करता है।' : 'Choose any supports that feel useful. Your support and language choices help BridgeUX listen and reply in the language you selected.');
  $('#plainToggle').onclick = () => { $('#plainResult').hidden = !$('#plainResult').hidden; $('#plainToggle').textContent = $('#plainResult').hidden ? 'Simplify instructions' : 'Hide simpler instructions'; };

  $('#startCaption').onclick = async () => {
    $('#startCaption').disabled = true;
    try { await window.bridgeuxStartSystemCaptions(); $('#pauseCaption').disabled = false; $('#pauseCaption').textContent = 'Stop live captions'; }
    catch (error) { $('#startCaption').disabled = false; $('#liveCaptionStatus').textContent = error.message; }
  };
  $('#pauseCaption').onclick = async () => {
    await window.bridgeuxStopSystemCaptions?.();
    $('#startCaption').disabled = false; $('#pauseCaption').disabled = true;
  };
  $('#clearCaption').onclick = () => { $('#captionText').textContent = 'Live captions will appear here when you start system audio capture.'; };
  window.addEventListener('bridgeux:captions-changed', event => {
    const busy = Boolean(event.detail?.busy);
    $('#startCaption').disabled = busy;
    $('#pauseCaption').disabled = !event.detail?.running;
    $('#pauseCaption').textContent = 'Stop captions';
  });
  $('#resetSettings').onclick = () => {
    localStorage.removeItem('bridgeux-preferences');
    prefs = { supports: [], interfaceLanguage: 'English', textSize: 100, theme: 'dark', spacious: false, reduceMotion: false };
    apply(); $('#setupStatus').textContent = 'Preferences reset on this device.';
    $('#privacyStatus').textContent = 'Local preferences cleared.'; announce('Preferences reset.');
    gateSupports.forEach(input => { input.checked = false; });
    $('#setupLanguage').value = '';
    $('#setupBack').click();
    $('#setupGateError').textContent = '';
    gate.showModal();
  };
  $('#auditButton').onclick = () => {
    const missing = [...document.querySelectorAll('button,input,select,textarea')].filter(input => !input.closest('.sr-only') && !input.getAttribute('aria-label') && !input.labels?.length && !(input.textContent || '').trim()).length;
    const images = document.querySelectorAll('img:not([alt])').length;
    $('#auditResult').textContent = `Basic local checks: ${missing} unlabeled controls, ${images} images without alt text. This lightweight check is not axe-core and does not assess WCAG conformance.`;
    announce(`Page check complete. ${missing} unlabeled controls and ${images} images without alternative text found. This is not an axe-core audit.`);
  };
})();
