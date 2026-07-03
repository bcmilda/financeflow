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
  // Zachovat aktivní záložku při re-renderu (změna měsíce)
  const _activeTab = document.querySelector('.tx-filt-btn.active[id^="atab-"]')?.id?.replace('atab-','') || 'users';

  el.innerHTML = `
    <!-- Záložky admin panelu -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <button class="tx-filt-btn active" id="atab-users"   onclick="switchAdminTab('users',this)">👥 Uživatelé</button>
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

function switchAdminTab(tab, btn) {
  ['users','keywords','corrections','lowconf','stats','adopce','itemtags','suggestions','leads','announce','verze'].forEach(t => {
    const c = document.getElementById('atab-'+t+'-content');
    const b = document.getElementById('atab-'+t);
    if(c) c.style.display = 'none';
    if(b) b.classList.remove('active');
  });
  const content = document.getElementById('atab-'+tab+'-content');
  if(content) content.style.display = 'block';
  if(btn) btn.classList.add('active');
  if(tab==='leads') loadLeads();
  if(tab==='corrections') loadCorrections();
  if(tab==='lowconf') loadLowConf();
  if(tab==='stats') loadMappingStats();
  if(tab==='adopce'){ loadCategoryAdoption(); loadCustomCatsNoCoicop(); }
  if(tab==='itemtags') loadCommunityItemTags();
  if(tab==='suggestions') loadSuggestionOverrides();
  if(tab==='announce') loadAdminAnnouncements();
  if(tab==='verze') loadVerze();
}

const VERZE_LOG = [
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
          ? `<span title="COICOP ${c.coicop}: ${g.name||''}" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color||'#aaa'};color:#000;font-size:.58rem;font-weight:800;flex-shrink:0">${c.coicop}</span>`
          : `<span style="font-size:.6rem;color:var(--expense);padding:1px 5px;border:1px solid currentColor;border-radius:4px;white-space:nowrap">bez COICOP</span>`;
        const customBadge = !c.isDefault
          ? `<span style="font-size:.6rem;color:var(--debt);padding:1px 5px;border:1px solid currentColor;border-radius:6px;margin-left:3px">custom</span>` : '';
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
async function loadCustomCatsNoCoicop() {
  const el = document.getElementById('adminCustomCats'); if(!el) return;
  el.innerHTML = '<div class="card-body"><div class="empty"><div class="et">⏳ Načítám...</div></div></div>';
  try {
    const idToken = await window._currentUser?.getIdToken?.();
    if(!idToken) throw new Error('Nejste přihlášeni');
    const res = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?auth='+idToken);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    if(!data) { el.innerHTML = '<div class="card-body">Žádná data</div>'; return; }

    const defIds = new Set(DEFAULT_CATEGORIES.map(d=>d.id));
    const customMap = {};
    let totalUserCats = 0;

    Object.entries(data).forEach(([uid, udata]) => {
      // Kategorie mohou být pole nebo objekt s číselnými klíči
      let cats = udata?.data?.categories;
      if(!cats) return;
      if(Array.isArray(cats)) cats = cats.filter(Boolean);
      else cats = Object.values(cats).filter(Boolean);

      totalUserCats += cats.length;
      cats.forEach(c => {
        if(!c || !c.id || !c.name) return; // přeskočit prázdné záznamy
        if(defIds.has(c.id)) return;        // přeskočit výchozí (cat1–cat46)
        if(!customMap[c.id]) customMap[c.id] = {name:c.name, icon:c.icon||'📦', color:c.color||'#6b7280', users:[], coicop:c.coicop||null};
        if(!customMap[c.id].users.includes(uid)) customMap[c.id].users.push(uid);
      });
    });

    const withoutCoicop = Object.entries(customMap).filter(([,c])=>!c.coicop);
    const withCoicop = Object.entries(customMap).filter(([,c])=>!!c.coicop);

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
            ${coicopOptions}
          </select>
          <button class="btn btn-accent btn-sm" onclick="assignCoicop('${catId}','${c.name}')">Přiřadit</button>
        </div>`).join('')}
      `:''}
      ${withCoicop.length?`
      <div style="font-size:.72rem;font-weight:700;color:var(--income);text-transform:uppercase;margin:12px 0 8px">✅ Již přiřazeno (${withCoicop.length})</div>
      ${withCoicop.map(([catId,c])=>{
        const g=COICOP_GROUPS_DEF.find(x=>x.id===c.coicop)||{};
        return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;background:var(--surface2);border-radius:8px;margin-bottom:4px">
          <span>${c.icon}</span>
          <span style="font-size:.82rem;flex:1">${c.name}</span>
          <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color||'#aaa'};color:#000;font-size:.6rem;font-weight:800">${c.coicop}</span>
          <span style="font-size:.72rem;color:var(--text3)">${g.name||''}</span>
          <span style="font-size:.68rem;color:var(--text3)">${c.users.length} už.</span>
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

    // 2. Načti všechny uživatele a propsat COICOP do jejich kategorie
    const usersRes = await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users.json?auth=${idToken}`
    );
    if(!usersRes.ok) throw new Error('Nelze načíst uživatele: HTTP '+usersRes.status);
    const usersData = await usersRes.json();
    if(!usersData) throw new Error('Žádná uživatelská data');

    let updatedCount = 0;
    const patches = [];

    Object.entries(usersData).forEach(([uid, udata]) => {
      const cats = Array.isArray(udata?.data?.categories)
        ? udata.data.categories : Object.values(udata?.data?.categories||{});
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
  const myExpTxs = myTxs.filter(t => t.type === 'expense' && !t.isBalancing);
  const myExp = myExpTxs.reduce((a,t)=>a+Math.abs(t.amount||t.amt||0),0);
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
      const pExp = pTxs.filter(t => t.type === 'expense' && !t.isBalancing)
        .reduce((a,t)=>a+Math.abs(t.amount||t.amt||0),0);
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
              <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${g.color};color:#000;font-size:.6rem;font-weight:800;flex-shrink:0">${g.id}</span>
              <span style="font-size:.82rem;font-weight:600;flex:1">${g.icon} ${g.name}</span>
              <span style="font-size:.68rem;color:var(--text3)">${myPct}% výdajů</span>
              ${diffPct!==null?`<span style="font-size:.76rem;font-weight:700;color:${diff>0?'var(--expense)':'var(--income)'}">${diff>0?'+':''}${diffPct}%</span>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="font-size:.64rem;color:var(--text3);min-width:52px">ČSÚ průměr</span>
              <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(csuAmt/maxVal*100)}%;background:var(--bank);border-radius:3px"></div>
              </div>
              <span style="font-size:.68rem;color:var(--text3);min-width:48px;text-align:right">${fmt(csuAmt)} Kč</span>
            </div>
            ${myAmt>0?`<div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:.64rem;color:var(--text3);min-width:52px">Vy</span>
              <div style="flex:1;height:6px;background:var(--surface3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(myAmt/maxVal*100)}%;background:${g.color};border-radius:3px"></div>
              </div>
              <span style="font-size:.72rem;font-weight:700;color:${diff&&diff>0?'var(--expense)':g.color};min-width:48px;text-align:right">${fmt(myAmt)} Kč</span>
            </div>`:'<div style="font-size:.68rem;color:var(--text3);padding-left:60px">žádné výdaje</div>'}
          </div>`;
        }).join('');

        const unassignedPct = totalExp > 0 ? Math.round(unassigned/totalExp*100) : 0;

        const csuTotal = groups.reduce((a,g)=>a+csuRef(g),0);
        const modeLabel = _csuMode==='osoba' ? 'na osobu / měsíc' : `domácnost / měsíc (OECD ${oecd.toFixed(2).replace('.',',')}×)`;
        return `<div class="card" style="margin-bottom:12px">
          <div class="card-header">
            <span class="card-title">🔢 Moje výdaje dle COICOP vs. ČSÚ průměr</span>
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
                <div style="font-size:.68rem;color:var(--text3)">${_csuMode==='domacnost'&&hasFamily?`Výdaje rodiny (${familyMemberCount})`:'Moje výdaje'}</div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--bank)">${fmt(csuTotal)} Kč</div>
                <div style="font-size:.68rem;color:var(--text3)">ČSÚ ${_csuMode==='osoba'?'osoba':'domácnost'}</div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:${unassignedPct>20?'var(--expense)':'var(--text)'}">${unassignedPct}%</div>
                <div style="font-size:.68rem;color:var(--text3)">Nezařazeno</div>
              </div>
            </div>
            <!-- Klíčové metriky ČR (sjednoceno s horní řadou: text na střed, stejný font) -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px" class="csu-cr-grid">
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px">Průměrný příjem ČR</div>
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--income)">${fmt(CSU.avgIncome)} Kč</div>
                <div style="font-size:.66rem;margin-top:3px;color:${myBaseIncome>CSU.avgIncome?'var(--income)':'var(--expense)'}">
                  Vy: ${fmt(Math.round(myBaseIncome))} Kč ${myBaseIncome>CSU.avgIncome?'↑ nad':'↓ pod'} průměrem
                </div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px">Průměrné výdaje ČR</div>
                <div style="font-family:Syne;font-size:1.1rem;font-weight:800;color:var(--expense)">${fmt(CSU.avgExp)} Kč</div>
                <div style="font-size:.66rem;margin-top:3px;color:${myExp<CSU.avgExp?'var(--income)':'var(--expense)'}">
                  Vy: ${fmt(Math.round(myExp))} Kč ${myExp<CSU.avgExp?'✅ méně':'⚠️ více'}
                </div>
              </div>
              <div style="background:var(--surface2);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
                <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px">Průměrné úspory ČR</div>
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
                  let html = G.map(g=>{
                    const os=g.avg_osoba||0;
                    const domCR=Math.round(os*2.4);        // průměrná ČR domácnost
                    const domMine=Math.round(os*oecd2);    // tvoje domácnost dle nastavení
                    const subs=g.groups||[];
                    const hasSubs=subs.length>0;
                    const exp=_csuExpanded.has(g.id);
                    let row=`<tr style="border-top:1px solid var(--border)${hasSubs?';cursor:pointer':''}" ${hasSubs?`onclick="csuToggleDiv(${g.id})"`:''}>
                      <td style="padding:6px 8px">${hasSubs?`<span style="display:inline-block;width:12px;color:var(--text3)">${exp?'▾':'▸'}</span>`:'<span style="display:inline-block;width:12px"></span>'}<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${g.color};color:#000;font-size:.58rem;font-weight:800;margin:0 6px">${g.id}</span>${g.icon} ${g.name}</td>
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
                          <td style="padding:3px 8px;text-align:right;color:var(--text3)">—</td>
                          <td style="padding:3px 8px"></td>
                        </tr>`;
                        if(gExp && hasC){
                          grow += classes.map(cl=>`<tr style="background:var(--surface);font-size:.64rem">
                            <td style="padding:2px 8px 2px 52px;color:var(--text3)">${cl}</td>
                            <td style="padding:2px 8px;text-align:right;color:var(--text3)">—</td>
                            <td style="padding:2px 8px;text-align:right;color:var(--text3)">—</td>
                            <td style="padding:2px 8px;text-align:right;color:var(--text3)">—</td>
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
