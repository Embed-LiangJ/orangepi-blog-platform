'use strict';

// B1: only two in-memory views. Never edit the Submodule or inject a second
// calendar implementation. Exact source contracts intentionally fail on upgrade.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const key = Symbol.for('site.calendarViews.v1');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const headPath = '_partials/head.ejs';
const calendarPath = '_partials/widgets/calendar.ejs';
const expected = {
  [headPath]: '47b67d5d7d14e9d39d8309c82cf654c47a952796a9ffc3bf13274c1ec1946e71',
  [calendarPath]: 'b32a3d18cdaa258d4b48b47d5c25fe255e900d4e89127c4e78068024580af163'
};
function once(source, anchor, replacement) {
  if (source.split(anchor).length !== 2) throw new Error('Review calendar template anchor: ' + anchor.slice(0, 70));
  return source.replace(anchor, replacement);
}

const tail = `  // Set up initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendar);
  } else {
    initCalendar();
  }

  // Swup/Pjax support
  document.addEventListener("pjax:complete", initCalendar);
  document.addEventListener("swup:contentReplaced", initCalendar);`;
const data = `      if (window.__allPostMetaCache) {
        allPostsData = window.__allPostMetaCache;
      } else {
        const response = await fetch(calendarDataUrl);
        allPostsData = await response.json();
        window.__allPostMetaCache = allPostsData;
      }`;
const factory = `  function captureOwnedHeaderHandlers(root, previous) {
    let owned = previous.map(([node, before]) => [node, node.onclick, before])
      .filter(([node, handler, before]) => root.contains(node) &&
        typeof handler === 'function' && handler !== before)
      .map(([node, handler]) => [node, handler]);
    root = null;
    previous = null;
    return function disposeCalendarHeaders() {
      const entries = owned;
      owned = null;
      if (!entries) return;
      for (const [node, handler] of entries) {
        if (node.onclick === handler) node.onclick = null;
      }
    };
  }
  window.SiteCalendarLifecycle.install({
    mount: function(root, scope) {
      activeScope = scope;
      const previous = ['prev-month-btn', 'next-month-btn', 'reset-month-btn', 'current-month-display']
        .map(id => { const node = root.querySelector('#' + id); return [node, node.onclick]; });
      try {
        initCalendar();
      } catch (error) {
        captureOwnedHeaderHandlers(root, previous)();
        throw error;
      }
      return captureOwnedHeaderHandlers(root, previous);
    },
    unmount: function() { activeScope = null; }
  });`;

hexo.extend.filter.register('before_generate', function adaptCalendarViews() {
  if (this.version !== '8.1.2') throw new Error('Review B1 adapter for this Hexo version');
  const prior = this[key];
  const views = {}, raw = {};
  // Validate BOTH views before any conversion or setView. Accept only exact
  // upstream sources or this instance's own last successful transformed bytes.
  for (const name of [headPath, calendarPath]) {
    const view = this.theme.getView(name);
    const content = view && view.data && view.data._content;
    if (typeof content !== 'string') throw new Error('Missing calendar view: ' + name);
    views[name] = view;
    if (hash(content) === expected[name]) raw[name] = content;
    else if (prior && content === prior.output[name]) raw[name] = prior.raw[name];
    else throw new Error('Review changed calendar template: ' + name);
  }
  const asset = fs.readFileSync(path.join(this.source_dir, 'js/site-calendar-lifecycle.js'));
  const version = hash(asset).slice(0, 12);
  const tag = `<script data-site-calendar-lifecycle src="<%= url_for('/js/site-calendar-lifecycle.js') %>?v=${version}"></script>`;
  const output = {};
  output[headPath] = once(raw[headPath], '<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + tag);
  let calendar = once(raw[calendarPath], '(function() {', `(function() {
  if (!window.SiteCalendarLifecycle) throw new Error('Calendar lifecycle adapter was not loaded');
  if (window.SiteCalendarLifecycle.hasFactory()) return;
  let activeScope = null;`);
  calendar = once(calendar, '  async function fetchData() {\n    try {', `  async function fetchData() {
    const scope = activeScope;
    if (!scope || !scope.isCurrent()) return;
    try {`);
  calendar = once(calendar, data, `      let posts = window.__allPostMetaCache;
      if (!posts) {
        const response = await fetch(calendarDataUrl, { signal: scope.signal });
        if (!scope.isCurrent()) return;
        posts = await response.json();
      }
      if (!scope.isCurrent()) return;
      allPostsData = posts;
      window.__allPostMetaCache = posts;`);
  calendar = once(calendar, '    } catch (error) {\n      console.error("Failed to fetch calendar data", error);', `    } catch (error) {
      if (scope.signal.aborted || !scope.isCurrent() || (error && error.name === 'AbortError')) return;
      console.error("Failed to fetch calendar data", error);`);
  output[calendarPath] = once(calendar, tail, factory);
  if (output[headPath].split('data-site-calendar-lifecycle').length !== 2 ||
      output[calendarPath].includes('addEventListener') &&
      /addEventListener\(["'](?:pjax:complete|swup:contentReplaced|DOMContentLoaded)/.test(output[calendarPath])) {
    throw new Error('Review calendar transformation invariants');
  }
  // All validation/conversion completed. Transactionally publish the two views;
  // a setView failure rejects the build, including when restoration also fails.
  try {
    for (const name of [headPath, calendarPath]) {
      if (views[name].data._content !== output[name]) {
        this.theme.setView(name, { ...views[name].data, _content: output[name] });
      }
    }
  } catch (cause) {
    const restoreErrors = [];
    for (const name of [headPath, calendarPath]) {
      try { this.theme.setView(name, { ...views[name].data }); }
      catch (error) { restoreErrors.push(error.message); }
    }
    throw new Error('Calendar view publish failed; stop build' +
      (restoreErrors.length ? '; restoration failed: ' + restoreErrors.join('; ') : '; originals restored'), { cause });
  }
  this[key] = { raw, output };
}, 4);
