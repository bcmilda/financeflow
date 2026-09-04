// FinanceFlow · v10.43 · app.js · 2026-09-04
var _auth, _db, _provider;

// ── TODO-006: Globální error handler ──
// Zachytí neošetřené JS výjimky a Promise rejection → zobrazí uživatelsky přívětivou chybovou obrazovku
// místo bílé/prázdné stránky
(function initGlobalErrorHandler() {
  const _errorBucket = new Set(); // deduplikace identických chyb

  function showCrashBanner(msg, detail) {
    // Pokud aplikace ještě nenačtena, počkej na DOM
    const show = () => {
      // Deduplikace – stejnou chybu nezobrazuj dvakrát
      if(_errorBucket.has(msg)) return;
      _errorBucket.add(msg);
      setTimeout(() => _errorBucket.delete(msg), 10000); // reset po 10s

      // Sentry capture – pokud je dostupný
      try { if(window.Sentry) window.Sentry.captureException(new Error(msg)); } catch(e){}

      const el = document.getElementById('globalErrorBanner');
      if(!el) {
        // Fallback – banner ještě neexistuje v DOM
        const banner = document.createElement('div');
        banner.id = 'globalErrorBanner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7f1d1d;color:#fecaca;padding:10px 14px;font-size:.82rem;display:flex;align-items:center;gap:10px;box-shadow:0 2px 12px rgba(0,0,0,.5)';
        banner.innerHTML = `<span style="font-size:1.2rem">⚠️</span><div style="flex:1"><strong>Chyba aplikace:</strong> ${msg.slice(0,120)}</div><button onclick="location.reload()" style="background:#ef4444;border:none;color:#fff;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.8rem;flex-shrink:0">🔄 Obnovit</button><button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fca5a5;cursor:pointer;font-size:1rem;flex-shrink:0">✕</button>`;
        document.body?.prepend(banner) || document.head?.after(banner);
        return;
      }
      // Banner existuje – aktualizuj a zobraz
      el.querySelector('.crash-msg').textContent = msg.slice(0,120);
      el.style.display = 'flex';
      // Auto-hide po 8s pro nekritické chyby
      setTimeout(() => { el.style.display = 'none'; }, 8000);
    };

    if(document.body) show();
    else document.addEventListener('DOMContentLoaded', show, {once:true});
  }

  // JS runtime errors
  window.addEventListener('error', (e) => {
    // Ignoruj chyby ze třetích stran (CDN, extensions)
    if(e.filename && !e.filename.includes(location.hostname)) return;
    // Ignoruj ResizeObserver loop (harmless browser quirk)
    if(e.message?.includes('ResizeObserver')) return;
    console.error('[GlobalError]', e.message, e.filename, e.lineno);
    showCrashBanner(e.message || 'Neznámá chyba JS');
  });

  // Unhandled Promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason) || 'Neošetřená Promise rejection';
    // Ignoruj Firebase CORS/network chyby při offline
    if(msg.includes('network') || msg.includes('Failed to fetch')) return;
    if(msg.includes('permission-denied')) return; // Firebase pravidla – normální pro nepřihlášené
    console.error('[UnhandledRejection]', msg);
    showCrashBanner(msg);
  });
})();


// Synchronizováno s Firebase exportem (Session 9, v6.73).
// Nová pole: coicop (1–13|null), shared (ID překrývajících kategorií), coicopOverrides (podkategorie s jiným COICOP než nadřazená).
// Příjmové kategorie mají coicop:null – nevstupují do COICOP výdajové analýzy.
const DEFAULT_CATEGORIES = [
  {id:'cat1', name:'Jídlo & Nákupy',  icon:'🛒', color:'#f87171', type:'expense', coicop:1,  healthAmt:10000, healthPct:31, isSaving:false,
   subs:['Supermarket','Tržnice','Rozvoz jídla','Restaurace']},
  {id:'cat2', name:'Doprava',          icon:'🚗', color:'#60a5fa', type:'expense', coicop:7,  isSaving:false,  stable:false,
   subs:['MHD','Taxi/Uber','Vlak','Bus','Tramvaj/Metro','Letadlo']},
  {id:'cat3', name:'Bydlení',          icon:'🏠', color:'#a78bfa', type:'expense', coicop:4,  isSaving:false,  stable:false,
   subs:['Nájem','Energie','Internet','Pojištění','Plyn','Voda','Daň z nemovitosti','Popelnice','TV poplatky','Deposit','Kominík','Servis kotle','Fond oprav']},
  {id:'cat4', name:'Zdraví',           icon:'💊', color:'#fb923c', type:'expense', coicop:6,  isSaving:false,  stable:false,
   subs:['Léky','Lékař','Gym','Oční','Zubní']},
  {id:'cat5', name:'Zábava',           icon:'🎬', color:'#e879f9', type:'expense', coicop:9,  isSaving:false,  stable:false,
   subs:['Kino/Kultura','Streaming','Hry','Výlety','Bruslení','Vstupenky','Zoo','Koncerty','Čajovna','Pernamentka fotbal']},
  {id:'cat6', name:'Dárky',            icon:'🎁', color:'#fbbf24', type:'expense', coicop:12, isSaving:false,  stable:false,
   subs:['Narozeniny','Vánoce','Ostatní dárky','Květiny']},
  {id:'cat7', name:'Výplata',          icon:'💰', color:'#4ade80', type:'income',  coicop:null, stable:true,
   subs:['Základní plat','Bonus','Přesčasy']},
  {id:'cat8', name:'Ostatní příjmy',   icon:'💵', color:'#34d399', type:'income',  coicop:null, stable:false,
   subs:['Freelance','Pronájem','Dividendy','Ostatní']},
  {id:'cat11',name:'Auto',             icon:'🚙', color:'#38bdf8', type:'expense', coicop:7,
   coicopOverrides:{'Pojištění auta':12,'Havarijní pojištění':12},
   subs:['Palivo','Pojištění auta','Opravy','STK','Havarijní pojištění','Parkovné','Dálniční známka']},
  {id:'cat12',name:'Banka',            icon:'🏦', color:'#94a3b8', type:'expense', coicop:12, isSaving:false,  stable:false,
   subs:['Poplatky za účet','Poplatky za kartu','Kurzové poplatky','Ostatní bankovní poplatky','Poplatky']},
  {id:'cat13',name:'Cashback',         icon:'💸', color:'#6ee7b7', type:'income',  coicop:null, stable:false, stabilityWeight:0,
   subs:['Cashback karta','Věrnostní program','Bonus za nákup','Vrácení peněz']},
  {id:'cat14',name:'Finanční úřad',    icon:'🏛️', color:'#f59e0b', type:'both',    coicop:13,
   subs:['Daň z příjmů','DPH','Silniční daň','Daňový přeplatek','Daňová záloha']},
  {id:'cat15',name:'Dar',              icon:'🤝', color:'#a3e635', type:'income',  coicop:null, stable:false,
   subs:['Dar od rodiny','Dar od přátel','Dědictví','Sbírka']},
  {id:'cat16',name:'Dítě',             icon:'👶', color:'#fb7185', type:'expense', coicop:12, isSaving:false,  stable:false,
   coicopOverrides:{'Školka/škola':10,'Kroužky':10,'Knihy a učebnice':10,'Obědy':11,'Zábava':9},
   subs:['Školka/škola','Kroužky','Oblečení dítěte','Hračky','Kapesné','Knihy a učebnice','Obědy','Dárky','Zábava','Dětské spoření','Spotřební zboží']},
  {id:'cat17',name:'Domácí potřeby',   icon:'🧹', color:'#c084fc', type:'expense', coicop:5,  isSaving:false,  stable:false,
   subs:['Čisticí prostředky','Spotřebiče','Nádobí','Dekorace','Nábytek','Opravy domácnosti','Prací prostředky','Obecné']},
  {id:'cat18',name:'Dovolená & Relax', icon:'🏖️', color:'#22d3ee', type:'expense', coicop:9,  isSaving:false,  stable:false,
   coicopOverrides:{'Hotel/Ubytování':11,'Cestovní pojištění':12},
   subs:['Hotel/Ubytování','Dovolená balíček','Výlet','Cestovní pojištění','Wellness']},
  {id:'cat19',name:'Elektronika',      icon:'💻', color:'#818cf8', type:'expense', coicop:5,  isSaving:false,  stable:false,
   subs:['Telefon','Počítač','Příslušenství','TV/Audio','Smart home','Baterie']},
  {id:'cat20',name:'Jídlo & Pití',     icon:'🍽️', color:'#f97316', type:'expense', coicop:11, isSaving:false,  stable:false,
   coicopOverrides:{'Alkohol':2},
   subs:['Restaurace','Kavárna','Fast food','Alkohol','Rozvoz','Catering','Kebab','Pizza']},
  {id:'cat21',name:'Jiné',             icon:'📦', color:'#6b7280', type:'expense', coicop:12,
   subs:['Různé výdaje','Nerozřazeno']},
  {id:'cat22',name:'Letenka',          icon:'✈️', color:'#0ea5e9', type:'expense', coicop:7,
   subs:['Letenka tam','Letenka zpět','Letenka tam a zpět','Příplatek za zavazadla']},
  {id:'cat23',name:'Nákup',            icon:'🛍️', color:'#ec4899', type:'expense', coicop:12,
   subs:['Online nákup','Kamenný obchod','Trh/Bazár','Aukce']},
  {id:'cat24',name:'Oblečení',         icon:'👕', color:'#f472b6', type:'expense', coicop:3,  isSaving:false,  stable:false,
   subs:['Triko/Kalhoty','Boty','Zimní oblečení','Sportovní oblečení','Doplňky','Oprava oblečení']},
  {id:'cat25',name:'Opravy',           icon:'🔧', color:'#78716c', type:'expense', coicop:5,  isSaving:false,  stable:false,
   coicopOverrides:{'Auto opravy':7,'Telefon':8},
   shared:['cat11'],
   subs:['Řemeslníci','Spotřebiče','Auto opravy','Elektronika','PC/Notebook','Telefon']},
  {id:'cat26',name:'Alkohol',          icon:'🍺', color:'#d97706', type:'expense', coicop:2,
   shared:['cat20'],
   subs:['Pivo','Víno','Tvrdý alkohol','Bar/Hospoda']},
  {id:'cat27',name:'Pojištění',        icon:'🛡️', color:'#7c3aed', type:'expense', coicop:12, isSaving:false,  stable:false,
   coicopOverrides:{'Zdravotní pojištění':6,'Havarijní pojištění':7},
   shared:['cat3','cat11'],
   subs:['Životní pojištění','Majetkové pojištění','Cestovní pojištění','Havarijní pojištění','Zdravotní pojištění']},
  {id:'cat28',name:'Pošta',            icon:'📮', color:'#ef4444', type:'expense', coicop:8,  isSaving:false,  stable:false,
   subs:['Zásilka','Clo','Dopis','Poštovné','Ověření podpisu','Balíkovna','Losy']},
  {id:'cat29',name:'Sebevzdělání',     icon:'📚', color:'#0891b2', type:'expense', coicop:10, isSaving:false,  stable:false,
   subs:['Online kurz','Školení','Certifikát','Cizí jazyk','Knihy','Konference']},
  {id:'cat30',name:'Předplatné',       icon:'📺', color:'#8b5cf6', type:'expense', coicop:9,  isSaving:false,  stable:false,
   subs:['YouTube Premium','Spotify','Netflix','Google One','Disney+','Adobe','Patreon','Alza+','Aplikace','Noviny/Časopisy','HBO Max']},
  {id:'cat31',name:'Příspěvky zaměstnavatele', icon:'🏢', color:'#10b981', type:'income', coicop:null, stable:false, stabilityWeight:0, isSaving:false,
   subs:['Penzijko','Stravenky/Edenred','Benefit karta','Příspěvek na sport','Příspěvek na vzdělání','DIP']},
  {id:'cat32',name:'Půjčka',           icon:'🤲', color:'#dc2626', type:'both',    coicop:13, isSaving:false,  stable:false, stabilityWeight:0,
   subs:['Hypotéka','Spotřebitelský úvěr','Půjčka od rodiny','Kreditní karta','Leasing','Kamarádovi']},
  {id:'cat33',name:'Rekonstrukce',     icon:'🔨', color:'#92400e', type:'expense', coicop:5,  isSaving:false,  stable:false,
   coicopOverrides:{'Kotel':4,'Okna':4,'Podlahy':4,'Koupelna':4,'Fasáda':4},
   shared:['cat25'],
   subs:['Zedník','Instalatér','Elektrikář','Materiál','Kotel','Okna','Podlahy','Koupelna','Fasáda']},
  {id:'cat34',name:'Služby',           icon:'⚙️', color:'#0f766e', type:'expense', coicop:12, isSaving:false,  stable:false,
   subs:['Účetnictví','Právník','IT služby','Úklid','Zahradník','Hodinář','Holič/Kadeřník']},
  {id:'cat35',name:'Splátka',          icon:'💳', color:'#b45309', type:'expense', coicop:13,
   subs:['Splátka hypotéky','Splátka úvěru','Splátka leasingu','Splátka kreditní karty','Splátka půjčky']},
  {id:'cat36',name:'Telefon',          icon:'📱', color:'#0284c7', type:'expense', coicop:8,  isSaving:false,  stable:false,
   coicopOverrides:{'Nový telefon':5},
   subs:['Tarif','Data','Roaming','Oprava telefonu','Příslušenství','Nový telefon','Doplatek','Simkarta','Kredit']},
  {id:'cat38',name:'Ubytování',        icon:'🏨', color:'#7c3aed', type:'expense', coicop:11,
   shared:['cat18'],
   subs:['Hotel','Airbnb','Hostel','Penzion','Chatka/Kemp']},
  {id:'cat39',name:'Výběry ATM',       icon:'🏧', color:'#64748b', type:'expense', coicop:12, isSaving:false,  stable:false,
   subs:['Výběr bankomat','Výběr cizí bankomat','Výběr v zahraničí']},
  {id:'cat40',name:'Ztráta',           icon:'😰', color:'#6b7280', type:'expense', coicop:12, isSaving:false,  stable:false,
   subs:['Ztracená hotovost','Krádež','Pokuta','Penále','Záloha propadla','Expirace prostředků']},
  {id:'cat41',name:'Fitness & Posilovna', icon:'💪', color:'#16a34a', type:'expense', coicop:9, isSaving:false, stable:false,
   subs:['Členství posilovna','Permanentka','Osobní trenér','Sportovní vybavení','Plavání','Jóga','Suplementy']},
  {id:'cat42',name:'Poplatky',         icon:'📄', color:'#dc2626', type:'expense', coicop:13, isSaving:false,  stable:false,
   shared:['cat12'],
   coicopOverrides:{'Bankovní poplatek':12},
   subs:['Správní poplatek','Bankovní poplatek','Kolky','Notář','Katastr','Registr','Tisk','Agentura','WC','Šatna']},
  {id:'cat43',name:'Cigarety',         icon:'🚬', color:'#78716c', type:'expense', coicop:2,
   shared:['cat26'],
   subs:['Krabičky','Tabák','Příslušenství','E-cigareta','Náplně']},
  {id:'cat44',name:'Domácí mazlíček',  icon:'🐾', color:'#f59e0b', type:'expense', coicop:9,
   subs:['Jídlo pro mazlíčka','Pelíšek/Výbava','Veterinář','Hračky pro mazlíčka','Psí hotel']},
  {id:'cat45',name:'Pasivní příjem',   icon:'🌱', color:'#22c55e', type:'income',  coicop:null, stable:false,
   subs:['Dividendy','Pronájem nemovitosti','Licenční poplatky','P2P půjčky','Úroky']},
  {id:'cat46',name:'Brigáda',          icon:'👷', color:'#84cc16', type:'income',  coicop:null, stable:false,
   subs:['Brigáda jednorázová','Brigáda pravidelná','DPP','DPČ','Přivýdělek']},
  // ── PŘESUNY (type:'transfer') – peníze odejdou z peněženky, ale NEjsou výdaj (nesníží majetek).
  //    V další fázi se propíšou do Finančních aktiv. coicop:null (přesuny nejsou spotřeba).
  {id:'cat_t_invest', name:'Investice',        icon:'📈', color:'#34d399', type:'transfer', coicop:null, isSaving:true, stable:false, stabilityWeight:0,
   subs:['ETF','Akcie','Krypto','Podílové fondy','Dluhopisy','REIT']},
  {id:'cat_t_trading',name:'Trading',          icon:'📊', color:'#059669', type:'transfer', coicop:null, isSaving:true, stable:false, stabilityWeight:0,
   subs:['Bybit','XTB','Binance','Revolut Invest','Forex','Krypto nákup']},
  {id:'cat_t_reserve',name:'Finanční rezerva', icon:'🛟', color:'#06b6d4', type:'transfer', coicop:null, isSaving:true, stable:false, stabilityWeight:0,
   subs:['Spořicí účet','Pohotovostní rezerva','Termínovaný vklad']},
  {id:'cat_t_savings',name:'Spoření',          icon:'🐷', color:'#818cf8', type:'transfer', coicop:null, isSaving:true, stable:false, stabilityWeight:0,
   subs:['Spořicí účet','Stavební spoření','Cílové spoření']},
  {id:'cat_t_funds',  name:'Fondy',            icon:'🏛️', color:'#8b5cf6', type:'transfer', coicop:null, isSaving:true, stable:false, stabilityWeight:0,
   subs:['Podílové fondy','Indexové fondy','Nemovitostní fondy','DIP']},
  {id:'cat_t_pension',name:'Penzijko',         icon:'👴', color:'#f59e0b', type:'transfer', coicop:null, isSaving:true, stable:false, stabilityWeight:0,
   subs:['Penzijní připojištění','Doplňkové penzijní spoření','Zaměstnavatel příspěvek']},
];



