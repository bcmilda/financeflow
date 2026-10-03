// FinanceFlow · v11.22 · vozidla.js · 2026-10-02
// ══════════════════════════════════════════════════════
//  S24 (E1, Milan): VOZIDLA A TANKOVÁNÍ
//  cesta: Majetek → 🚗 Vozidla  ·  formulář transakce → Auto › Palivo → ⛽ Tankování
//
//  PRINCIP: měření je VLASTNOST transakce, ne nová transakce. Tankování zůstává
//  jednou transakcí v Auto › Palivo (peníze = její částka, nic se nesčítá
//  dvakrát) a nese navíc t.tank = {vozidloId, litry, tachometr, palivo,
//  cenaStojan?, plna?}. Litry a km jsou samostatná metrika.
//
//  Slevové kupony (Milan): cena za litr se NEPOČÍTÁ z částky. Zvlášť „cena
//  u stojanu" (nepovinná) a „zaplaceno" (částka transakce) → ušetřeno na kuponech.
//  Bez plné nádrže: spotřeba KLOUZAVĚ = litry mezi prvním a posledním stavem
//  tachometru / ujeté km. „Plná nádrž" je jen nepovinné zpřesnění.
//
//  Vozidla: users/{uid}/vozidla/{id} (vlastní uzel jako categoryMappings –
//  nemusí se registrovat v diff-write, pravidla kryje kaskáda users/$uid).
// ══════════════════════════════════════════════════════

const VOZ_TYPY = { auto: '🚗 Auto', motorka: '🏍️ Motorka', dodavka: '🚐 Dodávka', elektro: '🔌 Elektroauto', jine: '🛞 Jiné' };
const VOZ_PALIVA = { benzin: 'Benzín', nafta: 'Nafta', lpg: 'LPG', cng: 'CNG', elektrina: 'Elektřina (kWh)', jine: 'Jiné' };
const _VOZ_URL = uid => `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/vozidla`;

let _vozidla = null;            // {id: {id, nazev, typ, palivo, kdy}}
let _tankForm = null;           // stav bloku ⛽ ve formuláři transakce

// ── úložiště vozidel ──
async function loadVozidla(vynutit) {
  if (_vozidla !== null && !vynutit) return _vozidla;
  if (typeof _isLocalMode !== 'undefined' && _isLocalMode) {
    try { _vozidla = JSON.parse(localStorage.getItem('ff_vozidla') || '{}') || {}; } catch (e) { _vozidla = {}; }
    return _vozidla;
  }
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (!uid || !t) return _vozidla || {};
    const r = await fetch(`${_VOZ_URL(uid)}.json?auth=${t}`);
    _vozidla = (r.ok ? await r.json() : null) || {};
  } catch (e) { _vozidla = _vozidla || {}; }
  return _vozidla;
}
async function _vozUloz(id, v) {
  _vozidla = _vozidla || {};
  if (v) _vozidla[id] = v; else delete _vozidla[id];
  if (typeof _isLocalMode !== 'undefined' && _isLocalMode) {
    try { localStorage.setItem('ff_vozidla', JSON.stringify(_vozidla)); } catch (e) {} return true;
  }
  try {
    const uid = window._currentUser?.uid; const t = await window._currentUser?.getIdToken?.();
    if (!uid || !t) return false;
    const r = await fetch(`${_VOZ_URL(uid)}/${id}.json?auth=${t}`, v
      ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) }
      : { method: 'DELETE' });
    return r.ok;
  } catch (e) { return false; }
}
function vozidlaSeznam() {
  return Object.values(_vozidla || {}).filter(v => v && v.id).sort((a, b) => (a.kdy || 0) - (b.kdy || 0));
}
const _vozIkona = v => (VOZ_TYPY[v && v.typ] || '🚗').split(' ')[0];
const _vozEsc = s => (typeof escHtml === 'function') ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _vozCislo = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.').replace(/\s/g, '')); return isFinite(n) ? n : null; };

// ── rozpoznání tankovací transakce ──
//  Kategorie Auto (výchozí cat11 nebo název) + podkategorie palivo/benzín/nafta/nabíjení.
function tankJeKategorie(catId, sub, D) {
  D = D || (typeof getData === 'function' ? getData() : { categories: [] });
  const c = (D.categories || []).find(x => x.id === catId);
  if (!c) return false;
  const auto = c.id === 'cat11' || /auto|vozidl|motork/i.test(c.name || '');
  return auto && /paliv|benz|naft|lpg|cng|nabíj|nabij|tank/i.test(sub || '');
}

//  Z poznámky „20l 83448", „32,5 l N95 83 448 km", „38,90 Kč/l" vytáhne údaje.
//  Tachometr = celé číslo o 4–7 cifrách (i s mezerou po tisících), které není litrů.
function tankZPoznamky(text) {
  const s = String(text || '').toLowerCase().replace(/\u00a0/g, ' ');
  const out = {};
  const ml = s.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litr\w*)(?![a-z])/);
  if (ml) out.litry = _vozCislo(ml[1]);
  const mc = s.match(/(\d+[.,]\d{1,2})\s*(?:kč|kc|,-)?\s*\/\s*l/);
  if (mc) out.cenaStojan = _vozCislo(mc[1]);
  let bez = s;
  if (ml) bez = bez.replace(ml[0], ' ');
  if (mc) bez = bez.replace(mc[0], ' ');
  const mt = bez.match(/(?:^|[^\d.,])(\d{1,3}(?:\s\d{3})+|\d{4,7})\s*(?:km)?(?![\d.,])/);
  if (mt) { const n = parseInt(mt[1].replace(/\s/g, ''), 10); if (n >= 1000 && n < 10000000) out.tachometr = n; }
  if (/\bn(?:atural)?\s?9[58]\b|\bbenz|\bba\s?9[58]\b|\bsuper\b/.test(s)) out.palivo = 'benzin';
  else if (/\bnaft|\bdiesel|\bdiz|\bd\s?miles/.test(s)) out.palivo = 'nafta';
  else if (/\blpg\b/.test(s)) out.palivo = 'lpg';
  else if (/\bcng\b/.test(s)) out.palivo = 'cng';
  else if (/\bkwh\b/.test(s)) out.palivo = 'elektrina';
  if (/pln[áa]\s*n[áa]dr|full/.test(s)) out.plna = true;
  return out;
}

//  Normalizace uložených dat tankování (null = nic k uložení).
function tankNormalizuj(f) {
  if (!f) return null;
  const litry = _vozCislo(f.litry), tach = _vozCislo(f.tachometr), cena = _vozCislo(f.cenaStojan);
  if (!(litry > 0) && !(tach > 0)) return null;
  const o = { vozidloId: String(f.vozidloId || '') };
  if (litry > 0) o.litry = Math.round(litry * 100) / 100;
  if (tach > 0) o.tachometr = Math.round(tach);
  if (cena > 0) o.cenaStojan = Math.round(cena * 100) / 100;
  if (f.palivo && VOZ_PALIVA[f.palivo]) o.palivo = f.palivo;
  if (f.plna) o.plna = true;
  return o;
}

