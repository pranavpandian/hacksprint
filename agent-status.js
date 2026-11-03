'use strict';
const message = document.querySelector('#message');
window.bridgeux?.onAgentStatus(status => {
  message.textContent = status?.message || (status?.active ? 'Working on your request…' : 'Agent is idle');
});
document.querySelector('#stop').addEventListener('click', () => window.bridgeux?.requestAgentStop());
