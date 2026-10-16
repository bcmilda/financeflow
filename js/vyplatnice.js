// FinanceFlow · v11.78 · vyplatnice.js · 2026-10-14
// ══════════════════════════════════════════════════════════════════════
//  VÝPLATNICE – FÁZE 1 (TODO-257, S21 · Milan)
//  Evidence výplatních pásek měsíc po měsíci. Model ověřený na čtyřech
//  skutečných páskách (02/25, 06/25, 08/25, 08/26) – daňová část sedí
//  do koruny, viz MODEL-vyplatnice-overeny.md.
//
//  Fáze 1 = šablona + zadávání + seznam. Grafy složení a detektor přesunu
//  mezi základem a prémiemi přijdou ve fázi 2 a 3.
//
//  PROČ NENAČÍTÁME PDF: struktura pásek se liší firma od firmy a špatně
//  přečtená částka je horší než žádná, protože jí uživatel uvěří.
// ══════════════════════════════════════════════════════════════════════

// Povaha položky rozhoduje, jak se čte JEJÍ NEPŘÍTOMNOST (SKILL 31):
//   stala        … chybí = skutečně nula, stojí za zmínku
//   prilezitostna… chybí = neproběhlo, mlčet (dovolená, přesčas, svátek)
//   podminena    … chybí = pominul nárok, hlásit JINAK (sleva na dítě)
//   pruchozi     … do součtů se nepočítá vůbec (PENZ ↔ DPS se ruší)
const VYPL_POVAHY = ['stala', 'prilezitostna', 'podminena', 'pruchozi'];

// Výchozí šablona podle Milanovy pásky. Uživatel si ji doupraví.
const VYPL_SABLONA_CZ = {
  prijmy: [
    { key: 'zaklad',    kod: 'MZDA', label: 'Základní měs. mzda',     povaha: 'stala',         odvozena: true,  slozka: 'pevna'  },
    { key: 'dovolena',  kod: '0300', label: 'Dovolená',               povaha: 'prilezitostna', odvozena: true,  slozka: 'pevna'  },
    { key: 'vykonove',  kod: '0500', label: 'Výkonové prémie',        povaha: 'stala',         odvozena: false, slozka: 'premie' },
    { key: 'osobni',    kod: '0501', label: 'Osobní prémie',          povaha: 'stala',         odvozena: false, slozka: 'premie' },
    { key: 'korekce',   kod: '0502', label: 'Osobní prémie – korekce',povaha: 'prilezitostna', odvozena: false, slozka: 'premie' },
    { key: 'mobilita',  kod: '0530', label: 'Odměna za mobilitu',     povaha: 'stala',         odvozena: false, slozka: 'pevna'  },
    { key: 'nocni',     kod: '1061', label: 'Příplatek noční',        povaha: 'prilezitostna', odvozena: true,  slozka: 'priplatky'  },
    { key: 'prescas',   kod: '2024', label: 'Přesčas – mzda',         povaha: 'prilezitostna', odvozena: true,  slozka: 'prescas'   },
    { key: 'prescasPr', kod: '2026', label: 'Příplatek přesčas',      povaha: 'prilezitostna', odvozena: true,  slozka: 'prescas'   },
    { key: 'svatek',    kod: '2089', label: 'Příplatek práce ve svátek', povaha: 'prilezitostna', odvozena: true, slozka: 'priplatky' },
    { key: 'vikend',    kod: '2129', label: 'Příplatek So + Ne',      povaha: 'prilezitostna', odvozena: true,  slozka: 'priplatky'  },
    { key: 'vanocni',   kod: '5010', label: 'Vánoční příspěvek',      povaha: 'prilezitostna', odvozena: false, slozka: 'odmeny' },
    { key: 'rocni',     kod: '5045', label: 'Roční prémie',            povaha: 'prilezitostna', odvozena: false, slozka: 'odmeny' },
    { key: 'pololetni', kod: '',     label: 'Pololetní prémie',        povaha: 'prilezitostna', odvozena: false, slozka: 'odmeny' },
    { key: 'nabor',     kod: '5047', label: 'Náborový příspěvek',     povaha: 'prilezitostna', odvozena: false, slozka: 'odmeny' },
    { key: 'penzPrisp', kod: 'PENZ', label: 'Příspěvek na PP',        povaha: 'pruchozi',      odvozena: false },
  ],
  odvody: [
    { key: 'zp',      kod: '/350', label: 'Zdravotní pojištění',  povaha: 'stala',     odvozena: true },
    { key: 'sp',      kod: '/360', label: 'Sociální pojištění',   povaha: 'stala',     odvozena: true },
    { key: 'dan',     kod: '/401', label: 'Daň měsíční zálohová', povaha: 'stala',     odvozena: true },
    { key: 'slevaZak',kod: '/46X', label: 'Sleva na poplatníka',  povaha: 'stala',     odvozena: false },
    { key: 'slevaDet',kod: '/43P', label: 'Daňové zvýhodnění děti',povaha: 'podminena',odvozena: false },
  ],
  srazky: [
    { key: 'stravovani', kod: '660A', label: 'Srážka za stravování',  povaha: 'stala',    odvozena: false },
    { key: 'penezenka',  kod: '660B', label: 'Elektronická peněženka',povaha: 'prilezitostna', odvozena: false },
    { key: 'dps',        kod: '6212', label: 'Pojistné DPS',          povaha: 'pruchozi', odvozena: false },
  ],
  //  S26 (v11.77): nezdaněné částky, které se k čisté mzdě PŘIČÍTAJÍ (stravenkový paušál,
  //  cestovní náhrady). Milanova páska je nemá; jiné pásky ano – bez nich by import
  //  cizí výplatnice nikdy neprošel kontrolou dobírky.
  pripocty: [],
};

function vyplSablona() {
  const s = S.payslipTemplate;
  if (s && s.prijmy && s.prijmy.length)
    return { prijmy: s.prijmy, odvody: s.odvody || [], srazky: s.srazky || [], pripocty: s.pripocty || [] };
  return VYPL_SABLONA_CZ;
}
//  S26 (v11.77): do které složky hrubé mzdy položka patří. Univerzálně z šablony
//  (`slozka` – vyplní ji i AI u nové položky), u starší uložené šablony bez ní
//  podle klíče jako dřív.
//  S26 (v11.78, Milan): „za čas“ rozděleno na PŘÍPLATKY (So+Ne, noční, svátek) a PŘESČAS (mzda + příplatek).
const VYPL_SLOZKA_ALIAS = { příplatky: 'priplatky', přesčas: 'prescas', prescasy: 'prescas', vykon: 'premie', prémie: 'premie', odměny: 'odmeny', ostatni: 'jine' };
const VYPL_SLOZKY_KLICE = ['pevna', 'priplatky', 'prescas', 'premie', 'odmeny', 'jine'];
function _vyplSlozka(key, sab) {
  const it = ((sab || vyplSablona()).prijmy || []).find(x => x.key === key);
  let s = it && it.slozka ? String(it.slozka) : '';
  s = VYPL_SLOZKA_ALIAS[s.toLowerCase()] || s;
  if (/^(zacas|cas)$/i.test(s)) s = VYPL_PRESCAS.includes(key) ? 'prescas' : 'priplatky';   // starší šablona (v11.77)
  if (VYPL_SLOZKY_KLICE.includes(s)) return s;
  if (VYPL_PEVNE.includes(key)) return 'pevna';
  if (VYPL_PRESCAS.includes(key)) return 'prescas';
  if (VYPL_ZA_CAS.includes(key)) return 'priplatky';
  if (VYPL_PREMIE_PRAVIDELNE.includes(key)) return 'premie';
  if (VYPL_ODMENY.includes(key)) return 'odmeny';
  return 'jine';
}
window._vyplSlozka = _vyplSlozka;
function vyplZaznamy() { return S.payslips || []; }

// ── Výpočty ověřené na skutečných páskách ─────────────────────────────
// Pojistné se zaokrouhluje NAHORU (matematické dá o 2 Kč vyšší čistý příjem).
// Základ daně se zaokrouhluje nahoru na celé stovky.
const _ceil = v => Math.ceil(v - 1e-9);

function vyplDopocet(z) {
  const p = z.prijmy || {};
  const sab = vyplSablona();
  const pruchozi = new Set(sab.prijmy.concat(sab.srazky).filter(x => x.povaha === 'pruchozi').map(x => x.key));

  // Hrubá mzda = součet příjmů BEZ průchozích položek (PENZ se ruší s DPS)
  let hruba = 0;
  Object.keys(p).forEach(k => { if (!pruchozi.has(k)) hruba += (+p[k] || 0); });
  hruba = Math.round(hruba);

  const o = z.odvody || {};
  const zp  = o.zp  != null ? +o.zp  : _ceil(hruba * 0.045);
  const sp  = o.sp  != null ? +o.sp  : _ceil(hruba * 0.071);
  const danPred = _ceil(hruba / 100) * 100 * 0.15;
  const slevy = (+o.slevaZak || 0) + (+o.slevaDet || 0);
  const dan = o.dan != null ? +o.dan : Math.max(0, danPred - slevy);

  const cisty = Math.round((hruba - zp - sp - dan) * 100) / 100;
  let srazky = 0, pripocty = 0;
  Object.keys(z.srazky || {}).forEach(k => { if (!pruchozi.has(k)) srazky += (+z.srazky[k] || 0); });
  Object.keys(z.pripocty || {}).forEach(k => { pripocty += (+z.pripocty[k] || 0); });
  srazky = Math.round(srazky * 100) / 100; pripocty = Math.round(pripocty * 100) / 100;
  return { hruba, zp, sp, danPred, slevy, dan, cisty, srazky, pripocty, odvody: zp + sp + dan,
           dobirka: Math.round((cisty - srazky + pripocty) * 100) / 100 };
}

// Podíl PEVNÉ složky – jádro toho, kvůli čemu funkce vzniká. Pevné je to,
// co dostanu i bez přesčasů a bez výkonu; pohyblivé zbytek.
const VYPL_PEVNE = ['zaklad', 'mobilita', 'dovolena'];
// FÁZE 2: rozklad hrubé mzdy na tři skupiny. Hranice není libovolná – ptá se
//   „dostanu to i příští měsíc, aniž bych cokoli udělal navíc?“
//     pevná    … ano (tarif, mobilita, náhrada za dovolenou)
//     za čas   … jen když odpracuji navíc (přesčas, noční, víkend, svátek)
//     za výkon … jen když se firmě i mně bude dařit (prémie, odměny)
//   Právě posun mezi PEVNOU a ZA VÝKON je to, co Milan hledá.
const VYPL_ZA_CAS  = ['nocni', 'prescas', 'prescasPr', 'vikend', 'svatek'];
const VYPL_PRESCAS = ['prescas', 'prescasPr'];
const VYPL_ZA_VYKON = ['vykonove', 'osobni', 'korekce', 'vanocni', 'rocni', 'nabor'];
// Uvnitř skupiny „za výkon" je ještě jedna hranice, která se ukázala až na
// datech: PRAVIDELNÉ prémie chodí každý měsíc, JEDNORÁZOVÉ odměny jednou za rok.
// Do porovnání před/po změně tarifu smí jen ty pravidelné — jinak jeden vánoční
// příspěvek posune průměr o tisíce a detektor hlásí přesun, který se nestal.
const VYPL_PREMIE_PRAVIDELNE = ['vykonove', 'osobni', 'korekce'];
const VYPL_ODMENY = ['vanocni', 'rocni', 'pololetni', 'nabor'];

function vyplRozklad(z) {
  const p = z.prijmy || {};
  const sab = vyplSablona();
  const pruchozi = new Set(sab.prijmy.filter(x => x.povaha === 'pruchozi').map(x => x.key));
  //  S26 (v11.77): „za výkon“ se dělí na měsíční PRÉMIE a jednorázové ODMĚNY (roční,
  //  pololetní, vánoční, náborová) – Milan: „prémie roční, půlroční nejsou zanesené“.
  const r = { pevna: 0, priplatky: 0, prescas: 0, zaCas: 0, premie: 0, odmeny: 0, zaVykon: 0, jine: 0, celkem: 0 };
  Object.keys(p).forEach(k => {
    if (pruchozi.has(k)) return;
    const v = +p[k] || 0;
    r.celkem += v;
    r[_vyplSlozka(k, sab)] += v;
  });
  r.zaVykon = r.premie + r.odmeny;
  r.zaCas = r.priplatky + r.prescas;
  return r;
}
window.vyplRozklad = vyplRozklad;
function vyplPodilPevne(z) {
  const p = z.prijmy || {};
  const sab = vyplSablona();
  const pruchozi = new Set(sab.prijmy.filter(x => x.povaha === 'pruchozi').map(x => x.key));
  let pevne = 0, celkem = 0;
  Object.keys(p).forEach(k => {
    if (pruchozi.has(k)) return;
    const v = +p[k] || 0;
    celkem += v;
    if (_vyplSlozka(k, sab) === 'pevna') pevne += v;
  });
  return celkem > 0 ? Math.round(pevne / celkem * 100) : null;
}

// ── Render ────────────────────────────────────────────────────────────
const VYPL_POPISEK = '#a8aec8', VYPL_HODNOTA = '#c9cede';

//  S26 (v11.77): Milan: „v tabulce je jen pár hodnot, proč tam není všechno? Proč
//  nesledujeme srážku za stravování, el. peněženku, výši daní?“ → karta měsíce ukazuje
//  CELOU pásku: hlavičku, každou položku příjmů, odvody i se slevami, každou srážku
//  a srovnání s předchozím měsícem.
function _vyplPolozky(z, skupina, sab) {
  const data = z[skupina] || {};
  const sabSk = sab[skupina] || [];
  const znama = sabSk.filter(it => data[it.key] != null).map(it => ({ key: it.key, label: it.label, kod: it.kod, povaha: it.povaha, v: +data[it.key] || 0 }));
  const nezname = Object.keys(data).filter(k => !sabSk.some(it => it.key === k))
    .map(k => ({ key: k, label: k, kod: '', povaha: '', v: +data[k] || 0 }));
  return znama.concat(nezname);
}
window._vyplPolozky = _vyplPolozky;

function _vyplMesicNazev(mKlic) { const [y, mm] = String(mKlic || '').split('-'); return `${CZ_M[(+mm || 1) - 1]} ${y}`; }
function _vyplPct(cast, z) { return z ? Math.round(cast / z * 1000) / 10 : 0; }
const _vyplCs = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(v)));

function _vyplKartaMesice(z, pred, mKlic) {
  const sab = vyplSablona(), v = vyplDopocet(z), r = vyplRozklad(z), h = z.hlavicka || {};
  const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
  const rada = (l, val, o) => { o = o || {};
    return `<div class="vk-r${o.sum ? ' vk-sum' : ''}${o.pruchozi ? ' vk-pr' : ''}">
      <span class="vk-l">${o.kod ? `<span class="vk-kod">${esc(o.kod)}</span>` : ''}${l}${o.pozn ? ` <span class="vk-pozn">${o.pozn}</span>` : ''}</span>
      <span class="vk-v" style="color:${o.barva || VYPL_HODNOTA}">${val}</span></div>`; };
  const kc = x => `${fmtP(Math.round(x * 100) / 100)} Kč`;
  const sekce = t => `<div class="vk-sek">${t}</div>`;
  let html = '';

  // Hlavička pásky
  const chip = (l, x, j) => x != null && x !== '' ? `<span class="vk-chip">${l} <b>${fmtP(x)}${j || ''}</b></span>` : '';
  const chipy = chip('Fond', h.fond, ' h') + chip('Odpracováno', h.odprac, ' h') + chip('Nepřítomnost', h.neprit, ' h')
    + chip('Tarif', h.tarif, ' Kč') + chip('Průměr PPÚ', h.ppu, ' Kč/h');
  if (chipy) html += `<div class="vk-chipy">${chipy}</div>`;

  // Příjmy – každá položka
  html += sekce('Příjmy');
  _vyplPolozky(z, 'prijmy', sab).forEach(it => {
    const sl = it.povaha === 'pruchozi' ? null : _vyplSlozka(it.key, sab);
    const tecka = sl ? `<span class="vk-tecka" style="background:${VYPL_BARVY[sl]}"></span>` : '';
    html += rada(tecka + esc(it.label), kc(it.v), { kod: it.kod, pruchozi: it.povaha === 'pruchozi',
      pozn: it.povaha === 'pruchozi' ? '(průchozí – nepočítá se)' : (sl === 'odmeny' ? '🎁 jednorázová' : '') });
  });
  html += rada('Hrubá mzda', kc(v.hruba), { sum: true });

  // Odvody – i se slevami, aby bylo vidět, z čeho se daň vzala
  html += sekce('Odvody a daň');
  html += rada('Zdravotní pojištění', '−' + kc(v.zp), { barva: 'var(--expense)', pozn: `${_vyplPct(v.zp, v.hruba)} %` });
  html += rada('Sociální pojištění', '−' + kc(v.sp), { barva: 'var(--expense)', pozn: `${_vyplPct(v.sp, v.hruba)} %` });
  const o = z.odvody || {};
  const danZModelu = o.dan == null || Math.abs(Math.max(0, v.danPred - v.slevy) - v.dan) < 1;
  if (danZModelu && v.slevy) {
    html += rada('Daň před slevami', '−' + kc(v.danPred), { barva: VYPL_POPISEK });
    if (+o.slevaZak) html += rada('Sleva na poplatníka', '+' + kc(+o.slevaZak), { barva: 'var(--income)' });
    if (+o.slevaDet) html += rada('Daňové zvýhodnění na děti', '+' + kc(+o.slevaDet), { barva: 'var(--income)' });
  }
  html += rada('Daň zálohová', '−' + kc(v.dan), { barva: 'var(--expense)', pozn: `${_vyplPct(v.dan, v.hruba)} %` });
  html += rada('Odvody celkem', '−' + kc(v.odvody), { sum: true, barva: 'var(--expense)', pozn: `${_vyplPct(v.odvody, v.hruba)} % z hrubé` });
  html += rada('Čistý příjem', kc(v.cisty), { sum: true, barva: 'var(--income)' });

  // Srážky a připočty – každá zvlášť
  const sr = _vyplPolozky(z, 'srazky', sab), pc = _vyplPolozky(z, 'pripocty', sab);
  if (sr.length) {
    html += sekce('Srážky');
    sr.forEach(it => html += rada(esc(it.label), (it.povaha === 'pruchozi' ? '' : '−') + kc(it.v),
      { kod: it.kod, barva: it.povaha === 'pruchozi' ? VYPL_POPISEK : 'var(--expense)', pruchozi: it.povaha === 'pruchozi',
        pozn: it.povaha === 'pruchozi' ? '(průchozí)' : '' }));
  }
  if (pc.length) {
    html += sekce('Nezdaněné připočty');
    pc.forEach(it => html += rada(esc(it.label), '+' + kc(it.v), { kod: it.kod, barva: 'var(--income)' }));
  }
  html += `<div class="vk-dob"><span>Dobírka</span><span>${kc(v.dobirka)}</span></div>`;

  // Složení + srovnání s minulým měsícem
  const pevne = r.celkem ? Math.round(r.pevna / r.celkem * 100) : null;
  let srov = '';
  if (pred) {
    const pv = vyplDopocet(pred);
    const d = (l, a, b) => `<span>${l} <b style="color:${a - b >= 0 ? 'var(--income)' : 'var(--expense)'}">${_vyplCs(a - b)}</b></span>`;
    srov = `<div class="vk-srov">Oproti ${_vyplMesicNazev(pred.m).toLowerCase()}: ${d('hrubá', v.hruba, pv.hruba)} · ${d('dobírka', v.dobirka, pv.dobirka)}
      · odvody <b style="color:${v.odvody - pv.odvody <= 0 ? 'var(--income)' : 'var(--expense)'}">${_vyplCs(v.odvody - pv.odvody)}</b></div>`;
  }
  html += `<div style="font-size:.74rem;color:${VYPL_POPISEK};margin-top:8px;line-height:1.55">
    ${pevne != null ? `Pevná složka tvoří <strong style="color:${VYPL_HODNOTA}">${pevne} %</strong> hrubé mzdy. ` : ''}
    Z hrubé mzdy odešlo na odvodech <strong style="color:${VYPL_HODNOTA}">${_vyplPct(v.odvody, v.hruba)} %</strong>.</div>${srov}`;

  html += `<div style="display:flex;gap:7px;margin-top:12px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="vyplOtevritForm('${mKlic}')">✎ Upravit</button>
      <button class="btn btn-danger btn-sm" onclick="vyplSmazat('${mKlic}')">Smazat</button>
      <button class="btn btn-ghost btn-sm" onclick="vyplImportDialog()">📥 Import / 🤖 AI</button>
    </div>`;
  return html;
}
window._vyplKartaMesice = _vyplKartaMesice;

