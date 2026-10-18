/* Editable Word layout exporter. Uses native paragraphs, tables and images. */
(function () {
  'use strict';
  const RS = window.RS;
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const round = n => Math.max(0, Math.round(n));
  const hex = (value, fallback = 'FFFFFF') => {
    let s = String(value || '').replace('#', '');
    if (/^[a-f\d]{3}$/i.test(s)) s = s.split('').map(c => c + c).join('');
    return /^[a-f\d]{6}$/i.test(s) ? s.toUpperCase() : fallback;
  };
  const mix = (a, b, ratio) => [0, 2, 4].map(i => round(parseInt(a.slice(i, i + 2), 16) * ratio + parseInt(b.slice(i, i + 2), 16) * (1 - ratio)).toString(16).padStart(2, '0')).join('').toUpperCase();

  RS.buildDocx = async function (doc, JSZip) {
    const d = RS.normHeader({ ...RS.DEFAULT_DESIGN, ...doc.design }), data = doc.data || {}, basics = data.basics || {};
    const colors = RS.colors(d), zip = new JSZip(), relationships = [];
    const font = RS.font(d.fontBody).name, headingFont = RS.font(d.fontHeading).name;
    const base = round(d.fontSize * 2), em = d.fontSize * 20;
    const [pageW, pageH] = (RS.PAGE[d.pageSize] || RS.PAGE.A4).map(mm => round(mm * 1440 / 25.4));
    const margin = round(d.margin * 1440 / 25.4), width = pageW - margin * 2;
    const theme = { text: hex(colors.text), muted: hex(colors.muted), accent: hex(colors.accent), bg: hex(colors.bg) };
    const relationship = (type, target, external = false) => {
      const id = `rId${relationships.length + 1}`;
      relationships.push(`<Relationship Id="${id}" Type="${R}/${type}" Target="${esc(target)}"${external ? ' TargetMode="External"' : ''}/>`);
      return id;
    };
    const fonts = p => `<w:rFonts w:ascii="${esc(p.h ? headingFont : p.font || font)}" w:hAnsi="${esc(p.h ? headingFont : p.font || font)}" w:eastAsia="${esc(p.h ? headingFont : p.font || font)}" w:cs="${esc(p.h ? headingFont : p.font || font)}"/>`;
    const run = (text, p = {}) => `<w:r><w:rPr>${fonts(p)}${p.b ? '<w:b/>' : ''}${p.i ? '<w:i/>' : ''}${p.s ? '<w:strike/>' : ''}<w:color w:val="${hex(p.color, theme.text)}"/><w:sz w:val="${round(p.sz || base)}"/><w:szCs w:val="${round(p.sz || base)}"/>${p.u ? '<w:u w:val="single"/>' : ''}${p.sp ? `<w:spacing w:val="${round(p.sp)}"/>` : ''}${p.shade ? `<w:shd w:val="clear" w:fill="${hex(p.shade)}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
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
    const para = (content, p = {}) => `<w:p><w:pPr>${p.heading ? '<w:pStyle w:val="Heading1"/>' : ''}${p.keep ? '<w:keepNext/>' : ''}${p.lines !== false ? '<w:keepLines/>' : ''}${p.pb ? '<w:pageBreakBefore/>' : ''}<w:widowControl/>${p.borders ? `<w:pBdr>${p.borders}</w:pBdr>` : ''}${p.fill ? `<w:shd w:val="clear" w:fill="${hex(p.fill)}"/>` : ''}${p.tabs ? `<w:tabs>${p.tabs}</w:tabs>` : ''}${d.hyphenate === false || p.align != 'justify' ? '<w:suppressAutoHyphens/>' : ''}<w:spacing w:before="${round(p.before || 0)}" w:after="${round(p.after == null ? em * .15 : p.after)}" w:line="${round(p.line || d.lineHeight * 240)}" w:lineRule="auto"/>${p.ind || p.hang ? `<w:ind w:left="${round(p.ind || 0)}"${p.hang ? ` w:hanging="${round(p.hang)}"` : ''}/>` : ''}${p.align ? `<w:jc w:val="${p.align === 'justify' ? 'both' : p.align}"/>` : ''}</w:pPr>${content || run('', { sz: 2 })}</w:p>`;
    const empty = () => para('', { after: 0, line: 20 });
    const table = (cells, sizes, opts = {}) => {
      const total = sizes.reduce((a, b) => a + b, 0);
      const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(edge => `<w:${edge} w:val="nil"/>`).join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${sizes.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr>${opts.keep ? '<w:trPr><w:cantSplit/></w:trPr>' : ''}${cells.map((cell, i) => {
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
    let photo = '';
    if (d.showPhoto && /^data:image\//.test(basics.photo || '')) {
      const image = new Image();
      try {
        image.src = basics.photo; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (d.photoShape === 'circle') { ctx.beginPath(); ctx.arc(300, 300, 300, 0, Math.PI * 2); ctx.clip(); }
        else if (d.photoShape === 'rounded') { ctx.beginPath(); ctx.roundRect(0, 0, 600, 600, 84); ctx.clip(); }
        const crop = Math.min(image.naturalWidth, image.naturalHeight);
        ctx.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, 0, 0, 600, 600);
        zip.file('word/media/photo.png', canvas.toDataURL('image/png').split(',')[1], { base64: true });
        const id = relationship('image', 'media/photo.png'), size = round(d.photoSize * 36000);
        photo = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${size}" cy="${size}"/><wp:docPr id="1" name="Resume photo" descr="Profile photograph"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="photo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${size}" cy="${size}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
      } catch (e) { /* A damaged optional photo must not prevent text export. */ }
    }
    const contacts = [];
    const contact = (key, label, value, url, symbol) => { if (String(value || '').trim()) contacts.push({ key, label, text: value, url, symbol }); };
    contact('email', 'Email', basics.email, `mailto:${basics.email || ''}`, '✉');
    contact('phone', 'Phone', basics.phone, `tel:${String(basics.phone || '').replace(/[^\d+]/g, '')}`, '☎');
    contact('location', 'Location', basics.location, '', '⌖');
    for (const [key, label, symbol] of [['website', 'Web', '↗'], ['linkedin', 'LinkedIn', 'in'], ['github', 'GitHub', 'GH']]) contact(key, label, RS.prettyUrl(basics[key]), basics[key], symbol);
    (basics.links || []).forEach(l => contact('link', l.label || 'Link', RS.prettyUrl(l.url), l.url, '↗'));
    const header = (w, palette, where) => {
      const center = where !== 'side' && d.header === 'center', split = where !== 'side' && d.header === 'split';
      const banner = where !== 'side' && d.headerBanner, f = basics.formats || {};
      const p = banner ? { text: hex(colors.sideText), muted: hex(colors.sideText), accent: hex(colors.sideAccent), bg: hex(colors.side) } : palette;
      const contactLine = (c, align) => {
        const prefix = d.contactStyle === 'icons' ? run(c.symbol + ' ', { color: p.accent, font: 'Segoe UI Symbol', sz: round(base * .92) }) : d.contactStyle === 'labels' ? run(c.label + ': ', { b: true, color: p.text, sz: round(base * .92) }) : '';
        return para(prefix + link(c.text, c.url, { color: p.muted, sz: round(base * .92), ...(f[c.key] ? { b: f[c.key].bold, i: f[c.key].italic, u: f[c.key].underline, s: f[c.key].strike } : {}) }), { align: (f[c.key] || {}).align || align, after: em * .1 });
      };
      const name = para(field(d.upperName ? String(basics.name || 'Resume').toUpperCase() : basics.name || 'Resume', f.name, { b: d.boldName, h: true, sz: round(base * d.nameSize * (where === 'side' ? .78 : 1)), color: p.text }), { align: (f.name || {}).align || (center ? 'center' : 'left'), after: em * .2, keep: true, line: 260 });
      const title = basics.title ? para(field(basics.title, f.title, { h: true, color: p.accent, sz: round(base * (where === 'side' ? 1.05 : 1.2)) }), { align: (f.title || {}).align || (center ? 'center' : 'left'), after: em * .65, keep: true }) : '';
      const id = name + title;
      let result;
      if (split) {
        const cw = round(w * .4), pw = photo ? round(d.photoSize * 1440 / 25.4 + em) : 0;
        const cells = [id, contacts.map(c => contactLine(c, 'right')).join('')];
        const sizes = [w - cw - pw, cw];
        if (photo) { cells.unshift(para(photo)); sizes.unshift(pw); }
        result = table(cells, sizes, { keep: true }) + empty();
      } else {
        let identity = id;
        if (photo) identity = center || where === 'side' ? para(photo, { align: center || where === 'side' ? 'center' : 'left', keep: true }) + id : table([id, para(photo, { align: 'right' })], [w - round(d.photoSize * 1440 / 25.4 + em), round(d.photoSize * 1440 / 25.4 + em)], { keep: true }) + empty();
        const content = where === 'side' || contacts.some(c => (f[c.key] || {}).align) ? contacts.map(c => contactLine(c, where === 'side' ? 'left' : center ? 'center' : 'left')).join('') : para(contacts.map(c => {
          const prefix = d.contactStyle === 'labels' ? c.label + ': ' : d.contactStyle === 'icons' ? c.symbol + ' ' : '';
          const format = f[c.key] || {};
          return (d.contactStyle === 'icons' ? run(prefix, { color: p.accent, font: 'Segoe UI Symbol', sz: round(base * .92) }) : run(prefix, { color: p.text, sz: round(base * .92) })) + link(c.text, c.url, { color: p.muted, sz: round(base * .92), b: format.bold, i: format.italic, u: format.underline, s: format.strike });
        }).join(run(d.contactStyle === 'pipes' ? '  |  ' : '    ', { color: p.muted })), { align: center ? 'center' : 'left', after: em * .8 });
        result = identity + content;
      }
      return banner ? table([{ content: result, fill: p.bg, pad: [em * .8, em, em * .8, em] }], [w], { keep: true }) + empty() : result + para('', { after: em * .4, line: 20 });
    };
    const heading = (sec, p) => {
      const fmt = (sec.formats || {}).title || {}, style = d.heading;
      const upper = d.upperHeadings || style === 'caps';
      let text = upper ? String(sec.title || '').toUpperCase() : sec.title || '';
      let color = style === 'plain' ? p.text : p.accent;
      const props = { heading: true, keep: true, pb: sec.pageBreak, before: em * d.sectionGap, after: em * .5, align: fmt.align || (style === 'boxed' ? 'center' : 'left') };
      if (style === 'line' || style === 'side') props.borders = border('bottom', p.accent, 4, 'single', 3);
      if (style === 'double') props.borders = border('bottom', p.accent, 6, 'double', 3);
      if (style === 'bar' || style === 'ribbon') { props.borders = border('left', p.accent, 16, 'single', 5); props.ind = em * .6; }
      if (style === 'ribbon') props.fill = mix(p.accent, p.bg, .12);
      if (style === 'boxed') props.borders = ['top', 'left', 'bottom', 'right'].map(edge => border(edge, p.accent, 4, 'single', 3)).join('');
      if (style === 'dot') text = '● ' + text;
      if (style === 'bracket') text = '[ ' + text + ' ]';
      if (style === 'block') { text = ' ' + text + ' '; color = RS.isDark('#' + p.accent) ? 'FFFFFF' : '111111'; }
      const content = field(text, fmt, { h: true, b: true, color, sz: round(base * d.headingSize * (upper ? .92 : 1)), sp: upper || style === 'double' ? 20 : 0, u: style === 'underline', shade: style === 'block' ? p.accent : undefined });
      return para(content, props) + (style === 'caps' ? para(run('━━━', { color: p.accent, sz: 10 }), { keep: true, after: em * .25, line: 100 }) : '');
    };
    const bullet = { disc: '•', dash: '–', arrow: '▸', check: '✓', square: '▪', none: '' }[d.bullet] ?? '•';
    const description = (text, fmt, p, keepLast = false) => {
      const list = RS.blocks(text);
      return list.map((block, index) => {
        const mark = block.li && bullet ? run(bullet + ' ', { color: p.accent }) : '';
        return para(mark + field(block.text, fmt, { color: p.text }), { align: (fmt || {}).align || (d.justify ? 'justify' : 'left'), keep: index < list.length - 1 || keepLast, lines: !block.li ? false : true, after: em * (block.li ? .15 : .35), ind: mark ? em : 0, hang: mark ? em : 0 });
      }).join('');
    };
    const entry = (sec, item, p, w, side) => {
      const e = (RS.NORMALISE[sec.type] || RS.NORMALISE.custom)(item), f = RS.entryFormats(sec.type, item);
      const timeline = d.itemStyle === 'timeline', dateLeft = !side && (d.itemStyle === 'dates-left' || d.dateAlign === 'before');
      const boxed = ['cards', 'bordered'].includes(d.itemStyle), pad = boxed ? round(em * .75) : 0;
      const inner = w - pad * 2 - (timeline ? round(em * 1.4) : 0) - (dateLeft ? round(em * 7.5) : 0);
      const date = e.date ? para(field(e.date, f.date, { color: d.dateAlign === 'accent' ? p.accent : p.muted, b: d.dateAlign === 'accent', sz: round(base * .9) }), { align: (f.date || {}).align || (side || dateLeft ? 'left' : 'right'), after: em * .05, keep: true }) : '';
      const titleText = field(e.title || '', f.title, { h: true, b: true, color: p.text, sz: round(base * 1.05) });
      const tab = '<w:r><w:tab/></w:r>';
      const dateText = e.date ? field(e.date, f.date, { color: d.dateAlign === 'accent' ? p.accent : p.muted, b: d.dateAlign === 'accent', sz: round(base * .9) }) : '';
      const title = para(titleText + (!dateLeft && !side && dateText ? tab + dateText : ''), { align: (f.title || {}).align, tabs: `<w:tab w:val="right" w:pos="${inner}"/>`, after: em * .05, pb: item.pageBreak, keep: true });
      let content = title;
      const sub = e.sub ? para(field(e.sub, f.sub, { b: true, color: p.accent, sz: round(base * .95) }), { align: (f.sub || {}).align, after: 0, keep: true }) : '';
      const meta = [e.meta ? field(e.meta, f.meta, { color: p.muted, sz: round(base * .9) }) : '', e.link ? link(RS.prettyUrl(e.link), e.link, { color: p.accent, sz: round(base * .9) }) : ''].filter(Boolean).join(run(' · ', { color: p.muted }));
      const metadata = meta ? para(meta, { align: (f.meta || {}).align || (side ? 'left' : 'right'), keep: true, after: 0 }) : '';
      content += side ? sub + metadata + date : para((e.sub ? field(e.sub, f.sub, { b: true, color: p.accent, sz: round(base * .95) }) : '') + (meta ? tab + meta : ''), { align: (f.sub || {}).align, tabs: `<w:tab w:val="right" w:pos="${inner}"/>`, keep: true, after: em * .25 });
      content += description(e.desc, f.desc, p);
      // A final paragraph releases keepNext so adjacent entries can paginate.
      content += para('', { after: em * d.itemGap, line: 20 });
      if (timeline) content = table([{ content: para(run('○', { color: p.accent, font: 'Segoe UI Symbol' }), { keep: true }), borders: border('left', mix(p.accent, p.bg, .4), 6), pad: [0, 0, 0, 20] }, content], [round(em * 1.4), w - round(em * 1.4)], { keep: true }) + empty();
      else if (dateLeft) content = table([date, content], [round(em * 7.5), w - round(em * 7.5)], { keep: true }) + empty();
      else if (boxed) content = table([{ content, pad: [pad, pad, pad, pad], fill: d.itemStyle === 'cards' ? mix(p.accent, p.bg, .07) : undefined, borders: ['top', 'left', 'bottom', 'right'].map(edge => border(edge, mix(p.accent, p.bg, .35), 4)).join('') }], [w], { keep: true }) + empty();
      else content = table([content], [w], { keep: true }) + empty();
      if (d.itemStyle === 'ruled') content += para('', { after: em * .3, line: 20, borders: border('bottom', mix(p.accent, p.bg, .25), 4) });
      return content;
    };
    const skills = (sec, p, w, side) => {
      const items = (sec.items || []).filter(i => !i.hidden && String(i.name || '').trim());
      let style = d.skillStyle;
      if (['bars', 'dots'].includes(style) && !items.some(i => +i.level > 0)) style = 'list';
      if (sec.type === 'interests' && ['bars', 'dots'].includes(style)) style = 'tags';
      if (style === 'inline' || style === 'tags') return para(items.map(i => {
        const f = i.formats || {}, detail = i.keywords || i.fluency || '';
        return field(i.name, f.name, { color: p.text, b: !!i.keywords, shade: style === 'tags' ? mix(p.accent, p.bg, .12) : undefined }) + (detail ? field((i.keywords ? ': ' : ' (') + detail + (i.keywords ? '' : ')'), f.keywords || f.fluency, { color: p.muted, sz: round(base * .9) }) : '');
      }).join(run(style === 'tags' ? '   ' : ' · ', { color: p.accent })), { after: em * .3 });
      return items.map(i => {
        const level = Math.max(0, Math.min(5, round(+i.level || 0))), f = i.formats || {};
        let content = para(field(i.name, f.name, { color: p.text }) + (i.keywords || i.fluency ? field(' — ' + (i.keywords || i.fluency), f.keywords || f.fluency, { color: p.muted, sz: round(base * .88) }) : '') + (style === 'dots' && level ? run('  ' + '●'.repeat(level) + '○'.repeat(5 - level), { color: p.accent, font: 'Segoe UI Symbol', sz: round(base * .8) }) : ''), { align: (f.name || {}).align, keep: style === 'bars' && level > 0, after: em * .2 });
        if (style === 'bars' && level) {
          const fill = round(w * level / 5), cell = shade => ({ fill: shade, content: para('', { after: 0, line: 50 }) });
          content += table(level === 5 ? [cell(p.accent)] : [cell(p.accent), cell(mix(p.accent, p.bg, .18))], level === 5 ? [w] : [fill, w - fill], { keep: true }) + empty();
        }
        return content;
      }).join('');
    };
    const section = (sec, p, w, side) => {
      const visible = (sec.items || []).filter(i => !i.hidden);
      if (sec.type === 'text' ? !String(sec.content || '').trim() : !visible.length) return '';
      const hw = !side && d.heading === 'side' ? round(w * .22) : 0;
      const contentW = w - hw;
      const content = sec.type === 'text' ? description(sec.content, (sec.formats || {}).content, p) : SKILL_TYPES.includes(sec.type) ? skills(sec, p, contentW, side) : visible.map(i => entry(sec, i, p, contentW, side)).join('');
      if (sec._continued) return content;
      return hw ? table([heading(sec, p), { content, pad: [0, 0, 0, round(em)], borders: border('left', mix(p.accent, p.bg, .4), 4) }], [hw, w - hw]) + empty() : heading(sec, p) + content;
    };
    const SKILL_TYPES = ['skills', 'languages', 'interests'];
    const sections = (data.sections || []).filter(s => s.visible !== false);
    const two = d.columns !== 'one', banner = !!d.headerBanner && !(two && d.header === 'sidebar'), filled = ['filled', 'tint'].includes(d.sideStyle);
    const headWhere = two && !banner && d.header === 'sidebar' ? 'side' : two && !banner && filled ? 'main' : 'top';
    let body = headWhere === 'top' ? header(width, theme, 'top') : '';
    if (!two) body += sections.map(s => section(s, theme, width, false)).join('');
    else {
      const sideW = round(width * d.sideWidth / 100), mainW = width - sideW, gap = round(margin * .65);
      const sideBg = d.sideStyle === 'filled' ? hex(colors.side) : d.sideStyle === 'tint' ? mix(theme.accent, theme.bg, .09) : theme.bg;
      const palette = { bg: sideBg, text: d.sideStyle === 'filled' ? hex(colors.sideText) : theme.text, accent: d.sideStyle === 'filled' ? hex(colors.sideAccent) : theme.accent, muted: d.sideStyle === 'filled' ? mix(hex(colors.sideText), sideBg, .72) : theme.muted };
      const sw = sideW - gap, mw = mainW - gap;
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
      for (let part = 0; part < Math.max(sideParts.length, mainParts.length); part++) {
        if (part) body += para('', { pb: true, after: 0, line: 20 });
        const side = { content: (!part && headWhere === 'side' ? header(sw, palette, 'side') : '') + (sideParts[part] || []).map(s => section(s, palette, sw, true)).join(''), fill: filled ? sideBg : undefined, pad: [0, round(gap / 2), 0, round(gap / 2)], borders: d.sideStyle === 'rule' ? border(d.columns === 'left' ? 'right' : 'left', mix(theme.muted, theme.bg, .35), 4) : '' };
        const main = { content: (!part && headWhere === 'main' ? header(mw, theme, 'main') : '') + (mainParts[part] || []).map(s => section(s, theme, mw, false)).join(''), pad: [0, round(gap / 2), 0, round(gap / 2)] };
        body += table(d.columns === 'left' ? [side, main] : [main, side], d.columns === 'left' ? [sideW, mainW] : [mainW, sideW], { flow: true }) + empty();
      }
    }
    const hasJustifiedField = [basics, ...sections, ...sections.flatMap(s => s.items || [])].some(o => Object.values(o.formats || {}).some(f => f.align === 'justify'));
    const settings = `${XML}<w:settings xmlns:w="${W}"><w:autoHyphenation w:val="${d.hyphenate !== false && (d.justify || hasJustifiedField) ? 'true' : 'false'}"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
    const styles = `${XML}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr>${fonts({})}<w:color w:val="${theme.text}"/><w:sz w:val="${base}"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="${round(d.lineHeight * 240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>`;
    const fallback = name => { const f = RS.font(name); return f.cat === 'System' ? f.name : { Serif: 'Georgia', Slab: 'Cambria', Mono: 'Consolas', Display: 'Arial Narrow' }[f.cat] || 'Calibri'; };
    const fontTable = `${XML}<w:fonts xmlns:w="${W}">${[...new Set([font, headingFont, 'Segoe UI Symbol'])].map(name => `<w:font w:name="${esc(name)}"><w:altName w:val="${esc(fallback(name))}"/></w:font>`).join('')}</w:fonts>`;
    const namespaces = `xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`;
    const documentXml = `${XML}<w:document ${namespaces}><w:background w:color="${theme.bg}"/><w:body>${body}<w:sectPr><w:pgSz w:w="${pageW}" w:h="${pageH}"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    for (const [name, content, type] of [['document', documentXml, 'document.main'], ['styles', styles, 'styles'], ['settings', settings, 'settings'], ['fontTable', fontTable, 'fontTable']]) {
      zip.file(`word/${name}.xml`, content);
      if (name !== 'document') relationship(name, `${name}.xml`);
    }
    zip.file('word/_rels/document.xml.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`);
    zip.file('_rels/.rels', `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
    zip.file('docProps/core.xml', `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc((basics.name || 'Resume') + ' – Resume')}</dc:title><dc:creator>${esc(basics.name)}</dc:creator></cp:coreProperties>`);
    zip.file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>${[['document', 'document.main'], ['styles', 'styles'], ['settings', 'settings'], ['fontTable', 'fontTable']].map(([name, type]) => `<Override PartName="/word/${name}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
  };
})();
