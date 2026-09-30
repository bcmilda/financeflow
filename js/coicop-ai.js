// FinanceFlow · v11.13 · coicop-ai.js · 2026-09-30
// ══════════════════════════════════════════════════════
//  S24 (Milan, varianta B): AI ZAŘAZENÍ VLASTNÍCH KATEGORIÍ DO COICOP
//  cesta: Nastavení → Kategorie (značka 🤖 u kategorie / podkategorie)
//
//  Vlastní kategorie a podkategorie bez COICOP se v inflaci a srovnání s ČR
//  počítaly jako „nezařazené". Nově:
//   1) appka je na pozadí pošle workeru (/coicop) – každý název se ptá AI
//      jen jednou za celou komunitu,
//   2) návrh se HNED použije ve statistikách a inflaci, označený 🤖 odhad
//      (varianta B), nic se nepřiřazuje bez označení,
//   3) uživatel ho potvrdí nebo změní – tím se odhad zpevní; jeho volba
//      vždy vyhrává a nikdo ji nepřepíše,
//   4) potvrzení/změna se anonymně započítá jako hlas; admin v Adopci
//      kategorií schvaluje společnou odpověď pro další uživatele.
//
//  Stav u kategorie: c.coicopAi = {kat:'odhad'|'potvrzeno'|'nic',
//                                  subs:{[sub]:'odhad'|'potvrzeno'|'dedi'|'nic'}}
//  'dedi' = AI dala stejný oddíl jako rodič → override netřeba, jen se už neptat.
// ══════════════════════════════════════════════════════

const COICOP_AI_WORKER = (typeof WORKER_URL !== 'undefined' && WORKER_URL) || 'https://misty-limit-0523.bc-milda.workers.dev';
let _coicopAiBezi = false, _coicopAiPosledni = 0;

//  Stejná normalizace jako ve workeru (coicopKlic).
function coicopAiKlic(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}
const _caEsc = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _caOddil = n => (typeof COICOP_GROUPS_DEF !== 'undefined' ? COICOP_GROUPS_DEF : []).find(g => g.id === Number(n)) || null;

//  Co je potřeba zařadit (čistá funkce – testuje tools/smoke_coicop_ai.js).
//  Jen výdajové kategorie; výchozí kategorie a jejich výchozí podkategorie
//  COICOP mají. Vlastní kategorie bez COICOP + podkategorie bez výjimky,
//  které nejsou ve výchozí sadě a na které se ještě nikdo neptal.
function coicopAiKandidati(D) {
  D = D || getData();
  const defs = Object.fromEntries((typeof DEFAULT_CATEGORIES !== 'undefined' ? DEFAULT_CATEGORIES : []).map(d => [d.id, d]));
  const out = [];
  (D.categories || []).forEach(c => {
    if (!c || !c.id || !c.name) return;
    if (c.type === 'income' || c.type === 'transfer' || c.name === 'Virtuální přesun') return;
    const def = defs[c.id];
    const ai = c.coicopAi || {};
    const maCoicop = c.coicop != null && c.coicop !== '';
    if (!def && !maCoicop && !ai.kat) out.push({ typ: 'kat', catId: c.id, nazev: c.name });
    (c.subs || []).forEach(s => {
      if (!s || typeof s !== 'string') return;
      if ((c.coicopOverrides || {})[s] != null) return;
      if (def && ((def.subs || []).includes(s) || (def.coicopOverrides || {})[s] != null)) return;
      if ((ai.subs || {})[s]) return;
      out.push({ typ: 'sub', catId: c.id, sub: s, nazev: s, rodic: c.name });
    });
  });
  return out;
}
window.coicopAiKandidati = coicopAiKandidati;

