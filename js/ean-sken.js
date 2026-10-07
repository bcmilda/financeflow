// FinanceFlow · v11.43 · ean-sken.js · 2026-10-07
// ══════════════════════════════════════════════════════
//  S24 (TODO-306 + TODO-308): ČÁROVÝ KÓD K POLOŽCE ÚČTENKY
//  cesta: Účtenky → 📸 Skenovat → editor účtenky → 📷 u položky
//
//  Na účtence EAN není, jen zkratka („K EXO VLOCK"). Uživatel vyfotí kód na
//  obalu a appka se dozví, co to doopravdy je (název, značka, gramáž, Nutri-Score…).
//  Zároveň vznikne spojení „obchod + zkratka → EAN", přes které Mapa položek
//  pozná stejný výrobek v různých obchodech.
//
//  Bez ručního psaní (Milan, S24): živá kamera, a když nejde (starší telefon,
//  appka z Play), „📸 Vyfotit kód" = fotka z fotoaparátu, kód se přečte z ní.
//
//  Data jdou přes worker (/ean): databáze chtějí vlastní User-Agent, výsledek
//  se sdílí v community/eanProdukty. Klient do komunity nikdy nezapisuje.
// ══════════════════════════════════════════════════════

const EAN_WORKER = (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://misty-limit-0523.bc-milda.workers.dev';
const EAN_ZXING = ['https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js',
                   'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js'];

let _eanStav = { i: -1, cil: null, stream: null, bezi: false, detektor: null, zxing: null, vysledek: null };
const EAN_DB = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';
let _eanProdukty = {}, _eanAliasy = null;

// ── čistá logika (testuje tools/smoke_ean_sken.js) ──
function eanKontrola(kod) {
  const s = String(kod || '').replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(s.length)) return false;
  const c = s.split('').map(Number), k = c.pop();
  let sum = 0; c.reverse().forEach((n, j) => { sum += n * (j % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === k;
}
//  Kód z obchodu (prefix 2): vážené zboží, pečivo – mezi obchody nic nespojí.
function eanJeObchodni(kod) { const s = String(kod || ''); return (s.length === 13 || s.length === 8) && s[0] === '2'; }

//  Klíč spojení „obchod + zkratka". Musí sedět s workerem (/^[a-z0-9_,-]{3,150}$/)
//  a s normKey – jinak by „K EXO VLOCK 500G" a „k exo vlock 500 g" byly dva záznamy.
//  Gramáž v klíči ZŮSTÁVÁ: 250 g a 500 g jsou dva různé kódy.
function eanAliasKlic(obchod, raw) {
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  const nk = (typeof normKey === 'function') ? normKey : nn;
  const o = nn((typeof normalizeStoreName === 'function') ? normalizeStoreName(obchod || '') : (obchod || '')) || 'obchod';
  const k = nk(raw || '');
  if (!k) return '';
  return (o + '__' + k).replace(/ /g, '_').replace(/\./g, ',').replace(/[^a-z0-9_,-]/g, '').slice(0, 150);
}
Object.assign(window, { eanKontrola, eanJeObchodni, eanAliasKlic });

async function eanDotaz(telo) {
  const token = await window._currentUser?.getIdToken?.();
  if (!token) throw new Error('Čárový kód funguje jen po přihlášení.');
  const r = await fetch(EAN_WORKER + '/ean', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(telo),
  });
  let d = null; try { d = await r.json(); } catch (e) {}
  if (!r.ok || !d || !d.ok) throw new Error((d && d.error) || ('Server odpověděl ' + r.status));
  return d;
}

// ── S24 (v11.09): data pro kartu výrobku v Mapě položek ──
//  Výrobek čteme přímo z community/eanProdukty (číst smí každý přihlášený,
//  zapisuje jen worker). Vlastní spojení „obchod + zkratka → EAN" leží
//  v users/{uid}/eanAliasy (zapisuje worker při přiřazení).
async function eanNactiProdukt(ean) {
  if (!ean) return null;
  if (_eanProdukty[ean] !== undefined) return _eanProdukty[ean];
  try {
    const t = await window._currentUser?.getIdToken?.(); if (!t) return null;
    const r = await fetch(`${EAN_DB}/community/eanProdukty/${ean}.json?auth=${t}`);
    _eanProdukty[ean] = (r.ok ? await r.json() : null) || null;
  } catch (e) { return null; }
  //  S24 (v11.25, Milan: „proč český název chybí, když je 5 zdrojů?"): výrobek
  //  uložený dřív, než worker uměl AI (bez aiKdy), se doplnil jen při novém
  //  skenu. Karta ho četla přímo z databáze, takže zůstal bez českého názvu.
  //  Teď ho karta jednou pošle přes worker, ten AI zavolá a výsledek uloží.
  const p = _eanProdukty[ean];
  if (p && p.stav === 'nalezeno' && !p.aiKdy && !p.nazevCesky) {
    try { const d = await eanDotaz({ ean }); if (d && d.produkt) _eanProdukty[ean] = d.produkt; } catch (e) {}
  }
  return _eanProdukty[ean];
}
async function eanNactiAliasy(vynutit) {
  if (_eanAliasy && !vynutit) return _eanAliasy;
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (!uid || !t) return _eanAliasy || {};
    const r = await fetch(`${EAN_DB}/users/${uid}/eanAliasy.json?auth=${t}`);
    _eanAliasy = (r.ok ? await r.json() : null) || {};
  } catch (e) { _eanAliasy = _eanAliasy || {}; }
  return _eanAliasy;
}
//  S24 (v11.23): synchronní přístup k už načteným výrobkům (pro zařazení do taxonomie).
function eanProduktZCache(ean) { return (ean && _eanProdukty[ean]) || null; }
//  Načte výrobky pro víc kódů najednou (Mapa položek po otevření).
async function eanNactiVse(eany) {
  const u = [...new Set((eany || []).filter(e => e && _eanProdukty[e] === undefined))];
  await Promise.all(u.slice(0, 80).map(e => eanNactiProdukt(e)));
  return u.length;
}
//  Název výrobku pro zobrazení: český z databáze → český od AI → původní.
//  v11.24: tvůj vlastní český název má přednost (platí jen pro tebe).
function eanNazevVyrobku(p, ean) {
  const moje = ean && _eanMojeNazvy && _eanMojeNazvy[ean] && _eanMojeNazvy[ean].nazev;
  if (moje) return moje;
  return p ? (p.nazevCesky ? p.nazev : (p.nazevCs || p.nazev || '')) : '';
}
Object.assign(window, { eanProduktZCache, eanNactiVse, eanNazevVyrobku });

function eanAliasPro(obchod, raw) {
  const k = eanAliasKlic(obchod, raw);
  return (k && _eanAliasy && _eanAliasy[k] && _eanAliasy[k].ean) || '';
}

//  Semafor nutričních hodnot na 100 g podle britského systému „traffic light"
//  (Food Standards Agency): zelená = nízký obsah, oranžová = střední, červená = vysoký.
const EAN_SEMAFOR = {
  tuky: [3, 17.5, 'Tuky'], nasycene: [1.5, 5, 'z toho nasycené'],
  cukry: [5, 22.5, 'Cukry'], sul: [0.3, 1.5, 'Sůl'],
};
function eanSemaforUroven(klic, hodnota) {
  const h = EAN_SEMAFOR[klic]; if (!h || hodnota == null) return null;
  return hodnota <= h[0] ? 'nizka' : hodnota > h[1] ? 'vysoka' : 'stredni';
}
function eanNutriceHTML(n) {
  if (!n || !Object.keys(n).length) return '';
  const barva = { nizka: '#34d399', stredni: '#fbbf24', vysoka: '#f87171' };
  const slovo = { nizka: 'nízký', stredni: 'střední', vysoky: 'vysoký', vysoka: 'vysoký' };
  const fmt = v => String(v).replace('.', ',');
  const pasky = Object.keys(EAN_SEMAFOR).filter(k => n[k] != null).map(k => {
    const [, vys, nazev] = EAN_SEMAFOR[k]; const u = eanSemaforUroven(k, n[k]);
    const sirka = Math.max(4, Math.min(100, n[k] / (vys * 1.5) * 100));
    return `<div style="margin:5px 0">
      <div style="display:flex;justify-content:space-between;font-size:.74rem"><span style="color:#a8aec8">${nazev}</span>
        <span style="color:var(--text)">${fmt(n[k])} g <span style="color:${barva[u]};font-size:.66rem">· ${slovo[u]}</span></span></div>
      <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-top:3px">
        <div style="width:${sirka}%;height:100%;background:${barva[u]}"></div></div>
    </div>`;
  }).join('');
  const ostatni = [['kcal', 'Energie', ' kcal'], ['bilkoviny', 'Bílkoviny', ' g'], ['sacharidy', 'Sacharidy', ' g'], ['vlaknina', 'Vláknina', ' g']]
    .filter(([k]) => n[k] != null)
    .map(([k, l, j]) => `<div style="display:flex;justify-content:space-between;font-size:.74rem"><span style="color:#a8aec8">${l}</span><span>${fmt(n[k])}${j}</span></div>`).join('');
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 16px">${ostatni}</div>${pasky}`;
}
Object.assign(window, { eanNactiProdukt, eanNactiAliasy, eanAliasPro, eanNutriceHTML, eanSemaforUroven });

// ── okno skeneru ──
function eanOkno() {
  let o = document.getElementById('eanOkno');
  if (o) return o;
  o = document.createElement('div');
  o.id = 'eanOkno';
  o.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(8,10,20,.96);display:flex;flex-direction:column;align-items:center;overflow:auto;padding:16px 14px calc(16px + env(safe-area-inset-bottom))';
  o.innerHTML = `
    <div style="width:100%;max-width:460px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="font-weight:700;font-size:.95rem;flex:1;color:var(--text)">📷 Čárový kód k položce</div>
        <button onclick="eanZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button>
      </div>
      <div id="eanPolozka" style="font-size:.78rem;color:#a8aec8;margin-bottom:6px"></div>
      <div style="font-size:.72rem;color:#a8aec8;line-height:1.5;margin-bottom:10px;background:var(--surface2);border-radius:9px;padding:8px 10px">
        💡 Na účtence je jen zkratka. Čárový kód z obalu řekne, co to <b style="color:var(--text)">přesně je</b> – název, značku, gramáž, složení a Nutri-Score –
        a appka pak pozná stejný výrobek i v jiném obchodě. Stačí jednou; ostatním uživatelům se kód ke stejné zkratce nabídne sám.</div>
      <div id="eanKamera" style="position:relative;border-radius:14px;overflow:hidden;background:#000;aspect-ratio:4/3;display:none">
        <video id="eanVideo" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;left:10%;right:10%;top:42%;height:16%;border:2px solid #60a5fa;border-radius:10px;box-shadow:0 0 0 999px rgba(0,0,0,.25)"></div>
      </div>
      <div id="eanZprava" style="font-size:.8rem;color:var(--text);margin:10px 0;line-height:1.5"></div>
      <div id="eanTlacitka" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" id="eanSvetlo" style="display:none" onclick="eanSvetlo()">🔦 Světlo</button>
        <label class="btn btn-sm" style="cursor:pointer">📸 Vyfotit kód
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="eanZFotky(this.files[0]);this.value=''">
        </label>
        <label class="btn btn-sm" style="cursor:pointer">🖼️ Ze souboru
          <input type="file" accept="image/*" style="display:none" onchange="eanZFotky(this.files[0]);this.value=''">
        </label>
      </div>
      <div id="eanVysledek" style="margin-top:12px"></div>
      <button class="btn" style="width:100%;margin-top:14px" onclick="eanZavri()">✕ Zavřít</button>
      <div style="font-size:.66rem;color:#a8aec8;margin-top:6px;text-align:center">Název, fotky i přiřazení se ukládají hned – zavřením nic neztratíš.</div>
      <div style="font-size:.66rem;color:#a8aec8;margin-top:10px">Data o výrobcích: Open Food Facts a sesterské databáze (licence ODbL).</div>
    </div>`;
  document.body.appendChild(o);
  return o;
}

function eanZprava(t, chyba) {
  const el = document.getElementById('eanZprava'); if (!el) return;
  el.style.color = chyba ? 'var(--expense)' : 'var(--text)';
  el.innerHTML = t;
}

//  Z editoru účtenky (index položky).
async function eanSkenuj(i) {
  const r = window._editReceipt; const it = r?.items?.[i];
  if (!it) return;
  return eanSkenujPolozku({ raw: it.name || '', obchod: r.store || '', ean: it.ean || '', eanNazev: it.eanNazev || '', i });
}
//  Obecně (editor i karta v Mapě položek): cil = {raw, obchod, ean?, i?, hotovo?(ean, produkt)}.
async function eanSkenujPolozku(cil) {
  _eanStav.cil = cil; _eanStav.i = cil.i != null ? cil.i : -1; _eanStav.vysledek = null;
  eanOkno();
  document.getElementById('eanPolozka').innerHTML =
    'Položka z účtenky: <b style="color:var(--text)">' + escHtml(cil.raw || '—') + '</b>'
    + (cil.obchod ? ' · ' + escHtml(cil.obchod) : '')
    + (cil.ean ? '<br>Teď přiřazeno: ' + escHtml(cil.ean) + (cil.eanNazev ? ' · ' + escHtml(cil.eanNazev) : '') : '');
  document.getElementById('eanVysledek').innerHTML = '';
  await eanStartKamery();
}

async function eanStartKamery() {
  eanZprava('⏳ Zapínám kameru…');
  //  1) kamera hned po kliknutí (Android chce žádost přímo z dotyku)
  try {
    try {
      _eanStav.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } });
    } catch (e1) {
      if (e1.name === 'OverconstrainedError' || e1.name === 'NotFoundError') _eanStav.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      else throw e1;
    }
  } catch (e) {
    eanZprava('Kamera se nespustila' + (e && e.name ? ' (' + escHtml(e.name) + ')' : '') + '. Použij <b>📸 Vyfotit kód</b> – kód se přečte z fotky.', true);
    return;
  }
  const v = document.getElementById('eanVideo');
  document.getElementById('eanKamera').style.display = 'block';
  v.srcObject = _eanStav.stream;
  try { await v.play(); } catch (e) {}
  try {
    const t = _eanStav.stream.getVideoTracks()[0];
    if (t.getCapabilities && t.getCapabilities().torch) document.getElementById('eanSvetlo').style.display = '';
  } catch (e) {}
  //  2) čtečka až po kameře – když se nenačte, zbývá fotka
  eanZprava('⏳ Připravuji čtečku…');
  const jak = await eanPripravCtecku();
  if (!jak) { eanZprava('Čtečku se nepodařilo načíst (jsi online?). Zkus <b>📸 Vyfotit kód</b>.', true); return; }
  eanZprava('Namiř kameru na čárový kód na obalu.');
  _eanStav.bezi = true;
  if (_eanStav.detektor) eanSmyckaNativni(); else eanSmyckaZxing();
}

