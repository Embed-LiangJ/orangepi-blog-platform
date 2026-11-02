'use strict';

// Preserve explicit TeX delimiters through the existing Marked renderer.
// Native KaTeX handles rendering (including PJAX); no extra math dependency.
const { escapeHTML } = require('hexo-util');
const pairs = [ ['$$', '$$'], ['\\[', '\\]'], ['$', '$'], ['\\(', '\\)'] ];
function token(source, block) {
  for (const [left, right] of pairs) {
    if (block && left !== '$$' && left !== '\\[') continue;
    if (!source.startsWith(left)) continue;
    for (let end = left.length; (end = source.indexOf(right, end)) !== -1; end += right.length) {
      let backslashes = 0;
      for (let i = end - 1; i >= 0 && source[i] === '\\'; i--) backslashes++;
      if (backslashes % 2) continue;
      const raw = source.slice(0, end + right.length);
      if (raw.length === left.length + right.length) return;
      if (block && !/^[ \t]*(?:\n|$)/.test(source.slice(raw.length))) return;
      if (!block && (left === '$' || left === '\\(') && raw.includes('\n')) return;
      return { type: block ? 'siteMathBlock' : 'siteMathInline', raw, text: raw };
    }
    return;
  }
}
hexo.extend.filter.register('marked:extensions', function(extensions) {
  if (this.theme.config.math?.engine !== 'katex') return extensions;
  extensions.push({
    name: 'siteMathBlock', level: 'block',
    tokenizer(source) { return token(source, true); },
    renderer(item) { return '<div class="site-math-source">' + escapeHTML(item.text) + '</div>\n'; }
  }, {
    name: 'siteMathInline', level: 'inline',
    start(source) {
      const positions = pairs.map(([left]) => source.indexOf(left)).filter(i => i >= 0);
      return positions.length ? Math.min(...positions) : undefined;
    },
    tokenizer(source) { return token(source, false); },
    renderer(item) { return '<span class="site-math-source">' + escapeHTML(item.text) + '</span>'; }
  });
  return extensions;
});
