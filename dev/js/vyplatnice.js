// FinanceFlow · v10.59 · vyplatnice.js · 2026-09-10
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
    { key: 'svatek',    kod: '2089', label: 'Příplatek práce ve svátek', povaha: 'prilezitostna', odvozena: true },
    { key: 'vikend',    kod: '2129', label: 'Příplatek So + Ne',      povaha: 'prilezitostna', odvozena: true  },
    { key: 'vanocni',   kod: '5010', label: 'Vánoční příspěvek',      povaha: 'prilezitostna', odvozena: false },
    { key: 'rocni',     kod: '5045', label: 'Roční prémie',            povaha: 'prilezitostna', odvozena: false },
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

function vyplRozklad(z) {
  const p = z.prijmy || {};
  const sab = vyplSablona();
  const pruchozi = new Set(sab.prijmy.filter(x => x.povaha === 'pruchozi').map(x => x.key));
  const r = { pevna: 0, zaCas: 0, zaVykon: 0, jine: 0, celkem: 0 };
  Object.keys(p).forEach(k => {
    if (pruchozi.has(k)) return;
    const v = +p[k] || 0;
    r.celkem += v;
    if (VYPL_PEVNE.includes(k)) r.pevna += v;
    else if (VYPL_ZA_CAS.includes(k)) r.zaCas += v;
    else if (VYPL_ZA_VYKON.includes(k)) r.zaVykon += v;
    else r.jine += v;
  });
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
               <button class="btn btn-ghost btn-sm" onclick="vyplImportDialog()">📥 Import</button>
             </div>`;
  } else {
    html += `<div style="font-size:.8rem;color:${VYPL_POPISEK};line-height:1.6;margin-bottom:10px">
        Za tenhle měsíc zatím pásku nemáš. Opsání zabere asi minutu — a teprve
        z několika měsíců je vidět, jestli roste základ, nebo jen prémie.</div>
      <button class="btn btn-accent" onclick="vyplOtevritForm('${mKlic}')">+ Zadat výplatnici</button>
      <button class="btn btn-ghost" style="margin-left:7px" onclick="vyplImportDialog()">📥 Import</button>`;
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
          hrubá ${fmt(v.hruba)} · pevná ${pevne != null ? pevne + ' %' : '—'}</div>
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
  const soucet = z => VYPL_PREMIE_PRAVIDELNE.reduce((a, k) => a + (+(z.prijmy || {})[k] || 0), 0);
  const s = usek.reduce((a, z) => a + soucet(z), 0);
  // Kolik jednorázových odměn jsme z porovnání vynechali – řekneme to nahlas.
  const jednorazove = usek.reduce((a, z) => a + ['vanocni', 'rocni', 'nabor']
    .reduce((b, k) => b + (+(z.prijmy || {})[k] || 0), 0), 0);
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
//  FÁZE 2 · GRAFY SLOŽENÍ V ČASE (TODO-258)
//  Záměrně BEZ canvasu – skládané pruhy z divů se samy přizpůsobí šířce,
//  nepotřebují DPR škálování ani čekání na layout (SKILL 2) a na mobilu
//  vypadají stejně jako na desktopu.
// ══════════════════════════════════════════════════════════════════════
const VYPL_BARVY = { pevna: '#4ade80', zaCas: '#60a5fa', zaVykon: '#fbbf24', jine: '#a78bfa' };

function _vyplGrafy(zaznamy) {
  if (zaznamy.length < 2) return '';
  const rada = zaznamy.slice().sort((a, b) => (a.m || '').localeCompare(b.m || '')).slice(-24);
  const max = Math.max(...rada.map(z => vyplRozklad(z).celkem), 1);
  const mesic = m => { const [y, mm] = m.split('-'); return CZ_M[(+mm || 1) - 1].slice(0, 3) + ' ' + y.slice(2); };

  // ── A · Složení hrubé mzdy ──
  let a = rada.map(z => {
    const r = vyplRozklad(z);
    const dil = (v, barva, popis) => v > 0
      ? `<div title="${popis}: ${fmt(Math.round(v))} Kč" style="height:${v / max * 100}%;background:${barva}"></div>` : '';
    return `<div style="flex:1;min-width:14px;display:flex;flex-direction:column;justify-content:flex-end;height:130px;gap:1px">
        ${dil(r.zaVykon, VYPL_BARVY.zaVykon, 'Za výkon')}
        ${dil(r.zaCas,   VYPL_BARVY.zaCas,   'Za čas')}
        ${dil(r.jine,    VYPL_BARVY.jine,    'Ostatní')}
        ${dil(r.pevna,   VYPL_BARVY.pevna,   'Pevná')}
      </div>`;
  }).join('');

  const legenda = [['pevna', 'Pevná'], ['zaCas', 'Za čas'], ['zaVykon', 'Za výkon'], ['jine', 'Ostatní']]
    .map(([k, l]) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.7rem;color:${VYPL_POPISEK}">
        <span style="width:9px;height:9px;border-radius:2px;background:${VYPL_BARVY[k]}"></span>${l}</span>`).join('');

  // ── B · Podíl pevné složky ──
  const podily = rada.map(z => { const r = vyplRozklad(z); return r.celkem ? r.pevna / r.celkem * 100 : null; });
  const platne = podily.filter(v => v != null);
  const prumer = platne.length ? Math.round(platne.reduce((a, b) => a + b, 0) / platne.length) : null;
  const prvni = platne[0], posledni = platne[platne.length - 1];
  const zmena = (prvni != null && posledni != null) ? Math.round(posledni - prvni) : null;

  const b = rada.map((z, i) => {
    const v = podily[i];
    return `<div title="${mesic(z.m)}: ${v != null ? Math.round(v) + ' %' : '—'}"
        style="flex:1;min-width:14px;height:70px;display:flex;flex-direction:column;justify-content:flex-end">
        <div style="height:${v != null ? v : 0}%;background:${VYPL_BARVY.pevna};opacity:.85"></div></div>`;
  }).join('');

  // ── C · Srážky ──
  const sab = vyplSablona();
  const pruchoziSr = new Set(sab.srazky.filter(x => x.povaha === 'pruchozi').map(x => x.key));
  const srazkySoucet = {};
  rada.forEach(z => Object.keys(z.srazky || {}).forEach(k => {
    if (pruchoziSr.has(k)) return;
    srazkySoucet[k] = (srazkySoucet[k] || 0) + (+z.srazky[k] || 0);
  }));
  const nazev = k => (sab.srazky.find(x => x.key === k) || {}).label || k;
  const srCelkem = Object.values(srazkySoucet).reduce((a, b) => a + b, 0);

  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">📊 Z čeho se skládá hrubá mzda</span></div>
    <div class="card-body">
      <div style="margin-bottom:7px">${legenda}</div>
      <div style="display:flex;gap:2px;align-items:flex-end">${a}</div>
      <div style="display:flex;justify-content:space-between;font-size:.66rem;color:${VYPL_POPISEK};margin-top:5px">
        <span>${mesic(rada[0].m)}</span><span>${mesic(rada[rada.length - 1].m)}</span></div>
      <div style="font-size:.72rem;color:${VYPL_POPISEK};margin-top:9px;line-height:1.55">
        <strong style="color:${VYPL_HODNOTA}">Pevná</strong> je to, co dostaneš i bez přesčasů a bez výkonu.
        <strong style="color:${VYPL_HODNOTA}">Za čas</strong> závisí na odpracovaných hodinách,
        <strong style="color:${VYPL_HODNOTA}">za výkon</strong> na rozhodnutí zaměstnavatele.
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🛡️ Podíl pevné složky</span></div>
    <div class="card-body">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:9px">
        <span style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;color:${VYPL_BARVY.pevna}">${posledni != null ? Math.round(posledni) : '—'} %</span>
        <span style="font-size:.74rem;color:${VYPL_POPISEK}">poslední měsíc · průměr ${prumer != null ? prumer : '—'} %</span>
        ${zmena != null ? `<span style="font-size:.74rem;color:${zmena >= 0 ? 'var(--income)' : 'var(--debt)'}">
            ${zmena >= 0 ? '+' : ''}${zmena} pb za sledované období</span>` : ''}
      </div>
      <div style="display:flex;gap:2px;align-items:flex-end">${b}</div>
      <div style="font-size:.72rem;color:${VYPL_POPISEK};margin-top:9px;line-height:1.55">
        Kolik z hrubé mzdy je jisté. Vyšší podíl znamená stabilnější příjem —
        pevnou část ti nikdo nesebere a počítá se do dovolené i náhrad.
        Appka neříká, který podíl je správný; to závisí na tom, jestli ve firmě zůstaneš.
      </div>
    </div>
  </div>

  ${srCelkem ? `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">✂️ Srážky za ${rada.length} měsíců</span></div>
    <div class="card-body">
      ${Object.keys(srazkySoucet).sort((x, y) => srazkySoucet[y] - srazkySoucet[x]).map(k => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:.8rem;color:${VYPL_POPISEK}">${nazev(k)}</span>
          <span style="font-size:.84rem;font-weight:600;color:${VYPL_HODNOTA}">${fmt(Math.round(srazkySoucet[k]))} Kč</span>
        </div>`).join('')}
      <div style="display:flex;justify-content:space-between;padding:9px 0 2px">
        <span style="font-size:.86rem;font-weight:700">Celkem</span>
        <span style="font-size:.95rem;font-weight:800;color:var(--expense)">${fmt(Math.round(srCelkem))} Kč</span>
      </div>
      <div style="font-size:.72rem;color:${VYPL_POPISEK};margin-top:8px;line-height:1.55">
        Průchozí položky (příspěvek na penzijko, který se hned strhne) se nepočítají —
        nejsou to tvoje peníze ani tam, ani zpět.
      </div>
    </div>
  </div>` : ''}`;
}
window._vyplGrafy = _vyplGrafy;

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

