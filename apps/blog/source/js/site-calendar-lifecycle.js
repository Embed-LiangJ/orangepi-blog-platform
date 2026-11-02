/* Site-owned calendar lifecycle; Firefly drawing code remains in its view. */
(function () {
  'use strict';
  if (window.SiteCalendarLifecycle) return;

  let factory = null, root = null, scope = null, cleanup = null;
  let generation = 0, suspended = false;
  const counts = { mounts: 0, unmounts: 0, completes: 0, installs: 0 };

  // This separate activation captures only a scalar token, never a mount's DOM.
  function createScope(token) {
    const controller = new AbortController();
    const current = {
      signal: controller.signal,
      abort: function () { controller.abort(); },
      isCurrent: function () {
        return scope === current && generation === token && !current.signal.aborted &&
          !!root && root.isConnected;
      }
    };
    return current;
  }

  function unmount() {
    if (!root && !scope) return;
    ++generation;
    const oldScope = scope, dispose = cleanup;
    root = null;
    scope = null;
    cleanup = null;
    counts.unmounts++;
    // Invalidate first: even synchronous abort handlers see a stale scope.
    let failure;
    try { if (oldScope) oldScope.abort(); } catch (error) { failure = error; }
    try { if (dispose) dispose(); } catch (error) { failure = failure || error; }
    try { if (factory.unmount) factory.unmount(); } catch (error) { failure = failure || error; }
    if (failure) throw failure;
  }

  function reconcile() {
    if (suspended) return;
    const roots = document.querySelectorAll('.calendar-widget');
    if (roots.length > 1) {
      unmount();
      throw new Error('Review calendar DOM contract: multiple roots');
    }
    const next = roots[0] || null;
    if (next === root) return;
    unmount();
    if (!next || !factory) return;
    for (const id of ['prev-month-btn', 'next-month-btn', 'reset-month-btn', 'current-month-display',
      'calendar-view-container', 'month-view-container', 'year-view-container', 'calendar-grid',
      'calendar-posts', 'calendar-posts-list', 'calendar-posts-divider']) {
      if (next.querySelectorAll('[id="' + id + '"]').length !== 1 ||
          document.querySelectorAll('[id="' + id + '"]').length !== 1) {
        throw new Error('Review calendar DOM contract: ' + id);
      }
    }
    // Construct first: unsupported/throwing AbortController must not leave a
    // root half-mounted and make subsequent complete events silently no-op.
    scope = createScope(++generation);
    root = next;
    counts.mounts++;
    try {
      const result = factory.mount(root, scope);
      if (result != null && typeof result !== 'function') throw new Error('Calendar cleanup must be a function');
      cleanup = result || null;
    } catch (error) {
      try { unmount(); } catch (cleanupError) {
        throw new Error('Calendar mount and disposal failed', { cause: cleanupError });
      }
      throw error;
    }
  }

  function onCalendarReady() { reconcile(); }
  function onCalendarComplete() { counts.completes++; reconcile(); }
  function onCalendarHide() { suspended = true; unmount(); }
  function onCalendarShow(event) {
    if (event.persisted) { suspended = false; reconcile(); }
  }
  window.SiteCalendarLifecycle = Object.freeze({
    hasFactory: function () { return !!factory; },
    install: function (api) {
      if (factory) return;
      if (!api || typeof api.mount !== 'function' ||
          (api.unmount != null && typeof api.unmount !== 'function')) {
        throw new Error('Invalid calendar factory');
      }
      factory = api;
      counts.installs++;
      if (document.readyState !== 'loading') reconcile();
    },
    // Diagnostics expose numbers/booleans, not root, cleanup, factory or scope.
    stats: function () {
      return { ...counts, generation, mounted: !!root, scopeActive: !!scope,
        cleanupActive: !!cleanup, suspended };
    }
  });
  document.addEventListener('DOMContentLoaded', onCalendarReady, { once: true });
  document.addEventListener('pjax:complete', onCalendarComplete);
  window.addEventListener('pagehide', onCalendarHide);
  window.addEventListener('pageshow', onCalendarShow);
})();
