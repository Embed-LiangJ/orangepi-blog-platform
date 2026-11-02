'use strict';

// Build-time only: append one stylesheet after Firefly's CSS via Hexo's API.
// No browser script, template replacement, or extra HTML parsing is needed.
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');
const { escapeHTML, url_for } = require('hexo-util');
const asset = 'css/site-anime-engineering.css';
const version = createHash('sha256')
  .update(readFileSync(join(hexo.source_dir, asset)))
  .digest('hex').slice(0, 12);
const href = url_for.call(hexo, '/' + asset) + '?v=' + version;
hexo.extend.injector.register('head_end',
  `<link rel="stylesheet" href="${escapeHTML(href)}" data-site-visual="anime-engineering">`);
