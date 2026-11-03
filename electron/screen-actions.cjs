'use strict';

const blockedTask = /\b(?:submit|send|purchase|buy|pay|delete|remove|transfer|share|post|publish|confirm|log\s*out|sign\s*out)\b/i;
const negatedTask = /\b(?:don't|do not|never|not)\b.{0,30}\b(?:click|tap|press|type|enter|fill|select|open)\b/i;
const clickTask = /^(?:please\s+)?(?:click|tap|select|open)\b|^(?:कृपया\s*)?(?:क्लिक|खोलो|खोलें|चुनो|चुनें|बटन\s+दबाओ|बटन\s+दबाएं)/i;
const typeTask = /^(?:please\s+)?(?:type|enter|fill)\b|^(?:कृपया\s*)?(?:टाइप|लिखो|लिखें|भरें)/i;
const pressTask = /^(?:please\s+)?press\b|^(?:कृपया\s*)?कुंजी\s+दबाएं/i;
const blockedHindiTask = /(?:भेजें|भेजो|मिटाएं|हटाएं|खरीदें|भुगतान|सबमिट|पुष्टि|पोस्ट)/i;
const negatedHindiTask = /(?:मत|नहीं).{0,24}(?:क्लिक|दबाएं|दबाओ|टाइप|लिखें|खोलें|चुनें)/i;

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

module.exports = { isSafeActionTask, validateSuggestedAction };