//  Zapíše výsledky workeru do kategorií (čistá funkce nad objektem D).
//  Vrací počet změn. Nikdy nepřepíše potvrzenou ani ručně nastavenou hodnotu.
function coicopAiPouzij(D, kandidati, vysledky) {
  let zmen = 0;
  const podle = {}; (vysledky || []).forEach(v => { podle[v.klic] = v; });
  kandidati.forEach(k => {
    const v = podle[coicopAiKlic(k.nazev)]; if (!v) return;
    const c = (D.categories || []).find(x => x.id === k.catId); if (!c) return;
    c.coicopAi = c.coicopAi || {};
    const n = Number(v.coicop);
    if (k.typ === 'kat') {
      if (c.coicop != null && c.coicop !== '') return;
      if (n >= 1 && n <= 13) { c.coicop = n; c.coicopAi.kat = 'odhad'; } else c.coicopAi.kat = 'nic';
      zmen++;
    } else {
      c.coicopAi.subs = c.coicopAi.subs || {};
      if ((c.coicopOverrides || {})[k.sub] != null) return;
      if (n >= 1 && n <= 13 && n !== Number(c.coicop)) {
        c.coicopOverrides = Object.assign({}, c.coicopOverrides, { [k.sub]: n });
        c.coicopAi.subs[k.sub] = 'odhad';
      } else c.coicopAi.subs[k.sub] = (n >= 1 && n <= 13) ? 'dedi' : 'nic';
      zmen++;
    }
  });
  return zmen;
}
window.coicopAiPouzij = coicopAiPouzij;

async function _coicopAiPost(telo) {
  const token = await window._currentUser?.getIdToken?.();
  if (!token) throw new Error('nepřihlášen');
  const r = await fetch(COICOP_AI_WORKER + '/coicop', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify(telo),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d || !d.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
  return d;
}

//  Na pozadí: po přihlášení, po otevření Kategorií a po založení podkategorie.
//  Pracuje jen s VLASTNÍMI daty (ne při prohlížení partnera), max. jednou za 30 s.
async function coicopAiZkontroluj(vynutit) {
  if (_coicopAiBezi) return;
  if (typeof _isLocalMode !== 'undefined' && _isLocalMode) return;
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!vynutit && Date.now() - _coicopAiPosledni < 30000) return;
  const kand = coicopAiKandidati(S);
  if (!kand.length) return;
  _coicopAiBezi = true; _coicopAiPosledni = Date.now();
  try {
    let zmen = 0;
    for (let i = 0; i < kand.length; i += 20) {
      const davka = kand.slice(i, i + 20);
      const d = await _coicopAiPost({ akce: 'navrh', nazvy: davka.map(k => ({ nazev: k.nazev, rodic: k.rodic || '' })) });
      zmen += coicopAiPouzij(S, davka, d.vysledky);
    }
    if (zmen) {
      if (typeof save === 'function') save();
      if (typeof curPage !== 'undefined' && curPage === 'kategorie' && typeof renderCatPage === 'function') renderCatPage();
    }
  } catch (e) { console.warn('coicop-ai:', e && e.message); }
  finally { _coicopAiBezi = false; }
}
window.coicopAiZkontroluj = coicopAiZkontroluj;

// ── značky a dialog v Kategoriích ──
function coicopAiOdhady(D) {
  D = D || getData();
  const out = [];
  (D.categories || []).forEach(c => {
    const ai = c.coicopAi || {};
    if (ai.kat === 'odhad') out.push({ catId: c.id, sub: '', nazev: c.name, ikona: c.icon || '📦', coicop: c.coicop });
    Object.entries(ai.subs || {}).forEach(([s, st]) => {
      if (st === 'odhad' && (c.subs || []).includes(s)) out.push({ catId: c.id, sub: s, nazev: s, rodic: c.name, ikona: c.icon || '📦', coicop: (c.coicopOverrides || {})[s] });
    });
  });
  return out;
}
window.coicopAiOdhady = coicopAiOdhady;

//  Malá klikací značka vedle názvu kategorie / podkategorie.
function coicopAiZnacka(c, sub) {
  const ai = (c && c.coicopAi) || {};
  const st = sub ? (ai.subs || {})[sub] : ai.kat;
  if (st !== 'odhad') return '';
  const n = sub ? (c.coicopOverrides || {})[sub] : c.coicop;
  const g = _caOddil(n);
  return `<span onclick="event.stopPropagation();coicopAiDialog('${_caEsc(c.id)}','${_caEsc(sub || '').replace(/'/g, '&#39;')}')" role="button"
    title="${_caEsc('Odhad AI: COICOP ' + n + (g ? ' – ' + g.name : '') + '. Klepni pro potvrzení nebo změnu.')}"
    style="font-size:.6rem;color:#60a5fa;border:1px solid #60a5fa66;border-radius:8px;padding:1px 5px;cursor:pointer;white-space:nowrap">🤖 odhad</span>`;
}
window.coicopAiZnacka = coicopAiZnacka;

