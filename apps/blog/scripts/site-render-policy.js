'use strict';

// Supported Hexo output filter: keep site decisions outside the theme gitlink.
// jsdom is supplied by the existing, locked hexo-renderer-marked dependency.
const { JSDOM } = require('jsdom');
const moment = require('moment-timezone');
const ZONE = 'Asia/Shanghai';
const safeJson = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,
  ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
hexo.extend.helper.register('site_music_json', safeJson);

hexo.extend.filter.register('before_generate', function() {
  const music = this.theme.config.music;
  if (!music || music.mode !== 'local') throw new Error('Music must stay in local mode');
  if (!music.local || !Array.isArray(music.local.playlist)) throw new Error('Expected a local playlist array');
  for (const track of music.local.playlist) {
    if (!track || typeof track.name !== 'string' || typeof track.artist !== 'string') {
      throw new Error('Local tracks require string name and artist fields');
    }
    for (const field of ['url', 'cover', 'lrc']) {
      if (!track[field] && field !== 'url') continue;
      const value = track[field];
      if (typeof value !== 'string' || !value.startsWith('/music/') ||
          /[\\?#<>"'&\s\x00-\x1f\x7f]/.test(value) || decodeURIComponent(value).split('/').some(x => x === '.' || x === '..')) {
        throw new Error(`Local music ${field} must be an encoded /music/ URL without unsafe characters/traversal/query/fragment`);
      }
    }
  }
  // Override only the unsafe expression via Hexo's in-memory view API. Do this
  // BEFORE EJS renders: a DOM filter after parsing cannot undo </script> XSS.
  const viewPath = '_partials/widgets/music.ejs';
  const view = this.theme.getView(viewPath);
  const unsafe = 'JSON.stringify(theme.music.local.playlist)';
  const safe = 'site_music_json(theme.music.local.playlist)';
  if (!view || !view.data._content.includes(unsafe) && !view.data._content.includes(safe)) {
    throw new Error('Firefly music template changed; review safe serialization override');
  }
  if (view.data._content.includes(unsafe)) {
    this.theme.setView(viewPath, { ...view.data, _content: view.data._content.replace(unsafe, safe) });
  }
}, 2);

hexo.extend.filter.register('after_render:html', function(html) {
  // Partial EJS renders also invoke this hook: process full documents only.
  if (!/<!doctype html>/i.test(html)) return html;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const dates = new Map();
  this.model('Post').forEach(post => {
    dates.set('/' + post.path.replace(/^\//, ''), moment(post.date).tz(ZONE));
  });

  // Theme hardcodes these routes; nav.menu does not control them.
  document.querySelectorAll('#navbar a[href]').forEach(link => {
    if (['/about', '/friends'].includes(link.getAttribute('href').replace(/\/$/, ''))) {
      const item = link.closest('li');
      if (item) item.remove();
    }
  });
  // No feed generator is installed. Do not advertise a nonexistent XML feed.
  document.querySelectorAll('link[rel="alternate"][type*="xml"], a[href="/atom.xml"], a[href="/rss/"]').forEach(node => node.remove());
  // APlayer is retained; local mode must never request Meting's client library.
  document.querySelectorAll('script[src*="/meting@"], script[src*="/Meting.min.js"]').forEach(node => node.remove());

  document.querySelectorAll('time').forEach(time => {
    const card = time.closest('.post-card-item, .archive-timeline-item');
    const titleLink = card && card.querySelector('.post-card-title a, .archive-item-title');
    const published = titleLink && dates.get(titleLink.getAttribute('href'));
    if (published) {
      time.setAttribute('datetime', published.format('YYYY-MM-DDTHH:mm:ssZ'));
      if (time.classList.contains('archive-item-date')) {
        time.textContent = published.format('YYYY-MM-DD HH:mm:ss [UTC+08:00]');
      }
    }
    // Detail datetime is already ISO +08:00 from full_date; no second parsing.
  });
  // The theme's build-time widget otherwise uses the host's local timezone.
  document.querySelectorAll('.site-info-widget .site-info-card').forEach(card => {
    const icon = card.querySelector('.material-symbols-outlined');
    const value = card.querySelector('.site-info-card-value');
    if (icon && icon.textContent.trim() === 'schedule' && value) {
      value.textContent = moment().tz(ZONE).format('YYYY-MM-DD HH:mm:ss [UTC+08:00]');
    }
  });
  // The theme can render desktop/mobile copies; keep DOM IDs unique.
  document.querySelectorAll('.music-widget [id="aplayer-local"]').forEach((player, index) => {
    player.id = index ? `aplayer-local-${index}` : 'aplayer-local';
    player.classList.add('site-local-player');
  });
  // Local-only initialization missing from this Firefly revision.
  if (document.querySelector('.music-widget') && !document.querySelector('script[src="/js/site-local-music.js"]')) {
    const options = document.createElement('script');
    options.textContent = 'window.__SITE_LOCAL_MUSIC_OPTIONS = ' + safeJson({
      volume: this.theme.config.music.volume ?? 0.7
    }) + ';';
    document.body.appendChild(options);
    const script = document.createElement('script');
    script.src = '/js/site-local-music.js';
    script.defer = true;
    document.body.appendChild(script);
  }
  const output = dom.serialize();
  dom.window.close();
  return output;
}, 20);
