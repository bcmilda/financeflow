// FinanceFlow · v10.53 · vyplatnice.js · 2026-09-10
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
    { key: 'zaklad',    kod: 'MZDA', label: 'Základní měs. mzda',     povaha: 'stala',         odvozena: true  },
    { key: 'dovolena',  kod: '0300', label: 'Dovolená',               povaha: 'prilezitostna', odvozena: true  },
    { key: 'vykonove',  kod: '0500', label: 'Výkonové prémie',        povaha: 'stala',         odvozena: false },
    { key: 'osobni',    kod: '0501', label: 'Osobní prémie',          povaha: 'stala',         odvozena: false },
    { key: 'korekce',   kod: '0502', label: 'Osobní prémie – korekce',povaha: 'prilezitostna', odvozena: false },
    { key: 'mobilita',  kod: '0530', label: 'Odměna za mobilitu',     povaha: 'stala',         odvozena: false },
    { key: 'nocni',     kod: '1061', label: 'Příplatek noční',        povaha: 'prilezitostna', odvozena: true  },
    { key: 'prescas',   kod: '2024', label: 'Přesčas – mzda',         povaha: 'prilezitostna', odvozena: true  },
    { key: 'prescasPr', kod: '2026', label: 'Příplatek přesčas',      povaha: 'prilezitostna', odvozena: true  },
    { key: 'vikend',    kod: '2129', label: 'Příplatek So + Ne',      povaha: 'prilezitostna', odvozena: true  },
    { key: 'nabor',     kod: '5047', label: 'Náborový příspěvek',     povaha: 'prilezitostna', odvozena: false },
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
};

function vyplSablona() {
  const s = S.payslipTemplate;
  if (s && s.prijmy && s.prijmy.length) return s;
  return VYPL_SABLONA_CZ;
}
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

  const cisty = hruba - zp - sp - dan;
  let srazky = 0;
  Object.keys(z.srazky || {}).forEach(k => { if (!pruchozi.has(k)) srazky += (+z.srazky[k] || 0); });
  return { hruba, zp, sp, danPred, dan, cisty, srazky: Math.round(srazky), dobirka: cisty - Math.round(srazky) };
}

// Podíl PEVNÉ složky – jádro toho, kvůli čemu funkce vzniká. Pevné je to,
// co dostanu i bez přesčasů a bez výkonu; pohyblivé zbytek.
const VYPL_PEVNE = ['zaklad', 'mobilita', 'dovolena'];
function vyplPodilPevne(z) {
  const p = z.prijmy || {};
  const sab = vyplSablona();
  const pruchozi = new Set(sab.prijmy.filter(x => x.povaha === 'pruchozi').map(x => x.key));
  let pevne = 0, celkem = 0;
  Object.keys(p).forEach(k => {
    if (pruchozi.has(k)) return;
    const v = +p[k] || 0;
    celkem += v;
    if (VYPL_PEVNE.includes(k)) pevne += v;
  });
  return celkem > 0 ? Math.round(pevne / celkem * 100) : null;
}

// ── Render ────────────────────────────────────────────────────────────
const VYPL_POPISEK = '#a8aec8', VYPL_HODNOTA = '#c9cede';

