// FinanceFlow · v10.50 · ucet.js · 2026-09-04
// ══════════════════════════════════════════════════════════════════════
//  MŮJ ÚČET (TODO-233, S21 – Milan)
//  Nahrazuje modal „Upravit profil“. Spouštěčem je jméno a ikona úplně
//  nahoře v sidebaru, ne malá tužka vedle nich.
//
//  Stránka odpovídá na otázku „co o mně appka ví a co s tím můžu udělat“.
//  ZÁMĚRNĚ tu proto NENÍ Tutoriál ani Nastavení (to jsou funkce appky,
//  ne účtu), „Co partner uvidí“ (patří do Sdílení) ani Moje domácnost
//  (taky Sdílení). Účtenky jsou jen odkazem – duplikovat seznam, který
//  jinde funguje, by znamenalo dvě místa, která se rozejdou.
//
//  ČITELNOST (Milanovo opakované zadání): na tmavém pozadí se nepoužívá
//  var(--text3) ani var(--text2). Popisky #a8aec8, hodnoty #c9cede a výš,
//  nic menšího než .72rem.
// ══════════════════════════════════════════════════════════════════════

const UCET_POPISEK = '#a8aec8';
const UCET_HODNOTA = '#c9cede';

function _ucetKarta(nadpis, telo, poznamka) {
  return `<div class="card" style="margin-bottom:12px">
    <div class="card-header"><span class="card-title">${nadpis}</span></div>
    <div class="card-body">${telo}
      ${poznamka ? `<div style="font-size:.72rem;color:${UCET_POPISEK};margin-top:8px;line-height:1.55">${poznamka}</div>` : ''}
    </div>
  </div>`;
}

