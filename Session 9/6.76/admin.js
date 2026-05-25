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
}

async function renderAdmin() {
  const el = document.getElementById('adminContent'); if(!el) return;
  if(!isAdmin()) {
    el.innerHTML = '<div class="card"><div class="card-body"><div class="empty"><div class="ei">🔐</div><div class="et">Přístup odepřen</div></div></div></div>';
    return;
  }
  el.innerHTML = `
    <!-- Záložky admin panelu -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <button class="tx-filt-btn active" id="atab-users"   onclick="switchAdminTab('users',this)">👥 Uživatelé</button>
      <button class="tx-filt-btn"        id="atab-keywords" onclick="switchAdminTab('keywords',this)">🔑 Keyword engine</button>
      <button class="tx-filt-btn"        id="atab-corrections" onclick="switchAdminTab('corrections',this)">✏️ User corrections</button>
      <button class="tx-filt-btn"        id="atab-lowconf"  onclick="switchAdminTab('lowconf',this)">⚠️ Low confidence</button>
      <button class="tx-filt-btn"        id="atab-stats"    onclick="switchAdminTab('stats',this)">📊 Statistiky</button>
      <button class="tx-filt-btn"        id="atab-leads"    onclick="switchAdminTab('leads',this)">📋 Leady</button>
      <button class="tx-filt-btn"        id="atab-verze"    onclick="switchAdminTab('verze',this)">📝 Verze</button>
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
            </select>
            <select class="fi" id="userSortBy" style="flex:1;min-width:120px;font-size:.82rem" onchange="filterUsersList()">
              <option value="createdAt-desc">Nejnovější</option>
              <option value="createdAt-asc">Nejstarší</option>
              <option value="name-asc">Jméno A→Z</option>
              <option value="until-asc">Expirace ↑</option>
            </select>
          </div>
          <div id="adminUsersList"><div class="empty"><div class="et">⏳ Klikni na 🔄 pro načtení seznamu</div></div></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">🔗 Affiliate</span></div>
        <div id="adminAffiliateStats"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
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
    <div id="atab-verze-content" style="display:none">
      <div class="card">
        <div class="card-header"><span class="card-title">📝 Historie verzí</span></div>
        <div id="adminVerzeList"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>
      </div>
    </div>`;

  loadUserStats();
  loadAffiliateStats();
  loadKeywords();
}

function switchAdminTab(tab, btn) {
  ['users','keywords','corrections','lowconf','stats','leads','verze'].forEach(t => {
    const c = document.getElementById('atab-'+t+'-content');
    const b = document.getElementById('atab-'+t);
    if(c) c.style.display = 'none';
    if(b) b.classList.remove('active');
  });
  const content = document.getElementById('atab-'+tab+'-content');
  if(content) content.style.display = 'block';
  if(btn) btn.classList.add('active');
  // Načti data pro záložku
  if(tab==='leads') loadLeads();
  if(tab==='corrections') loadCorrections();
  if(tab==='lowconf') loadLowConf();
  if(tab==='stats') loadMappingStats();
  if(tab==='verze') loadVerze();
}

