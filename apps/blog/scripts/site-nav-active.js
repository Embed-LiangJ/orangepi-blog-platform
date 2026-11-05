'use strict';

// Site-owned navigation view; Firefly's disk template and PJAX stay unchanged.
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');
const { escapeHTML, url_for } = require('hexo-util');
const viewPath = '_partials/header/navigation.ejs';
const upstream = '723efce8aee1407a7340ff3f8d821a1f00c21fc8e79b24a18fa183da5a599c4d';
const hash = text => createHash('sha256').update(text).digest('hex');
const start = '        <!-- Archive (LinkPreset.Archive) -->';
const end = '        <!-- Dynamic -->';
const group = `        <% var siteArchive = is_archive() || is_post();
           var siteCategory = is_category() || page.layout === 'categories' || page.layout === 'category';
           var siteTag = is_tag() || page.layout === 'tags' || page.layout === 'tag'; %>
        <li class="navbar-link-item">
          <details class="site-nav-group" data-site-nav>
            <summary class="navbar-link site-nav-trigger<%= siteArchive || siteCategory || siteTag ? ' active' : '' %>" aria-expanded="false" aria-controls="site-blog-submenu">
              <span class="navbar-link-content">
                <span class="material-symbols-outlined" aria-hidden="true">menu_book</span>
                <span>技术博客</span>
              </span>
              <span class="material-symbols-outlined site-nav-arrow" aria-hidden="true">expand_more</span>
            </summary>
            <ul class="site-nav-submenu" id="site-blog-submenu" aria-label="技术博客">
              <li><a href="<%= url_for('/archives') %>" class="site-nav-sub-link<%= siteArchive ? ' active' : '' %>"<%- siteArchive ? ' aria-current="location"' : '' %>><span class="material-symbols-outlined" aria-hidden="true">archive</span><span>全部文章</span></a></li>
              <li><a href="<%= url_for('/categories') %>" class="site-nav-sub-link<%= siteCategory ? ' active' : '' %>"<%- siteCategory ? ' aria-current="location"' : '' %>><span class="material-symbols-outlined" aria-hidden="true">folder</span><span>分类</span></a></li>
              <li><a href="<%= url_for('/tags') %>" class="site-nav-sub-link<%= siteTag ? ' active' : '' %>"<%- siteTag ? ' aria-current="location"' : '' %>><span class="material-symbols-outlined" aria-hidden="true">sell</span><span>标签</span></a></li>
            </ul>
          </details>
        </li>

`;
const pageLink = (type, route, label, icon) => `        <li class="navbar-link-item">
          <a href="<%= url_for('${route}') %>" class="navbar-link<%= page.layout === 'site-page' && page.type === '${type}' ? ' active' : '' %>"<%- page.layout === 'site-page' && page.type === '${type}' ? ' aria-current="page"' : '' %>>
            <span class="navbar-link-content"><span class="material-symbols-outlined" aria-hidden="true">${icon}</span><span>${label}</span></span>
            <span class="material-symbols-outlined dropdown-arrow mobile-arrow" aria-hidden="true">chevron_right</span>
          </a>
        </li>\n\n`;
let installed;
hexo.extend.filter.register('before_generate', function adaptSiteNavigation() {
  const view = this.theme.getView(viewPath);
  const content = view && view.data && view.data._content;
  if (typeof content !== 'string') throw new Error('Missing Firefly navigation view');
  if (installed && content === installed) return;
  if (hash(content) !== upstream || content.split(start).length !== 2 || content.split(end).length !== 2) {
    throw new Error('Firefly navigation changed; review site navigation adapter');
  }
  const next = (content.slice(0, content.indexOf(start)) + group + pageLink('research-projects', '/research-projects/', '科研与项目', 'science') + content.slice(content.indexOf(end)))
    // Explicit native Page destinations, not homepage fragments or invented biography.
    .replace(/        <!-- About -->[\s\S]*?(?=        <!-- Friends -->)/, pageLink('about', '/about/', '关于我', 'person'))
    .replace("<%= __('dynamic') || '动态' %>", '生活动态')
    .replace("page.layout === 'dynamic' || (page.path && page.path.indexOf('dynamic') !== -1)", "page.layout === 'dynamic' || page.type === 'dynamic'")
    // A disclosure with ordinary links is not an application-style ARIA menubar.
    .replace(/ role="(?:menubar|menuitem|none)"/g, '');
  this.theme.setView(viewPath, { ...view.data, _content: next });
  installed = next;
}, 5);

// Independent assets, loaded once on every document for first-entry PJAX.
const css = 'css/site-navigation.css';
const js = 'js/site-navigation.js';
const version = hash(readFileSync(join(hexo.source_dir, css)) + '\n' + readFileSync(join(hexo.source_dir, js))).slice(0, 12);
const href = escapeHTML(url_for.call(hexo, '/' + css) + '?v=' + version);
const src = escapeHTML(url_for.call(hexo, '/' + js) + '?v=' + version);
hexo.extend.injector.register('head_end', `<link rel="stylesheet" href="${href}" data-site-navigation="style">`);
hexo.extend.injector.register('body_end', `<script src="${src}" defer data-site-navigation="script"></script>`);
