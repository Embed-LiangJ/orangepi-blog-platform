'use strict';

// Load one site adapter immediately after Firefly's display settings module.
// Only the in-memory script partial changes; theme files and Injector stay intact.
hexo.extend.filter.register('before_generate', function() {
  const path = '_partials/scripts.ejs';
  const view = this.theme.getView(path);
  const anchor = '<script src="<%= url_for(\'/js/ui/display-settings.js\') %>"></script>';
  const adapter = '<script src="<%= url_for(\'/js/site-hue-reset.js\') %>"></script>';
  const content = view && view.data._content;
  if (typeof content !== 'string' || content.split(anchor).length !== 2) {
    throw new Error('Firefly display settings script changed; review hue reset adapter');
  }
  if (content.includes(adapter)) return;
  this.theme.setView(path, { ...view.data, _content: content.replace(anchor, anchor + '\n' + adapter) });
}, 3);
