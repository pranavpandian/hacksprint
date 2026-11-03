'use strict';

function firstVisibleYoutubeVideo(goal, snapshot) {
  if (!/\b(?:first|top)\s+(?:video|result)\b/i.test(goal) || !/youtube/i.test(snapshot?.windowTitle || '')) return null;
  return snapshot?.elements?.find(item => item.role === 'Hyperlink' &&
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i.test(item.value || '')) || null;
}

function browserMediaIntent(goal) {
  if (typeof goal !== 'string') return null;
  if (/\b(?:pause|stop)\b.{0,35}\b(?:video|playback|youtube|it)\b|\b(?:pause|stop)\s+(?:it|the video)\b/i.test(goal)) return 'pause';
  if (/\b(?:resume|unpause|play)\b.{0,35}\b(?:video|playback|youtube|it)\b|\b(?:resume|unpause|play)\s+(?:it|the video)\b/i.test(goal)) return 'play';
  if (/\b(?:mute|silence)\b.{0,35}\b(?:video|youtube|audio|it)\b|\bmute\s+(?:it|the video)\b/i.test(goal)) return 'mute';
  if (/\b(?:unmute|turn (?:the )?sound on)\b.{0,35}\b(?:video|youtube|audio|it)\b|\bunmute\s+(?:it|the video)\b/i.test(goal)) return 'unmute';
  return null;
}

function routeAgentTask(goal, snapshot) {
  const mediaIntent = browserMediaIntent(goal);
  if (mediaIntent) return { agent: 'browser-control', action: mediaIntent };
  if (/\b(?:what(?:'s| is) on (?:my )?screen|read (?:this )?(?:page|screen)|explain (?:this )?(?:page|screen))\b/i.test(goal)) return { agent: 'screen-reader' };
  if (/\b(?:fill|complete)\b.{0,40}\b(?:form|field|application)\b/i.test(goal)) return { agent: 'form-helper' };
  if (snapshot?.source === 'browser' && /\b(?:open|click|tap|select|go to|navigate|play|pause|resume|mute|unmute)\b/i.test(goal)) return { agent: 'browser-control' };
  return { agent: 'local-agent' };
}

module.exports = { firstVisibleYoutubeVideo, browserMediaIntent, routeAgentTask };