function _renderKalVyplatnice(D, m, y) {
  const zaznamy = vyplZaznamy().slice().sort((a, b) => (b.m || '').localeCompare(a.m || ''));
  const mKlic = `${y}-${String(m + 1).padStart(2, '0')}`;
  const ai = zaznamy.findIndex(z => z.m === mKlic);
  const aktualni = ai >= 0 ? zaznamy[ai] : null;

  let html = VYPL_CSS + `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🧾 Výplatnice · ${CZ_M[m]} ${y}</span></div>
    <div class="card-body">`;

  if (aktualni) {
    html += _vyplKartaMesice(aktualni, zaznamy[ai + 1] || null, mKlic);
  } else {
    html += `<div style="font-size:.8rem;color:${VYPL_POPISEK};line-height:1.6;margin-bottom:10px">
        Za tenhle měsíc zatím pásku nemáš. Opsání zabere asi minutu – nebo ji nech přepsat
        AI (ChatGPT, Claude, Gemini) a výsledek sem jen vlož. Teprve z několika měsíců je
        vidět, jestli roste základ, nebo jen prémie.</div>
      <button class="btn btn-accent" onclick="vyplOtevritForm('${mKlic}')">+ Zadat výplatnici</button>
      <button class="btn btn-ghost" style="margin-left:7px" onclick="vyplImportDialog()">📥 Import / 🤖 AI</button>`;
  }
  html += `</div></div><div id="vyplFormBox"></div>`;

  //  S26 (v11.78, Milan): „novou kartu pod Výplatnici – jeden velký megagraf se všemi daty“.
  html += _vyplMegaKarta(zaznamy);
  // Milan (S21): historie mezi grafy mátla – nejdřív analýza, pak výpis.
  html += _vyplDetektor(zaznamy);
  html += _vyplGrafy(zaznamy);
  // Historie
  if (zaznamy.length) {
    html += `<div class="card"><div class="card-header"><span class="card-title">📜 Historie (${zaznamy.length})</span></div><div class="card-body">`;
    zaznamy.slice(0, 24).forEach(z => {
      const v = vyplDopocet(z);
      const pevne = vyplPodilPevne(z);
      const [ry, rm] = (z.m || '').split('-');
      html += `<div onclick="vyplOtevritForm('${z.m}')" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <div style="min-width:78px;font-size:.8rem;color:${VYPL_HODNOTA}">${CZ_M[(+rm || 1) - 1]} ${ry}</div>
        <div style="flex:1;min-width:0;font-size:.72rem;color:${VYPL_POPISEK}">
          hrubá ${fmt(v.hruba)} · pevná ${pevne != null ? pevne + ' %' : '—'} · odvody ${_vyplPct(v.odvody, v.hruba)} %</div>
        <div style="font-size:.84rem;font-weight:700;color:var(--income)">${fmt(v.dobirka)} Kč</div>
      </div>`;
    });
    html += `</div></div>`;
  }
  return html;
}

// ══════════════════════════════════════════════════════════════════════
//  FÁZE 3 · DETEKTOR PŘESUNU (TODO-259) — jádro celé funkce
//
//  Milanův postřeh: „zvednou základ a zároveň sníží prémie = stejný výsledek“.
//  Dole se nezmění nic, ale změnilo se, z čeho je výplata složená — a to má
//  následky: základ ti nikdo nesebere, počítá se do dovolené i náhrad a určuje
//  hodnotu přesčasové hodiny.
//
//  PROČ SE NEPOROVNÁVAJÍ SOUSEDNÍ MĚSÍCE PŘÍMO:
//  Základní mzda se krátí odpracovaným fondem. Měsíc s dovolenou nebo neplaceným
//  volnem má nižší „pevnou“ složku, aniž by se cokoli změnilo. Naivní porovnání
//  by hlásilo poplach pokaždé, když si vezmeš volno.
//  Detektor proto vychází z TARIFU, který je na pásce uvedený přímo a na
//  odpracovaných hodinách nezávisí, a prémie porovnává jako PRŮMĚR za období
//  před změnou a po ní — jednotlivý měsíc kolísá moc na to, aby o něčem svědčil.
// ══════════════════════════════════════════════════════════════════════

function vyplZmenyTarifu(zaznamy) {
  const rada = zaznamy.slice().filter(z => (z.hlavicka || {}).tarif)
    .sort((a, b) => (a.m || '').localeCompare(b.m || ''));
  const zmeny = [];
  for (let i = 1; i < rada.length; i++) {
    const pred = +rada[i - 1].hlavicka.tarif, po = +rada[i].hlavicka.tarif;
    if (pred !== po) zmeny.push({ m: rada[i].m, index: i, tarifPred: pred, tarifPo: po });
  }
  return { rada, zmeny };
}

// Průměr výkonnostní složky za `n` měsíců před/po indexu.
function _vyplPrumerVykon(rada, od, do_) {
  const usek = rada.slice(Math.max(0, od), do_);
  if (!usek.length) return null;
  // Jen PRAVIDELNÉ prémie – viz VYPL_PREMIE_PRAVIDELNE.
  //  S26 (v11.77): podle složky v šabloně (u vlastní šablony i u nových položek z AI).
  const s = usek.reduce((a, z) => a + vyplRozklad(z).premie, 0);
  // Kolik jednorázových odměn jsme z porovnání vynechali – řekneme to nahlas.
  const jednorazove = usek.reduce((a, z) => a + vyplRozklad(z).odmeny, 0);
  return { prumer: s / usek.length, mesicu: usek.length, jednorazove };
}

function vyplAnalyzaPresunu(zaznamy, okno = 3) {
  const { rada, zmeny } = vyplZmenyTarifu(zaznamy);
  return zmeny.map(z => {
    const pred = _vyplPrumerVykon(rada, z.index - okno, z.index);
    const po   = _vyplPrumerVykon(rada, z.index, z.index + okno);
    if (!pred || !po) return null;
    const dTarif = z.tarifPo - z.tarifPred;
    const dVykon = po.prumer - pred.prumer;
    return {
      m: z.m, tarifPred: z.tarifPred, tarifPo: z.tarifPo,
      dTarif, dVykon, netto: dTarif + dVykon,
      vykonPred: pred.prumer, vykonPo: po.prumer,
      mesicuPred: pred.mesicu, mesicuPo: po.mesicu,
      jednorazovePred: pred.jednorazove, jednorazovePo: po.jednorazove,
      // Přesun = základ nahoru A ZÁROVEŇ prémie dolů (nebo naopak).
      presun: (dTarif > 0 && dVykon < 0) || (dTarif < 0 && dVykon > 0),
      // Kolik ze zvýšení základu „snědl“ pokles prémií
      pokryti: dTarif !== 0 ? Math.min(1, Math.max(0, -dVykon / dTarif)) : 0,
    };
  }).filter(Boolean);
}
window.vyplZmenyTarifu = vyplZmenyTarifu;
window.vyplAnalyzaPresunu = vyplAnalyzaPresunu;

