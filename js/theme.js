/* Apply the editor's appearance before styles load to avoid a light flash. */
(function () {
  'use strict';
  const RS = window.RS = window.RS || {};
  const key = 'resume-studio:appearance';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['system', 'light', 'dark', 'wasteddesigner'].includes(value) ? value : 'system';
  // The WastedDesigner skin matches wasteddesigner.com: a dark base with its own colours and fonts.
  const SKIN_FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Orbitron:wght@600;700&display=swap';
  let preference = 'system';
  try { preference = valid(localStorage.getItem(key)); } catch (e) { /* use the system preference */ }

  function loadSkinFonts() {
    if (document.getElementById('skinFonts')) return;
    const link = document.createElement('link');
    link.id = 'skinFonts';
    link.rel = 'stylesheet';
    link.href = SKIN_FONTS;
    document.head.appendChild(link);
  }

  function apply() {
    const skin = preference === 'wasteddesigner';
    const mode = skin ? 'dark' : preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = mode;
    if (skin) { document.documentElement.dataset.skin = 'wasteddesigner'; loadSkinFonts(); }
    else delete document.documentElement.dataset.skin;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = skin ? '#060606' : mode === 'dark' ? '#1b1e24' : '#ffffff';
    const picker = document.getElementById('siteTheme');
    if (picker) picker.value = preference;
  }
  RS.siteTheme = {
    get preference() { return preference; },
    set(value) {
      preference = valid(value);
      try { localStorage.setItem(key, preference); } catch (e) { /* apply for this session */ }
      apply();
    },
  };
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', e => {
    if (e.key === key || e.key === null) { preference = valid(e.key === null ? null : e.newValue); apply(); }
  });
  apply();
})();
