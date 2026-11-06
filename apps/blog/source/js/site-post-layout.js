(function () {
  'use strict';
  const manager = window.PostLayoutManager;
  const settings = window.Settings;
  if (!manager || !settings) throw new Error('Firefly post layout prerequisites missing');
  if (manager.__siteLayoutSynchronized) return;
  const nativeInit = manager.init;
  manager.init = function () {
    // Native mobile init otherwise writes grid even though the configured default
    // is list. Seed only an absent preference; never replace a user's grid choice.
    if (!localStorage.getItem(settings.KEYS.postListLayout)) {
      settings.setPostListLayout('list');
    }
    const result = nativeInit.apply(this, arguments);
    // Native init binds once. PJAX replaces main, so its early return must not
    // prevent applying the same saved mode to the new container and list.
    const container = document.querySelector('.post-list-container');
    const list = container?.querySelector('.post-list');
    if (list) {
      const mode = settings.getPostListLayout();
      container.setAttribute('data-layout', mode);
      list.setAttribute('data-mode', mode);
    }
    this.syncButtonStates();
    return result;
  };
  manager.__siteLayoutSynchronized = true;
})();