function _vyplDetektor(zaznamy) {
  if (zaznamy.length < 4) return '';
  const analyzy = vyplAnalyzaPresunu(zaznamy);
  if (!analyzy.length) return '';
  const cs = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(v)));

  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🔍 Změny základu a co je doprovázelo</span></div>
    <div class="card-body">
      ${analyzy.map(a => {
        const [ry, rm] = a.m.split('-');
        const barvaN = a.netto >= 0 ? 'var(--income)' : 'var(--expense)';
        return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:.86rem;font-weight:600;color:${VYPL_HODNOTA};margin-bottom:7px">
            ${CZ_M[(+rm || 1) - 1]} ${ry} · tarif ${fmt(a.tarifPred)} → ${fmt(a.tarifPo)} Kč</div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
            <div><div style="font-size:.68rem;color:${VYPL_POPISEK}">Základ</div>
              <div style="font-size:.9rem;font-weight:700;color:${a.dTarif >= 0 ? 'var(--income)' : 'var(--expense)'}">${cs(a.dTarif)}</div></div>
            <div><div style="font-size:.68rem;color:${VYPL_POPISEK}">Prémie (⌀)</div>
              <div style="font-size:.9rem;font-weight:700;color:${a.dVykon >= 0 ? 'var(--income)' : 'var(--expense)'}">${cs(a.dVykon)}</div></div>
            <div><div style="font-size:.68rem;color:${VYPL_POPISEK}">Výsledek</div>
              <div style="font-size:.9rem;font-weight:800;color:${barvaN}">${cs(a.netto)}</div></div>
          </div>

          <div style="font-size:.74rem;color:${VYPL_POPISEK};line-height:1.6">
            ${a.presun
              ? (a.pokryti >= 0.8
                  ? `Základ vzrostl, ale prémie klesly skoro o totéž — <strong style="color:${VYPL_HODNOTA}">na výplatě to skoro není vidět</strong>.
                     Přesto je to změna k lepšímu: základ je jistý, prémie ne, a základ určuje i hodnotu přesčasové hodiny.`
                  : `Základ vzrostl a prémie zároveň klesly — část zvýšení se tím vyrovnala
                     (zhruba ${Math.round(a.pokryti * 100)} %). Zbytek je skutečné přidání.`)
              : (a.dTarif > 0 && a.dVykon >= 0
                  ? `Základ vzrostl a prémie neklesly. <strong style="color:${VYPL_HODNOTA}">Skutečné zvýšení</strong>, žádný přesun.`
                  : `Základ klesl. Stojí za ověření, jestli šlo o změnu úvazku nebo o něco jiného.`)}
          </div>
          <div style="font-size:.7rem;color:${VYPL_POPISEK};margin-top:5px;line-height:1.5">
            Průměr <strong style="color:${VYPL_HODNOTA}">pravidelných</strong> prémií za
            ${a.mesicuPred} ${a.mesicuPred === 1 ? 'měsíc' : 'měsíce'} před a ${a.mesicuPo} po změně.
            ${(a.jednorazovePred + a.jednorazovePo) > 0
              ? `Jednorázové odměny (vánoční, roční, náborová) v hodnotě ${fmt(Math.round(a.jednorazovePred + a.jednorazovePo))} Kč
                 se do porovnání nepočítají — chodí jednou za rok a posunuly by průměr o tisíce.` : ''}
          </div>
        </div>`;
      }).join('')}
      <div style="font-size:.72rem;color:${VYPL_POPISEK};margin-top:9px;line-height:1.55">
        Porovnává se <strong style="color:${VYPL_HODNOTA}">tarif</strong>, ne vyplacený základ — ten se krátí
        podle odpracovaných hodin, takže by měsíc s dovolenou vypadal jako snížení platu.
      </div>
    </div>
  </div>`;
}
window._vyplDetektor = _vyplDetektor;

// ══════════════════════════════════════════════════════════════════════
//  FÁZE 2 · GRAFY SLOŽENÍ V ČASE (TODO-258) · S26 (v11.77) přepracováno
//  Milan: „sloupečky jsou pěkné, ale dokud na ně nenajedu myší, nic nevidím“ –
//  každý graf má teď svislou stupnici s vodorovnou mřížkou, popisky měsíců, průměr,
//  klepnutím (i na mobilu) se pod grafem vypíše měsíc a pod grafem je tabulka hodnot.
//  Pořád BEZ canvasu – sloupce z divů se přizpůsobí šířce a nepotřebují čekat na layout.
//  Barvy ověřené validátorem (tmavé pozadí, světlost 0,48–0,67, rozlišitelné i pro
//  barvoslepé); barva patří SLOŽCE, filtr ji nepřebarví.
// ══════════════════════════════════════════════════════════════════════
const VYPL_SLOZKY = [
  { k: 'pevna',  label: 'Pevná mzda',           kratce: 'Pevná' },
  { k: 'priplatky', label: 'Příplatky (So+Ne, noční, svátek)', kratce: 'Příplatky' },
  { k: 'prescas', label: 'Přesčas (mzda + příplatek)', kratce: 'Přesčas' },
  { k: 'premie', label: 'Prémie (měsíční)',     kratce: 'Prémie' },
  { k: 'odmeny', label: 'Mimořádné odměny',     kratce: 'Odměny' },
  { k: 'jine',   label: 'Ostatní',              kratce: 'Ostatní' },
];
//  S26 (v11.78): šest složek – sada znovu ověřená validátorem (sousední páry rozlišitelné i pro barvoslepé).
const VYPL_BARVY = { pevna: '#16a34a', priplatky: '#3b82f6', prescas: '#e11d48', premie: '#d97706', odmeny: '#8b5cf6', jine: '#0d9488', zaCas: '#3b82f6', zaVykon: '#d97706' };
const VYPL_ODVODY = [
  { k: 'zp',  label: 'Zdravotní pojištění', kratce: 'ZP',  barva: '#0891b2' },
  { k: 'sp',  label: 'Sociální pojištění',  kratce: 'SP',  barva: '#ea580c' },
  { k: 'dan', label: 'Daň',                 kratce: 'Daň', barva: '#c026d3' },
];
const VYPL_SRAZKY_BARVA = '#94a3b8';

const VYPL_CSS = `<style>
.vg{margin-top:4px}
.vg-plot{position:relative;margin-left:44px;border-bottom:1px solid rgba(255,255,255,.22)}
.vg-mr{position:absolute;left:0;right:0;border-top:1px solid rgba(255,255,255,.08);pointer-events:none}
.vg-tk{position:absolute;left:-46px;width:40px;text-align:right;transform:translateY(50%);font-size:.62rem;color:#8b93ad;white-space:nowrap;pointer-events:none}
.vg-bars{position:absolute;inset:0;display:flex;gap:2px;align-items:flex-end}
.vg-sl{flex:1 1 0;min-width:0;height:100%;display:flex;align-items:flex-end;cursor:pointer;position:relative}
.vg-st{width:100%;display:flex;flex-direction:column-reverse;gap:2px;border-radius:4px 4px 0 0;overflow:hidden;transition:opacity .12s}
.vg-seg{min-height:1px}
.vg.vg-vyb .vg-sl:not(.vg-akt) .vg-st{opacity:.5}
.vg-cary .vg-sl.vg-akt{background:rgba(255,255,255,.06)}
.vg-avg{position:absolute;left:0;right:0;border-top:2px dashed rgba(232,234,242,.75);pointer-events:none}
.vg-avg span{position:absolute;left:2px;bottom:2px;font-size:.62rem;font-weight:700;color:#e8eaf2;background:var(--surface);padding:0 4px;border-radius:4px}
.vg-hl{position:absolute;left:50%;transform:translateX(-50%);font-size:.6rem;font-weight:700;color:#e8eaf2;white-space:nowrap;pointer-events:none}
.vg-x{position:relative;height:17px;margin-left:44px;margin-top:3px}
.vg-x span{position:absolute;top:0;font-size:.62rem;color:#8b93ad;white-space:nowrap;transform:translateX(-50%)}
.vg-x span.vg-x0{transform:none}.vg-x span.vg-xn{transform:translateX(-100%)}
.vg-ct{margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--surface2);font-size:.74rem;color:#c9cede;line-height:1.55;min-height:20px}
.vg-ct b{color:#e8eaf2}
.vg-dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.vg-leg{display:flex;flex-wrap:wrap;gap:4px 12px;margin-bottom:8px;font-size:.7rem;color:#a8aec8}
.vg-chipy{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.vg-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;border:1px solid var(--border);background:transparent;color:#a8aec8;font-size:.72rem;cursor:pointer}
.vg-chip.on{background:rgba(139,124,246,.14);border-color:rgba(139,124,246,.5);color:#e8eaf2}
.vg-bod{position:absolute;width:9px;height:9px;border-radius:50%;transform:translate(-50%,50%);box-shadow:0 0 0 2px var(--surface);pointer-events:none}
.vg-cl{position:absolute;right:0;transform:translateY(50%);font-size:.62rem;font-weight:700;color:#e8eaf2;background:var(--surface);padding:0 3px;pointer-events:none}
.vg-tab{overflow-x:auto;margin-top:10px;max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:8px}
.vg-tab table{border-collapse:collapse;width:100%;font-size:.7rem;font-variant-numeric:tabular-nums}
.vg-tab th,.vg-tab td{padding:5px 7px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--border)}
.vg-tab th{position:sticky;top:0;background:var(--surface2);color:#a8aec8;font-weight:600}
.vg-tab td:first-child,.vg-tab th:first-child{text-align:left;position:sticky;left:0;background:var(--surface)}
.vg-tab th:first-child{background:var(--surface2);z-index:1}
.vg-tab tr.vg-souhrn td{font-weight:700;color:#e8eaf2;background:var(--surface2)}
.vg-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}
.vg-kpi>div{background:var(--surface2);border-radius:9px;padding:8px 10px}
.vg-kpi .l{font-size:.66rem;color:#a8aec8}.vg-kpi .v{font-size:.98rem;font-weight:800;color:#e8eaf2;margin-top:2px}
.vg-kpi .p{font-size:.64rem;color:#a8aec8;margin-top:1px}
.vg-pozn{font-size:.72rem;color:#a8aec8;margin-top:9px;line-height:1.55}
.vg-pozn strong{color:#c9cede}
.vk-chipy{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px}
.vk-chip{font-size:.68rem;color:#a8aec8;background:var(--surface2);padding:3px 8px;border-radius:999px}.vk-chip b{color:#e8eaf2}
.vk-sek{font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;color:#8b93ad;margin:12px 0 2px}
.vk-r{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px solid var(--border)}
.vk-l{font-size:.78rem;color:#a8aec8;min-width:0}.vk-v{font-size:.84rem;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.vk-sum .vk-l{color:#e8eaf2;font-weight:700}.vk-sum .vk-v{font-weight:800}
.vk-pr{opacity:.6}
.vk-kod{font-family:monospace;font-size:.64rem;color:#6f7790;margin-right:6px}
.vk-pozn{font-size:.64rem;color:#8b93ad}
.vk-tecka{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
.vk-dob{display:flex;justify-content:space-between;align-items:baseline;padding:11px 0 2px;font-weight:700}
.vk-dob span:last-child{font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;color:var(--income)}
.vk-srov{font-size:.72rem;color:#a8aec8;margin-top:6px;line-height:1.55}
.vg-tkp{left:auto;right:-46px;text-align:left}
.vg-osy{display:flex;justify-content:space-between;font-size:.6rem;color:#8b93ad;margin-bottom:3px}
.vg-udy{margin-top:2px}
.vg-ud{position:relative;display:flex;gap:2px;height:13px;align-items:center}
.vg-udl{position:absolute;left:-46px;width:40px;text-align:right;font-size:.66rem;line-height:13px}
.vg-udc{flex:1 1 0;min-width:0;display:flex;justify-content:center;align-items:center}
.vg-udc i{display:block;border-radius:50%}
.vg-chip .vg-osaz{font-size:.6rem;padding:0 4px;border-radius:4px;background:rgba(255,255,255,.12);color:#e8eaf2;margin-left:2px}
.vg-carka{display:inline-block;width:12px;height:3px;border-radius:2px}
.vg-seg2{display:inline-flex;border:1px solid var(--border);border-radius:9px;overflow:hidden}
.vg-seg2 button{background:transparent;border:0;color:#a8aec8;font-size:.72rem;padding:6px 10px;cursor:pointer}
.vg-seg2 button.on{background:rgba(139,124,246,.18);color:#e8eaf2;font-weight:700}
.vg-sek2{font-size:.64rem;text-transform:uppercase;letter-spacing:.06em;color:#8b93ad;margin:8px 0 5px}
.vg-det summary{font-size:.74rem;color:#c9cede;cursor:pointer;margin:4px 0 2px}
.vg-bubliny{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
@media (max-width:600px){.vg-bubliny{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}.vg-bub{flex:0 0 auto;max-width:72vw;white-space:normal}}
.vg-bub{background:rgba(139,124,246,.1);border:1px solid rgba(139,124,246,.35);color:#d6d0fb;border-radius:14px 14px 14px 4px;padding:6px 11px;font-size:.74rem;cursor:pointer;text-align:left}
.vg-odp{background:var(--surface2);border-radius:12px;padding:10px 12px;margin-bottom:12px;font-size:.76rem;color:#c9cede;line-height:1.6}
.vg-odp b{color:#e8eaf2}.vg-odp-q{font-size:.7rem;color:#b9aefc;margin-bottom:4px}
@media (max-width:600px){.vg-wide{margin-left:-10px;margin-right:-10px}.vg-wide>.card-body{padding-left:8px;padding-right:8px}}
</style>`;

function _vyplMes(m) { const [y, mm] = String(m || '').split('-'); return CZ_M[(+mm || 1) - 1].slice(0, 3) + ' ' + String(y).slice(2); }
function _vyplKcOsa(t) { return t >= 1000 ? new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(Math.round(t / 100) / 10) + ' tis.' : fmt(t); }

//  „Hezká“ stupnice: krok 1 / 2 / 2,5 / 5 × 10ⁿ, nejvýš pět dílků nad nulou.
function _vyplOsa(max, n) {
  n = n || 5;
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const mag = Math.pow(10, Math.floor(Math.log10(max / 10)));
  let krok = mag;
  for (const k of [1, 2, 2.5, 5, 10, 20, 25, 50, 100]) { krok = k * mag; if (Math.ceil(max / krok - 1e-9) <= n) break; }
  const top = Math.ceil(max / krok - 1e-9) * krok;
  const ticks = [];
  for (let t = 0; t <= top + 1e-9; t += krok) ticks.push(Math.round(t * 100) / 100);
  return { max: top, ticks };
}
window._vyplOsa = _vyplOsa;

//  Popisky měsíců: první, poslední a pravidelně mezi nimi, aby se nepřekrývaly.
function _vyplXPopisky(mesice) {
  const n = mesice.length, k = Math.max(1, Math.ceil(n / 6));
  const idx = [];
  for (let i = 0; i < n; i += k) idx.push(i);
  if (idx[idx.length - 1] !== n - 1) { if (n - 1 - idx[idx.length - 1] < k * 0.6) idx.pop(); idx.push(n - 1); }
  return `<div class="vg-x">${idx.map(i => `<span class="${i === 0 ? 'vg-x0' : i === n - 1 && n > 1 ? 'vg-xn' : ''}" style="left:${i === 0 ? 0 : i === n - 1 && n > 1 ? 100 : (i + 0.5) / n * 100}%">${_vyplMes(mesice[i])}</span>`).join('')}</div>`;
}

//  Klepnutí / najetí na měsíc: zvýrazní sloupec a vypíše hodnoty pod grafem.
window._vyplGraf = window._vyplGraf || {};
function vyplVyber(id, i) {
  const g = window._vyplGraf[id], el = typeof document !== 'undefined' && document.getElementById(id);
  if (!g || !el) return;
  el.classList.add('vg-vyb');
  el.querySelectorAll('.vg-sl').forEach(s => s.classList.toggle('vg-akt', +s.dataset.i === i));
  const ct = document.getElementById(id + '_ct'); if (ct) ct.innerHTML = g.cteni(i);
}
window.vyplVyber = vyplVyber;

//  Sloupcový graf (i skládaný). o = { id, mesice, serie:[{k,barva,hodnoty}], yMin, yMax, ticks,
//  fmtTick, prumer:{v,label}, popisky:[indexy s hodnotou nad sloupcem], fmtHodnota, vyska, cteni(i) }
function _vyplSloupce(o) {
  const n = o.mesice.length, yMin = o.yMin || 0, rozsah = (o.yMax - yMin) || 1, H = o.vyska || 150;
  const pct = v => Math.max(0, Math.min(100, (v - yMin) / rozsah * 100));
  window._vyplGraf[o.id] = { cteni: o.cteni, n };
  const mriz = o.ticks.map(t => `<div class="vg-mr" style="bottom:${pct(t)}%"></div><div class="vg-tk" style="bottom:${pct(t)}%">${o.fmtTick(t)}</div>`).join('');
  const sl = o.mesice.map((m, i) => {
    const vals = o.serie.map(s => Math.max(0, +s.hodnoty[i] || 0));
    const celk = vals.reduce((a, b) => a + b, 0);
    let segs = '';
    if (o.serie.length === 1) segs = celk > 0 ? `<div class="vg-seg" style="flex:1 1 0;background:${o.serie[0].barva}"></div>` : '';
    else o.serie.forEach((s, k) => { if (vals[k] > 0) segs += `<div class="vg-seg" style="flex:${vals[k]} 1 0;background:${s.barva}"></div>`; });
    const hl = (o.popisky || []).includes(i) && celk > 0
      ? `<span class="vg-hl" style="bottom:calc(${pct(celk)}% + 2px)">${o.fmtHodnota(celk)}</span>` : '';
    return `<div class="vg-sl${i === n - 1 ? ' vg-akt' : ''}" data-i="${i}" onclick="vyplVyber('${o.id}',${i})" onmouseenter="vyplVyber('${o.id}',${i})">
      <div class="vg-st" style="height:${pct(celk)}%">${segs}</div>${hl}</div>`;
  }).join('');
  const avg = o.prumer && o.prumer.v != null ? `<div class="vg-avg" style="bottom:${pct(o.prumer.v)}%"><span>${o.prumer.label}</span></div>` : '';
  return `<div class="vg" id="${o.id}">
    <div class="vg-plot" style="height:${H}px">${mriz}<div class="vg-bars">${sl}</div>${avg}</div>
    ${_vyplXPopisky(o.mesice)}
    <div class="vg-ct" id="${o.id}_ct">${n ? o.cteni(n - 1) : ''}</div></div>`;
}

//  Čárový graf, jedna osa. o = { id, mesice, serie:[{label,barva,hodnoty}], yMax, ticks, fmtTick, vyska, cteni(i) }
function _vyplCary(o) {
  const n = o.mesice.length, rozsah = o.yMax || 1, H = o.vyska || 140;
  const pct = v => Math.max(0, Math.min(100, v / rozsah * 100));
  const x = i => (i + 0.5) / n * 100;
  window._vyplGraf[o.id] = { cteni: o.cteni, n };
  const mriz = o.ticks.map(t => `<div class="vg-mr" style="bottom:${pct(t)}%"></div><div class="vg-tk" style="bottom:${pct(t)}%">${o.fmtTick(t)}</div>`).join('');
  const cary = o.serie.map(s => `<polyline fill="none" stroke="${s.barva}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"
      points="${s.hodnoty.map((v, i) => `${(x(i) * 10).toFixed(1)},${(1000 - pct(+v || 0) * 10).toFixed(1)}`).join(' ')}"/>`).join('');
  const body = o.serie.map(s => s.hodnoty.map((v, i) => `<span class="vg-bod" style="left:${x(i)}%;bottom:${pct(+v || 0)}%;background:${s.barva}"></span>`).join('')).join('');
  //  Popisek u posledního bodu – jen když se popisky nepřekrývají.
  const konce = o.serie.map(s => pct(+s.hodnoty[n - 1] || 0));
  const lzePopsat = konce.every((p, k) => konce.every((q, j) => j === k || Math.abs(p - q) >= 14));
  const cl = lzePopsat ? o.serie.map((s, k) => `<span class="vg-cl" style="bottom:calc(${konce[k]}% + 9px)">${s.kratce || s.label}</span>`).join('') : '';
  const hit = o.mesice.map((m, i) => `<div class="vg-sl${i === n - 1 ? ' vg-akt' : ''}" data-i="${i}" onclick="vyplVyber('${o.id}',${i})" onmouseenter="vyplVyber('${o.id}',${i})"></div>`).join('');
  return `<div class="vg vg-cary" id="${o.id}">
    <div class="vg-plot" style="height:${H}px">${mriz}<div class="vg-bars">${hit}</div>
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none">${cary}</svg>${body}${cl}</div>
    ${_vyplXPopisky(o.mesice)}
    <div class="vg-ct" id="${o.id}_ct">${n ? o.cteni(n - 1) : ''}</div></div>`;
}

function _vyplLegenda(polozky) {
  return `<div class="vg-leg">${polozky.map(p => `<span><span class="vg-dot" style="background:${p.barva}"></span>${p.label}</span>`).join('')}</div>`;
}
function _vyplTabulka(hlavicka, radky, souhrn) {
  return `<div class="vg-tab"><table><thead><tr>${hlavicka.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
    ${radky.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
    ${(souhrn || []).map(r => `<tr class="vg-souhrn">${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>`;
}

//  Filtr složek (Milan: „chci si odfiltrovat jen výkon nebo čas“). Barva zůstává složce.
function _vyplFiltrNacti() {
  try { const x = JSON.parse(localStorage.getItem('ffVyplSlozky') || 'null'); if (Array.isArray(x) && x.length) return x; } catch (e) {}
  return null;
}
function vyplFiltr(k) {
  const vse = VYPL_SLOZKY.map(s => s.k);
  let akt = window._vyplFiltrAkt || _vyplFiltrNacti() || vse.slice();
  if (k === '*') akt = vse.slice();
  else if (akt.length === vse.length) akt = [k];               // z „Vše“ první klepnutí = jen tahle složka
  else akt = akt.includes(k) ? akt.filter(x => x !== k) : akt.concat([k]);
  if (!akt.length) akt = vse.slice();
  window._vyplFiltrAkt = akt;
  try { localStorage.setItem('ffVyplSlozky', JSON.stringify(akt)); } catch (e) {}
  const box = typeof document !== 'undefined' && document.getElementById('vyplSlozeniBox');
  if (box) box.innerHTML = _vyplSlozeniObsah(window._vyplRada || []);
}
window.vyplFiltr = vyplFiltr;

function _vyplSlozeniObsah(rada) {
  const rozk = rada.map(z => vyplRozklad(z));
  const pritomne = VYPL_SLOZKY.filter(s => rozk.some(r => r[s.k] > 0));
  const akt = (window._vyplFiltrAkt || _vyplFiltrNacti() || VYPL_SLOZKY.map(s => s.k)).filter(k => pritomne.some(s => s.k === k));
  const vid = pritomne.filter(s => !akt.length || akt.includes(s.k));
  const vse = vid.length === pritomne.length;
  const serie = vid.map(s => ({ k: s.k, label: s.label, barva: VYPL_BARVY[s.k], hodnoty: rozk.map(r => r[s.k]) }));
  const souc = rozk.map(r => vid.reduce((a, s) => a + r[s.k], 0));
  const osa = _vyplOsa(Math.max(...souc, 1));
  const prumer = souc.reduce((a, b) => a + b, 0) / (souc.length || 1);
  const mx = souc.indexOf(Math.max(...souc)), mn = souc.indexOf(Math.min(...souc));
  const chipy = `<div class="vg-chipy"><button class="vg-chip${vse ? ' on' : ''}" onclick="vyplFiltr('*')">Vše</button>
    ${pritomne.map(s => `<button class="vg-chip${!vse && akt.includes(s.k) ? ' on' : ''}" onclick="vyplFiltr('${s.k}')"><span class="vg-dot" style="background:${VYPL_BARVY[s.k]};margin:0"></span>${s.kratce}</button>`).join('')}</div>`;
  const graf = _vyplSloupce({
    id: 'vgSlozeni', mesice: rada.map(z => z.m), serie, yMax: osa.max, ticks: osa.ticks, fmtTick: _vyplKcOsa, vyska: 170,
    prumer: { v: prumer, label: '⌀ ' + _vyplKcOsa(Math.round(prumer)) }, popisky: vid.length < pritomne.length ? [mx, mn] : [],
    fmtHodnota: v => _vyplKcOsa(Math.round(v)),
    cteni: i => `<b>${_vyplMesicNazev(rada[i].m)}</b> · ${vse ? 'hrubá' : 'vybrané složky'} <b>${fmt(Math.round(souc[i]))} Kč</b><br>`
      + vid.filter(s => rozk[i][s.k] > 0).map(s => `<span style="white-space:nowrap;margin-right:10px"><span class="vg-dot" style="background:${VYPL_BARVY[s.k]}"></span>${s.kratce} ${fmt(Math.round(rozk[i][s.k]))} Kč <span style="color:#8b93ad">(${_vyplPct(rozk[i][s.k], rozk[i].celkem)} %)</span></span>`).join(''),
  });
  const sl = vse ? pritomne : vid;
  const jedna = !vse && sl.length === 1;   // jedna složka – sloupec Součet by ji jen opakoval
  const hl = ['Měsíc'].concat(sl.map(s => s.kratce)).concat(vse ? ['Hrubá', 'Pevná %'] : jedna ? [] : ['Součet']);
  const radky = rada.map((z, i) => [_vyplMes(z.m)].concat(sl.map(s => rozk[i][s.k] ? fmt(Math.round(rozk[i][s.k])) : '–'))
    .concat(vse ? [`<b>${fmt(Math.round(rozk[i].celkem))}</b>`, rozk[i].celkem ? Math.round(rozk[i].pevna / rozk[i].celkem * 100) + ' %' : '–'] : jedna ? [] : [`<b>${fmt(Math.round(souc[i]))}</b>`])).reverse();
  const nn = rada.length || 1, suma = k => rozk.reduce((a, r) => a + r[k], 0);
  const souhrn = [
    ['Průměr'].concat(sl.map(s => fmt(Math.round(suma(s.k) / nn)))).concat(vse ? [fmt(Math.round(suma('celkem') / nn)), Math.round(suma('pevna') / (suma('celkem') || 1) * 100) + ' %'] : jedna ? [] : [fmt(Math.round(prumer))]),
    ['Součet'].concat(sl.map(s => fmt(Math.round(suma(s.k))))).concat(vse ? [fmt(Math.round(suma('celkem'))), ''] : jedna ? [] : [fmt(Math.round(souc.reduce((a, b) => a + b, 0)))]),
  ];
  return chipy + (vse ? _vyplLegenda(serie) : '') + graf + _vyplTabulka(hl, radky, souhrn);
}

function _vyplGrafy(zaznamy) {
  if (zaznamy.length < 2) return '';
  const rada = zaznamy.slice().sort((a, b) => (a.m || '').localeCompare(b.m || '')).slice(-24);
  window._vyplRada = rada;
  const mesice = rada.map(z => z.m);
  const rozk = rada.map(z => vyplRozklad(z));
  const vyp = rada.map(z => vyplDopocet(z));
  const mesNazev = i => _vyplMesicNazev(rada[i].m);
  let html = '';

  // ── A · Složení hrubé mzdy + filtr + tabulka ──
  html += `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">📊 Z čeho se skládá hrubá mzda</span></div>
    <div class="card-body"><div id="vyplSlozeniBox">${_vyplSlozeniObsah(rada)}</div>
      <div class="vg-pozn"><strong>Pevná</strong> je to, co dostaneš i bez přesčasů a bez výkonu (mzda, mobilita, dovolená).
        <strong>Příplatky</strong> závisí na tom, kdy pracuješ (So+Ne, noční, svátek), <strong>přesčas</strong> na tom, kolik práce vezmeš navíc.
        <strong>Prémie</strong> chodí každý měsíc podle hodnocení, <strong>mimořádné odměny</strong> jednou za čas (roční, pololetní, vánoční, náborová).
        Klepnutím na složku nahoře zobrazíš jen ji.</div>
    </div></div>`;

  // ── B · Prémie (sloupce), příplatky So+Ne/noční a přesčas (čáry) – S26 (v11.78) ──
  html += _vyplPremieKarta(rada, rozk);

  // ── C · Podíl pevné složky: stupnice 60–90 %, mřížka, průměrná čára ──
  const podily = rozk.map(r => r.celkem ? r.pevna / r.celkem * 100 : null);
  const platne = podily.filter(v => v != null);
  const prumer = platne.length ? platne.reduce((a, b) => a + b, 0) / platne.length : null;
  const prvni = platne[0], posledni = platne[platne.length - 1];
  const zmena = (prvni != null && posledni != null) ? Math.round(posledni - prvni) : null;
  const lo = platne.length ? Math.max(0, Math.min(60, Math.floor((Math.min(...platne) - 1) / 5) * 5)) : 60;
  const hi = platne.length ? Math.min(100, Math.max(90, Math.ceil((Math.max(...platne) + 1) / 5) * 5)) : 90;
  const tk = []; for (let t = lo; t <= hi; t += (hi - lo > 40 ? 10 : 5)) tk.push(t);
  const ph = podily.map(v => v == null ? 0 : v);
  const iMax = ph.indexOf(Math.max(...platne)), iMin = ph.indexOf(Math.min(...platne));
  html += `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🛡️ Podíl pevné složky</span></div>
    <div class="card-body">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:9px">
        <span style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;color:#e8eaf2">${posledni != null ? Math.round(posledni) : '—'} %</span>
        <span style="font-size:.74rem;color:${VYPL_POPISEK}">poslední měsíc · průměr ${prumer != null ? Math.round(prumer) : '—'} %</span>
        ${zmena != null ? `<span style="font-size:.74rem;color:${zmena >= 0 ? 'var(--income)' : 'var(--debt)'}">${zmena >= 0 ? '+' : ''}${zmena} pb za sledované období</span>` : ''}
      </div>
      ${_vyplSloupce({ id: 'vgPevna', mesice, serie: [{ k: 'pevna', barva: VYPL_BARVY.pevna, hodnoty: ph }], yMin: lo, yMax: hi, ticks: tk,
        fmtTick: t => t + ' %', vyska: 150, prumer: prumer != null ? { v: prumer, label: '⌀ ' + Math.round(prumer) + ' %' } : null,
        popisky: [iMax, iMin, rada.length - 1].filter((v, i, a) => v >= 0 && a.indexOf(v) === i), fmtHodnota: v => Math.round(v) + ' %',
        cteni: i => podily[i] == null ? `<b>${mesNazev(i)}</b> · bez příjmů`
          : `<b>${mesNazev(i)}</b> · pevná složka <b>${Math.round(podily[i])} %</b> (${fmt(Math.round(rozk[i].pevna))} z ${fmt(Math.round(rozk[i].celkem))} Kč)
             · oproti průměru ${_vyplCs(podily[i] - prumer).replace(/\s*$/, '')} pb` })}
      <div class="vg-pozn">Stupnice začíná na ${lo} %, aby byly rozdíly mezi měsíci vidět; čárkovaná čára je průměr.
        Kolik z hrubé mzdy je jisté: vyšší podíl znamená stabilnější příjem – pevnou část ti nikdo nesebere a počítá se do dovolené i náhrad.
        Appka neříká, který podíl je správný; to závisí na tom, jestli ve firmě zůstaneš.</div>
    </div></div>`;

  html += _vyplOdvodyKarta(rada, vyp);
  html += _vyplOdmenyKarta(zaznamy);
  html += _vyplSrazkyKarta(rada);
  return html;
}
window._vyplGrafy = _vyplGrafy;

//  S26 (v11.77): MIMOŘÁDNÉ ODMĚNY po letech (roční, pololetní, vánoční, náborová).
function _vyplOdmenyKarta(zaznamy) {
  const sab = vyplSablona(), roky = {};
  zaznamy.forEach(z => _vyplPolozky(z, 'prijmy', sab).forEach(it => {
    if (it.povaha === 'pruchozi' || _vyplSlozka(it.key, sab) !== 'odmeny' || !it.v) return;
    const r = String(z.m).slice(0, 4);
    (roky[r] = roky[r] || []).push({ m: z.m, label: it.label, v: it.v });
  }));
  const ry = Object.keys(roky).sort().reverse();
  if (!ry.length) return '';
  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🎁 Mimořádné odměny</span></div>
    <div class="card-body">
      ${ry.map(r => `<div class="vk-sek">${r} · celkem ${fmt(Math.round(roky[r].reduce((a, x) => a + x.v, 0)))} Kč</div>
        ${roky[r].sort((a, b) => a.m.localeCompare(b.m)).map(x => `<div class="vk-r"><span class="vk-l"><span class="vk-tecka" style="background:${VYPL_BARVY.odmeny}"></span>${x.label}
          <span class="vk-pozn">${_vyplMesicNazev(x.m).toLowerCase()}</span></span><span class="vk-v" style="color:${VYPL_HODNOTA}">${fmt(Math.round(x.v))} Kč</span></div>`).join('')}`).join('')}
      <div class="vg-pozn">Odměny, které nechodí každý měsíc. V grafu složení mají vlastní růžovou barvu a do porovnání prémií
        před a po změně tarifu se nepočítají. Chybí tu nějaká (třeba pololetní)? Doplň ji u měsíce přes ✎ Upravit – pole
        „Pololetní prémie“ je v šabloně.</div>
    </div></div>`;
}

//  S26 (v11.77): SRÁŽKY po měsících (stravování, el. peněženka…), ne jen součet.
function _vyplSrazkyKarta(rada) {
  const sab = vyplSablona();
  const pruchozi = new Set((sab.srazky || []).filter(x => x.povaha === 'pruchozi').map(x => x.key));
  const klice = [];
  rada.forEach(z => Object.keys(z.srazky || {}).forEach(k => { if (!pruchozi.has(k) && !klice.includes(k)) klice.push(k); }));
  if (!klice.length) return '';
  const nazev = k => ((sab.srazky || []).find(x => x.key === k) || {}).label || k;
  const hod = (z, k) => +((z.srazky || {})[k]) || 0;
  const celk = rada.map(z => klice.reduce((a, k) => a + hod(z, k), 0));
  const srCelkem = celk.reduce((a, b) => a + b, 0);
  const osa = _vyplOsa(Math.max(...celk, 1));
  const radky = rada.map((z, i) => [_vyplMes(z.m)].concat(klice.map(k => hod(z, k) ? fmtP(hod(z, k)) : '–')).concat([`<b>${fmtP(celk[i])}</b>`])).reverse();
  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">✂️ Srážky za ${rada.length} měsíců</span></div>
    <div class="card-body">
      <div class="vg-kpi">
        <div><div class="l">Celkem</div><div class="v" style="color:var(--expense)">${fmt(Math.round(srCelkem))} Kč</div></div>
        <div><div class="l">⌀ měsíčně</div><div class="v">${fmt(Math.round(srCelkem / rada.length))} Kč</div></div>
      </div>
      ${klice.sort((x, y) => rada.reduce((a, z) => a + hod(z, y), 0) - rada.reduce((a, z) => a + hod(z, x), 0)).map(k => {
        const s = rada.reduce((a, z) => a + hod(z, k), 0), n = rada.filter(z => hod(z, k)).length;
        return `<div class="vk-r"><span class="vk-l">${nazev(k)} <span class="vk-pozn">${n}× · ⌀ ${fmt(Math.round(s / (n || 1)))} Kč</span></span>
          <span class="vk-v" style="color:${VYPL_HODNOTA}">${fmt(Math.round(s))} Kč</span></div>`; }).join('')}
      <div style="margin-top:12px">${_vyplSloupce({ id: 'vgSrazky', mesice: rada.map(z => z.m), yMax: osa.max, ticks: osa.ticks, fmtTick: _vyplKcOsa, vyska: 110,
        serie: [{ k: 'sr', barva: VYPL_SRAZKY_BARVA, hodnoty: celk }],
        prumer: { v: srCelkem / rada.length, label: '⌀ ' + fmt(Math.round(srCelkem / rada.length)) },
        cteni: i => `<b>${_vyplMesicNazev(rada[i].m)}</b> · srážky <b>${fmtP(celk[i])} Kč</b>`
          + (celk[i] ? ': ' + klice.filter(k => hod(rada[i], k)).map(k => `${nazev(k)} ${fmtP(hod(rada[i], k))} Kč`).join(' · ') : '') })}</div>
      <details style="margin-top:8px"><summary style="font-size:.74rem;color:#a8aec8;cursor:pointer">Tabulka po měsících</summary>
        ${_vyplTabulka(['Měsíc'].concat(klice.map(nazev)).concat(['Celkem']), radky,
          [['Součet'].concat(klice.map(k => fmt(Math.round(rada.reduce((a, z) => a + hod(z, k), 0))))).concat([fmt(Math.round(srCelkem))])])}</details>
      <div class="vg-pozn">Průchozí položky (příspěvek na penzijko, který se hned strhne) se nepočítají –
        nejsou to tvoje peníze ani tam, ani zpět.</div>
    </div></div>`;
}

// ══════════════════════════════════════════════════════════════════════
//  S26 (v11.78) · MEGAGRAF, OTÁZKY, ODVODY Z PŘESČASU, ODHAD VÝPLATY Z PÁSKY
//  Milan: „neumím odpovědět, o kolik Kč (%) mám větší odvody, když pracuji přesčas“
//         „v grafech nevím, kolikrát jsem byl na přesčasu, kdy jsem měl dovolenou či paragraf“
//         „jeden velký megagraf přes celou šířku, všechna data, filtr, hlavní a vedlejší osa,
//          interaktivní, s tabulkou“ · „AI vrstva: pár otázek v bublině“
//  Otázky počítá appka z pásek sama (okamžitě, nic se neodesílá). Skutečné AI by potřebovalo
//  nový endpoint ve workeru – ten se teď nemění.
// ══════════════════════════════════════════════════════════════════════

//  Příplatky v % z PPÚ – z Nastavení úvazku (Kalendář → Práce), jinak zákonné minimum / Milanova smlouva.
function _vyplBonusy() {
  const c = (typeof _workCfg === 'function') ? _workCfg() : {};
  return { ot: c.bonusOT != null ? c.bonusOT : 25, we: c.bonusWe != null ? c.bonusWe : 10,
           hol: c.bonusHol != null ? c.bonusHol : 100, night: c.bonusNight != null ? c.bonusNight : 10 };
}
const _vyplOdvodyOpsane = z => { const o = z.odvody || {}; return o.zp != null || o.sp != null || o.dan != null; };

//  O kolik vzrostou odvody kvůli složce (přesčas…): páska se přepočítá BEZ té složky a rozdíl
//  je přesně to, co ze složky odešlo na pojistném a dani. U pásky s opsanými odvody (jiná firma)
//  to přesně nejde → odhad mezní sazbou.
function vyplOdvodyZeSlozky(z, slozka) {
  const sab = vyplSablona(), p = z.prijmy || {};
  const kc = Object.keys(p).reduce((a, k) => a + (_vyplSlozka(k, sab) === slozka ? (+p[k] || 0) : 0), 0);
  if (!kc) return { kc: 0, odvody: 0, presne: true };
  if (_vyplOdvodyOpsane(z)) { const m = vyplMeznaSazba([z]) || 0.266; return { kc, odvody: Math.round(kc * m), presne: false }; }
  const bez = Object.assign({}, z, { prijmy: {} });
  Object.keys(p).forEach(k => { if (_vyplSlozka(k, sab) !== slozka) bez.prijmy[k] = p[k]; });
  return { kc, odvody: Math.round((vyplDopocet(z).odvody - vyplDopocet(bez).odvody) * 100) / 100, presne: true };
}
window.vyplOdvodyZeSlozky = vyplOdvodyZeSlozky;

//  Kolik z 1 000 Kč hrubého navíc odejde v DANÉM měsíci (model: +1 000 Kč a rozdíl odvodů).
function vyplMezniMesic(z) {
  if (_vyplOdvodyOpsane(z)) return null;
  const plus = Object.assign({}, z, { prijmy: Object.assign({}, z.prijmy || {}, { _mezni1000: ((z.prijmy || {})._mezni1000 || 0) + 1000 }) });
  const d = (vyplDopocet(plus).odvody - vyplDopocet(z).odvody) / 1000;
  return d > 0 && d < 1 ? d : null;
}
window.vyplMezniMesic = vyplMezniMesic;

//  Mezní sazba za období: u pásek s odvody dopočítanými appkou přesně z poslední pásky (+1 000 Kč),
//  u pásek s opsanými odvody (jiná firma / země) odhadem z měsíců se STEJNÝMI slevami a nenulovou daní.
function vyplMeznaSazba(rada) {
  if (!rada || !rada.length) return null;
  const posl = rada[rada.length - 1];
  if (!_vyplOdvodyOpsane(posl)) return vyplMezniMesic(posl);
  const vyp = rada.map(z => vyplDopocet(z)), sl = vyp[vyp.length - 1].slevy;
  let b = vyp.filter(v => v.hruba > 0 && v.dan > 0 && Math.abs(v.slevy - sl) < 1);
  if (b.length < 4) b = vyp.filter(v => v.hruba > 0 && v.dan > 0);
  if (b.length < 4) return null;
  const mx = b.reduce((a, v) => a + v.hruba, 0) / b.length, my = b.reduce((a, v) => a + v.odvody, 0) / b.length;
  let cov = 0, vr = 0;
  b.forEach(v => { cov += (v.hruba - mx) * (v.odvody - my); vr += (v.hruba - mx) ** 2; });
  if (vr < 1e6) return null;                       // hrubá skoro stejná každý měsíc – nejde odhadnout
  const k = cov / vr;
  return k > 0 && k < 1 ? k : null;
}
window.vyplMeznaSazba = vyplMeznaSazba;

//  Hodiny zpětně z pásky: Kč ÷ sazba. Na Milanových páskách vychází na čtvrthodiny (ověřeno).
function vyplHodinyZPasky(z) {
  const h = z.hlavicka || {}, p = z.prijmy || {}, b = _vyplBonusy();
  const ppu = +h.ppu || 0, ts = (+h.tarif && +h.fond) ? h.tarif / h.fond : 0;
  const q = v => Math.round(v * 4) / 4;
  const prescasH = ts && p.prescas ? q(p.prescas / ts) : (ppu && p.prescasPr ? q(p.prescasPr / (ppu * b.ot / 100)) : 0);
  const dovolenaH = ppu && p.dovolena ? q(p.dovolena / ppu) : 0;
  return {
    fond: +h.fond || 0, odprac: +h.odprac || 0, neprit: +h.neprit || 0, prescasH, dovolenaH,
    jinaH: Math.max(0, q((+h.neprit || 0) + (+h.neplacene || 0) - dovolenaH)),
    nocniH: ppu && p.nocni ? q(p.nocni / (ppu * b.night / 100)) : 0,
    vikendH: ppu && p.vikend ? q(p.vikend / (ppu * b.we / 100)) : 0,
    svatekH: ppu && p.svatek ? q(p.svatek / (ppu * b.hol / 100)) : 0,
  };
}
window.vyplHodinyZPasky = vyplHodinyZPasky;

//  Katalog řad pro megagraf – všechno, co o měsíci víme. jed = jednotka (Kč, h, %, Kč/h).
const VYPL_MEGA_SKUPINY = [['mzda', 'Mzda'], ['slozky', 'Složky'], ['odvody', 'Odvody a srážky'], ['hodiny', 'Hodiny'], ['pomery', 'Poměry'], ['sazby', 'Sazby']];
function vyplMegaRady(rada) {
  const vyp = rada.map(z => vyplDopocet(z)), rozk = rada.map(z => vyplRozklad(z)), hod = rada.map(z => vyplHodinyZPasky(z));
  const zPres = rada.map(z => vyplOdvodyZeSlozky(z, 'prescas'));
  const pole = f => rada.map((z, i) => f(i, z));
  const R = [];
  const r = (k, skup, label, kratce, jed, hodnoty, suma) => R.push({ k, skup, label, kratce, jed, hodnoty, suma: suma !== false });
  r('hruba', 'mzda', 'Hrubá mzda', 'Hrubá', 'Kč', pole(i => vyp[i].hruba));
  r('cisty', 'mzda', 'Čistá mzda', 'Čistá', 'Kč', pole(i => vyp[i].cisty));
  r('dobirka', 'mzda', 'Dobírka (na účet)', 'Dobírka', 'Kč', pole(i => vyp[i].dobirka));
  r('pevna', 'slozky', 'Pevná mzda', 'Pevná', 'Kč', pole(i => rozk[i].pevna));
  r('priplatky', 'slozky', 'Příplatky So+Ne, noční, svátek', 'Příplatky', 'Kč', pole(i => rozk[i].priplatky));
  r('prescasKc', 'slozky', 'Přesčas (mzda + příplatek)', 'Přesčas Kč', 'Kč', pole(i => rozk[i].prescas));
  r('premie', 'slozky', 'Prémie (měsíční)', 'Prémie', 'Kč', pole(i => rozk[i].premie));
  r('odmeny', 'slozky', 'Mimořádné odměny', 'Odměny', 'Kč', pole(i => rozk[i].odmeny));
  r('odvody', 'odvody', 'Odvody celkem', 'Odvody', 'Kč', pole(i => vyp[i].odvody));
  r('zp', 'odvody', 'Zdravotní pojištění', 'ZP', 'Kč', pole(i => vyp[i].zp));
  r('sp', 'odvody', 'Sociální pojištění', 'SP', 'Kč', pole(i => vyp[i].sp));
  r('dan', 'odvody', 'Daň', 'Daň', 'Kč', pole(i => vyp[i].dan));
  r('odvodyPrescas', 'odvody', 'Odvody z přesčasu', 'Odvody z přesčasu', 'Kč', pole(i => zPres[i].odvody));
  r('prescasCisty', 'odvody', 'Z přesčasu zůstalo čistého', 'Přesčas čistý', 'Kč', pole(i => zPres[i].kc - zPres[i].odvody));
  r('srazky', 'odvody', 'Srážky', 'Srážky', 'Kč', pole(i => vyp[i].srazky));
  r('odprac', 'hodiny', 'Odpracováno', 'Odpracováno', 'h', pole(i => hod[i].odprac));
  r('fond', 'hodiny', 'Fond pracovní doby', 'Fond', 'h', pole(i => hod[i].fond));
  r('prescasH', 'hodiny', 'Přesčas', 'Přesčas h', 'h', pole(i => hod[i].prescasH));
  r('dovolenaH', 'hodiny', 'Dovolená', 'Dovolená h', 'h', pole(i => hod[i].dovolenaH));
  r('jinaH', 'hodiny', 'Jiná nepřítomnost (paragraf, nemoc, neplacené)', 'Paragraf / nemoc h', 'h', pole(i => hod[i].jinaH));
  r('nocniH', 'hodiny', 'Noční hodiny', 'Noční h', 'h', pole(i => hod[i].nocniH));
  r('vikendH', 'hodiny', 'Hodiny o víkendu', 'Víkend h', 'h', pole(i => hod[i].vikendH));
  r('svatekH', 'hodiny', 'Hodiny ve svátek', 'Svátek h', 'h', pole(i => hod[i].svatekH));
  r('sazbaOdvodu', 'pomery', 'Odvody v % z hrubé', 'Odvody %', '%', pole(i => vyp[i].hruba ? Math.round(vyp[i].odvody / vyp[i].hruba * 1000) / 10 : 0), false);
  r('cistaPct', 'pomery', 'Čistá v % z hrubé', 'Čistá %', '%', pole(i => vyp[i].hruba ? Math.round(vyp[i].cisty / vyp[i].hruba * 1000) / 10 : 0), false);
  r('podilPevne', 'pomery', 'Podíl pevné složky', 'Pevná %', '%', pole(i => rozk[i].celkem ? Math.round(rozk[i].pevna / rozk[i].celkem * 1000) / 10 : 0), false);
  r('hodinovka', 'sazby', 'Čistého na placenou hodinu', 'Čistá Kč/h', 'Kč/h', pole(i => (hod[i].odprac + hod[i].dovolenaH) ? Math.round(vyp[i].cisty / (hod[i].odprac + hod[i].dovolenaH)) : 0), false);
  r('tarifni', 'sazby', 'Tarifní sazba (tarif ÷ fond)', 'Tarif Kč/h', 'Kč/h', pole((i, z) => (z.hlavicka || {}).tarif && hod[i].fond ? Math.round(z.hlavicka.tarif / hod[i].fond * 100) / 100 : 0), false);
  r('ppu', 'sazby', 'Průměrný výdělek PPÚ', 'PPÚ Kč/h', 'Kč/h', pole((i, z) => +((z.hlavicka || {}).ppu) || 0), false);
  r('zustane1000', 'sazby', 'Z 1 000 Kč hrubého navíc zůstane', 'Z 1 000 zůstane', 'Kč', pole((i, z) => { const m = vyplMezniMesic(z); return m ? Math.round((1 - m) * 1000) : 0; }), false);
  return R;
}
window.vyplMegaRady = vyplMegaRady;

//  Události měsíce – pás pod grafem: přesčas, dovolená, paragraf/nemoc, odměna.
function _vyplUdalosti(rada) {
  const hod = rada.map(z => vyplHodinyZPasky(z)), rozk = rada.map(z => vyplRozklad(z));
  return [
    { ikona: '⏱', label: 'Přesčas', jed: 'h', barva: VYPL_BARVY.prescas, hodnoty: hod.map(h => h.prescasH) },
    { ikona: '🏖', label: 'Dovolená', jed: 'h', barva: '#60a5fa', hodnoty: hod.map(h => h.dovolenaH) },
    { ikona: '🩺', label: 'Paragraf / nemoc', jed: 'h', barva: '#fbbf24', hodnoty: hod.map(h => h.jinaH) },
    { ikona: '🎁', label: 'Odměna', jed: 'Kč', barva: VYPL_BARVY.odmeny, hodnoty: rozk.map(r => r.odmeny) },
  ].filter(u => u.hodnoty.some(v => v > 0));
}
function _vyplUdalostiText(ud, i) {
  const t = ud.filter(u => u.hodnoty[i] > 0).map(u => `${u.ikona} ${u.label.toLowerCase()} ${u.jed === 'h' ? _vyplH(u.hodnoty[i]) + ' h' : fmt(Math.round(u.hodnoty[i])) + ' Kč'}`);
  return t.length ? `<br><span style="color:#a8aec8">${t.join(' · ')}</span>` : '';
}
const _vyplH = v => String(Math.round(v * 100) / 100).replace('.', ',');

//  Kombinovaný graf: sloupce (vedle sebe / skládané) a čáry; hlavní osa vlevo, vedlejší vpravo.
//  o = { id, mesice, vyska, sloupce:[{label,barva,hodnoty}], rezim:'vedle'|'sklad', cary:[{label,barva,hodnoty,osa:'P'?}],
//        osaL:{max,ticks,fmt,nazev,min}, osaP, prumer:{v,label}, udalosti:[…], cteni(i) }
function _vyplKombi(o) {
  const n = o.mesice.length, H = o.vyska || 170, L = o.osaL, P = o.osaP || null;
  const mk = A => v => { const mn = A.min || 0; return Math.max(0, Math.min(100, ((+v || 0) - mn) / ((A.max - mn) || 1) * 100)); };
  const pL = mk(L), pP = P ? mk(P) : pL;
  window._vyplGraf[o.id] = { cteni: o.cteni, n };
  const mr = P ? 44 : 6, okraj = `margin-left:44px;margin-right:${mr}px`;
  const tk = L.ticks.map(t => `<div class="vg-mr" style="bottom:${pL(t)}%"></div><div class="vg-tk" style="bottom:${pL(t)}%">${L.fmt(t)}</div>`).join('')
    + (P ? P.ticks.map(t => `<div class="vg-tk vg-tkp" style="bottom:${pP(t)}%">${P.fmt(t)}</div>`).join('') : '');
  const sl = o.sloupce || [];
  const sloupce = o.mesice.map((m, i) => {
    let in_ = '';
    if (sl.length && o.rezim === 'sklad') {
      const vals = sl.map(s => Math.max(0, +s.hodnoty[i] || 0)), c = vals.reduce((a, b) => a + b, 0);
      in_ = `<div class="vg-st" style="height:${pL(c)}%">${sl.map((s, k) => vals[k] > 0 ? `<div class="vg-seg" style="flex:${vals[k]} 1 0;background:${s.barva}"></div>` : '').join('')}</div>`;
    } else if (sl.length) {
      in_ = `<div style="display:flex;gap:1px;width:100%;height:100%;align-items:flex-end">${sl.map(s =>
        `<div class="vg-st" style="flex:1 1 0;height:${pL(s.hodnoty[i])}%"><div class="vg-seg" style="flex:1 1 0;background:${s.barva}"></div></div>`).join('')}</div>`;
    }
    return `<div class="vg-sl${i === n - 1 ? ' vg-akt' : ''}" data-i="${i}" onclick="vyplVyber('${o.id}',${i})" onmouseenter="vyplVyber('${o.id}',${i})">${in_}</div>`;
  }).join('');
  const x = i => (i + 0.5) / n * 1000;
  const cary = (o.cary || []).map(c => { const pc = c.osa === 'P' ? pP : pL;
    return `<polyline fill="none" stroke="${c.barva}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"${c.osa === 'P' ? ' stroke-dasharray="6 4"' : ''}
      points="${c.hodnoty.map((v, i) => `${x(i).toFixed(1)},${(1000 - pc(v) * 10).toFixed(1)}`).join(' ')}"/>`; }).join('');
  const body = n <= 40 ? (o.cary || []).map(c => { const pc = c.osa === 'P' ? pP : pL;
    return c.hodnoty.map((v, i) => `<span class="vg-bod" style="left:${(i + 0.5) / n * 100}%;bottom:${pc(v)}%;background:${c.osa === 'P' ? 'var(--surface)' : c.barva};${c.osa === 'P' ? `border:2px solid ${c.barva};width:7px;height:7px` : ''}"></span>`).join(''); }).join('') : '';
  const avg = o.prumer && o.prumer.v != null ? `<div class="vg-avg" style="bottom:${pL(o.prumer.v)}%"><span>${o.prumer.label}</span></div>` : '';
  const ud = (o.udalosti || []).length ? `<div class="vg-udy" style="${okraj}">${o.udalosti.map(u => { const mx = Math.max(...u.hodnoty, 1);
    return `<div class="vg-ud" title="${u.label}"><span class="vg-udl">${u.ikona}</span>${u.hodnoty.map(v => `<span class="vg-udc">${v > 0 ? `<i style="background:${u.barva};width:${5 + Math.round(v / mx * 6)}px;height:${5 + Math.round(v / mx * 6)}px"></i>` : ''}</span>`).join('')}</div>`; }).join('')}</div>` : '';
  const osy = `<div class="vg-osy" style="${okraj}"><span>${L.nazev || ''}</span>${P ? `<span>${P.nazev || ''} ┄</span>` : ''}</div>`;
  return `<div class="vg${(o.cary || []).length ? ' vg-cary' : ''}" id="${o.id}">${osy}
    <div class="vg-plot" style="height:${H}px;${okraj}">${tk}<div class="vg-bars">${sloupce}</div>
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none">${cary}</svg>${body}${avg}</div>
    <div style="${okraj.replace('margin-left:44px', 'margin-left:0')}">${_vyplXPopisky(o.mesice)}</div>${ud}
    <div class="vg-ct" id="${o.id}_ct">${n ? o.cteni(n - 1) : ''}</div></div>`;
}
window._vyplKombi = _vyplKombi;

function _vyplOsaJed(max, jed) {
  const o = _vyplOsa(Math.max(max, jed === '%' ? 1 : 1));
  const f = jed === 'Kč' ? _vyplKcOsa : jed === '%' ? (t => fmtP(t) + ' %') : jed === 'h' ? (t => fmtP(t) + ' h') : (t => fmtP(t));
  return Object.assign(o, { fmt: f, nazev: jed });
}
const _vyplFmtJed = (v, jed) => jed === 'Kč' ? `${fmt(Math.round(v))} Kč` : jed === '%' ? `${String(Math.round(v * 10) / 10).replace('.', ',')} %` : jed === 'h' ? `${_vyplH(v)} h` : `${fmtP(Math.round(v * 100) / 100)} ${jed}`;

//  Stav karet (filtry, osy) – per prohlížeč, jako ostatní filtry v appce.
window._vyplStav = window._vyplStav || (() => { try { return JSON.parse(localStorage.getItem('ffVyplStav') || '{}') || {}; } catch (e) { return {}; } })();
function _vyplStavUloz() { try { localStorage.setItem('ffVyplStav', JSON.stringify(window._vyplStav)); } catch (e) {} }
window._vyplKarty = window._vyplKarty || {};
function _vyplPrekresli(karta) {
  const box = typeof document !== 'undefined' && document.getElementById('vyplBox_' + karta), f = window._vyplKarty[karta];
  if (box && f) box.innerHTML = f();
}

// ── Megagraf ──────────────────────────────────────────────────────────
const VYPL_MEGA_SLOTY = ['#16a34a', '#3b82f6', '#e11d48', '#d97706', '#8b5cf6', '#0d9488'];   // ověřené pořadí (sousední páry)
const VYPL_MEGA_MAX = 6;
const VYPL_POHLEDY = {
  hrubaCista: { label: '💵 Hrubá × čistá', typ: 'vedle', rady: [['hruba', 'L'], ['cisty', 'L'], ['sazbaOdvodu', 'P']] },
  prescas:    { label: '⏱ Přesčas: hodiny × peníze', typ: 'sklad', rady: [['prescasCisty', 'L'], ['odvodyPrescas', 'L'], ['prescasH', 'P']] },
  slozeni:    { label: '📊 Složení mzdy', typ: 'sklad', rady: [['pevna', 'L'], ['priplatky', 'L'], ['prescasKc', 'L'], ['premie', 'L'], ['odmeny', 'L'], ['podilPevne', 'P']] },
  odvody:     { label: '🏛️ Odvody × hrubá', typ: 'sklad', rady: [['zp', 'L'], ['sp', 'L'], ['dan', 'L'], ['hruba', 'P']] },
  nepritomnost: { label: '🏖 Dovolená a nepřítomnost', typ: 'sklad', rady: [['odprac', 'L'], ['dovolenaH', 'L'], ['jinaH', 'L'], ['dobirka', 'P']] },
  hodinovka:  { label: '⏲ Hodinovka', typ: 'cary', rady: [['hodinovka', 'L'], ['tarifni', 'L'], ['ppu', 'L'], ['odprac', 'P']] },
};
function _vyplMegaStav() {
  const s = window._vyplStav.mega || {};
  if (!Array.isArray(s.rady) || !s.rady.length) return _vyplMegaZPohledu('hrubaCista');
  return s;
}
function _vyplMegaZPohledu(p) {
  const P = VYPL_POHLEDY[p] || VYPL_POHLEDY.hrubaCista;
  return { pohled: p, typ: P.typ, obdobi: (window._vyplStav.mega || {}).obdobi || 0, rady: P.rady.map(([k, osa], i) => ({ k, osa, slot: i })) };
}
function vyplMegaPohled(p) { window._vyplStav.mega = _vyplMegaZPohledu(p); _vyplStavUloz(); _vyplPrekresli('mega'); }
//  Klepnutí na řadu: vypnuto → hlavní osa → vedlejší osa → vypnuto. Barva (slot) zůstává řadě,
//  dokud ji nevypneš – přidání další řady ostatní nepřebarví.
function vyplMegaRada(k) {
  const s = JSON.parse(JSON.stringify(_vyplMegaStav())); s.pohled = '';
  const i = s.rady.findIndex(r => r.k === k);
  if (i < 0) {
    if (s.rady.length >= VYPL_MEGA_MAX) { if (typeof showToast === 'function') showToast(`Najednou nejvýš ${VYPL_MEGA_MAX} řad – nejdřív nějakou vypni`); return; }
    const vol = [0, 1, 2, 3, 4, 5].find(x => !s.rady.some(r => r.slot === x));
    s.rady.push({ k, osa: 'L', slot: vol });
  } else if (s.rady[i].osa === 'L') s.rady[i].osa = 'P';
  else s.rady.splice(i, 1);
  window._vyplStav.mega = s; _vyplStavUloz(); _vyplPrekresli('mega');
}
function vyplMegaNastav(klic, hodnota) {
  const s = JSON.parse(JSON.stringify(_vyplMegaStav())); s[klic] = hodnota;
  window._vyplStav.mega = s; _vyplStavUloz(); _vyplPrekresli('mega');
}
window.vyplMegaPohled = vyplMegaPohled; window.vyplMegaRada = vyplMegaRada; window.vyplMegaNastav = vyplMegaNastav;

function _vyplMegaObsah() {
  const vse = (window._vyplRadaVse || []);
  if (vse.length < 2) return '';
  const s = _vyplMegaStav();
  const rada = s.obdobi ? vse.slice(-s.obdobi) : vse;
  const kat = vyplMegaRady(rada), dle = k => kat.find(r => r.k === k);
  const aktivni = s.rady.map(r => Object.assign({}, dle(r.k) || {}, r, { barva: VYPL_MEGA_SLOTY[r.slot % 6] })).filter(r => r.hodnoty);
  const L = aktivni.filter(r => r.osa === 'L'), P = aktivni.filter(r => r.osa === 'P');
  const typ = s.typ || 'vedle';
  const jedL = L[0] ? L[0].jed : (P[0] ? P[0].jed : 'Kč'), jedP = P[0] ? P[0].jed : '';
  const smes = L.some(r => r.jed !== jedL) || P.some(r => r.jed !== jedP);
  const maxL = typ === 'sklad' && L.length > 1 ? Math.max(...rada.map((z, i) => L.reduce((a, r) => a + Math.max(0, r.hodnoty[i] || 0), 0)), 1) : Math.max(...L.flatMap(r => r.hodnoty), 1);
  const osaL = _vyplOsaJed(maxL, jedL), osaP = P.length ? _vyplOsaJed(Math.max(...P.flatMap(r => r.hodnoty), 1), jedP) : null;
  const udal = _vyplUdalosti(rada);
  const chip = r => { const a = aktivni.find(x => x.k === r.k);
    return `<button class="vg-chip${a ? ' on' : ''}" onclick="vyplMegaRada('${r.k}')" title="${r.label} (${r.jed})">${a ? `<span class="vg-dot" style="background:${a.barva};margin:0"></span>` : ''}${r.kratce}${a ? `<b class="vg-osaz">${a.osa === 'L' ? 'H' : 'V'}</b>` : ''}</button>`; };
  const seg = (klic, akt, moz) => `<div class="vg-seg2">${moz.map(([v, l]) => `<button class="${String(akt) === String(v) ? 'on' : ''}" onclick="vyplMegaNastav('${klic}',${typeof v === 'number' ? v : `'${v}'`})">${l}</button>`).join('')}</div>`;
  const graf = aktivni.length ? _vyplKombi({ id: 'vgMega', mesice: rada.map(z => z.m), vyska: 230, osaL, osaP,
      sloupce: typ === 'cary' ? [] : L.map(r => ({ label: r.label, barva: r.barva, hodnoty: r.hodnoty })), rezim: typ,
      cary: (typ === 'cary' ? L : []).map(r => ({ label: r.label, barva: r.barva, hodnoty: r.hodnoty })).concat(P.map(r => ({ label: r.label, barva: r.barva, hodnoty: r.hodnoty, osa: 'P' }))),
      udalosti: udal,
      cteni: i => `<b>${_vyplMesicNazev(rada[i].m)}</b><br>` + aktivni.map(r => `<span style="white-space:nowrap;margin-right:10px"><span class="vg-dot" style="background:${r.barva}"></span>${r.kratce} <b>${_vyplFmtJed(r.hodnoty[i] || 0, r.jed)}</b>${r.osa === 'P' ? ' <span style="color:#8b93ad">(V)</span>' : ''}</span>`).join('') + _vyplUdalostiText(udal, i) })
    : `<div class="vg-pozn">Vyber aspoň jednu řadu.</div>`;
  const hl = ['Měsíc'].concat(aktivni.map(r => `${r.kratce}${r.osa === 'P' ? ' (V)' : ''}`));
  const radky = rada.map((z, i) => [_vyplMes(z.m)].concat(aktivni.map(r => _vyplFmtJed(r.hodnoty[i] || 0, r.jed).replace(/ (Kč|h|%|Kč\/h)$/, '')))).reverse();
  const nn = rada.length || 1;
  const souhrn = aktivni.length ? [
    ['Průměr'].concat(aktivni.map(r => _vyplFmtJed(r.hodnoty.reduce((a, b) => a + (b || 0), 0) / nn, r.jed).replace(/ (Kč|h|%|Kč\/h)$/, ''))),
    ['Součet'].concat(aktivni.map(r => r.suma ? _vyplFmtJed(r.hodnoty.reduce((a, b) => a + (b || 0), 0), r.jed).replace(/ (Kč|h|%|Kč\/h)$/, '') : '')),
  ] : [];
  return `
    <div class="vg-sek2">Rychlé pohledy</div>
    <div class="vg-chipy">${Object.keys(VYPL_POHLEDY).map(k => `<button class="vg-chip${s.pohled === k ? ' on' : ''}" onclick="vyplMegaPohled('${k}')">${VYPL_POHLEDY[k].label}</button>`).join('')}</div>
    <details class="vg-det"${s.pohled ? '' : ' open'}><summary>Řady a osy <span style="color:#8b93ad">· klepnutí: H = hlavní osa vlevo → V = vedlejší vpravo (čárkovaně) → vypnout · nejvýš ${VYPL_MEGA_MAX}</span></summary>
      ${VYPL_MEGA_SKUPINY.map(([g, gl]) => `<div class="vg-sek2">${gl}</div><div class="vg-chipy">${kat.filter(r => r.skup === g).map(chip).join('')}</div>`).join('')}
    </details>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0">
      ${seg('typ', typ, [['vedle', 'Sloupce'], ['sklad', 'Skládané'], ['cary', 'Čáry']])}
      ${seg('obdobi', s.obdobi || 0, [[12, '12 m'], [24, '24 m'], [0, 'Vše']])}
    </div>
    ${_vyplLegenda(aktivni.map(r => ({ label: `${r.label} · ${r.osa === 'L' ? 'hlavní' : 'vedlejší'} osa`, barva: r.barva })))}
    ${smes ? `<div class="vg-pozn" style="color:#fbbf24;margin:0 0 6px">⚠️ Na jedné ose jsou různé jednotky – dej jednu z řad na vedlejší osu (klepni na ni).</div>` : ''}
    ${graf}
    ${aktivni.length ? _vyplTabulka(hl, radky, souhrn) : ''}`;
}

function _vyplMegaKarta(zaznamy) {
  if (zaznamy.length < 2) return '';
  window._vyplRadaVse = zaznamy.slice().sort((a, b) => (a.m || '').localeCompare(b.m || ''));
  window._vyplKarty.mega = _vyplMegaObsah;
  return `<div class="card vg-wide" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🔭 Megagraf výplat</span></div>
    <div class="card-body">
      ${_vyplOtazkyHTML()}
      <div id="vyplBox_mega">${_vyplMegaObsah()}</div>
      <div class="vg-pozn">Pod grafem je pás událostí: ⏱ přesčas, 🏖 dovolená, 🩺 paragraf / nemoc, 🎁 odměna – čím větší tečka, tím víc hodin (Kč).
        Hodiny se počítají zpětně z pásky (Kč ÷ sazba) a vycházejí na čtvrthodiny.</div>
    </div></div>`;
}
window._vyplMegaKarta = _vyplMegaKarta;

// ── Otázky v bublinách ────────────────────────────────────────────────
const VYPL_OTAZKY = [
  { id: 'prescasOdvody', q: 'Kolik mi z přesčasu sebere stát?' },
  { id: 'prescasKolikrat', q: 'Kolikrát jsem byl na přesčasu?' },
  { id: 'prescasHodina', q: 'Kolik čistého dostanu za hodinu přesčasu?' },
  { id: 'nepritomnost', q: 'Kdy jsem měl dovolenou nebo paragraf?' },
  { id: 'konstanta', q: 'Je těch 734 Kč z tisícovky konstanta?' },
  { id: 'nejlepsi', q: 'Který měsíc byl nejlepší a proč?' },
  { id: 'priplatky', q: 'Kolik mi dají víkendy a noci?' },
];
function _vyplOtazkyHTML() {
  return `<div class="vg-sek2">❓ Zeptej se svých výplat</div>
    <div class="vg-bubliny">${VYPL_OTAZKY.map(o => `<button class="vg-bub" onclick="vyplOtazka('${o.id}')">${o.q}</button>`).join('')}</div>
    <div id="vyplOdpoved"></div>`;
}
function vyplOtazka(id) {
  const vse = window._vyplRadaVse || [];
  const odp = vyplOdpoved(id, vse);
  const el = typeof document !== 'undefined' && document.getElementById('vyplOdpoved');
  if (el) el.innerHTML = `<div class="vg-odp"><div class="vg-odp-q">${(VYPL_OTAZKY.find(o => o.id === id) || {}).q || ''}</div>${odp.html}
    ${odp.tab ? _vyplTabulka(odp.tab[0], odp.tab[1], odp.tab[2]) : ''}
    <div style="font-size:.66rem;color:#8b93ad;margin-top:6px">Spočítáno appkou z tvých ${vse.length} pásek${odp.pohled ? ' · graf níž přepnut na „' + VYPL_POHLEDY[odp.pohled].label + '“' : ''}.</div></div>`;
  if (odp.pohled) vyplMegaPohled(odp.pohled);
}
window.vyplOtazka = vyplOtazka;

//  Odpověď = text + tabulka + který pohled megagrafu ji ukáže. Jen čísla z pásek, nic odhadnutého navíc.
function vyplOdpoved(id, rada) {
  if (!rada.length) return { html: 'Zatím tu nejsou žádné pásky.' };
  const vyp = rada.map(z => vyplDopocet(z)), hod = rada.map(z => vyplHodinyZPasky(z)), rozk = rada.map(z => vyplRozklad(z));
  const mes = i => _vyplMesicNazev(rada[i].m), kc = v => `${fmt(Math.round(v))} Kč`, B = s => `<b>${s}</b>`;
  const idx = rada.map((z, i) => i);
  if (id === 'prescasOdvody' || id === 'prescasKolikrat') {
    const zp = rada.map(z => vyplOdvodyZeSlozky(z, 'prescas'));
    const m = idx.filter(i => zp[i].kc > 0);
    if (!m.length) return { html: 'V páskách není žádný přesčas.', pohled: 'prescas' };
    const kcS = m.reduce((a, i) => a + zp[i].kc, 0), odS = m.reduce((a, i) => a + zp[i].odvody, 0), hS = m.reduce((a, i) => a + hod[i].prescasH, 0);
    const tab = [['Měsíc', 'Hodin', 'Hrubého', 'Odvody', 'Zůstalo', 'Sazba odvodů bez → s přesčasem'],
      m.map(i => { const bez = vyp[i].hruba - zp[i].kc ? (vyp[i].odvody - zp[i].odvody) / (vyp[i].hruba - zp[i].kc) * 100 : 0;
        return [_vyplMes(rada[i].m), _vyplH(hod[i].prescasH), fmt(zp[i].kc), fmt(zp[i].odvody), fmt(zp[i].kc - zp[i].odvody),
          `${bez.toFixed(1).replace('.', ',')} → ${(vyp[i].odvody / vyp[i].hruba * 100).toFixed(1).replace('.', ',')} %`]; }).reverse(),
      [['Celkem', _vyplH(hS), fmt(kcS), fmt(odS), fmt(kcS - odS), '']]];
    if (id === 'prescasKolikrat') return { pohled: 'prescas', tab,
      html: `Přesčas jsi měl ${B(m.length + '×')} (v ${m.length} z ${rada.length} měsíců), dohromady ${B(_vyplH(hS) + ' h')} za ${B(kc(kcS))} hrubého.
        Nejvíc v ${B(mes(m.reduce((a, i) => hod[i].prescasH > hod[a].prescasH ? i : a, m[0])).toLowerCase())} (${_vyplH(Math.max(...m.map(i => hod[i].prescasH)))} h).` };
    return { pohled: 'prescas', tab,
      html: `Z přesčasu ${B(kc(kcS))} hrubého odešlo na pojistném a dani ${B(kc(odS))}, tj. ${B((odS / kcS * 100).toFixed(1).replace('.', ',') + ' %')}.
        Čistého ti zůstalo ${B(kc(kcS - odS))}. Každá koruna přesčasu má tedy stejný „odvod“ jako koruna navíc ze základu –
        celková sazba odvodů v měsíci s přesčasem jen trochu stoupne (tabulka), protože pevná sleva na dani pokryje menší část.` };
  }
  if (id === 'prescasHodina') {
    const z = rada[rada.length - 1], h = z.hlavicka || {}, b = _vyplBonusy();
    const ts = h.tarif && h.fond ? h.tarif / h.fond : 0, ppu = +h.ppu || 0;
    if (!ts || !ppu) return { html: 'Na poslední pásce chybí tarif, fond nebo PPÚ.' };
    const m = vyplMezniMesic(z) || 0.266, hr = ts + ppu * b.ot / 100;
    const noc = ppu * b.night / 100, vik = ppu * b.we / 100;
    return { pohled: 'prescas', html: `Podle pásky za ${mes(rada.length - 1).toLowerCase()}: hodina přesčasu = tarifní sazba ${B(fmtP(Math.round(ts * 100) / 100) + ' Kč')}
      + příplatek ${b.ot} % z PPÚ ${B(fmtP(Math.round(ppu * b.ot) / 100) + ' Kč')} = ${B(kc(hr))} hrubého → ${B('≈ ' + kc(hr * (1 - m)) + ' čistého')}.
      V noci je to navíc ${kc(noc)} hrubého (≈ ${kc(noc * (1 - m))} čistého), o víkendu ${kc(vik)} (≈ ${kc(vik * (1 - m))}).
      Mobilita a prémie se k odpracované hodině přičítají taky (≈ ${kc(((+(z.prijmy || {}).mobilita || 0) + rozk[rada.length - 1].premie) / (+h.odprac || 1))}/h hrubého, pokud je firma počítá z hodin).` };
  }
  if (id === 'nepritomnost') {
    const m = idx.filter(i => hod[i].dovolenaH > 0 || hod[i].jinaH > 0);
    if (!m.length) return { html: 'Na páskách není žádná dovolená ani jiná nepřítomnost.', pohled: 'nepritomnost' };
    const roky = {}; m.forEach(i => { const r = rada[i].m.slice(0, 4); roky[r] = roky[r] || { d: 0, j: 0 }; roky[r].d += hod[i].dovolenaH; roky[r].j += hod[i].jinaH; });
    return { pohled: 'nepritomnost',
      html: `Dovolenou jsi měl v ${B(idx.filter(i => hod[i].dovolenaH > 0).length)} měsících, jinou nepřítomnost (paragraf, nemoc, neplacené) v ${B(idx.filter(i => hod[i].jinaH > 0).length)}.<br>`
        + Object.keys(roky).sort().map(r => `${r}: dovolená ${B(_vyplH(roky[r].d) + ' h')}${roky[r].j ? `, jiná nepřítomnost ${B(_vyplH(roky[r].j) + ' h')}` : ''}`).join(' · '),
      tab: [['Měsíc', 'Dovolená h', 'Dovolená Kč', 'Jiná nepř. h', 'Odpracováno h'], m.map(i => [_vyplMes(rada[i].m), _vyplH(hod[i].dovolenaH), fmt(+(rada[i].prijmy || {}).dovolena || 0), hod[i].jinaH ? _vyplH(hod[i].jinaH) : '–', _vyplH(hod[i].odprac)]).reverse()] };
  }
  if (id === 'konstanta') {
    const mz = rada.map(z => vyplMezniMesic(z)), plat = idx.filter(i => mz[i]);
    if (!plat.length) return { html: 'U pásek s opsanými odvody to appka spočítat nedokáže.' };
    const skup = {}; plat.forEach(i => { const v = Math.round((1 - mz[i]) * 1000); (skup[v] = skup[v] || []).push(i); });
    const hodn = Object.keys(skup).map(Number).sort((a, b) => skup[b].length - skup[a].length);
    return { pohled: 'hrubaCista',
      html: `${hodn.length === 1 ? 'Ano – ' : 'Skoro – '}ve ${B(skup[hodn[0]].length + ' z ' + plat.length)} měsíců ti z 1 000 Kč navíc zůstalo ${B(hodn[0] + ' Kč')}.
        Odchylka může nastat jen ve třech případech: <br>• když je daň po slevách nulová (nízká výplata) – pak se platí jen pojistné 11,6 % a zůstane ~884 Kč;
        <br>• zaokrouhlení základu daně na stovky (o pár korun sem tam);
        <br>• nad hranicí pro 23% daň (36násobek průměrné mzdy za rok, měsíčně přes 140 tisíc hrubého).
        ${hodn.length > 1 ? `<br>Jiné hodnoty: ${hodn.slice(1).map(v => `${v} Kč (${skup[v].map(i => _vyplMes(rada[i].m)).join(', ')})`).join(' · ')}.` : ''}
        Procento odvodů z CELÉ hrubé ale roste s výplatou – to je ten druhý údaj v kartě Daně a odvody.` };
  }
  if (id === 'nejlepsi') {
    const iMax = idx.reduce((a, i) => vyp[i].dobirka > vyp[a].dobirka ? i : a, 0);
    const avg = k => rozk.reduce((a, r) => a + r[k], 0) / rozk.length;
    const roz = VYPL_SLOZKY.map(s => ({ s, d: rozk[iMax][s.k] - avg(s.k) })).filter(x => Math.abs(x.d) > 100).sort((a, b) => b.d - a.d);
    return { pohled: 'slozeni',
      html: `Nejvíc na účet přišlo za ${B(mes(iMax).toLowerCase())}: ${B(kc(vyp[iMax].dobirka))} (průměr ${kc(vyp.reduce((a, v) => a + v.dobirka, 0) / vyp.length)}).
        Oproti průměru: ${roz.map(x => `${x.s.kratce.toLowerCase()} ${x.d >= 0 ? '+' : '−'}${kc(Math.abs(x.d))}`).join(', ')}.` };
  }
  if (id === 'priplatky') {
    const s = k => rada.reduce((a, z) => a + (+(z.prijmy || {})[k] || 0), 0), hs = k => hod.reduce((a, h) => a + h[k], 0);
    const radky = [['Noční', 'nocni', 'nocniH'], ['So + Ne', 'vikend', 'vikendH'], ['Svátek', 'svatek', 'svatekH']].filter(r => s(r[1]));
    return { pohled: 'slozeni',
      html: `Příplatky za noci, víkendy a svátky ti za ${rada.length} měsíců daly ${B(kc(radky.reduce((a, r) => a + s(r[1]), 0)))} hrubého, průměrně ${B(kc(radky.reduce((a, r) => a + s(r[1]), 0) / rada.length))} měsíčně.`,
      tab: [['Příplatek', 'Hodin', 'Kč hrubého', 'Kč / h', '⌀ měsíčně'], radky.map(r => [r[0], _vyplH(hs(r[2])), fmt(s(r[1])), hs(r[2]) ? fmtP(Math.round(s(r[1]) / hs(r[2]) * 100) / 100) : '–', fmt(s(r[1]) / rada.length)])] };
  }
  return { html: '' };
}
window.vyplOdpoved = vyplOdpoved;

// ── Karta Prémie a příplatky (Milan: příplatky So+Ne+noční zvlášť od přesčasu, prémie jako sloupce) ──
function _vyplPremieKarta(rada, rozk) {
  const prem = rozk.map(r => r.premie), pri = rozk.map(r => r.priplatky), pre = rozk.map(r => r.prescas);
  if (![prem, pri, pre].some(a => a.some(v => v > 0))) return '';
  const osa = _vyplOsaJed(Math.max(...prem, ...pri, ...pre, 1), 'Kč');
  const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / (a.length || 1));
  const hod = rada.map(z => vyplHodinyZPasky(z));
  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">📈 Prémie, příplatky a přesčas</span></div>
    <div class="card-body">
      <div class="vg-kpi">
        <div><div class="l">⌀ prémie měsíčně</div><div class="v" style="color:${VYPL_BARVY.premie}">${fmt(avg(prem))} Kč</div></div>
        <div><div class="l">⌀ příplatky So+Ne, noční, svátek</div><div class="v" style="color:${VYPL_BARVY.priplatky}">${fmt(avg(pri))} Kč</div></div>
        <div><div class="l">⌀ přesčas</div><div class="v" style="color:${VYPL_BARVY.prescas}">${fmt(avg(pre))} Kč</div><div class="p">${pre.filter(v => v > 0).length}× za ${rada.length} měsíců</div></div>
      </div>
      ${_vyplLegenda([{ label: 'Prémie (sloupce)', barva: VYPL_BARVY.premie }, { label: 'Příplatky So+Ne, noční, svátek', barva: VYPL_BARVY.priplatky }, { label: 'Přesčas (mzda + příplatek)', barva: VYPL_BARVY.prescas }])}
      ${_vyplKombi({ id: 'vgPremie', mesice: rada.map(z => z.m), vyska: 160, osaL: osa, rezim: 'vedle',
        sloupce: [{ label: 'Prémie', barva: VYPL_BARVY.premie, hodnoty: prem }],
        cary: [{ label: 'Příplatky', barva: VYPL_BARVY.priplatky, hodnoty: pri }, { label: 'Přesčas', barva: VYPL_BARVY.prescas, hodnoty: pre }],
        prumer: { v: avg(prem), label: '⌀ prémie ' + _vyplKcOsa(avg(prem)) },
        udalosti: _vyplUdalosti(rada).filter(u => u.ikona === '⏱'),
        cteni: i => `<b>${_vyplMesicNazev(rada[i].m)}</b> · <span class="vg-dot" style="background:${VYPL_BARVY.premie}"></span>prémie <b>${fmt(Math.round(prem[i]))} Kč</b>
          · <span class="vg-dot" style="background:${VYPL_BARVY.priplatky}"></span>příplatky <b>${fmt(Math.round(pri[i]))} Kč</b>
          · <span class="vg-dot" style="background:${VYPL_BARVY.prescas}"></span>přesčas <b>${fmt(Math.round(pre[i]))} Kč</b>${hod[i].prescasH ? ` (${_vyplH(hod[i].prescasH)} h)` : ''}` })}
      <div class="vg-pozn">Příplatky So+Ne, noční a svátek ovlivníš rozpisem směn, přesčas tím, kolik práce vezmeš navíc, prémie rozhoduje hodnocení.
        Mimořádné odměny tu nejsou – jeden měsíc s roční prémií by graf přebil.</div>
    </div></div>`;
}

// ── Karta Daně a odvody (Milan: filtr sloupců, hrubá, čistá a přesčas; je 734 Kč konstanta?) ──
const VYPL_ODV_CARY = [
  { k: 'hruba', label: 'Hrubá mzda', kratce: 'Hrubá', barva: '#e2e8f0' },
  { k: 'cisty', label: 'Čistá mzda', kratce: 'Čistá', barva: '#16a34a' },
  { k: 'prescas', label: 'Přesčas (hrubý)', kratce: 'Přesčas', barva: '#e11d48' },
];
function vyplOdvFiltr(k) {
  const vse = VYPL_ODVODY.map(o => o.k).concat(VYPL_ODV_CARY.map(c => c.k));
  let a = (window._vyplStav.odv || vse).slice();
  a = a.includes(k) ? a.filter(x => x !== k) : a.concat([k]);
  if (!a.length) a = vse;
  window._vyplStav.odv = a; _vyplStavUloz(); _vyplPrekresli('odv');
}
window.vyplOdvFiltr = vyplOdvFiltr;

function _vyplOdvodyObsah() {
  const rada = window._vyplRada || [], vyp = rada.map(z => vyplDopocet(z)), rozk = rada.map(z => vyplRozklad(z));
  if (!rada.length) return '';
  const vse = VYPL_ODVODY.map(o => o.k).concat(VYPL_ODV_CARY.map(c => c.k));
  const akt = (window._vyplStav.odv || vse).filter(k => vse.includes(k));
  const sl = VYPL_ODVODY.filter(o => akt.includes(o.k)), cr = VYPL_ODV_CARY.filter(c => akt.includes(c.k));
  const hodn = { hruba: vyp.map(v => v.hruba), cisty: vyp.map(v => v.cisty), prescas: rozk.map(r => r.prescas) };
  const sazby = vyp.map(v => v.hruba ? v.odvody / v.hruba * 100 : 0);
  const zp = rada.map(z => vyplOdvodyZeSlozky(z, 'prescas'));
  const maxL = Math.max(...rada.map((z, i) => sl.reduce((a, o) => a + vyp[i][o.k], 0)), ...cr.flatMap(c => hodn[c.k]), 1);
  const chipy = `<div class="vg-chipy">${VYPL_ODVODY.map(o => `<button class="vg-chip${akt.includes(o.k) ? ' on' : ''}" onclick="vyplOdvFiltr('${o.k}')"><span class="vg-dot" style="background:${o.barva};margin:0"></span>${o.kratce}</button>`).join('')}
    ${VYPL_ODV_CARY.map(c => `<button class="vg-chip${akt.includes(c.k) ? ' on' : ''}" onclick="vyplOdvFiltr('${c.k}')"><span class="vg-carka" style="background:${c.barva}"></span>${c.kratce}</button>`).join('')}</div>`;
  const graf = _vyplKombi({ id: 'vgOdvody', mesice: rada.map(z => z.m), vyska: 190, osaL: _vyplOsaJed(maxL, 'Kč'), rezim: 'sklad',
    sloupce: sl.map(o => ({ label: o.label, barva: o.barva, hodnoty: vyp.map(v => v[o.k]) })),
    cary: cr.map(c => ({ label: c.label, barva: c.barva, hodnoty: hodn[c.k] })),
    udalosti: _vyplUdalosti(rada).filter(u => u.ikona === '⏱'),
    cteni: i => `<b>${_vyplMesicNazev(rada[i].m)}</b> · hrubá ${fmt(vyp[i].hruba)} → čistá <b>${fmt(vyp[i].cisty)} Kč</b> (${(100 - sazby[i]).toFixed(1).replace('.', ',')} %) · odvody <b>${fmt(vyp[i].odvody)} Kč (${sazby[i].toFixed(1).replace('.', ',')} %)</b><br>`
      + VYPL_ODVODY.map(o => `<span style="white-space:nowrap;margin-right:10px"><span class="vg-dot" style="background:${o.barva}"></span>${o.kratce} ${fmt(vyp[i][o.k])} Kč</span>`).join('')
      + (vyp[i].slevy ? `<span style="white-space:nowrap">· slevy na dani ${fmt(vyp[i].slevy)} Kč</span>` : '')
      + (zp[i].kc ? `<br><span style="color:#a8aec8">⏱ přesčas ${fmt(zp[i].kc)} Kč hrubého → odvody z něj ${fmt(zp[i].odvody)} Kč, zůstalo ${fmt(zp[i].kc - zp[i].odvody)} Kč</span>` : '') });
  return chipy + _vyplLegenda(sl.map(o => ({ label: o.label, barva: o.barva })).concat(cr.map(c => ({ label: c.label + ' (čára)', barva: c.barva })))) + graf;
}

function _vyplOdvodyKarta(rada, vyp) {
  if (!rada.length) return '';
  window._vyplKarty.odv = _vyplOdvodyObsah;
  const posl12 = vyp.slice(-12), n12 = posl12.length, r12 = rada.slice(-12);
  const sum = (a, k) => a.reduce((x, v) => x + (v[k] || 0), 0);
  const sazby = vyp.map(v => v.hruba ? v.odvody / v.hruba * 100 : 0);
  const mezni = vyplMeznaSazba(rada);
  const mz = rada.map(z => vyplMezniMesic(z));
  const zust = mz.map(m => m ? Math.round((1 - m) * 1000) : null);
  const stejnych = zust.filter(v => v != null && v === zust[zust.length - 1]).length, platnych = zust.filter(v => v != null).length;
  const zpr = r12.map(z => vyplOdvodyZeSlozky(z, 'prescas'));
  const prKc = zpr.reduce((a, x) => a + x.kc, 0), prOd = zpr.reduce((a, x) => a + x.odvody, 0), prH = r12.reduce((a, z) => a + vyplHodinyZPasky(z).prescasH, 0);
  const slevaZak = +((rada[rada.length - 1].odvody || {}).slevaZak) || 0;
  const S12 = k => sum(posl12, k);
  const mesicu = n => `${n} ${n === 1 ? 'měsíc' : n < 5 ? 'měsíce' : 'měsíců'}`;
  const tabRadky = rada.map((z, i) => { const p = vyplOdvodyZeSlozky(z, 'prescas');
    return [_vyplMes(z.m), fmt(vyp[i].hruba), fmt(vyp[i].zp), fmt(vyp[i].sp), fmt(vyp[i].dan), vyp[i].slevy ? fmt(vyp[i].slevy) : '–', `<b>${fmt(vyp[i].odvody)}</b>`,
      sazby[i].toFixed(1).replace('.', ',') + ' %', fmt(vyp[i].cisty), p.kc ? `${fmt(p.kc)} / ${fmt(p.odvody)}` : '–', zust[i] != null ? fmt(zust[i]) : '–']; }).reverse();
  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🏛️ Daně a odvody</span></div>
    <div class="card-body">
      <div class="vg-kpi">
        <div><div class="l">Odvedeno za ${mesicu(n12)}</div><div class="v">${fmt(S12('odvody'))} Kč</div>
          <div class="p">ZP ${fmt(S12('zp'))} · SP ${fmt(S12('sp'))} · daň ${fmt(S12('dan'))}</div></div>
        <div><div class="l">Z hrubé mzdy odešlo</div><div class="v">${_vyplPct(S12('odvody'), S12('hruba'))} %</div>
          <div class="p">od ${Math.min(...sazby.slice(-12)).toFixed(1).replace('.', ',')} do ${Math.max(...sazby.slice(-12)).toFixed(1).replace('.', ',')} % · čistá ${_vyplPct(S12('cisty'), S12('hruba'))} %</div></div>
        ${mezni ? `<div><div class="l">Z 1 000 Kč hrubého navíc ti zůstane</div><div class="v" style="color:var(--income)">≈ ${fmt(Math.round((1 - mezni) * 1000))} Kč</div>
          <div class="p">${platnych > 1 ? (stejnych === platnych ? `stejně ve všech ${platnych} měsících – je to konstanta` : `stejně v ${stejnych} z ${platnych} měsíců (viz tabulka)`) : `zbytek (${fmt(Math.round(mezni * 1000))} Kč) jsou odvody`}</div></div>` : ''}
        ${prKc ? `<div><div class="l">Přesčas za ${mesicu(n12)}</div><div class="v" style="color:${VYPL_BARVY.prescas}">${_vyplH(prH)} h · ${fmt(prKc)} Kč</div>
          <div class="p">odvody z něj ${fmt(prOd)} Kč (${(prOd / prKc * 100).toFixed(1).replace('.', ',')} %) · zůstalo ${fmt(prKc - prOd)} Kč</div></div>` : ''}
      </div>
      <div id="vyplBox_odv">${_vyplOdvodyObsah()}</div>
      <div class="vg-pozn">Sloupce = odvody (ZP, SP, daň), čáry = hrubá, čistá a přesčas – vše v Kč na jedné ose; klepnutím nahoře je skryješ.
        Proč s vyšší výplatou roste i <strong>procento</strong>: pojistné je pevný podíl z hrubé, ale daň se počítá z celé hrubé mzdy
        a odečítá se od ní pevná částka${slevaZak ? ` (sleva na poplatníka ${fmt(slevaZak)} Kč)` : ' (slevy)'}. Čím vyšší hrubá, tím menší část daně sleva pokryje.
        ${mezni ? `Z každé koruny navíc – i z přesčasu – ale odejde pořád stejně: asi <strong>${(mezni * 100).toFixed(1).replace('.', ',')} haléře</strong>.` : ''}</div>
      <details style="margin-top:8px"><summary style="font-size:.74rem;color:#a8aec8;cursor:pointer">Tabulka po měsících</summary>
        ${_vyplTabulka(['Měsíc', 'Hrubá', 'ZP', 'SP', 'Daň', 'Slevy', 'Odvody', 'Sazba', 'Čistá', 'Přesčas / odvody z něj', 'Z 1 000 zůstane'], tabRadky,
          [['Součet', fmt(sum(vyp, 'hruba')), fmt(sum(vyp, 'zp')), fmt(sum(vyp, 'sp')), fmt(sum(vyp, 'dan')), fmt(sum(vyp, 'slevy')), fmt(sum(vyp, 'odvody')),
            _vyplPct(sum(vyp, 'odvody'), sum(vyp, 'hruba')).toString().replace('.', ',') + ' %', fmt(sum(vyp, 'cisty')), '', '']])}</details>
    </div></div>`;
}

// ══════════════════════════════════════════════════════════════════════
//  ODHAD VÝPLATY Z PÁSKY + HODIN Z KALENDÁŘE (Milan: „198 vážených hodin je kde?! V listopadu
//  nemám přesčas, takže 33 500 mít nebudu. Model musí počítat s odpracovanými hodinami,
//  přesčasy, víkendy a nocemi. Výplatu dostanu v prosinci za listopad.“)
//  Vzorce ověřené na 19 skutečných páskách (na korunu):
//    tarifní sazba = tarif ÷ fond · fond = plánované směny + nepřítomnost v plánu
//    základ   = tarifní × plánované odpracované hodiny     (= tarif × (fond − nepřítomnost) ÷ fond)
//    dovolená = PPÚ × hodiny dovolené, paragraf stejně (náhrada průměrem)
//    přesčas  = tarifní × h + PPÚ × příplatek % × h
//    noční / So+Ne / svátek = PPÚ × příplatek % × h
//    ostatní (mobilita, prémie) = Kč na odpracovanou hodinu z posledních 3 pásek × odpracované hodiny
//  Nemocenská se neodhaduje (náhrada od 4. dne, redukovaný průměr) – appka to řekne.
// ══════════════════════════════════════════════════════════════════════
const VYPL_ODHAD_MODEL = ['zaklad', 'dovolena', 'prescas', 'prescasPr', 'nocni', 'vikend', 'svatek'];
function vyplOdhadVypocet(zaklad, hod) {
  if (!zaklad || !zaklad.length) return null;
  const posl = zaklad[zaklad.length - 1], h = posl.hlavicka || {}, sab = vyplSablona();
  const tarif = +h.tarif, ppu = +h.ppu;
  if (!tarif || !ppu) return null;
  const b = _vyplBonusy();
  const fond = (hod.planH || 0) + (hod.vacH || 0) + (hod.parH || 0) + (hod.nemocH || 0);
  if (!fond) return null;
  const ts = tarif / fond, odpr = (hod.planH || 0) + (hod.otH || 0);
  const pol = [], prijmy = {};
  const dej = (key, label, hodin, sazba, kc) => { kc = Math.round(kc); if (!kc) return; prijmy[key] = (prijmy[key] || 0) + kc; pol.push({ key, label, hodin, sazba, kc }); };
  dej('zaklad', 'Základní mzda', hod.planH, ts, ts * hod.planH);
  dej('dovolena', 'Dovolená', hod.vacH, ppu, ppu * (hod.vacH || 0));
  dej('_paragraf', 'Paragraf (náhrada)', hod.parH, ppu, ppu * (hod.parH || 0));
  dej('prescas', 'Přesčas – mzda', hod.otH, ts, ts * (hod.otH || 0));
  dej('prescasPr', `Příplatek přesčas ${b.ot} %`, hod.otH, ppu * b.ot / 100, ppu * b.ot / 100 * (hod.otH || 0));
  dej('nocni', `Příplatek noční ${b.night} %`, hod.nightH, ppu * b.night / 100, ppu * b.night / 100 * (hod.nightH || 0));
  dej('vikend', `Příplatek So + Ne ${b.we} %`, hod.weH, ppu * b.we / 100, ppu * b.we / 100 * (hod.weH || 0));
  dej('svatek', `Příplatek svátek ${b.hol} %`, hod.holH, ppu * b.hol / 100, ppu * b.hol / 100 * (hod.holH || 0));
  //  Ostatní pravidelné položky (mobilita, prémie…) – Kč na odpracovanou hodinu z posledních 3 pásek.
  const vz = zaklad.slice(-3).filter(z => +(z.hlavicka || {}).odprac > 0), sh = vz.reduce((a, z) => a + +z.hlavicka.odprac, 0);
  const ostatni = new Set(); vz.forEach(z => Object.keys(z.prijmy || {}).forEach(k => {
    const it = (sab.prijmy || []).find(x => x.key === k);
    if (!VYPL_ODHAD_MODEL.includes(k) && _vyplSlozka(k, sab) !== 'odmeny' && !(it && it.povaha === 'pruchozi') && k.charAt(0) !== '_') ostatni.add(k); }));
  ostatni.forEach(k => { const sk = vz.reduce((a, z) => a + (+(z.prijmy || {})[k] || 0), 0);
    if (sh && sk) dej(k, ((sab.prijmy || []).find(x => x.key === k) || {}).label || k, odpr, sk / sh, sk / sh * odpr); });
  //  Průchozí (penzijko ↔ DPS) jako na poslední pásce – ruší se.
  (sab.prijmy || []).filter(x => x.povaha === 'pruchozi').forEach(x => { if ((posl.prijmy || {})[x.key]) prijmy[x.key] = posl.prijmy[x.key]; });
  const o = posl.odvody || {}, odvody = {};
  if (o.slevaZak) odvody.slevaZak = o.slevaZak; if (o.slevaDet) odvody.slevaDet = o.slevaDet;
  const srazky = {};
  (sab.srazky || []).forEach(x => { if (x.povaha === 'pruchozi') { if ((posl.srazky || {})[x.key]) srazky[x.key] = posl.srazky[x.key]; return; }
    const s = zaklad.slice(-3).reduce((a, z) => a + (+(z.srazky || {})[x.key] || 0), 0); if (s) srazky[x.key] = Math.round(s / Math.min(3, zaklad.length)); });
  const z = { m: '', prijmy, odvody, srazky };
  const v = vyplDopocet(z);
  return { z, v, pol, fond, odpr, ts, ppu, tarif, zdroj: posl.m, zdrojeHodin: vz.map(x => x.m), nemocH: hod.nemocH || 0,
           dobirka: Math.round(v.dobirka / 100) * 100, cisty: Math.round(v.cisty / 100) * 100, hruba: Math.round(v.hruba / 100) * 100 };
}
window.vyplOdhadVypocet = vyplOdhadVypocet;

//  Hodiny z kalendáře (Kalendář → Práce) + pásky ZA PŘEDCHOZÍ měsíce.
function vyplOdhadMesice(y, m) {
  if (typeof _workHodiny !== 'function' || typeof _workCfg !== 'function') return null;
  const k = `${y}-${String(m + 1).padStart(2, '0')}`;
  const zaklad = vyplZaznamy().filter(z => z.m < k).sort((a, b) => a.m.localeCompare(b.m));
  if (!zaklad.length) return null;
  const hm = _workHodiny(_workCfg(), y, m);
  if (!hm.planH && !hm.vacH && !hm.otNetH) return null;
  const o = vyplOdhadVypocet(zaklad, { planH: hm.planH, otH: hm.otNetH, vacH: hm.vacH, parH: hm.parH || 0, nemocH: hm.nemocH || 0,
    nightH: hm.nightH, weH: hm.weH, holH: hm.holH });
  if (!o) return null;
  const skut = vyplZaznamy().find(z => z.m === k);
  if (skut) o.skutecnost = vyplDopocet(skut);
  o.hm = hm; o.vyplaceno = m === 11 ? `v lednu ${y + 1}` : `v ${['únoru', 'březnu', 'dubnu', 'květnu', 'červnu', 'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci'][m]}`;
  return o;
}
window.vyplOdhadMesice = vyplOdhadMesice;

// ── Formulář ──────────────────────────────────────────────────────────
function vyplOtevritForm(mKlic) {
  const box = document.getElementById('vyplFormBox'); if (!box) return;
  const sab = vyplSablona();
  const z = vyplZaznamy().find(x => x.m === mKlic) || { m: mKlic, hlavicka: {}, prijmy: {}, odvody: {}, srazky: {}, pripocty: {} };

  const pole = (skupina, it) => {
    const val = (z[skupina] || {})[it.key];
    const znacka = it.povaha === 'pruchozi' ? ' <span style="color:#a8aec8;font-size:.66rem">(průchozí)</span>'
                 : it.povaha === 'prilezitostna' ? ' <span style="color:#a8aec8;font-size:.66rem">(nepovinné)</span>' : '';
    return `<div style="margin-bottom:8px">
      <div style="font-size:.7rem;color:${VYPL_POPISEK};margin-bottom:3px;line-height:1.35">
        <span style="font-family:monospace">${it.kod}</span> ${it.label}${znacka}</div>
      <input type="text" inputmode="decimal" data-vypl="${skupina}.${it.key}" value="${val != null ? val : ''}"
        placeholder="${it.povaha === 'prilezitostna' ? 'nechat prázdné' : '0'}"
        style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);font-size:.85rem"></div>`;
  };
  const sekce = (nadpis, skupina, polozky) => `
    <div style="margin-bottom:14px">
      <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:${VYPL_POPISEK};margin-bottom:7px">${nadpis}</div>
      ${polozky.map(it => pole(skupina, it)).join('')}
    </div>`;

  const h = z.hlavicka || {};
  const hp = (k, l, v) => `<div><div style="font-size:.7rem;color:${VYPL_POPISEK};margin-bottom:3px;line-height:1.35">${l}</div>
    <input type="text" inputmode="decimal" data-vypl="hlavicka.${k}" value="${v != null ? v : ''}"
      style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);font-size:.85rem"></div>`;

  box.innerHTML = `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">✎ Výplatnice ${mKlic}</span></div>
    <div class="card-body">
      <div style="font-size:.72rem;color:${VYPL_POPISEK};line-height:1.55;margin-bottom:12px">
        Vyplň jen to, co na pásce je. <strong style="color:${VYPL_HODNOTA}">Prázdné pole u nepovinné položky
        znamená „neproběhlo“, ne nulu</strong> — appka pak nebude hlásit propad příjmu tam, kde jsi jen
        nečerpal dovolenou.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;align-items:end">
        ${hp('fond', 'Fond hodin', h.fond)}
        ${hp('odprac', 'Odpracováno', h.odprac)}
        ${hp('ppu', 'Průměr PPÚ (Kč/h)', h.ppu)}
        ${hp('tarif', 'Tarif (Kč/měs)', h.tarif)}
      </div>
      ${sekce('Příjmy', 'prijmy', sab.prijmy)}
      ${sekce('Odvody a slevy', 'odvody', sab.odvody)}
      ${sekce('Srážky', 'srazky', sab.srazky)}
      ${(sab.pripocty || []).length ? sekce('Nezdaněné připočty', 'pripocty', sab.pripocty) : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="vyplUlozit('${mKlic}')">Uložit</button>
        <button class="btn btn-ghost" onclick="document.getElementById('vyplFormBox').innerHTML=''">Zrušit</button>
      </div>
    </div></div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function vyplUlozit(mKlic) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const z = { m: mKlic, hlavicka: {}, prijmy: {}, odvody: {}, srazky: {}, pripocty: {} };
  document.querySelectorAll('[data-vypl]').forEach(inp => {
    const [skupina, key] = inp.dataset.vypl.split('.');
    const raw = (inp.value || '').replace(/\s/g, '').replace(',', '.');
    // Prázdné pole se NEULOŽÍ jako nula – chybějící položka je informace.
    if (raw === '') return;
    const v = parseFloat(raw);
    if (!isFinite(v)) return;
    z[skupina][key] = v;
  });
  if (!Object.keys(z.pripocty).length) delete z.pripocty;
  S.payslips = (S.payslips || []).filter(x => x.m !== mKlic).concat([z]);
  save();
  const box = document.getElementById('vyplFormBox'); if (box) box.innerHTML = '';
  if (typeof showToast === 'function') showToast('🧾 Výplatnice uložena');
  renderPage();
}

function vyplSmazat(mKlic) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!confirm(`Smazat výplatnici za ${mKlic}?`)) return;
  S.payslips = (S.payslips || []).filter(x => x.m !== mKlic);
  save(); renderPage();
}

// ══════════════════════════════════════════════════════════════════════
//  IMPORT (TODO-257): vložení více měsíců najednou přes JSON.
//  Ruční opisování dvaceti pásek by trvalo dvacet minut a chyba by se
//  poznala až u nesedícího součtu. Import proto KAŽDOU pásku přepočítá
//  a měsíce, u kterých model nesedí na zadanou dobírku, ODMÍTNE –
//  radši nenaimportovat než naimportovat špatně.
//
//  S26 (v11.77) · BOD 1 – UNIVERZÁLNÍ POSTUP PŘES AI (Milan: „jak si může kdokoli
//  zadat svou výplatnici? Každá je trochu jiná.“):
//    1. appka sestaví POKYN pro AI s tvou šablonou (klíče, kódy, názvy položek),
//    2. vyfotíš / stáhneš pásku a pošleš ji s pokynem do ChatGPT / Claude / Gemini,
//    3. odpověď vložíš sem, nebo nahraješ .json soubor (i víc souborů najednou).
//  Položky, které tvoje šablona nezná, AI popíše v `nove` a import je do šablony
//  přidá – šablona vznikne z první pásky. Odvody a daň AI opisuje přímo z pásky,
//  takže kontrola funguje i u jiné firmy či jiných sazeb. Kontrola součtů zůstává:
//  co nesedí na hrubou / čistou / dobírku z pásky, se nenaimportuje.
// ══════════════════════════════════════════════════════════════════════
const VYPL_SKUPINY = ['prijmy', 'odvody', 'srazky', 'pripocty'];

function vyplAiPokyn() {
  const sab = vyplSablona();
  const radek = (it, sk) => `  ${it.key} — ${it.label}${it.kod ? ` (kód ${it.kod})` : ''}${sk === 'prijmy' ? ` · složka: ${it.povaha === 'pruchozi' ? 'průchozí' : _vyplSlozka(it.key, sab)}` : ''}${it.povaha === 'pruchozi' ? ' · průchozí (ruší se s jinou položkou)' : ''}`;
  const blok = (nadpis, sk) => (sab[sk] || []).length ? `${nadpis} ("${sk}"):\n${sab[sk].map(it => radek(it, sk)).join('\n')}` : `${nadpis} ("${sk}"): zatím žádné`;
  return `Přepiš přiloženou výplatní pásku (fotku nebo PDF) do JSON pro aplikaci FinanceFlow.

Vrať POUZE platný JSON (bez komentářů a bez textu okolo) – pole, jeden prvek za každý měsíc na pásce:
[
  {
    "m": "RRRR-MM",
    "hlavicka": { "fond": 0, "odprac": 0, "neprit": 0, "tarif": 0, "ppu": 0 },
    "prijmy":   { "<klíč>": 0 },
    "odvody":   { "zp": 0, "sp": 0, "dan": 0, "slevaZak": 0, "slevaDet": 0 },
    "srazky":   { "<klíč>": 0 },
    "pripocty": { "<klíč>": 0 },
    "ocekavano": { "hruba": 0, "cisty": 0, "dobirka": 0 },
    "nove": [ { "klic": "", "skupina": "prijmy", "label": "", "kod": "", "slozka": "premie" } ]
  }
]

Pravidla:
- m = měsíc, za který je mzda (ne datum výplaty).
- Čísla piš jako čísla: bez mezer a bez „Kč“, desetinná TEČKA (1234.50). Nic nedopočítávej ani neodhaduj – jen opiš, co na pásce je.
- Položku, která na pásce NENÍ, vynech (žádné nuly navíc).
- hlavicka: fond = fond pracovní doby v hodinách, odprac = odpracované hodiny, neprit = hodiny nepřítomnosti, tarif = měsíční tarif/základní mzda ze smlouvy, ppu = průměrný výdělek pro pracovněprávní účely (Kč/h). Co na pásce není, vynech.
- prijmy: všechny složky hrubé mzdy (mzda, náhrady, příplatky, prémie, odměny…). Kladná čísla.
- odvody: zp = zdravotní pojištění zaměstnance, sp = sociální pojištění zaměstnance, dan = záloha na daň PO slevách (kolik se opravdu strhlo), slevaZak = sleva na poplatníka, slevaDet = daňové zvýhodnění na děti. Kladná čísla.
- srazky: co se strhává z čisté mzdy (stravování, spoření, penzijní připojištění, exekuce…). Kladná čísla.
- pripocty: nezdaněné částky, které se k čisté mzdě PŘIČÍTAJÍ (stravenkový paušál, cestovní náhrady). Kladná čísla.
- ocekavano: hrubá mzda, čistá mzda a částka k výplatě / na účet PŘESNĚ tak, jak jsou natištěné na pásce. Slouží ke kontrole – když nesedí, aplikace měsíc nenaimportuje.
- Používej klíče z mé šablony níže, kde položka významem odpovídá. Položku, která v šabloně není, dej pod nový klíč (camelCase bez diakritiky, např. "stravenkovyPausal") a popiš ji v "nove":
    skupina: "prijmy" | "srazky" | "pripocty"
    label: název z pásky, kod: kód z pásky (nebo "")
    slozka (jen u příjmů): "pevna" = dostanu i bez přesčasů a výkonu (mzda, náhrada za dovolenou, pevné příplatky),
      "priplatky" = příplatky podle toho, KDY pracuji (noční, sobota/neděle, svátek, odpolední),
      "prescas" = přesčas (mzda za přesčas i příplatek za přesčas),
      "premie" = pravidelné měsíční prémie podle výkonu,
      "odmeny" = jednorázové odměny (roční, pololetní, vánoční, náborová, 13. plat),
      "jine" = nic z toho.
  Když nic nového není, "nove" vynech.
- Je-li na pásce víc měsíců (doplatky za minulé měsíce), patří k měsíci, ve kterém jsou VYPLACENÉ.

Moje šablona:
${blok('Příjmy', 'prijmy')}
${blok('Srážky', 'srazky')}
${blok('Nezdaněné připočty', 'pripocty')}
Odvody ("odvody"): zp, sp, dan, slevaZak, slevaDet`;
}
window.vyplAiPokyn = vyplAiPokyn;

function vyplImportDialog() {
  const box = document.getElementById('vyplFormBox'); if (!box) return;
  const krok = (n, t) => `<div style="display:flex;gap:9px;margin-bottom:7px"><span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:rgba(139,124,246,.18);color:#b9aefc;font-size:.7rem;font-weight:800;display:flex;align-items:center;justify-content:center">${n}</span><span style="font-size:.76rem;color:${VYPL_HODNOTA};line-height:1.5">${t}</span></div>`;
  box.innerHTML = `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">📥 Import výplatnic</span></div>
    <div class="card-body">
      <div style="padding:10px 12px;border-radius:10px;background:var(--surface2);margin-bottom:12px">
        <div style="font-size:.8rem;font-weight:700;color:#e8eaf2;margin-bottom:8px">🤖 Přepis pásky přes AI – funguje pro jakoukoli výplatnici</div>
        ${krok(1, 'Vyfoť pásku nebo stáhni PDF z mzdového portálu (klidně víc měsíců najednou).')}
        ${krok(2, `Zkopíruj pokyn pro AI <button class="btn btn-accent btn-sm" style="margin-left:4px;font-size:.72rem" onclick="copyText(vyplAiPokyn(),'Pokyn pro AI zkopírován')">📋 Zkopírovat pokyn</button>`)}
        ${krok(3, 'Otevři ChatGPT, Claude nebo Gemini, vlož pokyn a přilož pásku.')}
        ${krok(4, 'Odpověď (JSON) vlož do pole níž, nebo ji ulož jako soubor a nahraj. Appka každý měsíc přepočítá a porovná s hrubou, čistou a dobírkou z pásky.')}
        <details style="margin-top:4px"><summary style="font-size:.7rem;color:${VYPL_POPISEK};cursor:pointer">Ukázat pokyn</summary>
          <textarea readonly rows="8" style="width:100%;margin-top:6px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px;color:${VYPL_POPISEK};font-family:monospace;font-size:.66rem">${vyplAiPokyn().replace(/</g, '&lt;')}</textarea></details>
        <div style="font-size:.68rem;color:${VYPL_POPISEK};margin-top:6px;line-height:1.5">Položky, které tvoje šablona nezná, AI popíše a appka je přidá – šablona se tak sama přizpůsobí tvé firmě.
          Výplatnice obsahuje osobní údaje; posíláš ji do služby, kterou si vybereš ty.</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">📂 Nahrát soubor (.json / .txt)
          <input type="file" accept=".json,.txt,application/json,text/plain" multiple style="display:none" onchange="vyplImportSoubor(this)"></label>
        <span id="vyplImportSouborInfo" style="font-size:.7rem;color:${VYPL_POPISEK}"></span>
      </div>
      <textarea id="vyplImportText" rows="7" placeholder='Sem vlož odpověď AI nebo JSON: [{"m":"2025-03", …}]'
        style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-family:monospace;font-size:.74rem"></textarea>
      <div id="vyplImportVysledek" style="margin-top:10px"></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="vyplImportSpustit()">Zkontrolovat a naimportovat</button>
        <button class="btn btn-ghost" onclick="document.getElementById('vyplFormBox').innerHTML=''">Zrušit</button>
      </div>
    </div></div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

//  Nahrání souboru: obsah se připojí do pole (víc souborů = víc měsíců).
function vyplImportSoubor(inp) {
  const soubory = Array.from((inp && inp.files) || []);
  if (!soubory.length) return;
  const info = document.getElementById('vyplImportSouborInfo'), ta = document.getElementById('vyplImportText');
  Promise.all(soubory.map(f => f.text ? f.text() : new Promise((ok, chyba) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = chyba; r.readAsText(f); })))
    .then(texty => {
      let vse = [], chyby = [];
      texty.forEach((t, i) => { try { vse = vse.concat(vyplImportParse(t)); } catch (e) { chyby.push(`${soubory[i].name}: ${e.message}`); } });
      const stavajici = (() => { try { return ta.value.trim() ? vyplImportParse(ta.value) : []; } catch (e) { return []; } })();
      ta.value = JSON.stringify(stavajici.concat(vse), null, 1);
      if (info) info.innerHTML = `načteno ${vse.length} ${vse.length === 1 ? 'měsíc' : vse.length < 5 ? 'měsíce' : 'měsíců'} z ${soubory.length} ${soubory.length === 1 ? 'souboru' : 'souborů'}`
        + (chyby.length ? `<br><span style="color:var(--expense)">${chyby.join('<br>')}</span>` : '');
      inp.value = '';
    }).catch(e => { if (info) info.textContent = 'Soubor se nepodařilo přečíst: ' + e.message; });
}
window.vyplImportSoubor = vyplImportSoubor;

//  Odpověď AI bývá v ```json bloku, s textem okolo, jako jeden objekt místo pole nebo
//  s čísly jako „1 234,50“. Tohle všechno se srovná; samotná čísla se nikdy nehádají.
function vyplImportParse(text) {
  let t = String(text || '').trim();
  const blok = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (blok) t = blok[1].trim();
  const a = t.search(/[\[{]/);
  if (a < 0) throw new Error('v textu není JSON');
  const konec = t[a] === '[' ? t.lastIndexOf(']') : t.lastIndexOf('}');
  t = t.slice(a, konec + 1).replace(/,\s*([\]}])/g, '$1');   // čárka před ] / } (častá chyba AI)
  let data = JSON.parse(t);
  if (data && !Array.isArray(data)) data = Array.isArray(data.pasky) ? data.pasky : Array.isArray(data.mesice) ? data.mesice : [data];
  const cislo = v => {
    if (typeof v === 'number') return v;
    const s = String(v == null ? '' : v).replace(/\s|Kč|kč| /g, '').replace(/−/g, '-');
    const n = parseFloat(/,\d{1,2}$/.test(s) && !/\.\d{3}/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, ''));
    return isFinite(n) ? n : null;
  };
  return data.filter(z => z && typeof z === 'object').map(z => {
    const o = { m: String(z.m || z.mesic || '').trim().slice(0, 7) };
    ['hlavicka', 'ocekavano'].concat(VYPL_SKUPINY).forEach(sk => {
      if (!z[sk] || typeof z[sk] !== 'object') return;
      o[sk] = {};
      Object.keys(z[sk]).forEach(k => { const v = cislo(z[sk][k]); if (v != null) o[sk][k] = sk === 'hlavicka' || sk === 'ocekavano' ? v : Math.abs(v); });
    });
    if (Array.isArray(z.nove)) o.nove = z.nove.filter(x => x && (x.klic || x.key));
    return o;
  });
}
window.vyplImportParse = vyplImportParse;

//  Nové položky z AI → do šablony (šablona vznikne z první pásky). Klíč, který šablona
//  už má, se nepřepisuje; neznámá skupina se nepřidá.
function vyplSablonaDoplnit(nove) {
  const zdroj = vyplSablona();
  const sab = { prijmy: zdroj.prijmy.slice(), odvody: (zdroj.odvody || []).slice(), srazky: (zdroj.srazky || []).slice(), pripocty: (zdroj.pripocty || []).slice() };
  let pridano = 0;
  (nove || []).forEach(x => {
    const key = String(x.klic || x.key || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40);
    const sk = ['prijmy', 'srazky', 'pripocty'].includes(x.skupina) ? x.skupina : null;
    if (!key || !sk || VYPL_SKUPINY.some(g => (sab[g] || []).some(it => it.key === key))) return;
    const it = { key, kod: String(x.kod || '').slice(0, 12), label: String(x.label || key).slice(0, 60), povaha: 'prilezitostna', odvozena: false };
    if (sk === 'prijmy') { let s = String(x.slozka || 'jine').toLowerCase(); s = VYPL_SLOZKA_ALIAS[s] || s; if (/^(zacas|cas)$/i.test(s)) s = 'priplatky'; it.slozka = VYPL_SLOZKY_KLICE.includes(s) ? s : 'jine'; }
    sab[sk].push(it); pridano++;
  });
  if (pridano) S.payslipTemplate = sab;
  return pridano;
}
window.vyplSablonaDoplnit = vyplSablonaDoplnit;

function vyplImportSpustit() {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const el = document.getElementById('vyplImportVysledek');
  let data;
  try {
    data = vyplImportParse(document.getElementById('vyplImportText').value);
    if (!data.length) throw new Error('nenašel jsem žádný měsíc');
  } catch (e) {
    el.innerHTML = `<div style="font-size:.78rem;color:var(--expense)">Nepovedlo se přečíst JSON: ${String(e.message).replace(/</g, '&lt;')}</div>`;
    return;
  }

  // Nové položky se do šablony přidají PŘED kontrolou – průchozí/složka ovlivní součty.
  const pred = S.payslipTemplate;
  const pridano = vyplSablonaDoplnit([].concat(...data.map(z => z.nove || [])));

  const ok = [], chyby = [];
  data.forEach(z => {
    if (!z || !/^\d{4}-\d{2}$/.test(z.m || '')) { chyby.push(`záznam bez měsíce (${String(z && z.m || '?').replace(/</g, '&lt;')})`); return; }
    const v = vyplDopocet(z);
    // Kontrola proti tomu, co je na pásce. Bez `ocekavano` se pásce věří.
    const o = z.ocekavano || {};
    const nesedi = [];
    const nes = (a, b) => Math.abs(a - +b) > 0.5;
    if (o.hruba   != null && nes(v.hruba, o.hruba))     nesedi.push(`hrubá ${fmtP(v.hruba)} ≠ ${fmtP(o.hruba)}`);
    if (o.cisty   != null && nes(v.cisty, o.cisty))     nesedi.push(`čistý ${fmtP(v.cisty)} ≠ ${fmtP(o.cisty)}`);
    if (o.dobirka != null && nes(v.dobirka, o.dobirka)) nesedi.push(`dobírka ${fmtP(v.dobirka)} ≠ ${fmtP(o.dobirka)}`);
    if (nesedi.length) chyby.push(`${z.m}: ${nesedi.join(' · ')}`);
    else ok.push(z);
  });
  if (!ok.length && pridano) S.payslipTemplate = pred;   // nic neprošlo → šablonu nech, jak byla

  el.innerHTML = `<div style="font-size:.8rem;color:${VYPL_HODNOTA};margin-bottom:6px">
      Sedí: <strong style="color:var(--income)">${ok.length}</strong>
      ${chyby.length ? ` · Nesedí: <strong style="color:var(--expense)">${chyby.length}</strong>` : ''}
      ${ok.length && pridano ? ` · nové položky v šabloně: <strong>${pridano}</strong>` : ''}
    </div>
    ${chyby.map(c => `<div style="font-size:.74rem;color:var(--expense);line-height:1.5">✗ ${c}</div>`).join('')}
    ${chyby.length ? `<div style="font-size:.7rem;color:${VYPL_POPISEK};margin-top:4px;line-height:1.5">Nesedící měsíc se nenaimportoval. Nejčastěji AI přehlédla nebo zdvojila položku –
      pošli jí pásku znovu s větou „hrubá mzda vychází jinak než na pásce, zkontroluj položky“.</div>` : ''}`;

  if (!ok.length) return;
  const klice = new Set(ok.map(z => z.m));
  S.payslips = (S.payslips || []).filter(x => !klice.has(x.m))
    .concat(ok.map(z => {
      const r = { m: z.m, hlavicka: z.hlavicka || {}, prijmy: z.prijmy || {}, odvody: z.odvody || {}, srazky: z.srazky || {} };
      if (z.pripocty && Object.keys(z.pripocty).length) r.pripocty = z.pripocty;
      return r;
    }));
  save();
  if (typeof showToast === 'function') showToast(`🧾 Naimportováno ${ok.length} ${ok.length === 1 ? 'měsíc' : ok.length < 5 ? 'měsíce' : 'měsíců'}`);
  setTimeout(() => renderPage(), 400);
}
window.vyplImportDialog = vyplImportDialog;
window.vyplImportSpustit = vyplImportSpustit;

window.vyplOtevritForm = vyplOtevritForm;
window.vyplUlozit = vyplUlozit;
window.vyplSmazat = vyplSmazat;
window.vyplDopocet = vyplDopocet;
window.vyplPodilPevne = vyplPodilPevne;
window.vyplSablona = vyplSablona;
window._renderKalVyplatnice = _renderKalVyplatnice;