const VERZE_LOG = [
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

    // Načti premium statusy
    const premRes = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?orderBy="premium/type"'+( idToken?'&auth='+idToken:''));
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

async function loadUsersList() {
  const el = document.getElementById('adminUsersList');
  if (!el) return;
  if (!isAdmin()) {
    el.innerHTML = '<div class="empty"><div class="et">🔐 Přístup odepřen</div></div>';
    return;
  }
  el.innerHTML = '<div class="empty"><div class="et">⏳ Načítám uživatele...</div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    const url = 'https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json' +
                (idToken ? '?auth=' + idToken : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data) {
      el.innerHTML = '<div class="empty"><div class="et">Žádní uživatelé</div></div>';
      return;
    }

    // Vytáhni potřebné info pro každého uživatele
    _cachedUsers = Object.entries(data).map(([uid, u]) => {
      const p = u?.premium || {};
      const prof = u?.profile || {};
      const ref = u?.referral || {};
      const txCount = u?.data?.transactions ? Object.keys(u.data.transactions).length : 0;
      // Spočítej "lastActivity" – odhad podle poslední transakce nebo createdAt
      let lastActivity = p.createdAt || 0;
      if (u?.data?.transactions) {
        const txs = Object.values(u.data.transactions);
        const lastTx = txs.reduce((max, t) => Math.max(max, new Date(t.date || 0).getTime() || 0), 0);
        if (lastTx > lastActivity) lastActivity = lastTx;
      }
      return {
        uid,
        displayName: prof.displayName || u?.displayName || '',
        email: prof.email || u?.email || '',
        photoURL: prof.photoURL || '',
        premium: {
          type: p.type || 'free',
          trialUntil: p.trialUntil || 0,
          premiumUntil: p.premiumUntil || 0,
          createdAt: p.createdAt || 0,
          extended: p.extended || false,
        },
        referral: {
          code: ref.code || '',
          clicks: ref.clicks || 0,
          conversions: ref.conversions || 0,
          earned: ref.earned || 0,
        },
        transactionsCount: txCount,
        lastActivity,
        isAdmin: ADMIN_UIDS.includes(uid),
      };
    });

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
    return true;
  });

  // Sort
  list.sort((a, b) => {
    if (sort === 'createdAt-desc') return (b.premium.createdAt || 0) - (a.premium.createdAt || 0);
    if (sort === 'createdAt-asc')  return (a.premium.createdAt || 0) - (b.premium.createdAt || 0);
    if (sort === 'name-asc')       return (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid);
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
            <div style="font-size:.65rem;color:var(--text3);margin-top:2px">
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
            <div style="font-size:.68rem;color:var(--text3);font-family:monospace;margin-top:4px;word-break:break-all">${u.uid}</div>
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
        </div>

        <!-- Affiliate / Referral -->
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600">Affiliate</div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
          ${u.referral.code ? `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center;font-size:.8rem">
              <div><div style="color:var(--text3);font-size:.68rem">Kód</div><div style="font-weight:700;color:var(--bank);font-family:monospace">${u.referral.code}</div></div>
              <div><div style="color:var(--text3);font-size:.68rem">Kliků</div><div style="font-weight:700">${u.referral.clicks}</div></div>
              <div><div style="color:var(--text3);font-size:.68rem">Konverzí</div><div style="font-weight:700;color:var(--income)">${u.referral.conversions}</div></div>
            </div>
          ` : '<div style="text-align:center;color:var(--text3);font-size:.78rem;padding:6px">Uživatel nemá vytvořený referral kód</div>'}
        </div>

        <!-- Statistiky -->
        <div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600">Statistiky</div>
        <div style="background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.8rem">
            <div><div style="color:var(--text3);font-size:.7rem">Transakce</div><div style="font-weight:600">${u.transactionsCount}</div></div>
            <div><div style="color:var(--text3);font-size:.7rem">Poslední aktivita</div><div style="font-weight:600;font-size:.78rem">${fmtDate(u.lastActivity)}</div></div>
          </div>
        </div>

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

function adminViewUserAs(uid) {
  if (!confirm('Přepnout pohled jako tento uživatel? (Read-only – nelze měnit jejich data)\n\nPro návrat klikni na "Vrátit se k mým datům" v hlavičce nebo refreshni stránku.')) return;
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

async function loadKeywords() {
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

async function addKeywordRule() {
  const kw  = document.getElementById('kw-new-keyword')?.value.trim().toLowerCase();
  const cid = parseInt(document.getElementById('kw-new-coicop')?.value);
  if(!kw) { alert('Zadejte klíčové slovo'); return; }
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
      const txs = udata?.data?.transactions || [];
      txs.forEach(tx => {
        if(tx.type !== 'expense') return;
        const {coicopId, confidence} = mapToCOICOP(tx);
        if(confidence < 50) {
          lowConf.push({uid: uid.slice(0,8)+'...', tx, coicopId, confidence});
        }
      });
    });
    lowConf.sort((a,b) => a.confidence - b.confidence);
    const top50 = lowConf.slice(0, 50);
    el.innerHTML = `
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:8px">${lowConf.length} transakcí s nízkou jistotou · zobrazeno ${top50.length}</div>
      <table style="width:100%;border-collapse:collapse;font-size:.78rem">
        <thead><tr style="border-bottom:2px solid var(--border)">
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Transakce</th>
          <th style="text-align:left;padding:6px 8px;color:var(--text2)">Namapováno</th>
          <th style="text-align:center;padding:6px 8px;color:var(--text2)">Jistota</th>
          <th style="padding:6px 8px"></th>
        </tr></thead>
        <tbody>
          ${top50.map(({uid, tx, coicopId, confidence}) => {
            const grp = COICOP_GROUPS_DEF.find(g=>g.id==coicopId);
            const confColor = confidence < 20 ? 'var(--expense)' : confidence < 35 ? '#f59e0b' : 'var(--text2)';
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px 8px">
                <div style="font-weight:600">${tx.name||'–'}</div>
                <div style="font-size:.68rem;color:var(--text2)">${uid} · ${tx.date||''}</div>
              </td>
              <td style="padding:6px 8px;font-size:.74rem">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${grp?.color||'#999'};margin-right:4px;vertical-align:middle"></span>
                ${grp?.name||'Ostatní'}
              </td>
              <td style="padding:6px 8px;text-align:center;font-weight:700;color:${confColor}">${confidence}%</td>
              <td style="padding:6px 8px">
                <button class="btn btn-ghost btn-sm" onclick="addKeywordFromLowConf('${(tx.name||'').toLowerCase().replace(/'/g,'')}',${coicopId})" style="font-size:.7rem;padding:2px 6px">➕ Přidat pravidlo</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    el.innerHTML = `<div style="color:var(--expense);padding:12px;font-size:.8rem">Chyba: ${e.message}</div>`;
  }
}

function addKeywordFromLowConf(name, suggestedId) {
  const kw = prompt(`Klíčové slovo pro pravidlo:\n(např. část názvu "${name}")`, name.split(' ')[0]);
  if(!kw) return;
  const newId = prompt(`COICOP skupina:\n${COICOP_GROUPS_DEF.map(g=>`${g.id}. ${g.name}`).join('\n')}\n\nZadejte číslo:`, suggestedId);
  if(!newId) return;
  _update(_ref(_db), {
    [`keyword_overrides/${kw.toLowerCase()}`]: {coicopId: parseInt(newId), updatedAt: Date.now(), updatedBy: 'admin-lowconf'}
  }).then(() => { alert('✅ Pravidlo přidáno!'); loadKeywords(); });
}

// ══════════════════════════════════════════════════════
//  ADMIN – STATISTIKY MAPOVÁNÍ
// ══════════════════════════════════════════════════════
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
      const txs = udata?.data?.transactions || [];
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
const COMMUNITY_MONTH_KEY = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
};

async function publishCommunityStats(D) {
  // Opt-out check
  const optOut = document.getElementById('settingCommunity');
  if(optOut && !optOut.checked) return;
  if(!window._currentUser || window._currentUser.isAnonymous) return;

  const txs = getTx(S.curMonth, S.curYear, D);
  const baseIncome = computeBaseIncome(D);
  if(!baseIncome || txs.length < 3) return; // nedostatek dat

  const monthKey = COMMUNITY_MONTH_KEY();
  const uid = window._currentUser.uid;

  // Spočítej výdaje dle kategorií
  const catStats = {};
  const expCats = (D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  expCats.forEach(cat => {
    const spent = txs.filter(t=>(t.catId||t.category)===cat.id&&t.type==='expense')
      .reduce((a,t)=>a+(t.amount||t.amt||0),0);
    if(spent > 0) catStats[cat.name] = Math.round(spent);
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

async function renderKomunita() {
  const el = document.getElementById('komunitaContent'); if(!el) return;
  el.innerHTML = `<div class="card"><div class="card-body"><div class="empty"><div class="et">⏳ Načítám data...</div></div></div></div>`;

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
  const myIncome = incSum(myTxs);
  const myExp = expSum(myTxs);
  const myBaseIncome = computeBaseIncome(D)||myIncome;
  const mySaving = myBaseIncome>0?Math.round((myBaseIncome-myExp)/myBaseIncome*100):0;

  // Načti komunitní data z Firebase (bonus – může být prázdné)
  let communityData = null;
  try {
    const monthKey = COMMUNITY_MONTH_KEY();
    const snap = await _get(_ref(_db, `community/${monthKey}/users`));
    if(snap.exists()) {
      const allUsers = Object.values(snap.val());
      const catTotals = {}, catCounts = {};
      let totalExpSum = 0, savingRateSum = 0, totalIncSum = 0;
      allUsers.forEach(u => {
        totalExpSum += u.totalExp||0;
        totalIncSum += u.income||0;
        savingRateSum += u.savingRate||0;
        Object.entries(u.cats||{}).forEach(([cat,amt])=>{
          catTotals[cat]=(catTotals[cat]||0)+amt;
          catCounts[cat]=(catCounts[cat]||0)+1;
        });
      });
      communityData = {
        count: allUsers.length,
        avgExp: Math.round(totalExpSum/allUsers.length),
        avgIncome: Math.round(totalIncSum/allUsers.length),
        avgSaving: Math.round(savingRateSum/allUsers.length),
        cats: Object.entries(catTotals).map(([cat,total])=>({
          cat, avg:Math.round(total/catCounts[cat]), count:catCounts[cat]
        })).sort((a,b)=>b.avg-a.avg)
      };
    }
  } catch(e) {}

  el.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,rgba(96,165,250,.08),rgba(74,222,128,.05));border:1px solid rgba(96,165,250,.2);border-radius:var(--radius);padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">🌍 Komunitní přehled · ${CZ_M[S.curMonth]} ${S.curYear}</div>
      <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800">Jak si stojím vs průměr ČR?</div>
      <div style="font-size:.74rem;color:var(--text3);margin-top:4px">Statistiky ČSÚ ${CSU.year} + anonymní data uživatelů FinanceFlow</div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;gap:6px;margin-bottom:14px">
      <button class="tx-filt-btn active" id="ktab-csu" onclick="switchKomunitaTab('csu',this)">📊 ČSÚ průměry</button>
      <button class="tx-filt-btn" id="ktab-app" onclick="switchKomunitaTab('app',this)">👥 Uživatelé aplikace ${communityData?'('+communityData.count+')':'(0)'}</button>
    </div>

    <!-- TAB: ČSÚ -->
    <div id="ktab-csu-content">
      <!-- Zdroj info -->
      <div style="background:var(--surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:.76rem;color:var(--text2);border:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span>📋 Zdroj: <strong>Český statistický úřad</strong> – Statistika rodinných účtů ${CSU.year}</span>
        <a href="https://csu.gov.cz/statistika-rodinnych-uctu" target="_blank" style="font-size:.72rem;color:var(--bank);text-decoration:none">Více na czso.gov.cz →</a>
      </div>

      <!-- Klíčové metriky -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div class="stat-card income">
          <div class="stat-label">Průměrný příjem ČR</div>
          <div class="stat-value up">${fmt(CSU.avgIncome)} Kč</div>
          <div class="stat-sub" style="color:${myBaseIncome>CSU.avgIncome?'var(--income)':'var(--expense)'}">
            Vy: ${fmt(Math.round(myBaseIncome))} Kč ${myBaseIncome>CSU.avgIncome?'↑ nad':'↓ pod'} průměrem
          </div>
        </div>
        <div class="stat-card expense">
          <div class="stat-label">Průměrné výdaje ČR</div>
          <div class="stat-value down">${fmt(CSU.avgExp)} Kč</div>
          <div class="stat-sub" style="color:${myExp<CSU.avgExp?'var(--income)':'var(--expense)'}">
            Vy: ${fmt(Math.round(myExp))} Kč ${myExp<CSU.avgExp?'✅ méně':'⚠️ více'}
          </div>
        </div>
        <div class="stat-card balance">
          <div class="stat-label">Průměrné úspory ČR</div>
          <div class="stat-value">${CSU.savingRate}%</div>
          <div class="stat-sub" style="color:${mySaving>CSU.savingRate?'var(--income)':'var(--expense)'}">
            Vy: ${mySaving}% ${mySaving>CSU.savingRate?'↑ nad':'↓ pod'} průměrem
          </div>
        </div>
      </div>

      <!-- Kategorie ČSÚ vs moje výdaje -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 Průměrné výdaje domácnosti – ČSÚ ${CSU.year}</span>
          <span style="font-size:.7rem;color:var(--text3)">průměrná domácnost</span>
        </div>
        <div class="card-body">
          ${CSU.cats.map(c=>{
            // Najdi odpovídající kategorii v mých datech
            const myCat = (D.categories||[]).find(cat=>{
              const n=cat.name.toLowerCase();
              const cn=c.name.toLowerCase();
              return cn.includes('potraviny')&&(n.includes('jídlo')||n.includes('potraviny'))
                ||cn.includes('doprava')&&n.includes('doprava')
                ||cn.includes('restaurace')&&(n.includes('restaurace')||n.includes('stravování'))
                ||cn.includes('rekreace')&&(n.includes('zábava')||n.includes('rekreace')||n.includes('sport'))
                ||cn.includes('oblečení')&&(n.includes('oblečení')||n.includes('obuv'))
                ||cn.includes('zdraví')&&n.includes('zdraví')
                ||cn.includes('komunikace')&&(n.includes('telefon')||n.includes('internet'))
                ||cn.includes('vzdělávání')&&n.includes('vzdělávání')
                ||cn.includes('pojištění')&&n.includes('pojištění');
            });
            const myAmt = myCat ? myTxs.filter(t=>(t.catId||t.category)===myCat.id&&t.type==='expense')
              .reduce((a,t)=>a+(t.amount||t.amt||0),0) : 0;
            const diff = myAmt>0 ? myAmt-c.avg : null;
            const diffPct = diff!==null&&c.avg>0 ? Math.round(diff/c.avg*100) : null;
            const maxVal = Math.max(c.avg, myAmt, 1);
            return `<div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <div>
                  <span style="font-size:.82rem;font-weight:600">${c.name}</span>
                  <span style="font-size:.68rem;color:var(--text3);margin-left:6px">${c.note}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                  ${diffPct!==null?`<span style="font-size:.72rem;color:${diff>0?'var(--expense)':'var(--income)'};font-weight:600">${diff>0?'+':''}${diffPct}%</span>`:''}
                  <span style="font-size:.8rem;font-weight:700;color:var(--text2)">${fmt(c.avg)} Kč</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:.66rem;color:var(--text3);min-width:52px">ČSÚ průměr</span>
                <div style="flex:1;height:8px;background:var(--surface3);border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(c.avg/maxVal*100)}%;background:var(--bank);border-radius:4px"></div>
                </div>
                <span style="font-size:.68rem;color:var(--text3);min-width:40px;text-align:right">${fmt(c.avg)}</span>
              </div>
              ${myAmt>0?`<div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:.66rem;color:var(--text3);min-width:52px">Vy</span>
                <div style="flex:1;height:8px;background:var(--surface3);border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(myAmt/maxVal*100)}%;background:${diff>0?'var(--expense)':'var(--income)'};border-radius:4px"></div>
                </div>
                <span style="font-size:.68rem;font-weight:700;color:${diff>0?'var(--expense)':'var(--income)'};min-width:40px;text-align:right">${fmt(Math.round(myAmt))}</span>
              </div>`:''}
            </div>`;
          }).join('')}
          <div style="font-size:.7rem;color:var(--text3);padding:8px;background:var(--surface2);border-radius:8px;margin-top:8px">
            ℹ️ Hodnoty ČSÚ jsou průměry na domácnost (2,4 osoby). Zdroj: Statistika rodinných účtů ${CSU.year}, czso.gov.cz
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
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div class="stat-card income"><div class="stat-label">Průměrný příjem</div><div class="stat-value up">${fmt(communityData.avgIncome)} Kč</div></div>
          <div class="stat-card expense"><div class="stat-label">Průměrné výdaje</div><div class="stat-value down">${fmt(communityData.avgExp)} Kč</div></div>
          <div class="stat-card balance"><div class="stat-label">Průměrné úspory</div><div class="stat-value">${communityData.avgSaving}%</div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📊 Výdaje dle kategorie – uživatelé aplikace</span></div>
          <div class="card-body">
            ${communityData.cats.slice(0,10).map(({cat,avg,count})=>{
              const myCat=(D.categories||[]).find(c=>c.name===cat);
              const myAmt=myCat?myTxs.filter(t=>(t.catId||t.category)===myCat.id&&t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0):0;
              const diff=myAmt-avg;
              const maxVal=Math.max(avg,myAmt,1);
              return `<div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:4px">
                  <span style="font-weight:600">${cat}</span>
                  <span style="color:${myAmt>0?(diff>0?'var(--expense)':'var(--income)'):'var(--text3)'}">${myAmt>0?(diff>0?'↑':'↓ pod průměrem'):''} ${fmt(avg)} Kč</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                  <span style="font-size:.66rem;color:var(--text3);min-width:52px">Průměr</span>
                  <div style="flex:1;height:8px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(avg/maxVal*100)}%;background:var(--bank);border-radius:4px"></div></div>
                  <span style="font-size:.68rem;color:var(--text3);min-width:40px;text-align:right">${fmt(avg)}</span>
                </div>
                ${myAmt>0?`<div style="display:flex;align-items:center;gap:6px">
                  <span style="font-size:.66rem;color:var(--text3);min-width:52px">Vy</span>
                  <div style="flex:1;height:8px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(myAmt/maxVal*100)}%;background:${diff>0?'var(--expense)':'var(--income)'};border-radius:4px"></div></div>
                  <span style="font-size:.68rem;font-weight:700;color:${diff>0?'var(--expense)':'var(--income)'};min-width:40px;text-align:right">${fmt(Math.round(myAmt))}</span>
                </div>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>`}
    </div>

    <!-- Opt-out info -->
    <div style="text-align:center;font-size:.72rem;color:var(--text3);padding:10px;margin-top:4px">
      Přispíváte anonymními daty · Vypnout lze v <span onclick="showPage('nastaveni',null)" style="color:var(--bank);cursor:pointer;text-decoration:underline">Nastavení</span>
    </div>`;
}

function switchKomunitaTab(tab, btn) {
  ['csu','app'].forEach(t=>{
    const c=document.getElementById('ktab-'+t+'-content');
    const b=document.getElementById('ktab-'+t);
    if(c)c.style.display='none';
    if(b)b.classList.remove('active');
  });
  const content=document.getElementById('ktab-'+tab+'-content');
  if(content)content.style.display='block';
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
    (t.tags||[]).forEach(tag => {
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
                ${(t.tags||[]).map(tag=>`<span style="background:var(--bank);color:white;padding:1px 6px;border-radius:8px;font-size:.68rem">#${tag}</span>`).join('')}
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
    if(el) { el.value = tag; renderTx(); }
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
  ['txCatFilter','txSubFilter','txProjectFilter','txWalletFilter','txPayTypeFilter'].forEach(id => {
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
