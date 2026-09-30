// FinanceFlow · v11.12 · vozidla.js · 2026-09-29
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

function vozidlaKartaHTML(nazev, ikona, st, jed) {
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
      <span style="font-size:1.6rem">${ikona}</span>
      <div style="flex:1"><div style="font-weight:800;font-size:1rem;color:var(--text)">${_vozEsc(nazev)}</div>
        <div style="font-size:.72rem;color:#a8aec8">${st.pocet} tankování${st.posledniTachometr ? ' · tachometr ' + st.posledniTachometr.toLocaleString('cs-CZ') + ' km' : ''}</div></div></div>
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
  const karty = voz.map(v => vozidlaKartaHTML(v.nazev, _vozIkona(v), tankStatistiky(tankZaznamy(D, v.id)), v.palivo === 'elektrina' ? 'kWh' : 'l')).join('');
  const bez = tankZaznamy(D, '');
  const kartaBez = bez.length ? vozidlaKartaHTML('Bez přiřazeného vozidla', '⛽', tankStatistiky(bez), 'l') : '';
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
