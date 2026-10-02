// FinanceFlow · v11.23 · ean-sken.js · 2026-10-02
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
function eanNazevVyrobku(p) { return p ? (p.nazevCesky ? p.nazev : (p.nazevCs || p.nazev || '')) : ''; }
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
      </div>
      <div id="eanVysledek" style="margin-top:12px"></div>
      <div style="font-size:.66rem;color:#a8aec8;margin-top:14px">Data o výrobcích: Open Food Facts a sesterské databáze (licence ODbL).</div>
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
}

// ── výsledek ──
const EAN_NUTRI_BARVA = { a: '#038141', b: '#85bb2f', c: '#fecb02', d: '#ee8100', e: '#e63e11' };

function eanKartaHTML(p, ean) {
  if (!p || p.stav !== 'nalezeno') {
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:.8rem;line-height:1.5">
      <b>Kód ${escHtml(ean)}</b> zatím nezná žádná databáze.<br>
      <span style="color:#a8aec8">Přiřadit se i tak vyplatí: položka tím dostane jednoznačnou identitu a ve všech obchodech se spojí se stejným výrobkem. Název doplní komunita nebo admin.</span>
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
  </div>`;
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
    eanZprava(d.produkt && d.produkt.stav === 'nalezeno' ? '✅ Nalezeno' + (d.produkt.zdroj ? ' · ' + escHtml(d.produkt.zdroj) : '') : '🤷 Kód je platný, výrobek zatím nikdo nezapsal.');
    document.getElementById('eanVysledek').innerHTML = eanKartaHTML(d.produkt, ean) + `
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-primary" style="flex:1" onclick="eanPrirad()">✅ Přiřadit k položce</button>
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
