(() => {
  const $ = selector => document.querySelector(selector);
  const video = $('#cameraPreview');
  const frames = [];
  let camera = null;
  let sampleTimer = null;
  let busy = false;

  async function stopCamera() {
    clearInterval(sampleTimer);
    sampleTimer = null;
    camera?.getTracks().forEach(track => track.stop());
    camera = null;
    frames.length = 0;
    video.srcObject = null;
    video.style.display = 'none';
    $('#cameraPlaceholder').hidden = false;
    $('#startCamera').disabled = false;
    $('#enableGestures').disabled = true;
    $('#translateSign').disabled = true;
    $('#stopCamera').disabled = true;
    $('#cameraStatus').textContent = 'Camera is off.';
  }

  $('#startCamera').onclick = async () => {
    $('#startCamera').disabled = true;
    $('#cameraStatus').textContent = 'Starting camera…';
    try {
      camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
      video.srcObject = camera;
      video.style.display = 'block';
      $('#cameraPlaceholder').hidden = true;
      $('#stopCamera').disabled = false;
      await video.play();
      $('#enableGestures').disabled = false;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      sampleTimer = setInterval(() => {
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        const scale = Math.min(1, 960 / video.videoWidth, 720 / video.videoHeight);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.78).split(',')[1]);
        if (frames.length > 8) frames.shift();
        $('#translateSign').disabled = frames.length < 2 || busy;
      }, 400);
      $('#cameraStatus').textContent = 'Camera on. Move close enough for both hands to be clear; sign a short phrase, then interpret.';
    } catch (error) {
      await stopCamera();
      $('#cameraStatus').textContent = error?.name === 'NotAllowedError' ? 'Camera permission was denied.' : `Could not start camera: ${error.message}`;
    }
  };

  $('#translateSign').onclick = async () => {
    if (busy || frames.length < 2) return;
    busy = true;
    $('#translateSign').disabled = true;
    $('#typeSignText').disabled = true;
    $('#signResult').hidden = false;
    $('#signResult').textContent = 'Interpreting recent frames locally…';
    try {
      const language = JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}').interfaceLanguage || 'English';
      const text = await window.bridgeux.translateSignVideo({ frames: frames.slice(-8), language });
      $('#signResult').textContent = text;
      window.bridgeuxSpeak?.(text, language === 'हिन्दी' ? 'hi' : 'en');
      const uncertain = !text || /(?:could not|couldn't|unable to|cannot|can't).{0,60}(?:confident|interpret|recognize|see)|(?:not enough|no clear) visual evidence|(?:नहीं|नही).{0,40}(?:पहचान|समझ|देख|स्पष्ट|विश्वास)|(?:अनिश्चित|विश्वास से नहीं)/i.test(text);
      $('#typeSignText').disabled = uncertain;
      $('#sendSignToAgent').disabled = uncertain;
      $('#cameraStatus').textContent = uncertain ? 'The model was unsure, so typing is disabled. Try signing closer to the camera in better light.' : 'Review the experimental interpretation carefully. It may be wrong.';
    } catch (error) {
      $('#signResult').textContent = error.message;
      $('#cameraStatus').textContent = 'Local interpretation failed.';
    } finally {
      busy = false;
      $('#translateSign').disabled = frames.length < 2;
    }
  };

  $('#typeSignText').onclick = async () => {
    const text = $('#signResult').textContent.trim();
    if (!text || !window.confirm(`Type this text into the currently focused control?\n\n${text}`)) return;
    $('#typeSignText').disabled = true;
    $('#cameraStatus').textContent = 'Typing approved text…';
    try {
      await window.bridgeux.performApprovedAction({ type: 'type', text });
      $('#cameraStatus').textContent = 'Typed. Check the focused control before continuing.';
    } catch (error) {
      $('#cameraStatus').textContent = `Could not type text: ${error.message}`;
      $('#typeSignText').disabled = false;
    }
  };

  $('#sendSignToAgent').onclick = async () => {
    const goal = $('#signResult').textContent.trim();
    if (!goal || $('#sendSignToAgent').disabled) return;
    if (!window.bridgeuxAgentEnabled?.()) { $('#cameraStatus').textContent = 'Enable hands-free agent mode in Screen helper before asking it to act on a sign.'; return; }
    $('#sendSignToAgent').disabled = true;
    try {
      const reply = await window.bridgeuxRunAgent(goal, JSON.parse(localStorage.getItem('bridgeux-preferences') || '{}').interfaceLanguage === 'हिन्दी' ? 'hi' : 'en');
      $('#cameraStatus').textContent = reply;
      window.bridgeuxSpeak?.(reply, /[ऀ-ॿ]/.test(reply) ? 'hi' : 'en');
    } finally { $('#sendSignToAgent').disabled = false; }
  };

  $('#openScreenHelper').onclick = () => document.querySelector('#screenHelper').scrollIntoView({ behavior: 'smooth' });
  $('#stopCamera').onclick = stopCamera;
  window.addEventListener('pagehide', stopCamera);
})();
