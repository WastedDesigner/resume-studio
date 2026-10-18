/* Shared rich text and per-field formatting for the preview and exports. */
(function () {
  const RS = window.RS;
  RS.cleanFormats = function (source) {
    const result = {};
    if (!source || typeof source !== 'object') return result;
    for (const [key, value] of Object.entries(source)) {
      if (!value || typeof value !== 'object' || ['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      const f = {};
      if (['left', 'center', 'right', 'justify'].includes(value.align)) f.align = value.align;
      for (const flag of ['bold', 'italic', 'underline', 'strike']) if (value[flag] === true) f[flag] = true;
      if (Object.keys(f).length) result[key] = f;
    }
    return result;
  };
  RS.formatStyle = function (f = {}) {
    const css = [];
    if (['left', 'center', 'right', 'justify'].includes(f.align)) css.push(`text-align:${f.align}`);
    if (f.bold) css.push('font-weight:700');
    if (f.italic) css.push('font-style:italic');
    if (f.underline || f.strike) css.push(`text-decoration:${[f.underline && 'underline', f.strike && 'line-through'].filter(Boolean).join(' ')}`);
    return css.join(';');
  };
  RS.formatAttr = f => { const css = RS.formatStyle(f); return css ? ` style="${css}"` : ''; };
  RS.richRuns = function (text) {
    const output = [], state = {};
    const add = (t, url) => { if (t) output.push({ t, ...state, ...(url ? { url } : {}) }); };
    const source = String(text == null ? '' : text);
    const token = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*|\+\+|~~|\*/g;
    const flags = { '**': 'b', '*': 'i', '++': 'u', '~~': 's' };
    let last = 0, match;
    while ((match = token.exec(source))) {
      add(source.slice(last, match.index));
      if (match[1] != null) {
        const url = RS.safeUrl ? RS.safeUrl(match[2]) : '';
        for (const r of RS.richRuns(match[1])) output.push({ ...state, ...r, ...(url ? { url } : {}) });
      } else {
        const flag = flags[match[0]];
        if (state[flag]) delete state[flag];
        else if (source.indexOf(match[0], token.lastIndex) !== -1) state[flag] = true;
        else add(match[0]);
      }
      last = token.lastIndex;
    }
    add(source.slice(last));
    return output;
  };
  RS.entryFormats = function (type, item) {
    const keys = {
      experience: ['position', 'company', 'location'], education: ['degree', 'school', 'location'],
      projects: ['name', 'role', ''], volunteer: ['role', 'organisation', 'location'],
      awards: ['title', 'issuer', ''], publications: ['title', 'publisher', ''],
      certifications: ['name', 'issuer', 'credential'], references: ['name', 'role', 'contact'],
      custom: ['title', 'subtitle', 'location'],
    }[type] || ['title', 'subtitle', 'location'];
    const f = item.formats || {};
    return { title: f[keys[0]], sub: f[keys[1]], meta: f[keys[2]], date: f.date || f.start || f.end, desc: f.description, link: f.link };
  };
})();
