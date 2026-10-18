/* Resume Studio: turns a resume document into HTML. All user text is escaped here. */
(function () {
  const RS = window.RS;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RS.esc = esc;

  // Only http(s), mailto and tel links survive; bare domains get https://.
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(mailto|tel):/i.test(u)) return u;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    return /^https?:\/\//i.test(u) ? u : '';
  }
  const prettyUrl = u => String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  RS.safeUrl = safeUrl;

  // Parse user text before escaping each run; generated markup is never re-parsed.
  function inline(s) {
    return RS.richRuns(s).map(r => {
      let html = esc(r.t);
      if (r.b) html = `<strong>${html}</strong>`;
      if (r.i) html = `<em>${html}</em>`;
      if (r.u) html = `<u>${html}</u>`;
      if (r.s) html = `<s>${html}</s>`;
      return r.url ? `<a href="${esc(r.url)}">${html}</a>` : html;
    }).join('');
  }
  RS.inline = inline;
  function md(text) {
    let out = '', list = false;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) { if (list) { out += '</ul>'; list = false; } continue; }
      const m = line.match(/^[-*•–]\s+(.*)$/);
      if (m) {
        if (!list) { out += '<ul>'; list = true; }
        out += '<li>' + inline(m[1]) + '</li>';
      } else {
        if (list) { out += '</ul>'; list = false; }
        out += '<p>' + inline(line) + '</p>';
      }
    }
    if (list) out += '</ul>';
    return out;
  }
  RS.md = md;
  RS.NORMALISE = null; // set below

  const range = i => {
    const end = i.current ? 'Present' : i.end;
    return (i.start && end) ? `${i.start} – ${end}` : (i.start || end || '');
  };

  const NORMALISE = {
    experience: i => ({ title: i.position, sub: i.company, meta: i.location, date: range(i), desc: i.description }),
    education: i => ({ title: i.degree, sub: i.school, meta: i.location, date: range(i), desc: i.description }),
    projects: i => ({ title: i.name, sub: i.role, link: i.link, date: range(i), desc: i.description }),
    volunteer: i => ({ title: i.role, sub: i.organisation, meta: i.location, date: range(i), desc: i.description }),
    awards: i => ({ title: i.title, sub: i.issuer, date: i.date, desc: i.description }),
    publications: i => ({ title: i.title, sub: i.publisher, date: i.date, link: i.link, desc: i.description }),
    certifications: i => ({ title: i.name, sub: i.issuer, meta: i.credential, date: i.date, link: i.link, desc: i.description }),
    references: i => ({ title: i.name, sub: i.role, meta: i.contact, desc: i.description }),
    custom: i => ({ title: i.title, sub: i.subtitle, meta: i.location, date: range(i), link: i.link, desc: i.description }),
  };

  /* ---------- Icons (simple strokes, currentColor) ---------- */
  const ICON = {
    email: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
    location: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    github: '<path d="M9 19c-4 1.3-4-2-6-2.5m12 5v-3.5a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 0 0-1.3-3.3 4.5 4.5 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 1.6 5.8 1.9 5.8 1.9a4.5 4.5 0 0 0-.1 3.3A4.8 4.8 0 0 0 4.4 8.5c0 4.8 3 5.9 5.8 6.2a3 3 0 0 0-.8 2.3V22"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  const icon = k => `<svg class="rs-ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.link}</svg>`;
  const LABEL = { email: 'Email', phone: 'Phone', location: 'Location', website: 'Web', linkedin: 'LinkedIn', github: 'GitHub' };

  function contacts(b, d) {
    const list = [];
    const add = (k, text, href, label, format) => { if (String(text || '').trim()) list.push({ k, text: String(text).trim(), href, label: label || LABEL[k], format: format || (b.formats || {})[k] || {} }); };
    add('email', b.email, b.email && 'mailto:' + String(b.email).trim());
    add('phone', b.phone, b.phone && 'tel:' + String(b.phone).replace(/[^\d+]/g, ''));
    add('location', b.location, '');
    add('website', b.website && prettyUrl(b.website), b.website && safeUrl(b.website));
    add('linkedin', b.linkedin && prettyUrl(b.linkedin), b.linkedin && safeUrl(b.linkedin));
    add('github', b.github && prettyUrl(b.github), b.github && safeUrl(b.github));
    (b.links || []).forEach(l => add('link', l.url ? prettyUrl(l.url) : '', safeUrl(l.url), l.label || 'Link', (l.formats || {}).url));
    if (!list.length) return '';
    const st = d.contactStyle;
    // Allow line breaks after @ and /, instead of mid-word.
    const soft = s => esc(s).replace(/(@|\/)/g, '$1<wbr>');
    const items = list.map(c => {
      const text = c.href ? `<a href="${esc(c.href)}">${soft(c.text)}</a>` : soft(c.text);
      const pre = st === 'icons' ? icon(c.k) : st === 'labels' ? `<b class="rs-clabel">${esc(c.label)}:</b> ` : '';
      const alignment = ['left', 'center', 'right', 'justify'].includes(c.format.align) ? `;flex-basis:100%;justify-content:${{ left: 'flex-start', center: 'center', right: 'flex-end', justify: 'space-between' }[c.format.align]}` : '';
      return `<li style="${RS.formatStyle(c.format)}${alignment}">${pre}<span>${text}</span></li>`;
    }).join('');
    return `<ul class="rs-contact rs-contact-${st}">${items}</ul>`;
  }

  function header(b, d, where) {
    const photo = d.showPhoto && /^data:image\//.test(b.photo || '') ? `<div class="rs-photo rs-photo-${d.photoShape}"><img src="${esc(b.photo)}" alt=""></div>` : '';
    const name = `<h1 class="rs-name"${RS.formatAttr((b.formats || {}).name)}>${inline(b.name || '')}</h1>`;
    const title = b.title ? `<div class="rs-jobtitle"${RS.formatAttr((b.formats || {}).title)}>${inline(b.title)}</div>` : '';
    const contact = contacts(b, d);
    const style = where === 'side' ? 'side' : d.header;
    if (style === 'split') {
      return `<header class="rs-header rs-h-split">${photo}<div class="rs-head-id">${name}${title}</div><div class="rs-head-contact">${contact}</div></header>`;
    }
    return `<header class="rs-header rs-h-${style}">${photo}<div class="rs-head-id">${name}${title}</div>${contact}</header>`;
  }

  /* ---------- Sections ---------- */
  function entry(e, d) {
    const f = e.formats || {};
    const href = e.link ? safeUrl(e.link) : '';
    const link = href ? `<a class="rs-link" href="${esc(href)}"${RS.formatAttr(f.link)}>${esc(prettyUrl(e.link))}</a>` : '';
    const date = e.date ? `<div class="rs-date"${RS.formatAttr(f.date)}>${inline(e.date)}</div>` : '';
    const sub = e.sub ? `<div class="rs-sub"${RS.formatAttr(f.sub)}>${inline(e.sub)}</div>` : '';
    const metaParts = [e.meta ? inline(e.meta) : '', link].filter(Boolean);
    const meta = metaParts.length ? `<div class="rs-meta"${RS.formatAttr(f.meta)}>${metaParts.join(' · ')}</div>` : '';
    const desc = e.desc && String(e.desc).trim() ? `<div class="rs-desc"${RS.formatAttr(f.desc)}>${md(e.desc)}</div>` : '';
    const left = d.itemStyle === 'dates-left';
    return `<div class="rs-item${e.pageBreak ? ' rs-break' : ''}"${e.id ? ` data-item="${esc(e.id)}"` : ''}>${left ? `<div class="rs-when">${date}</div>` : ''}<div class="rs-item-body">` +
      `<div class="rs-row"><div class="rs-title"${RS.formatAttr(f.title)}>${inline(e.title || '')}</div>${left ? '' : date}</div>` +
      (sub || meta ? `<div class="rs-row rs-row2">${sub}${meta}</div>` : '') + desc + `</div></div>`;
  }

  function meter(level, style) {
    const lv = Math.max(0, Math.min(5, Math.round(+level || 0)));
    if (!lv) return '';
    if (style === 'bars') return `<div class="rs-bar" role="img" aria-label="${lv} of 5"><span style="width:${lv * 20}%"></span></div>`;
    let dots = '';
    for (let n = 1; n <= 5; n++) dots += `<i class="${n <= lv ? 'on' : ''}"></i>`;
    return `<div class="rs-dots" role="img" aria-label="${lv} of 5">${dots}</div>`;
  }

  function skills(sec, d) {
    const items = (sec.items || []).filter(i => !i.hidden && String(i.name || '').trim());
    if (!items.length) return '';
    const text = (i, key, value) => `<span class="rs-field-text"${RS.formatAttr((i.formats || {})[key])}>${inline(value || '')}</span>`;
    const extra = i => i.keywords || i.fluency || '';
    let st = d.skillStyle;
    const anyLevel = items.some(i => +i.level > 0);
    if ((st === 'bars' || st === 'dots') && !anyLevel) st = 'list';
    if (sec.type === 'interests' && (st === 'bars' || st === 'dots')) st = 'tags';
    if (st === 'tags') {
      const grouped = items.some(i => i.keywords);
      if (grouped) {
        return `<div class="rs-skill-groups">${items.map(i => `<div class="rs-sgroup"><div class="rs-sname">${text(i, 'name', i.name)}</div>${i.keywords ? `<div class="rs-tags">${String(i.keywords).split(',').map(k => k.trim()).filter(Boolean).map(k => `<span class="rs-tag">${text(i, 'keywords', k)}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
      }
      return `<div class="rs-tags">${items.map(i => `<span class="rs-tag">${text(i, 'name', i.name)}${i.fluency ? ` <small>${text(i, 'fluency', i.fluency)}</small>` : ''}</span>`).join('')}</div>`;
    }
    if (st === 'inline') {
      const grouped = items.some(i => i.keywords);
      if (grouped) return `<div class="rs-inline-groups">${items.map(i => `<p><strong>${text(i, 'name', i.name)}${i.keywords ? ':' : ''}</strong> ${text(i, 'keywords', i.keywords)}</p>`).join('')}</div>`;
      return `<p class="rs-inline">${items.map(i => text(i, 'name', i.name) + (i.fluency ? ` (${text(i, 'fluency', i.fluency)})` : '')).join('<span class="rs-sep"> · </span>')}</p>`;
    }
    if (st === 'bars' || st === 'dots') {
      return `<div class="rs-meters rs-meters-${st}">${items.map(i => `<div class="rs-skill"><div class="rs-skill-top"><span class="rs-sname">${text(i, 'name', i.name)}</span>${extra(i) ? `<span class="rs-sextra">${text(i, i.keywords ? 'keywords' : 'fluency', extra(i))}</span>` : ''}</div>${meter(i.level, st)}</div>`).join('')}</div>`;
    }
    // list / grid
    return `<ul class="rs-slist ${st === 'grid' ? 'rs-sgrid' : ''}">${items.map(i => `<li><span class="rs-sname">${text(i, 'name', i.name)}</span>${extra(i) ? `<span class="rs-sextra">${text(i, i.keywords ? 'keywords' : 'fluency', extra(i))}</span>` : ''}</li>`).join('')}</ul>`;
  }

  function sectionBody(sec, d) {
    if (sec.type === 'text') return String(sec.content || '').trim() ? `<div class="rs-desc rs-text"${RS.formatAttr((sec.formats || {}).content)}>${md(sec.content)}</div>` : '';
    if (sec.type === 'skills' || sec.type === 'languages' || sec.type === 'interests') return skills(sec, d);
    const norm = NORMALISE[sec.type] || NORMALISE.custom;
    const items = (sec.items || []).filter(i => !i.hidden).map(i => Object.assign(norm(i), { id: i.id, pageBreak: !!i.pageBreak, formats: RS.entryFormats(sec.type, i) })).filter(e => e.title || e.sub || e.desc);
    if (!items.length) return '';
    return `<div class="rs-items">${items.map(e => entry(e, d)).join('')}</div>`;
  }

  function section(sec, d) {
    const body = sectionBody(sec, d);
    if (!body) return '';
    return `<section class="rs-sec rs-sec-${esc(sec.type)}${sec.pageBreak ? ' rs-break' : ''}" data-sec="${esc(sec.id || '')}"><h2 class="rs-h"${RS.formatAttr((sec.formats || {}).title)}><span>${inline(sec.title || '')}</span></h2><div class="rs-sec-body">${body}</div></section>`;
  }

  /* ---------- Colours ---------- */
  function hexToRgb(h) {
    const m = String(h || '').replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    let s = m[1];
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
  }
  function luminance(h) {
    const rgb = hexToRgb(h);
    if (!rgb) return 1;
    const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  RS.isDark = h => luminance(h) < 0.25;

  RS.colors = function (d) {
    const t = RS.theme(d.theme);
    const accent = d.accent || t.accent;
    const side = d.sideColor || t.side;
    let sideText = t.sideText, sideAccent = t.sideAccent || t.sideText;
    if (d.sideColor) { sideText = RS.isDark(side) ? '#ffffff' : '#1f2328'; sideAccent = sideText; }
    if (!RS.isDark(side) && !t.sideAccent) sideAccent = accent;
    return { accent, text: t.text, muted: t.muted, bg: t.bg, side, sideText, sideAccent };
  };

  RS.PAGE = { A4: [210, 297], Letter: [215.9, 279.4], Legal: [215.9, 355.6] };

  /* ---------- Whole page ---------- */
  RS.render = function (doc) {
    const d = Object.assign({}, RS.DEFAULT_DESIGN, doc.design || {});
    const data = doc.data || { basics: {}, sections: [] };
    const b = data.basics || {};
    const c = RS.colors(d);
    const [pw, ph] = RS.PAGE[d.pageSize] || RS.PAGE.A4;
    const two = d.columns !== 'one';
    const filled = two && (d.sideStyle === 'filled' || d.sideStyle === 'tint');
    const banner = d.header === 'banner' || d.header === 'banner-center';

    // Where the header goes.
    let headWhere = 'top';
    if (two && !banner && d.header === 'sidebar') headWhere = 'side';
    else if (two && !banner && filled) headWhere = 'main';
    if (!two && d.header === 'sidebar') d.header = 'left';
    const headStyle = (headWhere !== 'side' && d.header === 'sidebar') ? 'left' : d.header;
    const hd = Object.assign({}, d, { header: headStyle });

    const secs = (data.sections || []).filter(s => s.visible !== false);
    const sideSecs = two ? secs.filter(s => s.col === 'side') : [];
    const mainSecs = two ? secs.filter(s => s.col !== 'side') : secs;
    const sd = Object.assign({}, d, { itemStyle: d.itemStyle === 'dates-left' ? 'stacked' : d.itemStyle });

    const headHtml = header(b, hd, headWhere === 'side' ? 'side' : 'top');
    const sideHtml = (headWhere === 'side' ? headHtml : '') + sideSecs.map(s => section(s, sd)).join('');
    const mainHtml = (headWhere === 'main' ? headHtml : '') + mainSecs.map(s => section(s, d)).join('');

    const sideBg = d.sideStyle === 'filled' ? c.side : d.sideStyle === 'tint' ? `color-mix(in srgb, ${c.accent} 9%, ${c.bg})` : 'transparent';
    const sw = Math.max(20, Math.min(45, +d.sideWidth || 32));
    const pageBg = filled
      ? (d.columns === 'left'
        ? `linear-gradient(to right, ${sideBg} 0 ${sw}%, ${c.bg} ${sw}% 100%)`
        : `linear-gradient(to left, ${sideBg} 0 ${sw}%, ${c.bg} ${sw}% 100%)`)
      : c.bg;

    const vars = {
      '--accent': c.accent, '--text': c.text, '--muted': c.muted, '--bg': c.bg,
      '--side-bg': sideBg, '--side-text': d.sideStyle === 'filled' ? c.sideText : c.text,
      '--side-accent': d.sideStyle === 'filled' ? c.sideAccent : c.accent,
      '--side-muted': d.sideStyle === 'filled' ? `color-mix(in srgb, ${c.sideText} 72%, transparent)` : c.muted,
      '--head-bg': c.side, '--head-text': c.sideText, '--head-accent': c.sideAccent,
      '--page-bg': pageBg,
      '--fh': RS.fontStack(d.fontHeading), '--fb': RS.fontStack(d.fontBody),
      '--fs': (+d.fontSize || 10) + 'pt', '--lh': +d.lineHeight || 1.4,
      '--name': (+d.nameSize || 2.4) + 'em', '--hsize': (+d.headingSize || 1.05) + 'em',
      '--gap': (+d.sectionGap || 1.2) + 'em', '--igap': (+d.itemGap || 0.7) + 'em',
      '--m': (+d.margin || 14) + 'mm', '--sw': sw + '%',
      '--pw': pw + 'mm', '--ph': ph + 'mm', '--photo': (+d.photoSize || 30) + 'mm',
    };
    const style = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
    const cls = [
      'rs', `rs-cols-${d.columns}`, `rs-side-${d.sideStyle}`, `rs-head-${headWhere}`, `rs-header-${headStyle}`,
      `rs-heading-${d.heading}`, `rs-items-${d.itemStyle}`, `rs-bullet-${d.bullet}`, `rs-dates-${d.dateAlign}`,
      d.justify ? 'rs-justify' : '', d.hyphenate === false ? 'rs-no-hyphens' : '', d.upperHeadings ? 'rs-upper-h' : '', d.upperName ? 'rs-upper-name' : '',
      d.boldName ? 'rs-bold-name' : '', RS.isDark(c.side) ? 'rs-dark-side' : 'rs-light-side',
    ].filter(Boolean).join(' ');

    const top = headWhere === 'top' ? headHtml : '';
    const body = two
      ? `<div class="rs-body"><aside class="rs-col rs-side">${sideHtml}</aside><main class="rs-col rs-main">${mainHtml}</main></div>`
      : `<div class="rs-body"><main class="rs-col rs-main">${mainHtml}</main></div>`;
    return `<div class="${cls}" style="${esc(style)}">${top}${body}</div>`;
  };

  /* Fonts a document needs. */
  RS.docFonts = doc => {
    const d = Object.assign({}, RS.DEFAULT_DESIGN, doc.design || {});
    return [d.fontHeading, d.fontBody];
  };

  RS.NORMALISE = NORMALISE;
  RS.range = range;
  RS.prettyUrl = prettyUrl;

})();