// ── výpočty (čisté funkce, testuje tools/smoke_vozidla.js) ──
//  zaznamy = [{datum, zaplaceno, litry?, tachometr?, cenaStojan?, plna?}]
function tankStatistiky(zaznamy) {
  const z = (zaznamy || []).filter(x => x && (x.litry > 0 || x.tachometr > 0))
    .sort((a, b) => (a.datum || '').localeCompare(b.datum || '') || (a.tachometr || 0) - (b.tachometr || 0));
  const litryCelkem = z.reduce((a, x) => a + (x.litry || 0), 0);
  const kcCelkem = z.reduce((a, x) => a + (x.zaplaceno || 0), 0);
  const sLitry = z.filter(x => x.litry > 0);
  const kcZaLitry = sLitry.reduce((a, x) => a + (x.zaplaceno || 0), 0);
  const cenaEfektivni = litryCelkem > 0 ? kcZaLitry / litryCelkem : null;
  //  Ušetřeno na kuponech: jen tam, kde je vyplněná cena u stojanu.
  const usetreno = z.reduce((a, x) => a + ((x.cenaStojan > 0 && x.litry > 0) ? Math.max(0, x.litry * x.cenaStojan - (x.zaplaceno || 0)) : 0), 0);
  //  Klouzavá spotřeba: litry natankované PO prvním stavu tachometru až do
  //  posledního (první tankování pokrylo km před prvním zápisem).
  const sTach = z.filter(x => x.tachometr > 0);
  let km = null, spotreba = null, cenaZaKm = null, spolehliva = false;
  if (sTach.length >= 2) {
    const prvni = sTach[0], posl = sTach[sTach.length - 1];
    km = posl.tachometr - prvni.tachometr;
    if (km > 0) {
      const iP = z.indexOf(prvni), iK = z.indexOf(posl);
      const usek = z.slice(iP + 1, iK + 1);
      const l = usek.reduce((a, x) => a + (x.litry || 0), 0);
      const kc = usek.reduce((a, x) => a + (x.zaplaceno || 0), 0);
      if (l > 0) spotreba = l / km * 100;
      cenaZaKm = kc / km;
      spolehliva = usek.filter(x => x.litry > 0).length >= 3 || !!(prvni.plna && posl.plna);
    } else km = null;
  }
  const mesice = {};
  z.forEach(x => {
    const m = (x.datum || '').slice(0, 7); if (!m) return;
    const o = mesice[m] || (mesice[m] = { mesic: m, litry: 0, kc: 0, pocet: 0 });
    o.litry += x.litry || 0; o.kc += x.zaplaceno || 0; o.pocet++;
  });
  return {
    pocet: z.length, litryCelkem, kcCelkem, cenaEfektivni, usetreno, km, spotreba, cenaZaKm, spolehliva,
    posledniTachometr: sTach.length ? sTach[sTach.length - 1].tachometr : null,
    mesice: Object.values(mesice).sort((a, b) => a.mesic.localeCompare(b.mesic)),
    zaznamy: z,
  };
}
window.tankStatistiky = tankStatistiky;

//  Záznamy tankování z transakcí (volitelně pro jedno vozidlo).
function tankZaznamy(D, vozidloId) {
  D = D || getData();
  return (D.transactions || []).filter(t => t && t.tank && t.type === 'expense'
      && (vozidloId == null || (t.tank.vozidloId || '') === vozidloId))
    .map(t => ({ id: t.id, datum: t.date || '', zaplaceno: (typeof txCZK === 'function') ? txCZK(t, D) : (parseFloat(t.amount || t.amt) || 0),
      litry: t.tank.litry || 0, tachometr: t.tank.tachometr || 0, cenaStojan: t.tank.cenaStojan || 0, plna: !!t.tank.plna,
      palivo: t.tank.palivo || '', nazev: t.name || '' }));
}
window.tankZaznamy = tankZaznamy;

