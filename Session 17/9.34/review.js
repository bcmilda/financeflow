// FinanceFlow · v9.34 · review.js · 2026-08-01
// ══════════════════════════════════════════════════════
//  MĚSÍČNÍ REVIEW (TODO-198, S17.34, Milan)
//  Hodnocení útrat 1–5 („Stálo to za to?"), aby appka poznala rozdíl mezi
//  2 000 Kč za večeři s rodinou a 2 000 Kč za impulzivní nákup – v datech jsou identické.
//
//  Tři pohledy nad stejnými daty:
//    A) SUMARIZACE   – skupiny (Jídlo, Auto, Alkohol…) vč. položek z účtenek
//    B) TOP 10       – největší jednotlivé útraty + skupiny
//    C) VŠE (admin)  – každá transakce zvlášť; slouží Milanovi k rozhodnutí,
//                      jestli má smysl sumarizace, nebo hodnotit položku po položce
//
//  DŮLEŽITÉ: appka NIKDY neoznačí útratu za zbytečnou sama. Hodnocení zadává jen uživatel;
//  AI/heuristika smí nanejvýš NAVRHNOUT a musí jít přepsat.
// ══════════════════════════════════════════════════════

let _revMode = 'sum';          // 'sum' | 'top' | 'all'
let _revMonth = null;          // {m,y} – null = aktuální zvolený měsíc

const REV_FACES = [
  { v: 5, ico: '😍', label: 'Rozhodně', col: '#4ade80' },
  { v: 4, ico: '🙂', label: 'Spíš ano', col: '#a3e635' },
  { v: 3, ico: '😐', label: 'Nevím',    col: '#fbbf24' },
  { v: 2, ico: '🙁', label: 'Spíš ne',  col: '#fb923c' },
  { v: 1, ico: '😖', label: 'Vůbec',    col: '#f87171' },
];

// ── Skupiny pro sumarizaci: klíčová slova z položek účtenek + názvů transakcí ──
// Milan chtěl vidět „rohlíky, sladkosti, pivo, alkohol, kafe" – tedy jemnější dělení,
// než dávají kategorie transakcí.
const REV_GROUPS = [
  { id:'pecivo',   name:'Pečivo',            ico:'🥐', kw:['rohlík','rohlik','chleb','houska','bageta','croissant','donut','kobliha','pletenec','veka','toust'] },
  { id:'sladke',   name:'Sladkosti',         ico:'🍫', kw:['čokolád','cokolad','bonbon','sušenk','susenk','oplatk','dezert','zmrzlin','kofila','nugát','nugat','rolka','wafer'] },
  { id:'pivo',     name:'Pivo',              ico:'🍺', kw:['pivo','plzeň','plzen','radegast','gambrin','birell','staropram','kozel','budvar'] },
  { id:'alkohol',  name:'Alkohol (tvrdý)',   ico:'🥃', kw:['vodka','rum','whisky','gin','tequila','becherovka','fernet','likér','liker','víno','vino','prosecco','sekt'] },
  { id:'kava',     name:'Káva a čaj',        ico:'☕', kw:['káva','kava','kafe','coffee','jacobs','nescafé','nescafe','espresso','čaj','caj'] },
  { id:'maso',     name:'Maso a uzeniny',    ico:'🥩', kw:['maso','kuře','kure','vepřov','veprov','hovězí','hovezi','šunka','sunka','salám','salam','klobás','klobas','párek','parek','slanin'] },
  { id:'mlecne',   name:'Mléčné výrobky',    ico:'🥛', kw:['mlék','mlek','sýr','syr','jogurt','tvaroh','máslo','maslo','smetan','tvarůžk'] },
  { id:'ovoce',    name:'Ovoce a zelenina',  ico:'🥦', kw:['jablk','banán','banan','pomeranč','pomeranc','citron','meloun','rajč','rajc','okurk','mrkev','cibul','brambor','kedlubn','zelenin','ovoce','hrušk','hrusk'] },
  { id:'napoje',   name:'Nápoje (nealko)',   ico:'🥤', kw:['džus','dzus','limonád','limonad','cola','voda','minerál','mineral','energet','ice tea','sirup'] },
  { id:'cigarety', name:'Cigarety',          ico:'🚬', kw:['cigaret','tabák','tabak','marlboro','camel','lucky','heets','iqos','nikotin','vape'] },
  { id:'drogerie', name:'Drogerie',          ico:'🧴', kw:['mýdl','mydl','šampon','sampon','zubní','zubni','prací','praci','jar ','saponát','saponat','toaletní','toaletni','papír','papir','pleny','plínk','plink'] },
  { id:'mazlicek', name:'Mazlíček',          ico:'🐶', kw:['granul','pamlsk','stelivo','pes','kočk','kock','zoo'] },
];