//  Banner nad seznamem kategorií, když jsou nepotvrzené odhady.
function coicopAiBanner() {
  const o = coicopAiOdhady();
  if (!o.length) return '';
  return `<div style="display:flex;gap:10px;align-items:center;background:#60a5fa14;border:1px solid #60a5fa44;border-radius:10px;padding:9px 12px;margin-bottom:10px;font-size:.78rem;line-height:1.45">
    <span style="font-size:1.1rem">🤖</span>
    <span style="flex:1">AI zařadila ${o.length} ${o.length === 1 ? 'tvou kategorii' : o.length < 5 ? 'tvé kategorie' : 'tvých kategorií'} pro srovnání s inflací. Už se započítávají jako <b>odhad</b> – zkontroluj a potvrď.</span>
    <button class="btn btn-sm" onclick="coicopAiDialog()">Zkontrolovat</button></div>`;
}
window.coicopAiBanner = coicopAiBanner;

function coicopAiDialog(catId, sub) {
  const vse = coicopAiOdhady();
  const seznam = catId ? vse.filter(x => x.catId === catId && (x.sub || '') === (sub || '')) : vse;
  let o = document.getElementById('coicopAiOkno');
  if (!o) {
    o = document.createElement('div'); o.id = 'coicopAiOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px';
    o.addEventListener('click', e => { if (e.target === o) coicopAiZavri(); });
    document.body.appendChild(o);
  }
  const moznosti = n => (typeof COICOP_GROUPS_DEF !== 'undefined' ? COICOP_GROUPS_DEF : [])
    .map(g => `<option value="${g.id}"${g.id === Number(n) ? ' selected' : ''}>${g.icon} ${g.id} · ${_caEsc(g.name)}</option>`).join('');
  o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:460px">
    <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:1rem;color:var(--text)">🤖 Zařazení pro srovnání s inflací</div>
      <button onclick="coicopAiZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
    <div style="font-size:.72rem;color:#a8aec8;margin:6px 0 10px;line-height:1.5">COICOP je klasifikace spotřeby, podle které ČSÚ počítá inflaci. Návrh AI se už započítává jako odhad; potvrzením ho zpevníš, změnou opravíš. Tvoje volba vždy platí.</div>
    ${seznam.length ? seznam.map((x, i) => `<div style="padding:8px 0;border-top:1px solid var(--border)">
        <div style="font-size:.84rem;font-weight:700;color:var(--text)">${_caEsc(x.ikona)} ${_caEsc(x.nazev)}${x.rodic ? ` <span style="font-weight:400;color:#a8aec8;font-size:.72rem">v ${_caEsc(x.rodic)}</span>` : ''}</div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          <select class="fi" id="caSel${i}" style="flex:1;min-width:190px;font-size:.78rem">${moznosti(x.coicop)}</select>
          <button class="btn btn-primary btn-sm" data-cat="${_caEsc(x.catId)}" data-sub="${_caEsc(x.sub)}" onclick="coicopAiPotvrd(this.dataset.cat,this.dataset.sub,document.getElementById('caSel${i}').value)">✓ Potvrdit</button>
        </div></div>`).join('')
      : '<div style="font-size:.8rem;color:var(--income)">✅ Vše potvrzeno.</div>'}
  </div>`;
}
function coicopAiZavri() { const o = document.getElementById('coicopAiOkno'); if (o) o.remove(); }

//  Potvrzení / změna: hodnota se zpevní a pošle se anonymní hlas.
async function coicopAiPotvrd(catId, sub, hodnota) {
  const c = (S.categories || []).find(x => x.id === catId); if (!c) return;
  const n = Number(hodnota); if (!(n >= 1 && n <= 13)) return;
  c.coicopAi = c.coicopAi || {};
  if (sub) {
    c.coicopOverrides = Object.assign({}, c.coicopOverrides, { [sub]: n });
    c.coicopAi.subs = Object.assign({}, c.coicopAi.subs, { [sub]: 'potvrzeno' });
  } else { c.coicop = n; c.coicopAi.kat = 'potvrzeno'; }
  if (typeof save === 'function') save();
  if (typeof showToast === 'function') showToast('✓ Zařazeno: ' + ((_caOddil(n) || {}).name || n));
  _coicopAiPost({ akce: 'hlas', klic: coicopAiKlic(sub || c.name), coicop: n }).catch(() => {});
  if (typeof renderCatPage === 'function') renderCatPage();
  const zbyva = coicopAiOdhady().length;
  if (document.getElementById('coicopAiOkno')) { if (zbyva) coicopAiDialog(); else coicopAiZavri(); }
}
Object.assign(window, { coicopAiDialog, coicopAiZavri, coicopAiPotvrd });

// ── admin: společné odpovědi (Admin → Adopce kategorií) ──
async function loadCoicopNavrhyAdmin() {
  const el = document.getElementById('adminCoicopNavrhy'); if (!el) return;
  el.innerHTML = '<div class="card-body" style="font-size:.8rem;color:#a8aec8">⏳ Načítám…</div>';
  try {
    const t = await window._currentUser?.getIdToken?.();
    const r = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/coicopNavrhy.json?auth=${t}`);
    const data = (r.ok ? await r.json() : null) || {};
    const rows = Object.entries(data).map(([k, z]) => ({ k, ...z })).sort((a, b) => (b.pocet || 0) - (a.pocet || 0));
    if (!rows.length) { el.innerHTML = '<div class="card-body" style="font-size:.8rem;color:#a8aec8">Zatím žádné návrhy – vzniknou, až si uživatelé založí vlastní kategorie.</div>'; return; }
    const opt = n => (typeof COICOP_GROUPS_DEF !== 'undefined' ? COICOP_GROUPS_DEF : []).map(g => `<option value="${g.id}"${g.id === Number(n) ? ' selected' : ''}>${g.id} · ${_caEsc(g.name)}</option>`).join('');
    el.innerHTML = `<div class="card-body">
      <div style="font-size:.74rem;color:#a8aec8;margin-bottom:8px">Schválená odpověď se nabízí dalším uživatelům místo návrhu AI. Co si kdo už potvrdil, se nemění.</div>
      ${rows.map(z => {
        const h = z.hlasy || {}; const ai = (z.ai || {}).coicop; const sch = z.schvaleno ? z.schvaleno.coicop : null;
        const potvr = h[ai] || 0; const jine = Object.entries(h).filter(([c]) => Number(c) !== ai);
        return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--border);font-size:.78rem">
          <b style="flex:1;min-width:120px">${_caEsc(z.nazev || z.k)}${z.rodic ? ` <span style="font-weight:400;color:#a8aec8">v ${_caEsc(z.rodic)}</span>` : ''}</b>
          <span style="color:#a8aec8">${z.pocet || 0} uživ. · ✓ ${potvr}${jine.length ? ' · ✎ ' + jine.map(([c, n]) => n + '× na ' + c).join(', ') : ''}</span>
          <select class="fi" data-k="${_caEsc(z.k)}" style="width:auto;font-size:.74rem">${opt(sch != null ? sch : ai)}</select>
          <button class="btn btn-sm" data-k="${_caEsc(z.k)}" onclick="coicopAdminSchval(this.dataset.k,this.previousElementSibling.value)">${sch != null ? '✅ Schváleno – změnit' : 'Schválit'}</button>
        </div>`; }).join('')}</div>`;
  } catch (e) { el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${_caEsc(e.message)}</div>`; }
}
async function coicopAdminSchval(klic, hodnota) {
  const n = Number(hodnota); if (!(n >= 1 && n <= 13) || !/^[a-z0-9_]{1,60}$/.test(klic)) return;
  const t = await window._currentUser?.getIdToken?.();
  const r = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/coicopNavrhy/${klic}/schvaleno.json?auth=${t}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coicop: n, kdy: Date.now() }) });
  if (typeof showToast === 'function') showToast(r.ok ? '✅ Schváleno' : '⚠️ HTTP ' + r.status + ' – nasazená pravidla?');
  loadCoicopNavrhyAdmin();
}
Object.assign(window, { loadCoicopNavrhyAdmin, coicopAdminSchval });
