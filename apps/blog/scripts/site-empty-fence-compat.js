'use strict';

// Project-owned replacement; third-party files and all other filters stay intact.
const { createHash } = require('crypto');
const { readFileSync } = require('fs');
const { dirname, join } = require('path');
const key = Symbol.for('site.emptyFenceCompat.v1');
const sha = value => createHash('sha256').update(value).digest('hex');
const type = 'before_post_render';

(function registerCompatibility() {
  if (hexo[key]) {
    if (hexo[key].phase === 'failed') throw hexo[key].error;
    return;
  }
  const state = { phase: 'pending', executions: 0 };
  hexo[key] = state;
  const filters = hexo.extend.filter;
  const sameChain = (actual, expected) => actual.length === expected.length &&
    actual.every((fn, index) => fn === expected[index].fn && fn.priority === expected[index].priority);

  // A failed instance must never generate, even if a caller catches init's error.
  filters.register('before_generate', function requireReadyFenceFilter() {
    if (state.phase !== 'ready') throw state.error || new Error('Empty-fence compatibility is not ready');
    if (!sameChain(filters.list(type), state.expected)) {
      state.phase = 'failed';
      state.error = new Error('Empty-fence filter chain changed after installation; terminate build');
      throw state.error;
    }
  }, 0);

  filters.register('after_init', function installEmptyFenceCompatibility() {
    if (state.phase === 'failed') throw state.error;
    if (state.phase === 'ready') {
      if (!sameChain(filters.list(type), state.expected)) {
        state.phase = 'failed';
        state.error = new Error('Empty-fence filter chain changed; terminate build');
        throw state.error;
      }
      return;
    }

    let snapshot, native, replacement;
    let mutationAttempted = false;
    const priority = 9;
    try {
      if (this.version !== '8.1.2') throw new Error('Expected Hexo 8.1.2; review empty-fence compatibility');
      for (const method of ['list', 'register', 'unregister']) {
        if (typeof filters[method] !== 'function') throw new Error('Missing Hexo filter API: ' + method);
      }
      const file = join(dirname(require.resolve('hexo/package.json')),
        'dist/plugins/filter/before_post_render/backtick_code_block.js');
      if (sha(readFileSync(file)) !== '8e18131c3e694ba36485817722b08100ad0a31ea18c5eaaaad25246efdcac102') {
        throw new Error('Hexo fence source fingerprint changed');
      }
      const chain = filters.list(type).slice();
      snapshot = chain.map(fn => ({ fn, priority: fn.priority }));
      const matches = chain.filter(fn => fn.name === 'backtickCodeBlock');
      if (matches.length !== 1 || sha(matches[0].toString()) !==
          '2d497f525a655ea245cf28258c4eaff37b25191ab91b9b981934859f74382a6e') {
        throw new Error('Unexpected native fence filter identity');
      }
      native = matches[0];
      const index = chain.indexOf(native);
      if (native.priority !== 10 || chain.some(fn => fn !== native && fn.priority > priority && fn.priority < 10) ||
          chain.slice(0, index).some(fn => fn.priority === 10)) {
        throw new Error('Unsupported native fence filter order');
      }
      // Keep loading inside after_init: Hexo logs and swallows script-load
      // errors, whereas a rejected after_init reliably prevents generation.
      const createCompatFilter = require('../lib/compat/hexo-8.1.2-backtick.cjs');
      if (typeof createCompatFilter !== 'function') throw new Error('Invalid empty-fence factory module');
      const compat = createCompatFilter(this);
      if (typeof compat !== 'function') throw new Error('Invalid empty-fence compatibility factory');
      replacement = function siteEmptyFenceCompat(data) {
        if (state.phase !== 'ready') throw state.error || new Error('Empty-fence transaction is not ready');
        state.executions++;
        return compat(data);
      };
      const expected = snapshot.map(item => item.fn === native ? { fn: replacement, priority } : item);

      mutationAttempted = true;
      filters.unregister(type, native);
      filters.register(type, replacement, priority);
      if (!sameChain(filters.list(type), expected)) throw new Error('Replacement filter order mismatch');
      state.native = native;
      state.replacement = replacement;
      state.expected = expected;
      state.phase = 'ready';
    } catch (cause) {
      state.phase = 'failed';
      let recoveryError;
      if (mutationAttempted) {
        try {
          if (!sameChain(filters.list(type), snapshot)) {
            // Never reorder, unregister or change the metadata of another filter.
            const others = snapshot.filter(item => item.fn !== native);
            const actualOthers = filters.list(type).filter(fn => fn !== native && fn !== replacement);
            if (!sameChain(actualOthers, others)) throw new Error('Unrelated filters changed; cannot safely recover');
            filters.unregister(type, replacement);
            filters.unregister(type, native);
            try {
              // register appends among equal priorities. Insert this native
              // function just before priority 10, then restore its OWN metadata.
              filters.register(type, native, priority);
            } finally {
              native.priority = snapshot.find(item => item.fn === native).priority;
            }
            if (!sameChain(filters.list(type), snapshot)) throw new Error('Original filter chain was not restored');
          }
          state.restored = true;
        } catch (error) {
          recoveryError = error;
          state.restored = sameChain(filters.list(type), snapshot);
        }
      } else {
        state.restored = true; // No registry mutation was attempted.
      }
      state.error = new Error(recoveryError
        ? 'Empty-fence RESTORE_FAILED; terminate this instance and build'
        : 'Empty-fence installation failed; original chain preserved/restored; terminate build', { cause });
      if (recoveryError) state.error.recoveryError = recoveryError;
      throw state.error;
    }
  }, 100);
})();
