/* Resume Studio: editor, storage, history, preview and export. */
(function () {
  'use strict';
  const RS = window.RS;
  const esc = RS.esc;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const MM = 96 / 25.4;
  const KEY = 'resume-studio:v1';
  const SKIP_PDF_TIP = 'resume-studio:skip-pdf-tip';

  /* ---------- Storage ---------- */
  let store = { current: null, docs: Object.create(null) };
  let doc = null;
  const ui = { tab: 'content', openSecs: new Set(), openItems: new Set(), basicsOpen: true, zoom: 'fit' };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  let recoveryText = lsGet(KEY + ':recovery') || '', recoveryStored = true;

  function makeDoc(sampleId, templateId, name) {
    const sample = RS.SAMPLES.find(s => s.id === sampleId) || RS.SAMPLES[0];
    const design = RS.applyTemplate(Object.assign({}, RS.DEFAULT_DESIGN), templateId || 'modern');
    return { id: RS.uid(), name: name || sample.name + ' resume', updated: Date.now(), isSample: sample.id !== 'blank', data: sample.make(), design };
  }

  function load() {
    const saved = lsGet(KEY);
    try {
      const raw = JSON.parse(saved || 'null');
      if (saved && (!raw || !raw.docs || typeof raw.docs !== 'object' || Array.isArray(raw.docs))) throw new Error('Invalid saved data');
      if (raw && raw.docs && typeof raw.docs === 'object' && !Array.isArray(raw.docs)) {
        for (const id of Object.keys(raw.docs)) {
          const d = sanitizeDoc(raw.docs[id]);
          if (d) { d.id = id; store.docs[id] = d; }
        }
        store.current = raw.current;
        store.lastBackup = +raw.lastBackup || 0;
      }
    } catch (e) {
      // Preserve unreadable data before the fresh document can overwrite it.
      recoveryText = saved || '';
      recoveryStored = !recoveryText || lsSet(KEY + ':recovery', recoveryText);
      toast('Saved data could not be read. Download the original data from Files to recover it.');
    }
    if (!Object.keys(store.docs).length) {
      const d = makeDoc('software', 'modern', 'My resume');
      store.docs[d.id] = d;
      store.current = d.id;
    }
    if (!Object.hasOwn(store.docs, store.current)) store.current = Object.keys(store.docs)[0];
    doc = store.docs[store.current];
  }

  let saveTimer = 0;
  function save(now) {
    clearTimeout(saveTimer);
    setSaveState('Saving…');
    doc.updated = Date.now();
    const run = () => {
      saveTimer = 0;
      if (!recoveryStored) { setSaveState('Not saved: download the original data from Files first'); return; }
      const ok = lsSet(KEY, JSON.stringify(store));
      setSaveState(ok ? 'Saved in this browser' : 'Not saved: storage full or blocked');
      if (!ok) toast('Could not save. Your browser storage may be full (large photos use space) or blocked.');
    };
    if (now) run(); else saveTimer = setTimeout(run, 400);
  }
  function setSaveState(t) { $('#saveState').textContent = t; }

  /* ---------- Validation for imported / stored data ---------- */
  const str = v => (v == null || typeof v === 'object' ? '' : String(v)).slice(0, 20000);
  const num = v => typeof v === 'number' || typeof v === 'string' ? Number(v) : NaN;
  const ENUMS = {
    columns: ['one', 'left', 'right'], sideStyle: ['filled', 'tint', 'plain', 'rule'],
    header: ['center', 'left', 'split', 'banner', 'banner-center', 'sidebar'],
    heading: ['line', 'bar', 'caps', 'block', 'underline', 'dot', 'boxed', 'plain', 'side', 'ribbon', 'double', 'bracket'],
    itemStyle: ['stacked', 'dates-left', 'timeline', 'cards', 'inline', 'bordered', 'ruled'],
    skillStyle: ['bars', 'dots', 'tags', 'list', 'grid', 'inline'],
    bullet: ['disc', 'dash', 'arrow', 'check', 'square', 'none'],
    contactStyle: ['icons', 'labels', 'plain', 'pipes'],
    photoShape: ['circle', 'rounded', 'square'], pageSize: ['A4', 'Letter', 'Legal'],
    dateAlign: ['right', 'before', 'accent'],
  };
  const LIMITS = {
    sideWidth: [22, 42], fontSize: [8, 13], lineHeight: [1.1, 1.8], nameSize: [1.5, 3.8],
    headingSize: [0.8, 1.6], sectionGap: [0.4, 2.6], itemGap: [0.2, 1.8], margin: [6, 25], photoSize: [16, 48],
  };
  function sanitizeDesign(src) {
    const d = Object.assign({}, RS.DEFAULT_DESIGN);
    if (!src || typeof src !== 'object') return d;
    for (const k of Object.keys(RS.DEFAULT_DESIGN)) {
      if (!(k in src)) continue;
      const def = RS.DEFAULT_DESIGN[k], v = src[k];
      if (ENUMS[k]) { if (ENUMS[k].includes(v)) d[k] = v; }
      else if (typeof def === 'number') {
        const n = num(v), limits = LIMITS[k];
        if (Number.isFinite(n)) d[k] = limits ? Math.max(limits[0], Math.min(limits[1], n)) : n;
      }
      else if (typeof def === 'boolean') d[k] = !!v;
      else d[k] = str(v);
    }
    RS.normHeader(d);
    if (!RS.THEMES.some(t => t.id === d.theme)) d.theme = RS.DEFAULT_DESIGN.theme;
    if (!RS.FONTS.some(f => f.name === d.fontHeading)) d.fontHeading = RS.DEFAULT_DESIGN.fontHeading;
    if (!RS.FONTS.some(f => f.name === d.fontBody)) d.fontBody = RS.DEFAULT_DESIGN.fontBody;
    for (const k of ['accent', 'sideColor']) if (d[k] && !/^#[0-9a-f]{6}$/i.test(d[k])) d[k] = '';
    return d;
  }
  function sanitizeDoc(src) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return null;
    const data = src.data && typeof src.data === 'object' ? src.data : src; // also accept bare {basics, sections}
    const bs = data.basics && typeof data.basics === 'object' ? data.basics : {};
    const basics = {};
    for (const k of ['name', 'title', 'email', 'phone', 'location', 'website', 'linkedin', 'github']) basics[k] = str(bs[k]);
    basics.formats = RS.cleanFormats(bs.formats);
    basics.photo = typeof bs.photo === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(bs.photo) ? bs.photo : '';
    basics.links = Array.isArray(bs.links) ? bs.links.slice(0, 20).map(l => ({ label: str(l && l.label), url: str(l && l.url), formats: RS.cleanFormats(l && l.formats) })) : [];
    const ids = new Set();
    const uniqueId = value => {
      let id = str(value);
      if (!/^[a-z0-9_-]{1,80}$/i.test(id) || ids.has(id)) id = RS.uid();
      ids.add(id);
      return id;
    };
    const sections = (Array.isArray(data.sections) ? data.sections : []).slice(0, 60).map(s => {
      if (!s || typeof s !== 'object') return null;
      const type = typeof s.type === 'string' && Object.hasOwn(RS.SECTION_TYPES, s.type) ? s.type : 'custom';
      const def = RS.SECTION_TYPES[type];
      const out = { id: uniqueId(s.id), type, title: str(s.title) || def.name, visible: s.visible !== false, pageBreak: !!s.pageBreak, col: s.col === 'side' || s.col === 'main' ? s.col : def.col, items: [] };
      out.formats = RS.cleanFormats(s.formats);
      if (type === 'text') out.content = str(s.content);
      else out.items = (Array.isArray(s.items) ? s.items : []).slice(0, 100).map(i => {
        const item = { id: uniqueId(i && i.id), hidden: !!(i && i.hidden), pageBreak: !!(i && i.pageBreak) };
        item.formats = RS.cleanFormats(i && i.formats);
        for (const f of def.fields) {
          const v = i && i[f.key];
          item[f.key] = f.type === 'level' ? Math.max(0, Math.min(5, Math.round(num(v) || 0))) : f.type === 'check' ? !!v : str(v);
        }
        return item;
      });
      return out;
    }).filter(Boolean);
    const updated = num(src.updated);
    return { id: str(src.id) || RS.uid(), name: (str(src.name) || (basics.name ? basics.name + ' resume' : 'Imported resume')).slice(0, 80), updated: Number.isFinite(updated) && updated > 0 && updated <= 8.64e15 ? updated : Date.now(), isSample: !!src.isSample, data: { basics, sections }, design: sanitizeDesign(src.design) };
  }

  /* ---------- History ---------- */
  const hist = { stack: [], pos: -1 };
  const snap = () => JSON.stringify({ data: doc.data, design: doc.design, isSample: doc.isSample });
  function histReset() { clearTimeout(histTimer); hist.stack = [snap()]; hist.pos = 0; updateUndo(); }
  let histTimer = 0;
  function histCommit(immediate) {
    clearTimeout(histTimer);
    const run = () => {
      const s = snap();
      if (hist.stack[hist.pos] === s) return;
      hist.stack = hist.stack.slice(0, hist.pos + 1);
      hist.stack.push(s);
      if (hist.stack.length > 120) hist.stack.shift();
      hist.pos = hist.stack.length - 1;
      updateUndo();
    };
    if (immediate) run(); else histTimer = setTimeout(run, 450);
  }
  function histGo(delta) {
    histCommit(true);
    const p = hist.pos + delta;
    if (p < 0 || p >= hist.stack.length) return;
    hist.pos = p;
    const s = JSON.parse(hist.stack[p]);
    doc.data = s.data; doc.design = s.design; doc.isSample = s.isSample;
    changed({ rebuild: true, history: false });
    updateUndo();
  }
  function updateUndo() {
    $('#btnUndo').disabled = hist.pos <= 0;
    $('#btnRedo').disabled = hist.pos >= hist.stack.length - 1;
  }

  /* ---------- Change pipeline ---------- */
  function changed(opts) {
    opts = opts || {};
    if (opts.rebuild) buildPanels();
    else if (opts.design) { if (ui.tab === 'design') buildDesign(); if (ui.tab === 'templates') markTemplate(); }
    schedulePreview();
    if (opts.history !== false) histCommit(opts.immediate);
    save();
  }

  /* ---------- Paths ---------- */
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, path, val) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj);
    target[last] = val;
  }

  /* ---------- Preview ---------- */
  let previewQueued = false;
  function schedulePreview() {
    if (previewQueued) return;
    previewQueued = true;
    requestAnimationFrame(() => { previewQueued = false; renderPreview(); });
  }
  function pageDims() {
    const [w, h] = RS.PAGE[doc.design.pageSize] || RS.PAGE.A4;
    return { w: w * MM, h: h * MM, m: (+doc.design.margin || 14) * MM };
  }
  const watchedFonts = new Set();
  function renderPreview() {
    const d = doc.design;
    new Set(RS.docFonts(doc)).forEach(f => {
      if (watchedFonts.has(f)) return;
      watchedFonts.add(f);
      RS.loadFont(f).then(schedulePreviewMeasure);
    });
    $('#customCss').textContent = scopeCss(d.customCss);
    const scale = $('#pageScale');
    scale.innerHTML = RS.render(doc);
    document.title = (doc.data.basics.name ? doc.data.basics.name + ' – Resume' : 'Resume Studio');
    measure();
  }
  let measureQueued = false;
  function schedulePreviewMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => { measureQueued = false; measure(); });
  }
  function measure() {
    const scale = $('#pageScale');
    const page = scale.firstElementChild;
    if (!page) return;
    // The mobile editor hides the stage. Its zero-sized layout cannot be used
    // for pagination; measure when the user opens Preview instead.
    if (!page.getClientRects().length) { ui.pages = null; updateCheck(); return; }
    const { w, h, m } = pageDims();
    page.style.minHeight = '0px';
    $$('.guide', scale).forEach(g => g.remove());
    const first = h - m, rest = Math.max(50, h - 2 * m);
    // Page p (1-based) starts at this height in the continuous preview.
    const pageTop = p => (p <= 1 ? 0 : first + (p - 2) * rest);
    const pageOf = y => (y < first ? 1 : 2 + Math.floor((y - first) / rest));
    // Manual page breaks: push each one down to the top of the next page, as print will.
    const zoom = page.getBoundingClientRect().height / (page.offsetHeight || 1) || 1;
    const manual = {};
    for (const el of $$('.rs-break', page)) {
      const cs = getComputedStyle(el);
      const oldMargin = parseFloat(cs.marginTop) || 0;
      const y = (el.getBoundingClientRect().top - page.getBoundingClientRect().top) / zoom;
      const p = pageOf(y - oldMargin - 1) + 1;
      el.style.marginTop = Math.max(0, oldMargin + (pageTop(p) - y)) + 'px';
      manual[p] = el.dataset.sec ? { kind: 'sec', id: el.dataset.sec } : { kind: 'item', id: el.dataset.item };
    }
    const contentH = page.scrollHeight - m; // the body's bottom padding becomes the last page's margin
    let pages = 1;
    if (contentH > first + 2) pages = 1 + Math.ceil((contentH - first - 2) / rest);
    Object.keys(manual).forEach(p => (pages = Math.max(pages, +p)));
    page.style.minHeight = (first + (pages - 1) * rest + m) + 'px';
    if (doc.design.showGuides || Object.keys(manual).length) {
      for (let p = 2; p <= pages; p++) {
        if (!doc.design.showGuides && !manual[p]) continue;
        const g = document.createElement('div');
        g.className = 'guide' + (manual[p] ? ' manual' : '');
        g.style.top = pageTop(p) + 'px';
        g.innerHTML = manual[p]
          ? `<span>Page ${p} · new page <button data-act="removeBreak" data-kind="${manual[p].kind}" data-id="${esc(manual[p].id)}" title="Remove this page break" aria-label="Remove page break before page ${p}">×</button></span>`
          : `<span>Page ${p}</span>`;
        scale.appendChild(g);
      }
    }
    const words = (page.innerText.match(/[\p{L}\p{N}][\p{L}\p{N}'’.\-]*/gu) || []).length;
    const info = $('#pageInfo');
    info.textContent = `${pages} page${pages > 1 ? 's' : ''} · ${doc.design.pageSize} · ${words} words`;
    info.classList.toggle('warn', pages > 2);
    info.title = pages > 2 ? 'Most resumes are one or two pages. Try a smaller font, less spacing or a compact template.' : '';
    ui.pages = pages;
    updateCheck();
    fitZoom();
  }
  function fitZoom() {
    const scroll = $('#stageScroll'), frame = $('#pageFrame'), scale = $('#pageScale');
    const page = scale.firstElementChild;
    if (!page) return;
    const pw = page.offsetWidth, ph = page.offsetHeight;
    const avail = scroll.clientWidth - (window.innerWidth <= 900 ? 32 : 56);
    let z = ui.zoom === 'fit' ? Math.min(1.25, avail / pw) : ui.zoom;
    z = Math.max(0.2, z);
    scale.style.transform = `scale(${z})`;
    frame.style.width = pw * z + 'px';
    frame.style.height = ph * z + 'px';
    $('#zoomVal').textContent = ui.zoom === 'fit' ? 'Fit' : Math.round(z * 100) + '%';
    ui.lastZoom = z;
  }
  // Custom CSS only reaches the resume, never the editor.
  let scopedSource = null, scopedResult = '';
  function scopeCss(css) {
    css = String(css || '').replace(/<\/?style/gi, '');
    if (css === scopedSource) return scopedResult;
    if (!css.trim()) return '';
    // Parse instead of splitting selectors: commas inside :is() and nested @media
    // must stay intact. Discard global at-rules such as @import and @page.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const scope = ':is(#pageScale, #printRoot)';
    // Split only top-level commas; CSS selectors may contain quoted commas and
    // nested functions. Keep pseudo-elements outside :is(), where they are valid.
    const selectors = text => {
      const out = [];
      let start = 0, depth = 0, quote = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '\\') { i++; continue; }
        if (quote) { if (ch === quote) quote = ''; continue; }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (ch === ',' && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1; }
      }
      out.push(text.slice(start).trim());
      return out;
    };
    const rules = list => Array.from(list).map(rule => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const scoped = selectors(rule.selectorText).flatMap(s => {
          const root = /^[.#[:]/.test(s) ? `.rs${s}` : s.startsWith('*') ? `.rs${s.slice(1)}` : '';
          return [root && `${scope} ${root}`, `${scope} .rs ${s}`].filter(Boolean);
        });
        return `${scoped.join(', ')} { ${rule.style.cssText} }`;
      }
      if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) {
        return `${rule.cssText.slice(0, rule.cssText.indexOf('{'))}{ ${rules(rule.cssRules)} }`;
      }
      return '';
    }).join('\n');
    scopedSource = css;
    scopedResult = rules(sheet.cssRules);
    return scopedResult;
  }

  /* ---------- Panels ---------- */
  function buildPanels() {
    $('#docName').value = doc.name;
    if (ui.tab === 'content') buildContent();
    if (ui.tab === 'design') buildDesign();
    if (ui.tab === 'templates') buildTemplates();
    if (ui.tab === 'files') buildFiles();
    if (ui.tab === 'check') buildCheck();
    $('#guidesToggle').checked = !!doc.design.showGuides;
  }

  const CHEV = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16"><path d="m9 6 6 6-6 6"/></svg>';
  const IC = {
    up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.2 6.3C3.6 8 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    page: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v4M6 3v8M4 14h16M6 17v4h12v-4"/><path d="M14 3v4h4"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  };
  const field = (label, path, value, opts) => {
    opts = opts || {};
    const id = 'f_' + path.replace(/\W/g, '_');
    const hint = opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : '';
    if (opts.type === 'textarea') return `<label class="field full" for="${id}"><span>${esc(label)}</span><textarea id="${id}" data-path="${esc(path)}" rows="${opts.rows || 4}" placeholder="${esc(opts.placeholder || '')}">${esc(value)}</textarea>${hint}</label>`;
    if (opts.type === 'check') return `<label class="check-field full" for="${id}"><input id="${id}" type="checkbox" data-path="${esc(path)}" ${value ? 'checked' : ''}> ${esc(label)}</label>`;
    if (opts.type === 'level') {
      const v = Math.max(0, Math.min(5, +value || 0));
      return `<label class="field ${opts.half ? '' : 'full'}" for="${id}"><span>${esc(label)}</span><div class="level"><input id="${id}" type="range" min="0" max="5" step="1" value="${v}" data-path="${esc(path)}" data-num="1"><output>${levelText(v)}</output></div></label>`;
    }
    return `<label class="field ${opts.half ? '' : 'full'}" for="${id}"><span>${esc(label)}</span><input id="${id}" type="${opts.type === 'url' ? 'text' : (opts.inputType || 'text')}" value="${esc(value)}" data-path="${esc(path)}" placeholder="${esc(opts.placeholder || '')}" ${opts.inputType === 'email' ? 'autocomplete="email"' : ''}>${hint}</label>`;
  };
  const levelText = v => ['Not shown', 'Beginner', 'Basic', 'Good', 'Very good', 'Expert'][v] || '';

  function buildContent() {
    ui.textPath = '';
    const b = doc.data.basics;
    const two = doc.design.columns !== 'one';
    const photo = b.photo ? `<img src="${esc(b.photo)}" alt="">` : IC.user;
    let html = `<div class="text-tools" id="textTools" role="toolbar" aria-label="Text formatting"><div class="text-tools-label" id="textTarget">Click a text field to format it</div><div class="text-tools-row">
      ${[['bold', '<b>B</b>', 'Bold'], ['italic', '<i>I</i>', 'Italic'], ['underline', '<u>U</u>', 'Underline'], ['strike', '<s>S</s>', 'Strikethrough']].map(([key, label, title]) => `<button type="button" class="text-tool" data-act="textStyle" data-key="${key}" aria-label="${title}" title="${title}" aria-pressed="false" disabled>${label}</button>`).join('')}
      <span class="tool-divider"></span>
      ${[['left', 'M3 4h14M3 8h9M3 12h14M3 16h9', 'Align left'], ['center', 'M3 4h14M6 8h8M3 12h14M6 16h8', 'Align centre'], ['right', 'M3 4h14M8 8h9M3 12h14M8 16h9', 'Align right'], ['justify', 'M3 4h14M3 8h14M3 12h14M3 16h14', 'Justify']].map(([key, path, title]) => `<button type="button" class="text-tool" data-act="textAlign" data-key="${key}" aria-label="${title}" title="${title}" aria-pressed="false" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="${path}"/></svg></button>`).join('')}
      <button type="button" class="text-tool" data-act="textClear" aria-label="Clear text formatting" title="Clear text formatting" disabled>Tx</button>
    </div><small>Select words in a text area to style them, or format the whole field.</small></div>`;
    html += doc.isSample ? `<div class="notice"><p><b>This is an example resume.</b> Edit it, or clear it and start with your own details.</p><button class="btn small" data-act="startBlank">Start blank</button></div>` : '';
    html += `<div class="card"><div class="card-head"><h3>Personal details</h3><button class="icon-btn" data-act="toggleBasics" aria-label="Show or hide">${ui.basicsOpen ? IC.up : IC.down}</button></div>`;
    if (ui.basicsOpen) {
      html += `<div class="card-body">
        <div class="photo-row"><div class="photo-prev">${photo}</div>
          <div class="btn-col" style="flex-direction:row;flex-wrap:wrap">
            <label class="btn small">Upload photo<input type="file" accept="image/*" id="photoInput" hidden></label>
            ${b.photo ? '<button class="btn small" data-act="removePhoto">Remove</button>' : ''}
          </div></div>
        <div class="grid2">
          ${field('Full name', 'basics.name', b.name)}
          ${field('Job title', 'basics.title', b.title)}
          ${field('Email', 'basics.email', b.email, { half: true, inputType: 'email' })}
          ${field('Phone', 'basics.phone', b.phone, { half: true, inputType: 'tel' })}
          ${field('Location', 'basics.location', b.location, { half: true })}
          ${field('Website', 'basics.website', b.website, { half: true })}
          ${field('LinkedIn', 'basics.linkedin', b.linkedin, { half: true })}
          ${field('GitHub', 'basics.github', b.github, { half: true })}
        </div>
        <div class="links-list">${(b.links || []).map((l, i) => `<div class="link-row">
            <input class="input" placeholder="Label" aria-label="Link label" value="${esc(l.label)}" data-path="basics.links.${i}.label">
            <input class="input" placeholder="URL" aria-label="Link URL" value="${esc(l.url)}" data-path="basics.links.${i}.url">
            <button class="icon-btn" data-act="delLink" data-i="${i}" aria-label="Remove link">${IC.trash}</button></div>`).join('')}
          <button class="btn small dashed" data-act="addLink">${IC.plus} Add another link</button>
        </div></div>`;
    }
    html += '</div>';

    doc.data.sections.forEach((s, si) => {
      const t = RS.SECTION_TYPES[s.type];
      const open = ui.openSecs.has(s.id);
      html += `<div class="sec ${open ? 'open' : ''} ${s.visible === false ? 'hidden-sec' : ''}" data-si="${si}">
        <div class="sec-head">
          <button class="icon-btn" data-act="toggleSec" data-id="${esc(s.id)}" aria-label="${open ? 'Collapse' : 'Expand'} section" aria-expanded="${open}">${CHEV}</button>
          <input class="sec-title" value="${esc(s.title)}" data-path="sections.${si}.title" aria-label="Section title (${esc(t.name)})" title="${esc(t.name)} section">
          ${two ? `<button class="col-btn" data-act="secCol" data-si="${si}" title="Move between main column and sidebar">${s.col === 'side' ? 'Sidebar' : 'Main'}</button>` : ''}
          <button class="icon-btn ${s.pageBreak ? 'on' : ''}" data-act="secBreak" data-si="${si}" title="${s.pageBreak ? 'Starts on a new page (click to undo)' : 'Start this section on a new page'}" aria-label="Start on a new page" aria-pressed="${!!s.pageBreak}">${IC.page}</button>
          <button class="icon-btn" data-act="secVis" data-si="${si}" title="${s.visible === false ? 'Show' : 'Hide'} section" aria-label="${s.visible === false ? 'Show' : 'Hide'} section">${s.visible === false ? IC.eyeOff : IC.eye}</button>
          <button class="icon-btn" data-act="secMove" data-si="${si}" data-d="-1" aria-label="Move section up" ${si === 0 ? 'disabled' : ''}>${IC.up}</button>
          <button class="icon-btn" data-act="secMove" data-si="${si}" data-d="1" aria-label="Move section down" ${si === doc.data.sections.length - 1 ? 'disabled' : ''}>${IC.down}</button>
          <button class="icon-btn" data-act="secDel" data-si="${si}" aria-label="Delete section">${IC.trash}</button>
        </div>`;
      if (open) {
        html += '<div class="sec-body">';
        if (s.type === 'text') {
          html += field('Text', `sections.${si}.content`, s.content, { type: 'textarea', rows: 5, hint: 'Start a line with "- " for a bullet. **bold**, *italic*, [link](url).' });
        } else {
          s.items.forEach((it, ii) => {
            const iopen = ui.openItems.has(it.id);
            const label = (t.label && t.label(it)) || 'Untitled';
            html += `<div class="item ${iopen ? 'open' : ''} ${it.hidden ? 'hidden-item' : ''}" data-ii="${ii}">
              <div class="item-head">
                <button class="item-toggle" data-act="toggleItem" data-id="${esc(it.id)}" aria-expanded="${iopen}">${CHEV}<span class="item-label">${esc(label)}</span>${it.hidden ? '<span class="badge">Hidden</span>' : ''}</button>
                <div class="item-tools">
                  <button class="icon-btn" data-act="itemMove" data-si="${si}" data-ii="${ii}" data-d="-1" aria-label="Move up" ${ii === 0 ? 'disabled' : ''}>${IC.up}</button>
                  <button class="icon-btn" data-act="itemMove" data-si="${si}" data-ii="${ii}" data-d="1" aria-label="Move down" ${ii === s.items.length - 1 ? 'disabled' : ''}>${IC.down}</button>
                  <button class="icon-btn" data-act="itemHide" data-si="${si}" data-ii="${ii}" title="${it.hidden ? 'Show on resume' : 'Hide from resume'}" aria-label="${it.hidden ? 'Show entry' : 'Hide entry'}">${it.hidden ? IC.eyeOff : IC.eye}</button>
                  <button class="icon-btn" data-act="itemDup" data-si="${si}" data-ii="${ii}" aria-label="Duplicate">${IC.copy}</button>
                  <button class="icon-btn" data-act="itemDel" data-si="${si}" data-ii="${ii}" aria-label="Delete">${IC.trash}</button>
                </div>
              </div>`;
            if (iopen) {
              html += `<div class="item-body grid2">${t.fields.map(f => field(f.label, `sections.${si}.items.${ii}.${f.key}`, it[f.key], f)).join('')}${field('Start this entry on a new page', `sections.${si}.items.${ii}.pageBreak`, it.pageBreak, { type: 'check' })}</div>`;
            }
            html += '</div>';
          });
          html += `<button class="btn small dashed block" data-act="itemAdd" data-si="${si}">${IC.plus} Add ${esc(t.name.toLowerCase())} entry</button>`;
        }
        html += '</div>';
      }
      html += '</div>';
    });

    html += `<div class="group-title">Add a section</div>
      <div class="add-row"><select class="input" id="newSecType" aria-label="Section type">${Object.entries(RS.SECTION_TYPES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join('')}</select>
      <button class="btn primary" data-act="secAdd">${IC.plus} Add</button></div>
      <p class="md-help">Tip: hide a section with the eye button to keep it for later without printing it.</p>`;
    const pane = $('#tab-content');
    const st = pane.scrollTop;
    pane.innerHTML = html;
    pane.scrollTop = st;
  }

  /* ---------- Design tab ---------- */
  const SELECTS = {
    sideStyle: [['filled', 'Filled colour'], ['tint', 'Light tint'], ['plain', 'Plain'], ['rule', 'Divider line']],
    header: [['center', 'Centered'], ['left', 'Left aligned'], ['split', 'Split (contact right)'], ['sidebar', 'In the sidebar']],
    heading: [['line', 'Underline rule'], ['bar', 'Accent bar'], ['caps', 'Small caps + dash'], ['block', 'Filled label'], ['underline', 'Short underline'], ['dot', 'Dot'], ['boxed', 'Boxed'], ['plain', 'Plain'], ['side', 'Side gutter'], ['ribbon', 'Soft ribbon'], ['double', 'Double rule'], ['bracket', 'Brackets']],
    itemStyle: [['stacked', 'Standard'], ['dates-left', 'Dates in left column'], ['timeline', 'Timeline'], ['cards', 'Cards'], ['inline', 'Compact one-line'], ['bordered', 'Outlined cards'], ['ruled', 'Fine dividers']],
    dateAlign: [['right', 'Right aligned'], ['accent', 'Right, accent colour'], ['before', 'Before the title']],
    skillStyle: [['bars', 'Bars'], ['dots', 'Dots'], ['tags', 'Tags'], ['list', 'List'], ['grid', 'Two-column list'], ['inline', 'Inline text']],
    bullet: [['disc', '• Dot'], ['dash', '– Dash'], ['arrow', '▸ Arrow'], ['check', '✓ Tick'], ['square', '▪ Square'], ['none', 'None']],
    contactStyle: [['icons', 'Icons'], ['labels', 'Labels'], ['plain', 'Plain'], ['pipes', 'Separated by |']],
    photoShape: [['circle', 'Circle'], ['rounded', 'Rounded'], ['square', 'Square']],
    pageSize: [['A4', 'A4 (210 × 297 mm)'], ['Letter', 'US Letter (8.5 × 11 in)'], ['Legal', 'US Legal (8.5 × 14 in)']],
  };
  const sel = (key, label) => `<div class="ctrl"><label for="d_${key}">${label}</label><select class="input" id="d_${key}" data-design="${key}">${SELECTS[key].map(([v, t]) => `<option value="${v}" ${doc.design[key] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const rng = (key, label, min, max, step, unit) => `<div class="ctrl"><label for="d_${key}">${label}</label><div class="range"><input type="range" id="d_${key}" data-design="${key}" data-num="1" min="${min}" max="${max}" step="${step}" value="${doc.design[key]}"><output>${fmt(doc.design[key], unit)}</output></div></div>`;
  const fmt = (v, unit) => (unit === '%' ? Math.round(v) : +(+v).toFixed(2)) + (unit || '');
  const tog = (key, label) => `<div class="ctrl"><label for="d_${key}">${label}</label><label class="switch"><input type="checkbox" id="d_${key}" data-design="${key}" ${doc.design[key] ? 'checked' : ''}><span></span></label></div>`;
  const fontSel = (key, label) => {
    const cats = {};
    RS.FONTS.forEach(f => (cats[f.cat] = cats[f.cat] || []).push(f.name));
    return `<div class="ctrl"><label for="d_${key}">${label}</label><select class="input" id="d_${key}" data-design="${key}">${Object.entries(cats).map(([c, names]) => `<optgroup label="${c}">${names.map(n => `<option ${doc.design[key] === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
  };

  // Small schematic for each layout card.
  function layoutIcon(l) {
    const s = l.set, r = [];
    const side = s.columns !== 'one', left = s.columns === 'left';
    const banner = !!s.headerBanner;
    if (banner) r.push('<i class="a" style="left:0;top:0;right:0;height:14px;border-radius:0"></i>');
    if (side && (s.sideStyle === 'filled' || s.sideStyle === 'tint' || !s.sideStyle)) r.push(`<i class="a" style="${left ? 'left:0' : 'right:0'};top:${banner ? 14 : 0}px;bottom:0;width:30%;border-radius:0;opacity:${s.sideStyle === 'tint' ? .3 : .75}"></i>`);
    const mx = side ? (left ? 36 : 6) : 8, mw = side ? 56 : 84;
    const top = banner ? 20 : (s.header === 'sidebar' && side ? 6 : 16);
    if (!banner && !(s.header === 'sidebar' && side)) r.push(`<i style="left:${s.header === 'center' ? 30 : mx}%;top:5px;width:40%;height:6px"></i>`);
    for (let k = 0; k < 5; k++) {
      const x = s.heading === 'side' ? mx + 20 : (s.itemStyle === 'dates-left' ? mx + 16 : mx);
      const w = s.heading === 'side' ? mw - 20 : (s.itemStyle === 'dates-left' ? mw - 16 : mw);
      r.push(`<i style="left:${x}%;top:${top + k * 7}px;width:${w * (k % 2 ? .8 : 1)}%;height:3px"></i>`);
    }
    if (side && (s.sideStyle === 'plain' || s.sideStyle === 'rule')) {
      const sx = left ? 6 : 70;
      for (let k = 0; k < 4; k++) r.push(`<i style="left:${sx}%;top:${top + k * 7}px;width:${k % 2 ? 16 : 22}%;height:3px"></i>`);
      if (s.sideStyle === 'rule') r.push(`<i style="left:${left ? 31 : 66}%;top:${top}px;width:1px;height:30px"></i>`);
    }
    if (s.itemStyle === 'timeline') r.push(`<i class="a" style="left:${mx - 3}%;top:${top}px;width:2px;height:32px"></i>`);
    return `<div class="layout-ico">${r.join('')}</div>`;
  }

  function buildDesign() {
    const d = doc.design;
    const c = RS.colors(d);
    let html = '<div class="group-title">Layout</div><div class="choice-grid">';
    html += RS.LAYOUTS.map(l => `<button class="choice ${d.layout === l.id ? 'on' : ''}" data-act="layout" data-id="${l.id}">${layoutIcon(l)}${esc(l.name)}<small>${esc(l.desc)}</small></button>`).join('');
    html += '</div><div class="group-title">Colour theme</div><div class="swatches">';
    html += RS.THEMES.map(t => `<button class="swatch ${d.theme === t.id ? 'on' : ''}" data-act="theme" data-id="${t.id}" title="${esc(t.name)}" aria-label="${esc(t.name)} theme"><span style="background:${t.accent}"></span><span style="background:${t.side}"></span></button>`).join('');
    html += `</div><div class="color-row">
      <label class="color-pick">Accent <input type="color" data-design="accent" value="${c.accent}"></label>
      <label class="color-pick">Sidebar / banner <input type="color" data-design="sideColor" value="${c.side}"></label>
      ${d.accent || d.sideColor ? '<button class="btn small" data-act="resetColors">Use theme colours</button>' : ''}
    </div>`;

    html += '<div class="group-title">Typography</div>';
    html += `<div class="ctrl"><label for="pairing">Font pairing</label><select class="input" id="pairing" data-act-change="pairing"><option value="">Choose a pairing…</option>${RS.PAIRINGS.map(([h, bd], i) => `<option value="${i}" ${d.fontHeading === h && d.fontBody === bd ? 'selected' : ''}>${esc(h === bd ? h : h + ' + ' + bd)}</option>`).join('')}</select></div>`;
    html += fontSel('fontHeading', 'Heading font') + fontSel('fontBody', 'Body font');
    html += rng('fontSize', 'Text size', 8, 13, 0.25, 'pt') + rng('lineHeight', 'Line spacing', 1.1, 1.8, 0.05, '') + rng('nameSize', 'Name size', 1.5, 3.8, 0.1, '×') + rng('headingSize', 'Heading size', 0.8, 1.6, 0.05, '×');
    html += tog('upperHeadings', 'Uppercase headings') + tog('upperName', 'Uppercase name') + tog('boldName', 'Bold name');

    html += '<div class="group-title">Structure</div>';
    html += `<div class="ctrl"><label>Columns</label><div class="seg">${[['one', 'One'], ['left', 'Sidebar left'], ['right', 'Sidebar right']].map(([v, t]) => `<button data-act="columns" data-v="${v}" class="${d.columns === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    if (d.columns !== 'one') html += rng('sideWidth', 'Sidebar width', 22, 42, 1, '%') + sel('sideStyle', 'Sidebar style');
    html += sel('header', 'Header');
    if (!(d.columns !== 'one' && d.header === 'sidebar')) html += tog('headerBanner', 'Colour banner');
    html += sel('heading', 'Section titles') + sel('itemStyle', 'Entries') + sel('dateAlign', 'Dates') + sel('skillStyle', 'Skills') + sel('bullet', 'Bullets') + sel('contactStyle', 'Contact details');

    html += '<div class="group-title">Page & spacing</div>';
    html += sel('pageSize', 'Paper size') + rng('margin', 'Page margins', 6, 25, 1, 'mm') + rng('sectionGap', 'Section spacing', 0.4, 2.6, 0.1, 'em') + rng('itemGap', 'Entry spacing', 0.2, 1.8, 0.05, 'em');
    html += tog('justify', 'Justify text') + tog('hyphenate', 'Hyphenate justified text');
    html += '<p class="md-help">Turn hyphenation off to keep words together when justifying text. Hyphens you type are kept.</p>';
    html += tog('showGuides', 'Show page breaks');

    html += '<div class="group-title">Photo</div>';
    html += tog('showPhoto', 'Show photo') + sel('photoShape', 'Shape') + rng('photoSize', 'Size', 16, 48, 1, 'mm');
    html += '<p class="md-help">Upload your photo in Content → Personal details. Many employers in the US, UK and Australia prefer resumes without photos.</p>';

    html += `<div class="group-title">Custom CSS</div>
      <label class="field"><textarea class="code" data-design="customCss" spellcheck="false" placeholder=".rs-name { letter-spacing: .05em; }&#10;.rs-h { color: #0a7; }">${esc(d.customCss)}</textarea><span class="hint">For advanced tweaks. Rules only apply to the resume. Classes start with .rs-</span></label>
      <button class="btn small danger" data-act="resetDesign" style="margin-top:12px">Reset design to template</button>`;

    const pane = $('#tab-design');
    const st = pane.scrollTop;
    pane.innerHTML = html;
    pane.scrollTop = st;
  }

  /* ---------- Templates tab ---------- */
  function buildTemplates() {
    const d = doc.design;
    let html = `<div class="group-title">${RS.TEMPLATES.length} templates</div><p class="muted small" style="margin:-4px 2px 10px">Pick a look. Your content stays the same; you can fine-tune everything in Design.</p><div class="tpl-grid">`;
    html += RS.TEMPLATES.map(t => `<button class="tpl ${d.template === t.id ? 'on' : ''}" data-act="template" data-id="${t.id}"><div class="thumb" data-tpl="${t.id}"></div><div class="tpl-name">${esc(t.name)}</div><small class="tpl-desc">${esc(t.desc || (RS.LAYOUTS.find(l => l.id === t.set.layout) || {}).desc || '')}</small></button>`).join('');
    html += '</div><div class="group-title">Sample content</div><p class="muted small" style="margin:-4px 2px 10px">Start from an example resume for your field. This replaces the content of the current resume (your design is kept), so make a new resume in Files first if you want to keep this one.</p><div class="sample-list">';
    html += RS.SAMPLES.map(s => `<div class="sample"><span>${esc(s.name)}</span><button class="btn small" data-act="sample" data-id="${s.id}">Use</button></div>`).join('');
    html += '</div>';
    $('#tab-templates').innerHTML = html;
    renderThumbs();
  }
  function markTemplate() {
    $$('#tab-templates .tpl').forEach(b => b.classList.toggle('on', b.dataset.id === doc.design.template));
  }
  let thumbObserver = null;
  function renderThumbs() {
    const boxes = $$('#tab-templates .thumb');
    if (!boxes.length) return;
    const draw = box => {
      const t = RS.TEMPLATES.find(x => x.id === box.dataset.tpl);
      const design = RS.applyTemplate(Object.assign({}, doc.design), t.id);
      design.showGuides = false; design.customCss = '';
      RS.docFonts({ design }).forEach(f => RS.loadFont(f));
      const [pw, ph] = RS.PAGE[design.pageSize] || RS.PAGE.A4;
      const w = box.clientWidth || 180;
      const z = w / (pw * MM);
      box.style.height = Math.round(ph * MM * z) + 'px';
      box.innerHTML = `<div class="thumb-in" style="transform:scale(${z})">${RS.render({ data: doc.data, design })}</div>`;
      box.dataset.drawn = '1';
    };
    if (thumbObserver) thumbObserver.disconnect();
    if ('IntersectionObserver' in window) {
      thumbObserver = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting && !e.target.dataset.drawn) draw(e.target); }), { root: $('#tab-templates'), rootMargin: '300px' });
      boxes.forEach(b => {
        const [pw, ph] = RS.PAGE[doc.design.pageSize] || RS.PAGE.A4;
        b.style.height = Math.round((b.clientWidth || 180) * ph / pw) + 'px';
        thumbObserver.observe(b);
      });
    } else boxes.forEach(draw);
  }

  /* ---------- Files tab ---------- */
  function buildFiles() {
    const docs = Object.values(store.docs).sort((a, b) => b.updated - a.updated);
    let html = recoveryText ? `<div class="notice"><p>Unreadable saved data was preserved. Download it before recovering your resumes from a backup.</p><button class="btn small" data-act="exportRecovery">Download original data</button></div>` : '';
    html += `<div class="group-title">My resumes</div><div class="doc-list">`;
    html += docs.map(x => `<div class="doc-row ${x.id === doc.id ? 'on' : ''}">
        <button class="doc-open" data-act="docOpen" data-id="${esc(x.id)}"><b>${esc(x.name)}</b><small>Edited ${esc(new Date(x.updated).toLocaleString())}</small></button>
        <button class="icon-btn" data-act="docRename" data-id="${esc(x.id)}" title="Rename" aria-label="Rename"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
        <button class="icon-btn" data-act="docDup" data-id="${esc(x.id)}" title="Duplicate" aria-label="Duplicate">${IC.copy}</button>
        <button class="icon-btn" data-act="docDel" data-id="${esc(x.id)}" title="Delete" aria-label="Delete">${IC.trash}</button>
      </div>`).join('');
    html += `</div>
      <div class="add-row" style="margin-top:10px"><select class="input" id="newDocSample" aria-label="Start from">${RS.SAMPLES.map(s => `<option value="${s.id}" ${s.id === 'blank' ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
      <button class="btn primary" data-act="docNew">${IC.plus} New resume</button></div>

      <div class="group-title">Download this resume</div>
      <button class="btn primary block" data-act="pdf">PDF</button>
      <div class="export-grid">
        <button class="btn" data-act="exportDocx">Word (.docx)</button>
        <button class="btn" data-act="exportHtml">Web page (.html)</button>
        <button class="btn" data-act="exportTxt">Plain text (.txt)</button>
        <button class="btn" data-act="exportMd">Markdown (.md)</button>
        <button class="btn" data-act="exportJsonResume">JSON Resume</button>
        <button class="btn" data-act="copyTxt">Copy plain text</button>
      </div>
      <p class="md-help">Plain text suits online application forms. Word export keeps your layout and text editable. Install the selected fonts in Word for the closest match; pagination and decorative details can vary. Custom CSS applies to PDF and HTML. JSON Resume (jsonresume.org) opens in other resume builders.</p>

      <div class="group-title">Back up <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· ${store.lastBackup ? 'last backup ' + esc(new Date(store.lastBackup).toLocaleDateString()) : 'no backup yet'}</span></div>
      <div class="export-grid">
        <button class="btn" data-act="exportJson">This resume</button>
        <button class="btn" data-act="exportAll">All resumes (${docs.length})</button>
      </div>
      <button class="btn block" data-act="copyCode" style="margin-top:8px">Copy backup code</button>
      <p class="md-help">A backup code is the same backup as text, handy for emailing to yourself.</p>

      <div class="group-title">Restore or import</div>
      <label class="drop" id="dropZone">
        <input type="file" accept=".json,application/json" id="importInput" hidden>
        <b>Choose a file</b> or drop it here
        <small>Resume Studio and Resume Workbench backups, and JSON Resume files</small>
      </label>
      <label class="field" style="margin-top:10px"><span>Or paste a backup code or JSON</span><textarea class="code" id="pasteIn" rows="3" spellcheck="false" placeholder='{"app":"resume-studio", …}'></textarea></label>
      <button class="btn block" data-act="importPaste" style="margin-top:8px">Import pasted text</button>

      <div class="group-title">Privacy</div>
      <div class="note">Everything you type stays in this browser. Nothing is uploaded or shared, and there is no account. Clearing your browser data deletes your resumes, so download a backup now and then.</div>
      <div class="btn-col" style="flex-direction:row;flex-wrap:wrap;margin-top:12px">
        <button class="btn small danger" data-act="startBlank">Clear this resume</button>
        <button class="btn small danger" data-act="wipe">Delete all resumes from this browser</button>
      </div>`;
    $('#tab-files').innerHTML = html;
    const drop = $('#dropZone');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => importFile(e.dataTransfer.files[0]));
  }

  /* ---------- Pages ---------- */
  function manualBreaks() {
    const out = [];
    doc.data.sections.forEach(s => {
      if (s.visible === false) return;
      if (s.pageBreak) out.push({ kind: 'sec', id: s.id, label: `Section: ${s.title}` });
      (s.items || []).forEach(it => {
        if (it.pageBreak && !it.hidden) out.push({ kind: 'item', id: it.id, label: `${s.title}: ${(RS.SECTION_TYPES[s.type].label && RS.SECTION_TYPES[s.type].label(it)) || 'entry'}` });
      });
    });
    return out;
  }
  function buildPages() {
    const breaks = manualBreaks(), pages = ui.pages || 1;
    const auto = Math.max(0, pages - 1 - breaks.length);
    $('#pagesInfo').textContent = `This resume is ${pages} page${pages > 1 ? 's' : ''}` +
      (pages > 1 ? `: ${breaks.length ? `${breaks.length} added by you` : ''}${breaks.length && auto ? ', ' : ''}${auto ? `${auto} because the content runs over` : ''}.` : '.') +
      ' Content flows onto the next page by itself when a page is full.';
    $('#pagesBreaks').innerHTML = breaks.length
      ? breaks.map(b => `<div class="break-row"><span>New page at <b>${esc(b.label)}</b></span><button type="button" class="btn small" data-act="removeBreak" data-kind="${b.kind}" data-id="${esc(b.id)}">Remove page</button></div>`).join('')
      : '<p class="muted small" style="margin:0">None yet.</p>';
    const opts = ['<option value="">Choose a section or entry…</option>'];
    doc.data.sections.forEach(s => {
      if (s.visible === false) return;
      const t = RS.SECTION_TYPES[s.type];
      opts.push(`<option value="s:${esc(s.id)}" ${s.pageBreak ? 'disabled' : ''}>${esc(s.title)} (whole section)</option>`);
      (s.items || []).forEach(it => {
        if (it.hidden || s.type === 'skills' || s.type === 'languages' || s.type === 'interests') return;
        opts.push(`<option value="i:${esc(s.id)}:${esc(it.id)}" ${it.pageBreak ? 'disabled' : ''}> ${esc((t.label && t.label(it)) || 'Entry')}</option>`);
      });
    });
    $('#pageBreakAt').innerHTML = opts.join('');
    const canFit = pages > 1 && pages - 1 > breaks.length;
    $('#fitText').textContent = pages <= 1
      ? 'Your resume already fits on one page.'
      : canFit
        ? `Pages without a page break come from the content's length. Fit on ${pages - 1} page${pages - 1 > 1 ? 's' : ''} tightens spacing, margins and text size a little at a time, and stops before text gets too small. You can undo it.`
        : 'Every extra page comes from a page break you added. Remove one above to remove its page.';
    $('#fitBtn').disabled = !canFit;
    $('#fitBtn').textContent = canFit ? `Fit on ${pages - 1} page${pages - 1 > 1 ? 's' : ''}` : 'Fit on fewer pages';
  }
  // Shrink spacing, margins and text in small even steps until one page is gone.
  function shrinkToFit() {
    const start = ui.pages || 1, target = start - 1;
    if (target < 1 + manualBreaks().length) return;
    const d = doc.design, orig = JSON.stringify(d);
    const steps = [['sectionGap', -0.1, 0.6], ['itemGap', -0.05, 0.35], ['lineHeight', -0.03, 1.2], ['margin', -1, 9],
      ['fontSize', -0.25, 8.5], ['nameSize', -0.1, 1.8], ['headingSize', -0.03, 0.9], ['photoSize', -2, 20]];
    let guard = 0;
    while (ui.pages > target && guard++ < 60) {
      let moved = false;
      for (const [k, step, min] of steps) {
        const v = Math.round((+d[k] + step) * 100) / 100;
        if (v < min - 1e-9) continue;
        d[k] = v; moved = true;
        renderPreview();
        if (ui.pages <= target) break;
      }
      if (!moved) break;
    }
    if (ui.pages > target) {
      doc.design = JSON.parse(orig);
      renderPreview();
      buildPages();
      toast("Couldn't remove a page without making the text too small. Try hiding older entries, or the Compact template.");
      return;
    }
    doc.design.template = '';
    changed({ design: true, immediate: true });
    buildPages();
    toast(`Fitted on ${ui.pages} page${ui.pages > 1 ? 's' : ''}.`, 'Undo', () => { histGo(-1); if ($('#pagesDialog').open) { renderPreview(); buildPages(); } });
  }

  /* ---------- Resume check ---------- */
  const WEAK = /^(responsible for|duties (included|include)|helped|worked on|assisted with|tasked with|in charge of)\b/i;
  const fid = path => 'f_' + path.replace(/\W/g, '_');
  function runCheck() {
    const data = doc.data, b = data.basics, out = [];
    const add = (lvl, text, target) => out.push({ lvl, text, target });
    const lines = t => RS.blocks(t).map(x => RS.plain(x.text));
    if (doc.isSample) add('fix', 'The example resume is still loaded. Replace it with your own details, or press Start blank.', { path: 'basics.name' });
    if (!b.name.trim()) add('fix', 'Add your full name.', { path: 'basics.name' });
    if (!b.email.trim() && !b.phone.trim()) add('fix', 'Add an email address or phone number so employers can reach you.', { path: 'basics.email' });
    if (b.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email.trim())) add('fix', "The email address doesn't look complete.", { path: 'basics.email' });
    if (!b.title.trim()) add('improve', "Add a headline under your name, such as the role you're applying for.", { path: 'basics.title' });
    const visible = data.sections.map((s, si) => ({ s, si })).filter(x => x.s.visible !== false);
    const sum = visible.find(x => x.s.type === 'text' && /summary|profile|about|objective/i.test(x.s.title)) || visible.find(x => x.s.type === 'text');
    const sw = sum ? RS.plain(sum.s.content).split(/\s+/).filter(Boolean).length : 0;
    if (!sw) add('improve', 'Add a short summary. Many recruiters read it first.', sum ? { sec: sum.s, path: `sections.${sum.si}.content` } : null);
    else if (sw > 90) add('improve', `Your summary is ${sw} words. Aim for under 80.`, { sec: sum.s, path: `sections.${sum.si}.content` });
    const exps = visible.filter(x => x.s.type === 'experience').flatMap(x => x.s.items.map((i, ii) => ({ s: x.s, si: x.si, i, ii })).filter(e => !e.i.hidden));
    if (!exps.length && !visible.some(x => x.s.type === 'projects' && x.s.items.some(i => !i.hidden))) add('improve', "Add work experience, or projects if you're just starting out.", null);
    let noNum = 0, total = 0, firstNoNum = null;
    exps.forEach(({ s, si, i, ii }) => {
      const at = f => ({ sec: s, item: i, path: `sections.${si}.items.${ii}.${f}` });
      const nm = i.position || i.company || 'a job';
      if (!String(i.start).trim()) add('improve', `Add a start date for ${nm}.`, at('start'));
      if (!String(i.end).trim() && !i.current) add('improve', `Add an end date for ${nm}, or tick "I currently work here".`, at('end'));
      const bl = lines(i.description);
      if (!bl.length) add('improve', `Add two to five achievements for ${nm}.`, at('description'));
      bl.forEach(x => {
        total++;
        if (WEAK.test(x)) add('improve', `"${x.slice(0, 40)}${x.length > 40 ? '…' : ''}": start with an action verb such as Built, Led or Improved.`, at('description'));
        if (/^(i|my)\b/i.test(x)) add('improve', `Drop "I" or "my" from bullet points in ${nm}.`, at('description'));
        if (x.split(/\s+/).length > 32) add('improve', `A bullet in ${nm} runs over 30 words. Split or trim it.`, at('description'));
        if (!/\d/.test(x)) { noNum++; firstNoNum = firstNoNum || at('description'); }
      });
    });
    if (total >= 3 && noNum / total > 0.7) add('improve', `Only ${total - noNum} of ${total} achievements include a number. Add counts, percentages or time saved where you can.`, firstNoNum);
    const skillSecs = visible.filter(x => x.s.type === 'skills');
    const kw = skillSecs.flatMap(x => x.s.items.filter(i => !i.hidden)).flatMap(i => [i.name, ...String(i.keywords || '').split(',')]).map(x => String(x || '').trim()).filter(Boolean);
    if (kw.length < 5) add('improve', "List at least five skills that match the jobs you're applying for.", skillSecs[0] && skillSecs[0].s.items[0] ? { sec: skillSecs[0].s, item: skillSecs[0].s.items[0], path: `sections.${skillSecs[0].si}.items.0.name` } : null);
    visible.forEach(({ s, si }) => {
      const empty = s.type === 'text' ? !String(s.content || '').trim() : !s.items.some(i => !i.hidden);
      if (empty) add('improve', `"${s.title}" is empty. Add an entry or hide the section.`, { sec: s, path: `sections.${si}.title`, head: true });
    });
    if ((ui.pages || 1) > 2) add('improve', `Your resume runs to ${ui.pages} pages. Two pages suits most roles; try the Compact template, a smaller text size or trimming older jobs.`, null);
    if (doc.design.showPhoto && b.photo) add('improve', 'Your photo is shown. Many employers in the US, UK, Canada and Australia prefer resumes without photos.', { tab: 'design' });
    return out;
  }
  function checkSummary(issues) {
    const fixes = issues.filter(i => i.lvl === 'fix').length;
    return { fixes, score: Math.max(0, 100 - fixes * 15 - (issues.length - fixes) * 5) };
  }
  let lastIssues = [];
  function updateCheck() {
    lastIssues = runCheck();
    const { fixes } = checkSummary(lastIssues);
    const tab = $('.tabs [data-tab=check]');
    tab.innerHTML = 'Check' + (lastIssues.length ? `<span class="tab-badge ${fixes ? 'fix' : ''}">${lastIssues.length}</span>` : '<span class="tab-badge ok">✓</span>');
    if (ui.tab === 'check') buildCheck();
  }
  function buildCheck() {
    const issues = lastIssues, { fixes, score } = checkSummary(issues);
    let html = `<div class="score"><span class="score-n ${score >= 80 ? 'good' : score >= 55 ? 'mid' : 'low'}">${score}</span><div><b>Resume check</b><br><span class="muted small">${issues.length ? `${fixes ? fixes + ' to fix, ' : ''}${issues.length - fixes} suggestion${issues.length - fixes === 1 ? '' : 's'}` : 'Looks good. Nothing to flag.'}</span></div></div>`;
    html += `<ul class="checks">${issues.map((x, i) => `<li class="${x.lvl}"><button data-act="jump" data-i="${i}"><span class="lvl">${x.lvl === 'fix' ? 'Fix' : 'Improve'}</span><span>${esc(x.text)}</span></button></li>`).join('')}</ul>`;
    html += '<p class="md-help">Click an item to jump to it. These are suggestions; they never stop you downloading.</p>';
    $('#tab-check').innerHTML = html;
  }
  function jumpTo(target) {
    if (!target) return;
    if (target.tab) { setTab(target.tab); return; }
    if (window.innerWidth <= 900) $('.mobile-switch [data-view=edit]').click();
    if (target.sec) ui.openSecs.add(target.sec.id);
    if (target.item) ui.openItems.add(target.item.id);
    if (target.path.startsWith('basics')) ui.basicsOpen = true;
    setTab('content');
    const el = document.getElementById(target.head ? null : fid(target.path)) || $(`#tab-content [data-path="${target.path}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
    const f = el.closest('.field') || el;
    f.classList.add('flash');
    setTimeout(() => f.classList.remove('flash'), 1600);
  }

  /* ---------- Actions ---------- */
  const secAt = el => doc.data.sections[+el.dataset.si];
  function textTarget() {
    if (!ui.textPath) return null;
    const input = $(`#tab-content [data-path="${ui.textPath}"]`);
    if (!input) return null;
    const keys = ui.textPath.split('.'), key = keys.pop();
    const parent = getPath(doc.data, keys.join('.'));
    return { input, parent, key, format: (parent.formats || {})[key] || {} };
  }
  function updateTextTools() {
    const target = textTarget();
    $$('#textTools button').forEach(b => {
      b.disabled = !target;
      if (b.dataset.act !== 'textClear') {
        let selected = false;
        if (target && b.dataset.act === 'textStyle' && target.input.tagName === 'TEXTAREA') {
          const marker = { bold: '**', italic: '*', underline: '++', strike: '~~' }[b.dataset.key];
          const start = target.input.selectionStart, end = target.input.selectionEnd, value = target.input.value;
          selected = start !== end && value.slice(start - marker.length, start) === marker && value.slice(end, end + marker.length) === marker;
        }
        b.setAttribute('aria-pressed', !!target && (b.dataset.act === 'textAlign' ? target.format.align === b.dataset.key : !!target.format[b.dataset.key] || selected));
      }
    });
    if (target) $('#textTarget').textContent = (target.input.closest('label')?.querySelector('span')?.textContent || target.input.getAttribute('aria-label') || 'Text') + ' · formatting';
  }
  function setTextFormat(key, value) {
    const target = textTarget();
    if (!target) return;
    histCommit(true);
    target.parent.formats = { ...target.parent.formats, [target.key]: { ...target.format, [key]: value } };
    changed({ immediate: true }); updateTextTools(); target.input.focus({ preventScroll: true });
  }
  const ACTIONS = {
    textAlign: el => setTextFormat('align', el.dataset.key),
    textStyle: el => {
      const target = textTarget(); if (!target) return;
      const { input } = target, start = input.selectionStart, end = input.selectionEnd;
      if (input.tagName === 'TEXTAREA' && start !== end) {
        histCommit(true);
        const marker = { bold: '**', italic: '*', underline: '++', strike: '~~' }[el.dataset.key];
        const selection = input.value.slice(start, end);
        let from = start, to = end;
        if (selection.includes('\n')) {
          const lines = selection.split('\n').map(line => {
            const match = line.match(/^(\s*[-*•–]\s+)(.*)$/);
            return { prefix: match ? match[1] : '', text: match ? match[2] : line };
          });
          const remove = lines.filter(line => line.text.trim()).every(line => line.text.startsWith(marker) && line.text.endsWith(marker));
          const result = lines.map(line => line.prefix + (!line.text.trim() ? line.text : remove ? line.text.slice(marker.length, -marker.length) : marker + line.text + marker)).join('\n');
          input.setRangeText(result, start, end, 'select'); to = start + result.length;
        } else if (input.value.slice(start - marker.length, start) === marker && input.value.slice(end, end + marker.length) === marker) {
          input.setRangeText(selection, start - marker.length, end + marker.length, 'select');
          from -= marker.length; to -= marker.length;
        } else if (selection.startsWith(marker) && selection.endsWith(marker) && selection.length > marker.length * 2) {
          input.setRangeText(selection.slice(marker.length, -marker.length), start, end, 'select'); to -= marker.length * 2;
        } else {
          input.setRangeText(marker + selection + marker, start, end, 'select'); from += marker.length; to += marker.length;
        }
        input.focus({ preventScroll: true }); input.setSelectionRange(from, to);
        onInput({ target: input, type: 'input' }); histCommit(true);
      } else setTextFormat(el.dataset.key, !target.format[el.dataset.key]);
      updateTextTools();
    },
    textClear: () => {
      const target = textTarget(); if (!target) return;
      histCommit(true);
      target.parent.formats = { ...target.parent.formats, [target.key]: {} };
      if (target.input.tagName === 'TEXTAREA') {
        const input = target.input, start = input.selectionStart, end = input.selectionEnd;
        if (start !== end) input.setRangeText(RS.richRuns(input.value.slice(start, end)).map(r => r.t).join(''), start, end, 'select');
        else input.value = RS.richRuns(input.value).map(r => r.t).join('');
        onInput({ target: input, type: 'input' });
      }
      changed({ immediate: true }); updateTextTools(); target.input.focus({ preventScroll: true });
    },
    undo: () => histGo(-1),
    redo: () => histGo(1),
    pdf: () => startPdf(),
    zoomIn: () => { ui.zoom = Math.min(2, (ui.lastZoom || 1) + 0.1); fitZoom(); },
    zoomOut: () => { ui.zoom = Math.max(0.25, (ui.lastZoom || 1) - 0.1); fitZoom(); },
    zoomFit: () => { ui.zoom = 'fit'; fitZoom(); },
    toggleBasics: () => { ui.basicsOpen = !ui.basicsOpen; buildContent(); },
    removePhoto: () => { doc.data.basics.photo = ''; changed({ rebuild: true, immediate: true }); },
    addLink: () => { doc.data.basics.links.push({ label: '', url: '' }); changed({ rebuild: true, immediate: true }); },
    delLink: el => { doc.data.basics.links.splice(+el.dataset.i, 1); changed({ rebuild: true, immediate: true }); },
    toggleSec: el => { const id = el.dataset.id; ui.openSecs.has(id) ? ui.openSecs.delete(id) : ui.openSecs.add(id); buildContent(); },
    toggleItem: el => { const id = el.dataset.id; ui.openItems.has(id) ? ui.openItems.delete(id) : ui.openItems.add(id); buildContent(); },
    secCol: el => { const s = secAt(el); s.col = s.col === 'side' ? 'main' : 'side'; changed({ rebuild: true, immediate: true }); },
    secVis: el => { const s = secAt(el); s.visible = s.visible === false; changed({ rebuild: true, immediate: true }); },
    secMove: el => { move(doc.data.sections, +el.dataset.si, +el.dataset.d); changed({ rebuild: true, immediate: true }); },
    secDel: el => {
      const s = secAt(el);
      doc.data.sections.splice(+el.dataset.si, 1);
      changed({ rebuild: true, immediate: true });
      toast(`Deleted "${s.title}"`, 'Undo', () => histGo(-1));
    },
    secAdd: () => {
      const type = $('#newSecType').value, t = RS.SECTION_TYPES[type];
      const s = { id: RS.uid(), type, title: t.name, visible: true, col: t.col, items: [] };
      if (type === 'text') s.content = '';
      else { const it = blankItem(type); s.items.push(it); ui.openItems.add(it.id); }
      doc.data.sections.push(s);
      ui.openSecs.add(s.id);
      changed({ rebuild: true, immediate: true });
      requestAnimationFrame(() => { const el = $(`#tab-content .sec[data-si="${doc.data.sections.length - 1}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    },
    itemAdd: el => { const s = secAt(el); const it = blankItem(s.type); s.items.push(it); ui.openItems.add(it.id); changed({ rebuild: true, immediate: true }); },
    itemMove: el => { move(secAt(el).items, +el.dataset.ii, +el.dataset.d); changed({ rebuild: true, immediate: true }); },
    itemDup: el => { const s = secAt(el), i = +el.dataset.ii; const c = Object.assign({}, s.items[i], { id: RS.uid() }); s.items.splice(i + 1, 0, c); changed({ rebuild: true, immediate: true }); },
    itemDel: el => {
      const s = secAt(el), it = s.items[+el.dataset.ii], t = RS.SECTION_TYPES[s.type];
      s.items.splice(+el.dataset.ii, 1);
      changed({ rebuild: true, immediate: true });
      toast(`Removed "${(t.label && t.label(it)) || 'entry'}"`, 'Undo', () => histGo(-1));
    },
    secBreak: el => { const s = secAt(el); s.pageBreak = !s.pageBreak; changed({ rebuild: true, immediate: true }); toast(s.pageBreak ? `"${s.title}" now starts on a new page` : 'Page break removed'); },
    openPages: () => { buildPages(); $('#pagesDialog').showModal(); },
    addBreak: () => {
      const v = $('#pageBreakAt').value;
      if (!v) return;
      const [kind, sid, iid] = v.split(':');
      const s = doc.data.sections.find(x => x.id === sid);
      if (!s) return;
      if (kind === 's') s.pageBreak = true;
      else { const it = s.items.find(x => x.id === iid); if (it) it.pageBreak = true; }
      changed({ rebuild: true, immediate: true });
      renderPreview();
      buildPages();
      toast(`Page added. The resume is now ${ui.pages} pages.`, 'Undo', () => { histGo(-1); if ($('#pagesDialog').open) { renderPreview(); buildPages(); } });
    },
    removeBreak: el => {
      const { kind, id } = el.dataset;
      for (const s of doc.data.sections) {
        if (kind === 'sec' && s.id === id) s.pageBreak = false;
        if (kind === 'item') (s.items || []).forEach(it => { if (it.id === id) it.pageBreak = false; });
      }
      changed({ rebuild: true, immediate: true });
      renderPreview();
      if ($('#pagesDialog').open) buildPages();
      toast(`Page break removed. The resume is now ${ui.pages} page${ui.pages > 1 ? 's' : ''}.`, 'Undo', () => histGo(-1));
    },
    shrinkFit: () => shrinkToFit(),
    itemHide: el => { const it = secAt(el).items[+el.dataset.ii]; it.hidden = !it.hidden; changed({ rebuild: true, immediate: true }); },
    jump: el => jumpTo(lastIssues[+el.dataset.i] && lastIssues[+el.dataset.i].target),
    startBlank: () => {
      const keepDesign = doc.design;
      doc.data = RS.SAMPLES.find(s => s.id === 'blank').make();
      doc.design = keepDesign;
      doc.isSample = false;
      ui.openSecs.clear(); ui.openItems.clear();
      changed({ rebuild: true, immediate: true });
      setTab('content');
      toast('Cleared. Your design is kept.', 'Undo', () => histGo(-1));
    },
    layout: el => { RS.applyLayout(doc.design, el.dataset.id); fixColumns(); doc.design.template = ''; changed({ rebuild: true, immediate: true }); },
    theme: el => { doc.design.theme = el.dataset.id; doc.design.accent = ''; doc.design.sideColor = ''; doc.design.template = ''; changed({ design: true, immediate: true }); },
    resetColors: () => { doc.design.accent = ''; doc.design.sideColor = ''; changed({ design: true, immediate: true }); },
    columns: el => { doc.design.columns = el.dataset.v; fixColumns(); doc.design.template = ''; changed({ rebuild: true, immediate: true }); },
    resetDesign: () => { doc.design = RS.applyTemplate(doc.design, doc.design.template || 'modern'); changed({ rebuild: true, immediate: true }); toast('Design reset'); },
    template: el => { doc.design = RS.applyTemplate(doc.design, el.dataset.id); fixColumns(); changed({ rebuild: true, immediate: true }); markTemplate(); toast(`${RS.TEMPLATES.find(t => t.id === el.dataset.id).name} template applied`); },
    sample: el => {
      const s = RS.SAMPLES.find(x => x.id === el.dataset.id);
      if (!confirm(`Replace this resume's content with the ${s.name} example? You can undo this.`)) return;
      doc.data = s.make();
      doc.isSample = s.id !== 'blank';
      ui.openSecs.clear(); ui.openItems.clear();
      changed({ rebuild: true, immediate: true });
      setTab('content');
    },
    docOpen: el => openDoc(el.dataset.id),
    docNew: () => {
      const sample = $('#newDocSample').value;
      const d = makeDoc(sample, doc.design.template || 'modern', 'Untitled resume');
      if (sample !== 'blank') d.name = RS.SAMPLES.find(s => s.id === sample).name + ' resume';
      store.docs[d.id] = d;
      openDoc(d.id);
      setTab('content');
      toast('New resume created');
    },
    docDup: el => {
      const src = store.docs[el.dataset.id];
      const d = JSON.parse(JSON.stringify(src));
      d.id = RS.uid(); d.name = src.name + ' (copy)'; d.updated = Date.now();
      store.docs[d.id] = d;
      openDoc(d.id);
      toast('Duplicated');
    },
    docRename: async el => {
      const d = store.docs[el.dataset.id];
      const name = await ask('Rename resume', 'Give this resume a name only you will see.', d.name);
      if (name == null || !name.trim()) return;
      d.name = name.trim().slice(0, 80);
      if (d.id === doc.id) $('#docName').value = d.name;
      save(true); buildFiles();
    },
    docDel: el => {
      const d = store.docs[el.dataset.id];
      if (!confirm(`Delete "${d.name}" from this browser? This cannot be undone.`)) return;
      delete store.docs[d.id];
      if (!Object.keys(store.docs).length) { const n = makeDoc('blank', 'modern', 'My resume'); store.docs[n.id] = n; }
      if (d.id === doc.id) openDoc(Object.values(store.docs).sort((a, b) => b.updated - a.updated)[0].id);
      else { save(true); buildFiles(); }
    },
    exportJson: () => { download(slug(doc.name) + '-backup-' + stamp() + '.json', backupText([doc]), 'application/json'); markBackedUp(); },
    exportAll: () => { download('all-resumes-backup-' + stamp() + '.json', backupText(Object.values(store.docs)), 'application/json'); markBackedUp(); },
    exportRecovery: () => { download('original-resume-data-' + stamp() + '.json', recoveryText, 'application/json'); recoveryStored = true; save(true); },
    copyCode: async () => {
      try { await navigator.clipboard.writeText(backupText([doc])); markBackedUp(); toast('Backup code copied. Paste it into a note or an email to yourself.'); }
      catch (e) { const t = $('#pasteIn'); t.value = backupText([doc]); t.select(); toast('Copy blocked. The code is selected in the box below; press Ctrl+C.'); }
    },
    importPaste: () => { const t = $('#pasteIn').value.trim(); if (!t) { toast('Paste a backup code or JSON first'); return; } importText(t); },
    exportTxt: () => download(fileBase() + '.txt', RS.toText(doc), 'text/plain'),
    exportMd: () => download(fileBase() + '.md', RS.toMarkdown(doc), 'text/markdown'),
    exportJsonResume: () => download(fileBase() + '.json', RS.toJsonResume(doc), 'application/json'),
    exportDocx: async el => {
      el.disabled = true; const label = el.textContent; el.textContent = 'Preparing…';
      try { download(fileBase() + '.docx', await RS.toDocx(doc)); toast('Word file saved. Check the layout in Word before sending it.'); }
      catch (e) { toast(e.message || 'Could not make the Word file'); }
      finally { el.disabled = false; el.textContent = label; }
    },
    exportHtml: async () => {
      try { download(fileBase() + '.html', await standaloneHtml(), 'text/html'); toast('Saved. Open it in a browser and press Ctrl+P to print or save as PDF.'); }
      catch (e) { toast(e.message || 'Could not make the web page'); }
    },
    copyTxt: async () => {
      try { await navigator.clipboard.writeText(RS.toText(doc)); toast('Plain text copied'); }
      catch (e) { toast('Copy failed. Use Download plain text instead.'); }
    },
    wipe: () => {
      if (!confirm('Delete ALL resumes stored in this browser? This cannot be undone.')) return;
      try { localStorage.removeItem(KEY + ':recovery'); } catch (e) { /* storage may be blocked */ }
      recoveryText = ''; recoveryStored = true;
      store = { current: null, docs: Object.create(null) };
      const d = makeDoc('software', 'modern', 'My resume');
      store.docs[d.id] = d; store.current = d.id;
      openDoc(d.id);
      toast('All resumes deleted');
    },
  };
  function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; const [x] = arr.splice(i, 1); arr.splice(j, 0, x); }
  function blankItem(type) { const it = { id: RS.uid(), hidden: false }; RS.SECTION_TYPES[type].fields.forEach(f => (it[f.key] = f.type === 'level' ? 3 : f.type === 'check' ? false : '')); return it; }
  const slug = s => (String(s || '') || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'resume';
  const stamp = () => new Date().toISOString().slice(0, 10);
  const backupText = docs => JSON.stringify({ app: 'resume-studio', version: 2, savedAt: new Date().toISOString(),
    resumes: docs.map(d => ({ name: d.name, isSample: !!d.isSample, data: d.data, design: d.design })) }, null, 2);
  function markBackedUp() { store.lastBackup = Date.now(); save(true); if (ui.tab === 'files') buildFiles(); }
  function fixColumns() { if (doc.design.columns === 'one' && doc.design.header === 'sidebar') doc.design.header = 'left'; }
  function fileBase() { return (doc.data.basics.name || doc.name || 'resume').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '-resume'; }
  function openDoc(id) {
    clearTimeout(histTimer);
    if (saveTimer) save(true);
    store.current = id;
    doc = store.docs[id];
    ui.openSecs.clear(); ui.openItems.clear();
    histReset();
    buildPanels();
    schedulePreview();
    save(true);
  }
  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- PDF ---------- */
  let printing = false;
  const CLONE = !!(window.CSS && CSS.supports && CSS.supports('box-decoration-break', 'clone') && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  function startPdf() {
    if (lsGet(SKIP_PDF_TIP) === '1' || typeof HTMLDialogElement === 'undefined') return printNow();
    const dlg = $('#pdfDialog');
    dlg.returnValue = '';
    dlg.showModal();
  }
  // Puts the resume in #printRoot and sets the page size and margins.
  // Page size, margins and full-bleed colour for printing #printRoot.
  function printCss(html, clone) {
    const d = doc.design;
    const [pw, ph] = RS.PAGE[d.pageSize] || RS.PAGE.A4;
    const m = +d.margin || 14;
    const bg = (html.match(/--page-bg:([^;"]+)/) || [])[1] || '#fff';
    const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    const base = `@media print { html { background: ${unesc(bg)} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }\n`;
    if (clone) {
      // Zero page margins so colour reaches the paper edge; each column fragment
      // repeats its top/bottom padding, which gives every page its margin.
      return `@page { size: ${pw}mm ${ph}mm; margin: 0; }\n` + base +
        `@media print {
          #printRoot .rs-col { -webkit-box-decoration-break: clone; box-decoration-break: clone; padding-top: ${m}mm; padding-bottom: ${m}mm; }
          #printRoot .rs-body { padding-top: 0 !important; padding-bottom: 0; }
          #printRoot .rs-head-top .rs-body { margin-top: -${m}mm; }
        }`;
    }
    return `@page { size: ${pw}mm ${ph}mm; margin: ${m}mm 0 ${m}mm 0; }\n@page :first { margin-top: 0; }\n` + base;
  }
  // Puts the resume in #printRoot and sets the page size and margins.
  function preparePrint() {
    const root = $('#printRoot');
    const html = RS.render(doc);
    root.innerHTML = html;
    $('#printStyle').textContent = printCss(html, CLONE);
    return root;
  }
  // The resume's own stylesheet, for the standalone web page.
  async function resumeCss() {
    try { const r = await fetch('css/resume.css'); if (r.ok) return await r.text(); } catch (e) { /* try the loaded sheet */ }
    for (const sheet of document.styleSheets) {
      if (!/resume\.css/.test(sheet.href || '')) continue;
      try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); } catch (e) { /* not readable */ }
    }
    throw new Error('The web page export works when Resume Studio is opened from a website or local server, not straight from a file.');
  }
  async function standaloneHtml() {
    const css = await resumeCss();
    const html = RS.render(doc);
    const fonts = Array.from(new Set(RS.docFonts(doc))).map(n => RS.font(n)).filter(f => f.spec)
      .map(f => `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.name).replace(/%20/g, '+')}:${f.spec}&display=swap">`).join('\n');
    const name = esc(doc.data.basics.name || 'Resume');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} – Resume</title>
${fonts}
<style>
${css}
body { margin: 0; background: #e6e8ec; font-family: system-ui, sans-serif; }
.tip { max-width: ${(RS.PAGE[doc.design.pageSize] || RS.PAGE.A4)[0]}mm; margin: 16px auto 0; color: #444; font-size: 13px; padding: 0 16px; box-sizing: border-box; }
#printRoot { padding: 16px 0 40px; overflow-x: auto; }
#printRoot .rs { margin: 0 auto; box-shadow: 0 4px 24px rgba(0,0,0,.12); }
@media print {
  .tip { display: none; }
  body { background: none; }
  #printRoot { padding: 0; }
  #printRoot .rs { width: auto; min-height: 0 !important; background: transparent; box-shadow: none; }
  #printRoot .rs-body { padding-bottom: 0; }
}
${printCss(html, true)}
${scopeCss(doc.design.customCss)}
</style>
</head>
<body>
<p class="tip">To save as PDF: press Ctrl+P (⌘P on a Mac), choose <b>Save as PDF</b>, keep Margins on Default and untick Headers and footers.</p>
<div id="printRoot">${html}</div>
</body>
</html>
`;
  }
  async function printNow() {
    await Promise.all(RS.docFonts(doc).map(RS.loadFont));
    const root = preparePrint();
    printing = true;
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignore */ } }
    await Promise.all($$('img', root).map(img => img.complete ? 0 : new Promise(r => { img.onload = img.onerror = r; })));
    const oldTitle = document.title;
    document.title = fileBase();
    setTimeout(() => {
      window.print();
      document.title = oldTitle;
    }, 60);
  }

  /* ---------- Small UI helpers ---------- */
  let toastTimer = 0;
  function toast(msg, actionLabel, action) {
    const t = $('#toast');
    t.textContent = msg;
    if (actionLabel) {
      const b = document.createElement('button');
      b.textContent = actionLabel;
      b.onclick = () => { t.classList.remove('show'); action(); };
      t.appendChild(b);
    }
    t.classList.toggle('has-action', !!actionLabel);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), actionLabel ? 6000 : 2800);
  }
  function ask(title, text, value) {
    const dlg = $('#promptDialog');
    if (typeof dlg.showModal !== 'function') return Promise.resolve(prompt(title, value));
    $('#promptTitle').textContent = title;
    $('#promptText').textContent = text;
    $('#promptInput').value = value || '';
    dlg.returnValue = '';
    dlg.showModal();
    $('#promptInput').select();
    return new Promise(res => dlg.addEventListener('close', () => res(dlg.returnValue === 'ok' ? $('#promptInput').value : null), { once: true }));
  }
  function setTab(tab) {
    ui.tab = tab;
    $$('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); b.tabIndex = b.dataset.tab === tab ? 0 : -1; });
    $$('.tab-pane').forEach(p => (p.hidden = p.id !== 'tab-' + tab));
    if (tab === 'templates') buildTemplates();
    if (tab === 'files') buildFiles();
    if (tab === 'design') buildDesign();
    if (tab === 'content') buildContent();
    if (tab === 'check') buildCheck();
    lsSet('resume-studio:tab', tab);
  }

  /* Photo: shrink to a small JPEG so it fits in browser storage. */
  function readPhoto(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Please choose an image file'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 600, s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        const cx = cv.getContext('2d');
        cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        doc.data.basics.photo = cv.toDataURL('image/jpeg', 0.86);
        doc.design.showPhoto = true;
        changed({ rebuild: true, immediate: true });
      };
      img.onerror = () => toast('That image could not be read');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // Backups (ours or Resume Workbench's) and JSON Resume files are added as new resumes.
  function importText(text) {
    let list;
    try { list = RS.parseImport(text); } catch (e) { toast(e.message); return; }
    let last = null, count = 0;
    for (const src of list) {
      const d = sanitizeDoc(src);
      if (!d || !d.data.sections.length && !d.data.basics.name) continue;
      d.id = RS.uid(); d.updated = Date.now();
      store.docs[d.id] = d; last = d; count++;
    }
    if (!last) { toast('No resume found in that file'); return; }
    openDoc(last.id);
    setTab('content');
    toast(count > 1 ? `${count} resumes added. Switch between them in Files.` : `Added "${last.name}"`);
  }
  function importFile(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast('That file is too large to be a resume backup'); return; }
    const reader = new FileReader();
    reader.onload = () => importText(String(reader.result));
    reader.onerror = () => toast("Couldn't read that file. Try choosing it again.");
    reader.readAsText(file);
  }

  /* ---------- Events ---------- */
  function onInput(e) {
    const el = e.target;
    if (el.dataset.path) {
      let v = el.type === 'checkbox' ? el.checked : el.dataset.num ? +el.value : el.value;
      setPath(doc.data, el.dataset.path, v);
      if (doc.isSample && el.dataset.path === 'basics.name') doc.isSample = false;
      if (el.type === 'range') { const o = el.parentElement.querySelector('output'); if (o) o.textContent = levelText(v); }
      const item = el.closest('.item');
      if (item) {
        const si = +el.closest('.sec').dataset.si, s = doc.data.sections[si];
        const it = s.items[+item.dataset.ii];
        const t = RS.SECTION_TYPES[s.type];
        $('.item-label', item).textContent = (t.label && t.label(it)) || 'Untitled';
      }
      changed();
      return;
    }
    if (el.dataset.design) {
      const k = el.dataset.design;
      let v = el.type === 'checkbox' ? el.checked : el.dataset.num ? +el.value : el.value;
      doc.design[k] = v;
      if (el.type === 'range') { const o = el.parentElement.querySelector('output'); const unit = { fontSize: 'pt', nameSize: '×', headingSize: '×', sideWidth: '%', margin: 'mm', sectionGap: 'em', itemGap: 'em', photoSize: 'mm' }[k] || ''; if (o) o.textContent = fmt(v, unit); }
      if (k === 'showGuides') $('#guidesToggle').checked = v;
      const structural = ['header', 'headerBanner', 'columns', 'sideStyle', 'heading', 'itemStyle', 'skillStyle', 'bullet', 'contactStyle', 'dateAlign'];
      if (structural.includes(k) || k.startsWith('font')) doc.design.template = '';
      if (e.type === 'change' && (k === 'fontHeading' || k === 'fontBody' || k === 'accent' || k === 'sideColor' || k === 'header')) changed({ design: true });
      else changed();
    }
  }

  function bind() {
    $('#siteTheme').value = RS.siteTheme.preference;
    $('#siteTheme').addEventListener('change', e => RS.siteTheme.set(e.target.value));
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (btn && !btn.disabled && ACTIONS[btn.dataset.act]) { e.preventDefault(); ACTIONS[btn.dataset.act](btn, e); }
    });
    const panel = $('.panel');
    panel.addEventListener('focusin', e => {
      if (e.target.closest('#tab-content') && e.target.dataset.path && (e.target.tagName === 'TEXTAREA' || ['text', 'email', 'tel'].includes(e.target.type))) { ui.textPath = e.target.dataset.path; updateTextTools(); }
    });
    panel.addEventListener('mousedown', e => { if (e.target.closest('#textTools button')) e.preventDefault(); });
    panel.addEventListener('select', e => { if (e.target.dataset.path && e.target.closest('#tab-content')) updateTextTools(); });
    panel.addEventListener('input', onInput);
    panel.addEventListener('change', e => {
      const el = e.target;
      if (el.id === 'photoInput') { readPhoto(el.files[0]); el.value = ''; return; }
      if (el.id === 'importInput') { importFile(el.files[0]); el.value = ''; return; }
      if (el.id === 'pairing' && el.value !== '') {
        const [h, b] = RS.PAIRINGS[+el.value];
        doc.design.fontHeading = h; doc.design.fontBody = b; doc.design.template = '';
        changed({ design: true, immediate: true });
        return;
      }
      if (el.dataset.design && (el.tagName === 'SELECT' || el.type === 'color')) onInput(e);
      if (el.dataset.path || el.dataset.design) histCommit(true);
    });
    $$('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $('.tabs').addEventListener('keydown', e => {
      const tabs = $$('.tabs button'), index = tabs.indexOf(e.target);
      if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[next].dataset.tab); tabs[next].focus();
    });
    $$('.mobile-switch button').forEach(b => b.addEventListener('click', () => {
      $$('.mobile-switch button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      $('.workspace').dataset.view = b.dataset.view;
      if (b.dataset.view === 'preview') schedulePreviewMeasure();
    }));
    $('#docName').addEventListener('input', e => { doc.name = e.target.value.slice(0, 80) || 'Untitled resume'; save(); });
    $('#guidesToggle').addEventListener('change', e => { doc.design.showGuides = e.target.checked; changed({ design: ui.tab === 'design' }); });
    $('#pdfDialog').addEventListener('close', () => {
      if ($('#pdfSkip').checked) lsSet(SKIP_PDF_TIP, '1');
      if ($('#pdfDialog').returnValue === 'ok') printNow();
    });
    window.addEventListener('resize', schedulePreviewMeasure);
    // Flush the debounce before navigation, tab suspension or closing the browser.
    window.addEventListener('pagehide', () => { if (saveTimer) save(true); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) save(true); });
    if (document.fonts) document.fonts.addEventListener('loadingdone', schedulePreviewMeasure);
    document.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); startPdf(); return; }
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if (typing && mod && ['b', 'i', 'u'].includes(e.key.toLowerCase()) && document.activeElement.closest('#tab-content') && document.activeElement.dataset.path) {
        e.preventDefault(); ui.textPath = document.activeElement.dataset.path;
        ACTIONS.textStyle({ dataset: { key: { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()] } }); return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); histGo(-1); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); histGo(1); }
    });
    // Printing from the browser menu still prints the resume.
    window.addEventListener('beforeprint', () => { if (!printing) preparePrint(); });
    window.addEventListener('afterprint', () => { printing = false; $('#printRoot').innerHTML = ''; });
  }

  /* ---------- Start ---------- */
  load();
  bind();
  histReset();
  $('#docName').value = doc.name;
  $('#guidesToggle').checked = !!doc.design.showGuides;
  const savedTab = lsGet('resume-studio:tab');
  setTab(['content', 'templates', 'design', 'check', 'files'].includes(savedTab) ? savedTab : 'content');
  renderPreview();
  save(true);
  RS.app = { get doc() { return doc; }, render: renderPreview, setTab, printNow, preparePrint, standaloneHtml, act: (name, data) => ACTIONS[name]({ dataset: data || {} }) };
})();