async function eanPripravCtecku() {
  if (_eanStav.detektor || _eanStav.zxing) return true;
  if ('BarcodeDetector' in window) {
    try {
      const f = await window.BarcodeDetector.getSupportedFormats();
      if (f.includes('ean_13')) { _eanStav.detektor = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }); return true; }
    } catch (e) {}
  }
  for (const url of EAN_ZXING) {
    try {
      if (!window.ZXingBrowser) await new Promise((res, rej) => {
        const sc = document.createElement('script'); sc.src = url; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
      });
      _eanStav.zxing = new window.ZXingBrowser.BrowserMultiFormatReader();
      return true;
    } catch (e) {}
  }
  return false;
}

async function eanSmyckaNativni() {
  const v = document.getElementById('eanVideo');
  while (_eanStav.bezi) {
    try {
      const kody = await _eanStav.detektor.detect(v);
      const k = kody.find(x => eanKontrola(x.rawValue));
      if (k) { navigator.vibrate?.(60); eanStopKamery(); eanNalezen(k.rawValue); return; }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 250));
  }
}
function eanSmyckaZxing() {
  _eanStav.zxing.decodeFromVideoElement(document.getElementById('eanVideo'), (res) => {
    if (!res || !_eanStav.bezi) return;
    const k = res.getText(); if (!eanKontrola(k)) return;
    navigator.vibrate?.(60); eanStopKamery(); eanNalezen(k);
  }).catch(() => {});
}