function _revGroupOf(name) {
  const n = (name || '').toLowerCase();
  for (const g of REV_GROUPS) if (g.kw.some(k => n.includes(k))) return g;
  return null;
}

// ── Sběr dat za měsíc: transakce + položky z účtenek ──
function _revCollect() {
  const D = getData();
  const m = _revMonth ? _revMonth.m : S.curMonth;
  const y = _revMonth ? _revMonth.y : S.curYear;
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`;

  const txs = (D.transactions || []).filter(t => {
    if (!t || t.type !== 'expense' || t.splitParent || t.isBalancing) return false;
    if (typeof isTransferTx === 'function' && isTransferTx(t)) return false;
    return String(t.date || '').slice(0, 7) === ym;
  });

  // položky z účtenek téhož měsíce (deduplikace jako v Analýze účtenek)
  const seen = new Set(), items = [];
  (S.receipts || []).forEach(r => {
    if (String(r.date || '').slice(0, 7) !== ym) return;
    const store = (typeof normalizeStoreName === 'function') ? normalizeStoreName(r.store) : (r.store || '');
    const sig = `${store}|${r.date}|${Math.round((r.total || 0) * 100)}|${(r.items || []).length}`;
    if (seen.has(sig)) return; seen.add(sig);
    (r.items || []).forEach(it => items.push({
      name: it.name || '', store,
      amount: (typeof lineAmt === 'function') ? lineAmt(it) : (it.price || 0) * (it.qty || 1),
      qty: it.qty || 1,
    }));
  });

  return { D, m, y, ym, txs, items };
}

// ── Sumarizace do skupin (transakce i položky z účtenek) ──
function _revSummarize(data) {
  const { D, txs, items } = data;
  const groups = {};
  const add = (key, name, ico, amount, cnt, src) => {
    if (!groups[key]) groups[key] = { key, name, ico, amount: 0, count: 0, fromItems: 0, fromTx: 0 };
    groups[key].amount += amount; groups[key].count += cnt;
    if (src === 'item') groups[key].fromItems += amount; else groups[key].fromTx += amount;
  };

  // 1) položky z účtenek → jemné skupiny (rohlíky, pivo, káva…)
  let itemsMatched = 0;
  items.forEach(it => {
    const g = _revGroupOf(it.name);
    if (g) { add(g.id, g.name, g.ico, it.amount, 1, 'item'); itemsMatched += it.amount; }
  });

  // 2) transakce → podle názvu do skupin, jinak podle kategorie
  //    POZOR: transakce z účtenek by se počítaly dvakrát, proto je vynecháme, pokud
  //    už jsme jejich položky zpracovali (poznají se podle poznámky/zdroje).
  txs.forEach(t => {
    const amt = (typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0);
    const isReceipt = /účtenk|uctenk|receipt/i.test(t.note || '') || t.fromReceipt;
    const g = _revGroupOf(t.name);
    if (g && !isReceipt) { add(g.id, g.name, g.ico, amt, 1, 'tx'); return; }
    if (isReceipt) return;  // detail je už v položkách
    const cat = (D.categories || []).find(c => c.id === t.catId);
    add('cat_' + (t.catId || 'none'), cat ? cat.name : 'Nezařazeno', cat ? cat.icon : '📦', amt, 1, 'tx');
  });

  return Object.values(groups).filter(g => g.amount > 0).sort((a, b) => b.amount - a.amount);
}

// ── Návrh hodnocení (heuristika, NE verdikt) ──
// Vychází z toho, co uživatel hodnotil dřív u stejné skupiny/kategorie. Když nemá historii,
// vrací null = „nevíme", a NIC nenavrhuje. Appka nesmí sama určovat, co je zbytečné.
function _revSuggest(key, D) {
  const hist = [];
  (D.transactions || []).forEach(t => {
    if (!t || !t.priority) return;
    const g = _revGroupOf(t.name);
    const k = g ? g.id : ('cat_' + (t.catId || 'none'));
    if (k === key) hist.push(t.priority);
  });
  if (hist.length < 3) return null;
  return Math.round(hist.reduce((a, b) => a + b, 0) / hist.length * 10) / 10;
}

// ── Uložení hodnocení ──
// Skupina → obodují se všechny transakce, které do ní spadají (nemá vlastní entitu).
function revRate(kind, id, value) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const D = getData();
  const data = _revCollect();
  let n = 0;
  if (kind === 'tx') {
    const t = (D.transactions || []).find(x => x.id === id);
    if (t) { t.priority = value; n = 1; }
  } else {
    data.txs.forEach(t => {
      const g = _revGroupOf(t.name);
      const k = g ? g.id : ('cat_' + (t.catId || 'none'));
      if (k === id) { t.priority = value; n++; }
    });
  }
  if (n) { save(); renderReview(); }
}

function revNote(kind, id) {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const D = getData();
  const t = (D.transactions || []).find(x => x.id === id);
  const cur = t ? (t.priorityNote || '') : '';
  const val = prompt('Poznámka – proč to (ne)stálo za to?\n(např. „narozeniny mámy", „koupil jsem zbytečně")', cur);
  if (val === null) return;
  if (t) { t.priorityNote = val.trim(); save(); renderReview(); }
}

function revSetMode(m) { _revMode = m; renderReview(); }

// ── Ovládací prvky hodnocení ──
function _revFaces(kind, id, cur, suggest) {
  return `<div style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">
    ${REV_FACES.map(f => `<button onclick="revRate('${kind}','${String(id).replace(/'/g, "\\'")}',${f.v})" title="${f.label}"
      style="width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.95rem;line-height:1;padding:0;
      border:1px solid ${cur === f.v ? f.col : 'var(--border)'};
      background:${cur === f.v ? f.col + '26' : 'transparent'};
      opacity:${cur && cur !== f.v ? '.4' : '1'}">${f.ico}</button>`).join('')}
    ${suggest ? `<span style="font-size:.64rem;color:#a8aec8;margin-left:4px" title="Průměr tvých dřívějších hodnocení – jen orientace, ne verdikt">Ø ${suggest}</span>` : ''}
  </div>`;
}

// ══ RENDER ══
function renderReview() {
  const el = document.getElementById('reviewContent'); if (!el) return;
  const data = _revCollect();
  const { D, m, y, txs, items } = data;

  if (!txs.length) {
    el.innerHTML = `<div class="empty" style="padding:22px"><div class="ei">📋</div>
      <div class="et">Za ${CZ_M[m]} ${y} nejsou žádné výdaje</div>
      <div style="font-size:.76rem;color:#a8aec8;margin-top:8px">Přepni měsíc v hlavičce aplikace.</div></div>`;
    return;
  }

  const total = txs.reduce((a, t) => a + ((typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0)), 0);
  const rated = txs.filter(t => t.priority);
  const ratedSum = rated.reduce((a, t) => a + ((typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0)), 0);
  const lowSum = txs.filter(t => t.priority && t.priority <= 2)
    .reduce((a, t) => a + ((typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0)), 0);
  const pctRated = total > 0 ? Math.round(ratedSum / total * 100) : 0;

  const isAdmin = (typeof window._currentUser !== 'undefined' && window._currentUser &&
                   window._currentUser.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1');

  const tab = (id, lbl) => `<button onclick="revSetMode('${id}')"
    style="flex:1;min-width:110px;padding:8px;border-radius:9px;font-size:.76rem;font-weight:700;cursor:pointer;
    border:1px solid ${_revMode === id ? 'rgba(139,124,246,.5)' : 'var(--border)'};
    background:${_revMode === id ? 'rgba(139,124,246,.14)' : 'transparent'};
    color:${_revMode === id ? '#b9aefc' : '#a8aec8'}">${lbl}</button>`;

  let h = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-header">
        <span class="card-title">🎯 Stálo to za to? – ${CZ_M[m]} ${y}</span>
        <span style="font-size:.7rem;color:#a8aec8">${rated.length}/${txs.length} ohodnoceno</span>
      </div>
      <div class="card-body">
        <div style="font-size:.78rem;color:#c9cede;line-height:1.6;margin-bottom:12px">
          Appka ví, <strong>kam</strong> peníze šly. Neví, jestli ti to za to stálo – a přesně v tom se skrývají zbytečné útraty.
          Ohodnoť to a za pár měsíců uvidíš vzorce, které z čísel samotných nevykoukáš.
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin-bottom:12px">
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;min-width:0">
            <div style="font-size:.66rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Výdaje měsíce</div>
            <div class="stat-value-h" style="color:#e8eaf2">${fmt(Math.round(total))}</div>
          </div>
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;min-width:0">
            <div style="font-size:.66rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Ohodnoceno</div>
            <div class="stat-value-h" style="color:var(--bank)">${pctRated} %</div>
          </div>
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px;min-width:0">
            <div style="font-size:.66rem;color:#a8aec8;text-transform:uppercase;letter-spacing:.05em">Hodnoceno 🙁/😖</div>
            <div class="stat-value-h" style="color:${lowSum > 0 ? 'var(--expense)' : '#a8aec8'}">${fmt(Math.round(lowSum))}</div>
          </div>
        </div>
        ${lowSum > 0 ? `<div style="padding:9px 12px;border-radius:9px;background:var(--surface3);border-left:3px solid var(--income);font-size:.78rem;color:#c9cede;line-height:1.55">
          💡 Útraty, které sám hodnotíš nízko, dělají <strong>${fmt(Math.round(lowSum))} Kč</strong>.
          Kdybys polovinu příště přesměroval do rezervy, je to <strong style="color:var(--income)">${fmt(Math.round(lowSum * 6))} Kč za rok</strong>.
        </div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
          ${tab('sum', '📦 Sumarizace')}${tab('top', '🔟 Top 10')}${isAdmin ? tab('all', '🔬 Vše (admin)') : ''}
        </div>
      </div>
    </div>`;

  if (_revMode === 'sum')      h += _revRenderGroups(data);
  else if (_revMode === 'top') h += _revRenderTop(data);
  else                          h += _revRenderAll(data);

  el.innerHTML = h;
}

// ── A) SUMARIZACE ──
function _revRenderGroups(data) {
  const { D, items } = data;
  const groups = _revSummarize(data);
  if (!groups.length) return '';
  const max = Math.max(...groups.map(g => g.amount), 1);
  const itemGroups = groups.filter(g => g.fromItems > 0).length;

  return `<div class="card">
    <div class="card-header"><span class="card-title">📦 Podle skupin</span>
      <span style="font-size:.7rem;color:#a8aec8">${groups.length} skupin${itemGroups ? ` · ${itemGroups} z účtenek` : ''}</span></div>
    <div class="card-body">
      <div style="font-size:.74rem;color:#a8aec8;margin-bottom:11px;line-height:1.55">
        Skupiny vznikají z <strong>položek na účtenkách</strong> (pečivo, sladkosti, pivo, káva…) a z kategorií transakcí.
        Ohodnoť celou skupinu naráz – hodnocení se propíše do všech transakcí, které do ní spadají.
      </div>
      ${groups.map(g => {
        const sug = _revSuggest(g.key, D);
        const cur = _revGroupRating(g.key, data);
        return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:1.1rem">${g.ico}</span>
            <div style="flex:1;min-width:120px">
              <div style="font-size:.85rem;font-weight:700;color:#e8eaf2">${g.name}</div>
              <div style="font-size:.66rem;color:#a8aec8">${g.count}× ${g.fromItems > 0 ? `· ${fmt(Math.round(g.fromItems))} Kč z účtenek` : ''}</div>
            </div>
            <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:800;color:var(--expense);white-space:nowrap">${fmt(Math.round(g.amount))} Kč</div>
          </div>
          <div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden;margin-bottom:7px">
            <div style="height:100%;width:${Math.round(g.amount / max * 100)}%;background:var(--expense);opacity:.6;border-radius:2px"></div>
          </div>
          ${_revFaces('group', g.key, cur, sug)}
        </div>`;
      }).join('')}
    </div></div>`;
}

function _revGroupRating(key, data) {
  const rs = data.txs.filter(t => {
    const g = _revGroupOf(t.name);
    return (g ? g.id : ('cat_' + (t.catId || 'none'))) === key && t.priority;
  }).map(t => t.priority);
  if (!rs.length) return null;
  return Math.round(rs.reduce((a, b) => a + b, 0) / rs.length);
}

// ── B) TOP 10 ──
function _revRenderTop(data) {
  const { D, txs } = data;
  const amt = t => (typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0);
  const top = [...txs].sort((a, b) => amt(b) - amt(a)).slice(0, 10);
  const groups = _revSummarize(data).slice(0, 5);

  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🔟 Největší útraty měsíce</span></div>
    <div class="card-body">
      <div style="font-size:.74rem;color:#a8aec8;margin-bottom:11px;line-height:1.55">
        Deset největších položek. Když ohodnotíš jen tyhle, pokryješ obvykle většinu objemu za dvě minuty.
      </div>
      ${top.map(t => {
        const cat = (D.categories || []).find(c => c.id === t.catId);
        return `<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:1rem">${cat ? cat.icon : '📦'}</span>
            <div style="flex:1;min-width:130px">
              <div style="font-size:.84rem;color:#e8eaf2">${t.name || (cat ? cat.name : 'Bez názvu')}</div>
              <div style="font-size:.65rem;color:#a8aec8">${t.date}${t.priorityNote ? ` · 💬 ${t.priorityNote}` : ''}</div>
            </div>
            <div style="font-family:Syne,sans-serif;font-size:.95rem;font-weight:800;color:var(--expense);white-space:nowrap">${fmt(Math.round(amt(t)))} Kč</div>
          </div>
          <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
            ${_revFaces('tx', t.id, t.priority, null)}
            <button onclick="revNote('tx','${t.id}')" style="padding:4px 9px;border-radius:7px;font-size:.68rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:#a8aec8">💬 Poznámka</button>
          </div>
        </div>`;
      }).join('')}
    </div></div>
    ${groups.length ? `<div class="card">
      <div class="card-header"><span class="card-title">📦 Top 5 skupin</span><span style="font-size:.7rem;color:#a8aec8">vč. položek z účtenek</span></div>
      <div class="card-body">
        ${groups.map(g => `<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:1rem">${g.ico}</span>
            <div style="flex:1;min-width:120px"><div style="font-size:.84rem;color:#e8eaf2">${g.name}</div>
              <div style="font-size:.65rem;color:#a8aec8">${g.count}×</div></div>
            <div style="font-family:Syne,sans-serif;font-size:.95rem;font-weight:800;color:var(--expense);white-space:nowrap">${fmt(Math.round(g.amount))} Kč</div>
          </div>
          ${_revFaces('group', g.key, _revGroupRating(g.key, data), _revSuggest(g.key, D))}
        </div>`).join('')}
      </div></div>` : ''}`;
}

