// FinanceFlow · v8.83 · app.js · 2026-07-08
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
                 assets:S.assets||[],shareSettings:S.shareSettings||{},calNotes:S.calNotes||{},workCal:S.workCal||{},diary:S.diary||{},_savedAt:Date.now()};
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
const PAGE_TITLES={prehled:'Dashboard',souhrn:'Souhrn výdajů',transakce:'Transakce',tagy:'🏷️ Tagy',bank:'Bank',predikce:'Predikce',dluhy:'Půjčky',grafy:'Grafy',narozeniny:'Narozeniny a přání',statistiky:'Statistiky',kategorie:'Kategorie',ai:'AI Rádce',rodina:'Rodinný souhrn',sdileni:'Sdílení & Partneři',penezenky:'Peněženky',typy:'Typy plateb',sablony:'Opakované šablony',nastaveni:'Nastavení',oAplikaci:'O aplikaci',projekty:'Projekty',projektDetail:'Projekt',report:'Měsíční report',radar:'Finanční radar',obraz:'Finanční obraz',detektor:'Detektor úspor',simulace:'Simulace života',uctenky:'Analýza účtenek',admin:'🔐 Admin panel',denik:'📖 Deník',komunita:'🌍 Komunitní přehled',import:'📥 Import dat',nakup:'🛒 Nákupní seznam',aktiva:'💎 Finanční aktiva',budouci:'🗓️ Budoucí platby',smsimport:'📱 Import z banky',kalendar:'📅 Kalendář',kurzy:'💱 Kurzy měn'};
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
      S.curMonth = new Date().getMonth();
      S.curYear = new Date().getFullYear();
      if (!navigator.onLine && typeof showToast === 'function') showToast('📴 Offline – zobrazena poslední uložená data');
    }
    // Bez snapshotu necháme prázdné defaults; onValue listener data dorovná po připojení.
  } else if (!snap.exists()) {
    // First time - seed default data
    seedData();
    await saveToFirebase();
  } else {
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, snap.val());
    if(!S.birthdays) S.birthdays=[];
    if(!S.wishes) S.wishes=[];
    if(!S.bank) S.bank={startBalance:0};
    S.curMonth = new Date().getMonth();
    S.curYear = new Date().getFullYear();
    saveSnapshot(); // ulož čerstvý snapshot pro offline
  }

  // Real-time listener for own data
  if(_dbListener) _off(userRef, 'value', _dbListener);
  _dbListener = _onValue(userRef, (snapshot) => {
    if(!snapshot.exists()) return;
    // Don't overwrite if we have a pending save (would cause data loss)
    if(saveTimeout) return;
    const fresh = snapshot.val();
    const cm = S.curMonth, cy = S.curYear;
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[],nakupList:[],assets:[]}, fresh);
    S.curMonth = cm; S.curYear = cy;
    if(!S.birthdays) S.birthdays=[];
    if(!S.wishes) S.wishes=[];
    if(!S.bank) S.bank={startBalance:0};
    if(!S.wallets) S.wallets=[];
    if(!S.payTypes) S.payTypes=[];
    if(!S.sablony) S.sablony=[];
    if(!S.projects) S.projects=[];
    if(!S.nakupList) S.nakupList=[];
    setSyncStatus('ok');
    saveSnapshot(); // Session 11: ulož čerstvý snapshot pro offline
    // TODO-093: debounced render – Firebase listener nesmí blikat při každé sync
    if(viewingUid === null) {
      if(typeof renderPageDebounced === 'function') renderPageDebounced();
      else renderPage();
    }
  });

  // Load partners who have shared with me (offline-safe)
  try { await loadPartners(user); } catch (e) {}

  // Load premium status (offline-safe)
  try { await loadPremiumStatus(user.uid); } catch (e) {}

  // Load settings (offline-safe)
  try { await loadSettings(user.uid); } catch (e) {}

  // TODO-014: Načti AI mapování kategorií
  initCategoryMappings();

  // Process auto templates
  processAutoSablony();

  setSyncStatus('ok');
  updateMLabel();
  checkAdminNav();

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

async function loadPartners(user) {
  // Get list of users who have added this user as a partner
  const partnersRef = _ref(_db, `users/${user.uid}/partners`);
  const snap = await _get(partnersRef);
  if(!snap.exists()) {
    renderPartnerSection([]);
    return;
  }
  const partnerUids = Object.keys(snap.val());
  const loaded = [];
  
  for(const uid of partnerUids) {
    try {
      const [dataSnap, profileSnap] = await Promise.all([
        _get(_ref(_db, `users/${uid}/data`)),
        _get(_ref(_db, `users/${uid}/profile`))
      ]);
      if(dataSnap.exists()) {
        partnerData[uid] = {
          data: dataSnap.val(),
          profile: profileSnap.exists() ? profileSnap.val() : {displayName: 'Partner', photoURL: null}
        };
        loaded.push(uid);
        // Live listener for partner data
        const pRef = _ref(_db, `users/${uid}/data`);
        if(_partnerListeners[uid]) _off(pRef, 'value', _partnerListeners[uid]);
        _partnerListeners[uid] = _onValue(pRef, (s) => {
          if(s.exists()) {
            partnerData[uid].data = s.val();
            if(viewingUid === uid) {
              if(typeof renderPageDebounced === 'function') renderPageDebounced();
              else renderPage();
            }
            if(curPage === 'rodina') renderFamilySummary();
          }
        });
      }
    } catch(e) { console.log('Partner load error:', e); }
  }
  renderPartnerSection(loaded);
}