//  Fotka místo živé kamery. Přečte kód z obrázku stejnou čtečkou.
async function eanZFotky(soubor) {
  if (!soubor) return;
  eanStopKamery();
  eanZprava('⏳ Čtu kód z fotky…');
  const ok = await eanPripravCtecku();
  if (!ok) { eanZprava('Čtečku se nepodařilo načíst (jsi online?).', true); return; }
  const url = URL.createObjectURL(soubor);
  try {
    let kod = null;
    if (_eanStav.detektor) {
      const img = await window.createImageBitmap(soubor);
      const kody = await _eanStav.detektor.detect(img);
      kod = (kody.find(x => eanKontrola(x.rawValue)) || {}).rawValue || null;
    } else {
      try { const res = await _eanStav.zxing.decodeFromImageUrl(url); kod = res && res.getText(); } catch (e) {}
    }
    if (kod && eanKontrola(kod)) eanNalezen(kod);
    else eanZprava('Na fotce jsem kód nenašel. Vyfoť ho zblízka, ostře a celý (i s čísly pod čarami).', true);
  } finally { URL.revokeObjectURL(url); }
}

function eanStopKamery() {
  _eanStav.bezi = false;
  try { _eanStav.zxing && _eanStav.zxing.reset && _eanStav.zxing.reset(); } catch (e) {}
  if (_eanStav.stream) { _eanStav.stream.getTracks().forEach(t => t.stop()); _eanStav.stream = null; }
  const k = document.getElementById('eanKamera'); if (k) k.style.display = 'none';
  const s = document.getElementById('eanSvetlo'); if (s) s.style.display = 'none';
}

async function eanSvetlo() {
  const t = _eanStav.stream && _eanStav.stream.getVideoTracks()[0]; if (!t) return;
  try { await t.applyConstraints({ advanced: [{ torch: !(t.getSettings().torch) }] }); } catch (e) {}
}

function eanZavri() {
  eanStopKamery();
  const o = document.getElementById('eanOkno'); if (o) o.remove();
  if (typeof eanNaskenovaneKresli === 'function') setTimeout(eanNaskenovaneKresli, 0);   // S25
}

// ── výsledek ──
const EAN_NUTRI_BARVA = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };

