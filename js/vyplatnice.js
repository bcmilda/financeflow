// FinanceFlow · v11.77 · vyplatnice.js · 2026-10-14
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
    { key: 'nocni',     kod: '1061', label: 'Příplatek noční',        povaha: 'prilezitostna', odvozena: true,  slozka: 'zaCas'  },
    { key: 'prescas',   kod: '2024', label: 'Přesčas – mzda',         povaha: 'prilezitostna', odvozena: true,  slozka: 'zaCas'  },
    { key: 'prescasPr', kod: '2026', label: 'Příplatek přesčas',      povaha: 'prilezitostna', odvozena: true,  slozka: 'zaCas'  },
    { key: 'svatek',    kod: '2089', label: 'Příplatek práce ve svátek', povaha: 'prilezitostna', odvozena: true, slozka: 'zaCas' },
    { key: 'vikend',    kod: '2129', label: 'Příplatek So + Ne',      povaha: 'prilezitostna', odvozena: true,  slozka: 'zaCas'  },
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
const VYPL_SLOZKA_ALIAS = { priplatky: 'zaCas', cas: 'zaCas', zacas: 'zaCas', vykon: 'premie', prémie: 'premie', odměny: 'odmeny', ostatni: 'jine' };
function _vyplSlozka(key, sab) {
  const it = ((sab || vyplSablona()).prijmy || []).find(x => x.key === key);
  let s = it && it.slozka ? String(it.slozka) : '';
  s = VYPL_SLOZKA_ALIAS[s.toLowerCase()] || s;
  if (['pevna', 'zaCas', 'premie', 'odmeny', 'jine'].includes(s)) return s;
  if (VYPL_PEVNE.includes(key)) return 'pevna';
  if (VYPL_ZA_CAS.includes(key)) return 'zaCas';
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
  const r = { pevna: 0, zaCas: 0, premie: 0, odmeny: 0, zaVykon: 0, jine: 0, celkem: 0 };
  Object.keys(p).forEach(k => {
    if (pruchozi.has(k)) return;
    const v = +p[k] || 0;
    r.celkem += v;
    r[_vyplSlozka(k, sab)] += v;
  });
  r.zaVykon = r.premie + r.odmeny;
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
  { k: 'zaCas',  label: 'Příplatky a přesčasy', kratce: 'Příplatky' },
  { k: 'premie', label: 'Prémie (měsíční)',     kratce: 'Prémie' },
  { k: 'odmeny', label: 'Mimořádné odměny',     kratce: 'Odměny' },
  { k: 'jine',   label: 'Ostatní',              kratce: 'Ostatní' },
];
const VYPL_BARVY = { pevna: '#16a34a', zaCas: '#3b82f6', premie: '#d97706', odmeny: '#ec4899', jine: '#8b5cf6', zaVykon: '#d97706' };
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
        <strong>Příplatky a přesčasy</strong> závisí na tom, kdy a kolik odpracuješ (noční, víkend, svátek, přesčas).
        <strong>Prémie</strong> chodí každý měsíc podle hodnocení, <strong>mimořádné odměny</strong> jednou za čas (roční, pololetní, vánoční, náborová).
        Klepnutím na složku nahoře zobrazíš jen ji.</div>
    </div></div>`;

  // ── B · Prémie vs. příplatky (čára) ──
  const prem = rozk.map(r => r.premie), cas = rozk.map(r => r.zaCas);
  if (prem.some(v => v > 0) || cas.some(v => v > 0)) {
    const osa = _vyplOsa(Math.max(...prem, ...cas, 1));
    const avg = a => Math.round(a.reduce((x, y) => x + y, 0) / (a.length || 1));
    html += `<div class="card" style="margin-bottom:12px">
      <div class="card-header"><span class="card-title">📈 Prémie a příplatky</span></div>
      <div class="card-body">
        <div class="vg-kpi">
          <div><div class="l">⌀ prémie měsíčně</div><div class="v" style="color:${VYPL_BARVY.premie}">${fmt(avg(prem))} Kč</div></div>
          <div><div class="l">⌀ příplatky a přesčasy</div><div class="v" style="color:${VYPL_BARVY.zaCas}">${fmt(avg(cas))} Kč</div></div>
          <div><div class="l">pohyblivá část dohromady</div><div class="v">${fmt(avg(prem) + avg(cas))} Kč</div><div class="p">${_vyplPct(avg(prem) + avg(cas), avg(rozk.map(r => r.celkem)))} % hrubé</div></div>
        </div>
        ${_vyplLegenda([{ label: 'Prémie (měsíční)', barva: VYPL_BARVY.premie }, { label: 'Příplatky a přesčasy', barva: VYPL_BARVY.zaCas }])}
        ${_vyplCary({ id: 'vgPremie', mesice, yMax: osa.max, ticks: osa.ticks, fmtTick: _vyplKcOsa, vyska: 140,
          serie: [{ label: 'Prémie', kratce: 'Prémie', barva: VYPL_BARVY.premie, hodnoty: prem }, { label: 'Příplatky', kratce: 'Příplatky', barva: VYPL_BARVY.zaCas, hodnoty: cas }],
          cteni: i => `<b>${mesNazev(i)}</b> · <span class="vg-dot" style="background:${VYPL_BARVY.premie}"></span>prémie <b>${fmt(Math.round(prem[i]))} Kč</b>
            · <span class="vg-dot" style="background:${VYPL_BARVY.zaCas}"></span>příplatky <b>${fmt(Math.round(cas[i]))} Kč</b> · dohromady ${fmt(Math.round(prem[i] + cas[i]))} Kč` })}
        <div class="vg-pozn">Obě složky jsou pohyblivé: příplatky ovlivníš rozpisem směn, prémie rozhoduje hodnocení.
          Mimořádné odměny tu nejsou – jeden měsíc s roční prémií by graf přebil.</div>
      </div></div>`;
  }

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

//  S26 (v11.77): DANĚ A ODVODY. Milan: „čím větší výplata, tím větší daně, ale nikde na
//  to nevidím data ani graf“. Sloupce ZP / SP / daň po měsících, sazba z hrubé, součty
//  za posledních 12 měsíců a kolik z koruny navíc zůstane – z TVÉ poslední pásky (u pásky
//  s opsanými odvody odhadem z měsíců se stejnými slevami), takže platí i pro jinou firmu.
function vyplMeznaSazba(rada) {
  if (!rada || !rada.length) return null;
  const posl = rada[rada.length - 1], o = posl.odvody || {};
  //  a) Odvody poslední pásky dopočítává appka (ZP, SP, daň nejsou opsané) → přesně:
  //     přidej 1 000 Kč hrubého a podívej se, o kolik vzrostou.
  if (o.zp == null && o.sp == null && o.dan == null) {
    const plus = Object.assign({}, posl, { prijmy: Object.assign({}, posl.prijmy || {}, { _mezni1000: ((posl.prijmy || {})._mezni1000 || 0) + 1000 }) });
    const d = (vyplDopocet(plus).odvody - vyplDopocet(posl).odvody) / 1000;
    return d > 0 && d < 1 ? d : null;
  }
  //  b) Odvody jsou opsané z pásky (jiná firma / země) → odhad z měsíců se STEJNÝMI slevami
  //     a nenulovou daní (sleva navíc nebo nulová daň by sklon zkreslily).
  const vyp = rada.map(z => vyplDopocet(z)), sl = vyp[vyp.length - 1].slevy;
  let b = vyp.filter(v => v.hruba > 0 && v.dan > 0 && Math.abs(v.slevy - sl) < 1);
  if (b.length < 4) b = vyp.filter(v => v.hruba > 0 && v.dan > 0);
  if (b.length < 4) return null;
  const mx = b.reduce((a, v) => a + v.hruba, 0) / b.length, my = b.reduce((a, v) => a + v.odvody, 0) / b.length;
  let cov = 0, vr = 0;
  b.forEach(v => { cov += (v.hruba - mx) * (v.odvody - my); vr += (v.hruba - mx) ** 2; });
  if (vr < 1e6) return null;                       // hrubá skoro stejná každý měsíc – nejde odhadnout
  const s = cov / vr;
  return s > 0 && s < 1 ? s : null;
}
window.vyplMeznaSazba = vyplMeznaSazba;

function _vyplOdvodyKarta(rada, vyp) {
  if (!rada.length) return '';
  const posl12 = vyp.slice(-12), n12 = posl12.length;
  const sum = (a, k) => a.reduce((x, v) => x + (v[k] || 0), 0);
  const sazby = vyp.map(v => v.hruba ? v.odvody / v.hruba * 100 : 0);
  const mezni = vyplMeznaSazba(rada);
  const osa = _vyplOsa(Math.max(...vyp.map(v => v.odvody), 1));
  const slevaZak = +((rada[rada.length - 1].odvody || {}).slevaZak) || 0;
  const tabRadky = rada.map((z, i) => [_vyplMes(z.m), fmt(vyp[i].hruba), fmt(vyp[i].zp), fmt(vyp[i].sp), fmt(vyp[i].dan),
    vyp[i].slevy ? fmt(vyp[i].slevy) : '–', `<b>${fmt(vyp[i].odvody)}</b>`, sazby[i].toFixed(1).replace('.', ',') + ' %', fmt(vyp[i].cisty)]).reverse();
  const S12 = k => sum(posl12, k);
  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🏛️ Daně a odvody</span></div>
    <div class="card-body">
      <div class="vg-kpi">
        <div><div class="l">Odvedeno za ${n12} ${n12 === 1 ? 'měsíc' : n12 < 5 ? 'měsíce' : 'měsíců'}</div><div class="v">${fmt(S12('odvody'))} Kč</div>
          <div class="p">ZP ${fmt(S12('zp'))} · SP ${fmt(S12('sp'))} · daň ${fmt(S12('dan'))}</div></div>
        <div><div class="l">Z hrubé mzdy odešlo</div><div class="v">${_vyplPct(S12('odvody'), S12('hruba'))} %</div>
          <div class="p">od ${Math.min(...sazby.slice(-12)).toFixed(1).replace('.', ',')} do ${Math.max(...sazby.slice(-12)).toFixed(1).replace('.', ',')} %</div></div>
        ${mezni ? `<div><div class="l">Z 1 000 Kč hrubého navíc ti zůstane</div><div class="v" style="color:var(--income)">≈ ${fmt(Math.round((1 - mezni) * 1000))} Kč</div>
          <div class="p">zbytek (${fmt(Math.round(mezni * 1000))} Kč) jsou odvody</div></div>` : ''}
      </div>
      ${_vyplLegenda(VYPL_ODVODY)}
      ${_vyplSloupce({ id: 'vgOdvody', mesice: rada.map(z => z.m), yMax: osa.max, ticks: osa.ticks, fmtTick: _vyplKcOsa, vyska: 150,
        serie: VYPL_ODVODY.map(o => ({ k: o.k, barva: o.barva, hodnoty: vyp.map(v => v[o.k]) })),
        prumer: { v: sum(vyp, 'odvody') / vyp.length, label: '⌀ ' + _vyplKcOsa(Math.round(sum(vyp, 'odvody') / vyp.length)) },
        cteni: i => `<b>${_vyplMesicNazev(rada[i].m)}</b> · hrubá ${fmt(vyp[i].hruba)} Kč → odvody <b>${fmt(vyp[i].odvody)} Kč (${sazby[i].toFixed(1).replace('.', ',')} %)</b><br>`
          + VYPL_ODVODY.map(o => `<span style="white-space:nowrap;margin-right:10px"><span class="vg-dot" style="background:${o.barva}"></span>${o.kratce} ${fmt(vyp[i][o.k])} Kč</span>`).join('')
          + (vyp[i].slevy ? `<span style="white-space:nowrap">· slevy na dani ${fmt(vyp[i].slevy)} Kč</span>` : '') })}
      <div class="vg-pozn">Proč s vyšší výplatou roste i <strong>procento</strong>: pojistné je pevný podíl z hrubé, ale daň se počítá z celé hrubé mzdy
        a odečítá se od ní pevná částka${slevaZak ? ` (sleva na poplatníka ${fmt(slevaZak)} Kč)` : ' (slevy)'}. Čím vyšší hrubá, tím menší část daně sleva pokryje.
        ${mezni ? `Z každé koruny navíc tak odejde asi <strong>${Math.round(mezni * 100)} haléřů</strong> – spočítané z tvých pásek.` : ''}</div>
      <details style="margin-top:8px"><summary style="font-size:.74rem;color:#a8aec8;cursor:pointer">Tabulka po měsících</summary>
        ${_vyplTabulka(['Měsíc', 'Hrubá', 'ZP', 'SP', 'Daň', 'Slevy', 'Odvody', 'Sazba', 'Čistý'], tabRadky,
          [['Součet', fmt(sum(vyp, 'hruba')), fmt(sum(vyp, 'zp')), fmt(sum(vyp, 'sp')), fmt(sum(vyp, 'dan')), fmt(sum(vyp, 'slevy')), fmt(sum(vyp, 'odvody')),
            _vyplPct(sum(vyp, 'odvody'), sum(vyp, 'hruba')).toString().replace('.', ',') + ' %', fmt(sum(vyp, 'cisty'))]])}</details>
    </div></div>`;
}

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
      "priplatky" = podle odpracovaného času (přesčas, noční, víkend, svátek),
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
    if (sk === 'prijmy') { let s = String(x.slozka || 'jine').toLowerCase(); s = VYPL_SLOZKA_ALIAS[s] || s; it.slozka = ['pevna', 'zaCas', 'premie', 'odmeny', 'jine'].includes(s) ? s : 'jine'; }
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