function renderPartnerSection(partnerUids) {
  const sec = document.getElementById('partnerSection');
  const btns = document.getElementById('partnerBtns');
  if(!partnerUids.length) { sec.style.display='none'; return; }
  sec.style.display = 'block';
  const me = window._currentUser;
  const myName = window._userProfile?.displayName || me?.displayName || 'Já';
  
  let html = `<div class="partner-btn ${viewingUid===null?'active-user':''}" onclick="switchToOwnData()">
    <div class="partner-avatar">${me?.photoURL?`<img src="${me.photoURL}" style="width:24px;height:24px;border-radius:50%">` : (window._userProfile?.avatar || '👤')}</div>
    <span class="partner-pname">${myName}</span>
    <span class="partner-badge badge-me">${viewingUid===null?'Aktivní':''}</span>
  </div>`;
  
  for(const uid of partnerUids) {
    const p = partnerData[uid];
    const name = p?.profile?.displayName || 'Partner';
    html += `<div class="partner-btn ${viewingUid===uid?'active-partner':''}" onclick="switchToPartner('${uid}')">
      <div class="partner-avatar">${p?.profile?.photoURL?`<img src="${p.profile.photoURL}" style="width:24px;height:24px;border-radius:50%">` : '👤'}</div>
      <span class="partner-pname">${name}</span>
      <span class="partner-badge badge-view">${viewingUid===uid?'Prohlíží':'→'}</span>
    </div>`;
  }
  btns.innerHTML = html;
}

function switchToPartner(uid) {
  viewingUid = uid;
  // Null-safe (mobil může mít některé prvky jinde/skryté – nesmí to shodit přepnutí dat)
  const _vb = document.getElementById('viewingBanner'); if(_vb) _vb.classList.add('show');
  const _rn = document.getElementById('readonlyNotice'); if(_rn) _rn.classList.add('show');
  const name = partnerData[uid]?.profile?.displayName || 'Partner';
  const _vc = document.getElementById('viewingChip'); if(_vc){ _vc.textContent = `👁 ${name}`; _vc.classList.add('show'); }
  const _fab = document.getElementById('mainFab'); if(_fab) _fab.style.display = 'none';
  // Zavři případně otevřené menu/sidebar na mobilu, ať je vidět přepnutý obsah
  try { if (typeof closeSidebar === 'function') closeSidebar(); } catch(_) {}
  try { renderPartnerSection(Object.keys(partnerData)); } catch(_) {}
  renderPage();
  updateReadonlyUI();
  if (typeof showToast === 'function') showToast(`👁 Prohlížíš data: ${name}`);
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

// Save to Firebase (own data only)
async function saveToFirebase() {
  if(viewingUid) return;
  if(!window._currentUser) return;
  setSyncStatus('syncing');
  try {
    const ss = S.shareSettings || {};
    const dataToSave = {
      transactions: ss.transactions===false ? [] : S.transactions||[],
      debts: ss.debts===false ? [] : S.debts||[],
      categories: ss.categories===false ? [] : S.categories||[],
      bank: ss.bank===false ? {startBalance:0} : S.bank||{startBalance:0},
      birthdays: ss.birthdays===false ? [] : S.birthdays||[],
      wishes: ss.wishes===false ? [] : S.wishes||[],
      wallets: ss.wallets===false ? [] : S.wallets||[],
      payTypes: S.payTypes||[],
      sablony: S.sablony||[],
      projects: ss.projects===false ? [] : S.projects||[],
      receipts: ss.receipts===false ? [] : S.receipts||[],
      nakupList: S.nakupList||[],
      assets: ss.assets===false ? [] : S.assets||[],
      noSyncKeys: S.noSyncKeys||[],
      importHistory: S.importHistory||[],
      shareSettings: S.shareSettings||{},
      calNotes: S.calNotes||{},
      workCal: S.workCal||{},
      diary: S.diary||{}
    };
    await _set(_ref(_db, `users/${window._currentUser.uid}/data`), dataToSave);
    setSyncStatus('ok');
    // Anonymně přispět do komunitních statistik
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
    if(photo) {
      av.outerHTML = `<img src="${photo}" class="user-avatar" id="sidebarAvatar" onerror="this.outerHTML='<div class=user-avatar-placeholder id=sidebarAvatar>👤</div>'">`;
    } else if(window._userProfile?.avatar) {
      av.outerHTML = `<div class="user-avatar-placeholder" id="sidebarAvatar">${window._userProfile.avatar}</div>`;
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
}

// ══════════════════════════════════════════════════════
//  SEED DATA
// ══════════════════════════════════════════════════════
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
