/* One site-owned APlayer; no online API, directory discovery or audio copying. */
(function () {
  'use strict';
  if (window.SiteLocalMusic) {
    window.SiteLocalMusic.refresh();
    return; // Script re-evaluation must not add another set of listeners.
  }
  let player = null;
  let host = null;
  let saved = null;
  const text = value => String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  function remember() {
    if (!player) return;
    saved = { index: player.list ? player.list.index : 0,
      time: player.audio ? player.audio.currentTime : 0 };
  }
  function release() {
    if (!player) return;
    remember();
    const old = player;
    player = null;
    if (host) { delete host.aplayer; delete host.dataset.siteMusicReady; }
    host = null;
    if (old.destroy) old.destroy();
    window.aplayers = (window.aplayers || []).filter(instance => instance !== old);
    if (window.__aplayer === old) window.__aplayer = null;
  }
  function message(nodes, value) {
    nodes.forEach(node => { if (node.textContent !== value) node.textContent = value; });
  }
  function refresh() {
    const nodes = Array.from(document.querySelectorAll('.music-widget .site-local-player'));
    if (host && !host.isConnected) release();
    const playlist = window.__LOCAL_PLAYLIST || [];
    if (!nodes.length) { release(); return; }
    if (!playlist.length) { release(); message(nodes, '本地歌单为空，待添加 /music/ 音乐。'); return; }
    if (typeof window.APlayer !== 'function') {
      release(); message(nodes, '播放器程序加载失败，请检查网络后刷新。'); return;
    }
    const target = nodes.find(node => node.getClientRects().length) || nodes[0];
    if (player && host === target) return;
    release();
    nodes.forEach(node => { node.textContent = node === target ? '' : '本地播放器已在另一布局中启用。'; });
    const options = window.__SITE_LOCAL_MUSIC_OPTIONS || {};
    const volume = typeof options.volume === 'number' ? Math.min(1, Math.max(0, options.volume)) : 0.7;
    player = new window.APlayer({ container: target,
      audio: playlist.map(track => ({ ...track, name: text(track.name), artist: text(track.artist) })),
      autoplay: false, preload: 'none', mutex: true, volume });
    host = target;
    host.aplayer = player;
    host.dataset.siteMusicReady = 'true';
    window.aplayers = (window.aplayers || []).filter(instance => instance !== player);
    window.aplayers.push(player);
    window.__aplayer = player;
    // Restore position after a removed container returns; never autoplay.
    if (saved) {
      if (player.list && saved.index < playlist.length) player.list.switch(saved.index);
      const position = saved.time;
      const instance = player;
      if (instance.on) instance.on('loadeddata', function () {
        if (player === instance && instance.audio && position > 0) instance.audio.currentTime = position;
      });
    }
  }
  window.SiteLocalMusic = { refresh, destroy: release };
  document.addEventListener('DOMContentLoaded', refresh);
  document.addEventListener('pjax:send', remember);
  document.addEventListener('pjax:complete', refresh);
  window.addEventListener('load', refresh);
  window.addEventListener('pagehide', release);
  window.addEventListener('pageshow', refresh);
  window.addEventListener('resize', refresh);
  if (document.readyState !== 'loading') refresh();
})();
