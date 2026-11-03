'use strict';

const blockedTask = /\b(?:submit|send|purchase|buy|pay|delete|remove|transfer|share|post|publish|confirm|log\s*out|sign\s*out)\b/i;
const negatedTask = /\b(?:don't|do not|never|not)\b.{0,30}\b(?:click|tap|press|type|enter|fill|select|open)\b/i;
const clickTask = /^(?:please\s+)?(?:click|tap|select|open)\b|^(?:कृपया\s*)?(?:क्लिक|खोलो|खोलें|चुनो|चुनें|बटन\s+दबाओ|बटन\s+दबाएं)/i;
const typeTask = /^(?:please\s+)?(?:type|enter|fill)\b|^(?:कृपया\s*)?(?:टाइप|लिखो|लिखें|भरें)/i;
const pressTask = /^(?:please\s+)?press\b|^(?:कृपया\s*)?कुंजी\s+दबाएं/i;
const blockedHindiTask = /(?:भेजें|भेजो|मिटाएं|हटाएं|खरीदें|भुगतान|सबमिट|पुष्टि|पोस्ट)/i;
const negatedHindiTask = /(?:मत|नहीं).{0,24}(?:क्लिक|दबाएं|दबाओ|टाइप|लिखें|खोलें|चुनें)/i;
const riskyAgentTask = /\b(?:submit|send|purchase|buy|pay|delete|remove|transfer|share|post|publish|confirm|sign\s?in|log\s?in|log\s?out|change|update|install|uninstall|upload|subscribe|apply|order|book|cancel|accept|agree|password|payment|account)\b|(?:भेज|सबमिट|खरीद|भुगतान|मिटा|हट|पुष्टि|प्रकाशित|खाता|पासवर्ड|रद्द|अनुमति)/i;
const riskyAgentTarget = /\b(?:submit|send|share|delete|remove|buy|purchase|pay|payment|confirm|publish|post|sign\s?in|log\s?in|log\s?out|save|cancel|accept|agree|apply|unfollow|unsubscribe|follow|join|leave|connect|subscribe|install|uninstall|upload|download|password|account)\b/i;
const safeClickTarget = /\b(?:link|menu|tab|home|back|search|settings|help|open|expand|collapse|navigation|browser|application|app|address)\b/i;

function isSafeActionTask(task) {
  return typeof task === 'string' && (clickTask.test(task.trim()) || typeTask.test(task.trim()) || pressTask.test(task.trim())) &&
    !blockedTask.test(task) && !negatedTask.test(task) && !blockedHindiTask.test(task) && !negatedHindiTask.test(task);
}

function validateSuggestedAction(action, { width, height }, task) {
  if (!isSafeActionTask(task) || !action || typeof action !== 'object' || Array.isArray(action) ||
      typeof action.reason !== 'string' || !action.reason.trim() || action.reason.length > 500) return null;

  if (action.type === 'click' && clickTask.test(task.trim()) &&
      Number.isInteger(action.x) && Number.isInteger(action.y) && action.x >= 0 && action.y >= 0 &&
      action.x < width && action.y < height) return action;

  if (action.type === 'type' && typeTask.test(task.trim()) &&
      typeof action.text === 'string' && action.text.length > 0 && action.text.length <= 1000) return action;

  if (action.type === 'press' && pressTask.test(task.trim()) &&
      ['TAB', 'ENTER', 'ESC', 'SPACE', 'BACKSPACE'].includes(action.key)) return action;

  return null;
}

function isSafeAgentGoal(goal) {
  return typeof goal === 'string' && goal.trim().length >= 3 && goal.length <= 500 && !riskyAgentTask.test(goal);
}

function validateAgentAction(action, { width, height }, goal) {
  if (!isSafeAgentGoal(goal) || !action || typeof action !== 'object' || Array.isArray(action) ||
      typeof action.reason !== 'string' || !action.reason.trim() || action.reason.length > 300) return null;

  if (action.type === 'click' && typeof action.target === 'string' && action.target.length <= 120 &&
      safeClickTarget.test(action.target) && !riskyAgentTarget.test(action.target) &&
      Number.isInteger(action.x) && Number.isInteger(action.y) && action.x >= 0 && action.y >= 0 &&
      action.x < width && action.y < height) return action;

  if (action.type === 'type' && typeof action.target === 'string' && /\b(?:search|address|url)\b/i.test(action.target) &&
      !riskyAgentTarget.test(action.target) && typeof action.text === 'string' && action.text.trim().length > 0 && action.text.length <= 300 &&
      goal.toLocaleLowerCase().includes(action.text.trim().toLocaleLowerCase())) return action;

  if (action.type === 'press' && ['TAB', 'ESC'].includes(action.key)) return action;
  if (action.type === 'press' && action.key === 'ENTER' && typeof action.target === 'string' &&
      /\b(?:search|address|url)\b/i.test(action.target) && !riskyAgentTarget.test(action.target) &&
      /\b(?:search|find|look up|open|go to|visit|navigate)\b/i.test(goal)) return action;
  return null;
}

function validateUiAgentAction(action, snapshot, goal) {
  if (!isSafeAgentGoal(goal) || !action || typeof action !== 'object' || Array.isArray(action) ||
      typeof action.reason !== 'string' || !action.reason.trim() || action.reason.length > 300) return null;
  const element = snapshot?.elements?.find(item => item.id === action.elementId);
  if (!element || element.password || !element.name || riskyAgentTarget.test(element.name)) return null;
  const targetIsSafe = safeClickTarget.test(element.name) ||
    (['Hyperlink', 'TabItem', 'MenuItem'].includes(element.role) && !riskyAgentTarget.test(element.name)) ||
    (['ListItem', 'Button'].includes(element.role) && /\b(?:open|start|launch)\b.{0,30}\b(?:browser|brave|chrome|edge|firefox)\b/i.test(goal) && /\b(?:brave|chrome|edge|firefox|browser)\b/i.test(element.name));
  if (action.type === 'invoke' && targetIsSafe && ['Button', 'Hyperlink', 'TabItem', 'MenuItem', 'ListItem', 'TreeItem'].includes(element.role)) return action;
  if (action.type === 'setValue' && element.role === 'Edit' && /\b(?:search|address|url)\b/i.test(element.name) &&
      typeof action.value === 'string' && action.value.trim().length > 0 && action.value.length <= 300 &&
      goal.toLocaleLowerCase().includes(action.value.trim().toLocaleLowerCase())) return action;
  return null;
}

module.exports = { isSafeActionTask, validateSuggestedAction, isSafeAgentGoal, validateAgentAction, validateUiAgentAction };
