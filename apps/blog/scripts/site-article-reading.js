'use strict';

// Keep reading assets outside the theme and existing visual Injector.
// Load on every document so homepage -> article PJAX already has the adapter.
const { JSDOM } = require('jsdom');
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');
const { url_for } = require('hexo-util');
const css = 'css/site-article-reading.css';
const js = 'js/site-article-reading.js';
const version = createHash('sha256').update(readFileSync(join(hexo.source_dir, css)))
  .update(readFileSync(join(hexo.source_dir, js))).digest('hex').slice(0, 12);
hexo.extend.filter.register('after_render:html', function(html) {
  if (!/<!doctype html>/i.test(html)) return html;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  if (!document.querySelector('link[data-site-reading]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url_for.call(this, '/' + css) + '?v=' + version;
    link.dataset.siteReading = 'style';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-site-reading]')) {
    const script = document.createElement('script');
    script.src = url_for.call(this, '/' + js) + '?v=' + version;
    script.dataset.siteReading = 'script';
    document.body.appendChild(script);
  }
  const output = dom.serialize();
  dom.window.close();
  return output;
}, 25);