// ── blok ⛽ ve formuláři transakce ──
//  Volá renderSubPicker (debts.js) po každé změně kategorie/podkategorie
//  a editTx / otevření nového formuláře přes tankNaplnFormular().
function tankNaplnFormular(tank) {
  _tankForm = tank ? Object.assign({}, tank) : null;
  _tankForm && (_tankForm._z = true);   // z uložené transakce – nepřepisovat z poznámky
}
function tankObnov() {
  const el = document.getElementById('txTankBlock'); if (!el) return;
  const catId = (typeof selCatId !== 'undefined') ? selCatId : '';
  const sub = (document.getElementById('customSubInput')?.value || '').trim() || ((typeof selSub !== 'undefined') ? selSub : '');
  const typ = (typeof curTxType !== 'undefined') ? curTxType : 'expense';
  //  S24 (v11.17): u PŘÍJMU s podkategorií „Příspěvek na cestu" stejné místo ukáže výběr vozidla.
  if (typ === 'income' && PRISP_RE.test(sub)) { prispObnov(el); return; }
  if (typ !== 'expense' || !tankJeKategorie(catId, sub)) { el.style.display = 'none'; el.innerHTML = ''; return; }
  if (_vozidla === null) { loadVozidla().then(() => tankObnov()); }
  const voz = vozidlaSeznam();
  if (!_tankForm) {
    _tankForm = {};
    //  Předvyplnění z poznámky („20l 83448") – nový zápis, ať nemusíš psát dvakrát.
    const p = tankZPoznamky(document.getElementById('txNote')?.value || '');
    Object.assign(_tankForm, p);
  }
  if (!_tankForm.vozidloId && voz.length) {
    let posl = ''; try { posl = localStorage.getItem('ff_vozidloPosl') || ''; } catch (e) {}
    _tankForm.vozidloId = voz.some(v => v.id === posl) ? posl : voz[voz.length - 1].id;
  }
  const vv = voz.find(v => v.id === _tankForm.vozidloId);
  if (!_tankForm.palivo && vv && vv.palivo) _tankForm.palivo = vv.palivo;
  const jed = _tankForm.palivo === 'elektrina' ? 'kWh' : 'l';
  const f = _tankForm;
  const inp = (id, pole, ph, extra) => `<input class="fi" id="${id}" inputmode="decimal" placeholder="${ph}" value="${f[pole] != null ? _vozEsc(f[pole]) : ''}"
      oninput="tankPole('${pole}',this.value)" style="font-size:.82rem" ${extra || ''}>`;
  el.style.display = 'block';
  el.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-weight:700;font-size:.82rem;color:var(--text)">⛽ Tankování <span style="font-weight:400;color:#a8aec8;font-size:.7rem">· nepovinné</span></div>
      <button type="button" onclick="vozidlaSprava()" style="background:none;border:none;color:#60a5fa;font-size:.72rem;cursor:pointer">🚗 Vozidla</button>
    </div>
    ${voz.length ? `<select class="fi" style="font-size:.82rem;margin-bottom:8px" onchange="tankPole('vozidloId',this.value)">
        ${voz.map(v => `<option value="${_vozEsc(v.id)}"${v.id === f.vozidloId ? ' selected' : ''}>${_vozEsc(_vozIkona(v) + ' ' + v.nazev)}</option>`).join('')}
      </select>` : `<div style="font-size:.74rem;color:#a8aec8;margin-bottom:8px">Zatím nemáš žádné vozidlo. <a href="#" onclick="vozidlaSprava();return false" style="color:#60a5fa">Přidat vozidlo</a> – údaje se uloží i bez něj.</div>`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Natankováno (${jed})</div>${inp('tankLitry', 'litry', '20')}</div>
      <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Stav tachometru (km)</div>${inp('tankTach', 'tachometr', '83448')}</div>
      <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Cena u stojanu (Kč/${jed})</div>${inp('tankCena', 'cenaStojan', 'nepovinné')}</div>
      <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Palivo</div>
        <select class="fi" style="font-size:.82rem" onchange="tankPole('palivo',this.value)">
          <option value="">—</option>${Object.entries(VOZ_PALIVA).map(([k, n]) => `<option value="${k}"${f.palivo === k ? ' selected' : ''}>${n}</option>`).join('')}
        </select></div>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:.74rem;color:#a8aec8;margin-top:8px;cursor:pointer">
      <input type="checkbox" ${f.plna ? 'checked' : ''} onchange="tankPole('plna',this.checked)"> Plná nádrž (zpřesní spotřebu, není nutné)</label>
    <div id="tankInfo" style="font-size:.7rem;color:#a8aec8;margin-top:6px">${tankInfoText()}</div>
  </div>`;
}
function tankPole(pole, hodnota) {
  _tankForm = _tankForm || {};
  _tankForm[pole] = hodnota;
  if (pole === 'vozidloId') {
    try { localStorage.setItem('ff_vozidloPosl', hodnota); } catch (e) {}
    const v = vozidlaSeznam().find(x => x.id === hodnota);
    if (v && v.palivo) _tankForm.palivo = v.palivo;
    tankObnov(); return;
  }
  if (pole === 'palivo') { tankObnov(); return; }
  const i = document.getElementById('tankInfo'); if (i) i.innerHTML = tankInfoText();
}
//  Průběžná nápověda: efektivní cena za litr, ušetřeno, ujeto od minula.
function tankInfoText() {
  const f = _tankForm || {};
  const amt = _vozCislo(document.getElementById('txAmt')?.value);
  const l = _vozCislo(f.litry), c = _vozCislo(f.cenaStojan), t = _vozCislo(f.tachometr);
  const b = [];
  if (amt > 0 && l > 0) b.push('zaplaceno ' + (amt / l).toFixed(2).replace('.', ',') + ' Kč/' + (f.palivo === 'elektrina' ? 'kWh' : 'l'));
  if (amt > 0 && l > 0 && c > 0 && l * c > amt) b.push('<span style="color:var(--income)">ušetřeno ' + Math.round(l * c - amt) + ' Kč</span>');
  if (t > 0 && f.vozidloId) {
    const eid = document.getElementById('editTxId')?.value || '';
    const pred = tankZaznamy(null, f.vozidloId).filter(x => x.tachometr > 0 && x.id != eid && x.tachometr < t)
      .sort((a, b2) => b2.tachometr - a.tachometr)[0];
    if (pred) b.push('ujeto ' + (t - pred.tachometr).toLocaleString('cs-CZ') + ' km od minula');
  }
  return b.join(' · ');
}
//  Pro saveTx (debts.js): data k uložení, nebo null.
function tankZFormulare(catId, sub) {
  if (!tankJeKategorie(catId, sub)) return null;
  const o = tankNormalizuj(_tankForm);
  if (o && o.vozidloId) { try { localStorage.setItem('ff_vozidloPosl', o.vozidloId); } catch (e) {} }
  return o;
}
Object.assign(window, { tankObnov, tankPole, tankNaplnFormular, tankZFormulare, tankJeKategorie, tankZPoznamky, tankNormalizuj });

// ── správa vozidel (okno) ──
function vozidlaSprava() {
  let o = document.getElementById('vozOkno');
  if (!o) {
    o = document.createElement('div'); o.id = 'vozOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px';
    o.addEventListener('click', e => { if (e.target === o) vozidlaZavri(); });
    document.body.appendChild(o);
  }
  loadVozidla().then(() => {
    const voz = vozidlaSeznam();
    o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:440px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:800;font-size:1rem;color:var(--text)">🚗 Moje vozidla</div>
        <button onclick="vozidlaZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
      ${voz.length ? voz.map(v => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:1.2rem">${_vozIkona(v)}</span>
          <div style="flex:1"><div style="font-weight:700;font-size:.86rem">${_vozEsc(v.nazev)}</div>
            <div style="font-size:.7rem;color:#a8aec8">${_vozEsc((VOZ_TYPY[v.typ] || '').replace(/^\S+\s/, ''))}${v.palivo ? ' · ' + _vozEsc(VOZ_PALIVA[v.palivo] || '') : ''}</div></div>
          <button class="btn btn-sm" style="font-size:.7rem;color:var(--expense)" onclick="vozidloSmaz('${_vozEsc(v.id)}')">Smazat</button>
        </div>`).join('') : '<div style="font-size:.78rem;color:#a8aec8;margin-bottom:8px">Zatím žádné vozidlo.</div>'}
      <div style="margin-top:12px;font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em">Přidat vozidlo</div>
      <input class="fi" id="vozNazev" placeholder="Název (Octavia, Honda…)" maxlength="40" style="margin-top:6px;font-size:.84rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <select class="fi" id="vozTyp" style="font-size:.82rem">${Object.entries(VOZ_TYPY).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
        <select class="fi" id="vozPalivo" style="font-size:.82rem">${Object.entries(VOZ_PALIVA).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px" onclick="vozidloPridej()">➕ Přidat</button>
    </div>`;
  });
}
function vozidlaZavri() { const o = document.getElementById('vozOkno'); if (o) o.remove(); }
async function vozidloPridej() {
  const nazev = (document.getElementById('vozNazev')?.value || '').trim().slice(0, 40);
  if (!nazev) { if (typeof showToast === 'function') showToast('Zadej název vozidla'); return; }
  const id = 'v' + Date.now().toString(36);
  const v = { id, nazev, typ: document.getElementById('vozTyp')?.value || 'auto', palivo: document.getElementById('vozPalivo')?.value || '', kdy: Date.now() };
  const ok = await _vozUloz(id, v);
  if (typeof showToast === 'function') showToast(ok ? '🚗 Vozidlo přidáno' : '⚠️ Uložení se nepovedlo');
  try { localStorage.setItem('ff_vozidloPosl', id); } catch (e) {}
  if (_tankForm) { _tankForm.vozidloId = id; if (v.palivo) _tankForm.palivo = v.palivo; }
  vozidlaSprava(); tankObnov(); if (typeof curPage !== 'undefined' && curPage === 'vozidla') renderVozidlaPage();
}
async function vozidloSmaz(id) {
  const n = tankZaznamy(null, id).length;
  if (!confirm(n ? `Smazat vozidlo? ${n} tankování zůstane uloženo, jen bez vozidla.` : 'Smazat vozidlo?')) return;
  await _vozUloz(id, null);
  vozidlaSprava(); tankObnov(); if (typeof curPage !== 'undefined' && curPage === 'vozidla') renderVozidlaPage();
}
Object.assign(window, { vozidlaSprava, vozidlaZavri, vozidloPridej, vozidloSmaz, loadVozidla, vozidlaSeznam });

// ── stránka 🚗 Vozidla ──
const _vozKc = v => Math.round(v).toLocaleString('cs-CZ') + ' Kč';
const _vozDes = (v, d) => v == null ? '—' : v.toFixed(d).replace('.', ',');

function vozidlaKartaHTML(nazev, ikona, st, jed, id) {
  const dl = (l, v, p) => `<div style="background:var(--bg);border-radius:10px;padding:9px 11px">
      <div style="font-size:.66rem;color:#a8aec8">${l}</div><div style="font-size:1.05rem;font-weight:800;color:var(--text)">${v}</div>
      ${p ? `<div style="font-size:.62rem;color:#8b93ad">${p}</div>` : ''}</div>`;
  const posl12 = st.mesice.slice(-12);
  const max = Math.max(1, ...posl12.map(m => m.kc));
  const graf = posl12.length ? `<div style="display:flex;align-items:flex-end;gap:4px;height:70px;margin-top:10px">${posl12.map(m =>
      `<div title="${m.mesic}: ${_vozKc(m.kc)} · ${_vozDes(m.litry, 1)} ${jed}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="width:100%;height:${Math.max(3, m.kc / max * 58)}px;background:linear-gradient(180deg,#60a5fa,#3b82f6);border-radius:3px 3px 0 0"></div>
        <div style="font-size:.52rem;color:#8b93ad">${m.mesic.slice(5)}</div></div>`).join('')}</div>` : '';
  return `<div class="card" style="margin-bottom:12px"><div class="card-body">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      ${ffIlustrace(ikona === '🔌' ? 'elektro' : 'pumpa', 46)}
      <div style="flex:1"><div style="font-weight:800;font-size:1rem;color:var(--text)">${_vozEsc(nazev)}</div>
        <div style="font-size:.72rem;color:#a8aec8">${st.pocet} tankování${st.posledniTachometr ? ' · tachometr ' + st.posledniTachometr.toLocaleString('cs-CZ') + ' km' : ''}</div></div>
      <button class="btn btn-sm" onclick="vozidloDetail('${_vozEsc(id || '')}')">📊 Detail</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">
      ${dl('Spotřeba', st.spotreba != null ? _vozDes(st.spotreba, 1) + ' ' + jed + '/100 km' : '—', st.spotreba != null ? (st.spolehliva ? 'klouzavý průměr' : 'přibližná – zpřesní se dalším tankováním') : 'potřebuje 2 stavy tachometru')}
      ${dl('Cena za km', st.cenaZaKm != null ? _vozDes(st.cenaZaKm, 2) + ' Kč' : '—', st.km ? 'ujeto ' + st.km.toLocaleString('cs-CZ') + ' km' : '')}
      ${dl('Průměrná cena', st.cenaEfektivni != null ? _vozDes(st.cenaEfektivni, 2) + ' Kč/' + jed : '—', 'co jsi opravdu zaplatil')}
      ${dl('Natankováno', _vozDes(st.litryCelkem, 1) + ' ' + jed, _vozKc(st.kcCelkem))}
      ${st.usetreno > 0 ? dl('Ušetřeno na kuponech', '<span style="color:var(--income)">' + _vozKc(st.usetreno) + '</span>', 'proti ceně u stojanu') : ''}
    </div>
    ${graf}
  </div></div>`;
}

function renderVozidlaPage() {
  const el = document.getElementById('vozidlaContent'); if (!el) return;
  if (_vozidla === null) { el.innerHTML = '<div class="empty"><div class="ei">🚗</div><div class="et">Načítám…</div></div>'; loadVozidla().then(renderVozidlaPage); return; }
  const D = getData();
  const voz = vozidlaSeznam();
  const intro = (typeof tabIntro === 'function') ? tabIntro('vozidla', '🚗', 'Vozidla a tankování',
    'Kolik litrů jsi natankoval, za kolik, kolik jsi najel a jaká je skutečná spotřeba. Údaje zapisuješ přímo u transakce v kategorii <strong>Auto › Palivo</strong> (blok ⛽ Tankování) – nic se nezapisuje dvakrát a peníze se nepočítají dvakrát.') : '';
  const karty = voz.map(v => vozidlaKartaHTML(v.nazev, _vozIkona(v), tankStatistiky(tankZaznamy(D, v.id)), v.palivo === 'elektrina' ? 'kWh' : 'l', v.id)).join('');
  const bez = tankZaznamy(D, '');
  const kartaBez = bez.length ? vozidlaKartaHTML('Bez přiřazeného vozidla', '⛽', tankStatistiky(bez), 'l', '') : '';
  el.innerHTML = intro + `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="btn btn-primary" onclick="vozidlaSprava()">🚗 ${voz.length ? 'Spravovat vozidla' : 'Přidat vozidlo'}</button>
    </div>
    ${karty}${kartaBez}
    ${!voz.length && !bez.length ? `<div class="empty"><div class="ei">⛽</div><div class="et">Zatím žádná tankování</div>
      <div style="font-size:.78rem;color:#a8aec8;margin-top:6px;line-height:1.5">Přidej vozidlo a u další transakce v <b>Auto › Palivo</b> vyplň litry a stav tachometru.</div></div>` : ''}
`;
}
window.renderVozidlaPage = renderVozidlaPage;

//  S24 (v11.12, Milan): převod starých poznámek odstraněn – evidenci vede v jiné aplikaci.

//  Poznámka napsaná až po výběru kategorie („20l 83448") doplní prázdný blok.
function tankDoplnZPoznamky() {
  const el = document.getElementById('txTankBlock');
  if (!el || el.style.display === 'none' || (_tankForm && _tankForm._z)) return;
  const f = _tankForm || {};
  if (_vozCislo(f.litry) > 0 || _vozCislo(f.tachometr) > 0) return;
  const p = tankZPoznamky(document.getElementById('txNote')?.value || '');
  if (!p.litry && !p.tachometr) return;
  _tankForm = Object.assign(f, p);
  tankObnov();
}
window.tankDoplnZPoznamky = tankDoplnZPoznamky;
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('change', e => { if (e.target && e.target.id === 'txNote') tankDoplnZPoznamky(); });
  document.addEventListener('input', e => {
    if (e.target && e.target.id === 'txAmt') { const i = document.getElementById('tankInfo'); if (i) i.innerHTML = tankInfoText(); }
  });
}

// ══════════════════════════════════════════════════════
//  S24 (v11.14, Milan): DETAIL VOZIDLA + PŘÍSPĚVKY NA CESTU
//  cesta: Majetek → 🚗 Vozidla → karta vozidla → „📊 Detail"
//  Tabulka tankování (datum, tachometr, ujeto, litry, cena/l, zaplaceno),
//  souhrn a grafy. Příspěvky od lidí (spolujízda, „cashback" od kolegů) jsou
//  PŘÍJMOVÉ transakce s t.vozPrispevek = {vozidloId, od} – zapíší se jednou
//  (jsou to skutečně přijaté peníze), vozidlo z nich jen počítá čistý náklad.
// ══════════════════════════════════════════════════════

//  Jednoduchý sloupcový graf (SVG přes HTML) – sdílí ho i meridla.js.
function ffGrafSloupce(data, o) {
  o = o || {};
  if (!data || !data.length) return '';
  const max = Math.max(1e-9, ...data.map(d => (d.a || 0) + (d.b || 0)));
  const vyska = o.vyska || 90;
  return `<div style="display:flex;align-items:flex-end;gap:${data.length > 24 ? 2 : 4}px;height:${vyska + 16}px;overflow-x:auto">${data.map(d => {
    const ha = (d.a || 0) / max * vyska, hb = (d.b || 0) / max * vyska;
    return `<div title="${_vozEsc(d.titul || '')}" style="flex:1;min-width:${o.min || 10}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
      ${hb > 0 ? `<div style="width:100%;height:${Math.max(2, hb)}px;background:${o.barvaB || '#a78bfa'};border-radius:3px 3px 0 0"></div>` : ''}
      <div style="width:100%;height:${Math.max(ha > 0 ? 2 : 0, ha)}px;background:${o.barva || '#60a5fa'};border-radius:${hb > 0 ? '0' : '3px 3px'} 0 0"></div>
      <div style="font-size:.5rem;color:#8b93ad;margin-top:2px;white-space:nowrap">${_vozEsc(d.popis || '')}</div></div>`;
  }).join('')}</div>`;
}
//  Čárový graf jedné řady (cena za litr v čase apod.).
function ffGrafCara(body, o) {
  o = o || {};
  const b = (body || []).filter(x => x && x.y != null);
  if (b.length < 2) return '';
  const W = 600, H = o.vyska || 110, P = 24;
  const ys = b.map(x => x.y), mn = Math.min(...ys), mx = Math.max(...ys), r = (mx - mn) || 1;
  const X = i => P + i * (W - 2 * P) / (b.length - 1), Y = v => H - P - (v - mn) / r * (H - 2 * P);
  const d = b.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x.y).toFixed(1)).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
    <path d="${d}" fill="none" stroke="${o.barva || '#34d399'}" stroke-width="2.5"/>
    ${b.map((x, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(x.y).toFixed(1)}" r="3.5" fill="${o.barva || '#34d399'}"><title>${_vozEsc(x.titul || '')}</title></circle>`).join('')}
    <text x="4" y="${Y(mx) + 4}" font-size="11" fill="#8b93ad">${_vozEsc(o.fmt ? o.fmt(mx) : mx)}</text>
    <text x="4" y="${Y(mn) + 4}" font-size="11" fill="#8b93ad">${_vozEsc(o.fmt ? o.fmt(mn) : mn)}</text></svg>`;
}
window.ffGrafSloupce = ffGrafSloupce; window.ffGrafCara = ffGrafCara;

//  Úseky mezi tankováními (čistá funkce).
function tankUseky(zaznamy) {
  const z = (zaznamy || []).slice().sort((a, b) => (a.datum || '').localeCompare(b.datum || '') || (a.tachometr || 0) - (b.tachometr || 0));
  let predTach = null;
  return z.map(x => {
    const ujeto = (x.tachometr > 0 && predTach != null && x.tachometr > predTach) ? x.tachometr - predTach : null;
    if (x.tachometr > 0) predTach = x.tachometr;
    return Object.assign({}, x, {
      ujeto,
      cenaZaplacenoL: x.litry > 0 ? x.zaplaceno / x.litry : null,
      spotrebaUseku: (ujeto && x.litry > 0) ? x.litry / ujeto * 100 : null,
    });
  });
}
window.tankUseky = tankUseky;

//  S24 (v11.17, Milan: „příspěvek zapsaný v Transakcích se do Vozidla nepropíše"):
//  příspěvek se pozná i podle podkategorie „Příspěvek na cestu" / spolujízda, ne jen
//  podle vazby z formuláře vozidla. Bez vazby: má-li uživatel jediné vozidlo, patří
//  jemu; jinak je „nepřiřazený" (vozidloId '') a detail ho ukáže s výzvou k přiřazení.
const PRISP_RE = /p[řr][íi]sp[ěe]vek na cestu|spoluj[íi]zd/i;
function prispevekVozidlo(t, voz) {
  if (t.vozPrispevek && t.vozPrispevek.vozidloId) return t.vozPrispevek.vozidloId;
  voz = voz || vozidlaSeznam();
  return voz.length === 1 ? voz[0].id : '';
}
function prispevkyZaznamy(D, vozidloId) {
  D = D || getData();
  const voz = vozidlaSeznam();
  return (D.transactions || []).filter(t => t && t.type === 'income' && (t.vozPrispevek || PRISP_RE.test(t.subcat || '') || PRISP_RE.test(t.name || '')))
    .map(t => ({ id: t.id, datum: t.date || '', castka: (typeof txCZK === 'function') ? txCZK(t, D) : (parseFloat(t.amount || t.amt) || 0),
      od: (t.vozPrispevek && t.vozPrispevek.od) || '', vozidloId: prispevekVozidlo(t, voz), propojeno: !!t.vozPrispevek, nazev: t.name || '' }))
    .filter(x => vozidloId == null || x.vozidloId === vozidloId)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
}
window.prispevkyZaznamy = prispevkyZaznamy;

let _vozDetailId = null;
function vozidloDetail(id) {
  _vozDetailId = id;
  const D = getData();
  const v = id ? vozidlaSeznam().find(x => x.id === id) : null;
  const nazev = v ? v.nazev : 'Bez přiřazeného vozidla';
  const jed = v && v.palivo === 'elektrina' ? 'kWh' : 'l';
  const zazn = tankZaznamy(D, id || '');
  const st = tankStatistiky(zazn);
  const us = tankUseky(zazn);
  const pr = id ? prispevkyZaznamy(D, id) : [];
  const prSum = pr.reduce((a, p) => a + p.castka, 0);
  const cisty = st.kcCelkem - prSum;
  const fmtKc = x => x == null ? '—' : _vozDes(x, 2).replace(/,00$/, '') + ' Kč';
  const dl = (l, h, p) => `<div style="background:var(--bg);border-radius:10px;padding:9px 11px"><div style="font-size:.66rem;color:#a8aec8">${l}</div>
      <div style="font-size:1.02rem;font-weight:800;color:var(--text)">${h}</div>${p ? `<div style="font-size:.62rem;color:#8b93ad">${p}</div>` : ''}</div>`;
  const th = t => `<th style="text-align:right;padding:6px 8px;font-size:.66rem;color:#a8aec8;font-weight:600;white-space:nowrap">${t}</th>`;
  const td = (t, l) => `<td style="text-align:${l ? 'left' : 'right'};padding:6px 8px;font-size:.76rem;white-space:nowrap">${t}</td>`;
  const tab = us.length ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">${th('Datum').replace('right', 'left')}${th('Tachometr')}${th('Ujeto')}${th('Natankováno')}${th('Cena/' + jed)}${th('Zaplaceno')}${th('Spotřeba')}</tr></thead>
      <tbody>${us.slice().reverse().map(x => `<tr style="border-bottom:1px solid var(--border)">
        ${td(_vozEsc(x.datum.split('-').reverse().join('. ')), true)}
        ${td(x.tachometr ? x.tachometr.toLocaleString('cs-CZ') + ' km' : '—')}
        ${td(x.ujeto ? x.ujeto.toLocaleString('cs-CZ') + ' km' : '—')}
        ${td(x.litry ? _vozDes(x.litry, 2) + ' ' + jed : '—')}
        ${td(x.cenaZaplacenoL ? _vozDes(x.cenaZaplacenoL, 2) + (x.cenaStojan ? `<div style="font-size:.6rem;color:#8b93ad">stojan ${_vozDes(x.cenaStojan, 2)}</div>` : '') : '—')}
        ${td(fmtKc(x.zaplaceno))}
        ${td(x.spotrebaUseku ? _vozDes(x.spotrebaUseku, 1) : '—')}</tr>`).join('')}
      <tr style="font-weight:800">${td('Celkem', true)}${td('')}${td(st.km ? st.km.toLocaleString('cs-CZ') + ' km' : '—')}${td(_vozDes(st.litryCelkem, 2) + ' ' + jed)}${td(st.cenaEfektivni ? _vozDes(st.cenaEfektivni, 2) : '—')}${td(fmtKc(st.kcCelkem))}${td(st.spotreba ? _vozDes(st.spotreba, 1) : '—')}</tr>
      </tbody></table></div>
      <div style="font-size:.64rem;color:#8b93ad;margin-top:4px">Spotřeba úseku = natankováno ÷ ujeto od minula. Bez plné nádrže kolísá – spolehlivý je klouzavý průměr v souhrnu.</div>`
    : '<div style="font-size:.78rem;color:#a8aec8">Zatím žádné tankování.</div>';
  const mes = st.mesice.slice(-12).map(m => ({ popis: m.mesic.slice(5) + '/' + m.mesic.slice(2, 4), a: m.kc, titul: `${m.mesic}: ${_vozKc(m.kc)} · ${_vozDes(m.litry, 1)} ${jed}` }));
  const ceny = us.filter(x => x.cenaZaplacenoL).map(x => ({ y: x.cenaZaplacenoL, titul: `${x.datum}: ${_vozDes(x.cenaZaplacenoL, 2)} Kč/${jed}` }));
  const prHTML = id ? `<div style="margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em">🤝 Příspěvky na cestu</div>
        <button class="btn btn-sm" onclick="vozPrispevekForm('${_vozEsc(id)}')">➕ Zapsat příspěvek</button></div>
      <div style="font-size:.68rem;color:#8b93ad;margin:4px 0 6px">Kolegové, spolujízda, vratky – zapíše se jako příjem (jednou) a sníží čistý náklad vozidla.</div>
      ${pr.length ? pr.map(p => `<div style="display:flex;justify-content:space-between;font-size:.76rem;padding:5px 0;border-top:1px solid var(--border)">
          <span>${_vozEsc(p.datum.split('-').reverse().join('. '))} · ${_vozEsc(p.od || p.nazev || 'příspěvek')}</span><span style="color:var(--income)">+${_vozKc(p.castka)}</span></div>`).join('') : '<div style="font-size:.76rem;color:#a8aec8">Zatím žádné.</div>'}
      ${(() => { const nep = prispevkyZaznamy(D, ''); return nep.length ? `<div style="font-size:.7rem;color:#fbbf24;margin-top:8px">⚠️ ${nep.length} příspěvků z Transakcí nemá vybrané vozidlo (máš víc vozidel). Otevři transakci a vyber vozidlo v bloku 🚗.</div>` : ''; })()}
    </div>` : '';
  let o = document.getElementById('vozDetailOkno');
  if (!o) {
    o = document.createElement('div'); o.id = 'vozDetailOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 10px calc(16px + env(safe-area-inset-bottom))';
    o.addEventListener('click', e => { if (e.target === o) vozidloDetailZavri(); });
    document.body.appendChild(o);
  }
  o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:760px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem;color:var(--text)">${ffIlustrace(v && v.typ === 'elektro' ? 'elektro' : 'pumpa', 38)} ${v ? _vozIkona(v) : '⛽'} ${_vozEsc(nazev)} · detail</div>
      <button onclick="vozidloDetailZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px">
      ${dl('Zaplaceno celkem', _vozKc(st.kcCelkem), st.pocet + ' tankování')}
      ${dl('Najeto', st.km ? st.km.toLocaleString('cs-CZ') + ' km' : '—', st.posledniTachometr ? 'tachometr ' + st.posledniTachometr.toLocaleString('cs-CZ') : '')}
      ${dl('Natankováno', _vozDes(st.litryCelkem, 1) + ' ' + jed, st.cenaEfektivni ? 'Ø ' + _vozDes(st.cenaEfektivni, 2) + ' Kč/' + jed : '')}
      ${dl('Spotřeba', st.spotreba != null ? _vozDes(st.spotreba, 1) + ' ' + jed + '/100 km' : '—', st.spolehliva ? 'klouzavý průměr' : 'přibližná')}
      ${dl('Cena za km', st.cenaZaKm != null ? _vozDes(st.cenaZaKm, 2) + ' Kč' : '—', '')}
      ${id ? dl('Příspěvky', '<span style="color:var(--income)">' + _vozKc(prSum) + '</span>', pr.length + '×') : ''}
      ${id && prSum ? dl('Čistý náklad', _vozKc(cisty), st.km ? _vozDes(cisty / st.km, 2) + ' Kč/km' : '') : ''}
      ${st.usetreno > 0 ? dl('Ušetřeno na kuponech', '<span style="color:var(--income)">' + _vozKc(st.usetreno) + '</span>', '') : ''}
    </div>
    ${mes.length ? `<div style="margin-top:16px;font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em">Útrata za palivo po měsících</div>${ffGrafSloupce(mes, { barva: '#60a5fa' })}` : ''}
    ${ceny.length >= 2 ? `<div style="margin-top:14px;font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em">Zaplacená cena za ${jed}</div>${ffGrafCara(ceny, { barva: '#34d399', fmt: x => _vozDes(x, 2) + ' Kč' })}` : ''}
    <div style="margin-top:16px;font-size:.72rem;color:#8b93ad;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Tankování</div>
    ${tab}
    ${prHTML}
  </div>`;
}
function vozidloDetailZavri() { _vozDetailId = null; const o = document.getElementById('vozDetailOkno'); if (o) o.remove(); }

//  Příspěvek na cestu = příjmová transakce (výchozí Ostatní příjmy).
function vozPrispevekForm(id) {
  const D = getData();
  const inc = (D.categories || []).filter(c => c.type === 'income' || c.type === 'both');
  const vych = inc.find(c => c.id === 'cat8') || inc[0];
  let o = document.getElementById('vozOkno');
  if (!o) { o = document.createElement('div'); o.id = 'vozOkno';
    o.style.cssText = 'position:fixed;inset:0;z-index:10070;background:rgba(8,10,20,.85);display:flex;justify-content:center;align-items:flex-start;overflow:auto;padding:16px 12px';
    o.addEventListener('click', e => { if (e.target === o) vozidlaZavri(); }); document.body.appendChild(o); }
  const dnes = new Date().toISOString().slice(0, 10);
  o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;width:100%;max-width:420px">
    <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:1rem;color:var(--text)">🤝 Příspěvek na cestu</div>
      <button onclick="vozidlaZavri()" style="background:none;border:none;color:#a8aec8;font-size:1.3rem;cursor:pointer">✕</button></div>
    <div style="font-size:.7rem;color:#a8aec8;margin:6px 0 4px;line-height:1.5">Zapíše se jako příjem – jednou, protože peníze opravdu přišly. Vozidlo z něj jen spočítá čistý náklad.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Částka (Kč)</div><input class="fi" id="vozPrCastka" inputmode="decimal" placeholder="200"></div>
      <div><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Datum</div><input class="fi" id="vozPrDatum" type="date" value="${dnes}"></div></div>
    <div style="margin-top:8px"><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Od koho</div><input class="fi" id="vozPrOd" maxlength="40" placeholder="Petr – cesta do práce"></div>
    <div style="margin-top:8px"><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Kam přišly peníze</div>${ffPenezenkaSelect('vozPrWal')}</div>
    <div style="margin-top:8px"><div style="font-size:.66rem;color:#a8aec8;margin-bottom:3px">Kategorie příjmu</div>
      <select class="fi" id="vozPrKat">${inc.map(c => `<option value="${_vozEsc(c.id)}"${vych && c.id === vych.id ? ' selected' : ''}>${_vozEsc((c.icon || '') + ' ' + c.name)}</option>`).join('')}</select></div>
    <button class="btn btn-primary" style="width:100%;margin-top:12px" onclick="vozPrispevekUloz('${_vozEsc(id)}')">💾 Uložit příspěvek</button></div>`;
}
function vozPrispevekUloz(id) {
  const castka = _vozCislo(document.getElementById('vozPrCastka')?.value);
  const datum = document.getElementById('vozPrDatum')?.value;
  const od = (document.getElementById('vozPrOd')?.value || '').trim().slice(0, 40);
  const catId = document.getElementById('vozPrKat')?.value || '';
  const wallet = document.getElementById('vozPrWal')?.value || '';
  if (!(castka > 0) || !datum || !catId) { if (typeof showToast === 'function') showToast('Vyplň částku, datum a kategorii'); return; }
  const v = vozidlaSeznam().find(x => x.id === id);
  const sub = 'Příspěvek na cestu';
  if (typeof ensureSubcat === 'function') ensureSubcat(catId, sub);
  //  S24 (v11.17, Milan: „v dashboardu není vidět připis"): transakce neměla peněženku,
  //  takže se nepřičetla k žádnému zůstatku. Nově se vybírá, kam peníze přišly.
  const tx = { id: (typeof uid === 'function') ? uid() : 'id' + Date.now(), type: 'income', name: 'Příspěvek na cestu' + (od ? ' – ' + od : ''),
    amount: castka, amt: castka, catId, category: catId, subcat: sub, date: datum, note: v ? v.nazev : '', vozPrispevek: { vozidloId: id, od } };
  if (wallet) tx.wallet = wallet;
  S.transactions = S.transactions || []; S.transactions.push(tx);
  if (typeof save === 'function') save();
  if (typeof showToast === 'function') showToast('🤝 Příspěvek zapsán');
  vozidlaZavri(); vozidloDetail(id);
  if (typeof curPage !== 'undefined' && curPage === 'vozidla') renderVozidlaPage();
}
Object.assign(window, { vozidloDetail, vozidloDetailZavri, vozPrispevekForm, vozPrispevekUloz });


