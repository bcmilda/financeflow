// FinanceFlow · v11.58 · ikony.js · 2026-10-09
// ══════════════════════════════════════════════════════════════════════
//  S25 (v11.58, Milan – TODO-323): VLASTNÍ SADA IKON (SVG) místo emoji.
//  Styl B „obrys + jemná výplň“: mřížka 24×24, tah 1,75, zaoblené konce,
//  barva = currentColor (výplň stejnou barvou na 22 %). Emoji vypadají na
//  každém telefonu jinak, tyhle všude stejně.
//
//  Ikony se k položkám PŘIŘAZUJÍ SAMY přes taxonomii (ffIkonaTax):
//    1) podkategorie má vlastní ikonu (jogurty → kelímek)
//    2) jinak ikona a barva OBLASTI (Potraviny → košík)
//    3) položka mimo taxonomii → šedá „Nezařazené“
//  Návrh: plátno „FinanceFlow – sada ikon“ (claude.ai). Nová ikona = nový
//  řádek v FF_IKONY (+ případně v FF_IKONY_PODKAT), nic jiného se nemění.
// ══════════════════════════════════════════════════════════════════════

//  [obrys, výplň] – výplň je volitelná ('' = bez výplně)
const FF_IKONY = {
  "potraviny": ["<path d=\"M4 9h16l-1.6 9.3a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7z\"/><path d=\"M8.5 9l3-5.5M15.5 9l-3-5.5\"/><path d=\"M9.5 13v3M14.5 13v3\"/>", "<path d=\"M4 9h16l-1.6 9.3a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7z\"/>"],
  "napoje": ["<path d=\"M6 8h12l-1.4 11.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8z\"/><path d=\"M6.6 13h10.8\"/><path d=\"M13 8l1.8-5H18\"/>", "<path d=\"M6.6 13h10.8l-.8 6.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8z\"/>"],
  "alkohol": ["<path d=\"M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z\"/><path d=\"M15 11h2a2 2 0 0 1 2 2v2.5a2 2 0 0 1-2 2h-2\"/><path d=\"M8.3 12v5.5M11.7 12v5.5\"/><path d=\"M5 8a2.5 2.5 0 0 1 1-4.5c.8-1 2.6-1.4 3.8-.6 1.3-.6 3-.2 3.7 1A2.5 2.5 0 0 1 15 8\"/>", "<path d=\"M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z\"/>"],
  "drogerie": ["<path d=\"M8 10h6v9.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 8 19.5z\"/><path d=\"M9.2 10V7.5h3.6V10\"/><path d=\"M8.5 7.5V4.5h6l2 1.8\"/><path d=\"M19 4.5l1.5-.8M19.3 7H21M19 9.5l1.5.8\"/>", "<path d=\"M8 13h6v6.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 8 19.5z\"/>"],
  "osobni-pece": ["<rect x=\"6.5\" y=\"9\" width=\"11\" height=\"12\" rx=\"3\"/><path d=\"M10 9V6.2h4V9\"/><path d=\"M12 6.2V3.5h4.5\"/><path d=\"M10 15h4\"/>", "<rect x=\"6.5\" y=\"9\" width=\"11\" height=\"12\" rx=\"3\"/>"],
  "obleceni": ["<path d=\"M8.6 3.6 3.8 6.2l1.9 4.3 2.3-1V20h8V9.5l2.3 1 1.9-4.3-4.8-2.6a3.5 3.5 0 0 1-6.8 0z\"/>", "<path d=\"M8 9.5V20h8V9.5z\"/>"],
  "elektronika": ["<rect x=\"4.5\" y=\"4.5\" width=\"15\" height=\"10.5\" rx=\"1.6\"/><path d=\"M2.5 19.5h19\"/><path d=\"M4.5 15 3 19.5M19.5 15l1.5 4.5\"/><path d=\"M10.5 17.3h3\"/>", "<rect x=\"4.5\" y=\"4.5\" width=\"15\" height=\"10.5\" rx=\"1.6\"/>"],
  "dum-zahrada": ["<path d=\"M6.8 14h10.4l-1.3 6.1a1.5 1.5 0 0 1-1.5 1.2H9.6a1.5 1.5 0 0 1-1.5-1.2z\"/><path d=\"M12 14V8.5\"/><path d=\"M12 9.5c0-3.4 2.4-5.6 6.2-5.6 0 3.7-2.6 5.6-6.2 5.6z\"/><path d=\"M12 11.5c0-2.6-2-4.4-5.2-4.4 0 2.9 2.1 4.4 5.2 4.4z\"/>", "<path d=\"M12 9.5c0-3.4 2.4-5.6 6.2-5.6 0 3.7-2.6 5.6-6.2 5.6zM12 11.5c0-2.6-2-4.4-5.2-4.4 0 2.9 2.1 4.4 5.2 4.4z\"/>"],
  "deti": ["<circle cx=\"12\" cy=\"13.2\" r=\"6.6\"/><circle cx=\"6.4\" cy=\"6.6\" r=\"2.3\"/><circle cx=\"17.6\" cy=\"6.6\" r=\"2.3\"/><path d=\"M9.7 12.4h.01M14.3 12.4h.01\"/><path d=\"M10.4 15.8c1.1.8 2.1.8 3.2 0\"/>", "<circle cx=\"12\" cy=\"13.2\" r=\"6.6\"/>"],
  "zvirata": ["<path d=\"M12 13c-3 0-5.5 3.2-5.5 5.2 0 1.5 1.3 2.3 2.8 1.8 1.1-.4 1.8-.6 2.7-.6s1.6.2 2.7.6c1.5.5 2.8-.3 2.8-1.8C17.5 16.2 15 13 12 13z\"/><ellipse cx=\"5.6\" cy=\"10.4\" rx=\"1.7\" ry=\"2.2\"/><ellipse cx=\"9.4\" cy=\"6.3\" rx=\"1.8\" ry=\"2.4\"/><ellipse cx=\"14.6\" cy=\"6.3\" rx=\"1.8\" ry=\"2.4\"/><ellipse cx=\"18.4\" cy=\"10.4\" rx=\"1.7\" ry=\"2.2\"/>", "<path d=\"M12 13c-3 0-5.5 3.2-5.5 5.2 0 1.5 1.3 2.3 2.8 1.8 1.1-.4 1.8-.6 2.7-.6s1.6.2 2.7.6c1.5.5 2.8-.3 2.8-1.8C17.5 16.2 15 13 12 13z\"/>"],
  "auto": ["<path d=\"M5 16.5H4a1 1 0 0 1-1-1V13l2.2-1.1L7 7.8a2 2 0 0 1 1.8-1.1h5.6a2 2 0 0 1 1.6.8l3 3.8 1.5.5a1 1 0 0 1 .7 1v2.7a1 1 0 0 1-1 1h-1.2\"/><path d=\"M9 16.5h6\"/><circle cx=\"7\" cy=\"16.5\" r=\"2\"/><circle cx=\"17\" cy=\"16.5\" r=\"2\"/><path d=\"M5.6 11.9h13.6M11.6 6.9v5\"/>", "<path d=\"M5.2 11.9 7 7.8a2 2 0 0 1 1.8-1.1h5.6a2 2 0 0 1 1.6.8l3 3.8z\"/>"],
  "volny-cas": ["<path d=\"M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z\"/><path d=\"M14.5 6.5v1.5M14.5 11.2v1.6M14.5 16v1.5\"/>", "<path d=\"M3 8a2 2 0 0 1 2-2h9.5v12H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z\"/>"],
  "leky": ["<path d=\"M9.6 3.6a4.4 4.4 0 0 1 6.2 6.2l-6 6a4.4 4.4 0 0 1-6.2-6.2z\"/><path d=\"M6.6 6.6l6.2 6.2\"/><circle cx=\"17.6\" cy=\"17.6\" r=\"3.4\"/><path d=\"M14.2 17.6h6.8\"/>", "<path d=\"M6.6 6.6 3.6 9.6a4.4 4.4 0 0 0 6.2 6.2l3-3z\"/>"],
  "pecivo": ["<path d=\"M3.5 13.5c0-4 3.8-7 8.5-7s8.5 3 8.5 7v3.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z\"/><path d=\"M8.5 9.5 10 12.5M12.2 8.8l1.3 3.2M15.6 9.6l1 2.8\"/>", "<path d=\"M3.5 13.5c0-4 3.8-7 8.5-7s8.5 3 8.5 7v3.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z\"/>"],
  "mleko": ["<path d=\"M7 9.5 9 5.5h6l2 4V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z\"/><path d=\"M9 5.5V3h6v2.5\"/><path d=\"M7 9.5h10\"/><path d=\"M10 14.5h4\"/>", "<path d=\"M7 9.5h10V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z\"/>"],
  "jogurty": ["<path d=\"M5.5 8h13l-1.4 11.2a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z\"/><path d=\"M4.5 8a1.5 1.5 0 0 1 1.5-1.5h12A1.5 1.5 0 0 1 19.5 8\"/><path d=\"M6.4 13c1.9 1 3.8 1 5.6 0s3.7-1 5.6 0\"/>", "<path d=\"M6.4 13c1.9 1 3.8 1 5.6 0s3.7-1 5.6 0l-.5 6.2a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z\"/>"],
  "syry": ["<path d=\"M3 11.5 15.5 5l5.5 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z\"/><path d=\"M3 11.5h18\"/><circle cx=\"8\" cy=\"14.8\" r=\"1.2\"/><circle cx=\"15.2\" cy=\"15.2\" r=\"1\"/>", "<path d=\"M3 11.5h18V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z\"/>"],
  "vejce": ["<path d=\"M12 3c3.6 0 6.5 5.6 6.5 10.2a6.5 6.5 0 0 1-13 0C5.5 8.6 8.4 3 12 3z\"/><path d=\"M9.2 13.5c0 1.4.9 2.6 2.2 3\"/>", "<path d=\"M12 3c3.6 0 6.5 5.6 6.5 10.2a6.5 6.5 0 0 1-13 0C5.5 8.6 8.4 3 12 3z\"/>"],
  "maso": ["<path d=\"M4.5 12.5C4.5 7.8 8.4 4 13 4s7.8 2.8 7 7c-.6 3-2.8 3.6-4.3 5.2-1.4 1.6-2.8 4.6-6.2 4.1S4.5 16.6 4.5 12.5z\"/><circle cx=\"13.8\" cy=\"10\" r=\"2\"/>", "<path d=\"M4.5 12.5C4.5 7.8 8.4 4 13 4s7.8 2.8 7 7c-.6 3-2.8 3.6-4.3 5.2-1.4 1.6-2.8 4.6-6.2 4.1S4.5 16.6 4.5 12.5z\"/>"],
  "ryby": ["<path d=\"M7 12c2.4-4 5.8-6 9.2-6 2.4 0 4.4 2.5 5.3 6-.9 3.5-2.9 6-5.3 6-3.4 0-6.8-2-9.2-6z\"/><path d=\"M7 12 3 8.3v7.4z\"/><path d=\"M17.2 10.6h.01\"/><path d=\"M12 9.5c.8 1.6.8 3.4 0 5\"/>", "<path d=\"M7 12c2.4-4 5.8-6 9.2-6 2.4 0 4.4 2.5 5.3 6-.9 3.5-2.9 6-5.3 6-3.4 0-6.8-2-9.2-6z\"/>"],
  "ovoce": ["<path d=\"M12 7.5c-1.6-1.1-5-1.4-6.4 1.6-1.4 3-.6 7.6 1.4 10 1.6 1.9 3.6 2.2 5 1.3 1.4.9 3.4.6 5-1.3 2-2.4 2.8-7 1.4-10-1.4-3-4.8-2.7-6.4-1.6z\"/><path d=\"M12 7.5c0-2 .9-3.6 2.8-4.3\"/>", "<path d=\"M12 7.5c-1.6-1.1-5-1.4-6.4 1.6-1.4 3-.6 7.6 1.4 10 1.6 1.9 3.6 2.2 5 1.3 1.4.9 3.4.6 5-1.3 2-2.4 2.8-7 1.4-10-1.4-3-4.8-2.7-6.4-1.6z\"/>"],
  "zelenina": ["<path d=\"M14.6 9.4c-1.4-1.4-3.6-1.3-4.9.1L3.8 20.2l10.7-5.9c1.5-1.3 1.6-3.5.1-4.9z\"/><path d=\"M15 9l3.2-3.2M15.2 6.6 15.8 3M17.4 8.8 21 8.2\"/><path d=\"M9.3 12.8l1.4 1.4M7 16.2l.9.9\"/>", "<path d=\"M14.6 9.4c-1.4-1.4-3.6-1.3-4.9.1L3.8 20.2l10.7-5.9c1.5-1.3 1.6-3.5.1-4.9z\"/>"],
  "kava": ["<path d=\"M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z\"/><path d=\"M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16\"/><path d=\"M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3\"/><path d=\"M3 21h14\"/>", "<path d=\"M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z\"/>"],
  "cokolada": ["<rect x=\"6\" y=\"3\" width=\"12\" height=\"18\" rx=\"1.6\"/><path d=\"M6 9h12M6 15h12M12 3v18\"/>", "<rect x=\"6\" y=\"3\" width=\"12\" height=\"18\" rx=\"1.6\"/>"],
  "voda": ["<path d=\"M10 2.5h4v2.8l1.6 2.2v12.7a1 1 0 0 1-1 1H9.4a1 1 0 0 1-1-1V7.5L10 5.3z\"/><path d=\"M8.4 11h7.2M8.4 16h7.2\"/>", "<path d=\"M8.4 11h7.2v5H8.4z\"/>"],
  "vyrobek": ["<path d=\"M12 3 20 7.5v9L12 21l-8-4.5v-9z\"/><path d=\"M4 7.5 12 12l8-4.5M12 12v9\"/><path d=\"M8 5.3l8 4.5\"/>", "<path d=\"M4 7.5 12 12v9l-8-4.5z\"/>"],
  "zarazeni": ["<rect x=\"9\" y=\"3\" width=\"6\" height=\"4.5\" rx=\"1\"/><rect x=\"3\" y=\"16.5\" width=\"6\" height=\"4.5\" rx=\"1\"/><rect x=\"15\" y=\"16.5\" width=\"6\" height=\"4.5\" rx=\"1\"/><path d=\"M12 7.5V12M6 16.5V12h12v4.5\"/>", "<rect x=\"9\" y=\"3\" width=\"6\" height=\"4.5\" rx=\"1\"/>"],
  "uctenka": ["<path d=\"M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z\"/><path d=\"M9 8h6M9 12h6M9 16h3\"/>", "<path d=\"M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z\"/>"],
  "slozeni": ["<path d=\"M5 19.5c0-8.3 5.2-14.5 14.5-14.5 0 9.3-6.2 14.5-14.5 14.5z\"/><path d=\"M5 19.5 13 11.5\"/>", "<path d=\"M5 19.5c0-8.3 5.2-14.5 14.5-14.5 0 9.3-6.2 14.5-14.5 14.5z\"/>"],
  "nakupy": ["<path d=\"M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z\"/><path d=\"M9 10.5V7a3 3 0 0 1 6 0v3.5\"/>", "<path d=\"M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z\"/>"],
  "kraj": ["<path d=\"M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z\"/><circle cx=\"12\" cy=\"10\" r=\"2.4\"/>", "<path d=\"M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z\"/>"],
  "ean": ["<path d=\"M4 6v12M7.2 6v12M10.4 6v12M12.8 6v12M16 6v12M18.4 6v8M20.4 6v8\"/>", ""],
  "rozpocet": ["<path d=\"M5 7.5V6a2 2 0 0 1 2-2h10v3.5\"/><rect x=\"3.5\" y=\"7.5\" width=\"17\" height=\"12\" rx=\"2\"/><path d=\"M15.5 13.5h.01\"/><path d=\"M20.5 11h-4a2.5 2.5 0 0 0 0 5h4\"/>", "<rect x=\"3.5\" y=\"7.5\" width=\"17\" height=\"12\" rx=\"2\"/>"],
  "ziviny": ["<path d=\"M4 20h16\"/><path d=\"M6.5 20v-6M11 20V6M15.5 20v-9M20 20v-4\"/>", ""],
  "foto": ["<path d=\"M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z\"/><circle cx=\"12\" cy=\"13.3\" r=\"3.4\"/>", "<circle cx=\"12\" cy=\"13.3\" r=\"3.4\"/>"],
  "galerie": ["<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"9\" cy=\"9.5\" r=\"1.8\"/><path d=\"M21 15.5 16 10.5l-9 9.5\"/>", "<path d=\"M21 15.5 16 10.5l-9 9.5h12a2 2 0 0 0 2-2z\"/>"],
  "popisek": ["<path d=\"M3.5 12V4.5a1 1 0 0 1 1-1H12l9 9-8.5 8.5z\"/><circle cx=\"8\" cy=\"8\" r=\"1.6\"/>", "<path d=\"M3.5 12V4.5a1 1 0 0 1 1-1H12l9 9-8.5 8.5z\"/>"],
  "upravit": ["<path d=\"M4 20l1-4.2L15.8 5a2.1 2.1 0 0 1 3 3L8.2 19z\"/><path d=\"M13.8 7l3 3\"/>", ""],
  "skenovat": ["<path d=\"M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3\"/><path d=\"M7.5 8v8M10.5 8v8M13.5 8v8M16.5 8v8\"/>", ""],
  "prirazeno": ["<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12.3l2.7 2.7L16 9.5\"/>", "<circle cx=\"12\" cy=\"12\" r=\"9\"/>"],
  "nezname": ["<path d=\"M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z\"/><path d=\"M10 12.5a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2\"/><path d=\"M12 18h.01\"/>", "<path d=\"M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z\"/>"],
};

