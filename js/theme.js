/* Apply the editor's appearance before styles load to avoid a light flash. */
(function () {
  'use strict';
  const RS = window.RS = window.RS || {};
  const key = 'resume-studio:appearance';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['system', 'light', 'dark'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = valid(localStorage.getItem(key)); } catch (e) { /* use the system preference */ }

  function apply() {
    const mode = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#1b1e24' : '#ffffff';
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
