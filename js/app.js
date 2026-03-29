var _auth, _db, _provider;

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
      S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]}, parsed);
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
const PAGE_TITLES={prehled:'Dashboard',souhrn:'Souhrn výdajů',transakce:'Transakce',tagy:'🏷️ Tagy',bank:'Bank',predikce:'Predikce',dluhy:'Půjčky',grafy:'Grafy',narozeniny:'Narozeniny a přání',statistiky:'Statistiky',kategorie:'Kategorie',ai:'AI Rádce',rodina:'Rodinný souhrn',sdileni:'Sdílení & Partneři',penezenky:'Peněženky',typy:'Typy plateb',sablony:'Opakované šablony',nastaveni:'Nastavení',oAplikaci:'O aplikaci',projekty:'Projekty',projektDetail:'Projekt',report:'Měsíční report',radar:'Finanční radar',obraz:'Finanční obraz',detektor:'Detektor úspor',simulace:'Simulace života',uctenky:'Analýza účtenek',admin:'🔐 Admin panel',komunita:'🌍 Komunitní přehled',import:'📥 Import dat'};
const SEASON={0:{mult:.85},1:{mult:1.05},2:{mult:1.0},3:{mult:1.02},4:{mult:1.15},5:{mult:1.1},6:{mult:1.1},7:{mult:1.08},8:{mult:1.05},9:{mult:1.0},10:{mult:1.12},11:{mult:1.35}};

// My own data
let S = {transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],curMonth:new Date().getMonth(),curYear:new Date().getFullYear()};

// Partner data (read-only view)
let partnerData = {}; // uid -> {profile, data}
let viewingUid = null; // null = own data, uid = viewing partner

// Current display state
let curPage = 'prehled';
let curTxType = 'expense';
let selCatId = '';
let selSub = '';
let customSub = '';
let saveTimeout = null;
let _dbListener = null;
let _partnerListeners = {};

// ══════════════════════════════════════════════════════
//  FIREBASE INIT
// ══════════════════════════════════════════════════════
window.onUserSignedIn = async function(user) {
  // If migrating from local mode – use local data
  if(window._pendingMigration) {
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]}, window._pendingMigration);
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
  updateSidebarUser(user);
  
  // Load user profile (custom display name)
  await loadUserProfile(user);

  // Load own data from Firebase
  const userRef = _ref(_db, `users/${user.uid}/data`);
  
  // Check if data exists
  const snap = await _get(userRef);
  if (!snap.exists()) {
    // First time - seed default data
    seedData();
    await saveToFirebase();
  } else {
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]}, snap.val());
    if(!S.birthdays) S.birthdays=[];
    if(!S.wishes) S.wishes=[];
    if(!S.bank) S.bank={startBalance:0};
    S.curMonth = new Date().getMonth();
    S.curYear = new Date().getFullYear();
  }

  // Real-time listener for own data
  if(_dbListener) _off(userRef, 'value', _dbListener);
  _dbListener = _onValue(userRef, (snapshot) => {
    if(!snapshot.exists()) return;
    // Don't overwrite if we have a pending save (would cause data loss)
    if(saveTimeout) return;
    const fresh = snapshot.val();
    const cm = S.curMonth, cy = S.curYear;
    S = Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]}, fresh);
    S.curMonth = cm; S.curYear = cy;
    if(!S.birthdays) S.birthdays=[];
    if(!S.wishes) S.wishes=[];
    if(!S.bank) S.bank={startBalance:0};
    if(!S.wallets) S.wallets=[];
    if(!S.payTypes) S.payTypes=[];
    if(!S.sablony) S.sablony=[];
    if(!S.projects) S.projects=[];
    setSyncStatus('ok');
    if(viewingUid === null) renderPage();
  });

  // Load partners who have shared with me
  await loadPartners(user);

  // Load premium status
  await loadPremiumStatus(user.uid);

  // Load settings
  await loadSettings(user.uid);

  // Process auto templates
  processAutoSablony();

  setSyncStatus('ok');
  updateMLabel();
  checkAdminNav();
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
  const snap = await _get(profileRef);
  if(snap.exists()) {
    window._userProfile = snap.val();
  } else {
    window._userProfile = {displayName: user.displayName || user.email, photoURL: user.photoURL || null};
    await _set(profileRef, window._userProfile);
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
            if(viewingUid === uid) renderPage();
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
    <div class="partner-avatar">${me?.photoURL?`<img src="${me.photoURL}" style="width:24px;height:24px;border-radius:50%">` : '👤'}</div>
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
  document.getElementById('viewingBanner').classList.add('show');
  document.getElementById('readonlyNotice').classList.add('show');
  const name = partnerData[uid]?.profile?.displayName || 'Partner';
  document.getElementById('viewingChip').textContent = `👁 ${name}`;
  document.getElementById('viewingChip').classList.add('show');
  document.getElementById('mainFab').style.display = 'none';
  renderPartnerSection(Object.keys(partnerData));
  renderPage();
  updateReadonlyUI();
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
    return Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]}, d);
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
      shareSettings: S.shareSettings||{}
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
  if(_isLocalMode) {
    saveLocal();
    setSyncStatus('ok');
    return;
  }
  clearTimeout(saveTimeout);
  setSyncStatus('syncing');
  saveTimeout = setTimeout(() => {
    saveTimeout = null; // clear BEFORE saving so listener can resume after
    saveToFirebase();
  }, 1200);
}

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
  const name = window._userProfile?.displayName || user.displayName || user.email;
  const email = user.email;
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarEmail').textContent = email;
  const av = document.getElementById('sidebarAvatar');
  const photo = window._userProfile?.photoURL || user.photoURL;
  if(photo) {
    av.outerHTML = `<img src="${photo}" class="user-avatar" id="sidebarAvatar" onerror="this.outerHTML='<div class=user-avatar-placeholder id=sidebarAvatar>👤</div>'">`;
  }
  // Admin kontrola při každé aktualizaci uživatele
  checkAdminNav();
}