//  Barva oblasti taxonomie (stejná paleta jako na plátně návrhu)
const FF_IKONY_BARVY = {
  potraviny: '#4ade80', napoje: '#38bdf8', alkohol: '#f59e0b', drogerie: '#a78bfa',
  'osobni-pece': '#f472b6', obleceni: '#fb7185', elektronika: '#60a5fa', 'dum-zahrada': '#a3e635',
  deti: '#fbbf24', zvirata: '#fb923c', auto: '#94a3b8', 'volny-cas': '#e879f9', leky: '#f87171',
};
const FF_IKONY_SEDA = '#a8aec8';

//  Podkategorie taxonomie → vlastní ikona. Co tu není, dostane ikonu oblasti.
const FF_IKONY_PODKAT = {
  pecivo: 'pecivo', 'trvanlive-pecivo': 'pecivo',
  mleko: 'mleko', smetana: 'mleko',
  jogurty: 'jogurty', 'mlecne-dezerty': 'jogurty',
  syry: 'syry', vejce: 'vejce',
  drubez: 'maso', veprove: 'maso', 'hovezi-ostatni': 'maso', 'mlete-maso': 'maso', uzeniny: 'maso', 'masne-vyrobky': 'maso',
  ryby: 'ryby', ovoce: 'ovoce', zelenina: 'zelenina', 'mrazena-zelenina': 'zelenina',
  cokolada: 'cokolada', kava: 'kava', voda: 'voda',
};

