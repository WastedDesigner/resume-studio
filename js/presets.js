/* Resume Studio: layouts, themes, fonts, design templates and sample content. */
window.RS = window.RS || {};

/* ---------- Fonts ---------- */
// spec = the Google Fonts css2 axis string; only styles each family really has,
// or Google rejects the request.
RS.FONTS = [
  { name: 'Inter', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Roboto', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Open Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Lato', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Source Sans 3', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'IBM Plex Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'DM Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Work Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Nunito', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Fira Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Poppins', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Montserrat', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Raleway', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Karla', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Rubik', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Barlow', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Plus Jakarta Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Josefin Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'PT Sans', cat: 'Sans', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Manrope', cat: 'Sans', spec: 'wght@400;700' },
  { name: 'Outfit', cat: 'Sans', spec: 'wght@400;700' },
  { name: 'Sora', cat: 'Sans', spec: 'wght@400;700' },
  { name: 'Space Grotesk', cat: 'Sans', spec: 'wght@400;700' },
  { name: 'Oswald', cat: 'Display', spec: 'wght@400;700' },
  { name: 'DM Serif Display', cat: 'Display', spec: 'ital@0;1' },
  { name: 'Playfair Display', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Merriweather', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Lora', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'EB Garamond', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Cormorant Garamond', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Libre Baskerville', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Crimson Pro', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Source Serif 4', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'PT Serif', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Spectral', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Alegreya', cat: 'Serif', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Bitter', cat: 'Slab', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Zilla Slab', cat: 'Slab', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Roboto Slab', cat: 'Slab', spec: 'wght@400;700' },
  { name: 'IBM Plex Mono', cat: 'Mono', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'JetBrains Mono', cat: 'Mono', spec: 'ital,wght@0,400;0,700;1,400' },
  { name: 'Arial', cat: 'System', stack: 'Arial, Helvetica, sans-serif' },
  { name: 'Helvetica', cat: 'System', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { name: 'Calibri', cat: 'System', stack: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' },
  { name: 'Segoe UI', cat: 'System', stack: '"Segoe UI", system-ui, sans-serif' },
  { name: 'Verdana', cat: 'System', stack: 'Verdana, Geneva, sans-serif' },
  { name: 'Georgia', cat: 'System', stack: 'Georgia, "Times New Roman", serif' },
  { name: 'Times New Roman', cat: 'System', stack: '"Times New Roman", Times, serif' },
  { name: 'Cambria', cat: 'System', stack: 'Cambria, Caladea, Georgia, serif' },
  { name: 'Garamond', cat: 'System', stack: 'Garamond, "EB Garamond", Georgia, serif' },
];

RS.font = function (name) {
  return RS.FONTS.find(f => f.name === name) || RS.FONTS[0];
};

RS.fontStack = function (name) {
  const f = RS.font(name);
  if (f.stack) return f.stack;
  const fallback = { Serif: 'Georgia, serif', Slab: 'Georgia, serif', Mono: 'Consolas, monospace', Display: 'Arial, sans-serif' }[f.cat] || 'Arial, sans-serif';
  return `"${f.name}", ${fallback}`;
};

RS._fontLinks = {};
RS.loadFont = function (name) {
  const f = RS.font(name);
  if (!f.spec || RS._fontLinks[f.name]) return RS._fontLinks[f.name] || Promise.resolve();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.name).replace(/%20/g, '+')}:${f.spec}&display=swap`;
  const p = new Promise(res => { link.onload = res; link.onerror = res; });
  document.head.appendChild(link);
  RS._fontLinks[f.name] = p;
  return p;
};

RS.PAIRINGS = [
  ['Inter', 'Inter'], ['Poppins', 'Inter'], ['Montserrat', 'Open Sans'], ['Raleway', 'Lato'],
  ['Playfair Display', 'Lato'], ['Merriweather', 'Source Sans 3'], ['Lora', 'Lora'], ['EB Garamond', 'EB Garamond'],
  ['Libre Baskerville', 'Source Sans 3'], ['DM Serif Display', 'DM Sans'], ['Space Grotesk', 'Inter'], ['Oswald', 'Roboto'],
  ['Josefin Sans', 'Nunito'], ['IBM Plex Mono', 'IBM Plex Sans'], ['Bitter', 'Fira Sans'], ['Cormorant Garamond', 'Karla'],
  ['Sora', 'Manrope'], ['Crimson Pro', 'Crimson Pro'], ['Roboto Slab', 'Roboto'], ['Arial', 'Arial'], ['Georgia', 'Georgia'],
];

/* ---------- Themes ---------- */
// accent, text, muted, page bg, sidebar/banner bg, sidebar/banner text
function theme(id, name, accent, side, sideText, extra) {
  return Object.assign({ id, name, accent, text: '#1f2328', muted: '#5b636e', bg: '#ffffff', side, sideText }, extra || {});
}
RS.THEMES = [
  theme('slate', 'Slate', '#2f5d8a', '#1f2a37', '#eef2f6'),
  theme('ocean', 'Ocean', '#0f6e8c', '#0b3d53', '#e8f4f8'),
  theme('forest', 'Forest', '#2e6b47', '#1d3b2a', '#ebf4ee'),
  theme('crimson', 'Crimson', '#b4232c', '#3a1014', '#fbecec'),
  theme('royal', 'Royal', '#4338ca', '#1e1b4b', '#eceafe'),
  theme('plum', 'Plum', '#7c3a8c', '#2e1435', '#f6ecf8'),
  theme('amber', 'Amber', '#b7791f', '#2b2116', '#fbf2e3'),
  theme('teal', 'Teal', '#0f766e', '#0f2f2c', '#e6f5f3'),
  theme('charcoal', 'Charcoal', '#3a3a3a', '#262626', '#f2f2f2', { muted: '#666' }),
  theme('rose', 'Rose', '#be185d', '#4a0d2b', '#fdeaf2'),
  theme('midnight', 'Midnight Gold', '#a8851f', '#111827', '#f3f4f6', { sideAccent: '#e3c45a' }),
  theme('navy', 'Navy & Gold', '#9c7a2e', '#13294b', '#f1f4f9', { sideAccent: '#e0c27a' }),
  theme('olive', 'Olive', '#5f6d22', '#2c3115', '#f1f3e6'),
  theme('graphite', 'Graphite & Lime', '#4d7c0f', '#1c1f22', '#eef0f2', { sideAccent: '#a3e635' }),
  theme('coral', 'Coral', '#d9481f', '#263238', '#eceff1', { sideAccent: '#ff8a65' }),
  theme('cyber', 'Cyber', '#0891b2', '#0b1220', '#e2f3f8', { sideAccent: '#22d3ee' }),
  theme('sunflower', 'Sunflower', '#b88700', '#1f1f1f', '#f5f5f5', { sideAccent: '#f5c518' }),
  theme('sand', 'Sand', '#8a5a2b', '#efe6d6', '#3b2f22', { bg: '#fffdf9', text: '#2b241c', muted: '#6e6152' }),
  theme('mint', 'Mint', '#10856b', '#e3f4ee', '#17352c'),
  theme('sky', 'Sky', '#2563eb', '#e8f0fe', '#1e3a8a'),
  theme('lavender', 'Lavender', '#6d4fc2', '#efeafb', '#2f2363'),
  theme('blush', 'Blush', '#c2577a', '#fbe9ef', '#5a1f33'),
  theme('terracotta', 'Terracotta', '#c0562f', '#f6e3da', '#4d2112'),
  theme('steel', 'Steel', '#4b6584', '#dfe6ee', '#22303f'),
  theme('burgundy', 'Burgundy', '#7a1f3d', '#f5e8ec', '#4a1024'),
  theme('ink', 'Ink', '#111111', '#f0f0f0', '#111111', { muted: '#555' }),
  theme('paper', 'Paper & Ink', '#1d4ed8', '#1d4ed8', '#ffffff'),
  theme('emerald', 'Emerald', '#047857', '#047857', '#ffffff'),
  theme('tangerine', 'Tangerine', '#ea580c', '#ea580c', '#ffffff'),
  theme('violet', 'Violet', '#7c3aed', '#7c3aed', '#ffffff'),
  theme('espresso', 'Espresso', '#70452d', '#352a24', '#faf3ea', { sideAccent: '#e7c39c' }),
  theme('cobalt', 'Cobalt', '#1e40af', '#172554', '#eff6ff', { sideAccent: '#93c5fd' }),
  theme('sage', 'Sage', '#48634b', '#e9efe5', '#263c29', { bg: '#fdfefb' }),
  theme('copper', 'Copper', '#974521', '#422b22', '#fff3e8', { sideAccent: '#f4b68c' }),
  theme('lagoon', 'Lagoon', '#0e7490', '#164e63', '#ecfeff', { sideAccent: '#67e8f9' }),
  theme('linen', 'Linen', '#766039', '#eee8dc', '#443a29', { bg: '#fffdf8', text: '#302b24', muted: '#706653' }),
  theme('heritage', 'Heritage Green & Brass', '#2f5d50', '#1b3a33', '#eef4f1', { sideAccent: '#d4b483' }),
  theme('claret', 'Claret & Stone', '#8b2635', '#2e2a28', '#f3efe9', { sideAccent: '#d9a5ac' }),
  theme('petrol', 'Petrol & Sand', '#1d5c63', '#12393e', '#f2ede3', { sideAccent: '#e0c9a6' }),
  theme('aubergine', 'Aubergine & Blush', '#5e3a6e', '#2b1b33', '#f5eef6', { sideAccent: '#e6b8c7' }),
  theme('denim', 'Denim & Rust', '#a8492a', '#22344c', '#edf1f6', { sideAccent: '#f0a37c' }),
  theme('storm', 'Storm & Teal', '#23727a', '#2d3540', '#eef1f4', { sideAccent: '#8fd1cf' }),
  theme('indigo', 'Indigo & Ochre', '#34407a', '#1f2547', '#eef0fa', { sideAccent: '#e2b45c' }),
  theme('rosewood', 'Charcoal & Rosewood', '#9e4560', '#2a2a2e', '#f2eff0', { sideAccent: '#e8a3b3' }),
  theme('stone', 'Stone & Teal', '#2a6767', '#e8e6e1', '#2e3a3a'),
  theme('dove', 'Dove Grey & Navy', '#24477a', '#eceef1', '#1d2b44'),
  theme('evergreen', 'Evergreen & Cream', '#2d5e46', '#f4f1e6', '#1f3d2f'),
];
RS.theme = id => RS.THEMES.find(t => t.id === id) || RS.THEMES[0];

/* ---------- Layouts (structure only) ---------- */
RS.LAYOUTS = [
  { id: 'classic', name: 'Classic', desc: 'Centered header, one column', set: { columns: 'one', header: 'center', itemStyle: 'stacked', heading: 'line' } },
  { id: 'left', name: 'Left aligned', desc: 'Name on the left, one column', set: { columns: 'one', header: 'left', itemStyle: 'stacked', heading: 'bar' } },
  { id: 'split', name: 'Split header', desc: 'Name left, contact right', set: { columns: 'one', header: 'split', itemStyle: 'stacked', heading: 'caps' } },
  { id: 'sidebar-left', name: 'Left sidebar', desc: 'Coloured sidebar with your details', set: { columns: 'left', sideStyle: 'filled', header: 'sidebar', itemStyle: 'stacked', heading: 'caps' } },
  { id: 'sidebar-right', name: 'Right sidebar', desc: 'Coloured sidebar on the right', set: { columns: 'right', sideStyle: 'filled', header: 'sidebar', itemStyle: 'stacked', heading: 'caps' } },
  { id: 'tint-left', name: 'Light sidebar', desc: 'Soft tinted sidebar', set: { columns: 'left', sideStyle: 'tint', header: 'left', itemStyle: 'stacked', heading: 'line' } },
  { id: 'banner', name: 'Banner', desc: 'Full-width coloured header', set: { columns: 'one', header: 'left', headerBanner: true, itemStyle: 'stacked', heading: 'line' } },
  { id: 'banner-cols', name: 'Banner + columns', desc: 'Coloured header, two columns', set: { columns: 'right', sideStyle: 'plain', header: 'left', headerBanner: true, itemStyle: 'stacked', heading: 'underline' } },
  { id: 'banner-center', name: 'Centered banner', desc: 'Centered coloured header', set: { columns: 'one', header: 'center', headerBanner: true, itemStyle: 'stacked', heading: 'caps' } },
  { id: 'timeline', name: 'Timeline', desc: 'Entries on a vertical line', set: { columns: 'one', header: 'left', itemStyle: 'timeline', heading: 'plain' } },
  { id: 'dates-left', name: 'Dates left', desc: 'Dates in their own column', set: { columns: 'one', header: 'center', itemStyle: 'dates-left', heading: 'line' } },
  { id: 'side-headings', name: 'Side headings', desc: 'Section titles in a left gutter', set: { columns: 'one', header: 'left', itemStyle: 'stacked', heading: 'side' } },
  { id: 'cards', name: 'Cards', desc: 'Each entry on a soft card', set: { columns: 'right', sideStyle: 'plain', header: 'split', itemStyle: 'cards', heading: 'dot' } },
  { id: 'compact', name: 'Compact', desc: 'Dense two columns, fits more', set: { columns: 'right', sideStyle: 'rule', header: 'split', itemStyle: 'stacked', heading: 'caps' } },
  { id: 'ats', name: 'ATS plain', desc: 'Single column, no graphics', set: { columns: 'one', header: 'left', itemStyle: 'stacked', heading: 'line', contactStyle: 'pipes', showPhoto: false, skillStyle: 'inline' } },
  { id: 'editorial', name: 'Editorial', desc: 'Centered masthead and double rules', set: { columns: 'one', header: 'center', itemStyle: 'ruled', heading: 'double', contactStyle: 'pipes' } },
  { id: 'framed', name: 'Framed', desc: 'Split header and outlined entries', set: { columns: 'one', header: 'split', itemStyle: 'bordered', heading: 'bracket' } },
  { id: 'ribbon-cols', name: 'Ribbon columns', desc: 'Banner, soft headings and sidebar', set: { columns: 'right', sideStyle: 'tint', header: 'left', headerBanner: true, itemStyle: 'ruled', heading: 'ribbon' } },
];

/* ---------- Default design ---------- */
RS.DEFAULT_DESIGN = {
  template: 'modern',
  layout: 'sidebar-left',
  columns: 'left', sideWidth: 32, sideStyle: 'filled',
  header: 'sidebar', headerBanner: false, heading: 'caps', itemStyle: 'stacked',
  skillStyle: 'bars', bullet: 'disc', contactStyle: 'icons',
  theme: 'slate', accent: '', sideColor: '',
  fontHeading: 'Inter', fontBody: 'Inter',
  fontSize: 10, lineHeight: 1.4, nameSize: 2.4, headingSize: 1.05,
  sectionGap: 1.2, itemGap: 0.7, margin: 14,
  pageSize: 'A4', justify: false, hyphenate: true, upperHeadings: true, upperName: false,
  boldName: true, showPhoto: true, photoShape: 'circle', photoSize: 30,
  dateAlign: 'right', showGuides: true, customCss: '',
};

/* ---------- Design templates (full looks) ---------- */
RS.TEMPLATES = [
  { id: 'modern', name: 'Modern', set: { layout: 'sidebar-left', theme: 'slate', fontHeading: 'Inter', fontBody: 'Inter', skillStyle: 'bars', photoShape: 'circle' } },
  { id: 'harvard', name: 'Harvard', set: { layout: 'classic', theme: 'ink', fontHeading: 'EB Garamond', fontBody: 'EB Garamond', fontSize: 11, skillStyle: 'inline', showPhoto: false, contactStyle: 'pipes', upperHeadings: true } },
  { id: 'executive', name: 'Executive', set: { layout: 'side-headings', theme: 'navy', fontHeading: 'Libre Baskerville', fontBody: 'Source Sans 3', skillStyle: 'inline', showPhoto: false, upperHeadings: false, heading: 'side' } },
  { id: 'silicon', name: 'Silicon', set: { layout: 'split', theme: 'royal', fontHeading: 'Inter', fontBody: 'Inter', skillStyle: 'tags', heading: 'bar', showPhoto: false } },
  { id: 'horizon', name: 'Horizon', set: { layout: 'banner-cols', theme: 'ocean', fontHeading: 'Montserrat', fontBody: 'Open Sans', skillStyle: 'dots', photoShape: 'rounded' } },
  { id: 'chronicle', name: 'Chronicle', set: { layout: 'timeline', theme: 'teal', fontHeading: 'Poppins', fontBody: 'Inter', skillStyle: 'tags', heading: 'plain', showPhoto: false } },
  { id: 'minimal', name: 'Minimal', set: { layout: 'left', theme: 'charcoal', fontHeading: 'Work Sans', fontBody: 'Work Sans', heading: 'plain', skillStyle: 'inline', sectionGap: 1.6, showPhoto: false, contactStyle: 'plain', bullet: 'dash' } },
  { id: 'compact', name: 'Compact', set: { layout: 'compact', theme: 'steel', fontHeading: 'Roboto', fontBody: 'Roboto', fontSize: 9, sectionGap: 0.9, itemGap: 0.5, margin: 10, skillStyle: 'list', showPhoto: false } },
  { id: 'creative', name: 'Creative', set: { layout: 'sidebar-left', theme: 'coral', fontHeading: 'DM Serif Display', fontBody: 'DM Sans', heading: 'block', skillStyle: 'dots', upperHeadings: false, nameSize: 2.7 } },
  { id: 'academic', name: 'Academic CV', set: { layout: 'dates-left', theme: 'burgundy', fontHeading: 'Crimson Pro', fontBody: 'Crimson Pro', fontSize: 11, skillStyle: 'list', showPhoto: false, upperHeadings: false } },
  { id: 'elegant', name: 'Elegant', set: { layout: 'classic', theme: 'sand', fontHeading: 'Playfair Display', fontBody: 'Lato', heading: 'underline', skillStyle: 'inline', upperHeadings: false, upperName: true, nameSize: 2.6, photoShape: 'circle' } },
  { id: 'terminal', name: 'Terminal', set: { layout: 'left', theme: 'cyber', fontHeading: 'IBM Plex Mono', fontBody: 'IBM Plex Sans', heading: 'dot', skillStyle: 'tags', showPhoto: false, bullet: 'arrow' } },
  { id: 'cards', name: 'Cards', set: { layout: 'cards', theme: 'mint', fontHeading: 'Nunito', fontBody: 'Nunito', skillStyle: 'bars', showPhoto: false } },
  { id: 'corporate', name: 'Corporate', set: { layout: 'banner', theme: 'navy', fontHeading: 'Lato', fontBody: 'Lato', skillStyle: 'grid', photoShape: 'square' } },
  { id: 'pastel', name: 'Pastel', set: { layout: 'tint-left', theme: 'lavender', fontHeading: 'Raleway', fontBody: 'Lato', skillStyle: 'dots', heading: 'underline', photoShape: 'rounded' } },
  { id: 'bold', name: 'Bold', set: { layout: 'banner', theme: 'crimson', fontHeading: 'Oswald', fontBody: 'Roboto', heading: 'block', skillStyle: 'bars', upperName: true, nameSize: 2.8 } },
  { id: 'ats', name: 'ATS Friendly', set: { layout: 'ats', theme: 'ink', fontHeading: 'Arial', fontBody: 'Arial', fontSize: 10.5, upperHeadings: true } },
  { id: 'midnight', name: 'Midnight', set: { layout: 'sidebar-left', theme: 'midnight', fontHeading: 'Space Grotesk', fontBody: 'Inter', skillStyle: 'bars', photoShape: 'rounded' } },
  { id: 'nordic', name: 'Nordic', set: { layout: 'sidebar-right', sideStyle: 'tint', header: 'left', theme: 'sky', fontHeading: 'Josefin Sans', fontBody: 'Nunito', skillStyle: 'dots', heading: 'line' } },
  { id: 'garamond', name: 'Garamond', set: { layout: 'banner-center', theme: 'olive', fontHeading: 'Cormorant Garamond', fontBody: 'EB Garamond', fontSize: 11, heading: 'boxed', skillStyle: 'inline', showPhoto: false } },
  { id: 'studio', name: 'Studio', set: { layout: 'split', columns: 'left', sideStyle: 'rule', theme: 'terracotta', fontHeading: 'DM Sans', fontBody: 'DM Sans', heading: 'caps', skillStyle: 'tags', showPhoto: false } },
  { id: 'scholar', name: 'Scholar', set: { layout: 'side-headings', theme: 'forest', fontHeading: 'Source Serif 4', fontBody: 'Source Serif 4', skillStyle: 'list', showPhoto: false, upperHeadings: false } },
  { id: 'vivid', name: 'Vivid', set: { layout: 'banner-cols', theme: 'violet', fontHeading: 'Sora', fontBody: 'Manrope', skillStyle: 'tags', heading: 'bar', photoShape: 'circle' } },
  { id: 'sunrise', name: 'Sunrise', set: { layout: 'sidebar-right', theme: 'tangerine', fontHeading: 'Outfit', fontBody: 'Outfit', skillStyle: 'bars', heading: 'caps' } },
  { id: 'editorial', name: 'Editorial', desc: 'Serif masthead with fine double rules', set: { layout: 'editorial', theme: 'espresso', fontHeading: 'Source Serif 4', fontBody: 'Source Sans 3', skillStyle: 'inline', showPhoto: false, upperHeadings: true, nameSize: 2.9 } },
  { id: 'architect', name: 'Architect', desc: 'Structured dates and bracketed headings', set: { layout: 'dates-left', theme: 'charcoal', fontHeading: 'Oswald', fontBody: 'Barlow', heading: 'bracket', skillStyle: 'grid', showPhoto: false, upperName: true } },
  { id: 'aurora', name: 'Aurora', desc: 'Lagoon banner with a soft sidebar', set: { layout: 'ribbon-cols', theme: 'lagoon', fontHeading: 'Plus Jakarta Sans', fontBody: 'Inter', skillStyle: 'tags', photoShape: 'rounded', upperHeadings: false } },
  { id: 'linen', name: 'Linen', desc: 'Warm paper and understated typography', set: { layout: 'editorial', theme: 'linen', fontHeading: 'Georgia', fontBody: 'Calibri', heading: 'ribbon', skillStyle: 'inline', upperHeadings: false, showPhoto: false, sectionGap: 1.4 } },
  { id: 'cobalt', name: 'Cobalt', desc: 'Deep blue sidebar and clean outlines', set: { layout: 'sidebar-left', theme: 'cobalt', fontHeading: 'Montserrat', fontBody: 'Open Sans', heading: 'double', itemStyle: 'bordered', skillStyle: 'dots', showPhoto: false, sideWidth: 30 } },
  { id: 'copper', name: 'Copper', desc: 'Warm accents and framed experience', set: { layout: 'framed', theme: 'copper', fontHeading: 'Bitter', fontBody: 'Lato', skillStyle: 'tags', upperHeadings: false, showPhoto: false } },
  { id: 'atlas', name: 'Atlas', desc: 'Open two-column layout with a fine divider', set: { layout: 'compact', theme: 'slate', fontHeading: 'Space Grotesk', fontBody: 'IBM Plex Sans', heading: 'bracket', itemStyle: 'ruled', skillStyle: 'list', sideWidth: 28, upperHeadings: false, showPhoto: false } },
  { id: 'botanical', name: 'Botanical', desc: 'Sage tones with gentle section ribbons', set: { layout: 'tint-left', theme: 'sage', fontHeading: 'Alegreya', fontBody: 'Karla', heading: 'ribbon', itemStyle: 'ruled', skillStyle: 'tags', upperHeadings: false, photoShape: 'rounded' } },
  { id: 'mono', name: 'Mono', desc: 'Technical typography and compact detail', set: { layout: 'left', theme: 'graphite', fontHeading: 'JetBrains Mono', fontBody: 'IBM Plex Sans', heading: 'double', itemStyle: 'ruled', skillStyle: 'inline', contactStyle: 'pipes', showPhoto: false, nameSize: 2.2, fontSize: 9.5 } },
  { id: 'portfolio', name: 'Portfolio', desc: 'Violet banner and framed project entries', set: { layout: 'ribbon-cols', theme: 'violet', fontHeading: 'Outfit', fontBody: 'DM Sans', itemStyle: 'bordered', skillStyle: 'tags', upperHeadings: false, nameSize: 3, photoShape: 'square' } },
  { id: 'heritage', name: 'Heritage', desc: 'Traditional serif with generous spacing', set: { layout: 'editorial', theme: 'burgundy', fontHeading: 'Garamond', fontBody: 'Cambria', skillStyle: 'inline', showPhoto: false, upperHeadings: false, fontSize: 11, nameSize: 2.8, sectionGap: 1.4 } },
  { id: 'precision', name: 'Precision', desc: 'Compact professional layout with clear dividers', set: { layout: 'compact', theme: 'steel', fontHeading: 'Calibri', fontBody: 'Calibri', heading: 'bracket', itemStyle: 'ruled', skillStyle: 'list', fontSize: 9.5, sectionGap: 0.8, itemGap: 0.4, margin: 10, showPhoto: false } },
];

/* Apply a layout or template on top of a design object. */
RS.applyLayout = function (design, layoutId) {
  const l = RS.LAYOUTS.find(x => x.id === layoutId);
  if (!l) return design;
  return RS.normHeader(Object.assign(design, { sideStyle: 'filled', headerBanner: false, contactStyle: design.contactStyle === 'pipes' ? 'icons' : design.contactStyle }, l.set, { layout: l.id }));
};
// Older saves stored the colour banner as its own header style.
RS.normHeader = function (design) {
  if (design.header === 'banner') Object.assign(design, { header: 'left', headerBanner: true });
  else if (design.header === 'banner-center') Object.assign(design, { header: 'center', headerBanner: true });
  return design;
};
RS.applyTemplate = function (design, templateId) {
  const t = RS.TEMPLATES.find(x => x.id === templateId);
  if (!t) return design;
  const keep = { pageSize: design.pageSize, showGuides: design.showGuides, customCss: design.customCss };
  const d = Object.assign({}, RS.DEFAULT_DESIGN, keep);
  RS.applyLayout(d, t.set.layout || d.layout);
  return Object.assign(d, t.set, { template: t.id });
};

/* ---------- Section types ---------- */
const F = (key, label, opts) => Object.assign({ key, label, type: 'text' }, opts || {});
const DESC = F('description', 'Description', { type: 'textarea', hint: 'One point per line. Start a line with "- " for a bullet. **bold**, *italic*, [link](url).' });
const CURRENT = F('current', 'I currently work here', { type: 'check' });
RS.SECTION_TYPES = {
  text: { name: 'Text / Summary', icon: '¶', col: 'main', fields: [] },
  experience: { name: 'Experience', icon: '💼', col: 'main', fields: [F('position', 'Position'), F('company', 'Company'), F('location', 'Location'), F('start', 'Start', { half: true }), F('end', 'End', { half: true }), CURRENT, DESC], label: i => i.position || i.company },
  education: { name: 'Education', icon: '🎓', col: 'main', fields: [F('degree', 'Degree / course'), F('school', 'School'), F('location', 'Location'), F('start', 'Start', { half: true }), F('end', 'End', { half: true }), DESC], label: i => i.degree || i.school },
  projects: { name: 'Projects', icon: '🧩', col: 'main', fields: [F('name', 'Project'), F('role', 'Role / tagline'), F('link', 'Link', { type: 'url' }), F('start', 'Start', { half: true }), F('end', 'End', { half: true }), DESC], label: i => i.name },
  skills: { name: 'Skills', icon: '★', col: 'side', fields: [F('name', 'Skill or group'), F('level', 'Level', { type: 'level' }), F('keywords', 'Keywords (optional)', { hint: 'e.g. React, Node, SQL' })], label: i => i.name },
  languages: { name: 'Languages', icon: '🌐', col: 'side', fields: [F('name', 'Language'), F('fluency', 'Fluency', { hint: 'e.g. Native, Fluent' }), F('level', 'Level', { type: 'level' })], label: i => i.name },
  certifications: { name: 'Certifications', icon: '✔', col: 'side', fields: [F('name', 'Certificate'), F('issuer', 'Issuer'), F('date', 'Date', { half: true }), F('link', 'Link', { type: 'url', half: true }), F('credential', 'Credential ID or expiry', { hint: 'e.g. Licence 123456, or Renew 2028' })], label: i => i.name },
  awards: { name: 'Awards', icon: '🏆', col: 'main', fields: [F('title', 'Award'), F('issuer', 'Awarded by'), F('date', 'Date'), DESC], label: i => i.title },
  publications: { name: 'Publications', icon: '📄', col: 'main', fields: [F('title', 'Title'), F('publisher', 'Publisher / journal'), F('date', 'Date', { half: true }), F('link', 'Link', { type: 'url', half: true }), DESC], label: i => i.title },
  volunteer: { name: 'Volunteering', icon: '🤝', col: 'main', fields: [F('role', 'Role'), F('organisation', 'Organisation'), F('location', 'Location'), F('start', 'Start', { half: true }), F('end', 'End', { half: true }), CURRENT, DESC], label: i => i.role || i.organisation },
  references: { name: 'References', icon: '☎', col: 'side', fields: [F('name', 'Name'), F('role', 'Role / company'), F('contact', 'Contact'), DESC], label: i => i.name },
  interests: { name: 'Interests', icon: '♥', col: 'side', fields: [F('name', 'Interest'), F('keywords', 'Details (optional)')], label: i => i.name },
  custom: { name: 'Custom', icon: '✚', col: 'main', fields: [F('title', 'Title'), F('subtitle', 'Subtitle'), F('location', 'Location'), F('start', 'Start / date', { half: true }), F('end', 'End', { half: true }), F('link', 'Link', { type: 'url' }), DESC], label: i => i.title },
};

/* ---------- Sample content ---------- */
let _id = 0;
RS.uid = () => Date.now().toString(36) + (++_id).toString(36) + Math.random().toString(36).slice(2, 6);
function sec(type, title, items, extra) {
  return Object.assign({ id: RS.uid(), type, title, visible: true, col: RS.SECTION_TYPES[type].col, items: type === 'text' ? [] : items.map(i => Object.assign({ id: RS.uid() }, i)) }, type === 'text' ? { content: items } : {}, extra || {});
}
const sk = (name, level, keywords) => ({ name, level, keywords: keywords || '' });
const lang = (name, fluency, level) => ({ name, fluency, level });

RS.SAMPLES = [
  {
    id: 'software', name: 'Software Engineer',
    make: () => ({
      basics: { name: 'Alex Skywalker', title: 'Senior Software Engineer', email: 'alex.skywalker@example.com', phone: '+1 555 014 2290', location: 'Seattle, WA', website: 'alexskywalker.example', linkedin: 'linkedin.example/in/alexskywalker', github: 'github.example/alexskywalker', photo: '', links: [] },
      sections: [
        sec('text', 'Profile', 'Full-stack engineer with 8 years of experience building fast, reliable web platforms. I enjoy turning messy problems into simple systems, mentoring developers and shipping work that customers notice.'),
        sec('experience', 'Experience', [
          { position: 'Senior Software Engineer', company: 'Northwind Cloud', location: 'Seattle, WA', start: 'Mar 2021', end: 'Present', description: '- Led a team of 5 rebuilding the billing platform in TypeScript and Go, cutting invoice errors by **92%**\n- Designed an event pipeline handling 40M messages a day with 99.99% uptime\n- Introduced feature flags and trunk-based delivery; release time fell from 2 weeks to 1 day' },
          { position: 'Software Engineer', company: 'Brightline Labs', location: 'Portland, OR', start: 'Jun 2018', end: 'Feb 2021', description: '- Built the React design system used across 14 products\n- Reduced page load time by 48% with code splitting and image pipelines\n- Mentored 4 junior developers through their first year' },
          { position: 'Junior Developer', company: 'Pixel & Pine', location: 'Portland, OR', start: 'Jan 2017', end: 'May 2018', description: '- Delivered 20+ client websites and e-commerce stores\n- Automated deployments with CI pipelines' },
        ]),
        sec('projects', 'Projects', [
          { name: 'Tidewater', role: 'Open-source job queue for Node.js', link: 'github.example/alexskywalker/tidewater', start: '2022', end: '', description: '3.2k stars on GitHub; used in production by 60+ companies.' },
        ]),
        sec('education', 'Education', [
          { degree: 'B.Sc. Computer Science', school: 'University of Washington', location: 'Seattle, WA', start: '2012', end: '2016', description: 'Graduated with honours. Capstone: real-time collaborative editor.' },
        ]),
        sec('skills', 'Skills', [sk('TypeScript', 5), sk('React', 5), sk('Node.js', 4), sk('Go', 4), sk('PostgreSQL', 4), sk('AWS', 3), sk('Kubernetes', 3)]),
        sec('languages', 'Languages', [lang('English', 'Native', 5), lang('Spanish', 'Professional', 3)]),
        sec('certifications', 'Certifications', [{ name: 'AWS Solutions Architect', issuer: 'Amazon Web Services', date: '2023', link: '' }]),
        sec('interests', 'Interests', [{ name: 'Rock climbing' }, { name: 'Mechanical keyboards' }, { name: 'Open source' }]),
      ],
    }),
  },
  {
    id: 'designer', name: 'Product Designer',
    make: () => ({
      basics: { name: 'Priya Nair', title: 'Product Designer', email: 'priya.nair@example.com', phone: '+44 20 7946 0321', location: 'London, UK', website: 'priyanair.example', linkedin: 'linkedin.example/in/priyanair', github: '', photo: '', links: [{ label: 'Dribbble', url: 'dribbble.com/priyanair' }] },
      sections: [
        sec('text', 'About me', 'Product designer who blends research, interaction design and visual craft. Six years designing mobile and web products for fintech and health, from first sketch to polished release.'),
        sec('experience', 'Experience', [
          { position: 'Lead Product Designer', company: 'Fernleaf Health', location: 'London', start: '2022', end: 'Present', description: '- Redesigned patient onboarding; completion rose from 61% to 87%\n- Built and maintain a design system of 180 components in Figma\n- Run weekly research sessions with patients and clinicians' },
          { position: 'Product Designer', company: 'Coinpath', location: 'London', start: '2019', end: '2022', description: '- Designed the budgeting app used by 1.4M people\n- Partnered with engineering to ship accessible, WCAG AA interfaces' },
          { position: 'UI Designer', company: 'Studio Haze', location: 'Manchester', start: '2018', end: '2019', description: '- Brand and web design for startups and arts organisations' },
        ]),
        sec('education', 'Education', [{ degree: 'BA Graphic Design', school: 'Manchester School of Art', start: '2015', end: '2018', description: 'First class honours' }]),
        sec('skills', 'Skills', [sk('Figma', 5), sk('User research', 5), sk('Prototyping', 4), sk('Design systems', 5), sk('Motion design', 3), sk('HTML & CSS', 3)]),
        sec('awards', 'Awards', [{ title: 'Best Health App', issuer: 'UK App Awards', date: '2023', description: '' }]),
        sec('languages', 'Languages', [lang('English', 'Native', 5), lang('Malayalam', 'Fluent', 4), lang('French', 'Conversational', 2)]),
      ],
    }),
  },
  {
    id: 'nurse', name: 'Registered Nurse',
    make: () => ({
      basics: { name: 'Jordan Ellis', title: 'Registered Nurse (RN)', email: 'jordan.ellis@example.com', phone: '+61 400 555 018', location: 'Melbourne, VIC', website: '', linkedin: 'linkedin.example/in/jordanellisrn', github: '', photo: '', links: [] },
      sections: [
        sec('text', 'Summary', 'Compassionate registered nurse with 7 years in emergency and acute care. Calm under pressure, skilled in triage and dedicated to patient-centred care and clear communication with families.'),
        sec('experience', 'Clinical experience', [
          { position: 'Clinical Nurse, Emergency', company: 'St Vincent\'s Hospital', location: 'Melbourne', start: '2021', end: 'Present', description: '- Triage and care for 30+ patients per shift in a level 1 trauma centre\n- Precept graduate nurses and coordinate the department\'s sepsis protocol\n- Reduced medication incidents in the unit by 35% through a double-check program' },
          { position: 'Registered Nurse, Medical Ward', company: 'Alfred Health', location: 'Melbourne', start: '2018', end: '2021', description: '- Delivered care for patients with complex cardiac and respiratory needs\n- Led discharge planning with allied health teams' },
        ]),
        sec('education', 'Education', [
          { degree: 'Bachelor of Nursing', school: 'Monash University', start: '2015', end: '2017', description: '' },
          { degree: 'Graduate Certificate in Emergency Nursing', school: 'Deakin University', start: '2020', end: '2021', description: '' },
        ]),
        sec('certifications', 'Registrations & certificates', [
          { name: 'AHPRA Registered Nurse', issuer: 'Nursing and Midwifery Board', date: 'Current' },
          { name: 'Advanced Life Support (ALS2)', issuer: 'ARC', date: '2024' },
          { name: 'Triage Education', issuer: 'Safer Care Victoria', date: '2022' },
        ]),
        sec('skills', 'Skills', [sk('Triage', 5), sk('Wound care', 4), sk('IV cannulation', 5), sk('Patient education', 5), sk('Electronic records', 4)]),
        sec('references', 'References', [{ name: 'Available on request', role: '', contact: '' }]),
      ],
    }),
  },
  {
    id: 'teacher', name: 'Teacher',
    make: () => ({
      basics: { name: 'Sam Okafor', title: 'Secondary Science Teacher', email: 'sam.okafor@example.com', phone: '+1 555 302 7781', location: 'Toronto, ON', website: '', linkedin: 'linkedin.example/in/samokafor', github: '', photo: '', links: [] },
      sections: [
        sec('text', 'Profile', 'Enthusiastic science teacher with 9 years of classroom experience. I design hands-on lessons that make chemistry and physics click, and I lead the school\'s STEM club and robotics team.'),
        sec('experience', 'Teaching experience', [
          { position: 'Science Teacher & STEM Lead', company: 'Lakeside Collegiate', location: 'Toronto', start: '2019', end: 'Present', description: '- Teach Grades 9–12 chemistry and physics to 150 students a year\n- Raised senior chemistry pass rate from 78% to 94%\n- Founded the robotics team; regional finalists in 2023 and 2024' },
          { position: 'Science Teacher', company: 'Westview Secondary', location: 'Hamilton', start: '2015', end: '2019', description: '- Developed a project-based Grade 10 science curriculum adopted district-wide' },
        ]),
        sec('education', 'Education', [
          { degree: 'Bachelor of Education', school: 'University of Toronto', start: '2014', end: '2015' },
          { degree: 'B.Sc. Chemistry', school: 'McMaster University', start: '2010', end: '2014' },
        ]),
        sec('skills', 'Skills', [sk('Curriculum design', 5), sk('Classroom management', 5), sk('Lab safety', 5), sk('Google Classroom', 4), sk('Differentiated learning', 4)]),
        sec('volunteer', 'Volunteering', [{ role: 'Mentor', organisation: 'Girls Who Build', location: 'Toronto', start: '2021', end: 'Present', description: 'Weekend engineering workshops for teens.' }]),
        sec('certifications', 'Certifications', [{ name: 'Ontario Certified Teacher', issuer: 'OCT', date: '2015' }]),
      ],
    }),
  },
  {
    id: 'marketing', name: 'Marketing Manager',
    make: () => ({
      basics: { name: 'Taylor Brooks', title: 'Marketing Manager', email: 'taylor.brooks@example.com', phone: '+1 555 448 1903', location: 'Austin, TX', website: 'taylorbrooks.example', linkedin: 'linkedin.example/in/taylorbrooks', github: '', photo: '', links: [] },
      sections: [
        sec('text', 'Summary', 'Data-driven marketer with 10 years growing B2B and consumer brands. I build teams and campaigns that tie creative work to revenue: brand, demand generation, content and lifecycle.'),
        sec('experience', 'Experience', [
          { position: 'Marketing Manager', company: 'Harvestly', location: 'Austin, TX', start: '2020', end: 'Present', description: '- Grew marketing-sourced pipeline 3.1x in two years with a $1.2M budget\n- Launched a podcast and newsletter reaching 85,000 subscribers\n- Manage a team of 6 across content, paid and events' },
          { position: 'Digital Marketing Lead', company: 'Juniper & Co', location: 'Dallas, TX', start: '2016', end: '2020', description: '- Cut cost per acquisition by 41% through testing and audience modelling\n- Rebuilt the website, lifting organic traffic 160%' },
          { position: 'Marketing Coordinator', company: 'Bluebonnet Media', location: 'Dallas, TX', start: '2014', end: '2016', description: '' },
        ]),
        sec('education', 'Education', [{ degree: 'BBA Marketing', school: 'University of Texas at Austin', start: '2010', end: '2014' }]),
        sec('skills', 'Skills', [sk('Strategy', 0, 'Brand, positioning, go-to-market'), sk('Digital', 0, 'Google Ads, Meta, LinkedIn, SEO'), sk('Tools', 0, 'HubSpot, Salesforce, GA4, Looker')]),
        sec('awards', 'Awards', [{ title: '40 Under 40 in Marketing', issuer: 'Austin Business Journal', date: '2023' }]),
      ],
    }),
  },
  {
    id: 'graduate', name: 'Student / Graduate',
    make: () => ({
      basics: { name: 'Mia Chen', title: 'Business Analytics Graduate', email: 'mia.chen@example.com', phone: '+1 555 770 2214', location: 'Boston, MA', website: '', linkedin: 'linkedin.example/in/miachen', github: 'github.example/miachen', photo: '', links: [] },
      sections: [
        sec('text', 'Objective', 'Recent graduate in business analytics looking for an analyst role where I can turn data into clear recommendations. Strong in SQL, Python and storytelling with dashboards.'),
        sec('education', 'Education', [{ degree: 'B.S. Business Analytics', school: 'Northeastern University', location: 'Boston, MA', start: '2021', end: '2025', description: '- GPA 3.8 / 4.0, Dean\'s List every semester\n- Thesis: forecasting retail demand with gradient boosting' }]),
        sec('experience', 'Internships', [
          { position: 'Data Analyst Intern', company: 'Harbor Retail Group', location: 'Boston, MA', start: 'Jan 2024', end: 'Jun 2024', description: '- Built a Tableau dashboard used weekly by 40 store managers\n- Automated a reporting process, saving 12 hours a week' },
          { position: 'Research Assistant', company: 'Northeastern Analytics Lab', location: 'Boston, MA', start: 'Sep 2023', end: 'Dec 2023', description: '- Cleaned and analysed survey data from 5,000 respondents' },
        ]),
        sec('projects', 'Projects', [{ name: 'Campus Bike Share Forecast', role: 'Team lead, class project', link: '', start: '2024', end: '', description: 'Predicted station demand with 89% accuracy; presented to the university transport office.' }]),
        sec('skills', 'Skills', [sk('SQL', 4), sk('Python', 4), sk('Tableau', 4), sk('Excel', 5), sk('Statistics', 4)]),
        sec('languages', 'Languages', [lang('English', 'Fluent', 5), lang('Mandarin', 'Native', 5)]),
        sec('volunteer', 'Activities', [{ role: 'Treasurer', organisation: 'Women in Business Club', start: '2022', end: '2024', description: '' }]),
      ],
    }),
  },
  {
    id: 'chef', name: 'Chef / Hospitality',
    make: () => ({
      basics: { name: 'Luca Romano', title: 'Head Chef', email: 'luca.romano@example.com', phone: '+353 1 555 0182', location: 'Dublin, Ireland', website: '', linkedin: '', github: '', photo: '', links: [{ label: 'Instagram', url: 'instagram.com/chefluca' }] },
      sections: [
        sec('text', 'Profile', 'Head chef with 12 years in fine dining and busy bistros. Seasonal, produce-led cooking; strong on costing, food safety and building kitchen teams people want to stay in.'),
        sec('experience', 'Experience', [
          { position: 'Head Chef', company: 'The Larder', location: 'Dublin', start: '2020', end: 'Present', description: '- Lead a brigade of 11 serving 220 covers a night\n- Held food cost at 27% while introducing a tasting menu\n- Restaurant named in the Michelin Guide 2024' },
          { position: 'Sous Chef', company: 'Osteria Verde', location: 'Bologna', start: '2016', end: '2020', description: '- Fresh pasta program and supplier relationships with local farms' },
          { position: 'Chef de Partie', company: 'Hotel Aurora', location: 'Milan', start: '2013', end: '2016', description: '' },
        ]),
        sec('education', 'Training', [{ degree: 'Culinary Arts Diploma', school: 'ALMA International School', location: 'Parma', start: '2011', end: '2013' }]),
        sec('skills', 'Skills', [sk('Menu development', 5), sk('Food costing', 4), sk('HACCP', 5), sk('Team leadership', 5), sk('Pastry', 3)]),
        sec('languages', 'Languages', [lang('Italian', 'Native', 5), lang('English', 'Fluent', 5)]),
        sec('awards', 'Awards', [{ title: 'Young Chef of the Year (finalist)', issuer: 'Irish Restaurant Awards', date: '2021' }]),
      ],
    }),
  },
  {
    id: 'webdev', name: 'Junior Web Developer (AU)',
    make: () => ({
      basics: { name: 'Priya Ramanathan', title: 'Junior Web Developer', email: 'priya.r@example.com', phone: '0400 123 456', location: 'Dandenong VIC', website: 'priya-dev.example', linkedin: 'linkedin.example/in/priya-example', github: '', photo: '', links: [] },
      sections: [
        sec('text', 'Summary', 'Junior web developer with a Certificate IV in Information Technology and hands-on experience building responsive sites for small businesses. Comfortable with HTML, CSS, JavaScript and WordPress, and quick to pick up new tools. Looking for a graduate or junior role in a team that ships often.'),
        sec('experience', 'Experience', [
          { position: 'Web Developer (Internship)', company: 'Brightline Digital', location: 'Melbourne VIC', start: 'Feb 2026', end: '', current: true, description: '- Built and maintained 6 client WordPress sites, including custom theme changes\n- Cut average page load time from 4.1s to 1.8s by compressing images and deferring scripts\n- Wrote handover guides so clients could update their own content' },
          { position: 'IT Support Assistant', company: 'Southside Community Library', location: 'Narre Warren VIC', start: 'Mar 2024', end: 'Jan 2026', description: '- Resolved around 25 hardware and account tickets a week for staff and patrons\n- Set up and imaged 30 public-access PCs during a fleet refresh\n- Ran monthly digital skills sessions for seniors' },
        ]),
        sec('education', 'Education & training', [
          { degree: 'Certificate IV in Information Technology (Web Development)', school: 'Example TAFE Institute', location: 'Dandenong VIC', start: '2024', end: '2025', description: 'Capstone: online booking site for a local physio clinic' },
          { degree: 'Victorian Certificate of Education', school: 'Example Secondary College', location: 'Cranbourne VIC', start: '', end: '2023', description: '' },
        ]),
        sec('certifications', 'Licences & certifications', [{ name: 'Provide First Aid (HLTAID011)', issuer: 'Example Training Co.', date: '2025', link: '', credential: 'Renew 2028' }]),
        sec('skills', 'Skills', [sk('Web', 0, 'HTML, CSS, JavaScript, WordPress, Responsive design, Accessibility (WCAG 2.1)'), sk('Tools', 0, 'Git & GitHub, Figma, VS Code, Chrome DevTools')]),
        sec('projects', 'Projects', [{ name: 'Footy Fixture Tracker', role: '', link: 'github.example/example/fixtures', start: '', end: '', description: "Vanilla JS app that pulls fixture data and shows a club's next five games, with offline caching." }]),
        sec('languages', 'Languages', [lang('English', 'Native', 0), lang('Tamil', 'Conversational', 0)]),
        sec('text', 'References', 'Available on request'),
      ],
    }),
  },
  {
    id: 'blank', name: 'Blank resume',
    make: () => ({
      basics: { name: 'Your Name', title: 'Job title', email: 'you@example.com', phone: '', location: '', website: '', linkedin: '', github: '', photo: '', links: [] },
      sections: [
        sec('text', 'Summary', 'A sentence or two about who you are and what you are looking for.'),
        sec('experience', 'Experience', [{ position: 'Position', company: 'Company', location: '', start: 'Start', end: 'End', description: '- What you achieved' }]),
        sec('education', 'Education', [{ degree: 'Degree', school: 'School', location: '', start: '', end: '', description: '' }]),
        sec('skills', 'Skills', [sk('Skill', 3)]),
      ],
    }),
  },
];
