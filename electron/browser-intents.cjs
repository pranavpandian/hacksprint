'use strict';

function firstVisibleYoutubeVideo(goal, snapshot) {
  if (!/\b(?:first|top)\s+(?:video|result)\b/i.test(goal) || !/youtube/i.test(snapshot?.windowTitle || '')) return null;
  return snapshot?.elements?.find(item => item.role === 'Hyperlink' &&
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i.test(item.value || '')) || null;
}

module.exports = { firstVisibleYoutubeVideo };
