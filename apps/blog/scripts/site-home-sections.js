'use strict';

// Native Hexo Pages share only Firefly's grid/sidebar shell, never its post loop.
const { createHash } = require('crypto');
const viewPath = 'index.ejs';
const pageView = 'site-page.ejs';
const upstream = 'e949866b07fe35761e53c4afbd2e66b94d56bef51b94fac7556bbaee0221946c';
const anchor = "    <%- partial('_partials/post/content-nav') %>";
const sections = `    <% if (is_home() && (!page.current || Number(page.current) === 1)) { %>
    <div class="site-home-sections" data-site-home-entries>
      <section class="site-home-card">
        <h2>科研与项目 <small>Research / Projects</small></h2>
        <p class="site-home-note"><a href="<%= url_for('/research-projects/') %>">查看科研与项目页面</a></p>
      </section>
      <section class="site-home-card">
        <h2>关于我 <small>About</small></h2>
        <p class="site-home-note"><a href="<%= url_for('/about/') %>">查看个人介绍页面</a></p>
      </section>
    </div>
    <% } %>
`;
const main = /  <main\b[\s\S]*?<\/main>/g;
const pageMain = `  <main id="main-content" class="site-static-page" aria-label="<%= page.title %>">
    <%- partial('_partials/post/content-nav') %>
    <article class="page-content site-home-card" data-site-page="<%= page.type %>">
      <header class="page-header"><h1 class="page-title"><%= page.title %></h1></header>
      <div class="markdown-body custom-md"><%- page.content %></div>
    </article>
  </main>`;
let installed;
hexo.extend.filter.register('before_generate', function adaptSitePages() {
  const view = this.theme.getView(viewPath);
  const content = view && view.data && view.data._content;
  const existing = this.theme.getView(pageView);
  if (typeof content !== 'string') throw new Error('Missing Firefly index view');
  if (installed && content === installed.home && existing?.data._content === installed.page) return;
  if (createHash('sha256').update(content).digest('hex') !== upstream || content.split(anchor).length !== 2 || [...content.matchAll(main)].length !== 1 || existing) {
    throw new Error('Firefly index changed; review isolated page adapter');
  }
  // Derive the shell from the unmodified upstream view; omit its entire main/post loop.
  const isolated = content.replace(main, pageMain);
  const home = content.replace(anchor, sections + anchor);
  this.theme.setView(pageView, { ...view.data, _content: isolated });
  this.theme.setView(viewPath, { ...view.data, _content: home });
  installed = { home, page: isolated };
}, 6);
