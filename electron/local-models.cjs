'use strict';

function selectLocalModels(installed, visionCandidates, textCandidates, fallback) {
  const names = new Set(installed || []);
  return {
    vision: visionCandidates.find(name => names.has(name)) || fallback,
    assistant: textCandidates.find(name => names.has(name)) || fallback
  };
}

module.exports = { selectLocalModels };