// ══════════════════════════════════════════════════════════════════════
//  IMPORT (TODO-257): vložení více měsíců najednou přes JSON.
//  Ruční opisování dvaceti pásek by trvalo dvacet minut a chyba by se
//  poznala až u nesedícího součtu. Import proto KAŽDOU pásku přepočítá
//  a měsíce, u kterých model nesedí na zadanou dobírku, ODMÍTNE –
//  radši nenaimportovat než naimportovat špatně.
// ══════════════════════════════════════════════════════════════════════
function vyplImportDialog() {
  const box = document.getElementById('vyplFormBox'); if (!box) return;
  box.innerHTML = `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">📥 Import výplatnic</span></div>
    <div class="card-body">
      <div style="font-size:.76rem;color:${VYPL_POPISEK};line-height:1.6;margin-bottom:10px">
        Vlož JSON s páskami. Každý měsíc se přepočítá a porovná s dobírkou, kterou
        v datech uvedeš — <strong style="color:${VYPL_HODNOTA}">měsíc, který nesedí, se
        nenaimportuje</strong> a dozvíš se proč.
      </div>
      <textarea id="vyplImportText" rows="7" placeholder='[{"m":"2025-03", …}]'
        style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px;color:var(--text);font-family:monospace;font-size:.74rem"></textarea>
      <div id="vyplImportVysledek" style="margin-top:10px"></div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="vyplImportSpustit()">Zkontrolovat a naimportovat</button>
        <button class="btn btn-ghost" onclick="document.getElementById('vyplFormBox').innerHTML=''">Zrušit</button>
      </div>
    </div></div>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function vyplImportSpustit() {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const el = document.getElementById('vyplImportVysledek');
  let data;
  try {
    data = JSON.parse(document.getElementById('vyplImportText').value);
    if (!Array.isArray(data)) throw new Error('čekal jsem pole měsíců');
  } catch (e) {
    el.innerHTML = `<div style="font-size:.78rem;color:var(--expense)">Nepovedlo se přečíst JSON: ${e.message}</div>`;
    return;
  }

  const ok = [], chyby = [];
  data.forEach(z => {
    if (!z || !z.m) { chyby.push('záznam bez měsíce'); return; }
    const v = vyplDopocet(z);
    // Kontrola proti tomu, co je na pásce. Bez `ocekavano` se pásce věří.
    const o = z.ocekavano || {};
    const nesedi = [];
    if (o.hruba   != null && v.hruba   !== +o.hruba)   nesedi.push(`hrubá ${v.hruba} ≠ ${o.hruba}`);
    if (o.cisty   != null && v.cisty   !== +o.cisty)   nesedi.push(`čistý ${v.cisty} ≠ ${o.cisty}`);
    if (o.dobirka != null && v.dobirka !== +o.dobirka) nesedi.push(`dobírka ${v.dobirka} ≠ ${o.dobirka}`);
    if (nesedi.length) chyby.push(`${z.m}: ${nesedi.join(' · ')}`);
    else ok.push(z);
  });

  el.innerHTML = `<div style="font-size:.8rem;color:${VYPL_HODNOTA};margin-bottom:6px">
      Sedí: <strong style="color:var(--income)">${ok.length}</strong>
      ${chyby.length ? ` · Nesedí: <strong style="color:var(--expense)">${chyby.length}</strong>` : ''}
    </div>
    ${chyby.map(c => `<div style="font-size:.74rem;color:var(--expense);line-height:1.5">✗ ${c}</div>`).join('')}`;

  if (!ok.length) return;
  const klice = new Set(ok.map(z => z.m));
  S.payslips = (S.payslips || []).filter(x => !klice.has(x.m))
    .concat(ok.map(z => ({ m: z.m, hlavicka: z.hlavicka || {}, prijmy: z.prijmy || {},
                           odvody: z.odvody || {}, srazky: z.srazky || {} })));
  save();
  if (typeof showToast === 'function') showToast(`🧾 Naimportováno ${ok.length} měsíců`);
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