function _renderKalVyplatnice(D, m, y) {
  const zaznamy = vyplZaznamy().slice().sort((a, b) => (b.m || '').localeCompare(a.m || ''));
  const mKlic = `${y}-${String(m + 1).padStart(2, '0')}`;
  const aktualni = zaznamy.find(z => z.m === mKlic);

  let html = `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🧾 Výplatnice · ${CZ_M[m]} ${y}</span></div>
    <div class="card-body">`;

  if (aktualni) {
    const v = vyplDopocet(aktualni);
    const pevne = vyplPodilPevne(aktualni);
    const rada = (l, h, barva) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:.8rem;color:${VYPL_POPISEK}">${l}</span>
        <span style="font-size:.86rem;font-weight:600;color:${barva || VYPL_HODNOTA}">${fmt(h)} Kč</span></div>`;
    html += rada('Hrubá mzda', v.hruba)
          + rada('− Zdravotní pojištění', -v.zp, 'var(--expense)')
          + rada('− Sociální pojištění', -v.sp, 'var(--expense)')
          + rada('− Daň zálohová', -v.dan, 'var(--expense)')
          + rada('Čistý příjem', v.cisty, 'var(--income)')
          + (v.srazky ? rada('− Srážky', -v.srazky, 'var(--expense)') : '')
          + `<div style="display:flex;justify-content:space-between;padding:10px 0 2px">
               <span style="font-size:.9rem;font-weight:700">Dobírka</span>
               <span style="font-family:Syne,sans-serif;font-size:1.15rem;font-weight:800;color:var(--income)">${fmt(v.dobirka)} Kč</span></div>`
          + (pevne != null ? `<div style="font-size:.74rem;color:${VYPL_POPISEK};margin-top:8px;line-height:1.55">
               Pevná složka tvoří <strong style="color:${VYPL_HODNOTA}">${pevne} %</strong> hrubé mzdy.
               Zbytek závisí na odpracovaných hodinách a výkonu.</div>` : '')
          + `<div style="display:flex;gap:7px;margin-top:12px;flex-wrap:wrap">
               <button class="btn btn-ghost btn-sm" onclick="vyplOtevritForm('${mKlic}')">✎ Upravit</button>
               <button class="btn btn-danger btn-sm" onclick="vyplSmazat('${mKlic}')">Smazat</button>
             </div>`;
  } else {
    html += `<div style="font-size:.8rem;color:${VYPL_POPISEK};line-height:1.6;margin-bottom:10px">
        Za tenhle měsíc zatím pásku nemáš. Opsání zabere asi minutu — a teprve
        z několika měsíců je vidět, jestli roste základ, nebo jen prémie.</div>
      <button class="btn btn-accent" onclick="vyplOtevritForm('${mKlic}')">+ Zadat výplatnici</button>`;
  }
  html += `</div></div><div id="vyplFormBox"></div>`;

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
          hrubá ${fmt(v.hruba)} · pevná ${pevne != null ? pevne + ' %' : '—'}</div>
        <div style="font-size:.84rem;font-weight:700;color:var(--income)">${fmt(v.dobirka)} Kč</div>
      </div>`;
    });
    html += `</div></div>`;
  }
  return html;
}

// ── Formulář ──────────────────────────────────────────────────────────
function vyplOtevritForm(mKlic) {
  const box = document.getElementById('vyplFormBox'); if (!box) return;
  const sab = vyplSablona();
  const z = vyplZaznamy().find(x => x.m === mKlic) || { m: mKlic, hlavicka: {}, prijmy: {}, odvody: {}, srazky: {} };

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
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="vyplUlozit('${mKlic}')">Uložit</button>
        <button class="btn btn-ghost" onclick="document.getElementById('vyplFormBox').innerHTML=''">Zrušit</button>
      </div>
    </div></div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function vyplUlozit(mKlic) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const z = { m: mKlic, hlavicka: {}, prijmy: {}, odvody: {}, srazky: {} };
  document.querySelectorAll('[data-vypl]').forEach(inp => {
    const [skupina, key] = inp.dataset.vypl.split('.');
    const raw = (inp.value || '').replace(/\s/g, '').replace(',', '.');
    // Prázdné pole se NEULOŽÍ jako nula – chybějící položka je informace.
    if (raw === '') return;
    const v = parseFloat(raw);
    if (!isFinite(v)) return;
    z[skupina][key] = v;
  });
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

window.vyplOtevritForm = vyplOtevritForm;
window.vyplUlozit = vyplUlozit;
window.vyplSmazat = vyplSmazat;
window.vyplDopocet = vyplDopocet;
window.vyplPodilPevne = vyplPodilPevne;
window.vyplSablona = vyplSablona;
window._renderKalVyplatnice = _renderKalVyplatnice;
