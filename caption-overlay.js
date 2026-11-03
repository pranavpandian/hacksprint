'use strict';
window.bridgeux?.onAgentStatus(status => {
  if (status?.captionText) document.querySelector('#caption').textContent = status.captionText;
});
window.bridgeux?.onCaptionText?.(payload => { document.querySelector('#caption').textContent = payload?.text || ''; });
