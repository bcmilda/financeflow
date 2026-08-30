// FinanceFlow · v10.18 · admin.js · 2026-08-28
//  ADMIN PANEL
// ══════════════════════════════════════════════════════
const ADMIN_UIDS = ['LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'];

function isAdmin() {
  const user = window._currentUser;
  if(!user || user.isAnonymous) return false;
  return ADMIN_UIDS.includes(user.uid);
}

function checkAdminNav() {
  const admin = isAdmin();
  const navItem = document.getElementById('adminNavItem');
  if(navItem) navItem.style.display = admin ? 'block' : 'none';
  // S16 (TODO-174): Deník – predikce vs. skutečnost, zatím jen admin
  const denikNav = document.getElementById('denikNavItem');
  if(denikNav) denikNav.style.display = admin ? 'block' : 'none';
  // S12.1q: Import z banky (SMS/push parsing) je BETA – zatím jen admin
  const smsNav = document.getElementById('smsImportNavItem');
  if(smsNav) smsNav.style.display = admin ? 'block' : 'none';
  // S17 (Milan): Souhrn výdajů skryt pro uživatele (obsažen v Měsíčním reportu) – jen admin
  const betaNav = document.getElementById('betaNavGroup');
  if(betaNav) betaNav.style.display = admin ? 'block' : 'none';
}

// ── S14: Migrace přesunových kategorií ──────────────────────────────
// Převede stávající kategorie (Investice, Trading, Spoření) na typ 'transfer' a doplní
// chybějící (Finanční rezerva, Fondy, Penzijko) ze seedu DEFAULT_CATEGORIES. Idempotentní.
// Finanční úřad a Půjčka zůstávají typu 'both'. Match podle názvu (case-insensitive).
function migrateTransferCategories(){
  if(typeof viewingUid!=='undefined' && viewingUid){ alert('Migrace nelze spustit v režimu „Zobrazit jako uživatel".'); return; }
  const TARGET = ['Investice','Trading','Finanční rezerva','Spoření','Fondy','Penzijko'];
  const norm = s => (s||'').trim().toLowerCase();
  const tset = new Set(TARGET.map(norm));
  if(!S.categories) S.categories = [];
  const cats = S.categories;
  const toConvert = cats.filter(c => tset.has(norm(c.name)) && c.type!=='transfer');
  const present = new Set(cats.map(c=>norm(c.name)));
  const toAdd = TARGET.filter(n => !present.has(norm(n)));
  if(!toConvert.length && !toAdd.length){ alert('✅ Přesunové kategorie jsou už v pořádku – není co migrovat.'); return; }
  let msg = 'MIGRACE PŘESUNOVÝCH KATEGORIÍ\n\n';
  if(toConvert.length){
    msg += '🔄 Převést na typ Přesun ('+toConvert.length+'):\n';
    msg += toConvert.map(c=>'   • '+c.name+'  ('+(c.type==='both'?'oboje':c.type==='expense'?'výdaj':c.type)+' → přesun)').join('\n')+'\n\n';
  }
  if(toAdd.length){
    msg += '➕ Přidat nové ('+toAdd.length+'):\n';
    msg += toAdd.map(n=>'   • '+n).join('\n')+'\n\n';
  }
  msg += '⚠️ Stávající transakce v převáděných kategoriích se přestanou počítat jako výdaj (přesunou se do „úspor a investic"). Finanční úřad a Půjčka zůstanou beze změny.\n\nPokračovat?';
  if(!confirm(msg)) return;
  toConvert.forEach(c => { c.type='transfer'; c.coicop=null; c.isSaving=true; });
  if(toAdd.length && typeof DEFAULT_CATEGORIES!=='undefined'){
    toAdd.forEach(n=>{
      const seed = DEFAULT_CATEGORIES.find(d=>norm(d.name)===norm(n) && d.type==='transfer');
      if(seed) cats.push(JSON.parse(JSON.stringify(seed)));
    });
  }
  if(typeof rebuildTransferCatIds==='function') rebuildTransferCatIds();
  if(typeof save==='function') save();
  if(typeof showToast==='function') showToast('✅ Přesunové kategorie sjednoceny ('+toConvert.length+' převedeno, '+toAdd.length+' přidáno)');
  else alert('✅ Hotovo: '+toConvert.length+' převedeno, '+toAdd.length+' přidáno.');
  if(typeof renderPage==='function') renderPage();
}
if(typeof window!=='undefined') window.migrateTransferCategories = migrateTransferCategories;

async function renderAdmin() {
  const el = document.getElementById('adminContent'); if(!el) return;
  if(!isAdmin()) {
    el.innerHTML = '<div class="card"><div class="card-body"><div class="empty"><div class="ei">🔐</div><div class="et">Přístup odepřen</div></div></div></div>';
    return;
  }
  // Zachovat aktivní záložku při re-renderu (změna měsíce)
  const _activeTab = document.querySelector('.tx-filt-btn.active[id^="atab-"]')?.id?.replace('atab-','') || 'users';

  el.innerHTML = `
    <!-- Záložky admin panelu -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <button class="tx-filt-btn active" id="atab-users"   onclick="switchAdminTab('users',this)">👥 Uživatelé</button>
      <button class="tx-filt-btn"        id="atab-rust"    onclick="switchAdminTab('rust',this)">📈 Růst</button>
      <button class="tx-filt-btn"        id="atab-keywords" onclick="switchAdminTab('keywords',this)">🔑 Keyword engine</button>
      <button class="tx-filt-btn"        id="atab-corrections" onclick="switchAdminTab('corrections',this)">✏️ User corrections</button>
      <button class="tx-filt-btn"        id="atab-lowconf"  onclick="switchAdminTab('lowconf',this)">⚠️ Low confidence</button>
      <button class="tx-filt-btn"        id="atab-stats"    onclick="switchAdminTab('stats',this)">📊 Statistiky</button>
      <button class="tx-filt-btn"        id="atab-adopce"   onclick="switchAdminTab('adopce',this)">🏷️ Adopce kategorií</button>
      <button class="tx-filt-btn"        id="atab-itemtags" onclick="switchAdminTab('itemtags',this)">🔖 Item Tagy</button>
      <button class="tx-filt-btn"        id="atab-suggestions" onclick="switchAdminTab('suggestions',this)">🤖 Doporučení</button>
      <button class="tx-filt-btn"        id="atab-leads"    onclick="switchAdminTab('leads',this)">📋 Leady</button>
      <button class="tx-filt-btn"        id="atab-announce" onclick="switchAdminTab('announce',this)">📢 Oznámení</button>
      <button class="tx-filt-btn"        id="atab-verze"    onclick="switchAdminTab('verze',this)">📝 Verze</button>
      <button class="tx-filt-btn"        id="atab-audit"    onclick="switchAdminTab('audit',this)">💳 Audit plateb</button>
      <button class="tx-filt-btn"        id="atab-udrzba"   onclick="switchAdminTab('udrzba',this)">🧰 Údržba</button>
      <button class="tx-filt-btn"        id="atab-reviews"  onclick="switchAdminTab('reviews',this)">⭐ Recenze</button>
    </div>

    <!-- S17.28 (Milan): AUDIT PLATEB – kontrola, jestli Premium vzniklo zaplacením -->
    <div id="atab-audit-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">💳 Audit plateb – kontrola shody</span>
          <button class="btn btn-ghost btn-sm" onclick="runPaymentAudit()">🔄 Načíst znovu</button></div>
        <div class="card-body">
          <div style="font-size:.78rem;color:#a8aec8;margin-bottom:10px;line-height:1.55">
            Porovnává Premium/Pro účty proti <strong>serverovému logu plateb</strong> (zapisuje jen Stripe webhook).
            Účet bez platby a bez ručního udělení = <strong style="color:var(--expense)">podezřelý</strong> – buď obešel pravidla, nebo vznikl před bezpečnostní opravou v9.27.
          </div>
          <div id="auditResult"><div style="color:#a8aec8;font-size:.8rem">Načítám…</div></div>
        </div>
      </div>
    </div>

    <!-- S14: ÚDRŽBA (vlastní záložka, ne napříč všemi) -->
    <div id="atab-reviews-content" style="display:none">
      <div class="card"><div class="card-header">
        <span class="card-title">⭐ Recenze uživatelů</span>
        <button onclick="loadAdminReviews()" class="btn btn-sm btn-ghost">🔄 Načíst</button>
      </div><div class="card-body" id="adminReviewsBox" style="padding:14px">
        <div style="font-size:.8rem;color:#a8aec8">⏳ Klikni na 🔄 pro načtení</div>
      </div></div>
    </div>
    <div id="atab-udrzba-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">💎 Referral body</span></div>
        <div class="card-body">
          <div style="font-size:.78rem;color:#a8aec8;margin-bottom:10px;line-height:1.5">
            Připíše referral body <strong>aktuálně přihlášenému účtu</strong> (tobě). Slouží k ověření, že se body správně zobrazují v sekci Sdílet, a k zpětnému připsání za již proběhlou registraci přes tvůj odkaz. Body se zapíšou do tvého referral kódu a hned se promítnou do „Máš X bodů".
          </div>
          <button class="btn btn-accent btn-sm" onclick="adminCreditReferralSelf()">💎 Připsat si referral body…</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">🔄 Migrace dat</span></div>
        <div class="card-body">
          <div style="font-size:.78rem;color:#a8aec8;margin-bottom:10px;line-height:1.5">
            <strong>Migrace přesunových kategorií</strong> – převede Investice, Trading, Spoření na typ „Přesun" a doplní Finanční rezervu, Fondy, Penzijko. Finanční úřad a Půjčka zůstanou beze změny. Bezpečné i opakovaně. <em>(Už proběhlo – ponecháno pro případ potřeby.)</em>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="migrateTransferCategories()">🔄 Spustit migraci přesunových kategorií</button>
        </div>
      </div>
    </div>

    <!-- USERS -->
    <div id="atab-users-content">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">👥 Uživatelé</span><button class="btn btn-ghost btn-sm" onclick="loadUserStats()">🔄</button></div>
        <div id="adminUserStats"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
      <!-- TODO-023: Správa členství – seznam uživatelů s filtrováním a editací -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">📋 Správa členství</span>
          <button class="btn btn-ghost btn-sm" onclick="loadUsersList()">🔄</button>
        </div>
        <div class="card-body">
          <!-- Vyhledávání + filtr -->
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <input class="fi" id="userSearchInput" placeholder="🔍 Hledat (email, jméno, uid)..." style="flex:1;min-width:180px;font-size:.82rem" oninput="filterUsersList()">
            <select class="fi" id="userFilterType" style="flex:1;min-width:120px;font-size:.82rem" onchange="filterUsersList()">
              <option value="all">Všichni</option>
              <option value="premium">Jen Premium</option>
              <option value="trial">Jen Trial</option>
              <option value="free">Jen Free</option>
              <option value="expired">Vypršelo</option>
              <option value="admin">Admini</option>
              <option value="active30">Aktivní (5+ dní za 30 d)</option>
              <option value="dormant">Usínající (0 dní za 30 d)</option>
              <option value="noactivity">Bez evidence aktivity</option>
            </select>
            <select class="fi" id="userSortBy" style="flex:1;min-width:120px;font-size:.82rem" onchange="filterUsersList()">
              <option value="createdAt-desc">Nejnovější</option>
              <option value="createdAt-asc">Nejstarší</option>
              <option value="name-asc">Jméno A→Z</option>
              <option value="until-asc">Expirace ↑</option>
              <option value="lastact-desc">Naposledy aktivní</option>
              <option value="days30-desc">Nejvíc aktivních dní</option>
              <option value="brought-desc">Nejvíc přivedených</option>
            </select>
          </div>
          <div id="adminUsersList"><div class="empty"><div class="et">⏳ Klikni na 🔄 pro načtení seznamu</div></div></div>
        </div>
      </div>
    </div>

    <!-- RŮST UŽIVATELŮ -->
    <div id="atab-rust-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">📈 Růst uživatelů</span>
          <button class="btn btn-ghost btn-sm" onclick="renderGrowthTab()">🔄 Načíst</button>
        </div>
        <div id="growthTabContent"><div class="empty"><div class="et">⏳ Klikni na 🔄 pro načtení</div></div></div>
      </div>
    </div>

    <!-- KEYWORD ENGINE -->
    <div id="atab-keywords-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">🔑 Keyword engine – obchodníci → COICOP</span>
          <button class="btn btn-ghost btn-sm" onclick="loadKeywords()">🔄</button>
        </div>
        <div class="card-body">
          <div style="font-size:.76rem;color:var(--text2);margin-bottom:12px">
            Globální pravidla platí pro všechny uživatele. Přepsání výchozích pravidel z kódu.
          </div>
          <!-- Přidat nové pravidlo -->
          <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;background:var(--surface2);padding:10px;border-radius:10px;border:1px solid var(--border)">
            <input class="fi" id="kw-new-keyword" placeholder="Klíčové slovo (např. lidl)" style="flex:1;min-width:120px;font-size:.82rem">
            <select class="fi" id="kw-new-coicop" style="flex:1;min-width:140px;font-size:.82rem">
              ${COICOP_GROUPS_DEF.map(g=>`<option value="${g.id}">${g.id}. ${g.name}</option>`).join('')}
            </select>
            <button class="btn btn-accent btn-sm" onclick="addKeywordRule()">➕ Přidat</button>
          </div>
          <!-- Tabulka pravidel -->
          <div id="adminKeywordsTable"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
        </div>
      </div>
    </div>

    <!-- USER CORRECTIONS -->
    <div id="atab-corrections-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">✏️ User corrections – co uživatelé opravují</span>
          <button class="btn btn-ghost btn-sm" onclick="loadCorrections()">🔄</button>
        </div>
        <div class="card-body">
          <div style="font-size:.76rem;color:var(--text2);margin-bottom:12px">
            Když uživatel ručně změní COICOP skupinu transakce, zaznamenáme to zde. Můžete povýšit na globální pravidlo.
          </div>
          <div id="adminCorrectionsTable"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
        </div>
      </div>
    </div>

    <!-- LOW CONFIDENCE -->
    <div id="atab-lowconf-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">⚠️ Low confidence transakce</span>
          <button class="btn btn-ghost btn-sm" onclick="loadLowConf()">🔄</button>
        </div>
        <div class="card-body">
          <div style="font-size:.76rem;color:var(--text2);margin-bottom:12px">
            Transakce kde si engine nebyl jistý (confidence &lt; 50). Opravte → zlepšíte model.
          </div>
          <div id="adminLowConfTable"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
        </div>
      </div>
    </div>

    <!-- STATISTIKY MAPOVÁNÍ -->
    <div id="atab-stats-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">📊 Statistiky mapování</span>
          <button class="btn btn-ghost btn-sm" onclick="loadMappingStats()">🔄</button>
        </div>
        <div id="adminMappingStats"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">🌍 Komunitní aktivita &amp; spotřeba AI</span>
          <button class="btn btn-ghost btn-sm" onclick="loadCommunityActivity()">🔄</button>
        </div>
        <div id="adminCommunityActivity"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>

    <!-- ADOPCE KATEGORIÍ (TODO-079 + TODO-081) -->
    <div id="atab-adopce-content" style="display:none">
      <!-- Sekce 1: Adopce kategorií -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">🏷️ Adopce kategorií – využití napříč uživateli</span>
          <button class="btn btn-ghost btn-sm" onclick="loadCategoryAdoption()">🔄</button>
        </div>
        <div id="adminCatAdoption"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
      <!-- Sekce 2: COICOP přiřazení vlastním kategoriím (TODO-081) -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🔢 Vlastní kategorie bez COICOP čísla</span>
          <button class="btn btn-ghost btn-sm" onclick="loadCustomCatsNoCoicop()">🔄</button>
        </div>
        <div style="font-size:.76rem;color:var(--text2);padding:8px 14px 0">
          Uživatelé přidali vlastní kategorie které nemají přiřazené COICOP číslo. Přiřaď číslo pro zahrnutí do komunitního přehledu.
        </div>
        <div id="adminCustomCats"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
      <!-- Sekce 3 (S12.1): COICOP přiřazení uživatelským PODKATEGORIÍM -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🧩 Podkategorie bez COICOP</span>
          <button class="btn btn-ghost btn-sm" onclick="loadCustomSubsNoCoicop()">🔄</button>
        </div>
        <div style="font-size:.76rem;color:var(--text2);padding:8px 14px 0">
          Uživatelské podkategorie, které nemají COICOP override (a nedědí ho smysluplně z rodiče u sdílených kategorií). Přiřazení se propíše VŠEM uživatelům s danou kategorií+podkategorií do <code>coicopOverrides</code> ve Firebase.
        </div>
        <div id="adminCustomSubs"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>

    <!-- ITEM TAGY – komunitní mapování -->
    <div id="atab-itemtags-content" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🔖 Komunitní mapování tagů položek</span>
          <button class="btn btn-ghost btn-sm" onclick="loadCommunityItemTags()">🔄</button>
        </div>
        <div style="font-size:.76rem;color:var(--text2);padding:8px 14px 0">
          Uživatelé přiřadili tyto tagy k položkám. Jako admin můžeš tag <strong>schválit</strong> (stane se komunitním pravidlem), <strong>odmítnout</strong> nebo ponechat bez pravidla.
        </div>
        <div id="adminItemTags"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>

    <!-- DOPORUČENÍ – suggestion overrides (TODO-086) -->
    <div id="atab-suggestions-content" style="display:none">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🤖 Doporučená přiřazení – co uživatelé mění</span>
          <button class="btn btn-ghost btn-sm" onclick="loadSuggestionOverrides()">🔄</button>
        </div>
        <div style="font-size:.76rem;color:var(--text2);padding:8px 14px 0">
          Když uživatel při importu zvolí <strong>jinou</strong> kategorii než doporučenou, zaznamená se zde. Pokud mnoho uživatelů mění stejné doporučení, zvaž úpravu komunitního pravidla.
        </div>
        <div id="adminSuggestions"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>

    <!-- LEADY -->
    <div id="atab-leads-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">📋 Leady z webu</span></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px" id="adminStats"></div>
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
          <input class="fi" id="leadSearch" placeholder="🔍 Hledat..." oninput="filterLeads(this.value)" style="flex:1;min-width:160px;font-size:.82rem;margin:0">
          <button class="btn btn-accent btn-sm" onclick="exportLeadsExcel()">📊 Excel</button>
          <button class="btn btn-ghost btn-sm" onclick="copyAllLeads()">📋 Kopírovat vše</button>
          <button class="btn btn-ghost btn-sm" onclick="loadLeads()">🔄</button>
        </div>
        <div id="adminLeadsTable"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>

    <!-- VERZE / CHANGELOG -->
    <!-- OZNÁMENÍ (Session 11) -->
    <div id="atab-announce-content" style="display:none">
      <!-- S12.1n: Uvítací hláška pro nové uživatele -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">👋 Uvítací hláška</span><button class="btn btn-ghost btn-sm" onclick="loadAdminWelcome()">🔄</button></div>
        <div class="card-body" id="adminWelcomeEditor">
          <div style="font-size:.78rem;color:#a8aec8;margin-bottom:12px">
            Zobrazí se <strong style="color:var(--text2)">jednou při prvním spuštění</strong> jako okno přes obrazovku. Pokud zvýšíš „verzi", uvidí ji znovu i stávající uživatelé. Do budoucna sem přidáš krátký návod.
          </div>
          <div style="display:flex;gap:10px">
            <div class="fg" style="width:80px;flex-shrink:0"><label>Ikona</label><input class="fi" id="welcomeIcon" placeholder="👋" maxlength="4" style="text-align:center;font-size:1.2rem"></div>
            <div class="fg" style="flex:1"><label>Nadpis</label><input class="fi" id="welcomeTitle" placeholder="Vítej ve FinanceFlow!" maxlength="80"></div>
          </div>
          <div class="fg"><label>Vyber ikonu (klikni)</label><div id="welcomeIconPicker" style="display:flex;flex-wrap:wrap;gap:5px"></div></div>
          <div class="fg"><label>Text (podporuje odřádkování)</label><textarea class="fi" id="welcomeBody" rows="6" placeholder="Krátké uvítání, co appka umí, případně návod..." style="resize:vertical" maxlength="2000"></textarea></div>
          <div class="fg"><label>Vlož emotikon do textu (klikni)</label><div id="welcomeEmojiPicker" style="display:flex;flex-wrap:wrap;gap:5px"></div></div>
          <div style="display:flex;gap:10px;align-items:flex-end">
            <div class="fg" style="width:110px;flex-shrink:0"><label>Verze hlášky</label><input class="fi" id="welcomeVersion" placeholder="1" maxlength="12"></div>
            <label style="display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--text2);margin-bottom:14px;cursor:pointer"><input type="checkbox" id="welcomeActive" style="width:16px;height:16px" checked> Aktivní</label>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" onclick="previewAdminWelcome()" style="flex:1">👁 Náhled</button>
            <button class="btn btn-accent" onclick="saveAdminWelcome()" style="flex:2;font-weight:700">💾 Uložit hlášku</button>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">📢 Nové oznámení</span></div>
        <div class="card-body">
          <div style="font-size:.78rem;color:#a8aec8;margin-bottom:12px">
            Zprávy se zobrazí všem uživatelům v sekci <strong style="color:var(--text2)">O aplikaci → Oznámení</strong>. Uživatelé je mohou pouze číst.
          </div>
          <div class="fg">
            <label>Typ</label>
            <select class="fi" id="annNewType" onchange="document.getElementById('annOptionsRow').style.display=(this.value==='anketa'?'block':'none')">
              <option value="novinka">✨ Novinka</option>
              <option value="funkce">🚀 Nová funkce</option>
              <option value="tip">💡 Tip</option>
              <option value="info" selected>ℹ️ Informace</option>
              <option value="dulezite">⚠️ Důležité</option>
              <option value="anketa">📊 Anketa</option>
            </select>
          </div>
          <div class="fg"><label>Nadpis<span id="annTitleHint" style="color:var(--text3);font-weight:400"></span></label><input class="fi" id="annNewTitle" placeholder="např. Nová funkce: Spending Pace" maxlength="120"></div>
          <div class="fg"><label>Text</label><textarea class="fi" id="annNewText" rows="3" placeholder="Popiš novinku, tip nebo informaci..." style="resize:vertical" maxlength="600"></textarea></div>
          <div class="fg" id="annOptionsRow" style="display:none"><label>Možnosti ankety (jedna na řádek, min. 2)</label><textarea class="fi" id="annNewOptions" rows="4" placeholder="Ano&#10;Ne&#10;Nevím" style="resize:vertical" maxlength="400"></textarea></div>
          <label style="display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--text2);margin-bottom:10px;cursor:pointer"><input type="checkbox" id="annPushToo" style="width:16px;height:16px"> 📲 Odeslat i jako push notifikaci všem odběratelům</label>
          <button class="btn btn-accent" id="annPublishBtn" onclick="addAnnouncement()" style="width:100%;font-weight:700">📢 Zveřejnit oznámení</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">📋 Zveřejněná oznámení</span><span style="margin-left:auto;display:flex;gap:6px"><button class="btn btn-ghost btn-sm" onclick="cleanupOldAnnouncements()" title="Smazat starší 30 dní">🗑️ Staré</button><button class="btn btn-ghost btn-sm" onclick="loadAdminAnnouncements()">🔄</button></span></div>
        <div class="card-body"><div id="adminAnnounceList"><div class="empty"><div class="et">⏳ Načítám...</div></div></div></div>
      </div>
    </div>

    <div id="atab-verze-content" style="display:none">
      <div class="card">
        <div class="card-header"><span class="card-title">📝 Historie verzí</span></div>
        <div id="adminVerzeList"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>`;

  // Obnov aktivní záložku – zabrání resetu při změně měsíce
  switchAdminTab(_activeTab, document.getElementById('atab-'+_activeTab));
  loadUserStats();
  loadKeywords();
}

//  v9.75 (TODO-210): přehled recenzí z aplikace. Texty vidí jen admin,
//  uživatelům se veřejně ukazuje pouze souhrn (průměr a počet).
async function loadAdminReviews(){
  const box = document.getElementById('adminReviewsBox'); if(!box) return;
  box.innerHTML = '<div style="font-size:.8rem;color:#a8aec8">⏳ Načítám…</div>';
  try{
    const sn = await _get(_ref(_db,'reviews'));
    const val = (sn && sn.exists && sn.exists()) ? sn.val() : null;
    const arr = val ? Object.entries(val).map(([uid,r])=>({uid, ...r})).filter(r=>r.stars) : [];
    if(!arr.length){ box.innerHTML='<div style="font-size:.8rem;color:#a8aec8">Zatím žádné recenze.</div>'; return; }
    arr.sort((a,b)=>(b.at||0)-(a.at||0));
    const avg = arr.reduce((a,r)=>a+r.stars,0)/arr.length;
    const dist = [5,4,3,2,1].map(n=>({n, c:arr.filter(r=>r.stars===n).length}));
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:14px">
        <div style="text-align:center">
          <div style="font-family:Syne,sans-serif;font-size:2.2rem;font-weight:800;color:var(--debt)">${avg.toFixed(1).replace('.',',')}</div>
          <div style="font-size:.72rem;color:#a8aec8">${arr.length} ${arr.length===1?'recenze':'recenzí'}</div>
        </div>
        <div style="flex:1;min-width:180px">
          ${dist.map(d=>`<div style="display:flex;align-items:center;gap:7px;font-size:.72rem;padding:1px 0">
            <span style="width:30px;color:#a8aec8">${d.n} ★</span>
            <div style="flex:1;height:7px;background:var(--surface3);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${arr.length?d.c/arr.length*100:0}%;background:var(--debt);border-radius:99px"></div></div>
            <span style="width:24px;text-align:right;color:#a8aec8">${d.c}</span></div>`).join('')}
        </div>
      </div>
      ${arr.map(r=>`
        <div style="padding:10px 0;border-top:1px solid var(--border)">
          <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
            <span style="color:var(--debt)">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span>
            <span style="font-size:.78rem;font-weight:600">${(r.name||'Bez jména').replace(/</g,'&lt;')}</span>
            <span style="font-size:.68rem;color:#a8aec8">${r.at?new Date(r.at).toLocaleDateString('cs-CZ'):''}${r.ver?' · v'+r.ver:''}</span>
            <span style="margin-left:auto;font-size:.64rem;color:#7e84a0">${r.uid.slice(0,8)}…</span>
          </div>
          ${r.text?`<div style="font-size:.8rem;color:#c9cede;line-height:1.55;margin-top:4px">${String(r.text).replace(/</g,'&lt;')}</div>`:'<div style="font-size:.74rem;color:#7e84a0;margin-top:3px">(bez textu)</div>'}
        </div>`).join('')}`;
  }catch(e){
    box.innerHTML = `<div style="font-size:.8rem;color:var(--expense)">Chyba: ${e.message}</div>`;
  }
}

function switchAdminTab(tab, btn) {
  //  v9.58 (FIX-229): v seznamu chybělo 'rust', takže se karta Růst uživatelů
  //  nikdy neskryla a visela pod všemi ostatními záložkami.
  ['users','rust','keywords','corrections','lowconf','stats','adopce','itemtags','suggestions','leads','announce','verze','udrzba','audit','reviews'].forEach(t => {
    const c = document.getElementById('atab-'+t+'-content');
    const b = document.getElementById('atab-'+t);
    if(c) c.style.display = 'none';
    if(b) b.classList.remove('active');
  });
  const content = document.getElementById('atab-'+tab+'-content');
  if(content) content.style.display = 'block';
  if(btn) btn.classList.add('active');
  if(tab==='audit') runPaymentAudit();
  if(tab==='leads') loadLeads();
  if(tab==='corrections') loadCorrections();
  if(tab==='lowconf') loadLowConf();
  if(tab==='stats'){ loadMappingStats(); if(typeof loadCommunityActivity==='function') loadCommunityActivity(); }
  if(tab==='adopce'){ loadCategoryAdoption(); loadCustomCatsNoCoicop(); loadCustomSubsNoCoicop(); }
  if(tab==='itemtags') loadCommunityItemTags();
  if(tab==='suggestions') loadSuggestionOverrides();
  if(tab==='announce'){ loadAdminAnnouncements(); if(typeof loadAdminWelcome==='function') loadAdminWelcome(); }
  if(tab==='verze') loadVerze();
}

const VERZE_LOG = [
  {
    verze: 'v10.18',
    datum: '2026-08-28',
    zmeny: [
      '🔴 FIX-282: ČÁSTKA Z NOTIFIKACE BANKY MOHLA VYJÍT 1000× MENŠÍ. parseCzNum() dělalo `.replace(\',\', \'.\')` BEZ /g – nahradila se jen první čárka a tečka jako oddělovač tisíců zůstala. parseFloat pak četl jen po druhou tečku: "1.234,50" → 1.234 místo 1234,50. Trefovalo to hlavně Revolut (anglický formát €12.50) a zahraniční platby. Chyba byla TICHÁ – transakce se naimportovala, jen s tisícinovou částkou.',
      '✅ FIX-282 – nově je poslední čárka/tečka desetinný oddělovač, předchozí jsou tisícové. Výjimka: jediný oddělovač se třemi číslicemi za sebou ("1.234") je tisícový, protože u peněz se píší dvě desetinná místa, ne tři. Odstraní se i měnové symboly (€, Kč), na kterých parseFloat vracel NaN.',
      '🐛 FIX-283: SPLÁTKOVÝ KALENDÁŘ PŘESKAKOVAL MĚSÍCE. `d.setMonth(d.getMonth()+periodNum)` u splatnosti 31. přetékalo: 31.1. → 3.3. (únor bez splátky) → 31.3. (dvě splátky v březnu) → 1.5. (duben bez splátky). Týkalo se každého dluhu se splatností 29.–31., tedy i hypoték. Nově se posouvá přes 1. den a den se ořízne na délku cílového měsíce – splatnost 31. padne v únoru na 28. (29. v přestupném roce).',
      '⚙ FIX-283 – částky a úroky byly vždy správně, rozházená byla jen data. Ale kalendář ukazoval neexistující termíny a Budoucí platby z něj čerpají.',
      '⚙ sms-import.js dostal chybějící verzní hlavičku. Pozn.: modul se jmenuje „sms-import", ale karta v appce je „Vložit notifikaci z banky" – parsuje push notifikace (Revolut, George, KB, ČSOB, Air Bank, Google Pay, Apple Pay, PayPal), ne SMS.',
      '⚙ Nový test tools/smoke_castka_splatky.js (15 kontrol). Ověřeno regresí.',
      '📋 Rešerše karet 24–26 (Půjčky · Finanční aktiva · Import z banky) v RESERSE-funkcni-celky-5.md.',
    ]
  },
  {
    verze: 'v10.17',
    datum: '2026-08-28',
    zmeny: [
      '🐛 FIX-281: Budoucí platby hlásily „✓ Zaplaceno" u nesouvisejících transakcí. budouciIsPaid() porovnávalo názvy přes `tn.includes(nm) || nm.includes(tn)`, takže kratší název byl podřetězcem delšího. Ověřené falešné shody: „Voda"→„Vodafone", „Nájem"→„Nájemné garáž", „Plyn"→„Plynulá jízda pojištění", „Auto"→„Autolékárna". Nalezeno při rešerši karty Budoucí platby (S20).',
      '✅ FIX-281 – nově se porovnávají CELÁ SLOVA (podmnožina slov kratšího názvu ve slovech delšího), bez diakritiky. Legitimní shody dál fungují: „Nájem" ↔ „Nájem srpen", „ČEZ" ↔ „ČEZ Prodej", nově i „Nájem" ↔ „najem" (lidi píší obojak).',
      '💰 FIX-281 – ČÁSTKA se nově porovnává, dřív vůbec: nájem 15 000 se tvářil zaplacený i po záloze 500 Kč se stejným názvem. Tolerance 25 % (zálohy za energie kolísají), minimálně 50 Kč, aby drobné položky neselhávaly na pár korunách. Neznámá částka (0) nerozhoduje. Porovnává se přes txCZK – transakce může být v cizí měně (SKILL 20).',
      '⚙ FIX-281 – příjem už nemůže „zaplatit" výdajovou položku se stejným názvem.',
      '⚙ Směr chyby byl nešťastný: appka řekla „Zaplaceno" u nezaplacené položky a člověk podle toho nezaplatil. Falešné „Nezaplaceno" je neškodnější, proto raději přísnější shoda.',
      '⚙ Nový test tools/smoke_budouci.js (18 kontrol) – kromě falešných shod hlídá hlavně to, aby oprava NEROZBILA legitimní shody. Ověřeno regresí: se starým kódem selže 6 kontrol.',
    ]
  },
  {
    verze: 'v10.16',
    datum: '2026-08-28',
    zmeny: [
      '🔴 FIX-279: DRUHÁ CESTA DO KOMUNITY, KTERÁ OBCHÁZELA SOUHLAS. FIX-278 (v10.15) opravil publishCommunityStats(), ale uploadCoicopToFirebase() v helpers.js zapisuje do TÉHOŽ uzlu community/{měsíc}/users/{uid} a souhlas nekontrolovala VŮBEC – volá se ze save() throttlovaně každých 5 minut. Vypnutý přepínač tedy nic neřešil: jedna cesta mlčela, druhá publikovala dál. Objeveno až při opravě computeBank.',
      '🐛 FIX-280: computeBank() a bankSeries() volaly incSum/expSum BEZ D (3 místa) – stejná třída chyby jako FIX-273, jen o úroveň hlouběji. computeBank(D) se volá i nad partnerovými daty (rodinný souhrn), takže partnerův příjem 2000 EUR se sčítal jako 2000 Kč místo 50 000.',
      '🔧 FIX-280 (jádro): txCZK() bez D sahal rovnou do S.wallets, tedy do peněženek PŘIHLÁŠENÉHO uživatele. Při prohlížení partnera (viewingUid) tak jeho cizoměnové transakce spadly na CZK nominál – a to na ~28 místech napříč appkou, která D nepředávají. Fallback teď respektuje viewingUid stejně jako getData(). Sahá se na partnerData přímo, ne přes getData() – ten při viewingUid staví nový objekt a txCZK běží ve smyčkách nad tisíci transakcemi.',
      '⚙ uploadCoicopToFirebase navíc počítá příjem/výdaje přes D (dřív bez něj – cizí měna v nominále).',
      '⚙ Nový test tools/smoke_zustatek.js (10 kontrol). Ověřeno regresí: se starým kódem selžou 4 kontroly včetně té, která ukáže, co přesně odcházelo do komunity bez souhlasu.',
      '📋 Rešerše karet 21–23 (Zůstatek a peněženky · Budoucí platby & šablony · Souhrn výdajů) v RESERSE-funkcni-celky-4.md. Otevřený nález: budouciIsPaid() označí „✓ Zaplaceno" u nesouvisející transakce („Voda" vs „Vodafone“) a neporovnává částku.',
    ]
  },
  {
    verze: 'v10.15',
    datum: '2026-08-28',
    zmeny: [
      '🔴 FIX-278: SDÍLENÍ DO KOMUNITY NEŠLO VYPNOUT. publishCommunityStats() se ptalo na element document.getElementById(\'settingCommunity\') – ten ale v CELÉM PROJEKTU nikdy neexistoval (jediný výskyt toho id byl právě tahle kontrola). getElementById vracelo vždy null, podmínka `optOut && !optOut.checked` byla vždy nepravdivá a funkce se NIKDY nezastavila: měsíční příjem, celkové výdaje, míra úspor a rozpad výdajů po COICOP se odesílaly při každém uložení, všem uživatelům, bez souhlasu a bez možnosti to vypnout. Nalezeno při rešerši karty Komunitní přehled (S20).',
      '✅ FIX-278 – souhlas se nově čte z ULOŽENÉHO nastavení (_settings.community), ne z DOM (element na jiné stránce stejně neexistuje). Chybějící hodnota = NESOUHLAS (SKILL 31: absence dat není souhlas), takže se nepublikuje, dokud to uživatel výslovně nezapne.',
      '⚙ Nastavení → Data & Soukromí: skutečný přepínač „Sdílet mé údaje do Komunitního přehledu" s výpisem, co přesně se odesílá (a co ne – žádné jednotlivé transakce, názvy obchodů ani účtenky). Ukládá se OKAMŽITĚ, ne přes save bar – souhlas se sdílením dat nesmí viset v neuloženém stavu.',
      '🗑️ FIX-278 – vypnutí navíc SMAŽE už odeslané údaje (purgeMyCommunityData, 36 měsíců zpětně). Nechat tam staré záznamy by znamenalo, že vypnutí nic neřeší.',
      '⚙ Komunitní přehled má nový prázdný stav: vysvětlí, že je sdílení vypnuté a proč, a nabídne zapnutí přímo z karty (FIX-214 – prázdná obrazovka bez vysvětlení vypadá jako rozbitá appka).',
      '⚙ Nový test tools/smoke_komunita.js (7 kontrol) včetně ověření, že se neodesílá nic navíc než dohodnutá čtyři pole a že purge maže jen VLASTNÍ záznamy. Ověřeno regresí.',
      '📋 Rešerše karet 18–20 (Kurzy měn · Simulace života · Komunitní přehled) v RESERSE-funkcni-celky-3.md.',
    ]
  },
  {
    verze: 'v10.14',
    datum: '2026-08-28',
    zmeny: [
      '🐛 FIX-276: cíl s PROŠLÝM termínem hlásil „Deadline za −88 dní!". Podmínka daysLeft < 30 neměla spodní hranici – záporné číslo je taky menší než 30. Nově: „Termín uplynul před 88 dny" · „Termín je dnes" · „Zbývá 8 dní", se správným českým skloňováním (1 den · 3 dny · 8 dní · před 1 dnem · před 5 dny).',
      '🐛 FIX-276 (druhé místo): v detailu cíle se u prošlého termínu zobrazovalo „(dnes!)" – appka tvrdila nepravdu. Nově „(před 88 dny)".',
      '⚙ FIX-276: obě data se normalizují na půlnoc. new Date() nese aktuální čas, new Date(\'2026-06-01\') je půlnoc → u termínu „dnes" vycházelo 0 nebo −1 podle denní doby.',
      '🐛 FIX-277: import NIKDY nenavrhl podkategorii. guessCategoryFromKeyword() hledal v `c.subcats||c.subcategories`, ale pole se v celé appce jmenuje `subs` – byl to jediný výskyt `subcats` v celém kódu, takže smyčka proběhla nulakrát. Nic nespadlo, funkce se jen tiše nekonala.',
      '⚙ Nový test tools/smoke_cil_subkat.js (12 kontrol, zmrazený „dnešek" aby test nezestárl). Obě opravy ověřeny regresí – se starým kódem test selže.',
      '📋 Rešerše karet 15–17 (Sdílení & rodina · Nákupní seznam · Import) v RESERSE-funkcni-celky-2.md. Odtud pochází FIX-275/276/277.',
    ]
  },
  {
    verze: 'v10.13',
    datum: '2026-08-28',
    zmeny: [
      '🐛 FIX-275: DUPLICITY PŘI IMPORTU NEUMĚLY CIZÍ MĚNU. buildExistingIndex() porovnával t.amount místo txCZK(t,D) – transakce 100 EUR (reálně 2500 Kč) se porovnávala jako "100" proti bankovnímu výpisu s 2500 Kč. Rozdíl 2400 → 0 bodů za částku → duplikát tiše propadl a transakce se naimportovala PODRUHÉ. Objeveno při rešerši karty Import (S20).',
      '⚙ FIX-275 – přesně ten vzorec, který CLAUDE.md vede jako opakovanou chybu (SKILL 20): každé porovnání a agregace částek MUSÍ přes txCZK(t,D). buildExistingIndex nově bere D jako druhý parametr.',
      '⚙ import.js dostal chybějící verzní hlavičku (jako jediný modul ji neměl – nešlo poznat, ke které verzi patří).',
      '⚙ Nový test tools/smoke_import_dup.js (5 kontrol): EUR duplikát, kurz peněženky bez amtCZK, žádná regrese u korunových, nesouvisející transakce se stále neoznačí. Ověřeno regresí – se starým kódem test selže.',
    ]
  },
  {
    verze: 'v10.12',
    datum: '2026-08-28',
    zmeny: [
      '🔍 TODO-230 (historie a filtry): Rodinný souhrn – přepínač rozsahu grafu 6 / 12 měsíců a filtr žebříčku podle člena domácnosti (chipy „Všichni · Táta · Máma · …").',
      '⚙ Filtr člena zúží POUZE žebříček „Kdo na co utratil". Souhrnné dlaždice i graf zůstávají za celou domácnost – filtrovat i je by znamenalo, že „rodinné saldo" přestane být rodinné, aniž by to bylo z UI patrné.',
      '⚙ Prázdný výsledek filtru NESKRYJE ovládání (FIX-214): sekce zůstane i s chipy a vysvětlí „Babička v tomhle měsíci žádný výdaj nemá". Bez toho by uživateli po kliknutí zmizel i samotný filtr a neměl by se jak vrátit.',
      '⚙ Stav filtru (_famRange, _famMember) žije mimo S a mimo Firebase – je to pohled, ne data. Po reloadu zpět na výchozí (všichni, 6 měsíců).',
      '⚙ tools/smoke_family.js rozšířen na 12 kontrol – hlavně ověření, že filtr NEOVLIVNÍ souhrnná čísla ani graf.',
    ]
  },
  {
    verze: 'v10.11',
    datum: '2026-08-28',
    zmeny: [
      '🔴 KROK 0 – OPRAVA ZTRÁTY DAT: vypnutí přepínače ve „Sdílení & Partneři" do teď MAZALO data z cloudu. users/{uid}/data byl zároveň úložiště i výdejní okénko pro partnery, filtr shareSettings se vynucoval při ZÁPISU → diff-write zapsal transactions/{id}=null pro každou transakci. Týkalo se KAŽDÉHO uživatele, i toho, kdo nikdy žádného partnera neměl (přepínače se vykreslují nezávisle na seznamu partnerů).',
      '✅ Nově: users/{uid}/data = ÚLOŽIŠTĚ (vždy kompletní, čte jen vlastník) · users/{uid}/shared = VÝDEJNÍ OKÉNKO (výřez podle shareSettings, tohle čtou partneři). Filtr tak nemá jak sáhnout na úložiště. Kdo nemá partnera, výřez se nezapisuje vůbec (žádné zápisy navíc).',
      '⚙ app.js: _dwMetaVals/_dwTxObj přestaly filtrovat, nové _shMetaVals/_shTxObj + _shWrite (vlastní diff sada signatur _sh). loadPartners a addPartner čtou /shared s dočasným fallbackem na /data (fáze 1). resetAppState nuluje _dw i _sh.',
      '🔐 addPartner navíc SANITIZUJE partnerova data (sanitizeUserData) – dosud se sanitizovalo jen v loadPartners listeneru, ne při přidání ani v addPartner listeneru. Partnerova data jsou hlavní XSS vektor (S16.5).',
      '⚠️ database_rules.json v10.11 (FÁZE 1) NASADIT RUČNĚ – nový uzel shared, /data zatím partnerům ponecháno čitelné kvůli bezvýpadkovému přechodu. FÁZE 2 (za pár dnů): odebrat partnerský přístup k /data. Instrukce v hlavičce pravidel.',
      '⚙ Nový test tools/smoke_sdileni.js (7 kontrol). Ověřeno i regresí: se starým kódem test skutečně selže.',
    ]
  },
  {
    verze: 'v10.10',
    datum: '2026-08-28',
    zmeny: [
      '👨‍👩‍👧 TODO-230: Rodinný souhrn počítá VŠECHNY členy domácnosti. Původně `{...partners.map(...)[0]}` – druhý a další partner se TIŠE ZAHODIL, takže u 3+ členné domácnosti byly rodinné součty, žebříček i graf nižší, než měly být, a nic na to neupozornilo. Milan: "partnerů může být více, nebo to bude celá rodina (babička, dědeček, máma, táta)".',
      '⚙ Sloupce členů: auto-fit grid místo fixních 2 sloupců (.grid2) – u 3 nebo 5 členů by se poslední osamocený sloupec roztáhl přes celou šířku.',
      '💬 Prázdný stav Rodinného souhrnu už neříká "přidej svou manželku" (předpokládal partnerku), ale "přidej člena domácnosti" – členem může být kdokoli.',
      '⚙ tools/smoke_family.js rozšířen na 8 kontrol: 4členná domácnost (regrese proti návratu partners[0]) a ověření, že žebříček i graf zahrnují všechny členy.',
    ]
  },
  {
    verze: 'v10.09',
    datum: '2026-08-28',
    zmeny: [
      '📈 TODO-230 (další kousek): stats.js – Rodinné souhrny mají nový graf "Rodinné saldo – trend 6 měsíců". 100% reuse drawSaldoBars z charts.js (žádný nový kreslicí kód) – vstupní data se jen počítají přes VŠECHNY členy domácnosti, ne jen přihlášeného uživatele.',
      '🐛 FIX-273: renderFamilySummary() volalo incSum(txs)/expSum(txs) BEZ druhého argumentu D (2 místa). U partnerovy cizoměnové transakce to znamenalo, že txCZK hledal kurz peněženky v MÝCH peněženkách místo partnerových – nenašel, spadl na CZK nominál. Cizoměnové výdaje partnera se tak počítaly ve špatné výši (typicky výrazně podhodnocené). Objeveno při stavbě grafu, opraveno na stejném místě.',
      '⚠️ cat.shared (TODO-230 zadání) PROVĚŘENO A VYVRÁCENO: pole je o COICOP tematickém propojení kategorií pro statistiku ČSÚ ("Pojištění" ↔ "Bydlení"+"Auto"), NE o rodinném/domácnostním sdílení výdajů. S rodinnými souhrny nemá žádnou souvislost – zapojit by ho znamenalo vyrobit nesmysl. Detail a otázka pro Milana v bugs.md.',
      '⚙ tools/smoke_family.js rozšířen o 2 testy (6 celkem): regresní test FIX-273 (EUR peněženka partnera) a ověření volání grafu (6 měsíců, správný součet salda).',
    ]
  },
  {
    verze: 'v10.08',
    datum: '2026-08-28',
    zmeny: [
      '👀 TODO-230 (menší update): stats.js – Rodinné souhrny mají novou sekci "Kdo na co utratil nejvíc". Kombinovaný žebříček výdajů napříč všemi členy domácnosti (dřív jen souhrnná čísla za sloupec a odděleně Top výdaje KAŽDÉHO člena – teď jde napřímo vidět, čí byla KONKRÉTNÍ velká útrata).',
      '⚙ TODO-230 – stejný filtr jako expSum/getActual (SKILL 20): vyloučen splitParent, isBalancing, přesuny. Bez toho by se přesun na spořicí účet nebo vyrovnávací korekce tvářily jako "největší útrata měsíce".',
      '⚙ Nový test tools/smoke_family.js (5 kontrol): řazení podle částky, vyloučení přesunů/splitů/vyrovnání, prázdný měsíc sekci nevykreslí vůbec.',
    ]
  },
  {
    verze: 'v10.07',
    datum: '2026-08-28',
    zmeny: [
      '🔍 onboarding.js: previewOnboarding() – dočasná konzolová pomůcka pro ruční test. Existující účet modal automaticky NIKDY neuvidí (ADR-116, ani po smazání _settings.onboardingDone), takže bez tohoto helperu ho Milan nemohl na svém účtu vůbec otevřít.',
    ]
  },
  {
    verze: 'v10.06',
    datum: '2026-08-28',
    zmeny: [
      '👋 TODO-234: ONBOARDING KROK 1 – nový modul onboarding.js (39.). Jedna stránka pro nového uživatele: jazyk, výchozí měna, typ prvního účtu, výchozí typ platby, formát data, frekvence výplaty + den, dotaz na půjčku/hypotéku. Vše volitelné, "Přeskočit" nastaví jen příznak dokončení.',
      '⚙ TODO-234 – SPOUŠTÍ SE JEN pro opravdu nového uživatele (stejná podmínka, která už spouští seedData() v app.js), NIKDY podle chybějícího _settings.onboardingDone samotného (SKILL 31 – absence dat není informace). Existující účty dostanou příznak potichu doplněný na pozadí bez vyskočení dialogu.',
      '🔓 TODO-234 – dotaz na půjčku/hypotéku zapisuje _settings.hasDebts (true/false). Toto pole už od TODO-227 (S19) čte computeFinancialScore() v premium.js pro odemčení S2 (zadluženost) – onboarding jen doplňuje UI, které chybělo. "Zatím nevím" pole záměrně NEVYPLNÍ, appka nesmí předstírat, že zná odpověď.',
      '⚙ Nový test tools/smoke_onboarding.js (8 kontrol): nový vs. existující uživatel, prohlížení dat partnera, uložení/skip, "zatím nevím" nezapisuje odpověď, opakované volání neotevře modal podruhé.',
    ]
  },
  {
    verze: 'v10.05',
    datum: '2026-08-28',
    zmeny: [
      '🔍 TODO-231: NAŠEPTÁVAČ U TRANSAKCÍ – pole Název a Poznámka nabízí při psaní vlastní historii uživatele (co už kdy zadal), řazeno podle četnosti použití. Vzor: nakupShowCatalogSuggest (Nákupní seznam), tagsInputHandler (Tagy).',
      '⚙ TODO-231 – zdrojem NENÍ katalog produktů, ale S.transactions samotného uživatele. Výběr z návrhu jen vyplní pole, kategorii nemění (žádné automatické mapování).',
      '⚙ TODO-222 (A5): check_tdz.js – doplněn allowlist o getComputedStyle, File, Response, Request, self. Bez toho hlásilo ~55 falešných chyb v souborech, které tato API používají.',
      '⚙ Nový test tools/smoke_naseptavac.js (8 kontrol): délka dotazu, četnost, žádná shoda, výběr vyplní pole, escapování apostrofu v onclick atributu.',
    ]
  },
  {
    verze: 'v10.04',
    datum: '2026-08-24',
    zmeny: [
      '\u{1F4C5} TODO-229 (Milan): SLEVY V NAKUPNIM SEZNAMU MAJI PLATNOST. Sleva se drzela, dokud ji neprepsala novejsi cena \u2013 mohla viset tydny. Milan: „pak uz a) nemusi byt aktualni b) bude mensi sleva, v jinem obchode\". Katalog pritom latestDate UZ NESL, jen se nikde nekontrolovalo.',
      '\u2699 TODO-229 \u2013 TRI STAVY podle stari ceny: do 7 dni „🎉 SLEVA\" (plnohodnotny nalez), 8\u201330 dni „⏳ BYLA SLEVA\" (ukaze se, ale do nalezu se NEPOCITA), nad 30 dni nalez zanika uplne. Zaznamy BEZ data se chovaji jako driv, aby se starsi polozky neprestaly hlasit ze dne na den.',
      '\u2699 TODO-229: opatrnejsi formulace \u2013 misto „v Lidlu je za X\" nyni „naposledy videno v Lidlu \u00b7 18. 8. (pred 6 dny)\". Duvod: ceny se lisi i REGIONALNE a katalog zna obchod, ne kraj. Barva popisku se meni podle stari.',
      '\u2699 11 testu (tools/smoke_slevy.js) vcetne hranic 7 a 30 dni a zpetne kompatibility zaznamu bez data.',
    ]
  },
  {
    verze: 'v10.03',
    datum: '2026-08-24',
    zmeny: [
      '\u{1F3AF} TODO-227 (Milan): FINANCNI SKORE MA DYNAMICKY JMENOVATEL. Novy uzivatel dostaval 217/310 = 70/100 „Dobre\" JESTE NEZ zadal prvni transakci \u2013 181 bodu (58 %) zadarmo za to, ze nic nema. Vsechny neutralni vychozi hodnoty ZRUSENY, zacina se od nuly.',
      '\u2699 TODO-227 \u2013 PRINCIP: co nelze zmerit, se NEHODNOTI \u2013 slozka vypadne z citatele i JMENOVATELE. Skore = dosazene / DOSAZITELNE. Uzivatel s prijmy a vydaji ma meritelne jen S1 \u2192 36/75 = 48/100. Bez jedine meritelne slozky vraci skore null a karta misto cisla vypise, co doplnit.',
      '\u2699 TODO-227: „nemam dluh\" vs. „jeste jsem ho nezadal\" vypada v datech STEJNE. Plny pocet bodu za S2 se prizna JEN kdyz to uzivatel potvrdi (_settings.hasDebts === false). Nemit dluh je opravdu dobre, ale appka to musi VEDET, ne predpokladat. Navazuje na onboarding.',
      '\u2699 TODO-227 (Milanova pripominka): i VYKLAD hodnoceni je dynamicky \u2013 prahy se pocitaji z dosazitelneho maxima, ne z pevnych 310. Kdo ma meritelnou jen jednu slozku, dostane hodnoceni podle toho, jak si v NI vede. Kazda slozka nese priznak dostupnosti a napovedu, cim ji odemknout.',
      '\u{1F41B} FIX-270 (Milan): DETEKTORY SE NAVZAJEM NEVYLUCOVALY. Utrata McDonald 900 Kc/mes padla do TRI nalezu zaroven \u2013 Jidlo venku 270 + Zbytecne utraceni 450 + Casty nakup 270 = 990 Kc, tedy 110 % z utraty, kterou vubec mas. Nyni si kazdy nalez transakci „zabere\" a dalsi ji uz nevidi.',
      '\u{1F41B} FIX-271 (Milan): ROZSAH MISTO JEDNOHO CISLA. Soucet dvanacti odhadu s ruznou spolehlivosti vypadal jako vysledek vypoctu. Nyni rozsah a oddeleni JISTEHO od SPEKULATIVNIHO: poplatky, refinancovani a kurzy ze skutecnych cisel, zbytek odhadem.',
      '\u2699 Rustu zivotniho stylu pribyl popisek: Expense Ratio meri UROVEN (od 1. mesice), verdikt nad nim TEMPO (potrebuje 6 mesicu) \u2013 proto jedno cislo pul roku chybi. Plus poznamka, ze ER a mira uspor davaji vzdy 100 %.',
      '\u2699 16 testu (tools/smoke_skore.js) vcetne simulace noveho uzivatele.',
    ]
  },
  {
    verze: 'v10.02',
    datum: '2026-08-24',
    zmeny: [
      '\u{1F41B} FIX-266 (nalezeno pri hloubkove analyze): KOMUNITNI PREHLED MERIL TEBE A OSTATNI JINAK. publishCommunityStats() odesila soucet pres txCZK() a BEZ presunu a splitu, ale zobrazovaci strana scitala `t.amount || t.amt` a presuny i rozdelene transakce zapocitavala. Veta „Tvoje vydaje 32 000 \u00b7 prumer komunity 24 000\" tak srovnavala TVOJE NAFOUKNUTE cislo s CISTYM prumerem ostatnich \u2013 uzivatel vypadal hure, nez ve skutecnosti je. Opraveno i v rodinnem souhrnu.',
      '\u{1F41B} FIX-267: TATAZ CHYBA V RADARU NA 11 MISTECH. Nejzavaznejsi byl hlavni graf „den po dni\" (vydaje i prijmy) \u2013 kdo ma vydaje v cizi mene, videl graf pocitany z nominalu (100 EUR = 100 Kc). Ctyri mista hledala „nejvetsi prijem = vyplatu\" porovnanim SUROVYCH castek, takze vyplata 1 200 EUR prohrala s bonusem 3 000 Kc a CYKLUS SE ZAKOTVIL NA SPATNY DEN. Dale tydenni rozpad, top variabilni kategorie, vikendove tempo, detekce predplatnych a start minuleho cyklu.',
      '\u{1F41B} FIX-267: v Detektoru se prah „mala platba do 300 Kc\" testoval proti NOMINALU \u2013 nakup za 20 EUR (506 Kc) se tvaril jako drobna platba a padal do Zbytecneho utraceni.',
      '\u{1F41B} FIX-268 (nahlasil Milan): INFLACE SLUCOVALA RUZNE PRODUKTY. Klic polozky byl nazev BEZ cisel a jednotek, orezany na 25 znaku \u2013 „mleko polotucne 1,5%\" i „mleko plnotucne 3,5%\" davaly stejny klic „mleko %\". Dve ruzne zbozi splynula v jedno a rozdil jejich cen se tvaril jako inflace.',
      '\u2699 FIX-268 \u2013 UVAHA: nerozpoznana shoda je nesrovnatelne mensi skoda nez falesna. Rozdeli-li se polozka na dve, kazda ma jedinou cenu a z indexu VYPADNE. Slouci-li se dve ruzne, index si VYMYSLI zdrazeni. Cisla se proto zachovavaji, klic se neorezava; normalizuje se jen diakritika, velikost pismen a interpunkce, a slova delsi nez 5 znaku se zkracuji, aby se „POLOTUC.\" sparovalo s „polotucne\" \u2013 ale cisla a procenta zustavaji nedotcena.',
      '\u{1F41B} FIX-269 (nahlasil Milan): INFLACE IGNOROVALA SLEVY. Brala `it.price`, tedy cenu PRED slevou, zatimco zbytek aplikace pouziva lineTotal. U zlevnene polozky tak pocitala jinou cenu nez Analyza uctenek a akce se v indexu neprojevila vubec, prestoze uzivatel realne zaplatil min.',
      '\u2728 TODO-225 (Milan): KOMUNITNI BENCHMARK POUZIVA MEDIAN misto prumeru. Jeden uzivatel s hypotekou 40 000 posunul „prumerne bydleni\" vsem ostatnim. Minimalni pocet uzivatelu se ZAMERNE nezavadi \u2013 rozhodnuti Milana: „1 uzivatel nebo 1000, je to ok.\" Pri jedinem prispevateli je median roven jeho hodnote, coz je korektni.',
      '\u2728 TODO-226 (Milan): KONTROLA UPLNOSTI UCTENKY. AI obcas polozku prehledne (zmuchlany doklad, dva sloupce, slepeny radek) a do teto verze to nikdo nezjistil \u2013 soucet polozek se neporovnaval se sumou natistenou na uctence, prestoze OBE cisla mame. Chybejici polozka tise vypadla z Inflace, z COICOP rozpadu i z Nakupni DNA. Nyni se rozdil nad 1 Kc ukaze u uctenky i jako souhrn nad seznamem.',
      '\u2699 TODO-226: rozdil se hlasi NEUTRALNE („chybi / prebyva\"), ne jako chyba AI \u2013 byva to i vratna zaloha, poukazka nebo sleva na cely doklad. Tolerance 1 Kc pokryva zaokrouhleni hotovosti.',
      '\u2699 20 testu (smoke_fix266_267.js, smoke_uctenka.js) vcetne kontroly, ze se ruzne produkty v Inflaci NESLUCUJI a ze text napovedy odkazuje na skutecne existujici ovladani.',
    ]
  },
  {
    verze: 'v10.01',
    datum: '2026-08-22',
    zmeny: [
      '\u{1F6A8} FIX-264 (nahlasil Milan pri testu ciziho uctu, KRITICKA): NOVY UZIVATEL NEMEL ZADNE KATEGORIE ANI PENEZENKU. V modalu Pridat transakci nebylo co vybrat, Predikce hlasila „Nejprve pridej kategorie vydaju\" a rozbalovatko Penezenka bylo prazdne. Milan: „pro nove uzivatele je toto duvod k ukonceni pouzivani aplikace\".',
      '\u2699 FIX-264 \u2013 PRICINA: seedData() se volalo JEN kdyz v databazi chybel CELY uzel users/{uid}/data. Ten ale vznikne i jinak \u2013 castecnym zapisem pri registraci, migraci, importem, obnovou zalohy nebo prvnim ulozenim cehokoli. Od te chvile podminka !snap.exists() neplati, seed se uz NIKDY nespusti a uzivatel zustane bez zakladnich dat navzdy.',
      '\u2699 FIX-264 \u2013 RESENI: nova funkce ensureBaseData() se nepta „existuje uzel?\", ale „ma uzivatel to, bez ceho aplikace nefunguje?\" a chybejici doplni. Bezi pri kazdem prihlaseni i v lokalnim rezimu, je IDEMPOTENTNI \u2013 co uzivatel ma (vcetne vlastnich a zamerne smazanych vychozich), se nesaha. Opravi tim i uz postizene ucty, ne jen nove.',
      '\u2728 FIX-264: novy ucet dostane JEDNU neutralni penezenku „Muj ucet\" v jeho zakladni mene \u2013 ne sadu, kterou by musel mazat. Bez penezenky nelze transakci priradit k uctu a rozbalovatko je prazdne.',
      '\u{1F6A8} FIX-265 (nahlasil Milan, KRITICKA): APLIKACE UZIVATELI MAZALA DATA. V rozdelenem cteni (ADR-062) stalo: S[k] = snap.exists() ? snap.val() : (Array.isArray(S[k]) ? [] : S[k]). Kdyz klic v databazi NEEXISTOVAL, lokalni pole se prepsalo na PRAZDNE. Proto Milanovi zmizely kategorie i pote, co si je rucne obnovil v karte Kategorie a znovu se prihlasil \u2013 uzel porad chybel a posluchac ho pri kazdem pripojeni vynuloval.',
      '\u2699 FIX-265 \u2013 RESENI: nelze rozlisit „nikdy nezapsano\" od „smazano\", ale DA SE rozlisit, jestli klic v TOMTO sezeni uz nekdy existoval (_splitSeen). Dokud jsme ho nevideli, je chybejici uzel nepritomnost dat, ne jejich smazani \u2192 lokalni hodnota zustava. Jakmile jednou existoval a pak zmizel, jde o skutecne smazani \u2192 vyprazdni se. Skalarni klice (schemaV) se na prazdne pole nemeni nikdy.',
      '\u2699 10 testu (tools/smoke_seed.js) vcetne obou Milanovych scenaru, idempotence a kontroly, ze se vlastni kategorie uzivatele NEPREPISOU vychozimi.',
      '\u2139\uFE0F Prazdna Predikce byla DUSLEDKEM chybejicich kategorii, ne samostatnou chybou \u2013 po oprave zmizi sama.',
    ]
  },
  {
    verze: 'v10.00',
    datum: '2026-08-22',
    zmeny: [
      '\u{1F389} TODO-219 DOKONCENO: receipts.js \u2013 posledni a nejcitlivejsi modul. 34 mist proslo JEDNO PO DRUHEM, protoze je to jediny modul, kde se koruny potkavaji s cenami za kus, za kilo a s pocty kusu. Plosna nahrada by pripsala „Kc\" i k poctu kusu.',
      '\u2699 Rozdeleni podle jednotky: _cNum() = JEN prepocet bez symbolu (osy grafu, popisky s vlastni jednotkou „Kc/ks\", „Kc/mes\", „Kc/nakup\", karty s jednotkou pod cislem) \u00b7 fmtB() = prepocet SE symbolem (samostatne castky ve vetach a kartach). Pocty kusu (metric===qty, totalQty) se NEPREVADEJI \u2013 nejsou to penize.',
      '\u2699 Karty „Usetreno slevami\" mely jednotku natvrdo v popisku pod cislem („tento mesic (Kc)\") \u2013 popisek nyni bere symbol z curSym().',
      '\u2699 Zrusena vypustka u nazvu obchodu v tabulce Inflace \u2013 Milan upresnil, ze tabulku POSOUVA posuvnikem a orezani nazvu by mu vzalo prave to, co si chce precist. Nazev zustava cely, tabulka roste do sirky. Skutecnou pricinou rozpadu na mobilu bylo lamani hlavicek a cisel, coz resi nowrap.',
      '\u2139\uFE0F ZAKLADNI MENA JE TIM KOMPLETNI \u2013 vsech 11 modulu, 20 vstupnich poli a ~180 zobrazovacich mist.',
    ]
  },
  {
    verze: 'v9.99',
    datum: '2026-08-22',
    zmeny: [
      '\u{1F4B6} TODO-219: ZAKLADNI MENA v modulech, ktere fmtB() dosud neznaly \u2013 review.js, inflace.js, report.js, stats.js, premium.js. Castky se nyni prepocitavaji do zvolene meny.',
      '\u2699 PRAVIDLO DLE MILANA: „nemusis do kazde tabulky pripisovat priznak Kc, staci nekde do popisku, podstatne je aby se prepocitala castka.\" V maticich (Report, Statistiky, ceny v Inflaci) proto zustavaji HOLA cisla a symbol je jednou v hlavicce sloupce nebo v popisku karty. Samostatne hodnoty (souhrny, karty rodiny, dialogy) pouzivaji fmtB(), protoze stoji mimo tabulku a symbol tam nese informaci.',
      '\u26A0\uFE0F VYJIMKA: sloupec „Za kg/l\" v Inflaci symbol NESE \u2013 je to jina jednotka (cena za kilo, ne za kus) a bez nej by se dve ruzne jednotky ve stejne tabulce pletly. Milan: „dulezite tam nemichat jine jednotky (l, kg, g).\"',
      '\u{1F41B} FIX-262 (nahlasil Milan ze screenshotu): MATICE REPORTU SE PRI VODOROVNEM POSUNU ROZJIZDELA. Dve pricny: (1) radek se jmenem sektoru byl <td colspan> s position:sticky, takze zustaval prilepeny vlevo a jeho text se orizl \u2013 misto „SPLATKY UVERU\" bylo videt „PLATKY UVERU\", misto „BYDLENI\" jen „YDLENI\". (2) prvni sloupec mel v hlavicce min-width:158px, ale v tele nowrap bez omezeni sirky \u2013 hlavicka a telo se rozesly a „Kategorie\" prekryvala sloupec „Mesicni\". Nyni ma sloupec pevnou sirku 170px v obou a nazev sektoru je ve vnorenem sticky <span>.',
      '\u{1F41B} FIX-263 (nahlasil Milan ze screenshotu): tabulka „Inflace podle obchodu\" se na mobilu rozpadala \u2013 nazvy hlavicek se lamaly po jednom pismenu pod sebe a cisla na dva radky („3 6 76\"). Dlouhe nazvy obchodu s nowrap roztahly sloupec pres celou sirku. Nazev ma nyni max-width s vypustkou a plnym nazvem v napovede, cisla maji nowrap, min-width tabulky zvyseno na 520 px.',
      '\u2139\uFE0F Predikce (transactions.js) ponechana s „Kc\" v kazde bunce \u2013 rozhodnuti Milana: „kupodivu to nevypada spatne (ponechej)\".',
      '\u2139\uFE0F ZBYVA: receipts.js (34 mist) \u2013 samostatny opatrny pruchod, protoze se tam michaji koruny s cenami za kg/l a s pocty kusu.',
    ]
  },
  {
    verze: 'v9.98',
    datum: '2026-08-21',
    zmeny: [
      '\u{1F41B} TODO-218 (Milan: „kolik zakazniku dany uzivatel privedl?\"): ADMIN UKAZOVAL SPATNY POCET KONVERZI. Cetl users/{uid}/referral/conversions, coz je jen ZRCADLO, ktere si vlastnik kodu naplni az pri svem dalsim prihlaseni \u2013 bezpecnostni pravidla mu nedovoli zapsat body do ciziho uctu (viz FIX ze Session 14). U uzivatele, ktery se dlouho neprihlasil, tam tedy byla nula, i kdyz nekoho privedl.',
      '\u2699 TODO-218: skutecnym zdrojem pravdy je referrals/{kod}/conversions/{uid}. Admin ted stahuje CELY uzel referrals JEDNOU (je maly, jeden zaznam na kod) a postavi si mapu \u2013 misto N dotazu navic jeden jediny. V detailu uzivatele pribyla dlazdice „Privedl\" a veta „pres odkaz se registrovalo X lidi z Y kliku, tedy Z %\".',
      '\u2699 TODO-218: kdyz se zrcadlo lisi od skutecnosti, admin to rovnou rekne \u2013 „N registraci ceka na pripsani bodu\" a „uzivatel u sebe vidi M\". Drive to vypadalo jako chyba, pritom jde o normalni stav mezi registraci a prihlasenim majitele kodu.',
      '\u2728 Seznam uzivatelu: nove razeni „Nejvic privedenych\".',
    ]
  },
  {
    verze: 'v9.97',
    datum: '2026-08-19',
    zmeny: [
      '\u2728 TODO-215: REFERENCNI KURZ SE NYNI BERE K DATU TRANSAKCE, ne k datu zapisu. Milan spravne namitl, ze pouzit „dnesni\" kurz u transakce zapsane se zpozdenim nebo upravene po dvou tydnech nedava smysl. Worker /cnb prijima volitelny ?date=DD.MM.RRRR a vraci historicky listek CNB; bez parametru se chova presne jako driv. Historicky listek se uz nezmeni, drzi se proto v cache tyden a v pameti prohlizece do konce sezeni.',
      '\u26A0\uFE0F worker.js SE NASAZUJE ZVLAST (Cloudflare) \u2013 dokud se nova verze nenahraje, klient dostane dnesni kurzy jako doposud a nic se nerozbije.',
      '\u2699 Dohledani bezi AZ PO ULOZENI a bez await \u2013 zapis transakce ani zavreni okna necekaji na sit. Kdyz se kurz nepodari ziskat, zustane ten z doby zapisu a fxRefDate prozradi, ke kteremu dni patri.',
      '\u2728 TODO-217: PREPRACOVANA KARTA PROJEKTU podle navrhu odsouhlaseneho Milanem. Hlavni zmena: CAS VEDLE PENEZ \u2013 pruh rozpoctu ma svislou znacku „dnes\" a vetu o tempu („za 77 % doby projektu jsi utratil 80 % rozpoctu, pri tomhle tempu skoncis na X\"). Drive karta rekla „29 % vycerpano\", ale ne, jestli je to po tydnu nebo tri dny pred koncem.',
      '\u2699 Pruh rozpoctu je zaroven ROZPADEM PODLE KATEGORII vcetne legendy \u2013 jedna vec misto dvou. Pribyla karta „Nejvetsi polozka\" a u rozpoctu „kolik zbyva na den do konce\".',
      '\u2699 Prijmy a Bilance se ukazuji JEN kdyz projekt prijem opravdu ma. Milan pripomnel, ze projekt neni jen dovolena \u2013 u rekonstrukce s dotaci nebo pujcky kamaradovi (vraceni penez) davaji smysl, u dovolene je „0 Kc\" a „bilance = zaporna utrata\" totez cislo dvakrat.',
      '\u2728 GRAF KUMULATIVNIHO VYVOJE UTRATY s carou rozpoctu. Kresli se az od 4 transakci \u2013 ze dvou bodu je usecka, ne graf.',
      '\u2728 SROVNANI S PODOBNYMI PROJEKTY (Milan: „do budoucna OK\"). Porovnava jen UKONCENE projekty TEHOZ typu a vyzaduje aspon dva \u2013 prumer z jednoho projektu neni prumer. Dokud jich neni dost, karta se nezobrazi vubec misto toho, aby ukazovala nesmysl.',
      '\u2699 Transakce projektu nove razene OD NEJSTARSI \u2013 u projektu je zajimavy pribeh (letenka \u2192 ubytovani \u2192 utrata na miste), sestupne razeni ho rozbijelo.',
      '\u2699 10 testu na graf a srovnavac vcetne deleni nulou pri transakcich v jednom dni a vyloučeni probihajicich projektu.',
    ]
  },
  {
    verze: 'v9.96',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F41B} FIX-261 (nahlasil Milan, ZASADNI): amtCZK a fxRef se mohly ROZEJIT a appka by pak pocitala kurz z dvou cisel, ktera popisuji jiny stav transakce. Milan popsal obe cesty: (a) v editaci zmenim castku z 20 na 25 EUR, ale zapomenu prepsat „Skutecne v Kc\" \u2013 25 EUR by melo porad cenu 594 Kc, tedy kurz 23,76 misto 29,70 a appka by hlasila VYMYSLENOU vyhodnou smenu; (b) kliknu na „Prepocitat\" po dvou tydnech \u2013 castka se spocte dnesnim kurzem, ale porovna se s referencnim kurzem z doby zapisu.',
      '\u2699 FIX-261 \u2013 PRAVIDLO: amtCZK a fxRef tvori PAR a musi vzdy popisovat tyz stav. Dokud se nemeni castka ani mena, oba udaje zustavaji ZMRAZENE (historicka utrata se neprepisuje dnesnim kurzem). Jakmile se jedno z toho zmeni, jde o NOVE MERENI \u2013 prerazi se OBOJE. Kdyz uzivatel zmeni castku a do pole „Skutecne v Kc\" nesahne, castka se prepocte dnesnim kurzem misto tichého ponechani stare hodnoty.',
      '\u2699 Pribyl priznak _czkUserTyped \u2013 puvodni _czkTouched se pri editaci nastavi na true uz tim, ze transakce ma ulozenou castku, takze z nej neslo poznat, jestli uzivatel do pole opravdu sahl.',
      '\u2699 Pravidlo ma 11 testu (tools/smoke_fxpair.js) vcetne obou Milanovych scenaru. Test odhalil, ze i prvni verze opravy mela mezeru \u2013 rucni „Prepocitat\" bez zmeny castky prerazilo kurz, ale ne castku.',
    ]
  },
  {
    verze: 'v9.95',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F41B} FIX-258 (z Milanova screenshotu): ROZPAD KURZOVYCH ZTRAT UKAZOVAL DVA KOSE SE STEJNYM NAZVEM \u2013 „Neuvedeno +22,1 % \u00b7 Neuvedeno \u22120,0 %\" a vetu „rozdil mezi Neuvedeno a Neuvedeno\". Pricina: u smazaneho nebo neznameho typu platby se jako klic pouzilo jeho ID, ale popisek byl „Neuvedeno\" \u2013 vznikly tak dva ruzne kose se shodnym nazvem. Vse nezaraditelne nyni pada do jednoho.',
      '\u2699 DETEKTOR \u2013 kratsi popisek u kurzoveho nalezu (Milan: „zmensi vysledny popisek\"). Hlavni cislo drzi karta, detaily se presunuly do rozpadu.',
      '\u2728 NOVY ROZPAD KURZOVYCH ZTRAT PO TRANSAKCICH (zadal Milan): rozbalovaci tabulka s datem, nazvem platby, castkou v cizi mene, kurzem banky, kurzem CNB a rozdilem v Kc. Souhrnne cislo je k nicemu, kdyz si ho uzivatel nemuze overit.',
      '\u{1F41B} VIZUAL: ve Financnim radaru („Kam smeruju\") prekryvala teckovana cara skutecneho stavu popisek hodnoty u sloupce Cashflow. Popisek dostal podklad a vyssi vrstvu, cara nizsi.',
      '\u2728 HISTORIE CYKLU \u2013 MINIMUM A MAXIMUM (navrhl Milan): tydenni sloupce ukazovaly jen median, ktery sam o sobe nerekne, jestli je tyden stabilni, nebo jestli jednou utratis 500 a podruhe 15 000. Pribyla svisla cara s nozkami (whisker) pres rozsah napric cykly, vcetne popisku v legende a v napovede.',
      '\u{1F41B} FIX-259 (nahlasil Milan): pole „Skutecne v Kc\" se pri EDITACI nikdy neprepocitalo. Je to zamer \u2013 kurz se u ulozene transakce fixuje, aby se historicka utrata neprepisovala dnesnim kurzem. Kdyz ale uzivatel v editaci zmeni castku nebo menu, ceka prepocet. Pribylo tlacitko „↻ Prepocitat\", ktere to udela NA VYZADANI \u2013 rozhodnuti zustava na uzivateli, ale cesta existuje.',
      '\u{1F41B} FIX-260 (nahlasil Milan): v detailu PROJEKTU se nezobrazovaly tagy transakci, prestoze v beznem seznamu Transakci ano. Uzivatel je zapsal a nikde je nevidel. Doplneny vcetne escapovani.',
    ]
  },
  {
    verze: 'v9.94',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F41B} FIX-257 (nahlasil Milan): FINANCNI OBRAZ SI PROTIRECIL S VLASTNIM GRAFEM. Hlaska „Zlepsujes se, ale porad v minusu\" koncila vetou „do plusu se takhle nedostanes\" pokazde, kdyz rezerva po 6 mesicich jeste nebyla kladna. Jenze podminka teto vetve je avg>0, tedy rezerva ROSTE \u2013 uzivatel se do plusu dostane, jen pozdeji nez za pul roku. Text tvrdil pravy opak toho, co ukazoval graf hned vedle (u Milana rust z \u2212108 956 na \u221218 075 Kc).',
      '\u2699 FIX-257: misto nepravdiveho tvrzeni se nyni DOPOCITA, za kolik mesicu rezerva prekroci nulu, vcetne konkretniho mesice a roku \u2013 to je i uzitecnejsi informace nez puvodni vycitka. Nadpis zmenen na „Jdes spravnym smerem, jen to potrva\" a doplneno, o kolik se stav za pul roku zlepsi.',
      '\u2699 PRISTI MESIC (Milan: „vidim placeholdery\"): poznamky u radku ukazovaly jen obecne „Ø 6 mes.\", takze vypadaly jako vypln. Nyni je tam CELY VYPOCET \u2013 napr. „170 298 Kc ÷ 6 mes. = 28 383 Kc · 6× v 6 z 6 mesicu · obvykle 5. dne\", u sablon „mesicne · pevna castka ze sablony\". Uzivatel vidi, odkud se cislo vzalo, misto aby mu veril.',
      '\u{1F41B} KURZOVA ZTRATA SE NEZOBRAZOVALA (Milan zadal transakci a nic nevidel). Neslo o chybu vypoctu: pole „Skutecne v Kc\" se predvyplnuje kurzem CNB, a kdyz ho uzivatel NEPREPISE podle vypisu banky, je kurz banky roven kurzu CNB a rozdil je presne NULA \u2013 neni co zobrazit. Napoveda to ale nerekla. Nyni: „Prepis podle vypisu z banky \u2013 z rozdilu appka spocita, kolik te smena stala navic. Nechas-li to tak, kurzova ztrata vyjde nula.\"',
      '\u2139\uFE0F Nalez v Detektoru uspor se navic ukaze az pri 3+ cizomenovych platbach za rok a ztrate nad 200 Kc \u2013 z jedne transakce se zavery delat nedaji.',
    ]
  },
  {
    verze: 'v9.93',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F5D1}\uFE0F ZRUSEN SBER CASU ZAPISU (t.enteredAt), zavedeny pred hodinou ve v9.92. Milan: „ja sam transakce doplnuji i na druhy den a cas jsem nikdy nesledoval\" \u2013 cas zapisu by tedy s casem nakupu nemel nic spolecneho a vzorec „vecer utracim spatne\" by byl vymysleny. Ukladat data, ktera nikdy nedaji spolehlivou odpoved, nema smysl; navic je to zbytecny osobni udaj navic.',
      '\u2699 Odstraneno cele: zapis v debts.js, funkce revTimePatternReady() i zminka o denni dobe v karte Vzorce. Karta ted misto omlouvani rovnou rika, co sleduje \u2013 den v tydnu, zpusob platby, druh nakupu, velikost utraty. Test hlida, ze se sber uz nikde nevratil.',
      '\u2139\uFE0F TODO-198 zustava ZDARMA pro vsechny tarify \u2013 rozhodnuti Milana (otazka 4 z planu). Duvod: hodnoceni je presne ta funkce, ktera z appky dela navyk, a zatim neni overene, jestli o ni lide stoji.',
    ]
  },
  {
    verze: 'v9.92',
    datum: '2026-08-19',
    zmeny: [
      '\u2728 TODO-198 FAZE 2: SOUHRN HODNOCENI V DENIKU. Faze 1 (v9.34) hodnoceni sbirala, ale uzivatel nikde nevidel, co z toho plyne. Nyni: kolik Kc pripada na utraty hodnocene 1\u20132, kolik na 4\u20135, sest mesicu vyvoje ve sloupcich, nejcasteji vahane a nejlepe hodnocene skupiny.',
      '\u26A0\uFE0F FAZE 2 \u2013 TON JE SOUCAST ZADANI, NE KOSMETIKA. Misto „utratil jsi 4 200 Kc za veci, ktere ti nic nedaly\" karta rika „kdybys polovinu poslal jinam, mas za rok X navic \u2013 ne proto, ze by ty vydaje byly spatne, ale protoze jsi u nich sam vahal\". Stejna data, opacny pocit: prvni je obvineni, druhe nabidka. Test to hlida a pri obvinujici formulaci NEPROJDE.',
      '\u2699 Prumery jsou VAZENE CASTKOU, ne poctem \u2013 jedna draha utrata musi vazit vic nez pet drobnych. Pod 15 % ohodnocenych vydaju karta vypise, ze cisla mluvi jen o te casti.',
      '\u2728 TODO-198 FAZE 3: VZORCE. Hleda souvislost mezi tim, KDY a JAK uzivatel plati, a tim, jak to pak hodnoti \u2013 den v tydnu, zpusob platby, druh nakupu, velikost utraty. Vzorec se ukaze jen pri 5+ ohodnocenych utratach v kosi a rozdilu 0,6+ bodu; jinak jde o sum a karta rekne, ze se nic vyrazne neopakuje.',
      '\u26A0\uFE0F FAZE 3 \u2013 DENNI DOBA V APLIKACI NEEXISTUJE. Plan slibuje „nakupy po 22:00 hodnotis 2,1\", jenze transakce nesou POUZE datum YYYY-MM-DD. Cas neuklada rucni zapis, import z banky ani parser uctenek \u2013 proslo cele uloziste. Dopocitat ho nelze a pouzit cas ZAPISU by bylo zavadejici: kdo zadava davkove vecer, vyrobil by si vzorec „vecer utracim spatne\", ktery v realite neexistuje.',
      '\u2699 Reseni: od v9.92 se uklada t.enteredAt (cas zapisu) a vzorec denni doby se zapne az pri 20+ zaznamech zapsanych V DEN NAKUPU \u2013 tam je cas zapisu rozumnou nahradou casu nakupu. Do te doby karta OTEVRENE RIKA, ze udaj chybi a kolik zaznamu jeste schazi, misto aby to zamlcela.',
      '\u2699 Cas se uklada PRED rozvetvenim podle meny \u2013 pri prvnim pokusu skoncil uvnitr jedne vetve a transakcim zadanym v zakladni mene bez penezenky by chybel.',
      '\u2699 15 testu vcetne kontroly tonu, vazeneho prumeru a toho, ze vyrovnane hodnoceni NEVYROBI vzorec z nahody.',
    ]
  },
  {
    verze: 'v9.91',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F41B} TODO-216: PENEZNI VSTUPNI POLE KONECNE RESPEKTUJI ZAKLADNI MENU. 20 poli v 6 modulech (rozpocet projektu, hodnota a vklad aktiva, castka sablony, jistina/zbyva/splatka/pokuta u dluhu, konsolidace, simulace, dluhova vlna, cena prani, mesicni vklad, cilova castka, vklad do cile, darek k narozeninam, referencni cena v nakupnim seznamu) melo natvrdo popisek „(Kc)\" a ukladalo hodnotu SYROVE jako koruny. Kdo mel zakladni menu EUR, zobrazoval si vsude eura, ale zadaval koruny.',
      '\u26A0\uFE0F SAMOTNA ZMENA POPISKU BY BYLA HORSI NEZ SPATNY POPISEK \u2013 uzivatel by napsal 1000 s myslenkou 1 000 EUR a ulozilo by se 1 000 Kc. Oprava je proto VZDY dvoudilna: popisek + prevod na OBOU stranach. Nove helpery moneyInFill() (CZK z databaze \u2192 pole v zakladni mene) a moneyInRead() (pole \u2192 CZK k ulozeni), plus baseToCzk() jako opak czkToBase().',
      '\u26A0\uFE0F NEJNEBEZPECNEJSI CHYBA je vynechat PLNENI pole. Bez nej se hodnota pri kazdem otevreni a ulozeni vynasobi kurzem znovu: 25 000 \u2192 632 500 \u2192 16 milionu. Proto ma tato zmena vlastni ROUND-TRIP test (zadam \u2192 ulozim \u2192 otevru editaci \u2192 ulozim ZNOVU, petkrat po sobe), bez ktereho se nesmi nasazovat. Statická kontrola navic overuje, ze zadne z 20 poli neni prevedene jen z jedne strany.',
      '\u2699 Popisky se prepisuji symbolem zakladni meny v applySettings(), tedy pri startu i po kazde zmene meny. Popisky s vnorenymi prvky (napr. CASTKA se spanem jednotky) se zamerne nesahaji \u2013 prepis textContent by je rozbil. Pri zakladni mene CZK je kurz 1,0, obe funkce jsou identita a pro drtivou vetsinu uzivatelu se nemeni vubec nic.',
      '\u2699 ZADNA MIGRACE DAT \u2013 ulozene hodnoty zustavaji v CZK, meni se jen vrstva zadavani.',
      '\u{1F41B} Pri praci nalezena a obejita past: charts.js ma nekolik funkci na JEDINEM radku (saveBday, editBday). Pridani komentare // za nahrazeny prikaz ZAKOMENTOVALO ZBYTEK RADKU vcetne zavirajicich zavorek. node --check to odhalil okamzite, ale pri plosnych nahradach je to tichy zabijak \u2013 doplneno do kontrol.',
      '\u2699 14 testu na prevod a popisky, z toho dva round-trip.',
    ]
  },
  {
    verze: 'v9.90',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F41B} OSA ZIVOTA \u2013 ZRUSENO OREZANI NA 6 LET (nahlasil Milan: „z pohledu osy zivota je 6 let kratka doba, musi pokracovat i nekolik desitek let\"). Historie se uz NEOREZAVA vubec. Misto toho se prizpusobuje HUSTOTA: do 4 let po mesicich, do 12 let po ctvrtletich, dele po letech. 40 let po mesicich = 480 bodu na sirku, coz by se necetlo.',
      '\u2699 Krivky prijmu a vydaju ukazuji u slucovanych kosu PRUMER NA MESIC, ne soucet za obdobi \u2013 jinak by prechod z mesicu na roky udelal umely dvanactinasobny skok. Kumulovany tok zustava skutecnym souctem. Rozdil je uzivateli vysvetleny pod grafem.',
      '\u2728 TODO-215 FAZE 2: KURZOVE ZTRATY SE POCITAJI A ZOBRAZUJI. fxLossOf() porovna kurz, ktery dala banka (amtCZK / amount), s kurzem CNB ulozenym od v9.89. U kazde cizomenove transakce v seznamu je nyni pod castkou radek „kurz +111 Kc (+22,9 %)\" s detailem v napovede (kurz banky, kurz CNB, datum listku). Vyhodna smena vyjde zaporne \u2013 jako zisk, ne jako nula.',
      '\u2699 FAZE 2: pocita se JEN u transakci, ktere maji obe cisla. Zaznamy zapsane pred v9.89 fxRef nemaji a dopocitat ho zpetne NELZE \u2013 odhadovat by znamenalo vyrabet cisla. Takove se z vypoctu vynechaji a jejich POCET se uzivateli ukaze, at vi, ze souhrn neni z cele historie.',
      '\u2728 TODO-215 FAZE 3: NALEZ V DETEKTORU USPOR s rozpadem podle zpusobu platby \u2013 „Karta +2,1 % \u00b7 Bankomat +8,4 % \u00b7 Prepazka +11,2 %\". Tohle je rada, kterou lze nasledovat; samotne „nechal jsi tam 1 240 Kc\" je jen konstatovani. Okno je 12 mesicu, protoze zahranicni platby jsou sezonni a mesicni vzorek by u vetsiny lidi byl prazdny. Jediny nalez v Detektoru, ktery nevychazi z odhadu procent, ale ze SKUTECNEHO rozdilu dvou ulozenych cisel.',
      '\u2699 Celkova prirazka je vazena castkou, ne prumer procent \u2013 jedna drobna nevyhodna smena by jinak prebila deset velkych vyhodnych.',
      '\u2699 Radek transakce nove bere menu z ulozene t.currency (drive vyhradne z penezenky), takze ceska karta s nakupem v eurech ukaze EUR.',
      '\u2699 15 novych testu (5 na vypocet ztraty, 5 na rozpad, 5 na osu zivota vcetne 40 let historie).',
    ]
  },
  {
    verze: 'v9.89',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F4CA} TODO-215 FAZE 1: SBER REFERENCNIHO KURZU CNB. Aplikace zna kurz, ktery dala BANKA (amtCZK / amount = 594/20 = 29,70 Kc za euro), ale nemela s cim ho porovnat. Nyni se k cizomenove transakci uklada i fxRef (kurz CNB) a fxRefDate (datum kurzovniho listku). Z toho pujde ve fazi 2 spocitat, o kolik je bankovni kurz horsi \u2013 tedy KOLIK CLOVEKA STOJI SMENA.',
      '\u2699 ZADNA DATABAZE KURZU SE NESTAVI. Historicky kurz je odvoditelny z uz ulozenych dat, staci k nim pripsat jedno cislo. Denni snimky celeho kurzovniho listku by zabraly mnohonasobne vic mista a nic navic by nerekly.',
      '\u26A0\uFE0F Uklada se JEN zivy kurz z CNB. Kdyz Worker neodpovi, kurzy.js necha orientacni prumery z _FX_RATES \u2013 zapsat je jako „referencni CNB\" by byla lez a marze by se pocitala proti vymyslenemu cislu. Radeji zadny udaj nez spatny.',
      '\u2699 Kurz se zapisuje JEN pri prvnim ulozeni. txObj je vzdy novy objekt (do transakce se sloucuje pres Object.assign), takze se puvodni hodnota dohledava v S.transactions \u2013 jinak by editace tri mesice stare transakce prerazila kurz na dnesni a srovnani ztratilo smysl. Uklada se i datum kurzovniho listku, aby slo poznat, jak spolehlive srovnani je (uzivatel casto zapisuje se zpozdenim).',
      '\u2728 TODO-207 VARIANTA B (Milanova volba): OSA ZIVOTA v Deniku. Vodorovna osa nahore s udalostmi jako body a etapami jako pruhy, pod ni financni krivky \u2013 kdyz nekde krivka zlomi, duvod byva videt nad ni.',
      '\u26A0\uFE0F OSA ZIVOTA MA TRI KRIVKY, NE CTYRI. „Ciste jmeni\" z navrhu vypadalo hezky, ale historicky ho spocitat NELZE \u2013 aplikace nezna stav aktiv a dluhu zpetne po mesicich, jen dnesni. Misto dokreslene cary je tam KUMULOVANY TOK (nascitane prijmy minus vydaje), ktery se z transakci odvodit da. Rozdil je uzivateli vysvetleny primo pod grafem.',
      '\u2699 Osa se nekresli pod 3 mesice dat (na kratsi historii by vypadala prazdne) a zobrazuje maximalne poslednich 6 let. Sirka je v PIXELECH podle poctu mesicu + vodorovny posuv \u2013 SVG s malym viewBox a width:100% se na desktopu roztahne zhruba 4x. Agregace pres txCZK, bez splitu, vyrovnani a presunu. Nazvy udalosti se escapuji.',
      '\u2699 9 testu na osu (vcetne HTML injekce v nazvu udalosti) + 8 na sber kurzu.',
    ]
  },
  {
    verze: 'v9.88',
    datum: '2026-08-19',
    zmeny: [
      '\u{1F41B} FIX-256 (nahlasil Milan): AUTOMATICKE ZALOHY SE NEOTEVIRALY. Modal byl postaveny na tridach class=\"modal\" + .modal-content + .modal-header, ktere v styles.css NEEXISTUJI \u2013 spravna struktura je .overlay > .modal > .modal-head + .modal-body (viz openExportCsvModal). Obsah se proto vykreslil jako bezprizorni ramecek dole na strance Nastaveni misto prekryvu. Opraveno + funkce vyexportovany na window.',
      '\u2699 S19 (Milan): PREPRACOVANE ROZLOZENI MODALU PRIDAT TRANSAKCI. Vyber meny byl v9.86 natlacen do popisku „CASTKA (KC)\", coz rozhodilo sirku poli Castka i Datum. Nyni je z nej samostatne pole „TYP MENY\" vedle Castky a pole DATUM se presunulo NAD Nazev. Popisek Castka si nechava jednotku, pole Typ meny pod sebou vysvetluje, proc zrovna tuhle („Podle penezenky Hotovost euro\" / „Platis v EUR, ucet je v CZK\").',
      '\u2699 Pole Typ meny se u PRESUNU mezi penezenkami skryva cele \u2013 tam menu urcuji obe penezenky a resi to vlastni radek prepoctu.',
    ]
  },
  {
    verze: 'v9.87',
    datum: '2026-08-17',
    zmeny: [
      '\u{1F6E1}\uFE0F TODO-208: AUTOMATICKA DENNI ZALOHA DAT. Aplikace dosud nemela ZADNOU automatickou zalohu \u2013 jen jednorazovy snimek dataBackupV1 pred migraci ADR-062 a rucni JSON export, ktery si uzivatel musi vzpomenout stahnout. U appky s platicimi zakazniky to bylo realne riziko: omylem smazana data, rozbita synchronizace nebo chybny import = nevratna ztrata. Nyni se pri spusteni jednou denne ulozi snimek do users/{uid}/backups/{YYYY-MM-DD}, drzi se poslednich 5, starsi se mazou.',
      '\u2699 Zalohy lezi MIMO users/{uid}/data zamerne \u2013 uzel data ma rozsirene .read pro partnera, se kterym uzivatel sdili finance. Zalohy vidi jen vlastnik a admin. Zapis kaskaduje z users/$uid \u2192 FIREBASE PRAVIDLA SE NEMENI.',
      '\u2699 Snimek se uklada jako JEDEN JSON RETEZEC, ne jako strom: zapis i obnova jsou atomicke (nehrozi pul obnovene zalohy), RTDB si u stromu uctuje rezii za kazdy klic a diff-write si nesplete zalohu s zivymi daty. Nad 6 MB se zaloha preskoci s vyzvou pouzit rucni export. Klice zacinajici podtrzitkem (behove priznaky) se nezalohuji.',
      '\u26A0\uFE0F OBNOVA \u2013 NEJDULEZITEJSI DETAIL: nestaci vynulovat podpisy diff-write. Transakce, ktere v zaloze NEJSOU, by v databazi zustaly (mazani se odvozuje z predchozich podpisu) a pri dalsim nacteni by se VRATILY \u2013 obnova by fungovala jako slouceni. Obnova proto nastavi _dw.ready=false a vynuti PLNY zapis pres _set(), ktery cely uzel nahradi.',
      '\u2699 OBNOVA MA POJISTKU: pred prepsanim se soucasny stav ulozi pod klic „pred-obnovou\", takze omylem spustena obnova neni jednosmerka. Poskozena zaloha (nevalidni JSON) i zaloha bez pole transakci se odmitnou a data zustanou nedotcena.',
      '\u2699 Nastaveni \u2192 Data \u2192 „Automaticke zalohy\": seznam dostupnych zaloh s datem, velikosti a verzi, tlacitko „Zalohovat ted\" a obnova po potvrzeni. Seznam tahá jen METADATA, ne obsah \u2013 jinak by vypis stahoval megabajty.',
      '\u2699 Prazdny ucet se nezalohuje, offline rezim a prohlizeni partnerovych dat zalohu nespusti. 12 testu vcetne rotace, sirotku po obnove a odmitnuti poskozene zalohy.',
      '\u2139\uFE0F TODO-137 (cookie lista GDPR) OVERENO JAKO HOTOVE od v8.44 \u2013 Consent Mode v2 s default denied bezi v app.html i na landing page, prepinac je v Oznameni \u2192 Soukromi, sdileny klic ff_cookie_analytics. Zadna prace nebyla potreba, polozka byla v poznamkach vedena omylem.',
    ]
  },
  {
    verze: 'v9.86',
    datum: '2026-08-17',
    zmeny: [
      '\u2728 TODO-214 (Milan): PREPINAC MENY U TRANSAKCE. Doted se mena zadavani odvozovala vyhradne z penezenky, coz nepokrylo nejbeznejsi zahranicni pripad \u2013 CESKA KARTA, NAKUP V EURECH. Nyni je vedle popisku Castka rozbalovatko men (vychozi = mena penezenky, oznacena „(penezenka)\").',
      '\u2728 TODO-214 \u2013 K CEMU TO JE: uzivatel zaplati 20 EUR, ale banka mu strhne 594 Kc (horsi kurz + poplatek za smenu). Po prepnuti meny se objevi jiz existujici pole „Skutecne v Kc\" predvyplnene kurzem CNB (506 Kc) \u2013 uzivatel ho prepise podle vypisu na 594. Ulozi se amount:20, currency:EUR, amtCZK:594. Aplikace tim ma poprve podklad k tomu, spocitat KOLIK CLOVEKA SMENA STALA NAVIC (rozdil 88 Kc oproti kurzu CNB) a porovnat banku, bankomat a prepazku.',
      '\u2699 TODO-214: nove pole t.currency se uklada JEN kdyz neni CZK \u2013 u korunovych transakci by to byl zbytecny klic u kazdeho zaznamu. Chybi-li, mena se odvodi z penezenky presne jako pred v9.86 \u2192 ZADNA MIGRACE starych dat. Diff-write uklada cely objekt transakce, takze se pole propise samo, a sanitizace zadny whitelist poli nema.',
      '\u2699 TODO-214: u PRESUNU mezi penezenkami se prepis meny NEUPLATNI \u2013 tam menu urcuji obe penezenky a resi to vlastni radek prepoctu. _readTxCzk() nove rozhoduje podle MENY ZADAVANI, ne podle meny penezenky (jinak by ceska karta s nakupem v eurech ulozila 20 misto 594).',
      '\u2728 FILTR MEN v Transakcich (rozsireny filtr). Nabizi JEN meny, ktere se v datech opravdu vyskytuji, a pri jedine mene se skryva uplne \u2013 prazdne rozbalovatko nikomu nepomuze. Doplnen i do tlacitka „Vymazat filtry\" a do klice prekreslovani seznamu (jinak by se pri zmene filtru seznam neobnovil).',
      '\u2699 11 testu vcetne Milanova pripadu 20 EUR ceskou kartou a kontroly, ze prepnuti zpet na menu penezenky prepis zrusi.',
    ]
  },
  {
    verze: 'v9.85',
    datum: '2026-08-17',
    zmeny: [
      '\u2728 TODO-213: EVIDENCE AKTIVITY UZIVATELE. Do teto verze se „Posledni aktivita\" v admin panelu brala z premium.createdAt, tedy z DATA REGISTRACE \u2013 u denne aktivniho uzivatele proto ukazovala mesice stary udaj a slozka cerstvosti ve skore byla vzdy 0/40. Milanuv vlastni ucet mel 60/100, ackoli appku pouziva kazdy den. Nyni se sbira skutecna aktivita.',
      '\u2699 Novy uzel users/{uid}/activity \u2013 ZAMERNE NE v profile: ten ma v pravidlech .read pro kazdeho prihlaseneho (kvuli sdileni jmena a fotky partnerum), takze by na aktivitu videl kdokoli. Pod users/$uid cte jen vlastnik a admin, zapis kaskaduje \u2192 FIREBASE PRAVIDLA SE NEMENI.',
      '\u2699 Sbira se: cas posledniho pouziti, pocet spusteni, znacka aktivniho dne (d/YYYY-MM-DD), verze aplikace pri poslednim pouziti, PWA vs prohlizec, a cas prvni transakce (aktivace). Zapis je skrcen na 1x za hodinu pres localStorage a bezi BEZ await, aby nezdrzoval start. Vlastni try/catch \u2013 telemetrie nesmi shodit prihlaseni.',
      '\u{1F512} GDPR: zadna IP adresa, poloha ani otisk zarizeni \u2013 to by vyzadovalo souhlas. Evidence vlastniho uctu je provoz sluzby. Patri to jednou vetou do zasad ochrany udaju (souvisi s TODO-137).',
      '\u2699 SKORE PREPOCITANO (Milan): objem se nove meri ZA POSLEDNICH 30 DNI, ne za celou historii \u2013 50 transakci od registrace je u dlouhodobeho uzivatele bezvyznamne cislo. Objem 0\u201360 b = aktivni dny za 30 dni (20+ = plny pocet), cerstvost 0\u201340 b = dny od posledniho pouziti. Denni uzivatel ma nyni 100/100.',
      '\u2699 U uctu BEZ evidence (vse pred v9.85) se skore NEUKAZUJE VUBEC a misto nej je vysvetleni proc \u2013 falesna nula je horsi nez zadne cislo. U posledni aktivity je v takovem pripade oznaceno „(jen registrace)\".',
      '\u2728 Nove metriky v detailu uzivatele: aktivnich dni za 30 dni, aktualni serie dni, pocet spusteni celkem, aktivnich dni za 90 dni, verze pri poslednim pouziti (kdo visi na stare cache), PWA vs prohlizec (podklad pro rozhodnuti o TWA a Google Play) a aktivace (za jak dlouho po registraci prisla prvni transakce).',
      '\u2728 Seznam uzivatelu: nove filtry „Aktivni (5+ dni za 30 d)\", „Usinajici (0 dni za 30 d)\", „Bez evidence aktivity\" a razeni „Naposledy aktivni\" / „Nejvic aktivnich dni\".',
      '\u2699 9 testu na metriky vcetne osetreni poskozenych klicu \u2013 „2026-13-99\" projde regularnim vyrazem, ale datum to neni; pridana kontrola pres zpetny prevod na Date.',
    ]
  },
  {
    verze: 'v9.84',
    datum: '2026-08-17',
    zmeny: [
      '\u{1F41B} ZAKLADNI MENA \u2013 2. CAST (109 mist): projects.js 75 + transactions.js 34. Nyni uz zakladni menu respektuje PREDIKCE (cela tabulka po kategoriich i podkategoriich, YTD, Predpoklad YTD, Odhad roku, mesicni matice), MESICNI REPORT (karty Prijmy / Vydaje / Saldo / Zaklad prijmu, vypocet vydajoveho zdravi, srovnani s minulym mesicem), Financni obraz (Cista hodnota, dluhy, likvidita, Momentum), Denik, ctvrtletni a tydenni tabulky, Detektor a bankovni zustatek v Transakcich.',
      '\u2699 OPRAVA PROVEDENA PO JEDNOM, NE PLOSNE. Ze 118 nalezenych fmt() bylo 109 prevedeno na fmtB() a 9 ZAMERNE ponechano: sest popisku v canvas grafech a jeden radek rozpadu men uz prevod delaji samy (fmtB by znamenalo DVOJI PREVOD), tri kompaktni „k\" popisky v SVG dostaly czkToBase() na hodnotu, ale symbol se do nich nevejde.',
      '\u2699 Pridan staticky test smoke_mena.js, ktery tri pasti hlida trvale: (1) zadne fmtB() nad hodnotou po czkToBase(), (2) zadne fmt(x) + „Kc\" u castky na obrazovce, (3) kazde zbyle fmt() musi byt na schvalenem seznamu vyjimek. Bez nej by se stejna chyba vratila pri prvni dalsi uprave.',
      '\u2139\uFE0F ai.js ponechan v korunach zamerne \u2013 tamni „Kc\" jde do promptu pro AI radce, ne na obrazovku.',
      '\u26A0\uFE0F STALE NEOPRAVENO: 20 popisku „(Kc)\" u VSTUPNICH POLI v app.html (rozpocet projektu, jistina a splatka dluhu, cena prani, mesicni vklad, hodnota aktiva, castka sablony). Samotna zmena popisku by zpusobila TICHOU ZTRATU DAT \u2013 hodnoty se ukladaji syrove jako CZK, takze uzivatel by napsal 1000 s myslenkou 1000 EUR a ulozilo by se 1000 Kc. Oprava musi byt dvoudilna: popisek + prevod na OBOU stranach (zadani i nacteni do editace). Ceka na samostatny ukol s testy na round-trip.',
    ]
  },
  {
    verze: 'v9.83',
    datum: '2026-08-17',
    zmeny: [
      '\u{1F41B} ZAKLADNI MENA \u2013 1. CAST: 34 mist v projects.js a debts.js zobrazovalo castky pres fmt() s natvrdo psanym „Kc\", tedy VZDY v korunach bez ohledu na zvolenou zakladni menu. Nejviditelnejsi byl Financni radar \u2013 sekce „Kam smeruju\" (4 sloupce Prijem / Planovany vydej / Budouci platby / Cashflow), veta o zachovani prumeru, Detektor uspor, Navrh limitu, tydenni a mesicni tabulky. Nyni fmtB(), tedy prepocet + spravny symbol.',
      '\u26A0\uFE0F POZOR PRI DALSICH OPRAVACH: tri popisky v canvas grafech (osa Y a body predikce) uz prevod pres czkToBase() delaji SAMY \u2013 nahrada za fmtB() by u nich znamenala DVOJI PREVOD. Doplnen jim proto jen symbol pres curSym(). Kazde fmt() nad penezi je potreba posoudit jednotlive, plosne nahrady jsou nebezpecne.',
      '\u2139\uFE0F ai.js ZAMERNE PONECHANO V KORUNACH \u2013 tamni „Kc\" nejde na obrazovku, ale do promptu pro AI radce. Vnitrni jednotka aplikace je CZK, takze je to spravne a hlavne konzistentni: michat v jednom promptu koruny a zakladni menu by model matlo.',
      '\u{1F41B} FIX-255: PREVODNIK pod polem Castka pocital u PRESUNU mezi penezenkami spatne. _txEntryCur() vraci u presunu natvrdo CZK (zamerne \u2013 aby se skrylo pole „Skutecne v Kc\", ktere u presunu nahrazuje vlastni radek). Prevodnik to ale bral doslova: presun 100 EUR z eurove penezenky pocital jako 100 Kc a hlasil „= 3,95 EUR\" misto „= 2 530 Kc\". Sla o ORIENTACNI cislo pod polem \u2013 ULOZENA DATA BYLA VZDY SPRAVNE, saveTx bere menu z penezenek primo. Prevodnik se navic neobnovoval pri zmene penezenky, doplneno.',
      '\u2699 Popisek CASTKA (KC) v modalu Pridat transakci ZUSTAVA podle meny vybrane penezenky \u2013 rozhodnuti Milana (varianta A). Platis-li z korunoveho uctu, zadavas koruny; zakladni mena je jen jednotka pro souhrny.',
    ]
  },
  {
    verze: 'v9.82',
    datum: '2026-08-17',
    zmeny: [
      '\u{1F41B} FIX-254 (S19 faze C): DETEKTOR USPOR pocital do doporuceni transakce, ktere vydaj vubec nejsou. Filtr byl jen type===expense, takze do nalezu padaly: ROZDELENE transakce (rodic i jeho deti \u2192 jeden nakup ZAPOCITAN DVAKRAT), VYROVNAVACI transakce (umela korekce zustatku vydavana za utratu) a PRESUNY (vlastni penize poslane na sporici ucet vydavane za vydaj). Detektor z techto cisel pocita „usetris X Kc/mes\", takze chyba nesla jen do zobrazeni, ale primo do RAD, ktere ma uzivatel nasledovat.',
      '\u2699 FIX-254 reseno JEDNIM vycistenym zdrojem (detTxs) hned na zacatku funkce, ne sedmi zaplatami na jednotlivych souctech \u2013 dalsi sekce Detektoru uz z nej dedi automaticky. Dotcene sekce: predplatna, bankovni poplatky, pojisteni, telefon a internet, kategorie pres limit, casty nakup, vyplata efekt.',
      '\u2699 FIX-254: vyloučení splitParent je zde PLOSNE (na rozdil od getActual, kde se vyrazuje jen rodic s detmi). Detektor hleda konkretni utraty podle NAZVU \u2013 rodic nese jmeno celeho nakupu, deti jeho rozpad, takze zapocitat oboji by nalez vzdy zdvojilo.',
      '\u{1F41B} FIX-254: „vyplata efekt\" urcoval vyplatu jako nejvetsi prijem porovnanim SUROVYCH castek \u2013 vyplata 1 200 EUR prohrala s bonusem 3 000 Kc. Nyni pres txCZK(). Zaroven se z kandidatu vyradily presuny, aby se vyber ze sporeni nevydaval za vyplatu.',
      '\u2728 PROJEKTY \u2013 CIZI MENA (Milan): karta projektu ukazovala castky pres fmt(), tedy natvrdo v korunach bez ohledu na zvolenou zakladni menu. Nyni fmtB(). Navic pribyl ROZPAD PODLE MEN: u projektu, ktery obsahuje jinou menu nez zakladni, se vypise „z toho v cizi mene: 1 000 EUR \u00b7 300 PLN\". Soucty zustavaji v zakladni mene \u2013 scitat 1 000 EUR a 25 000 Kc do jednoho cisla nedava smysl \u2013 ale uzivatel na dovolene vidi i to, kolik realne utratil na miste.',
      '\u2699 Testy: 5 na Detektor (split se nezdvoji, vyrovnani a presun mimo, vyplata pres txCZK) + 5 na rozpad men (zakladni mena se neopakuje, prijmy zvlast od vydaju, razeni podle velikosti).',
      '\u2139\uFE0F ZJISTENO, NEOPRAVENO: popisek „CASTKA (KC)\" v modalu Pridat transakci ukazuje menu VYBRANE PENEZENKY, ne zakladni menu. Vetev se zakladni menou se pouzije jen kdyz NENI vybrana zadna penezenka \u2013 a od S17.5, kdy se na Milanovo prani zacala predvybirat vychozi penezenka, uz tento pripad prakticky nenastava. Neni to rozbita funkce, ale dusledek S17.5. Ceka na rozhodnuti, ktera mena ma vyhrat.',
    ]
  },
  {
    verze: 'v9.81',
    datum: '2026-08-17',
    zmeny: [
      '\u{1F41B} FIX-252 FAZE A (15 mist v 6 modulech): scitani castek prevedeno na txCZK(). Nejzavaznejsi bylo computeBaseIncome() v projects.js \u2013 ZAKLAD PRIJMU, ktery vstupuje do S1, DTI, DSTI, S3 i S4, tedy do CELEHO skore. Kdo mel prijem v cizi mene, mel cele financni skore pocitane z nominalu (100 EUR = 100 Kc). Dale computeDebtPaid() v debts.js (splatka v cizi mene = spatne rozpocitana jistina i urok), getActualRange(), Detektor uspor (7 mist), rocni souhrny ve Statistikach, bucket „Ostatni\" na dashboardu, kontext pro AI radce a utrata Projektu.',
      '\u2699 FAZE A \u2013 v datech vedenych jen v korunach se NEZMENI NIC. Zmena se projevi pouze tam, kde ma uzivatel transakce v cizi mene, a to smerem nahoru (dosud se scitaly v nominalu).',
      '\u{1F41B} TODO-212 FAZE B: PRESUNY se uz nepocitaji do vydaju kategorie. Drive byl soucet radku po kategoriich VYSSI nez celkovy soucet nad nim na TEZE obrazovce (Souhrn vydaju: celkem pres allExpTxs bez presunu, radky pres getActual s presuny). Stejny rozpor byl mezi Reportem (vylucoval) a Statistikami (zahrnovaly) \u2013 stejna kategorie, stejny mesic, dve ruzna cisla. Nyni sedi.',
      '\u26A0\uFE0F TODO-212 \u2013 FILTR NENI PLOSNY, A TO ZAMERNE. Kategorie sporeni a investic (Investice, Trading, Financni rezerva, Sporeni, Fondy, Penzijko) jsou typu transfer, takze isTransferTx() je true pro KAZDOU jejich transakci. premium.js:1520 (S4 Aktivni sporeni) a projects.js:512 (savingScore ve Zdravi financi) na getActual() nad temito kategoriemi primo stoji. Plosny filtr by jim vratil NULU a poctive sporicimu uzivateli by spadlo Financni skore az o 35 bodu. Pravidlo: pta-li se volajici PRIMO na presunovou kategorii, chce videt, co do ni priteklo \u2192 nefiltruj; pta-li se na vydajovou kategorii \u2192 presun tam nepatri. Rozhoduje se podle ARGUMENTU, ne podle volajiciho, takze zadne ze 37 volani getActual() se nemenilo.',
      '\u2699 Stejne pravidlo doplneno i do getHistAvg(), aby predikce a skutecnost zustaly zrcadlove \u2013 zobrazuji se v UI vedle sebe a sloupec odchylky je odecita od sebe.',
      '\u2699 AUDIT (SKILL 12): prosla vsechna 37 volani getActual() a vsech 20 mist se surovou castkou. Vysledek v AUDIT-FIX252-faze2.md. 35 volani se opravou jen zpresni, 2 vyzadovala vyjimku vyse. Regresni testy: 7 testu na zrcadlo predikce/skutecnost + 7 testu na presuny a skore (vcetne kontroly, ze soucet radku = celkovy soucet).',
      '\u2699 Nalezeno pri auditu, NEOPRAVENO (fáze C): renderDetektor v projects.js na 7 mistech nevylucuje splitParent ani isBalancing \u2013 rozdelene a vyrovnavaci transakce zkresluji doporuceni uspor. Zaslouzi si vlastni pruchod.',
    ]
  },
  {
    verze: 'v9.80',
    datum: '2026-08-17',
    zmeny: [
      '\u{1F41B} FIX-253 (S19.2, nahlasil Milan): PRISTI MESIC \u2013 REZIM „OD VYPLATY K VYPLATE\" POSOUVAL VYPLATU O CELY MESIC. Kotva cyklu se brala z radarPaydayInfo() (medián dne nejvetsiho prijmu / nastaveni firstDay). Kdyz ten den nesedl na skutecnou vyplatu, vyplata z okna VYPADLA a posunula se dopredu: cyklus 9. 9. \u2013 8. 10. a vyplata 5. 9. se zobrazila jako 5. 10. Nyni se kotva odvozuje z PRIJMU, KTERE KARTA SAMA SPOCITALA \u2013 hlavni prijem je vzdy PRVNIM radkem cyklu. radarPaydayInfo() zustava jen jako zaloha, kdyz zadny prijem nelze urcit.',
      '\u2699 Zahlavi nyni rika, cim cyklus zacina („cyklus zacina dnem, kdy chodi Vyplata\"), aby bylo videt, odkud se datum bere. Drobne prijmy s dnem pred vyplatou spadnou spravne az na konec cyklu (napr. 1. 10.) \u2013 presne jak to Milan popsal.',
      '\u2728 S19.2 (Milan): VLASTNI ZAPIS PRIJMU A VYDAJU. Tlacitko „Pridat vlastni prijem / vydaj\" pod obema tabulkami. Historie ani sablony nepokryji vratku dani, jednorazovou zakazku nebo planovaneho zubare \u2013 uzivatel to vi, appka ne. Vlastni radky jsou zelene (jiste), plati jen pro dany mesic a maji vlastni tlacitko smazani.',
      '\u2699 S19.2 (Milan): PRAH JISTOTY SNIZEN z stabilityWeight >= 0,7 na >= 0,5. Pri 0,7 padal pasivni prijem (pronajem, dividendy, vychozi vaha 0,7) na hranu a nepravidelny (0,4) uplne mimo plan. Pri 0,5 se pasivni prijem spolehlive pocita mezi pravdepodobne.',
      '\u2699 S19.2: polozka „Pristi mesic\" presunuta na PRVNI misto ve skupine Planovani \u2013 je zdarma a pro noveho uzivatele srozumitelnejsi nez Radar.',
      '\u2699 S19.2: kdyz odhad beznych vydaju vyjde na NULU, karta nove vysvetli proc (zname platby prevysily celou predikci) misto holeho „0 Kc\", ktere vypadalo jako chyba.',
      '\u{1F41B} FIX-252 (S19.2, KRITICKY \u2013 tyka se CELEHO predikcniho enginu, ne jen nove karty): helpers.js getHistAvg() \u2013 zaklad predictCat() \u2013 scital castky pres `t.amt` misto txCZK(t,D) a nefiltroval rozdelene ani vyrovnavaci transakce. DUSLEDEK: (1) vydaje v cizi mene se scitaly v NOMINALU (100 EUR = 100 Kc), takze predikce u takovych kategorii vychazela mnohonasobne nizko; (2) rozdelena transakce se pocitala DVAKRAT (rodic i deti), coz naopak nadhodnocovalo.',
      '\u2699 FIX-252 \u2013 AUDIT DLE SKILL 12: getHistAvg() ma jedineho volajiciho (predictCat), ten ma 7 spotrebitelu \u2013 Predikce, Souhrn vydaju, Financni obraz, Radar, Denik (snimek presnosti), Report a nove Pristi mesic. Filtr byl srovnan PRESNE s getActual(), protoze obe funkce se v UI zobrazuji VEDLE SEBE jako „odhad vs. skutecnost\" \u2013 rozdilny filtr znamenal, ze sloupec odchylky porovnaval jina cisla. Split se vyrazuje stejne jako tam: jen RODIC, ktery ma deti (FIX-119), plosne !t.splitParent by zahodilo i rodice bez deti. Opraven i fallback vetev predictCat(), ktera mela stejnou vadu.',
      '\u2699 FIX-252 \u2013 CO SE ZAMERNE NEMENILO: isTransferTx() se nefiltruje ani v getHistAvg(), ani v getActual(). Pridat ho jen na jednu stranu by vyrobilo NOVY nesoulad mezi odhadem a skutecnosti. Presuny uvnitr kategorii typu „both\" (Pujcka, Financni urad) resi TODO-212 pro OBE funkce najednou \u2013 getActual() ma ~40 spotrebitelu a zaslouzi si vlastni audit.',
      '\u26A0\uFE0F POZOR NA CISLA: po FIX-252 se predikce vydaju v cele aplikaci ZMENI \u2013 nahoru u kategorii s vydaji v cizi mene, dolu tam, kde se pouzivaly rozdelene transakce. Neni to regrese, je to naprava.',
    ]
  },
  {
    verze: 'v9.79',
    datum: '2026-08-17',
    zmeny: [
      '\u2728 TODO-211 (S19.1, zadala Milanova zena): NOVA KARTA „PRISTI MESIC\" (Planovani \u2192 Pristi mesic, tarif FREE). Odpovida na otazku, kterou appka dosud neumela: „vyjdu do 15., nez prijde vyplata?\" Dve tabulky s konkretnimi daty (Prijmy, Vydaje) a pod nimi PRUBEZNY ZUSTATEK den po dni. Novy samostatny modul js/pristi.js (38. modul), horizont zamerne JEN pristi mesic \u2013 delsi vyhled resi „Kam smeruju\".',
      '\u2728 PREDIKCE PRIJMU \u2013 dosud v aplikaci vubec nebyla (predictCat umi natvrdo jen vydaje, budouci.js prijmove sablony preskakuje). Prijmy se nyni beru ze dvou zdroju: opakovanych sablon typu Prijem (presne datum) a z historie prijmovych kategorii za 6 mesicu.',
      '\u2728 TRI UROVNE JISTOTY: zelena = sablona nebo splatka s datem \u00b7 zluta = pravidelny prijem podle historie (stabilityWeight >= 0,7, ADR-044) \u00b7 bila = nepravidelny prijem. NEJISTE PRIJMY SE DO PLANU NEPOCITAJI \u2013 zobrazuji se zvlast s poznamkou „kdyby vsechno vyslo\". Bez toho by matka na materske videla optimisticky prumer vcetne lonske brigady.',
      '\u2728 RUCNI UPRAVA KTEREHOKOLI RADKU: tlacitko upravit prepise castku, krizek radek z vypoctu vyradi. Uzivatel casto vi vic nez historie („pristi mesic brigada nebude\"). Ulozeno v S.pristiCfg podle mesice, synchronizuje se mezi zarizenimi. Tlacitko „Zrusit rucni upravy\" vrati vse zpet na automaticky odhad.',
      '\u2728 PREPINAC KALENDARNI MESIC / OD VYPLATY K VYPLATE \u2013 kalendarni mesic a financni cyklus nejsou totez. Den vyplaty se NEPOCITA ZNOVU, prebira se z radarPaydayInfo() ve Financnim obrazu (SKILL 17).',
      '\u2699 OSETRENO DVOJI POCITANI (nejvetsi riziko cele funkce): dopocet prijmu z historie se snizuje o castku, kterou uz pokryva sablona; odhad beznych vydaju = predikce vsech kategorii MINUS zname platby s datem \u2013 jinak by najem a splatka vesly do souctu dvakrat. Oba vzorce jsou uzivateli primo vypsane pod tabulkou, ne schovane.',
      '\u2699 Spoření a presuny mezi penezenkami maji vlastni kartu a do „zbude odhadem\" se NEPOCITAJI \u2013 penize neodchazi, jen se presouvaji. Agregace pouzivaji txCZK() a vylucuji splitParent / isBalancing / isTransferTx (SKILL 20).',
      '\u2699 KALIBRACE: kdyz se prepne na jiz probehly mesic, karta ukaze odhad vedle skutecnosti a odchylku v procentech \u2013 uzivatel sam pozna, jestli se na predikci da spolehnout.',
      '\u2699 ROLLBACK: v js/pristi.js je na prvnim radku prepinac PRISTI_ENABLED. Nastavenim na false zmizi polozka v menu i obsah stranky, nic dalsiho se mazat nemusi. Uplne odstraneni je popsane v patch-session19.md.',
      '\u2699 Novy uzel users/{uid}/data/pristiCfg registrovan na vsech 4 mistech v app.js (_DW_META, _dwMetaVals, oba snapshoty) \u2013 bez toho by se TICHE nesynchronizoval. Firebase pravidla netreba, kaskada .write z users/$uid ho kryje. 44 runtime smoke testu (oba rezimy, prazdna i plna data, prelom roku, minuly mesic, prohlizeni partnera) + kontrola TDZ.',
    ]
  },
  {
    verze: 'v9.78',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.36 (Milan): RADAR \u2013 PROJEKCE KONCE MESICE nyni RIKA, CO V NI NENI. Projekce vychazi z DENNIHO TEMPA bezne utraty a zamerne neobsahuje zname jednorazove platby (najem, pojistka, splatka). U velkych castek splatnych na konci mesice to vedlo k cislu, ktere vypadalo optimisticky: „zbude ti 5 673\" a pritom za dva dny odesla splatka 46 952. Podtitulek proto nove uvadi „bez znamych plateb X \u2014 s nimi Y\".',
      '\u2699 ODPOVED NA MILANUV DOTAZ: „Planovany vydej\" v Radaru = skutecnost + odhad z DENNIHO TEMPA, NE z predikcni tabulky. Predikcni engine (predictCat, sezonnost) pouziva az „Kam smeruju\" ve Financnim obrazu (v8.83). Dve sekce stejneho nazvu, dva ruzne vzorce \u2013 nesoulad je znamy od v8.86 (TODO-176).',
    ]
  },
  {
    verze: 'v9.77',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-251 (S18.35, nahlasil Milan): HODNOCENI SLO ODESLAT, ALE NEBYLA ZADNA ODEZVA. Pricina: volal jsem funkci toast(), ktera v aplikaci NEEXISTUJE \u2013 spravne se jmenuje showToast(). Zadna hlaska se proto nezobrazila ani pri uspechu, ani pri chybe. Opraveno na vsech mistech (i v Zivotni mape, kde byla stejna chyba).',
      '\u2728 Potvrzeni „\u2705 Ulozeno\" se nyni ukaze PRIMO V OKNE a teprve pak se okno zavre \u2013 toast se da prehlednout. Pri chybe se v okne zobrazi duvod, vcetne upozorneni na chybejici opravneni (typicky kdyz nejsou nasazena Firebase pravidla pro uzel reviews).',
      '\u{1F41B} FIX-250: RADAR \u2013 „PLANOVANY VYDEJ\" U BUDOUCICH MESICU HLASIL NULU. Pocital se jako skutecnost + odhad zbytku mesice, jenze u budouciho mesice jeste zadna skutecnost neni a odhad se pocita vyhradne pro aktualni mesic \u2013 obe slozky tedy nula. Nyni se u budouciho mesice pouzije prumerna mesicni utrata (stejny zdroj, ze ktereho pocita i predikce nize).',
    ]
  },
  {
    verze: 'v9.76',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-248 (S18.34, nahlasil Milan): RADAR \u2013 „BUDOUCI PLATBY\" PORAD NULA. Oprava FIX-247 problem jen POSUNULA: horizont v budouciGetAll(D, 30) byl natvrdo 30 DNI, takze zari (do 30 dnu) fungovalo, ale rijen uz ne \u2013 do te doby proste zadne platby nedosahly. Nyni se horizont dopocitava az ke KONCI ZVOLENEHO MESICE (strop 400 dni).',
      '\u{1F41B} FIX-249 (nahlasil Milan): MODAL HODNOCENI SE ZOBRAZOVAL MIMO OBRAZOVKU. Generoval jsem ho v JS s tridami modal / modal-content / modal-header, jenze aplikace pouziva overlay / modal / modal-head \u2013 moje tridy nemely zadne centrovaci styly. Modal je nyni STATICKY v app.html podle stejneho vzoru jako Privacy a Terms: vycentrovany, s tlacitky Ulozit a Zavrit i krizkem.',
      '\u2699 POUCENI: pred psanim UI je treba overit SKUTECNE nazvy trid a UMISTENI tlacitka v app.html. Tvrdil jsem, ze polozka „Ohodnotit aplikaci\" je v Nastaveni \u2013 ve skutecnosti je v sekci O aplikaci (page-oAplikaci).',
    ]
  },
  {
    verze: 'v9.75',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 TODO-210 (S18.33, Milan): RECENZE PRIMO V APLIKACI. Dosud tam byla jen hlaska „az budeme na Google Play\" \u2013 zpetna vazba od PRVNICH uzivatelu je pritom nejcennejsi prave ted a cekat na Play Store znamena o ni prijit. Uzivatel v Nastaveni \u2192 Ohodnotit aplikaci vybere 1\u20135 hvezdicek a muze pripsat text. Recenzi lze kdykoli upravit \u2013 nacte se ta predchozi.',
      '\u2728 SOUHRN HODNOCENI (prumer + pocet) se zobrazuje v modalu i jako podtitulek polozky v Nastaveni. TEXTY recenzi vidi POUZE ADMIN \u2013 verejne je jen souhrn, coz je uzivateli primo receno, aby vedel, co se s jeho zpetnou vazbou deje.',
      '\u2728 ADMIN PANEL: nova zalozka \u2b50 Recenze s prumerem, rozlozenim hvezdicek 5\u20131 a seznamem vsech recenzi vcetne data a verze aplikace, ve ktere byly napsany.',
      '\u2699 NOVY UZEL reviews/{uid} je MIMO users/{uid}, takze kaskada .write neplati a PRAVIDLA JSOU NUTNA (pouceni FIX-220). Zapis smi pouze vlastnik na svoje uid, hvezdicky jsou validovane na rozsah 1\u20135, text na 600 znaku a jine klice nez ocekavane se odmitaji. NUTNO NASADIT database_rules.json do Firebase Console.',
      '\u2699 Kontrolni skript pri praci zachytil dve volani neexistujicich funkci (APP_VERSION, renderSettings) \u2013 nahrazeny skutecnymi zdroji. 9 runtime testu.',
      '\u2699 Az bude aplikace na Google Play, funkce openPlayStoreReview() posle uzivatele i tam \u2013 hodnoceni v aplikaci se tim neznehodnoti, jen se zopakuje.',
    ]
  },
  {
    verze: 'v9.74',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-247 (S18.32, nahlasil Milan): FINANCNI RADAR \u2013 „KAM SMERUJU\" HLASILO NULU U BUDOUCICH PLATEB, zatimco karta „Nadchazejici platby\" na TEZE OBRAZOVCE ukazovala 66 902 Kc ze stejnych dat. Pricina: podminka `isCurrentMonth ? budItems : []` vynulovala platby u JAKEHOKOLI jineho mesice. U minuleho mesice je to spravne (nic uz nezbyva), ale u BUDOUCIHO jeste neprobehlo nic \u2013 ma se ukazat cely plan mesice. Nyni: minuly = 0, aktualni = od dneska do konce mesice, budouci = cely plan daneho mesice. Popisek u sloupce se meni ze „zbyva\" na „plan\" podle toho, ktery mesic je zvoleny.',
      '\u2699 Pri oprave zvetseno pismo popisku z .58rem na .66rem (navazuje na audit citelnosti z v9.72).',
    ]
  },
  {
    verze: 'v9.73',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-246 (S18.31, nahlasil Milan): BUBLINOVE GRAFY PRETEKALY MIMO PLOCHU. Rezim Cluster si bounding box hlidal, ale Drill L1/L2/L3 a Gradient mely viewBox natvrdo „0 0 W H\" \u2013 cokoli u okraje se orizlo. Novy sdileny helper bViewBox() dopocita viewBox podle SKUTECNEHO obsahu, takze se graf vejde vzdy. Zaroven lepsi vyuziti plochy: vyska 300 \u2192 380 px u L1, 300 \u2192 360 u L2, 280 \u2192 340 u L3 a pozice bublin posunuty bliz okrajum (driv se mackaly uprostred).',
      '\u{1F3A8} DENIK \u2013 ZIVOTNI MAPA: necitelne pismo. Tmave hnede odstiny (#6b5741, #8a6a3e) na tmavem podkladu prosvetleny, nadpisy udalosti a etap dostaly svetlou barvu, tlacitko „+ Etapa\" ma podklad.',
      '\u2699 Kontrolni skript pri praci zachytil, ze promenna _pts nebyla deklarovana ve dvou ze ctyr bublinovych funkci \u2013 doplneno pred nasazenim.',
    ]
  },
  {
    verze: 'v9.72',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-245 (S18.30, nahlasil Milan): TABULKA „MESIC PO MESICI\" ROZHOZENA U SUMARU \u2013 hodnoty se naskladaly pod sebe vpravo. MOJE CHYBA z v9.71: pri generovani kodu se do CSS zapsal DOSLOVNY Python retezec misto hodnoty, takze grid-template-columns bylo nevalidni a prohlizec pouzil vychozi jednosloupcove rozlozeni. Opraveno na 3 mistech.',
      '\u{1F50D} AUDIT NECITELNEHO PISMA ve Financnim obrazu a Mesicnim reportu (navazuje na audit typografie S16): vsechny vyskyty var(--text3) na tmavem podkladu prepsany na svetlejsi #a8aec8 a pismo pod .66rem zvetseno. V obrazu slo o 42 mist s text3 a 22 mist s malym pismem.',
      '\u2728 LIFESTYLE TABULKA ma nyni skutecne oramovani, zvyraznenou hlavicku a podnadpisy „(1. polovina)\" / „(2. polovina)\", aby bylo jasne, co je baseline. Driv to byl holy vypis bez linek.',
      '\u2728 TRAJEKTORIE DLUHU: vpravo bylo prazdne misto \u2013 doplneny klicove hodnoty (stav dnes, \u00d8 splatka za mesic, stav na konci obdobi a kolik procent bude splaceno), aby uzivatel nemusel odecitat z osy.',
      '\u2728 GRAF VYVOJE SKORE ma popisky osy X (zkratky mesicu) \u2013 bez nich neslo poznat, ktery sloupec je ktery mesic. Popisek u Momentum Score zmensen, aby nepretlacoval hlavni cislo.',
      '\u2728 MESICNI REPORT PRI 2\u201312M OKNU nyni KUMULUJE i v blocich 11\u201314: ucteny se scitaji za cele obdobi (nadpis se meni na „Z uctenek N mesicu\"), milniky se sbiraji ze vsech mesicu okna a hodnoceni utrat se agreguje vazenym prumerem. Driv tyto bloky ukazovaly data JEDINEHO mesice uvnitr sekce nadepsane „6 mesicu\".',
      '\u2728 VYHLED ma novy radek SKUTECNE SALDO za zvolene obdobi \u2013 aby slo porovnat odhad s tim, co se opravdu stalo.',
    ]
  },
  {
    verze: 'v9.71',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-243 (S18.29, nahlasil Milan): TABULKA „MESIC PO MESICI\" BYLA ROZHOZENA. Radky se 7 sloupci, ale sumare (\u03a3, \u00d8/mes, Trend) mely jen 5 \u2013 sloupce se rozjely a chybely souhrny za Exp. Ratio a Skore. Nyni maji vsechny radky stejnou mrizku a doplneny jsou i chybejici souhrny.',
      '\u{1F41B} FIX-244: TABULKA „OD VYPLATY K VYPLATE\" nemela soucty. Posledni radek slucoval sloupce Vydaje/\u0394/Saldo pres colspan=3, takze zadny z nich nemel souhrn. Nyni ma kazdy sloupec svuj prumer a pribyl radek \u03a3 CELKEM.',
      '\u2728 NEZAVISLOST A STABILITA prepracovana dle modelu: vetsi nadpisy, velka barevna hodnota, kazda metrika ma podmetriku s vysvetlivkou „Co to je\". LIKVIDITA je nyni SAMOSTATNA KARTA (driv byla schovana uvnitr FFR, prestoze je to vlastni metrika) a DIVERZIFIKACE PRIJMU dostala plnohodnotnou kartu s Koncentracnim rizikem.',
      '\u2728 MAJETEK: Wealth Momentum presunut DOLEVA (driv byl vpravo), oba nadpisy zvetseny, hodnoty obarveny a doplneny vysvetlivky \u2013 vcetne rozdilu mezi TOKEM (Wealth Momentum) a STAVEM (Ciste jmeni), coz se snadno zamenuje. Wealth Momentum ma nove podmetriku Stalost (kolik mesicu bylo kladnych).',
      '\u2728 LIFESTYLE: tabulka ukazatelu zuzena na 560 px (driv se roztahovala pres cele okno a spatne se cetla). Karta „Kam rust pristal\" se nyni zobrazi VZDY \u2013 kdyz vydaje nevzrostly, rekne „0 Kc \u2013 vydaje klesly\" misto aby zmizela bez vysvetleni.',
    ]
  },
  {
    verze: 'v9.70',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.28 (Milanovy vytky): FINANCNI OBRAZ DOTAZEN DO PODOBY MODELU v2. Vysvetlivky „Co to je\" jsou nyni ROZBALENE u vsech karet \u2013 smyslem podmetrik je, aby jim uzivatel rozumel bez klikani.',
      '\u2728 CESTA FINANCNIHO ZDRAVI: modry graf vyvoje presunut NAD vodopad, Monthly Score i Momentum Score maji plne popisky vcetne „tento mesic vs baseline\" / „trend N mesicu\" a vysvetlivek. Momentum ma DYNAMICKE slovni hodnoceni (stabilni rust / rust s vykyvy / pokles), ktere se pocita z poctu mesicu smerujicich nahoru \u2013 neni to plochy text. Vodopad zuzen na 420 px a bary zvyseny na 20 px, aby vynikly.',
      '\u2728 HLAVNI METRIKY: vetsi nadpisy podmetrik, KAZDE CISLO MA BARVU podle toho, jestli je vyvoj prizniv, a hodnota podmetriky ma barvu sve karty (driv byla vzdy bila, takze barevny pruh vlevo nedaval smysl). Vetsi mezera pod hlavnim cislem.',
      '\u2699 VYSVETLENA SIPKA U MOMENTA (Milanuv dotaz): hodnota je PRUMER za okno, ale sipka ukazuje TREND (posledni polovina vs. predchozi). Kladne momentum s klesajici sipkou tedy neni chyba \u2013 porad ti pribyva, ale pomaleji nez driv. Karta to nyni rovnou rika.',
      '\u2728 LIFESTYLE DOPLNEN o TABULKU UKAZATELU (baseline vs. aktualni: prijmy, vydaje, Expense Ratio, uspora, Income Capture), karty KAM RUST PRISTAL a REALNY RUST PRIJMU (ocisteny o osobni inflaci z uctenek) a kartu REZERVA VYDRZI s dopadem zivotniho stylu. Vse bylo v modelu, v aplikaci to chybelo.',
      '\u2728 MAJETEK: Wealth Momentum presunut doleva, Ciste jmeni doplneno o vysvetlivku vcetne rozdilu tok vs. stav. Tabulka „Mesic po mesici\" ma citelnejsi rozlozeni sloupcu a pod ni pribyla mezera pred sekci 8.',
      '\u2699 Kontrolni skript pri praci odhalil, ze karta Realny rust volala computePersonalInflation() \u2013 funkci, ktera NEEXISTUJE. Prepsano na skutecne _inflCollect() a _inflCompute() z inflace.js.',
    ]
  },
  {
    verze: 'v9.69',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.27 (Milan): FINANCNI OBRAZ PREUSPORADAN dle modelu v2 do DEVITI OCISLOVANYCH SEKCI: 1 Cesta financniho zdravi \u00b7 2 Hlavni metriky a podmetriky \u00b7 3 Kam smeruju \u00b7 4 Pokrocile metriky (Lifestyle) \u00b7 5 Nezavislost a stabilita \u00b7 6 Majetek \u00b7 7 Mesic po mesici \u00b7 8 Od vyplaty k vyplate \u00b7 9 Usly zisk. NIC SE NEMAZALO \u2013 zmenilo se poradi a pribyla cisla, takze se v sekci da orientovat a odkazovat na ni.',
      '\u2728 DOPLNENY MONTHLY SCORE a MOMENTUM SCORE se sloupcovym grafem \u2013 v modelu byly, v aplikaci chybely. Monthly rekne, jak dopadlo posledni obdobi proti prumeru okna; Momentum meri SMER A STALOST pohybu, ne uroven (vysoke momentum pri nizkem skore = rychle se zlepsujes, nizke pri vysokem = drzis si dobrou pozici).',
      '\u2728 Sekce 5 a 6 maji karty VEDLE SEBE (dva sloupce na mobilu i na PC) misto pod sebou \u2013 velke prehledne karty, jak si Milan pral.',
      '\u2728 Tabulka „Mesic po mesici\" rozsirena o sloupce EXP. RATIO (vydaje \u00f7 prijmy) a SKORE \u2013 obe cisla dosud zila jen v kartach vyse, takze v prehledu po mesicich chybela.',
      '\u{1F4F1} MOBIL: v karte „Usly zisk\" castka „Rocne ti utika\" ulitavala mimo obraz. Nyni ma vlastni podklad, prizpusobuje velikost sirce displeje a nezalamuje se.',
    ]
  },
  {
    verze: 'v9.68',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-242 (S18.26, nahlasil Milan): V SOUHRNU VYDAJU SVITILO „+null%\". Dusledek FIX-238 z v9.65 \u2013 kategorie bez vydaje v minulem mesici ma pct null a dlazdice ho vypisovala primo. Nyni se misto procent ukaze „nove\" a popisek rekne „minuly mesic nic\" (procenta z nuly spocitat nejde).',
      '\u{1F4F1} MOBIL: tabulka Souhrn vydaju se rozlitavala a byla necitelna \u2013 sest sloupcu se na uzky displej nevejde. Nyni ma VODOROVNY POSUVNIK a prvni sloupec (kategorie) je PRILEPENY (sticky), takze pri posouvani je porad videt, o kterou kategorii jde.',
      '\u2728 9 \u00b7 VYVOJ FINANCNIHO SKORE: vysledne cislo zvetseno na 3rem a dostalo vlastni sloupec, popisky presunuty do RADKU vedle nej (Stav / vs. minuly mesic / Do znamky). Hodnoty slozek ZAROVNANY do pevnych sloupcu, aby se necislovaly podle delky nazvu, a odznaky zmeny maji jednotku \u2013 misto „\u221239\" je „\u221239 b\".',
      '\u2699 Odstranen duplicitni popisek osy pod kartou \u2013 pri jednom mesici zadny graf s osou neni, takze veta o ose byla matouci. Zobrazuje se uz jen u 3M/6M/12M.',
    ]
  },
  {
    verze: 'v9.67',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F6D1} FIX-241 (S18.25, nahlasil Milan): MESICNI REPORT SE NEOTEVREL \u2013 „ReferenceError: fs is not defined\". Promenna `fs` (skore z Dashboardu) je deklarovana uvnitr smycky, ktera plni pole months; v mist\u011b pouziti uz je mimo dosah. Nyni se skore aktualniho mesice vyzada znovu vlastnim volanim.',
      '\u{1F527} KONTROLNI SKRIPT PREPSAN NA SKUTECNY PARSER (acorn). Predchozi verze byly regexove a POSTUPNE PROPUSTILY TRI CHYBY: v1 kontrolovala jen nazvy s podtrzitkem (propustila `months`), v2 neznala BLOKOVY SCOPE \u2013 `const fs` uvnitr try{} v jinem bloku povazovala za platnou deklaraci pro celou funkci (propustila `fs`). Regexy na tuhle tridu chyb nestaci. Nova verze parsuje kod, sestavuje skutecne scope a hlida dve veci: pouziti pred deklaraci v tomtez scope A identifikatory, ktere nejsou deklarovane nikde (vcetne globalu z ostatnich souboru a inline skriptu v app.html). Overeno, ze obe historicke chyby najde.',
      '\u2728 SOUHRN VYDAJU V REPORTU: serazeno od nejvetsi letosni utraty, radky PODBARVENE podle zavaznosti zmeny (cervena nad 30 %, zluta nad 5 %, zelena pri poklesu) a drobne polozky (pod 3 % vydaju bez vyrazneho pohybu) SBALENE pod tlacitko „Zobrazit dalsich N kategorii\".',
      '\u2699 Zalozka „Souhrn vydaju\" v BETA sekci ZUSTAVA BEZE ZMENY \u2013 rezim se predava volitelnym parametrem, bez nej se funkce chova presne jako dosud. Obe obrazovky sdili jednu funkci, takze zadna duplicita nevznikla.',
    ]
  },
  {
    verze: 'v9.66',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-240 (S18.24, nahlasil Milan): ADMIN \u2013 STATISTIKY MAPOVANI hlasily „txs.forEach is not a function\". Od diff-write (ADR-062) jsou transakce ve Firebase ulozene jako OBJEKT {id: tx}, ne pole \u2013 .forEach na objektu neexistuje. Opraveno na obou mistech (Low confidence i Statistiky mapovani) normalizaci pres Object.values().',
      '\u2728 9 \u00b7 VYVOJ FINANCNIHO SKORE prekresleno do podoby SKORE KARET z preview: celkove skore, kolik bodu chybi do lepsi znamky, a ROZPAD NA VSECH PET SLOZEK (Cash flow, Zadluzenost, Rezerva, Sporeni, Rozpocet) s pruhy a ODZNAKY ZMENY proti minulemu mesici. Stav rekne, jak jsi na tom; zmena rekne, co jsi tenhle mesic udelal.',
      '\u2728 11 \u00b7 Z UCTENEK prekresleno na radkovy vizual dle preview a doplnen radek \u{1F49A} USETRENO NA SLEVACH vcetne podilu z nakupu. Sleva se cte z pole discount, pripadne z rozdilu puvodni a akcni ceny.',
      '\u2728 7 \u00b7 USPOROVE ZDRAVI ma nyni kruhovy ukazatel, slovni hodnoceni a konkretni vetu „ze Zakladu prijmu X jsi odlozil Y %\". Doplneno upozorneni, ze metrika meri TOK (kolik jsi odlozil tento mesic), ne STAV (kolik uz mas) \u2013 to je Rezerva.',
      '\u2699 Pri uprave odhaleno, ze savedRate je uz v PROCENTECH (ne podil), takze puvodni prepocet *100 by ukazoval stonasobek.',
    ]
  },
  {
    verze: 'v9.65',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-238 (S18.23, nahlasil Milan): VYDAJ 20 000 Kc ZA JIDLO SE NEPROPSAL DO „CO SE NEPOVEDLO\". Pricina v ui.js: podminka `if(!cur&&!prev||!prev)return;` vyhodila KAZDOU kategorii, ktera minuly mesic nemela vydaj \u2013 tedy i tu s nejvetsim narustem vubec. Nyni: bez lonske zakladny nejde spocitat procenta, ale castka je platna, takze kategorie propadne do „co se nepovedlo\" s oznacenim „nove\".',
      '\u{1F41B} FIX-239: SLOUPEC ZMENA ukazoval u novych kategorii jen pomlcku. Nyni zobrazi CASTKU (+20 000) s vysvetlenim v tooltipu. Barvy nove podle VELIKOSTI zmeny, ne jen znamenka: zelena = pokles, modra = beze zmeny (\u00b15 %), zluta = mirny rust, cervena = rust nad 30 %.',
      '\u2699 Cela karta „co se povedlo/nepovedlo\" se driv TISE SCHOVALA, kdyz chybel minuly mesic. Nyni se zobrazi jako „Prehled mesice\" bez procent \u2013 data aktualniho mesice jsou platna i bez srovnani.',
      '\u2728 BLOKY 11 (Z uctenek) a 12 (Milniky) se nyni zobrazi VZDY. Driv pri absenci dat zmizely bez hlasky, coz vypada jako chyba a uzivatel netusi, ze mu neco unika. Prazdny stav vysvetli, co by blok prinesl, a nabidne odkaz (SKILL 22).',
      '\u2728 9 \u00b7 VYVOJ FINANCNIHO SKORE prekreslen dle preview: pri jednom mesici uz neni osamocene cislo, ale skore s barevnym pruhem, znamkou a informaci, kolik bodu chybi do lepsi znamky.',
      '\u2699 Kontrolni skript rozpoznava parametry callbacku (.map((cat,i)=>\u2026)) \u2013 hlasil je jako pouziti pred deklaraci.',
    ]
  },
  {
    verze: 'v9.64',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.22 (Milanovy vytky k v9.62): MESICNI REPORT PRESKLADAN A DOTAZEN DO PODOBY PREVIEW. Nove SOUVISLE CISLOVANI 1\u201314 bez der \u2013 driv chybely body 7 a 9, protoze sekce „Bankovni hodnoceni\" zije v renderDTISection (presunuta do Pujcek) a „Z uctenek\" se zobrazi jen kdyz jsou v mesici uctenky.',
      '\u2728 NOVY BLOK „4 \u00b7 Co se nejvic zmenilo vs. minuly mesic\" \u2013 pet kategorii s nejvetsim pohybem v obou smerech, castky zarovnane pod sebou, zmeny pod 100 Kc se neukazuji. Podle preview je to nejakcnejsi blok celeho reportu: uzivatele nezajima tabulka 18 kategorii, zajima ho pet radku, ktere se pohnuly.',
      '\u2728 SOUHRN VYDAJU PRESUNUT VYS (sekce 5) vcetne „co se povedlo / co se nepovedlo\" \u2013 driv byl az uplne dole a tvoril duplicitu s Rozpoctovym zdravim. Vykresluje se do noveho kontejneru reportSouhrnInline uvnitr sablony reportu.',
      '\u2728 KPI KARTY maji nyni DETAILNI POPISKY: misto holeho „min. 70 000\" a „\u219391 %\" je uvedeno, PROTI CEMU se porovnava („\u21938 % vs cervenec\"). Saldo dostalo popisek „zustalo ti\" / „utratil jsi vic, nez prislo\".',
      '\u2728 STAV BOHATSTVI prekreslen na TRI SAMOSTATNE KARTY s barevnym pruhem (drive plochy radek). STALO TO ZA TO doplneno o „Ohodnoceno vydaju\", tabulku nejhur hodnocenych s hvezdickami a vysvetleni, ze appka nikdy neoznaci utratu za zbytecnou sama. MILNIKY maji popisek + odkaz do Zivotni mapy v Deniku. VYHLED je pod sebou, s jednotkami a nove i s OCEKAVANYM SALDEM.',
      '\u2728 CELKOVE FINANCNI ZDRAVI ma pod kruhem SROVNAVACI TABULKU (vs minuly mesic, vs prumer 6 mesicu, nejlepsi mesic dosud) \u2013 „byl to dobry mesic?\" se z jednoho cisla bez kontextu odpovedet neda.',
      '\u2699 Kontrolni skript doladen: pomlcka pred identifikatorem uz nehlasi CSS vlastnosti typu box-shadow jako pouziti promenne.',
    ]
  },
  {
    verze: 'v9.63',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F6D1} FIX-237 (S18.21, nahlasil Milan): MESICNI REPORT SE NEOTEVREL \u2013 „ReferenceError: months is not defined\". V novych blocich z v9.62 jsem pouzil promennou `months`, ale ta se v renderReport() jmenuje `nMonths`; `months` se sice deklaruje take, ale az o 280 radku niz uvnitr setTimeout. Opraveno na 3 mistech.',
      '\u2699 KONTROLNI SKRIPT PREPSAN (v2). Prvni verze z v9.59 kontrolovala JEN identifikatory zacinajici podtrzitkem \u2013 proto zachytila _ffrD i _s1pts, ale `months` propustila. Nyni kontroluje VSECHNY lokalni const/let/var delsi nez 2 znaky a umi rozlisit skutecny kod od textu v retezcich, HTML atributech a koncovych komentarich (bez toho hlasil 18 falesnych poplachu a byl by k nicemu). Overeno oboustranne: na cistem kodu mlci, po umelem vraceni chyby ji najde.',
    ]
  },
  {
    verze: 'v9.62',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 TODO-209 (S18.20, Milan): MESICNI REPORT v2 \u2013 SEST NOVYCH BLOKU dle odsouhlaseneho preview. 2b \u00b7 Na co si dat pozor, 8 \u00b7 Stav bohatstvi, 9 \u00b7 Z uctenek, 10 \u00b7 Milniky obdobi, 11 \u00b7 Vyhled na dalsi mesic, 12 \u00b7 Stalo to za to? \u2013 vysledky.',
      '\u26A0 „NA CO SI DAT POZOR\" \u2013 pravidla se lisi podle delky okna. Pri 1 mesici: vzrostlo o vic nez 25 % A ZAROVEN o 500 Kc, nebo prekrocen limit. Pri vice mesicich uz jedna delta nedava smysl, proto FREKVENCE A TREND: „limit prekrocen ve 3 ze 3 mesicu\", „rostla 3 mesice v rade\", „mesic nad 2x vlastni median\". Absolutni prah je tam schvalne \u2013 bez nej by se sem kazdy mesic dostalo deset radku typu „postovne +40 %\" a uzivatel by si blok odnaucil cist. Narust vysvetleny milnikem ze Zivotni mapy je MODRY KONTEXT, ne cerveny problem.',
      '\u2728 „STALO TO ZA TO? \u2013 VYSLEDKY\": prumer hodnoceni, kolik penez padlo na dobre a spatne hodnocene vydaje a tri nejdrazsi z nizko hodnocenych. Data se sbiraji od S17, ale dosud je zadny modul necetl \u2013 byla to slepa ulicka.',
      '\u2699 Pri implementaci odhaleno, ze blok vyhledu volal computeFuturePlanned() a predictMonthExp(), coz jsou funkce, ktere v aplikaci NEEXISTUJI \u2013 blok by se tise nikdy nezobrazil. Prepsano na skutecne budouciGetAll() a predictCat(). Overeno, ze vsech sest volanych funkci existuje.',
      '\u2699 Dale odhaleno, ze bloky nejprve skoncily v renderDTISection() misto renderReport() \u2013 kotva „7 \u00b7 Bankovni hodnoceni\" lezi v jine funkci. Presunuto a overeno, ze vsechna volani jsou uvnitr renderReport.',
      '\u2699 „Stalo to za to?\" se pri 3M/6M oknu SKRYVA \u2013 pocita jen aktualni mesic, takze v sekci hlasici pul roku ukazovalo mesicni data. 12 runtime testu.',
    ]
  },
  {
    verze: 'v9.61',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F6D1} FIX-234 (S18.19, nahlasil Milan): „STALO TO ZA TO?\" \u2013 SKUPINY Z UCTENKOVYCH POLOZEK NESLO OHODNOTIT. revRate() zapisoval hodnoceni VYHRADNE na transakce a hledal je podle nazvu transakce. Skupiny jako Pecivo, Mlecne vyrobky nebo Maso a uzeniny ale vznikaji z POLOZEK UCTENEK \u2013 zadna transakce se jmenem „Maso a uzeniny\" neexistuje, takze se hodnoceni nemelo kam ulozit a smajliky byly mrtve. Polozky nyni nesou odkaz na uctenku a hodnoceni se zapisuje primo na ne.',
      '\u{1F41B} FIX-235: „OHODNOCENO %\" vypadalo jako chyba. Hlavicka ukazovala POCET (1/19), dlazdice PROCENTO OBJEMU (28 %) \u2013 obe cisla spravne, ale bez popisku to pusobilo jako rozpor. Dlazdice nyni rika „objemu vydaju\" a pod tim uvadi i pocet. Pocitadlo v hlavicce navic zapocitava i polozky z uctenek, ktere driv chybely.',
      '\u2728 FIX-236: dlazdice „Hodnoceno \u{1F641}/\u{1F616}\" ukazovala nulu, kdyz uzivatel nic nehodnotil nizko \u2013 spravne, ale vypadalo to jako nefunkcni. Nahrazena PRUMEREM HODNOCENI (hlavni vystup celeho modulu, ktery dosud nikde nebyl), castka nizko hodnocenych vydaju je jako podradek.',
    ]
  },
  {
    verze: 'v9.60',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-232 (S18.18, nahlasil Milan): GRAF „VYVOJ FINANCNIHO SKORE\" MEL OSU 0\u2013100, ale od v9.58 do nej chodi skore 0\u2013310 \u2013 vsechny kruhy proto pretekaly nad horni hranu a osa lhala. Rozsah se nyni BERE Z DAT (max ze slozek), popisky osy se prizpusobi (krok 25 nebo desitky podle rozsahu).',
      '\u{1F41B} FIX-233: BARVY KRUHU. colorFor() pouzival healthColor(), ktery zna jen skalu 0\u2013100 \u2013 skore 130 tedy obarvil ZELENE, prestoze je to „Rizikove\". Nyni se bere barva ZNAMKY predana z dat (stejne odstiny jako Dashboard), s prepoctem na procenta jako zaloha.',
      '\u{1F41B} FIX-231: RADEK POD 3 SLOZKAMI ZDRAVI mel natvrdo „/25\", jenze skala 0\u201325 uz neexistuje \u2013 Cash flow ma 0\u201375, Rezerva 0\u201350, Sporeni 0\u201335. Maximum se nyni cte primo ze slozky.',
      '\u2699 VYJASNENO, CO JE EKVIVALENT USPOROVEHO ZDRAVI (Milanuv dotaz): je to \u{1F48E} Sporeni/Investice \u2013 obojí je slozka S4, jen v jine skale (0\u201335 vs 0\u2013100). \u{1F6DF} REZERVA je neco JINEHO: meri STAV (kolik uz mas odlozeno), ne TOK (kolik odkladas tento mesic), a do Usporoveho zdravi nevstupuje. Popisek, ktery tvrdil „% zakladu do investic + rezervy\", byl zavadejici a je opraveny; vysvetleni je nyni primo v karte.',
    ]
  },
  {
    verze: 'v9.59',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F6D1} FIX-230 (S18.17, nahlasil Milan): MESICNI REPORT SE NEOTEVREL \u2013 „ReferenceError: _s1pts is not defined\". Pri vkladani banneru s vypoctem skore v v9.58 skoncila deklarace promenne v UPLNE JINE FUNKCI (renderSimulace misto renderReport), protoze jsem hledal kotvu „el.innerHTML = `\", jenze renderReport pouziva „el.innerHTML = tabBar + `\". Deklarace presunuta na spravne misto a overeno, ze lezi uvnitr renderReport a pred vsemi pouzitimi.',
      '\u2699 STEJNA TRIDA CHYBY UZ PODRUHE V TETO SESSION (v9.53 to byl _ffrD). Proto vznikl kontrolni skript, ktery pro kazdou funkci overi, ze zadna lokalni promenna neni pouzita pred svou deklaraci \u2013 node --check tohle nezachyti, protoze kod je syntakticky v poradku a spadne az za behu. Kontrola nyni bezi nad projects.js, premium.js, report.js, charts.js i app.js.',
    ]
  },
  {
    verze: 'v9.58',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-228 (S18.16, nahlasil Milan): GRAF „VYVOJ FINANCNIHO SKORE\" UKAZOVAL JINE CISLO NEZ DASHBOARD. Kopiroval Celkove financni zdravi (0\u2013100), takze svitilo 91, zatimco Dashboard hlasil 140/310 \u2013 dve ruzna cisla pod jednim nazvem. Pricina: computeFinancialScore(D) umela pocitat jen AKTUALNI mesic, takze graf nemel jak ziskat skore 0\u2013310 za starsi mesice. Funkce nyni prijima mesic a rok, vychozi hodnota zustava aktualni mesic (zpetne kompatibilni). Graf ukazuje rawTotal/rawMax vcetne znamky.',
      '\u{1F41B} FIX-229 (nahlasil Milan): ADMIN PANEL \u2013 karta „Rust uzivatelu\" visela pod VSEMI zalozkami. V seznamu skryvanych zalozek ve switchAdminTab() chybelo \'rust\'. Doplneno + overeno, ze seznam nyni obsahuje vsech 14 zalozek z tlacitek.',
      '\u2728 MESICNI REPORT \u2013 CISLOVANE SEKCE (1 \u00b7 Prehled obdobi, 2 \u00b7 Vydajove zdravi, 3 \u00b7 Rozpoctove zdravi dle kategorii, 4 \u00b7 Usporove zdravi, 5 \u00b7 Celkove financni zdravi, 6 \u00b7 Vyvoj skore, 7 \u00b7 Bankovni hodnoceni). „Financni zdravi dle kategorii\" prejmenovano na „Rozpoctove zdravi dle kategorii\" \u2013 hodnoti se tam limity, ne cele zdravi.',
      '\u2728 NOVY BANNER s CELYM RETEZCEM VYPOCTU vydajoveho skore: vydaje \u00f7 prijmy \u2192 pomer \u2192 body z tabulky S1 (0\u201375) \u2192 prepocet na 0\u2013100. Dosud slo jen hadat, proc je Vydajove zrovna 89. Banner zaroven rika, ze Dashboard a report ukazuji TENTYZ vysledek ve dvou skalach.',
      '\u2728 DOPLNENA CHYBEJICI SEKCE „Usporove zdravi\" \u2013 jedna ze tri slozek, ktera se o kus niz hodnotila, ale nikde nemela vlastni kartu. Ukazuje % Zakladu prijmu odkladane do investic a rezervy vcetne vysvetleni, proc je nula.',
      '\u2699 Pri uprave odhaleno, ze sablona sahala na scores.expense a scores.savings \u2013 taková pole computeHealthScores() NEVRACI (jsou to expScore a savingScore). Opraveno 8 referenci a doplnena kontrola, ze vsechna pouzita pole existuji \u2013 jinak by v karte svitilo undefined.',
    ]
  },
  {
    verze: 'v9.57',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F5D1} S18.15: ODSTRANENO OKNO NACITANI z v9.55. Bylo vypnute a nikdo by ho nezapinal, takze slo o mrtvy kod s nenulovym rizikem. Pryc jde: okno + priznak castecneho nacteni + ensureFullHistory + napojeni Reportu a Grafu + agregaty stats/{YYYY} (zbytecne zapisy navic) + .indexOn date v pravidlech. ZUSTAVA v9.46 \u2013 rozdelene cteni, ktere skutecne zrychluje prubezny sync a nic nemaze.',
      '\u{1F464} Z UZIVATELSKY VIDITELNYCH TEXTU ODSTRANENO JMENO AUTORA. „Milanova tabulka S1 Cash flow\" \u2192 „pomer vydaje/prijmy (slozka S1 Cash flow)\", „Milanova tabulka S4 Aktivni sporeni\" \u2192 „aktivni sporeni (slozka S4)\". Upraveny i komentare v kodu (projects.js, premium.js, report.js, charts.js). Historicke zaznamy v tomto changelogu ponechany \u2013 vidi je jen admin.',
      '\u2699 database_rules.json vracen do stavu pred v9.55 \u2013 NUTNO ZNOVU NASADIT do Firebase Console (odebran index date, ktery uz neni k cemu).',
    ]
  },
  {
    verze: 'v9.56',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-227 (S18.14, nahlasil Milan): REPORT \u2013 SLOUPEC „ROCNI\" UKAZOVAL PORAD STEJNE CISLO. Bral se cely rok (_reportSubExp s month=null), takze byl totozny se sloupcem roku a prepnuti mesice s nim nehnulo. Nyni je to KUMULACE leden\u2013zvoleny mesic, jak to Milan popisoval. Hlavicka to i rika: „Rocni (k dubnu)\".',
      '\u{1F3A8} DENIK: NECITELNE TEXTY. Prouzek „Kde jsi na ceste\" i Zivotni mapa pouzivaly tmave hnede odstiny (#6b5741, #8a7a5e) na tmavem podkladu \u2013 prakticky neviditelne. Prosvetleno na #b09f82 / #c9b48a / #f3ead2, tlacitko „Financni obraz\" dostalo podklad a svetlejsi ramecek.',
    ]
  },
  {
    verze: 'v9.55',
    datum: '2026-08-03',
    zmeny: [
      '\u26A1 TODO-177 FAZE 2B (S18.13): OKNO PRI UVODNIM NACTENI. Faze 2 (v9.46) vyresila prubezny sync; zbyval start, kdy se stahovala cela historie. Nyni lze nacist jen poslednich N mesicu pres query orderByChild(date)+startAt. VYCHOZI STAV: VYPNUTO \u2013 zapina se localStorage ff_read_window = 12 (pocet mesicu). Duvod: prinos je vykonovy, riziko datove, takze si to Milan nejdriv overi na svych datech.',
      '\u{1F6E1} KRITICKA POJISTKA: saveToFirebase() ma vetev _set(dataRef, full), ktera prepisuje CELY uzel tim, co je v pameti \u2013 pri castecne nactene historii by NEVRATNE smazala starsi transakce. Je to jedina nevratna cesta v cele aplikaci. Nyni ji blokuje priznak _dwPartial: pred plnym zapisem se historie nejprve dotahne, a kdyz se to nepovede, ZAPIS SE ZRUSI misto aby se ulozila necuplna data. Overeno testem, ktery simuluje presne tenhle scenar.',
      '\u2699 ensureFullHistory() \u2013 dotazeni cele historie na vyzadani, idempotentni. Napojeno na Report (matice pres vsechny roky) a Grafy \u2192 Vsechny roky; obe karty pri okne nejprve dotahnou data a pak se prekresli. window.dwHistoryInfo() hlasi, kolik historie je v pameti.',
      '\u2728 ROCNI AGREGATY users/{uid}/stats/{YYYY} \u2013 prijmy, vydaje a mesicni rozpad, aby slo ukazat starsi roky bez stahovani transakci. Pri castecnem nacteni se ZAMERNE neprepisuji roky, ktere mame jen zcasti \u2013 jinak by se spravny agregat prepsal nulami. Postranni zapis ve vlastnim try/catch, nikdy neshodi hlavni ulozeni.',
      '\u2699 database_rules.json: pridan .indexOn „date\" u transactions \u2013 bez nej by Firebase radil na klientovi a stahl stejne vsechno (funkcne OK, vykonove ne). NUTNO NASADIT ZVLAST do Firebase Console.',
      '\u2699 Fallback i vypinac zustavaji z v9.46: pri jakekoli chybe se okno vypne a nacte se vse. 18 runtime testu vcetne simulace ztraty dat.',
    ]
  },
  {
    verze: 'v9.54',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F504} S18.12 (Milan): REPORT PREDELAN \u2013 SEKTOR = KATEGORIE, RADEK = PODKATEGORIE. Milan spravne upozornil, ze v9.52 (rucni prirazovani kategorii do sektoru) nemuze fungovat: u nej je KATEGORIE uz sama nadpisem a data nesou PODKATEGORIE. Editor sektoru tak nabizel zaradit sektor do sektoru. Nyni se hierarchie bere primo z dat \u2013 zadne rucni prirazovani, zadny pad do „Ostatni\".',
      '\u2699 Podkategorie se ctou z REALNYCH TRANSAKCI (t.subcat, starsi t.subcategory), ne z ciselniku kategorie \u2013 jinak by zmizely vydaje s podkategorii, ktera byla mezitim z ciselniku smazana. Prazdna podkategorie se sdruzuje pod „(bez podkategorie)\", aby se vydaj neztratil.',
      '\u{1F5D1} ZRUSENY TABY: „Tento mesic\", „Kumulace roku\" (oba byly jen placeholdery) a „Roky\". Duvod: obsah uz pokryvaji jine karty \u2013 Mesicni report resi aktualni mesic, Grafy\u2192Rocni maji od v9.48 kumulaci led\u2013pro a Grafy\u2192Vsechny roky matici kategorii. Report ma nyni JEDINY ucel: Excel matice kategorie \u2192 podkategorie. Odstranen i cely editor sektoru z v9.52 vcetne stavu a obsluh \u2013 zadny mrtvy kod nezustal (overeno).',
      '\u2699 Sloupec „vs. <loni>\" zustava a pocita se nyni na urovni podkategorie, opet proti STEJNEMU obdobi loni (leden\u2013aktualni mesic). 10 runtime testu.',
    ]
  },
  {
    verze: 'v9.53',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F6D1} FIX-226 (S18.11, nahlasil Milan): FINANCNI OBRAZ SE NEOTEVREL \u2013 ReferenceError „can\'t access lexical declaration \'_ffrD\' before initialization\". PRICINA: v v9.51 jsem vlozil vypocty FFR/likvidity na misto, kde stalo `const divColor`, jenze ffrCard je pouziva o STO RADKU DRIV. const je v temporal dead zone, takze se cela karta zhroutila. NENI to chyba poradim nasazeni verzi \u2013 chyba byla primo v v9.51.',
      '\u2699 OPRAVA: blok vypoctu presunut PRED ffrBarW/ffrCard. Doplnena statická kontrola poradi deklarace vs. prvniho pouziti pro vsech 16 novych identifikatoru v renderObraz \u2013 zadna dalsi TDZ chyba tam neni.',
      '\u2699 POUCENI: node --check tohle NEZACHYTI (syntakticky je kod v poradku), spadne to az za behu \u2013 stejna trida chyby jako v9.17. Pri vkladani `const` do dlouhe render funkce je nutne overit, ze deklarace predchazi vsem pouzitim, ne jen ze soubor projde kontrolou syntaxe.',
    ]
  },
  {
    verze: 'v9.52',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-225 (S18.10, nahlasil Milan): REPORT \u2013 SEKTORY FAKTICKY NEFUNGOVALY. Kategorie se do sektoru radily podle cat.coicop, jenze ten udaj vetsina kategorii nema \u2013 takze VSECHNO spadlo do „Ostatni\" a Excel-styl rozdeleni existoval jen na papire.',
      '\u2728 TODO-208: VLASTNI EDITOVATELNE SEKTORY. Tlacitko „\u2699 Upravit sektory\" v hlavicce zapne u kazde kategorie volic, kterym si uzivatel sam urci blok (Dum a bydleni, Splatky, Jidlo a nakupy, Auto a doprava, Deti a rodina, Zdravi, Zabava, Sluzby, Investice). Poradi rozhodovani: vlastni prirazeni \u2192 COICOP \u2192 Ostatni. Ulozeno v S.reportSectors.',
      '\u2728 NOVY SLOUPEC „vs. <loni>\": rozdil proti STEJNEMU OBDOBI loni (leden\u2013aktualni mesic), ne proti celemu lonskemu roku \u2013 srovnavat 8 mesicu letos s 12 mesici loni by bylo zavadejici. Zelena = letos min, cervena = vic, plus procenta. Kategorie, ktera loni neexistovala, ma „nove\" misto nesmyslneho procenta. Mezisoucty sektoru i celkovy soucet maji stejny sloupec.',
      '\u2699 Novy uzel users/{uid}/data/reportSectors registrovan na vsech 4 mistech v app.js (_DW_META, _dwMetaVals, oba lokalni snapshoty) \u2013 bez toho by se TICHE nesynchronizoval. Firebase pravidla netreba, kaskada .write z users/$uid ho kryje. 8 runtime testu.',
    ]
  },
  {
    verze: 'v9.51',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.9 (Milan): FINANCNI OBRAZ v2 \u2013 CESTA FINANCNIHO ZDRAVI S VODOPADEM. Ukaze „pred N mesici X \u2192 dnes Y \u2192 +Z bodu\" a pod tim ROZPAD, cim to bylo: prijmy, vydaje, uspory, zadluzenost, kazda slozka s prispevkem +15 / 0 / \u221215. Neni to odhad \u2013 je to presne ten vzorec, ze ktereho se skore pocita.',
      '\u2699 Vypocet skore vytazen do computeObrazScore() (drive inline v renderu). Duvod: skore je potreba spocitat i pro STARSI okno kvuli Ceste, a duplikovat vzorec by znamenalo dve mista, ktera se casem rozejdou (SKILL 17). Funkce vraci i rozpad na prispevky.',
      '\u2699 Test odhalil nesrovnalost pred nasazenim: pri plnem zlepseni dava soucet slozek 110 bodu, ale skore je oriznute na 100 \u2013 vodopad by pak NESEDEL se zobrazenym cislem. Nyni se v takovem pripade zobrazi vysvetlujici radek.',
      '\u2728 NET WORTH MOMENTUM: ciste jmeni jako STAV vedle Wealth Momentum, ktery meri TOK. Poctiva poznamka primo v karte: historii cisteho jmeni zatim neukladame, takze se ukazuje jen cast vytvorena VLASTNIM SPORENIM \u2013 zmena trzni hodnoty majetku v cisle neni a netvarime se, ze ano.',
      '\u2728 FFR MOMENTUM + LIKVIDITA: obojí porovnavano PROTI ZACATKU OKNA, ne pulenim \u2013 jsou to pomalu se menici zasoby, ne mesicni toky. Likvidita = penezenky + rezerva (mid/fixed jsou vazane), vcetne toho, na kolik mesicu vydaju to vystaci. Cte z existujiciho assetLiqTotals(), nepocita znovu.',
      '\u2728 SBALITELNE RADKY: pokrocile metriky rozdelene do skupin Lifestyle / Nezavislost a stabilita / Majetek. Devet metrik v jedne hromade se neda cist; volba rozbaleni se pamatuje (ff_obraz_rows).',
      '\u2699 SKORE 0\u2013100 ZUSTAVA BEZE ZMENY \u2013 nove podmetriky z v9.44 do nej zamerne nevstupuji. Prahy pro bodovani nelze poctive urcit, dokud nebude videt jejich rozptyl na realnych datech. 12 runtime testu.',
    ]
  },
  {
    verze: 'v9.50',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.8 (Milan): ZIVOTNI ETAPY \u2013 druhy typ zaznamu v Zivotni mape. Milnik je BOD (vzal jsem si hypoteku), etapa je OBDOBI se zacatkem a koncem (Rodina bez deti 2019\u20132023). Teprve etapa umozni srovnat prumerne mesicni vydaje mezi obdobimi \u2013 u bodoveho milniku neni co s cim porovnat. 7 prednastavenych etap (Student, Svobodny, Par, Rodina, Rodina s ditetem, Vlastni bydleni, Bez prace). Pod mapou pribylo SROVNANI ETAP s pruhy prumernych mesicnich vydaju.',
      '\u2728 AUTOMATICKY MILNIK „Zacal jsem sledovat vydaje\" \u2013 vznikne sam po 5. transakci. SMYSL: umozni srovnat NESLEDOVANE vs. SLEDOVANE obdobi, tedy dolozit prinos aplikace uzivatelovymi vlastnimi cisly, ne tvrzenim. Datum = prvni pouziti appky, fallback nejstarsi transakce.',
      '\u2699 Test odhalil chybu pred nasazenim: po smazani se auto-milnik pri dalsim nacteni VRACEL (ochranny priznak zil jen v pameti a nesynchronizoval se). Nyni se auto-milnik nemaze, ale SKRYVA (hidden) \u2013 priznak putuje s daty, takze se uz nevrati ani na jinem zarizeni.',
      '\u2728 DENIK: prouzek „KDE JSI NA CESTE\" \u2013 kolik procent prijmu spotrebuje zivotni styl a jak to bylo pred pul rokem, s odkazem do Financniho obrazu. Denik je misto, kam uzivatel chodi casto, proto sem patri pripominka smeru, ne cela analyza.',
      '\u2699 Prouzek CTE z computeObrazSubmetrics() (v9.44), nepocita podruhe \u2013 jinak by vznikl druhy vypocet tehoz jako u Inflace vs. Zdrazovani (SKILL 17). Pri nedostatku dat se nezobrazi vubec misto aby ukazal nesmysl.',
      '\u2699 Etapy ani milniky NEOVLIVNUJI skore \u2013 jen kontext (Milanovo rozhodnuti). Overeni: konec etapy pred zacatkem je odmitnut, prijmy se do prumeru vydaju nepocitaji. 13 runtime testu.',
    ]
  },
  {
    verze: 'v9.49',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 S18.7 (nahlasil Milan): NOVE GRAFY MAJI TOOLTIPY. Sloupcovy graf ukaze rok/mesic, castku a ODCHYLKU OD PRUMERU vcetne sipky nad/pod \u2013 presne to, kvuli cemu tam cervena linka je. Kumulace ukaze celkovou sumu k danemu bodu a zaroven prirustek toho roku/mesice.',
      '\u2699 Implementace: po vykresleni se ulozi snimek platna (getImageData) a pri hoveru se jen obnovi a dokresli bublina \u2013 prekreslovat cely graf pri kazdem pohybu mysi by na dlouhe historii sekalo. Bublina se u praveho okraje prekloni doleva, aby nevyjela z platna. Funguje i na mobilu pres attachChartTouch.',
    ]
  },
  {
    verze: 'v9.48',
    datum: '2026-08-03',
    zmeny: [
      '\u{1F41B} FIX-224 (S18.6, nahlasil Milan): GRAFY \u2013 FILTR „PRIJMY\" VRACEL PRAZDNOU TABULKU. Pricina: renderRocniGraf i renderVsechnyRoky mely NATVRDO podminku _txKind(t) !== \'income\', takze pri zvoleni pouze Prijmu se odfiltrovalo uplne vsechno. Typ transakce pritom uz filtruje getGrafTxs() \u2013 ta podminka byla navic a primo proti uzivatelove volbe. Nyni se pouziva _grafKind(): jeden zvoleny typ = ten, vic typu (vychozi Prijmy+Vydaje) = vydaje, aby se nescitaly dva opacne smery penez dohromady. Nadpisy i prazdne stavy nyni pisou, o jaky typ jde.',
      '\u{1F5D1} ROCNI: odstranena „Rocni tabulka\" \u2013 duplikovala matici Kategorie x mesice, ktera nese stejna data a navic ukazuje rozpad po kategoriich.',
      '\u2728 ROCNI: dva nove grafy \u2013 mesicni souhrny jako sloupce s CERVENOU LINKOU PRUMERU a kumulace leden\u2013prosinec. Kreslici funkce drawVrBars/drawVrCum prijimaji volitelne id canvasu, takze je sdili Rocni i Vsechny roky (jeden kod, ne dva).',
      '\u{1F5D1} VSECHNY ROKY: odstranena tabulka ROK x mesice \u2013 matice jedne kategorie nize ukazuje totez, ale bez michani kategorii dohromady.',
      '\u2728 VSECHNY ROKY: tabulka Kategorie x roky ma nyni stejne barevne prechody jako zbytek (zelena = nizka, cervena = vysoka; drive fialovy odstin) a dva nove souctove radky: \u00d8 Prumer (pres vsechny kategorie) a \u00d8 Prumer > 0 (jen z nenulovych hodnot \u2013 bez toho prumer klesa jen tim, ze nejaka kategorie v danem roce neexistovala).',
      '\u2699 Ohraniceni (vodorovne i svisle) u vsech matic; v matici jedne kategorie zuzeny sloupce podle hustoty dat.',
      '\u2699 Testy odhalily realnou chybu pred nasazenim: prazdne pole typu (nic nezvoleno) vracelo undefined \u2013 doplnen fallback. Overeno i odstraneni osirelych referenci po smazani tabulek (monthAvgs, globalAvg) \u2013 node --check je nezachyti, spadlo by to az za behu (pouceni v9.17). 12 runtime testu.',
    ]
  },
  {
    verze: 'v9.47',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 TODO-204 (S18.5, Milan dle sveho Excelu): GRAFY \u2013 ROCNI MA HEATMAPU KATEGORIE x MESICE. RESI konkretni problem: pri zapnutem filtru nebylo v tabulce videt, KTERE kategorie to jsou \u2013 videl jsi jen souctove sloupce. Nyni radek = kategorie (respektuje filtr), sloupec = mesic, plus Celkem a O/mes, serazeno podle celkove castky.',
      '\u2728 TODO-205: VSECHNY ROKY \u2013 MATICE JEDNE KATEGORIE (mesice x roky) s vlastnim vyberem nad tabulkou. Nabidka odrazi filtr kategorii nahore; kdyz neni nic vybrano, nabidnou se kategorie s daty. Radky O (prumer z nenulovych mesicu) a Celk. Duvod: puvodni tabulka michala vsechny kategorie dohromady, takze v ni nesly videt vzorce jednotlive kategorie \u2013 sezonnost, kdy vznikla, kdy skoncila.',
      '\u2728 TODO-206: VSECHNY ROKY \u2013 DVA NOVE GRAFY. Sloupce rocnich souctu s CERVENOU LINKOU PRUMERU (hned je videt rok nad/pod prumerem) a graf KUMULACE (kolik celkem od prvniho roku). Popisek se meni podle filtru typu: Prijmy / Vydaje / Presuny. Duvod: sekce se jmenuje Grafy, ne tabulky.',
      '\u2699 Sjednocene prechody barev pres sdileny helper _heatBg(): zelena = nizka, zluta = stred, cervena = vysoka. Skaluje se vuci maximu RADKU, ne globalne \u2013 jinak by kategorie s malymi castkami byly vzdy zelene a neslo by v nich nic vycist. Na syte cervene se text prepina na svetlejsi odstin kvuli citelnosti.',
      '\u2699 Osetreni: deleni nulou, hodnota nad maximem se klampne, prazdna data, jediny rok, skryty tab (clientWidth = 0 \u2013 canvas se nekresli misto aby spadl). Grafy maji popisky os s jednotkami. 13 runtime testu.',
      '\u2699 charts.js je CRLF soubor \u2013 editovano pres Python io.open(newline=\'\') a overeno, ze pocet CRLF sedi a nevznikly osamocene LF.',
    ]
  },
  {
    verze: 'v9.46',
    datum: '2026-08-03',
    zmeny: [
      '\u26A1 TODO-177 (S18.4, ADR-062 FAZE 2): CTENI PO CASTECH. Zapis uz byl diff od S17 (pridani transakce poslalo ~1 KB misto ~1,5 MB), ale CTENI viselo na onValue nad CELYM uzlem users/{uid}/data \u2013 server tedy po kazde zmene poslal zpatky celou databazi, a to i partnerovi. Uspora na zapisu se tim v provozu z velke casti mazala. NYNI: transakce pres onChildAdded/Changed/Removed (prijde JEN ta jedna zmenena), meta pres onValue zvlast na kazdy klic (kazdy je maly).',
      '\u2699 PROC NELZE JINAK: Firebase synchronizuje cely podstrom pod listenerem, takze nejde poslouchat „data\" a vynechat z nej transakce. Proto rozdeleni na ~24 malych listeneru misto jednoho velkeho.',
      '\u2699 SAMOOPRAVNY SEZNAM KLICU: seznam se neodvozuje jen z _DW_META, ale doplni se o klice skutecne pritomne v uvodnim snapshotu (a zaloguje je). Novy uzel pridany v kodu tak nemuze TISE prestat syncovat \u2013 trida chyby FIX-220.',
      '\u2699 POJISTKA: pri jakekoli chybe fallback na puvodni onValue nad celym uzlem. Vypnout lze i bez nasazeni \u2013 localStorage ff_read_split = 0. Stejny fallback se pouzije, kdyz prohlizec drzi v cache stary firebase.js bez query/child exportu.',
      '\u2699 firebase.js: doplneny exporty query, orderByChild, startAt, endAt, limitToLast, onChildAdded/Changed/Removed (drive jen ref/set/get/update/onValue/off \u2013 bez nich neslo cist po castech).',
      '\u2699 Anti-flicker: pri pripojeni se spusti ~24 listeneru najednou, proto je dokonceni debounced (140 ms) \u2013 20 zmen = 1 prekresleni. 12 runtime testu.',
      '\u2699 ZATIM BEZ 12M OKNA: omezeni uvodniho nacteni na poslednich 12 mesicu vyzaduje agregaty stats/{YYYY} a dotahovani starsich let, jinak by zmizela historie z grafu „Vsechny roky\" a z matice v reportu. Samostatny krok (faze 2b).',
    ]
  },
  {
    verze: 'v9.45',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 TODO-203 (S18.3, Milan): ZIVOTNI MAPA V DENIKU. Uzivatel si na casovou osu znaci zlomove zivotni udalosti (zmena prace, hypoteka, narozeni ditete, stehovani, ztrata prijmu\u2026) \u2013 12 prednastavenych typu + vlastni nazev, datum a poznamka. DUVOD: dlouhe horizonty (12M+) nemeri navyky, ale zivotni udalosti. Bez kontextu vypada takovy zlom jako selhani \u2013 oznacena udalost ho VYSVETLI misto aby ho penalizovala. Diky tomu davaji delsi horizonty vubec smysl.',
      '\u2699 UDALOSTI ZAMERNE NEOVLIVNUJI BODOVANI (Milanovo rozhodnuti). Kdyby udalost menila skore, appka by rozhodovala, ktere zivotni volby jsou omluvitelne \u2013 to ji neprislusi. Navic by slo zneuzit: oznacit kazdy drahy mesic jako „stehovani\". Kontext ano, vymluva ne. Prazdny stav to uzivateli rovnou rika.',
      '\u2699 Novy uzel users/{uid}/data/milestones registrovan na VSECH ctyrech mistech v app.js: _DW_META (bez nej by se TICHE nesynchronizoval), _dwMetaVals, a oba lokalni snapshoty. Firebase pravidla: zapis je uz kryty kaskadou .write z users/$uid, takze nove pravidlo NETREBA \u2013 pridana pouze .validate na delku label/note/icon (stejny vzor jako u transakci).',
      '\u2699 Osetreni: HTML escapovani label/note/icon (XSS), neplatne datum nevypise „Invalid Date\", prazdny nazev odmitnut, editace nezaklada duplikat, razeni od nejnovejsi udalosti. 12 runtime testu.',
    ]
  },
  {
    verze: 'v9.44',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 TODO-202 (S18.2, Milan): FINANCNI OBRAZ MA PREPINAC OKNA A PODMETRIKY. Ctyri hlavni metriky (Prijmy, Vydaje, Momentum, Dluhy) maji nove ZANORENOU podmetriku, ktera pridava RELACI, jakou samotna uroven nenese: Income Momentum (tempo prijmu), Expense Control (tempo vydaju VUCI prijmum), Income Capture / Income Resilience a Debt Momentum. DUVOD: 8 metrik vedle sebe by budilo dojem 8 nezavislych informaci, pritom spolu algebraicky souvisi. Zanoreni ten vztah zviditelni misto aby ho skrylo. Kazda podmetrika ma rozbalovaci vysvetlivku „Co to je\" (nezobrazuje se natrvalo, zdvojnasobila by vysku karet).',
      '\u2728 PREPINAC OKNA 6M / 12M / Celkove nad Financnim obrazem. JEDNO PRAVIDLO pro vsechna okna: okno se rozpuli a 2. polovina se porovna s 1. (6M = 3vs3, 12M = 6vs6). Datova narocnost = delka okna, takze novy uzivatel s kratsi historii nepotrebuje zvlastni vetev v kodu. Volba se pamatuje (localStorage ff_obraz_win). „Celkove\" ma strop 120 mesicu, aby render nezdivocel na dlouhe historii.',
      '\u2728 KARTA „Inflace zivotniho stylu\" PREJMENOVANA NA „Rust zivotniho stylu\" + pridano EXPENSE RATIO. Dva duvody: (1) appka uz ma osobni inflaci z uctenek (inflace.js) \u2013 dve ruzne „inflace\" o necem jinem matou, slovo inflace zustava vyhrazene cenam; (2) karta dosud MENILA NAZEV podle stavu, takze si ji uzivatel nemohl zapamatovat ani o ni mluvit. Nyni ma stabilni nazev a promenny verdikt. Expense Ratio (kolik % prijmu spotrebuje zivotni styl) se NEPOCITA ZNOVU \u2013 bere se stejna definice jako expRatio ve slozce S1 skore 0\u2013310, aby obe obrazovky neukazaly rozporna cisla.',
      '\u2699 ZAMERNA FAZE, NE NEDODELEK: podmetriky se zatim NEPROMITAJI do skore 0\u2013100 a skore zustava ukotvene na 6M. Prahy pro bodovani nelze poctive odvodit driv, nez bude videt rozptyl na realnych datech (je Income Capture 40 % dobry vysledek? dnes to nevi nikdo). Skore se take nesmi menit pouhym prepnutim okna \u2013 uzivatel by si myslel, ze se neco pokazilo.',
      '\u2699 Vypocet ODDELEN od vykresleni: nova funkce computeObrazSubmetrics(series) vraci hodnoty a nesaha na globalni S (architektonicka zasada c. 2). Pripraveno pro sdileni s Denikem, aby stejny vypocet nevznikl podruhe.',
      '\u2699 Osetreni: prah stability 2 000 Kc (bez nej by zmena prijmu o 200 Kc dala nesmyslnych 300 %), Income Capture jen pri RUSTU a Income Resilience jen pri POKLESU prijmu (pri obou zapornych delta by stejnych 50 % znamenalo jednou zisk a podruhe ztratu), Debt Momentum v Kc/mes misto % (\u221210 % z 5 000 Kc a z 500 000 Kc je jina situace), deleni nulou pri nulovem prijmu. 24 runtime testu.',
    ]
  },
  {
    verze: 'v9.43',
    datum: '2026-08-03',
    zmeny: [
      '\u2728 TODO-200 (S18.1, Milan): FINANCNI SKORE MA NOVY UKAZATEL. Kruhovy prsten nahrazen OBLOUKOVOU MERKOU (pulkruh 0\u2013310) s ruckou a barevnymi pasmy podle hranic znamek (Kriticke \u2013 Rizikove \u2013 Prumerne \u2013 Dobre \u2013 Velmi dobre \u2013 Vyborne). DUVOD: prsten ukazoval jen „kolik z maxima\", ale ne to, KDE na skale uzivatel stoji vuci hranicim znamek. Merka ma ciselne rysky (0/62/124/186/248/310), legendu pasem se zvyraznenym aktualnim a novy radek „Do znamky X ti chybi Y bodu\" \u2013 tedy informaci smerem dopredu, ne vycitku (SKILL 22). Pasma se pocitaji jako POMER z rawMax, ne natvrdo \u2013 pri zmene bodovacich tabulek se prizpusobi sama (SKILL 9).',
    ]
  },
  {
    verze: 'v9.42',
    datum: '2026-08-01',
    zmeny: [
      '💳 UX (S17.42, Milan): na Stripe checkoutu chybi tlacitko zpet – uzivatel ma pocit, ze je v pasti. PRICINA neni nastaveni Stripu, ale to, ze checkout otvirame v NOVE ZALOZCE (_blank), ktera nema zadnou historii → tlacitko Zpet v prohlizeci je sede. Docasne reseni: po otevreni platby se v appce zobrazi informacni lista „Platba se otevrela v nove zalozce – rozmyslel sis to? Staci ji zavrit". Trvale reseni = TODO-199 (Checkout Session s cancel_url).',
    ]
  },
  {
    verze: 'v9.41',
    datum: '2026-08-01',
    zmeny: [
      '🐛 FIX-223 (S17.41, Milan – KRITICKE pro platby): FIREFOX BLOKOVAL PLATEBNI BRANU. window.open se volal az PO `await` (zjistovani zbyvajicich zakladajicich mist), takze ho prohlizec nepovazoval za reakci na kliknuti a zablokoval jako nevyzadany popup. Uzivatel videl jen varovnou listu a nic se nestalo. RESENI: pocet mist se nacita DOPREDU pri prihlaseni (preloadFounderSlots) a drzi v cache – checkout se tedy otevira SYNCHRONNE primo z kliku. Pridana i pojistka: kdyz window.open presto vrati null, nabidne se otevreni v aktualni zalozce.',
      '🎨 S17.41 (Milan): confirm() dialogy pri vyberu predplatneho nahrazeny VLASTNIM MODALEM se ctyrmi jasnymi volbami (zakladajici rocni/mesicni, bezne rocni/mesicni) vcetne vycislene uspory. Duvody: (a) v confirm() stalo „Storno = bezne ceny", ale prohlizec tlacitko pojmenuje „Zrusit" – popis nesouhlasil s realitou; (b) ptat se „chces levnejsi cenu naporad?" nema smysl, nikdo nerekne ne – zakladajici cena se nyni nabizi rovnou jako vychozi volba.',
    ]
  },
  {
    verze: 'v9.40',
    datum: '2026-08-01',
    zmeny: [
      '🎁 S17.40 (Milan): TRIAL ZUSTAVA JEDINOU NABIDKOU pro novacka – tlacitko „Predplatit hned" z v9.39 odebrano. Milan zamerne nechce nikoho tlacit k platbe driv, nez si appku vyzkousi; nabidka predplatneho se objevi az po skonceni trialu. Behem bezciho trialu text uklidnuje („Trial bezi jeste X dni – ted platit nemusis"), po vyprseni pripomina, ze data zustala.',
    ]
  },
  {
    verze: 'v9.39',
    datum: '2026-08-01',
    zmeny: [
      '🐛 FIX-222 (S17.39, Milan): PAYWALL neodpovidal stavu uzivatele. (1) Tlacitko VZDY spoustelo TRIAL – kdo chtel rovnou zaplatit, nemel jak; po aktivaci trialu se navic nedalo predplatit vubec, museli by cekat 30 dni. (2) U karty Free svitilo „Aktualni plan" i uzivateli s aktivnim trialem/Premiem. Nove se paywall prizpusobi: kdo trial jeste nema → hlavni akce trial + vedlejsi „Predplatit hned (bez cekani)"; komu trial bezi nebo vyprsel → rovnou platba (s poznamkou, ze predplatne na trial navaze); kdo uz plati → „Spravovat predplatne" (Stripe portal). Karta Free ukazuje „Aktualni plan" jen kdyz uzivatel opravdu na Free je.',
      '🔢 S17.39: hlavicka database_rules.json sjednocena na aktualni verzi appky. POZNAMKA: soubor se meni jen obcas, takze jeho cislo do ted odpovidalo posledni zmene (v9.36) – pri rucnim nasazovani je ale prehlednejsi drzet stejne cislo jako appka.',
    ]
  },
  {
    verze: 'v9.38',
    datum: '2026-08-01',
    zmeny: [
      '⏳ NEW (S17.38, Milan): PRIPOMENUTI KONCE TRIALU na Dashboardu. Trial bez karty se sam nepreklopi na placeny – uzivatel se musi aktivne vratit, takze bez pripomenuti tise vyprsi a clovek odejde. V poslednich 7 dnech se zobrazi karta s poctem zbyvajicich dni; naléhavost roste (modra → zluta → cervena, „konci za 5 dni" → „konci zitra" → „konci dnes"). Text mluvi o tom, CO UZIVATEL ZTRATI (AI Radce, uctenky, predikce, grafy, sdileni), ne o tom, ze ma zaplatit – a vyslovne uklidnuje, ze data zustavaji. Tlacitko „Pripomenout zitra" pro odlozeni na dany den (localStorage).',
    ]
  },
  {
    verze: 'v9.37',
    datum: '2026-08-01',
    zmeny: [
      '🐛 FIX-221 (S17.37, Milan): banner v sidebaru hlasil „🔒 Trial vyprsel" VSEM Free uzivatelum – tedy i uplnym novackum, kteri trial nikdy nemeli. Odrazovalo to od vyzkouseni („uz jsem o to prisel"), presne u lidi, ktere chceme ziskat. Nove se rozlisuje podle trialUsed: kdo trial jeste nevycerpal, vidi pozvanku „✨ 30 dni Premium zdarma · bez karty"; kdo ho vycerpal, vidi puvodni hlasku o vyprseni. Do _premiumStatus doplneno pole trialUsed ve vsech vetvich loadPremiumStatus.',
    ]
  },
  {
    verze: 'v9.36',
    datum: '2026-08-01',
    zmeny: [
      '🚨 FIX-220 (S17.36, Milan – KRITICKE, blokovalo ziskavani uzivatelu): TLACITKO „Vyzkouset Premium" HLASILO „Nepodarilo se aktivovat trial" a NIKOMU trial nesel spustit. Pricina: startTrial zapisuje deduplikacni uzel trialsUsed/{emailKey} (aby si nikdo nevzal trial dvakrat na ruzne ucty), ale tenhle uzel NEMEL ZADNA PRAVIDLA v database_rules.json – a ve Firebase plati, ze co neni vyslovne povoleno, je zakazano. Zapis skoncil na PERMISSION_DENIED a shodil celou aktivaci, prestoze zapis do users/{uid}/premium sam o sobe probehl v poradku. Doplnena pravidla: cist smi prihlaseny uzivatel, zapsat jen JEDNOU (!data.exists()) a jen zaznam s vlastnim uid – nikdo tedy nemuze cizi e-mail „zablokovat" ani svuj zaznam smazat a vzit si trial znovu.',
      '🛡️ S17.36: startTrial ZPEVNEN – zapis i cteni deduplikacniho uzlu jsou nyni obalene vlastnim try/catch. Deduplikace je BONUS, ne podminka: kdyz selze, trial se presto aktivuje (je zapsany v users/{uid}/premium). Drive jedina chyba v postrannim uzlu shodila celou funkci.',
      '💬 S17.36: chybova hlaska u trialu rozlisuje pricinu – chyba opravneni („chyba nastaveni na nasi strane, napis nam"), vypadek site („nejsi online") a ostatni. Puvodni „Zkus to znovu" bylo u chyby na nasi strane zavadejici a uzivatel klikal donekonecna.',
    ]
  },
  {
    verze: 'v9.35',
    datum: '2026-08-01',
    zmeny: [
      '🐛 FIX-219 (S17.35, Milan): odkaz „Analyza uctenek → Zdrazovani" v Detektoru uspor otviral PRAZDNOU STRANKU. Dve chyby: (1) volal switchUctenkyTab s ID „zdrazeni", ale zalozka se jmenuje „prices"; (2) showPage() jen zobrazi stranku, obsah zalozek vykresluje az renderUctenky() v renderPage – prepnuti tedy pracovalo s prazdnym DOM. Novy helper openUctenkyTab(tab) nastavi _activeUctenkyTab a prepne az po vykresleni.',
      '💳 S17.35 (Milan): prah pro detekci DRAHYCH PUJCEK snizen z 10 % na 7 % p.a. Puvodni hranice vznikla v dobe vyssich sazeb; dnes se vyplati refinancovat i hypoteku nad 6 % nebo spotrebak nad 8 %.',
      '📋 S17.35 (Milan): PRAZDNY STAV Detektoru uspor nyni VYSVETLUJE, co se proverilo a proc to proslo („Provereno 7 pujcek – nejdrazsi ma 5,4 %, coz je pod hranici 7 %"), misto pouheho „Zadne uspory nebyly detekovany". Upozorni i na chybejici vstupy (nenastavene limity kategorii, zadne naskenovane uctenky), ktere detektoru brani neco najit.',
      '📝 S17.35: upresneny popisky v prehledu „Co detektor analyzuje" – „Jidlo venku" se nedetekuje podle kategorie (ta neexistuje), ale podle NAZVU transakce (McDonald, pizza, kavarna, hospoda…), coz z puvodniho popisku neslo poznat.',
    ]
  },
  {
    verze: 'v9.34',
    datum: '2026-08-01',
    zmeny: [
      '🎯 NEW TODO-198 (S17.34, Milan): MESICNI REVIEW – novy modul review.js, tlacitko „Ohodnotit utraty" v Mesicnim reportu. Hodnoceni 1–5 pres smajliky („Stalo to za to?") + poznamka. TRI POHLEDY: 📦 SUMARIZACE (skupiny vc. polozek z uctenek – pecivo, sladkosti, pivo, alkohol, kava, maso, mlecne, ovoce/zelenina, napoje, cigarety, drogerie, mazlicek), 🔟 TOP 10 (nejvetsi utraty + top 5 skupin), 🔬 VSE (jen admin – kazda transakce zvlast).',
      '🔬 S17.34 (jen pro Milana): zalozka „Vse" obsahuje SROVNANI PRISTUPU – kolik % objemu vydaju pokryje top 5 skupin vs. top 10 transakci vs. vsechny. Odpovi na otazku, jestli ma smysl sumarizace, nebo hodnotit polozku po polozce.',
      '🧠 S17.34: navrh hodnoceni vychazi VYHRADNE z historie uzivatele (prumer jeho drivejsich hodnoceni stejne skupiny, min. 3 zaznamy) a zobrazuje se jen jako orientacni „Ø". Appka NIKDY sama neoznaci utratu za zbytecnou – to smi jen uzivatel. Souhrn mluvi o BUDOUCNOSTI („kdybys polovinu presmeroval, je to X Kc za rok"), ne o vycitkach za minulost.',
      '💳 S17.34 (Milan): TYP PLATBY a PENEZENKA jsou nyni POVINNE – odebrany prazdne volby „– nevybrano –" a „– vychozi –". Predvybere se hodnota z Nastaveni, jinak prvni penezenka a kreditni/platebni karta. Duvod: transakce bez vazby nesedi v evidenci ani v zustatcich.',
    ]
  },
  {
    verze: 'v9.33',
    datum: '2026-08-01',
    zmeny: [
      '🔢 S17.33 (Milan): SJEDNOCENO CISLOVANI worker.js a database_rules.json s verzi appky. Oba soubory mely historicky VLASTNI radu (worker v8.35 kdyz appka byla v8.99, rules v8.88 pri appce v9.x), protoze se nasazuji samostatne mimo hash chain v app.html. Nove nesou stejne cislo jako appka – na prvni pohled je videt, ke ktere verzi worker/pravidla patri, coz je pri dohledavani problemu s platbami zasadni.',
      '📌 S17.33: POZOR pri pristich bumpech – worker.js a database_rules.json se NEMENI pri kazde verzi (nasazuji se rucne). Jejich cislo znaci verzi appky, se kterou byly naposledy zmeneny, ne aktualni verzi appky.',
    ]
  },
  {
    verze: 'v9.32',
    datum: '2026-08-01',
    zmeny: [
      '💳 S17.32 (Milan): aktualizovany dva Payment Linky – zakladajici rocni 990 Kc a bezne rocni 1490 Kc. Puvodni produkty mely ve Stripe spatnou FREKVENCI PLATBY (mesicni misto rocni), Milan je archivoval a zalozil znovu.',
      '🛡️ S17.32: worker.js planFromPriceId nyni pouziva i STRIPE_PRICE_PREMIUM_MONTHLY/YEARLY a STRIPE_PRICE_FOUNDER* jako explicitni mapovani price ID → tier. Neznama predplatna cena dal spadne do „premium" (radeji dat pristup navic nez zakaznikovi uprit zaplacene), ale explicitni mapovani zabrani tomu, aby do Premia omylem spadl budouci doplnkovy produkt.',
    ]
  },
  {
    verze: 'v9.31',
    datum: '2026-08-01',
    zmeny: [
      '🔗 S17.31 (Milan): vlozen ostry odkaz na STRIPE CUSTOMER PORTAL (sprava predplatneho – zruseni, zmena karty, faktury). Tim jsou vsechny platebni odkazy kompletni. Na testovaci domene se pouzije ostry portal (na rozdil od checkoutu tu nehrozi omylem provedena platba – portal je jen sprava, ne transakce).',
    ]
  },
  {
    verze: 'v9.30',
    datum: '2026-07-31',
    zmeny: [
      '💳 S17.30 (Milan): VLOZENY OSTRE STRIPE PAYMENT LINKY – zakladajici 99 Kc/mes a 990 Kc/rok (100 mist), bezne Premium 149 Kc/mes a 1490 Kc/rok, dobrovolny prispevek 20-500 Kc. Doplnena chybejici konstanta pro ZAKLADAJICI ROCNI variantu (990 Kc) vcetne obsluhy v startPremiumSubscription a v pocitadle mist ve workeru – zakladajici misto obsadi mesicni i rocni varianta.',
      '🐛 FIX-218 (S17.30, KRITICKE pro spusteni plateb): isLiveEnv() testoval jen Firebase domeny (financeflow-a249c.web.app / firebaseapp.com), ale ostry web bezi na FINANCEFLOW.CZ. Na produkci proto vracel false a appka nabizela TESTOVACI odkazy, ktere nejsou vyplnene → platba by na ostrem webu vubec nesla spustit. Doplnena domena financeflow.cz; getDonateLink() sjednocen na isLiveEnv() misto vlastni kopie podminky.',
      '🛡️ S17.30: kdyz na testovaci domene chybi testovaci odkaz, nabidne se prechod na ostry odkaz, ale s vyslovnym potvrzenim „bude to SKUTECNA transakce" – aby nikdo omylem nezaplatil pri vyvoji.',
      '💰 S17.30: goPremium() nyni nabizi u zakladajici ceny volbu mesicne 99 Kc / rocne 990 Kc, u bezne ceny 149 Kc / 1490 Kc, vcetne vycislene uspory.',
    ]
  },
  {
    verze: 'v9.29',
    datum: '2026-07-30',
    zmeny: [
      '🐛 FIX (S17.29, Milan – nalezeno na jeho dotaz): ADMIN NEMOHL ODEBRAT PREMIUM ani prodlouzit trial cizimu uzivateli. Uzel users/$uid mel „.write: auth.uid === $uid" BEZ admin vyjimky – admin tedy mohl vsechny ucty jen CIST, zapisovat smel pouze do sveho. Vsechny tri funkce (adminSetPremium, adminExtendTrial, adminRevokePremium) tise selhavaly na PERMISSION_DENIED. Doplneno „.write" s admin vyjimkou VYHRADNE na uzel premium – admin ZAMERNE nedostal pravo zapisovat do financnich dat uzivatelu (transakce, ucteny), to zustava jen jim.',
      '🚫 NEW (S17.29, Milan): BANOVANI UCTU. Novy top-level uzel banned/{uid} (zapis jen admin, uzivatel smi cist pouze svuj zaznam). Ban ZAMERNE lezi MIMO users/{uid} – zapisove pravo v Firebase kaskaduje dolu, takze uvnitr uzivatelova podstromu by si ho uzivatel mohl sam smazat a odbanovat se. V admin panelu tlacitko „🚫 Zablokovat / odblokovat ucet" s duvodem; pri prihlaseni se zablokovanemu uzivateli prekryje cela aplikace vysvetlujici obrazovkou s kontaktem. Data zustavaji v databazi nedotcena.',
    ]
  },
  {
    verze: 'v9.28',
    datum: '2026-07-30',
    zmeny: [
      '🔍 NEW (S17.28, Milan): ADMIN PANEL → nova zalozka „💳 Audit plateb". Porovnava aktivni Premium/Pro ucty proti SERVEROVEMU LOGU plateb a klasifikuje je: ✅ Zaplaceno (existuje zaznam z webhooku nebo stripeSubscriptionId), 🔵 Rucne (manuallySet – udelil admin), 🔴 PODEZRELE (ani jedno = obesel pravidla nebo vzniklo pred opravou v9.27). Dlazdice: pocty + „Prijato dle logu" (soucet castek k porovnani se Stripe Dashboard) + obsazenost zakladajicich mist. Hlida i anomalie: trial delsi nez 32 dni, premiumUntil dal nez rok.',
      '🧾 NEW (S17.28): NEMENNY AUDIT LOG plateb – uzel premiumLog/{uid} zapisuje POUZE Stripe webhook pres Database Secret (klient nema cteni ani zapis, pravidla: read jen admin, write vzdy false). Loguje se checkout, renewal i cancel vcetne castky, meny, priceId a Stripe ID. Diky tomu existuje serverovy zdroj pravdy nezavisly na tom, co je v users/{uid}/premium.',
    ]
  },
  {
    verze: 'v9.27',
    datum: '2026-07-30',
    zmeny: [
      '🔴 BEZPECNOSTNI FIX (S17.27, KRITICKE): uzivatel si mohl SAM ZAPSAT PREMIUM. Uzel users/$uid mel „.write: auth.uid === $uid" a v Firebase pravidla KASKADUJI shora dolu – jednou povoleny zapis uz nejde v hlubsim uzlu odebrat, takze users/{uid}/premium byl volne zapisovatelny z klienta. Kdokoli si mohl nastavit {type:"premium", premiumUntil: 9999...} a mit Premium zdarma navzdy. Reseno pres .validate (ta NEKASKADUJE): type smi byt z klienta jen „trial"/„free", premiumUntil jen do minulosti, trialUntil max +32 dni, trialUsed nejde vratit z true na false. Admin UID a Database Secret (webhook) maji vyjimku. Objeveno pri kontrole pred spustenim plateb.',
      '🛡️ S17.27: stejnou dirou slo resetovat aiUsage a obejit AI kvoty (primy naklad na Claude API). Doplnena validace users/$uid/aiUsage/$month/$type – hodnota smi jen RUST, nikdy klesnout.',
      '💎 NEW (S17.27, Milan): ZAKLADAJICI CENA 99 Kc/mes pro prvnich 100 uzivatelu. Reseno SAMOSTATNYM Payment Linkem nad cenou 99 Kc (ne kuponem – kupon po case vyprsi a cena by skocila na 149, zakladajici cena ma platit navzdy). Webhook pri platbe pres zakladajici price ID inkrementuje stats/founderCount; goPremium() pred nabidkou zjisti zbyvajici mista a nabidne zakladajici cenu, dokud jsou volna. Pocitadlo je verejne ke cteni, zapis jen pres Database Secret – uzivatel si nemuze zakladajici cenu vynutit resetem.',
    ]
  },
  {
    verze: 'v9.26',
    datum: '2026-07-27',
    zmeny: [
      '💳 NEW (S17.26, TODO-153, Milan): STRIPE WEBHOOK implementovan ve worker.js – nova route POST /stripe-webhook. Overuje Stripe-Signature (HMAC-SHA256 pres Web Crypto, timing-safe porovnani), zpracovava checkout.session.completed / invoice.paid / customer.subscription.deleted a zapisuje users/{uid}/premium do Firebase pres DB Secret. Mapovani stripeCustomerId→uid (uzel stripeCustomers, jen admin-read, write jen pres secret) resi renewal/cancel eventy, ktere nemaji client_reference_id.',
      '🔒 S17.26: database_rules.json – novy uzel stripeCustomers ($customerId): cteni jen admin, zapis vzdy false (Database Secret pravidla obchazi, klient se tam nikdy nedostane).',
      '🔗 S17.26: premium.js goPremium() nyni volá startPremiumSubscription (donate.js) misto placeholderu – nabidne mesicne/rocne a otevre Stripe Checkout. hasPremiumAccess() jiz spravne kontroluje premium/pro/trial – zadna zmena zamku nebyla potreba.',
      '⏳ ČEKÁ SE na Milana: vyplnit 5 Payment Link URL v donate.js (Premium mesicni/rocni test+live, portal) a nastavit Cloudflare Worker Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FIREBASE_DB_SECRET, volitelne STRIPE_PRICE_PRO_MONTHLY/YEARLY pro rozliseni Pro tarifu) + zaregistrovat webhook endpoint ve Stripe Dashboard.',
    ]
  },
  {
    verze: 'v9.25',
    datum: '2026-07-27',
    zmeny: [
      '🎯 FIX (S17.25, Milan): FINANCNI RADAR – sloupec „Budouci platby" byl na konci mesice PRAZDNY, protoze budouciGetAll vraci jen platby OD DNESKA dopredu. Nyni sloupec ukazuje PLAN ZA CELY MESIC (plna fialova) a ukazatel pod nim ZBYVAJICI castku, ktera behem mesice klesa k nule („zbyva X · Y %"). budouciGetAll doplnen o volitelny 3. parametr `fromDate` – misto duplikovani projekcni logiky se znovupouziva stavajici funkce s pocatecnim datem 1. dne mesice.',
      '🛡️ S17.25: vypocet CASHFLOW zamerne pouziva dal jen ZBYVAJICI platby (budToEOM), ne novy plan celeho mesice – jinak by se uz uhrazene platby zapocitaly dvakrat (jsou uz v „Planovanem vydeji"). Vyska sloupce a matematika jsou proto oddelene promenne (futureBar vs future).',
    ]
  },
  {
    verze: 'v9.24',
    datum: '2026-07-27',
    zmeny: [
      '📊 REDESIGN (S17.24, Milan): graf „OD VYPLATY K VYPLATE" – ZMET CAR jednotlivych cyklu ODSTRANENA (neslo to cist). Zustavaji siroke modre sloupce = TYDEN (median utraty), v rezimu „Po dnech" jsou uvnitr nich tenke CERVENE sloupecky = jednotlive DNY (median), a zelena krivka. Tydenni sloupec je dominantni, denni jen doplnujici.',
      '🐛 FIX (S17.24, Milan): zelena krivka „zbyva z vyplaty" ZACINALA NA NULE, prestoze cyklus zacina VYPLATOU. Pricina: kumulovalo se (prijem − vydaj) od nuly. Nove se krivka SEEDUJE prvni vyplatou cyklu a dal uz jen klesa o vydaje; dalsi prijem behem cyklu ji zvedne. Doplnen popisek hodnoty na zacatku i na konci krivky.',
      '📐 FIX (S17.24, Milan): osa Y se prekryvala s osou X – dolni hodnota se kreslila tesne u popisku tydnu. Dolni tick se nyni zobrazi jen kdyz je dost daleko od nuly, pridan odstup skaly.',
      '🧠 FIX (S17.24, Milan): DLUHOVY STRES INDEX – celkovy ukazatel zmensen podle vzoru „Vas financni trend" z Financniho obrazu (pruh 200 px, vystredeny, bily jezdec) misto pruhu pres celou sirku. Odkaz „Najdeme lepsi uver" skryt.',
      '🎯 FIX (S17.24, Milan): FINANCNI RADAR, graf „Kam smeruju" – hodnota skutecneho stavu presunuta z ramecku u teckovane cary POD SLOUPEC a NAD POPISEK (vlastni ramecek s tmavym pozadim), pridano misto pod sloupci. Puvodni cislo planu nad sloupcem zustava, teckovana cara zustava jako vizual.',
    ]
  },
  {
    verze: 'v9.23',
    datum: '2026-07-26',
    zmeny: [
      '🧠 REDESIGN (S17.23, Milan): DLUHOVY STRES INDEX – gauge prevzat ze stylu Financniho obrazu (jednoduchy barevny pruh s bilym ukazatelem misto puvodni „desive" skaly). Faktory uz nejsou dlouhy seznam pres celou sirku, ale KOMPAKTNI KARTY v mrizce: nahore vyhodnoceni („Kriticke"), pod nim nazev metriky, velka hodnota (126 %) a barevny bar se skore 20/20.',
      '📈 S17.23 (Milan): oba grafy ve Financnim obrazu ZVETSENY (680×250 → 900×330/340) a plne responzivni (max-width:100 % misto pevneho stropu) – na mobilu se roztahnou pres celou sirku.',
      '📊 REDESIGN (S17.23, Milan): graf „OD VYPLATY K VYPLATE" ma nyni DVA REZIMY: „📊 Po tydnech" (velke sloupce = MEDIAN utraty v tydnu cyklu, drive modra cara) a „📅 Po dnech" (1 sloupec = 1 den cyklu). Pres sloupce jsou slabe cary jednotlivych cyklu barevne odlisene a POPSANE MESICEM (leg/uno/bre…) – videt maximum, minimum i prubehy. Nove take ZELENA KRIVKA „zbyva z vyplaty" = prijmy minus kumulovane vydaje; klesa behem cyklu a vyskoci nahoru, kdyz prijde dalsi prijem. radarPastCycles doplnen o denni rozpad (daily/dailyInc).',
    ]
  },
  {
    verze: 'v9.22',
    datum: '2026-07-26',
    zmeny: [
      '🧭 REDESIGN (S17.22, Milan): graf „KAM SMERUJU – pristich 6 mesicu" – (1) pridan AKTUALNI MESIC jako prvni sloupec se SKUTECNYMI cisly (odlisen podbarvenim + popiskem „ted"), (2) POPISKY HODNOT nad sloupci, (3) hodnota cashflow v RAMECKU s tmavym pozadim (drive splyvala s grafem), (4) nova zluta prerusovana cara REZERVA (kumulovany zustatek) – Milan ji v grafu postradal, byla jen v horni karte a tooltipu, (5) osa Y s jednotkou, doplnena legenda.',
      '💬 NEW (S17.22, Milan): SLOVNI VYHODNOCENI vyhledu na 6 mesicu nad grafem – tri varianty podle vysledku (Smerujes spravne / Zlepsujes se, ale porad v minusu / Takhle to nevydrzi) s konkretnimi cisly rezervy dnes vs. za pul roku.',
      '📊 REDESIGN (S17.22, Milan): graf „OD VYPLATY K VYPLATE" prepracovan ze sloupcu (celkove vydaje cyklu, popisky datumu 1.1., 1.2.) na CAROVY PROFIL UTRACENI: osa X = 1.–5. TYDEN od vyplaty, kazda slaba cervena cara = jeden cyklus (posledni vyraznejsi), silna modra cara = MEDIAN tydne (odolnejsi nez prumer vuci jednomu extremnimu cyklu). Pod grafem slovni vyhodnoceni profilu (utracis hned po vyplate / ke konci cyklu / rovnomerne).',
      '📝 S17.22: upresnena vysvetlivka pod grafem – „Zname platby" jsou CASTI predikce vydaju (opakovane platby uz predikce obsahuje z historie), proto se k vydajum NEPRICITAJI; jinak by se pocitaly dvakrat.',
    ]
  },
  {
    verze: 'v9.21',
    datum: '2026-07-25',
    zmeny: [
      '🐛 FIX-217 (S17.21, Milan): SOUHRN VYDAJU se zobrazoval pod zalozkou PORADCE, kam nepatri. Guard `_reportPeriod!==\'advisor\'` sice existoval (S16.15), ale vetev Poradce konci EARLY RETURN uz na zacatku renderReport – k uklidu na konci funkce se nikdy nedostala. A protoze #reportSouhrn je SOUROZENEC #reportContent (ne potomek), prepsani obsahu Poradce ho nesmazalo → v DOM zustal stary souhrn z predchoziho renderu. Nyni se maze primo ve vetvi Poradce.',
      '🎨 LANDING (S17.21, Milan): novy nazev „FinanceFlow – Vas osobni financni radar" (title, OG, paticka). Pod hero pridana veta „Mejte sve finance pod kontrolou, protoze CO SLEDUJEME, MUZEME ZLEPSOVAT". Nova sekce nad hero: „Moderni aplikace bez kolacovych grafu. Nic takoveho jste jeste nevideli." + „Co zajimaveho si pro vas aplikace pripravila? Pojdme se na to spolecne podivat." Slogan „Nechceme prodavat funkce / Prodavame vysledky" nahrazen za „Mene hadani. Vice informovanych rozhodnuti."',
      '💰 LANDING (S17.21, Milan): novy cenik – Free 0, Premium 149 Kc, Pro 299 Kc; zakladajici cena Premium 99 Kc/mes pro PRVNICH 100 uzivatelu (drive 49 Kc / 500 uzivatelu). Aktualizovano vsude: nav badge, hero note, ceniikove karty, pocitadlo mist, FAQ i JSON-LD. U karty Pro odstranena preskrtnuta cena (byla shodna s novou).',
    ]
  },
  {
    verze: 'v9.20',
    datum: '2026-07-25',
    zmeny: [
      '🐛 FIX (S17.20, Milan): INFLACE – po vyberu polozek ve filtru se ukazalo „Zadne polozky pro tento filtr" bez vysvetleni. Pricina: polozky s JEDINOU cenou se z indexu uplne zahazovaly (nemaji s cim porovnavat). Nove se zobrazi zesvetlene se stitkem „jen 1 cena" – uzivatel vidi, ze polozku eviduje, jen zatim nelze spocitat zmenu. Do indexu nevstupuji.',
      '🔎 NEW (S17.20, Milan): INFLACE – nova karta „polozka NAPRIC OBCHODY" (zobrazi se pri vyberu prave jedne polozky ve filtru). Sloupce: prvni cena, posledni cena, BEZNA Ø (bez akce), AKCNI Ø (se slevou), za kg/l, pocet cen. Nejlevnejsi obchod oznacen stitkem. Odhali, kde polozku kupujes nejdraz a jestli je „akcni" cena skutecne nizsi nez bezna.',
    ]
  },
  {
    verze: 'v9.19',
    datum: '2026-07-25',
    zmeny: [
      '⚖️ NEW (S17.19, Milan): INFLACE – novy samostatny sloupec „ZA KG/L". U vazeneho zbozi je to primo jeho cena (ADR-059: u unit=kg je price uz Kc/kg), takze zdrazeni se poctive odhali, i kdyz uzivatel pokazde koupi jinou hmotnost. U baleneho zbozi jde o dopocet z hmotnosti v nazvu. Kdyz se cena za kilo meni jinak nez cena baleni (rozdil > 3 p.b.), zobrazi se primo v tabulce „⚠ shrinkflace" – drive bylo upozorneni jen jako drobny text pod nazvem a slo prehlednout. Overeno: Banan 29,90 → 39,90 Kc/kg (+33 %) i pri ruzne nakoupene hmotnosti; Kesu 150 g → 120 g pri stejne cene baleni = 0 %, ale +25 % za kilo → oznaceno jako shrinkflace.',
      '📝 POZNAMKA (S17.19): tuto logiku (hlavni cena + dopocet Kc/kg + detekce shrinkflace) uz aplikace mela ve zalozce ZDRAZOVANI (perUnitData, shrinkflation, pkgWeight v buildPricesTab). Karta Inflace ji implementovala znovu od nuly misto znovupouziti – proto se v ni objevily chyby FIX-215/216, ktere byly ve Zdrazovani davno vyresene. Do budoucna: pred psanim nove analyzy nad uctenkami zkontrolovat, zda stejny vypocet uz neexistuje.',
    ]
  },
  {
    verze: 'v9.18',
    datum: '2026-07-25',
    zmeny: [
      '🐛 FIX-216 (S17.18, Milan): INFLACE ukazovala u baleneho zbozi nesmyslne ceny („Rohlik 43g: 81 Kc") – prepocitavala VSECHNY polozky s hmotnosti v nazvu na Kc/kg. Rohliky se ale prodavaji na KUSY. Nove je hlavni metrikou CENA ZA BALENI (rohlik 2,90 → 3,50 Kc/ks), prepocet na Kc/kg se dela JEN u zbozi skutecne prodavaneho na vahu (it.unit = kg/l, napr. volne banany). U balenych polozek se Kc/kg pocita jako DOPLNKOVY udaj vedle ceny a slouzi k odhaleni SHRINKFLACE – kdyz se cena za kilo meni jinak nez cena baleni (rozdil > 3 p.b.), zobrazi se upozorneni „⚠ shrinkflace?". Index se pocita z ceny za baleni, tedy z toho, co uzivatel realne plati.',
    ]
  },
  {
    verze: 'v9.17',
    datum: '2026-07-25',
    zmeny: [
      '🚨 HOTFIX (S17.17): KRITICKA CHYBA z v9.15 – „ReferenceError: rows is not defined", cela aplikace nesla nacist. Pri refaktoru coicop.js do _coicopCardShell zustal v tele obalu puvodni radek `+ rows + unm + ...`, ktery odkazoval na promenne z puvodni funkce. node --check chybu neodhalil (syntakticky validni), projevila se az za behu. Radek odstranen, obe vetve (prazdny stav i s daty) otestovany runtime.',
      '🐛 FIX-215 (S17.17, Milan): INFLACE – nesmyslna cena „Rohlik 43g: 3 → 81 Kc (+2 707 %)". Pricina: stejna polozka se jednou nacte jako Kc/KS (3 Kc) a podruhe jako Kc/KG (81 Kc pri 43 g), ale klic polozky jednotku neobsahoval → porovnaly se navzajem. Klic nyni obsahuje jednotku, kazda rada je vnitrne konzistentni; ve filtru se jednotka zobrazuje.',
      '🔢 FIX (S17.17, Milan): sloupec KS v seznamu polozek ukazoval nezaokrouhlene desetinne cislo (napr. „2.533" u Bananu) a popisek „ks", prestoze soucet michal VAZENE zbozi (qty = kg/l) s KUSOVYM (qty = ks). Nyni zaokrouhleno na 1 desetinne misto, popisek „ks/kg" u smisenych polozek + tooltip s vysvetlenim.',
    ]
  },
  {
    verze: 'v9.16',
    datum: '2026-07-25',
    zmeny: [
      '📋 UX (S17.16, Milan): tlacitko „📊 Vse od zacatku" u karty NEJCASTEJI NAKUPOVANE POLOZKY nyni rozbali KOMPLETNI SEZNAM primo v teto karte – se vsemi sloupci (nakupy, ks, celkem Kc, Ø Kc/ks). Drive otviralo zvlastni kartu „Statistiky polozek – celkem od zacatku", ktera byla oriznuta na 30 radku („+56 dalsich polozek") a NEOBSAHOVALA pocet kusu ani cenu za kus. Seznam mel natvrdo limit 15 polozek – nove se pri rozbaleni zobrazi vse a obdobi se prepne na „vse". Opakovanym klikem zpet na TOP 15. Patickou lze seznam rozbalit i primo z vypisu.',
      '🗄️ S17.16: archiv itemStats z Firebase zustava dostupny jako odkaz v paticce kompletniho seznamu (uz se neotvira automaticky). POZNAMKA: Firebase itemStats neuklada celkovy pocet kusu (jen count nakupu, totalSpent, avgPrice + history poslednich 24 cen), proto je lokalni seznam z uctenek presnejsi.',
    ]
  },
  {
    verze: 'v9.15',
    datum: '2026-07-25',
    zmeny: [
      '🐛 FIX-214 (S17.15, Milan): COICOP karta „Co nakupujes – z uctenek" ZMIZELA po prepnuti na „📅 Tento mesic", kdyz v danem mesici nebyly zadne naskenovane polozky – funkce vracela prazdny retezec vcetne hlavicky, takze uz neslo prepnout zpet na „∞ Vse". Nove se vzdy vykresli hlavicka s prepinacem + prazdny stav (sdileny _coicopCardShell).',
      '🔍 UX (S17.15, Milan): filtry polozek prepracovany z CHIPU na ROZBALOVACI SEZNAM razeny ABECEDNE (pri desitkach polozek chipy zamorily stranku) – v „Vyvoj nakupu v case" i ve „Zdrazovani". Vybrane polozky zustavaji jako male odebiratelne stitky.',
      '🔗 FIX (S17.15, Milan): graf „Vyvoj cen v case" NEREAGOVAL na multifiltr Zdrazovani – kreslil vzdy top 5 dle zmeny. Nyni respektuje vyber (bez vyberu zustava top 5).',
      '📊 NEW (S17.15, Milan): „Vyvoj nakupu v case" – novy prepinac 📊 Mesicne / 📈 Kumulativne. Kumulace funguje pro OBE metriky (pocet kusu i suma Kc) a vykresluje se jako SLOUPCOVY graf (bezici soucet od zacatku obdobi, nikdy neklesa).',
      '🎨 FIX (S17.15, Milan): citelnost textu – var(--text3) nahrazen #a8aec8 v COICOP karte a v novych filtrech (nas standard: text3/text2 se nepouziva pro dulezity text na tmavem pozadi).',
    ]
  },
  {
    verze: 'v9.14',
    datum: '2026-07-25',
    zmeny: [
      '🐛 FIX-213 (S17.14, Milan – KRITICKE): KOMUNITNI PREHLED publikoval do `community/{mesic}/users` NAZVY KATEGORII ("Jidlo & Piti"), zatimco cteci strana ocekava COICOP ID (1-13) → mapovani na oficialni nazvy selhavalo a v prehledu se objevovalo "COICOP Jidlo & Piti". Nove se publikuji COICOP ID pres mapToCOICOP. Zaroven doplneno txCZK() + vylouceni splitParent/isBalancing/presunu (stejna trida chyby jako FIX-212) – cizi meny a presuny drive nadhodnocovaly komunitni prumer. Cteci strana preskoci stara necislena data.',
      '👥 NEW (S17.14, Milan): KOMUNITNI PREHLED – treti bar „👥 Komunita" v tabulce COICOP (poradi CSU prumer → Komunita → Vy). Data uz existovala v communityData.cats, jen se nezobrazovala.',
      '📐 FIX (S17.14, Milan): bary v COICOP tabulce nebyly zarovnane pod sebou – popisky mely min-width:52px, ale text „CSU prumer" je sirsi a bar odsouval doprava. Nyni pevna sirka 74px (popisek) a 64px (castka).',
      '✏️ S17.14 (Milan): prejmenovani karet, aby bylo jasne, odkud data jsou: „Vydaje podle COICOP skupin" → „🧾 Co nakupujes – z uctenek" (+ vysvetleni, ze nepokryva vydaje bez uctenky), „Moje vydaje dle COICOP vs. CSU prumer" → „🇨🇿 Jak utracis proti prumeru" (+ podtitul „ze VSECH transakci · mesicni prumer"), „Graf polozek / tagu" → „📈 Vyvoj nakupu v case".',
    ]
  },
  {
    verze: 'v9.13',
    datum: '2026-07-25',
    zmeny: [
      '🐛 FIX-212 (S17.13, Milan – KRITICKE): SROVNANI CR pocitalo `tx.amount` BEZ txCZK a BEZ vylouceni presunu/splitu/vyrovnani → cizi meny se scitaly v nominalu a presuny mezi penezenkami se tvarily jako vydaj. Srovnani s CSU bylo nadhodnocene. Opraveno i v mesicnim breakdownu.',
      '🐛 FIX-211 (S17.13, Milan): VYDAJE PODLE COICOP SKUPIN – prepinac mesicu nefungoval, protoze karta dostavala VZDY vsechny polozky (allItems bez filtru). Nove prepinac „📅 Tento mesic / ∞ Vse" + popisek vysvetlujici zdroj dat. Take opraven vypocet castky: preferuje se `lineTotal` (skutecne zaplaceno vc. slev) misto price×qty.',
      '📊 REDESIGN (S17.13, Milan): GRAF POLOZEK/TAGU prepsan na CAROVY graf dle standardu: souvisla rada mesicu na ose X s citelnymi popisky („Bre 26" misto „03"), osa Y s jednotkou (ks / Kc) a mrizkou, legenda, tooltipy na bodech, responzivni viewBox. Pridan MULTIFILTR polozek (chipy) – bez vyberu top 5 dle objemu. Vychozi obdobi 12 mesicu = tracker poctu kusu a utraty, ktery Milan chtel.',
      '💹 NEW (S17.13, Milan): ZDRAZOVANI – multifiltr sledovanych polozek (chipy s % zmenou); pri desitkach polozek byl vypis neprehledny.',
      '💡 NEW (S17.13, Milan): DETEKTOR USPOR – dva nove detektory: (1) 🍺 ALKOHOL & TABAK (nazvy transakci + polozky z uctenek, uspora 50 %), (2) 🛒 CASTY NAKUP – top 5 opakovane kupovanych polozek z uctenek za 3 mesice (min. 3 nakupy a 200 Kc), odhali tiche zrouty jako orisky, kava, sladkosti.',
      '📱 FIX (S17.13, Milan): v seznamu nejcastejsich polozek se „Kc" nevesla na radek (mobil) – nyni je castka na prvnim radku (clamp) a jednotka „Kc" mensim pismem pod ni.',
    ]
  },
  {
    verze: 'v9.12',
    datum: '2026-07-23',
    zmeny: [
      '🎨 REDESIGN (S17.12, Milan): karta REPORT – matice prepracovana do EXCEL-STYLU po SEKTORECH (drive vypadala jako dalsi obycejna statistika). Kategorie jsou nyni seskupene do sektoru dle COICOP oddilu CSU (Bydleni/energie, Potraviny, Doprava, Rekreace, Zdravi, Pojisteni…) – kazdy sektor ma BAREVNOU HLAVICKU pres celou sirku (ikona + nazev + barevny levy pruh), pod ni radky kategorii a ZELENY MEZISOUCET sektoru, uplne dole zluty CELKEM VYDAJE. Samostatny sektor 💳 SPLATKY z transakci navazanych na dluh (t.debtId, pojmenovano dle nazvu pujcky). Nahore nova mrizka „Sektory – rok" s podilem kazdeho sektoru v % a Kc.',
      '🎨 S17.12: nova CSS trida .report-matrix ve styles.css – hustsi radky, sticky hlavicka i prvni sloupec, hover zvyrazneni radku, mobilni zmenseni (680px).',
    ]
  },
  {
    verze: 'v9.11',
    datum: '2026-07-23',
    zmeny: [
      '🧮 NEW TODO-185 (S17.11, Milan): nova karta INFLACE (inflace.js) – vlastni inflace z uctenek. DVA indexy nad stejnymi daty: (1) YoY = median ceny za poslednich 12 mes vs. predchozich 12 mes, (2) PRVNI→POSLEDNI cena + jejich rozdil. Oba vazene podilem polozky na vydajich. Ceny se srovnavaji JEDNOTKOVE (Kc/kg, Kc/l, jinak Kc/ks) – resi i shrinkflaci (mensi baleni = vyssi Kc/kg). Tabulka inflace PODLE OBCHODU + tabulka polozek (prvni/posledni cena, zmena, YoY, pocet cen, obchody). Multifiltr obchody + polozky (s hledanim), razeni dle utraty / nejvic zdrazilo / zlevnilo / nejcastejsi. SLEVNENE polozky se znaci stitkem „slevneno" a ve vychozim stavu se do indexu NEPOCITAJI (prepinac) – akcni cena byva nekdy stejna nebo vyssi nez bezna. Premium/Pro.',
      '🎨 FIX (S17.11, Milan): PRETEKANI TEXTU nyni SYSTEMOVE ve styles.css (drive inline prebiti): .reality-big → clamp(.95rem,4.6vw,1.35rem), .hourly-big → clamp(1.7rem,9vw,2.8rem), .reality-metric/.reality-lbl overflow-wrap + min-width:0, .stat-value-h clamp rozsiren z 480px na 680px + overflow-wrap. Pridana globalni mobilni pojistka (min-width:0/overflow:hidden pro stat-card-h, reality-*, hourly-cost-card, bunky kalendare). Inline prebiti v debts.js ODSTRANENO, aby CSS platilo.',
    ]
  },
  {
    verze: 'v9.10',
    datum: '2026-07-23',
    zmeny: [
      '⏱️ FIX (S17.10, Milan): PRESCASOVY DEN nyni umoznuje vybrat TYP SMENY (ranni/odpoledni/nocni) – drive slo jen u bezne smeny, pritom rozdil je zasadni (nocni prescas = jiny priplatek). Nocni priplatek se pocita i u prescasoveho dne. V bunce kalendare se u prescasu zobrazi ⏱ + ikona smeny.',
      '📱 FIX (S17.10, Milan – audit z mobilu): PRETEKANI TEXTU/CASTEK opraveno na 5 mistech: (1) Pujcky – Kalkulacka dluhove reality: ekvivalenty (59× dovolenych / 22 654 kav / 64r prace) se prekryvaly → grid auto-fit + clamp; velka cisla (1 472 513 Kc) → clamp misto lamani. (2) Penezenky – Virtualni penezenka Cile: „23 26 7 Kc" se lamalo uprostred cisla → auto-fit grid + nowrap + ellipsis. (3) Simulace zivota – 3 scenare v pevnem 3-sloupcovem gridu pretekaly → auto-fit + clamp. (4) Detektor uspor – „20 000 Kc (limit 117 Kc)" pretekalo pres kartu → max-width 52 % + clamp + zalomeni. (5) Kalendar – bunky dne: „▲100 ▼3 820" s nowrap pretekalo do sousedni bunky → zalomeni na 2 radky + mensi pismo u velkych cisel + overflow hidden.',
    ]
  },
  {
    verze: 'v9.09',
    datum: '2026-07-21',
    zmeny: [
      '🔧 FIX-210 v4 (S17.9, Milan): auto-sablona NEPROPISUJE ZPETNE. Vyskyt tohoto mesice se doplni jen kdyz den splatnosti jeste NENASTAL (due >= dnes) – proaktivne. Kdyz den uz byl (pozde pridana sablona), nepropisuje se zpetne, jen se prenese na dalsi mesic (projekce).',
      '🗂️ NEW (S17.9, Milan): nova karta REPORT (report.js) v sekci Analyzy – matice roku dle Milanova Excelu. Premium/Pro funkce (showPagePremium + PREMIUM_PAGES). KOSTRA: tab Prehled (matice kategorie × Mesicni/Rocni/roky, barevne kodovani), tab Roky (rok × mesice heatmapa), taby Tento mesic + Kumulace roku = placeholdery pro dalsi kroky. Cte z transakci (txCZK, vyloucene split/balancing/transfer).',
    ]
  },
  {
    verze: 'v9.08',
    datum: '2026-07-21',
    zmeny: [
      '🔧 FIX-210 v3 (S17.8, Milan): auto-sablona doplni vyskyt TOHOTO mesice i kdyz den splatnosti teprve prijde (proaktivne, aby byl hned videt) – ne az po splatnosti. Pokryva i „datum pred dneskem".',
      '✅ FIX (S17.8, Milan): BUDOUCI PLATBY – budouci vyskyt (splatnost jeste nenastala) uz se NEoznacuje omylem „Zaplaceno" jen podle shody nazvu v mesici. Nove: budouci vyskyt = Zaplaceno JEN kdyz existuje transakce presne k tomu dni (jinak Nezaplaceno). Po splatnosti platí shoda na urovni mesice. Stitky Zaplaceno/Nezaplaceno jsou uzsi text bez prokliku, tlacitko „Zaznamenat" jen po splatnosti kdyz chybi.',
    ]
  },
  {
    verze: 'v9.07',
    datum: '2026-07-21',
    zmeny: [
      '🔧 FIX-210 v2 (S17.8, Milan): zruseno dohaneni na 35 dni zpet (matoucí). Auto-sablona nyni doplni JEN vyskyt tohoto mesice, pokud den splatnosti uz nastal (≤ dnes) a transakce chybi. Ošetreny kratke mesice (den 31 → posledni den v mesici). Idempotentne.',
      '✅ FIX (S17.8, Milan): BUDOUCI PLATBY – „Zaplaceno" prepracovano. Drive tlacitko svitilo naslepo i 2+ mesice dopredu (vypadalo jako uz zaplacene, hrozila duplicita). Nyni se stav ODVOZUJE ze seznamu transakci: zobrazuje se JEN v aktualnim mesici → „✓ Zaplaceno" (nalezena transakce), „Nezaplaceno" (pred splatnosti), nebo tlacitko „Zaznamenat" (po splatnosti a chybi → predvyplni transakci). Mensi provedeni. Budouci mesice bez ovladacu.',
    ]
  },
  {
    verze: 'v9.06',
    datum: '2026-07-21',
    zmeny: [
      '🐛 FIX-210 (S17.7, Milan): OPAKOVANE SABLONY s auto-vytvarenim se vytvorily JEN kdyz uzivatel otevrel appku PRESNE v den splatnosti (today.getDate()===den). Kdo se netrefil, vyskyt propadl a uz se nedohnal – sablona na 24. pridana 21. se v cervenci nevytvorila vubec. Nove CATCH-UP: pri nacteni se doplni vsechny splatne vyskyty za poslednich 35 dni (idempotentne dle markeru Auto-sablona + datum + nazev).',
      '⏱️ NEW (S17.7, Milan): PRESCAS jako samostatny typ dne v Pracovnim kalendari (prace navic MIMO smeny, v osobnim volnu). Ma vlastni hodiny, do mzdy se pocita CELY jako prescas (bonusOT), plati i vikend/svatek/nocni priplatky. Odliseno od hodin nad limit bezne smeny.',
      '🔄 NEW (S17.7, Milan): „🔄 + Sablona" primo v panelu TRANSAKCE (drive jen v sekci Opakovane sablony). Otevre stejny modal.',
      '🔴 NEW (S17.7, Milan): typ DLUH/SPLATKA v sablonovem modalu (chybel – byl jen Prijem/Vydaj/Presun). Vybere se konkretni dluh, splatka se uklada jako vydaj s debtId a auto-generovana transakce se svaze s dluhem (snizuje zustatek).',
    ]
  },
  {
    verze: 'v9.05',
    datum: '2026-07-20',
    zmeny: [
      '💼 FIX (S17.6, Milan): PRACOVNI KALENDAR – prescas byl „neviditelny": zadaval se implicitne pres pocet hodin nad smenu, ale nikde to nebylo videt. Doplnena rychla tlacitka „Bez prescasu / +1h / +2h / +4h prescas" + popisek „smena X h + prescas = celkem". Zadny novy typ dne – prescas se dal pocita z hodin nad limit smeny.',
      '✅ NEW (S17.6, Milan): BUDOUCI PLATBY – tlacitko „✓ Zaplaceno" u kazde platby s odhadem (vydaje+presuny, ne narozeniny/cile). Otevre formular transakce s predvyplnenou castkou/nazvem/datem/typem – uzivatel jen potvrdi (budouciMarkPaid). POZOR: budouci platby jsou dnes jen PROJEKCE, nic se nezapisuje automaticky – potvrzeno Milanovi, plna auto-materializace = TODO-190.',
    ]
  },
  {
    verze: 'v9.04',
    datum: '2026-07-20',
    zmeny: [
      '🐛 FIX-209 (S17.5, Milan): PRACOVNI KALENDAR – prescas nesel nastavit: desetinna CARKA (mobil) v poli hodin dala NaN → tichy fallback na hodiny/smenu → prescas se neulozil. Pole nyni prijima carku i tecku (inputmode=decimal) + zivy hint „z toho prescas: X h". Vsech 5 zapisovacu S.workCal sjednoceno na _workSave (zachovava vsechna pole konfigurace).',
      '💰 NEW (S17.5, Milan): HODINOVA MZDA – nova karta v Pracovnim kalendari: odpracovano − neplacene prestavky = placene hodiny; efektivni hodinovka (vyplata ÷ placene hodiny) + zakladni sazba ocistena o priplatky (vyplata ÷ vazene hodiny). Priplatky vikend/svatek/nocni/prescas v % (default 10/100/10/25) v Nastaveni uvazku + prestavka min/den + cista vyplata. Ceske svatky vc. Velikonoc automaticky (computus), svatek ma prednost pred vikendem.',
      '👛 NEW (S17.5, Milan): VYCHOZI PENEZENKA + TYP PLATBY – v Nastaveni (za Prevodni menou) lze zvolit vychozi penezenku a typ platby; u nove transakce se VIDITELNE predvyberou ve formulari (zadne tiche prirazovani na pozadi), kdykoli zmenitelne. Ulozeno v _settings (uzel users/{uid}/settings).',
    ]
  },
  {
    verze: 'v9.03',
    datum: '2026-07-20',
    zmeny: [
      '💤 NEW TODO-183 (S17.4, Milan): USLY ZISK – nova karta ve Financnim obrazu: penize, ktere jen lezi bez zhodnoceni. Kazda penezenka ma vlastni urok p.a. (default 0 %), referencni sazba sporaku editovatelna (1-4 %), operacni rezerva (Kc) se odecita – ta lezet MA. Usly zisk = zustatek × (referencni − vlastni urok), soucet rocne + mesicne. Konfigurace v S.idleCfg (pridano do save schematu app.js: snapshot, offline, _DW_META, _dwMetaObj).',
      '🐛 FIX-207 (S17.4, Milan): TAGY – klik na tag vedl na prazdne transakce: stranka Tagy agreguje NAPRIC vsemi mesici, ale filtr bral jen zvoleny mesic. filterByTag nyni zapina checkbox „Hledat ve vsech mesicich".',
      '🐛 FIX-208 (S17.4, Milan): skryte karty Dashboardu (pruvodce, mesicni checklist) nesly obnovit – chybelo tlacitko Zobrazit. Nove v Nastaveni → Data & Soukromi → „Obnovit skryte karty na Dashboardu" (smaze ff_onboardHide2 + ff_mChkHide_*).',
    ]
  },
  {
    verze: 'v9.02',
    datum: '2026-07-19',
    zmeny: [
      '🔄 UX (S17.3, Milan): prohozeny ikony – Predikce ma nyni 🔮 (fialova koule), Simulace zivota 🧭.',
      '📅 NEW TODO-184 (S17.3, Milan): SEZONNOST PO KATEGORIICH – tabulka pod grafem Sezonalita (Predikce): radky kategorie, sloupce Led-Pro, bunka = % NAD nejlevnejsim mesicem kategorie (min = zaklad, jako Milanuv Excel), heatmap zelena→cervena, tooltip s Ø castkou, sloupec min (Kc). Prumer pres vsechny roky s daty, kategorie s <3 mesici dat se preskakuji.',
      '🎯 NEW TODO-186 (S17.3, Milan): PRESNOST PREDIKCE – nova 4. zalozka v „Graf predikce – cely rok": tracking mesic po mesici. Snimek predikce (vydaje+prijem) se AUTOMATICKY zafixuje pri vstupu do noveho mesice (denikAutoSnapshot, 1× per mesic, ne u partnera, vyzaduje historii), na konci mesice srovnani se skutecnosti: tabulka Predikce/Skutecnost/Odchylka (zelena ±10 %, zluta ±25 %, cervena vic) + Ø odchylka (MAPE) pres uzavrene mesice. Zdroj dat = snimky Deniku (rucni 🖋 i auto se sdilenym _denikBuildSnap).',
    ]
  },
  {
    verze: 'v9.01',
    datum: '2026-07-19',
    zmeny: [
      '🎨 FIX (S17.2, Milan): RADAR „Kam smeruju" – ramecky se skutecnym stavem uz nekazi graf: na desktopu jsou VEDLE sloupce (prvni dva vpravo od bodu cary, posledni dva vlevo, aby nepretekly z karty). Na mobilu zustavaji uvnitr grafu nad bodem; u bodu blizko stropu (vysoka hodnota) se presunou POD bod, aby nelezly na cisla sloupcu.',
    ]
  },
  {
    verze: 'v9.00',
    datum: '2026-07-19',
    zmeny: [
      '🧭 MENU REDESIGN (S17.1, Milan): sidebar reorganizovan do 11 sekci – PREHLED (Dashboard, Transakce, Kalendar, Budouci platby, Bank, Tagy, Komunitni prehled), MAJETEK (Financni aktiva, Pujcky), PLANOVANI (Predikce, Radar, Obraz, Detektor uspor, Projekty, Nakupni seznam, Narozeniny), AI ASISTENT, ANALYZY (Mesicni report, Grafy, Statistiky, Denik), NASTROJE (Simulace zivota, Kurzy men), RODINA, SPRAVA, IMPORT DAT, BETA (jen admin), ADMIN SEKCE.',
      '📋 S17.1 (Milan): Souhrn vydaju SKRYT pro uzivatele (presunut do sekce BETA, jen admin) – obsah je uz soucasti Mesicniho reportu.',
      '📊 S17.1 (Milan): MESICNI REPORT – slovni vyhodnoceni (co se povedlo/nepovedlo) presunuto NAD tabulku Souhrnu vydaju.',
      '🎨 S17.1 (Milan): vyhodnoceni kategorii kompaktne – misto celoradkovych karet responzivni grid dlazdic (2-4 vedle sebe): ikona + nazev + % na prvnim radku, usetrena/prekrocena castka + srovnani mensim pismem pod tim.',
    ]
  },
  {
    verze: 'v8.99',
    datum: '2026-07-18',
    zmeny: [
      '🌐 LANDING v2.1 (S16.16, Milanova zpetna vazba): (1) Galerie „Podivej se dovnitr" ZRUSENA – screenshoty presunuty DO KONTEXTU: den-po-dni → sekce 30 dni, vyvoj skore → Vysledky, stres index → za tabulku „Proc nestaci banka", kalendar → „Je FinanceFlow pro tebe?". Vetsi aranzma (max 1020px, stin, popisek na stred). (2) DUPLICITNI sekce zakladatele smazana – puvodni „Proc FinanceFlow vznikl" dostala spojeny autenticky pribeh (Excel → strop → 4 mesice), odznaky zustaly. (3) Smyslena skore-karta (82, „Lepsi nez 71 % lidi v CR", falesne sdileni) NAHRAZENA realnym screenshotem rozpadu skore 0-310 + poctivy text (sest slozek, anonymni komunitni prehled). (4) FAQ vraceni penez dle Milana: do 14 dnu POMERNA cast ceny za nevyuzitou dobu (details i JSON-LD).',
    ]
  },
  {
    verze: 'v8.98',
    datum: '2026-07-18',
    zmeny: [
      '🌐 LANDING v2 (S16.16, Milan + strategicka diskuze): (1) OG/Twitter meta + og.jpg – sdileni do skupin uz ma nahled. (2) Hero: podtitulek „Nahrad Excel, poznamky a odhady jednim financnim dashboardem" + Milanova niche veta (pro lidi co chteji z financi vytezit maximum a sledovat progress). (3) NOVA SEKCE „Podivej se dovnitr" – 4 screenshoty aplikace (vyvoj skore 61→96, den po dni s volne-utratit, kalendar, stres index; WebP 9-21 KB). (4) SMYSLENE RECENZE ODSTRANENY (nekala praktika – cerna listina) → nahrazeny autentickym pribehem zakladatele (Excel → 4 mesice vyvoje). (5) NOVA SEKCE „Je FinanceFlow pro tebe?" – 8 otazek dle Milana + CTA. (6) NOVA SEKCE FAQ – 6 otazek (bezpecnost, banky, data/GDPR, AI, cena, zruseni) + FAQPage JSON-LD schema pro SEO. (7) Konkretni priklady do sekce financni slepoty + CTA za sekci 30 dni. Nove soubory: img/screen-*.webp (4×), img/og.jpg.',
    ]
  },
  {
    verze: 'v8.97',
    datum: '2026-07-16',
    zmeny: [
      '🖱️ FIX-205 v3 (S16.15, Milan): KATEGORIE preskladavani – redirect guard ZRUSEN (zpusoboval „hybe se porad ta sama kategorie"). Nove DRAG & DROP: uchyt ⠿ vlevo na karte, tahnutim presunes v ramci sekce (modra linka ukazuje kam), sipky zustavaji (mobil) a delaji presne to, na co kliknes + zvyrazneni presunute karty.',
      '🔍 FIX-206 (S16.15, Milan): checkbox „Hledat ve vsech mesicich" fungoval JEN se zadanym textem/tagem. Nyni plati samostatne – zaskrtnuti = vsechny transakce, ostatni filtry (kategorie, projekt, penezenka…) se aplikuji normalne.',
      '📊 EXPLAIN+FIX (S16.15, Milan – „proc 75 vs 83?"): banner Ø skore drive prumeroval jen ZOBRAZENE dlazdice (jen s vydaji > 0, vc. sporicich), slozka Rozpoctove prumeruje VSECHNY limitovane vydajove kategorie i s nulou (limit dodrzen → 100). SJEDNOCENO: banner nyni pocita ze stejne mnoziny jako Rozpoctove (tooltip vysvetluje) → cisla si sedi.',
      '🖼️ FIX (S16.15, Milan): PORADCE – rozmazane grafy (Cashflow 12M, Struktura vydaju): canvas bez devicePixelRatio → render v nativnim rozliseni (dpr scale) + fonty 9→10px. Ostre na HiDPI.',
      '🐛 FIX (S16.15, Milan): pod PORADCEM se omylem zobrazoval Souhrn mesicnich vydaju (hook z v8.95 nerozlisoval advisor rezim). Nyni jen v rezimu Mesic.',
      '📝 NEW (S16.15, Milan): SLOVNI VYHODNOCENI (vydaje vs minuly mesic, co se povedlo / kde prestreleno) nove i v MESICNIM REPORTU pod tabulkou souhrnu (renderSuhrnReport s cilovym kontejnerem).',
    ]
  },
  {
    verze: 'v8.96',
    datum: '2026-07-15',
    zmeny: [
      '🐛 FIX-204 (S16.14, Milan): TX FILTRY se resetovaly na Vse pri prepnuti mesice – renderTxPage prestavoval <option> vsech selectu bez zachovani hodnot. Nyni se hodnoty (kategorie, podkategorie, projekt, penezenka, typ platby) zachyti a VRATI → filtr drzi pres mesice i navraty na stranku.',
      '📊 NEW (S16.14, Milan): MESICNI REPORT – banner pod Financni zdravi dle kategorii: Sledovanych kategorii N (s limitem, z M s vydaji) · Splneno X/N v limitu (barva dle plneni) · Skore prumer (barva dle healthColor).',
      '🎨 UX (S16.14, Milan): citelnost cisel v barech dlazdic – bila zanikala na zelenem podkladu → tucnejsi pismo (.7rem/800), tmavy obrys (text-stroke) + silnejsi stiny. Citelne na zelene, zlute i cervene.',
      '🔀 UX (S16.14, Milan): SOUHRN VYDAJU – poradi sloupcu: MINULY mesic prvni, TENTO mesic druhy (cteni zleva doprava v case). Plati na strance Souhrn i v Mesicnim reportu.',
      '📖 FIX (S16.14, Milan): DENIK mel DVA neprepojene prepinace mesice (globalni hlavicka + vlastni ‹ ›) → vlastni ZRUSEN, Denik jede z globalniho prepinace (S.curMonth). denikNav odstranen.',
      '🐛 FIX-205 (S16.14, Milan): KATEGORIE sipky – guard z FIX-183 byl CASOVY (900 ms), pri pomalejsim klikani vyprsel a klik trefil jinou kategorii (typicky u Prijmu na vrchu stranky, kde scroll kompenzace narazi na okraj). Nyni POHYBOVY: presmerovani na presouvanou kategorii plati, dokud uzivatel nepohne mysi (>14 px) nebo nescrolluje kolecko.',
    ]
  },
  {
    verze: 'v8.95',
    datum: '2026-07-15',
    zmeny: [
      '🐛 FIX (S16.13, Milan): filtracni panel UTIKAL MIMO OBRAZOVKU (posledni filtr vpravo) – nyni se posledni dva panely prichytavaji k prave hrane (right:0) + max-width dle sirky okna.',
      '🔀 UX (S16.13, Milan): GRAFY – nove poradi zalozek: Obecne · Denni · Mesicni · Rocni · Vsechny roky. Filtr PROJEKTY skryt v Dennim (a Obecnem) – tam nedava smysl, zustava od Mesicniho vyse.',
      '🔮 NEW (S16.13, Milan): SOUHRN VYDAJU – novy sloupec PREDIKCE (ocekavany vydaj mesice dle historie a sezonnosti, stejny model jako Predpoved) vc. % odchylky nad/pod ocekavanim, u kategorii, podkategorii i v souctovem radku.',
      '📋 NEW (S16.13, Milan): SOUHRN VYDAJU PRESUNUT do MESICNIHO REPORTU (je to mesicni vysledek) – karta se zobrazi v rezimu 1 mesic (u viceMesicnich obdobi by srovnani „tento vs minuly mesic" matlo). Puvodni stranka Souhrn zustava. Nova funkce renderSouhrnInto(targetId).',
      '🐛 FIX (S16.13): renderSouhrn porusoval nase pravidla – scital t.amount BEZ txCZK (cizi meny spatne) a nevyloucil PRESUNY (pocitaly se jako vydaj). Opraveno.',
    ]
  },
  {
    verze: 'v8.94',
    datum: '2026-07-13',
    zmeny: [
      '🐛 FIX-203 (S16.12, Milan): ZASKRTAVATKA v Grafech – po zakliknuti polozky dole v seznamu KURZOR/SCROLL VYSKOCIL NAHORU. Pricina: _gfToggle volal renderGrafFilters() = prepis celeho HTML panelu → nove elementy → scroll reset. Nyni se panel NEPREKRESLUJE: aktualizuji se jen popisky tlacitek (_gfSyncLabels) a pri zmene kategorii jen panel podkategorii. Scroll zustava kde byl.',
      '📁 NEW (S16.12, Milan): GRAFY – filtr PROJEKTY (4. tlacitko, multi-select). Filtruje transakce dle t.projectId → naklady projektu ve vsech zalozkach (Mesicni/Rocni/Vsechny roky/Denni).',
      '📊 NEW (S16.12, Milan): GRAFY – nova zalozka DENNI: mrizka malych sloupcovych grafu, jeden na kategorii (dle Milanova Excelu), denni vydaje 1-31, razeno dle objemu. Prepinac VLASTNI vs SPOLECNA osa Y (porovnatelnost), navigace mesicu, tooltipy na sloupcich, statistika (pocet dnu s vydajem, max den). Respektuje filtry.',
      '🗂️ NEW (S16.12, Milan): VSECHNY ROKY – nova MATICE KATEGORIE × ROKY se sumarem (dle Milanova cashback Excelu): radek = kategorie, sloupec = rok, posledni sloupec Celkem + posledni radek Σ Suma. Heatmapa (sytejsi = vyssi vydaj), sticky prvni sloupec. Puvodni tabulka rok × mesic zustava pod ni.',
    ]
  },
  {
    verze: 'v8.93',
    datum: '2026-07-13',
    zmeny: [
      '📍 NEW (S16.11, Milan): FINANCNI RADAR „Kam smeruju" – teckovana cara (skutecny stav ted) ukazovala jen VIZUALNI polohu bez cisel. Nyni ma u kazdeho bodu ramecek s CASTKOU + % z odhadu konce mesice (napr. „33 609 · 42 %").',
      '🐛 FIX-201 (S16.11, Milan): PREDIKCE – graf SEZONALITY mel na ose Y pevny krok 10 % → pri velkem rozptylu (mesic s 400 %) desitky popisku pres sebe = necitelna smouha. Nyni ADAPTIVNI krok (max ~7 popisku) + vzdy referencni cara 100 %.',
      '🐛 FIX-202 (S16.11, Milan): 3 GRAFY v transactions.js UNIKLY AUDITU interaktivity (Predikce: kumulativni, sezonalita, tempo) – zadny nemel TOOLTIP. Doplneny tooltipy (hover+dotyk) vc. srovnani a % odchylky; osy predikcniho grafu z necitelneho #7e84a0/8px na #a8aec8/10px.',
      '🔤 T3 (S16.11): TYPOGRAFIE DOKONCENA – 101 mist kombinovalo slabou barvu var(--text3) s malym pismem (audit: ~90). Vsechna prebarvena na #a8aec8 (projects 28, admin 34, debts 20, ui 12, nakup 3, premium 2, assets 1, kalendar 1). Zbyva 0. Tim jsou T1–T4 hotove.',
      '📝 NEW (S16.11, Milan): NAKUPNI SEZNAM – prepinac JEDNODUCHY REZIM (📝): jen zaskrtavatko, nazev a cena; bez ikon, slev, referenci a tlacitek. Preference ulozena lokalne (ff_nakupSimple).',
      '📊 NEW (S16.11, Milan): DENIK v2.1 – prepinac grafu: „Kumulativne" (puvodni) vs „DENNI NAKUPY" (sloupcovy graf kolik utraceno kazdy den, prumer utracenych dnu, tooltipy, statistika dnu bez utraceni + nejdrazsi den). Inkoustovy styl knihy.',
    ]
  },
  {
    verze: 'v8.92',
    datum: '2026-07-13',
    zmeny: [
      '🔴 FIX-200 KRITICKY (S16.10, Milan): KONSOLIDACE nesloucila puvodni pujcky – nova konsolidovana se jen PRIDALA vedle nich → CELKOVY DLUH SE ZDVOJIL (a s nim DTI, DSTI, splatky, stres index), dokud si uzivatel puvodni rucne nesmazal (aplikace ho na to jen upozornila hlaskou). Nyni konsolidace puvodni pujcky UZAVRE (remaining=0, closed, closedReason=consolidated, consolidatedInto) → zmizi ze vsech vypoctu, zustanou v historii. Nova pujcka nese consolidatedFrom. Overeno: dluh pred = dluh po.',
      '📊 FIX-199 (S16.10, Milan): AVALANCHE vs SNEHOVA KOULE – grafy se „temer nehybaly", protoze horni graf kreslil KUMULATIVNI UROKY, kde je rozdil strategii <2 % (u portfolia s dominantni hypotekou opticky nulovy). Nahrazeno grafem ZBYVAJICIHO DLUHU (viditelny prubeh i efekt kaskady). Tie-break v razeni: pri shodne sazbe rozhoduje zustatek (a naopak) – drive nedeterministicke.',
      '🔗 NEW (S16.10, Milan): Oba grafy simulatoru PROPOJENY svislicemi – zelena prerusovana cara v okamziku splaceni kazde pujcky (Avalanche) prochazi OBEMA grafy na stejne X pozici, s casovym popiskem a tooltipem (nazev pujcky + kdy). Vysvetlivka: v tom okamziku se splatka „vali" na dalsi dluh → dluh pak klesa strmeji, schod dolu = o pujcku min. focusCurve zarovnana s ostatnimi krivkami (mela o 1 prvek min).',
    ]
  },
  {
    verze: 'v8.91',
    datum: '2026-07-12',
    zmeny: [
      '🛡 FIX (S16.9, Milan): sanitizeUserData – RTDB vraci uzel jako POLE, pokud jsou klice souvisla cisla od 0 (legacy transakce pred genTxId/FIX-056 mely jednoducha cisla 0,1,2…). Pripadna MEZERA v teto stare rade (drive smazana transakce) by se objevila jako null prvek pole a driv se neodfiltrovala, pokud data prisla uz jako pravé pole (jen u object-tvaru se filtrovalo). Nyni se null polozky filtruji VZDY, pri obou tvarech. Preventivni fix – Milan reportoval 0/1/…/177 klice po migraci v8.88, coz je ocekavane chovani RTDB, ne chyba migrace.',
    ]
  },
  {
    verze: 'v8.90',
    datum: '2026-07-12',
    zmeny: [
      '🧪 NEW (S16.8): SMOKE-TESTY SKORE (tests/smoke.js) – 3 fixni profily (zadluzeny/zdravy sporic/novacek), overuji prijem 12M, stres index vc. rozpadu (DSTI/DTI/emergency) + invarianty (0-100, zadny faktor nad vahu). Baseline rucne overen proti vzorcum. Bezi v sandboxu pred kazdym odevzdanim scoring zmen – Milan jen vidi „smoke-testy ✅".',
      '🔧 REFACTOR (S16.8): computeStressIndex(D) EXTRAHOVAN z renderDebtStressWidget (S11 princip vypocet/render) – pouziva render, Denik i testy. Zadna zmena vypoctu (testy to hlidaji).',
      '📖 NEW (S16.8): DENIK v2.1 – snimek uklada i DLUHOVY STRES (stressRaw); prava stranka ukazuje zivy stres s rozdilem vs snimek (zeleny/cerveny inkoust). Na spodnim listu novy radek OD VYPLATY K VYPLATE: aktualni cyklus (X. den), vydaje, tydeni rozpad, ~dni do vyplaty.',
      '⚡ PERF (S16.8): SEZNAM TRANSAKCI – postupne vykreslovani po 120 radcich (IntersectionObserver, doscrollovani prinacte dalsi; fallback tlacitko). Velke mesice/vyhledavani pres vsechny mesice uz nezamrazi mobil. Reset pri zmene mesice/filtru/razeni.',
    ]
  },
  {
    verze: 'v8.89',
    datum: '2026-07-12',
    zmeny: [
      '📊 T1 (S16.7, typograficky audit): ROCNI GRAF a VSECHNY ROKY dle norem – oba boxploty + rocni carovy graf maji TOOLTIPY (hover/dotyk: Min/Q1/Median/Prumer/Q3/Max, u rocnich souctu i % vs predchozi rok; prekresleni ze snimku platna – zadne re-rendery). Osy a popisky #a8aec8, roky #e8eaf2.',
      '🔤 T4 (S16.7): sjednoceni canvas fontu – osy/popisky 10px Instrument Sans vsude (drive mix 9/9.5px + sans-serif).',
      '🔎 T2 (S16.7): SUB-10px CISTKA – 0 vyskytu pisma pod .62rem v cele aplikaci: 8 cilenych mist (kalendar ▲▼, zvonek, COICOP badge 20px, debts ctverecky, skore /310, projects, ribbon) + blanket .6rem→.66rem (23 vyskytu vc. ui/ai/app.html). ai.js bez verzni hlavicky (legacy) – zmena jen obsahova.',
    ]
  },
  {
    verze: 'v8.88',
    datum: '2026-07-11',
    zmeny: [
      '⚡ ARCHITEKTURA (S17, ADR-062): DIFF-WRITE – konec zapisovani cele databaze pri kazde zmene. saveToFirebase nyni posle jen ZMENENE (automaticky diff proti poslednimu ulozenemu stavu – nemuze minout zadnou mutaci). Transakce → objekt data/transactions/{id}, pridani/edit/smazani = 1 klic ~1 KB misto ~1,5 MB (~1500× mene). Zmena nastaveni/kategorie transakce vubec neprepisuje. Meta sekce jen dirty. Migrace lazy (prvni ulozeni = plny v2 zapis + schemaV:2 + jednorazova zaloha data/dataBackupV1). Cteni zatim postaru (onValue celeho uzlu) – bezpecny mezikrok, S18 doplni query 12M + child listenery.',
      '🔁 COMPAT (S17): sanitizeUserData normalizuje transakce object→pole pri KAZDEM nacteni → 33 modulu pracuje beze zmeny (S.transactions zustava pole v pameti). Partner/export/IDB snapshot funguji.',
      '🔒 FIX (S17): onValue handler dostal sanitizaci (v8.86 ji minul – patchovala se jina varianta Object.assign). Real-time sync tak nyni take strip <> + normalizace.',
      '🛡 RULES v2 (S17): data/transactions/$txId – validace delek name (<300) a note (<1000) = per-transakcni obrana proti XSS payloadum a cost-abuse (u monolitu neslo). Tolerantni (neblokne migraci).',
    ]
  },
  {
    verze: 'v8.87',
    datum: '2026-07-11',
    zmeny: [
      '🎯 FIX (S16.6, AUDIT P2-2, Milan): Dluhovy stres index – Emergency Fund byl jen hotovost/ucty. Ted = hotovost + LIKVIDNI REZERVA (sporici ucet, terminovany vklad – assetTier reserve). VYLOUCENO: investice (akcie/ETF – mid) a DLOUHODOBE vc. PENZIJKA/DIP (fixed – assets.js uz je tam radi automaticky). Jmenovatel = celkove mesicni vydaje (pokryva i splatky, pokud jsou vedene jako vydajova transakce) → „kolik mesicu prezijes bez prijmu". Popis aktualizovan i v konfiguracnim Excelu.',
    ]
  },
  {
    verze: 'v8.86',
    datum: '2026-07-11',
    zmeny: [
      '🔒 SECURITY (S16.5, AUDIT P0-1): CROSS-USER XSS – sanitizace uzivatelskych retezcu PRI NACTENI dat (sanitizeUserData v helpers.js): nazvy/poznamky transakci, kategorii, penezenek, dluhu, aktiv, projektu, sablon, prani, narozenin, nakupu i poznamek kalendare se zbavi < > (v pameti, vlastni i PARTNEROVA data – app.js 5 vstupnich mist vc. partnerData). Pokryva vsech ~50 mist renderu najednou.',
      '🍪 GDPR (S16.5, AUDIT P0-2): LANDING index.html – Consent Mode v2 default denied (drive GA4 sbiral bez souhlasu) + cookie lista (Povolit analytiku / Jen nezbytne), sdileny klic ff_cookie_analytics s aplikaci.',
      '⚡ PERF (S16.5, AUDIT P0-3): ADMIN Uzivatele – uz nestahuje CELE users.json (u tisicu uzivatelu cela DB). Shallow UID seznam + per-uid profile/premium/referral/aiUsage + pocet transakci pres shallow (pool 8). lastActivity docasne = premium.createdAt (presna aktivita s ADR-061/062).',
      '🛡 RULES (S16.5, AUDIT P1-2): database_rules.json – leads a affiliate nove CREATE-ONLY (auth != null && !data.exists()) + validace delek poli u leads. Hloubkova validace data uzlu prijde s ADR-062.',
      '📴 FIX (S16.5, AUDIT P1-3): Service Worker – app.html pridan do SHELL; offline fallback dle cesty (/app* → app.html, jinak landing). FIX: navigace se driv VSECHNY ukladaly pod klic index.html → navsteva /app prepisovala cache landingu appkou.',
      '🐛 FIX (S16.5, AUDIT P2-1): Dashboard posledni transakce – fmtP(t.amt) → fmtP(t.amount||t.amt||0) (stare transakce ukazovaly 0).',
      '📝 TODO-176 (Milan): NEprejmenovavat Financni radar – nesoulad nazvu „Kam smeruju" (Radar = konec mesice, Obraz = 6M predikce) ponechan, probrat pozdeji.',
    ]
  },
  {
    verze: 'v8.85',
    datum: '2026-07-11',
    zmeny: [
      '🐛 KRITICKY FIX (S16.4, AUDIT P1-1): GRAFY – getGrafTxs nefiltroval splitParent/isBalancing (SPLITY SE POCITALY DVOJITE) a prenosy se pocitaly jako vydaje; vsechna scitani (denni, median, statistiky, rocni, vsechny roky, Tempo) pouzivala t.amount BEZ prevodu men → EUR/GBP castky spatne. Nyni: povinne filtry + txCZK vsude (7 mist). Tempo vydaju = ciste vydaje vzdy (bez presunu).',
      '🎛 NEW (S16.4, Milan): GRAFY – MULTI-SELECT filtry: kategorie, podkategorie i typ se nove ZAKLIKAVAJI (checkboxy, chips s poctem). Typ rozsiren o PRESUNY (🔁). Prazdny vyber = vse; posledni typ nejde odskrtnout. Podkategorie = sjednoceni zvolenych kategorii, neplatne se automaticky procisti.',
    ]
  },
  {
    verze: 'v8.84',
    datum: '2026-07-08',
    zmeny: [
      '📈 CHANGE (S16.3, Milan): TREND ve Financnim obrazu – regrese (v8.82) nahrazena metodou Ø POSLEDNICH 3 vs Ø PREDCHOZICH 3 mesicu (sipka + %). Citelne, prumery tlumi sum, konzistentni s Inflaci zivotniho stylu. Zakladna <1000 Kc → absolutni Kc misto % (deleni ~nulou). Radek v tabulce prejmenovan na „Trend 3v3". Priklad Milanova Momenta: Ø 9 652 → 14 336 = ↑ +49 %.',
      '📖 NEW (S16.3, TODO-174): DENIK v2 – vizual STARODAVNE KNIHY: kozena vazba, pergamenove stranky s patinou, hrbet uprostred, patkove pismo, inkoustove barvy (zeleny/cerveny/fialovy inkoust). Spodni list = graf DEN PO DNI: kumulativni PRIJEM + VYDAJE (skutecnost) vs PREDIKCE vydaju (snimek), tooltipy s % odchylkou. Tlacitka v dobovem stylu („Zapsat predikci", „Vytrhnout list"). Mobil: stranky pod sebou.',
    ]
  },
  {
    verze: 'v8.83',
    datum: '2026-07-08',
    zmeny: [
      '📖 NEW (S16, TODO-174): DENIK v1 (zatim jen ADMIN) – nova stranka: knizni dvoustrana Predikce (snimek) vs Skutecnost (zivy vypocet). Snimkuji se PREDIKCE (nemenne fakty: ocekavany prijem 12M, predikce vydaju z enginu Predikce, zname budouci platby, dluh/hotovost/skore k datu snimku, predikovana denni krivka = Ø tvar 6 mesicu × predikce). Skutecnost zive z transakci → zpetne upravy se propisou samy. Graf den po dni (skutecnost vs predikce, tooltipy, % odchylka), rozdily v % u prijmu/vydaju/salda, tempo vs predikce. Ulozeno v S.diary (Firebase, schema 3×). Mesicni navigace, mazani snimku.',
      '📊 CHANGE (S16.2): „Kam smeruju" – tabulka nahrazena GRAFEM (Milan): sloupce prijem/vydaje/budouci platby po mesicich + cashflow cara s hodnotami, tooltip vc. rezervy. VYDAJE nove z enginu karty PREDIKCE (predictCat: historie kategorii + sezonnost + narozeniny) misto plocheho Ø → cashflow se mesic od mesice lisi. Trajektorie dluhu ponechana.',
      'ℹ️ FIX (S16.2): Momentum – vysvetleni 11 994 vs −467: Ø = UROVEN (kolik mesicne pribyva), regrese = TREND te rady (zrychluje/zpomaluje) – obe hodnoty spravne. |smernice| pod prahem (5 % urovne, min 500 Kc) se nyni zobrazuje jako „↔ stabilni" a karta Momentum ukazuje i saldo tohoto mesice (Milanova pripominka k Usporam).',
    ]
  },
  {
    verze: 'v8.82',
    datum: '2026-07-08',
    zmeny: [
      '📈 CHANGE (S16, TODO-171): FINANCNI OBRAZ – trend metrik nove SMERNICE LINEARNI REGRESE pres 6 mesicu (Kc/mes) misto „posledni vs prvni". Duvod: soucet mezimesicnich rozdilu (Milanuv napad) se teleskopicky zkrati na posledni−prvni a ignoruje prostredek rady; regrese vyuziva vsechny body. V tabulce Mesic po mesici pridany radek Trend/mes (regrese pro vsechny 4 sloupce).',
      '🚀 CHANGE (S16, TODO-171): Karta „Uspory" (saldo aktualniho mesice) nahrazena „Momentum" (Ø saldo 6 mes. = Wealth Momentum). Sloupec Uspory v tabulce Mesic po mesici prejmenovan na Momentum – po mesicich je to tataz velicina, Ø radek = headline Momentum. Vysvetleni rozdilu 36 590 vs 11 994: bodova vs prumerna hodnota, obe byly spravne.',
      '🧭 CHANGE (S16, TODO-173): „Kam smeruju" – graf rezervy nahrazen PREDIKCNI TABULKOU 6 mesicu: Prijem Ø / Vydaje Ø / Budouci platby (zname sablony+splatky z budouci.js, informativni) / Cashflow / Rezerva kumulativne. Trajektorie dluhu ponechana (Milan). Poznamka vysvetluje, proc se budouci platby neodecitaji dvakrat.',
      '💶 CHANGE (S16, TODO-172): Historie cyklu od vyplaty – radky nahrazeny TABULKOU 1.–5. tyden: barvy tydnu vs STEJNY tyden predchoziho cyklu (±10 %), sloupec Δ vydaju vs predchozi cyklus (zelena = zlepsuji se), saldo, radek Ø tyden. Horizontalni scroll na mobilu.',
    ]
  },
  {
    verze: 'v8.81',
    datum: '2026-07-08',
    zmeny: [
      '📊 FIX+NEW (S16, TODO-168): GRAFY–Mesicni dle norem: oba grafy interaktivni TOOLTIPY (hover i dotyk – den, denni vydaj, kumulace, vs median), osa X po 2 dnech, citelnejsi osy (#a8aec8). Horni graf: zelene podbarveni pod kumulaci. Spodni graf PREPRACOVAN (drive duplikoval horni): nove „Tempo vydaju" – kumulace tento mesic (zelena) vs minuly mesic (modra) vs prumer 6 mesicu (seda) + median. HTML legenda.',
      '✅ FIX (S16, TODO-170): Dashboard checklisty – tlacitko ✕ nahrazeno textovym „Skryt". Nove localStorage klice = drive zavrene karty se jednorazove OBNOVI (vc. Milanovych).',
      '🎯 NEW (S16, TODO-169): FINANCNI SKORE prepnuto z 0–100 na REALNE BODY z Milanovych tabulek: 0–310 (S1 75 + DTI 60 + DSTI 40 + Rezerva 50 + Sporeni 35 + Rozpocet 50; bonus max 30 v ramci stropu). Hodnoceni prepocitano na body: Vyborne ≥279, Velmi dobre ≥233, Dobre ≥186, Prumerne ≥140, Rizikove ≥93, Kriticke <93. Interni 0–100 zachovano pro kruh a AI.',
      '👁 FIX (S16): Dashboard – podradky DTI a DSTI zvyrazneny (#c9cede, tucne, vetsi pismo; drive slabe var(--text3) + opacity).',
    ]
  },
  {
    verze: 'v8.80',
    datum: '2026-07-07',
    zmeny: [
      '🧭 NEW (S16, TODO-166): FINANCNI OBRAZ – nova sekce „Kam smeruju – pristich 6 mesicu": ocekavane saldo (prijem 12M prumer − vydaje 3M prumer), projekce rezervy po mesicich (graf s dnesni carou), trajektorie dluhu (rovnomerne umorovani = splatky − mesicni uroky; schedule datumy zamerne nepouzity – bezi od startDate, historicky nespolehlive).',
      '💶 NEW (S16, TODO-167): FINANCNI OBRAZ – historie cyklu OD VYPLATY K VYPLATE (poslednich 6): graf vydaju po cyklech s prumerem, tydeni rozpad vydaju (7dennni okna od vyplaty), saldo cyklu. Vyuziva radarPaydayInfo vc. prichyceni na realnou vyplatu ±6 dni a vsech frekvenci (mesicni/tydenni/14denni/neprav.).',
    ]
  },
  {
    verze: 'v8.79',
    datum: '2026-07-07',
    zmeny: [
      '📋 NEW (S16, TODO-165): PRACOVNI KALENDAR – kopirovani useku smen. Tlacitko „Kopirovat usek" → klik na prvni a posledni den vzoru → klik na cilovy den = vlozeni vzoru (vc. smen R/O/N, hodin i volnych dnu – volny den ve vzoru cisti cil). Volitelne „opakovat do konce mesice" pro rotujici smennost. Obraceny vyber se automaticky prohodi.',
    ]
  },
  {
    verze: 'v8.78',
    datum: '2026-07-07',
    zmeny: [
      '📋 NEW (S16, TODO-163): MESICNI REPORT – Financni zdravi dle kategorii prepracovano na KOMPAKTNI DLAZDICE (az 3 sloupce dle sirky: mobil 1, tablet 2, desktop 3). Tenky bar (1/3 vysky) s castkou/planem primo v baru (804/1226). Podrobne podkategorie (Internet 580…) vynechany. Trend zachovan – oranzove, srovnani s predchozim obdobim v tooltipu.',
      '🌅 NEW (S16, TODO-164): PRACOVNI KALENDAR – typy smen (Ranni/Odpoledni/Nocni). U smeny vyber podtypu, v bunce se zobrazi ikona + zkratka (R/O/N) + hodiny. Uklada se do workCal.days[].shift.',
    ]
  },
  {
    verze: 'v8.77',
    datum: '2026-07-07',
    zmeny: [
      '🧠 NEW (S16, TODO-162): DLUHOVY STRES INDEX prepracovan ze 4 na 10 metrik (soucet vah 100 b dle Milana): DSTI 20, Emergency Fund 15, DTI 15, Interest Cost Ratio 10, Debt Quality 10, Pocet pujcek 8, Vazeny urok 7, Likvidita 5, Trend splaceni 5, Debt Velocity 5. Kazda metrika = STRES 0..vaha (vyssi = horsi). Prahy v _STRESS_CFG (doprovodny Excel k ladeni).',
      'ℹ️ ZMENA (S16): „Rizikove typy" (pocet) nahrazeny metrikou Debt Quality (podil DRAHEHO dluhu dle objemu – urok >15 % / nebankovni / kreditka vs levna hypoteka). Emergency Fund = hotovost/ucty; Likvidita = rezerva + investice/sporeni (assetLiqTotals).',
      '🎨 FIX (S16): Stres index – barva pruhu faktoru nyni dle POMERU stres/vaha (drive absolutni <10/<18 → u metrik s max 5–10 spatne barvilo).',
    ]
  },
  {
    verze: 'v8.76',
    datum: '2026-07-07',
    zmeny: [
      '🗓️ NEW (S16, TODO-161): KALENDAR – prepinac Financni | Pracovni. Financni rezim: POZNAMKY ke dnum (modry puntik vpravo dole, editor v detailu dne, flag pro notifikaci pripraveny na pozdejsi push). Kliknout lze na KAZDY den (i bez transakci).',
      '📊 NEW (S16): Kalendar – pod mrizku pridan TYDENNI a VIKENDOVY prehled: vsedni dny vs vikend (prijmy/vydaje/saldo + pocet transakci), rozpad po tydnech, celkovy soucet za mesic.',
      '💼 NEW (S16): PRACOVNI KALENDAR – zadavani smen/dovolene/nemoci/volna na jednotlive dny, nastaveni uvazku (hodin/smena, dni dovolene/rok). Sumar: pocet smen, odpracovane hodiny, prescasy (nad hodinovym uvazkem), dovolena, nemoc, zustatek dovolene za rok.',
    ]
  },
  {
    verze: 'v8.75',
    datum: '2026-07-07',
    zmeny: [
      '🔧 FIX-192 (S16, TODO-160): DTI/DSTI skakaly pri proklikavani mesicu (cerven DTI 1506 %/DSTI 247 %, cervenec 4597 %/753 %). Pricina: prijmova zakladna = 3M klouzavy prumer ukotveny k prohlizenemu mesici → posun o mesic zmenil 1/3 dat. Oprava: DTI = 12M okno, DSTI = 3–12M adaptivni → posun o mesic zmeni jen ~1/12 dat, hodnoty stabilni. Sdilene napric Dashboard / Bankovni hodnoceni / Dluhovy stres index.',
      'ℹ️ FIX (S16): Bankovni hodnoceni – DSTI karta ukazovala v radku „prijem" jinou hodnotu (3M zaklad zdravi kategorii) nez ze ktere se DSTI pocitalo. Nyni ukazuje skutecny DSTI prijem.',
    ]
  },
  {
    verze: 'v8.74',
    datum: '2026-07-06',
    zmeny: [
      '📊 NEW (S20, TODO-159): DASHBOARD PLNE SKALY. Financni skore pouziva Milanovy plne bodovaci tabulky: Cash flow 0-75, Zadluzenost 0-100 (DTI 60 + DSTI 40), Rezerva 0-50, Sporeni 0-35. NOVA 5. slozka ROZPOCET 0-50 napojena na Mesicni report (prumer skore kategorii vs limity). Celkem 310 b (+ bonus 30) → normalizace na 0-100 pro prsten. Mesicni report zustava 0-100.',
      '🔧 FIX-191 (S20): Financni obraz – sipka trendu vs hodnoceni byly rozhozene. Vydaje +37 % ukazovaly ↓ se zelenou fajfkou. Nyni rawTrend = skutecny smer sipky, good = jestli je to dobre: vydaje rostou → ↑ + varovani, klesaji → ↓ + fajfka.',
      'ℹ️ FIX (S20): Mesicni report – sipka trendu kategorie (napr. ↑436 %) je MEZIMESICNI ZMENA, ne limit. Kdyz kategorie DRZI LIMIT, sipka je seda (informativni), ne cervena. Drive matoucí: +436 % rustu + skore 100 = cervena.',
      '🏔 NEW (S20): Avalanche vs Snehova koule – slider HORIZONT (5-30 let), graf poctu aktivnich pujcek v case (schodovity), tabulka toku penez s poradim splaceni (splacena pujcka = ✅ zesedne, sloupce Avalanche vs Koule kdy je ktera splacena).',
      '📈 NEW (S20): Financni obraz – tabulka Mesic po mesici ma SUMAR: soucet obdobi (Sigma) + prumer na mesic (prijmy, vydaje, saldo).',
    ]
  },
  {
    verze: 'v8.73',
    datum: '2026-07-06',
    zmeny: [
      '🛑 FIX-189 (S19, KRITICKE): ReferenceError renderDebtStressWidget – pri sjednocovani DSTI v v8.72 replace omylem trefil PRVNI vyskyt vzoru (Kalkulacka dluhove reality) a smazal 108 radku vcetne hlavicky widgetu. Obnoveno z v8.71 + oprava aplikovana na spravne misto. Stranka Pujcky opet funguje.',
      '📊 NEW (S19, TODO-158): MILANOVY BODOVACI TABULKY (dashboard_body.xlsx 1:1, 76+60+41+50+31 radku) v helpers.js (_SCORING + msc_* lookupy). Mesicni report: Vydajove = S1 (0-75 b → 0-100), Usporove = S4 (0-35 b → 0-100). Bankovni hodnoceni: u DTI/DSTI nove „skore X/60 b“ a „X/40 b“. Dluhovy stres index: DSTI/DTI faktory z tabulek invertovane na stres 0-25 (jemne odstupnovani misto 4 skoku).',
      '🔧 FIX-190 (S19): Prevodni mena z Nastaveni se u NOVE transakce nepropsala – openAddTx nespoustel updateTxCurrency. Opraveno.',
      '💱 NEW (S19): Meny prevodniku 1:1 s Kurzy men – options se generuji ze zivych CNB kurzu (_FX_RATES, ~33 men) v modalu transakce i v Nastaveni → Prevodni mena.',
    ]
  },
  {
    verze: 'v8.72',
    datum: '2026-07-06',
    zmeny: [
      '🔧 FIX-187 (S18, ZASADNI): Financni obraz – FFR a Diverzifikace prijmu pocitaly z getActual (jen VYDAJE) → pasivni prijem byl vzdy 0 a jedinym „zdrojem prijmu“ byla prijmova kategorie s vydajovou transakci (Financni urad – dan). Novy helper getIncActual (prijmy, bez presunu a splitu) → FFR i diverzifikace nyni vidi skutecne prijmy (Vyplata atd.).',
      '🔧 FIX-188 (S18): DSTI 732 % vs 753 % – tri mista pocitala splatky jinak (stres index ignoroval d.installments). SDILENE helpery computeMonthlyDebtPayments + computeEffectiveIncome v helpers.js: Dluhovy stres index, Bankovni hodnoceni DTI&DSTI i Dashboard slozka Zadluzenost davaji stejna cisla (753 %).',
      '🔗 NEW (S18, TODO-157): Mesicni report PROPOJEN s Dashboardem – slozka VYDAJOVE = Milanova S1 tabulka Cash flow (vydaje/prijmy) x4, USPOROVE = S4 tabulka Sporeni (% zakladu do investic/rezervy) x4; ROZPOCTOVE puvodni. Pod slozkami zivy radek „Dashboard: Cash flow · Rezerva · Sporeni /25“. Popisky slozek aktualizovany.',
      '📈 NEW (S18, TODO-155): Score engine – S4 Sporeni cte kategorie 📈 isInvest (fallback 🛟 isSaving), S3 Rezerva nove zapocitava i napojena aktiva v sekci 🛟 Financni rezerva (Sporici ucet/Fond). Vzdy bez Virtualniho presunu.',
      '🏔 FIX (S18): Avalanche vs Koule – graf celkoveho zustatku rozdil strategii principialne neukaze (stejne penize dovnitr). Novy graf KUMULATIVNICH UROKU (krivky se rozestoupi) + markery prvniho splaceneho dluhu; verdikt uvadi „Koule splati prvni dluh za Xm“ (motivace) vs uspora Avalanche.',
      '🔁 NEW (S18): Nastaveni → PREVODNI MENA – prevodnik pod Castkou se predvoli na zvolenou menu (napr. Kc→EUR) misto CZK→CZK. Automaticky rezim = zakladni mena.',
      '📐 UX (S18): Modal Presun – Nazev/Castka/Datum jsou nahore jako u ostatnich typu; Typ platby + penezenky/KAM se presunuly POD ne (novy blok transferDetailsBlock).',
      '📗 Excel: FinanceFlow_Vypocty_Skore.xlsx doplnen o list 4-Dluhovy stres index (bodovaci tabulky 4 faktoru + trend bonus, interaktivni vypocet – Milanuv priklad 75/100 Spirala, DSTI 753 %).',
    ]
  },
  {
    verze: 'v8.71',
    datum: '2026-07-05',
    zmeny: [
      '🔧 FIX-184 (S17): Napojena aktiva (z presunu) uz NELZE smazat (X skryto) – mazani je rozbijelo: blocklist noSyncKeys zpusobil, ze se smazane aktivum uz nikdy nevytvorilo znovu. Blocklist zrusen + jednorazovy uklid → driv smazane Sporici ucty se pri dalsim renderu OBNOVI z transakci.',
      '🔧 FIX-183 (S17): Sipky razeni kategorii – klik po clampnutem scrollu se uz neignoruje, ale PRESMERUJE na puvodne presouvanou kategorii (stejny smer) → plynule opakovane klikani i u horniho okraje. Guard 900 ms.',
      '🔧 FIX-185 (S17): Progress bar pujcky pocita i splatky PRED aplikaci (pujceno − zbyva). „Celkova 60k, zbyva 40,5k“ uz neukazuje 0 %, ale 32,5 % s popiskem „(z toho X pred appkou)“.',
      '🔧 FIX-186 (S17): „Stoji vas dluh kazdy den“ – delilo se souctem delek vsech uveru (125 Kc/den), banner delil nejdelsim uverem (215 Kc/den). Sjednoceno na dobu nejdelsiho uveru.',
      '💳 NEW (S17): Karta pujcky nove ukazuje PREPLATIS (zbyvajici uroky), DOPLATIS (datum konce) a ZBYVA DOBA (Xr Ym). Modal Pridat pujcku: pole prejmenovano na „Pujceno – jistina“, plan se pocita ze ZBYVA (i u rozjetych uveru) a ukazuje „Cely uver vas vyjde na (plan, bez sankci)“ vc. uz splacene casti.',
      '🏔 NEW (S17, TODO-156): AVALANCHE vs SNEHOVA KOULE – nove tlacitko v Pujckach. Slider extra castky, kaskadove valeni splatek, porovnani doby a uroku obou strategii, verdikt + SVG graf dvou krivek zbyvajiciho dluhu (osy, legenda).',
      '📊 FIX (S17): Grafy Dluh vs Investice a Simulace budoucnosti PREPSANY dle standardu – canvas neumi CSS var() (cary byly nevyditelne/sede), nove hex barvy, DPR ostrost, ticky os v zakladni mene, popisky os (roky / hodnota), legenda nahore, interaktivni tooltip (mys i dotyk). Vypocty simulace OVERENY – amortizace sedi (228 splatek, uspora 108 463 Kc pri +1000 Kc je matematicky spravne).',
      '♻ UX (S17): Virtualni presun nelze oznacit jako rezervu/investici (ciste informativni) – checkboxy skryte, vylouceny ze skorovani i z vyberu KAM.',
    ]
  },
  {
    verze: 'v8.70',
    datum: '2026-07-05',
    zmeny: [
      '📈 NEW (S16, TODO-155): ROZLISENI REZERVY A INVESTIC. V Upravit kategorii (typ Presun) jsou nove DVA prepinace: 🛟 Financni rezerva/sporeni (boduje Rezervu) a 📈 Investice/aktivni sporeni (boduje Aktivni sporeni) – vzajemne vylucne. Modal Presun → Do investic & sporeni: vyber KAM je rozdeleny nadpisy 🛟 Financni rezerva (sporeni) / 📈 Investice (aktivni sporeni) / 🔄 Dalsi presuny podle prepinacu kategorii. Obe vlajky funguji jako MIN limit (usporove zdravi, limity).',
      '🎯 NEW (S16): Tlacitko „Nastavit limity kategorii automaticky“ primo na strance Kategorie (pod bannerem Moje kategorie, nad Prijmy) – otevre modal automatickeho rozdeleni (CSU pro nove uzivatele / skutecne vydaje pri 3+ mesicich historie).',
      '🔧 FIX-182 (S16): Sipky razeni kategorii – kdyz se scroll u horniho okraje nemel kam posunout, kurzor skoncil nad jinou kartou a dalsi klik ji vratil zpet („zadrhavani“ mezi 2. a 3. radkem). Nyni: dvojite rAF mereni po prekresleni + 500ms anti-bounce guard (klik na JINOU kategorii tesne po clampu se ignoruje a spravna karta blikne).',
      '👀 UX (S16): Prevodnik men – kurz „(1 USD = 21,13 Kc)“ vetsi a svetlejsi (.74rem, #c9cede). Financni aktiva – nadpis CISTE JMENI vyraznejsi, popisky karet (Penezenky/Fin. rezerva/Strednedoba/Fyzicka/Zavazky) BARVOU sve karty a vetsi, popisy sekci citelnejsi (.74rem).',
    ]
  },
  {
    verze: 'v8.69',
    datum: '2026-07-04',
    zmeny: [
      '🎨 NEW (S15, TWA): NOVE IKONY z predlohy icon_FINAL (srdce s EKG). Sada: play-store-icon-512 (ostre rohy, gradient dotazen do rohu – Play si zaobli sam), icon-192/512 (zaoblene, telefon), icon-maskable-192/512 (obsah v bezpecne zone 72 % pro adaptivni ikony Androidu), apple-touch-icon-180. manifest.json ma misto emoji placeholderu skutecne PNG ikony (any + maskable). BONUS: feature-graphic-1024x500 pro Google Play listing (ikona + wordmark Poppins + tagline + EKG linka).',
      'ℹ️ Po nasazeni slozky icons/ pregenerovat TWA balicek pres PWABuilder (assetlinks.json se nemeni).',
    ]
  },
  {
    verze: 'v8.68',
    datum: '2026-07-04',
    zmeny: [
      '🔧 FIX-180 (S15): Prevodnik men v modalu transakce se pri EDITACI zasekl (ukazoval „≈ 0 Kc“ nebo hodnotu z minule transakce) – editace nespoustela prepocet. Nyni se prevodnik i pole Skutecne v Kc prepocitaji hned pri otevreni editace.',
      '🎨 UX (S15): Pole „Skutecne v Kc“ je pres CELOU sirku modalu (driv zmackle v levem sloupci vedle Data). Popisky CASTKA a DATUM jsou zarovnane ve stejne vysce (kalkulacka uz nezvysuje radek).',
      '🔧 FIX-181 (S15): Sipky razeni kategorii – u horniho okraje stranky (sekce Prijmy) se scroll nemel kam posunout a kurzor skoncil nad JINOU kategorii („preskakovani“). Nyni se clamp detekuje a presunuta karta se na 0,7 s zvyrazni, aby bylo videt kam se posunula.',
      '📅 NEW (S15): Financni obraz – tabulka Mesic po mesici ma nove sloupce USPORY (saldo mesice, terminologie karet) a DLUH. Historie dluhu se rekonstruuje ze splatek (transakce s debtId): zustatek na konci mesice = dnesni zustatek + splatky zaplacene po nem. Trend Dluhy uz neni vzdy 0 %.',
      '📗 NEW (S15): Excel FinanceFlow_Vypocty_Skore.xlsx – dokumentace vypoctu: skore kategorii 0-100 (limity), trend skore Financniho obrazu (50 ± 15 bodu) a stavy Radaru (klid/pozor/riziko) vc. interaktivnich prikladu.',
    ]
  },
  {
    verze: 'v8.67',
    datum: '2026-07-04',
    zmeny: [
      '🛑 FIX-179 (S15, KRITICKE): Zaskrtnuti polozky v Nakupnim seznamu shodilo aplikaci („total is not defined“) – lista „V kosiku X z Y“ sahala na promennou z jine funkce. Opraveno.',
      '📊 FIX (S15): Grafy Financniho obrazu (zrcadlovy + Wealth Momentum) maji INTERAKTIVNI tooltipy fungujici i na mobilu (dotyk; SVG title na mobilu nefunguje). Popisky hodnot u vysokych sloupcu se kresli UVNITR sloupce – uz nezasahuji do osy X (-14,8M pres mesic Cer).',
      '📈 NEW (S15): Statistiky → TOP kategorie → rezim VSE prepracovan do formatu tabulky jako Rok: sloupce = ROKY, radky = kategorie s rozbalitelnymi podkategoriemi, sticky prvni sloupec, radek Celkem. Jednopruchodovy index – rychle i pri tisicich transakci.',
    ]
  },
  {
    verze: 'v8.66',
    datum: '2026-07-03',
    zmeny: [
      '📊 NEW (S15): Inflace zivotniho stylu – pod hodnocenim novy ZRCADLOVY GRAF po mesicich: prijmy VLEVO (zelene), vydaje VPRAVO (cervene), stredova osa, popisky hodnot (70k/1,2M v zakladni mene), tooltip na sloupci (presna castka). Legenda ◀ PRIJMY / VYDAJE ▶.',
      '🚀 NEW (S15): Wealth Momentum – sloupcovy graf mesicnich sald kolem nuly (zelene +, cervene −) s carkovanou linkou prumeru Ø (= hodnota momenta), popisky hodnot i mesicu, tooltip. Oba grafy SVG s pevnym viewBox – funguji i ve skryte zalozce, prizpusobi se mobilu.',
    ]
  },
  {
    verze: 'v8.65',
    datum: '2026-07-03',
    zmeny: [
      '🔧 FIX-178 (S15): Denni hlavicky v Transakcich a souhrnny badge uz NEZAPOCITAVAJI PRESUNY (prevody mezi penezenkami ani vklady do investic), split rodice a vyrovnavaci transakce – stejna logika jako incSum/expSum. Driv denni utrata ukazovala napr. -3 727 Kc kvuli prevodu 100 GBP a vkladu do investic.',
      '📊 FIX (S15): „Zivotni styl pod kontrolou“ (Financni obraz) – dřiv porovnaval jen PRVNI vs POSLEDNI mesic okna (nahodny sum) a jedina detekce byla „vydaje rostou rychleji“. Nyni porovnava PRUMER prvni vs druhe poloviny okna a ma 3 stavy: cervena inflace zivotniho stylu, NOVA zluta „Prijmy klesaji rychleji nez vydaje“ (vydaje se poklesu neprizpusobily), zelena OK. Popisek vysvetluje metodu.',
      '🐷 UX (S15): Checkbox „Kategorie sporeni/investic“ definitivne jen u typu Presun (bez legacy vyjimky). Ulozene hodnoty starych kategorii zustavaji funkcni.',
    ]
  },
  {
    verze: 'v8.64',
    datum: '2026-07-03',
    zmeny: [
      '🎯 NEW (S15, TODO-152): Automaticke rozdeleni limitu pro NOVE uzivatele bez historie nyni vychazi z PRUMERNE UTRATY CESKE DOMACNOSTI (CSU COICOP oddily, avg_osoba z COICOP_GROUPS_DEF) misto rovnomernych 80 %. Obalka 80 % zakladu prijmu se rozdeli pomerove podle podilu oddilu; vic kategorii ve stejnem oddilu se deli rovnym dilem; kategorie bez COICOP dostanou zbytek. Po ~3 mesicich prepocet podle skutecnych vydaju.',
      '⚪ FIX (S15): Kategorie BEZ limitu uz v Mesicnim reportu neukazuje matouci zeleny bar se skore 75 – nove sedy ztlumeny bar + „–“ a popisek „bez limitu – nehodnoti se“. Legenda doplnena o sedou.',
      'ℹ️ NEW (S15): Legenda reportu vysvetluje ZAKLAD PRIJMU: „Plan i % se pocitaji ze Zakladu prijmu X Kc (vazeny prumer stabilnich prijmu za 3 mesice), ne z prijmu aktualniho mesice.“',
      '🐷 FIX (S15): Checkbox „Kategorie sporeni/investic“ se zobrazuje jen u typu PRESUN (vklady do sporeni/investic = skore S4). U vydaju a prijmu nedaval smysl; stara kategorie se zaskrtnutym checkboxem ho stale muze odskrtnout.',
    ]
  },
  {
    verze: 'v8.63',
    datum: '2026-07-03',
    zmeny: [
      '🎯 NEW (S15, TODO-152): AUTOMATICKE ROZDELENI LIMITU kategorii. Novy krok v checklistu na Dashboardu → modal navrhne % limity (2 desetinna mista) podle skutecnych vydaju za 3 mesice vztazenych k zakladu prijmu; bez historie rovnomerne 80 %. Editovatelne, zivy soucet + „zbyva X % do 100“, ulozi healthPct.',
      '🔧 FIX-177 (S15): Limit zadany JEN v Kc dosud NEFUNGOVAL (chybejici % dalo limit 0 → „bez limitu“, zeleny bar). Nyni Kc strop funguje samostatne; u sporeni funguje Kc jako minimum. Kdyz je % i Kc, plati prisnejsi (u sporeni vyssi).',
      '📊 FIX (S15): Mesicni report – radek kategorie ted ukazuje „X % zakladu prijmu“ (stejna baze jako plan; driv matouci mix „% prijmu“ aktualniho mesice vs plan ze zakladu → cerveny bar pri zdanlivych 25 %). Plan zohlednuje i Kc strop a u sporeni ukazuje „min“.',
      'ℹ️ NEW (S15): Modal kategorie – presnejsi popisek „Max % ZE ZAKLADU prijmu“, podpora desetinnych % (krok 0,01), zivy prehled „Rozdeleno X % · zbyva Y % do 100“ a vysvetleni priority % vs Kc.',
    ]
  },
  {
    verze: 'v8.62',
    datum: '2026-07-02',
    zmeny: [
      '💱 NEW (S15, TODO-150): Zadavani castky v ZAKLADNI MENE. Kdyz mas zakladni menu napr. EUR a NEVYBERES penezenku (vychozi), label je CASTKA (EUR) a castku zadavas rovnou v eurech – ulozi se prepocet do Kc kurzem CNB (pole Skutecne v Kc muzes upravit). Editace takove transakce ukaze castku zpet v EUR bez kurzovniho driftu. Penezenka s menou = zadavani v mene penezenky (beze zmeny). Label u Presunu ukazuje menu zdrojove penezenky.',
      '🛒 NEW (S15): ZASKRTAVACI NAKUPNI SEZNAM. Na karte polozky je zaskrtavatko „mam v kosiku“ – polozka se prtlumi, preskrtne a zaradi dolu. Nahore lista „V kosiku X z Y“ s tlacitkem Vysypat kosik. Stav se uklada a synchronizuje.',
      '📈 FIX (S15): Graf Financni simulace zivota kompletne prepsan – canvas neumi CSS promenne, takze cary byly „bez barev“; legenda se kryla s popisky osy X. Nyni: barevne scenare (A sedy, B zeleny, C modry carkovany), legenda nahore, popisky os (Vek / Majetek v zakladni mene), ostre vykresleni na mobilu (devicePixelRatio) a tooltip s hodnotami vsech 3 scenaru (mys i dotyk).',
      '📱 FIX (S15): Mobilni zobrazeni – Nastaveni: selecty (Jazyk, Vychozi mena, Format data…) uz nepretekaji pres okraj karty. Financni aktiva: nazev penezenky ma misto (2 radky), zustatek + puvodni mena pod sebou vpravo – nazvy uz nejsou orezane na „E…“.',
    ]
  },
  {
    verze: 'v8.61',
    datum: '2026-07-02',
    zmeny: [
      '🌍 NEW (S15, TODO-151): ZAKLADNI MENA – FAZE 2. Prepocet do zvolene meny (CZK/EUR/USD/GBP/PLN) nyni pokryva zbytek aplikace: Projekty (vc. transakci projektu a tipu na uspory), Dluhy (prehled splaceni), Aktiva (cista hodnota, sekce, graf historie), Banka (predikce, sezonnost), Kalendar (denni sumy – opraven i mix men v souctech), Budouci platby, AI Poradce, Nakupni DNA, Radar. CANVAS grafy kompletne: ticky os, popisky os i tooltipy v zakladni mene (geometrie beze zmeny).',
      '💱 FIX (S15): Prevodnik pod polem Castka umi nove CZK a pocita z MENY VYBRANE PENEZENKY (drive predpokladal zadani v Kc). Eurova penezenka → prevodnik se prepne na CZK („platim v eurech, kolik utracim v Kc“); korunova penezenka + zakladni mena ≠ CZK → prevodnik ukaze zakladni menu.',
      '💱 FIX (S15): Castky jednotlivych transakci v Projektech a Kalendari se prevadeji pres zafixovany kurz (txCZK) – transakce z eurove penezenky se uz nezobrazovala jako Kc 1:1.',
      'ℹ️ Zamerne v Kc zustava: vstupni pole (Castka, dluhy, rozpocty – zadava se v Kc), realne ceny produktu (letaky, hlidac cen, polozky uctenek), ceny predplatneho FinanceFlow, SMS parsery a AI prompty.',
    ]
  },
  {
    verze: 'v8.60',
    datum: '2026-07-02',
    zmeny: [
      '🌍 NEW (S16, TODO-150): ZAKLADNI MENA UZIVATELE (faze 1). Nastaveni → Lokalizace → Vychozi mena (CZK/EUR/USD/GBP/PLN) nyni skutecne funguje: dashboard karty (Prijmy/Vydaje/Zustatek/Uspory/Dluh), transakce (denni hlavicky, badge, ≈ poznamky), bublinove grafy kategorii, donut Statistik, mesicni souhrny a tabulky v Grafech se prepocitavaji zivym kurzem CNB do zvolene meny se spravnym symbolem (Kc/€/$/£/zł). Interni data zustavaji v CZK (zadna migrace). Zmena meny se projevi hned po ulozeni nastaveni.',
      'ℹ️ Pozn.: castky transakci a prubezne zustatky zustavaji v mene penezenky (zamer); canvas grafy (radar/pace), uctenkove polozky, dluhy a projekty prijdou ve fazi 2 (TODO-151).',
    ]
  },
  {
    verze: 'v8.59',
    datum: '2026-07-02',
    zmeny: [
      '💱 FIX (S15, TODO-149): Presun mezi penezenkami s RUZNOU MENOU uz nepripisuje surovou castku (100 EUR se pripsalo jako 100 Kc). Pri rozdilnych menach se v modalu Presunu ukaze pole „Pripsat do cilove penezenky“ – predvyplnene krizovym kurzem CNB (pres CZK), ale volne editovatelne (kurz banky). Cilova noha prevodu se ulozi v mene cilove penezenky, kurz se zafixuje. Obe nohy prevodu nesou zafixovanou hodnotu v Kc (amtCZK) pro ≈ Kc popisek.',
    ]
  },
  {
    verze: 'v8.58',
    datum: '2026-07-02',
    zmeny: [
      '💱 NEW (S15, TODO-144): ZAFIXOVANY KURZ u transakci v cizi mene. Pri vyberu cizimenove penezenky se pod Castkou ukaze pole „Skutecne v Kc“ – predvyplnene kurzem CNB, ale volne editovatelne (kazda banka ma jiny kurz). Hodnota se ulozi do transakce (amtCZK) a UZ SE NIKDY neprepocitava zivym kurzem. Label Castka ukazuje menu penezenky (CASTKA (EUR)). Stare cizimenove transakce se zafixuji pri prvni editaci (pole se predvyplni, rucne upravis, ulozenim fixne).',
      '💱 NEW (S15, TODO-146): Vsechny soucty pocitaji v zakladni mene (Kc): denni hlavicky v Transakcich, souhrnny badge, incSum/expSum/getActual (statistiky, rozpocty, banka). Cizi penezenky se uz nescitaji 1:1 jako Kc – 900 GBP v dennim souctu = ~26 500 Kc. U cizomenove transakce se v seznamu ukazuje ≈ hodnota v Kc (zafixovana, u starych orientacne).',
      '💱 NEW (S15, TODO-148): Vklady do aktiv (Presun → Investice) pouzivaji ZAFIXOVANY kurz z okamziku vkladu (amtCZK) misto aktualniho kurzu CNB – v syncInvestmentAssets i v historii hodnoty aktiva. Stare vklady bez fixace zustavaji na zivem kurzu (fallback).',
      '🔍 FIX (S15, TODO-145): Detekce duplicit porovnava castky v ZAKLADNI MENE (Kc pres txCZK), ne surova cisla. 900 Kc a 900 GBP uz nejsou oznaceny jako duplikat. Tolerance 1 Kc (zivy kurz u starych nezafixovanych transakci muze mirne kolisat).',
      '📈 NEW (S15, TODO-147): Graf vyvoje cen pod tabulkou Zdrazovani (Analyza uctenek → Zdrazovani). Top 5 polozek s nejvetsi zmenou, osy s popisky (Kc/ks, datum), legenda s procenty zmeny, tooltip na bod (datum, cena, obchod). SVG s pevnym viewBox – kresli se korektne i po prepnuti zalozky.',
      '🔧 FIX (S15): Editace transakce nyni vyplni i PENEZENKU a TYP PLATBY do modalu – drive selecty zustaly na „– vychozi –“ a vybrana penezenka nebyla videt.',
    ]
  },
  {
    verze: 'v8.57',
    datum: '2026-06-29',
    zmeny: [
      '📈 NEW (S14): Historie hodnoty aktiva nyni zahrnuje i VKLADY z transakci (read-only, bez tlacitka X – jsou dane z Transakci). Graf vyvoje se ukaze i kdyz mas jen jedno rucni oceneni, protoze pouzije i vklady (kumulativne). Drive vyzadoval 2+ rucni oceneni.',
      '🔧 FIX (S14): Kolize zadavani hodnoty. U strednedobych/investicnich aktiv se „Aktualni hodnota" uz NEda menit v editaci aktiva – meni se VYHRADNE pres tlacitko 📈 „historie hodnoty". (U nemovitosti/aut/hotovosti zustava pole v editaci.)',
    ]
  },
  {
    verze: 'v8.56',
    datum: '2026-06-29',
    zmeny: [
      '🐛 FIX KRITICKY (S14): Presun→Investice se KONECNE propisuje do Financnich aktiv! Pricina: kod pouzival window.S, jenze S je deklarovane jako let (neni na window) → synchronizace aktiv hned skoncila a nikdy nebezela. Opraveno (window.S → S). Aktiva z presunu se nyni tvori automaticky.',
      '🐛 FIX (S14): Avatari v Uprav profil sli vybrat – klik se hned prepsal zpet. renderAvatarPicker uz nereset uje vyber pri kazdem prekresleni (inicializace jen pri otevreni).',
      '🎨 (S14): Penezenky – cizi mena a CZK maji nyni pevne sloupce (cisla zarovnana pod sebou).',
      '🔍 (S14): U hlavicky sloupce „Datum" v Transakcich je ikona 🔽 – otevre filtr obdobi (rok / mesice, i jeden mesic napric roky), jako v Excelu. (Filtr byl uz od v8.41 pod tlacitkem „📅 Obdobi".)',
    ]
  },
  {
    verze: 'v8.55',
    datum: '2026-06-29',
    zmeny: [
      '🐛 FIX (S14): Tagy u transakci. (1) Nova transakce uz NEMA predvyplnene tagy z predchozi (openAddTx cisti pole). (2) Smazani vsech tagu pri editaci se nyni ulozi (driv se prazdne tagy nezapsaly a stare zustaly).',
      '🔧 (S14): Tlacitko „🔄 Prepojit" je nyni neprustrelne – vzdy ukaze vypis (kolik transakci, presunovych kategorii, vytvorenych/napojenych aktiv) nebo chybu. Pomuze najit, proc se Presun→Investice nepropisuje.',
      '🎨 (S14): Penezenky ve Financnich aktivech – cizi mena ma vlastni sloupec (cisla se neprekryvaji) a castky maji cistejsi pismo (tabular-nums misto Syne).',
    ]
  },
  {
    verze: 'v8.54',
    datum: '2026-06-29',
    zmeny: [
      '💎 NEW (S14): Financni aktiva PREPRACOVANA do 4 sekci: 👛 Penezenky (penezenky ze spravy) · 🛟 Financni rezerva (likvidni – sporeni, sporici ucet, terminovany vklad) · 📈 Strednedoba a investicni · 🏠 Fyzicka a dlouhodoba. Net Worth nahore ma nyni 5 prehlednych karet (Penezenky, Fin. rezerva, Strednedoba, Fyzicka, Zavazky) misto 3 velkych + 3 malych.',
      '💎 NEW (S14): Presunove kategorie maji nove „Likviditu aktiva" (likvidni rezerva / strednedobe / dlouhodobe) – Uprav kategorii → u typu Presun. Ridi, do ktere sekce Financnich aktiv presun spadne. Pokud nenastaveno, odvodi se z nazvu (rezerva/sporeni→rezerva, investice/fondy→strednedobe, penzijko→dlouhodobe).',
    ]
  },
  {
    verze: 'v8.53',
    datum: '2026-06-29',
    zmeny: [
      '🐛 FIX (S14): Akcni tlacitka ✂✎✕📷 v tabulce transakci VRACENA pro WEB (mys). Na dotykovych zarizenich (mobil/tablet) zustava swipe + tap (skryta tlacitka). Detekce pres pointer:coarse.',
      '🐛 FIX (S14): Prichyceni (sticky) hlavicky tabulky transakci OPRAVENO. Pricina: rodicovska .card mela overflow:hidden, coz sticky rusi. Nyni #txCard overflow:visible + spravny offset pod topbar. Popisy sloupcu (Datum/Kategorie/…) zustavaji nahore pri scrollovani.',
      '🔧 NEW (S14): Tlacitko „🔄 Prepojit" v sekci Financni aktiva – znovu propoji aktiva z presunovych transakci, odblokuje drive smazana a ukaze diagnostiku (kolik presunovych kategorii, transakci, napojenych aktiv) → pomuze najit, proc se Presun→Investice nepropisuje.',
    ]
  },
  {
    verze: 'v8.52',
    datum: '2026-06-29',
    zmeny: [
      '🐛 FIX (S14): Zelene tagy v landscape se orezavaly na emoji + 1 pismeno (byly v uzke bunce „Nazev" ~40px se overflow:hidden). Nyni se v tabulkovem (landscape) zobrazeni vykresluji jako pruh pres celou sirku pod radkem → cele a citelne. Portrait (karta) beze zmeny. Kosmeticka zmena kontrastu z v8.50 vracena na puvodni.',
    ]
  },
  {
    verze: 'v8.51',
    datum: '2026-06-29',
    zmeny: [
      '🫳 (S14, ADR-075): Landscape (sirka) – akcni tlacitka ✂✎✕📷 v tabulce transakci SKRYTA (snadny preklik na mobilu). Nyni stejne jako na vysku: ucentkova transakce = SWIPE doleva → „Upravit" (otevre naskenovanou uctenku), normalni transakce = TAP otevre editaci. Mazani normalni transakce pres edit okno. Sticky hlavicka zustava.',
    ]
  },
  {
    verze: 'v8.50',
    datum: '2026-06-29',
    zmeny: [
      '🐛 FIX (S14): Swipe „Upravit" u uctenkove transakce nyni otevre KONKRETNI naskenovanou uctenku v Historii (openReceiptInHistory) – jak to fungovalo driv. Driv (v8.48) omylem otviral obecnou editaci transakce / rozbaloval polozky (dve funkce). Nyni jedna jasna akce.',
      '🐛 FIX (S14): Kurzy men – zmizela zaseklost. Klient ted nacita vzdy cerstve (cache:no-store), Worker /cnb vraci Cache-Control:no-cache a edge cache snizen na 30 min. Pozn.: o vikendu a v pracovni den pred ~14:30 CNB drzi kurz z predchoziho dne (to je spravne, ne chyba).',
      '🎨 FIX (S14): Zelene tagy u transakci jsou citelnejsi (svetlejsi text #bff7d6, vyssi kontrast, vetsi).',
      '📌 (S14): Landscape – hlavicka tabulky transakci (Datum/Kategorie/…) je nyni prichycena (sticky) pri scrollovani.',
    ]
  },
  {
    verze: 'v8.49',
    datum: '2026-06-27',
    zmeny: [
      '💎 NEW (S14, ADR-076): Propojeni Transakce → Financni aktiva PREDELANO. (1) Presun do presunove kategorie se nyni pripisuje do aktiva pojmenovaneho podle PODKATEGORIE (ETF, Fondy, Akcie…), ne podle kategorie. (2) Vklady v cizi mene (EUR atd.) se prevadi na CZK dle aktualnich kurzu CNB (_FX_RATES). (3) Rucni trzni hodnota se ZACHOVA a dalsi vklad se k ni PRICTE: vlozim 1000€=2500 → rucne 2900 → vlozim 1000 = 3900 (value = baseline + (vlozeno − vlozeno_pri_baseline)). (4) Existujici rucne vytvorene aktivum stejneho jmena (napr. ETF) se automaticky ADOPTUJE a jeho hodnota zustane. (5) Smazane napojene aktivum se uz neobnovuje (S.noSyncKeys, persistovano).',
    ]
  },
  {
    verze: 'v8.48',
    datum: '2026-06-27',
    zmeny: [
      '🫳 NEW (S14, ADR-075): Transakce z analyzy uctenek – SWIPE doleva odkryje tlacitko „✎ Upravit" (otevre naskenovanou uctenku). Bezne transakce se nemeni – tap na kartu je upravi jako dosud. Nahrazuje docasna viditelna tlacitka z v8.47 (Milan nechce hodne tlacitek v mobilni appce). Swipe je delegovany, funguje i po prekresleni; vertikalni scroll neni dotcen.',
    ]
  },
  {
    verze: 'v8.47',
    datum: '2026-06-27',
    zmeny: [
      '📱 FIX (S14): Transakce z analyzy uctenek lze nyni editovat/smazat i na mobilu na vysku. Driv mel tap na kartu s polozkami jen rozbaleni polozek a tlacitka ✎✕ byly jen v sirokem (landscape) zobrazeni. Nyni ma karta s uctenkou primo viditelna tlacitka ✎ (upravit) a ✕ (smazat) pod castkou.',
    ]
  },
  {
    verze: 'v8.46',
    datum: '2026-06-27',
    zmeny: [
      '🐛 FIX (S14): Kurzy men – piny (hvezdicky) konecne funguji. Pricina: pinnedFx se neukladal (saveToFirebase ma pevny seznam poli, pinnedFx mezi nimi nebyl) → Firebase sync prepsal S a pin zmizel. Nyni v localStorage (per zarizeni, spolehlive). Tlacitko „Obnovit" odebrano – CNB se cachuje 1×/den, rucni obnoveni vracelo stejna data.',
      '🐛 FIX (S14): Zdrazovani – cena/kg byla spatne (delila navic × qty). Rohlik 43g za 2,90 Kc/ks ukazoval ~10 Kc/kg misto 67,4. Nyni: vazena polozka (kg/l) bere cenu/kg primo z price; kusova polozka s hmotnosti v nazvu = cena/ks ÷ hmotnost 1 ks (qty uz nehraje roli).',
      '🔽 FIX (S14): Komunitni prehled – 3. uroven COICOP (tridy 01.1.1) se nyni plni tvymi daty. Pricina: coicop.js generoval klic tridy ve formatu „01.11", ale tabulka hleda „01.1.1". Format sjednocen.',
    ]
  },
  {
    verze: 'v8.45',
    datum: '2026-06-26',
    zmeny: [
      '🐛 FIX (S14): Kategorie – sipky ▲▼ v sekci „Prijem i vydaj" (a obecne) konecne funguji. Pricina: posun prohazoval sousedy v plochem poli, ale zobrazeni se preskupuje podle typu → vizualne se nic nestalo. Nyni se posouva v ramci STEJNE sekce (najde predchozi/dalsi kategorii stejneho typu).',
      '🔄 (S14): „Virtualni presun" presunut ze sekce „Prijem i vydaj" do sekce „Presuny" (vizualne; typ kategorie zustava both).',
      '🖱️ NEW (S14): Po posunu karty nahoru/dolu se stranka doroluje tak, aby kliknute tlacitko zustalo POD KURZOREM → lze klikat opakovane a vynest kategorii o vice pater bez prejizdeni mysi.',
    ]
  },
  {
    verze: 'v8.44',
    datum: '2026-06-26',
    zmeny: [
      '🍪 NEW (S14): Oznameni → Soukromi ma nyni funkcni prepinac „Analyticke cookies (Google Analytics)" + zamceny radek „Nezbytne cookies". Prepinac realne ridi GA4 consent (analytics_storage granted/denied) a uklada volbu do ff_cookie_analytics. DULEZITE FIX: app.html driv spoustel GA4 BEZ consent rezimu (sbiral data bez souhlasu) — nyni ma consent default „denied" a granted jen pri souhlasu uzivatele. GDPR v poradku.',
      '📈 (S14): Zalozka Rust rozsirena o PRO tier (🚀 Pro karta + label v tabulkach). createdAt se zaznamenava automaticky uz pri prvnim prihlaseni (loadPremiumStatus zaklada premium:{type:free,createdAt}).',
      '📱 FIX (S14): Nejcasteji nakupovane polozky — nazvy se uz neorezavaji na mobilu. Grid prvni sloupec minmax(0,1fr) (spravne zmensovani) + nazev se zalamuje (word-break) misto ellipsis.',
    ]
  },
  {
    verze: 'v8.43',
    datum: '2026-06-26',
    zmeny: [
      '📈 NEW (S14): Admin panel → nova zalozka „📈 Rust". Zobrazuje: 6 souhrnych karet (Celkem/Premium/Trial/Free/Vyprselo/Za 30 dni), sloupcovy graf registraci po mesicich (poslednich 12), tabulku novych registraci za poslednich 30 dni + tabulku vyprselych predplatnych. Data z _cachedUsers (loadUsersList), bez nove Firebase cesty.',
    ]
  },
  {
    verze: 'v8.42',
    datum: '2026-06-26',
    zmeny: [
      '🔄 NEW (S14): Banner „Nova verze FinanceFlow je pripravena [Aktualizovat]" — zobrazi se automaticky kdyz SW detekuje novy shell (controllerchange event). Uzivatel klikne Aktualizovat → reload. Nebo banner zavre a pouziva starou verzi dal. Banner se zobrazi nad spodnim navigacnim panelem, s animaci ffSlideUp. Zadny tvrdy refresh, zadna intervence uzivatel nevi o nasazeni nove verze, app si to vyresi sama.',
    ]
  },
  {
    verze: 'v8.41',
    datum: '2026-06-26',
    zmeny: [
      '📅 NEW (S14): Transakce maji novy filtr OBDOBI (tlacitko „📅 Obdobi"). Excel styl: vyber rok + zaskrtni 1 nebo vice mesicu. Prazdne mesice = cely rok. Volba „📆 Vsechny roky" + zaskrtnuty mesic = napr. vsechny ledny napric roky. Aktivni filtr ukazuje zeleny chip u nadpisu (✕ zrusi). Prepnuti mesice nahore filtr automaticky zrusi. Funguje spolu s ostatnimi filtry (kategorie, penezenka, typ…). Souhrn (+/−) i seznam respektuji filtr.',
    ]
  },
  {
    verze: 'v8.40',
    datum: '2026-06-26',
    zmeny: [
      '🏷️ NEW (S14, faze 4): Analyza uctenek → „Nejcasteji nakupovane polozky" maji filtr podle COICOP tagu (zelene tagy: Pecivo, Maso, Zelenina…). Kliknuti na tag zuzi seznam jen na polozky te skupiny, druhy klik filtr zrusi. Funguje spolu s filtrem obdobi (1M/3M/6M/12M/vse).',
    ]
  },
  {
    verze: 'v8.39',
    datum: '2026-06-26',
    zmeny: [
      '🧬 NEW (S14, faze 3): Analyza uctenek → nova karta „Vydaje podle COICOP skupin". Tvoje nauctovane polozky se sectou podle oficialnich COICOP skupin CSU (sekce serazene dle utraty, pod kazdou podskupiny + bar). Pohani coicop.js (coicopBreakdown/coicopBreakdownCard). Nezarazene polozky (DB netrefila) zvlast. Pripravuje filtrovani podle zelenych tagu (faze 4).',
      '🏷️ (S14): Verzovaci hlavicka v receipts.js.',
    ]
  },
  {
    verze: 'v8.38',
    datum: '2026-06-26',
    zmeny: [
      '🧬 NEW (S14, faze 1+2): Detailni COICOP. Novy modul coicop.js (compute oddeleny od renderu) pocita SKUTECNE vydaje uzivatele z polozek uctenek na jemne COICOP urovne (podtrida 01.1, trida 01.11) pres produktovou DB (productGroupLookup). V Komunitnim prehledu (tabulka Ja vs CSU) se po rozkliknuti oddilu v podskupinach/tridach zobrazi TVOJE skutecne vydaje (zelene) misto drivejsich „—". CSU prumery zustavaji na urovni oddilu. Zaklad pro pristi filtrovani a statistiky (faze 3+4).',
    ]
  },
  {
    verze: 'v8.37',
    datum: '2026-06-26',
    zmeny: [
      '🍪 NEW (S14): Cookie lista (GDPR) na landing page – nezbytne cookies (vzdy aktivni) + analyticke (volitelne, s popisem). GA4 jede pres Consent Mode v2: analytika VYCHOZI zamitnuta, aktivuje se az po souhlasu. Tlacitka „Jen nezbytne / Ulozit volbu / Prijmout vse". (Nasadit index.html.)',
      '🖼️ NEW (S14): Volitelny emoji avatar v profilu (Upravit profil → vyber avatara). Ukaze se v bocnim panelu i v rodinnem prehledu. Druhe kliknuti na vybrany avatar ho zrusi.',
      'ℹ️ (S14): Pripomenuti – oprava export CSV (vyskakovaci okno + krizek) a pole pro referral kod v profilu byly hotove uz ve v8.32; vyzaduji nasazeni app.html + settings.js + share.js + app.js.',
    ]
  },
  {
    verze: 'v8.36',
    datum: '2026-06-26',
    zmeny: [
      '💱 (S14): Menovy prevodnik v poli castky (a prepocty cilu) je nyni napojeny na ZIVE kurzy CNB. Pri startu appky se jednou stahnou kurzy z Workeru (/cnb) a prepisou orientacni _FX_RATES → prevodnik ukazuje aktualni kurz misto pevneho 25,3. Bez nasazeneho Workeru funguje dal na orientacni prumery.',
    ]
  },
  {
    verze: 'v8.35',
    datum: '2026-06-25',
    zmeny: [
      '💱 NEW (S14): Nova zalozka „Kurzy men" (denni kurzovni listek CNB). Prehled vsech men – kolik Kc stoji 1 jednotka. Hvezdickou pripnes oblibene meny nahoru pro rychly prehled (uklada se do uctu). Data jdou pres Cloudflare Worker (novy /cnb endpoint, cache 1x/den + CORS) – NUTNO NASADIT I WORKER. Kdyz je CNB nedostupne, zobrazi orientacni prumery.',
    ]
  },
  {
    verze: 'v8.34',
    datum: '2026-06-25',
    zmeny: [
      '🔗 NEW (S14): Investice → Finanční aktiva. Kazda transfer-kategorie (Investice/Sporeni/Penzijko/Trading…) se automaticky propise do Financnich aktiv jako JEDNO aktivum. invested = vklady minus vybery napric VSEMI podkategoriemi (penzijko: vlastni vklad + statni prispevek + zamestnavatel = jedno aktivum). Trzni hodnota zustava rucni (pro zhodnoceni); dokud ji nezadas, kopiruje vklady. Granularitu ridis strukturou kategorii. Karta aktiva ma odznak „z presunu".',
      '🐛 FIX (S14): Vlastni podkategorie napsana primo v transakci se nyni ULOZI do kategorie → jde filtrovat v Transakcich a priste se nabidne jako chip (drive zustala jen jako text na transakci). Plati pro presun do aktiv i bezne vydaje/prijmy.',
      '🏷️ (S14): Verzovaci hlavicka v assets.js.',
    ]
  },
  {
    verze: 'v8.33',
    datum: '2026-06-25',
    zmeny: [
      '💎 (S14): Referral – potvrzeni bodu uz neni jen „5 transakci". Nove se body pozvateli pripisou az kdyz referovany ucet: pouziva app >=14 dni, NEBO ma >=7 dni s prihlasenim (max 1/den) + >=5 transakci. Lepsi ochrana proti delete+reregister farmeni. Pridan tracker aktivity (users/{uid}/activity, pocita dny prihlaseni a stari uctu).',
    ]
  },
  {
    verze: 'v8.32',
    datum: '2026-06-24',
    zmeny: [
      '💎 FIX (S14): „Registraci: [object Object]" – klic referrals/{kod}/conversions se prepsal z cisla na ledger objekt. Display nyni spocita pocet POTVRZENYCH konverzi.',
      '💎 NEW (S14): Profil → pole „Referral kod" (1x za ucet, nevratne). Body se pozvateli pripisou az po 5 transakcich referovaneho uctu (confirmed) – brani zneuziti delete+reregister. Konverze pres link i pres kod funguji stejne.',
      '🐛 FIX (S14): Prepnuti uzivatele v adminu nyni hned prekresli stranku (kategorie uz nezustanou prazdne). _dataSig rozsiren o viewingUid – anti-flicker guard uz prepnuti zachyti.',
      '🐛 FIX (S14): Export transakci (CSV) – okno se zobrazovalo mimo obrazovku a neslo zavrit (spatna CSS trida modal-overlay misto overlay + inline display). Nyni standardni modal.',
      '🏷️ (S14): Verzovaci hlavicka v settings.js.',
    ]
  },
  {
    verze: 'v8.31',
    datum: '2026-06-24',
    zmeny: [
      '💎 FIX (S14): Referral body se konecne pripisuji. Pricina 0 bodu: bezpecnostni pravidla nedovoli zapsat body do CIZIHO uctu (users/{owner}). Nove se konverze zapise do referrals/{kod}/conversions/{uid} (to pravidla dovoli) a majitel kodu si body naroku do sveho earned pri svem prihlaseni. Admin → Udrzba → „Pripsat si referral body" (overeni + zpetne pripsani).',
      '🧰 (S14): Migrace dat presunuta do vlastni zalozky Admin → Udrzba (uz neni napric vsemi zalozkami). Pridan referral nastroj.',
      '🏷️ (S14): Doplneny verzovaci hlavicky do debts.js, transactions.js, share.js, styles.css.',
    ]
  },
  {
    verze: 'v8.30',
    datum: '2026-06-24',
    zmeny: [
      '🐛 FIX (S14): Dashboard „Moje uspory a investice" – velke cislo Investice ukazovalo 0, i kdyz rozpad nize mel 3700. Pricina: po migraci ma kategorie stare ID (cat10) a klasifikace skupiny sla jen podle ID. Nyni se investice/sporeni urcuje i podle nazvu kategorie.',
      '🐛 FIX (S14): U transakce Dluh/Splatka se nyni uklada Penezenka i Typ platby (driv prazdne „–" ve vypisu). Stejne tak u Presunu pribyl vyber Typ platby (mezi penezenkami i do investic).',
      '🐛 FIX (S14): Karta pujcky – bar nyni ukazuje skutecne ZAPLACENO (zelene) + po splatnosti (cervene) z celkove castky misto matouciho (1-zbyva/celkem). Pod barem popisek zaplaceno/celkem.',
      '🐛 FIX (S14): Prehled splaceni – dlouhe castky se uz neorezavaji na „...". Pujcka bez castky/splatky ukaze srozumitelnou hlasku misto samych nul.',
    ]
  },
  {
    verze: 'v8.29',
    datum: '2026-06-24',
    zmeny: [
      '💳 NEW (S14, f4): Dluh/Splatka v modalu nyni smeruje pres REALNOU kategorii „Splatka" + vyber druhu splatky (Hypoteka, Splatka uveru...). Pri vyberu pujcky se druh navrhne automaticky dle typu. Konec „?" u kategorie u splatek (stare zaznamy resi i fallback v getCat).',
      '📊 NEW (S14, f2): Karta pujcky ukazuje Zaplaceno (pocet splatek) + Na jistine + Na urocich (pocitano z realnych transakci s debtId). Rozbalovaci tabulka „Splatky a transakce" – planovano vs zaplaceno, stav ✓/✗, kliknutim na castku se otevre transakce.',
      '🔁 NEW (S14, f3): U Dluh/Splatka zaskrtavatko „Opakovana splatka" + frekvence (mesicne/14 dni/7 dni). Nastavi u pujcky pravidelnou splatku a vygeneruje kalendar – pristi splatky se objevi v Budoucich platbach.',
      '✏️ (S14): Editace splatky se otevre primo v rezimu Dluh/Splatka s vybranou pujckou; editace vkladu do investic v rezimu Presun → Do aktiv.',
    ]
  },
  {
    verze: 'v8.28',
    datum: '2026-06-24',
    zmeny: [
      '🔄 NEW (S14): Modal transakce – tlacitko Presun ma nyni pod-prepinac: „Mezi penezenkami" (puvodni prevod) a „Do investic & sporeni". Druhy rezim zapise jedinou transakci do transfer-kategorie (Investice/Sporeni/Rezerva...) – snizi penezenku, ale NEpocita se jako vydaj a roste v karte „Moje uspory a investice". Konecne lze z modalu zadat penize smerujici do aktiv.',
      '🧰 NEW (S14): Admin → Udrzba dat → Migrace presunovych kategorii. Prevede Investice/Trading/Sporeni na typ Presun + doplni Financni rezerva/Fondy/Penzijko ze seedu. Idempotentni. Financni urad a Pujcka zustavaji „oboje".',
      '🐛 FIX (S14): getCat ma built-in fallback pro synteticka ID – debt-payment → „💳 Splatka", transfer → „🔄 Presun". Splatky dluhu uz nezobrazuji „?" u kategorie.',
      '🧹 (S14): categories.json sjednocen se seedem DEFAULT_CATEGORIES (transfer-kategorie cat_t_*). Editace transfer-transakce v Historii ji otevre rovnou v rezimu Presun → Do aktiv.',
    ]
  },
  {
    verze: 'v8.27',
    datum: '2026-06-20',
    zmeny: [
      '💎 NEW (S13, faze 2): Napojeni presunu na prehled - nova dashboard karta Moje uspory a investice. Ukazuje kolik penez smeruje do Investic a Rezervy/Sporeni (kumulativne + tento mesic) + rozpad podle kategorie. Hodnoty pocitany z transfer-transakci (computeTransferTotals) - vydaj=vklad, prijem=vyber, net=vklady minus vybery. Nemutuje data, vzdy konzistentni s transakcemi.',
      '📝 PLAN (S13): Dalsi faze - tabulky a grafy vyvoje investic/sporeni v case + moznost propsat do realnych zaznamu Financnich aktiv (S.assets).',
    ]
  },
  {
    verze: 'v8.26',
    datum: '2026-06-20',
    zmeny: [
      '🔁 NEW (S13): Frekvence vyplaty v Nastaveni (vedle Den vyplaty): mesicne / 14denne / tydne / 2x mesicne (zaloha+doplatek) / nepravidelne (OSVC, davky). Runway do vyplaty nyni respektuje frekvenci - cyklus se pocita podle ni, ne natvrdo mesicne.',
      '🎲 NEW (S13): Nepravidelny rezim Runway - cyklus od posledni prijmove transakce do pristi ocekavane podle prumerneho odstupu poslednich prijmu (matarska, davky, freelance). Tydenni/14denni krokuji od realneho prijmu/kotvy o 7/14 dni. 2x mesicne pocita 2 vyplaty (kotva + 15 dni). Tabulka tydnu cyklu se automaticky prizpusobi delce cyklu.',
      '💡 (S13): Runway zobrazuje aktivni frekvenci + delku cyklu v hintu. Nepravidelny rezim ukazuje prumerny odstup prijmu.',
    ]
  },
  {
    verze: 'v8.25',
    datum: '2026-06-20',
    zmeny: [
      '🔄 NEW (S13): Novy typ kategorie PRESUN (transfer) vedle Prijem/Vydaj/Oboji. Transakce v techto kategoriich se NEPOCITAJI jako vydaj (nesnizi celkovy majetek), ale penezenka se upravi (penize realne odesly). Ukazuji kolik penez smeruje na investice/rezervu/sporeni. isTransferTx rozsiren o detekci kategorii type:transfer (pres _transferCatIds Set, rebuild v renderPage).',
      '📈 NEW (S13): Vychozi transfer-kategorie: Investice, Trading, Financni rezerva, Sporeni, Fondy, Penzijko (vsechny type:transfer, vlastni podkategorie). Stare redundantni Sporeni/Investice/Trading (expense/both) odstraneny - bez uzivatelu, cistejsi. V Oboji zustavaji Financni urad + Pujcka.',
      '📝 PLAN (S13): Dalsi faze - propsani transfer-kategorii a podkategorii do Financnich aktiv (transakce do Investice navysi investicni aktivum) + dashboard karta kam jdou penize + tabulky/grafy pro investice/sporeni/rezervu.',
    ]
  },
  {
    verze: 'v8.24',
    datum: '2026-06-20',
    zmeny: [
      '🏷️ NEW (S13): Verzovaci hlavicka na zacatku kazdeho zmeneneho souboru (// FinanceFlow vX.XX soubor datum). Plati pro vsechny JS, worker.js, sw.js i database_rules.json (Firebase prijima // komentare). Diky tomu je na prvni pohled videt zda je soubor aktualni verze - zadne dohadovani stara/nova verze.',
      '📝 DOC (S13): Vytvoren patch-session13.md + aktualizovany dotcene MD soubory (bugs, todo, decisions, Resume, VERSIONING, context). Session 13: v8.10 -> v8.24.',
    ]
  },
  {
    verze: 'v8.23',
    datum: '2026-06-18',
    zmeny: [
      '↔️ NEW (S13): Sdilene podkategorie jsou nyni vizualne oznacene. Kdyz podkategorie (napr. Pojisteni v Bydleni, Alkohol v Jidlo a piti) existuje zaroven jako samostatna kategorie ktera se sem hlasi pres shared, dostane prerusovany zlaty ramecek + sipku symbol a tooltip se jmenem a COICOP samostatne kategorie. Doplnuje stavajici COICOP kruh (override) u podkategorii.',
    ]
  },
  {
    verze: 'v8.22',
    datum: '2026-06-18',
    zmeny: [
      '🐛 FIX (S13): Budouci platby - kliknuti na cil shazovalo aplikaci (Uncaught ReferenceError: nakupSwitchTab is not defined). Pricina: budouci.js volal zastaraly nakupSwitchTab(cile) ktery byl odstranen kdyz se cile presunuly z Nakupniho seznamu do stranky Prani a narozeniny. Opraveno na showPage(narozeniny). Klicove funkce nakup.js navic explicitne zpristupneny na window (robustnost).',
    ]
  },
  {
    verze: 'v8.21',
    datum: '2026-06-18',
    zmeny: [
      '🤖 NEW (S13): API tracking - worker.js nyni krome poctu volani uklada i TOKENY (in/out/total) a ODHAD NAKLADU v Kc (tokeny x cena Sonnet x kurz). Per user, per typ (tokens_<typ>, cost_<typ>) do users/{uid}/aiUsage/{mesic}. recordTokens() vola se po odpovedi Claude.',
      '📊 NEW (S13): Admin detail uzivatele - sekce Spotreba AI: pocet volani, tokeny, naklady v Kc za aktualni mesic + rozpad podle typu (uctenky/vypisy/chat/radce/URL import). Historie mesicu.',
      '🌍 NEW (S13): Admin Statistiky - karta Komunitni aktivita a spotreba AI: agregace vsech uzivatelu (celkem uzivatelu, aktivnich, transakci, AI volani), odhad celkovych nakladu, volani podle typu (bar graf), top uzivatele podle nakladu.',
      '🔧 NEW (S13): database_rules.json - pridano pravidlo pro aiUsage (cteni vlastnik + admin). Worker zapisuje pres Admin SDK. Pripominka: tracking funguje jen kdyz ma worker OBA secrets FIREBASE_SERVICE_ACCOUNT i FIREBASE_DB_URL.',
    ]
  },
  {
    verze: 'v8.20',
    datum: '2026-06-18',
    zmeny: [
      '📊 NEW (S13): Export transakci do CSV - Nastaveni > Data a soukromi > Export transakci (CSV). Modal s vyberem obdobi (od/do) a typu (prijmy/vydaje/vse). Sloupce: datum, nazev, castka, mena, typ, kategorie, podkategorie, penezenka, typ platby, poznamka. Pro Excel/ucetnictvi/dane. JSON zaloha zustava zvlast.',
      '🔍 NEW (S13): Vyhledavani napric mesici - v Transakcich novy prepinac Hledat ve vsech mesicich. Kdyz je zapnuty a zadany text/tag, prohleda vsechny transakce bez ohledu na zvoleny mesic.',
      '📅 NEW (S13): Mesicni checklist na dashboardu - opakuje se kazdy mesic: pridej vyplatu + zapis aspon 20 transakci. Resetuje se zmenou mesice, lze skryt. Doplnuje jednorazovy onboarding pruvodce.',
      '📖 NEW (S13): Vytvorena stranka napovedy (napoveda.html) pro financeflow.cz - navod jak zacit, klicove funkce, skenovani uctenek, cile, rozpocet, tipy, FAQ. V duchu landing page.',
    ]
  },
  {
    verze: 'v8.19',
    datum: '2026-06-18',
    zmeny: [
      '🔢 FIX (S13): Komunita Ja vs komunita - zobrazovala COICOP klice jako cisla (1, 4, 6). Nyni se mapuji na oficialni nazvy COICOP divizi (🛒 Potraviny a nealkoholicke napoje atd.). Obe strany (ty i komunita) se pocitaji podle COICOP divizi pres computeCoicopAggregates - konzistentni. Tve kategorie se spravne priradi podle coicop cisla.',
      '⚠️ NEW (S13): Pri prejmenovani kategorie s COICOP zarazenim se zobrazi upozorneni, ze COICOP zustava stejny (nove transakce se pocitaji do puvodni divize bez ohledu na novy nazev). Doporuci vytvorit novou kategorii pokud je potreba jine zarazeni.',
    ]
  },
  {
    verze: 'v8.18',
    datum: '2026-06-18',
    zmeny: [
      '👥 FIX (S13): Prepnuti na partnera (mobil i PC) - switchToPartner odolny vuci chybejicim prvkum (null-safe), zavre sidebar, prida toast. Driv mohl spadnout pred renderPage kdyz nektery prvek hlavicky chybel/byl jinde -> nepreplo to data.',
      '📜 NEW (S13): Bezove (sepia) tema - teply ton setrny k ocim, mezi tmavym a svetlym. 4. moznost v Nastaveni -> Barevne tema (2x2 mrizka).',
      '📊 NEW (S13): Skore aktivity uzivatele v admin detailu - bar Neaktivni/Prumerny/Aktivni z poctu transakci + cerstvosti posledni aktivity. Zadny novy sber dat (telemetrie), jen existujici udaje.',
      '🖥️ NEW (S13): Tabulka transakci (jen web/desktop) - pridany sloupce Typ platby a Penezenka. Na mobilu skryte (filtry jsou v rozsirenem filtru). Split radky doplneny o prazdne bunky.',
    ]
  },
  {
    verze: 'v8.17',
    datum: '2026-06-18',
    zmeny: [
      '📊 FIX (S13): Komunitni prehled Ja vs komunita - dva bary (Prumer + Vy) slouceny do JEDNOHO pruhu. Modra = prumer komunity, zelena = ty (pod prumerem), cervena = prebytek (nad prumerem). Citelne hodnoty pod barem. Driv matouci 2 bary na kategorii.',
    ]
  },
  {
    verze: 'v8.16',
    datum: '2026-06-18',
    zmeny: [
      '🔧 FIX (S13): Filtr Typ platby v Transakcich zobrazoval jen Vse/Presun - nyni pouziva getPayTypes (vsechny typy vcetne Edenred).',
      '👁️ FIX (S13): Admin Zobrazit aplikaci jako uzivatel - nactou se data uzivatele do partnerData PRED prepnutim (driv zustal admin na svych datech, protoze partnerData byla prazdna).',
      '📐 FIX (S13): Filtry transakci sjednoceny do mrizky stejne sirky (2 sloupce, mobil 1) misto nepravidelnych radku 2-3-2.',
      '🔒 NEW (S13): Kategorie Virtualni presun je systemova - pro ne-admina gold ohraniceni + skryta tlacitka edit/smazat/stabilni/presun (oznaceni systemova). Admin ma plnou kontrolu.',
      '😄 NEW (S13): Uvitaci hlaska (admin) - klikaci sada 28 emotikonu pro ikonu i pro vkladani do textu zpravy. Driv byla ikona jen textovy input.',
    ]
  },
  {
    verze: 'v8.15',
    datum: '2026-06-18',
    zmeny: [
      '🚨 KRITICKY FIX (S13): Unik dat mezi uzivateli. Pri odhlaseni se nyni vola resetAppState() - odpoji realtime listener vlastniho i partnerskych uzlu, vynuluje S/partnerData/viewingUid PRED zrusenim _currentUser. onUserSignedIn navic resetuje stav na zacatku. Zabranuje zapisu dat predchoziho uzivatele do uzlu noveho pri strdani uctu na zarizeni.',
      '🧹 FIX (S13): seedData() pro noveho uzivatele = CISTA aplikace. Zadne fiktivni/demo transakce, dluhy, penezenky, cile, predplatna. Pouze sdilene kategorie + typy plateb z kodu (globalni nastaveni admina). Nove uzivatele zacinaji s prazdnymi daty.',
      '🗑️ FIX (S13): Mazani dat na 100%. confirmDeleteAllData nyni odpoji listener, smaze IndexedDB snapshot (ff_snapshot_db) i spravne localStorage klice (ff_snapshot_{uid}), pak resetuje stav. Driv se mazaly spatne klice a IDB snapshot prezival -> data se vracela.',
      '🔧 FIX (S13): URL import + vsechny AI funkce (sken uctenek, AI Radce) - worker.js pouzival vyrazeny model claude-sonnet-4-20250514 (404). Aktualizovano na claude-sonnet-4-6. Nasadit worker.js zvlast pres CF Dashboard.',
      '🔓 FIX (S13): database_rules.json - pridano pravidlo pro welcomeMessage (cteni vsichni prihlaseni, zapis jen admin). Driv chybelo -> PERMISSION_DENIED pri ukladani uvitaci hlasky. Nahrat pravidla do Firebase konzole.',
    ]
  },
  {
    verze: 'v8.14',
    datum: '2026-06-18',
    zmeny: [
      '🧹 FIX (S13): Kategorie virtualnich presunu - ciste reseni bez vymyslenych ID. Kod hleda realnou kategorii uzivatele podle nazvu (findCatIdByName Virtualni presun) a pouzije jeji skutecne ID + podkategorie (Vklad do cile / Reverz). getCat vracen do puvodni ciste podoby, odebrana migrace ensureVirtualTransferCat i kategorie z DEFAULT_CATEGORIES. Vse je v datech uzivatele - kategorizovatelne a statistikovatelne.',
      '👑 FIX (S13): Admin (UID LNEC...) ma ve workeru vlastni tier admin s limitem 9999 - zadny free rate_limit na URL import a dalsi AI funkce. Nasadit worker.js zvlast pres CF Dashboard.',
      '🔍 INFO (S13): URL import rate_limit byl zpusoben free limitem (5/mesic) - po nasazeni workeru s admin tierem vyreseno. Worker scraping funguje.',
    ]
  },
  {
    verze: 'v8.13',
    datum: '2026-06-18',
    zmeny: [
      '💱 FIX (S13): Transakce v cizi mene (eurova penezenka) se zobrazuji se spravnou menou (EUR/GBP), ne natvrdo Kc. Plati pro castku i bezici zustatek v zavorce, na desktopu i mobilu. Prepocet do cile (toCZK) byl spravne, slo o zobrazeni.',
      '🔧 FIX (S13): Kategorie virtualnich presunu zobrazuje ? - getCat ma nyni built-in fallback pro virtual_transfer (🎯 Virtualni presun) a transfer (🔄 Prevod). Funguje i kdyz kategorie neni v datech uzivatele.',
      '💳 FIX (S13): Typy plateb v Pridat transakci synchronizovany s tabulkou Typy plateb (populateTxPayTypeSelect pouziva getPayTypes) - chybejici Edenred/Stravenky a dalsi vychozi se nyni zobrazuji.',
    ]
  },
  {
    verze: 'v8.12',
    datum: '2026-06-18',
    zmeny: [
      '🎨 FIX (S13): Sjednoceny modal Prani/Cil je nyni 1:1 - oba typy maji VSECHNA pole (ikona, URL import, nazev, popis, cena/cilova castka, priorita, mesicni vklad, deadline). Lisi se jen popisky. saveWish/editWish ukladaji a nacitaji vsechna pole pro oba typy.',
      '🏷️ NEW (S13): Nova kategorie Virtualni presun (id virtual_transfer) + podkategorie Vklad do cile / Vyber z cile. Transakce prevodu do/z cile se zaradi sem (zadne ? u kategorie). Poznamka obsahuje nazev cile + zdrojovou penezenku. Migrace ensureVirtualTransferCat pro stavajici uzivatele.',
      '🙈 FIX (S13): U virtualnich presunu odebrana editacni tlacitka (rozdelit/editovat/smazat) v Transakcich - sprava jen v sekci Cile. Editace castky obchazela reverz logiku.',
      '🔍 FIX (S13): URL import - robustnejsi parsovani odpovedi (hleda text blok, JSON i v textu), lepsi chybove hlasky, status ukazuje nactenou cenu. Worker cte cenu z JSON-LD/meta. Nasadit worker.js zvlast.',
      '🎭 FIX (S13): Chord diagram Tok vydaju (Statistiky) - popisky segmentu pod 3 % skryty u kruhu (zustavaji v legende + tooltip), leader-line a jemne rozhozeni proti prekryvani textu.',
    ]
  },
  {
    verze: 'v8.11',
    datum: '2026-06-18',
    zmeny: [
      '💰 NEW (S13): Dashboard widget Virtualni penezenka (zlute kolecko) s nasporenou hodnotou a % naplneni - renderDashVirtualWallet v renderDashboard.',
      '💱 NEW (S13): Sumarizace majetku/dashboardu prepocitava penezenky na CZK (walletBalanceCZK + computeNetWorth). Jednotlive penezenky zustavaji ve sve mene (zobrazena u radku). Resi nesmyslny cisty majetek pri mixu CZK/EUR/GBP.',
      '🔄 NEW (S13): Smazani transfer transakce do cile smaze i parovy vklad (reverseGoalDepositForTx v deleteTx).',
      '💱 FIX (S13): Financni aktiva - jednotlive penezenky v cizi mene maji sloupec original (EUR/GBP) + prepocet CZK. Soucet majetku v CZK.',
      '💰 FIX (S13): Dashboard - virtualni penezenka presunuta do Cisteho majetku jako radek (zlute kolecko, hodnota v Kc). Doplneny jednotky Kc k vsem castkam v net worth. Ciri meny zobrazeny prepoctene na CZK.',
      '🎨 FIX (S13): Modal Prani/Cil - sjednocena struktura poli (jeden sloupec), klikaci sada 20 ikon misto textoveho inputu.',
      '🔍 FIX (S13): URL import - worker.js cte cenu z JSON-LD a meta tagu (og:price, product:price), nejnizsi cena, vylepseny prompt pro popis. Nasadit worker zvlast pres CF Dashboard.',
      '📝 FIX (S13): Karta cilu prejmenovana Aktivni -> Cile. Virtualni penezenka v Cilech vracena na v8.09 styl (💰 bez zluteho puntiku). Pridano pocitadlo Nasporeno/Celkovy cil/Zbyva + bar celkovy pokrok (presunuto z Penezenek).',
    ]
  },
  {
    verze: 'v8.10',
    datum: '2026-06-16',
    zmeny: [
      '🔧 FIX (S13): REVERZ penez - vklad do cile si pamatuje walletId/walletAmount/walletCurrency/txOutId. Pri smazani cile, vkladu nebo oznaceni splneno se smaze parova vydajova transakce a penize se vrati na puvodni penezenku (pres computeWalletBalance). Zadne dvoji odecteni.',
      '💱 NEW (S13): Menovy prepocet u prevodu do cile - pouziva _FX_RATES z debts.js (toCZK). 30 EUR z eurove penezenky = 30*kurz CZK do cile. Reverz vraci originalni castku v puvodni mene.',
      '🎯 NEW (S13): Prevod Z cile zpet na penezenku (transferFrom podporuje goal:ID). Zaporny vklad snizi nasporeno.',
      '🚧 NEW (S13): Hlidani cilove castky - vklad nelze prekrocit cil, nabidne vlozit jen zbyvajici castku.',
      '🏆 NEW (S13): Splneni cile - tlacitko Oznacit jako splneno (goalMarkDone) vrati penize + presune do zalozky Splneno. Nova zalozka Aktivni/Splneno (cileSwitchTab).',
      '📝 NEW (S13): Banner v Aktivni - Aktivnich cilu / Pasivnich (prani) / Splneno. Virtualni penezenka s nasporenou hodnotou (zlute kolecko). Dve tlacitka Nove prani / Novy cil bez prepinace (prepinac jen v editaci). Karta prejmenovana na Prani a cile.',
      '🙈 FIX (S13): Skryt rucni vklad (penezenkove tlacitko) i + u cilu v Penezenkach - prevody jen pres prevodnik mezi penezenkami.',
    ]
  },
  {
    verze: 'v8.09',
    datum: '2026-06-15',
    zmeny: [
      '🎯 NEW (S13): Sjednoceny modal Prani/Cil - prepinac typu (Prani/Cil), pri Cil se zobrazi ikona, mesicni vklad, deadline a odhad doby; pri Prani priorita a URL import. Jedno tlacitko + Pridat. saveWish uklada podle typu (prani vs isGoal:true).',
      '📝 NEW (S13): Karty prejmenovany - Prani & nakupy -> Plany a cile; sekce cilu -> Aktivni. renderWishList nyni jen prani (!isGoal), cile v sekci Aktivni pres renderNakupCile. Dva oddily.',
      '🔧 FIX (S13): charts.js - odstraneny duplicitni definice openWishModal/saveWish (byly 2x). openGoalModal presmerovan na sjednoceny modal.',
    ]
  },
  {
    verze: 'v8.08',
    datum: '2026-06-15',
    zmeny: [
      '📦 NEW (S13): Plany a cile presunuty z Nakupniho seznamu do sekce Narozeniny a prani (pod Prani & nakupy). Odstranen tab system z nakup.js (renderNakup renderuje rovnou seznam). renderNakupCile cili na #cileContent. renderNarozeniny v charts.js vola renderNakupCile. Odkazy Spravovat cile vedou na stranku narozeniny.',
    ]
  },
  {
    verze: 'v8.07',
    datum: '2026-06-15',
    zmeny: [
      '🐛 FIX (S13): Pro karta byla nejmensi (mela 5 polozek vs Free 8). align-items:stretch srovnava vysku vsech karet, tlacitka zarovnana dole (tier-feats flex:1). Zmensen tilt translateZ -40->-10 aby bocni karty nebyly opticky mensi.',
      '🐛 FIX (S13): Feature ikony se orezavaly - gap 11->14px, .fi width 26->30px, vetsi odstup textu od ikony.',
    ]
  },
  {
    verze: 'v8.06',
    datum: '2026-06-15',
    zmeny: [
      '🎨 NEW (S13): Tier ikony - zapojeny realne 3D skleneni orby (Free=sukulent, Premium=diamant, Pro=raketa) dodane uzivatelem, oriznute na ctverec 96px, vlozeny pres .tier-orb s drop-shadow glow v barve tieru.',
      '📝 NEW (S13): Premium features prepsany - Skenovani uctenek + analyza/statistiky, Predikce vydaju + tempo utraceni, Pokrocile grafy, Mesicni reporty 3-12 mesicu + Poradce, Sdileni.',
      '🔒 NEW (S13): Free omezen - dostupny jen Mesicni report (1 mesic). Zamceno: AI Poradce, Sken uctenek, Predikce, Sdileni.',
    ]
  },
  {
    verze: 'v8.05',
    datum: '2026-06-15',
    zmeny: [
      '🔧 FIX (S13): Tier ikony - PNG z canvasu vychazely jako prazdne obdelniky (napi-rs/canvas neumi vykreslit emoji). Nahrazeny cistymi inline SVG (rostlina/diamant/raketa) v glossy odznaku - ostre, bez orezavani, v barve tieru. Pridan overflow:visible.',
    ]
  },
  {
    verze: 'v8.04',
    datum: '2026-06-15',
    zmeny: [
      '🎨 NEW (S13): Tier karty - 3D PNG ikony vygenerovane pres @napi-rs/canvas (120x120px): modra/zlata/fialova s vnitrnim leskm, LED diodou dole a svitici horni carou. Odstranen popisek Zrusit lze kdykoliv. Opravena orizla ikona (min-width:26px). Karty zmenseny o 10% (padding 24px 22px).',
      '🔧 FIX (S13): firebase.js - RESET_CODE_SETTINGS pro sendPasswordResetEmail s continueUrl financeflow.cz/app. Po zmene hesla Firebase presmeruje na appku misto zobrazeni sveho HTML na firebaseapp.com.',
      '🔧 FIX (S13): tier-price nowrap - 299 Kc se uz nezalamuje na dva radky. Font-size 2.2rem.',
    ]
  },
  {
    verze: 'v8.03',
    datum: '2026-06-15',
    zmeny: [
      '🎨 NEW (S13): Tier karty - vyraznejsi 3D tilt (bocni karty natocene 11st ke stredu), LED lampa pod spodni hranou v barve karty, corner stuha obtacejici roh. Popisky tieru: Free=Zacni zdarma, Premium=Chytre finance, Pro=Finance bez limitu. Premium tlacitko Vyzkouset Premium + fajfka 30 dni zdarma. Trust lista (ChatGPT styl) pod kartami.',
      '🔧 FIX (S13): firebase.js - ACTION_CODE_SETTINGS (continue URL financeflow.cz/app) v sendEmailVerification. Po overeni e-mailu uzivatel skonci na nasi domene i kdyz console Action URL bugu.',
      '🐛 FIX (S13): Free karta - odstranen popisek Bez platebni karty (redundantni).',
    ]
  },
  {
    verze: 'v8.02',
    datum: '2026-06-15',
    zmeny: [
      '🎨 NEW (S13): Tier karty PREDELANY na 3D panely - vrstvene stiny, svitici ram, vypoukle ikony, Premium nadzvednuta + glow. Pridana bezpecnostni lista pod kartami (Bezpeci/Data/Sync/Zruseni).',
      '🐛 FIX (S13): Donate tlacitko - paywall se uz nezavira (modalDonate ma z-index 8500 nad paywallem 8000). Stranka uz nepada na Dashboard.',
      '🐛 FIX (S13): Sidebar logo - zruseno overflow:hidden ktere rezalo Flow na vysku. Font 1.15rem, line-height 1.3.',
      '🐛 FIX (S13): app.js updateSidebarUser - jmeno se odvozuje z e-mailu (jan.havran -> Jan Havran) kdyz chybi displayName, misto 2x e-mail.',
      '🔒 FIX (S13): Pridany zamky k Analyza uctenek + Nakupni seznam (showPagePremium + navlock + PREMIUM_PAGES).',
    ]
  },
  {
    verze: 'v8.01',
    datum: '2026-06-15',
    zmeny: [
      '🐛 FIX (S13): Sidebar logo zkraten font, label Free/Trial/Premium/Pro dynamicky pres sidebarTierLabel.',
      '🐛 FIX (S13): user-email citelnejsi (font .75rem, color text2).',
      '🐛 FIX (S13): Donate tlacitko - closePaywall() pred openDonateModal().',
      '🐛 FIX (S13): closePaywall() - odstranen renderPage() ktery zpusoboval pad na Dashboard.',
    ]
  },
  {
    verze: 'v8.00',
    datum: '2026-06-15',
    zmeny: [
      '✅ NEW (S13): firebase.js – handler pro Custom Action URL: applyActionCode() zpracuje ?mode=verifyEmail&oobCode=XXX při přesměrování z ověřovacího e-mailu. Odkaz vede na financeflow.cz/app (ne firebaseapp.com). Po ověření čistá URL + zelená hláška.',
      '✅ NEW (S13): firebase.js – resetPassword mode: při přesměrování z reset e-mailu automaticky otevře reset formulář.',
    ]
  },
  {
    verze: 'v7.99',
    datum: '2026-06-15',
    zmeny: [
      '🔧 FIX (S13): Dokup AI tokenů – opraveny ceny. Místo Alocan ceníku nyní 2 jednoduché balíčky: Malý 10 tokenů / 39 Kč, Větší 20 tokenů / 69 Kč (lepší cena). 1 token = 1 AI akce. Tokeny se použijí až po vyčerpání měsíčního limitu a nepropadají.',
    ]
  },
  {
    verze: 'v7.98',
    datum: '2026-06-15',
    zmeny: [
      '✨ NEW (S13): app.html + styles.css – PŘEPRACOVANÝ PAYWALL: 3 tier karty vedle sebe (Free 0 / Premium 149 / Pro 299 Kč), statické (bez hover efektů), svítící horní hrana v barvě tieru, Premium označen „TOP VOLBA" se stálou září. Hero cena v Syne fontu. Ikony u funkcí místo odrážek. Logo FinanceFlow zachovává firemní barvy (Finance bílá, Flow zelená).',
      '✨ NEW (S13): DONATE sekce (žlutá) pod kartami s vlastním textem. Tlačítko volá openDonateModal().',
      '✨ NEW (S13): premium.js – Dokup AI kreditů (Alocan styl): balíčky Start 500/149 Kč, Growth 1500/349 Kč (nejlepší poměr), Power 5000/600 Kč + sekce „Jak se kredity počítají" a „Kontrola nákladů". buyCredits() zatím placeholder (čeká na Stripe). Kredity izolované per UID (aiUsage), nesdílí se mezi uživateli.',
      '🔧 (S13): Pro tier a dokup kreditů zatím „Brzy dostupné" – aktivní jen Trial (zdarma) a Donate.',
    ]
  },
  {
    verze: 'v7.97',
    datum: '2026-06-15',
    zmeny: [
      '🔒 NEW (S13): firebase.js – OVĚŘENÍ E-MAILU: po registraci se odešle ověřovací odkaz (sendEmailVerification) a uživatel je odhlášen – do aplikace se dostane až po kliknutí na odkaz. Při loginu s neověřeným e-mailem (provider password) se přístup blokuje a pošle se nový odkaz. Google login je ověřený automaticky. Pojistka i v onAuthStateChanged.',
      '🔒 NEW (S13): premium.js – FREE ZÁMKY AKTIVNÍ: nový uživatel = FREE (dřív se automaticky aktivoval trial). hasPremiumAccess() už nevrací true pro free. Zámky u Premium kategorií (AI Rádce, účtenky, PDF import, sdílení, nákupní seznam) reálně blokují free uživatele.',
      '🎁 NEW (S13): premium.js – TRIAL OPT-IN 1×: tlačítko „Začít 30denní trial" nyní trial SKUTEČNĚ aktivuje (dřív jen alert). Kontrola využití 1× per UID (premium.trialUsed) I 1× per e-mail (globální node trialsUsed/{emailKey}) – brání opakování přes nový účet se stejným e-mailem. Zrušeno auto-prodlužování vypršelého trialu (po 30 dnech → free).',
      '🔧 FIX (S13): database.rules.json – přidán node trialsUsed (read: přihlášený, write: jen vlastní uid + no-overwrite cizího záznamu).',
    ]
  },
  {
    verze: 'v7.96',
    datum: '2026-06-15',
    zmeny: [
      '🐛 FIX (S13): firebase.js – KRITICKÝ BUG: registrace/přihlášení e-mailem házelo „Chyba (undefined)“. Kód volal compat API firebase.auth() (v8), ale firebase.js používá modulární SDK v10 – globální firebase objekt neexistoval. Přepisy na modulární: createUserWithEmailAndPassword(auth,…), signInWithEmailAndPassword(auth,…), sendPasswordResetEmail(auth,…) + přidány importy.',
      '🐛 FIX (S13): firebase.js – KRITICKÝ BUG: přihlášení e-mailem nefungovalo (ReferenceError: submitEmailAuth/switchEmailTab is not defined). firebase.js je ES modul (type=module) → funkce byly privátní. Přidány window exporty: submitEmailAuth, switchEmailTab, togglePwVisible, showResetPassword, hideResetPassword, sendPasswordReset. Bez nich onclick v HTML funkce nenašel.',
      '🐛 FIX (S13): app.html – Sentry loader: odstraněn crossOrigin=anonymous (způsoboval CORS chybu při načítání z js-de.sentry-cdn.com). Sentry CDN nepotřebuje CORS atribut pro běžné načtení scriptu.',
      '✅ NEW (S13): worker.js v6 – AI Rate Limiting (ADR-041): Firebase Admin SDK přes JWT/WebCrypto, per-type měsíční kvóty Free/Trial/Premium, fail-open při výpadku. Nasazení ručně přes Cloudflare Dashboard + 2 secrets.',
      '🔧 FIX (S13): firebase.json – přidána sekce database (rules: database.rules.json) + oprava názvu v ignore listu (tečka místo podtržítka). Teď firebase deploy --only database funguje.',
    ]
  },
  {
    verze: 'v7.94',
    datum: '2026-06-14',
    zmeny: [
      '🐛 FIX (S12.1s): projects.js – Radar „Kam směřuju" PŘEPRACOVÁNA LOGIKA: sloupce se už nepřekrývají. Plánovaný výdej = skutečná útrata + odhad zbytku měsíce z denního tempa (dřív slepý 3měsíční průměr avgExp). Budoucí platby = jen známé naplánované platby. Cashflow = Příjem − Plánovaný výdej − Budoucí platby (prosté odečtení místo matoucího max()).',
      '✅ NEW (S12.1s): projects.js – „Kam směřuju": tečkovaná čára SKUTEČNÉHO stavu (kde jsi teď, X. den měsíce) přes sloupce odhadu – skutečný cashflow je výš, protože měsíc ještě neskončil. Pod grafem rozepsaný výpočet cashflow (Příjem − Plán − Budoucí) + vysvětlení plánovaného výdaje.',
    ]
  },
  {
    verze: 'v7.93',
    datum: '2026-06-14',
    zmeny: [
      '🎨 UI (S12.1r): ui.js – Dashboard Treemap: tooltipy (tap dlaždice → kontextové pole s názvem, částkou, % výdajů) + 3 vrstvy dle podílu (>15% / 5-15% / <5%) místo 2 → vejde se víc kategorií čitelně, vyšší dlaždice.',
      '🐛 FIX (S12.1r): transactions.js – Predikce graf Tempo: verdikt „Utrácíš o X% pomaleji" přesunut POD graf (dřív na top-12 překrýval legendu „Tento měsíc / Průměr").',
      '🎨 UI (S12.1r): transactions.js + styles.css – Predikce tabulka: white-space:nowrap na buňky (číslice se už nezalamují na 2 řádky – YTD, Doprava…), sloupec Kategorie min 130px (nezalomené záhlaví), širší měsíční sloupce. Přidána VYSVĚTLIVKA barev/popisků (tučné=skutečnost, modré=predikce, zelené/červené=rozdíl u minulých měsíců, „+12% sez.“=sezónní přirážka).',
      '🎨 UI (S12.1r): transactions.js – Predikce graf Sezonalita: osa Y po 10 % místo 5 % (méně čar, čitelnější), větší font popisků os.',
    ]
  },
  {
    verze: 'v7.92',
    datum: '2026-06-13',
    zmeny: [
      '🐛 FIX (S12.1q): OPRAVA ZÁMKŮ z v7.91 – omylem skryt „Import dat" (CSV/Excel/PDF) místo „Import z banky". Nyní správně: „Import dat" dostupný všem, „Import z banky" (SMS/push parsing, smsimport) skryt v menu pro neadminy (checkAdminNav). PDF výpis v Import dat = Premium (handlePdfFile gate bankImport), CSV + Excel zůstávají ZDARMA pro Free.',
      '✅ NEW (S12.1q): app.html – rozšířena nabídka měn u peněženky (14 měn: CZK, EUR, USD, GBP, PLN, CHF, HUF, NOK, SEK, DKK, JPY, CAD, AUD, UAH).',
      '🐛 FIX (S12.1q): app.html – Typ platby: emoji vstup měl maxlength=2 (blokoval složené emoji) → zvýšeno na 8 + rychlý emoji picker (12 ikon klikem), větší zobrazení.',
    ]
  },
  {
    verze: 'v7.91',
    datum: '2026-06-13',
    zmeny: [
      '🔒 NEW (S12.1p): premium.js – TIER SYSTÉM free / premium / pro (trial = premium). TIER_PRICES {premium:149, pro:299 Kč/měs}. getUserTier/hasTier/canUseFeature/gateFeature – centrální brána. Admin = vždy pro. activatePremiumManually(uid, months, tier) podporuje pro.',
      '🔒 NEW (S12.1p): ZÁMKY na AI funkce (Free je nemá): AI Rádce + poradce v měsíčním reportu (advisorLoadAI – Premium), Analýza účtenek (analyzeReceipt + analyzeMultiReceipt – Premium), Nákupní seznam (renderNakup – Premium paywall), Sdílení/rodinný souhrn (showPagePremium – Premium). Import z banky jen ADMIN (lock + hide menu i stránka). CSV import zůstává bez AI.',
      'ℹ️ (S12.1p): Free tier má 0 AI volání kromě CSV importu (parsuje se bez AI). Reálný rate limiting kvót (Krok 2) vyžaduje Firebase Admin SDK ve workeru – samostatná session.',
    ]
  },
  {
    verze: 'v7.90',
    datum: '2026-06-13',
    zmeny: [
      '📱 NEW (S12.1o): ui.js + styles.css – TRANSAKCE NA MOBILU přepracovány na karty (Wallet styl): tap na řádek otevře editaci (split/účtenka rozbalí akordeon), kompletně viditelná částka vpravo, podkategorie u kategorie (Kategorie · Podkat), zůstatek peněženky pod částkou, tagy. Žádná akční tlačítka v řádku (✎/✕/split) – ta jsou až v editačním modalu. Desktop ponechán jako tabulka. Skryta tabulková hlavička na ≤820px, breakpoint sjednocen na 820px, re-render při resize/rotaci.',
    ]
  },
  {
    verze: 'v7.89',
    datum: '2026-06-13',
    zmeny: [
      '✅ NEW (S12.1n): announcements.js + admin.js + firebase.js – UVÍTACÍ HLÁŠKA pro uživatele: /welcomeMessage (title, body, icon, version, active). Zobrazí se JEDNOU při prvním spuštění jako modal přes obrazovku (ff_welcome_seen drží poslední viděnou verzi – zvýšením verze ji admin ukáže znovu i stávajícím). Editace v Admin → Oznámení (👋 Uvítací hláška) s tlačítkem Náhled. Připraveno na budoucí návod.',
    ]
  },
  {
    verze: 'v7.88',
    datum: '2026-06-13',
    zmeny: [
      '🐛 FIX (S12.1m): receipts.js – MIZEJÍCÍ EDITOR ÚČTENKY: po překliknutí stránek/záložek zůstal _receiptEditorOpen=true s osiřelým _editReceipt, což blokovalo render i nové otevření editoru. Nyní tvrdý reset stavu při každém openu, guard čistí flag i osiřelý stav, switchUctenkyTab zavírá editor při opuštění záložky.',
      '🐛 FIX (S12.1m): worker.js – kontaktní formulář posílá notifikaci přímo na bc.milda@gmail.com s reply_to na odesílatele (dřív info@→info@ smyčka závislá na ImprovMX forwardingu → Bounced). DEPLOY: worker.js ručně na Cloudflare Dashboard.',
    ]
  },
  {
    verze: 'v7.87',
    datum: '2026-06-13',
    zmeny: [
      '🎨 UI (S12.1l): budouci.js – přesun-šablona v budoucích platbách: neutrální modrá barva (var(--bank)) místo červené „výdajové", znaménko ↔ místo −, ikona ↔️. Vizuálně jasné, že nejde o výdaj, jen o pohyb na spořicí/investiční účet (likvidita ano, jmění ne).',
      '✅ NEW (S12.1l): budouci.js – u přesunu se v popisku zobrazí cílová peněženka „→ 🏦 Spoření na dovolenou · měsíčně" (z s.walletTo).',
    ]
  },
  {
    verze: 'v7.86',
    datum: '2026-06-13',
    zmeny: [
      '✅ NEW (S12.1k): assets.js – FINANČNÍ AKTIVA dle likvidity (Gemini struktura): 💧 Běžná a likvidní (peněženky se živými zůstatky z computeWalletBalance) / 📈 Střednědobá a investiční (investice, spoření, termínované, krypto) / 🏠 Nelikvidní a fyzická (nemovitosti, auta, kovy, umění). Net Worth karta nahoře + nový rozpad dle likvidity (barevné chipy).',
      '✅ NEW (S12.1k): assets.js + app.html – TRACK RECORD investic: a.valuations[{d,v}] – uživatel kdykoli zapíše aktuální hodnotu (📈 tlačítko na kartě, modal s historií a mazáním); poslední záznam = aktuální hodnota. Pole „Vloženo celkem" v modalu aktiva → karta ukazuje ▲/▼ zisk/ztrátu v Kč i % vs vklad.',
      '✅ NEW (S12.1k): assets.js – graf vývoje hodnoty (≥2 záznamy): osy s Kč, čárkovaná linka „vloženo", tooltip s rozdílem vs vklad (myš i dotyk). FIX: editace aktiva nyní MERGUJE (zachová valuations – dřív by je celý přepis objektu smazal).',
    ]
  },
  {
    verze: 'v7.85',
    datum: '2026-06-12',
    zmeny: [
      '✅ NEW (S12.1j): ui.js – průběžný zůstatek peněženky „(644 035 Kč)" u každé transakce (Wallet styl): počítá se chronologicky pro každou peněženku zvlášť, zobrazí se zeleně pod částkou; transakce bez peněženky zůstatek nemají.',
      '✅ NEW (S12.1j): ui.js – 📁 projekt badge v řádku transakce je klikací → otevře detail projektu (openProjectDetail).',
      '✅ NEW (S12.1j): receipts.js – ZOBRAZENÍ SLEV (detekce existovala od S10 ve worker promptu – it.discount, jen nebyla vidět!): „💸 ušetřeno X Kč" na kartě účtenky v Historii + nová karta „💸 Ušetřeno slevami" v záložce Učí se: tento měsíc / letos / celkem + sloupcový průběh posledních 6 měsíců.',
    ]
  },
  {
    verze: 'v7.84',
    datum: '2026-06-12',
    zmeny: [
      '✅ NEW (S12.1i): premium.js + app.html – ŠABLONA TYPU PŘESUN (opakovaná platba na spoření/rezervu): typ ↔️ Přesun v modalu šablony, výběr Z/Do peněženky, kategorie se skryje. Ruční použití i auto-šablona vytvoří PÁR transakcí s transferId – majetek se přesune (peněženky), statistiky nezasaženy. Budoucí platby přesun správně rezervují (peníze na spoření nejsou volné k utracení).',
      '📱 NEW (S12.1i): ui.js – na mobilu (≤820 px) TAP na běžný řádek transakce otevře editaci; řádky se splitem/účtenkou ponechávají akordeon. PC beze změny.',
      '✅ NEW (S12.1i): app.html + ui.js + debts.js – editační modal má dole akční tlačítka 🗑 Smazat (vlevo) a ✂️ Rozdělit (kde dává smysl – ne u splitů a účtenkových transakcí); u nové transakce skryta. Inspirace Wallet, ale s našimi detaily.',
    ]
  },
  {
    verze: 'v7.83',
    datum: '2026-06-12',
    zmeny: [
      '🐛 FIX (S12.1h): debts.js + app.html – PRÁZDNÝ MODAL u Přesunu a Dluhu/Splátky: setTxType skrýval sekci kategorií přes catPicker.parentElement.parentElement – po přestavbě modalu (kalkulačka/převodník) řetěz vylezl až na .modal-body a schoval CELÝ formulář. Nyní explicitní #catSection.',
      '🐛 FIX (S12.1h): helpers.js – nový isTransferTx(t); incSum/expSum VYLUČUJÍ přesuny mezi peněženkami (transferId / catId transfer). Převod 1000 Kč na spořicí účet už NENÍ výdaj a příchozí strana NENÍ příjem – jen pohyb majetku. Zůstatky peněženek (computeWalletBalance) je dál započítávají → spoření/bankovní rezerva v aktivech rostou správně.',
      '🐛 FIX (S12.1h): projects.js – přesuny vyloučeny z detekce výplaty (denní graf, radarPaydayInfo přichycení ±6 dní – aktuální i minulý cyklus, radarDetectPaydayDay medián) a z Runway výpočtů (víkend/všední tempo, flexibilní tempo) – velký převod na spoření by se jinak tvářil jako výplata.',
    ]
  },
  {
    verze: 'v7.82',
    datum: '2026-06-12',
    zmeny: [
      '🔄 REVERT (S12.1g): receipts.js – tabulka „Obchody v měsíci" vrácena na overflow-x:auto + min-width:380px (posuvník byl správný přístup, ořez byl záměrný). Původní formát s plnými názvy dnů a Kč.',
      '🔄 FIX (S12.1g): receipts.js – Trend útrat: řazení obchodů zpět dle celkové sumy (min 1 návštěva). SmVaK byl faktický účet za vodu, ne supermarket – řeší ho deduplikace a budoucí kategorizace, ne podmínka min 2 návštěvy.',
      '✅ FIX (S12.1g): receipts.js – „Pravidelně nakupuješ": odstraněn limit max 3 obchodů – zobrazí se všechny deduplikované prodejny.',
    ]
  },
  {
    verze: 'v7.81',
    datum: '2026-06-12',
    zmeny: [
      '🎨 UI (S12.1g): receipts.js – „Pravidelně nakupuješ" redesign pro mobil: počet nákupů jako modrý pill vlevo, cena „Ø X Kč / za kus" nezalomená vpravo, obchody deduplikované (case/diakritika: „Můj obchod" = „MOJ OBCHOD"), max 3 + počítadlo.',
      '🐛 FIX (S12.1g): receipts.js – tabulka „Obchody v měsíci": odstraněno min-width 380px, které na mobilu ořezávalo levý sloupec (PENNY → ENNY); table-layout:fixed s procentními šířkami, dny zkráceny (Po/Út/So), poznámka „částky v Kč".',
      '🐛 FIX (S12.1g): receipts.js – Trend útrat: obchody řazené dle POČTU NÁVŠTĚV (≥2) místo útraty – jednorázové faktury (SmVaK) graf nezaplevelí; dedup názvů sjednotí varianty psaní.',
      '✅ NEW (S12.1g): receipts.js – Trend útrat: barevný badge s iniciálou obchodu na KAŽDÉM průsečíku grafu (jen nenulové měsíce); dotyk na mobilu napřímo (touchstart/touchmove, pan-y) – tooltip funguje tahem prstu.',
      'ℹ️ (S12.1g): „Nejčastější den nákupu" v DNA kartě je z VŠECH účtenek (doplněn popisek „celkově"), zatímco „Typický den" v tabulce je za vybraný měsíc a obchod – rozdílné hodnoty jsou správně.',
    ]
  },
  {
    verze: 'v7.80',
    datum: '2026-06-12',
    zmeny: [
      '🔒 SEC (S12.1f): app.html – odstraněno „Pokračovat bez účtu" z přihlašovací obrazovky. Zůstává Google OAuth + Email/heslo. Funkce signInLocal() v kódu ponechána (neaktivní), kdyby byl local mód potřeba pro vývoj.',
      '📚 DOC (S12.1f): konsolidované .md dokumenty (bugs, todo, decisions, features, GLOSSARY, context, explanations) aktualizovány o celou Session 12.1 (v7.71–v7.80) – FIX-129–135, TODO-122✅/123–128, ADR-060/061, Runway, produktová DB, COICOP, onboarding.',
    ]
  },
  {
    verze: 'v7.79',
    datum: '2026-06-11',
    zmeny: [
      '✅ NEW (S12.1e): app.html + firebase.js – Email + heslo přihlášení: přepínač Přihlásit/Registrovat, validace, chybové hlášky v češtině (22 kódů), reset hesla emailem, zobrazit/skrýt heslo. Nový provider neovlivňuje Google OAuth ani local mód.',
      '🔒 SEC (S12.1e): firebase.json – bezpečnostní HTTP hlavičky (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection) + rozšířen ignore: database_rules.json, *.yml, staré dev HTML (bubble-*.html, chart-preview-*.html, ff-grafy-*.html, propojeni-*.html, landing_v4.html, lepsi-uver.html), _gitignore.',
      '🐛 FIX (S12.1e): database_rules.json – admin_coicop_overrides validate: coicop >= 0 (bylo >= 1, blokoval přiřazení COICOP 0 = mimo COICOP); přidáno pravidlo pro /subs uzel (assignSubCoicop).',
    ]
  },
  {
    verze: 'v7.78',
    datum: '2026-06-11',
    zmeny: [
      '✅ NEW (S12.1d): receipts.js – Nákupní DNA: tabulka „🏪 Obchody v měsíci" (návštěvy, celkem, Ø útrata, typický den nákupu – pro vybraný měsíc) + spojnicový graf „📈 Trend útrat dle obchodů" (top 4 obchody, 6 měsíců, osy + mřížka + Kč popisky, tooltip myš i dotyk, legenda s barevnými badgi – známé CZ řetězce mají firemní barvu: Lidl, Kaufland, Albert, Billa…).',
      '🧪 NEW (S12.1d): playwright-kit.zip – starter testy: landing smoke, app shell bez chyb, validní manifest, KONZISTENCE VERZÍ (title=sidebar=sw.js – hlídá chybu v7.55), existence všech hashovaných JS, integrita product-groups.json. README-TESTING.md s návodem.',
    ]
  },
  {
    verze: 'v7.77',
    datum: '2026-06-10',
    zmeny: [
      '⚡ PERF (S12.1c, TODO-122 Krok 1): admin.js – COICOP audity a propisování už nestahují CELOU users.json (vč. všech transakcí!). Nový helper adminFetchUserCategories(): shallow seznam UID + per-uid jen data/categories (pool 8). Přepsáno: loadCustomCatsNoCoicop, loadCustomSubsNoCoicop, assignCoicop, assignSubCoicop. Krok 2 (agregační index pro users-list a adopci) = ADR-061.',
      '📊 DATA (S12.1c): data/scoring-config.json – bodovací tabulky Dashboardu z dashboard_body.xlsx 1:1 (S1 76 řádků, DTI 60, DSTI 41, S3 50, S4 31, bonus 13). Opraven překlep řady S1 (0.100–0.125 → 1.00–1.25), maxima dle tabulek = 290 b. Engine = ADR-060 (další session).',
    ]
  },
  {
    verze: 'v7.76',
    datum: '2026-06-10',
    zmeny: [
      '🐛 FIX (S12.1b): projects.js – „Týdny od výplaty" v Radaru-Měsíc čtou JEDINÝ zdroj pravdy radarPaydayInfo(): kotva z Nastavení/auto-detekce, největší příjem měsíce ji jen zpřesní (±6 dní). Měsíc bez výplaty nebo s netypickým příjmem už týdny nerozhodí – obě záložky Radaru jsou konzistentní.',
      '✅ NEW (S12.1b): ui.js + app.html – 🚀 Onboarding průvodce „Dokonči nastavení (X/5)" na vrchu Přehledu: první transakce, den výplaty, nedotknutelná rezerva, charakter výdajů (≥3 kategorie), složení domácnosti. Každý krok vede přímo na správné místo, progress bar, ✕ skryje (ff_onboardHide), zmizí sám po 5/5.',
    ]
  },
  {
    verze: 'v7.75',
    datum: '2026-06-10',
    zmeny: [
      '✅ NEW (S12.1b): projects.js – Runway: 🛡️ Nedotknutelná rezerva (Nastavení → settingMinReserve) – denní limit se počítá až po jejím odečtení; 📉 projekce konce cyklu z flexibilního tempa (fixní se neextrapolují, známé platby kryje rezerva budoucích plateb) s hlídáním, zda rezerva zůstane nedotčená.',
      '✅ NEW (S12.1b): projects.js – Runway: 🔁 karta Srovnání s minulým cyklem (utraceno do stejného dne ±%, celkem minule) + tempo všední den vs víkend (Kč/den, upozornění když víkendy táhnou tempo >1,5×).',
      '✅ NEW (S12.1b): settings.js + premium.js – nové nastavení „Nedotknutelná rezerva" (Kč), ukládá se do _settings.minReserve.',
      '📱 FIX (S12.1b): helpers.js + styles.css – statCard helper (stat-card-h) převeden z inline font-size na třídy .stat-value-h/.stat-label-h s mobilním clamp() – globální audit z v7.74 ho nepokrýval.',
    ]
  },
  {
    verze: 'v7.74',
    datum: '2026-06-10',
    zmeny: [
      '🐛 FIX (S12.1): app.js – DEFAULT cat42 Poplatky měla chybně coicop:12 bez overridů. Správně: rodič 13 (Ostatní služby – správní poplatky, kolky, notář…) + coicopOverrides {Bankovní poplatek: 12}. Proto u podkategorií Poplatků nebyla žádná COICOP čísla.',
      '✅ NEW (S12.1): admin.js – audit podkategorií zahrnuje i DEFAULTNÍ suby SDÍLENÝCH kategorií bez overridu (dědění rodiče je u nich nejednoznačné) a vynechává příjmové kategorie (COICOP = spotřeba).',
      '✅ NEW (S12.1): admin.js – COICOP selecty mají volbu „0 – mimo COICOP" (příjem/převod/spoření); 0 je platné přiřazení (nevrací se do auditu), helpers.js ho vyřadí z COICOP analýzy (nezdědí rodiče).',
      '✅ NEW (S12.1): admin.js – 🤖 AI Rádce u každého řádku mapování: Claude přes worker navrhne oddíl 0–13 + zdůvodnění, předvyplní select, admin jen potvrdí.',
      '📱 NEW (S12.1): styles.css – globální mobilní audit přetékání: min-width:0 pro flex/grid děti, overflow-wrap:anywhere, clamp() pro .stat-value/.stat-label/.card-title na ≤480px, max-width:100% pro img/svg/canvas.',
    ]
  },
  {
    verze: 'v7.73',
    datum: '2026-06-10',
    zmeny: [
      '✅ NEW (S12.1): admin.js – Adopce: nová sekce „🧩 Podkategorie bez COICOP" – audit uživatelských podkategorií bez overridu napříč všemi uživateli + assignSubCoicop() hromadně propíše override do users/{uid}/data/categories/{idx}/coicopOverrides/{sub} ve Firebase (kategorie už uměl assignCoicop, podkategorie chyběly).',
      '🐛 FIX (S12.1): stats.js – renderCatPage slučuje defaultní + uložené coicopOverrides ({...def, ...user}); dřív uživatelský override ZAHODIL všechny defaultní → mizela čísla u podkategorií sdílených kategorií.',
      '🐛 FIX (S12.1): helpers.js – computeCoicopAggregates čte i userCat.coicopOverrides (admin domapování se dřív nepropisovalo do COICOP analýzy).',
      '✅ NEW (S12.1): ai.js – AI auto-kategorizace vrací a zobrazuje COICOP oddíl (🧭 chip); u vlastní kategorie bez čísla tlačítko „Přiřadit COICOP N kategorii" (applyAiCoicop → save do Firebase). receipts.js – validateAiCatJSON validuje coicop 1–13.',
      '🐛 FIX (S12.1): transactions.js – Predikce: stav tlačítka „Skrýt prázdné podkategorie" se pamatuje (localStorage ff_predHideEmptySubs), dřív se resetoval každým renderem stránky.',
      '✅ NEW (S12.1): charts.js – attachChartTouch(): tooltipy grafů fungují na mobilu (touchstart/touchmove → scrub, touch-action:pan-y zachová scroll). Aktivováno pro area graf, saldo bary a graf dluhů. Saldo má novou legendu (■ přebytek/■ schodek).',
    ]
  },
  {
    verze: 'v7.72',
    datum: '2026-06-10',
    zmeny: [
      '✅ NEW (S12.1): data/product-groups.json – produktová databáze z oficiálního spotřebního koše ČSÚ 2026 (stálé váhy 2024): 402 CZ-COICOP skupin s váhami, VŠECH 427 cenových reprezentantů, 1060+ klíčových slov (vč. účtenkových zkratek JOG./ROHL./TOAL.) a krátkých tagů kompatibilních s community/itemTags.',
      '✅ NEW (S12.1): js/product-db.js – loadProductDB() + productGroupLookup(název) → {code, tag, group} (NFD normalizace, delší klíč vyhrává, krátké klíče jen na začátek slova) + productGroupPrefill(receipt).',
      '✅ NEW (S12.1): receipts.js – buildReceiptPreviewHTML předvyplní 🏷️ tagy položek z produktové DB (jen kde tag chybí, AI/uživatel má přednost). Lokální klasifikace = méně AI volání (synergie ADR-041).',
      '🔄 (S12.1): restaurační reprezentanti (oddíl 11) vyřazeni z keyword matchingu položek – kolidovali s potravinami z obchodu (KUŘECÍ PRSA ≠ restaurace).',
    ]
  },
  {
    verze: 'v7.71',
    datum: '2026-06-10',
    zmeny: [
      '✅ NEW (S12.1): projects.js – Finanční radar má přepínač pohledů „📅 Měsíc / 💸 Do výplaty". Nová záložka Runway do výplaty: cyklus výplata→výplata (volné peníze do další výplaty po rezervě na známé platby, bezpečný denní limit, progress utraceno vs uplynulý cyklus).',
      '✅ NEW (S12.1): projects.js – Tempo po týdnech cyklu: stacked graf + tabulka výdajů po týdnech od výplaty k výplatě, rozpad dle charakteru výdaje (Fixní / Variabilní / Jednoráz.+nepravid. / Neurčeno), Kč/den jen z odžitých dní.',
      '✅ NEW (S12.1): projects.js – karta „Co žene variabilní výdaje" – top 5 variabilních kategorií aktuálního cyklu.',
      '✅ NEW (S12.1): projects.js – robustní detekce dne výplaty: kotva z Nastavení nebo auto-detekce (medián dne NEJVĚTŠÍHO příjmu za 6 měsíců), přichycení startu cyklu na reálnou příjmovou transakci ±6 dní, posun víkendové výplaty na pátek. Hint při nesouladu nastavení vs realita.',
      '🐛 FIX (S12.1): projects.js – den výplaty v denním grafu radaru a ve „Výplata efekt" = den NEJVĚTŠÍHO příjmu měsíce (dříve PRVNÍ příjem – drobný příjem na začátku měsíce posouval referenční bod).',
      '🐛 FIX (S12.1): premium.js – saveSettingsBtn() nyní ukládá settingFirstDay (_settings.firstDay) – dosud se hodnota z Nastavení vůbec neukládala.',
      '🔄 (S12.1): settings.js – „První den měsíce" přejmenováno na „Den výplaty" + nová výchozí volba „🤖 Automaticky (z transakcí)".',
    ]
  },
  {
    verze: 'v7.70',
    datum: '2026-06-09',
    zmeny: [
      '🔴 KRITICKÝ FIX: helpers.js – přidána funkce parseTxTags(t) která vždy vrátí pole tagů (zpracuje string i array). ui.js + admin.js: všechna (t.tags||[]).forEach/some/map/filter/length nahrazena parseTxTags(t). Opravuje crash "TypeError: (t.tags||[]).forEach is not a function" na Dashboard.',
    ]
  },
  {
    verze: 'v7.69',
    datum: '2026-06-09',
    zmeny: [
      '📄 S11 FIX (Úkol edit-bug návrat): receipts.js – ROOT CAUSE: v7.68 save()→_renderForce=true způsobil že Firebase sync spustil plný renderPage()→renderUctenky() který přepsal otevřený editor slot. Řešení: window._receiptEditorOpen flag → renderUctenky() přeskočí re-render když je editor otevřený. Flag se vyčistí při zavření/uložení. Přidán rAF záložní rpRender.',
      '📄 S11 FIX (mobilní vizuál): receipts.js buildHistoryTab – history řádek přepsán na 2-řádkový layout (datum+obchod+částka+akce nahoře, kategorie tagy přes celou šířku dole). Částka se už nepřekrývá s textem, vejde se do rámečku.',
    ]
  },
  {
    verze: 'v7.68',
    datum: '2026-06-09',
    zmeny: [
      '📄 S11 FIX (Úkol 4 - render bug): app.js save() vždy nastaví _renderForce=true → změny (wallet balance, virtuální cíle, tagy, podkategorie) se projeví IHNED bez překliknutí. _dataSig rozšířen o wsum/gsum/tsum.',
      '📄 S11 FIX (Úkol 5): app.html – verze v O aplikaci banneru opravena (7.55 → 7.68). Sed pattern pro budoucí bumpy opraven.',
      '📄 S11 (Úkol 1): premium.js – Virtuální peněženka v převodech. renderTransferDropdowns přidá cíle (optgroup 🎯) do transferTo. doTransfer zpracuje goal:ID → výdaj z peněženky + vklad do goal_deposits.',
      '📄 S11 (Úkol 2): receipts.js openReceiptInHistory – robustnější (předběžné nalezení indexu, delší timeouty, přímé editReceiptFromHistory).',
      '📄 S11 (Úkol 3): receipts.js syncReceiptToTransactions – editace účtenky v Historii nyní promítne tagy + receiptItems do propojených transakcí (match podle receiptDate+receiptStore).',
      '📄 S11 (sjednocení odkazů): share.js – jeden ?ref= odkaz dělá affiliate I partnerské párování (pairPartners resolve referrals/{ref}/uid → +50 bodů). Partner bar odstraněn z UI.',
    ]
  },
  {
    verze: 'v7.67',
    datum: '2026-06-09',
    zmeny: [
      '📄 S11 FIX: Split DOUBLE COUNTING komplexně opraven napříč aplikací. incSum/expSum (helpers.js), allExpTxs (ui.js suhrn), měsíční výdaj index (transactions.js), prevYearTotal/allTotal/allIncome (stats.js) – všude přidán filtr !t.splitParent. Split parent se nikde nezapočítává (children pokrývají sumu).',
      '📄 S11 FIX: ui.js buildTxRow – zelené tagy z účtenky se nezobrazovaly. Příčina: addReceiptAsTx ukládá tags jako STRING, ale array check parseTxTags(t).length u stringu vrátil délku textu → .map() spadl. Opraveno na Array.isArray(t.tags) check.',
      '📄 S11 FIX: receipts.js editReceiptFromHistory – reset window._editReceipt + zavření všech ostatních editorů před otevřením (zabrání konfliktu stavu po navigaci). isOpen check vylepšen.',
      '📄 S11: receipts.js openReceiptInHistory() + addReceiptAsTx ukládá receiptDate/receiptStore – 📷 tlačítko v transakci nyní otevře KONKRÉTNÍ účtenku v Historii (filtr obchodu + scroll + editor).',
    ]
  },
  {
    verze: 'v7.66',
    datum: '2026-06-09',
    zmeny: [
      '📄 S11 FIX: receipts.js rpRender() – focus guard opraven: blokuje re-render jen pro TEXT inputy (ne pro SELECT). Výsledek: změna kategorie ihned zobrazí subkategorii, bez čekání na uložení.',
      '📄 S11 FIX: receipts.js rpRender() – subkat select zobrazen VŽDY vedle kategorie (nejen podmíněně). Ztlumený (opacity .4) pokud kategorie není vybrána. fromMem badge zachován.',
      '📄 S11 FIX: receipts.js catEl handler – catEl.blur() před rpRender() zajistí uvolnění fokusu před re-renderem.',
      '📄 S11 FIX: ui.js buildTxRow – Split ✂️ tlačítko ODEBRÁNO pro receipt transakce (hasReceiptItems). Nahrazeno 📷 tlačítkem které přesměruje na Analýza účtenek → Historie.',
    ]
  },
  {
    verze: 'v7.65',
    datum: '2026-06-09',
    zmeny: [
      '📄 S11 FIX-119: helpers.js getActual() – Split double counting opraven. Split parent s existujícími children se NEpočítá do kategorií – children pokrývají celou sumu ve svých kategoriích. Statistiky nyní zobrazují správné částky.',
      '📄 S11 FIX: receipts.js initReceiptEditor() – synchronní volání (odstraněn setTimeout 50ms který způsoboval race condition s Firebase re-renderem). Přidán guard: pokud #receiptEditForm neexistuje, funkce se ukončí.',
      '📄 S11 FIX: ui.js buildTxRow – tag barva: pink rgba(236,72,153) → tmavě modrá rgba(30,58,138,.7) s bílým textem. Split parent + receiptItems konflikt kliků odstraněn (receipt expand disabled pro split parents).',
    ]
  },
  {
    verze: 'v7.64',
    datum: '2026-06-09',
    zmeny: [
      '📄 S11 FIX BUG1: receipts.js editReceiptFromHistory – histIdx embeddován do window._editReceipt._historyIdx jako záloha pro případ vymazání _lastReceiptResult při navigaci. Save handlery čtou histIdx ?? _historyIdx (robustní).',
      '📄 S11 FIX BUG2: receipts.js Obchody záložka – odstraněna tlačítka ✎ edit a ✕ delete (editace je v Historii). Items přepracovány na grid sloupce: Položka | Kč (celkem) | Mn. (množství+unit). Používá lineAmt().',
      '📄 S11 FIX BUG3: ui.js buildTxRow – přidána receiptItems expansion pro transakce ze skenovaných účtenek. Klik na řádek rozbalí položky v Split stylu (grid: Položka | Kč | Mn.). Badge 📷 N pol. ▾ zobrazí počet.',
    ]
  },
  {
    verze: 'v7.63',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11: app.html – Odstraněn duplicitní pushToggleRow (Nastavení oznámení) ze sidebar. Zůstává jen jeden řádek Oznámení → openNotifSettings(). Upraven popisek na "Push notifikace, cenové alerty, novinky".',
      '📄 S11: Google Analytics 4 (G-F2Z8DK4RR0) přidán do index.html (landing) a app.html (appka, anonymize_ip:true, send_page_view:false). helpers.js showPage() trackuje page_view event pro každý přechod stránky.',
    ]
  },
  {
    verze: 'v7.62',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11 FIX: index.html – odstraněn nepotřebný ref-preservation skript.',
      '📄 S11: share.js – PARTNER_BONUS_PTS: 25 → 50 bodů.',
      '📄 S11 FIX: worker.js – receipt prompt přepsán: přidáno pole lineTotal (CELKOVA_CENA_RADKU). Váhové položky: price=cena/kg, qty=hmotnost, lineTotal=zaplaceno. PRAVIDLO 4: total=sum(lineTotal). PRAVIDLO 5: ověření součtů. Odstraněno chybné sum(price×qty).',
      '📄 S11 FIX: receipts.js – přidána helper funkce lineAmt(it): it.lineTotal ?? price×qty (backward compatible). Všechny statistiky (catStats, monthlyData, lineTotal, rpUpdateTotal) nyní používají lineAmt(). Přidán scroll k editoru po skenování.',
    ]
  },
  {
    verze: 'v7.61',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11: share.js – SHARE_BASE_URL opraven na https://financeflow.cz/app (linky vedou přímo do appky, ne na landing page). Přidány getPartnerUrl(), initPartnerLinkBar(), copyPartnerLink(), checkIncomingPartner(). Partner link (?partnerOf=UID) auto-přidá oba uživatele jako partnery + udělí +25 bodů majiteli odkazu (dedup záznam v partner_bonus/).',
      '📄 S11: app.html – Sdílení sekce: přidán partnerShareBar s odkazem (?partnerOf=UID) a popiskem +25 bodů při přidání.',
      '📄 S11: ui.js – initPartnerLinkBar() voláno při renderPage oAplikaci (stejně jako initShareLinkBar).',
      '📄 S11: index.html (landing) – přidán ref-preservation skript: pokud URL obsahuje ?ref=, doplní ho do všech /app odkazů → affiliate tracking přes landing page.',
    ]
  },
  {
    verze: 'v7.60',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11 FIX: app.html – Odstraněny duplikátní grafMonthNav + grafYearNav (existují uvnitř karet). grafFilterWrap kompaktnější (height:28px, width:auto). Přidán grafFilterYearRange pro rok range. Přidán mesicniLegend div pod canvas.',
      '📄 S11 FIX: charts.js switchGrafTab – Filtry sdíleny pro Měsíční+Roční+Všechny roky (Roční↔Vsechny sdílí stav filtrů). Rok range zobrazen jen pro vsechny tab.',
      '📄 S11 FIX: charts.js renderVsechnyRoky – Odstraněn interní vsechnyGrafCat select (byl redundantní, getGrafTxs() čte z grafFilterWrap). Rok range aktualizuje grafFilterYearRange.',
      '📄 S11 FIX: charts.js renderMesicniGraf – Legenda přesunuta z canvas do HTML div #mesicniLegend pod grafem (čitelnější, 0.82rem, barevné čtverečky/čáry).',
    ]
  },
  {
    verze: 'v7.59',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11 FIX: charts.js switchGrafTab – Obecné nyní zobrazuje globální month-nav (vráceno). grafFilterWrap skryt pro vsechny tab (má vlastní interní filtr). Měsíční/Roční mají vlastní grafMonthNav/grafYearNav.',
      '📄 S11 FIX: charts.js renderMesicniGraf – maxVal nyní zahrnuje cumul + medVal → zelená linie se zobrazí přes celý měsíc a nezmizel pod osu. Přidána legenda (Denní výdaje/Kumulace/Medián). Barvy sloupců upraveny.',
      '📄 S11 FIX: charts.js renderKumulChart – odstraněn duplicitní label Medián u linie (byl i v legendě). Medián hodnota přesunuta napravo od linie. Legenda 11px bold, čitelnější.',
    ]
  },
  {
    verze: 'v7.58',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11 FIX: stats.js renderChordDiagram() – mode all: opravený filtr (byl amount<0, výdaje jsou positive s type:expense). Nyní používá statCatSum() který správně prochází všechny roky/měsíce. Chord diagram se nyní zobrazí v oddílu Vše.',
      '📄 S11 FIX: stats.js statInsights (Postřehy) – mode-aware: Měsíc = porovnání s předchozím měsícem (jako dřív); Rok = porovnání s předchozím rokem + roční celkové výdaje; Vše = celkové výdaje/příjmy/saldo za všechna data.',
    ]
  },
  {
    verze: 'v7.57',
    datum: '2026-06-08',
    zmeny: [
      '📄 S11 FIX: charts.js – onGrafFilterChange() nově volá renderVsechnyRoky() pro záložku Všechny roky. renderVsechnyRoky() nově používá getGrafTxs() (respektuje filtry kategorie/podkategorie/typ).',
      '📄 S11 FIX: charts.js – switchGrafTab() skryje .month-nav pro všechny záložky Grafů. Přidány grafMonthNav (Měsíční) a grafYearNav (Roční) jako vlastní navigace.',
      '📄 S11 FIX: app.html – filtry Grafů redesignovány na kompaktní pill-style selects (border-radius:20px, inline). Přidány #grafMonthNav a #grafYearNav navigační prvky. Label #rocniGrafLabel aktualizuje rok.',
      '📄 S11 FIX: helpers.js – month-nav skrytý i pro stránku Grafy (dříve jen Import).',
    ]
  },
  {
    verze: 'v7.56',
    datum: '2026-06-07',
    zmeny: [
      '📄 S11: Přestrukturování pro financeflow.cz – landing page (landing_v4.html) nasazena jako homepage (index.html). Appka přesunuta na /app (app.html). firebase.json rewrites: /app → app.html, /** → index.html (landing). manifest.json start_url → /app.',
    ]
  },
  {
    verze: 'v7.55b',
    datum: '2026-06-07',
    zmeny: [
      '📄 S11: manifest.json – start_url, scope, id aktualizovány na https://financeflow.cz/',
      '📄 S11: legal.html – URL a kontaktní email aktualizovány na financeflow.cz',
    ]
  },
  {
    verze: 'v7.55',
    datum: '2026-06-06',
    zmeny: [
      '📄 S11 FIX-120b: debts.js – daysPerMonth nyní = skutečný počet dní v měsíci (28–31 dle getDate()), nekappovaný ratio. Při splátkách > příjem se zobrazí všechny dny červeně (= spirála, žádné zelené). Předchozí fix byl špatně – cap na 21 pracovních dní způsoboval falešné zelené dny i při přetížení > 100%.',
    ]
  },
  {
    verze: 'v7.54',
    datum: '2026-06-06',
    zmeny: [
      '📄 S11 FIX-120: debts.js renderDebtFreedomWidget – kalendář "Jak pracuješ pro banky" nově zobrazuje 30 dní celkem. Pracovní dny (max 21) v červené = pro banky, zbývající dny 22–30 v zelené = pro tebe. Dřív daysPerMonth=21 a daysForSelf=0 → žádné zelené dny. Zelené dny mají viditelnou opacity .75 (dřív .35).',
    ]
  },
  {
    verze: 'v7.53',
    datum: '2026-06-06',
    zmeny: [
      '📄 S11: announcements.js – Zprávy (openNotificationsModal) předělány na fullscreen stránku (inset:0, bg:var(--bg), ← Zpět). Smazat 🗑️ přesunut do header řádku každé zprávy (všechny typy: admin broadcast i personal). Odebráno ze spodku expanded content.',
    ]
  },
  {
    verze: 'v7.52',
    datum: '2026-06-06',
    zmeny: [
      '📄 S11: assets.js – odstraněny záložky typů aktiv, nahrazeny flat seznamem všech aktiv (seřazeno dle hodnoty) + tlačítko + Přidat. Méně klikání, přehledněji.',
      '📄 S11: push.js – openNotifSettings() redesignováno jako fullscreen stránka (position:fixed;inset:0;background:var(--bg)) s tlačítkem ← Zpět a nadpisem „🔔 Oznámení". Přidán toggle Komunitní srovnání / anonymní data.',
      '📄 S11: announcements.js – inbox přejmenován Oznámení→Zprávy. Tlačítko 🗑️ Smazat přesunuto do header řádku. Admin broadcast zprávy dostaly smazat (dismissBroadcast + LS_DISMISSED_BC). Personal zprávy smazat v hlavičce.',
      '📄 S11: index.html – „O aplikaci" sekce: řádek Oznámení přejmenován na Zprávy (📭), přidán nový řádek 🔔 Oznámení → openNotifSettings(). navAnnounceBadge přesunut ke správnému řádku.',
      '📄 S11: admin.js – komunitní přehled „Vypnout lze v Nastavení" nyní volá openNotifSettings() a zobrazuje „Oznámení".',
    ]
  },
  {
    verze: 'v7.51',
    datum: '2026-06-06',
    zmeny: [
      '📄 S11 FIX-118 (KRITICKÉ – ztráta dat): app.js saveToFirebase – do ukládaného objektu „dataToSave" chyběly klíče „assets" a „importHistory". Protože _set přepisuje celý uzel /data, majetek i historie importů se NEUKLÁDALY do Firebase a po reloadu mizely (transakce se uložily, historie ne). Doplněno assets + importHistory.',
      '📄 S11 FIX-119: helpers.js showPage/showPageByName – na stránce „Import dat" se nyní skrývá přepínač měsíců v hlavičce (.month-nav). Dřív při překliknutí měsíce resetoval rozkliknutou pod-záložku importu.',
      '📄 S11: worker-push.js – aktualizovaná hlavička (verze v7.51) + opravený příklad FIREBASE_DB_URL na správnou europe-west1 doménu (…europe-west1.firebasedatabase.app místo …firebaseio.com).',
    ]
  },
  {
    verze: 'v7.50',
    datum: '2026-06-06',
    zmeny: [
      '📄 S11: import.js – Banner PDF importu je nyní podmíněný: přihlášený uživatel vidí „📄 Max ~200 transakcí na soubor" (informace), nepřihlášený „🔒 Pro import z PDF se přihlas". Dřív matoucí „⚠️ vyžaduje přihlášení" i pro přihlášené.',
    ]
  },
  {
    verze: 'v7.49',
    datum: '2026-06-05',
    zmeny: [
      '🔔 S11: push.js + index.html + worker-push.js – Nová stránka „Nastavení oznámení" (styl Wallet): řádek v O aplikaci otevře modal s master push přepínačem + per-typ přepínači (💰 cenové alerty, 💳 splátky dluhů, 📢 novinky, 🧾 systémové). Preference v users/{uid}/notifPrefs + localStorage cache. Cron alerty (cenové i dluhy) preference respektují. Oddělení: „📢 Oznámení" = schránka zpráv, „🔔 Nastavení oznámení" = co chci dostávat.',
    ]
  },
  {
    verze: 'v7.48',
    datum: '2026-06-05',
    zmeny: [
      '🔘 S11: push.js + index.html – Push notifikace mají nyní SKUTEČNÝ přepínač (zelený toggle on/off). Při blokování v prohlížeči (po „zamítnout") se ukáže návod „jak odblokovat" – prohlížeč po zamítnutí nedovolí znovu zeptat z aplikace (bezpečnostní omezení), nutné povolit ručně v nastavení prohlížeče.',
      '🗑️ S11: announcements.js + admin.js – Oznámení starší 30 dní se uživatelům automaticky nezobrazují (nevrství se). Admin má tlačítko „🗑️ Staré" pro fyzické smazání starých z databáze (vč. hlasů ankety).',
    ]
  },
  {
    verze: 'v7.47',
    datum: '2026-06-05',
    zmeny: [
      '💳 S11: worker-push.js – Cron rozšířen o připomínky splátek dluhů: scheduled() projde dluhy (remaining > 0), najde nejbližší splátku (schedule nebo dueDate) a pokud je do alertDays dní (default 7), pošle push „💳 Splátka: {název} {kdy}". Dedup debt_alerts/{uid}_{debtId}_{datum} – každá splátka jednou. Běží paralelně s cenovými alerty.',
    ]
  },
  {
    verze: 'v7.46',
    datum: '2026-06-05',
    zmeny: [
      '🔑 S11: push.js – vložen produkční VAPID veřejný klíč (Web Push aktivní). Privátní klíč zůstává jen v Cloudflare Worker secrets.',
    ]
  },
  {
    verze: 'v7.45',
    datum: '2026-06-05',
    zmeny: [
      '🗄️ S11: app.js – Offline snapshot přesunut z localStorage (limit 5 MB) do vlastního IndexedDB (ff_snapshot_db, store snapshots, klíč = uid). Bez praktického limitu kapacity. Automatická jednosměrná migrace: starý localStorage snapshot se při prvním loadSnapshot() překopíruje do IDB a smaže z LS. Fallback na localStorage při chybě IDB (Safari private mode apod.).',
    ]
  },
  {
    verze: 'v7.44',
    datum: '2026-06-05',
    zmeny: [
      '🎭 S11: stats.js + index.html – Chord diagram „Tok výdajů" ve Statistikách: SVG kruhový diagram (top 8 kategorií), arky proporcionální výdajům, struny spojují kategorie (tloušťka = geometrický průměr). Reaguje na přepínač měsíc/rok/vše. Tooltip + legenda pod diagramem.',
    ]
  },
  {
    verze: 'v7.43',
    datum: '2026-06-03',
    zmeny: [
      '💰 S11: worker-push.js – Cenové alerty přes Cloudflare Cron Trigger: scheduled() projde hlídané položky (nakupList: alertPct/refPrice/catalogKey), porovná s catalog/items.latestPrice a při poklesu pošle push. Dedup přes price_alerts/{uid}_{itemId}. Vyžaduje secrets FIREBASE_DB_URL + FIREBASE_DB_SECRET a cron trigger (např. „0 */6 * * *").',
      '🔗 S11: worker.js vrácen do původního stavu (jen Claude proxy) – push zůstává v samostatném Workeru worker-push.js (oddělené nasazení).',
    ]
  },
  {
    verze: 'v7.42',
    datum: '2026-06-03',
    zmeny: [
      '🧪 S11: push.js – Test push v Nastavení (odkaz „poslat test" u zapnutého přepínače) – lokální notifikace přes SW, ověří povolení a zobrazení bez serveru.',
      '📲 S11: announcements.js + admin.js – Admin broadcast push: zaškrtávátko „Odeslat i jako push" u tvorby oznámení → načte odběratele z push_subs a pošle přes Worker /push. URL+secret drží admin lokálně (ne ve sdíleném kódu).',
      '🗂️ S11: push.js + database_rules.json – plochý index push_subs/{uid}_{deviceId} pro snadný broadcast (čte jen admin, zápis vlastního záznamu s validací uid).',
      '🔗 S11: worker.js – Web Push odesílač SLOUČEN do hlavního Workeru (routa POST /push). worker-push.js zrušen.',
      '🔄 S11: sw.js – CACHE_NAME bump na ff-shell-v7.42.',
    ]
  },
  {
    verze: 'v7.41',
    datum: '2026-06-03',
    zmeny: [
      '🔔 S11: push.js (NOVÝ) + sw.js + index.html – Web Push notifikace: přepínač v Nastavení (povolení + subscription přes PushManager), uložení do Firebase users/{uid}/push/{deviceId}. SW má push + notificationclick handlery (klik zaměří/otevře appku).',
      '📡 S11: worker-push.js (NOVÝ, deploy do Cloudflare) – samostatný odesílač Web Push bez knihoven: VAPID JWT (ES256) + šifrování payloadu (aes128gcm, RFC 8291). Endpoint POST /push se subscriptions + payload, chráněn x-push-secret.',
      '🔄 S11: sw.js – CACHE_NAME bump na ff-shell-v7.41.',
      '⚙️ Pozn.: vyžaduje vygenerovat VAPID pár, vložit veřejný klíč do push.js a klíče do Worker secrets. Viz návod v chatu.',
    ]
  },
  {
    verze: 'v7.40',
    datum: '2026-06-03',
    zmeny: [
      '✏️ S11: announcements.js + admin.js – Admin může nyní EDITOVAT zveřejněné oznámení/anketu (tlačítko ✎ v seznamu → načte do formuláře → „Uložit změny"). Update zachová createdAt i stav skrytí. Přidáno zrušení úpravy.',
      '🔄 S11: sw.js – CACHE_NAME bump na ff-shell-v7.40.',
    ]
  },
  {
    verze: 'v7.39',
    datum: '2026-06-03',
    zmeny: [
      '📴 S11: app.js – PLNÝ OFFLINE: lokální snapshot dat (localStorage, klíč dle uid) se ukládá při každé změně/sync. Při offline cold startu se z něj aplikace nahydratuje – vidíš poslední uložená data i bez sítě (RTDB web SDK nemá vlastní disk persistenci, tak si ji děláme sami).',
      '📴 S11: app.js – onUserSignedIn odolný vůči offline: loadUserProfile/loadPartners/loadPremiumStatus/loadSettings už neshodí flow bez sítě; _get se volá jen online, s fallbackem na snapshot.',
      '🔄 S11: sw.js – CACHE_NAME bump na ff-shell-v7.39.',
    ]
  },
  {
    verze: 'v7.38',
    datum: '2026-06-03',
    zmeny: [
      '🏦 S11: assets.js + index.html – Nové aktivum: výběr ikony (grid dle typu) + ikona se nyní mění s typem aktiva. Klik na emoji nastaví ikonu, vlastní emoji lze stále vepsat.',
      '📊 S11: announcements.js + admin.js – Anketa (poll) v oznámeních: admin vytvoří otázku + možnosti (jedna na řádek), uživatelé hlasují (jeden hlas, lze změnit) a vidí výsledky v % s počty. Hlasy v /poll_votes/{pollId}/{uid}.',
      '👋 S11: announcements.js – Uvítací zpráva pro nové uživatele (jednou): osobní oznámení „Vítej ve FinanceFlow!" + flag users/{uid}/meta/welcomed.',
      '🔒 S11: database_rules.json – přidán node poll_votes (read auth, write vlastní uid, validace number); announcements validace uvolněna (text u ankety nepovinný).',
    ]
  },
  {
    verze: 'v7.37',
    datum: '2026-06-03',
    zmeny: [
      '💸 S11: index.html – Půjčky: reálné půjčky (#debtCards) + akční tlačítka přesunuty NAD analytické widgety (Kalkulačka dluhové reality, Stres index, …). Po otevření sekce vidíš nejdřív své půjčky.',
      '🔐 S11: settings.js + app.js – PIN sync mezi zařízeními: ukládá se HASHovaně (SHA-256) do Firebase users/{uid}/security/pinHash + localStorage cache. Migrace starého plaintext PINu z localStorage. Ověření porovnává hash. loadPin() je nyní async (await v onUserSignedIn).',
      '📴 S11: sw.js (NOVÝ) + index.html – Service Worker pro offline běh app shellu: navigace network-first s offline fallbackem, statika (JS/CSS/fonty/Firebase SDK) stale-while-revalidate, Firebase data/auth neintercepováno. Aplikace se načte i bez sítě. (Pozn.: plné offline DATA = další krok přes Firebase persistence.)',
    ]
  },
  {
    verze: 'v7.36',
    datum: '2026-06-03',
    zmeny: [
      '✉️ S11: announcements.js – Oznámení přepracováno na vyskakovací okno (modal) s obálkovými zprávami: ✉️ nepřečtené / 📭 přečtené, rozbalit/sbalit, osobní lze smazat 🗑️. Slučuje admin broadcast + osobní oznámení.',
      '🔔 S11: index.html + announcements.js – Notifikační kulička i v navigaci u „O aplikaci" (#navAnnounceBadge). Badge se zobrazí 3,5 s po startu bez vstupu do sekce.',
      '☁️ S11: announcements.js – Osobní oznámení migrována do Firebase users/{uid}/notifications (sync mezi zařízeními), localStorage zůstává offline cache. Zpětná kompatibilita s addLocalNotification() zachována.',
      '📅 S11: kalendar.js – Saldo uprostřed buňky, plné číslo (bez zkratky „1,5k"). Přidán pace indikátor (3px proužek dole): tempo dne vs průměrný utrácecí den, barva zelená/žlutá/červená.',
    ]
  },
  {
    verze: 'v7.35',
    datum: '2026-06-03',
    zmeny: [
      '📱 S11: receipts.js – Editace položek účtenky: horizontální posuvník (overflow-x:auto + min-width 600px), název položky min-width 130px (dříve kolapsal na 0). Nápověda „← potáhni do stran →".',
      '🛒 S11: nakup.js – Nákupní seznam přepracován na responzivní grid karet (auto-fill, minmax 158px); nicer ikona v zakulaceném rámečku, badge hlídání/sleva, akce dole.',
      '📅 S11: kalendar.js – Opravena duplikace částky v buňce dne: fmtK() nyní správně zkracuje i záporné hodnoty; druhý řádek (-1,5k) se zobrazí jen u dnů s příjmem i výdajem.',
      '📱 S11: sms-import.js + index.html – SMS import označen jako BETA (v kartě i navigaci); přidána upřímná poznámka o ruční povaze (prohlížeč neumí číst notifikace jiných aplikací).',
      '🛒 S11: index.html – BETA badge u „Import z banky" v navigaci.',
    ]
  },
  {
    verze: 'v7.34',
    datum: '2026-06-02',
    zmeny: [
      '🧾 S11: offline-sync.js + announcements.js – po dokončení offline analýzy účtenky se vytvoří trvalé osobní oznámení (📬 Osobní) s prokliknem do Historie účtenek. Řeší UX díru, kdy se účtenka po reconnectu zanalyzovala „neviditelně" a jen prchavý toast (FIX-114).',
      '🔄 S11: offline-sync.js – během syncu se v offline badge zobrazuje „Analyzuji účtenku i/N…" (viditelný průběh místo ticha).',
      '📬 S11: announcements.js – panel Oznámení nově zobrazuje dvě sekce: „📬 Osobní" (lokální, per-zařízení, např. výsledky analýz) a „📢 Od FinanceFlow" (admin broadcast). Badge počítá nepřečtené z obou.',
    ]
  },
  {
    verze: 'v7.33',
    datum: '2026-06-02',
    zmeny: [
      '🐛 S11: share.js – opraven přetrvávající dvojitý odkaz + Kopírovat v O aplikaci. „Tvůj osobní odkaz" už neduplikuje horní lištu, zůstal jen kód + odměna (FIX-113).',
      '💎 S11: share.js – Body → Premium přepracováno: vždy ukazuje celkem bodů, nárok na N měsíců, tlačítko „Aktivovat Premium" (při ≥500 b) a postup k dalšímu měsíci. Uplatnění odečte body (zbytek se přenese, žádné dvojí uplatnění).',
      '📢 S11: Oznámení přesunuta pod banner do seznamu jako rozbalovací řádek (📢 Oznámení) s badge nepřečtených. Klik rozbalí panel s oznámeními (announcements.js: toggleAnnouncementsPanel, initAnnouncementsBadge).',
      '🧩 S11: helpers.js – nové UI helpery proti duplikaci: statCard/statGrid/emptyState/sectionCard/escHtml. share.js počítadlo migrováno na statGrid (vzor build/render).',
    ]
  },
  {
    verze: 'v7.32',
    datum: '2026-06-02',
    zmeny: [
      '🔗 S11: share.js + index.html – sloučen dvojitý affiliate blok v O aplikaci. Ponechána horní lišta (odkaz + malé Kopírovat/Sdílet), počítadlo a „Tvůj osobní odkaz". Odebráno duplicitní velké „Sdílet s přáteli" a „Kopírovat odkaz".',
      '📱 S11: share.js – kanály sdílení responzivní: na mobilu velké ikony (vč. SMS a QR), na PC kompaktní řada bez SMS a QR (dávají smysl jen na mobilu).',
      '💎 S11: share.js – nová logika Body → Premium: 500 bodů = 1 měsíc Premium zdarma. Progres bar + CTA „Uplatnit body" (požadavek do /support, admin aktivuje ručně).',
      '📢 S11: announcements.js (NOVÝ modul) – sekce Oznámení v O aplikaci. Admin posílá novinky/tipy/funkce, uživatelé pouze čtou. Správa v Admin panelu → záložka 📢 Oznámení (přidat/skrýt/smazat).',
      '🔒 S11: database.rules.json – nový node /announcements: čtení pro přihlášené, zápis jen admin UID.',
    ]
  },
  {
    verze: 'v7.31',
    datum: '2026-06-01',
    zmeny: [
      '🗓️ S10: projects.js – Nadcházející platby: 3 sloupce = 3 konkrétní MĚSÍCE (ne kumulativní okna 30/60/90). Suma v hlavičce = součet plateb daného měsíce. Žádné skryté platby (zobrazeny všechny). Reaguje na přepnutí měsíce.',
      '📊 S10: projects.js – denní graf: vrácena trendová křivka jako ŽLUTÉ „ideální tempo" (příjem rozložený rovnoměrně). Když je bílá nad žlutou, utrácíš rychleji než rovnoměrně.',
      '⚡ S10: transactions.js – Predikce: NOVÁ záložka „Tempo (pace)" = Spending Pace. Aktuální kumulativní výdaje vs historický průměr ke stejnému dni (6 měs). Verdikt „utrácíš o X% rychleji/pomaleji než obvykle".',
      '🎨 S10: projects.js – popisky grafů zesvětleny (#a8aec8 místo nečitelného --text3).',
      '✅ S10: ověřeny 3 externí připomínky (updateItemStats, správa členství v adminu, globální error banner) – všechny už byly plně implementované v dřívějších session, žádná oprava nutná.',
    ]
  },
  {
    verze: 'v7.30',
    datum: '2026-06-01',
    zmeny: [
      '🐛 S10: projects.js – KRITICKÉ: zelená čára „příjem (cíl)" brala vyšší z {reálný příjem, 3měs průměr} → ukazovala 68 150 místo reálných 28 000. Nyní = REÁLNÝ příjem měsíce (když 0, fallback „odhad příjmu" s jiným popiskem).',
      '📊 S10: projects.js – modré denní sloupce nyní ve STEJNÉM měřítku jako osa Kč (vrchol = hodnota denního výdaje). Dříve měly vlastní škálu a opticky klamaly.',
      '📅 S10: projects.js – VRÁCEN trend utrácení, nově jako „Výdaje po týdnech od výplaty": referenční bod = den výplaty, sloupcový graf průměr Kč/den za týden (férové i pro kratší poslední týden) + tabulka (Týden / Výdaje / Dní / Kč/den).',
      '🗓️ S10: projects.js – Nadcházející platby přepracovány na 3 paralelní sloupce 30/60/90 dní (každý se sumou + seznamem plateb), responzivní na mobilu.',
    ]
  },
  {
    verze: 'v7.29',
    datum: '2026-06-01',
    zmeny: [
      '🐛 S10: projects.js – radar: ODSTRANĚN duplicitní banner. „Můžeš utratit" (denní graf) a „Na konci měsíce zbude/chybí" (Kam směřuju) počítaly to samé. Zůstal jeden, s opravenou formulací: při záporu „⚠️ Chybí na pokrytí závazků X Kč" (bez matoucího minusu).',
      '🎨 S10: projects.js – denní graf přepracován: ODSTRANĚNA matoucí žlutá křivka trendu (byla redundantní s kumulativní + pravá % osa skákala přes 100 %). Predikce zbytku je nyní ORANŽOVÁ (odlišená od ostatních).',
      '📊 S10: projects.js – modré denní sloupce zmenšeny (max 22 % výšky) + popisek, že nejsou ve stejném měřítku jako kumulativní čára (dříve opticky klamaly, vypadaly obří).',
      '🖱️ S10: projects.js – denní graf: interaktivní tooltip nyní ukazuje denní výdaj + kumulativní + příjem (cíl) + odhad konce; snap na den.',
    ]
  },
  {
    verze: 'v7.28',
    datum: '2026-06-01',
    zmeny: [
      '💸 S10: projects.js – denní graf radaru: přidán ukazatel „Můžeš ještě utratit do konce měsíce" (volné peníze = příjem − utraceno − rezerva na budoucí platby).',
      '📈 S10: projects.js – denní graf: přidána ŽLUTÁ křivka trendu utrácení (% z celkové měsíční útraty, pravá osa 0–100 %) – ukáže, kdy v měsíci nejvíc utrácíš (před/po výplatě).',
      '📊 S10: projects.js – denní graf zobrazen i pro MINULÉ měsíce (predikce zbytku jen u aktuálního, jinak jen kumulace + trend). Predikční čára změněna na oranžovou (žlutá nyní = trend).',
    ]
  },
  {
    verze: 'v7.27',
    datum: '2026-06-01',
    zmeny: [
      '🐛 S10: projects.js – KRITICKÉ: grafy radaru (Kam směřuju, Cashflow 3 měs, predikce, kvartál) braly vždy reálný dnešní měsíc → neměnily se s přepnutím měsíce. Opraveno na S.curMonth/S.curYear (reagují na vybraný měsíc).',
      '📊 S10: projects.js – denní graf radaru: kumulace nyní zahrnuje VŠECHNY zapsané výdaje měsíce (i s budoucím datem); plná mřížka (H+V), všechny dny po 2 na ose, konec grafu už neutíká za okraj (větší pravý pad), dnešní den jako tečka + popisek, snap hover.',
      '📊 S10: projects.js – „Kam směřuju" přepracováno na 4 stejné sloupce: Příjem / Plánovaný výdej / Budoucí platby / Cashflow (místo čárového grafu 3 měsíců).',
      '📈 S10: projects.js – Cashflow 3měs graf: víc místa dole (nekoliduje s osou), hodnoty příjmů/výdajů nad sloupci, osa Y s popisky, saldo pod měsícem.',
      '🗓️ S10: projects.js – Nadcházející platby přepracovány na přehled 30/60/90 dní: 3 karty sum + tabulka nejbližších plateb s oknem.',
      '🎨 S10: projects.js – popisky „Odhad počítá…" a „Detailní tabulka…" zvětšeny; tlačítko „Plná predikce roku" změněno z bílé na šedou.',
      '⚠️ S10: receipts.js – Analýza účtenek: banner „Datum v budoucnosti – zkontroluj" když AI přečte datum účtenky špatně (spadlo by mimo aktuální měsíc).',
    ]
  },
  {
    verze: 'v7.26',
    datum: '2026-06-01',
    zmeny: [
      '🐛 S10: projects.js – KRITICKÁ oprava: SVG grafy v radaru (predikce 3 měs, cashflow) se na desktopu roztáhly ~4× (viewBox 320 × width:100%). Přidán max-width + preserveAspectRatio.',
      '📊 S10: projects.js – denní graf radaru přepracován: robustní šířka (requestAnimationFrame+fallback), interaktivní (hover tooltip s denním/kumul. výdajem), dny 1–31 viditelné, popisky os (Kč, den v měsíci), zvětšená čitelnost, koncový bod predikce s částkou.',
      'ℹ️ S10: charts.js + index.html – „Kumulativní výdaje vs medián": přidána legenda, popisky os, vysvětlení že medián = prostřední z celkových výdajů za 6 měsíců.',
      '🎨 S10: transactions.js – Predikce: popisky legendy YTD/Předpoklad/Odhad zesvětleny (--text2 místo splývajícího --text3).',
      '🙈 S10: transactions.js – Predikce: tlačítko „Skrýt prázdné podkategorie" (skryje podkat bez transakce v daném roce).',
    ]
  },
  {
    verze: 'v7.25',
    datum: '2026-06-01',
    zmeny: [
      '🔀 S10: index.html – graf „Predikce – celý rok" (3 kumulativní křivky + záložka Sezonalita) přesunut ze stránky Grafy do správné stránky Predikce (tam byl prázdný placeholder).',
      '🎨 S10: transactions.js – grafy Predikce: legenda přesunuta nad plochu (už nezasahuje do grafu), osa Y s tisíci; sezonalita – šedá změněna na ČERVENOU (model), osa Y po 5 %, linka 100 % zvýrazněna.',
      '📊 S10: projects.js – Finanční radar: NOVÝ denní graf aktuálního měsíce – zelená linie příjmu (cíl), bílá kumulativní výdaje, žlutá čárkovaná predikce zbytku měsíce (navazuje na bílou), modré sloupce denní výše výdajů, tečka označující den příjmu.',
    ]
  },
  {
    verze: 'v7.24',
    datum: '2026-05-31',
    zmeny: [
      '🐛 S10: projects.js – KRITICKÁ oprava: ReferenceError „eomLeft before initialization". Predikční výpočet (eomLeft, pred3Total) přesunut PŘED alerty, které ho čtou (TDZ chyba zhroutila celý radar).',
      '📅 S10: projects.js – přidán kvartální predikční alert: „Qx směřuje k zápornému saldu…" (dosud nikdo nehlídal kvartál).',
      'ℹ️ S10: transactions.js – Predikce: nad tabulku přidána viditelná legenda 3 sloupců (YTD = skutečnost dosud, Předpoklad YTD = skutečnost + predikce zbytku, Odhad roku = čistá predikce 12 měsíců).',
      '📈 S10: transactions.js – predikční graf přepracován na 3 kumulativní křivky (YTD/Předpoklad/Odhad) + nová záložka „Sezonalita (reál)": tvoje skutečná měsíční sezonalita vs pevný model aplikace.',
    ]
  },
  {
    verze: 'v7.23',
    datum: '2026-05-31',
    zmeny: [
      '🔗 S10: projects.js – Finanční radar / sekce „Kam směřuju": přidáno tlačítko „🔮 Plná predikce roku po kategoriích →" (odkaz na Premium stránku Predikce). Propojuje krátkodobou predikci radaru (3 měs) s dlouhodobou roční tabulkou po kategoriích.',
    ]
  },
  {
    verze: 'v7.22',
    datum: '2026-05-31',
    zmeny: [
      '📱 S10: projects.js + styles.css – Finanční radar: metriky (Příjmy/Výdaje/Saldo) na mobilu max 2 karty vedle sebe (3. přes celou šířku). Dříve 3×1 → čísla se ořezávala.',
      '📈 S10: projects.js – Cashflow graf: zkrácen z 12 na 3 měsíce (krátkodobý pohled) + přidána chybějící MODRÁ cashflow linie (saldo) přes nulovou osu (SVG).',
      '🔮 S10: projects.js – NOVÁ sekce „Kam směřuju": predikce konce aktuálního měsíce (kolik zbude = příjem − výdaje − známé platby) + odhad salda na příští 3 měsíce (průměr příjmů/výdajů + budoucí platby z budouci.js: opakující, splátky, narozeniny). Graf kumulativního salda.',
      '🔮 S10: projects.js – Radar nově hlídá i budoucnost: alert při hrozícím záporném konci měsíce a při záporné 3měsíční predikci (dříve jen „v pohodě" bez dat).',
    ]
  },
  {
    verze: 'v7.21',
    datum: '2026-05-31',
    zmeny: [
      '🎨 S10: settings.js + premium.js – tlačítko „Uložit nastavení" je nyní stavové: zelené jen při neuložené změně (+ banner „Máš neuložené změny"). Po uložení zešedne a banner se změní na „✅ Máte uloženo" a po 2s zmizí. Bez změn je tlačítko šedé bez banneru.',
    ]
  },
  {
    verze: 'v7.20',
    datum: '2026-05-31',
    zmeny: [
      '🎨 S10: admin.js – Komunitní přehled: karty Příjem/Výdaje/Úspory ČR sjednoceny s horní řadou (Moje výdaje/ČSÚ/Nezařazeno) – text na střed, stejný font (Syne), popisek bez uppercase. Dříve byly nezarovnané (text vlevo + jiný styl).',
    ]
  },
  {
    verze: 'v7.19',
    datum: '2026-05-31',
    zmeny: [
      '🔗 S10: admin.js – odkaz „Sdílení & Partneři" nyní vede na funkční stránku sdileni (dříve omylem do „O aplikaci"). Sdílení s partnerem už plně funguje (kopírování UID, přidání partnera, read-only přístup – security rules to podporují).',
      '👨‍👩‍👧 S10: admin.js – Komunitní přehled, režim „Domácnost": pokud máš přidané partnery, jejich výdaje se SČÍTAJÍ do rodinného souhrnu („Výdaje rodiny (N)") a porovnají s ČSÚ. Bez partnerů zůstává jen tvůj přehled + výzva přidat partnera.',
    ]
  },
  {
    verze: 'v7.18',
    datum: '2026-05-31',
    zmeny: [
      '🔧 S10: settings.js – tlačítko „Uložit nastavení" přesunuto hned pod sekci Složení domácnosti (přehlednější, dříve bylo až úplně dole).',
      '⬇️ S10: admin.js – karty Příjem/Výdaje/Úspory ČR přesunuty POD souhrn Moje výdaje/ČSÚ/Nezařazeno; font sjednocen (Syne, jako souhrnné karty).',
      'ℹ️ S10: admin.js – popisek režimu „Domácnost" upřesněn: rodinný souhrn (sčítání výdajů obou partnerů přes sdílený odkaz) je zatím v přípravě – „Moje výdaje" jsou nyní jen tvoje.',
      '🔗 S10: admin.js – přidán odkaz „👥 Sdílení & partneři →" (goToSharing scrolluje na sekci sdílení v „O aplikaci").',
    ]
  },
  {
    verze: 'v7.17',
    datum: '2026-05-31',
    zmeny: [
      '⬆️ S10: admin.js – karty Příjem/Výdaje/Úspory ČR nyní SKUTEČNĚ nahoře, hned pod hlavičkou „Moje výdaje dle COICOP" (dříve byly omylem až pod tabulkou).',
      'ℹ️ S10: admin.js – přepínač Já/Domácnost má vysvětlující popisek: „Já" = na 1 osobu (sám/sama), „Domácnost" = OECD ekvivalent rodiny (ideálně když appku sdílí oba partneři).',
      '📊 S10: admin.js – ČSÚ tabulka má nově 2 sloupce domácnosti: „Domácnost ČR (2,4 os)" + „Tvoje dom. (OECD dle nastavení)" – přepočet reaguje na počet dospělých a dětí (např. 1+3, 3+3).',
      '🔽 S10: admin.js + helpers.js – rozklikávací strom doplněn o 3. úroveň (třídy COICOP): oddíl → skupina → třída. Nová mapa COICOP_CLASSES.',
      '🗑️ S10: admin.js – odstraněno duplicitní pole „Affiliate" z Admin panelu (nefunkční, řešeno jinde).',
    ]
  },
  {
    verze: 'v7.16',
    datum: '2026-05-30',
    zmeny: [
      '📊 S10: helpers.js + receipts.js – COICOP_GROUPS_DEF doplněn o skupiny 2. úrovně (groups[]) pro všech 13 oddílů (40 skupin).',
      '🔽 S10: admin.js – ČSÚ tabulka je nyní rozklikávací (tap na oddíl → skupiny 2. úrovně COICOP).',
      '⬆️ S10: admin.js – karty Příjem/Výdaje/Úspory ČR přesunuty nahoru, hned pod „Moje výdaje dle COICOP".',
      '🐛 S10: admin.js – Komunitní přehled blikal při přepínání (osoba/domácnost, rozbalení). Loading placeholder se zobrazí jen při prvním načtení (_komunitaLoaded cache).',
      '🔧 S10: admin.js + settings.js – tlačítko „Nastavení složení domácnosti" odděleno od přepínače Já/Domácnost; odkaz (goToHouseholdSettings) nově scrolluje a zvýrazní přímo sekci Složení domácnosti.',
      '🐛 S10: settings.js – plovoucí (sticky) „Uložit nastavení" nahrazeno normálním tlačítkem na konci stránky + hint o neuložených změnách.',
      'ℹ️ S10: admin.js – popsán vztah osoba/domácnost: ČSÚ publikuje na osobu; „průměrná domácnost ČR" = ×2,4, ale férové srovnání používá OECD ekvivalent tvé domácnosti.',
    ]
  },
  {
    verze: 'v7.15',
    datum: '2026-05-30',
    zmeny: [
      '📊 S10: helpers.js + receipts.js – COICOP_GROUPS_DEF aktualizováno na oficiálních 13 oddílů CZ-COICOP 2024 (správné názvy: Bydlení/voda/energie, Informace a komunikace, Stravování a ubytování, Osobní péče…). avg_osoba = odhad Kč/os/měs kalibrovaný na ověřené kotvy ČSÚ.',
      '🐛 S10: admin.js – „Já vs ČSÚ": OPRAVA bugu – přidán přepínač 👤 Já (osoba) / 🏠 Domácnost. Domácnost se nově počítá přes OECD ekvivalent (calcOECD) ze složení domácnosti v Nastavení. Dříve se OECD ignorovalo (avg_domacnost natvrdo).',
      '🔗 S10: admin.js – tlačítko „⚙️ Složení domácnosti" → odkaz do Nastavení; ČSÚ součet dynamický (ne natvrdo 44200).',
      '📊 S10: admin.js – ČSÚ tabulka přepsána na 13 oddílů COICOP s hodnotami osoba/měs i domácnost/měs vedle sebe (dle reálné struktury ČSÚ).',
    ]
  },
  {
    verze: 'v7.14',
    datum: '2026-05-30',
    zmeny: [
      '🎨 S10: styles.css – záložky (.tx-filt-btn) vráceny na bílé pozadí dle preference uživatele.',
      '📱 S10: admin.js + styles.css – Komunitní přehled: stat-karty (Příjem/Výdaje/Úspory ČR) responzivní (.community-stat-grid) – na mobilu 1 sloupec, text se neořezává (řeší tři tečky).',
      '🔀 S10: admin.js – Komunitní přehled: odstraněna samostatná záložka „ČSÚ tabulka". Tabulka „Průměrné výdaje domácnosti" + karty ČR jsou nyní v „Já vs. ČSÚ" (switchKomunitaTab sloučen). Data nesmazána, jen sloučena.',
      '🫧 S10: ui.js – Bublinový graf/Cluster: zvětšeno vykreslovací pole (H 300→420), satelity (r 16–26) i jejich text a sponky 📎 pro lepší čitelnost.',
    ]
  },
  {
    verze: 'v7.13',
    datum: '2026-05-30',
    zmeny: [
      '🐛 S10: styles.css – opravena rozbitá CSS pravidlo .tx-filt-btn (přišlo o selektor, slilo se s předchozím #splitItemsList). Důsledek: taby (admin, statistiky, grafy) byly na mobilu nečitelné (bílé pozadí). Teď správné tmavé pozadí.',
      '🐛 S10: ui.js + helpers.js – globální anti-flicker guard v renderPage (přeskočí re-render při shodném podpisu dat). Řeší problikávání admin/report/komunita při scrollu. Navigace/změna měsíce vynucují render přes forceRender().',
      '🐛 S10: admin.js – Komunitní přehled: v záložce „Já vs ČSÚ" se zobrazovala i ČSÚ tabulka (ktab-csu-content neměl display:none). Opraveno.',
      '🗑️ S10: charts.js + index.html – Grafy/Obecné: filtr kategorií tam neměl efekt → skryt (zobrazuje se jen v Měsíční/Roční/Všechny).',
      '🗑️✨ S10: stats.js – Statistiky/Roční: odstraněna duplicitní TOP 30 tabulka (zůstává jen měsíční rozpad kategorie × 12 měsíců). Přidáno rozbalení podkategorií kliknutím na řádek kategorie.',
    ]
  },
  {
    verze: 'v7.12',
    datum: '2026-05-29',
    zmeny: [
      '🎨 S10: styles.css – zvýšen kontrast textu napříč aplikací (--text2 #8b90a8→#a8aec8, --text3 #545870→#7e84a0). Řeší špatně čitelný tmavý text (bannery, „% příjmu", legendy, popisky period).',
      '🐛 S10: ui.js – Bublinový graf: cluster přepsán s dynamickým bounding boxem (řeší přetékání). Sdílené prvky detekovány z podkategorií + tagů + tagů podkategorií, vykresleny jako satelity s 📎 sponkou. Tooltip auto-hide po 2,5 s + skrytí při překreslení (řeší zaseknutí).',
      '🐛 S10: index.html – Kalkulačka v „Přidat transakci" nefungovala (JS template literal ${...}.map() byl přímo v HTML → zobrazil se jako text). Nahrazeno statickými tlačítky.',
      '🗑️ S10: projects.js – odebrána záložka 7D z Měsíčního reportu (týdenní přehledy budou jinde).',
      '🐛 S10: projects.js + advisor.js – Vývoj fin. skóre: čísla nesedila (graf 13 vs kruh 25 vs tabulka 56). Sjednoceno na computeHealthScores().overall.',
      '✨ S10: stats.js – roční rozpad po měsících (kategorie × 12 měsíců) + přepínač „Od ledna"/„Posledních 12 měs.". Postřehy přesunuty nad tabulku.',
      '🐛 S10: admin.js + receipts.js – Low confidence: (1) Firebase error u klíčů s tečkou („indy s.r.o.") → fbSafeKey() sanitizace. (2) pravidlo se po překliknutí „vrátilo" – mapToCOICOP nyní čte cache keyword_overrides (window._kwOverrides), seznam se po uložení překreslí.',
      '🎨 S10: projects.js – zvýrazněny popisky záložek (bannery) a neaktivní period taby pro lepší čitelnost.',
    ]
  },
  {
    verze: 'v7.11',
    datum: '2026-05-29',
    zmeny: [
      '🔀 S10: DTI/DSTI „Bankovní hodnocení" PŘESUNUTO z Měsíčního reportu do záložky Půjčky (renderDebts). Důvod: jde o momentku dluhového profilu (celkový dluh + splátky), ne měsíční metriku – proto se neměnila při přepínání měsíců.',
      '🐛 S10: transactions.js – Predikce vs skutečnost (celý rok) se NEZOBRAZOVALA. Příčina: neshoda ID canvasu (predLineCanvas vs yearPredChart) + t.amt bez fallbacku. Opraveno.',
      '✏️ S10: index.html – graf „Saldo měsíce – 12 měsíců" přejmenován na „Měsíční saldo – trend 12 měsíců".',
      '🗑️✨ S10: stats.js – odebrán duplicitní graf „Měsíční saldo – trend". Místo něj TOP 30 kategorií s přepínačem Měsíc / Rok / Všechny roky (+ výběr roku), s pořadím a % podílem.',
      '✨ S10: projects.js – Měsíční report: period stepper 1–12 měsíců (vč. 2/4/5/7-11M). Mřížka kruhů Celkového zdraví pro libovolný počet měsíců. Graf vývoje skóre posunut výš + osa Y 0–100.',
      '✨ S10: projects.js – Tabulka „3 složky zdraví" přepracována na KRUHY PO MĚSÍCÍCH (každý měsíc řádek: výdajové/rozpočtové/úsporové), popisky sloupců nad polem. Řeší konstantní data při sumarizaci.',
      '✨ S10: projects.js – Finanční zdraví dle kategorií: přidána legenda (částka/trend/skóre + barvy). Vysvětluje, proč je 75 = výchozí bez limitu.',
      '✨ S10: projects.js – Sbalitelné popisky k záložkám Měsíční report, Finanční radar, Finanční obraz, Detektor úspor (co to je / k čemu slouží).',
    ]
  },
  {
    verze: 'v7.10',
    datum: '2026-05-29',
    zmeny: [
      '🐛 OPEN-012/OPEN-029 (S10): projects.js – Měsíční report „Finanční zdraví dle kategorií" byl STATICKÝ – health rows braly getActual(S.curMonth) bez ohledu na záložku. Nový getActualRange() agreguje výdaje kategorie/podkat. přes celé období (7D/1M/3M/6M/12M). Trend se srovnává s předchozím stejně dlouhým oknem. % příjmu nyní z agregovaného příjmu období. 7D agregace opravena na skutečných 7 dní.',
      '🐛 FIX (S10): projects.js + advisor.js – Celkové fin. zdraví: kruh měl jinou barvu než štítek (44 červený kruh vs žlutý text). Příčina: drawHealthRing() byla v advisor.js duplicitně s jinými prahy (≥75/≥50) a přepisovala verzi v projects.js (healthColor ≥71/≥41). Duplicita odstraněna, barvy sjednoceny.',
      '✨ S10: projects.js – Celkové fin. zdraví pro 6M/12M zobrazeno jako mřížka kruhů (6, resp. 12) s čísly + průměr a popisek (kritické/průměrné/zdravé). Pro 1M/3M/7D zůstává velký kruh.',
      '✨ S10: advisor.js + projects.js – Vývoj finančního skóre překreslen jako HYBRID: kruhy s čísly propojené spojnicovou čarou (vyšší skóre = kruh výš), dle náčrtu. Nahrazuje samostatnou čáru z v7.08.',
      '🐛 OPEN-009 (S10): projects.js – DTI/DSTI fallback na d.payment nyní zohledňuje d.freq (týdenní ×4.33, čtrnáctidenní ×2.17) → DSTI se nepodhodnocuje.',
    ]
  },
  {
    verze: 'v7.09',
    datum: '2026-05-29',
    zmeny: [
      '🐛 TODO-093 (S10): ui.js + app.js – Centrální debounce renderPage. Firebase onValue listener volal renderPage() při každé synchronizaci → problikávání napříč stránkami. renderPageDebounced() slučuje volání (120ms) a přeskočí render při shodném podpisu dat. Uživatelské akce (showPage, save, changeMonth) renderují přímo.',
      '✨ TODO-088 (S10): projects.js – Financial Freedom Ratio (FFR) = pasivní příjem / výdaje × 100. Pasivní příjem = příjmové kategorie incomeChar=passive. Progress bar + fáze (závislost/částečná svoboda/nezávislost). Ve Finančním obrazu.',
      '✨ TODO-089 (S10): projects.js – Detektor inflace životního stylu. Porovnání růstu příjmů vs výdajů; alert pokud výdaje rostou o ≥3 p.b. rychleji. Ve Finančním obrazu.',
      '✨ TODO-090 (S10): assets.js – Asset Allocation donut graf (SVG). Rozložení majetku dle typu + peněženky, s legendou a procenty. V záložce Finanční aktiva.',
      '✨ TODO-091 (S10): projects.js – Income Diversification Score (0–100) přes inverzní Herfindahl index příjmových zdrojů + bary jednotlivých zdrojů. Ve Finančním obrazu.',
      '✨ TODO-092 (S10): projects.js – Wealth Momentum: průměrný měsíční přírůstek jmění + aktuální net worth. Ve Finančním obrazu.',
    ]
  },
  {
    verze: 'v7.08',
    datum: '2026-05-29',
    zmeny: [
      '✨ S10: projects.js + styles.css – Měsíční report: stat-karty (Příjmy/Výdaje/Saldo/Základ) responzivní. Na mobilu 2×2 místo 4×1 + menší font → částky se už neořezávají (133…/142…).',
      '✨ TODO-088 (S10): advisor.js + projects.js – Graf vývoje finančního skóre. Spojnicový graf, osa X = měsíce, osa Y = skóre (vyšší bod výš). V Poradci vždy 12 měsíců (rok), v reportu dle periody (1M=1, 3M=3, 6M=6, 12M=12). Nahradil kruhové „kruhy dle měsíců“.',
      '🐛 FIX (S10): advisor.js – Poradce zobrazoval 3 skóre místo 12. Příčina: periodMap nečetl hodnotu „advisor“ → fallback na 3M. Nyní Poradce vždy 12 měsíců.',
      '🐛 FIX (S10): advisor.js – AI doporučení se VOLALO AUTOMATICKY při otevření Poradce. Nyní pouze na tlačítko „✨ Vygenerovat AI doporučení“ + cache výsledku.',
      '🐛 FIX (S10): advisor.js + projects.js – Poradce PROBLIKÁVAL při scrollování/práci. Příčina: Firebase onValue listener → renderPage → renderReport → renderAdvisor přegeneroval celý DOM při každé synchronizaci. Přidán anti-flicker guard (podpis dat, přeskočí re-render když se nic nezměnilo).',
    ]
  },
  {
    verze: 'v7.07',
    datum: '2026-05-29',
    zmeny: [
      '🐛 FIX (S10): premium.js – computeFinancialScore() nestabilní skóre OPRAVENO. Konzistenční bonus se MUTOVAL do D.scoreState při každém volání (render/networth/ai.js) → při přepínání měsíců skóre nepředvídatelně skákalo (18→25→31). Nyní deterministický výpočet z historie posledních 6 měsíců, žádná mutace stavu.',
      '🐛 FIX (S10): projects.js – Detektor úspor ZAMRZNUTÍ prohlížeče OPRAVENO. Sekce Refinancování volala generateSchedule() 2× na drahý dluh; u velkého dluhu (-4,8 mil.) s nízkou splátkou běžela smyčka do stropu 7200 období a tvořila dvě obří pole. Nahrazeno lehkým odhadem úroku (strop 50 let, fallback když splátka nepokryje úrok).',
    ]
  },
  {
    verze: 'v7.06',
    datum: '2026-05-29',
    zmeny: [
      '🐛 TODO-076 / OPEN-031 (S10): ui.js – bCluster() přepsán na relativní souřadnice (0–1 × W/H) místo absolutních px+padding. Bubliny už nepřetékají z SVG viewBoxu ani nezasahují pod přepínací lištu.',
      '✨ S10: ui.js – přidány hover tooltipy do všech bublinových grafů (Cluster, Drill L1/L2/L3, Gradient). Nová infrastruktura bTip()/bEsc() + dynamický #_bubbleTip element.',
      '✨ S10: ui.js – Cluster a Gradient: kategorie obsahující sdílenou podkategorii dostane 📎 sponku uvnitř bubliny. Sdílené podkategorie zvýrazněny gradientem barev obou rodičovských kategorií.',
      '🗑️ S10: ui.js – záložka D (Treemap) odebrána z bublinového grafu (duplikát samostatné Treemap karty v dashboardu). Funkce bTreemap() smazána, router redukován na A/B/C, guard proti uložené staré hodnotě _bv=D.',
    ]
  },
  {
    verze: 'v7.05',
    datum: '2026-05-29',
    zmeny: [
      '✨ TODO-087 (S9): projects.js – Detektor úspor A) Zbytečné utrácení: detekce malých plateb (≤300 Kč) opakujících se 4× a více za měsíc. Top 3 položky s odhadem úspory 50 %.',
      '✨ TODO-087 (S9): projects.js – Detektor úspor B) Výplata efekt: pokud ≥60 % měsíčních výdajů padne do 7 dní po první příjmové transakci → alert s % a tipem na metodu obálky.',
      '✨ TODO-087 (S9): projects.js – Detektor úspor C) Jídlo venku: keyword match restaurace/kavárna/McDonald/KFC…, denní průměr Kč/den, odhad měsíční sumy, úspora 30 %.',
      '✨ TODO-087 (S9): projects.js – Detektor úspor D) Zdražení: propojení s itemStats z S.receipts – porovnání cen položek za 3 měsíce, alert při zdražení >10 %, odkaz do Analýza účtenek → Zdražování.',
      '✨ TODO-087 (S9): projects.js – catColor rozšířen o nové barvy (oranžová/fialová/červená), analyzesList rozšířen na 10 položek.',
      '✨ TODO-087 (S9): projects.js – odkaz "Analýza účtenek → Zdražování" v info sekci Detektoru.',
    ]
  },
  {
    verze: 'v7.04',
    datum: '2026-05-29',
    zmeny: [
      '🐛 FIX (S9): admin.js – COMMUNITY_MONTH_KEY() nyní respektuje S.curMonth/S.curYear místo vždy dnešního data. Komunitní přehled zobrazuje data zvoleného měsíce.',
      '🐛 FIX (S9): admin.js – renderKomunita() throttlována (120ms) → konec blikání při přepínání měsíce.',
      '🐛 FIX (S9): admin.js – myExp počítá pouze výdajové transakce (type=expense, bez isBalancing). Žádné příjmy v COICOP statistikách.',
      '✨ FIX (S9): admin.js – záložky přejmenovány: "Já vs. ČSÚ" / "ČSÚ tabulka" / "Já vs. komunita".',
      '🐛 FIX (S9): index.html + share.js – shareSection: přidán vždy viditelný link bar s tlačítky "📋 Kopírovat" a "📤 Sdílet". initShareLinkBar() inicializuje odkaz ihned bez čekání na async referral.',
      '🗑️ FIX (S9): index.html – odstraněny zastaralé Poznámky k vydání (v6.35–v3.5). Nahrazeny dynamickými pozn. z VERZE_LOG v admin.js (renderReleaseNotes()).',
      '✨ NEW (S9): share.js – copyShareLinkDirect(): kopíruje odkaz s vizuálním feedbackem "✅ Zkopírováno!".',
      '✨ NEW (S9): share.js – renderReleaseNotes(): generuje Poznámky k vydání z VERZE_LOG (posledních 8 verzí, max 3 změny/verze).',
      '✨ NEW (S9): ui.js – renderPage() hook pro oAplikaci: volá initShareLinkBar(), renderReleaseNotes(), renderShareSection().',
    ]
  },
  {
    verze: 'v7.03',
    datum: '2026-05-28',
    zmeny: [
      '✨ TODO-086 (S9): import.js – Doporučené přiřazení transakcí z importu: guessCategoryFromKeyword() navrhne kategorii dle MERCHANT_CATEGORIES + shody názvu kategorie/podkategorie. Nenamapované transakce dostanou suggestedCatId.',
      '✨ TODO-086 (S9): import.js – náhled importu má sloupec Kategorie: žlutý badge „🤖 Doporučeno" u návrhů, 🧠 u AI paměti. Tlačítko „✓ Přijmout doporučené" hromadně potvrdí všechny návrhy (acceptAllSuggestions).',
      '✨ TODO-086 (S9): import.js – při finálním importu se suggestedCatId použije jako fallback. recordSuggestionOverride() zaznamená když uživatel zvolí JINOU kategorii → /community/suggestionOverrides/{key}.',
      '✨ TODO-086 (S9): admin.js – nová záložka „🤖 Doporučení": přehled které doporučené kategorie uživatelé mění a na co (s počty). Admin pak může upravit komunitní pravidlo.',
      '✨ TODO-086 (S9): database.rules.json – přidán community/suggestionOverrides (admin read, auth write)',
    ]
  },
  {
    verze: 'v7.02',
    datum: '2026-05-28',
    zmeny: [
      '🐛 FIX (S9): receipts.js – duplicita položek ve Statistikách: normalizace klíče na lowercase (ROHLÍK 43G ≡ Rohlík 43g)',
      '✨ NEW (S9): receipts.js – Statistiky: přidán sloupec "Ks" (celkový počet kusů), zobrazení více tagů na položku, displayName = nejdelší varianta názvu',
      '✨ NEW (S9): receipts.js – Graf položek/tagů: SVG sloupcový + čárový kumulativní graf, selekce Název/Tag × Ks/Kč × 1M/3M/6M/12M',
      '🐛 FIX (S9): ui.js – tagy v Transakcích: modrá→růžová (#ec4899) pro pole tags[] (hashtag tagy), přidány zelené tagy z účtenek (tx.tags string)',
      '✅ Fix (S9): admin.js – přidán v7.01 do VERZE_LOG (chyběl)',
      '✅ Fix (S9): receipts.js – renderItemChart() inicializuje se při přepnutí záložky Statistiky',
    ]
  },
  {
    verze: 'v7.01',
    datum: '2026-05-28',
    zmeny: [
      '🐛 FIX (S9): receipts.js – saveItemTagMapping() CORS chyba: odstraněn method TRANSACTION, klíče normalizovány přes NFD (bez diakritiky, bez mezer), správné GET+PUT',
      '🐛 FIX (S9): receipts.js – X zavřít červená barva + červený rámeček, opravena logika zavírání (rcpt_hist/rcpt_edit/receiptPreview)',
      '🐛 FIX (S9): receipts.js – tag input nápověda zmizí při focus (onfocus/onblur)',
      '🐛 FIX (S9): receipts.js – catTags v Historii růžová barva místo barvy kategorie',
      '✅ Fix (S9): receipts.js – přehozen počet účtenek za select filtry v buildHistoryTab',
      '✅ Fix (S9): admin.js – (1×) růžová barva #ec4899, font-weight:700',
      '✅ Fix (S9): admin.js – fajfka: šedá = neschváleno, zelená = schváleno (načítá status z itemTagValidation)',
      '✅ Fix (S9): receipts.js – zelené tagy viditelné v Statistikách (renderItemStatsList)',
      '✅ Fix (S9): receipts.js – addReceiptAsTx() ukládá subcat + tags do transakce',
    ]
  },
  {
    verze: 'v7.00',
    datum: '2026-05-28',
    zmeny: [
      '🐛 FIX (S9): receipts.js – buildHistoryTab() přepsán: sort/filter toolbar (📅 Nejnovější/Nejstarší/Nejvyšší/Nejnižší, filtr dle obchodu), datum zlatě před názvem, vše v jednom řádku. Odstraněn orphan duplicitní kód.',
      '🐛 FIX (S9): receipts.js – X tlačítko v editoru inteligentní: zavře rcpt_hist_{idx} slot, rcpt_edit_{idx} div nebo receiptPreview dle kontextu.',
      '🐛 FIX (S9): receipts.js – "Přidat jako transakci" → "💾 Uložit změny"',
      '✨ NEW (S9): receipts.js – Položkové tagy: každá položka má pole 🏷️ tag (datalist suggestions), onchange ukládá do community Firebase /community/itemTags/{itemKey}/{tag}.',
      '✨ NEW (S9): admin.js – záložka "🔖 Item Tagy": seznam komunitních tagů s počty, admin může Schválit (✓) nebo Odmítnout (✕) → uloží do itemTagValidation.',
      '✨ NEW (S9): database.rules.json – přidány community/itemTags a community/itemTagValidation',
    ]
  },
  {
    verze: 'v6.99',
    datum: '2026-05-28',
    zmeny: [
      '✅ TODO-006 (S9): app.js – globální error handler: window.addEventListener(error) + unhandledrejection → showCrashBanner(). Ignoruje third-party, ResizeObserver, Firebase network/permission chyby. Sentry capture pokud dostupný.',
      '✅ TODO-006 (S9): index.html – #globalErrorBanner HTML element: červený banner fixed top, tlačítko 🔄 Obnovit a ✕ zavřít. Auto-hide po 8s.',
      '✅ TODO-082 (S9): helpers.js – computeCoicopAggregates(txs, D): projde transakce, přiřadí COICOP dle DEFAULT_CATEGORIES + coicopOverrides + user kategorie. Vrátí {cats:{1:sum,...}, unassigned}.',
      '✅ TODO-082 (S9): helpers.js – uploadCoicopToFirebase(): anonymní upload do /community/{YYYY-MM}/users/{uid}. Voláno throttlovaně (5 min) po každém save().',
      '✅ TODO-082 (S9): admin.js – Komunitní přehled: nová záložka "🔢 COICOP přehled" – přesné srovnání mých výdajů vs. ČSÚ průměr dle COICOP skupin 1–13. Dual progress bar, % odchylka, upozornění na nezařazené výdaje.',
    ]
  },
  {
    verze: 'v6.98',
    datum: '2026-05-28',
    zmeny: [
      '✨ NEW (S9): receipts.js – extractUnit(): extrakce hmotnosti/objemu z názvu položky (500g→0.5kg, 1.5l, 250ml→0.25l) → pricePerUnit = Kč/kg nebo Kč/l',
      '✨ NEW (S9): receipts.js – Shrinkflation detektor: pokud hmotnost klesla o >2% při zachování ceny → badge 🔻 Shrinkflation s detailem gramů',
      '✨ NEW (S9): receipts.js – buildPricesTab() přepracován: 3 sekce – Shrinkflation (červená) / Cena/kg a cena/l (žlutá) / Cenové změny. Každá položka má timeline ceny/ks i ceny/kg.',
      '✨ NEW (S9): receipts.js – Cena/kg timeline: samostatný panel pod každou položkou kde byla detekována hmotnost v názvu.',
    ]
  },
  {
    verze: 'v6.97',
    datum: '2026-05-28',
    zmeny: [
      '✨ NEW (S9): index.html + debts.js – modal Přidat transakci: přidány pole Peněženka a Typ platby (populateTxWalletSelect, populateTxPayTypeSelect). Hodnoty se ukládají do txObj.wallet a txObj.payType.',
      '✨ NEW (S9): debts.js – Převodník měn pod polem Částka: orientační kurzy CZK/EUR/USD/PLN/GBP/CHF/HUF. Při výběru peněženky s měnou se automaticky přepne. Funkce updateTxConverter().',
      '✨ NEW (S9): debts.js – Kalkulačka 🧮: rozkliknutelný panel pod polem Částka, 4×4 grid (0-9, ÷×−+, C⌫=), tlačítko "Vložit do Částka". Funkce calcBtn(), calcInsert(), toggleTxCalc().',
      '✨ UX (S9): index.html – labely polí v modalu transakce zvýrazněny zlatou barvou (var(--bank)), font-weight:700, letter-spacing',
      '✨ UX (S9): debts.js – sub-chip (podkategorie) má rámeček v barvě vybrané kategorie, vybraná podkategorie má barevné pozadí + bílý text',
    ]
  },
  {
    verze: 'v6.96',
    datum: '2026-05-27',
    zmeny: [
      '✨ NEW (S9): share.js – affiliate sdílení redesign: velké zelené primární tlačítko "📤 Sdílet s přáteli" (native share sheet – otevře WhatsApp/Messenger/Signal/Email/SMS a vše ostatní co má uživatel nainstalované)',
      '✨ NEW (S9): share.js – přidána přímá tlačítka: Signal (kopíruje zprávu + hint), Telegram (t.me/share/url), mřížka 3×2 s emoji ikonami',
      '✨ NEW (S9): share.js – getShareMessage() rozšířen o signal a telegram zprávy',
      '✨ NEW (S9): share.js – shareVia() case signal (deep link + clipboard fallback) a case telegram (t.me share URL)',
    ]
  },
  {
    verze: 'v6.95',
    datum: '2026-05-27',
    zmeny: [
      '✅ TODO-008 (S9): receipts.js – validateReceiptJSON(): robustní validace AI odpovědi – store fallback, total jako číslo, date formát, items musí být pole, price/qty normalizace, přeskočení nulových položek, dopočet totalu',
      '✅ TODO-008 (S9): ai.js – validateAiCatJSON(): validace catId, confidence enum, fallbacky pro chybějící pole',
    ]
  },
  {
    verze: 'v6.94',
    datum: '2026-05-27',
    zmeny: [
      '🐛 FIX (S9): worker.js – receipt prompt rozšířen o PRAVIDLO 2 pro váhové položky (0.246 kg × 249.90 Kč/kg → price=61.40, ne price=249.90) a PRAVIDLO 3 pro slevy (závorková cena = skutečná cena)',
      '🐛 FIX (S9): receipts.js – rpRender() nepřekresluje DOM pokud je fokusovaný input → konec blikání při editaci počtu/ceny na mobilu',
      '🐛 FIX (S9): receipts.js – toggleHistReceipt() přidán scroll-safe fix pro mobile',
      '✨ ARCH (S9): receipts.js – buildHistoryTab() přepsán jako master seznam účtenek (řazení dle data, kategorie tagy, editace inline přes rcpt_hist_{idx} slot)',
      '✨ ARCH (S9): receipts.js – editReceiptFromHistory() používá dedikovaný rcpt_hist_ slot v historii, fallback pro Obchody záložku',
    ]
  },
  {
    verze: 'v6.93',
    datum: '2026-05-27',
    zmeny: [
      '🐛 FIX (S9): receipts.js – buildStoresTab() a buildHistoryTab() přijímají uniqueReceipts jako parametr (ne S.receipts globál) → konec duplicit v zobrazení',
      '✨ NEW (S9): receipts.js – deduplicator v renderUctenky(): identifikátor obchod|datum|suma|počet položek → žlutý banner s počtem duplikátů + tlačítko "Smazat duplikáty" (removeDuplicateReceipts)',
      '🐛 FIX (S9): receipts.js – editReceiptFromHistory() inline expand opravena detekce rodičovského řádku přes querySelectorAll+getAttribute',
      '✨ UX (S9): receipts.js – statistika položek: fixní grid 1fr 60px 90px 80px, padding:10px, mezera pod kategorií',
    ]
  },
  {
    verze: 'v6.92',
    datum: '2026-05-27',
    zmeny: [
      '🐛 FIX (S9): receipts.js – buildStoresTab() správně používá normalizeStoreName pro seskupení receipts → PENNY/PENNY MARKET s.r.o. se teď rozkliknou',
      '🐛 FIX (S9): receipts.js – editReceiptFromHistory() inline expand pod řádkem účtenky (ne modal overlay, ne přepnutí na Skenovat záložku)',
      '✨ UX (S9): receipts.js – buildHistoryTab() + buildStoresTab(): větší font texty (.85rem/.95rem), var(--text2) pro popis, průměr vedle sumy, šipka ▶ 0.85rem',
      '✨ UX (S9): receipts.js – renderItemStatsList(): 4-sloupcový grid layout: Položka+Kategorie | Počet (Syne bold) | Celkem Kč (červená) | Průměr Kč/ks. Bez obchodu.',
    ]
  },
  {
    verze: 'v6.91',
    datum: '2026-05-27',
    zmeny: [
      '🐛 FIX (S9): receipts.js – editReceiptFromHistory() nezobrazuje se více na záložce Skenovat. Otevře se jako modal overlay nad aktuální záložkou.',
      '🐛 FIX (S9): receipts.js – qty spinner krok 1 (bylo 0.001), label "ks". Cena: šířka 68px, textField bez spinner reset.',
      '✨ NEW (S9): receipts.js – buildStoresTab() přepracován: expandovatelné obchody → účtenky → položky (stejná logika jako buildHistoryTab). Progress bar se zobrazí při rozbalení.',
      '✨ NEW (S9): receipts.js – normalizeStoreName(): sloučení variant PENNY/PENNY MARKET s.r.o., MOJ/MÔJ/MÚJ obchod → jeden záznam v storeStats.',
      '✨ UX (S9): receipts.js – renderItemStatsList(): celková suma jako hlavní číslo (Syne font, červená), průměr a rozsah jako sekundární info.',
    ]
  },
  {
    verze: 'v6.90',
    datum: '2026-05-27',
    zmeny: [
      '🐛 FIX (S9): database.rules.json – catalog/items chybělo write pravidlo → PERMISSION_DENIED při publishPricesToCatalog. Přidáno .write: "auth != null" s validací',
      '✨ UX (S9): receipts.js – subkat select: lepší kontrast (color:var(--text2), font-weight:500), barevný rámeček dle kategorie',
      '✨ NEW (S9): receipts.js – buildHistoryTab() přepsán: seskupení dle obchodů + expandovatelné skupiny (▶) → individuální účtenky s datem + kategoriemi → expandovatelné položky s catId+subcat',
      '🐛 FIX (S9): receipts.js – buildStoresTab() průměr zobrazen pouze pokud visits > 1 (dříve průměr = celková suma při 1 návštěvě)',
      '✨ UX (S9): receipts.js – renderItemStatsList() zvýrazněno: větší text (.88rem/.95rem), barevný název kategorie, obchod kde nakoupeno, badge počtu nákupů',
    ]
  },
  {
    verze: 'v6.89',
    datum: '2026-05-25',
    zmeny: [
      '✨ NEW (S9): receipts.js – subkategorie v item selectu: druhý select se zobrazí pokud má kategorie podkategorie (rpItemSubcatOptions()). Uloží se jako itemSubcat na položce.',
      '✨ NEW (S9): receipts.js – updateItemStats() – Firebase agregát /users/{uid}/itemStats/{key}: count, totalSpent, avgPrice, lastDate, catId, subcat, history[] (posledních 24 cen pro trend)',
      '✨ NEW (S9): receipts.js – buildStatsTab() přepsán: kategorie výdajů z položek (catId→jméno), filtr 1M/3M/6M/12M/vše pro top položky, trend ceny (↑↓), min–max cena',
      '✨ NEW (S9): receipts.js – renderItemStatsList() s filtrem dle období, renderuje top 15 položek s počty, průměrnou cenou, rozsahem cen a trendem',
      '✨ NEW (S9): receipts.js – loadItemStatsFromFirebase() – načte vše od začátku z Firebase on-demand tlačítkem "📊 Vše od začátku"',
      '✨ NEW (S9): database.rules.json – přidán uzel itemStats s validací',
    ]
  },
  {
    verze: 'v6.88',
    datum: '2026-05-25',
    zmeny: [
      '✨ TODO-014 (S9): receipts.js – guessItemCatId() – nová funkce: priority 1) AI mappings cache, 2) keyword match → vrací {catId, catName, fromMemory}. Badge 🧠 u položek z AI paměti.',
      '✨ TODO-014 (S9): receipts.js – rpRender() přepracován: select zobrazuje uživatelské kategorie (catId jako value), onchange ukládá saveCategoryMapping(jméno_položky, catId). Skupiny položek mají barevný rámeček dle kategorie.',
      '✨ TODO-014 (S9): receipts.js – addReceiptAsTx() přepsán na multi-transakce: každá skupina položek stejné kategorie = samostatná transakce. Každá položka uloží mapování. Fallback na jednu transakci pokud nejsou položky.',
      '✨ TODO-014 (S9): receipts.js – rozšíření RP_ITEM_CATS: přidány Jídlo & Pití (alkohol), Domácí potřeby, Elektronika, Oblečení. Přejmenovány Domácí mazlíčci → Domácí mazlíček (shoduje se s kategorií).',
    ]
  },
  {
    verze: 'v6.87',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): ai.js – aiCategorizeTxForce() přidány dvě tlačítka: "🧠 Zapamatovat" (jen uloží mapping, NEotevírá modal) a "➕ Zapamatovat & přidat transakci" (uloží + otevře modal). Původně jen Použít = vždy otevřel modal.',
      '✨ TODO-014 (S9): receipts.js – addReceiptAsTx() používá lookupCategoryMapping(store) jako primární zdroj kategorie. Při uložení volá saveCategoryMapping() → příští účtenka od stejného obchodu se kategorizuje automaticky.',
      '✨ TODO-014 (S9): receipts.js – manuální změna kategorie v receipt preview selectu ukládá mapování do Firebase (saveCategoryMapping).',
      '🐛 FIX (S9): receipts.js – addReceiptAsTx() rozšířena hardcoded catMap o Elektronika, Oblečení, Sport, Domácí mazlíček, Dům & Zahrada, Lékárna.',
    ]
  },
  {
    verze: 'v6.86',
    datum: '2026-05-25',
    zmeny: [
      '✨ TODO-080 (S9): stats.js – renderStats() category breakdown rozšířen o podkategorie: barevné tagy s částkami pod každou kategorií (jen s daty)',
      '✨ TODO-080 (S9): projects.js – renderReport() health rows rozšířeny o podkategorie: tagy s částkami pod každou kategorií v sekci Finanční zdraví',
    ]
  },
  {
    verze: 'v6.85',
    datum: '2026-05-25',
    zmeny: [
      '✨ TODO-015 (S9): ui.js – in-app notifikace nadcházejících plateb: getUpcomingNotifications(), updateNotificationBadge(), showNotificationPanel(), snoozeNotifications()',
      '✨ TODO-015 (S9): ui.js – badge (červený/žlutý) na nav položce „Budoucí platby" s počtem plateb do 7 dní',
      '✨ TODO-015 (S9): ui.js – notifikační panel (slide-up) 1,5s po přihlášení: platby do 3 dní, celková suma, tlačítka Zobrazit vše / Odložit na 1 den (snooze do localStorage)',
      '✨ TODO-015 (S9): ui.js – snooze systém: uloží datum do localStorage, nezobrazuje panel po celý den',
    ]
  },
  {
    verze: 'v6.84',
    datum: '2026-05-25',
    zmeny: [
      '✨ TODO-014 (S9): app.js – globální categoryMappings systém: normalizeMappingKey(), loadCategoryMappings(), saveCategoryMapping(), lookupCategoryMapping(), initCategoryMappings(). Ukládání do Firebase users/{uid}/categoryMappings/{key} i localStorage.',
      '✨ TODO-014 (S9): ai.js – aiCategorizeTx() nejdřív zkontroluje lokální mappings cache (zobrazí "Z paměti (N×)") s možností přepsat AI dotazem. applyAiCat() uloží mapování do Firebase.',
      '✨ TODO-014 (S9): import.js – showImportPreview() async, auto-přiřadí kategorie z mappings cache před zobrazením. setCatMapping() ukládá i do Firebase. Badge "🧠 X transakcí automaticky kategorizováno z AI paměti".',
      '✨ TODO-014 (S9): database.rules.json – přidán uzel categoryMappings s validací catId a updatedAt.',
    ]
  },
  {
    verze: 'v6.83',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): admin.js – HTTP 400 při načítání admin panelu: odstraněn orderBy="premium/type" z loadUserStats() – Firebase Realtime DB vyžaduje index pro orderBy, bez něj vrací 400. Nahrazeno přímým načtením bez filtru.',
      '🐛 FIX (S9): admin.js – assignCoicop() nyní skutečně propíše COICOP číslo do Firebase kategorií všech uživatelů kteří ji mají (PATCH /users/{uid}/data/categories/{idx}/coicop). Dříve se ukládalo jen do admin_coicop_overrides ale nikde se to nečetlo.',
    ]
  },
  {
    verze: 'v6.82',
    datum: '2026-05-25',
    zmeny: [
      '🐛 KRITICKÝ FIX (S9): stats.js – renderCatPage() runtime merge (coicop/shared/coicopOverrides) mutoval přímo S.categories objekty → při save() se coicopOverrides s klíči "Školka/škola" (obsahují "/") ukládaly do Firebase → crash "invalid key". Opraveno: merge nyní vytváří shallow kopii {…c} pro každou kategorii, S.categories zůstává čisté.',
      '🐛 FIX (S9): stats.js – renderCatPage() přejmenování lokální proměnné cats→rawCats aby nedošlo ke konfliktu s nově definovanou cats (výsledek merge kopií).',
      '🐛 FIX (S9): admin.js – loadCategoryAdoption() správné pole subkategorie tx.subcat (bylo tx.subCategory)',
      '🐛 FIX (S9): admin.js – loadCustomCatsNoCoicop() robustnější načítání s filter(Boolean) a debug info',
    ]
  },
  {
    verze: 'v6.81',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): admin.js – loadCategoryAdoption() správné pole subkategorie: tx.subcat (bylo tx.subCategory → nefungovalo)',
      '🐛 FIX (S9): admin.js – loadCustomCatsNoCoicop() robustnější načítání: filter(Boolean) pro null položky, debug info o počtu načtených kategorií, správné zpracování pole i objektu',
    ]
  },
  {
    verze: 'v6.80',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): admin.js – renderAdmin() zachovává aktivní záložku při re-renderu (změna měsíce způsobovala reset na záložku Uživatelé)',
      '🐛 FIX (S9): admin.js – loadCategoryAdoption() COICOP čísla čtena z DEFAULT_CATEGORIES (ne z Firebase dat uživatelů kde chybí) → oprava badge "bez COICOP" u výchozích kategorií',
      '🐛 FIX (S9): admin.js – nevyužité kategorie v banneru zobrazeny jako seznam kategorií (ne podkategorií) se zlomem řádku',
      '✨ UX (S9): admin.js – podkategorie zobrazeny jako barevné tagy pod každou kategorií (počty v závorce)',
      '🐛 FIX (S9): firebase.json – obnovena sekce database pro firebase deploy --only database',
    ]
  },
  {
    verze: 'v6.79',
    datum: '2026-05-25',
    zmeny: [
      '✨ TODO-079 (S9): admin.js – nová záložka „🏷️ Adopce kategorií": tabulka využití kategorií (počet transakcí, počet uživatelů, top podkategorie, progress bar, badge custom/bez COICOP). Souhrnné metriky: celkem transakcí, nezařazeno %, v Jiné %. Upozornění na nevyužité výchozí kategorie.',
      '✨ TODO-081 (S9): admin.js – sekce „Vlastní kategorie bez COICOP": seznam custom kategorií uživatelů, select 1–13 + tlačítko Přiřadit. Přiřazení uloží do Firebase /admin_coicop_overrides/{catId}.',
    ]
  },
  {
    verze: 'v6.78',
    datum: '2026-05-25',
    zmeny: [
      '🗑️ REMOVED (S9): stats.js – zrušen přerušovaný rámeček u tagů podkategorií (nahrazen COICOP kruhy které jsou přehlednější)',
      '✨ UX (S9): stats.js – text "Zobrazit/Skrýt podkategorie" zvýrazněn: color:var(--text2), font-weight:500',
      '✨ UX (S9): index.html – popisky v modalu Kategorie zvýrazněny: "(výdaj) / Min % (spoření)", "(volitelné)", "Ponech prázdné...", "% je minimum..." – vše var(--text2) místo var(--text3)',
      '📋 TODO-081 (S9): Admin rozhraní pro přiřazení COICOP čísla vlastním kategoriím uživatelů',
      '📋 TODO-082 (S9): computeCoicopAggregates() + Komunitní přehled UI (uživatel vs. ČSÚ průměr)',
    ]
  },
  {
    verze: 'v6.77',
    datum: '2026-05-25',
    zmeny: [
      '✨ NEW (S9): stats.js – tagy podkategorií v expand sekci mají přerušovaný rámeček pokud název podkategorie odpovídá názvu jiné kategorie (např. „Opravy" v Auto, „Pojištění" v Bydlení). Tooltip zobrazí „Sdíleno s kategorií: X". Symbol ⟷ za názvem.',
    ]
  },
  {
    verze: 'v6.76',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): stats.js – COICOP kruhy a shared přerušované rámečky se nezobrazovaly protože pole coicop/shared/coicopOverrides se neukládají do Firebase (jen v DEFAULT_CATEGORIES). Oprava: runtime merge z DEFAULT_CATEGORIES v renderCatPage() – bez zápisu do Firebase.',
    ]
  },
  {
    verze: 'v6.75',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): helpers.js – COICOP_GROUPS_DEF přesunuto do helpers.js (načítá se před stats.js). V v6.74 kruhy nefungovaly protože receipts.js se načítá PO stats.js.',
      '🐛 FIX (S9): stats.js – COICOP lookup přes window.COICOP_GROUPS_DEF jako fallback.',
      '✨ UX (S9): stats.js – badge Příjem/Výdaj/Oboje má barevné pozadí + emoji (💰/💸/↔️) pro lepší čitelnost',
      '✨ UX (S9): stats.js – název sekce "Podkategorie" zvýrazněn (var(--text2), font-weight:700)',
      '✨ UX (S9): stats.js – tagy podkategorií mají vyšší kontrast (opacity .18/.4, color:var(--text))',
      '🐛 FIX (S9): firebase.json – odstraněna sekce "database" (odkazovala na neexistující soubor → Error při firebase deploy --only database). deploy --only hosting funguje bez ní.',
    ]
  },
  {
    verze: 'v6.74',
    datum: '2026-05-25',
    zmeny: [
      '✨ Fáze 2 (S9): stats.js – COICOP kruh (barevné číslo 1–13) u každé kategorie v rohu ikony. Barva dle COICOP_GROUPS_DEF. Hover tooltip zobrazí název skupiny.',
      '✨ Fáze 3 (S9): stats.js – sdílené kategorie (shared flag) mají přerušovaný barevný rámeček + badge "⟷ sdílené" s tooltipem názvů překrývajících kategorií.',
      '✨ Fáze 2b (S9): stats.js – v expand sekci podkategorií se zobrazí COICOP kruh u podkategorií kde se liší COICOP od nadřazené kategorie (coicopOverrides).',
    ]
  },
  {
    verze: 'v6.73',
    datum: '2026-05-25',
    zmeny: [
      '✨ Fáze 1 (S9): categories.json – přidáno pole coicop (1–13|null) ke všem 46 kategoriím dle CZ-COICOP 2024',
      '✨ Fáze 1 (S9): categories.json – přidáno pole coicopOverrides pro podkategorie s jiným COICOP než nadřazená kategorie (např. Auto→Pojištění auta: COICOP 12, Dítě→Školka: COICOP 10)',
      '✨ Fáze 1 (S9): categories.json – přidáno pole shared (ID překrývajících kategorií) pro vizuální označení sdílených témat (Opravy↔Auto, Alkohol↔Jídlo&Pití, Pojištění↔Bydlení/Auto, Poplatky↔Banka, Cigarety↔Alkohol, Ubytování↔Dovolená, Rekonstrukce↔Opravy)',
      '✨ Fáze 1 (S9): app.js – DEFAULT_CATEGORIES synchronizován s Firebase exportem: aktuální podkategorie uživatele, nová pole coicop/shared/coicopOverrides',
      '🗑️ FIX (S9): app.js – odstraněn duplicitní starý blok DEFAULT_CATEGORIES (způsoboval SyntaxError)',
    ]
  },
  {
    verze: 'v6.72',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): stats.js – saveCat() Firebase error "value contains undefined in property stable" – pro výdajové kategorie se nyní ukládá stable:false místo undefined',
      '🐛 FIX (S9): stats.js – catSubRender() ✕ tlačítko pro odebrání podkategorie je nyní červené (#f87171) místo šedého',
      '🐛 FIX (S9): index.html – hint texty v modalu Kategorie mají lepší kontrast (var(--text2)) + ✕ v nápovědě je červeně',
      '🐛 FIX (S9): firebase.json – opravena cesta k pravidlům databáze: "database.rules.json" → "database_rules.json" (podtržítko místo tečky); přidán ignore list, Cache-Control hlavičky',
    ]
  },
  {
    verze: 'v6.71',
    datum: '2026-05-25',
    zmeny: [
      '🐛 FIX (S9): stats.js – toggleCatStable() bylo ztraceno při refaktoru v6.70 → ReferenceError + zamrznutí aplikace. Obnoveno.',
      '✨ ADR-044 (S9): stats.js – INCOME_CHAR_DEFAULT_WEIGHT: výchozí váhy stability (regular=1.0, passive=0.7, irregular=0.4, onetime=0.0, nezařazené=0.0)',
      '✨ ADR-044 (S9): stats.js – slider "Váha stability příjmu" (0–100%, krok 5%) v modalu Kategorie. Auto-výchozí z charakteru, ruční override.',
      '✨ ADR-044 (S9): projects.js – computeBaseIncome() přepsáno na vážený průměr: baseIncome = Σ(průměr_3M_kategorie × stabilityWeight). Legacy stable:true → weight 1.0. Fallback = průměr všech příjmů pokud žádná váha > 0.',
    ]
  },
  {
    verze: 'v6.70',
    datum: '2026-05-24',
    zmeny: [
      '✨ NEW (S9): stats.js + index.html – modal Kategorie: emoji picker s gridem 48 ikon + pole vlastní emoji',
      '✨ NEW (S9): stats.js – tagový editor podkategorií (přidat Enterem nebo tlačítkem, odebrat ✕ na tagu)',
      '✨ NEW (S9): stats.js – pole "Charakter příjmu" (pravidelný/nepravidelný/jednorázový/pasivní) – viditelné jen pro typ Příjem',
      '✨ NEW (S9): stats.js – pole "Charakter výdaje" (pravidelný/variabilní/nepravidelný/jednorázový/neurčeno) – viditelné jen pro typ Výdaj/Oboje',
      '🐛 FIX (S9): index.html – % a Kč vedle sebe na stejné vodorovné linii (grid align-items:end)',
      '🐛 FIX (S9): index.html – labely v modalu Kategorie mají plný kontrast (var(--text) místo var(--text3))',
      '🐛 FIX (S9): stats.js – tlačítko Stabilní/Nestabilní příjem zobrazeno správně u příjmových kategorií',
      '✨ NEW (S9): stats.js – renderCatPage() zobrazuje charakter (badge) u každé kategorie v seznamu',
    ]
  },
  {
    verze: 'v6.69',
    datum: '2026-05-24',
    zmeny: [
      '🐛 FIX (S9): stats.js – importDefaultCategories() nyní také doplňuje chybějící podkategorie u existujících kategorií (merge, ne přepis – uživatelovy vlastní podkategorie zůstanou)',
      '✨ NEW (S9): stats.js – žlutý banner zobrazuje počet chybějících kategorií i podkategorií zvlášť (např. „36 kategorií a 5 podkategorií")',
    ]
  },
  {
    verze: 'v6.68',
    datum: '2026-05-24',
    zmeny: [
      '🐛 FIX (S9): app.js – DEFAULT_CATEGORIES konstanta (46 kategorií) přesunuta jako globální proměnná, seedData() ji nyní používá místo hardcoded pole',
      '✨ NEW (S9): stats.js – importDefaultCategories() – migrační funkce: přidá chybějící výchozí kategorie do Firebase bez mazání stávajících (bezpečný merge dle cat ID)',
      '✨ NEW (S9): stats.js – renderCatPage() zobrazuje žlutý banner s počtem chybějících kategorií a tlačítkem "+ Přidat chybějící"',
    ]
  },
  {
    verze: 'v6.67',
    datum: '2026-05-24',
    zmeny: [
      '✨ TODO-012 (S9): categories.json – 46 kategorií (bylo 10): Auto, Banka, Cashback, Finanční úřad, Dar, Dítě, Domácí potřeby, Dovolená & Relax, Elektronika, Jídlo & Pití, Jiné, Letenka, Nákup, Oblečení, Opravy, Alkohol, Pojištění, Pošta, Sebevzdělání, Předplatné, Příspěvky zaměstnavatele, Půjčka, Rekonstrukce, Služby, Splátka, Telefon, Trading, Ubytování, Výběry ATM, Ztráta, Fitness & Posilovna, Poplatky, Cigarety, Domácí mazlíček, Pasivní příjem, Brigáda',
      '✨ TODO-012 (S9): stats.js – renderCatPage() přepracováno: skupiny Příjmy / Výdaje / Příjem i výdaj',
      '✨ NEW (S9): stats.js – expand/collapse podkategorií (kliknutelné zobrazení barevných tagů)',
      '✨ NEW (S9): stats.js – šipky ▲▼ pro přesun kategorie nahoru/dolů (moveCatUp/Down)',
      '✨ NEW (S9): stats.js – badge typ kategorie (příjem/výdaj/příjem i výdaj) + badge stabilní příjem',
    ]
  },
  {
    verze: 'v6.66',
    datum: '2026-05-24',
    zmeny: [
      '🐛 FIX (S9): projects.js – renderRadar() projekce konce měsíce opravena: pro uzavřený/minulý měsíc zobrazuje skutečné saldo místo chybné extrapolace (záporné daysLeft způsobovalo nesmyslné výsledky)',
      '🐛 FIX (S9): projects.js – renderRadar() předplatná opravena: dříve sčítala celou historii transakcí → nafouklá čísla. Nyní čte pouze transakce aktuálního měsíce (stejná logika jako Detektor úspor)',
      '✨ NEW (S9): projects.js – renderRadar() přidán rámeček Nadcházejících plateb (budouciGetAll 30 dní) – tento měsíc + příští měsíc',
      '✨ NEW (S9): projects.js – renderRadar() přidán cashflow sloupcový graf – posledních 12 měsíců (příjmy vs výdaje)',
      '✨ NEW (S9): projects.js – renderRadar() přidána kvartální tabulka (Q1–Q4 + YTD) za aktuální rok',
    ]
  },
  {
    verze: 'v6.65',
    datum: '2026-05-24',
    zmeny: [
      '🐛 FIX-059 v3: projects.js – Detektor úspor: odstraněna hranice 50 Kč/měs – zobrazují se i malá předplatná (Google One 39 Kč, TV poplatky apod.)',
    ]
  },
  {
    verze: 'v6.64',
    datum: '2026-05-21',
    zmeny: [
      '✨ FIX-078 (ADR-042 Option C): premium.js – computeFinancialScore() kompletní přepis na 4 NEZÁVISLÉ složky:',
      '   • S1: Cash Flow (0-25b) – expRatio s 26-bodovou lookup tabulkou (1-bodové rozestupy 0.50→1.60+)',
      '   • S2: Zadluženost (0-25b) = DTI (0-13b) + DSTI (0-12b) NEZÁVISLE – různé dluhové profily',
      '   • S3: Rezerva (0-25b) – POUZE monthsReserve = úspory/baseIncome (historická), NEZÁVISLÁ na saldu',
      '   • S4: Spoření (0-25b) – activeSavingRate = isSaving kategorií / baseIncome (aktivní chování)',
      '   • FIX: ODSTRANĚN dvojitý postih (starý systém trestal záporné saldo v S1 i S3 zároveň)',
      '✨ FIX-078: premium.js – Konzistenční bonus (+2/+5/+9/+13/+15) za nepřetržité měsíce zlepšení (cap 100)',
      '✨ FIX-078: premium.js – renderFinancialScore() zobrazuje DTI/DSTI sub-řádky + bonus za konzistenci',
    ]
  },
  {
    verze: 'v6.63',
    datum: '2026-05-21',
    zmeny: [
      '🐛 FIX-076: ui.js – renderSouhrn() totalCur/totalPrev počítány ze VŠECH výdajových transakcí (ne jen kategorizovaných). Souhrn výdajů nyní zobrazuje správné číslo (41 159 Kč) místo jen kategorizovaných (3 352 Kč).',
      '🐛 FIX-077: projects.js – renderObraz() trend kalkulace: baseline je první měsíc S DATY (ne nutně první v sérii). Listopad/prosinec s 0 transakcemi jsou přeskočeny → trend správně srovnává Leden vs Duben.',
      '📖 ADR-042 docs: premium.js – komentář dokumentující 3 hodnotící systémy (computeFinancialScore / computeHealthScores / renderObraz) a proč mohou ukazovat různé hodnoty.',
    ]
  },
  {
    verze: 'v6.62',
    datum: '2026-05-21',
    zmeny: [
      '🐛 FIX-073 (KRITICKÝ): helpers.js – getActual() opraveno: čte t.amount||t.amt||0 místo t.amt → PDF transakce bez "amt" pole nebyly ignorovány. Způsobovalo: Treemap prázdná, výdaje v dashboardu nižší než realita.',
      '🐛 FIX-073: ui.js – renderDashTreemap() přidán bucket "Ostatní ❓" pro transakce bez přiřazené kategorie.',
      '🐛 FIX-074: import.js – calcDupScore přepsán dle specifikace Milan (Datum 30/20/10b, Částka 40/20/10b, Název 20/10/5b, Typ 10b, cap 70 bez shody názvu, skip >10d).',
      '🐛 FIX-074: import.js – 4 úrovně duplikátů: 🟢 <40 / 🟡 ≥40 / 🟠 ≥60 / 🔴 ≥80. Přidán oranžový filtr do Import Editor modalu.',
      '✨ FIX-075: index.html – Sentry release dynamicky z title tagu (vždy aktuální verze).',
      '✨ FIX-075: firebase.js – Sentry user identification po přihlášení (setUser uid+email) + clearování při odhlášení.',
    ]
  },
  {
    verze: 'v6.61',
    datum: '2026-05-21',
    zmeny: [
      '🐛 FIX-069: worker.js – PDF prompt přidává executionDate (datum provedení) jako primární datum, isBalancing flag pro Vyrovnávací úhrady',
      '🐛 FIX-069: import.js – PDF import používá executionDate jako primární datum, isBalancing transakce evidovány bez dopadu na příjmy/výdaje',
      '🐛 FIX-069: import.js – showImportPreview zobrazuje počet vyrovnávacích transakcí v info banneru, stats karty je nezapočítávají',
      '🐛 FIX-069: helpers.js – incSum/expSum přeskakují isBalancing transakce',
      '🐛 FIX-070: import.js – calcDupScore přepsán: zpřísněn (yellow threshold 25→60, red 75→85), cap 55 bez shody názvu, skip při datumu >7 dní',
      '🐛 FIX-071: ui.js – renderBarChart NaN guard: maxV filtruje NaN hodnoty, bar výšky mají fallback 0',
      '🐛 FIX-072: ui.js – bCluster SVG přepracován: POS souřadnice s 60px padding zabraňující přetékání satelitních bublin',
    ]
  },
  {
    verze: 'v6.60',
    datum: '2026-05-21',
    zmeny: [
      '🐛 FIX-068 (KRITICKÝ): index.html – chyběl modal #modalImportEditor (editor duplikátů). Způsoboval crash TypeError: document.getElementById(...) is null.',
      '🐛 FIX-068b: import.js – openImportEditor() otevírá modal PŘED voláním renderImportEditor() + null check s user-friendly chybovou hláškou. Sentry issue 4da89597 vyřešeno.',
      '🐛 FIX-067: worker.js – systémový prompt pro bank_statement_text rozšířen o pravidla pro KB EUR transakce (Vyrovnávací úhrada = 3 záznamy pro 1 EUR platbu). 72/72 transakcí.',
    ]
  },
  {
    verze: 'v6.59',
    datum: '2026-05-19',
    zmeny: [
      '🐛 FIX-059 v2 (TODO-074): projects.js – DEBUG log do konzole pro Detektor úspor (pomáhá ověřit zda kód vidí správné transakce)',
      '🐛 FIX-060: ui.js – renderBarChart() zobrazuje LEDEN–PROSINEC aktuálního roku (ne rolling 12 měsíců)',
      '🐛 FIX-060: worker.js – chat max_tokens 8192 → 2048 (chat je krátký, šetří tokeny)',
      '🐛 FIX-061: receipts.js – 60s timeout pro Worker (AbortController) v analyzeReceipt + analyzeMultiReceipt',
      '🐛 FIX-061: import.js – rozšířený debug log pro PDF (stop_reason, usage, prvních+posledních 800 znaků odpovědi) – pomáhá najít proč chybí 2 transakce z 72',
      '🐛 FIX-062: import.js – confirmImport má anti-double-click flag _importInProgress + disabling tlačítek (500ms cooldown)',
      '🐛 FIX-063: app.js – beforeunload handler vyflushne save() debounce přes navigator.sendBeacon (data se neztratí při zavření tabu)',
      '🐛 FIX-063: app.js + firebase.js – refreshIdTokenCache() cache idToken pro sendBeacon (sync API)',
      '🐛 FIX-064: admin.js – adminViewUserAs() použije switchToPartner() pro správné aktualizace sidebaru a viewingUid',
      '✨ FIX-065 (TODO-022 částečně): donate.js – Premium subscription Payment Links (monthly/yearly) + Stripe Customer Portal pro zrušení',
      '🐛 FIX-066: projects.js – Detektor úspor přepracovaný layout karty:',
      '   • Aktuální měsíční částka (1 210 Kč/měs) = HLAVNÍ ČÍSLO velkým ČERVENÝM písmem (utrácíš tolik)',
      '   • Úspora přesunuta pod nadpis jako sekundární info menším písmem',
      '   • Kategorie (Předplatné, Pojištění, Bankovní…) má barevný pill badge + levý okraj karty',
      '   • Barvy: Předplatné=fialová, Pojištění=modrá, Bankovní=žlutá, Telefon=zelená, Refinancování=červená',
      '⚠️ Stripe Subscription Payment Links nutno vytvořit v Stripe Dashboard (návod ve stripe-setup-guide.md – update přijde),',
    ]
  },
  {
    verze: 'v6.58',
    datum: '2026-05-19',
    zmeny: [
      '🐛 FIX-059 (TODO-074): projects.js – Detektor úspor přepracován od základu',
      '🐛 FIX-059: Před fixem sčítal transakce za 3 měsíce ale labeloval "Kč/měs" → 3× nadhodnocení částek',
      '🐛 FIX-059: Před fixem 1 transakce dostala 2 záznamy kvůli překrývajícím se klíčovým slovům (patreon + membership)',
      '🐛 FIX-059: Nová logika: pouze AKTUÁLNÍ MĚSÍC, 1 transakce = 1 nález, žádné slučování',
      '🐛 FIX-059: Per-transaction matching – každá tx má MAX 1 klíčové slovo (nejdelší match wins)',
      '🐛 FIX-059: Label obsahuje datum + podkategorii + tagy pro rozlišení (např. 3× Patreon Membership s různými cenami = 3 separátní záznamy)',
      '🐛 FIX-059: Odstraněna příliš široká klíčová slova: membership, členství, předplatné, google (falešné nálezy)',
      '🐛 FIX-059: Skip transakcí < 50 Kč/měs (nezajímavé pro úsporu)',
      '🐛 FIX-059: Úspora snížena z 40 % na 25 % (realističtější odhad)',
    ]
  },
  {
    verze: 'v6.57',
    datum: '2026-05-19',
    zmeny: [
      '✨ TODO-023: admin.js – Správa členství v Admin panelu (seznam uživatelů s vyhledáváním, filtrem a řazením)',
      '✨ TODO-023: admin.js – Detail uživatele v modálu (avatar, email, status předplatného, datum registrace, statistiky transakcí, referral kód)',
      '✨ TODO-023: admin.js – Manuální správa: +30/+365 dní Premium, +30/+90 dní Trial, zrušení předplatného (set Free)',
      '✨ TODO-023: admin.js – Audit log: ukládá manuallySetBy/manuallySetAt/revokedBy/revokedAt do Firebase (kdo a kdy udělal změnu)',
      '✨ TODO-023: admin.js – Affiliate propojení v detailu (kód, kliky, konverze)',
      '✨ TODO-023: admin.js – "Zobrazit jako" funkce (read-only přepnutí pohledu) přes window.viewingUid',
      '⚠️ Požadavek na Firebase Rules: admin UID musí mít čtecí přístup na /users (kořen)',
    ]
  },
  {
    verze: 'v6.56',
    datum: '2026-05-19',
    zmeny: [
      '🐛 FIX-058 (TODO-021): receipts.js – nová compressReceiptImageDual() vrací Blob i base64 z téhož canvas pass (jeden render, dvě výstupní formy)',
      '🐛 FIX-058: receipts.js – addReceiptPhoto() vždy předkomprimuje (online i offline), ukládá do _receiptQueue i Blob (kromě base64) pro multi-receipt offline cestu',
      '🐛 FIX-058: receipts.js – analyzeMultiReceipt() offline větev používá Blob z queue přímo (žádný atob/Uint8Array loop), legacy base64→Blob fallback pro robustnost',
      '🐛 FIX-058: offline-sync.js – compressPhoto() detekuje předkomprimovaný Blob (image/jpeg, ≤500 KB) a přeskočí znovukompresi – ušetří CPU + zabrání degradaci JPEG kvality (důležité pro Claude OCR čitelnost)',
    ]
  },
  {
    verze: 'v6.55',
    datum: '2026-05-19',
    zmeny: [
      '🐛 FIX-057 (TODO-070-offline): offline-sync.js – syncOneReceipt() volal neexistující endpoint /analyze-receipt na špatné doméně (financeflow.bcmilda.workers.dev). Přepsáno na WORKER_URL (misty-limit-0523) + správný payload {type:"receipt", payload:{imageData, mediaType}}',
      '🐛 FIX-057: offline-sync.js – syncOneReceipt() po analýze nyní volá addReceiptAsTx() z receipts.js (založí transakci, kategorizuje, push do Firebase). Před tím se výsledek ztratil v neexistující onReceiptAnalyzed()',
      '🐛 FIX-057: offline-sync.js – syncOneTx() přepsáno na S.transactions.push() + save() (původní saveTxToFirebase neexistovalo)',
      '🐛 FIX-057: offline-sync.js – waitForFirebaseAuth() čeká až 10s na Firebase token po reconnect (sync se nepokouší volat Worker bez auth)',
      '🐛 FIX-057: offline-sync.js – runSync() přeskočí v _isLocalMode (bez Firebase loginu sync neumíme)',
      '🐛 FIX-057: offline-sync.js – lepší toasty (počet OK/chyb), console.error log pro debugging',
      '🐛 FIX-057: receipts.js – addReceiptAsTx() vrací savePromise pro await v offline-sync.js',
    ]
  },
  {
    verze: 'v6.54',
    datum: '2026-05-19',
    zmeny: [
      '💛 TODO-073: Donate funkce – Stripe Payment Link integrace (žádný backend kód)',
      '💛 index.html: Modal #modalDonate s 6 přednastavenými částkami (50/100/200/500/1000/custom)',
      '💛 index.html: Tlačítko "Podpořit projekt" v sekci O aplikaci (mezi Premium a Privacy)',
      '💛 donate.js: Nový soubor s openDonateModal(), selectDonateAmt(), startDonate() + auto detekcí test/live prostředí',
      '⚠️ DONATE_PAYMENT_LINK_TEST a DONATE_PAYMENT_LINK_LIVE v donate.js nutno doplnit z Stripe Dashboard (viz docstring v souboru)',
    ]
  },
  {
    verze: 'v6.53',
    datum: '2026-05-19',
    zmeny: [
      '🐛 FIX-056: helpers.js – genTxId() nová utility funkce (Date.now()*16 + random 0-15) pro kolizi-odolné numerické ID transakcí',
      '🐛 FIX-056: import.js, debts.js, receipts.js, sms-import.js, admin.js – nahrazeno Date.now()/Date.now()+offset za genTxId() ve všech místech generování ID transakcí',
    ]
  },
  {
    verze: 'v6.52',
    datum: '2026-05-19',
    zmeny: [
      '🐛 FIX-054 (TODO-005): worker.js – max_tokens 8192→16384 pro bank_statement_text + bank_statement (PDF import nesmí ořezat poslední transakce)',
      '🐛 FIX-054: import.js – detekce stop_reason=max_tokens + repairTruncatedTxJson() pro záchranu transakcí z oříznutého JSON',
      '🐛 FIX-055 (TODO-005): import.js – calcDupScore() optimalizován (pre-cached _ts/_nameLow/_words, early-skip ±14 dní, break při score>=90)',
      '🐛 FIX-055: import.js – openImportEditor je asynchronní, chunking po 25 transakcích s yield mezi nimi (UI nezamrzne při velkém DB)',
      '🐛 FIX-055: import.js – loading indikátor při scoringu pro velké DB (>500 existujících transakcí)',
      '🐛 FIX-055: import.js – buildExistingIndex() pre-cachuje timestampy a tokenizaci názvů (řeší freeze při Potvrdit a otevřít Editor)',
    ]
  },
  {
    verze: 'v6.51',
    datum: '2026-05-19',
    zmeny: [
      '✅ index.html: Dashboard – Treemap přesunuta do horní karty (místo bubble chart)',
      '✅ index.html: Dashboard – Bubble chart přesunut do samostatné karty pod Treemap (více prostoru)',
      '✅ ui.js: renderDashTreemap() – nová kompaktní Treemap pro horní dashboard kartu',
      '✅ ui.js: renderBarChart() – rozšíření z 6 na 12 měsíců, Y grid, legenda, lepší layout',
      '✅ ui.js: bCluster() – zvětšení SVG výšky z 280 na 320px (bubliny nepřesahují)',
      '✅ index.html: Příjmy vs Výdaje – přejmenováno na 12 měsíců',
    ]
  },
  {
    verze: 'v6.50',
    datum: '2026-04-29',
    zmeny: [
      '✅ ui.js: TODO-060 – Bubble chart: 4 varianty (Cluster / Drill-down L1→L2→L3 / Gradient / Treemap)',
      '✅ ui.js: TODO-060 – Cluster: satelity se dotýkají kategorie, šedá tečka = sdílená',
      '✅ ui.js: TODO-060 – Drill: klik na kategorii → podkategorie, 🔗 sdílená → překryv',
      '✅ ui.js: TODO-060 – Gradient: sdílené podkat. jako linearGradient uzel mezi kategoriemi',
      '✅ ui.js: TODO-060 – Treemap: HTML grid, text vlevo dole, Syne font, hover efekt',
      '✅ ui.js: TODO-058 – renderBudouci() v page routeru',
      '✅ index.html: bubbleChartWrap nahrazuje donutCanvas + donutLegend',
      '🐛 TODO-064: Bank – kumulativní zůstatek NaN/0 při prázdném měsíci (k opravě)',
      '🐛 TODO-065: Měsíční report – grafy trendu 3M/6M/12M se nezobrazují (k opravě)',
    ]
  },
  {
    verze: 'v6.49',
    datum: '2026-04-27',
    zmeny: [
      '✅ nakup.js: TODO-056 – Plány a cíle: záložky + progress bar + deadline + motivační stav',
      '✅ nakup.js: TODO-056 – Virtuální peněženka: vklady do cílů v Firebase goal_deposits/{id}',
      '✅ premium.js: TODO-056 – onPenezenkyRender() hook pro virtuální peněženku',
      '✅ projects.js: TODO-057 – Měsíční report záložky 7D / 1M / 3M / 6M / 12M',
      '✅ helpers.js: TODO-057 – getTxByRange() + getMonthsInRange()',
      '✅ budouci.js: TODO-058 – Budoucí platby ze šablon + narozenin + cílů + dluhů',
      '✅ app.js: TODO-058 – budouci přidáno do PAGE_TITLES',
      '✅ index.html: TODO-056/058 – modály cílů, virtualWalletSection, page-budouci, nav',
    ]
  },
  {
    verze: 'v6.48',
    datum: '2026-04-23',
    zmeny: [
      '✅ index.html: Sentry.io monitoring chyb integrován – async loader před </body>, neblokuje načítání, DSN nastaven',
      '✅ index.html: Opravena verze v sekci O aplikaci (byla 6.35, nyní 6.48)',
      '🐛 app.js: Opraveno Sentry.setUser() – volání odloženo na setTimeout 3s (Sentry je async loader)',
      '🐛 app.js: Přidána offline větev do save() – při !navigator.onLine uloží transakci do IndexedDB fronty (TODO-002)',
      '✅ premium.js: Opraven sendContactForm() – přidán Authorization: Bearer token header pro Worker',
      '✅ premium.js: Opravena struktura payloadu – Worker čeká {type, payload:{...}}',
      '✅ cloudflare-worker/worker.js: Worker v5 nasazen – lepší Resend error logging, RESEND_API_KEY z env',
      '✅ doc/todo.md: Aktualizováno – TODO-001/002/003/004/007 označeny hotovo/nasazeno',
      '✅ doc/bugs.md: Aktualizováno – FIX-046 až FIX-050 přidány, TL;DR aktualizován',
    ]
  },
  {
    verze: 'v6.47',
    datum: '2026-04-21',
    zmeny: [
      '🐛 helpers.js: Přidána chybějící funkce computeYearForecast() – opravena sekce Predikce (tabulka se nezobrazovala)',
      '🐛 settings.js: Odstraněn nebezpečný rekurzivní override applySettings() – opravena chyba „too much recursion“',
      '✅ index.html: Aktualizována verze na v6.47, cache-busting hashe pro helpers.js a settings.js',
    ]
  },
  {
    verze: 'v6.46',
    datum: '2026-04-19',
    zmeny: [
      '✅ Admin panel → Verze: Záznamy doplněny o cestu sekce (kde k opravě došlo)',
      '✅ Dokumentace: Vytvořeny docs/bugs.md a docs/todo.md',
      '✅ Repozitář: Playwright soubory přesunuty do složky Playwrite/',
      '✅ Cloudflare Worker: Přidán worker.js do repozitáře (cloudflare-worker/worker.js), bcmilda.github.io přidán do CORS, Resend key přesunut do env proměnné',
      '✅ CLAUDE.md: Vytvořen kontext soubor pro Claude Code sessions',
      '✅ CI/CD: Přidán GitHub Actions workflow pro automatický preview deploy na push do dev větve',
    ]
  },
  {
    verze: 'v6.45',
    datum: '2026-04-13',
    zmeny: [
      '🐛 Grafy → Obecné / Měsíční: Opraven infinite loop v initGrafFilters() – funkce byla volána před svou definicí (hoisting problem)',
      '🐛 Grafy → Měsíční: Přidána chybějící funkce renderKumulChart() – kumulativní graf se nevykresloval',
      '🐛 Grafy → Všechny roky: Opraven HTML layout – blok gtab-vsechny-content byl chybně vnořen uvnitř gtab-rocni-content',
      '🐛 Grafy → Obecné: Odstraněna nefunkční karta Box plot (canvas ID boxplotChart neexistoval v HTML)',
      '✅ Nastavení: Vytvořen soubor .env pro bezpečné uložení API klíče Resend',
      '✅ Admin panel → Verze: Přidána záložka s historií verzí a changelogem',
    ]
  }
];

function loadVerze() {
  const el = document.getElementById('adminVerzeList'); if(!el) return;
  if(!VERZE_LOG.length) {
    el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">Žádné záznamy</div></div></div>';
    return;
  }
  el.innerHTML = VERZE_LOG.map(v => `
    <div style="border-bottom:1px solid var(--border);padding:14px 16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:1rem;font-weight:800;color:var(--accent)">${v.verze}</span>
        <span style="font-size:.74rem;color:var(--text3)">${v.datum}</span>
      </div>
      <ul style="margin:0;padding-left:18px;list-style:none">
        ${v.zmeny.map(z => `<li style="font-size:.82rem;color:var(--text2);margin-bottom:5px;padding-left:2px">${z}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

async function loadUserStats() {
  const el = document.getElementById('adminUserStats'); if(!el) return;
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    const auth = '?auth='+idToken;
    // Načti všechny uživatele (jen premium node – lehčí)
    const res = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?shallow=true'+( idToken?'&auth='+idToken:''));
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const uids = data ? Object.keys(data) : [];
    const totalUsers = uids.length;

    // Načti premium statusy – bez orderBy (způsobuje HTTP 400 bez Firebase index)
    const premRes = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?auth='+(idToken||''));
    let trialCount=0, premiumCount=0, freeCount=0;
    try {
      const premData = await premRes.json();
      if(premData) {
        Object.values(premData).forEach(u => {
          const t = u?.premium?.type;
          if(t==='premium') premiumCount++;
          else if(t==='trial') trialCount++;
          else freeCount++;
        });
      }
    } catch(e) {}

    const today = new Date().toISOString().slice(0,10);
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:4px">
        <div class="stat-card income"><div class="stat-label">Celkem uživatelů</div><div class="stat-value up">${totalUsers}</div></div>
        <div class="stat-card bank"><div class="stat-label">Premium</div><div class="stat-value bankc">${premiumCount}</div><div class="stat-sub" style="font-size:.68rem">placení</div></div>
        <div class="stat-card balance"><div class="stat-label">Trial (zdarma)</div><div class="stat-value">${trialCount}</div><div class="stat-sub" style="font-size:.68rem">zkušební</div></div>
        <div class="stat-card expense"><div class="stat-label">Free</div><div class="stat-value down">${freeCount}</div><div class="stat-sub" style="font-size:.68rem">bez předplatného</div></div>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div style="padding:10px;font-size:.78rem;color:var(--text3)">
      ⚠️ Nelze načíst – přidejte do Firebase rules: "users": {".read": "auth != null"}
    </div>`;
  }
}

async function loadAffiliateStats() {
  const el = document.getElementById('adminAffiliateStats'); if(!el) return;
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    const res = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/affiliate.json'+(idToken?'?auth='+idToken:''));
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!data) {
      el.innerHTML = `<div style="padding:10px;font-size:.78rem;color:var(--text3)">
        Žádné affiliate záznamy zatím. Sdílejte odkaz ve formátu:<br>
        <strong style="color:var(--bank)">bcmilda.github.io/financeflow?ref=JMENO</strong>
      </div>`;
      return;
    }
    // Agreguj podle ref
    const refs = {};
    Object.values(data).forEach(r => {
      const ref = r.ref || 'přímý';
      if(!refs[ref]) refs[ref] = {visits:0, registrations:0};
      if(r.type==='visit') refs[ref].visits++;
      if(r.type==='register') refs[ref].registrations++;
    });
    el.innerHTML = `<div style="padding:4px">` +
      Object.entries(refs).sort((a,b)=>b[1].registrations-a[1].registrations).map(([ref,stats])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:6px">
          <div>
            <div style="font-weight:600;font-size:.85rem">🔗 ?ref=${ref}</div>
            <div style="font-size:.72rem;color:var(--text3)">Odkaz: bcmilda.github.io/financeflow?ref=${ref}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.78rem;color:var(--income);font-weight:700">${stats.registrations} registrací</div>
            <div style="font-size:.7rem;color:var(--text3)">${stats.visits} návštěv</div>
          </div>
        </div>`).join('')
      + '</div>';
  } catch(e) {
    el.innerHTML = `<div style="padding:10px;font-size:.78rem;color:var(--text3)">
      Žádné affiliate záznamy. Sdílejte: <strong style="color:var(--bank)">?ref=JMENO</strong>
    </div>`;
  }
}

let _cachedLeads = [];

// ══════════════════════════════════════════════════════
//  TODO-023 · ADMIN – SPRÁVA ČLENSTVÍ
// ══════════════════════════════════════════════════════
let _cachedUsers = []; // {uid, displayName, email, photoURL, premium, referral, createdAt, transactionsCount, lastActivity}

// ══════════════════════════════════════════════════════
//  METRIKY AKTIVITY (TODO-213, v9.85)
//  Počítá se ze značek aktivních dnů (activity.d) – žádné další ukládání.
// ══════════════════════════════════════════════════════
function adminActivityStats(act) {
  const out = { has: false, last: 0, visits: 0, days30: 0, days90: 0, daysTotal: 0,
                streak: 0, ver: '', pwa: false, activation: null, firstSeen: 0 };
  if (!act) return out;
  out.has = true;
  out.last = act.last || 0;
  out.visits = act.visits || 0;
  out.ver = act.ver || '';
  out.pwa = !!act.pwa;
  out.firstSeen = act.firstSeen || 0;
  if (act.firstTx && act.firstSeen) {
    out.activation = Math.max(0, Math.round((act.firstTx - act.firstSeen) / 86400000));
  }
  // Tvar klíče nestačí – '2026-13-99' projde regulárním výrazem, ale datum to není.
  const validDay = k => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    const [y, m, d] = k.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const x = new Date(y, m - 1, d);
    return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
  };
  const keys = Object.keys(act.d || {}).filter(validDay).sort();
  out.daysTotal = keys.length;
  if (!keys.length) return out;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayOf = k => { const [y, m, d] = k.split('-').map(Number); const x = new Date(y, m - 1, d); x.setHours(0, 0, 0, 0); return x; };
  const ago = k => Math.round((today - dayOf(k)) / 86400000);
  out.days30 = keys.filter(k => ago(k) < 30).length;
  out.days90 = keys.filter(k => ago(k) < 90).length;
  // Aktuální série: nepřerušená řada dnů zpět od dneška (nebo od včerejška)
  const set = new Set(keys);
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  let cur = new Date(today);
  if (!set.has(iso(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (set.has(iso(cur)) && n < 3650) { n++; cur.setDate(cur.getDate() - 1); }
  out.streak = n;
  return out;
}

// Skóre aktivity 0–100.
//  S19 (Milan): objem se nově měří ZA POSLEDNÍCH 30 DNÍ, ne za celou historii –
//  50 transakcí od registrace je u dlouhodobého uživatele bezvýznamné číslo.
//  Bez evidence aktivity (účty před v9.85) nelze počítat ani objem za 30 dní,
//  ani čerstvost → vrací se null a UI místo skóre napíše proč.
function adminActivityScore(u) {
  const st = adminActivityStats(u.activity);
  if (!st.has) return { score: null, st };
  // Objem (0–60): aktivní dny za 30 dní. 20+ dní z 30 = plný počet.
  const volScore = Math.min(60, Math.round(st.days30 / 20 * 60));
  // Čerstvost (0–40): dnes 40, 30+ dní 0
  const days = st.last ? Math.floor((Date.now() - st.last) / 86400000) : 999;
  const freshScore = days <= 1 ? 40 : days >= 30 ? 0 : Math.round((1 - days / 30) * 40);
  return { score: Math.max(0, Math.min(100, volScore + freshScore)), st, volScore, freshScore, days };
}

async function loadUsersList() {
  const el = document.getElementById('adminUsersList');
  if (!el) return;
  if (!isAdmin()) {
    el.innerHTML = '<div class="empty"><div class="et">🔐 Přístup odepřen</div></div>';
    return;
  }
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám uživatele…</div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    // S16.5 (AUDIT P0-3, ADR-061): už NESTAHUJEME celé users.json (u tisíců uživatelů
    // = celá DB vč. všech transakcí). Shallow seznam UID → per-uid jen malé uzly
    // (profile/premium/referral/aiUsage) + POČET transakcí přes shallow (vrátí jen klíče).
    // lastActivity je nyní odhad z premium.createdAt – přesná poslední aktivita přijde
    // s agregačním indexem (ADR-061 krok 2 / ADR-062 diff-write).
    // Pozn.: ~1000+ uživatelů → zvážit adminIndex (5 requestů/uživatele je strop tohoto přístupu).
    const base = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';
    const auth = idToken ? '&auth=' + idToken : '';
    const sh = await fetch(`${base}/users.json?shallow=true${auth}`);
    if (!sh.ok) throw new Error('HTTP ' + sh.status);
    const uids = Object.keys((await sh.json()) || {});
    if (!uids.length) {
      el.innerHTML = '<div class="empty"><div class="et">Žádní uživatelé</div></div>';
      return;
    }
    const fj = async (path) => { try { const r = await fetch(`${base}/${path}.json?auth=${idToken}`); return r.ok ? await r.json() : null; } catch (e) { return null; } };
    const fCount = async (path) => { try { const r = await fetch(`${base}/${path}.json?shallow=true&auth=${idToken}`); const j = r.ok ? await r.json() : null; return j ? Object.keys(j).length : 0; } catch (e) { return 0; } };
    // S19 (TODO-218, Milan: „kolik zákazníků daný uživatel přivedl?"):
    //   users/{uid}/referral/conversions je jen ZRCADLO, které si vlastník kódu
    //   naplní až při svém dalším přihlášení (bezpečnostní pravidla mu nedovolí
    //   zapsat body do cizího účtu – viz FIX ze Session 14). Skutečný zdroj pravdy
    //   je referrals/{kod}/conversions/{uid}. Admin proto stahuje CELÝ uzel
    //   referrals JEDNOU (je malý, jeden záznam na kód) a postaví si mapu –
    //   místo N dotazů navíc jeden jediný.
    let _refLedger = {};
    try {
      const rl = await fetch(`${base}/referrals.json?auth=${idToken}`);
      if (rl.ok) _refLedger = (await rl.json()) || {};
    } catch (e) { _refLedger = {}; }
    const _refStats = (code) => {
      const node = code ? _refLedger[code] : null;
      if (!node) return { real: 0, pending: 0, uids: [] };
      const c = node.conversions;
      if (c == null) return { real: 0, pending: 0, uids: [] };
      if (typeof c === 'number') return { real: c, pending: 0, uids: [] };   // starý tvar
      const uids = Object.keys(c);
      return { real: uids.length, pending: uids.filter(u => !c[u] || !c[u].claimed).length, uids };
    };

    const out = [];
    let idx = 0;
    async function pool() {
      while (idx < uids.length) {
        const uid = uids[idx++];
        const [prof, p, ref, ai, txCount, act] = await Promise.all([
          fj(`users/${uid}/profile`), fj(`users/${uid}/premium`),
          fj(`users/${uid}/referral`), fj(`users/${uid}/aiUsage`),
          fCount(`users/${uid}/data/transactions`),
          fj(`users/${uid}/activity`),   // v9.85 (TODO-213)
        ]);
        const pp = p || {};
        out.push({
          uid,
          displayName: prof?.displayName || '',
          email: prof?.email || '',
          photoURL: prof?.photoURL || '',
          premium: {
            type: pp.type || 'free',
            trialUntil: pp.trialUntil || 0,
            premiumUntil: pp.premiumUntil || 0,
            createdAt: pp.createdAt || 0,
            extended: pp.extended || false,
          },
          referral: (() => {
            const st = _refStats(ref?.code || '');
            return {
              code: ref?.code || '',
              clicks: ref?.clicks || 0,
              conversions: st.real,                    // skutečnost z ledgeru
              mirrored: ref?.conversions || 0,         // co si uživatel stihl načíst
              pending: st.pending,                     // registrace čekající na připsání
              earned: ref?.earned || 0,
              broughtUids: st.uids,
            };
          })(),
          transactionsCount: txCount,
          activity: act || null,   // v9.85 (TODO-213)
          // Skutečná poslední aktivita; u účtů z doby před v9.85 stále fallback na registraci
          lastActivity: (act && act.last) || pp.createdAt || 0,
          lastActivityIsReal: !!(act && act.last),
          aiUsage: ai || {},
          isAdmin: ADMIN_UIDS.includes(uid),
        });
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, uids.length) }, pool));
    _cachedUsers = out;
    filterUsersList();
  } catch (e) {
    console.error('[Admin] loadUsersList error:', e);
    el.innerHTML = `<div style="padding:10px;font-size:.78rem;color:var(--text3)">
      ⚠️ Nelze načíst seznam uživatelů.<br>
      Chyba: ${e.message}<br>
      <span style="font-size:.7rem">Ujisti se, že Firebase Rules povolují admin UID číst <code>/users</code>.</span>
    </div>`;
  }
}

function filterUsersList() {
  const el = document.getElementById('adminUsersList');
  if (!el || !_cachedUsers.length) return;

  const q = (document.getElementById('userSearchInput')?.value || '').toLowerCase().trim();
  const filt = document.getElementById('userFilterType')?.value || 'all';
  const sort = document.getElementById('userSortBy')?.value || 'createdAt-desc';
  const now = Date.now();

  let list = _cachedUsers.filter(u => {
    // Search
    if (q) {
      const hit = (u.displayName || '').toLowerCase().includes(q) ||
                  (u.email || '').toLowerCase().includes(q) ||
                  u.uid.toLowerCase().includes(q);
      if (!hit) return false;
    }
    // Filter podle typu
    if (filt === 'admin') return u.isAdmin;
    if (filt === 'premium') return u.premium.type === 'premium' && u.premium.premiumUntil > now;
    if (filt === 'trial') return u.premium.type === 'trial' && u.premium.trialUntil > now;
    if (filt === 'free') return u.premium.type === 'free';
    if (filt === 'expired') {
      return (u.premium.type === 'premium' && u.premium.premiumUntil > 0 && u.premium.premiumUntil <= now) ||
             (u.premium.type === 'trial' && u.premium.trialUntil > 0 && u.premium.trialUntil <= now);
    }
    // v9.85 (TODO-213): filtry podle skutečné aktivity
    if (filt === 'active30')  return adminActivityStats(u.activity).days30 >= 5;
    if (filt === 'dormant')   { const a = adminActivityStats(u.activity);
                                return a.has && a.days30 === 0; }
    if (filt === 'noactivity') return !adminActivityStats(u.activity).has;
    return true;
  });

  // Sort
  list.sort((a, b) => {
    if (sort === 'createdAt-desc') return (b.premium.createdAt || 0) - (a.premium.createdAt || 0);
    if (sort === 'createdAt-asc')  return (a.premium.createdAt || 0) - (b.premium.createdAt || 0);
    if (sort === 'name-asc')       return (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid);
    if (sort === 'brought-desc') return (b.referral?.conversions||0) - (a.referral?.conversions||0);
    if (sort === 'lastact-desc') return adminActivityStats(b.activity).last - adminActivityStats(a.activity).last;
    if (sort === 'days30-desc')  return adminActivityStats(b.activity).days30 - adminActivityStats(a.activity).days30;
    if (sort === 'until-asc') {
      const ua = a.premium.type === 'premium' ? a.premium.premiumUntil : a.premium.trialUntil;
      const ub = b.premium.type === 'premium' ? b.premium.premiumUntil : b.premium.trialUntil;
      return (ua || Infinity) - (ub || Infinity);
    }
    return 0;
  });

  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:14px"><div class="ei">🔍</div><div class="et">Žádné výsledky pro tento filtr</div><div style="font-size:.7rem;color:var(--text3);margin-top:6px">Celkem v DB: ${_cachedUsers.length} uživatelů</div></div>`;
    return;
  }

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('cs-CZ') : '—';
  const fmtRel = (ts) => {
    if (!ts) return '—';
    const d = Math.floor((now - ts) / (24*60*60*1000));
    if (d < 0) return `za ${-d} d`;
    if (d === 0) return 'dnes';
    if (d === 1) return 'včera';
    if (d < 30) return `${d} d`;
    if (d < 365) return `${Math.floor(d/30)} m`;
    return `${Math.floor(d/365)} r`;
  };
  const badge = (u) => {
    if (u.isAdmin) return '<span style="background:#a855f7;color:#fff;padding:2px 7px;border-radius:6px;font-size:.65rem;font-weight:700">ADMIN</span>';
    const p = u.premium;
    if (p.type === 'premium') {
      if (p.premiumUntil > now) return '<span style="background:var(--income);color:#fff;padding:2px 7px;border-radius:6px;font-size:.65rem;font-weight:700">PREMIUM</span>';
      return '<span style="background:var(--expense);color:#fff;padding:2px 7px;border-radius:6px;font-size:.65rem;font-weight:700">EXPIRED</span>';
    }
    if (p.type === 'trial') {
      const left = Math.max(0, Math.ceil((p.trialUntil - now)/(24*60*60*1000)));
      if (left > 0) return `<span style="background:var(--bank);color:#fff;padding:2px 7px;border-radius:6px;font-size:.65rem;font-weight:700">TRIAL · ${left}d</span>`;
      return '<span style="background:var(--text3);color:#fff;padding:2px 7px;border-radius:6px;font-size:.65rem;font-weight:700">TRIAL EXP.</span>';
    }
    return '<span style="background:var(--text3);color:#fff;padding:2px 7px;border-radius:6px;font-size:.65rem;font-weight:700">FREE</span>';
  };

  el.innerHTML = `
    <div style="font-size:.72rem;color:var(--text3);margin-bottom:8px;padding:0 2px">
      Zobrazuji <strong>${list.length}</strong> z <strong>${_cachedUsers.length}</strong> uživatelů
    </div>
    <div style="max-height:560px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
      ${list.map(u => {
        const ava = u.photoURL ? `<img src="${u.photoURL}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">` : `<div style="width:32px;height:32px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:.85rem">${(u.displayName||u.email||'?').charAt(0).toUpperCase()}</div>`;
        return `
        <div onclick="openUserDetail('${u.uid}')" style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);cursor:pointer;transition:background .15s,border-color .15s" onmouseover="this.style.background='var(--surface3,#1a1f2e)';this.style.borderColor='var(--bank)'" onmouseout="this.style.background='var(--surface2)';this.style.borderColor='var(--border)'">
          ${ava}
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <div style="font-weight:600;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${u.displayName || u.email || '<i style="color:var(--text3)">Bez jména</i>'}</div>
              ${badge(u)}
            </div>
            <div style="font-size:.7rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.email || u.uid}</div>
            <div style="font-size:.65rem;color:#a8aec8;margin-top:2px">
              📅 Reg: ${fmtDate(u.premium.createdAt)} · 💸 ${u.transactionsCount} tx · ⏰ ${fmtRel(u.lastActivity)}
              ${u.referral.code ? ` · 🔗 <span style="color:var(--bank)">${u.referral.conversions}</span>` : ''}
            </div>
          </div>
          <span style="color:var(--text3)">›</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

function openUserDetail(uid) {
  const u = _cachedUsers.find(x => x.uid === uid);
  if (!u) return;
  const now = Date.now();
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('cs-CZ') + ' ' + new Date(ts).toLocaleTimeString('cs-CZ', {hour:'2-digit',minute:'2-digit'}) : '—';

  const trialActive = u.premium.type === 'trial' && u.premium.trialUntil > now;
  const trialLeft = trialActive ? Math.ceil((u.premium.trialUntil - now)/(24*60*60*1000)) : 0;
  const premiumActive = u.premium.type === 'premium' && u.premium.premiumUntil > now;
  const premiumLeft = premiumActive ? Math.ceil((u.premium.premiumUntil - now)/(24*60*60*1000)) : 0;

  const html = `
    <div class="modal" style="max-width:520px">
      <div class="modal-head">
        <h3>👤 Detail uživatele</h3>
        <button class="btn btn-ghost btn-icon" onclick="closeModal('modalUserDetail')">✕</button>
      </div>
      <div class="modal-body" style="max-height:80vh;overflow-y:auto">
        <!-- Hlavička -->
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
          ${u.photoURL ? `<img src="${u.photoURL}" style="width:56px;height:56px;border-radius:50%;object-fit:cover">` : `<div style="width:56px;height:56px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${(u.displayName||u.email||'?').charAt(0).toUpperCase()}</div>`}
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:1rem">${u.displayName || '<i style="color:var(--text3)">Bez jména</i>'}</div>
            <div style="font-size:.78rem;color:var(--text2)">${u.email || '—'}</div>
            <div style="font-size:.68rem;color:#a8aec8;font-family:monospace;margin-top:4px;word-break:break-all">${u.uid}</div>
            <button class="btn btn-ghost btn-sm" style="margin-top:6px;padding:3px 8px;font-size:.7rem" onclick="navigator.clipboard.writeText('${u.uid}').then(()=>showToast('UID zkopírováno'))">📋 Kopírovat UID</button>
          </div>
        </div>

        <!-- Status předplatného -->
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600">Předplatné</div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.8rem">
            <div><div style="color:var(--text3);font-size:.7rem">Typ</div><div style="font-weight:600">${u.premium.type === 'premium' ? '💎 Premium' : u.premium.type === 'trial' ? '🎁 Trial' : '🆓 Free'}</div></div>
            <div><div style="color:var(--text3);font-size:.7rem">Stav</div><div style="font-weight:600">${premiumActive ? `Aktivní (${premiumLeft} d)` : trialActive ? `Aktivní (${trialLeft} d)` : 'Vypršelo / žádné'}</div></div>
            <div><div style="color:var(--text3);font-size:.7rem">Registrace</div><div style="font-weight:600;font-size:.78rem">${fmtDate(u.premium.createdAt)}</div></div>
            <div><div style="color:var(--text3);font-size:.7rem">Trial do</div><div style="font-weight:600;font-size:.78rem">${fmtDate(u.premium.trialUntil)}</div></div>
            <div style="grid-column:1/-1"><div style="color:var(--text3);font-size:.7rem">Premium do</div><div style="font-weight:600;font-size:.78rem">${fmtDate(u.premium.premiumUntil)}</div></div>
            ${u.premium.extended ? '<div style="grid-column:1/-1;font-size:.7rem;color:var(--bank)">⚠️ Trial byl automaticky prodloužen</div>' : ''}
          </div>
        </div>

        <!-- Akce – správa předplatného -->
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600">Manuální správa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          <button class="btn btn-accent btn-sm" onclick="adminSetPremium('${u.uid}', 30)">+30 dní Premium</button>
          <button class="btn btn-accent btn-sm" onclick="adminSetPremium('${u.uid}', 365)">+1 rok Premium</button>
          <button class="btn btn-sm" onclick="adminExtendTrial('${u.uid}', 30)">+30 dní Trial</button>
          <button class="btn btn-sm" onclick="adminExtendTrial('${u.uid}', 90)">+90 dní Trial</button>
          <button class="btn btn-ghost btn-sm" style="grid-column:1/-1;color:var(--expense);border-color:var(--expense)" onclick="adminRevokePremium('${u.uid}')">❌ Zrušit předplatné (set Free)</button>
          <button class="btn btn-ghost btn-sm" style="grid-column:1/-1;color:var(--expense);border-color:var(--expense)" onclick="adminToggleBan('${u.uid}')">🚫 Zablokovat / odblokovat účet</button>
        </div>

        <!-- Affiliate / Referral -->
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600">Affiliate</div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
          ${u.referral.code ? `
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center;font-size:.8rem">
              <div><div style="color:#a8aec8;font-size:.68rem">Kód</div><div style="font-weight:700;color:var(--bank);font-family:monospace">${u.referral.code}</div></div>
              <div><div style="color:#a8aec8;font-size:.68rem">Kliků</div><div style="font-weight:700">${u.referral.clicks}</div></div>
              <div><div style="color:#a8aec8;font-size:.68rem">Přivedl</div><div style="font-weight:700;color:${u.referral.conversions>0?'var(--income)':'#a8aec8'}">${u.referral.conversions}</div></div>
              <div><div style="color:#a8aec8;font-size:.68rem">Konverzí</div><div style="font-weight:700;color:var(--income)">${u.referral.conversions}</div></div>
            </div>
            ${(()=> {
              const r=u.referral;
              const konverze = r.clicks>0 ? Math.round(r.conversions/r.clicks*100) : null;
              let t = `<div style="font-size:.72rem;color:#a8aec8;line-height:1.6;margin-top:9px;padding-top:8px;border-top:1px solid var(--border)">`;
              t += r.conversions>0
                ? `Přes odkaz tohoto uživatele se registrovalo <strong style="color:var(--income)">${r.conversions}</strong> lidí`
                  + (konverze!==null?` · z ${r.clicks} kliků, tedy ${konverze} %` : '')
                  + '.'
                : (r.clicks>0
                    ? `Odkaz dostal ${r.clicks} kliků, ale zatím z něj nikdo nedokončil registraci.`
                    : 'Odkaz zatím nikdo neotevřel.');
              if(r.pending>0) t += ` <span style="color:var(--debt)">${r.pending} registrací čeká na připsání bodů</span> – body se uživateli načtou při jeho dalším přihlášení.`;
              if(r.mirrored!==r.conversions) t += ` <span style="color:#a8aec8">(uživatel u sebe vidí ${r.mirrored})</span>`;
              return t+'</div>';
            })()}
          ` : '<div style="text-align:center;color:var(--text3);font-size:.78rem;padding:6px">Uživatel nemá vytvořený referral kód</div>'}
        </div>

        <!-- Statistiky -->
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600">Statistiky</div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.8rem">
            <div><div style="color:var(--text3);font-size:.7rem">Transakce celkem</div><div style="font-weight:600">${u.transactionsCount}</div></div>
            <div><div style="color:var(--text3);font-size:.7rem">Poslední aktivita</div><div style="font-weight:600;font-size:.78rem">${u.lastActivity?fmtDate(u.lastActivity):'–'}${u.lastActivityIsReal?'':' <span style="color:#f5b942;font-size:.66rem">(jen registrace)</span>'}</div></div>
          </div>
          ${(()=>{
            // v9.85 (TODO-213): metriky ze skutečné evidence aktivity
            const r = adminActivityScore(u); const st = r.st;
            if (!st.has) return `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:.74rem;color:#a8aec8;line-height:1.6">
              ⏳ <strong style="color:#c9cede">Evidence aktivity zatím nemá data.</strong>
              Sbírá se od v9.85 – tenhle účet se od nasazení ještě nepřihlásil, nebo je to starší záznam.
              Do té doby nelze spočítat ani objem za 30 dní, ani čerstvost, takže se skóre neukazuje (dřív se počítalo proti datu registrace a u aktivního uživatele vycházelo vždy nízko).
            </div>`;
            const cell = (v,l,c) => `<div style="text-align:center"><div style="font-family:Syne,sans-serif;font-weight:800;font-size:1rem;color:${c||'#e8eaf2'}">${v}</div><div style="font-size:.66rem;color:#a8aec8;margin-top:1px">${l}</div></div>`;
            const label = r.score >= 66 ? 'Aktivní' : r.score >= 33 ? 'Průměrný' : 'Neaktivní';
            const color = r.score >= 66 ? 'var(--income)' : r.score >= 33 ? '#f5b942' : 'var(--text3)';
            return `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
                ${cell(st.days30+'/30','aktivních dní', st.days30>=15?'var(--income)':st.days30>=5?'#f5b942':'var(--text3)')}
                ${cell(st.streak,'série dní', st.streak>=7?'var(--income)':'#e8eaf2')}
                ${cell(st.visits,'spuštění celkem')}
                ${cell(st.days90+'/90','za 3 měsíce')}
              </div>
              <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:5px">
                <span style="color:var(--text3)">Aktivita uživatele</span>
                <strong style="color:${color}">${label} · ${r.score}/100</strong>
              </div>
              <div style="position:relative;height:10px;background:linear-gradient(90deg,#6b7280 0%,#f5b942 50%,#4ade80 100%);opacity:.35;border-radius:5px"></div>
              <div style="position:relative;height:0">
                <div style="position:absolute;top:-13px;left:calc(${r.score}% - 6px);width:12px;height:12px;border-radius:50%;background:${color};border:2px solid var(--surface)"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:.66rem;color:#a8aec8;margin-top:4px">
                <span>Neaktivní</span><span>Průměrný</span><span>Aktivní</span>
              </div>
              <div style="font-size:.66rem;color:#a8aec8;margin-top:7px;line-height:1.5">
                Objem <strong style="color:#c9cede">${r.volScore}/60</strong> (aktivní dny za 30 dní, 20+ = plný počet) ·
                čerstvost <strong style="color:#c9cede">${r.freshScore}/40</strong> (${r.days>=999?'neznámo':r.days===0?'dnes':r.days+' dní'} od posledního použití).
              </div>
              <div style="font-size:.7rem;color:#a8aec8;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);line-height:1.6">
                ${st.ver?`Verze při posledním použití: <strong style="color:#c9cede">${st.ver}</strong> · `:''}
                ${st.pwa?'📱 nainstalovaná aplikace':'🌐 prohlížeč'}
                ${st.activation!==null?` · aktivace: první transakce <strong style="color:#c9cede">${st.activation===0?'týž den':st.activation+' dní'}</strong> po registraci`:''}
              </div>
            </div>`;
          })()}
        </div>

        ${(()=>{
          // Spotřeba AI – z aiUsage (worker ukládá per měsíc: počty per typ, tokeny, náklady)
          const usage = u.aiUsage || {};
          const months = Object.keys(usage).filter(k=>/^\d{4}-\d{2}$/.test(k)).sort().reverse();
          if(!months.length) return `<div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
            <div style="font-size:.78rem;color:var(--text3)">🤖 Spotřeba AI: zatím žádná data (uživatel nevyužil AI funkce, nebo tracking není aktivní).</div>
          </div>`;
          const TYPE_LABELS = {receipt:'🧾 Účtenky', bank_statement_text:'🏦 Výpisy', chat:'💬 Chat', advisor_report:'📊 Rádce', wish_url:'🔗 URL import', price_alert:'🔔 Cenové alerty'};
          const curMonth = months[0];
          const m = usage[curMonth] || {};
          const totalCalls = m.total || 0;
          const tokensTotal = m.tokensTotal || 0;
          const costCzk = m.costCzk || 0;
          // Rozpad podle typu
          const typeRows = Object.keys(TYPE_LABELS).filter(t=>m[t]).map(t=>{
            const calls=m[t]||0; const cost=m['cost_'+t]||0;
            return `<div style="display:flex;justify-content:space-between;font-size:.74rem;padding:3px 0">
              <span style="color:var(--text2)">${TYPE_LABELS[t]}</span>
              <span style="color:var(--text3)">${calls}× ${cost>0?'· '+cost.toFixed(2)+' Kč':''}</span>
            </div>`;
          }).join('');
          return `<div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span style="font-size:.82rem;font-weight:700">🤖 Spotřeba AI</span>
              <span style="font-size:.68rem;color:#a8aec8">${curMonth}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
              <div style="text-align:center"><div style="font-size:1.05rem;font-weight:700;color:var(--bank)">${totalCalls}</div><div style="font-size:.62rem;color:#a8aec8">volání</div></div>
              <div style="text-align:center"><div style="font-size:1.05rem;font-weight:700;color:#a78bfa">${tokensTotal>=1000?(tokensTotal/1000).toFixed(1)+'k':tokensTotal}</div><div style="font-size:.62rem;color:#a8aec8">tokenů</div></div>
              <div style="text-align:center"><div style="font-size:1.05rem;font-weight:700;color:var(--income)">${costCzk.toFixed(2)}</div><div style="font-size:.62rem;color:#a8aec8">Kč</div></div>
            </div>
            ${typeRows ? `<div style="border-top:1px solid var(--border);padding-top:8px">${typeRows}</div>` : ''}
            ${months.length>1 ? `<div style="font-size:.64rem;color:#a8aec8;margin-top:8px">Historie: ${months.length} měsíců · celkem ${months.reduce((a,k)=>a+(usage[k].costCzk||0),0).toFixed(2)} Kč</div>` : ''}
          </div>`;
        })()}

        <!-- Nebezpečná zóna -->
        <details style="background:#7f1d1d22;border:1px solid #7f1d1d44;border-radius:10px;padding:10px">
          <summary style="cursor:pointer;font-size:.78rem;font-weight:600;color:var(--expense)">⚠️ Nebezpečná zóna</summary>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-sm" style="background:var(--expense);color:#fff" onclick="adminViewUserAs('${u.uid}')">👁️ Zobrazit aplikaci jako tento uživatel</button>
            <div style="font-size:.7rem;color:var(--text3);line-height:1.4">
              <strong>Smazání účtu:</strong> Provede se přes Firebase Console (Authentication + ručně odstranit <code>users/${u.uid}</code> v Realtime DB).
            </div>
          </div>
        </details>
      </div>
    </div>
  `;

  // Inject modal pokud ještě neexistuje
  let modal = document.getElementById('modalUserDetail');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalUserDetail';
    modal.className = 'overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
  modal.classList.add('open');
}

async function adminSetPremium(uid, days) {
  if (!confirm(`Aktivovat Premium na ${days} dní pro tohoto uživatele?`)) return;
  try {
    const u = _cachedUsers.find(x => x.uid === uid);
    const now = Date.now();
    // Pokud má aktivní premium, prodluž od jeho expirace, jinak od dneška
    const base = (u?.premium?.premiumUntil && u.premium.premiumUntil > now) ? u.premium.premiumUntil : now;
    const premiumUntil = base + days * 24 * 60 * 60 * 1000;
    await _set(_ref(_db, `users/${uid}/premium`), {
      type: 'premium',
      premiumUntil,
      trialUntil: u?.premium?.trialUntil || 0,
      createdAt: u?.premium?.createdAt || now,
      manuallySet: true,
      manuallySetBy: window._currentUser.uid,
      manuallySetAt: now,
    });
    showToast(`✅ Premium nastaveno do ${new Date(premiumUntil).toLocaleDateString('cs-CZ')}`);
    closeModal('modalUserDetail');
    await loadUsersList();
  } catch (e) {
    showToast('❌ Chyba: ' + e.message);
  }
}

async function adminExtendTrial(uid, days) {
  if (!confirm(`Prodloužit Trial o ${days} dní?`)) return;
  try {
    const u = _cachedUsers.find(x => x.uid === uid);
    const now = Date.now();
    const base = (u?.premium?.trialUntil && u.premium.trialUntil > now) ? u.premium.trialUntil : now;
    const trialUntil = base + days * 24 * 60 * 60 * 1000;
    await _set(_ref(_db, `users/${uid}/premium`), {
      type: 'trial',
      trialUntil,
      premiumUntil: u?.premium?.premiumUntil || 0,
      createdAt: u?.premium?.createdAt || now,
      extended: true,
      manuallySetBy: window._currentUser.uid,
      manuallySetAt: now,
    });
    showToast(`✅ Trial prodloužen do ${new Date(trialUntil).toLocaleDateString('cs-CZ')}`);
    closeModal('modalUserDetail');
    await loadUsersList();
  } catch (e) {
    showToast('❌ Chyba: ' + e.message);
  }
}

async function adminRevokePremium(uid) {
  if (!confirm('Opravdu zrušit předplatné? Uživatel přejde na Free.')) return;
  try {
    const u = _cachedUsers.find(x => x.uid === uid);
    const now = Date.now();
    await _set(_ref(_db, `users/${uid}/premium`), {
      type: 'free',
      trialUntil: 0,
      premiumUntil: 0,
      createdAt: u?.premium?.createdAt || now,
      revokedBy: window._currentUser.uid,
      revokedAt: now,
    });
    showToast('✅ Předplatné zrušeno (Free)');
    closeModal('modalUserDetail');
    await loadUsersList();
  } catch (e) {
    showToast('❌ Chyba: ' + e.message);
  }
}

async function adminViewUserAs(uid) {
  if (!confirm('Přepnout pohled jako tento uživatel? (Read-only – nelze měnit jejich data)\n\nPro návrat klikni na "Vrátit se k mým datům" v hlavičce nebo refreshni stránku.')) return;
  // FIX (S13): nejdřív NAČTI data uživatele do partnerData (admin má read právo na users/*),
  // jinak switchToPartner přepne viewingUid, ale getData() nemá odkud číst → zůstanou admin data.
  try {
    if (typeof _get === 'function' && typeof _ref === 'function' && window._db) {
      const snap = await _get(_ref(window._db, `users/${uid}/data`));
      const profSnap = await _get(_ref(window._db, `users/${uid}/profile`));
      if (typeof partnerData !== 'undefined') {
        partnerData[uid] = {
          data: snap.exists() ? snap.val() : {},
          profile: profSnap.exists() ? profSnap.val() : { displayName: uid.slice(0,8) }
        };
      }
    }
  } catch(e) {
    alert('Nepodařilo se načíst data uživatele: ' + (e?.message||e));
    return;
  }
  // FIX-064 (Session 8): Použij existující switchToPartner() z app.js – ten správně
  // aktualizuje sidebar, viewingUid a renderuje stránku. Pokud nedostupný, fallback.
  if (typeof switchToPartner === 'function') {
    switchToPartner(uid);
    closeModal('modalUserDetail');
    return;
  }
  // Fallback (pokud switchToPartner není dostupné)
  if (typeof window !== 'undefined') {
    window.viewingUid = uid;
    showToast('👁️ Zobrazeno jako ' + uid.slice(0,8) + '... · Refresh stránky pro návrat');
    closeModal('modalUserDetail');
    // Vyvolej re-render
    if (typeof loadData === 'function') loadData();
    if (typeof renderPartnersList === 'function') renderPartnersList();
    if (typeof renderPage === 'function') renderPage();
  }
}

// Auto-load uživatelů při přepnutí na Users tab (volitelné)


// ══════════════════════════════════════════════════════
//  ADMIN – KEYWORD ENGINE
// ══════════════════════════════════════════════════════
let _adminKeywords = {}; // {keyword: coicopId} – z Firebase

// Session 10: naplní globální cache keyword_overrides pro mapToCOICOP (bez UI).
async function syncKwOverrides(){
  try{
    const snap = await _get(_ref(_db, 'keyword_overrides'));
    const data = snap.exists() ? snap.val() : {};
    window._kwOverrides = {};
    Object.entries(data).forEach(([kw,o])=>{ window._kwOverrides[kw]= (o&&typeof o==='object')?o:{coicopId:o}; });
    return window._kwOverrides;
  }catch(e){ console.warn('syncKwOverrides',e); return window._kwOverrides||{}; }
}

async function loadKeywords() {
  await syncKwOverrides(); // vždy aktualizuj cache (i když UI tabulka není)
  const el = document.getElementById('adminKeywordsTable'); if(!el) return;
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám...</div></div>';
  try {
    const snap = await _get(_ref(_db, 'keyword_overrides'));
    _adminKeywords = snap.exists() ? snap.val() : {};

    // Slouč s výchozími z kódu
    const combined = {};
    // Nejdřív výchozí z kódu
    Object.entries(COICOP_KEYWORDS).forEach(([kw, id]) => {
      combined[kw] = {coicopId: id, source: 'kód', overridden: false};
    });
    // Pak přepsání z Firebase
    Object.entries(_adminKeywords).forEach(([kw, val]) => {
      combined[kw] = {coicopId: val.coicopId||val, source: 'admin', overridden: true, updatedAt: val.updatedAt||''};
    });

    const sorted = Object.entries(combined).sort((a,b) => {
      if(a[1].source==='admin' && b[1].source!=='admin') return -1;
      if(b[1].source==='admin' && a[1].source!=='admin') return 1;
      return a[0].localeCompare(b[0]);
    });

    el.innerHTML = `
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:8px">${sorted.length} pravidel celkem · <span style="color:var(--income)">${Object.keys(_adminKeywords).length} admin override</span> · ${Object.keys(COICOP_KEYWORDS).length} výchozích</div>
      <div style="max-height:400px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.78rem">
          <thead><tr style="border-bottom:2px solid var(--border)">
            <th style="text-align:left;padding:6px 8px;color:var(--text2)">Klíčové slovo</th>
            <th style="text-align:left;padding:6px 8px;color:var(--text2)">COICOP skupina</th>
            <th style="text-align:left;padding:6px 8px;color:var(--text2)">Zdroj</th>
            <th style="padding:6px 8px"></th>
          </tr></thead>
          <tbody>
            ${sorted.map(([kw, v]) => {
              const grp = COICOP_GROUPS_DEF.find(g=>g.id==v.coicopId);
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:6px 8px;font-weight:600">${kw}</td>
                <td style="padding:6px 8px">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${grp?.color||'#999'};margin-right:5px;vertical-align:middle"></span>
                  ${grp?.id||'?'}. ${grp?.name||'Neznámá'}
                </td>
                <td style="padding:6px 8px">
                  <span style="font-size:.7rem;padding:2px 6px;border-radius:4px;background:${v.source==='admin'?'rgba(74,222,128,.15)':'var(--surface3)'};color:${v.source==='admin'?'var(--income)':'var(--text2)'}">
                    ${v.source==='admin'?'✅ admin override':'🔧 kód'}
                  </span>
                </td>
                <td style="padding:6px 8px;text-align:right;white-space:nowrap">
                  <button class="btn btn-ghost btn-sm" onclick="editKeywordRule('${kw}',${v.coicopId})" style="font-size:.7rem;padding:2px 6px">✎</button>
                  ${v.source==='admin'?`<button class="btn btn-danger btn-sm" onclick="deleteKeywordRule('${kw}')" style="font-size:.7rem;padding:2px 6px">✕</button>`:''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--expense);padding:12px;font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

// Session 10: sanitizace klíče pro Firebase. Zakázané znaky: . # $ / [ ]
// (a řídicí znaky). Nahradíme mezerou, sloučíme mezery, ořežeme.
function fbSafeKey(s){
  return (s||'').replace(/[.#$/\[\]]/g,' ').replace(/\s+/g,' ').trim();
}

async function addKeywordRule() {
  const kw  = fbSafeKey(document.getElementById('kw-new-keyword')?.value.trim().toLowerCase());
  const cid = parseInt(document.getElementById('kw-new-coicop')?.value);
  if(!kw) { alert('Zadejte klíčové slovo (po očištění nesmí být prázdné)'); return; }
  await _update(_ref(_db), {
    [`keyword_overrides/${kw}`]: {coicopId: cid, updatedAt: Date.now(), updatedBy: 'admin'}
  });
  document.getElementById('kw-new-keyword').value = '';
  loadKeywords();
}

function editKeywordRule(kw, currentId) {
  const newId = prompt(`Změnit COICOP skupinu pro "${kw}"\n\n${COICOP_GROUPS_DEF.map(g=>`${g.id}. ${g.name}`).join('\n')}\n\nZadejte číslo (1-13):`, currentId);
  if(!newId || isNaN(parseInt(newId))) return;
  const id = parseInt(newId);
  if(id < 1 || id > 13) { alert('Číslo musí být 1-13'); return; }
  _update(_ref(_db), {
    [`keyword_overrides/${kw}`]: {coicopId: id, updatedAt: Date.now(), updatedBy: 'admin'}
  }).then(() => loadKeywords());
}

async function deleteKeywordRule(kw) {
  if(!confirm(`Smazat override pro "${kw}"? Bude se používat výchozí pravidlo z kódu.`)) return;
  await _set(_ref(_db, `keyword_overrides/${kw}`), null);
  loadKeywords();
}

// ══════════════════════════════════════════════════════
//  ADMIN – USER CORRECTIONS
// ══════════════════════════════════════════════════════
async function loadCorrections() {
  const el = document.getElementById('adminCorrectionsTable'); if(!el) return;
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám...</div></div>';
  try {
    const snap = await _get(_ref(_db, 'coicop_corrections'));
    if(!snap.exists()) {
      el.innerHTML = '<div class="empty"><div class="et">Zatím žádné opravy od uživatelů</div></div>';
      return;
    }
    const data = snap.val();
    // Agreguj – kolik uživatelů opravilo stejný keyword
    const agg = {};
    Object.values(data).forEach(uid_corrections => {
      Object.entries(uid_corrections).forEach(([kw, corr]) => {
        if(!agg[kw]) agg[kw] = {kw, from: corr.from, to: corr.to, count: 0, toId: corr.toId};
        agg[kw].count++;
      });
    });
    const sorted = Object.values(agg).sort((a,b) => b.count - a.count);
    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:.78rem">
        <thead><tr style="border-bottom:2px solid var(--border)">
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Klíčové slovo</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Původně</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Opraveno na</th>
          <th style="text-align:center;padding:6px 8px;color:var(--text2)">Počet</th>
          <th style="padding:6px 8px"></th>
        </tr></thead>
        <tbody>
          ${sorted.map(c => {
            const grpFrom = COICOP_GROUPS_DEF.find(g=>g.id==c.from);
            const grpTo   = COICOP_GROUPS_DEF.find(g=>g.id==c.toId);
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px 8px;font-weight:600">${c.kw}</td>
              <td style="padding:6px 8px;font-size:.74rem;color:var(--text2)">${grpFrom?.name||c.from}</td>
              <td style="padding:6px 8px;font-size:.74rem;color:var(--income)">${grpTo?.name||c.to}</td>
              <td style="padding:6px 8px;text-align:center">
                <span style="background:${c.count>=3?'rgba(74,222,128,.15)':'var(--surface3)'};color:${c.count>=3?'var(--income)':'var(--text2)'};padding:2px 7px;border-radius:10px;font-weight:700">${c.count}×</span>
              </td>
              <td style="padding:6px 8px;text-align:right">
                <button class="btn btn-accent btn-sm" onclick="promoteCorrection('${c.kw}',${c.toId})" style="font-size:.7rem;padding:2px 8px" title="Povýšit na globální pravidlo">⬆️ Povýšit</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--expense);padding:12px;font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

async function promoteCorrection(kw, coicopId) {
  if(!confirm(`Přidat "${kw}" → skupina ${coicopId} jako globální pravidlo?`)) return;
  await _update(_ref(_db), {
    [`keyword_overrides/${kw}`]: {coicopId, updatedAt: Date.now(), updatedBy: 'admin-promoted'}
  });
  alert('✅ Pravidlo přidáno do keyword engine!');
  loadKeywords();
}

// ══════════════════════════════════════════════════════
//  ADMIN – LOW CONFIDENCE
// ══════════════════════════════════════════════════════
async function loadLowConf() {
  const el = document.getElementById('adminLowConfTable'); if(!el) return;
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám...</div></div>';
  try {
    // REST API s auth tokenem – Firebase SDK _get nemá přístup k /users root bez admin pravidla
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const res = await fetch(
      'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?auth=' + idToken
    );
    if(!res.ok) {
      if(res.status === 401 || res.status === 403) {
        el.innerHTML = `<div style="padding:12px;font-size:.8rem;color:var(--text2)">
          ℹ️ Pro tuto funkci je potřeba nastavit Firebase pravidlo:<br>
          <code style="background:var(--surface3);padding:4px 8px;border-radius:4px;font-size:.76rem;display:block;margin-top:6px">
            "users": { ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'" }
          </code>
          <div style="margin-top:8px;color:var(--text3)">Přejdi na Firebase Console → Realtime Database → Rules</div>
        </div>`;
        return;
      }
      throw new Error('HTTP ' + res.status);
    }
    const data = await res.json();
    if(!data) { el.innerHTML = '<div class="empty"><div class="et">Žádná data</div></div>'; return; }

    const lowConf = [];
    Object.entries(data).forEach(([uid, udata]) => {
      //  v9.66 (FIX-240): od diff-write (ADR-062) jsou transakce ve Firebase
      //  OBJEKT {id: tx}, ne pole – .forEach na objektu neexistuje a admin
      //  hlásil „txs.forEach is not a function". Normalizujeme na pole.
      const _raw = udata?.data?.transactions;
      const txs = Array.isArray(_raw) ? _raw : (_raw ? Object.values(_raw) : []);
      txs.forEach(tx => {
        if(tx.type !== 'expense') return;
        const {coicopId, confidence} = mapToCOICOP(tx);
        if(confidence < 50) {
          lowConf.push({uid: uid.slice(0,8)+'...', tx, coicopId, confidence});
        }
      });
    });
    lowConf.sort((a,b) => a.confidence - b.confidence);

    // Deduplikuj dle názvu – zobraz jen unikátní názvy (první výskyt + počet)
    const seen = {};
    const deduped = [];
    lowConf.forEach(item => {
      const key = (item.tx.name||'?').toLowerCase().trim();
      if(!seen[key]) {
        seen[key] = {count: 1, item};
        deduped.push(seen[key]);
      } else {
        seen[key].count++;
      }
    });
    deduped.sort((a,b) => a.item.confidence - b.item.confidence);
    const top50 = deduped.slice(0, 50);
    el.innerHTML = `
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:8px">${lowConf.length} transakcí · <strong>${deduped.length} unikátních názvů</strong> · zobrazeno ${top50.length} <span style="color:var(--text3)">· pravidlo stačí přidat jednou</span></div>
      <table style="width:100%;border-collapse:collapse;font-size:.78rem">
        <thead><tr style="border-bottom:2px solid var(--border)">
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Transakce</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Namapováno</th>
          <th style="text-align:center;padding:6px 8px;color:var(--text2)">Jistota</th>
          <th style="padding:6px 8px"></th>
        </tr></thead>
        <tbody>
          ${top50.map(({item: {uid, tx, coicopId, confidence}, count}) => {
            const grp = COICOP_GROUPS_DEF.find(g=>g.id==coicopId);
            const confColor = confidence < 20 ? 'var(--expense)' : confidence < 35 ? '#f59e0b' : 'var(--text2)';
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px 8px">
                <div style="font-weight:600">${tx.name||'–'} ${count>1?`<span style="font-size:.65rem;background:rgba(236,72,153,.15);border:1px solid rgba(236,72,153,.3);color:#ec4899;padding:1px 5px;border-radius:6px;font-weight:700">${count}×</span>`:''}</div>
                <div style="font-size:.68rem;color:var(--text2)">${uid} · ${tx.date||''}</div>
              </td>
              <td style="padding:6px 8px;font-size:.74rem">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${grp?.color||'#999'};margin-right:4px;vertical-align:middle"></span>
                ${grp?.name||'Ostatní'}
              </td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;color:${confColor}">${confidence}%</td>
              <td style="padding:6px 8px">
                <button class="btn btn-ghost btn-sm" onclick="addKeywordFromLowConf('${(tx.name||'').toLowerCase().replace(/'/g,'')}',${coicopId},this)" style="font-size:.7rem;padding:2px 6px">➕ Přidat pravidlo</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--expense);padding:12px;font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

function addKeywordFromLowConf(name, suggestedId, rowEl) {
  // Najdi řádek tlačítka
  const row = rowEl || document.querySelector(`[onclick*="addKeywordFromLowConf('${name}'"]`)?.closest('tr');

  // Sestav klíčové slovo – první smysluplné slovo z názvu
  const suggestedKw = name.replace(/\s*(s\.r\.o\.|a\.s\.|spol\.)\s*/gi,'').trim().split(/\s+/)[0].toLowerCase();

  // Vytvoř inline dialog pod řádkem
  const existingDialog = document.getElementById('lowconf-dialog');
  if(existingDialog) existingDialog.remove();

  const dialog = document.createElement('tr');
  dialog.id = 'lowconf-dialog';
  dialog.innerHTML = `<td colspan="4" style="padding:10px 8px;background:var(--surface2);border-bottom:1px solid var(--border)">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <div>
        <div style="font-size:.68rem;color:var(--bank);font-weight:700;margin-bottom:3px">KLÍČOVÉ SLOVO</div>
        <input id="lc-kw" value="${suggestedKw}" style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:5px 8px;font-size:.8rem;color:var(--text);width:130px">
      </div>
      <div>
        <div style="font-size:.68rem;color:var(--bank);font-weight:700;margin-bottom:3px">COICOP SKUPINA</div>
        <select id="lc-coicop" style="background:var(--surface);border:1px solid var(--border);border-radius:7px;padding:5px 8px;font-size:.78rem;color:var(--text)">
          ${COICOP_GROUPS_DEF.map(g=>`<option value="${g.id}" ${g.id==suggestedId?'selected':''}>${g.id}. ${g.name}</option>`).join('')}
          <option value="0">0. Bez COICOP (investice, spoření…)</option>
        </select>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-end;padding-bottom:1px">
        <button onclick="saveLowConfRule('${name}')" class="btn btn-accent btn-sm" style="padding:6px 12px">✓ Uložit</button>
        <button onclick="document.getElementById('lowconf-dialog')?.remove()" class="btn btn-ghost btn-sm" style="padding:6px 10px">✕</button>
      </div>
    </div>
    <div id="lc-status" style="font-size:.72rem;margin-top:4px;color:var(--text3)">
      Pravidlo bude platit pro všechny transakce obsahující klíčové slovo.
    </div>
  </td>`;

  if(row) row.after(dialog);
  else document.getElementById('adminLowConfTable')?.querySelector('tbody')?.appendChild(dialog);
  document.getElementById('lc-kw')?.focus();
}

async function saveLowConfRule(originalName) {
  const rawKw = document.getElementById('lc-kw')?.value.trim().toLowerCase();
  // Session 10 FIX: Firebase klíče nesmí obsahovat . # $ / [ ] → sanitizace.
  // Tečku/lomítko atd. nahradíme mezerou a sloučíme vícenásobné mezery.
  const kw = fbSafeKey(rawKw);
  const coicopId = parseInt(document.getElementById('lc-coicop')?.value||'0');
  const statusEl = document.getElementById('lc-status');

  if(!kw || kw.length < 2) {
    if(statusEl) { statusEl.textContent='⚠️ Klíčové slovo musí mít alespoň 2 znaky'; statusEl.style.color='var(--expense)'; }
    return;
  }

  if(statusEl) { statusEl.textContent='⏳ Ukládám...'; statusEl.style.color='var(--text3)'; }

  try {
    await _update(_ref(_db), {
      [`keyword_overrides/${kw}`]: {
        coicopId, updatedAt: Date.now(), updatedBy: 'admin-lowconf',
        originalName, skipCoicop: coicopId===0
      }
    });

    // Session 10: aktualizuj cache overrides → mapToCOICOP hned zohlední pravidlo,
    // a překresli Low confidence seznam, ať vyřešená transakce trvale zmizí
    // (dřív zmizela jen vizuálně a po překliknutí se vrátila).
    if(window._kwOverrides) window._kwOverrides[kw]={coicopId, updatedBy:'admin-lowconf'};
    else window._kwOverrides={[kw]:{coicopId}};

    if(statusEl) { statusEl.textContent=`✅ Uloženo: "${kw}" → ${coicopId===0?'Bez COICOP':COICOP_GROUPS_DEF.find(g=>g.id===coicopId)?.name||coicopId}`; statusEl.style.color='var(--income)'; }

    // Vizuálně označ řádek jako vyřešený
    const dialog = document.getElementById('lowconf-dialog');
    const row = dialog?.previousElementSibling;
    if(row) {
      row.style.opacity='0.45';
      row.style.textDecoration='line-through';
      const btn = row.querySelector('button');
      if(btn) { btn.textContent='✅ Hotovo'; btn.disabled=true; btn.style.color='var(--income)'; }
    }

    // Zavři dialog po 1.5s a překresli seznam (transakce už nebude low-confidence)
    setTimeout(()=>{ document.getElementById('lowconf-dialog')?.remove(); if(typeof loadLowConf==='function') loadLowConf(); }, 1500);

    loadKeywords(); // Aktualizuj záložku Keywords
  } catch(e) {
    if(statusEl) { statusEl.textContent='❌ Chyba: '+e.message; statusEl.style.color='var(--expense)'; }
  }
}

// ══════════════════════════════════════════════════════
//  ADMIN – STATISTIKY MAPOVÁNÍ
// ══════════════════════════════════════════════════════
async function loadCommunityActivity() {
  const el = document.getElementById('adminCommunityActivity');
  if (!el) return;
  try {
    if (!_cachedUsers || !_cachedUsers.length) { await loadUsersList(); }
    const users = _cachedUsers || [];
    const curMonth = new Date().toISOString().slice(0,7);

    // Agregace
    let totalUsers = users.length;
    let activeThisMonth = 0;
    let totalTx = 0;
    let totalCalls = 0, totalTokens = 0, totalCostCzk = 0;
    const typeTotals = {};
    const TYPE_LABELS = {receipt:'🧾 Účtenky', bank_statement_text:'🏦 Výpisy', chat:'💬 Chat', advisor_report:'📊 Rádce', wish_url:'🔗 URL import', price_alert:'🔔 Cenové alerty'};
    const userCosts = [];

    users.forEach(u=>{
      totalTx += (u.transactionsCount||0);
      const usage = u.aiUsage || {};
      const m = usage[curMonth] || {};
      if(m.total) activeThisMonth++;
      totalCalls += (m.total||0);
      totalTokens += (m.tokensTotal||0);
      const uCost = m.costCzk||0;
      totalCostCzk += uCost;
      if(uCost>0 || m.total>0) userCosts.push({name:u.displayName||u.email||u.uid.slice(0,8), calls:m.total||0, cost:uCost});
      Object.keys(TYPE_LABELS).forEach(t=>{ if(m[t]) typeTotals[t]=(typeTotals[t]||0)+m[t]; });
    });
    userCosts.sort((a,b)=>b.cost-a.cost);

    const maxTypeCalls = Math.max(1, ...Object.values(typeTotals));
    const typeBars = Object.keys(TYPE_LABELS).filter(t=>typeTotals[t]).map(t=>{
      const v=typeTotals[t]; const pct=Math.round(v/maxTypeCalls*100);
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:.74rem;margin-bottom:3px">
          <span style="color:var(--text2)">${TYPE_LABELS[t]}</span><span style="color:var(--text3)">${v}× volání</span>
        </div>
        <div style="height:8px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--bank);border-radius:4px"></div></div>
      </div>`;
    }).join('') || '<div style="font-size:.74rem;color:var(--text3)">Zatím žádná AI volání tento měsíc.</div>';

    const topUsers = userCosts.slice(0,8).map((u,i)=>`
      <div style="display:flex;justify-content:space-between;font-size:.74rem;padding:4px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text2)">${i+1}. ${u.name}</span>
        <span style="color:var(--text3)">${u.calls}× · ${u.cost.toFixed(2)} Kč</span>
      </div>`).join('') || '<div style="font-size:.74rem;color:var(--text3)">Žádní aktivní uživatelé tento měsíc.</div>';

    el.innerHTML = `
      <div style="font-size:.7rem;color:var(--text3);margin-bottom:12px">Měsíc: ${curMonth} · agregace ze všech uživatelů</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
        <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:1.3rem;font-weight:700;color:var(--bank)">${totalUsers}</div><div style="font-size:.66rem;color:#a8aec8">uživatelů celkem</div></div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:1.3rem;font-weight:700;color:var(--income)">${activeThisMonth}</div><div style="font-size:.66rem;color:#a8aec8">aktivních (AI) tento měsíc</div></div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:1.3rem;font-weight:700">${totalTx}</div><div style="font-size:.66rem;color:#a8aec8">transakcí celkem</div></div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;text-align:center"><div style="font-size:1.3rem;font-weight:700;color:#a78bfa">${totalCalls}</div><div style="font-size:.66rem;color:#a8aec8">AI volání tento měsíc</div></div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:16px;text-align:center">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:4px">Odhad nákladů na AI tento měsíc</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--income)">${totalCostCzk.toFixed(2)} Kč</div>
        <div style="font-size:.66rem;color:#a8aec8;margin-top:4px">${(totalTokens/1000).toFixed(1)}k tokenů celkem</div>
      </div>
      <div style="font-size:.78rem;font-weight:700;margin-bottom:8px">Volání podle typu</div>
      ${typeBars}
      <div style="font-size:.78rem;font-weight:700;margin:16px 0 8px">Top uživatelé (náklady)</div>
      ${topUsers}
      <div style="font-size:.66rem;color:#a8aec8;margin-top:12px;line-height:1.4">⚠️ Náklady jsou odhad (tokeny × cena Sonnet × kurz). Tracking funguje jen když má worker nastavené secrets FIREBASE_SERVICE_ACCOUNT + FIREBASE_DB_URL.</div>
    `;
  } catch(e) {
    el.innerHTML = `<div style="font-size:.78rem;color:var(--expense)">Chyba: ${e.message}</div>`;
  }
}

async function loadMappingStats() {
  const el = document.getElementById('adminMappingStats'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    // REST API s auth tokenem
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const res = await fetch(
      'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?auth=' + idToken
    );
    if(!res.ok) {
      if(res.status === 401 || res.status === 403) {
        el.innerHTML = `<div class="card-body"><div style="font-size:.8rem;color:var(--text2)">
          ℹ️ Pro tuto funkci je potřeba nastavit Firebase pravidlo:<br>
          <code style="background:var(--surface3);padding:4px 8px;border-radius:4px;font-size:.76rem;display:block;margin-top:6px">
            "users": { ".read": "auth.uid === 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'" }
          </code>
          <div style="margin-top:8px;color:var(--text3)">Přejdi na Firebase Console → Realtime Database → Rules</div>
        </div></div>`;
        return;
      }
      throw new Error('HTTP ' + res.status);
    }
    const data = await res.json();
    if(!data) { el.innerHTML = '<div class="card-body">Žádná data</div>'; return; }

    let total = 0, highConf = 0, midConf = 0, lowConf = 0, fallback = 0;
    const groupCounts = {};
    COICOP_GROUPS_DEF.forEach(g => groupCounts[g.id] = 0);

    Object.values(data).forEach(udata => {
      //  v9.66 (FIX-240): od diff-write (ADR-062) jsou transakce ve Firebase
      //  OBJEKT {id: tx}, ne pole – .forEach na objektu neexistuje a admin
      //  hlásil „txs.forEach is not a function". Normalizujeme na pole.
      const _raw = udata?.data?.transactions;
      const txs = Array.isArray(_raw) ? _raw : (_raw ? Object.values(_raw) : []);
      txs.forEach(tx => {
        if(tx.type !== 'expense') return;
        total++;
        const {coicopId, confidence} = mapToCOICOP(tx);
        groupCounts[coicopId] = (groupCounts[coicopId]||0) + 1;
        if(coicopId === 12 && confidence < 30) fallback++;
        if(confidence >= 70) highConf++;
        else if(confidence >= 50) midConf++;
        else lowConf++;
      });
    });

    const pctHigh = total ? Math.round(highConf/total*100) : 0;
    const pctMid  = total ? Math.round(midConf/total*100) : 0;
    const pctLow  = total ? Math.round(lowConf/total*100) : 0;
    const pctFall = total ? Math.round(fallback/total*100) : 0;

    el.innerHTML = `<div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
        <div class="stat-card income"><div class="stat-label">Celkem transakcí</div><div class="stat-value up">${total.toLocaleString('cs')}</div></div>
        <div class="stat-card income"><div class="stat-label">Vysoká jistota (≥70%)</div><div class="stat-value up">${pctHigh}%</div></div>
        <div class="stat-card balance"><div class="stat-label">Střední jistota (50-69%)</div><div class="stat-value">${pctMid}%</div></div>
        <div class="stat-card expense"><div class="stat-label">Nízká jistota (&lt;50%)</div><div class="stat-value down">${pctLow}%</div></div>
      </div>
      <div style="font-size:.8rem;font-weight:600;margin-bottom:8px">Distribuce dle COICOP skupin:</div>
      ${COICOP_GROUPS_DEF.map(g => {
        const cnt = groupCounts[g.id]||0;
        const pct = total ? Math.round(cnt/total*100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};flex-shrink:0"></span>
          <span style="font-size:.76rem;flex:1">${g.id}. ${g.name}</span>
          <div style="width:80px;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${g.color};border-radius:3px"></div>
          </div>
          <span style="font-size:.72rem;color:var(--text2);min-width:36px;text-align:right">${cnt} (${pct}%)</span>
        </div>`;
      }).join('')}
      ${pctFall > 0 ? `<div style="margin-top:12px;padding:8px 12px;background:rgba(248,113,113,.1);border-radius:8px;font-size:.76rem;color:var(--expense)">⚠️ ${pctFall}% transakcí spadlo do fallback "Ostatní" – přidejte více keyword pravidel</div>` : ''}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

// ── TODO-079: Uživatelská adopce kategorií ──
async function loadCategoryAdoption() {
  const el = document.getElementById('adminCatAdoption'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const res = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?auth='+idToken);
    if(!res.ok) throw new Error('HTTP '+res.status+(res.status===403?' – chybí Firebase pravidlo pro admin čtení':''));
    const data = await res.json();
    if(!data) { el.innerHTML = '<div class="card-body">Žádná data</div>'; return; }

    const defMap = Object.fromEntries(DEFAULT_CATEGORIES.map(d=>[d.id,d]));
    const defIds = new Set(DEFAULT_CATEGORIES.map(d=>d.id));
    const catUsage = {};
    let totalTx = 0, uncategorized = 0, inJine = 0;
    const userCount = Object.keys(data).length;

    Object.entries(data).forEach(([uid, udata]) => {
      const txArr = Array.isArray(udata?.data?.transactions)
        ? udata.data.transactions : Object.values(udata?.data?.transactions||{});
      const catArr = Array.isArray(udata?.data?.categories)
        ? udata.data.categories : Object.values(udata?.data?.categories||{});
      const userCatMap = Object.fromEntries(catArr.map(c=>[c.id,c]));
      const usedByThisUser = new Set();

      txArr.forEach(tx => {
        if(tx.type !== 'expense') return;
        totalTx++;
        const catId = tx.catId || tx.category || '';
        const sub = tx.subcat || tx.subCategory || tx.sub || '';
        if(!catId) { uncategorized++; return; }

        const userCat = userCatMap[catId];
        const defCat = defMap[catId];
        const cat = userCat || defCat;
        const catName = cat?.name || catId;
        if(catName === 'Jiné' || catId === 'cat21') inJine++;

        // COICOP vždy z DEFAULT_CATEGORIES – Firebase data coicop pole neobsahují
        const coicop = defCat?.coicop || null;
        const isDefault = defIds.has(catId);

        if(!catUsage[catId]) catUsage[catId] = {
          name:catName, icon:cat?.icon||'📦', color:cat?.color||'#6b7280',
          txCount:0, userCount:0, isDefault, coicop, subs:{}
        };
        catUsage[catId].txCount++;
        if(sub) catUsage[catId].subs[sub] = (catUsage[catId].subs[sub]||0)+1;
        usedByThisUser.add(catId);
      });
      usedByThisUser.forEach(id=>{ if(catUsage[id]) catUsage[id].userCount++; });
    });

    const sorted = Object.entries(catUsage).sort((a,b)=>b[1].txCount-a[1].txCount);
    const maxTx = sorted[0]?.[1]?.txCount || 1;
    const unusedDefs = DEFAULT_CATEGORIES.filter(d=>!catUsage[d.id]);

    el.innerHTML = `<div class="card-body">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
        <div class="stat-card income"><div class="stat-label">Celkem výdaj. transakcí</div><div class="stat-value up">${totalTx.toLocaleString('cs')}</div></div>
        <div class="stat-card expense"><div class="stat-label">Nezařazeno</div><div class="stat-value down">${uncategorized} (${totalTx?Math.round(uncategorized/totalTx*100):0}%)</div></div>
        <div class="stat-card balance"><div class="stat-label">V „Jiné"</div><div class="stat-value">${inJine} (${totalTx?Math.round(inJine/totalTx*100):0}%)</div></div>
      </div>
      ${unusedDefs.length?`<div style="padding:8px 12px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:8px;margin-bottom:14px;font-size:.76rem">
        ⚠️ <strong>${unusedDefs.length} výchozích kategorií</strong> bez jediné transakce:<br>
        <span style="color:var(--text2)">${unusedDefs.map(d=>`${d.icon} ${d.name}`).join(' · ')}</span>
      </div>`:''}
      <div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">Využití kategorií</div>
      ${sorted.map(([id,c])=>{
        const barW = Math.round(c.txCount/maxTx*100);
        const g = (COICOP_GROUPS_DEF||[]).find(x=>x.id===c.coicop)||{};
        const coicopBadge = c.coicop
          ? `<span title="COICOP ${c.coicop}: ${g.name||''}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${g.color||'#aaa'};color:#000;font-size:.64rem;font-weight:800;flex-shrink:0">${c.coicop}</span>`
          : `<span style="font-size:.66rem;color:var(--expense);padding:1px 5px;border:1px solid currentColor;border-radius:4px;white-space:nowrap">bez COICOP</span>`;
        const customBadge = !c.isDefault
          ? `<span style="font-size:.66rem;color:var(--debt);padding:1px 5px;border:1px solid currentColor;border-radius:6px;margin-left:3px">custom</span>` : '';
        const subsSorted = Object.entries(c.subs).sort((a,b)=>b[1]-a[1]);
        return `<div style="margin-bottom:10px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:1.1rem;flex-shrink:0">${c.icon}</span>
            <span style="font-size:.85rem;font-weight:600;flex:1">${c.name}</span>
            ${coicopBadge}${customBadge}
            <span style="font-size:.72rem;color:var(--text2);white-space:nowrap">${c.txCount} tx · ${c.userCount}/${userCount} už.</span>
          </div>
          <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-bottom:${subsSorted.length?'8px':'0'}">
            <div style="height:100%;width:${barW}%;background:${c.color};border-radius:3px"></div>
          </div>
          ${subsSorted.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">
            ${subsSorted.map(([s,n])=>`<span style="font-size:.7rem;padding:2px 8px;background:${c.color}22;border:1px solid ${c.color}44;border-radius:10px;color:var(--text2)">${s} <span style="color:var(--text3)">(${n})</span></span>`).join('')}
          </div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

// ── TODO-081: Vlastní kategorie bez COICOP – admin přiřazení ──
// ══════════════════════════════════════════════════════
//  S12.1c: VÝKON ADMIN AUDITŮ – Krok 1 (TODO-122)
//  Místo stažení CELÉ users.json (vč. všech transakcí všech
//  uživatelů!) se stáhne shallow seznam UID a pak per-uid
//  jen users/{uid}/data/categories (pár kB). Pool 8 souběžně.
//  Krok 2 (agregační index uzel) = ADR-061.
// ══════════════════════════════════════════════════════
const ADMIN_DB_BASE = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';

async function adminFetchUserCategories(idToken){
  const sh = await fetch(`${ADMIN_DB_BASE}/users.json?auth=${idToken}&shallow=true`);
  if(!sh.ok) throw new Error('HTTP '+sh.status+(sh.status===403?' – chybí Firebase pravidlo pro admin čtení':''));
  const uids = Object.keys(await sh.json() || {});
  const out = {}; const POOL = 8;
  for(let i = 0; i < uids.length; i += POOL){
    await Promise.all(uids.slice(i, i+POOL).map(async uid => {
      try {
        const r = await fetch(`${ADMIN_DB_BASE}/users/${uid}/data/categories.json?auth=${idToken}`);
        if(r.ok){
          const c = await r.json();
          if(c) out[uid] = (Array.isArray(c) ? c : Object.values(c)).filter(Boolean);
        }
      } catch(e) { /* uživatel bez dat – přeskočit */ }
    }));
  }
  return out;
}

async function loadCustomCatsNoCoicop() {
  const el = document.getElementById('adminCustomCats'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const catsByUid = await adminFetchUserCategories(idToken); // S12.1c: shallow místo celé DB
    if(!Object.keys(catsByUid).length) { el.innerHTML = '<div class="card-body">Žádná data</div>'; return; }

    const defIds = new Set(DEFAULT_CATEGORIES.map(d=>d.id));
    const customMap = {};
    let totalUserCats = 0;

    Object.entries(catsByUid).forEach(([uid, cats]) => {
      totalUserCats += cats.length;
      cats.forEach(c => {
        if(!c || !c.id || !c.name) return; // přeskočit prázdné záznamy
        if(defIds.has(c.id)) return;        // přeskočit výchozí (cat1–cat46)
        if(c.type === 'income') return;     // S12.1: příjmové kategorie do COICOP nepatří
        if(!customMap[c.id]) customMap[c.id] = {name:c.name, icon:c.icon||'📦', color:c.color||'#6b7280', users:[], coicop:(c.coicop!==undefined&&c.coicop!==null)?c.coicop:null};
        if(!customMap[c.id].users.includes(uid)) customMap[c.id].users.push(uid);
      });
    });

    const withoutCoicop = Object.entries(customMap).filter(([,c])=>c.coicop===null);
    const withCoicop = Object.entries(customMap).filter(([,c])=>c.coicop!==null);

    if(!Object.keys(customMap).length){
      el.innerHTML = `<div class="card-body">
        <div style="color:var(--income);font-size:.82rem;margin-bottom:8px">✅ Žádné vlastní kategorie – všichni uživatelé používají pouze výchozí sadu.</div>
        <div style="font-size:.72rem;color:var(--text3)">Celkem načteno ${totalUserCats} kategorií · výchozích (cat1–cat46): ${Math.min(totalUserCats,46)}</div>
      </div>`;
      return;
    }

    const coicopOptions = COICOP_GROUPS_DEF.map(g=>`<option value="${g.id}">${g.id}. ${g.name}</option>`).join('');

    el.innerHTML = `<div class="card-body">
      ${withoutCoicop.length?`
      <div style="font-size:.72rem;font-weight:700;color:var(--expense);text-transform:uppercase;margin-bottom:8px">❌ Bez COICOP (${withoutCoicop.length})</div>
      ${withoutCoicop.map(([catId,c])=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:1.1rem">${c.icon}</span>
          <span style="font-weight:600;font-size:.85rem;flex:1">${c.name}</span>
          <span style="font-size:.7rem;color:var(--text3)">${c.users.length} už.</span>
          <select id="coicop-sel-${catId}" class="fs" style="font-size:.76rem;padding:4px 8px;width:220px">
            <option value="">— vybrat skupinu —</option>
            <option value="0">0 – mimo COICOP (příjem/převod/spoření)</option>
            ${coicopOptions}
          </select>
          <button class="btn btn-ghost btn-sm" onclick="aiSuggestCoicopAdmin('coicop-sel-${catId}','${c.name.replace(/'/g,"\\'")}','',this)" title="AI Rádce navrhne oddíl">🤖</button>
          <button class="btn btn-accent btn-sm" onclick="assignCoicop('${catId}','${c.name}')">Přiřadit</button>
          <span class="ai-coicop-reason" style="flex-basis:100%;font-size:.68rem;color:#a8aec8"></span>
        </div>`).join('')}
      `:''}
      ${withCoicop.length?`
      <div style="font-size:.72rem;font-weight:700;color:var(--income);text-transform:uppercase;margin:12px 0 8px">✅ Již přiřazeno (${withCoicop.length})</div>
      ${withCoicop.map(([catId,c])=>{
        const g=c.coicop===0?{name:'mimo COICOP',color:'#7e84a0'}:(COICOP_GROUPS_DEF.find(x=>x.id===c.coicop)||{});
        return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:var(--surface2);border-radius:8px;margin-bottom:4px">
          <span>${c.icon}</span>
          <span style="font-size:.82rem;flex:1">${c.name}</span>
          <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color||'#aaa'};color:#000;font-size:.66rem;font-weight:800">${c.coicop}</span>
          <span style="font-size:.72rem;color:var(--text3)">${g.name||''}</span>
          <span style="font-size:.68rem;color:#a8aec8">${c.users.length} už.</span>
        </div>`;
      }).join('')}
      `:''}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

async function assignCoicop(catId, catName) {
  const sel = document.getElementById('coicop-sel-'+catId);
  if(!sel||!sel.value){ alert('Vyber COICOP skupinu'); return; }
  const coicopNum = parseInt(sel.value);
  const btn = sel.parentElement?.querySelector('button');
  if(btn){ btn.textContent='⏳ Ukládám...'; btn.disabled=true; }

  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');

    // 1. Ulož do admin_coicop_overrides (globální přehled)
    await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/admin_coicop_overrides/${catId}.json?auth=${idToken}`,
      {method:'PUT', body:JSON.stringify({coicop:coicopNum, name:catName, assignedAt:Date.now()})}
    );

    // 2. Propsat COICOP všem uživatelům s kategorií (S12.1c: shallow + per-uid categories)
    const catsByUid = await adminFetchUserCategories(idToken);

    let updatedCount = 0;
    const patches = [];

    Object.entries(catsByUid).forEach(([uid, cats]) => {
      const catIdx = cats.findIndex(c=>c.id===catId);
      if(catIdx === -1) return; // tento uživatel kategorii nemá

      // PATCH – zapíše jen pole coicop do konkrétní kategorie (index v poli)
      patches.push(
        fetch(
          `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/data/categories/${catIdx}/coicop.json?auth=${idToken}`,
          {method:'PUT', body:JSON.stringify(coicopNum)}
        )
      );
      updatedCount++;
    });

    await Promise.all(patches);

    const g = COICOP_GROUPS_DEF.find(x=>x.id===coicopNum)||{};
    alert(`✅ Hotovo! Kategorie „${catName}" přiřazena do COICOP ${coicopNum} (${g.name||''}). Aktualizováno ${updatedCount} uživatelů.`);
    loadCustomCatsNoCoicop();
  } catch(e) {
    alert('Chyba: '+e.message);
    if(btn){ btn.textContent='Přiřadit'; btn.disabled=false; }
  }
}

// ══════════════════════════════════════════════════════
//  S12.1: PODKATEGORIE BEZ COICOP – audit + hromadné domapování
//  Skenuje users.json: uživatelské podkategorie, které nemají
//  override v DEFAULT_CATEGORIES.coicopOverrides ani ve Firebase
//  c.coicopOverrides. Přiřazení zapíše override všem uživatelům.
// ══════════════════════════════════════════════════════
function _subFbKeyOk(sub){ return !/[.#$\/\[\]]/.test(sub); } // Firebase klíč nesmí obsahovat .#$/[]

async function loadCustomSubsNoCoicop() {
  const el = document.getElementById('adminCustomSubs'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const catsByUid = await adminFetchUserCategories(idToken); // S12.1c: shallow místo celé DB
    if(!Object.keys(catsByUid).length) { el.innerHTML = '<div class="card-body">Žádná data</div>'; return; }

    const defMap = Object.fromEntries(DEFAULT_CATEGORIES.map(d=>[d.id,d]));
    const pending = {}; // key = catId+'|'+sub
    const mapped = [];
    let skippedBadKey = 0;

    Object.entries(catsByUid).forEach(([uid, cats]) => {
      cats.forEach(c => {
        if(!c || !c.id || !c.name || !Array.isArray(c.subs)) return;
        if(c.type === 'income') return; // S12.1: příjmy do COICOP (spotřeba) nepatří
        const def = defMap[c.id];
        const defOv = def?.coicopOverrides || {};
        const usrOv = c.coicopOverrides || {};
        const parentCoicop = (c.coicop!==undefined&&c.coicop!==null) ? c.coicop : (def?.coicop ?? null);
        const isShared = !!(def?.shared || c.shared);
        c.subs.forEach(sub => {
          if(!sub || typeof sub!=='string') return;
          if(defOv[sub] !== undefined) return;        // má default override
          if(usrOv[sub] !== undefined && usrOv[sub] !== null) { mapped.push({cat:c, sub, num:usrOv[sub]}); return; } // domapováno (i 0)
          // S12.1: u SDÍLENÝCH kategorií je dědění rodiče nejednoznačné → defaultní suby bez overridu TAKÉ do auditu
          if(def && def.subs && def.subs.includes(sub) && !isShared) return;
          if(!_subFbKeyOk(sub)){ skippedBadKey++; return; }
          const key = c.id+'|'+sub;
          if(!pending[key]) pending[key] = {catId:c.id, catName:c.name, icon:c.icon||'📦', sub, parentCoicop, users:[]};
          if(!pending[key].users.includes(uid)) pending[key].users.push(uid);
        });
      });
    });

    const coicopOptions = COICOP_GROUPS_DEF.map(g=>`<option value="${g.id}">${g.id} – ${g.name}</option>`).join('');
    const rows = Object.entries(pending);
    if(!rows.length){
      el.innerHTML = `<div class="card-body" style="color:var(--income);font-size:.82rem">✅ Všechny uživatelské podkategorie jsou pokryté (default override / domapováno / dědí rodiče).${skippedBadKey?` <span style="color:var(--text3)">(${skippedBadKey} přeskočeno – nepovolené znaky v názvu)</span>`:''}</div>`;
      return;
    }
    el.innerHTML = `<div class="card-body">
      <div style="font-size:.72rem;font-weight:700;color:var(--expense);text-transform:uppercase;margin-bottom:8px">❌ K domapování (${rows.length})</div>
      ${rows.sort((a,b)=>b[1].users.length-a[1].users.length).map(([key,p])=>{
        const selId = 'subcoicop-'+btoa(unescape(encodeURIComponent(key))).replace(/[^a-zA-Z0-9]/g,'');
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:1.05rem">${p.icon}</span>
          <span style="font-size:.78rem;color:#a8aec8">${p.catName}</span>
          <span style="font-weight:700;font-size:.84rem;flex:1">↳ ${p.sub}</span>
          ${p.parentCoicop?`<span style="font-size:.68rem;color:#a8aec8" title="Bez overridu se počítá do oddílu rodiče">dědí ${p.parentCoicop}</span>`:'<span style="font-size:.68rem;color:var(--expense)">rodič bez COICOP!</span>'}
          <span style="font-size:.7rem;color:var(--text3)">${p.users.length} už.</span>
          <select id="${selId}" class="fs" style="font-size:.74rem;padding:4px 8px;width:210px">
            <option value="">— vybrat oddíl —</option>
            <option value="0">0 – mimo COICOP (příjem/převod/spoření)</option>
            ${coicopOptions}
          </select>
          <button class="btn btn-ghost btn-sm" onclick="aiSuggestCoicopAdmin('${selId}','${p.sub.replace(/'/g,"\\'")}','${p.catName.replace(/'/g,"\\'")}',this)" title="AI Rádce navrhne oddíl">🤖</button>
          <button class="btn btn-accent btn-sm" onclick="assignSubCoicop('${p.catId}','${p.sub.replace(/'/g,"\\'")}','${selId}')">Přiřadit</button>
          <span class="ai-coicop-reason" style="flex-basis:100%;font-size:.68rem;color:#a8aec8"></span>
        </div>`;
      }).join('')}
      ${mapped.length?`
      <div style="font-size:.72rem;font-weight:700;color:var(--income);text-transform:uppercase;margin:12px 0 8px">✅ Již domapováno (${mapped.length})</div>
      ${mapped.slice(0,30).map(m=>{
        const g=m.num===0?{name:'mimo COICOP',color:'#7e84a0'}:(COICOP_GROUPS_DEF.find(x=>x.id===m.num)||{});
        return `<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--surface2);border-radius:8px;margin-bottom:4px;font-size:.78rem">
          <span>${m.cat.icon||'📦'}</span><span style="color:#a8aec8">${m.cat.name}</span><span style="flex:1">↳ ${m.sub}</span>
          <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color||'#aaa'};color:#000;font-size:.66rem;font-weight:800">${m.num}</span>
        </div>`;
      }).join('')}`:''}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════════════
//  S12.1: AI RÁDCE PRO COICOP MAPOVÁNÍ (admin)
//  Navrhne oddíl 0-13 přes Claude proxy worker, předvyplní
//  select a zobrazí zdůvodnění. Admin jen potvrdí Přiřadit.
// ══════════════════════════════════════════════════════
async function aiSuggestCoicopAdmin(selId, name, parentName, btn){
  const sel = document.getElementById(selId); if(!sel) return;
  const reasonEl = sel.parentElement?.querySelector('.ai-coicop-reason');
  const orig = btn ? btn.textContent : '';
  if(btn){ btn.textContent='⏳'; btn.disabled=true; }
  try {
    const token = await window._currentUser?.getIdToken?.();
    if(!token) throw new Error('Nepřihlášen');
    const workerUrl = (typeof WORKER_URL !== 'undefined') ? WORKER_URL : 'https://misty-limit-0523.bc-milda.workers.dev';
    const prompt = `Zařaď položku rodinného rozpočtu do klasifikace CZ-COICOP 2024 (oddíly 1–13).
Položka: "${name}"${parentName?` (podkategorie kategorie "${parentName}")`:''}
Oddíly: 1 Potraviny a nealko nápoje, 2 Alkohol a tabák, 3 Odívání a obuv, 4 Bydlení, voda, energie, 5 Vybavení a zařízení domácnosti, 6 Zdraví, 7 Doprava, 8 Informace a telekomunikace, 9 Rekreace, sport a kultura, 10 Vzdělávání, 11 Stravovací a ubytovací služby, 12 Pojištění a finanční služby, 13 Osobní péče a ostatní zboží a služby.
Pokud položka NENÍ spotřební výdaj (příjem, vnitřní převod, spoření/investice), vrať 0.
Odpověz POUZE JSON bez dalšího textu: {"oddil": <0-13>, "duvod": "<max 12 slov česky>"}`;
    const res = await fetch(workerUrl, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ type:'chat', payload:{ messages:[{role:'user', content: prompt}] } })
    });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    let raw = (data.content?.[0]?.text || '').replace(/```json|```/g,'').trim();
    const i0 = raw.indexOf('{');
    if(i0 >= 0) raw = raw.slice(i0, raw.lastIndexOf('}')+1);
    const j = JSON.parse(raw);
    const num = parseInt(j.oddil);
    if(!(num >= 0 && num <= 13)) throw new Error('AI vrátilo neplatný oddíl');
    sel.value = String(num);
    const g = num === 0 ? {name:'mimo COICOP'} : (COICOP_GROUPS_DEF.find(x=>x.id===num)||{});
    if(reasonEl) reasonEl.textContent = `🤖 ${num} – ${g.name||''}: ${j.duvod||''}`;
  } catch(e) {
    if(reasonEl) reasonEl.textContent = '🤖 Chyba: '+e.message;
  } finally {
    if(btn){ btn.textContent = orig || '🤖'; btn.disabled = false; }
  }
}

async function assignSubCoicop(catId, sub, selId) {
  const sel = document.getElementById(selId);
  if(!sel || !sel.value){ alert('Vyber COICOP oddíl'); return; }
  const num = parseInt(sel.value);
  const btn = sel.parentElement?.querySelector('button');
  if(btn){ btn.textContent='⏳'; btn.disabled=true; }
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const base = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';

    // 1) Globální záznam (audit)
    await fetch(`${base}/admin_coicop_overrides/subs/${catId}__${encodeURIComponent(sub).replace(/%/g,'_')}.json?auth=${idToken}`,
      {method:'PUT', body:JSON.stringify({catId, sub, coicop:num, assignedAt:Date.now()})});

    // 2) Propsat override všem uživatelům s touto kategorií+podkategorií (S12.1c: shallow)
    const catsByUid = await adminFetchUserCategories(idToken);
    let updated = 0; const patches = [];
    Object.entries(catsByUid).forEach(([uid, cats]) => {
      const idx = cats.findIndex(c=>c && c.id===catId && Array.isArray(c.subs) && c.subs.includes(sub));
      if(idx === -1) return;
      patches.push(fetch(`${base}/users/${uid}/data/categories/${idx}/coicopOverrides/${sub}.json?auth=${idToken}`,
        {method:'PUT', body:JSON.stringify(num)}));
      updated++;
    });
    await Promise.all(patches);
    const g = num===0 ? {name:'mimo COICOP'} : (COICOP_GROUPS_DEF.find(x=>x.id===num)||{});
    alert(`✅ Podkategorie „${sub}" → COICOP ${num} (${g.name||''}). Aktualizováno ${updated} uživatelů.`);
    loadCustomSubsNoCoicop();
  } catch(e) {
    alert('Chyba: '+e.message);
    if(btn){ btn.textContent='Přiřadit'; btn.disabled=false; }
  }
}

// ── TODO-086: Doporučení – přehled co uživatelé mění ──
async function loadSuggestionOverrides() {
  const el = document.getElementById('adminSuggestions'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nepřihlášen');
    const res = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/suggestionOverrides.json?auth=${idToken}`);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!data || !Object.keys(data).length) {
      el.innerHTML = '<div class="card-body" style="color:var(--text2);font-size:.8rem">✅ Žádné změny doporučení zatím. Uživatelé přijímají doporučené kategorie.</div>';
      return;
    }
    // Seřaď dle celkového počtu změn
    const items = Object.entries(data).map(([key, info]) => {
      const chosenList = Object.values(info.chosen||{}).sort((a,b)=>b.count-a.count);
      const totalChanges = chosenList.reduce((a,c)=>a+c.count,0);
      return {key, suggested: info.suggested, chosenList, totalChanges};
    }).sort((a,b)=>b.totalChanges-a.totalChanges);

    el.innerHTML = `<div class="card-body">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:12px">${items.length} názvů transakcí · celkem ${items.reduce((a,i)=>a+i.totalChanges,0)} změn</div>
      ${items.map(item => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:4px">📝 ${item.key.replace(/_/g,' ')}</div>
          <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">Doporučeno: <span style="color:#fbbf24">🤖 ${item.suggested}</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${item.chosenList.map(c => `
              <div style="display:flex;align-items:center;gap:5px;padding:4px 10px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
                <span style="font-size:.76rem;color:var(--text)">${c.name}</span>
                <span style="font-size:.7rem;color:#ec4899;font-weight:700">${c.count}×</span>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

// ── Komunitní Item Tagy ──
async function loadCommunityItemTags() {
  const el = document.getElementById('adminItemTags'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nepřihlášen');
    const res = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/itemTags.json?auth=${idToken}`);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();

    // Načti validační statusy
    const valRes = await fetch(`https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/itemTagValidation.json?auth=${idToken}`);
    const valData = valRes.ok ? (await valRes.json()||{}) : {};
    if(!data || !Object.keys(data).length) {
      el.innerHTML = '<div class="card-body" style="color:var(--text2);font-size:.8rem">✅ Žádné komunitní tagy zatím.</div>';
      return;
    }
    // Seřadit dle celkového počtu (nejpopulárnější)
    const items = Object.entries(data).map(([itemKey, tags]) => {
      const tagList = Object.entries(tags||{}).map(([tag, cnt]) => {
        const status = valData?.[itemKey]?.[tag]?.status || null;
        return {tag, cnt, status};
      }).sort((a,b)=>b.cnt-a.cnt);
      const totalCnt = tagList.reduce((a,t)=>a+t.cnt, 0);
      return {itemKey, tagList, totalCnt};
    }).sort((a,b)=>b.totalCnt-a.totalCnt);

    el.innerHTML = `<div class="card-body">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:12px">${items.length} položek s tagy · celkem ${items.reduce((a,i)=>a+i.totalCnt,0)} přiřazení</div>
      ${items.map(item => `
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:.85rem;font-weight:600;color:var(--text);margin-bottom:6px">📦 ${item.itemKey.replace(/_/g,' ')}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${item.tagList.map(({tag, cnt, status}) => {
              const isApproved = status==='approved';
              const isRejected = status==='rejected';
              const checkColor = isApproved ? 'var(--income)' : '#6b7280';
              return `<div style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:var(--surface2);border-radius:8px;border:1px solid ${isApproved?'var(--income)':isRejected?'var(--expense)':'var(--border)'}">
                <span style="font-size:.8rem;color:var(--income);font-weight:600">${tag}</span>
                <span style="font-size:.7rem;color:#ec4899;font-weight:700">(${cnt}×)</span>
                <button onclick="validateItemTag('${item.itemKey}','${tag}','approved')" class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:.75rem;color:${checkColor};border:1px solid ${checkColor}" title="${isApproved?'Schváleno':'Schválit'}">✓</button>
                <button onclick="validateItemTag('${item.itemKey}','${tag}','rejected')" class="btn btn-ghost btn-sm" style="padding:1px 6px;font-size:.75rem;color:var(--expense);border:1px solid var(--expense)" title="Odmítnout">✕</button>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    </div>`;
  } catch(e) {
    el.innerHTML = `<div class="card-body" style="color:var(--expense);font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

async function validateItemTag(itemKey, tag, action) {
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    const fireTag = tag.replace(/[.#$/\[\]]/g,'_');
    // Přidej status k tagu
    await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/community/itemTagValidation/${itemKey}/${fireTag}.json?auth=${idToken}`,
      {method:'PUT', body:JSON.stringify({status:action, validatedBy:window._currentUser?.uid, at:Date.now()})}
    );
    alert(`${action==='approved'?'✅ Schváleno':'❌ Odmítnuto'}: ${itemKey.replace(/_/g,' ')} → ${tag}`);
    loadCommunityItemTags();
  } catch(e) { alert('Chyba: '+e.message); }
}

async function loadLeads() {
  try {
    const url = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/leads.json';
    const idToken = await window._currentUser?.getIdToken?.();
    const res = await fetch(url + (idToken ? '?auth='+idToken : ''));
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!data) { document.getElementById('adminLeadsTable').innerHTML = '<div class="empty"><div class="et">Žádné leady zatím</div></div>'; return; }
    _cachedLeads = Object.entries(data).map(([id,lead])=>({id,...lead})).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
    renderLeadsTable(_cachedLeads);
  } catch(e) {
    document.getElementById('adminLeadsTable').innerHTML =
      `<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">Chyba: ${e.message}</div></div>`;
  }
}

function renderLeadsTable(leads) {
  const today = new Date().toISOString().slice(0,10);
  const thisWeek = new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10);
  const statsEl = document.getElementById('adminStats');
  if(statsEl) {
    const todayCount = leads.filter(l=>l.date===today).length;
    const weekCount = leads.filter(l=>(l.date||'')>=thisWeek).length;
    const withPhone = leads.filter(l=>l.phone).length;
    statsEl.innerHTML = `
      <div class="stat-card income"><div class="stat-label">Celkem</div><div class="stat-value up">${leads.length}</div></div>
      <div class="stat-card bank"><div class="stat-label">Tento týden</div><div class="stat-value bankc">${weekCount}</div></div>
      <div class="stat-card balance"><div class="stat-label">S telefonem</div><div class="stat-value">${withPhone}</div></div>`;
  }
  const tableEl = document.getElementById('adminLeadsTable');
  if(!leads.length) { tableEl.innerHTML = '<div class="empty"><div class="et">Žádné výsledky</div></div>'; return; }
  tableEl.innerHTML = leads.map(l => buildLeadCard(l)).join('');
}

function buildLeadCard(l) {
  const statusColor = l.status==='contacted'?'var(--income)':l.status==='done'?'var(--text3)':'var(--debt)';
  const statusLabel = l.status==='contacted'?'✅ Kontaktován':l.status==='done'?'☑️ Vyřešeno':'🔔 Nový';
  const loanType = {personal:'Spotřebitelský',mortgage:'Hypotéka',nonbank:'Nebankovní',credit:'Kreditní karta',ico:'IČO',friend:'Kamarád'}[l.loanType]||l.loanType||'';
  return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:.95rem">${l.name||'–'}</span>
          <span style="font-size:.68rem;padding:2px 8px;border-radius:10px;background:${statusColor}22;color:${statusColor};font-weight:600">${statusLabel}</span>
          <span style="font-size:.7rem;color:var(--text3)">${l.date||''}</span>
        </div>
        <div style="display:flex;gap:14px;flex-wrap:wrap">
          ${l.phone?`<a href="tel:${l.phone}" style="color:var(--income);text-decoration:none;font-size:.84rem;font-weight:600">📞 ${l.phone}</a>`:''}
          ${l.email?`<a href="mailto:${l.email}" style="color:var(--bank);text-decoration:none;font-size:.84rem">✉️ ${l.email}</a>`:''}
        </div>
        ${l.loanAmount?`<div style="font-size:.76rem;color:var(--text3);margin-top:5px">💰 ${fmt(l.loanAmount)} Kč${l.loanRate?' · '+l.loanRate+'% p.a.':''}${loanType?' · '+loanType:''}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap">
        ${l.phone?`<button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${l.phone}')" title="Kopírovat tel.">📋</button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="setLeadStatus('${l.id}','contacted')" title="Označit jako kontaktován" style="color:var(--income)">✅</button>
        <button class="btn btn-ghost btn-sm" onclick="setLeadStatus('${l.id}','done')" title="Vyřešeno" style="color:var(--text3)">☑️</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteLead('${l.id}')" title="Smazat">✕</button>
      </div>
    </div>
  </div>`;
}

function filterLeads(query) {
  const q = query.toLowerCase();
  const filtered = q ? _cachedLeads.filter(l=>
    (l.name||'').toLowerCase().includes(q)||
    (l.phone||'').includes(q)||
    (l.email||'').toLowerCase().includes(q)
  ) : _cachedLeads;
  const tableEl = document.getElementById('adminLeadsTable');
  if(tableEl) tableEl.innerHTML = filtered.map(l=>buildLeadCard(l)).join('');
}

async function setLeadStatus(id, status) {
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    const url = `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/leads/${id}/status.json`+(idToken?'?auth='+idToken:'');
    await fetch(url, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(status)});
    const lead = _cachedLeads.find(l=>l.id===id);
    if(lead) { lead.status = status; renderLeadsTable(_cachedLeads); }
  } catch(e) { alert('Chyba: '+e.message); }
}

function exportLeadsExcel() {
  if(!_cachedLeads.length) { alert('Žádné leady'); return; }
  const header = 'Datum;Jméno;Telefon;Email;Výše úvěru (Kč);Úrok %;Typ;Příjem (Kč);Status\n';
  const rows = _cachedLeads.map(l=>
    [l.date||'',l.name||'',l.phone||'',l.email||'',l.loanAmount||'',l.loanRate||'',l.loanType||'',l.userIncome||'',l.status||'nový'].join(';')
  ).join('\n');
  const blob = new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='leady-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function copyAllLeads() {
  if(!_cachedLeads.length) { alert('Žádné leady'); return; }
  const text = _cachedLeads.map((l,i)=>
    `${i+1}. ${l.name||'–'} | 📞 ${l.phone||'–'} | ✉️ ${l.email||'–'} | ${l.date||''}`
  ).join('\n');
  navigator.clipboard.writeText(text)
    .then(()=>alert('✅ Zkopírováno '+_cachedLeads.length+' kontaktů'))
    .catch(()=>alert('Kopírování selhalo'));
}

async function deleteLead(id) {
  if(!confirm('Smazat tento lead?')) return;
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    const url = `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/leads/${id}.json`+(idToken?'?auth='+idToken:'');
    await fetch(url,{method:'DELETE'});
    _cachedLeads = _cachedLeads.filter(l=>l.id!==id);
    renderLeadsTable(_cachedLeads);
  } catch(e) { alert('Chyba: '+e.message); }
}


// ══════════════════════════════════════════════════════
//  KOMUNITNÍ PŘEHLED
// ══════════════════════════════════════════════════════
const COMMUNITY_MONTH_KEY = (month, year) => {
  // Pokud zadán měsíc/rok, použij je; jinak aktuální
  const m = (month !== undefined) ? month : (typeof S !== 'undefined' ? S.curMonth : new Date().getMonth());
  const y = (year !== undefined) ? year : (typeof S !== 'undefined' ? S.curYear : new Date().getFullYear());
  return `${y}-${String(m+1).padStart(2,'0')}`;
};

async function publishCommunityStats(D) {
  // FIX-278 (S20): SOUHLAS SE SDÍLENÍM.
  //   Dřív tu stálo:
  //       const optOut = document.getElementById('settingCommunity');
  //       if(optOut && !optOut.checked) return;
  //   Jenže element 'settingCommunity' NIKDY NEEXISTOVAL – nebyl v app.html ani
  //   v Nastavení, byl to jediný výskyt toho id v celém projektu. getElementById
  //   proto vždy vracelo null, podmínka `optOut && …` byla vždy nepravdivá a
  //   funkce se NIKDY nezastavila: příjem, výdaje po COICOP a míra úspor se
  //   odesílaly při každém uložení, všem, bez možnosti to vypnout.
  //   Souhlas se teď čte z ULOŽENÉHO nastavení, ne z DOM (ten na jiné stránce
  //   ani neexistuje). Chybějící hodnota = NESOUHLAS (SKILL 31: absence dat
  //   není souhlas), takže se nepublikuje, dokud to uživatel výslovně nezapne.
  if (typeof _settings === 'undefined' || !_settings || _settings.community !== true) return;
  if(!window._currentUser || window._currentUser.isAnonymous) return;

  const txs = getTx(S.curMonth, S.curYear, D);
  const baseIncome = computeBaseIncome(D);
  if(!baseIncome || txs.length < 3) return; // nedostatek dat

  const monthKey = COMMUNITY_MONTH_KEY();
  const uid = window._currentUser.uid;

  // Spočítej výdaje dle COICOP oddílů
  // S17.14 (FIX-213, Milan): DŘÍV se posílaly NÁZVY KATEGORIÍ ("Jídlo & Pití"), zatímco čtecí
  // strana očekává COICOP ID (1–13) → mapování na oficiální názvy selhávalo a v přehledu se
  // objevovalo "COICOP Jídlo & Pití". Zároveň se sčítalo bez txCZK a bez vyloučení přesunů/
  // splitů (stejná třída chyby jako FIX-212), takže cizí měny i přesuny nadhodnocovaly komunitu.
  const catStats = {};
  txs.filter(t => t.type==='expense' && !t.splitParent && !t.isBalancing &&
                  !(typeof isTransferTx==='function' && isTransferTx(t)))
     .forEach(t => {
       const cid = (typeof mapToCOICOP==='function') ? (mapToCOICOP(t)||{}).coicopId : null;
       if(cid==null) return;
       const amt = (typeof txCZK==='function') ? txCZK(t, D) : (t.amount||t.amt||0);
       catStats[cid] = Math.round((catStats[cid]||0) + amt);
     });

  const totalExp = expSum(txs);
  const savingRate = baseIncome > 0 ? Math.round((baseIncome-totalExp)/baseIncome*100) : 0;

  try {
    // Ulož příspěvek uživatele (přepíše předchozí – žádná duplikace)
    await _set(_ref(_db, `community/${monthKey}/users/${uid}`), {
      cats: catStats,
      income: Math.round(baseIncome),
      totalExp: Math.round(totalExp),
      savingRate,
      updatedAt: Date.now()
    });
  } catch(e) {
    console.log('Community publish skipped:', e.message);
  }
}

// Session 10: režim srovnání s ČSÚ – 'osoba' (Kč/os/měs) nebo 'domacnost' (× OECD ekvivalent)
let _csuMode = 'domacnost';
function setCsuMode(m){ _csuMode = m; if(typeof renderKomunita==='function') renderKomunita(); }
// rozklikávání oddílů v ČSÚ tabulce (zobrazení skupin 2. úrovně)
const _csuExpanded = new Set();
const _csuExpGroup = new Set(); // Session 10: rozbalené skupiny (3. úroveň – třídy)
function csuToggleDiv(id){ id=parseInt(id); if(_csuExpanded.has(id))_csuExpanded.delete(id); else _csuExpanded.add(id); if(typeof renderKomunita==='function') renderKomunita(); }
function csuToggleGroup(code){ if(_csuExpGroup.has(code))_csuExpGroup.delete(code); else _csuExpGroup.add(code); if(typeof renderKomunita==='function') renderKomunita(); }
// Session 10: přejdi do Nastavení a odscrolluj přímo na Složení domácnosti + zvýrazni.
function goToHouseholdSettings(){
  if(typeof showPage==='function') showPage('nastaveni');
  setTimeout(()=>{
    const el=document.getElementById('settingsHousehold');
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.style.transition='box-shadow .3s';
      el.style.boxShadow='0 0 0 2px var(--income)';
      setTimeout(()=>{ el.style.boxShadow=''; }, 1800);
    }
  }, 250);
}
// Session 10: přejdi na funkční stránku Sdílení & Partneři.
function goToSharing(){
  if(typeof showPage==='function') showPage('sdileni');
}

async function renderKomunita() {
  const el = document.getElementById('komunitaContent'); if(!el) return;

  // Throttle – zabrání blikání při rychlém přepínání měsíce
  clearTimeout(window._komunitaThrottle);
  window._komunitaThrottle = setTimeout(async () => {
    await _renderKomunitaImpl(el);
  }, 120);
}

async function _renderKomunitaImpl(el) {
  // FIX-278 (S20): sdílení je nově vypnuté, dokud ho uživatel nezapne. Karta
  //   to musí ŘÍCT – prázdné srovnání bez vysvětlení vypadá jako rozbitá appka
  //   (FIX-214). Zapnout jde rovnou odsud, ať uživatel nehledá v Nastavení.
  if (typeof _settings === 'undefined' || !_settings || _settings.community !== true) {
    window._komunitaLoaded = true;
    el.innerHTML = `<div class="card"><div class="card-body">
      <div class="empty" style="padding:32px">
        <div class="ei">🌍</div>
        <div class="et">Srovnání s ostatními je vypnuté</div>
        <div style="font-size:.84rem;color:var(--text2);max-width:460px;margin:10px auto 0;line-height:1.6">
          Komunitní přehled porovnává tvoje výdaje s ostatními uživateli. Aby to šlo,
          musí se odesílat <strong>měsíční příjem, celkové výdaje, míra úspor a rozpad
          výdajů po skupinách COICOP</strong> — ne jednotlivé transakce, názvy obchodů
          ani účtenky.
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-accent btn-sm" onclick="setCommunityShare(true).then(()=>renderKomunita())">
            Zapnout sdílení a zobrazit srovnání
          </button>
        </div>
        <div style="font-size:.74rem;color:var(--text3);margin-top:10px">
          Kdykoli vypneš v Nastavení → Data &amp; Soukromí. Odeslané údaje se pak smažou.
        </div>
      </div>
    </div></div>`;
    return;
  }

  // Session 10: loading placeholder jen při prvním načtení (jinak blikání při
  // přepínání osoba/domácnost nebo rozbalování oddílů).
  if(!window._komunitaLoaded){
    el.innerHTML = `<div class="card"><div class="card-body"><div class="empty"><div class="et">⏳ Načítám data...</div></div></div></div>`;
  }

  // ── ČSÚ data 2024 – průměry na domácnost/měsíc ──
  // Zdroj: ČSÚ Statistika rodinných účtů 2024, srovnejto.cz
  // Hodnoty jsou přepočteny na průměrnou domácnost (2,4 osoby)
  const CSU = {
    year: 2024,
    avgIncome: 52800,   // průměrný čistý příjem domácnosti/měs
    avgExp: 44200,      // průměrné výdaje domácnosti/měs
    savingRate: 16,     // průměrná míra úspor %
    cats: [
      {name:'🏠 Bydlení & energie',  avg: 12900, note:'nájem/hypotéka, energie, voda'},
      {name:'🛒 Potraviny & nápoje', avg: 8000,  note:'domácí příprava jídla'},
      {name:'🚗 Doprava',            avg: 4500,  note:'auto, MHD, pohonné hmoty'},
      {name:'🍽️ Restaurace & kavárny',avg: 2400, note:'stravování mimo domov'},
      {name:'🎭 Rekreace & kultura', avg: 2800,  note:'dovolená, sport, zábava'},
      {name:'👗 Oblečení & obuv',    avg: 1800,  note:'móda a doplňky'},
      {name:'💊 Zdraví & léky',      avg: 1400,  note:'léky, lékaři, hygiena'},
      {name:'📱 Komunikace',         avg: 1100,  note:'telefon, internet, TV'},
      {name:'🎓 Vzdělávání',         avg: 600,   note:'kurzy, literatura, školné'},
      {name:'🛡️ Pojištění',          avg: 2200,  note:'životní, majetkové, autopojištění'},
    ]
  };

  const D = getData();
  const myTxs = getTx(S.curMonth, S.curYear, D);
  // Pouze výdaje (žádné příjmy ani převody)
    // FIX-266 (S19, nahlásil Milan): TVOJE ČÍSLO SE POČÍTALO JINAK NEŽ KOMUNITNÍ.
    //   publishCommunityStats() odesílá součet přes txCZK() a BEZ přesunů a splitů.
    //   Tady se sčítalo `t.amount || t.amt` a přesuny i rozdělené transakce se
    //   započítávaly. Věta „Tvoje výdaje 32 000 · průměr komunity 24 000" tak
    //   srovnávala tvoje nafouknuté číslo s čistým průměrem ostatních – uživatel
    //   vypadal hůř, než ve skutečnosti je. Obě strany musí měřit stejně.
    const myExpTxs = myTxs.filter(t => t.type === 'expense' && !t.isBalancing
                                     && !t.splitParent && !isTransferTx(t));
    const myExp = myExpTxs.reduce((a,t)=>a+Math.abs(txCZK(t,D)),0);
  const myIncome = incSum(myTxs);
  const myBaseIncome = computeBaseIncome(D) || myIncome || 1;
  const mySaving = myBaseIncome > 0 ? Math.round((myBaseIncome - myExp) / myBaseIncome * 100) : 0;

  // Session 10: rodinný souhrn – v režimu Domácnost přičti výdaje sdílených partnerů.
  // partnerData (app.js) drží data partnerů přidaných na stránce „Sdílení & Partneři".
  let familyMemberCount = 1;
  let familyExp = myExp;
  try {
    const pd = (typeof partnerData !== 'undefined') ? partnerData : {};
    Object.values(pd).forEach(p => {
      if(!p || !p.data) return;
      familyMemberCount++;
      const pTxs = getTx(S.curMonth, S.curYear, p.data) || [];
        // FIX-266: totéž pro rodinný souhrn – partnerova data musí měřit stejně
        const pExp = pTxs.filter(t => t.type === 'expense' && !t.isBalancing
                                    && !t.splitParent && !isTransferTx(t))
                         .reduce((a,t)=>a+Math.abs(txCZK(t, p.data)),0);
      familyExp += pExp;
    });
  } catch(e) {}
  const hasFamily = familyMemberCount > 1;

  // Načti komunitní data z Firebase pro zvolený měsíc
  let communityData = null;
  try {
    const monthKey = COMMUNITY_MONTH_KEY(S.curMonth, S.curYear); // ← zohledňuje zvolený měsíc
    const snap = await _get(_ref(_db, `community/${monthKey}/users`));
    if(snap.exists()) {
      const allUsers = Object.values(snap.val());
      // S19 (TODO-225, Milan): MEDIÁN místo průměru.
      //   Jeden uživatel s hypotékou 40 000 posunul „průměrné bydlení" všem
      //   ostatním. U příjmů a výdajů, kde je rozdělení silně zešikmené, ukazuje
      //   medián typického člověka, ne aritmetický střed mezi extrémy.
      //   ⚠️ Milan výslovně NECHCE minimální počet uživatelů: „1 uživatel nebo
      //   1000, je to ok." Při jediném přispěvateli je medián roven jeho hodnotě.
      const _med = arr => {
        const a = arr.filter(x => typeof x === 'number' && isFinite(x)).sort((x,y)=>x-y);
        if(!a.length) return 0;
        const m = a.length >> 1;
        return a.length % 2 ? Math.round(a[m]) : Math.round((a[m-1] + a[m]) / 2);
      };
      const catVals = {}, catCounts = {};
      const expVals = [], incVals = [], savVals = [];
      allUsers.forEach(u => {
        expVals.push(u.totalExp||0);
        incVals.push(u.income||0);
        savVals.push(u.savingRate||0);
        Object.entries(u.cats||{}).forEach(([cat,amt])=>{
          (catVals[cat] = catVals[cat] || []).push(amt);
          catCounts[cat]=(catCounts[cat]||0)+1;
        });
      });
      communityData = {
        count: allUsers.length,
        avgExp: _med(expVals),
        avgIncome: _med(incVals),
        avgSaving: _med(savVals),
          statLabel: 'medián',
        cats: Object.entries(catVals).map(([coicopId,vals])=>{
          // Komunita nahrává COICOP klíče (1-13). Namapuj na oficiální název divize.
          // S17.14 (FIX-213): starší záznamy posílaly NÁZVY kategorií – ty přeskoč, aby
          // se v přehledu neobjevovalo "COICOP Jídlo & Pití".
          if(!/^\d+$/.test(String(coicopId))) return null;
          const _grp = (window.COICOP_GROUPS_DEF||[]).find(g=>String(g.id)===String(coicopId));
          return {
            cat: _grp ? `${_grp.icon||''} ${_grp.name}` : `COICOP ${coicopId}`,
            coicopId: Number(coicopId),
            avg:_med(vals), count:catCounts[coicopId]
          };
        }).filter(Boolean).sort((a,b)=>b.avg-a.avg)
      };
    }
  } catch(e) {}

  window._komunitaLoaded = true; // Session 10: další rendery už bez loading flash
  el.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(74,222,128,.05));border:1px solid rgba(96,165,250,.2);border-radius:var(--radius);padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">🌍 Komunitní přehled · ${CZ_M[S.curMonth]} ${S.curYear}</div>
      <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800">Jak si stojím vs průměr ČR?</div>
      <div style="font-size:.74rem;color:var(--text3);margin-top:4px">Statistiky ČSÚ ${CSU.year} + anonymní data uživatelů FinanceFlow</div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <button class="tx-filt-btn active" id="ktab-coicop" onclick="switchKomunitaTab('coicop',this)">🔢 Já vs. ČSÚ</button>
      <button class="tx-filt-btn" id="ktab-app" onclick="switchKomunitaTab('app',this)">👥 Já vs. komunita ${communityData?'('+communityData.count+')':''}</button>
    </div>

    <!-- TAB: COICOP přehled (nový, přesný) -->
    <div id="ktab-coicop-content">
      ${(() => {
        const {cats: myCats, unassigned} = computeCoicopAggregates(myTxs, D);
        const totalAssigned = Object.values(myCats).reduce((a,v)=>a+v,0);
        const totalExp = Math.round(totalAssigned + unassigned);
        const groups = COICOP_GROUPS_DEF||[];
        // Session 10: OECD ekvivalent domácnosti z nastavení (2 dosp = 1,5 atd.)
        const oecd = (typeof calcOECD==='function')
          ? calcOECD(_settings?.household_adults||2, _settings?.household_ch013||0, _settings?.household_ch14||0)
          : 1.5;
        // csuRef(g): referenční ČSÚ částka dle režimu osoba/domácnost
        const csuRef = g => _csuMode==='osoba' ? (g.avg_osoba||0) : Math.round((g.avg_osoba||0)*oecd);

        if(totalExp <= 0) return `<div class="card"><div class="card-body"><div class="empty"><div class="et">Žádné výdaje v ${CZ_M[S.curMonth]} ${S.curYear}</div></div></div></div>`;

        const rows = groups.map(g => {
          const myAmt = Math.round(myCats[g.id]||0);
          const csuAmt = csuRef(g);
          const diff = myAmt > 0 ? myAmt - csuAmt : null;
          const diffPct = diff !== null && csuAmt > 0 ? Math.round(diff/csuAmt*100) : null;
          const maxVal = Math.max(csuAmt, myAmt, 1);
          const myPct = totalExp > 0 ? Math.round(myAmt/totalExp*100) : 0;
          return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${g.color};color:#000;font-size:.66rem;font-weight:800;flex-shrink:0">${g.id}</span>
              <span style="font-size:.82rem;font-weight:600;flex:1">${g.icon} ${g.name}</span>
              <span style="font-size:.68rem;color:#a8aec8">${myPct}% výdajů</span>
              ${diffPct!==null?`<span style="font-size:.76rem;font-weight:700;color:${diff>0?'var(--expense)':'var(--income)'}">${diff>0?'+':''}${diffPct}%</span>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="font-size:.64rem;color:#a8aec8;width:74px;flex-shrink:0">ČSÚ průměr</span>
              <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(csuAmt/maxVal*100)}%;background:var(--bank);border-radius:3px"></div>
              </div>
              <span style="font-size:.68rem;color:#a8aec8;width:64px;flex-shrink:0;text-align:right">${fmt(csuAmt)} Kč</span>
            </div>
            ${(()=>{ // S17.14 (Milan): třetí bar KOMUNITA – průměr uživatelů FinanceFlow (anonymně)
              const _c = (communityData && Array.isArray(communityData.cats))
                ? communityData.cats.find(x=>Number(x.coicopId)===Number(g.id)) : null;
              if(!_c || !(_c.avg>0)) return '';
              return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:.64rem;color:#a8aec8;width:74px;flex-shrink:0">👥 Komunita</span>
                <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(Math.min(_c.avg/maxVal,1)*100)}%;background:#8b7cf6;border-radius:3px"></div>
                </div>
                <span style="font-size:.68rem;color:#b9aefc;width:64px;flex-shrink:0;text-align:right">${fmt(_c.avg)} Kč</span>
              </div>`;
            })()}
            ${myAmt>0?`<div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:.64rem;color:#a8aec8;width:74px;flex-shrink:0">Vy</span>
              <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(myAmt/maxVal*100)}%;background:${g.color};border-radius:3px"></div>
              </div>
              <span style="font-size:.72rem;font-weight:700;color:${diff&&diff>0?'var(--expense)':g.color};width:64px;flex-shrink:0;text-align:right">${fmt(myAmt)} Kč</span>
            </div>`:'<div style="font-size:.68rem;color:#a8aec8;padding-left:80px">žádné výdaje</div>'}
          </div>`;
        }).join('');

        const unassignedPct = totalExp > 0 ? Math.round(unassigned/totalExp*100) : 0;

        const csuTotal = groups.reduce((a,g)=>a+csuRef(g),0);
        const modeLabel = _csuMode==='osoba' ? 'na osobu / měsíc' : `domácnost / měsíc (OECD ${oecd.toFixed(2).replace('.',',')}×)`;
        return `<div class="card" style="margin-bottom:12px">
          <div class="card-header">
            <span class="card-title">🇨🇿 Jak utrácíš proti průměru</span><span style="font-size:.66rem;color:#a8aec8;text-align:right;max-width:60%">ze VŠECH transakcí · měsíční průměr</span>
            <span style="font-size:.7rem;color:var(--text3)">${modeLabel}</span>
          </div>
          <div class="card-body">
            <!-- Session 10: přepínač osoba/domácnost -->
            <div style="display:flex;gap:3px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:8px">
              <button class="tx-filt-btn" onclick="setCsuMode('osoba')" style="flex:1;${_csuMode==='osoba'?'background:var(--income-bg);color:var(--income);font-weight:700':''}">👤 Já (osoba)</button>
              <button class="tx-filt-btn" onclick="setCsuMode('domacnost')" style="flex:1;${_csuMode==='domacnost'?'background:var(--income-bg);color:var(--income);font-weight:700':''}">🏠 Domácnost</button>
            </div>
            <div style="font-size:.72rem;color:var(--text3);margin-bottom:8px;line-height:1.5;padding:0 2px">
              ${_csuMode==='osoba'
                ? '👤 <strong>Já (osoba)</strong>: porovnání tvých výdajů s průměrem ČSÚ na <strong>1 osobu</strong>. Vyber, pokud appku používáš sám/sama.'
                : hasFamily
                  ? `🏠 <strong>Domácnost (rodinný souhrn)</strong>: sečteny výdaje <strong>${familyMemberCount} členů</strong> (ty + sdílení partneři) a porovnány s ČSÚ přepočtem na složení tvé domácnosti (OECD <strong>${oecd.toFixed(2).replace('.',',')}×</strong>).`
                  : `🏠 <strong>Domácnost</strong>: ČSÚ průměr přepočtený na složení tvé domácnosti (OECD ekvivalent <strong>${oecd.toFixed(2).replace('.',',')}×</strong>). Přidej partnera na stránce <strong>Sdílení &amp; Partneři</strong> a jeho výdaje se připočtou do rodinného souhrnu.`}
            </div>
            <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
              <button class="tx-filt-btn" onclick="goToHouseholdSettings()" style="font-size:.72rem">⚙️ Nastavení složení domácnosti →</button>
              <button class="tx-filt-btn" onclick="goToSharing()" style="font-size:.72rem">👥 Sdílení &amp; partneři →</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--expense)">${fmt(_csuMode==='domacnost'&&hasFamily?Math.round(familyExp):totalExp)} Kč</div>
                <div style="font-size:.68rem;color:#a8aec8">${_csuMode==='domacnost'&&hasFamily?`Výdaje rodiny (${familyMemberCount})`:'Moje výdaje'}</div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--bank)">${fmt(csuTotal)} Kč</div>
                <div style="font-size:.68rem;color:#a8aec8">ČSÚ ${_csuMode==='osoba'?'osoba':'domácnost'}</div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:${unassignedPct>20?'var(--expense)':'var(--text)'}">${unassignedPct}%</div>
                <div style="font-size:.68rem;color:#a8aec8">Nezařazeno</div>
              </div>
            </div>
            <!-- Klíčové metriky ČR (sjednoceno s horní řadou: text na střed, stejný font) -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px" class="csu-cr-grid">
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px">Průměrný příjem ČR</div>
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--income)">${fmt(CSU.avgIncome)} Kč</div>
                <div style="font-size:.66rem;margin-top:3px;color:${myBaseIncome>CSU.avgIncome?'var(--income)':'var(--expense)'}">
                  Vy: ${fmt(Math.round(myBaseIncome))} Kč ${myBaseIncome>CSU.avgIncome?'↑ nad':'↓ pod'} průměrem
                </div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px">Průměrné výdaje ČR</div>
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--expense)">${fmt(CSU.avgExp)} Kč</div>
                <div style="font-size:.66rem;margin-top:3px;color:${myExp<CSU.avgExp?'var(--income)':'var(--expense)'}">
                  Vy: ${fmt(Math.round(myExp))} Kč ${myExp<CSU.avgExp?'✅ méně':'⚠️ více'}
                </div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px">Průměrné úspory ČR</div>
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--bank)">${CSU.savingRate}%</div>
                <div style="font-size:.66rem;margin-top:3px;color:${mySaving>CSU.savingRate?'var(--income)':'var(--expense)'}">
                  Vy: ${mySaving}% ${mySaving>CSU.savingRate?'↑ nad':'↓ pod'} průměrem
                </div>
              </div>
            </div>
            ${unassigned > 0 ? `<div style="padding:6px 10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.25);border-radius:8px;font-size:.74rem;color:var(--text2);margin-bottom:10px">
              ⚠️ ${fmt(Math.round(unassigned))} Kč (${unassignedPct}%) nemá přiřazené COICOP číslo. Přiřaď kategoriím COICOP číslo v nastavení kategorií.
            </div>` : ''}
            ${rows}
          </div>
        </div>`;
      })()}
    </div>

    <!-- TAB: ČSÚ -->
    <div id="ktab-csu-content" style="display:block">
      <!-- Zdroj info -->
      <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span>📋 Zdroj: <strong>Český statistický úřad</strong> – Statistika rodinných účtů ${CSU.year}</span>
        <a href="https://csu.gov.cz/statistika-rodinnych-uctu" target="_blank" style="font-size:.72rem;color:var(--bank);text-decoration:none">Více na czso.gov.cz →</a>
      </div>

      <!-- Session 10: ČSÚ referenční tabulka – 13 oddílů COICOP, osoba i domácnost/měsíc -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 Průměrné výdaje – ČSÚ ${CSU.year} (13 oddílů COICOP)</span>
          <span style="font-size:.7rem;color:var(--text3)">osoba · domácnost / měsíc</span>
        </div>
        <div class="card-body">
          <div style="overflow-x:auto">
            <table style="border-collapse:collapse;width:100%;font-size:.74rem">
              <thead><tr style="color:var(--text3);text-align:left">
                <th style="padding:6px 8px">Oddíl</th>
                <th style="padding:6px 8px;text-align:right">Osoba/měs</th>
                <th style="padding:6px 8px;text-align:right">Domácnost ČR<br><span style="font-weight:400">(2,4 os)</span></th>
                <th style="padding:6px 8px;text-align:right;color:var(--income)">Tvoje dom.<br><span style="font-weight:400">(OECD ${(() => { const e=(typeof calcOECD==='function')?calcOECD(_settings?.household_adults||2,_settings?.household_ch013||0,_settings?.household_ch14||0):1.5; return e.toFixed(2).replace('.',','); })()}×)</span></th>
                <th style="padding:6px 8px;text-align:right">%</th>
              </tr></thead>
              <tbody>
                ${(() => {
                  const G = COICOP_GROUPS_DEF||[];
                  const oecd2 = (typeof calcOECD==='function')
                    ? calcOECD(_settings?.household_adults||2, _settings?.household_ch013||0, _settings?.household_ch14||0) : 1.5;
                  const totOs = G.reduce((a,g)=>a+(g.avg_osoba||0),0);
                  const _subT = (typeof coicopSubclassTotals==='function') ? coicopSubclassTotals(S.curMonth, S.curYear) : {sub:{},cls:{},code:{}};
                  let html = G.map(g=>{
                    const os=g.avg_osoba||0;
                    const domCR=Math.round(os*2.4);        // průměrná ČR domácnost
                    const domMine=Math.round(os*oecd2);    // tvoje domácnost dle nastavení
                    const subs=g.groups||[];
                    const hasSubs=subs.length>0;
                    const exp=_csuExpanded.has(g.id);
                    let row=`<tr style="border-top:1px solid var(--border)${hasSubs?';cursor:pointer':''}" ${hasSubs?`onclick="csuToggleDiv(${g.id})"`:''}>
                      <td style="padding:6px 8px">${hasSubs?`<span style="display:inline-block;width:12px;color:var(--text3)">${exp?'▾':'▸'}</span>`:'<span style="display:inline-block;width:12px"></span>'}<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${g.color};color:#000;font-size:.64rem;font-weight:800;margin:0 6px">${g.id}</span>${g.icon} ${g.name}</td>
                      <td style="padding:6px 8px;text-align:right;font-weight:600">${fmt(os)}</td>
                      <td style="padding:6px 8px;text-align:right;color:var(--text3)">${fmt(domCR)}</td>
                      <td style="padding:6px 8px;text-align:right;color:var(--income);font-weight:600">${fmt(domMine)}</td>
                      <td style="padding:6px 8px;text-align:right;color:var(--text3)">${totOs?Math.round(os/totOs*100):0}%</td>
                    </tr>`;
                    if(exp && hasSubs){
                      row += subs.map(s=>{
                        const code=s.split(' ')[0]; // např. "01.1"
                        const classes=(window.COICOP_CLASSES||{})[code]||[];
                        const hasC=classes.length>0;
                        const gExp=_csuExpGroup.has(code);
                        let grow=`<tr style="background:var(--surface2);font-size:.68rem${hasC?';cursor:pointer':''}" ${hasC?`onclick="csuToggleGroup('${code}')"`:''}>
                          <td style="padding:3px 8px 3px 30px;color:var(--text2)">${hasC?`<span style="display:inline-block;width:10px;color:var(--text3)">${gExp?'▾':'▸'}</span> `:'<span style="display:inline-block;width:10px"></span> '}${s}</td>
                          <td style="padding:3px 8px;text-align:right;color:var(--text3)">—</td>
                          <td style="padding:3px 8px;text-align:right;color:var(--text3)">—</td>
                          <td style="padding:3px 8px;text-align:right;color:var(--income);font-weight:600">${_subT.sub[code]>0?fmt(_subT.sub[code]):'—'}</td>
                          <td style="padding:3px 8px"></td>
                        </tr>`;
                        if(gExp && hasC){
                          grow += classes.map(cl=>`<tr style="background:var(--surface);font-size:.64rem">
                            <td style="padding:2px 8px 2px 52px;color:var(--text3)">${cl}</td>
                            <td style="padding:2px 8px;text-align:right;color:var(--text3)">—</td>
                            <td style="padding:2px 8px;text-align:right;color:var(--text3)">—</td>
                            <td style="padding:2px 8px;text-align:right;color:var(--income);font-weight:600">${_subT.cls[cl.split(' ')[0]]>0?fmt(_subT.cls[cl.split(' ')[0]]):'—'}</td>
                            <td style="padding:2px 8px"></td>
                          </tr>`).join('');
                        }
                        return grow;
                      }).join('');
                    }
                    return row;
                  }).join('');
                  const totDomCR=Math.round(totOs*2.4), totDomMine=Math.round(totOs*oecd2);
                  html += `<tr style="border-top:2px solid var(--border2);font-weight:800">
                    <td style="padding:7px 8px">Celkem</td>
                    <td style="padding:7px 8px;text-align:right">${fmt(totOs)}</td>
                    <td style="padding:7px 8px;text-align:right;color:var(--text3)">${fmt(totDomCR)}</td>
                    <td style="padding:7px 8px;text-align:right;color:var(--income)">${fmt(totDomMine)}</td>
                    <td style="padding:7px 8px;text-align:right">100%</td>
                  </tr>`;
                  return html;
                })()}
              </tbody>
            </table>
          </div>
          <div style="font-size:.7rem;color:var(--text3);padding:8px;background:var(--surface2);border-radius:8px;margin-top:10px;line-height:1.6">
            ℹ️ Klikni na oddíl → rozbalí skupiny (2. úroveň), klikni na skupinu → rozbalí třídy (3. úroveň COICOP). ČSÚ publikuje výdaje <strong>na osobu</strong>.<br>
            <span style="color:var(--income)">Zelené hodnoty</span> u rozbalených skupin/tříd = <strong>tvoje skutečné výdaje</strong> z naúčtovaných položek za tento měsíc (ČSÚ průměry existují jen na úrovni oddílů).<br>
            • <strong>Domácnost ČR (2,4 os)</strong> = osoba × 2,4 (statisticky průměrná česká domácnost).<br>
            • <strong>Tvoje dom.</strong> = osoba × OECD ekvivalent <em>tvé</em> domácnosti z Nastavení (1. dospělý = 1,0; další dospělý = 0,5; dítě 14+ = 0,5; dítě 0–13 = 0,3). Např. 1 dospělý + 3 děti, nebo 2 dospělí, atd. – přepočet se mění podle toho, co zadáš.<br>
            Zdroj: SRÚ ${CSU.year}, czso.gov.cz – hodnoty jsou kalibrovaný odhad.
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: Uživatelé aplikace -->
    <div id="ktab-app-content" style="display:none">
      ${!communityData ? `
        <div style="background:var(--surface2);border-radius:10px;padding:20px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:2rem;margin-bottom:8px">👥</div>
          <div style="font-weight:600;margin-bottom:6px">Zatím žádná komunitní data</div>
          <div style="font-size:.78rem;color:var(--text3)">Data se začnou sbírat jak přibydou uživatelé aplikace. Přispíváte anonymně automaticky.</div>
        </div>` : `
        <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">
          👥 Anonymní data od <strong>${communityData.count} uživatelů</strong> FinanceFlow · ${CZ_M[S.curMonth]} ${S.curYear}
        </div>
        <div class="community-stat-grid">
          <div class="stat-card income"><div class="stat-label">Medián příjmu</div><div class="stat-value up">${fmtB(communityData.avgIncome)}</div></div>
          <div class="stat-card expense"><div class="stat-label">Medián výdajů</div><div class="stat-value down">${fmtB(communityData.avgExp)}</div></div>
          <div class="stat-card balance"><div class="stat-label">Medián úspor</div><div class="stat-value">${communityData.avgSaving}%</div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📊 Výdaje dle kategorie – uživatelé aplikace</span></div>
          <div class="card-body">
            ${(()=>{ const {cats:_myCoicop}=computeCoicopAggregates(myTxs,D); return communityData.cats.slice(0,10).map(({cat,coicopId,avg,count})=>{
              // Tvoje výdaje pro tuto COICOP divizi (stejný základ jako komunita)
              const myAmt=Math.round(_myCoicop[coicopId]||0);
              const diff=myAmt-avg;
              const maxVal=Math.max(avg,myAmt,1);
              // SLOUČENÝ BAR: jeden pruh. Modrá = průměr komunity, zelená = ty.
              // Pokud jsi pod průměrem: zelená část (ty) + modrá dotahuje do průměru. Pokud nad: celá zelená/červená.
              const avgPct=Math.round(avg/maxVal*100);
              const myPct=Math.round(myAmt/maxVal*100);
              const underBar = myAmt>0 && myAmt<=avg;   // jsi pod nebo na průměru
              const overBar  = myAmt>avg;                // jsi nad průměrem
              let barHtml;
              if(myAmt===0){
                // jen průměr komunity (ty nemáš výdaj)
                barHtml=`<div style="height:14px;background:var(--surface3);border-radius:7px;overflow:hidden;position:relative">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${avgPct}%;background:var(--bank);opacity:.55;border-radius:7px"></div>
                </div>`;
              } else if(underBar){
                // zelená (ty) vlevo, modrá dotahuje k průměru
                barHtml=`<div style="height:14px;background:var(--surface3);border-radius:7px;overflow:hidden;position:relative">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${avgPct}%;background:var(--bank);opacity:.45;border-radius:7px"></div>
                  <div style="position:absolute;left:0;top:0;height:100%;width:${myPct}%;background:var(--income);border-radius:7px"></div>
                </div>`;
              } else {
                // nad průměrem: celá zelená do průměru, červená přebytek
                barHtml=`<div style="height:14px;background:var(--surface3);border-radius:7px;overflow:hidden;position:relative">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${myPct}%;background:var(--expense);border-radius:7px"></div>
                  <div style="position:absolute;left:0;top:0;height:100%;width:${avgPct}%;background:var(--bank);opacity:.55;border-radius:7px 0 0 7px"></div>
                </div>`;
              }
              return `<div style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:5px">
                  <span style="font-weight:600">${cat}</span>
                  <span style="font-size:.72rem;color:${myAmt>0?(diff>0?'var(--expense)':'var(--income)'):'var(--text3)'}">${myAmt>0?(diff>0?`↑ o ${fmt(Math.abs(diff))} nad`:`↓ o ${fmt(Math.abs(diff))} pod`):'nemáš výdaj'}</span>
                </div>
                ${barHtml}
                <div style="display:flex;justify-content:space-between;font-size:.66rem;margin-top:3px">
                  <span style="color:var(--income)">${myAmt>0?'Vy: '+fmt(myAmt)+' Kč':''}</span>
                  <span style="color:var(--bank)">Medián: ${fmtB(avg)}</span>
                </div>
              </div>`;
            }).join(''); })()}
          </div>
        </div>`}
    </div>

    <!-- Opt-out info -->
    <div style="text-align:center;font-size:.72rem;color:var(--text3);padding:10px;margin-top:4px">
      Přispíváte anonymními daty · Vypnout lze v <span onclick="openNotifSettings()" style="color:var(--bank);cursor:pointer;text-decoration:underline">Oznámení</span>
    </div>`;
} // konec _renderKomunitaImpl

function switchKomunitaTab(tab, btn) {
  ['coicop','csu','app'].forEach(t=>{
    const c=document.getElementById('ktab-'+t+'-content');
    if(c)c.style.display='none';
  });
  document.querySelectorAll('#ktab-coicop, #ktab-app').forEach(b=>b.classList.remove('active'));
  // Session 10: „ČSÚ tabulka" sloučena do „Já vs. ČSÚ" – při coicop ukážeme i csu-content.
  const coicop=document.getElementById('ktab-coicop-content');
  const csu=document.getElementById('ktab-csu-content');
  const app=document.getElementById('ktab-app-content');
  if(tab==='app'){ if(app)app.style.display='block'; }
  else { if(coicop)coicop.style.display='block'; if(csu)csu.style.display='block'; }
  if(btn)btn.classList.add('active');
}

// ══════════════════════════════════════════════════════
//  TAGY
// ══════════════════════════════════════════════════════
function parseTags(input) {
  // Parsuje "#dovolená #děti práce" → ['dovolená','děti','práce']
  return input.split(/[\s,]+/)
    .map(t => t.replace(/^#+/, '').trim().toLowerCase())
    .filter(t => t.length >= 1 && t.length <= 30);
}

function getAllTags(D) {
  const D2 = D || getData();
  const tagMap = {};
  (D2.transactions||[]).forEach(t => {
    parseTxTags(t).forEach(tag => {
      if(!tagMap[tag]) tagMap[tag] = {name:tag, count:0, total:0, txs:[]};
      tagMap[tag].count++;
      tagMap[tag].total += t.amount||t.amt||0;
      tagMap[tag].txs.push(t);
    });
  });
  return Object.values(tagMap).sort((a,b) => b.count - a.count);
}

function tagsInputHandler(input) {
  updateTagsPreview();
  showTagsSuggestions(input);
}

function updateTagsPreview() {
  const input = document.getElementById('txTags');
  const preview = document.getElementById('tagsPreview');
  if(!input || !preview) return;
  const tags = parseTags(input.value);
  preview.innerHTML = tags.map(t =>
    `<span style="background:var(--bank);color:white;padding:2px 8px;border-radius:12px;font-size:.72rem;font-weight:600">#${t}</span>`
  ).join('');
}

function showTagsSuggestions(input) {
  const suggest = document.getElementById('tagsSuggest'); if(!suggest) return;
  const val = input.value.split(/[\s,]+/).pop().replace(/^#+/,'').toLowerCase();
  if(val.length < 1) { suggest.style.display='none'; return; }
  const allTags = getAllTags();
  const matches = allTags.filter(t => t.name.includes(val)).slice(0,6);
  if(!matches.length) { suggest.style.display='none'; return; }
  suggest.style.display = 'block';
  suggest.innerHTML = matches.map(t =>
    `<div onclick="addTagFromSuggest('${t.name}')"
      style="padding:6px 10px;cursor:pointer;font-size:.8rem;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''">
      <span style="color:var(--bank);font-weight:600">#${t.name}</span>
      <span style="color:var(--text2);font-size:.7rem;margin-left:6px">${t.count}× použito</span>
    </div>`
  ).join('');
}

function addTagFromSuggest(tag) {
  const input = document.getElementById('txTags'); if(!input) return;
  // Nahraď poslední částečně napsaný tag
  const parts = input.value.split(/(?=\s#|\s(?!#))/);
  const last = parts[parts.length-1].replace(/^[\s#]+/,'');
  if(tag.startsWith(last)) {
    parts[parts.length-1] = ' #'+tag;
  } else {
    parts.push(' #'+tag);
  }
  input.value = parts.join('').trim();
  document.getElementById('tagsSuggest').style.display='none';
  updateTagsPreview();
  input.focus();
}

function tagsKeyHandler(e) {
  if(e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    document.getElementById('tagsSuggest').style.display='none';
  }
}

function renderTagy() {
  const el = document.getElementById('tagyContent'); if(!el) return;
  const D = getData();
  const tags = getAllTags(D);

  if(!tags.length) {
    el.innerHTML = `<div class="card"><div class="card-body"><div class="empty">
      <div class="ei">🏷️</div>
      <div class="et">Zatím žádné tagy</div>
      <div style="font-size:.76rem;color:var(--text2);margin-top:8px">
        Přidejte tagy k transakcím (např. #dovolená #děti #práce) pro lepší přehled výdajů.
      </div>
    </div></div></div>`;
    return;
  }

  const totalTagged = tags.reduce((a,t)=>a+t.count,0);

  el.innerHTML = `
    <!-- Přehled -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div class="stat-card bank"><div class="stat-label">Tagů celkem</div><div class="stat-value">${tags.length}</div></div>
      <div class="stat-card income"><div class="stat-label">Označených txn</div><div class="stat-value up">${totalTagged}</div></div>
      <div class="stat-card expense"><div class="stat-label">Top tag</div><div class="stat-value" style="font-size:.9rem">#${tags[0]?.name||'–'}</div></div>
    </div>

    <!-- Seznam tagů -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header"><span class="card-title">🏷️ Všechny tagy</span></div>
      <div class="card-body" style="padding:8px 14px">
        ${tags.map(tag => {
          const pct = tag.count > 0 ? Math.round(tag.count/totalTagged*100) : 0;
          return `<div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="background:var(--bank);color:white;padding:2px 10px;border-radius:12px;font-size:.78rem;font-weight:600;cursor:pointer"
                  onclick="filterByTag('${tag.name}')">#${tag.name}</span>
                <span style="font-size:.76rem;color:var(--text2)">${tag.count} transakcí</span>
              </div>
              <span style="font-size:.82rem;font-weight:700;color:var(--expense)">−${fmt(Math.round(tag.total))} Kč</span>
            </div>
            <div style="height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--bank);border-radius:3px"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Nedávné transakce s tagy -->
    <div class="card">
      <div class="card-header"><span class="card-title">📋 Nedávné označené transakce</span></div>
      <div class="card-body" style="padding:0">
        ${[...new Set(tags.flatMap(t=>t.txs))].sort((a,b)=>b.date?.localeCompare(a.date||'')||0).slice(0,15).map(t => {
          const cat = getCat(t.catId||t.category, D.categories);
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border)">
            <span style="font-size:1rem">${cat.icon}</span>
            <div style="flex:1">
              <div style="font-size:.84rem;font-weight:600">${t.name||cat.name}</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">
                ${parseTxTags(t).map(tag=>`<span style="background:var(--bank);color:white;padding:1px 6px;border-radius:8px;font-size:.68rem">#${tag}</span>`).join('')}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:${t.type==='income'?'var(--income)':'var(--expense)'}">${t.type==='income'?'+':'−'}${fmt(t.amount||t.amt||0)} Kč</div>
              <div style="font-size:.7rem;color:var(--text2)">${t.date||''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function filterByTag(tag) {
  showPage('transakce', null);
  setTimeout(() => {
    const el = document.getElementById('txTagFilter');
    if(el) el.value = tag;
    // S17.4 (FIX-207, Milan): stránka Tagy agreguje NAPŘÍČ všemi měsíci, ale filtr transakcí
    // bral jen zvolený měsíc → klik na tag často vedl na prázdný seznam. Zapneme „všechny měsíce".
    const allM = document.getElementById('txSearchAllMonths');
    if(allM) allM.checked = true;
    if(el || allM) renderTx();
    // Otevři advanced filter
    const adv = document.getElementById('txAdvFilter');
    if(adv) adv.style.display = 'block';
  }, 100);
}

// ── Rozšířené filtrování transakcí ──
function toggleAdvFilter() {
  const el = document.getElementById('txAdvFilter');
  if(!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function clearTxFilters() {
  ['txCatFilter','txSubFilter','txProjectFilter','txWalletFilter','txPayTypeFilter','txCurFilter'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  ['txTagFilter','txSearchFilter'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  renderTx();
}

// ── OECD spotřební jednotky ──
function calcOECD(adults, ch013, ch14) {
  adults = Math.max(1, parseInt(adults)||1);
  ch013  = parseInt(ch013)||0;
  ch14   = parseInt(ch14)||0;
  // 1. dospělý = 1,0; každý další dospělý = 0,5; dítě 14+ = 0,5; dítě 0-13 = 0,3
  const equiv = 1.0 + (adults-1)*0.5 + ch14*0.5 + ch013*0.3;
  return Math.round(equiv*100)/100;
}

function updateHouseholdEquiv() {
  const adults = parseInt(document.getElementById('settingAdults')?.value)||2;
  const ch013  = parseInt(document.getElementById('settingChildren013')?.value)||0;
  const ch14   = parseInt(document.getElementById('settingChildren14')?.value)||0;
  const equiv  = calcOECD(adults, ch013, ch14);
  const el = document.getElementById('householdEquivVal');
  if(el) el.textContent = equiv.toFixed(2).replace('.',',');
}

// ── Kontrola kompletnosti COICOP dat ──
function calcDataCompleteness(coicopUserTotals, coicopGroups, D) {
  const covered = coicopGroups.filter(g => (coicopUserTotals[g.id]||0) > 0).length;
  const total   = coicopGroups.length;
  const pct     = Math.round(covered/total*100);

  // Detekce chybějících důležitých kategorií
  const missing = [];
  const txs = D.transactions||[];
  const hasIncome = txs.some(t=>t.type==='income');
  const totalMonthly = Object.values(coicopUserTotals).reduce((a,b)=>a+b,0);

  if(hasIncome && !(coicopUserTotals[4]>0)) missing.push('🏠 Bydlení a energie (nájem, elektřina)');
  if(hasIncome && !(coicopUserTotals[1]>0)) missing.push('🛒 Potraviny');
  if(!(coicopUserTotals[7]>0) && txs.some(t=>((t.name||'').toLowerCase().includes('auto')||((t.catId||'').includes('doprava'))))) missing.push('🚗 Doprava');
  if(hasIncome && totalMonthly < 3000)      missing.push('⚠️ Celkové výdaje jsou velmi nízké – pravděpodobně chybí data');

  return {pct, covered, total, missing};
}

// ══════════════════════════════════════════════════════
//  SPLIT TRANSAKCE
// ══════════════════════════════════════════════════════
let _splitTxId = null;
let _splitTotal = 0;

function openSplitModal(txId) {
  const D = getData();
  const tx = (D.transactions||[]).find(t=>t.id==txId);
  if(!tx) return;
  _splitTxId = txId;
  _splitTotal = Math.round((tx.amount||tx.amt||0)*100)/100;

  const cat = getCat(tx.catId||tx.category, D.categories);
  document.getElementById('splitParentInfo').innerHTML =
    `<span style="font-size:.9rem">${cat.icon}</span> <strong>${tx.name||cat.name}</strong> &nbsp;·&nbsp; <strong style="color:var(--expense)">−${fmtP(_splitTotal)} Kč</strong> &nbsp;·&nbsp; ${tx.date||''}`;

  // Vygeneruj options pro kategorie (jednou, použijeme v každém řádku)
  const catOptions = (D.categories||[])
    .filter(c=>c.type==='expense'||c.type==='both')
    .map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`)
    .join('');

  // Předvyplň 2 řádky – první = původní kategorie, druhý = prázdný
  const half = Math.round(_splitTotal/2*100)/100;
  const rest = Math.round((_splitTotal - half)*100)/100;

  document.getElementById('splitItemsList').innerHTML = `
    ${buildSplitRow(0, tx.catId||tx.category||'', half, catOptions, false)}
    ${buildSplitRow(1, '', rest, catOptions, false)}`;

  splitAttachListeners();
  splitUpdateSum();
  document.getElementById('modalSplit').classList.add('open');
}

function buildSplitRow(i, catId, amt, catOptionsHtml, removable) {
  const isMain = i === 0;
  const border = isMain ? '2px solid #f59e0b' : '1px solid var(--border)';
  const label = isMain
    ? `<div style="font-size:.68rem;color:#f59e0b;font-weight:700;margin-bottom:4px">⭐ Hlavní kategorie <span style="font-weight:400;color:var(--text2)">(dopočítá se automaticky)</span></div>`
    : '';
  const amtStyle = isMain
    ? `width:88px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.4);border-radius:7px;padding:7px 8px;color:#f59e0b;font-size:.88rem;text-align:right;font-weight:700`
    : `width:88px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:7px 8px;color:var(--text);font-size:.88rem;text-align:right`;

  return `<div id="split-row-${i}" style="padding:10px;background:var(--surface2);border-radius:8px;border:${border};margin-bottom:10px${isMain?';box-shadow:0 0 0 1px rgba(245,158,11,.2)':''}">
    ${label}
    <div style="display:flex;gap:8px;align-items:center">
      <select id="split-cat-${i}" class="fi" style="flex:1;font-size:.8rem">
        ${catOptionsHtml || ''}
      </select>
      <input id="split-amt-${i}" type="number" min="0" step="0.01" inputmode="decimal"
        value="${amt}" ${isMain?'readonly':''} 
        style="${amtStyle};-webkit-user-select:text;user-select:text"
        autocomplete="off">
      <span style="font-size:.76rem;color:var(--text2);flex-shrink:0">Kč</span>
      ${removable ? `<button onclick="splitRemoveRow(${i})" style="background:none;border:none;color:var(--expense);cursor:pointer;font-size:1rem;padding:0 2px;flex-shrink:0">✕</button>` : '<div style="width:22px"></div>'}
    </div>
  </div>`;
}

function splitGetCatOptions() {
  const D = getData();
  return (D.categories||[])
    .filter(c=>c.type==='expense'||c.type==='both')
    .map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`)
    .join('');
}

function splitAttachListeners() {
  document.querySelectorAll('[id^="split-amt-"]').forEach(input => {
    const i = parseInt(input.id.split('-')[2]);
    if(i === 0) return; // první řádek je readonly – dopočítává se
    input.addEventListener('input', () => splitAutoFill(i));
    input.addEventListener('change', () => splitUpdateSum());
  });
  // Kategorie selects – žádná akce potřeba
}

function splitAutoFill(changedIdx) {
  // Přepočítej první řádek = zbytek po odečtení všech ostatních
  const rows = document.querySelectorAll('[id^="split-amt-"]');
  const n = rows.length;
  if(n < 2) { splitUpdateSum(); return; }

  // Součet všech MIMO první řádek
  let sumOthers = 0;
  rows.forEach((inp, idx) => {
    if(idx > 0) sumOthers += parseFloat(inp.value)||0;
  });

  const remainder = Math.round((_splitTotal - sumOthers)*100)/100;
  const firstInput = document.getElementById('split-amt-0');
  if(firstInput) firstInput.value = remainder >= 0 ? remainder : 0;

  splitUpdateSum();
}

function splitUpdateSum() {
  const rows = document.querySelectorAll('[id^="split-amt-"]');
  let sum = 0;
  rows.forEach(inp => sum += parseFloat(inp.value)||0);
  sum = Math.round(sum*100)/100;
  const diff = Math.round((_splitTotal - sum)*100)/100;
  const ok = Math.abs(diff) < 0.02;

  const infoEl = document.getElementById('splitSumInfo');
  if(!infoEl) return;
  infoEl.style.background = ok ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)';
  infoEl.style.color = ok ? 'var(--income)' : 'var(--expense)';
  infoEl.style.border = ok ? '1px solid rgba(74,222,128,.3)' : '1px solid rgba(248,113,113,.3)';
  infoEl.innerHTML = ok
    ? `✅ Součet sedí: ${fmtP(sum)} Kč`
    : diff > 0
      ? `⚠️ Zbývá rozdělit: <strong>${fmtP(diff)} Kč</strong> &nbsp;·&nbsp; součet: ${fmtP(sum)} Kč`
      : `⚠️ Přečerpáno o: <strong>${fmtP(Math.abs(diff))} Kč</strong> &nbsp;·&nbsp; součet: ${fmtP(sum)} Kč`;
}

function splitAddItem() {
  const list = document.getElementById('splitItemsList');
  const existing = list.querySelectorAll('[id^="split-row-"]');
  const i = existing.length;
  const catOptions = splitGetCatOptions();
  const div = document.createElement('div');
  div.innerHTML = buildSplitRow(i, '', 0, catOptions, true);
  list.appendChild(div.firstElementChild);
  splitAttachListeners();
  splitAutoFill(i); // přepočítej první řádek
  setTimeout(() => {
    const inp = document.getElementById('split-amt-'+i);
    if(inp) { inp.focus(); inp.select(); }
  }, 50);
}

function splitRemoveRow(i) {
  const row = document.getElementById('split-row-'+i);
  if(row) row.remove();
  splitAutoFill(0);
}

function saveSplit() {
  if(!_splitTxId) return;
  const D = getData();
  const tx = (D.transactions||[]).find(t=>t.id==_splitTxId);
  if(!tx) return;

  // Sesbírej data z DOM
  const rows = document.querySelectorAll('[id^="split-row-"]');
  const items = [];
  rows.forEach((row, idx) => {
    const amt = parseFloat(document.getElementById('split-amt-'+idx)?.value)||0;
    const catId = document.getElementById('split-cat-'+idx)?.value||'';
    if(amt > 0) items.push({amt, catId});
  });

  if(items.length < 2) { alert('Přidejte alespoň 2 části.'); return; }
  const sum = Math.round(items.reduce((a,it)=>a+it.amt,0)*100)/100;
  if(Math.abs(_splitTotal - sum) >= 0.02) {
    alert(`Součet (${fmtP(sum)} Kč) neodpovídá celkové částce (${fmtP(_splitTotal)} Kč).`);
    return;
  }

  const splitId = 'split_' + Date.now();
  tx.splitId = splitId;
  tx.splitParent = true;

  items.forEach((it, i) => {
    const catObj = (D.categories||[]).find(c=>c.id===it.catId) || getCat(tx.catId||tx.category, D.categories);
    S.transactions.push({
      id: genTxId(),
      name: catObj.name || ('Část ' + (i+1)),
      amount: it.amt, amt: it.amt,
      type: tx.type,
      date: tx.date,
      catId: it.catId || tx.catId || tx.category,
      category: it.catId || tx.catId || tx.category,
      subcat: '',
      note: '',
      splitId, splitParent: false,
    });
  });

  save();
  closeModal('modalSplit');
  renderPage();
}
function toggleSplitChildren(splitId) {
  const el = document.getElementById('split-children-'+splitId);
  if(el) el.style.display = el.style.display==='none' ? 'block' : 'none';
}

function deleteSplitChild(childId) {
  if(!confirm('Smazat tuto část splitu?')) return;
  const child = S.transactions.find(t=>t.id==childId);
  if(!child) return;
  const splitId = child.splitId;
  // Smaž child
  S.transactions = S.transactions.filter(t=>t.id!=childId);
  // Zkontroluj kolik dětí zbývá
  const remaining = S.transactions.filter(t=>t.splitId===splitId&&!t.splitParent);
  if(remaining.length < 2) {
    // Obnov parent na normální transakci
    const parent = S.transactions.find(t=>t.splitId===splitId&&t.splitParent);
    if(parent) { delete parent.splitId; delete parent.splitParent; }
    // Smaž zbývající děti
    S.transactions = S.transactions.filter(t=>t.splitId!==splitId||!t.splitId);
  }
  save(); renderPage();
}

// Filtruj split children ze součtů (počítáme jen parenty)
function getTxForSummary(txs) {
  return txs.filter(t => !t.splitId || t.splitParent);
}

// ══════════════════════════════════════════════════════

// ═══ 📈 Záložka RŮST — registrace, předplatná, odhlášení ═══
async function renderGrowthTab() {
  const el = document.getElementById('growthTabContent');
  if (!el) return;
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám data uživatelů...</div></div>';
  try {
    // Znovupoužijeme _cachedUsers pokud existují, jinak načteme
    if (!window._cachedUsers || !window._cachedUsers.length) await loadUsersList();
    const users = window._cachedUsers || [];
    if (!users.length) { el.innerHTML = '<div class="empty"><div class="et">Žádní uživatelé</div></div>'; return; }
    el.innerHTML = _buildGrowthHTML(users);
  } catch(e) {
    el.innerHTML = `<div style="padding:10px;font-size:.78rem;color:var(--text3)">⚠️ Chyba: ${e.message}</div>`;
  }
}

function _buildGrowthHTML(users) {
  const now = Date.now();
  const CZ_M_SHORT = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];

  // ── Agregace po měsících ──
  const byMonth = {}; // 'YYYY-MM' → { reg:0, premStarted:0, premExpired:0 }
  const ensure = ym => { if (!byMonth[ym]) byMonth[ym] = { reg:0, premStarted:0, premExpired:0 }; };

  users.forEach(u => {
    const ca = u.premium.createdAt;
    if (ca && ca > 0) {
      const d = new Date(ca); const ym = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      ensure(ym); byMonth[ym].reg++;
    }
    const pt = u.premium.premiumUntil;
    if (pt && pt > 0) {
      const ds = new Date(pt); const ym = ds.getFullYear()+'-'+String(ds.getMonth()+1).padStart(2,'0');
      ensure(ym);
      if (pt < now) byMonth[ym].premExpired++;
      else byMonth[ym].premStarted++;
    }
  });

  const months = Object.keys(byMonth).sort();
  const last12 = months.slice(-12);

  // ── Souhrné karty ──
  const totalUsers = users.length;
  const premiumNow = users.filter(u => u.premium.type === 'premium' && (u.premium.premiumUntil||0) > now).length;
  const proNow     = users.filter(u => u.premium.type === 'pro'     && (u.premium.premiumUntil||0) > now).length;
  const trialNow   = users.filter(u => u.premium.type === 'trial'   && (u.premium.trialUntil||0)   > now).length;
  const freeUsers  = totalUsers - premiumNow - trialNow - proNow;
  const expiredPrem = users.filter(u => (u.premium.premiumUntil||0) > 0 && (u.premium.premiumUntil||0) < now).length;

  // ── Registrace: posledních 30 dní ──
  const d30ago = now - 30*864e5;
  const newLast30 = users.filter(u => (u.premium.createdAt||0) > d30ago)
    .sort((a,b) => b.premium.createdAt - a.premium.createdAt);

  // ── SVG bar chart ──
  const maxReg = Math.max(1, ...last12.map(m => byMonth[m].reg));
  const barW = 28, gap = 8, svgW = last12.length * (barW + gap) + gap;
  const svgH = 120, pad = 16;
  const bars = last12.map((ym, i) => {
    const v = byMonth[ym].reg;
    const bh = Math.max(2, Math.round((v / maxReg) * (svgH - pad - 20)));
    const x = gap + i * (barW + gap);
    const y = svgH - pad - bh;
    const [yr, mo] = ym.split('-');
    const label = CZ_M_SHORT[parseInt(mo,10)-1] + (yr !== String(new Date().getFullYear()) ? ' '+yr.slice(2) : '');
    return `<g>
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="4" fill="var(--income)" opacity=".85"/>
      <text x="${x+barW/2}" y="${y-4}" text-anchor="middle" font-size="9" fill="#a7f3d0" font-weight="700">${v > 0 ? v : ''}</text>
      <text x="${x+barW/2}" y="${svgH-2}" text-anchor="middle" font-size="8" fill="var(--text3)">${label}</text>
    </g>`;
  }).join('');

  const svg = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="max-width:520px;display:block;margin:0 auto 4px" preserveAspectRatio="xMidYMid meet">
    <text x="4" y="10" font-size="8" fill="var(--text3)">Registrací</text>
    ${bars}
  </svg>`;

  // ── Tabulka posledních 30 dní ──
  const recentRows = newLast30.slice(0,10).map(u => {
    const d = new Date(u.premium.createdAt);
    const dateStr = d.toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'numeric'});
    const tier = u.premium.type==='pro'     ? '<span style="color:#a78bfa;font-weight:700">🚀 Pro</span>'
               : u.premium.type==='premium' ? '<span style="color:var(--income);font-weight:700">💎 Premium</span>'
               : u.premium.type==='trial'   ? '<span style="color:#fbbf24;font-weight:700">⏳ Trial</span>'
               : '<span style="color:var(--text3)">Free</span>';
    const name = u.displayName || u.email?.split('@')[0] || u.uid.slice(0,8);
    return `<tr>
      <td style="padding:7px 8px;font-size:.76rem;color:var(--text2)">${dateStr}</td>
      <td style="padding:7px 8px;font-size:.76rem;color:var(--text)">${name}</td>
      <td style="padding:7px 8px;font-size:.76rem">${tier}</td>
      <td style="padding:7px 8px;font-size:.74rem;color:var(--text3);text-align:right">${u.transactionsCount} tx</td>
    </tr>`;
  }).join('');

  // ── Tabulka vypršelých předplatných ──
  const expiredRows = users.filter(u => (u.premium.premiumUntil||0) > 0 && (u.premium.premiumUntil||0) < now)
    .sort((a,b) => b.premium.premiumUntil - a.premium.premiumUntil)
    .slice(0,10).map(u => {
      const d = new Date(u.premium.premiumUntil);
      const dateStr = d.toLocaleDateString('cs-CZ',{day:'2-digit',month:'2-digit',year:'numeric'});
      const daysAgo = Math.round((now - u.premium.premiumUntil)/864e5);
      const name = u.displayName || u.email?.split('@')[0] || u.uid.slice(0,8);
      return `<tr>
        <td style="padding:7px 8px;font-size:.76rem;color:var(--expense)">${dateStr}</td>
        <td style="padding:7px 8px;font-size:.76rem;color:var(--text)">${name}</td>
        <td style="padding:7px 8px;font-size:.74rem;color:var(--text3)">${daysAgo} dní zpět</td>
        <td style="padding:7px 8px;font-size:.74rem;color:var(--text3);text-align:right">${u.transactionsCount} tx</td>
      </tr>`;
    }).join('');

  const thStyle = 'padding:6px 8px;font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid var(--border);white-space:nowrap';

  return `
    <!-- Souhrné karty -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:18px">
      ${[
        ['👥','Celkem',totalUsers,'var(--text)'],
        ['💎','Premium',premiumNow,'var(--income)'],
        ['🚀','Pro',proNow,'#a78bfa'],
        ['⏳','Trial',trialNow,'#fbbf24'],
        ['🆓','Free',freeUsers,'var(--text3)'],
        ['❌','Vypršelo',expiredPrem,'var(--expense)'],
        ['🆕','Za 30 dní',newLast30.length,'#60a5fa'],
      ].map(([icon,label,val,color])=>`<div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:10px 12px;text-align:center">
        <div style="font-size:1.2rem">${icon}</div>
        <div style="font-size:1.5rem;font-weight:800;color:${color}">${val}</div>
        <div style="font-size:.68rem;color:#a8aec8;margin-top:2px">${label}</div>
      </div>`).join('')}
    </div>

    <!-- Graf registrací -->
    <div style="margin-bottom:18px">
      <div style="font-size:.78rem;font-weight:700;color:var(--text2);margin-bottom:8px">📊 Registrace po měsících (posledních 12)</div>
      ${last12.length ? svg : '<div style="color:var(--text3);font-size:.78rem">Žádná data o datu registrace</div>'}
    </div>

    <!-- Noví uživatelé (posledních 30 dní) -->
    ${newLast30.length ? `<div style="margin-bottom:18px">
      <div style="font-size:.78rem;font-weight:700;color:var(--text2);margin-bottom:8px">🆕 Nové registrace (posledních 30 dní) — ${newLast30.length} uživatelů</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${thStyle}">Datum</th><th style="${thStyle}">Uživatel</th>
          <th style="${thStyle}">Tier</th><th style="${thStyle};text-align:right">Aktivita</th>
        </tr></thead>
        <tbody>${recentRows}</tbody>
      </table></div>
    </div>` : ''}

    <!-- Vypršelá předplatná -->
    ${expiredPrem ? `<div>
      <div style="font-size:.78rem;font-weight:700;color:var(--expense);margin-bottom:8px">❌ Vypršelá předplatná (posledních 10)</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${thStyle}">Vypršelo</th><th style="${thStyle}">Uživatel</th>
          <th style="${thStyle}">Čas zpět</th><th style="${thStyle};text-align:right">Aktivita</th>
        </tr></thead>
        <tbody>${expiredRows}</tbody>
      </table></div>
    </div>` : '<div style="font-size:.78rem;color:var(--text3)">✅ Žádná vypršelá předplatná</div>'}
  `;
}
window.renderGrowthTab = renderGrowthTab;

// ══════════════════════════════════════════════════════
//  S17.28 (Milan): AUDIT PLATEB – „neokrádá mě někdo?"
//  Porovnává stav users/{uid}/premium proti serverovému logu premiumLog (zapisuje POUZE
//  Stripe webhook přes Database Secret). Klasifikace:
//    ✅ ZAPLACENO   – existuje záznam v premiumLog nebo stripeSubscriptionId
//    🔵 RUČNĚ       – manuallySet (udělil jsi ho ty z admin panelu)
//    🔴 PODEZŘELÉ   – ani jedno → buď obešel pravidla, nebo vzniklo před opravou v9.27
//  Navíc hlídá: trial delší než 32 dní, premiumUntil dál než rok, nesoulad počtu
//  zakládajících míst.
// ══════════════════════════════════════════════════════
async function runPaymentAudit() {
  const el = document.getElementById('auditResult'); if (!el) return;
  el.innerHTML = '<div style="color:#a8aec8;font-size:.8rem">Načítám data…</div>';
  try {
    const idToken = await window._currentUser.getIdToken();
    const base = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app';
    const [usersRes, logRes, statsRes] = await Promise.all([
      fetch(`${base}/users.json?auth=${idToken}`),
      fetch(`${base}/premiumLog.json?auth=${idToken}`),
      fetch(`${base}/stats/founderCount.json`),
    ]);
    const users = (await usersRes.json()) || {};
    const logs  = (await logRes.json()) || {};
    const founderCount = (await statsRes.json()) || 0;

    const now = Date.now(), YEAR = 365*24*3600*1000, D32 = 32*24*3600*1000;
    const rows = [], warns = [];
    let paid = 0, manual = 0, suspicious = 0, revenue = 0;

    Object.entries(users).forEach(([uid, u]) => {
      const p = u && u.premium; if (!p) return;
      const t = p.type;
      const active = (t === 'premium' || t === 'pro') && (p.premiumUntil || 0) > now;
      const trialActive = t === 'trial' && (p.trialUntil || 0) > now;

      // anomálie u trialu – delší než 32 dní bez ručního prodloužení
      if (trialActive && !p.extended && !p.manuallySet) {
        const span = (p.trialUntil || 0) - (p.createdAt || p.trialUntil || 0);
        if (span > D32) warns.push(`⚠️ ${u.profile?.email || uid}: trial na ${Math.round(span/86400000)} dní (limit 30)`);
      }
      if (!active) return;

      const hasLog = !!logs[uid];
      const hasStripe = !!(p.stripeSubscriptionId || p.stripeCustomerId);
      const isManual = !!p.manuallySet;
      let status, color;
      if (hasLog || hasStripe) { status = '✅ Zaplaceno'; color = 'var(--income)'; paid++;
        const ev = logs[uid] ? Object.values(logs[uid]) : [];
        revenue += ev.reduce((a,e)=>a+((e.amount||0)/100),0);
      }
      else if (isManual) { status = '🔵 Ručně'; color = 'var(--bank)'; manual++; }
      else { status = '🔴 PODEZŘELÉ'; color = 'var(--expense)'; suspicious++; }

      if ((p.premiumUntil||0) > now + YEAR)
        warns.push(`⚠️ ${u.profile?.email || uid}: premium platné do ${new Date(p.premiumUntil).toLocaleDateString('cs-CZ')} (víc než rok)`);

      rows.push({ uid, email: u.profile?.email || '(bez e-mailu)', type: t, status, color,
        until: p.premiumUntil, events: logs[uid] ? Object.keys(logs[uid]).length : 0 });
    });

    rows.sort((a,b)=> (a.status.includes('PODEZ')?-1:1) - (b.status.includes('PODEZ')?-1:1));

    const card = (v, l, c) => `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px;text-align:center;min-width:0">
      <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:${c}">${v}</div>
      <div style="font-size:.68rem;color:#a8aec8">${l}</div></div>`;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin-bottom:14px">
        ${card(paid,'Zaplaceno přes Stripe','var(--income)')}
        ${card(manual,'Ručně udělené','var(--bank)')}
        ${card(suspicious,'🔴 Podezřelé', suspicious? 'var(--expense)':'#a8aec8')}
        ${card(fmt(Math.round(revenue))+' Kč','Přijato dle logu','var(--debt)')}
        ${card(founderCount+'/100','Zakládající místa','#8b7cf6')}
      </div>
      ${suspicious ? `<div style="padding:10px 12px;border-radius:9px;background:var(--expense-bg);border-left:3px solid var(--expense);margin-bottom:12px;font-size:.78rem;color:#e8eaf2;line-height:1.55">
        <strong>🔴 ${suspicious} účtů má Premium bez záznamu o platbě.</strong> Zkontroluj je v tabulce níže a porovnej se Stripe Dashboard → Payments. Pokud tam platbu nenajdeš, jde o zneužití – Premium odeber v záložce Uživatelé.</div>` : ''}
      ${warns.length ? `<div style="padding:10px 12px;border-radius:9px;background:var(--debt-bg);border-left:3px solid var(--debt);margin-bottom:12px;font-size:.76rem;color:#e8eaf2;line-height:1.6">${warns.slice(0,10).join('<br>')}</div>` : ''}
      <div style="overflow-x:auto"><table class="stat-table" style="width:100%;min-width:560px;font-size:.76rem">
        <thead><tr><th style="text-align:left">E-mail</th><th>Tier</th><th>Stav</th><th>Platné do</th><th>Plateb</th></tr></thead>
        <tbody>${rows.length ? rows.map(r=>`<tr>
          <td style="text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${r.email}</td>
          <td style="text-align:center">${r.type}</td>
          <td style="text-align:center;font-weight:700;color:${r.color}">${r.status}</td>
          <td style="text-align:center;color:#a8aec8">${r.until?new Date(r.until).toLocaleDateString('cs-CZ'):'–'}</td>
          <td style="text-align:center;color:#a8aec8">${r.events}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:#a8aec8;padding:14px">Zatím žádné aktivní placené účty</td></tr>'}</tbody>
      </table></div>
      <div style="font-size:.72rem;color:#a8aec8;margin-top:10px;line-height:1.6">
        <strong>Jak to číst:</strong> „Přijato dle logu" je součet částek z webhooku – <strong>porovnej ho se Stripe Dashboard → Payments za stejné období</strong>. Když sedí, nikdo tě neokrádá. Účty označené 🔵 Ručně jsi udělil ty sám (ty ve Stripe nenajdeš, to je v pořádku).
      </div>`;
  } catch (e) {
    el.innerHTML = `<div style="color:var(--expense);font-size:.8rem">❌ Chyba načítání: ${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════════════
//  S17.29 (Milan): BANOVÁNÍ ÚČTU
//  Ban se ukládá do TOP-LEVEL uzlu banned/{uid}, NE pod users/{uid}. Důvod: users/{uid}
//  má „.write: auth.uid === $uid" a v Firebase zápisové právo KASKÁDUJE dolů – kdyby ban
//  ležel uvnitř, uživatel by si ho sám smazal a odbanoval se.
// ══════════════════════════════════════════════════════
async function adminToggleBan(uid) {
  try {
    const snap = await _get(_ref(_db, `banned/${uid}`));
    const isBanned = snap.exists() && snap.val();
    if (isBanned) {
      if (!confirm('Odblokovat tento účet?')) return;
      await _set(_ref(_db, `banned/${uid}`), null);
      showToast('✅ Účet odblokován');
    } else {
      const reason = prompt('Důvod zablokování (uvidí ho uživatel):', 'Porušení podmínek použití');
      if (reason === null) return;
      await _set(_ref(_db, `banned/${uid}`), {
        at: Date.now(), by: window._currentUser.uid, reason: reason || 'Porušení podmínek použití'
      });
      showToast('🚫 Účet zablokován');
    }
    closeModal('modalUserDetail');
    await loadUsersList();
  } catch (e) {
    showToast('❌ Chyba: ' + e.message);
  }
}
