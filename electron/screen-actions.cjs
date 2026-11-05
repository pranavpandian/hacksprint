'use strict';

const blockedTask = /\b(?:password|passcode)\b/i;
const negatedTask = /\b(?:don't|do not|never|not)\b.{0,30}\b(?:click|tap|press|type|enter|fill|select|open)\b/i;
const clickTask = /^(?:please\s+)?(?:click|tap|select|open|submit|send|delete|remove|save|cancel|confirm|accept|apply)\b|^(?:कृपया\s*)?(?:क्लिक|खोलो|खोलें|चुनो|चुनें|बटन\s+दबाओ|बटन\s+दबाएं)/i;
const typeTask = /^(?:please\s+)?(?:type|enter|fill)\b|^(?:कृपया\s*)?(?:टाइप|लिखो|लिखें|भरें)/i;
const pressTask = /^(?:please\s+)?press\b|^(?:कृपया\s*)?कुंजी\s+दबाएं/i;
const blockedHindiTask = /(?:खरीदें|भुगतान|पासवर्ड)/i;
const negatedHindiTask = /(?:मत|नहीं).{0,24}(?:क्लिक|दबाएं|दबाओ|टाइप|लिखें|खोलें|चुनें)/i;
const riskyAgentTask = /\b(?:password|passcode)\b|(?:पासवर्ड)/i;
const riskyAgentTarget = /\b(?:password|passcode)\b/i;
const safeClickTarget = /.+/s;

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

function isSafeAgentGoal(goal, snapshot = null) {
  return isSafeAgentGoalForScreen(goal, snapshot);
}

function isGoogleFormSubmitGoal(goal, snapshot) {
  const page = `${snapshot?.url || ''} ${snapshot?.windowTitle || ''}`;
  return typeof goal === 'string' && /\bgoogle\s+forms?\b/i.test(goal) && /\bsubmit\b/i.test(goal) &&
    /(?:docs\.google\.com\/forms|forms\.gle|google forms)/i.test(page);
}

function isSafeAgentGoalForScreen(goal, snapshot) {
  if (typeof goal !== 'string' || goal.trim().length < 3 || goal.length > 500) return false;
  return !riskyAgentTask.test(goal);
}

function validateAgentAction(action, { width, height }, goal) {
  if (!isSafeAgentGoal(goal) || !action || typeof action !== 'object' || Array.isArray(action) ||
      typeof action.reason !== 'string' || !action.reason.trim() || action.reason.length > 300) return null;

  const highImpact = /\b(?:submit|send|publish|post|delete|remove|save|cancel|confirm|accept|apply|purchase|buy|pay|transfer)\b/i;
  if (action.type === 'click' && typeof action.target === 'string' && action.target.length <= 120 &&
      (!highImpact.test(action.target) || highImpact.test(goal)) &&
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
  if (!isSafeAgentGoalForScreen(goal, snapshot) || !action || typeof action !== 'object' || Array.isArray(action) ||
      typeof action.reason !== 'string' || !action.reason.trim() || action.reason.length > 300) return null;
  const element = snapshot?.elements?.find(item => item.id === action.elementId);
  const highImpact = /\b(?:submit|send|publish|post|delete|remove|save|cancel|confirm|accept|apply|purchase|buy|pay|transfer)\b/i;
  if (element && highImpact.test(element.name) && !highImpact.test(goal)) return null;
  const maySubmitGoogleForm = isGoogleFormSubmitGoal(goal, snapshot) && element?.role === 'Button' && /^submit$/i.test(element.name.trim());
  if (!element || element.password || !element.name || (riskyAgentTarget.test(element.name) && !maySubmitGoogleForm)) return null;
  if (action.type === 'invoke' && maySubmitGoogleForm) return action;
  const targetIsSafe = safeClickTarget.test(element.name) ||
    (['Hyperlink', 'TabItem', 'MenuItem', 'ListItem', 'Button', 'TreeItem', 'Text'].includes(element.role) && !riskyAgentTarget.test(element.name)) ||
    (element.role === 'ListItem' && /\b(?:open|start|launch)\b.{0,30}\b(?:browser|brave|chrome|edge|firefox)\b/i.test(goal) && /\b(?:brave|chrome|edge|firefox|browser)\b/i.test(element.name));
  if (action.type === 'invoke' && targetIsSafe && ['Button', 'Hyperlink', 'TabItem', 'MenuItem', 'ListItem', 'TreeItem'].includes(element.role)) return action;
  if (action.type === 'setValue' && ['Edit', 'ComboBox'].includes(element.role) && /\b(?:search|address|url)\b/i.test(element.name) &&
      typeof action.value === 'string' && action.value.trim().length > 0 && action.value.length <= 300 &&
      goal.toLocaleLowerCase().includes(action.value.trim().toLocaleLowerCase())) return action;
  return null;
}

function validateSpokenFormValue(payload, snapshot) {
  const goal = payload?.goal;
  const action = payload?.action;
  const spoken = String(payload?.spokenValue || '').trim();
  const value = String(action?.value || '').trim();
  const element = snapshot?.elements?.find(item => item.id === action?.elementId);
  return typeof goal === 'string' && /\b(?:fill|complete|answer|enter)\b/i.test(goal) &&
    action?.type === 'setValue' && spoken.length > 0 && spoken === value && spoken.length <= 500 &&
    element && ['Edit', 'ComboBox'].includes(element.role) && !element.password &&
    !String(element.value || '').trim() &&
    (!/password|passcode|security code|card number|credit card|debit card|bank account|routing number/i.test(element.name)) &&
    (!element.inputType || ['text', 'email', 'tel', 'url', 'number', 'date', 'time', ''].includes(element.inputType));
}

module.exports = { isSafeActionTask, validateSuggestedAction, isSafeAgentGoal, isGoogleFormSubmitGoal, validateAgentAction, validateUiAgentAction, validateSpokenFormValue };
