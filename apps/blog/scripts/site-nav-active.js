'use strict';

// Reuse Hexo's archive flag/helper and Firefly's existing active class/CSS.
// Only this in-memory view changes; PJAX already replaces #navbar-menu.
const { createHash } = require('crypto');
const viewPath = '_partials/header/navigation.ejs';
const upstream = '723efce8aee1407a7340ff3f8d821a1f00c21fc8e79b24a18fa183da5a599c4d';
const before = "<%= page.layout === 'archive' ? ' active' : '' %>";
const after = "<%= is_archive() ? ' active' : '' %>";
const hash = text => createHash('sha256').update(text).digest('hex');
hexo.extend.filter.register('before_generate', function adaptArchiveNavActive() {
  const view = this.theme.getView(viewPath);
  const content = view && view.data && view.data._content;
  if (typeof content !== 'string') throw new Error('Missing Firefly navigation view');
  if (content.split(after).length === 2 && hash(content.replace(after, before)) === upstream) return;
  if (hash(content) !== upstream || content.split(before).length !== 2) {
    throw new Error('Firefly navigation changed; review archive active adapter');
  }
  this.theme.setView(viewPath, { ...view.data, _content: content.replace(before, after) });
}, 5);
