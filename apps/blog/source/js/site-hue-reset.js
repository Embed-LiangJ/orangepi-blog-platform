(function() {
  'use strict';

  var display = window.DisplaySettings;
  if (!display || typeof display.resetSection !== 'function' || !window.Settings) {
    throw new Error('Firefly settings unavailable; cannot install site hue reset');
  }
  if (display.resetSection.siteHueReset) return;
  var nativeReset = display.resetSection;

  function resetSection(section) {
    if (section !== 'theme') return nativeReset.apply(this, arguments);

    // Firefly renders this from theme_color.hue, independent of saved --hue.
    // Do not duplicate the configured default in JS or clear other preferences.
    var configured = getComputedStyle(document.documentElement)
      .getPropertyValue('--configHue').trim();
    var hue = Number(configured);
    if (configured === '' || !Number.isInteger(hue) || hue < 0 || hue > 360) {
      throw new Error('Missing or invalid Firefly --configHue; hue reset cancelled');
    }
    window.Settings.setHue(hue);
    this.syncAllValues();
  }

  resetSection.siteHueReset = true;
  display.resetSection = resetSection;
})();
