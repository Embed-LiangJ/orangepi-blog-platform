'use strict';

// Keep Firefly's settings/buttons/CSS. Load the small initializer adapter directly
// after its native manager, before DOMContentLoaded or boot.js can call init.
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const digest = data => createHash('sha256').update(data).digest('hex');
const upstream = '9e99673d8e973557a7dadb8a181d47e3622192d5e890d5fb6ea495314661e123';
hexo.extend.filter.register('before_generate', function () {
  const native = fs.readFileSync(path.join(this.theme_dir, 'source/js/ui/post-layout.js'));
  if (digest(native) !== upstream) throw new Error('Firefly post layout changed; review initializer adapter');
  const viewPath = '_partials/scripts.ejs';
  const view = this.theme.getView(viewPath);
  const content = view?.data._content;
  const anchor = '<script src="<%= url_for(\'/js/ui/post-layout.js\') %>"></script>';
  const version = digest(fs.readFileSync(path.join(this.source_dir, 'js/site-post-layout.js'))).slice(0, 12);
  const adapter = `<script src="<%= url_for('/js/site-post-layout.js') %>?v=${version}"></script>`;
  if (typeof content !== 'string' || content.split(anchor).length !== 2) {
    throw new Error('Firefly post layout script anchor changed; review initializer adapter');
  }
  if (content.includes(adapter)) return;
  if (content.includes('/js/site-post-layout.js')) throw new Error('Conflicting post layout adapter');
  this.theme.setView(viewPath, { ...view.data, _content: content.replace(anchor, anchor + '\n' + adapter) });
}, 3);