function eanKartaHTML(p, ean) {
  if (!p || p.stav !== 'nalezeno') {
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:.8rem;line-height:1.5">
      <b>Kód ${escHtml(ean)}</b> zatím nezná žádná databáze.<br>
      <span style="color:#a8aec8">Přiřadit se i tak vyplatí: položka tím dostane jednoznačnou identitu a ve všech obchodech se spojí se stejným výrobkem. Pak v kartě výrobku stačí 📸 vyfotit obal, nebo ho přidej do <a href="https://world.openfoodfacts.org/cgi/product.pl?type=search_or_add&code=${encodeURIComponent(ean)}" target="_blank" rel="noopener" style="color:#60a5fa">Open Food Facts</a>.</span>
    </div>`;
  }
  const mn = p.mnozstvi ? `${p.mnozstvi.hodnota >= 1000 ? (p.mnozstvi.hodnota / 1000).toLocaleString('cs-CZ') + (p.mnozstvi.jednotka === 'g' ? ' kg' : ' l') : p.mnozstvi.hodnota + ' ' + p.mnozstvi.jednotka}` : '';
  const ns = p.nutriscore ? `<span title="Nutri-Score: celková nutriční kvalita (A nejlepší, E nejhorší)" style="background:${EAN_NUTRI_BARVA[p.nutriscore]};color:#fff;font-weight:800;border-radius:6px;padding:2px 7px;font-size:.72rem">Nutri-Score ${p.nutriscore.toUpperCase()}</span>` : '';
  const nova = p.nova ? `<span title="NOVA: míra průmyslového zpracování (1 nezpracované … 4 ultra-zpracované)" style="border:1px solid var(--border);border-radius:6px;padding:2px 7px;font-size:.72rem">NOVA ${p.nova}</span>` : '';
  const stitky = (p.stitky || []).map(s => `<span style="border:1px solid #34d39966;color:var(--income);border-radius:6px;padding:2px 7px;font-size:.7rem">${escHtml(s)}</span>`).join('');
  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;display:flex;gap:12px">
    ${p.foto ? `<img src="${escHtml(p.foto)}" alt="" style="width:76px;height:76px;object-fit:contain;background:#fff;border-radius:10px;flex-shrink:0">` : ''}
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:.9rem;color:var(--text);overflow-wrap:anywhere">${escHtml(eanNazevVyrobku(p) || '(bez názvu)')}${!p.nazevCesky && !p.nazevCs && p.nazev ? ' <span style="font-size:.64rem;color:#fbbf24;font-weight:500">(název není česky)</span>' : ''}</div>
      ${!p.nazevCesky && p.nazevCs && p.nazev ? `<div style="font-size:.64rem;color:#8b93ad">na obalu: ${escHtml(p.nazev)}</div>` : ''}
      <div style="font-size:.74rem;color:#a8aec8;margin-top:2px">${[escHtml(p.znacka || ''), escHtml(mn), escHtml(ean)].filter(Boolean).join(' · ')}</div>
      ${p.konkretni ? `<div style="font-size:.72rem;color:#a8aec8;margin-top:3px">🗺️ ${escHtml([p.obecny, p.konkretni].filter(Boolean).join(' → '))}</div>` : ''}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">${ns}${nova}${stitky}</div>
    </div>
  </div>${(p.nutriceObal || p.nutrice) ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-top:8px">
    <div style="font-size:.74rem;font-weight:700;margin-bottom:6px">Nutriční hodnoty na 100 ${(p.nutriceObal || p.nutrice || {}).na === 'ml' ? 'ml' : 'g'}${p.nutriceObal ? ' <span style="font-weight:500;color:#a8aec8">· ' + eanZivinyZdroj(p.nutriceObal) + '</span>' : ''}</div>${eanNutriceHTML(p.nutriceObal || p.nutrice)}</div>` : ''}${(p.slozeniObal || p.slozeni) ? `<details style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-top:8px">
    <summary style="font-size:.74rem;font-weight:700;cursor:pointer">Složení${p.slozeniObal ? ' <span style="font-weight:500;color:#a8aec8">· z fotky obalu</span>' : ''}</summary>
    <div style="font-size:.74rem;color:#c9cede;line-height:1.5;margin-top:6px">${escHtml(p.slozeniObal || p.slozeni)}</div></details>` : ''}`;
}
window.eanKartaHTML = eanKartaHTML;

async function eanNalezen(kod) {
  const ean = String(kod).replace(/\D/g, '');
  if (eanJeObchodni(ean)) {
    eanZprava('Tohle je <b>kód obchodu</b> (vážené zboží, pečivo nebo akční štítek). Mezi obchody nic nespojí, takže ho nepřiřazuji. Hledej na obalu kód výrobce.', true);
    return;
  }
  eanZprava('⏳ Hledám výrobek ' + escHtml(ean) + '…');
  try {
    const d = await eanDotaz({ ean });
    _eanStav.vysledek = { ean, produkt: d.produkt || null };
    eanZapamatuj(ean);   // S25: naskenovaný výrobek zůstane v seznamu i po zavření okna
    eanZprava(d.produkt && d.produkt.stav === 'nalezeno' ? '✅ Nalezeno' + (d.produkt.zdroj ? ' · ' + escHtml(d.produkt.zdroj) : '') : '🤷 Kód je platný, výrobek zatím nikdo nezapsal.');
    if (d.produkt) _eanProdukty[ean] = d.produkt;
    const volne = !!(_eanStav.cil && _eanStav.cil.volne);
    document.getElementById('eanVysledek').innerHTML = eanKartaHTML(d.produkt, ean)
      + (volne ? `<div style="margin-top:8px">${eanNazvyHTML(d.produkt && d.produkt.stav === 'nalezeno' ? d.produkt : {}, ean, 'sk')}${eanFotoTlacitkaHTML(ean, d.produkt, 'eanVolneObnov')}</div>` : '') + `
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-primary" style="flex:1" onclick="${volne ? 'eanVyberPolozku()' : 'eanPrirad()'}">${volne ? '🔗 Přiřadit k položce z účtenky' : '✅ Přiřadit k položce'}</button>
        <button class="btn" onclick="document.getElementById('eanVysledek').innerHTML='';eanStartKamery()">↺ Skenovat znovu</button>
      </div>`;
  } catch (e) {
    eanZprava('⚠️ ' + escHtml(e.message || 'Hledání selhalo'), true);
  }
}

async function eanPrirad() {
  const cil = _eanStav.cil || {}; const v = _eanStav.vysledek;
  if (!v) return;
  const p = v.produkt && v.produkt.stav === 'nalezeno' ? v.produkt : null;
  //  V editoru se kód zapíše i k položce účtenky (uloží se s účtenkou).
  const r = window._editReceipt; const it = (cil.i >= 0) ? r?.items?.[cil.i] : null;
  if (it) {
    it.ean = v.ean;
    if (p && eanNazevVyrobku(p)) it.eanNazev = eanNazevVyrobku(p).slice(0, 100); else delete it.eanNazev;
  }
  if (p) _eanProdukty[v.ean] = p;
  //  Spojení „obchod + zkratka → EAN" uloží worker (komunita bez uid).
  //  Když se to nepovede (offline), kód u položky zůstane a spojení se
  //  dá doplnit příštím skenem – účtenka se kvůli tomu nezdrží.
  const klic = eanAliasKlic(cil.obchod, cil.raw);
  let hlaska = '✅ Kód přiřazen';
  if (klic) {
    try {
      const d = await eanDotaz({ ean: v.ean, potvrdit: true, klic, obchod: cil.obchod || '', raw: cil.raw || '' });
      if (d.alias && d.alias.pocet > 1) hlaska += ' · potvrzeno už ' + d.alias.pocet + '×';
      if (_eanAliasy) _eanAliasy[klic] = { ean: v.ean, kdy: Date.now() };
    } catch (e) { hlaska = '✅ Kód přiřazen (spojení s obchodem se uloží příště)'; }
  }
  eanZavri();
  if (it && typeof rpRender === 'function') rpRender();
  if (typeof cil.hotovo === 'function') cil.hotovo(v.ean, p);
  if (typeof showToast === 'function') showToast(hlaska);
}

Object.assign(window, { eanSkenuj, eanSkenujPolozku, eanZFotky, eanSvetlo, eanZavri, eanPrirad, eanStartKamery });


// ══════════════════════════════════════════════════════
//  S24 (v11.24, Milan): ČESKÝ NÁZEV VÝROBKU + FOTKA OBALU / TABULKY ŽIVIN
//  • Uživatel vidí název z kódu (původní) i český název se ZDROJEM (z databáze /
//    schválený / z fotky obalu / návrh AI / tvůj) – ať ho neopravuje dokola.
//  • „✎ Opravit český název" jen když chybí nebo nesedí; původní název zůstává.
//    Tvůj název platí hned pro tebe, komunitě jde jako anonymní návrh (admin schválí).
//  • 📸 Fotka obalu (výrobek, který databáze nezná, nebo chybí český název /
//    zařazení) a 📸 tabulka živin z českého obalu. Fotka se NEUKLÁDÁ – AI ji
//    přečte a uloží se jen data. Free 3 fotky měsíčně, Premium víc.
// ══════════════════════════════════════════════════════
let _eanMojeNazvy = null;
async function eanNactiMojeNazvy(vynutit) {
  if (_eanMojeNazvy && !vynutit) return _eanMojeNazvy;
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (!uid || !t) return _eanMojeNazvy || {};
    const r = await fetch(`${EAN_DB}/users/${uid}/eanNazvy.json?auth=${t}`);
    _eanMojeNazvy = (r.ok ? await r.json() : null) || {};
  } catch (e) { _eanMojeNazvy = _eanMojeNazvy || {}; }
  return _eanMojeNazvy;
}
function eanZdrojNazvu(p, ean) {
  if (ean && _eanMojeNazvy && _eanMojeNazvy[ean]) return 'tvůj název';
  if (!p) return '';
  if (p.nazevCesky) return 'z databáze';
  if (!p.nazevCs) return '';
  return { admin: 'schválený komunitou', foto: 'z fotky obalu', ai: 'návrh AI' }[p.nazevCsZdroj] || 'návrh AI';
}
//  Blok s názvy pro kartu výrobku.
function eanNazvyHTML(p, ean, idPrefix) {
  //  Jen skutečně český název (bez náhrady cizím) – jinak by „Česky" ukázalo němčinu.
  const moje = ean && _eanMojeNazvy && _eanMojeNazvy[ean] && _eanMojeNazvy[ean].nazev;
  const cz = moje || (p ? (p.nazevCesky ? p.nazev : (p.nazevCs || '')) : ''), zdroj = eanZdrojNazvu(p, ean);
  const orig = p && p.nazev && !p.nazevCesky ? p.nazev : '';
  const id = (idPrefix || 'eanNaz') + '_' + ean;
  return `<div id="${id}" style="font-size:.76rem;line-height:1.55">
    ${orig ? `<div><span style="color:#a8aec8">Název z kódu:</span> ${escHtml(orig)}</div>` : ''}
    <div><span style="color:#a8aec8">Česky:</span> ${cz && cz !== orig ? `<b>${escHtml(cz)}</b>` : '<span style="color:#fbbf24">zatím chybí</span>'}${zdroj ? ` <span style="font-size:.66rem;color:#8b93ad">· ${zdroj}</span>` : ''}
      <button onclick="eanNazevUprav('${escHtml(ean)}','${id}')" style="background:none;border:none;color:#60a5fa;font-size:.7rem;cursor:pointer;padding:0 0 0 4px">✎ ${cz && cz !== orig ? 'Opravit' : 'Doplnit'}</button></div>
  </div>`;
}
//  S25 (Milan): pole se dřív předvyplnilo CIZÍM názvem z databáze a „Uložit“ ho uložilo jako
//  „tvůj název“ – ten pak přebíjel český návrh. Nově se předvyplní jen český název (tvůj /
//  schválený / návrh AI), jinak prázdné s nápovědou; uložení beze změny cizího názvu nic neuloží.
function eanHlas(t, chyba) {
  if (document.getElementById('eanOkno') && typeof eanZprava === 'function') eanZprava(t, chyba);
  else if (typeof showToast === 'function') showToast(t);
}
function eanNazevUprav(ean, id) {
  const el = document.getElementById(id); if (!el) return;
  const p = _eanProdukty[ean] || null;
  const moje = _eanMojeNazvy && _eanMojeNazvy[ean] && _eanMojeNazvy[ean].nazev;
  const cizi = p && p.nazev && !p.nazevCesky ? p.nazev : '';
  const cz = moje && moje !== cizi ? moje : (p ? (p.nazevCesky ? p.nazev : (p.nazevCs || '')) : '');
  el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
    <input class="fi" id="${id}_in" maxlength="100" value="${escHtml(cz)}" placeholder="např. Mléčná čokoláda s různými náplněmi" style="flex:1;min-width:180px;font-size:.8rem">
    <button class="btn btn-sm btn-primary" onclick="eanNazevUloz('${escHtml(ean)}','${id}')">Uložit</button></div>
    <div style="font-size:.66rem;color:#8b93ad;margin-top:3px">Napiš název tak, jak je na českém obalu. Značka se ukazuje zvlášť – do názvu ji dej jen když pomůže. Původní název z kódu zůstane; tvůj platí hned pro tebe, ostatním po schválení. Prázdné = zrušit tvůj název.</div>`;
  document.getElementById(id + '_in')?.focus();
}
async function eanNazevUloz(ean, id) {
  let v = (document.getElementById(id + '_in')?.value || '').trim();
  const p = _eanProdukty[ean] || null;
  const cizi = p && p.nazev && !p.nazevCesky ? p.nazev : '';
  const stejnyCizi = !!(v && cizi && v.toLowerCase() === cizi.toLowerCase());
  if (stejnyCizi) v = '';   // cizí název z databáze není „tvůj český název“
  try {
    await eanDotaz({ ean, akce: 'nazev', nazev: v });
    _eanMojeNazvy = _eanMojeNazvy || {};
    if (v) _eanMojeNazvy[ean] = { nazev: v, kdy: Date.now() }; else delete _eanMojeNazvy[ean];
    eanHlas(stejnyCizi ? 'Stejný jako původní (nečeský) název – neukládám ho jako tvůj. Napiš název z českého obalu.' : (v ? '✎ Název uložen' : 'Tvůj název zrušen'), stejnyCizi);
  } catch (e) { eanHlas('⚠️ ' + e.message, true); }
  const el = document.getElementById(id); if (el) el.outerHTML = eanNazvyHTML(_eanProdukty[ean] || null, ean, id.split('_')[0]);
  if (typeof mapaUzivKresli === 'function' && document.getElementById('mapaUzivSeznam')) mapaUzivKresli();
}

