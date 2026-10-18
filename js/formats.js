/* Resume Studio: export formats (text, Markdown, Word, JSON Resume) and imports
   (JSON Resume, Resume Workbench backups). */
(function () {
  const RS = window.RS;
  const str = v => (v == null ? '' : String(v));
  const prettyUrl = RS.prettyUrl;

  /* ---------- Outline: one plain structure that every export uses ---------- */
  const SKILLISH = ['skills', 'languages', 'interests'];

  // Description text -> [{ li, text }]; text keeps its **bold**, *italic* and [links](url).
  function blocks(text) {
    const out = [];
    for (const raw of str(text).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const m = line.match(/^[-*•–]\s+(.*)$/);
      out.push(m ? { li: true, text: m[1] } : { li: false, text: line });
    }
    return out;
  }
  RS.blocks = blocks;

  // Inline markdown -> runs of { t, b, i } (links become "text (url)").
  function runs(text) {
    const source = RS.richRuns(text), out = [];
    for (let i = 0; i < source.length; i++) {
      const r = source[i];
      out.push(r);
      if (r.url && (!source[i + 1] || source[i + 1].url !== r.url)) {
        let label = r.t;
        for (let j = i - 1; j >= 0 && source[j].url === r.url; j--) label = source[j].t + label;
        if (prettyUrl(label) !== prettyUrl(r.url)) out.push({ t: ' (' + prettyUrl(r.url) + ')' });
      }
    }
    return out;
  }
  RS.runs = runs;
  RS.plain = text => runs(text).map(r => r.t).join('');

  RS.outline = function (doc) {
    const b = (doc.data && doc.data.basics) || {};
    const contact = [b.email, b.phone, b.location, b.website && prettyUrl(b.website), b.linkedin && prettyUrl(b.linkedin),
      b.github && prettyUrl(b.github), ...(b.links || []).map(l => l.url && prettyUrl(l.url))]
      .map(x => str(x).trim()).filter(Boolean);
    const sections = [];
    for (const s of (doc.data && doc.data.sections) || []) {
      if (s.visible === false) continue;
      const title = s.title || (RS.SECTION_TYPES[s.type] || {}).name || '';
      if (s.type === 'text') {
        const bl = blocks(s.content);
        if (bl.length) sections.push({ id: s.id, type: s.type, title, kind: 'text', blocks: bl, pageBreak: !!s.pageBreak });
        continue;
      }
      const items = (s.items || []).filter(i => !i.hidden);
      if (SKILLISH.includes(s.type)) {
        const groups = items.filter(i => str(i.name).trim() || str(i.keywords).trim())
          .map(i => ({ label: str(i.name).trim(), detail: str(i.keywords || i.fluency).trim(), level: +i.level || 0 }));
        if (groups.length) sections.push({ id: s.id, type: s.type, title, kind: 'skills', groups, pageBreak: !!s.pageBreak });
        continue;
      }
      const norm = RS.NORMALISE[s.type] || RS.NORMALISE.custom;
      const entries = items.map(i => {
        const e = norm(i);
        return { title: str(e.title), sub: str(e.sub), meta: str(e.meta), date: str(e.date), link: e.link ? prettyUrl(e.link) : '', blocks: blocks(e.desc), pageBreak: !!i.pageBreak };
      }).filter(e => e.title || e.sub || e.blocks.length);
      if (entries.length) sections.push({ id: s.id, type: s.type, title, kind: 'entries', entries, pageBreak: !!s.pageBreak });
    }
    return { name: str(b.name), title: str(b.title), contact, sections };
  };

  /* ---------- Plain text ---------- */
  RS.toText = function (doc) {
    const o = RS.outline(doc), out = [], P = RS.plain;
    out.push((o.name || 'Resume').toUpperCase());
    if (o.title) out.push(o.title);
    if (o.contact.length) out.push(o.contact.join(' | '));
    for (const s of o.sections) {
      out.push('', s.title.toUpperCase(), '-'.repeat(Math.min(40, s.title.length)));
      if (s.kind === 'text') s.blocks.forEach(x => out.push((x.li ? '- ' : '') + P(x.text)));
      else if (s.kind === 'skills') s.groups.forEach(g => out.push(g.label && g.detail ? `${g.label}: ${g.detail}` : (g.label || g.detail)));
      else s.entries.forEach((e, i) => {
        if (i) out.push('');
        out.push([e.title, e.date].filter(Boolean).join(' | '));
        const sub = [e.sub, e.meta].filter(Boolean).join(' · ');
        if (sub) out.push(sub);
        if (e.link) out.push(e.link);
        e.blocks.forEach(x => out.push((x.li ? '- ' : '') + P(x.text)));
      });
    }
    return out.join('\r\n') + '\r\n';
  };

  /* ---------- Markdown ---------- */
  RS.toMarkdown = function (doc) {
    const o = RS.outline(doc), out = [];
    out.push('# ' + (o.name || 'Resume'));
    if (o.title) out.push('', '_' + o.title + '_');
    if (o.contact.length) out.push('', o.contact.join(' · '));
    for (const s of o.sections) {
      out.push('', '## ' + s.title, '');
      if (s.kind === 'text') s.blocks.forEach((x, i) => { if (i && !x.li) out.push(''); out.push((x.li ? '- ' : '') + x.text); });
      else if (s.kind === 'skills') s.groups.forEach(g => out.push('- ' + (g.label ? `**${g.label}**${g.detail ? ': ' : ''}` : '') + g.detail));
      else s.entries.forEach((e, i) => {
        if (i) out.push('');
        out.push('### ' + [e.title, e.date ? '(' + e.date + ')' : ''].filter(Boolean).join(' '));
        const sub = [e.sub, e.meta, e.link].filter(Boolean).join(' · ');
        if (sub) out.push('_' + sub + '_');
        if (e.blocks.length) { out.push(''); e.blocks.forEach(x => out.push((x.li ? '- ' : '') + x.text)); }
      });
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };

  /* ---------- Word (.docx), written as WordprocessingML ---------- */
  let zipLoading = null;
  function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!zipLoading) zipLoading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = () => (window.JSZip ? res(window.JSZip) : rej(new Error('The Word exporter did not load.')));
      s.onerror = () => { zipLoading = null; rej(new Error('The Word exporter needs an internet connection the first time. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
    return zipLoading;
  }
  RS.toDocx = async function (doc) {
    // Freeze the selection while the ZIP library and optional photo load.
    const snapshot = JSON.parse(JSON.stringify(doc));
    return RS.buildDocx(snapshot, await loadJSZip());
  };

  /* ---------- Dates for JSON Resume (ISO) ---------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fromIso(s) { s = str(s); const m = s.match(/^(\d{4})(?:-(\d{2}))?/); if (!m) return s; return m[2] ? MON[+m[2] - 1] + ' ' + m[1] : m[1]; }
  function toIso(s) {
    s = str(s).trim();
    let m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/);
    if (m) { const i = MON.findIndex(x => x.toLowerCase() === m[1].toLowerCase()); if (i >= 0) return m[2] + '-' + String(i + 1).padStart(2, '0'); }
    m = s.match(/^(\d{1,2})\/(\d{4})$/);
    if (m) return m[2] + '-' + m[1].padStart(2, '0');
    return /^\d{4}(-\d{2}){0,2}$/.test(s) ? s : '';
  }
  const isPresent = s => /^(present|now|current|today)$/i.test(str(s).trim());
  const bulletsOf = text => blocks(text).filter(x => x.li).map(x => RS.plain(x.text));
  const parasOf = text => blocks(text).filter(x => !x.li).map(x => RS.plain(x.text)).join(' ');
  const LEVEL_WORDS = [[/master|expert|native|bilingual/i, 5], [/advanced|fluent|full professional/i, 4], [/intermediate|professional|good/i, 3], [/conversational|basic|limited|elementary/i, 2], [/beginner|novice|learning/i, 1]];
  const levelFrom = w => { for (const [re, n] of LEVEL_WORDS) if (re.test(str(w))) return n; return 0; };
  const LEVEL_NAMES = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

  RS.toJsonResume = function (doc) {
    const data = doc.data, b = data.basics || {};
    const vis = t => data.sections.filter(s => s.type === t && s.visible !== false).flatMap(s => (s.items || []).filter(i => !i.hidden));
    const summary = data.sections.find(s => s.type === 'text' && s.visible !== false && /summary|profile|about|objective/i.test(s.title));
    const profiles = [];
    if (b.linkedin) profiles.push({ network: 'LinkedIn', url: RS.safeUrl(b.linkedin) });
    if (b.github) profiles.push({ network: 'GitHub', url: RS.safeUrl(b.github) });
    (b.links || []).forEach(l => l.url && profiles.push({ network: l.label || 'Link', url: RS.safeUrl(l.url) }));
    const end = i => (i.current || isPresent(i.end) ? undefined : toIso(i.end));
    const out = {
      $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
      basics: { name: b.name, label: b.title, email: b.email, phone: b.phone, url: b.website ? RS.safeUrl(b.website) : '', summary: summary ? RS.plain(summary.content) : '', location: { address: b.location }, profiles },
      work: vis('experience').map(i => ({ name: i.company, position: i.position, location: i.location, startDate: toIso(i.start), endDate: end(i), summary: parasOf(i.description), highlights: bulletsOf(i.description) })),
      volunteer: vis('volunteer').map(i => ({ organization: i.organisation, position: i.role, startDate: toIso(i.start), endDate: end(i), summary: parasOf(i.description), highlights: bulletsOf(i.description) })),
      education: vis('education').map(i => ({ institution: i.school, studyType: i.degree, startDate: toIso(i.start), endDate: toIso(i.end), courses: blocks(i.description).map(x => RS.plain(x.text)) })),
      awards: vis('awards').map(i => ({ title: i.title, awarder: i.issuer, date: toIso(i.date), summary: RS.plain(i.description) })),
      certificates: vis('certifications').map(i => ({ name: i.name, issuer: i.issuer, date: toIso(i.date), url: i.link ? RS.safeUrl(i.link) : '' })),
      publications: vis('publications').map(i => ({ name: i.title, publisher: i.publisher, releaseDate: toIso(i.date), url: i.link ? RS.safeUrl(i.link) : '', summary: RS.plain(i.description) })),
      skills: vis('skills').map(i => ({ name: i.name, level: LEVEL_NAMES[+i.level || 0], keywords: str(i.keywords).split(',').map(x => x.trim()).filter(Boolean) })),
      languages: vis('languages').map(i => ({ language: i.name, fluency: i.fluency || LEVEL_NAMES[+i.level || 0] })),
      interests: vis('interests').map(i => ({ name: i.name, keywords: str(i.keywords).split(',').map(x => x.trim()).filter(Boolean) })),
      references: vis('references').map(i => ({ name: i.name, reference: [i.role, i.contact, RS.plain(i.description)].filter(Boolean).join(' · ') })),
      projects: vis('projects').map(i => ({ name: i.name, description: parasOf(i.description) || i.role, highlights: bulletsOf(i.description), url: i.link ? RS.safeUrl(i.link) : '', startDate: toIso(i.start), endDate: toIso(i.end) })),
    };
    return JSON.stringify(out, (k, v) => (v === '' || v === undefined || (Array.isArray(v) && !v.length && k !== 'profiles') ? undefined : v), 2);
  };

  /* ---------- Building our sections ---------- */
  function section(type, title, items, extra) {
    const t = RS.SECTION_TYPES[type];
    const s = Object.assign({ id: RS.uid(), type, title: title || t.name, visible: true, col: t.col, items: [] }, extra || {});
    if (type === 'text') s.content = '';
    else s.items = (items || []).map(i => {
      const it = { id: RS.uid(), hidden: !!(i && i.hidden) };
      t.fields.forEach(f => (it[f.key] = f.type === 'level' ? Math.max(0, Math.min(5, Math.round(+i[f.key] || 0))) : f.type === 'check' ? !!i[f.key] : str(i[f.key])));
      return it;
    });
    return s;
  }
  const textSection = (title, content, extra) => Object.assign(section('text', title, null, extra), { content: str(content) });
  const asBullets = list => list.map(x => str(x).trim()).filter(Boolean).map(x => '- ' + x).join('\n');
  const descOf = (summary, highlights) => [str(summary).trim(), asBullets(Array.isArray(highlights) ? highlights : [])].filter(Boolean).join('\n');
  const emptyBasics = () => ({ name: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '', links: [] });

  /* ---------- JSON Resume -> ours ---------- */
  RS.isJsonResume = o => o && typeof o === 'object' && !o.app && (o.basics || o.work) &&
    (Array.isArray(o.work) || Array.isArray(o.education) || (o.basics && ('label' in o.basics || 'profiles' in o.basics)));
  RS.fromJsonResume = function (j) {
    const b = j.basics || {}, loc = b.location || {};
    const basics = emptyBasics();
    Object.assign(basics, { name: str(b.name), title: str(b.label), email: str(b.email), phone: str(b.phone), website: str(b.url || b.website),
      location: [loc.city, loc.region].map(str).filter(Boolean).join(', ') || str(loc.address) });
    for (const p of Array.isArray(b.profiles) ? b.profiles : []) {
      if (!p || typeof p !== 'object') continue;
      const url = str(p.url || p.username), net = str(p.network);
      if (/linkedin/i.test(net + url) && !basics.linkedin) basics.linkedin = url;
      else if (/github/i.test(net + url) && !basics.github) basics.github = url;
      else if (url) basics.links.push({ label: net, url });
    }
    const secs = [];
    const arr = a => (Array.isArray(a) ? a.filter(x => x && typeof x === 'object') : []);
    if (str(b.summary).trim()) secs.push(textSection('Summary', b.summary));
    const push = (type, list, map, title) => { const l = arr(list); if (l.length) secs.push(section(type, title, l.map(map))); };
    const cur = x => !!x.startDate && !x.endDate;
    push('experience', j.work, w => ({ position: w.position, company: w.name || w.company, location: w.location, start: fromIso(w.startDate), end: fromIso(w.endDate), current: cur(w), description: descOf(w.summary, w.highlights) }));
    push('education', j.education, e => ({ degree: [e.studyType, e.area].map(str).filter(Boolean).join(' in '), school: e.institution, start: fromIso(e.startDate), end: fromIso(e.endDate),
      description: [e.score ? 'Score: ' + e.score : '', asBullets(Array.isArray(e.courses) ? e.courses : [])].filter(Boolean).join('\n') }));
    push('projects', j.projects, p => ({ name: p.name, role: Array.isArray(p.roles) ? p.roles.join(', ') : '', link: p.url, start: fromIso(p.startDate), end: fromIso(p.endDate), description: descOf(p.description, p.highlights) }));
    push('volunteer', j.volunteer, v => ({ role: v.position, organisation: v.organization, start: fromIso(v.startDate), end: fromIso(v.endDate), current: cur(v), description: descOf(v.summary, v.highlights) }));
    push('certifications', j.certificates, c => ({ name: c.name, issuer: c.issuer, date: fromIso(c.date), link: c.url }));
    push('awards', j.awards, a => ({ title: a.title, issuer: a.awarder, date: fromIso(a.date), description: a.summary }));
    push('publications', j.publications, p => ({ title: p.name, publisher: p.publisher, date: fromIso(p.releaseDate), link: p.url, description: p.summary }));
    push('skills', j.skills, s => ({ name: s.name, level: levelFrom(s.level), keywords: Array.isArray(s.keywords) ? s.keywords.map(str).join(', ') : '' }));
    push('languages', j.languages, l => ({ name: l.language, fluency: l.fluency, level: levelFrom(l.fluency) }));
    push('interests', j.interests, i => ({ name: i.name, keywords: Array.isArray(i.keywords) ? i.keywords.map(str).join(', ') : '' }));
    push('references', j.references, r => ({ name: r.name, description: r.reference }));
    return { name: basics.name ? basics.name + ' resume' : 'Imported resume', data: { basics, sections: secs } };
  };

  /* ---------- Resume Workbench (the earlier Claude chat app) -> ours ---------- */
  const WB_TEMPLATE = { classic: 'harvard', modern: 'scholar', sidebar: 'horizon' };
  RS.isWorkbench = o => o && typeof o === 'object' && (o.app === 'resume-workbench' || !!o.personal ||
    (o.basics && (typeof o.summary === 'string' || (o.settings && 'template' in o.settings)) && !o.design));
  function wbLines(text) { return str(text).split('\n').map(x => x.trim().replace(/^[-•*]\s*/, '')).filter(Boolean); }
  RS.fromWorkbench = function (src) {
    src = src || {};
    const b = src.basics || src.personal || {};
    const basics = emptyBasics();
    ['name', 'title', 'email', 'phone', 'location', 'website', 'linkedin'].forEach(k => (basics[k] = str(b[k])));
    const secs = [];
    if (str(src.summary).trim()) secs.push(textSection('Summary', src.summary));
    const many = text => { const l = wbLines(text); return l.length > 1 ? asBullets(l) : (l[0] || ''); };
    const conv = {
      experience: i => ({ position: i.role, company: i.company, location: i.location, start: i.start, end: i.end, current: !!i.current, description: asBullets(wbLines(i.bullets)) }),
      education: i => ({ degree: i.qualification, school: i.institution, location: i.location, start: i.start, end: i.end, description: i.notes }),
      certifications: i => ({ name: i.name, issuer: i.issuer, date: i.date, credential: i.credential }),
      projects: i => ({ name: i.name, link: i.link, description: many(i.description) }),
      volunteering: i => ({ role: i.role, organisation: i.organisation, start: i.start, end: i.end, description: asBullets(wbLines(i.bullets)) }),
      awards: i => ({ title: i.name, issuer: i.issuer, date: i.date, description: i.description }),
      languages: i => ({ name: i.name, fluency: i.level, level: 0 }),
      custom: i => ({ title: i.title, subtitle: i.subtitle, start: i.date, description: many(i.description) }),
    };
    const TYPE = { volunteering: 'volunteer' };
    const add = (type, title, items, hidden) => {
      const ours = TYPE[type] || type;
      let list = (Array.isArray(items) ? items : []).filter(x => x && typeof x === 'object');
      let mapped;
      if (type === 'skills') {
        // Workbench skill groups may have no name: then each keyword becomes its own skill.
        mapped = [];
        list.forEach(i => {
          const kw = Array.isArray(i.keywords) ? i.keywords.map(str).join(', ') : str(i.keywords);
          if (str(i.name).trim()) mapped.push({ name: i.name, keywords: kw, level: 0, hidden: i.hidden });
          else kw.split(',').map(x => x.trim()).filter(Boolean).forEach(k => mapped.push({ name: k, level: 0, hidden: i.hidden }));
        });
      } else mapped = list.map(i => Object.assign(conv[type](i), { hidden: i.hidden }));
      secs.push(section(ours, str(title) || undefined, mapped, { visible: !hidden }));
    };
    if (Array.isArray(src.sections)) {
      for (const s of src.sections) {
        if (!s || typeof s !== 'object') continue;
        if (s.type === 'text') secs.push(textSection(str(s.title) || 'References', s.content, { visible: !s.hidden }));
        else if (conv[s.type] || s.type === 'skills') add(s.type, s.title, s.items, s.hidden);
      }
    } else {
      // Workbench version 1 kept each list at the top level.
      add('experience', '', src.experience);
      add('education', '', src.education);
      const kw = Array.isArray(src.skills) ? src.skills.map(str).join(', ') : str(src.skills);
      if (kw) add('skills', '', [{ keywords: kw }]);
      if (Array.isArray(src.projects) && src.projects.length) add('projects', '', src.projects);
      if (str(src.references)) secs.push(textSection('References', src.references));
    }
    const st = src.settings || {};
    let design = RS.applyTemplate(Object.assign({}, RS.DEFAULT_DESIGN), WB_TEMPLATE[st.template] || 'harvard');
    if (/^#[0-9a-f]{6}$/i.test(st.accent || '')) design.accent = st.accent;
    if (st.page === 'Letter') design.pageSize = 'Letter';
    if (st.density === 'compact') Object.assign(design, { fontSize: Math.max(8.5, design.fontSize - 1), sectionGap: 0.9, itemGap: 0.5 });
    return { name: basics.name ? basics.name + ' resume' : 'Imported resume', data: { basics, sections: secs }, design, isSample: !!src.isSample };
  };

  /* Work out what a pasted or opened file is. Returns [{ name, data, design?, isSample? }]. */
  RS.parseImport = function (text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { throw new Error("That isn't valid JSON. Check you copied all of it, from the first { to the last }."); }
    if (!o || typeof o !== 'object') throw new Error("That file is empty or isn't a resume.");
    if (o.app === 'resume-workbench' && Array.isArray(o.resumes)) return o.resumes.map(x => Object.assign(RS.fromWorkbench(x && x.data), x && x.name ? { name: str(x.name) } : {}));
    if (RS.isWorkbench(o)) return [RS.fromWorkbench(o.resume || o)];
    if (RS.isJsonResume(o)) return [RS.fromJsonResume(o)];
    if (o.app === 'resume-studio' && Array.isArray(o.resumes)) return o.resumes;
    if (o.docs && typeof o.docs === 'object') return Object.values(o.docs);
    if (o.data || (o.basics && Array.isArray(o.sections))) return [o];
    throw new Error("This doesn't look like a Resume Studio backup, a Resume Workbench backup or a JSON Resume file.");
  };
})();