// ── C) VŠE (admin) – Milanův test: sumarizace vs. položka po položce ──
function _revRenderAll(data) {
  const { D, txs } = data;
  const amt = t => (typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0);
  const sorted = [...txs].sort((a, b) => amt(b) - amt(a));
  const groups = _revSummarize(data);

  // srovnání pracnosti obou cest
  const covByTop = sorted.slice(0, 10).reduce((a, t) => a + amt(t), 0);
  const covByGroups5 = groups.slice(0, 5).reduce((a, g) => a + g.amount, 0);
  const total = sorted.reduce((a, t) => a + amt(t), 0) || 1;

  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">🔬 Srovnání přístupů</span><span style="font-size:.7rem;color:#a8aec8">jen admin</span></div>
    <div class="card-body">
      <div style="font-size:.76rem;color:#c9cede;line-height:1.6;margin-bottom:10px">
        Kolik objemu výdajů pokryješ, když ohodnotíš jen prvních N:
      </div>
      <table class="stat-table" style="width:100%;font-size:.78rem">
        <thead><tr><th style="text-align:left">Přístup</th><th>Kliků</th><th>Pokrytí objemu</th></tr></thead>
        <tbody>
          <tr><td style="text-align:left">📦 Top 5 skupin</td><td style="text-align:center">5</td>
            <td style="text-align:center;font-weight:700;color:var(--income)">${Math.round(covByGroups5 / total * 100)} %</td></tr>
          <tr><td style="text-align:left">🔟 Top 10 transakcí</td><td style="text-align:center">10</td>
            <td style="text-align:center;font-weight:700;color:var(--bank)">${Math.round(covByTop / total * 100)} %</td></tr>
          <tr><td style="text-align:left">🔬 Všechny transakce</td><td style="text-align:center">${sorted.length}</td>
            <td style="text-align:center;font-weight:700;color:#a8aec8">100 %</td></tr>
        </tbody>
      </table>
      <div style="font-size:.72rem;color:#a8aec8;margin-top:9px;line-height:1.55">
        Když skupiny pokryjí podobný objem při násobně menším počtu kliků, má smysl jít cestou sumarizace.
        Rozdíl v pokrytí uvidíš spolehlivě až po pár měsících dat.
      </div>
    </div></div>

    <div class="card">
      <div class="card-header"><span class="card-title">📋 Všechny transakce (${sorted.length})</span></div>
      <div class="card-body">
        ${sorted.map(t => {
          const cat = (D.categories || []).find(c => c.id === t.catId);
          const g = _revGroupOf(t.name);
          return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
              <span>${cat ? cat.icon : '📦'}</span>
              <div style="flex:1;min-width:130px">
                <div style="font-size:.8rem;color:#e8eaf2">${t.name || (cat ? cat.name : 'Bez názvu')}
                  ${g ? `<span style="font-size:.62rem;background:rgba(139,124,246,.18);color:#b9aefc;padding:1px 5px;border-radius:4px;margin-left:4px">${g.ico} ${g.name}</span>` : ''}</div>
                <div style="font-size:.64rem;color:#a8aec8">${t.date}${t.priorityNote ? ` · 💬 ${t.priorityNote}` : ''}</div>
              </div>
              <div style="font-size:.86rem;font-weight:700;color:var(--expense);white-space:nowrap">${fmt(Math.round(amt(t)))} Kč</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              ${_revFaces('tx', t.id, t.priority, null)}
              <button onclick="revNote('tx','${t.id}')" style="padding:3px 8px;border-radius:7px;font-size:.66rem;cursor:pointer;border:1px solid var(--border);background:transparent;color:#a8aec8">💬</button>
            </div>
          </div>`;
        }).join('')}
      </div></div>`;
}