//  SVG ikona jako text pro innerHTML. opt.barva = CSS barva (jinak dědí currentColor),
//  opt.styl = 'obrys' vypne výplň, opt.titulek = popisek pro čtečku (jinak aria-hidden).
function ffIkona(id, px, opt) {
  const o = opt || {};
  const ik = FF_IKONY[id] || FF_IKONY.nezname;
  const vel = Math.max(8, Math.min(200, +px || 20));
  const vypln = o.styl !== 'obrys' && ik[1] ? `<g fill="currentColor" fill-opacity=".22" stroke="none">${ik[1]}</g>` : '';
  const pristup = o.titulek
    ? `role="img" aria-label="${String(o.titulek).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}"`
    : 'aria-hidden="true"';
  const barva = o.barva && /^(#[0-9a-f]{3,8}|var\(--[\w-]+\)|[a-z]+)$/i.test(o.barva) ? `color:${o.barva};` : '';
  return `<svg class="ff-ik" viewBox="0 0 24 24" width="${vel}" height="${vel}" style="${barva}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${pristup}>${vypln}${ik[0]}</svg>`;
}

//  Ikona a barva pro položku podle taxonomie (z.tax / taxInfo(...)).
//  Přijme objekt s podId + oblastId, nebo nic → Nezařazené.
function ffIkonaTax(tax) {
  if (!tax) return { id: 'nezname', barva: FF_IKONY_SEDA };
  const barva = FF_IKONY_BARVY[tax.oblastId] || FF_IKONY_SEDA;
  const pod = FF_IKONY_PODKAT[tax.podId];
  if (pod && FF_IKONY[pod]) return { id: pod, barva };
  if (FF_IKONY[tax.oblastId]) return { id: tax.oblastId, barva };
  return { id: 'nezname', barva: FF_IKONY_SEDA };
}

//  Ikona oblasti (filtry, řádek „Oblast“).
function ffIkonaOblasti(oblastId, px) {
  return ffIkona(FF_IKONY[oblastId] ? oblastId : 'nezname', px, { barva: FF_IKONY_BARVY[oblastId] || FF_IKONY_SEDA });
}

//  Dlaždice: zaoblený čtverec v barvě oblasti s ikonou uprostřed.
function ffIkonaDlazdice(tax, box, px) {
  const b = Math.max(16, +box || 40), { id, barva } = ffIkonaTax(tax);
  return `<div class="ff-ik-dl" style="width:${b}px;height:${b}px;border-radius:${Math.round(b * 0.28)}px;background:${barva}24;color:${barva};display:flex;align-items:center;justify-content:center;flex-shrink:0">${ffIkona(id, px || Math.round(b * 0.54))}</div>`;
}

//  Taxonomie pro výrobek s čárovým kódem: obecný název z produktu, jinak název ze zkratky.
function ffIkonaTaxVyrobku(p, nazvy) {
  if (typeof taxInfo !== 'function') return null;
  const t = p && p.obecnyId ? taxInfo(p.obecnyId) : null;
  if (t) return t;
  if (typeof taxNavrh !== 'function') return null;
  for (const n of (nazvy || [])) { const x = taxNavrh(n); if (x && x.info) return x.info; }
  return null;
}

(function ffIkonyStyl() {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function' || !document.head || document.getElementById('ffIkStyl')) return;
  const st = document.createElement('style'); st.id = 'ffIkStyl';
  st.textContent = '.ff-ik{display:inline-block;vertical-align:-.2em;flex-shrink:0}';
  document.head.appendChild(st);
})();

if (typeof window !== 'undefined') Object.assign(window, { FF_IKONY, FF_IKONY_BARVY, FF_IKONY_PODKAT, ffIkona, ffIkonaTax, ffIkonaOblasti, ffIkonaDlazdice, ffIkonaTaxVyrobku });
if (typeof module !== 'undefined') module.exports = { FF_IKONY, FF_IKONY_BARVY, FF_IKONY_PODKAT, ffIkona, ffIkonaTax, ffIkonaOblasti, ffIkonaDlazdice, ffIkonaTaxVyrobku };
