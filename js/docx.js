/* Editable Word layout exporter. Uses native paragraphs, tables and images. */
(function () {
  'use strict';
  const RS = window.RS;
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const NS = `xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const round = n => Math.max(0, Math.round(n));
  const hex = (value, fallback = 'FFFFFF') => {
    let s = String(value || '').replace('#', '');
    if (/^[a-f\d]{3}$/i.test(s)) s = s.split('').map(c => c + c).join('');
    return /^[a-f\d]{6}$/i.test(s) ? s.toUpperCase() : fallback;
  };
  const mix = (a, b, ratio) => [0, 2, 4].map(i => round(parseInt(a.slice(i, i + 2), 16) * ratio + parseInt(b.slice(i, i + 2), 16) * (1 - ratio)).toString(16).padStart(2, '0')).join('').toUpperCase();
  const EMU = 635; // per twip
  // Text stand-ins when an icon image can't be drawn.
  const SYMBOL = { email: '✉', phone: '☎', location: '⌖', linkedin: 'in', github: 'GH' };

  async function png(w, h, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    await paint(canvas.getContext('2d'));
    return canvas.toDataURL('image/png').split(',')[1];
  }

  /* ---------- Embedded fonts ---------- */
  // Word swaps web fonts it hasn't got for Calibri or Georgia, which changes every line break.
  // Static TTF instances come from Fontsource on jsDelivr (Google Fonts are OFL, so embedding
  // is allowed). Only the font name and style are requested; offline, the file just goes without.
  const FONT_CDN = 'https://cdn.jsdelivr.net/fontsource/fonts/';
  const fontFiles = new Map();
  function fetchFont(url) {
    if (!fontFiles.has(url)) {
      const loading = (async () => {
        const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 10000);
        try {
          const res = await fetch(url, { signal: abort.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
          if (!res.ok) throw new Error('Font ' + res.status);
          return new Uint8Array(await res.arrayBuffer());
        } finally { clearTimeout(timer); }
      })();
      loading.catch(() => fontFiles.delete(url));
      fontFiles.set(url, loading);
    }
    return fontFiles.get(url);
  }
  // The styles a family has, read from its Google Fonts axis string ('ital,wght@0,400;0,700;1,400').
  function fontStyles(spec) {
    const [axes, values] = String(spec || 'wght@400').split('@'), names = axes.split(',');
    return [...new Set(values.split(';').map(v => {
      const tuple = v.split(','), at = name => tuple[names.indexOf(name)];
      const italic = names.includes('ital') && at('ital') === '1', weight = names.includes('wght') ? +at('wght') : 400;
      return weight >= 700 ? (italic ? 'BoldItalic' : 'Bold') : italic ? 'Italic' : 'Regular';
    }))];
  }
  const STYLE = { Regular: ['400-normal', 'Regular'], Bold: ['700-normal', 'Bold'], Italic: ['400-italic', 'Italic'], BoldItalic: ['700-italic', 'Bold Italic'] };

  function sfntTables(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), tables = {};
    if (![0x00010000, 0x74727565].includes(view.getUint32(0))) throw new Error('Not a TrueType font');
    for (let i = 0, n = view.getUint16(4); i < n; i++) {
      const at = 12 + i * 16, tag = String.fromCharCode(...bytes.subarray(at, at + 4));
      tables[tag] = bytes.subarray(view.getUint32(at + 8), view.getUint32(at + 8) + view.getUint32(at + 12));
    }
    return tables;
  }
  // Characters a font can draw, from its Windows Unicode cmap (formats 4 and 12).
  function fontCovers(tables) {
    const cmap = tables.cmap, view = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength), ranges = [];
    let at = -1;
    for (let i = 0, n = view.getUint16(2); i < n; i++) {
      const platform = view.getUint16(4 + i * 8), encoding = view.getUint16(6 + i * 8);
      if (platform === 3 && (encoding === 10 || (encoding === 1 && at < 0))) at = view.getUint32(8 + i * 8);
    }
    const format = at < 0 ? 0 : view.getUint16(at);
    if (format === 4) {
      const segs = view.getUint16(at + 6) / 2, ends = at + 14, starts = ends + segs * 2 + 2;
      for (let i = 0; i < segs; i++) ranges.push([view.getUint16(starts + i * 2), view.getUint16(ends + i * 2)]);
    } else if (format === 12) {
      for (let i = 0, n = view.getUint32(at + 12); i < n; i++) ranges.push([view.getUint32(at + 16 + i * 12), view.getUint32(at + 20 + i * 12)]);
    }
    return cp => ranges.some(([a, b]) => cp >= a && cp <= b);
  }
  // Fontsource's instances of variable fonts can keep the variable font's default name
  // ("Montserrat Thin"), and Word only uses an embedded font whose family name matches.
  function renameFont(tables, family, style) {
    const old = tables.name, view = new DataView(old.buffer, old.byteOffset, old.byteLength);
    const records = [], storage = view.getUint16(4);
    for (let i = 0, n = view.getUint16(2); i < n; i++) {
      const at = 6 + i * 12, id = view.getUint16(at + 6);
      if (view.getUint16(at) !== 3 || [1, 2, 3, 4, 6, 16, 17, 21, 22, 25].includes(id)) continue;
      const start = storage + view.getUint16(at + 10);
      records.push([view.getUint16(at + 2), view.getUint16(at + 4), id, old.subarray(start, start + view.getUint16(at + 8))]);
    }
    const utf16 = s => { const out = new Uint8Array(s.length * 2); for (let i = 0; i < s.length; i++) { out[i * 2] = s.charCodeAt(i) >> 8; out[i * 2 + 1] = s.charCodeAt(i) & 255; } return out; };
    const full = style === 'Regular' ? family : family + ' ' + style;
    [[1, family], [2, style], [3, full + '; Resume Studio'], [4, full], [6, (family + '-' + style).replace(/[^A-Za-z0-9-]/g, '')]]
      .forEach(([id, text]) => records.push([1, 0x409, id, utf16(text)]));
    records.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const size = 6 + records.length * 12, total = records.reduce((sum, r) => sum + r[3].length, size);
    const out = new Uint8Array(total), w = new DataView(out.buffer);
    w.setUint16(2, records.length); w.setUint16(4, size);
    let offset = 0;
    records.forEach(([encoding, language, id, data], i) => {
      const at = 6 + i * 12;
      w.setUint16(at, 3); w.setUint16(at + 2, encoding); w.setUint16(at + 4, language); w.setUint16(at + 6, id);
      w.setUint16(at + 8, data.length); w.setUint16(at + 10, offset);
      out.set(data, size + offset); offset += data.length;
    });
    tables.name = out;
  }
  function writeSfnt(tables) {
    const tags = Object.keys(tables).sort(), n = tags.length, pad = x => (x + 3) & ~3;
    const sum = (bytes, start, length) => { let s = 0; const v = new DataView(bytes.buffer, bytes.byteOffset); for (let i = 0; i < length; i += 4) s = (s + v.getUint32(start + i)) >>> 0; return s; };
    let offset = 12 + n * 16;
    const total = tags.reduce((t, tag) => t + pad(tables[tag].length), offset), out = new Uint8Array(total), w = new DataView(out.buffer);
    const log = Math.floor(Math.log2(n));
    w.setUint32(0, 0x00010000); w.setUint16(4, n); w.setUint16(6, 16 << log); w.setUint16(8, log); w.setUint16(10, n * 16 - (16 << log));
    let head = 0;
    tags.forEach((tag, i) => {
      const data = tables[tag], at = 12 + i * 16;
      out.set(data, offset);
      if (tag === 'head') { head = offset; w.setUint32(offset + 8, 0); }
      for (let c = 0; c < 4; c++) out[at + c] = tag.charCodeAt(c);
      w.setUint32(at + 4, sum(out, offset, pad(data.length))); w.setUint32(at + 8, offset); w.setUint32(at + 12, data.length);
      offset += pad(data.length);
    });
    if (head) w.setUint32(head + 8, (0xB1B0AFBA - sum(out, 0, total)) >>> 0);
    return out;
  }
  // ECMA-376 Part 1, 17.8.1: XOR the first 32 bytes with the font key, read backwards.
  function obfuscate(bytes, key) {
    const hexKey = key.replace(/[{}-]/g, ''), out = bytes.slice();
    for (let i = 0; i < 32; i++) out[i] ^= parseInt(hexKey.substr(30 - (i % 16) * 2, 2), 16);
    return out;
  }
  const fontKey = () => {
    const b = crypto.getRandomValues(new Uint8Array(16)), h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `{${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}}`;
  };
  // -> { familyName: { covers(codePoint), files: [{ style, bytes }] } }. The files hold Fontsource's
  // Latin subset; runs put any other character in the fallback font.
  async function loadEmbeddedFonts(names) {
    const out = {};
    await Promise.all([...new Set(names)].map(async name => {
      const f = RS.font(name);
      if (f.name !== name || f.cat === 'System') return;
      const id = f.name.toLowerCase().replace(/\s+/g, '-');
      try {
        const files = await Promise.all(fontStyles(f.spec).map(async style => {
          const tables = sfntTables(await fetchFont(`${FONT_CDN}${id}@latest/latin-${STYLE[style][0]}.ttf`));
          renameFont(tables, f.name, STYLE[style][1]);
          return { style, bytes: writeSfnt(tables) };
        }));
        out[name] = { covers: fontCovers(sfntTables(files[0].bytes)), files };
      } catch { /* offline or blocked: Word uses the alternative font instead */ }
    }));
    return out;
  }

  RS.buildDocx = async function (doc, JSZip) {
    const d = RS.normHeader({ ...RS.DEFAULT_DESIGN, ...doc.design }), data = doc.data || {}, basics = data.basics || {};
    const colors = RS.colors(d), zip = new JSZip(), relationships = [];
    const font = RS.font(d.fontBody).name, headingFont = RS.font(d.fontHeading).name;
    const fallback = name => { const f = RS.font(name); return f.cat === 'System' ? f.name : { Serif: 'Georgia', Slab: 'Cambria', Mono: 'Consolas', Display: 'Arial Narrow' }[f.cat] || 'Calibri'; };
    const embedded = await loadEmbeddedFonts([font, headingFont]);
    const base = round(d.fontSize * 2), em = d.fontSize * 20;
    // CSS line-height is a multiple of the font size; Word's "auto" multiplies the font's own
    // (taller) line, so use an "at least" height to match the preview line for line.
    const bodyLine = round(em * d.lineHeight);
    const [pageW, pageH] = (RS.PAGE[d.pageSize] || RS.PAGE.A4).map(mm => round(mm * 1440 / 25.4));
    const margin = round(d.margin * 1440 / 25.4), width = pageW - margin * 2;
    const theme = { text: hex(colors.text), muted: hex(colors.muted), accent: hex(colors.accent), bg: hex(colors.bg) };
    const relationship = (type, target, external = false) => {
      const id = `rId${relationships.length + 1}`;
      relationships.push(`<Relationship Id="${id}" Type="${R}/${type}" Target="${esc(target)}"${external ? ' TargetMode="External"' : ''}/>`);
      return id;
    };
    const media = (name, b64) => { zip.file('word/media/' + name, b64, { base64: true }); return 'media/' + name; };

    /* ---------- Runs, paragraphs and tables ---------- */
    const fonts = p => `<w:rFonts w:ascii="${esc(p.h ? headingFont : p.font || font)}" w:hAnsi="${esc(p.h ? headingFont : p.font || font)}" w:eastAsia="${esc(p.h ? headingFont : p.font || font)}" w:cs="${esc(p.h ? headingFont : p.font || font)}"/>`;
    // Characters an embedded font lacks get their own run in the fallback font; left to Word,
    // the substitute spreads to the neighbouring text.
    const run = (text, p = {}) => {
      const name = p.h ? headingFont : p.font || font, covers = embedded[name] && embedded[name].covers;
      if (!covers) return runXml(text, p);
      let out = '', piece = '', drawn = true;
      for (const ch of String(text)) {
        const ok = covers(ch.codePointAt(0));
        if (ok !== drawn && piece) { out += runXml(piece, drawn ? p : { ...p, h: false, font: fallback(name) }); piece = ''; }
        piece += ch; drawn = ok;
      }
      return out + runXml(piece, drawn ? p : { ...p, h: false, font: fallback(name) });
    };
    const runXml = (text, p) => `<w:r><w:rPr>${fonts(p)}${p.b ? '<w:b/>' : ''}${p.i ? '<w:i/>' : ''}${p.s ? '<w:strike/>' : ''}<w:color w:val="${hex(p.color, theme.text)}"/><w:sz w:val="${round(p.sz || base)}"/><w:szCs w:val="${round(p.sz || base)}"/>${p.u ? '<w:u w:val="single"/>' : ''}${p.sp ? `<w:spacing w:val="${round(p.sp)}"/>` : ''}${p.shade ? `<w:shd w:val="clear" w:fill="${hex(p.shade)}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
    const tab = '<w:r><w:tab/></w:r>';
    const rich = (text, p = {}) => RS.richRuns(text).map(r => {
      const content = run(r.t, { ...p, b: p.b || r.b, i: p.i || r.i, u: p.u || r.u, s: p.s || r.s });
      return r.url ? `<w:hyperlink r:id="${relationship('hyperlink', r.url, true)}">${content}</w:hyperlink>` : content;
    }).join('');
    const link = (text, url, p = {}) => {
      const safe = RS.safeUrl(url);
      return safe ? `<w:hyperlink r:id="${relationship('hyperlink', safe, true)}">${rich(text, p)}</w:hyperlink>` : rich(text, p);
    };
    const field = (text, f = {}, p = {}) => rich(text, { ...p, b: p.b || f.bold, i: p.i || f.italic, u: p.u || f.underline, s: p.s || f.strike });
    const border = (edge, color, size = 6, style = 'single', space = 0) => `<w:${edge} w:val="${style}" w:sz="${size}" w:space="${space}" w:color="${hex(color)}"/>`;
    // Lines are exact heights, as CSS line-height is (Word's "auto" uses each font's own, taller line).
    // p.lh: an exact height in twips; p.atLeast: a minimum height, for lines holding images;
    // p.line: 240ths of a line, or twips with p.exact.
    const spacing = p => p.line ? `w:line="${round(p.line)}" w:lineRule="${p.exact ? 'exact' : 'auto'}"` : p.atLeast ? `w:line="${round(p.atLeast)}" w:lineRule="atLeast"` : `w:line="${round(p.lh || bodyLine)}" w:lineRule="exact"`;
    const para = (content, p = {}) => `<w:p><w:pPr>${p.heading ? '<w:pStyle w:val="Heading1"/>' : ''}${p.keep ? '<w:keepNext/>' : ''}${p.lines !== false ? '<w:keepLines/>' : ''}${p.pb ? '<w:pageBreakBefore/>' : ''}<w:widowControl/>${p.borders ? `<w:pBdr>${p.borders}</w:pBdr>` : ''}${p.fill ? `<w:shd w:val="clear" w:fill="${hex(p.fill)}"/>` : ''}${p.tabs ? `<w:tabs>${p.tabs}</w:tabs>` : ''}${d.hyphenate === false || p.align != 'justify' ? '<w:suppressAutoHyphens/>' : ''}<w:spacing w:before="${round(p.before || 0)}" w:after="${round(p.after == null ? em * .15 : p.after)}" ${spacing(p)}/>${p.ind || p.hang ? `<w:ind w:left="${round(p.ind || 0)}"${p.hang ? ` w:hanging="${round(p.hang)}"` : ''}/>` : ''}${p.align ? `<w:jc w:val="${p.align === 'justify' ? 'both' : p.align}"/>` : ''}</w:pPr>${content || run('', { sz: 2 })}</w:p>`;
    // A 1pt paragraph: keeps adjacent tables apart and carries vertical gaps (its own height included).
    const empty = (after = 0) => para('', { after: Math.max(0, after - 20), line: 20, exact: true });
    const rightTab = pos => `<w:tab w:val="right" w:pos="${round(pos)}"/>`;
    const table = (cells, sizes, opts = {}) => {
      const total = sizes.reduce((a, b) => a + b, 0);
      const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(edge => `<w:${edge} w:val="nil"/>`).join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>${opts.ind ? `<w:tblInd w:w="${opts.ind}" w:type="dxa"/>` : ''}<w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${sizes.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr>${opts.keep ? '<w:trPr><w:cantSplit/></w:trPr>' : ''}${cells.map((cell, i) => {
        if (typeof cell === 'string') cell = { content: cell };
        if (opts.flow && cell.content) cell = { ...cell, content: cell.content.replace(/<w:pPr>([\s\S]*?)<\/w:pPr>/, (match, props) => {
          // Word otherwise treats a leading keepNext as a request to move the
          // entire multi-page layout row below the banner to a fresh page.
          const clean = props.replace(/<w:keepNext\b[^>]*\/>/g, '');
          return '<w:pPr>' + clean.replace(/^(<w:pStyle\b[^>]*\/>)?/, '$&<w:keepNext w:val="false"/>') + '</w:pPr>';
        }) };
        const pad = cell.pad || [0, 0, 0, 0];
        return `<w:tc><w:tcPr><w:tcW w:w="${sizes[i]}" w:type="dxa"/>${cell.borders ? `<w:tcBorders>${cell.borders}</w:tcBorders>` : ''}${cell.fill ? `<w:shd w:val="clear" w:fill="${hex(cell.fill)}"/>` : ''}<w:tcMar>${['top', 'right', 'bottom', 'left'].map((edge, n) => `<w:${edge} w:w="${round(pad[n])}" w:type="dxa"/>`).join('')}</w:tcMar><w:vAlign w:val="${cell.valign || 'top'}"/></w:tcPr>${cell.content || empty()}${/<\/w:tbl>$/.test(cell.content || '') ? empty() : ''}</w:tc>`;
      }).join('')}</w:tr></w:tbl>`;
    };
    // Rows of equal columns (skill grids). Consecutive one-row tables merge into one in Word.
    const grid = (items, cols, w, gap) => {
      if (cols < 2) return items.join('');
      const cw = round((w - gap * (cols - 1)) / cols), sizes = Array.from({ length: cols }, (_, i) => i < cols - 1 ? cw + gap : w - (cw + gap) * (cols - 1));
      let out = '';
      for (let i = 0; i < items.length; i += cols) {
        const row = items.slice(i, i + cols);
        while (row.length < cols) row.push('');
        out += table(row.map((content, n) => ({ content: content || empty(), pad: [0, n < cols - 1 ? gap : 0, 0, 0] })), sizes, { keep: true });
      }
      return out + empty();
    };

    /* ---------- Images ---------- */
    let drawingId = 0;
    const picture = (rid, cx, cy, name) => `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
    const inlineImage = (rid, cx, cy, name, descr = '', rPr = '') => {
      drawingId++;
      return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${drawingId}" name="${name}"${descr ? ` descr="${esc(descr)}"` : ''}/>${picture(rid, cx, cy, name)}</wp:inline></w:drawing></w:r>`;
    };
    // Colour blocks fixed to the page behind the text: full-bleed sidebars and banners.
    const pageBlock = (rid, x, y, cx, cy, name) => {
      drawingId++;
      return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${drawingId}" behindDoc="1" locked="1" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${round(x * EMU)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${round(y * EMU)}</wp:posOffset></wp:positionV><wp:extent cx="${round(cx * EMU)}" cy="${round(cy * EMU)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${drawingId}" name="${name}"/><wp:cNvGraphicFramePr/>${picture(rid, round(cx * EMU), round(cy * EMU), name)}</wp:anchor></w:drawing></w:r>`;
    };
    const solid = color => png(4, 4, ctx => { ctx.fillStyle = '#' + color; ctx.fillRect(0, 0, 4, 4); });

    let photo = '';
    if (d.showPhoto && /^data:image\//.test(basics.photo || '')) {
      const image = new Image();
      try {
        image.src = basics.photo; await image.decode();
        const b64 = await png(600, 600, ctx => {
          if (d.photoShape === 'circle') { ctx.beginPath(); ctx.arc(300, 300, 300, 0, Math.PI * 2); ctx.clip(); }
          else if (d.photoShape === 'rounded') { ctx.beginPath(); ctx.roundRect(0, 0, 600, 600, 84); ctx.clip(); }
          const crop = Math.min(image.naturalWidth, image.naturalHeight);
          ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, 600, 600);
        });
        const size = round(d.photoSize * 36000);
        photo = inlineImage(relationship('image', media('photo.png', b64)), size, size, 'Resume photo', 'Profile photograph');
      } catch (e) { /* A damaged optional photo must not prevent text export. */ }
    }

    /* ---------- Contact details and their icons ---------- */
    const contacts = [], f0 = basics.formats || {};
    const contact = (key, label, value, url, fmt) => { if (String(value || '').trim()) contacts.push({ key, label, text: value, url, fmt: fmt || {} }); };
    contact('email', 'Email', basics.email, `mailto:${basics.email || ''}`, f0.email);
    contact('phone', 'Phone', basics.phone, `tel:${String(basics.phone || '').replace(/[^\d+]/g, '')}`, f0.phone);
    contact('location', 'Location', basics.location, '', f0.location);
    for (const [key, label] of [['website', 'Web'], ['linkedin', 'LinkedIn'], ['github', 'GitHub']]) contact(key, label, RS.prettyUrl(basics[key]), basics[key], f0[key]);
    (basics.links || []).forEach(l => contact(RS.linkIcon(l), l.label || 'Link', RS.prettyUrl(l.url), l.url, (l.formats || {}).url));
    const iconRel = {}, iconPt = d.fontSize * .92 * 1.05;
    if (d.contactStyle === 'icons') {
      // Icons take the header's accent: the banner/filled-sidebar accent, else the page accent.
      const twoCols = d.columns !== 'one', inBanner = !!d.headerBanner && !(twoCols && d.header === 'sidebar');
      const inFilledSide = twoCols && !inBanner && d.header === 'sidebar' && d.sideStyle === 'filled';
      const tones = [inBanner || inFilledSide ? hex(colors.sideAccent) : theme.accent];
      await Promise.all(contacts.flatMap(c => tones.map(async tone => {
        const id = c.key + '-' + tone;
        if (c.key === 'none' || id in iconRel || !RS.ICONS[c.key]) return;
        iconRel[id] = null;
        try {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#${tone}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${RS.ICONS[c.key]}</svg>`;
          const img = new Image();
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          await img.decode();
          iconRel[id] = relationship('image', media(`icon-${id}.png`, await png(96, 96, ctx => ctx.drawImage(img, 0, 0, 96, 96))));
        } catch (e) { /* fall back to a text symbol */ }
      })));
    }
    // Icon plus the preview's .4em gap, in twips: the hanging indent that keeps wrapped text beside the icon.
    const iconHang = round(iconPt * 20 + em * .92 * .4);
    // hang: end with a tab to the hanging indent instead of a space.
    const iconRun = (key, color, hang = false) => {
      if (key === 'none') return '';
      const rid = iconRel[key + '-' + color], size = round(iconPt * 12700);
      if (!rid) return run(SYMBOL[key] || '↗', { color, font: 'Segoe UI Symbol', sz: round(base * .92) }) + (hang ? tab : run(' ', { sz: round(base * .92) }));
      // Lower the icon so it centres on the text, as the preview's flex row does.
      return inlineImage(rid, size, size, 'icon', '', `<w:position w:val="-${round(iconPt * .42)}"/>`) + (hang ? tab : run(' ', { sz: round(base * .92) }));
    };

    /* ---------- Header ---------- */
    let bannerTop = '';
    const header = (w, palette, where) => {
      const center = where !== 'side' && d.header === 'center', split = where !== 'side' && d.header === 'split';
      const banner = where !== 'side' && d.headerBanner, f = basics.formats || {};
      const p = banner ? { text: hex(colors.sideText), muted: mix(hex(colors.sideText), hex(colors.side), .82), accent: hex(colors.sideAccent), bg: hex(colors.side) } : palette;
      const small = round(base * .92);
      const prefix = c => d.contactStyle === 'icons' ? iconRun(c.key, p.accent) : d.contactStyle === 'labels' ? run(c.label + ': ', { b: true, color: p.text, sz: small }) : '';
      // Word doesn't have CSS overflow-wrap. Give addresses break opportunities so a
      // long email or URL can't push its icon onto a separate line in a narrow sidebar.
      const contactText = c => {
        const text = ['phone', 'location'].includes(c.key) ? c.text : String(c.text).replace(/([/@._?&=+\-])(?=.)/g, '$1\u200b');
        return link(text, c.url, { color: p.muted, sz: small, b: c.fmt.bold, i: c.fmt.italic, u: c.fmt.underline, s: c.fmt.strike });
      };
      const contactLh = em * .92 * d.lineHeight;
      // One contact per line: long emails and URLs wrap beside the icon, not under it.
      const contactLine = (c, align) => {
        const a = c.fmt.align || align, hang = d.contactStyle === 'icons' && c.key !== 'none' && a === 'left';
        return para((hang ? iconRun(c.key, p.accent, true) : prefix(c)) + contactText(c), { align: a, after: em * (where === 'side' ? .4 : .25), lh: contactLh, ind: hang ? iconHang : 0, hang: hang ? iconHang : 0, tabs: hang ? `<w:tab w:val="left" w:pos="${iconHang}"/>` : '' });
      };
      const name = para(field(d.upperName ? String(basics.name || 'Resume').toUpperCase() : basics.name || 'Resume', f.name, { b: d.boldName, h: true, sz: round(base * d.nameSize * (where === 'side' ? .78 : 1)), color: p.text, sp: d.upperName ? round(d.fontSize * d.nameSize * 1.2) : 0 }), { align: (f.name || {}).align || (center ? 'center' : 'left'), after: em * .2, keep: true, line: round(em * d.nameSize * (where === 'side' ? .78 : 1) * 1.15), exact: true });
      const title = basics.title ? para(field(basics.title, f.title, { h: true, color: p.accent, sz: round(base * (where === 'side' ? 1.05 : 1.2)) }), { align: (f.title || {}).align || (center ? 'center' : 'left'), after: em * .7, keep: true, lh: em * (where === 'side' ? 1.05 : 1.2) * d.lineHeight }) : '';
      const id = name + title;
      let result;
      if (split) {
        const cw = round(w * .4), pw = photo ? round(d.photoSize * 1440 / 25.4 + em) : 0;
        const cells = [{ content: id, valign: 'center' }, { content: contacts.map(c => contactLine(c, 'right')).join(''), valign: 'center' }];
        const sizes = [w - cw - pw, cw];
        if (photo) { cells.unshift({ content: para(photo, { atLeast: bodyLine }), valign: 'center' }); sizes.unshift(pw); }
        result = table(cells, sizes, { keep: true });
      } else {
        let identity = id;
        if (photo) identity = center || where === 'side' ? para(photo, { align: 'center', keep: true, after: em * .5, atLeast: bodyLine }) + id : table([{ content: id, valign: 'center' }, { content: para(photo, { align: 'right', atLeast: bodyLine }), valign: 'center' }], [w - round(d.photoSize * 1440 / 25.4 + em), round(d.photoSize * 1440 / 25.4 + em)], { keep: true }) + empty();
        const content = where === 'side' || contacts.some(c => c.fmt.align) ? contacts.map(c => contactLine(c, where === 'side' ? 'left' : center ? 'center' : 'left')).join('') : para(contacts.map(c => prefix(c) + contactText(c)).join(run(d.contactStyle === 'pipes' ? '  |  ' : '  ', { color: p.muted, sz: small })), { align: center ? 'center' : 'left', after: 0, lh: contactLh * 1.18 });
        result = identity + content;
      }
      const gap = em * d.sectionGap;
      if (!banner) return result + empty(gap);
      // Full-bleed banner: the table reaches the page edges, and a colour block fills the top margin.
      bannerTop = 'pending';
      return table([{ content: result, fill: p.bg, pad: [margin * .05, margin, margin * 1.05, margin] }], [pageW], { keep: true, ind: -margin }) + empty(gap);
    };

    /* ---------- Sections ---------- */
    const heading = (sec, p, first, side = false) => {
      const fmt = (sec.formats || {}).title || {}, style = d.heading;
      const upper = d.upperHeadings || style === 'caps';
      let text = upper ? String(sec.title || '').toUpperCase() : sec.title || '';
      let color = style === 'plain' ? p.text : p.accent;
      const props = { heading: true, keep: true, pb: sec.pageBreak, before: first ? 0 : em * d.sectionGap, after: em * .5, align: fmt.align || (style === 'boxed' ? 'center' : 'left') };
      if (style === 'line' || style === 'side') props.borders = border('bottom', p.accent, 4, 'single', 3);
      if (style === 'double') props.borders = border('bottom', p.accent, 6, 'double', 3);
            // Bars sit at the paragraph's edge, as in the preview (border, then padding, then text).
      if (style === 'bar') { props.borders = border('left', p.accent, round(d.fontSize * .28 * 8), 'single', round(d.fontSize * .55)); props.ind = em * .83; }
      if (style === 'ribbon') {
        const fill = mix(p.accent, side ? p.bg : theme.bg, side ? .13 : .10), padY = round(d.fontSize * .4);
        props.fill = fill; props.ind = em * .87;
        props.borders = border('top', fill, 4, 'single', padY) + border('left', p.accent, round(d.fontSize * .22 * 8), 'single', round(d.fontSize * .65)) + border('bottom', fill, 4, 'single', padY) + border('right', fill, 4, 'single', round(d.fontSize * .65));
      }
      if (style === 'boxed') props.borders = ['top', 'left', 'bottom', 'right'].map(edge => border(edge, p.accent, 4, 'single', 3)).join('');
      if (style === 'dot') text = '● ' + text;
      if (style === 'bracket') text = '[ ' + text + ' ]';
      if (style === 'block') {
        text = ' ' + text + ' ';
        color = side && d.sideStyle === 'filled' ? (RS.isDark(colors.side) ? '111111' : p.bg) : 'FFFFFF';
      }
      const size = d.headingSize * (style === 'caps' ? .85 : upper ? .92 : 1);
      const content = field(text, fmt, { h: true, b: true, color, sz: round(base * size), sp: upper || style === 'double' ? round(d.fontSize * size * 2) : 0, u: style === 'underline', shade: style === 'block' ? p.accent : undefined });
      const boxedIn = ['bar', 'ribbon', 'boxed', 'block'].includes(style);
      const spacer = boxedIn && props.before ? para('', { after: Math.max(0, props.before - 20), line: 20, exact: true, pb: props.pb }) : '';
      if (spacer) Object.assign(props, { before: 0, pb: false });
      if (style !== 'caps') return spacer + para(content, { ...props, lh: em * d.headingSize * 1.2 });
      return para(content, { ...props, after: em * .35 * size, lh: em * d.headingSize * 1.2 }) + para(run('━━', { color: p.accent, sz: 12 }), { keep: true, after: em * .5, line: 60, exact: true });
    };
    const bullet = { disc: '•', dash: '–', arrow: '▸', check: '✓', square: '▪', none: '' }[d.bullet] ?? '•';
    const description = (text, fmt, p, keepLast = false) => {
      const list = RS.blocks(text), hang = round(em * 1.05);
      return list.map((block, index) => {
        const last = index === list.length - 1;
        // Bullet, then a tab to the hanging indent, so wrapped lines line up with the text.
        const mark = block.li && bullet ? run(bullet, { color: p.accent, b: true }) + tab : '';
        const after = last ? 0 : em * (block.li ? .15 : .35);
        return para(mark + field(block.text, fmt, { color: p.text }), { align: (fmt || {}).align || (d.justify ? 'justify' : 'left'), keep: !last || keepLast, lines: !!block.li, after, ind: mark ? hang : 0, hang: mark ? hang : 0 });
      }).join('');
    };
    const entry = (sec, item, p, w, side, last) => {
      const e = (RS.NORMALISE[sec.type] || RS.NORMALISE.custom)(item), f = RS.entryFormats(sec.type, item);
      const timeline = d.itemStyle === 'timeline', dateLeft = !side && (d.itemStyle === 'dates-left' || d.dateAlign === 'before');
      const sideCard = side && d.itemStyle === 'cards';
      const boxed = d.itemStyle === 'bordered' || (!side && d.itemStyle === 'cards'), pad = boxed ? round(em * .8) : 0;
      const inner = w - pad * 2 - (timeline ? round(em * 1.4) : 0) - (dateLeft ? round(em * 8.2) : 0);
      const dateRun = e.date ? field(e.date, f.date, { color: d.dateAlign === 'accent' ? p.accent : p.muted, b: d.dateAlign === 'accent', sz: round(base * .9) }) : '';
      const date = e.date ? para(dateRun, { align: (f.date || {}).align || 'left', after: 0, keep: true }) : '';
      const titleText = field(e.title || '', f.title, { h: true, b: true, color: p.text, sz: round(base * 1.05) });
      const subRun = e.sub ? field(e.sub, f.sub, { b: true, color: p.accent, sz: round(base * .95) }) : '';
      const meta = [e.meta ? field(e.meta, f.meta, { color: p.muted, sz: round(base * .9) }) : '', e.link ? link(RS.prettyUrl(e.link), e.link, { color: p.accent, sz: round(base * .9) }) : ''].filter(Boolean).join(run(' · ', { color: p.muted, sz: round(base * .9) }));
      const descText = e.desc && String(e.desc).trim() ? description(e.desc, f.desc, p) : '';
      // Heading rows; the last one carries the gap before the description (.3em in the preview).
      const rows = [[titleText + (!dateLeft && !side && dateRun ? tab + dateRun : ''), { align: (f.title || {}).align, tabs: rightTab(inner) }]];
      if (side) {
        if (subRun) rows.push([subRun, { align: (f.sub || {}).align }]);
        if (meta) rows.push([meta, { align: (f.meta || {}).align }]);
        if (dateRun) rows.push([dateRun, { align: (f.date || {}).align }]);
      } else if (subRun || meta) rows.push([subRun + (meta ? tab + meta : ''), { align: (f.sub || {}).align, tabs: rightTab(inner) }]);
      let content = rows.map(([text, props], n) => para(text, { ...props, keep: true, lh: n ? undefined : em * 1.05 * d.lineHeight, after: n === rows.length - 1 && descText ? em * .3 : 0 })).join('') + descText;
      const gap = last ? 0 : em * d.itemGap;
      if (d.itemStyle === 'inline') {
        const joined = [titleText, subRun, dateRun, meta].filter(Boolean).join(run(', ', { color: p.muted }));
        content = table([para(joined, { keep: !!descText, after: descText ? em * .3 : 0 }) + descText], [w], { keep: true }) + empty(gap);
      }
      else if (timeline) content = table([{ content: para(run('○', { color: p.accent, font: 'Segoe UI Symbol', b: true }), { keep: true }), borders: border('left', mix(p.accent, p.bg, .3), 12), pad: [0, 0, 0, 40] }, { content, pad: [0, 0, round(last ? em * .1 : gap), 0] }], [round(em * 1.4), w - round(em * 1.4)], { keep: true }) + empty();
      else if (dateLeft) content = table([date, content], [round(em * 8.2), w - round(em * 8.2)], { keep: true }) + empty(gap);
      else if (boxed) content = table([{ content, pad: [round(em * .7), pad, round(em * .7), pad], fill: d.itemStyle === 'cards' ? mix(p.accent, p.bg, .07) : undefined, borders: d.itemStyle === 'cards' ? border('left', p.accent, 18) : ['top', 'left', 'bottom', 'right'].map(edge => border(edge, mix(p.accent, p.bg, .35), 4)).join('') }], [w], { keep: true }) + empty(gap);
      else if (sideCard) content = table([{ content, pad: [0, 0, 0, round(em * .7)], borders: border('left', p.accent, 12) }], [w], { keep: true }) + empty(gap);
      else content = table([content], [w], { keep: true }) + empty(gap);
      // Ruled entries: a fine line between entries, with the entry gap on both sides.
      if (d.itemStyle === 'ruled' && !last) content += para('', { after: gap, line: 20, exact: true, borders: border('bottom', mix(p.accent, p.bg, .25), 4) });
      // Word ignores pageBreakBefore inside a table. Keep the break outside the entry.
      return (item.pageBreak ? para('', { pb: true, keep: true, after: 0, line: 20, exact: true }) : '') + content;
    };
    const skills = (sec, p, w, side) => {
      const items = (sec.items || []).filter(i => !i.hidden && String(i.name || '').trim());
      let style = d.skillStyle;
      if (['bars', 'dots'].includes(style) && !items.some(i => +i.level > 0)) style = 'list';
      if (sec.type === 'interests' && ['bars', 'dots'].includes(style)) style = 'tags';
      const small = round(base * .88), fmtOf = i => i.formats || {};
      if (style === 'tags') {
        const fill = side && d.sideStyle === 'filled' ? mix(p.text, p.bg, .14) : mix(theme.accent, theme.bg, .12);
        const tag = (text, fmt, detail = '', detailFmt = {}) => field('\u2009' + text, fmt, { color: p.text, sz: round(base * .9), shade: fill }) +
          (detail ? field(' ' + detail, detailFmt, { color: p.muted, sz: round(base * .9 * .85), shade: fill }) : '') + run('\u2009', { shade: fill, sz: round(base * .9) });
        const grouped = items.some(i => i.keywords);
        if (grouped) return items.map((i, n) => {
          const f = fmtOf(i), keywords = String(i.keywords || '').split(',').map(s => s.trim()).filter(Boolean);
          return para(field(i.name, f.name, { b: true, color: p.text }), { keep: !!keywords.length, after: keywords.length ? em * .25 : 0 }) +
            (keywords.length ? para(keywords.map(k => tag(k, f.keywords)).join(run('  ')), { after: 0, lh: bodyLine * 1.1 }) : '') +
            (n < items.length - 1 ? empty(em * .55) : '');
        }).join('');
        return para(items.map(i => tag(i.name, fmtOf(i).name, i.fluency, fmtOf(i).fluency)).join(run('  ')), { after: 0, lh: bodyLine * 1.1 });
      }
      if (style === 'inline') {
        if (items.some(i => i.keywords)) return items.map((i, n) => para(field(i.name + (i.keywords ? ':' : ''), fmtOf(i).name, { b: true, color: p.text }) + (i.keywords ? field(' ' + i.keywords, fmtOf(i).keywords, { color: p.text }) : ''), { after: n < items.length - 1 ? em * .25 : 0 })).join('');
        return para(items.map(i => {
          return field(i.name, fmtOf(i).name, { color: p.text }) + (i.fluency ? field(' (' + i.fluency + ')', fmtOf(i).fluency, { color: p.text }) : '');
        }).join(run(' · ', { color: p.accent })), { after: 0 });
      }
      // The preview lays skills out in a grid in the main column, one per row in the sidebar.
      const colGap = round(em * (style === 'list' ? 1.2 : style === 'grid' ? 1.4 : 1.6));
      const cols = side ? 1 : style === 'list' ? Math.max(1, Math.floor((w + colGap) / (em * 11 + colGap))) : 2;
      const cw = cols > 1 ? round((w - colGap * (cols - 1)) / cols) : w;
      const extraOf = i => i.keywords || i.fluency || '';
      const extraRun = i => field(extraOf(i), fmtOf(i)[i.keywords ? 'keywords' : 'fluency'], { color: p.muted, sz: small });
      const barRow = level => {
        const cell = shade => ({ fill: shade, content: para('', { after: 0, line: round(em * .38), exact: true }) });
        const fill = round(cw * level / 5);
        return table(level === 5 ? [cell(p.accent)] : [cell(p.accent), cell(mix(p.accent, p.bg, .2))], level === 5 ? [cw] : [fill, cw - fill], { keep: true });
      };
      const cells = items.map(i => {
        const level = Math.max(0, Math.min(5, round(+i.level || 0))), name = field(i.name, fmtOf(i).name, { color: p.text });
        if (style === 'bars') return para(name + (extraOf(i) ? tab + extraRun(i) : ''), { tabs: rightTab(cw), keep: level > 0, after: level ? em * .25 : 0 }) + (level ? barRow(level) : '');
        if (style === 'dots') {
          const dots = level ? run('●'.repeat(level), { color: p.accent, font: 'Segoe UI Symbol', sz: round(base * .7), sp: 10 }) + run('●'.repeat(5 - level), { color: mix(p.accent, p.bg, .22), font: 'Segoe UI Symbol', sz: round(base * .7), sp: 10 }) : '';
          return para(name + (dots ? tab + dots : ''), { tabs: rightTab(cw), keep: !!extraOf(i), after: 0 }) + (extraOf(i) ? para(extraRun(i), { after: 0 }) : '');
        }
        // list / grid: a square marker, the name and any detail (inline in a main-column list).
        const marker = run('▪', { color: p.accent }) + run('\u2002', {});
        const inlineDetail = !side && style === 'list';
        const detail = !extraOf(i) ? '' : inlineDetail ? field(' — ' + extraOf(i), fmtOf(i)[i.keywords ? 'keywords' : 'fluency'], { color: p.muted, sz: small }) : tab + extraRun(i);
        return para(marker + name + detail, { tabs: inlineDetail ? '' : rightTab(cw), after: 0 });
      });
      const gapAfter = style === 'bars' || style === 'dots' ? em * .5 : em * .25;
      const lastRow = Math.floor((cells.length - 1) / cols) * cols;
      const spaced = cells.map((c, n) => n < lastRow ? c + empty(gapAfter) : c);
      if (cols === 1) return spaced.join('');
      return grid(spaced, cols, w, colGap);
    };
    const SKILL_TYPES = ['skills', 'languages', 'interests'];
    const section = (sec, p, w, side, first) => {
      const visible = (sec.items || []).filter(i => {
        if (i.hidden) return false;
        if (SKILL_TYPES.includes(sec.type)) return String(i.name || '').trim();
        const e = (RS.NORMALISE[sec.type] || RS.NORMALISE.custom)(i);
        return e.title || e.sub || e.desc;
      });
      if (sec.type === 'text' ? !String(sec.content || '').trim() : !visible.length) return '';
      const hw = !side && d.heading === 'side' ? round(w * .2) : 0;
      if (hw && !sec._splitBreaks && visible.some(i => i.pageBreak)) {
        const groups = [];
        let group = [];
        for (const item of visible) {
          if (item.pageBreak && group.length) { groups.push(group); group = []; }
          group.push(item);
        }
        if (group.length) groups.push(group);
        return groups.map((items, n) => section({ ...sec, items: items.map(i => ({ ...i, pageBreak: false })), _splitBreaks: true, _continued: n > 0, pageBreak: n > 0 || sec.pageBreak || !!items[0].pageBreak }, p, w, side, first && n === 0)).join('');
      }
      const contentW = w - hw - (hw ? round(em * 2.4) : 0);
      const content = sec.type === 'text' ? description(sec.content, (sec.formats || {}).content, p) : SKILL_TYPES.includes(sec.type) ? skills(sec, p, contentW, side) : visible.map((i, n) => entry(sec, i, p, contentW, side, n === visible.length - 1)).join('');
      if (sec._continued && !hw) return content;
      if (!hw) return heading(sec, p, first, side) + content;
      const head = sec._continued ? empty() : heading({ ...sec, pageBreak: false }, p, true).replace(/<w:jc w:val="left"\/>/, '<w:jc w:val="right"/>').replace(/<w:pBdr>[\s\S]*?<\/w:pBdr>/, '');
      return (sec.pageBreak ? para('', { pb: true, after: 0, line: 20, exact: true }) : first ? '' : empty(em * d.sectionGap)) + table([{ content: head, pad: [0, round(em * 1.2), 0, 0] }, { content, pad: [0, 0, 0, round(em * 1.2)], borders: border('left', mix(p.accent, p.bg, .4), 4) }], [hw + round(em * 1.2), w - hw - round(em * 1.2)]) + empty();
    };
    const column = (list, p, w, side, startsAfterHeader) => {
      let out = '', first = !startsAfterHeader;
      for (const s of list) {
        const html = section(s, p, w, side, first || s._continued);
        if (html) { out += html; first = false; }
      }
      return out;
    };

    /* ---------- Body ---------- */
    const sections = (data.sections || []).filter(s => s.visible !== false);
    const two = d.columns !== 'one', banner = !!d.headerBanner && !(two && d.header === 'sidebar'), filled = two && ['filled', 'tint'].includes(d.sideStyle);
    const headWhere = two && !banner && d.header === 'sidebar' ? 'side' : two && !banner && filled ? 'main' : 'top';
    let body = headWhere === 'top' ? header(width, theme, 'top') : '';
    let band = null;
    if (!two) body += column(sections, theme, width, false, false);
    else {
      const sw = Math.max(20, Math.min(45, +d.sideWidth || 32));
      // The preview's sidebar is a share of the whole page; the table sits inside the margins.
      const bandW = round(pageW * sw / 100), sideCell = bandW - margin, mainCell = width - sideCell;
      const sidePad = round(margin * .65), mainPad = round(margin * .75);
      const sideBg = d.sideStyle === 'filled' ? hex(colors.side) : d.sideStyle === 'tint' ? mix(theme.accent, theme.bg, .09) : theme.bg;
      const palette = { bg: sideBg, text: d.sideStyle === 'filled' ? hex(colors.sideText) : theme.text, accent: d.sideStyle === 'filled' ? hex(colors.sideAccent) : theme.accent, muted: d.sideStyle === 'filled' ? mix(hex(colors.sideText), sideBg, .72) : theme.muted };
      if (filled) band = { color: sideBg, x: d.columns === 'left' ? 0 : pageW - bandW, w: bandW };
      const sideW = sideCell - sidePad, mainW = mainCell - mainPad;
      // A filled sidebar cell reaches into the page margin. Word fades the header's full-height
      // colour block on screen, so the cell's own fill keeps the margin strip in full colour.
      const bleed = filled ? margin : 0;
      // Word ignores pageBreakBefore inside table cells. Split the column layout
      // at explicit breaks and place the page break between native tables.
      const partition = list => {
        const parts = [[]];
        const cut = () => parts.push([]);
        const push = s => parts[parts.length - 1].push(s);
        for (const sec of list) {
          if (sec.pageBreak) cut();
          if (sec.type === 'text' || SKILL_TYPES.includes(sec.type)) { push({ ...sec, pageBreak: false }); continue; }
          let group = [], continued = false;
          for (const item of (sec.items || []).filter(i => !i.hidden)) {
            if (item.pageBreak) {
              if (group.length) { push({ ...sec, items: group, pageBreak: false, _continued: continued }); group = []; continued = true; }
              // A section and its first entry share one requested page break.
              if (!sec.pageBreak || continued) cut();
            }
            group.push({ ...item, pageBreak: false });
          }
          if (group.length) push({ ...sec, items: group, pageBreak: false, _continued: continued });
        }
        return parts;
      };
      const sideParts = partition(sections.filter(s => s.col === 'side'));
      const mainParts = partition(sections.filter(s => s.col !== 'side'));
      const left = d.columns === 'left';
      for (let part = 0; part < Math.max(sideParts.length, mainParts.length); part++) {
        if (part) body += para('', { pb: true, after: 0, line: 20, exact: true });
        const sideHead = !part && headWhere === 'side', mainHead = !part && headWhere === 'main';
        const side = { content: (sideHead ? header(sideW, palette, 'side') : '') + column(sideParts[part] || [], palette, sideW, true, sideHead), fill: filled ? sideBg : undefined, pad: left ? [0, sidePad, 0, bleed] : [0, bleed, 0, sidePad], borders: d.sideStyle === 'rule' ? border(left ? 'right' : 'left', mix(theme.muted, theme.bg, .35), 4) : '' };
        const main = { content: (mainHead ? header(mainW, theme, 'main') : '') + column(mainParts[part] || [], theme, mainW, false, mainHead), pad: left ? [0, 0, 0, mainPad] : [0, mainPad, 0, 0] };
        body += table(left ? [side, main] : [main, side], left ? [sideCell + bleed, mainCell] : [mainCell, sideCell + bleed], { flow: true, ind: left ? -bleed : 0 }) + empty();
      }
    }
    if (bannerTop) {
      // Colour the top margin above the banner on the first page.
      const rid = relationship('image', media('banner.png', await solid(hex(colors.side))));
      body = para(pageBlock(rid, 0, 0, pageW, margin + 40, 'Banner'), { after: 0, line: 20, exact: true }) + body;
    }

    /* ---------- Package ---------- */
    const parts = [['document', 'document.main'], ['styles', 'styles'], ['settings', 'settings'], ['fontTable', 'fontTable']];
    let headerRef = '';
    if (band) {
      // A header repeats on every page, so the sidebar colour runs the full height of each one.
      zip.file('word/media/band.png', await solid(band.color), { base64: true });
      drawingId++;
      const blockId = drawingId;
      const block = `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="1" behindDoc="1" locked="1" layoutInCell="0" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${round(band.x * EMU)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${round(band.w * EMU)}" cy="${round(pageH * EMU)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${blockId}" name="Sidebar"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${blockId}" name="band.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${round(band.w * EMU)}" cy="${round(pageH * EMU)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
      zip.file('word/header1.xml', `${XML}<w:hdr ${NS}><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>${block}</w:p></w:hdr>`);
      zip.file('word/_rels/header1.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/image" Target="media/band.png"/></Relationships>`);
      headerRef = `<w:headerReference w:type="default" r:id="${relationship('header', 'header1.xml')}"/>`;
      parts.push(['header1', 'header']);
    }
    const hasJustifiedField = [basics, ...sections, ...sections.flatMap(s => s.items || [])].some(o => Object.values(o.formats || {}).some(f => f.align === 'justify'));
    const fontRels = [];
    const embeds = name => (embedded[name] ? embedded[name].files : []).sort((a, b) => Object.keys(STYLE).indexOf(a.style) - Object.keys(STYLE).indexOf(b.style)).map(({ style, bytes }) => {
      const key = fontKey(), id = `rId${fontRels.length + 1}`, file = `font${fontRels.length + 1}.odttf`;
      zip.file('word/fonts/' + file, obfuscate(bytes, key));
      fontRels.push(`<Relationship Id="${id}" Type="${R}/font" Target="fonts/${file}"/>`);
      return `<w:embed${style} r:id="${id}" w:fontKey="${key}"/>`;
    }).join('');
    const settings = `${XML}<w:settings xmlns:w="${W}">${Object.keys(embedded).length ? '<w:embedTrueTypeFonts/>' : ''}<w:autoHyphenation w:val="${d.hyphenate !== false && (d.justify || hasJustifiedField) ? 'true' : 'false'}"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
    const styles = `${XML}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr>${fonts({})}<w:color w:val="${theme.text}"/><w:sz w:val="${base}"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="${bodyLine}" w:lineRule="exact"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>`;
    const fontTable = `${XML}<w:fonts xmlns:w="${W}" xmlns:r="${R}">${[...new Set([font, headingFont, 'Segoe UI Symbol'])].map(name => `<w:font w:name="${esc(name)}"><w:altName w:val="${esc(fallback(name))}"/>${embeds(name)}</w:font>`).join('')}</w:fonts>`;
    const documentXml = `${XML}<w:document ${NS}><w:background w:color="${theme.bg}"/><w:body>${body}<w:sectPr>${headerRef}<w:pgSz w:w="${pageW}" w:h="${pageH}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    for (const [name, content] of [['document', documentXml], ['styles', styles], ['settings', settings], ['fontTable', fontTable]]) {
      zip.file(`word/${name}.xml`, content);
      if (name !== 'document') relationship(name, `${name}.xml`);
    }
    if (fontRels.length) zip.file('word/_rels/fontTable.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${fontRels.join('')}</Relationships>`);
    zip.file('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`);
    zip.file('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
    zip.file('docProps/core.xml', `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc((basics.name || 'Resume') + ' – Resume')}</dc:title><dc:creator>${esc(basics.name)}</dc:creator></cp:coreProperties>`);
    zip.file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${fontRels.length ? '<Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>' : ''}${parts.map(([name, type]) => `<Override PartName="/word/${name}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
  };
})();