// ══════════════════════════════════════════════════════
//  PROFILE MODAL
// ══════════════════════════════════════════════════════
function openProfileModal() {
  document.getElementById('profileName').value = window._userProfile?.displayName || '';
  document.getElementById('modalProfile').classList.add('open');
}
async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();
  if(!name) { alert('Zadej jméno'); return; }
  window._userProfile = Object.assign(window._userProfile||{}, {displayName: name});
  await _set(_ref(_db, `users/${window._currentUser.uid}/profile`), window._userProfile);
  updateSidebarUser(window._currentUser);
  renderPartnerSection(Object.keys(partnerData));
  closeModal('modalProfile');
}

// ══════════════════════════════════════════════════════
//  SEED DATA
// ══════════════════════════════════════════════════════
function seedData(){
  S.projects=[
    {id:'p1',name:'Dovolená Chorvatsko 2026',type:'vacation',start:'2026-06-01',end:'2026-08-31',budget:50000,desc:'Letní dovolená u moře',color:'#06b6d4',closed:false},
    {id:'p2',name:'Rekonstrukce koupelny',type:'renovation',start:'2026-03-01',end:null,budget:120000,desc:'Nová koupelna',color:'#f59e0b',closed:false},
  ];
  S.wallets=[
    {id:'w1',name:'Běžný účet',type:'account',currency:'CZK',balance:15000,color:'#60a5fa'},
    {id:'w2',name:'Hotovost',type:'cash',currency:'CZK',balance:2000,color:'#4ade80'},
    {id:'w3',name:'Spořicí účet',type:'savings',currency:'CZK',balance:50000,color:'#a78bfa'},
  ];
  S.payTypes=[];
  S.sablony=[
    {id:'s1',name:'Internet O2',amount:399,type:'expense',catId:'cat3',freq:'monthly',den:15,auto:true,note:'Automatická platba'},
    {id:'s2',name:'Výplata',amount:42000,type:'income',catId:'cat7',freq:'monthly',den:1,auto:true,note:''},
  ];
  S.categories=[
    {id:'cat1',name:'Jídlo & Nákupy',icon:'🛒',color:'#f87171',type:'expense',subs:['Supermarket','Tržnice','Rozvoz jídla','Restaurace'],healthPct:20,healthAmt:8000},
    {id:'cat2',name:'Doprava',icon:'🚗',color:'#60a5fa',type:'expense',subs:['Benzín','MHD','Taxi/Uber','Servis'],healthPct:10,healthAmt:5000},
    {id:'cat3',name:'Bydlení',icon:'🏠',color:'#a78bfa',type:'expense',subs:['Nájem','Energie','Internet','Pojištění'],healthPct:30,healthAmt:null},
    {id:'cat4',name:'Zdraví',icon:'💊',color:'#fb923c',type:'expense',subs:['Léky','Lékař','Gym','Drogerie'],healthPct:8,healthAmt:4000},
    {id:'cat5',name:'Zábava',icon:'🎬',color:'#e879f9',type:'expense',subs:['Kino/Kultura','Streaming','Hry','Výlety'],healthPct:8,healthAmt:3000},
    {id:'cat6',name:'Dárky',icon:'🎁',color:'#fbbf24',type:'expense',subs:['Narozeniny','Vánoce','Ostatní dárky'],healthPct:5,healthAmt:2000},
    {id:'cat7',name:'Výplata',icon:'💰',color:'#4ade80',type:'income',subs:['Základní plat','Bonus','Přesčasy'],stable:true},
    {id:'cat8',name:'Ostatní příjmy',icon:'💵',color:'#34d399',type:'income',subs:['Freelance','Pronájem','Dividendy','Ostatní'],stable:false},
    {id:'cat9',name:'Spoření',icon:'🐷',color:'#818cf8',type:'expense',subs:['Spořicí účet','Stavební spoření'],healthPct:10,healthAmt:null,isSaving:true},
    {id:'cat10',name:'Investice',icon:'📈',color:'#34d399',type:'expense',subs:['ETF','Akcie','Krypto'],healthPct:5,healthAmt:null,isSaving:true},
  ];
  S.birthdays=[{id:'b1',name:'Maminka',day:15,month:5,gift:800,note:'Oblíbené červené víno'},{id:'b2',name:'Táta',day:3,month:8,gift:600,note:''},{id:'b3',name:'Sestra',day:22,month:3,gift:500,note:''}];
  const now=new Date(),y=now.getFullYear(),m=now.getMonth();
  const d=(n,mo=m)=>`${y}-${String(mo+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  const pm=m>0?m-1:11;const py=m>0?y:y-1;
  const pd=(n)=>`${py}-${String(pm+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;
  S.transactions=[
    {id:1,type:'income',name:'Výplata',amt:42000,catId:'cat7',subcat:'Základní plat',date:d(1),note:''},
    {id:2,type:'expense',name:'Albert',amt:2100,catId:'cat1',subcat:'Supermarket',date:d(3),note:''},
    {id:3,type:'expense',name:'Benzín Shell',amt:1400,catId:'cat2',subcat:'Benzín',date:d(5),note:''},
    {id:4,type:'expense',name:'Lidl',amt:1800,catId:'cat1',subcat:'Supermarket',date:d(7),note:''},
    {id:5,type:'expense',name:'Energie záloha',amt:3200,catId:'cat3',subcat:'Energie',date:d(10),note:''},
    {id:6,type:'income',name:'Freelance web',amt:9000,catId:'cat8',subcat:'Freelance',date:d(12),note:''},
    {id:7,type:'expense',name:'YouTube Premium',amt:139,catId:'cat5',subcat:'Streaming',date:d(13),note:''},
    {id:8,type:'expense',name:'Lékárna',amt:620,catId:'cat4',subcat:'Léky',date:d(15),note:''},
    {id:10,type:'income',name:'Výplata',amt:41000,catId:'cat7',subcat:'Základní plat',date:pd(1),note:''},
    {id:11,type:'expense',name:'Nákup Penny',amt:1900,catId:'cat1',subcat:'Supermarket',date:pd(4),note:''},
    {id:12,type:'expense',name:'MHD měsíčník',amt:550,catId:'cat2',subcat:'MHD',date:pd(6),note:''},
    {id:13,type:'expense',name:'Nájem',amt:12000,catId:'cat3',subcat:'Nájem',date:pd(8),note:''},
  ];
  S.debts=[
    {id:'d1',name:'Hypotéka',creditor:'Česká spořitelna',total:2800000,remaining:2350000,interest:4.2,priority:'high',installments:[{from:'2024-01',amt:13500}]},
    {id:'d2',name:'Půjčka od strejdy',creditor:'Strejda Karel',total:60000,remaining:42000,interest:0,priority:'low',installments:[{from:'2024-01',amt:2000}]},
  ];
  S.wishes=[{id:'w1',name:'Dětský zahradní domek',desc:'Dřevěný, cca 120x80 cm',price:8900,priority:'high',done:false}];
  S.bank={startBalance:45000};
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