//  Fotka → zmenšený JPEG (max 1280 px) → base64 bez hlavičky. Nic se neukládá.
function eanZmensiFotku(soubor) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(soubor);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku se nepodařilo načíst')); };
    img.src = url;
  });
}
function eanFoto(ean, druh, hotovo, zGalerie) {
  const inp = document.createElement('input');
  //  S25 (Milan: „vyfotil jsem živiny a nic se nestalo“): hlášky šly jen do toastu, který leží
  //  POD oknem skeneru (z-index 9999 < 10050), a karta živiny nezobrazovala. Nově stav
  //  v okně skeneru (když je otevřené) a živiny v kartě.
  //  „📸 Vyfotit…“ otevře rovnou FOŤÁK (capture), „🖼️ z galerie“ vybere hotovou fotku.
  inp.type = 'file'; inp.accept = 'image/*';
  if (!zGalerie) inp.setAttribute('capture', 'environment');
  const hlas = (t, chyba) => { if (document.getElementById('eanOkno') && typeof eanZprava === 'function') eanZprava(t, chyba); else if (typeof showToast === 'function') showToast(t); };
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    hlas(druh === 'ziviny' ? '⏳ Čtu tabulku živin…' : '⏳ Čtu obal…');
    try {
      const obrazek = await eanZmensiFotku(f);
      const d = await eanDotaz({ ean, akce: 'foto', druh, obrazek });
      if (d.produkt) _eanProdukty[ean] = d.produkt;
      const ma = d.produkt && (druh === 'ziviny' ? (d.produkt.nutriceObal && Object.keys(d.produkt.nutriceObal).length) : true);
      hlas(ma ? (druh === 'ziviny' ? '✅ Živiny z obalu uloženy – najdeš je v kartě výrobku níže' : '✅ Údaje z obalu uloženy') + (d.zbyva != null ? ' · zbývá ' + d.zbyva + ' fotek tento měsíc' : '')
              : '⚠️ Z fotky se nepodařilo přečíst tabulku živin. Vyfoť ji zblízka, rovně a ostře.', !ma);
      if (typeof hotovo === 'function') hotovo(d.produkt);
    } catch (e) { hlas('⚠️ ' + e.message, true); }
  };
  inp.click();
}
//  Tlačítka pro kartu výrobku.
function eanFotoTlacitkaHTML(ean, p, poHotovo) {
  const potrebaObal = !p || p.stav !== 'nalezeno' || (!p.nazevCesky && !p.nazevCs) || !p.obecnyId;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
    ${potrebaObal ? `<button class="btn btn-sm" onclick="eanFoto('${escHtml(ean)}','obal',${poHotovo})">📸 Vyfotit obal</button>
    <button class="btn btn-sm" style="opacity:.85" onclick="eanFoto('${escHtml(ean)}','obal',${poHotovo},true)" title="Obal z galerie">🖼️</button>` : ''}
    <button class="btn btn-sm" onclick="eanFoto('${escHtml(ean)}','ziviny',${poHotovo})">📸 Vyfotit tabulku živin</button>
    <button class="btn btn-sm" style="opacity:.85" onclick="eanFoto('${escHtml(ean)}','ziviny',${poHotovo},true)" title="Tabulka živin z galerie">🖼️ z galerie</button>
    <button class="btn btn-sm" onclick="eanZivinyForm('${escHtml(ean)}','${poHotovo}')" title="Opsat nebo opravit hodnoty z obalu ručně">✍️ Zadat živiny ručně</button>
  </div>
  <div style="font-size:.64rem;color:#8b93ad;margin-top:4px">Fotka se neukládá – AI z ní jen přečte údaje. Free 3 fotky měsíčně, s Premium víc. Ruční zadání živin je bez limitu.${!p || p.stav !== 'nalezeno' ? ` Výrobek můžeš přidat i do <a href="https://world.openfoodfacts.org/cgi/product.pl?type=search_or_add&code=${encodeURIComponent(ean)}" target="_blank" rel="noopener" style="color:#60a5fa">Open Food Facts</a> (web nebo jejich aplikace).` : ''}</div>`;
}
Object.assign(window, { eanNactiMojeNazvy, eanZdrojNazvu, eanNazvyHTML, eanNazevUprav, eanNazevUloz, eanFoto, eanFotoTlacitkaHTML, eanZmensiFotku });

// ══════════════════════════════════════════════════════════════════════
//  S25 (v11.43, Milan): RUČNÍ ZADÁNÍ / OPRAVA ŽIVIN
//  Když výrobek není v Open Food Facts, fotka se nepovede nebo AI přečte číslo špatně,
//  hodnoty na 100 g (ml) se opíšou z obalu. Formulář se předvyplní z fotky obalu nebo
//  z databáze. Kontrola: „z toho“ ≤ celkem, součet gramů ≤ 100 g, energie sedí s živinami
//  (4 kcal/g bílkoviny a sacharidy, 9 tuky, 2 vláknina – nesedí → upozornění, uložit jde
//  až po potvrzení). Ukládá worker do sdílené karty výrobku (nutriceObal, zdroj „rucne“);
//  předchozí hodnoty si worker nechá pro případ vrácení.
// ══════════════════════════════════════════════════════════════════════
const EAN_ZIVINY_POLE = [
  ['kcal', 'Energie', 'kcal'], ['tuky', 'Tuky', 'g'], ['nasycene', '– z toho nasycené mastné kyseliny', 'g'],
  ['sacharidy', 'Sacharidy', 'g'], ['cukry', '– z toho cukry', 'g'], ['vlaknina', 'Vláknina', 'g'],
  ['bilkoviny', 'Bílkoviny', 'g'], ['sul', 'Sůl', 'g'],
];
function eanZivinyZdroj(n) {
  if (!n) return 'databáze';
  return n.zdroj === 'rucne' ? '✍️ zadáno ručně podle obalu' : '📸 z fotky obalu';
}
function eanCislo(v) {
  const t = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const x = Number(t); return isFinite(x) ? x : NaN;
}
//  Kontrola hodnot na 100 g. Vrací { chyby (nejde uložit), varovani (jde po potvrzení), vypocet (kcal z živin) }.
function eanZivinyKontrola(n) {
  const chyby = [], varovani = []; const f = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const pole = EAN_ZIVINY_POLE.map(x => x[0]).filter(k => n[k] != null);
  if (pole.some(k => Number.isNaN(n[k]))) chyby.push('Některé pole není číslo.');
  if (pole.length < 2) chyby.push('Vyplň aspoň energii a jednu živinu.');
  pole.forEach(k => { if (n[k] < 0) chyby.push('Hodnoty nemůžou být záporné.'); });
  if (n.kcal > 900) chyby.push('Energie nad 900 kcal na 100 g nejde (čistý tuk má 900). Nezadal jsi kJ?');
  ['tuky', 'nasycene', 'sacharidy', 'cukry', 'vlaknina', 'bilkoviny', 'sul'].forEach(k => { if (n[k] > 100) chyby.push('Žádná živina nemá víc než 100 g na 100 g.'); });
  if (n.nasycene != null && n.tuky != null && n.nasycene > n.tuky + 0.05) chyby.push(`Nasycené (${f(n.nasycene)} g) nemůžou být víc než tuky celkem (${f(n.tuky)} g).`);
  if (n.cukry != null && n.sacharidy != null && n.cukry > n.sacharidy + 0.05) chyby.push(`Cukry (${f(n.cukry)} g) nemůžou být víc než sacharidy celkem (${f(n.sacharidy)} g).`);
  const soucet = ['tuky', 'sacharidy', 'vlaknina', 'bilkoviny', 'sul'].reduce((a, k) => a + (n[k] || 0), 0);
  if (soucet > 101) chyby.push(`Tuky + sacharidy + vláknina + bílkoviny + sůl = ${f(soucet)} g, víc než 100 g se do 100 g nevejde.`);
  let vypocet = null;
  if (n.tuky != null && n.sacharidy != null && n.bilkoviny != null) {
    vypocet = 9 * n.tuky + 4 * n.sacharidy + 4 * n.bilkoviny + 2 * (n.vlaknina || 0);
    if (n.kcal != null && !chyby.length) {
      const rozdil = Math.abs(n.kcal - vypocet);
      if (rozdil > Math.max(20, vypocet * 0.15)) varovani.push(`Energie ${f(n.kcal)} kcal nesedí s živinami (vychází ${Math.round(vypocet)} kcal). Zkontroluj čísla – u nápojů s alkoholem nebo výrobků se sladidly to může být v pořádku.`);
    }
  }
  return { chyby: [...new Set(chyby)], varovani, vypocet };
}
let _eanZivinyStav = null;   // { ean, hotovo, potvrzeno }
function eanZivinyForm(ean, hotovo) {
  const p = _eanProdukty[ean] || {};
  const zdroj = p.nutriceObal ? p.nutriceObal : (p.nutrice || {});
  const odkud = p.nutriceObal ? eanZivinyZdroj(p.nutriceObal) : (p.nutrice && Object.keys(p.nutrice).length ? 'databáze Open Food Facts' : '');
  _eanZivinyStav = { ean, hotovo: hotovo || '', potvrzeno: false };
  const sl = p.slozeniObal || (p.slozeniCesky ? p.slozeni : '') || '';
  const inp = 'background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 8px;font-size:.86rem;width:100%;box-sizing:border-box';
  let o = document.getElementById('eanZiviny'); if (o) o.remove();
  o = document.createElement('div'); o.id = 'eanZiviny';
  o.style.cssText = 'position:fixed;inset:0;z-index:10070;background:rgba(8,10,20,.88);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px calc(16px + env(safe-area-inset-bottom))';
  o.innerHTML = `<div style="width:100%;max-width:440px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-weight:700;font-size:.95rem;flex:1;color:var(--text)">✍️ Nutriční hodnoty z obalu</div>
      <button onclick="eanZivinyZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button>
    </div>
    <div style="font-size:.74rem;color:#a8aec8;margin:4px 0 10px;line-height:1.5">${escHtml(eanNazevVyrobku(p) || ean)}<br>Opiš sloupec <b>na 100 g</b> (u nápojů 100 ml), ne na porci. Prázdné pole = na obalu není.${odkud ? ' Předvyplněno: ' + escHtml(odkud) + '.' : ''}</div>
    <div style="display:flex;gap:6px;margin-bottom:10px;font-size:.78rem">
      <label style="display:flex;gap:4px;align-items:center"><input type="radio" name="ezNa" value="g" ${zdroj.na !== 'ml' ? 'checked' : ''} onchange="eanZivinyKontrolujForm()"> na 100 g</label>
      <label style="display:flex;gap:4px;align-items:center;margin-left:10px"><input type="radio" name="ezNa" value="ml" ${zdroj.na === 'ml' ? 'checked' : ''} onchange="eanZivinyKontrolujForm()"> na 100 ml</label>
    </div>
    <div style="display:grid;grid-template-columns:1fr 110px;gap:6px 10px;align-items:center">
      ${EAN_ZIVINY_POLE.map(([k, l, j]) => `<label for="ez_${k}" style="font-size:.78rem;color:${l.startsWith('–') ? '#a8aec8' : 'var(--text)'};${l.startsWith('–') ? 'padding-left:10px' : ''}">${escHtml(l)}</label>
        <div style="display:flex;align-items:center;gap:4px"><input id="ez_${k}" inputmode="decimal" autocomplete="off" style="${inp}" value="${zdroj[k] != null ? String(zdroj[k]).replace('.', ',') : ''}" oninput="eanZivinyKontrolujForm()"><span style="font-size:.7rem;color:#8b93ad;width:28px">${j}</span></div>`
        + (k === 'kcal' ? `<label for="ez_kj" style="font-size:.7rem;color:#8b93ad;padding-left:10px">nebo kJ (přepočte se)</label>
        <div style="display:flex;align-items:center;gap:4px"><input id="ez_kj" inputmode="decimal" autocomplete="off" style="${inp}" oninput="eanZivinyKj()"><span style="font-size:.7rem;color:#8b93ad;width:28px">kJ</span></div>` : '')).join('')}
    </div>
    <details style="margin-top:10px"><summary style="font-size:.78rem;cursor:pointer;color:var(--text)">Složení (nepovinné)</summary>
      <textarea id="ez_slozeni" rows="4" maxlength="1500" style="${inp};margin-top:6px;resize:vertical" placeholder="Opiš složení z českého obalu">${escHtml(sl)}</textarea></details>
    <div id="ezKontrola" style="font-size:.74rem;line-height:1.5;margin-top:10px"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-ghost" onclick="eanZivinyZavri()">Zrušit</button>
      <button id="ezUlozit" class="btn btn-accent" style="flex:1;justify-content:center" onclick="eanZivinyUloz()">💾 Uložit živiny</button>
    </div>
    <div style="font-size:.64rem;color:#8b93ad;margin-top:8px;line-height:1.5">Hodnoty se uloží ke kódu ${escHtml(ean)} pro všechny uživatele (bez tvého jména). Přepíšou údaje z databáze i z fotky; ty předchozí zůstanou zálohované.</div>
  </div>`;
  document.body.appendChild(o);
  eanZivinyKontrolujForm();
}
function eanZivinyZavri() { _eanZivinyStav = null; const o = document.getElementById('eanZiviny'); if (o) o.remove(); }
function eanZivinyKj() {
  const kj = eanCislo((document.getElementById('ez_kj') || {}).value);
  const k = document.getElementById('ez_kcal');
  if (k && kj != null && !Number.isNaN(kj)) k.value = String(Math.round(kj / 4.184)).replace('.', ',');
  eanZivinyKontrolujForm();
}
function eanZivinyZFormu() {
  const n = {};
  EAN_ZIVINY_POLE.forEach(([k]) => { const el = document.getElementById('ez_' + k); const v = el ? eanCislo(el.value) : null; if (v != null) n[k] = v; });
  return n;
}
function eanZivinyKontrolujForm() {
  const box = document.getElementById('ezKontrola'), bt = document.getElementById('ezUlozit'); if (!box || !bt) return;
  if (_eanZivinyStav) _eanZivinyStav.potvrzeno = false;
  const k = eanZivinyKontrola(eanZivinyZFormu());
  const f = v => String(Math.round(v)).replace('.', ',');
  box.innerHTML = k.chyby.map(c => `<div style="color:var(--expense)">⛔ ${escHtml(c)}</div>`).join('')
    + k.varovani.map(c => `<div style="color:#fbbf24">⚠️ ${escHtml(c)}</div>`).join('')
    + (!k.chyby.length && !k.varovani.length && k.vypocet != null ? `<div style="color:var(--income)">✅ Energie sedí s živinami (z živin ${f(k.vypocet)} kcal).</div>` : '');
  bt.disabled = !!k.chyby.length; bt.style.opacity = k.chyby.length ? '.5' : '1';
  bt.textContent = k.varovani.length ? '💾 Uložit i tak' : '💾 Uložit živiny';
}
async function eanZivinyUloz() {
  const st = _eanZivinyStav; if (!st) return;
  const n = eanZivinyZFormu(); const k = eanZivinyKontrola(n);
  if (k.chyby.length) return eanZivinyKontrolujForm();
  const bt = document.getElementById('ezUlozit');
  const box = document.getElementById('ezKontrola');
  const na = (document.querySelector('input[name="ezNa"]:checked') || {}).value === 'ml' ? 'ml' : 'g';
  const slozeni = ((document.getElementById('ez_slozeni') || {}).value || '').trim();
  if (bt) { bt.disabled = true; bt.textContent = '⏳ Ukládám…'; }
  try {
    const d = await eanDotaz({ ean: st.ean, akce: 'ziviny', hodnoty: n, na, slozeni, potvrzeno: !!k.varovani.length });
    if (d.produkt) _eanProdukty[st.ean] = d.produkt;
    const fn = st.hotovo && typeof window[st.hotovo] === 'function' ? window[st.hotovo] : null;
    eanZivinyZavri();
    eanHlas('✅ Živiny uloženy – najdeš je v kartě výrobku');
    if (fn) fn(d.produkt);
  } catch (e) {
    if (box) box.innerHTML = `<div style="color:var(--expense)">⚠️ ${escHtml(e.message || 'Uložení selhalo')}</div>`;
    if (bt) { bt.disabled = false; bt.textContent = '💾 Zkusit znovu'; }
  }
}
Object.assign(window, { eanZivinyZdroj, eanZivinyKontrola, eanZivinyForm, eanZivinyZavri, eanZivinyKj, eanZivinyKontrolujForm, eanZivinyUloz });


// ══════════════════════════════════════════════════════
//  S24 (v11.25, Milan): SAMOSTATNÉ SKENOVÁNÍ VÝROBKU
//  cesta: Analýza účtenek → 📸 Skenovat → „📷 Skenovat čárový kód výrobku"
//  Naskenuješ obal kdykoli (doma ze spíže), vidíš výrobek, opravíš český název,
//  vyfotíš obal / živiny a pak ho PŘIŘADÍŠ k položce z některé své účtenky
//  (seznam položek bez kódu, s hledáním). Výrobek se do komunity uloží už při
//  skenu; přiřazení vytvoří spojení „obchod + zkratka → EAN" jako v editoru.
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
//  S25 (Milan): NASKENOVANÉ VÝROBKY – po zavření okna skeneru nic nezmizí.
//  Seznam posledních 40 kódů (uiCfg.eanSken) v Analýze účtenek → Skenovat a v Mapě
//  položek. Klepnutí otevře výrobek (název, značka, Nutri-Score, živiny, složení)
//  a tlačítko „Přiřadit k položce z účtenky“ – i dny po skenu.
// ══════════════════════════════════════════════════════════════════════
function eanZapamatuj(ean) {
  if (typeof S === 'undefined' || !ean) return;
  S.uiCfg = S.uiCfg || {};
  const a = (S.uiCfg.eanSken || []).filter(x => x && x.e !== ean);
  a.unshift({ e: ean, k: Date.now() });
  S.uiCfg.eanSken = a.slice(0, 40);
  if (typeof save === 'function') save();
  setTimeout(eanNaskenovaneKresli, 0);
}
//  Čistá funkce: naskenované kódy + zda už jsou přiřazené k položce některé účtenky
function eanNaskenovane(D) {
  const pri = new Set();
  ((D || {}).receipts || []).forEach(r => (r.items || []).forEach(it => { if (it && it.ean) pri.add(it.ean); }));
  return (((D || {}).uiCfg || {}).eanSken || []).filter(x => x && x.e).map(x => ({ ean: x.e, kdy: x.k || 0, prirazeno: pri.has(x.e) }));
}
function eanNaskenovaneOdeber(ean) {
  S.uiCfg = S.uiCfg || {}; S.uiCfg.eanSken = (S.uiCfg.eanSken || []).filter(x => x && x.e !== ean); save(); eanNaskenovaneKresli();
}
function eanNaskenovaneHTML(D) {
  const l = eanNaskenovane(D); if (!l.length) return '';
  const fmtD = t => t ? new Date(t).toLocaleDateString('cs-CZ') : '';
  const nep = l.filter(x => !x.prirazeno).length;
  return `<details ${nep ? 'open' : ''} style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:12px">
    <summary style="cursor:pointer;font-weight:700;font-size:.84rem;color:#60a5fa">📷 Naskenované výrobky (${l.length})${nep ? ` <span style="color:#fbbf24;font-weight:500;font-size:.74rem">· ${nep} nepřiřazen${nep === 1 ? 'ý' : nep < 5 ? 'é' : 'ých'}</span>` : ''}</summary>
    <div style="font-size:.7rem;color:#a8aec8;margin:4px 0 6px">Klepni na výrobek – uvidíš živiny i složení a můžeš ho přiřadit k položce z účtenky.</div>
    ${l.map(x => { const p = eanProduktZCache(x.ean); const n = p && p.stav === 'nalezeno' ? (eanNazevVyrobku(p, x.ean) || p.nazev) : '';
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--border)">
        ${p && p.foto ? `<img src="${escHtml(p.foto)}" alt="" style="width:34px;height:34px;object-fit:contain;background:#fff;border-radius:6px;flex-shrink:0">` : '<span style="width:34px;text-align:center">▮▮</span>'}
        <div onclick="eanOtevriNaskenovany('${escHtml(x.ean)}')" role="button" style="flex:1;min-width:0;cursor:pointer">
          <div style="font-size:.8rem;font-weight:600;overflow-wrap:anywhere">${escHtml(n || 'Kód ' + x.ean)}</div>
          <div style="font-size:.68rem;color:#a8aec8">${[p && p.znacka ? escHtml(p.znacka) : '', fmtD(x.kdy), x.prirazeno ? '<span style="color:var(--income)">✓ přiřazeno</span>' : '<span style="color:#fbbf24">nepřiřazeno</span>'].filter(Boolean).join(' · ')}</div>
        </div>
        ${p && p.nutriscore ? `<span style="background:${EAN_NUTRI_BARVA[p.nutriscore]};color:#fff;font-weight:800;border-radius:5px;padding:1px 6px;font-size:.66rem">${escHtml(String(p.nutriscore).toUpperCase())}</span>` : ''}
        <button class="btn btn-sm" title="Odebrat ze seznamu" style="font-size:.66rem;padding:2px 7px" onclick="eanNaskenovaneOdeber('${escHtml(x.ean)}')">✕</button>
      </div>`; }).join('')}
  </details>`;
}
//  Vyplní všechny boxy .eanNaskBox (Skenovat i Mapa položek); názvy dotáhne z databáze.
async function eanNaskenovaneKresli() {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  const boxy = document.querySelectorAll('.eanNaskBox'); if (!boxy.length || typeof S === 'undefined') return;
  const kresli = () => { const h = eanNaskenovaneHTML(S); boxy.forEach(b => { b.innerHTML = h; }); };
  kresli();
  try { const n = await eanNactiVse(eanNaskenovane(S).map(x => x.ean)); if (n) kresli(); } catch (e) {}
}
//  Otevře uložený výrobek v okně skeneru (bez kamery) – karta, živiny, složení, přiřazení.
async function eanOtevriNaskenovany(ean) {
  _eanStav.cil = { volne: true, raw: '', obchod: '' }; _eanStav.i = -1;
  eanOkno();
  document.getElementById('eanPolozka').innerHTML = 'Naskenovaný výrobek. Můžeš ho přiřadit k položce z některé své účtenky.';
  document.getElementById('eanVysledek').innerHTML = '';
  eanZprava('⏳ Načítám výrobek ' + escHtml(ean) + '…');
  try {
    let p = _eanProdukty[ean];
    if (!p) { const d = await eanDotaz({ ean }); p = d.produkt || null; if (p) _eanProdukty[ean] = p; }
    _eanStav.vysledek = { ean, produkt: p };
    eanZprava(p && p.stav === 'nalezeno' ? '' : '🤷 Kód je platný, výrobek zatím nikdo nezapsal.');
    eanNalezenZobraz(ean, p);
  } catch (e) { eanZprava('⚠️ ' + escHtml(e.message || 'Načtení selhalo'), true); }
}
Object.assign(window, { eanZapamatuj, eanNaskenovane, eanNaskenovaneOdeber, eanNaskenovaneHTML, eanNaskenovaneKresli, eanOtevriNaskenovany });

function eanSkenujVolne() {
  if (typeof eanNactiMojeNazvy === 'function') eanNactiMojeNazvy();
  eanNactiAliasy();
  return eanSkenujPolozku({ volne: true, raw: '', obchod: '' }).then(() => {
    const el = document.getElementById('eanPolozka');
    if (el) el.innerHTML = 'Naskenuj kód z obalu. Pak ho můžeš přiřadit k položce z některé své účtenky.';
  });
}
function eanVolneObnov() {
  const v = _eanStav.vysledek; if (!v) return;
  const p = _eanProdukty[v.ean] || v.produkt;
  const el = document.getElementById('eanVysledek'); if (!el) return;
  _eanStav.vysledek.produkt = p;
  eanNalezenZobraz(v.ean, p);
}
function eanNalezenZobraz(ean, p) {
  document.getElementById('eanVysledek').innerHTML = eanKartaHTML(p, ean)
    + `<div style="margin-top:8px">${eanNazvyHTML(p && p.stav === 'nalezeno' ? p : {}, ean, 'sk')}${eanFotoTlacitkaHTML(ean, p, 'eanVolneObnov')}</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-primary" style="flex:1" onclick="eanVyberPolozku()">🔗 Přiřadit k položce z účtenky</button>
        <button class="btn" onclick="document.getElementById('eanVysledek').innerHTML='';eanStartKamery()">↺ Skenovat znovu</button></div>`;
}

//  Položky z účtenek pro výběr (čistá funkce): unikátní obchod + název, nejnovější
//  nahoře, bez kódu (přímo u položky ani přes vlastní spojení).
function eanKandidatiPolozek(D, hledat) {
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  const q = nn(hledat || '');
  const vid = {}, out = [];
  (D.receipts || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(r => (r.items || []).forEach(it => {
    if (!it || !it.name || it.ean) return;
    const k = eanAliasKlic(r.store, it.name); if (!k || vid[k]) return;
    vid[k] = 1;
    if (eanAliasPro(r.store, it.name)) return;
    if (q && !nn(it.name).includes(q)) return;
    out.push({ raw: it.name, obchod: r.store || '', datum: r.date || '', klic: k });
  }));
  return out;
}
window.eanKandidatiPolozek = eanKandidatiPolozek;

//  S25 (Milan): výběr PŘES ÚČTENKY (obchod · datum → položky). Ukazuje i položky, které
//  už kód mají: „✓ tento výrobek“ (s možností Odebrat – oprava chybného přiřazení) nebo
//  „má jiný kód“ (klik = přepsat po potvrzení). Kód se tak nikdy tiše nezdvojí.
function eanPolozkyUctenek(D, hledat, ean) {
  const nn = (typeof normName === 'function') ? normName : (t => String(t || '').toLowerCase());
  const q = nn(hledat || ''); const vid = {}, skupiny = [];
  (D.receipts || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(r => {
    const rows = [];
    (r.items || []).forEach(it => {
      if (!it || !it.name) return;
      const k = eanAliasKlic(r.store, it.name); if (!k || vid[k]) return;
      vid[k] = 1;
      if (q && !nn(it.name).includes(q)) return;
      const kod = it.ean || eanAliasPro(r.store, it.name) || '';
      rows.push({ raw: it.name, obchod: r.store || '', datum: r.date || '', klic: k, kod, kodNazev: it.eanNazev || '',
        cena: it.price != null ? it.price : it.total, stav: !kod ? 'volna' : (kod === ean ? 'tento' : 'jiny') });
    });
    if (rows.length) skupiny.push({ obchod: r.store || '', datum: r.date || '', rows });
  });
  return skupiny;
}
window.eanPolozkyUctenek = eanPolozkyUctenek;

function eanVyberPolozku(hledat) {
  const el = document.getElementById('eanVysledek'); if (!el) return;
  const D = (typeof S !== 'undefined') ? S : getData();
  const v = _eanStav.vysledek || {};
  const sk = eanPolozkyUctenek(D, hledat, v.ean).slice(0, hledat ? 30 : 12);
  const box = document.getElementById('eanVyber') || (() => { const d = document.createElement('div'); d.id = 'eanVyber'; el.appendChild(d); return d; })();
  const flat = []; const dat = d => d ? d.split('-').reverse().join('. ') : '';
  const tento = sk.flatMap(g => g.rows).filter(x => x.stav === 'tento');
  box.innerHTML = `<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
    <div style="font-weight:700;font-size:.84rem;margin-bottom:4px">Ke které položce z účtenky patří?</div>
    ${tento.length ? `<div style="font-size:.74rem;color:var(--income);margin-bottom:6px">✓ Tento výrobek už máš přiřazený: ${tento.map(x => '<b>' + escHtml(x.raw) + '</b>').join(', ')}</div>` : ''}
    <input class="fi" id="eanVyberQ" placeholder="🔍 Hledat položku…" value="${escHtml(hledat || '')}" oninput="eanVyberPolozku(this.value)" style="font-size:.8rem;margin-bottom:8px">
    ${sk.length ? sk.map(g => `<div style="margin-bottom:8px;border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="background:var(--surface2);padding:6px 10px;font-size:.74rem;font-weight:700;display:flex;justify-content:space-between"><span>🧾 ${escHtml(g.obchod || 'Účtenka')}</span><span style="color:#a8aec8;font-weight:500">${escHtml(dat(g.datum))}</span></div>
        ${g.rows.map(x => { const i = flat.push(x) - 1;
          const st = x.stav === 'tento' ? `<span style="color:var(--income);font-size:.7rem;white-space:nowrap">✓ tento výrobek</span> <button class="btn btn-sm" style="font-size:.66rem;padding:2px 7px" onclick="event.stopPropagation();eanOdebratZPolozky(${i})">✕ Odebrat</button>`
                 : x.stav === 'jiny' ? `<span style="color:#fbbf24;font-size:.7rem;white-space:nowrap" title="${escHtml(x.kod)}">má jiný kód${x.kodNazev ? ': ' + escHtml(x.kodNazev.slice(0, 24)) : ''}</span>`
                 : (x.cena != null ? `<span style="color:#a8aec8;font-size:.72rem;white-space:nowrap">${escHtml(String(x.cena))} Kč</span>` : '');
          return `<div ${x.stav === 'tento' ? '' : `onclick="eanPriradKPolozce(${i})" role="button"`} style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;border-top:1px solid var(--border);${x.stav === 'tento' ? 'opacity:.85' : 'cursor:pointer'};font-size:.82rem">
            <span style="overflow-wrap:anywhere"><b>${escHtml(x.raw)}</b></span><span style="display:flex;align-items:center;gap:6px">${st}</span></div>`; }).join('')}
      </div>`).join('')
      : '<div style="font-size:.76rem;color:#a8aec8">Žádná položka' + (hledat ? ' neodpovídá hledání' : ' v účtenkách') + '.</div>'}
  </div>`;
  window._eanKandidati = flat;
  const q = document.getElementById('eanVyberQ'); if (q && hledat != null && q.focus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
}

async function eanPriradKPolozce(i) {
  const x = (window._eanKandidati || [])[i]; const v = _eanStav.vysledek;
  if (!x || !v) return;
  if (x.stav === 'jiny' && typeof confirm === 'function' && !confirm(`„${x.raw}“ už má jiný kód${x.kodNazev ? ' (' + x.kodNazev + ')' : ''}. Přepsat ho tímto výrobkem?`)) return;
  const p = v.produkt && v.produkt.stav === 'nalezeno' ? v.produkt : null;
  const nazev = p ? eanNazevVyrobku(p, v.ean) : '';
  //  Kód ke všem položkám se stejnou zkratkou ve stejném obchodě (uloží se s daty).
  const D = (typeof S !== 'undefined') ? S : getData();
  let n = 0;
  (D.receipts || []).forEach(r => (r.items || []).forEach(it => {
    if (it && it.name && eanAliasKlic(r.store, it.name) === x.klic) { it.ean = v.ean; if (nazev) it.eanNazev = nazev.slice(0, 100); else delete it.eanNazev; n++; }
  }));
  (D.transactions || []).forEach(t => (t.receiptItems || []).forEach(it => {
    if (it && it.name && eanAliasKlic(t.receiptStore || t.storeName || '', it.name) === x.klic) it.ean = v.ean;
  }));
  if (typeof save === 'function') save();
  let hl = '🔗 Kód přiřazen k „' + x.raw + '"' + (n > 1 ? ' (' + n + '× v účtenkách)' : '');
  try {
    const d = await eanDotaz({ ean: v.ean, potvrdit: true, klic: x.klic, obchod: x.obchod, raw: x.raw });
    if (d.alias && d.alias.pocet > 1) hl += ' · potvrzeno ' + d.alias.pocet + '×';
    if (_eanAliasy) _eanAliasy[x.klic] = { ean: v.ean, kdy: Date.now() };
  } catch (e) {}
  if (typeof showToast === 'function') showToast(hl);
  eanZavri();
  if (typeof mapaUzivKresli === 'function' && document.getElementById('mapaUzivSeznam')) mapaUzivKresli();
}

//  Oprava chybného přiřazení: kód z položky (všech stejných zkratek v obchodě) pryč,
//  worker ubere tvé potvrzení spojení „obchod + zkratka → kód“ v komunitě.
async function eanOdebratZPolozky(i) {
  const x = (window._eanKandidati || [])[i]; const v = _eanStav.vysledek;
  if (!x || !v) return;
  if (typeof confirm === 'function' && !confirm(`Odebrat kód od „${x.raw}“?`)) return;
  const D = (typeof S !== 'undefined') ? S : getData();
  (D.receipts || []).forEach(r => (r.items || []).forEach(it => {
    if (it && it.name && it.ean === v.ean && eanAliasKlic(r.store, it.name) === x.klic) { delete it.ean; delete it.eanNazev; }
  }));
  (D.transactions || []).forEach(t => (t.receiptItems || []).forEach(it => {
    if (it && it.name && it.ean === v.ean && eanAliasKlic(t.receiptStore || t.storeName || '', it.name) === x.klic) delete it.ean;
  }));
  if (typeof save === 'function') save();
  try { await eanDotaz({ ean: v.ean, akce: 'odebrat', klic: x.klic }); } catch (e) {}
  if (_eanAliasy && _eanAliasy[x.klic] && _eanAliasy[x.klic].ean === v.ean) delete _eanAliasy[x.klic];
  if (typeof showToast === 'function') showToast('Kód odebrán od „' + x.raw + '"');
  eanVyberPolozku(document.getElementById('eanVyberQ')?.value || '');
}
Object.assign(window, { eanSkenujVolne, eanVolneObnov, eanVyberPolozku, eanPriradKPolozce, eanOdebratZPolozky });
