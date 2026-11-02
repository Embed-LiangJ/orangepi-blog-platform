(function() {
  'use strict';
  if (window.__siteArticleReading) return;
  window.__siteArticleReading = true;

  // Native startup/PJAX passes document.body, which also includes escaped
  // excerpts/footer snippets. Only article prose should be parsed as TeX.
  if (typeof window.renderMathInElement === 'function') {
    var nativeMath = window.renderMathInElement;
    window.renderMathInElement = function(root, options) {
      if (root === document.body) {
        root = document.querySelector('.post-container .post-content');
        if (!root) return;
      }
      return nativeMath(root, options);
    };
  }

  // Retain the native TOC lifecycle and sidebar, but keep its observer reachable
  // so repeated native init calls on PJAX can disconnect it. A mobile details
  // view reuses the same headings; no theme template or PJAX selector changes.
  if (window.TOC) {
    window.TOC.buildTOC = function() {
      var content = document.querySelector('.post-container .post-content');
      var target = document.getElementById('toc-body');
      if (!content || !target) return;
      this.headings = Array.from(content.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      var mobile = document.querySelector('.site-mobile-toc');
      if (!this.headings.length) {
        target.replaceChildren();
        if (mobile) mobile.remove();
        return;
      }
      if (!mobile) {
        mobile = document.createElement('details');
        mobile.className = 'site-mobile-toc toc-widget';
        var summary = document.createElement('summary');
        summary.textContent = '文章目录';
        var navigation = document.createElement('nav');
        navigation.className = 'toc-body';
        navigation.setAttribute('aria-label', '文章目录');
        mobile.append(summary, navigation);
        content.before(mobile);
      }
      this.tocLinks = [];
      var self = this;
      [target, mobile.querySelector('nav')].forEach(function(container) {
        container.replaceChildren();
        self.headings.forEach(function(heading, index) {
          if (!heading.id) heading.id = 'heading-' + index;
          var item = document.createElement('div');
          item.className = 'toc-item toc-level-' + heading.tagName.slice(1);
          var link = document.createElement('a');
          link.href = '#' + encodeURIComponent(heading.id);
          link.textContent = heading.textContent;
          link.addEventListener('click', function(event) {
            event.preventDefault();
            mobile.open = false;
            var navbar = document.getElementById('navbar');
            var offset = (navbar ? navbar.getBoundingClientRect().height : 56) + 24;
            if (mobile.getClientRects().length) offset += mobile.querySelector('summary').getBoundingClientRect().height;
            window.scrollTo({ top: scrollY + heading.getBoundingClientRect().top - offset, behavior: 'smooth' });
            history.pushState(null, '', link.getAttribute('href'));
          });
          item.appendChild(link);
          container.appendChild(item);
          self.tocLinks.push(item);
        });
      });
    };
    window.TOC.bindScroll = function() {
      if (!this.headings.length || !this.tocLinks.length) return;
      var self = this;
      this.observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          var active = '#' + encodeURIComponent(entry.target.id);
          self.tocLinks.forEach(function(item) {
            item.classList.toggle('active', item.querySelector('a').getAttribute('href') === active);
          });
        });
      // Observer percentage margins are relative to WIDTH, not height: the
      // native -80% makes the root empty on wide desktop viewports.
      }, { rootMargin: '-80px 0px -' + Math.max(0, window.innerHeight - 260) + 'px 0px' });
      this.headings.forEach(function(heading) { self.observer.observe(heading); });
    };
    var resizeFrame;
    window.addEventListener('resize', function() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(function() {
        if (window.TOC.observer) window.TOC.observer.disconnect();
        window.TOC.bindScroll();
      });
    });
  }

  // Hexo highlights use a gutter pre before the actual code pre. Only intercept
  // the article copy button; keep native folding and all other clicks intact.
  document.addEventListener('click', function(event) {
    var button = event.target.closest && event.target.closest('.post-content .code-copy-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    var wrapper = button.closest('.code-block-wrapper');
    var source = wrapper.querySelector('.code pre') || wrapper.querySelector('pre code') || wrapper.querySelector('pre');
    if (!source) return;
    var clone = source.cloneNode(true);
    clone.querySelectorAll('br').forEach(function(br) {
      br.replaceWith(document.createTextNode('\n'));
    });
    var text = clone.textContent;
    var task = navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text) : Promise.reject(new Error('Clipboard API unavailable'));
    task.then(function() {
      button.classList.add('copied');
      button.setAttribute('aria-label', '复制成功');
      button.title = '复制成功';
      setTimeout(function() {
        if (!button.isConnected) return;
        button.classList.remove('copied');
        button.setAttribute('aria-label', '复制代码');
        button.title = '复制代码';
      }, 2000);
    }).catch(function() {
      button.setAttribute('aria-label', '复制失败，请手动选择代码');
      button.title = '复制失败，请手动选择代码';
    });
  }, true);
})();
