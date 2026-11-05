(function () {
  'use strict';
  if (window.__siteNavigationV1) return;
  window.__siteNavigationV1 = true;
  const groupSelector = '#navbar-menu details[data-site-nav]';
  const groups = () => document.querySelectorAll(groupSelector);
  const mobile = () => window.innerWidth <= 768 || document.getElementById('navbar')?.classList.contains('mobile-nav');
  function sync(group) {
    group.querySelector('summary')?.setAttribute('aria-expanded', String(group.open));
  }
  function setOpen(group, open) {
    group.open = open;
    sync(group);
  }
  function closeGroups() { groups().forEach(group => setOpen(group, false)); }
  function reset() {
    closeGroups();
    // Only close the native menu when it owns open state, not another popup's scroll lock.
    if (document.getElementById('mobile-menu-toggle')?.getAttribute('aria-expanded') === 'true' ||
        document.querySelector('#navbar-menu .navbar-links.open, .mobile-menu-backdrop.open')) {
      window.ScrollManager?.closeMobileMenu();
    }
  }
  // One coalesced frame, no retained menu/section nodes across PJAX or BFCache.
  let frame = 0;
  function syncOverflow() {
    const navbar = document.getElementById('navbar');
    const inner = navbar?.querySelector('.navbar-inner');
    const links = document.querySelector('#navbar-menu > .navbar-links');
    const toggle = document.getElementById('mobile-menu-toggle');
    if (!inner || !links || !toggle || links.classList.contains('open')) return;
    // Native overflow detection measures a hidden list as zero after PJAX.
    // Briefly measure the same closed list, then restore its exact inline style.
    const saved = links.getAttribute('style');
    let width;
    try {
      links.style.cssText += ';display:flex!important;position:absolute!important;visibility:hidden!important;flex-direction:row!important;width:max-content!important;max-width:none!important;';
      width = Math.max(links.scrollWidth, links.getBoundingClientRect().width);
    } finally {
      if (saved === null) links.removeAttribute('style');
      else links.setAttribute('style', saved);
    }
    const available = inner.offsetWidth - (inner.querySelector('.navbar-brand')?.offsetWidth || 0) - (inner.querySelector('.navbar-actions')?.offsetWidth || 0) - 40;
    const needsMenu = window.innerWidth <= 768 || width > available;
    navbar.classList.toggle('mobile-nav', needsMenu);
    toggle.classList.toggle('visible', needsMenu);
  }
  function cancelFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function refresh() {
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      syncOverflow();
    });
  }
  document.addEventListener('click', function (event) {
    const target = event.target.closest?.('summary.site-nav-trigger');
    if (target && target.closest(groupSelector)) {
      event.preventDefault();
      const group = target.parentElement;
      setOpen(group, !group.open);
      return;
    }
    // Ordinary child links still reach Firefly/PJAX; no stopPropagation/URL rewrite.
    closeGroups();
  }, true);
  document.addEventListener('pointerover', function (event) {
    if (mobile() || (event.pointerType && event.pointerType !== 'mouse')) return;
    const group = event.target.closest?.(groupSelector);
    if (group && !group.contains(event.relatedTarget)) setOpen(group, true);
  });
  document.addEventListener('pointerout', function (event) {
    if (mobile()) return;
    const group = event.target.closest?.(groupSelector);
    if (group && !group.contains(event.relatedTarget) && !group.contains(document.activeElement)) setOpen(group, false);
  });
  document.addEventListener('focusout', function (event) {
    const group = event.target.closest?.(groupSelector);
    if (group && !group.contains(event.relatedTarget)) setOpen(group, false);
  });
  document.addEventListener('toggle', function (event) {
    if (event.target.matches?.(groupSelector)) sync(event.target);
  }, true);
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const opened = document.querySelector(groupSelector + '[open]');
    const hamburger = document.getElementById('mobile-menu-toggle');
    const menuOpen = hamburger?.getAttribute('aria-expanded') === 'true';
    if (!opened && !menuOpen) return;
    const focus = menuOpen ? hamburger : opened.querySelector('summary');
    reset();
    focus?.focus();
  }, true);
  document.addEventListener('pjax:send', function () { reset(); cancelFrame(); });
  document.addEventListener('pjax:complete', function () { reset(); refresh(); });
  window.addEventListener('pagehide', function () { reset(); cancelFrame(); });
  window.addEventListener('pageshow', function () { reset(); refresh(); });
  window.addEventListener('resize', function () { reset(); refresh(); });
  function ready() { reset(); refresh(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