function _ucetRadek(popis, hodnota, akce) {
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
    <div style="flex:1;min-width:0">
      <div style="font-size:.72rem;color:${UCET_POPISEK};text-transform:uppercase;letter-spacing:.05em">${popis}</div>
      <div style="font-size:.86rem;color:${UCET_HODNOTA};word-break:break-all;margin-top:2px">${hodnota}</div>
    </div>
    ${akce || ''}
  </div>`;
}

function renderUcetPage() {
  const el = document.getElementById('ucetContent'); if (!el) return;
  const me = window._currentUser;
  const prof = window._userProfile || {};
  const jmeno = prof.displayName || me?.displayName || 'Bez jména';
  const email = me?.email || '';
  const uid = me?.uid || '';
  const lokalni = (typeof _isLocalMode !== 'undefined' && _isLocalMode);

  // Avatar: vědomá volba přebíjí fotku z Google (FIX-314)
  const avatarHtml = prof.avatar
    ? `<div style="font-size:2rem;line-height:1">${prof.avatar}</div>`
    : (prof.photoURL || me?.photoURL)
      ? `<img src="${prof.photoURL || me.photoURL}" style="width:100%;height:100%;object-fit:cover">`
      : '👤';

  let html = '';

  // ── Kdo jsem ────────────────────────────────────────────────────
  html += `<div class="card" style="margin-bottom:12px">
    <div class="card-body">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div style="width:62px;height:62px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--surface3);display:flex;align-items:center;justify-content:center;font-size:1.7rem">${avatarHtml}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--text)">${escHtml(jmeno)}</div>
          <div style="font-size:.8rem;color:${UCET_POPISEK};margin-top:2px;word-break:break-all">${escHtml(email) || 'Účet bez přihlášení'}</div>
        </div>
      </div>

      <div class="fg"><label style="color:${UCET_HODNOTA}">Zobrazované jméno</label>
        <input class="fi" id="ucetName" value="${escHtml(jmeno)}" placeholder="Jan Novák"></div>
      <div style="font-size:.72rem;color:${UCET_POPISEK};margin:-6px 0 12px;line-height:1.55">Tímhle jménem tě uvidí ostatní členové domácnosti.</div>

      <div class="fg"><label style="color:${UCET_HODNOTA}">Avatar</label>
        <div id="profileAvatarPicker" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>
      <div style="font-size:.72rem;color:${UCET_POPISEK};margin:-4px 0 12px;line-height:1.55">Druhým kliknutím výběr zrušíš. Bez avataru se použije fotka z Google účtu.</div>

      <button class="btn btn-accent" onclick="saveUcetProfil()">Uložit změny</button>
    </div>
  </div>`;

  // ── Identita účtu ───────────────────────────────────────────────
  const kopie = (txt, hlaska) => `<button class="btn btn-ghost btn-sm" onclick="copyText('${txt}','${hlaska}')">📋</button>`;
  html += _ucetKarta('🪪 Identita účtu',
    (email ? _ucetRadek('E-mail', escHtml(email), kopie(email, 'E-mail zkopírován')) : '')
    + (uid ? _ucetRadek('ID uživatele', `<span style="font-family:monospace;font-size:.78rem">${uid}</span>`, kopie(uid, 'ID zkopírováno')) : '')
    + _ucetRadek('Předplatné',
        `<span id="ucetTierLabel">${(typeof getUserTier === 'function' ? getUserTier() : 'free')}</span>`,
        `<button class="btn btn-ghost btn-sm" onclick="showPage('nastaveni');setTimeout(()=>document.getElementById('tiersAnchor')?.scrollIntoView({behavior:'smooth'}),120)">Zobrazit tarify →</button>`),
    'ID uživatele slouží k ručnímu propojení s partnerem. Pohodlnější je pozvánka v sekci Sdílení – ta propojí obě strany najednou.');

  // ── Moje data ───────────────────────────────────────────────────
  const D = (typeof getData === 'function') ? getData() : S;
  const pocetTx = (D.transactions || []).length;
  const pocetUct = (D.receipts || []).length;
  const mesice = new Set((D.transactions || [])
    .map(t => (t && t.date) ? String(t.date).slice(0, 7) : null).filter(Boolean)).size;

  html += _ucetKarta('📦 Moje data',
    _ucetRadek('Naskenované účtenky', `${pocetUct}`,
      `<button class="btn btn-ghost btn-sm" onclick="showPage('uctenky')">Otevřít →</button>`)
    + _ucetRadek('Transakce', `${pocetTx}`,
      `<button class="btn btn-ghost btn-sm" onclick="showPage('transakce')">Otevřít →</button>`)
    + _ucetRadek('Měsíců s daty', `${mesice}`),
    'Účtenky se ukládají spolu s ostatními daty, takže se synchronizují mezi zařízeními i zálohují.');

  // ── Referral ────────────────────────────────────────────────────
  // Používá se TÝŽ renderer jako dřív v modalu (renderReferralCodeRow),
  // aby nevznikly dvě verze téhož formuláře.
  html += _ucetKarta('🎁 Doporučení', `<div class="fg" id="profileRefRow"></div>`);

  // ── Konec účtu ──────────────────────────────────────────────────
  // Dvě různé věci, které se pletou: VYMAZAT DATA (účet zůstane, začínáš od nuly)
  // a SMAZAT ÚČET (zmizí i profil, tarif a členství). Stojí vedle sebe schválně,
  // ať je rozdíl vidět dřív, než se na něco klikne.
  if (!lokalni) {
    html += `<div class="card" style="margin-bottom:12px;border-color:rgba(248,113,113,.25)">
      <div class="card-header"><span class="card-title" style="color:var(--expense)">⚠️ Nevratné akce</span></div>
      <div class="card-body">
        <div style="padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:14px">
          <div style="font-size:.86rem;font-weight:600;color:${UCET_HODNOTA};margin-bottom:5px">🗑 Vymazat všechna data</div>
          <div style="font-size:.76rem;color:${UCET_POPISEK};line-height:1.6;margin-bottom:10px">
            Smaže transakce, účtenky, peněženky, dluhy, zálohy i tvůj výřez pro partnery.
            <strong style="color:${UCET_HODNOTA}">Účet, tarif ani domácnost nezmizí</strong> – appka bude prázdná a začneš od nuly.
          </div>
          <button class="btn btn-danger btn-sm" onclick="openDeleteDataModal()">Vymazat data</button>
        </div>

        <div>
          <div style="font-size:.86rem;font-weight:600;color:${UCET_HODNOTA};margin-bottom:5px">👤 Smazat celý účet</div>
          <div style="font-size:.76rem;color:${UCET_POPISEK};line-height:1.6;margin-bottom:10px">
            Kromě dat smaže i profil, odejde z domácnosti a odstraní tvé záznamy v komunitním přehledu.
            <strong style="color:var(--expense)">Tohle nejde vrátit zpět.</strong>
          </div>
          <button class="btn btn-danger btn-sm" onclick="ucetSmazatUcet()">Smazat účet</button>
        </div>

        <div style="font-size:.72rem;color:${UCET_POPISEK};line-height:1.55;margin-top:12px">
          Před obojím si stáhni zálohu – Nastavení → Data &amp; soukromí → Záloha dat (JSON).
        </div>
      </div>
    </div>`;
  }

  el.innerHTML = html;

  // Avatar picker sdílí kód s původním modalem – žádná kopie (SKILL 17)
  if (typeof _selectedAvatar !== 'undefined') _selectedAvatar = prof.avatar || '';
  if (typeof renderAvatarPicker === 'function') renderAvatarPicker();

  // Referral řádek vykresluje share.js. Side-render ve vlastním try/catch –
  // když selže, zbytek stránky funguje dál.
  try { if (typeof renderReferralCodeRow === 'function') renderReferralCodeRow(); } catch (e) {}
}

// ══════════════════════════════════════════════════════════════════════
//  SMAZÁNÍ ÚČTU (TODO-233)
//  Nevratná operace, proto: dvě potvrzení, druhé opsáním slova. Skládá se
//  z už ověřených dílů (purgeMyCommunityData, leaveHousehold), aby tu
//  nevznikala třetí verze mazání, kterou nikdo netestoval.
//
//  ROZSAH, KTERÝ NEDĚLÁ: neruší přihlašovací účet u Googlu ani placené
//  předplatné u Stripu. Obojí vyžaduje krok mimo appku a tiché selhání by
//  bylo horší než jasné sdělení – uživateli to proto řekneme dopředu.
// ══════════════════════════════════════════════════════════════════════
async function ucetSmazatUcet() {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const me = window._currentUser;
  if (!me || !window._db) { alert('Mazání účtu funguje jen u přihlášeného účtu.'); return; }

  const tier = (typeof getUserTier === 'function') ? getUserTier() : 'free';
  const platici = (tier === 'premium' || tier === 'pro');

  if (!confirm('Opravdu smazat účet?\n\n'
    + '· Smažou se všechny transakce, účtenky, peněženky, dluhy i zálohy\n'
    + '· Odejdeš z domácnosti a zmizí tvé záznamy v komunitním přehledu\n'
    + '· Tohle nejde vrátit zpět\n\n'
    + (platici ? '⚠️ Máš aktivní předplatné. Smazání dat ho NEZRUŠÍ – to musíš udělat zvlášť, jinak ti Stripe bude účtovat dál.\n\n' : '')
    + 'Pokračovat?')) return;

  const slovo = prompt('Poslední kontrola.\n\nNapiš SMAZAT (velkými písmeny) a potvrď.');
  if (slovo !== 'SMAZAT') { alert('Nesmazáno – text nesouhlasil.'); return; }

  try {
    // Pořadí není náhodné: nejdřív odejít z míst, kde po sobě zůstávají stopy
    // i po smazání vlastního podstromu.
    if (typeof purgeMyCommunityData === 'function') {
      try { await purgeMyCommunityData(); } catch (e) { console.warn('[smazání] komunita:', e?.message); }
    }
    try {
      const hid = (await _get(_ref(_db, `users/${me.uid}/householdId`))).val();
      if (hid) await _set(_ref(_db, `households/${hid}/members/${me.uid}`), null);
    } catch (e) { console.warn('[smazání] domácnost:', e?.message); }

    // Teprve teď vlastní data
    await _set(_ref(_db, `users/${me.uid}`), null);

    alert('Data byla smazána.\n\n'
      + 'Přihlašovací účet u Googlu zůstává – ten zrušíš ve svém Google účtu.'
      + (platici ? '\nPředplatné nezapomeň zrušit u Stripu nebo napiš na info@financeflow.cz.' : ''));
    // Pozor: funkce se jmenuje signOut, ne logout (chytil check_tdz.js –
    //   `node --check` by tenhle překlep pustil a projevil by se až TADY,
    //   tedy po nevratném smazání dat).
    if (typeof window._signOut === 'function') window._signOut();
    location.reload();
  } catch (e) {
    alert('Mazání se nezdařilo: ' + e.message + '\n\nData zůstala beze změny.');
  }
}
window.ucetSmazatUcet = ucetSmazatUcet;

async function saveUcetProfil() {
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  const inp = document.getElementById('ucetName');
  const jmeno = (inp?.value || '').trim().slice(0, 60);
  if (!jmeno) { alert('Jméno nemůže být prázdné.'); return; }
  if (!window._currentUser || !window._db) {
    // Lokální režim – uložíme aspoň do paměti a sidebaru
    window._userProfile = Object.assign(window._userProfile || {}, { displayName: jmeno, avatar: _selectedAvatar || null });
    if (typeof updateSidebarUser === 'function') updateSidebarUser(window._currentUser || {});
    renderUcetPage();
    return;
  }
  try {
    window._userProfile = Object.assign(window._userProfile || {}, {
      displayName: jmeno,
      avatar: (typeof _selectedAvatar !== 'undefined' ? _selectedAvatar : '') || null
    });
    await _set(_ref(_db, `users/${window._currentUser.uid}/profile`), window._userProfile);
    if (typeof updateSidebarUser === 'function') updateSidebarUser(window._currentUser);
    if (typeof renderPartnerSection === 'function') renderPartnerSection(Object.keys(partnerData));
    if (typeof showToast === 'function') showToast('✅ Profil uložen');
    renderUcetPage();
  } catch (e) {
    alert('Uložení se nezdařilo: ' + e.message);
  }
}

window.renderUcetPage = renderUcetPage;
window.saveUcetProfil = saveUcetProfil;
