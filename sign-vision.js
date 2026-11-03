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
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      sampleTimer = setInterval(() => {
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        const scale = Math.min(1, 640 / video.videoWidth, 480 / video.videoHeight);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.78).split(',')[1]);
        if (frames.length > 8) frames.shift();
        $('#translateSign').disabled = frames.length < 2 || busy;
      }, 500);
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
      const recent = frames.slice(-8);
      const selected = recent.length <= 4 ? recent : [0, 1 / 3, 2 / 3, 1].map(part => recent[Math.round(part * (recent.length - 1))]);
      const text = await window.bridgeux.translateSignVideo(selected);
      $('#signResult').textContent = text;
      const uncertain = !text || /(?:could not|couldn't|unable to|cannot|can't).{0,60}(?:confident|interpret|recognize|see)|(?:not enough|no clear) visual evidence/i.test(text);
      $('#typeSignText').disabled = uncertain;
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

  $('#openScreenHelper').onclick = () => document.querySelector('#screenHelper').scrollIntoView({ behavior: 'smooth' });
  $('#stopCamera').onclick = stopCamera;
  window.addEventListener('pagehide', stopCamera);
})();
