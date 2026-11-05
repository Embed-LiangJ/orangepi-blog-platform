'use strict';

// Same DOM contract for generated HTML (JSDOM) and the live CDP document.
// Shared navigation/profile/calendar sidebars are not page正文.
function inspectPageDOM(document, route) {
  route = decodeURI(route.split('#')[0]);
  const must = (ok, message) => { if (!ok) throw new Error(route + ': ' + message); };
  const main = document.querySelector('#main-content');
  must(main, 'missing main');
  const research = ['科研方向', '研究内容', '实验记录', '项目经历'];
  const about = ['个人介绍', '教育经历', '技术栈', '联系方式'];
  const headings = [...main.querySelectorAll('h2')].map(e => e.textContent.trim());
  const own = main.querySelector('[data-site-page]');
  const isResearch = route === '/research-projects/';
  const isAbout = route === '/about/';
  const isPage = isResearch || isAbout;
  must(document.querySelectorAll('[data-site-page]').length === (isPage ? 1 : 0), 'foreign/duplicate complete Page body');
  must(!main.querySelector('#research-projects, #about-me'), 'legacy homepage fragment body');
  if (isPage) {
    must(own && own.dataset.sitePage === (isResearch ? 'research-projects' : 'about'), 'wrong Page content');
    must(JSON.stringify(headings) === JSON.stringify(isResearch ? research : about), 'wrong or mixed body headings: ' + headings);
    must(!main.querySelector('.post-list, .post-card-item, .archive-card, .post-container, [data-site-home-entries]'), 'blog/home body leaked into Page, including hidden DOM');
    must(!main.querySelector('.dynamic-page-container'), 'dynamic body leaked into Page');
    must(own.textContent.includes('待补充'), 'missing honest content placeholder');
    must(document.querySelector('.sidebar-left') && document.querySelector('.sidebar-right'), 'native sidebar shell missing');
  } else {
    must(!headings.some(x => research.includes(x) || about.includes(x)), 'independent Page prose leaked into another route');
    if (route === '/') {
      must(main.querySelector('.post-list'), 'homepage post preview missing');
      must(main.querySelector('[data-site-home-entries]'), 'homepage short entries missing');
    } else {
      must(!main.querySelector('[data-site-home-entries]'), 'home entry cards leaked into non-home route');
      if (route.startsWith('/archives/')) must(main.querySelector('.archive-card') && !main.querySelector('.post-list, .post-content'), 'archive body invalid');
      else if (route === '/categories/') must(main.querySelector('.categories-grid') && !main.querySelector('.post-list'), 'category index invalid');
      else if (route === '/tags/') must(main.querySelector('.tags-cloud-list') && !main.querySelector('.post-list'), 'tag index invalid');
      else if (route.startsWith('/categories/') || route.startsWith('/tags/')) must(main.querySelector('.post-list'), 'filtered post list missing');
      else if (route === '/dynamic/') must(main.querySelector('.dynamic-page-container') && !main.querySelector('.post-list, .post-content'), 'dynamic page invalid');
      else must(main.querySelector('.post-content') && !main.querySelector('.post-list'), 'article detail missing or mixed');
    }
  }
  const postTitles = [...main.querySelectorAll('.post-card-title a, .archive-item-title')].map(e => e.textContent.trim());
  if (route === '/categories/技术测试/' || route === '/tags/Hexo/') must(JSON.stringify(postTitles) === JSON.stringify(['Firefly 主题初始化测试']), 'unrelated article leaked through taxonomy filter: ' + postTitles);
  if (route === '/categories/隔离测试/' || route === '/tags/IsolationOther/') must(JSON.stringify(postTitles) === JSON.stringify(['ISOLATION_OTHER_FIXTURE']), 'counterexample taxonomy filter invalid');
  if (/^\/2026\//.test(route)) must(main.querySelectorAll('.post-content').length === 1, 'multiple article bodies');
  must(document.querySelector('#banner-overlay-container'), 'native banner shell missing');
  const primary = [...document.querySelectorAll('#navbar-menu > .navbar-links > li')];
  must(primary.length === 5, 'five primary entries required');
  const hrefs = [...document.querySelectorAll('#navbar-menu a')].map(e => e.getAttribute('href'));
  must(hrefs.includes('/research-projects/') && hrefs.includes('/about/') && !hrefs.some(x => x.startsWith('/#')), 'wrong Page destinations');
  return { route, type: own?.dataset.sitePage || null, headings, postCards: main.querySelectorAll('.post-card-item').length,
    postTitles,
    articleBodies: main.querySelectorAll('.post-content').length, completePageBodies: document.querySelectorAll('[data-site-page]').length,
    dynamicWidgets: document.querySelectorAll('.dynamic-widget').length, dynamicCount: document.querySelector('#dynamic-count-num')?.textContent.trim() || null };
}
module.exports = { inspectPageDOM };