function _ref(db, path) { return window._ref(db, path); }
function _set(r, val) { return window._set(r, val); }
function _get(r) { return window._get(r); }
function _update(r, val) { return window._update ? window._update(r, val) : Promise.resolve(); }
function _onValue(r, cb) { return window._onValue(r, cb); }
function _off(r, ev, cb) { return window._off(r, ev, cb); }

// Stubs overridden by module script once Firebase loads
function signInGoogle() { if(window._signInGoogle) window._signInGoogle(); else alert('Firebase se načítá, zkuste za chvíli...'); }
function signOut() {
  if(_isLocalMode) {
    if(!confirm('Odhlásit se z lokálního režimu? Data zůstanou uložena v prohlížeči.')) return;
    _isLocalMode = false;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('mainFab').style.display = 'none';
  } else {
    if(window._signOut) window._signOut();
  }
}

// ── LOKÁLNÍ REŽIM (bez Google účtu) ──
var _isLocalMode = false;
const LOCAL_STORAGE_KEY = 'ff_v43_local';

function showLocalWarning() {
  document.getElementById('localWarning').style.display = 'block';
  document.querySelector('.btn-local').style.display = 'none';
  document.querySelector('.login-divider').style.display = 'none';
}
function hideLocalWarning() {
  document.getElementById('localWarning').style.display = 'none';
  document.querySelector('.btn-local').style.display = 'flex';
  document.querySelector('.login-divider').style.display = 'flex';
}

function signInLocal() {
  _isLocalMode = true;
  // Load data from localStorage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if(saved) {
      const parsed = JSON.parse(saved);
      S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, parsed);
      sanitizeUserData(S); // S16.5 (P0-1)
    } else {
      seedData();
      saveLocal();
    }
  } catch(e) {
    seedData();
    saveLocal();
  }
  S.curMonth = new Date().getMonth();
  S.curYear = new Date().getFullYear();

  try { if(ensureBaseData().length) saveLocal(); } catch(e){}   // FIX-264

  // Show app
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  document.getElementById('mainFab').style.display = 'flex';

  // Set fake user profile
  window._currentUser = { uid: 'local', displayName: 'Lokální uživatel', email: null, photoURL: null };
  window._userProfile = { displayName: 'Lokální uživatel', photoURL: null };

  // Update UI
  updateSidebarUser(window._currentUser);
  updateLocalBadge();
  processAutoSablony();
  _premiumStatus = { type: 'trial', daysLeft: 30, until: Date.now() + 30*24*60*60*1000 };
  updatePremiumUI();
  updateMLabel();
  // Session 10: naplň cache keyword_overrides pro správnou COICOP klasifikaci
  if(typeof syncKwOverrides==='function') syncKwOverrides();
  renderPage();
}

function saveLocal() {
  if(!_isLocalMode) return;
  try {
    const toSave = Object.assign({}, S);
    delete toSave.curMonth;
    delete toSave.curYear;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
  } catch(e) { console.error('LocalStorage save error:', e); }
}

// ── Session 11: Lokální snapshot → IndexedDB (ff_snapshot_db) ──────────────
// IndexedDB nemá limit ~5 MB jako localStorage → vhodné pro velká S.
// Jedna DB, jeden store `snapshots`, klíč = uid. Nezávislé na offline-sync.js.
// Fallback: localStorage (migrace starých dat + záloha při IDB chybě).
let _snapDB = null;