// ── S24 (v11.17): sdílené – výběr peněženky (výchozí z Nastavení, jinak první) ──
function ffPenezenkaSelect(id, vybrana) {
  const w = (typeof getWallets === 'function') ? getWallets() : ((S && S.wallets) || []);
  if (!w.length) return `<select class="fi" id="${id}"><option value="">– nejdřív si vytvoř peněženku –</option></select>`;
  const pref = vybrana || ((typeof _settings !== 'undefined' && _settings && _settings.defWallet) || '');
  const v = w.some(x => x.id === pref) ? pref : w[0].id;
  return `<select class="fi" id="${id}">${w.map(x => `<option value="${_vozEsc(x.id)}"${x.id === v ? ' selected' : ''}>${_vozEsc((x.icon || '💼') + ' ' + x.name)}</option>`).join('')}</select>`;
}
window.ffPenezenkaSelect = ffPenezenkaSelect;

// ── S24 (v11.17): blok 🚗 u příjmu „Příspěvek na cestu" v běžném formuláři transakce ──
let _prispForm = null;
function prispNaplnFormular(v) { _prispForm = v ? Object.assign({}, v) : null; }
function prispObnov(el) {
  if (_vozidla === null) { loadVozidla().then(() => tankObnov()); }
  const voz = vozidlaSeznam();
  _prispForm = _prispForm || {};
  if (!_prispForm.vozidloId && voz.length) {
    let posl = ''; try { posl = localStorage.getItem('ff_vozidloPosl') || ''; } catch (e) {}
    _prispForm.vozidloId = voz.some(x => x.id === posl) ? posl : voz[voz.length - 1].id;
  }
  el.style.display = 'block';
  el.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px 12px">
    <div style="font-weight:700;font-size:.82rem;color:var(--text);margin-bottom:8px">🚗 Příspěvek na cestu <span style="font-weight:400;color:#a8aec8;font-size:.7rem">· propojí se s Vozidly</span></div>
    ${voz.length ? `<select class="fi" style="font-size:.82rem;margin-bottom:8px" onchange="prispPole('vozidloId',this.value)">
        ${voz.map(x => `<option value="${_vozEsc(x.id)}"${x.id === _prispForm.vozidloId ? ' selected' : ''}>${_vozEsc(_vozIkona(x) + ' ' + x.nazev)}</option>`).join('')}</select>`
      : '<div style="font-size:.74rem;color:#a8aec8;margin-bottom:8px">Zatím nemáš vozidlo – příspěvek se uloží i tak.</div>'}
    <input class="fi" style="font-size:.82rem" maxlength="40" placeholder="Od koho (nepovinné)" value="${_vozEsc(_prispForm.od || '')}" oninput="prispPole('od',this.value)">
  </div>`;
}
function prispPole(k, v) { _prispForm = _prispForm || {}; _prispForm[k] = v; }
function prispZFormulare(catId, sub) {
  if (!PRISP_RE.test(sub || '')) return null;
  const f = _prispForm || {};
  const o = { vozidloId: String(f.vozidloId || '') };
  const od = String(f.od || '').trim().slice(0, 40); if (od) o.od = od;
  return o;
}
Object.assign(window, { prispNaplnFormular, prispObnov, prispPole, prispZFormulare, prispevekVozidlo });

// ══════════════════════════════════════════════════════
//  S24 (v11.22, Milan: „vizuály – voda u vody, benzinka u tankování"):
//  malé ilustrace do záhlaví karet Měřidel (vozidla, energie a voda).
//  Ploché SVG, bez externích obrázků – funguje offline i v tisku.
// ══════════════════════════════════════════════════════
function ffIlustrace(typ, vel) {
  vel = vel || 44;
  const g = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
  const ram = (id, a, b, obsah) => `<svg viewBox="0 0 48 48" width="${vel}" height="${vel}" style="flex-shrink:0;border-radius:12px" role="img" aria-hidden="true">${g(id, a, b)}<rect width="48" height="48" rx="12" fill="url(#${id})"/>${obsah}</svg>`;
  const u = 'i' + Math.random().toString(36).slice(2, 7);
  switch (typ) {
    case 'voda': return ram(u, '#38bdf8', '#1d4ed8',
      `<path d="M24 9c5 7 10 12.5 10 18a10 10 0 0 1-20 0c0-5.5 5-11 10-18z" fill="#e0f2fe"/>
       <path d="M18.5 28.5a5.5 5.5 0 0 0 5.5 5.5" stroke="#38bdf8" stroke-width="2.4" fill="none" stroke-linecap="round"/>
       <path d="M8 40c3-2 5-2 8 0s5 2 8 0 5-2 8 0 5 2 8 0" stroke="#bae6fd" stroke-width="2" fill="none" stroke-linecap="round"/>`);
    case 'elektrina': return ram(u, '#fde047', '#f59e0b',
      `<path d="M27 7 13 27h9l-3 14 15-21h-9l2-13z" fill="#fff7d6" stroke="#b45309" stroke-width="1.4" stroke-linejoin="round"/>`);
    case 'plyn': return ram(u, '#fb923c', '#dc2626',
      `<path d="M24 8c2 6 9 9 9 18a9 9 0 0 1-18 0c0-5 3-7 4-11 1 3 2 4 3 5 1-4 1-8 2-12z" fill="#ffedd5"/>
       <path d="M24 24c2 3 4 4 4 7a4 4 0 0 1-8 0c0-2 2-4 4-7z" fill="#60a5fa"/>`);
    case 'teplo': return ram(u, '#f87171', '#9f1239',
      `${[12, 18, 24, 30, 36].map(x => `<rect x="${x - 2}" y="15" width="4" height="20" rx="2" fill="#ffe4e6"/>`).join('')}
       <rect x="9" y="33" width="30" height="3" rx="1.5" fill="#fecdd3"/>
       <path d="M17 12c1-2-1-3 0-5M24 12c1-2-1-3 0-5M31 12c1-2-1-3 0-5" stroke="#fecdd3" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
    case 'elektro': return ram(u, '#34d399', '#0f766e',
      `<rect x="12" y="10" width="16" height="28" rx="3" fill="#d1fae5"/><rect x="15" y="14" width="10" height="7" rx="1.5" fill="#0f766e"/>
       <path d="M21 25l-4 6h4l-1 5 5-7h-4l1-4z" fill="#059669"/><path d="M28 18h4a3 3 0 0 1 3 3v10a2 2 0 0 0 4 0V16" stroke="#d1fae5" stroke-width="2.2" fill="none" stroke-linecap="round"/>`);
    case 'pumpa': case 'auto': case 'motorka': case 'dodavka': return ram(u, '#4ade80', '#15803d',
      `<rect x="11" y="10" width="17" height="29" rx="3" fill="#dcfce7"/><rect x="14" y="14" width="11" height="8" rx="1.5" fill="#15803d"/>
       <rect x="9" y="37" width="21" height="3" rx="1.5" fill="#bbf7d0"/>
       <path d="M28 17l5 4v13a2.5 2.5 0 0 0 5 0V22l-3-4" stroke="#dcfce7" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M19.5 26c1.6 2.2 2.6 3.2 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.4 1-2.4 2.6-4.6z" fill="#15803d"/>`);
    default: return ram(u, '#94a3b8', '#475569',
      `<circle cx="24" cy="26" r="13" fill="#e2e8f0"/><path d="M24 26l7-6" stroke="#475569" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="26" r="2.4" fill="#475569"/>`);
  }
}
window.ffIlustrace = ffIlustrace;