function _openSnapDB() {
  if (_snapDB) return _snapDB;
  _snapDB = new Promise((resolve, reject) => {
    const req = indexedDB.open('ff_snapshot_db', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('snapshots'))
        db.createObjectStore('snapshots', { keyPath: 'uid' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => { _snapDB = null; reject(e.target.error); };
  });
  return _snapDB;
}

async function saveSnapshot() {
  if (!window._currentUser) return;
  const uid = window._currentUser.uid;
  try {
    const data = {
      transactions:  S.transactions  || [], debts:      S.debts        || [],
      categories:    S.categories    || [], bank:       S.bank         || {startBalance:0},
      birthdays:     S.birthdays     || [], wishes:     S.wishes       || [],
      wallets:       S.wallets       || [], payTypes:   S.payTypes     || [],
      sablony:       S.sablony       || [], projects:   S.projects     || [],
      receipts:      S.receipts      || [], nakupList:  S.nakupList    || [],
      assets:        S.assets        || [], shareSettings: S.shareSettings || {},
      calNotes:      S.calNotes      || {}, workCal:    S.workCal      || {},
      diary:         S.diary         || {},
      idleCfg:       S.idleCfg       || {},
      milestones:    S.milestones    || [],
      reportSectors: S.reportSectors || {},
      pristiCfg:     S.pristiCfg     || {},
      _savedAt: Date.now(),
    };
    const db = await _openSnapDB();
    await new Promise((res, rej) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put({ uid, data });
      tx.oncomplete = res;
      tx.onerror = e => rej(e.target.error);
    });
    // Migrace: smaž starý localStorage snapshot → uvolní místo (jednou)
    try { localStorage.removeItem('ff_snapshot_' + uid); } catch (_) {}
  } catch (e) {
    // IDB selhalo → záchranný fallback na localStorage
    try {
      const s = {transactions:S.transactions||[],debts:S.debts||[],categories:S.categories||[],
                 bank:S.bank||{startBalance:0},birthdays:S.birthdays||[],wishes:S.wishes||[],
                 wallets:S.wallets||[],payTypes:S.payTypes||[],sablony:S.sablony||[],
                 projects:S.projects||[],receipts:S.receipts||[],nakupList:S.nakupList||[],
                 assets:S.assets||[],shareSettings:S.shareSettings||{},calNotes:S.calNotes||{},workCal:S.workCal||{},diary:S.diary||{},idleCfg:S.idleCfg||{},milestones:S.milestones||[],reportSectors:S.reportSectors||{},pristiCfg:S.pristiCfg||{},_savedAt:Date.now()};
      localStorage.setItem('ff_snapshot_' + uid, JSON.stringify(s));
    } catch (_) {}
  }
}

async function loadSnapshot() {
  if (!window._currentUser) return null;
  const uid = window._currentUser.uid;
  try {
    const db = await _openSnapDB();
    const row = await new Promise((res, rej) => {
      const req = db.transaction('snapshots', 'readonly').objectStore('snapshots').get(uid);
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
    if (row && row.data) return row.data;

    // Žádný IDB záznam – zkus migrovat ze starého localStorage snapshotu
    const lsKey = 'ff_snapshot_' + uid;
    const old = localStorage.getItem(lsKey);
    if (old) {
      const parsed = JSON.parse(old);
      // Zapiš do IDB a smaž z localStorage (jednosměrná migrace)
      const db2 = await _openSnapDB();
      await new Promise((res, rej) => {
        const tx = db2.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').put({ uid, data: parsed });
        tx.oncomplete = res;
        tx.onerror    = e => rej(e.target.error);
      });
      try { localStorage.removeItem(lsKey); } catch (_) {}
      return parsed;
    }
    return null;
  } catch (e) {
    // IDB nedostupná (soukromé okno v Safari apod.) → fallback na localStorage
    try {
      const r = localStorage.getItem('ff_snapshot_' + uid);
      return r ? JSON.parse(r) : null;
    } catch (_) { return null; }
  }
}

function updateLocalBadge() {
  // Add local mode badge to sidebar
  const userInfo = document.querySelector('.user-info');
  if(!userInfo) return;
  let badge = document.getElementById('localModeBadge');
  if(!badge) {
    badge = document.createElement('div');
    badge.id = 'localModeBadge';
    badge.style.cssText = 'margin-top:4px';
    userInfo.appendChild(badge);
  }
  badge.innerHTML = '<span class="local-badge">📱 Bez účtu · lokální data</span>';
}

function updateSidebarLocalInfo() {
  if(!_isLocalMode) return;
  // Hide partner features
  const partnerSection = document.getElementById('partnerSection');
  if(partnerSection) partnerSection.style.display = 'none';
}

// Override save() to also save locally when in local mode
const _origSave = window.save; // will be set later

// ══════════════════════════════════════════════════════
//  CONSTANTS & STATE
// ══════════════════════════════════════════════════════
const CZ_M=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const PAGE_TITLES={prehled:'Dashboard',souhrn:'Souhrn výdajů',transakce:'Transakce',tagy:'🏷️ Tagy',bank:'Bank',predikce:'Predikce',dluhy:'Půjčky',grafy:'Grafy',narozeniny:'Narozeniny a přání',statistiky:'Statistiky',kategorie:'Kategorie',ai:'AI Rádce',rodina:'Rodinný souhrn',sdileni:'Sdílení & Partneři',penezenky:'Peněženky',typy:'Typy plateb',sablony:'Opakované šablony',nastaveni:'Nastavení',oAplikaci:'O aplikaci',projekty:'Projekty',projektDetail:'Projekt',report:'Měsíční report',radar:'Finanční radar',obraz:'Finanční obraz',detektor:'Detektor úspor',simulace:'Simulace života',uctenky:'Analýza účtenek',admin:'🔐 Admin panel',denik:'📖 Deník',komunita:'🌍 Komunitní přehled',import:'📥 Import dat',nakup:'🛒 Nákupní seznam',aktiva:'💎 Finanční aktiva',budouci:'🗓️ Budoucí platby',smsimport:'📱 Import z banky',kalendar:'📅 Kalendář',kurzy:'💱 Kurzy měn',pristi:'📅 Příští měsíc'};
const SEASON={0:{mult:.85},1:{mult:1.05},2:{mult:1.0},3:{mult:1.02},4:{mult:1.15},5:{mult:1.1},6:{mult:1.1},7:{mult:1.08},8:{mult:1.05},9:{mult:1.0},10:{mult:1.12},11:{mult:1.35}};

// My own data
let S = {transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],curMonth:new Date().getMonth(),curYear:new Date().getFullYear()};

// ── TODO-014: AI mapování kategorií ──
// Uloženo odděleně v Firebase: users/{uid}/categoryMappings/{keyword}
// Klíč = normalizovaný název obchodníka (lowercase, bez diakritiky)
// Hodnota = {catId, subcat, count, updatedAt}
let _catMappingsCache = null; // null = nenačteno, {} = načteno (i prázdné)

function normalizeMappingKey(name) {
  return (name||'').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // diakritika
    .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').slice(0,40);
}

async function loadCategoryMappings() {
  if(_catMappingsCache !== null) return _catMappingsCache;
  if(_isLocalMode) {
    try { _catMappingsCache = JSON.parse(localStorage.getItem('ff_catMappings')||'{}'); }
    catch(e) { _catMappingsCache = {}; }
    return _catMappingsCache;
  }
  try {
    const uid = window._currentUser?.uid; if(!uid) return {};
    const idToken = await window._currentUser.getIdToken?.();
    const res = await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/categoryMappings.json?auth=${idToken}`
    );
    _catMappingsCache = (res.ok ? await res.json() : null) || {};
  } catch(e) { _catMappingsCache = {}; }
  return _catMappingsCache;
}

async function saveCategoryMapping(txName, catId, subcat) {
  if(!txName||!catId) return;
  const key = normalizeMappingKey(txName);
  if(!key) return;
  const mapping = {catId, subcat:subcat||'', count:1, updatedAt:Date.now()};
  // Increment count if exists
  if(_catMappingsCache && _catMappingsCache[key]) {
    mapping.count = (_catMappingsCache[key].count||0) + 1;
  }
  if(_catMappingsCache) _catMappingsCache[key] = mapping;

  if(_isLocalMode) {
    try { localStorage.setItem('ff_catMappings', JSON.stringify(_catMappingsCache||{})); } catch(e){}
    return;
  }
  try {
    const uid = window._currentUser?.uid; if(!uid) return;
    const idToken = await window._currentUser.getIdToken?.();
    await fetch(
      `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/categoryMappings/${key}.json?auth=${idToken}`,
      {method:'PUT', body:JSON.stringify(mapping)}
    );
  } catch(e) { console.warn('saveCategoryMapping failed:', e); }
}

function lookupCategoryMapping(txName) {
  if(!_catMappingsCache) return null;
  const key = normalizeMappingKey(txName);
  return _catMappingsCache[key] || null;
}

// Načti mappings po přihlášení
async function initCategoryMappings() {
  _catMappingsCache = null; // reset cache
  await loadCategoryMappings();
}

// Partner data (read-only view)
let partnerData = {}; // uid -> {profile, data}
let viewingUid = null; // null = own data, uid = viewing partner

// Current display state
let curPage = 'prehled';
let curTxType = 'expense';
let selCatId = '';
let selSub = '';
// S14: pod-režim tlačítka „Přesun" v modalu transakce
let _transferMode = 'wallets'; // 'wallets' = mezi peněženkami | 'assets' = do investic & spoření
let _assetCatId = '';          // vybraná transfer-kategorie (Investice, Spoření, Rezerva…) v režimu 'assets'
let _assetSub = '';            // vybraná podkategorie v režimu 'assets'
let _debtSub = '';             // S14 (f4): vybraná podkategorie splátky (kategorie „Splátka")
let customSub = '';
let saveTimeout = null;
let _dbListener = null;
let _partnerListeners = {};

// Vyčisti veškerý stav aplikace (volá se při odhlášení – zabrání úniku dat mezi uživateli)
function resetAppState() {
  try {
    // Odpoj realtime listener vlastních dat
    if (_dbListener && window._currentUser) {
      try { _off(_ref(_db, `users/${window._currentUser.uid}/data`), 'value', _dbListener); } catch(_) {}
    }
    _dbListener = null;
    // Odpoj partner listenery
    Object.keys(_partnerListeners).forEach(uid => {
      try { _off(_ref(_db, `users/${uid}/data`), 'value', _partnerListeners[uid]); } catch(_) {}
    });
    _partnerListeners = {};
  } catch(_) {}
  // Vynuluj veškerý uživatelský stav v paměti
  S = { transactions:[], debts:[], categories:[], bank:{startBalance:0},
        birthdays:[], wishes:[], wallets:[], payTypes:[], sablony:[],
        projects:[], nakupList:[], assets:[], receipts:[],
        curMonth:new Date().getMonth(), curYear:new Date().getFullYear() };
  partnerData = {};
  viewingUid = null;
  // S20 (Krok 0): resetuj i diff signatury. Bez toho by si nově přihlášený
  // uživatel nesl signatury toho předchozího a _shWrite by považoval cizí
  // sekce za „nezměněné" → do jeho výřezu by se nezapsaly.
  if (typeof _dw !== 'undefined') _dw = { ready:false, metaSig:{}, txSig:null };
  if (typeof _sh !== 'undefined') _sh = { ready:false, metaSig:{}, txSig:null, sumSig:'', mode:null };
  if (typeof saveTimeout !== 'undefined' && saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
  if (typeof _premiumStatus !== 'undefined') _premiumStatus = null;
  if (typeof _pin !== 'undefined') _pin = null;
  window._userProfile = null;
}
window.resetAppState = resetAppState;

// ══════════════════════════════════════════════════════
//  FIREBASE INIT
// ══════════════════════════════════════════════════════
window.onUserSignedIn = async function(user) {
  // FIX (S13): tvrdý reset stavu na začátku – nový/přepnutý uživatel nikdy nezdědí data předchozího.
  // (Pokud běží migrace z lokálního režimu, ta si S nastaví hned vzápětí.)
  if(!window._pendingMigration && typeof resetAppState === 'function') resetAppState();
  window._currentUser = user;
  // If migrating from local mode – use local data
  if(window._pendingMigration) {
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, window._pendingMigration);
      sanitizeUserData(S); // S16.5 (P0-1)
    S.curMonth = new Date().getMonth();
    S.curYear = new Date().getFullYear();
    window._pendingMigration = null;
    _isLocalMode = false;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    // Save migrated data to Firebase
    await saveToFirebase();
  }
  _isLocalMode = false;
  setSyncStatus('syncing');
  // Sentry – nastav uživatele bezpečně (Sentry je async, nemusí být ještě načten)
  setTimeout(function() {
    if (typeof Sentry !== 'undefined' && typeof Sentry.setUser === 'function') {
      Sentry.setUser({ id: user.uid, email: user.email || 'anon' });
    }
  }, 3000);
  updateSidebarUser(user);
  
  // Load user profile (custom display name)
  await loadUserProfile(user);
  trackActivity(user);   // v9.85 (TODO-213) – bez await, start appky nesmí čekat

  // Load own data from Firebase (Session 11: offline-aware + lokální snapshot)
  const userRef = _ref(_db, `users/${user.uid}/data`);

  let snap = null, getErr = false;
  if (navigator.onLine) {
    try { snap = await _get(userRef); }
    catch (e) { getErr = true; }
  }

  if (!navigator.onLine || getErr) {
    // OFFLINE / síťová chyba → nahydratuj z posledního lokálního snapshotu
    const local = await loadSnapshot();
    if (local) {
      S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, local);
      sanitizeUserData(S); // S16.5 (P0-1)
      S.curMonth = new Date().getMonth();
      S.curYear = new Date().getFullYear();
      if (!navigator.onLine && typeof showToast === 'function') showToast('📴 Offline – zobrazena poslední uložená data');
    }
    // Bez snapshotu necháme prázdné defaults; onValue listener data dorovná po připojení.
  } else if (!snap.exists()) {
    // First time - seed default data
    seedData();
    await saveToFirebase();
    // TODO-234: jediný bezpečný signál "opravdu nový uživatel" – stejná podmínka,
    // která už spouští seedData(). ensureBaseData() (FIX-264) běží i pro existující
    // účty, takže na ní onboarding stavět NELZE (SKILL 31).
    window._isNewSignup = true;
  } else {
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, snap.val());
      sanitizeUserData(S); // S16.5 (P0-1)
    if(!S.birthdays) S.birthdays=[];
    if(!S.wishes) S.wishes=[];
    if(!S.bank) S.bank={startBalance:0};
    S.curMonth = new Date().getMonth();
    S.curYear = new Date().getFullYear();
    saveSnapshot(); // ulož čerstvý snapshot pro offline
  }

  // Real-time listener for own data
  // v9.46 (TODO-177, ADR-062 fáze 2): rozdělené čtení – viz _attachOwnListeners()
  // FIX-264: doplň, co chybí – ať už uzel /data existoval, nebo ne
  try {
    const _dop = ensureBaseData();
    if(_dop.length){
      console.warn('[FIX-264] doplněna základní data:', _dop.join(', '));
      await saveToFirebase();
    }
  } catch(e){ console.warn('[FIX-264] doplnění základních dat selhalo', e); }

  _attachOwnListeners(userRef, user.uid, snap && snap.exists && snap.exists() ? snap.val() : null);

  // Load partners who have shared with me (offline-safe)
  try { await loadPartners(user); } catch (e) {}

  // Load premium status (offline-safe)
  try { await loadPremiumStatus(user.uid); } catch (e) {}

  // Load settings (offline-safe)
  try { await loadSettings(user.uid); } catch (e) {}
  // TODO-234: onboarding krok 1 – jen pro čerstvý seed, viz maybeShowOnboarding()
  try { if (typeof maybeShowOnboarding === 'function') maybeShowOnboarding(!!window._isNewSignup); } catch (e) {}

  // TODO-014: Načti AI mapování kategorií
  initCategoryMappings();

  // Process auto templates
  processAutoSablony();

  setSyncStatus('ok');
  updateMLabel();
  checkAdminNav();
  trackFirstTx(user);   // v9.85 (TODO-213) – aktivace, zapíše se jednou; data už jsou v S
  backupMaybeDaily();   // v9.87 (TODO-208) – denní záloha, bez await

  // PIN ochrana - zkontroluj po přihlášení (Session 11: loadPin je async – Firebase sync)
  if (typeof loadPin === 'function') await loadPin();
  if (typeof _pin !== 'undefined' && _pin) {
    // Zobraz PIN dialog - krátká pauza aby se UI načetlo
    setTimeout(() => {
      if (typeof openPinVerify === 'function') openPinVerify();
    }, 800);
  }
  renderPage();
  // Ulož affiliate ref pokud existuje
  if(window._pendingAffiliateRef) {
    try {
      await _set(_ref(_db, `affiliate/${Date.now()}`), {
        ref: window._pendingAffiliateRef,
        type: 'register',
        uid: user.uid,
        date: new Date().toISOString().slice(0,10),
        timestamp: Date.now()
      });
    } catch(e) {}
    window._pendingAffiliateRef = null;
  }
};

async function loadUserProfile(user) {
  const profileRef = _ref(_db, `users/${user.uid}/profile`);
  let snap = null;
  if (navigator.onLine) { try { snap = await _get(profileRef); } catch (e) {} }
  if (snap && snap.exists()) {
    window._userProfile = snap.val();
  } else if (navigator.onLine && snap) {
    window._userProfile = {displayName: user.displayName || user.email, photoURL: user.photoURL || null};
    try { await _set(profileRef, window._userProfile); } catch (e) {}
  } else {
    // offline – použij údaje z přihlášeného uživatele (auth session přežívá offline)
    window._userProfile = window._userProfile || {displayName: user.displayName || user.email, photoURL: user.photoURL || null};
  }
  updateSidebarUser(user);
}

// ══════════════════════════════════════════════════════
//  EVIDENCE AKTIVITY (TODO-213, v9.85)
//  Do S19 se „poslední aktivita" v admin panelu brala z premium.createdAt, tedy
//  z DATA REGISTRACE – u denně aktivního uživatele proto ukazovala měsíce starý
//  údaj a složka čerstvosti ve skóre byla vždy 0/40.
//
//  Uzel: users/{uid}/activity   (NE profile – ten má .read pro každého přihlášeného
//  kvůli sdílení jména a fotky partnerům; aktivita tam nepatří. Pod users/$uid
//  čte jen vlastník a admin, zápis kaskáduje – Firebase pravidla se nemění.)
//
//  Rozsah je schválně minimální: žádná IP, poloha ani otisk zařízení – to by
//  vyžadovalo souhlas dle GDPR. Tohle je provoz služby.
//    last    – čas posledního použití
//    visits  – počet spuštění celkem
//    d/{YYYY-MM-DD} – značka aktivního dne (z ní se dopočítá 30/90 dní i série)
//    ver     – verze aplikace při posledním použití (kdo visí na staré cache)
//    pwa     – true = spuštěno jako nainstalovaná aplikace, ne v prohlížeči
//    firstTx – čas první transakce (aktivace: jak dlouho trvalo od registrace)
// ══════════════════════════════════════════════════════
const ACTIVITY_THROTTLE_MS = 3600000;   // zapiš nejvýš 1× za hodinu

async function trackActivity(user) {
  if (!user || !user.uid || _isLocalMode) return;
  if (typeof viewingUid !== 'undefined' && viewingUid) return;   // prohlížím partnera, ne sebe
  if (!navigator.onLine) return;
  const now = Date.now();
  const key = 'ff_act_' + user.uid;
  try {
    const lastLocal = parseInt(localStorage.getItem(key) || '0');
    if (now - lastLocal < ACTIVITY_THROTTLE_MS) return;
    localStorage.setItem(key, String(now));
  } catch (e) { /* privátní režim – zapiš, ale bez škrcení */ }

  const d = new Date(now);
  const den = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let ver = '';
  try { ver = (document.title.match(/v[\d.]+/) || [''])[0]; } catch (e) {}
  let pwa = false;
  try { pwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) {}

  // Vlastní try/catch – evidence aktivity nesmí nikdy shodit start aplikace (SKILL 13)
  try {
    const aRef = _ref(_db, `users/${user.uid}/activity`);
    let cur = null;
    try { const sn = await _get(aRef); cur = sn && sn.exists() ? sn.val() : null; } catch (e) {}
    const upd = { last: now, ver, pwa };
    upd['d/' + den] = 1;
    upd.visits = ((cur && cur.visits) || 0) + 1;
    if (!cur || !cur.firstSeen) upd.firstSeen = now;
    await _update(aRef, upd);
  } catch (e) { /* tiše – jen telemetrie */ }
}

// Čas první transakce = aktivace. Zapisuje se JEN JEDNOU.
async function trackFirstTx(user) {
  if (!user || !user.uid || _isLocalMode || !navigator.onLine) return;
  if (typeof viewingUid !== 'undefined' && viewingUid) return;
  if (!(S.transactions || []).length) return;
  try {
    if (localStorage.getItem('ff_firsttx_' + user.uid)) return;
  } catch (e) {}
  try {
    const aRef = _ref(_db, `users/${user.uid}/activity`);
    const sn = await _get(aRef);
    const cur = sn && sn.exists() ? sn.val() : null;
    if (cur && cur.firstTx) { try { localStorage.setItem('ff_firsttx_' + user.uid, '1'); } catch (e) {} return; }
    const first = (S.transactions || []).reduce((a, t) => {
      const ts = new Date(t.date || 0).getTime();
      return (isFinite(ts) && ts > 0 && (a === 0 || ts < a)) ? ts : a;
    }, 0);
    if (!first) return;
    await _update(aRef, { firstTx: first });
    try { localStorage.setItem('ff_firsttx_' + user.uid, '1'); } catch (e) {}
  } catch (e) {}
}

// ══════════════════════════════════════════════════════
//  AUTOMATICKÁ ZÁLOHA DAT (TODO-208, v9.87)
//  Aplikace dosud neměla ŽÁDNOU automatickou zálohu – jen jednorázový snímek
//  dataBackupV1 před migrací ADR-062 a ruční JSON export, který si uživatel musí
//  vzpomenout stáhnout. U appky s platícími zákazníky to bylo reálné riziko:
//  omylem smazaná data, rozbitá synchronizace nebo chybný import = nevratná ztráta.
//
//  Uzel: users/{uid}/backups/{YYYY-MM-DD}
//    Leží MIMO users/{uid}/data schválně – uzel `data` má rozšířené .read pro
//    partnera, zálohy jsou jen vlastníka (a admina). Zápis kaskáduje z users/$uid,
//    takže FIREBASE PRAVIDLA SE NEMĚNÍ.
//
//  Snímek se ukládá jako JEDEN JSON řetězec, ne jako strom:
//    • zápis i obnova jsou atomické (nehrozí půl obnovené zálohy)
//    • RTDB si u stromu účtuje režii za každý klíč – u 5 000 transakcí je to rozdíl
//    • diff-write si nesplete zálohu s živými daty
// ══════════════════════════════════════════════════════
const BACKUP_KEEP = 5;                  // kolik denních záloh držet
const BACKUP_MAX_BYTES = 6 * 1024 * 1024;   // nad tuhle velikost zálohu raději přeskoč

function _backupDayKey(ts) {
  const d = new Date(ts || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Data k zálohování = totéž, co drží S (bez běhových příznaků).
function _backupPayload() {
  const D = getData();
  const out = {};
  Object.keys(D || {}).forEach(k => { if (k.charAt(0) !== '_') out[k] = D[k]; });
  return out;
}

// Vytvoří zálohu. force=true → ruční z Nastavení (přepíše dnešní).
async function backupRun(force) {
  const user = window._currentUser;
  if (!user || !user.uid || _isLocalMode) return { ok: false, err: 'Zálohy fungují jen u přihlášeného účtu.' };
  if (typeof viewingUid !== 'undefined' && viewingUid) return { ok: false, err: 'Nelze zálohovat cizí data.' };
  if (!navigator.onLine) return { ok: false, err: 'Zálohu nelze vytvořit offline.' };

  const key = _backupDayKey();
  if (!force) {
    try { if (localStorage.getItem('ff_backup_' + user.uid) === key) return { ok: false, skipped: true }; } catch (e) {}
  }

  let json;
  try { json = JSON.stringify(_backupPayload()); }
  catch (e) { return { ok: false, err: 'Data se nepodařilo serializovat.' }; }

  const bytes = json.length * 2;   // UTF-16 v paměti, hrubý odhad
  if (bytes > BACKUP_MAX_BYTES) {
    return { ok: false, err: `Data jsou příliš velká (${Math.round(bytes / 1048576)} MB). Použij ruční JSON export.` };
  }

  try {
    const bRef = _ref(_db, `users/${user.uid}/backups`);
    await _update(bRef, { [key]: { at: Date.now(), bytes, ver: (document.title.match(/v[\d.]+/) || [''])[0], json } });
    try { localStorage.setItem('ff_backup_' + user.uid, key); } catch (e) {}
    await backupRotate();
    return { ok: true, key, bytes };
  } catch (e) {
    return { ok: false, err: 'Zápis zálohy selhal: ' + (e && e.message ? e.message : e) };
  }
}

// Smaže nejstarší zálohy nad limit. Čte JEN klíče (shallow), ne obsah –
// stažení pěti snímků jen kvůli rotaci by bylo zbytečně drahé.
async function backupRotate() {
  const user = window._currentUser;
  if (!user || !user.uid) return;
  try {
    const snap = await _get(_ref(_db, `users/${user.uid}/backups`));
    if (!snap || !snap.exists()) return;
    const keys = Object.keys(snap.val() || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    if (keys.length <= BACKUP_KEEP) return;
    const del = {};
    keys.slice(0, keys.length - BACKUP_KEEP).forEach(k => { del[k] = null; });
    await _update(_ref(_db, `users/${user.uid}/backups`), del);
  } catch (e) { /* rotace není kritická */ }
}

// Seznam záloh BEZ obsahu – ať se kvůli výpisu netahají megabajty.
async function backupList() {
  const user = window._currentUser;
  if (!user || !user.uid || _isLocalMode) return [];
  try {
    const snap = await _get(_ref(_db, `users/${user.uid}/backups`));
    if (!snap || !snap.exists()) return [];
    const v = snap.val() || {};
    return Object.keys(v).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))
      .map(k => ({ key: k, at: v[k] && v[k].at || 0, bytes: v[k] && v[k].bytes || 0, ver: v[k] && v[k].ver || '' }))
      .sort((a, b) => b.key.localeCompare(a.key));
  } catch (e) { return []; }
}

// Obnova. PŘED přepsáním vždy uloží snímek současného stavu pod klíč
// „pred-obnovou" – kdyby uživatel obnovil omylem, není to jednosměrka.
async function backupRestore(key) {
  const user = window._currentUser;
  if (!user || !user.uid || _isLocalMode) return { ok: false, err: 'Obnova funguje jen u přihlášeného účtu.' };
  if (typeof viewingUid !== 'undefined' && viewingUid) return { ok: false, err: 'Nelze obnovovat cizí data.' };
  try {
    const snap = await _get(_ref(_db, `users/${user.uid}/backups/${key}`));
    if (!snap || !snap.exists()) return { ok: false, err: 'Záloha nenalezena.' };
    const rec = snap.val();
    let parsed;
    try { parsed = JSON.parse(rec.json); } catch (e) { return { ok: false, err: 'Záloha je poškozená, nelze ji přečíst.' }; }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
      return { ok: false, err: 'Záloha nemá očekávaný tvar (chybí transakce).' };
    }
    // pojistka proti omylu
    try {
      const cur = JSON.stringify(_backupPayload());
      await _update(_ref(_db, `users/${user.uid}/backups`),
        { 'pred-obnovou': { at: Date.now(), bytes: cur.length * 2, ver: 'auto', json: cur } });
    } catch (e) { /* pojistka selhala, obnovu ale neblokuj */ }

    S = Object.assign({ transactions: [], debts: [], categories: [], bank: { startBalance: 0 },
                        birthdays: [], wishes: [], wallets: [], payTypes: [], sablony: [],
                        projects: [], nakupList: [], assets: [] }, parsed);
    if (typeof sanitizeUserData === 'function') sanitizeUserData(S);
    // ⚠️ NESTAČÍ vynulovat podpisy diff-write: transakce, které v záloze NEJSOU,
    //    by v databázi zůstaly (mazání se odvozuje z předchozích podpisů) a při
    //    dalším načtení by se vrátily. `ready=false` vynutí PLNÝ zápis přes _set(),
    //    který celý uzel nahradí – tedy přesně obnovu, ne sloučení.
    _dw.ready = false;
    save();
    return { ok: true, n: (parsed.transactions || []).length };
  } catch (e) {
    return { ok: false, err: 'Obnova selhala: ' + (e && e.message ? e.message : e) };
  }
}

// Denní automatická záloha – volá se po načtení dat, bez await.
function backupMaybeDaily() {
  try {
    if (!(S.transactions || []).length) return;   // prázdný účet nemá co zálohovat
    backupRun(false);
  } catch (e) {}
}

async function loadPartners(user) {
  // Get list of users who have added this user as a partner
  const partnersRef = _ref(_db, `users/${user.uid}/partners`);
  const snap = await _get(partnersRef);
  if(!snap.exists()) {
    _myGrants.clear();
    // FIX-319: prázdný seznam partnerů ještě neznamená, že nemám domácnost –
    //   pokračujeme dál, členy skupiny doplní blok níž.
    try {
      const hid0 = (await _get(_ref(_db, `users/${user.uid}/householdId`))).val();
      if (!hid0) { renderPartnerSection([]); return; }
    } catch(e) { renderPartnerSection([]); return; }
  }
  const partnerUids = snap.exists() ? Object.keys(snap.val()) : [];
  _cekajiciPartneri.length = 0;   // FIX-316: kdo mě ještě nepřidal zpět
  _bezVyrezu.length = 0;          // FIX-318

  // FIX-319: ke jmenovitým partnerům přibývají členové DOMÁCNOSTI. Ty si nikdo
  //   nepřidával ručně – stačí, že jsme ve stejné skupině. Právě tím odpadá
  //   nutnost, aby se každý párovat s každým.
  try {
    const hid = (await _get(_ref(_db, `users/${user.uid}/householdId`))).val();
    if (hid) {
      const cleni = await _get(_ref(_db, `households/${hid}/members`));
      if (cleni.exists()) {
        Object.keys(cleni.val()).forEach(u => {
          if (u !== user.uid && !partnerUids.includes(u)) partnerUids.push(u);
        });
      }
    }
  } catch(e) { console.info('[domácnost] členy se nepodařilo načíst:', e?.message); }
  // FIX-311: tenhle uzel znamená „kdo smí číst mě" – proto z něj plní `_myGrants`,
  //   podle kterých se rozhoduje, jestli má vzniknout výdejní okénko `shared`.
  //   a od FIX-319 i členy domácnosti – ti mě smí číst taky, takže výřez
  //   musí vzniknout i pro ně.
  _myGrants.clear(); partnerUids.forEach(u=>_myGrants.add(u));
  // Když už někomu přístup udělený je, výřez musí existovat hned po přihlášení,
  //   ne až po prvním uložení dat. Side-write ve vlastním try/catch.
  try { if(typeof _shWrite==='function') await _shWrite(user.uid); }
  catch(e){ console.warn('[shared] výřez při startu:', e?.message); }
  const loaded = [];
  
  for(const uid of partnerUids) {
    try {
      // S20 (Krok 0): partneři čtou VÝDEJNÍ OKÉNKO users/{uid}/shared, ne úložiště.
      // FÁZE 1 nasazení: partner, který se od updatu ještě ani jednou neuložil,
      // shared zatím nemá – dokud pravidla povolují obojí, spadneme na /data,
      // aby nikomu nezmizel partner z appky. Tenhle fallback se odstraní ve
      // FÁZI 2 spolu s partnerským přístupem k /data (viz PLAN-oprava-sdileni.md).
      let src = 'shared';
      let [dataSnap, profileSnap] = await Promise.all([
        _get(_ref(_db, `users/${uid}/shared`)),
        _get(_ref(_db, `users/${uid}/profile`))
      ]);
      // FÁZE 2 (S21, FIX-318): ZÁLOŽNÍ ČTENÍ /data ZRUŠENO.
      //   Fáze 1 dovolila spadnout na nefiltrované `users/{uid}/data`, dokud
      //   výřezy nevzniknou. Jenže přesně v tom stavu `shareSettings` nedělaly
      //   NIC – partner viděl i sekce, které měl protějšek vypnuté, včetně
      //   uzlů bez přepínače (deník, Životní mapa; viz FIX-317). Berlička
      //   je pryč a s ní i právo partnerů číst /data v pravidlech.
      //   Kdo výřez nemá, prostě není vidět – dokud se jednou nepřihlásí.
      if(!dataSnap.exists()){
        console.info(`[sdílení] ${uid.slice(0,8)}… ještě nemá výdejní okénko – uvidím ho, až se přihlásí.`);
        _bezVyrezu.push(uid);
      }
      if(dataSnap.exists()) {
        partnerData[uid] = {
          data: sanitizeUserData(dataSnap.val()), // S16.5 (P0-1): partnerova data = hlavní XSS vektor
          profile: profileSnap.exists() ? profileSnap.val() : {displayName: 'Partner', photoURL: null}
        };
        loaded.push(uid);
        // Live listener na tom uzlu, ze kterého se úspěšně načetlo
        const pRef = _ref(_db, `users/${uid}/${src}`);
        if(_partnerListeners[uid]) _off(pRef, 'value', _partnerListeners[uid]);
        _partnerListeners[uid] = _onValue(pRef, (s) => {
          if(s.exists()) {
            partnerData[uid].data = sanitizeUserData(s.val());
            if(viewingUid === uid) {
              if(typeof renderPageDebounced === 'function') renderPageDebounced();
              else renderPage();
            }
            if(curPage === 'rodina') renderFamilySummary();
          }
        });
      }
    } catch(e) {
      // FIX-316 (S21): „Permission denied" tady NENÍ chyba appky, ale normální
      //   stav: druhá strana mě zatím nepřidala, takže její data číst nesmím.
      //   Vypisovat to jako Error mátlo při ladění – vypadalo to, že je rozbité
      //   sdílení, přitom chybělo jen protějškovo potvrzení.
      const odepreno = /permission/i.test(e?.message || '');
      if (odepreno) {
        _cekajiciPartneri.push(uid);
        console.info(`[sdílení] ${uid.slice(0,8)}… mě zatím nepřidal, jeho data proto nevidím.`);
      } else {
        console.warn('[sdílení] partnera se nepodařilo načíst:', uid.slice(0,8)+'…', e?.message || e);
      }
    }
  }
  renderPartnerSection(loaded);
}

// ══════════════════════════════════════════════════════════════════════
//  FIX-320 (S21, Milan): PŘEPÍNÁNÍ PROFILŮ ZRUŠENO
//  „Přepnout pohled\" nahradilo VŠECHNA data v appce partnerovými – celý
//  program se překreslil jeho čísly. I když jen pro čtení, znamenalo to
//  procházet cizí finance stránku po stránce jako svoje. Milan to označil
//  za nepřípustné a má pravdu: sdílení má dát domácnosti společný obraz,
//  ne umožnit prohlídku cizího účtu.
//
//  Sekce se mění na PŘEHLED ČLENŮ – kdo je v domácnosti a jestli jeho data
//  dorazila. Společná čísla patří do Rodinného souhrnu, kde jsou vedle sebe
//  a označená, čí jsou.
//
//  `viewingUid` zůstává v kódu jako konstantní null: visí na něm desítky
//  ochranných podmínek (zákaz zápisu, záloh, obnovy nad cizími daty) a
//  vytrhávat je po jedné by bylo riskantnější než je nechat platit navždy.
// ══════════════════════════════════════════════════════════════════════
function renderPartnerSection(partnerUids) {
  const sec = document.getElementById('partnerSection');
  const btns = document.getElementById('partnerBtns');
  if(!sec || !btns) return;
  if(!partnerUids.length) { sec.style.display='none'; return; }
  sec.style.display = 'block';
  const me = window._currentUser;
  const myName = window._userProfile?.displayName || me?.displayName || 'Já';
  const avatar = (prof, user) => prof?.avatar ? prof.avatar
    : (prof?.photoURL || user?.photoURL)
      ? `<img src="${prof?.photoURL || user.photoURL}" style="width:24px;height:24px;border-radius:50%">`
      : '👤';

  let html = `<div class="partner-btn active-user" style="cursor:default">
    <div class="partner-avatar">${avatar(window._userProfile, me)}</div>
    <span class="partner-pname">${myName}</span>
    <span class="partner-badge badge-me">Já</span>
  </div>`;

  for(const uid of partnerUids) {
    const p = partnerData[uid];
    const name = p?.profile?.displayName || 'Člen domácnosti';
    // Data buď dorazila, nebo ne – to je jediná informace, kterou tu potřebuje.
    const mam = !!(p && p.data);
    html += `<div class="partner-btn" style="cursor:default" title="${mam?'Data dorazila':'Zatím bez dat'}">
      <div class="partner-avatar">${avatar(p?.profile, null)}</div>
      <span class="partner-pname">${name}</span>
      <span class="partner-badge badge-view">${mam?'✓':'…'}</span>
    </div>`;
  }
  html += `<div style="font-size:.7rem;color:#a8aec8;margin-top:8px;line-height:1.5">
    Společná čísla najdeš v <a href="#" onclick="showPage('rodina');return false" style="color:#7dd34f;font-weight:700">Rodinném souhrnu</a>.</div>`;
  btns.innerHTML = html;
}

// FIX-320: Přepnutí pohledu zůstává, ale UŽ JEN PRO ADMINA. Milan ho potřebuje,
//   aby mohl nezávazně nahlédnout do profilu uživatele při řešení problému –
//   to je jiná role než „člen domácnosti", a stojí na jeho UID, ne na sdílení.
//   Běžný uživatel se sem nedostane: v Sdílení ani v Rodinném souhrnu už na to
//   není žádné tlačítko.
function adminViewAs(uid) {
  // Ověření přes isAdmin() z admin.js – seznam adminských UID má jen jedno
  //   místo (SKILL 17). Když admin.js není načtený, není ani admin.
  if (!(typeof isAdmin === 'function' && isAdmin())) {
    console.warn('[pohled] přepnutí profilu je vyhrazené adminovi');
    return false;
  }
  viewingUid = uid;
  // Null-safe (mobil může mít některé prvky jinde/skryté – nesmí to shodit přepnutí dat)
  const _vb = document.getElementById('viewingBanner'); if(_vb) _vb.classList.add('show');
  const _rn = document.getElementById('readonlyNotice'); if(_rn) _rn.classList.add('show');
  const name = partnerData[uid]?.profile?.displayName || uid.slice(0,8);
  const _vc = document.getElementById('viewingChip'); if(_vc){ _vc.textContent = `👁 ${name}`; _vc.classList.add('show'); }
  const _fab = document.getElementById('mainFab'); if(_fab) _fab.style.display = 'none';
  try { if (typeof closeSidebar === 'function') closeSidebar(); } catch(_) {}
  renderPage();
  updateReadonlyUI();
  if (typeof showToast === 'function') showToast(`👁 Prohlížíš data: ${name}`);
  return true;
}
window.adminViewAs = adminViewAs;

// Ponecháno kvůli starým odkazům (uložená stránka v mezipaměti, staré tlačítko).
// Běžnému uživateli místo přepnutí profilu ukáže, kam společná čísla patří.
function switchToPartner(uid) {
  if (typeof isAdmin === 'function' && isAdmin()) return adminViewAs(uid);
  if (typeof showToast === 'function') showToast('Společná čísla najdeš v Rodinném souhrnu');
  if (typeof showPage === 'function') showPage('rodina');
}

function switchToOwnData() {
  viewingUid = null;
  document.getElementById('viewingBanner').classList.remove('show');
  document.getElementById('readonlyNotice').classList.remove('show');
  document.getElementById('viewingChip').classList.remove('show');
  document.getElementById('mainFab').style.display = 'flex';
  renderPartnerSection(Object.keys(partnerData));
  renderPage();
  updateReadonlyUI();
}

function updateReadonlyUI() {
  const ro = viewingUid !== null;
  // Hide add buttons when viewing partner
  ['addBdayBtn','addWishBtn','addCatBtn'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = ro ? 'none' : '';
  });
  const debtBtns = document.getElementById('debtBtns');
  if(debtBtns) debtBtns.style.display = ro ? 'none' : '';
}

// Get current data (own or partner)
function getData() {
  if(viewingUid && partnerData[viewingUid]) {
    const d = partnerData[viewingUid].data;
    return Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, d);
  }
  return S;
}

// ══════════════════════════════════════════════════════
//  v9.46 (TODO-177, ADR-062 fáze 2): ČTENÍ PO ČÁSTECH
//
//  PROBLÉM: zápis už byl diff (fáze 1, S17) – přidání transakce poslalo ~1 KB.
//  Ale čtení viselo na onValue nad CELÝM uzlem users/{uid}/data, takže server
//  po každé změně poslal zpátky celou databázi (~1,5 MB s pár lety historie),
//  a to i partnerovi. Úspora na zápisu se tím v provozu z velké části mazala.
//
//  ŘEŠENÍ: nelze poslouchat 'data' a vynechat z něj transakce – Firebase
//  synchronizuje celý podstrom pod listenerem. Proto:
//    · transakce  → onChildAdded/Changed/Removed na data/transactions
//                   (přijde JEN ta jedna změněná transakce)
//    · meta       → onValue zvlášť na každý klíč (každý je malý)
//
//  SAMOOPRAVNÝ SEZNAM KLÍČŮ: seznam se neodvozuje jen z _DW_META, ale doplní se
//  o klíče skutečně přítomné v úvodním snapshotu. Nový uzel přidaný v kódu tak
//  nemůže tiše přestat syncovat (třída chyby FIX-220).
//
//  POJISTKA: při jakékoli chybě se spadne zpět na původní onValue nad celým
//  uzlem. Vypnout natvrdo lze i bez nasazení: localStorage 'ff_read_split' = '0'.
//
//  ⚠️ ZATÍM BEZ 12M OKNA. Omezení na posledních 12 měsíců vyžaduje agregáty
//  stats/{YYYY} a dotahování starších let – jinak by zmizela historie z grafů
//  „Všechny roky" a z matice v reportu. To je samostatný krok (fáze 2b).
// ══════════════════════════════════════════════════════
let _splitRefs = [];        // [{ref, ev, cb}] pro odpojení
let _remoteTimer = null;

function _detachOwnListeners(userRef){
  try { if(_dbListener) _off(userRef, 'value', _dbListener); } catch(e){}
  _dbListener = null;
  _splitRefs.forEach(x => { try { window._offEv ? _offEv(x.ref, x.ev, x.cb) : _off(x.ref, x.ev, x.cb); } catch(e){} });
  _splitRefs = [];
}

// Společné dokončení po JAKÉKOLI vzdálené změně (debounced – při připojení
// listenerů se jich spustí ~20 najednou a nesmí to 20× překreslit stránku).
function _remoteApply(){
  if(_remoteTimer) clearTimeout(_remoteTimer);
  _remoteTimer = setTimeout(() => {
    _remoteTimer = null;
    if(!S.birthdays) S.birthdays=[];
    if(!S.wishes) S.wishes=[];
    if(!S.bank) S.bank={startBalance:0};
    if(!S.wallets) S.wallets=[];
    if(!S.payTypes) S.payTypes=[];
    if(!S.sablony) S.sablony=[];
    if(!S.projects) S.projects=[];
    if(!S.nakupList) S.nakupList=[];
    if(!Array.isArray(S.transactions)) S.transactions=[];
    setSyncStatus('ok');
    if(typeof _dwSeed==='function') _dwSeed();
    try { saveSnapshot(); } catch(e){}
    if(viewingUid === null){
      if(typeof renderPageDebounced === 'function') renderPageDebounced();
      else if(typeof renderPage === 'function') renderPage();
    }
  }, 140);
}

function _txUpsert(t){
  if(!t || !t.id) return;
  if(!Array.isArray(S.transactions)) S.transactions = [];
  const i = S.transactions.findIndex(x => x && x.id === t.id);
  if(i >= 0) S.transactions[i] = t; else S.transactions.push(t);
}
function _txRemove(id){
  if(!Array.isArray(S.transactions)) return;
  const i = S.transactions.findIndex(x => x && x.id === id);
  if(i >= 0) S.transactions.splice(i, 1);
}

// Původní chování – celý uzel jedním listenerem. Používá se jako fallback.
function _attachFullListener(userRef){
  _dbListener = _onValue(userRef, (snapshot) => {
    if(!snapshot.exists()) return;
    if(saveTimeout) return;                 // probíhá lokální zápis – nepřepisovat
    const fresh = snapshot.val();
    const cm = S.curMonth, cy = S.curYear;
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, fresh);
    sanitizeUserData(S);
    if(fresh && fresh.schemaV===2) S.schemaV=2;
    S.curMonth = cm; S.curYear = cy;
    _remoteApply();
  });
}

let _splitSeen = {};   // FIX-265: klíče, které v tomto sezení v DB opravdu existovaly

function _attachOwnListeners(userRef, uid, initialVal){
  _splitSeen = {};
  _detachOwnListeners(userRef);

  let useSplit = true;
  try { if(localStorage.getItem('ff_read_split') === '0') useSplit = false; } catch(e){}
  // Bez query/child exportů (starší firebase.js v cache) musíme na původní cestu
  if(typeof window._onChildAdded !== 'function') useSplit = false;

  if(!useSplit){ _attachFullListener(userRef); return; }

  try {
    // ── 1) Seznam meta klíčů: _DW_META + skaláry + cokoli navíc ze snapshotu ──
    const known = _DW_META.concat(['schemaV','settings','premiumHint']);
    const seen  = initialVal ? Object.keys(initialVal) : [];
    const metaKeys = Array.from(new Set(known.concat(seen))).filter(k => k !== 'transactions');
    const extra = seen.filter(k => k !== 'transactions' && known.indexOf(k) < 0);
    if(extra.length) console.warn('[diff-read] klíče mimo _DW_META, poslouchám je navíc:', extra);

    // ── 2) META: onValue na každý klíč zvlášť ──
    metaKeys.forEach(k => {
      const r  = _ref(_db, `users/${uid}/data/${k}`);
      const cb = _onValue(r, (snap) => {
        if(saveTimeout) return;
        // FIX-265 (S19, nahlásil Milan): tenhle řádek uživateli MAZAL data.
        //   Původně: S[k] = snap.exists() ? snap.val() : (Array.isArray(S[k]) ? [] : S[k])
        //   Když klíč v databázi NEEXISTOVAL, lokální pole se přepsalo na [].
        //   U nového účtu tak zmizely kategorie hned po přihlášení – a znovu
        //   i poté, co si je uživatel ručně obnovil, protože uzel pořád chyběl.
        //   Nelze rozlišit „nikdy nezapsáno" od „smazáno", ale ROZLIŠIT SE DÁ,
        //   jestli klíč v TOMTO sezení už existoval: dokud jsme ho nikdy neviděli,
        //   je chybějící uzel nepřítomnost dat, ne jejich smazání → neber lokální.
        //   Jakmile jednou existoval a pak zmizel, jde o skutečné smazání → vyprázdni.
        if(snap.exists()){
          S[k] = snap.val();
          _splitSeen[k] = true;
        } else if(_splitSeen[k]){
          S[k] = Array.isArray(S[k]) ? [] : S[k];   // skutečné smazání
        }
        // jinak: klíč jsme nikdy neviděli → nech lokální hodnotu být
        if(k === 'schemaV' && S.schemaV === 2) S.schemaV = 2;
        _remoteApply();
      });
      _splitRefs.push({ref:r, ev:'value', cb});
    });

    // ── 3) TRANSAKCE: jen změněný záznam, ne celé pole ──
    const txRef = _ref(_db, `users/${uid}/data/transactions`);
    const cbA = _onChildAdded(txRef,   (s) => { if(saveTimeout) return; _txUpsert(s.val()); _remoteApply(); });
    const cbC = _onChildChanged(txRef, (s) => { if(saveTimeout) return; _txUpsert(s.val()); _remoteApply(); });
    const cbR = _onChildRemoved(txRef, (s) => { if(saveTimeout) return; _txRemove(s.key);  _remoteApply(); });
    _splitRefs.push({ref:txRef, ev:'child_added',   cb:cbA});
    _splitRefs.push({ref:txRef, ev:'child_changed', cb:cbC});
    _splitRefs.push({ref:txRef, ev:'child_removed', cb:cbR});

    console.log('[diff-read] rozdělené čtení aktivní ·', metaKeys.length, 'meta klíčů + transakce po záznamech');
  } catch(e) {
    // Cokoli selže → zpět na osvědčenou cestu, ať uživatel nepřijde o data
    console.warn('[diff-read] selhalo, fallback na onValue celého uzlu:', e);
    _detachOwnListeners(userRef);
    _attachFullListener(userRef);
  }
}

// ══════════════════════════════════════════════════════
//  S17 (ADR-062): DIFF-WRITE – ukládá jen ZMĚNĚNÉ, ne celou databázi.
//  Automatický diff proti poslednímu uloženému stavu (nemůže minout žádnou mutaci).
//  Transakce → OBJEKT data/transactions/{id} (jeden zápis ~1 KB místo ~1,5 MB).
//  Meta sekce → zapíšou se jen ty, které se změnily. Reader (sanitizeUserData) vrací pole.
//  Bezpečný mezikrok: čtení stále přes onValue celého uzlu; migrace lazy + záloha v1.
// ══════════════════════════════════════════════════════
const _DW_META = ['debts','categories','bank','birthdays','wishes','wallets','payTypes','sablony','projects','receipts','nakupList','assets','noSyncKeys','importHistory','shareSettings','calNotes','workCal','diary','idleCfg','milestones','reportSectors','pristiCfg'];
let _dw = { ready:false, metaSig:{}, txSig:null };

function _dwEnsureIds(){
  // Každá transakce musí mít id (klíč v objektu). Doplní chybějící (staré importy ap.).
  let n=0;
  (S.transactions||[]).forEach(t=>{ if(t && (t.id==null||t.id==='')){ t.id='tx_'+Date.now().toString(36)+'_'+(n++)+Math.random().toString(36).slice(2,7); } });
}
// ══════════════════════════════════════════════════════
//  S20 (Krok 0): ÚLOŽIŠTĚ ≠ VÝDEJNÍ OKÉNKO
//  Do v10.10 se shareSettings vynucovaly TADY, při zápisu do users/{uid}/data.
//  Jenže ten uzel je zároveň jediné úložiště uživatele – vypnutí přepínače
//  v „Sdílení & Partneři" tedy nezastavilo sdílení, ale SMAZALO data z cloudu
//  (diff-write zapsal transactions/{id}=null pro každou transakci). Přepínače
//  jsou přitom dostupné každému, i tomu, kdo nikdy žádného partnera nepřidal.
//
//  Nově:
//    users/{uid}/data    → _dwMetaVals/_dwTxObj … VŽDY kompletní, čte jen vlastník
//    users/{uid}/shared  → _shMetaVals/_shTxObj … výřez, tohle čtou partneři
//  Filtr tak nemá jak sáhnout na úložiště. Viz PLAN-oprava-sdileni.md.
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
//  FIX-315 (S21): NEPLATNÉ KLÍČE SHODILY CELÝ ZÁPIS DO FIREBASE
//  Firebase v klíči nesnese  .  #  $  /  [  ]  a při jediném takovém klíči
//  odmítne CELÝ `set` – ne jen tu jednu hodnotu. Stačilo, aby se do
//  `coicopOverrides` dostala podkategorie „Školka/škola\", a výřez `shared`
//  se nezapsal vůbec: partner neměl co číst a Rodinný souhrn zůstal prázdný.
//
//  Ta samá chyba tu už jednou byla (S9) a opravila se u zdroje – v
//  renderCatPage(), aby merge nemutoval S.categories. Vrátila se jinudy.
//  Proto ji tentokrát chytáme i NA HRANICI ZÁPISU: ať ji zavleče kterýkoli
//  kód, k Firebase se nedostane. Oprava u zdroje tím nezaniká, tohle je
//  druhá obrana, ne náhrada.
//
//  Klíč se nezahazuje, jen se v něm zakázané znaky nahradí pomlčkou –
//  „Školka/škola\" → „Školka-škola\". Data se tak neztratí a název zůstane
//  čitelný. (Zahodit klíč by znamenalo tiše přijít o COICOP zařazení.)
// ══════════════════════════════════════════════════════════════════════
const _FB_ZAKAZANE = /[.#$/\[\]]/g;
function _fbSafeKeys(v){
  if (Array.isArray(v)) return v.map(_fbSafeKeys);
  if (v && typeof v === 'object'){
    const out = {};
    for (const k of Object.keys(v)){
      const bezpecny = String(k).replace(_FB_ZAKAZANE, '-');
      if (!bezpecny) continue;                 // prázdný klíč Firebase taky nebere
      if (bezpecny !== k) {
        console.warn('[firebase] klíč upraven:', JSON.stringify(k), '→', JSON.stringify(bezpecny));
      }
      out[bezpecny] = _fbSafeKeys(v[k]);
    }
    return out;
  }
  return v;
}
window._fbSafeKeys = _fbSafeKeys;

function _dwMetaVals(){
  // FIX-315: sanitace i tady – úložiště `data` je na neplatný klíč stejně
  //   citlivé jako výřez. Kdyby spadl tenhle zápis, uživatel přijde o data,
  //   ne „jen" o sdílení. Volá se přes _fbSafeKeys až v _dwWrite/_shMetaVals.
  return {
    debts: S.debts||[],
    categories: S.categories||[],
    bank: S.bank||{startBalance:0},
    birthdays: S.birthdays||[],
    wishes: S.wishes||[],
    wallets: S.wallets||[],
    payTypes: S.payTypes||[],
    sablony: S.sablony||[],
    projects: S.projects||[],
    receipts: S.receipts||[],
    nakupList: S.nakupList||[],
    assets: S.assets||[],
    noSyncKeys: S.noSyncKeys||[],
    importHistory: S.importHistory||[],
    shareSettings: S.shareSettings||{},
    calNotes: S.calNotes||{},
    workCal: S.workCal||{},
    diary: S.diary||{},
    idleCfg: S.idleCfg||{},  // S17.4 (TODO-183): konfigurace Ušlého zisku
    milestones: S.milestones||[],  // v9.45 (TODO-203): Životní mapa – zlomové události
    reportSectors: S.reportSectors||{},  // v9.52 (TODO-208): vlastní sektory Reportu
    pristiCfg: S.pristiCfg||{}  // v9.79 (TODO-211): ruční úpravy odhadu v kartě Příští měsíc
  };
}
function _dwTxObj(){
  const o={};
  (S.transactions||[]).forEach(t=>{ if(t && t.id!=null) o[String(t.id)]=t; });
  return o;
}
// ── Výdejní okénko: tady filtr žije. Vrací PRÁZDNO pro vypnuté sekce,
//    ale zapisuje se do users/{uid}/shared, ne do úložiště. ──
// ══════════════════════════════════════════════════════════════════════
//  VÝDEJNÍ OKÉNKO – FIX-317 (S21): OD KOPÍROVÁNÍ K POVOLOVACÍMU SEZNAMU
//  Původní verze vzala CELÉ úložiště a vypnuté sekce z něj vymazala. Do
//  výřezu tím propadlo všechno, na co nikdo nemyslel: `diary` (osobní deník),
//  `calNotes`, `workCal`, `milestones` (Životní mapa), `idleCfg`, `pristiCfg`,
//  `importHistory`, `nakupList`, `sablony`, `noSyncKeys` – bez přepínače,
//  bez zmínky v „Co partner uvidí\". Třináct uzlů, o kterých uživatel nevěděl.
//
//  Je to táž chyba jako u Firebase pravidel, jen v kódu: co není výslovně
//  povoleno, musí být ZAKÁZÁNO. Nový uzel v S se teď do výřezu nedostane sám
//  od sebe – někdo ho sem musí vědomě dopsat.
//
//  `payTypes`, `wallets` a `categories` zůstávají, protože bez nich by se
//  sdílené transakce nedaly vykreslit (byly by to částky bez názvů).
//  U kategorií se ale posílá jen KOSTRA – viz _shCatSkeleton níž.
// ══════════════════════════════════════════════════════════════════════

// Kategorie jsou u všech uživatelů skoro stejné, takže jako ochrana soukromí
// nedávaly smysl (Milanův postřeh, S21). Nesou ale i osobní věci: `limit` je
// rozpočet, `coicopOverrides` prozrazuje ruční zatřídění. Posílá se proto jen
// to, co je potřeba k vykreslení cizí transakce: co to je a jak se to jmenuje.
function _shCatSkeleton(cats){
  return (cats||[]).map(c => ({
    id: c.id, name: c.name, icon: c.icon || null, color: c.color || null,
    type: c.type || null, parent: c.parent ?? null,
    subs: Array.isArray(c.subs) ? c.subs.map(x => (typeof x === 'string' ? x : (x && x.name) || '')) : []
  }));
}

function _shMetaVals(){
  const ss = S.shareSettings || {};
  const mv = _fbSafeKeys(_dwMetaVals());   // FIX-315
  const zap = k => ss[k] !== false;        // výchozí stav je „sdílím\"

  const out = {
    // — nutné k vykreslení, samo o sobě neprozradí útratu —
    categories: _shCatSkeleton(mv.categories),
    payTypes:   mv.payTypes || [],

    // — sekce s přepínačem v „Co partner uvidí\" —
    debts:     zap('debts')     ? mv.debts     : [],
    bank:      zap('bank')      ? mv.bank      : { startBalance: 0 },
    birthdays: zap('birthdays') ? mv.birthdays : [],
    wishes:    zap('wishes')    ? mv.wishes    : [],
    wallets:   zap('wallets')   ? mv.wallets   : [],
    projects:  zap('projects')  ? mv.projects  : [],
    receipts:  zap('receipts')  ? mv.receipts  : [],
    assets:    zap('assets')    ? mv.assets    : [],
  };

  // ZÁMĚRNĚ SE NESDÍLÍ (a nedopisovat sem bez rozmyslu):
  //   diary, calNotes, workCal, milestones  – osobní zápisky a životní události
  //   idleCfg, reportSectors, pristiCfg     – nastavení mých vlastních pohledů
  //   importHistory, noSyncKeys             – provozní stopa, partnerovi k ničemu
  //   nakupList, sablony                    – nákupní seznam a šablony
  //   shareSettings                         – komu co sdílím není věc partnera
  return out;
}

// ══════════════════════════════════════════════════════════════════════
//  TŘI ÚROVNĚ SDÍLENÍ TRANSAKCÍ (TODO-240, S21 – Milanův návrh)
//  Dosud to byl vypínač: buď partner vidí každou položku, nebo nic. Mezi tím
//  je ale to, co většina domácností opravdu chce – vědět, KOLIK padlo na
//  potraviny, ne CO kdo v úterý koupil. Přehled bez dohlížení.
//
//    'off'   … nesdílím nic
//    'sums'  … jen součty za kategorie a měsíc
//    'full'  … jednotlivé transakce (jako dosud)
//
//  Starý zápis se překládá: false → 'off', true i chybějící hodnota → 'full'.
//  Nikomu se tím sdílení nezmění pod rukama; kdo chce ubrat, ubere si sám.
// ══════════════════════════════════════════════════════════════════════
const TX_SHARE_MODES = ['off','sums','full'];
function txShareMode(ss){
  const v = (ss || S.shareSettings || {}).transactions;
  if (v === false) return 'off';
  if (TX_SHARE_MODES.includes(v)) return v;
  return 'full';                  // true i undefined – beze změny proti dřívějšku
}
window.txShareMode = txShareMode;

function _shTxObj(){
  return txShareMode() === 'full' ? _dwTxObj() : {};
}

// Součty za kategorii a měsíc. Stejná pravidla jako všude jinde: přes txCZK
// (cizí měny nesčítat nominálně) a bez přesunů, rozpadů a vyrovnání.
// Klíč měsíce je „RRRR-MM\", klíč kategorie je její id – jméno by se mohlo
// změnit a historie by se rozpadla.
function _shCatSums(){
  if (txShareMode() !== 'sums') return null;
  const D = S;
  const out = {};
  (D.transactions||[]).forEach(t=>{
    if(!t || !t.date) return;
    if(t.splitParent || t.isBalancing) return;
    if(typeof isTransferTx === 'function' && isTransferTx(t)) return;
    if(t.type !== 'income' && t.type !== 'expense') return;
    const d = new Date(t.date); if(isNaN(d)) return;
    const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const ck = String(t.catId ?? t.category ?? 'bez');
    out[mk] = out[mk] || {};
    const r = out[mk][ck] = out[mk][ck] || { inc:0, exp:0, n:0 };
    const castka = (typeof txCZK === 'function') ? txCZK(t, D) : (t.amount || t.amt || 0);
    if(t.type === 'income') r.inc += castka; else r.exp += castka;
    r.n++;
  });
  // Zaokrouhlit až na konci, ať se chyba nesčítá po položkách
  Object.values(out).forEach(mes => Object.values(mes).forEach(r => {
    r.inc = Math.round(r.inc); r.exp = Math.round(r.exp);
  }));
  return out;
}
function _dwSeed(){
  _dw.metaSig={}; const mv=_dwMetaVals();
  _DW_META.forEach(k=>{ try{ _dw.metaSig[k]=JSON.stringify(mv[k]); }catch(e){ _dw.metaSig[k]=''; } });
  _dw.txSig=new Map(); const to=_dwTxObj();
  Object.keys(to).forEach(id=>{ try{ _dw.txSig.set(id, JSON.stringify(to[id])); }catch(e){} });
  _dw.ready=true;
}

// ── Výdejní okénko: vlastní diff sada, aby se i sem zapisovalo jen změněné ──
let _sh = { ready:false, metaSig:{}, txSig:null, sumSig:'', mode:null };   // TODO-240: sumSig/mode

// Kdo nikoho nemá ve sdílení, výdejní okénko nepotřebuje – ušetří polovinu zápisů.
// Seznam partnerů je načtený při přihlášení (loadPartners → partnerData).
// FIX-311 (S21): TENHLE TEST SE PTAL NA ŠPATNOU VĚC A `shared` KVŮLI TOMU NEVZNIKL.
//   `partnerData` je seznam lidí, JEJICHŽ data umím přečíst. Jenže výdejní okénko
//   `shared` se má psát tehdy, když někdo může číst MĚ – a to je úplně jiný seznam:
//   `users/{já}/partners`. Kdo někomu udělil přístup, ale sám ještě nic číst nesměl,
//   měl `partnerData` prázdné, `_shWrite` se nikdy nespustil a druhá strana neměla
//   co číst. Sdílení se tak nerozjelo ani po správném přidání.
let _myGrants = new Set();          // komu jsem udělil přístup ke svým datům
let _cekajiciPartneri = [];         // FIX-316: komu jsem dal přístup, ale on mně ještě ne
let _bezVyrezu = [];                // FIX-318: kdo mi přístup dal, ale výřez mu ještě nevznikl
window._cekajiciPartneri = _cekajiciPartneri;
window._bezVyrezu = _bezVyrezu;
function _hasPartners(){
  try {
    if (_myGrants && _myGrants.size) return true;
    return !!(partnerData && Object.keys(partnerData).length);
  } catch(e){ return false; }
}
window._myGrants = _myGrants;

async function _shWrite(uid){
  const sharedRef = _ref(_db, `users/${uid}/shared`);
  // První zápis (nebo po odhlášení) → plný snímek + nasazení signatur
  if(!_sh.ready){
    const sums = _shCatSums();   // TODO-240: null, když se sdílí 'off' nebo 'full'
    const full = Object.assign({}, _shMetaVals(),
      { transactions: _shTxObj(), txMode: txShareMode(), schemaV: 2 },
      sums ? { catSums: sums } : {});
    await _set(sharedRef, full);
    _sh.metaSig={}; const mv0=_shMetaVals();
    _DW_META.forEach(k=>{ try{ _sh.metaSig[k]=JSON.stringify(mv0[k]); }catch(e){ _sh.metaSig[k]=''; } });
    _sh.txSig=new Map(); const to0=_shTxObj();
    Object.keys(to0).forEach(id=>{ try{ _sh.txSig.set(id, JSON.stringify(to0[id])); }catch(e){} });
    _sh.sumSig = sums ? JSON.stringify(sums) : '';   // TODO-240
    _sh.mode = txShareMode();
    _sh.ready=true;
    return;
  }
  const updates={};
  const mv=_shMetaVals();
  _DW_META.forEach(k=>{ let sig; try{ sig=JSON.stringify(mv[k]); }catch(e){ sig=''; } if(sig!==_sh.metaSig[k]){ updates[k]=mv[k]; _sh.metaSig[k]=sig; } });
  const to=_shTxObj(); const seen=new Set();
  Object.keys(to).forEach(id=>{ seen.add(id); let sig; try{ sig=JSON.stringify(to[id]); }catch(e){ sig=''; } if(sig!==_sh.txSig.get(id)){ updates['transactions/'+id]=to[id]; _sh.txSig.set(id,sig); } });
  // Tady je mazání SPRÁVNĚ: transakce zmizela z výřezu (smazána, nebo uživatel
  // vypnul sdílení transakcí) → ve výdejním okénku být nemá. Úložiště je jinde.
  _sh.txSig.forEach((_v,id)=>{ if(!seen.has(id)){ updates['transactions/'+id]=null; _sh.txSig.delete(id); } });

  // TODO-240: součty za kategorie musí do přírůstkového zápisu taky, jinak by
  //   zamrzly na prvním snímku a partner by viděl čísla z okamžiku propojení.
  //   Přepínání režimu ošetřeno v obou směrech: při přechodu na 'full' nebo 'off'
  //   se uzel smaže, jinak by tam po sobě zanechal starý agregát.
  const sums = _shCatSums();
  const sumSig = sums ? JSON.stringify(sums) : '';
  if(sumSig !== (_sh.sumSig || '')){
    updates['catSums'] = sums || null;
    _sh.sumSig = sumSig;
  }
  const rezim = txShareMode();
  if(rezim !== _sh.mode){ updates['txMode'] = rezim; _sh.mode = rezim; }

  if(Object.keys(updates).length){
    await _update(sharedRef, updates);
  }
}

// Save to Firebase (own data only) – DIFF-WRITE (S17, ADR-062)
async function saveToFirebase() {
  if(viewingUid) return;
  if(!window._currentUser) return;
  setSyncStatus('syncing');
  try {
    const uid = window._currentUser.uid;
    _dwEnsureIds();
    const dataRef = _ref(_db, `users/${uid}/data`);

    // ── Migrace / první uložení: plný v2 zápis + jednorázová záloha v1 ──
    if(S.schemaV!==2 || !_dw.ready){
      // Jednorázová záloha starého pole transakcí (rollback) – jen při přechodu z v1
      try{
        const bkey='ff_dwBackup_'+uid;
        if(S.schemaV!==2 && !localStorage.getItem(bkey) && (S.transactions||[]).length){
          await _set(_ref(_db, `users/${uid}/dataBackupV1`), { transactions: S.transactions||[], at: Date.now(), note:'ADR-062 pre-migration backup' });
          localStorage.setItem(bkey,'1');
        }
      }catch(e){ console.warn('[diff-write] záloha v1 přeskočena:', e); }
      const full = _fbSafeKeys(Object.assign({}, _dwMetaVals(), { transactions: _dwTxObj(), schemaV: 2 }));   // FIX-315
      await _set(dataRef, full);
      S.schemaV = 2;
      _dwSeed();
      // Side-write (vlastní try/catch): výdejní okénko je bonus, ne podmínka
      // toho, aby se uživateli uložila data. Když selže, uloženo je pořád.
      try { if(_hasPartners()) await _shWrite(uid); }
      catch(e){ console.warn('[shared] zápis výřezu selhal:', e); }
      setSyncStatus('ok');
      publishCommunityStats(getData());
      return;
    }

    // ── Diff zápis ──
    const updates = {};
    const mv = _fbSafeKeys(_dwMetaVals());   // FIX-315
    _DW_META.forEach(k=>{ let sig; try{ sig=JSON.stringify(mv[k]); }catch(e){ sig=''; } if(sig!==_dw.metaSig[k]){ updates[k]=mv[k]; _dw.metaSig[k]=sig; } });
    const to = _dwTxObj(); const seen=new Set();
    Object.keys(to).forEach(id=>{ seen.add(id); let sig; try{ sig=JSON.stringify(to[id]); }catch(e){ sig=''; } if(sig!==_dw.txSig.get(id)){ updates['transactions/'+id]=to[id]; _dw.txSig.set(id,sig); } });
    _dw.txSig.forEach((_v,id)=>{ if(!seen.has(id)){ updates['transactions/'+id]=null; _dw.txSig.delete(id); } });

    if(Object.keys(updates).length){
      await _update(dataRef, updates);
    }
    // Side-write (vlastní try/catch) – viz výše
    try { if(_hasPartners()) await _shWrite(uid); }
    catch(e){ console.warn('[shared] zápis výřezu selhal:', e); }
    setSyncStatus('ok');
    publishCommunityStats(getData());
  } catch(e) {
    setSyncStatus('error');
    console.error('Save error:', e);
  }
}

function save() {
  if(viewingUid) return;
  if(typeof syncInvestmentAssets === 'function') syncInvestmentAssets(); // S14: přesuny → finanční aktiva (idempotentní, mění S.assets in-place)
  // FIX (S11): každé uložení = uživatelská akce → vynuť příští render (anti-flicker
  // guard v renderPage by jinak přeskočil změny které _dataSig nezachytí: wallet
  // balance, virtuální cíle, tagy, podkategorie, receipt edity).
  if(typeof _renderForce !== 'undefined') _renderForce = true;
  saveSnapshot(); // Session 11: vždy aktualizuj lokální snapshot (i offline změny)
  if(_isLocalMode) {
    saveLocal();
    setSyncStatus('ok');
    return;
  }
  // TODO-002: Offline detekce – pokud není internet, uloži do IndexedDB fronty
  if (!navigator.onLine && window.OfflineSync) {
    // Najdi nejnovější transakci (právě přidanou) a ulož ji offline
    const lastTx = S.transactions?.[S.transactions.length - 1];
    if (lastTx) {
      window.OfflineSync.saveTxOffline(lastTx).then(() => {
        setSyncStatus('ok');
        if (typeof showToast === 'function') {
          showToast('⏳ Offline – transakce bude uložena po připojení k internetu');
        }
      }).catch(e => console.error('Offline save error:', e));
    }
    return;
  }
  clearTimeout(saveTimeout);
  setSyncStatus('syncing');
  saveTimeout = setTimeout(() => {
    saveTimeout = null; // clear BEFORE saving so listener can resume after
    saveToFirebase();
    // TODO-082: Throttled COICOP upload do komunity (max 1× za 5 minut)
    if(typeof uploadCoicopToFirebase === 'function' && !_isLocalMode) {
      clearTimeout(window._coicopUploadTimeout);
      window._coicopUploadTimeout = setTimeout(() => {
        uploadCoicopToFirebase(S.curMonth, S.curYear, getData()).catch(()=>{});
      }, 300000); // 5 minut throttle
    }
  }, 1200);
}

// FIX-063 (Session 8): Pokud uživatel zavře tab/refresh během save debounce (1200ms),
// data se ztratí. beforeunload handler vyflushuje debounce SYNCHRONNĚ.
// Pozn.: navigator.sendBeacon je nejspolehlivější způsob – funguje i při unload.
window.addEventListener('beforeunload', (e) => {
  if (saveTimeout && !_isLocalMode && !viewingUid && navigator.onLine) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    // Pokus o synchronní save přes sendBeacon (POST do Firebase REST API)
    try {
      const uid = window._currentUser?.uid;
      if (uid && window._idTokenCache) {
        const url = `https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/users/${uid}/data.json?auth=${window._idTokenCache}`;
        const dataToSave = {
          transactions: S.transactions || [],
          categories: S.categories || [],
          debts: S.debts || [],
          birthdays: S.birthdays || [],
          settings: S.settings || {},
          receipts: S.receipts || [],
          // Další pole...
        };
        const blob = new Blob([JSON.stringify(dataToSave)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        console.log('[Save] beforeunload: sendBeacon dispatched');
      }
    } catch(err) {
      console.error('[Save] beforeunload sendBeacon failed:', err);
    }
    // Také vyvolat normální save jako fallback (může nestihnout, ale zkusíme)
    saveToFirebase();
  }
});

// FIX-063: Cache idToken pro sendBeacon (sendBeacon je sync – nemůže await getIdToken)
async function refreshIdTokenCache() {
  try {
    if (window._currentUser && typeof window._currentUser.getIdToken === 'function') {
      window._idTokenCache = await window._currentUser.getIdToken();
    }
  } catch(e) { /* ignore */ }
}
// Refresh každých 30 minut (Firebase token expirace 1h)
setInterval(refreshIdTokenCache, 30 * 60 * 1000);

function setSyncStatus(status) {
  const dot = document.getElementById('syncDot');
  const txt = document.getElementById('syncStatus');
  if(!dot) return;
  dot.className = 'sync-dot' + (status==='syncing'?' syncing':status==='error'?' error':'');
  if(_isLocalMode) {
    txt.textContent = '📱 Lokální úložiště';
  } else {
    txt.textContent = status==='syncing'?'Ukládám...':status==='error'?'Chyba sync':'Synchronizováno';
  }
}

function updateSidebarUser(user) {
  const email = user.email || '';
  // Jméno: profil > displayName > část e-mailu před @ (ne celý e-mail 2×)
  let name = window._userProfile?.displayName || user.displayName;
  if (!name && email) {
    const local = email.split('@')[0];
    // Pokus o hezčí jméno z e-mailu: jan.havran -> Jan Havran
    name = local.split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  }
  document.getElementById('sidebarName').textContent = name || email;
  document.getElementById('sidebarEmail').textContent = email;
  const av = document.getElementById('sidebarAvatar');
  const photo = window._userProfile?.photoURL || user.photoURL;
  if(av){
    // FIX-314 (S21, Milan): VÝBĚR AVATARA NEDĚLAL NIC. Fotka z Google účtu se
    //   testovala PRVNÍ – a tu má po přihlášení přes Google skoro každý, takže
    //   emoji avatar nemohl nikdy vyhrát. Uživatel si ho vybral, uložil se do
    //   profilu, ale v sidebaru se nic nezměnilo. Vědomá volba musí přebít
    //   výchozí hodnotu, ne naopak.
    if(window._userProfile?.avatar) {
      av.outerHTML = `<div class="user-avatar-placeholder" id="sidebarAvatar">${window._userProfile.avatar}</div>`;
    } else if(photo) {
      av.outerHTML = `<img src="${photo}" class="user-avatar" id="sidebarAvatar" onerror="this.outerHTML='<div class=user-avatar-placeholder id=sidebarAvatar>👤</div>'">`;
    } else {
      av.outerHTML = `<div class="user-avatar-placeholder" id="sidebarAvatar">👤</div>`;
    }
  }
  // Admin kontrola při každé aktualizaci uživatele
  checkAdminNav();
}

// ══════════════════════════════════════════════════════
//  PROFILE MODAL
// ══════════════════════════════════════════════════════
// S14: emoji avatar (volitelný) – uloží se do profilu a ukáže v sidebaru i rodinném přehledu
const AVATAR_CHOICES = ['🦊','🐱','🐶','🐼','🦁','🐸','🐵','🦉','🐺','🦄','🐯','🐷','🐰','🐨','🐹','🦝','😎','🤓','🥳','🦸','🧙','🧑‍💻','👩‍💼','🌟'];
let _selectedAvatar = '';
function renderAvatarPicker(){
  const el = document.getElementById('profileAvatarPicker'); if(!el) return;
  el.innerHTML = AVATAR_CHOICES.map(e =>
    `<button type="button" onclick="selectAvatar('${e}')" style="font-size:1.35rem;width:42px;height:42px;border-radius:10px;border:2px solid ${_selectedAvatar===e?'var(--accent,#22c55e)':'transparent'};background:var(--surface2,#1a2436);cursor:pointer;line-height:1">${e}</button>`
  ).join('');
}
window.renderAvatarPicker = renderAvatarPicker;
function selectAvatar(e){
  _selectedAvatar = (_selectedAvatar === e) ? '' : e; // druhé kliknutí = zrušit
  renderAvatarPicker();
}
window.selectAvatar = selectAvatar;

function openProfileModal() {
  document.getElementById('profileName').value = window._userProfile?.displayName || '';
  _selectedAvatar = (window._userProfile && window._userProfile.avatar) || '';
  if(typeof renderAvatarPicker==='function') renderAvatarPicker();
  if(typeof renderReferralCodeRow==='function') renderReferralCodeRow();
  document.getElementById('modalProfile').classList.add('open');
}
async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();
  if(!name) { alert('Zadej jméno'); return; }
  window._userProfile = Object.assign(window._userProfile||{}, {displayName: name, avatar: (typeof _selectedAvatar!=='undefined' ? _selectedAvatar : '')||null});
  await _set(_ref(_db, `users/${window._currentUser.uid}/profile`), window._userProfile);
  updateSidebarUser(window._currentUser);
  renderPartnerSection(Object.keys(partnerData));
  closeModal('modalProfile');
  if(typeof showToast==='function') showToast('✅ Profil uložen');
}

// ══════════════════════════════════════════════════════
//  SEED DATA
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  FIX-264 (S19, nahlásil Milan): NOVÝ UŽIVATEL BEZ KATEGORIÍ
//
//  seedData() se volalo JEN když v Firebase chyběl CELÝ uzel users/{uid}/data.
//  Ten ale vznikne i jinak – částečným zápisem, migrací, importem, obnovou
//  zálohy nebo prvním uložením čehokoli. Od té chvíle `!snap.exists()` neplatí,
//  seed se nikdy nespustí a uživatel zůstane BEZ KATEGORIÍ, BEZ TYPŮ PLATEB
//  A BEZ PENĚŽENKY. V modalu Přidat transakci není co vybrat a Predikce hlásí
//  „Nejprve přidej kategorie výdajů" – nový uživatel aplikaci zavře.
//
//  Řešení: neptat se „existuje uzel?", ale „má uživatel to, bez čeho aplikace
//  nefunguje?" a chybějící doplnit. Idempotentní – co uživatel má, se nesahá.
function ensureBaseData(){
  const doplneno = [];
  if(!Array.isArray(S.categories) || !S.categories.length){
    if(typeof DEFAULT_CATEGORIES !== 'undefined'){
      S.categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
      doplneno.push('kategorie');
    }
  }
  if(!Array.isArray(S.payTypes)) S.payTypes = [];
  // Peněženka: bez ní je rozbalovátko prázdné a transakci nelze přiřadit k účtu.
  //   Zakládá se JEDNA neutrální, ne sada, kterou by uživatel musel mazat.
  if(!Array.isArray(S.wallets) || !S.wallets.length){
    S.wallets = [{
      id: (typeof uid === 'function' ? uid() : 'w' + Date.now().toString(36)),
      name: 'Můj účet', type: 'account',
      currency: (typeof baseCur === 'function' ? baseCur() : 'CZK'),
      balance: 0, color: '#60a5fa'
    }];
    doplneno.push('peněženka');
  }
  if(!S.bank) S.bank = { startBalance: 0 };
  return doplneno;
}

function seedData(){
  // Nový uživatel = ČISTÁ aplikace. Žádné fiktivní/demo transakce, dluhy, peněženky, cíle.
  // Pouze sdílené globální prvky z kódu (kategorie, typy plateb) – ty nastavuje admin pro všechny.
  S.transactions = [];
  S.debts        = [];
  S.wallets      = [];
  S.wishes       = [];
  S.projects     = [];
  S.sablony      = [];
  S.nakupList    = [];
  S.assets       = [];
  S.receipts     = [];
  S.birthdays    = [];
  S.payTypes     = [];
  S.bank         = { startBalance: 0 };
  // Sdílené kategorie (globální nastavení od admina) – kopie, ať je uživatel může lokálně upravit
  S.categories   = DEFAULT_CATEGORIES.map(c => ({ ...c }));
}

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
//  LOGIN BUTTON EVENT LISTENERS
//  (Bezpečnější než onclick v HTML – funkce jsou zaručeně načteny)
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  const btnGoogle = document.getElementById('btnGoogleLogin');
  if(btnGoogle) btnGoogle.addEventListener('click', function() {
    if(window._signInGoogle) window._signInGoogle();
    else if(typeof signInGoogle === 'function') signInGoogle();
    else alert('Firebase se načítá, zkuste za chvíli...');
  });

  const btnLocal = document.getElementById('btnLocalLogin');
  if(btnLocal) btnLocal.addEventListener('click', function() {
    if(typeof showLocalWarning === 'function') showLocalWarning();
  });
});
