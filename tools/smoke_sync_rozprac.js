// smoke_sync_rozprac.js — synchronizace nesmí přepsat rozdělanou práci ani ztratit uložení.
// Falešný Firebase se chová jako skutečný: po každém zápisu pošle „ozvěnu“ a hodnoty
// doručuje jako NOVÉ kopie objektů. Změny „z druhého zařízení“ se posílají stejně.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const app = R('app.js'), helpers = R('helpers.js'), rc = R('receipts.js');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ✅', n)) : (fail++, console.log('  ❌', n)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));

// ── výřez app.js: synchronizace + diff-zápis ─────────────────────────
const a = app.indexOf('let _splitRefs = [];');
const zac = app.indexOf('async function saveToFirebase');
let d = 0, b = app.indexOf('{', zac);
for (let k = b; k < app.length; k++) { if (app[k] === '{') d++; else if (app[k] === '}') { d--; if (!d) { b = k + 1; break; } } }
const vyrez = app.slice(a, b);

// ── falešný Firebase ─────────────────────────────────────────────────
let SERVER = {};                        // users/u1/data
const L = [];                           // {path, ev, cb}
let SETS = 0, UPDATES = 0, RENDERS = 0, SAVES = 0;
let OFFLINE = false, FRONTA = [], SET_ZPOZDENI = 0, UPDATE_CHYBA = false, PING_ZPOZDENI = 0;
const snap = (key, v) => ({ key, exists: () => v !== undefined && v !== null, val: () => clone(v) });
const cesta = p => p.replace(/^users\/u1\/data\/?/, '');
function fire(k) {                      // hodnota sekce k (nebo transakce) se změnila
  L.filter(x => x.ev === 'value' && cesta(x.path) === k).forEach(x => x.cb(snap(k, SERVER[k])));
}
function fireTx(id, pred, po) {
  const ev = po == null ? 'child_removed' : (pred == null ? 'child_added' : 'child_changed');
  L.filter(x => x.ev === ev && cesta(x.path) === 'transactions').forEach(x => x.cb(snap(id, po == null ? pred : po)));
}
function zapis(p, v) {                  // p relativně k data
  const [k, id] = p.split('/');
  if (k === 'transactions' && id) {
    SERVER.transactions = SERVER.transactions || {};
    const pred = clone(SERVER.transactions[id]);
    if (v == null) delete SERVER.transactions[id]; else SERVER.transactions[id] = clone(v);
    fireTx(id, pred, v == null ? null : SERVER.transactions[id]);
  } else {
    if (v == null || (typeof v === 'object' && !Object.keys(v).length)) delete SERVER[k]; else SERVER[k] = clone(v);
    fire(k);
  }
}
const sb = {
  console: { log() {}, warn() {}, error() {} }, Date, Math, Object, JSON, Array, Set, Map, String, Number, Promise,
  isFinite, parseInt, setTimeout, clearTimeout, setInterval, clearInterval,
  navigator: { onLine: true }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: { addEventListener() {}, getElementById: () => null },
  setSyncStatus() {}, saveSnapshot() {}, publishCommunityStats() {},
  sanitizeUserData: x => x, getData: () => vm.runInContext('S', sb),
  ffRenderBezpecne: () => { RENDERS++; }, save: () => { SAVES++; },
  _db: {}, _ref: (db, p) => ({ path: p }),
  _onValue: (r, cb) => {
    if (r.path === '.info/connected') { cb(snap('connected', !OFFLINE)); return cb; }   // stav spojení
    const c = cesta(r.path);
    L.push({ path: r.path, ev: 'value', cb }); cb(snap(c, c === '' ? SERVER : SERVER[c])); return cb;
  },
  _onChildAdded: (r, cb) => { L.push({ path: r.path, ev: 'child_added', cb }); Object.keys(SERVER.transactions || {}).forEach(id => cb(snap(id, SERVER.transactions[id]))); return cb; },
  _onChildChanged: (r, cb) => { L.push({ path: r.path, ev: 'child_changed', cb }); return cb; },
  _onChildRemoved: (r, cb) => { L.push({ path: r.path, ev: 'child_removed', cb }); return cb; },
  _off() {},
  _get: async (r) => { const c = cesta(r.path); return c ? snap(c, SERVER[c]) : snap('', SERVER); },
  _update: (r, upd) => {
    //  jako Firebase: undefined kdekoli = výjimka hned; pravidla (.validate) = odmítnutí serverem
    const maUndef = v => v === undefined || (v && typeof v === 'object' && Object.keys(v).some(k => maUndef(v[k])));
    if (Object.keys(upd).some(k => maUndef(upd[k]))) throw new Error('update failed: values argument contains undefined');
    if (UPDATE_CHYBA) return Promise.reject(new Error('permission_denied'));
    const dlouhy = Object.keys(upd).some(k => k.startsWith('transactions/') && upd[k] && typeof upd[k].name === 'string' && upd[k].name.length >= 300);
    if (dlouhy) return Promise.reject(new Error('PERMISSION_DENIED: validate'));
    UPDATES++; if (/\/shared/.test(r.path)) return Promise.resolve();
    if (OFFLINE) { FRONTA.push(clone(upd)); return new Promise(() => {}); }   // offline: čeká na potvrzení
    Object.keys(upd).forEach(p => zapis(p, upd[p]));
    return Promise.resolve();
  },
  _query: (r) => r, _limitToLast: (n) => n,
  _set: async (r, v) => { if (/syncPing/.test(r.path)) { if (PING_ZPOZDENI) await sleep(PING_ZPOZDENI); return; } SETS++; if (SET_ZPOZDENI) await sleep(SET_ZPOZDENI); if (!/\/data$/.test(r.path)) return; const st = SERVER; SERVER = {}; Object.keys(v || {}).forEach(k => { if (k === 'transactions') Object.keys(v.transactions).forEach(id => zapis('transactions/' + id, v.transactions[id])); else zapis(k, v[k]); }); void st; },
};
sb.window = sb; sb.globalThis = sb; sb.self = sb;
sb.window._currentUser = { uid: 'u1' }; sb.window._onChildAdded = sb._onChildAdded; sb.window._offEv = () => {};
sb.window._query = sb._query; sb.window._limitToLast = sb._limitToLast;
vm.createContext(sb);
vm.runInContext(`let S = {transactions:[],receipts:[],debts:[],wishes:[]}; let viewingUid = null; let _isLocalMode = false;
  let saveTimeout = null; let _dbListener = null; let partnerData = {};`, sb);
vm.runInContext(vyrez, sb);
vm.runInContext('function _hasPartners(){ return false; }', sb);
const run = c => vm.runInContext(c, sb);
const S = () => run('S');
async function pripoj(data) {           // přihlášení: server má data → S z nich → listenery
  SERVER = clone(data); L.length = 0; OFFLINE = false; FRONTA = []; UPDATE_CHYBA = false; SET_ZPOZDENI = 0;
  run(`_dw = { ready:false, metaSig:{}, txSig:null }; _ffJenSnimek = false; _ffZeSnimku = false; _ffPripojeno = null; _ffBylOdpojen = false;
       _ffNutnoSloucit = false; _ffSloucBezi = false; _ffConn = null; _ffNepotvrzeno.meta.clear(); _ffNepotvrzeno.tx.clear();
       if (_ffOpakTimer) { clearTimeout(_ffOpakTimer); _ffOpakTimer = null; }`);
  sb.__init = clone(data);
  run(`S = Object.assign({transactions:[],receipts:[]}, __init); S.transactions = Object.values(S.transactions||{}); S.schemaV = 2;
       _attachOwnListeners({path:'users/u1/data'}, 'u1', __init);`);
  await sleep(200);
}
const uloz = () => Promise.race([run('saveToFirebase()'), sleep(400)]);   // offline zápis nikdy nedoběhne – nečekat věčně
//  Restart appky offline: S a základ ze snímku, nové listenery (server zatím nedostupný).
async function restartZeSnimku(snimek, zaklad) {
  L.length = 0; sb.__sn = clone(snimek); sb.__zk = clone(zaklad);
  run(`_dw = { ready:false, metaSig:{}, txSig:null }; _ffNepotvrzeno.meta.clear(); _ffNepotvrzeno.tx.clear();
       _ffConn = null; _ffPripojeno = null; _ffBylOdpojen = false; _ffNutnoSloucit = false; _ffSloucBezi = false;
       S = __sn; _dw.metaSig = __zk.meta; _dw.txSig = new Map(__zk.tx); _dw.ready = true;
       S.schemaV = 2; _ffZeSnimku = true; _ffNutnoSloucit = true; _ffJenSnimek = true;
       _attachOwnListeners({path:'users/u1/data'}, 'u1', null);`);
  await sleep(200);
}

(async () => {
console.log('smoke_sync_rozprac.js');
const zaklad = {
  schemaV: 2,
  receipts: [{ id: 'r1', store: 'Lidl', items: [{ name: 'ROHLIK', price: 3 }] }, { id: 'r2', store: 'Albert', items: [] }],
  debts: [{ id: 'd1', name: 'Auto', remaining: 1000 }],
  wishes: [{ id: 'w1', name: 'Kolo', savedAmount: 0 }],
  transactions: { t1: { id: 't1', amount: 100, name: 'Nákup' }, t2: { id: 't2', amount: 50, name: 'Pivo' } },
};

// ── 1. ozvěna vlastního uložení ───────────────────────────────────────
await pripoj(zaklad);
ok('po přihlášení jsou podpisy připravené', run('_dw.ready') === true);
let ref = S().receipts[0], pole = S().receipts;
ref.items[0].ean = '859';
RENDERS = 0;
await uloz();
await sleep(200);
ok('ozvěna zápisu NENAHRADÍ objekty (odkaz na účtenku dál platí)', S().receipts[0] === ref && S().receipts === pole);
ok('ozvěna nespustí překreslení přes rozdělanou práci jako „změna odjinud“', RENDERS <= 1);
ref.photoKey = 'u/u1/foto.jpg';         // async akce (nahrání fotky) dopíše do držené účtenky
await uloz();
ok('zápis do drženého odkazu po ozvěně se ULOŽÍ (dřív fotka bez odkazu)', SERVER.receipts[0].photoKey === 'u/u1/foto.jpg');
ok('EAN z předchozího kroku je na serveru', SERVER.receipts[0].items[0].ean === '859');

// ── 2. změna z jiného zařízení: sloučení na místě ─────────────────────
await pripoj(zaklad);
ref = S().receipts[0];
SERVER.receipts = clone(SERVER.receipts); SERVER.receipts[0].store = 'Lidl Ostrava'; SERVER.receipts.push({ id: 'r3', store: 'Billa', items: [] });
fire('receipts'); await sleep(200);
ok('vzdálená změna se převezme', S().receipts[0].store === 'Lidl Ostrava' && S().receipts.length === 3);
ok('…a záznam zůstane STEJNÝM objektem (rozdělaná akce nepíše do prázdna)', S().receipts[0] === ref);

// ── 3. neodeslaná změna se nesmí „vysát“ ──────────────────────────────
await pripoj(zaklad);
S().debts[0].remaining = 900;           // změna bez save() (např. čeká na odpověď AI)
SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 500 }]; fire('wishes'); await sleep(200);
await uloz();
ok('neodeslaná změna dluhu se po synchronizaci jiné sekce ODEŠLE (dřív ztracena)', SERVER.debts[0].remaining === 900);
ok('vzdálená změna cílů dorazila', S().wishes[0].savedAmount === 500);

// ── 4. změna odjinud během čekání na uložení se nezahodí ─────────────
await pripoj(zaklad);
run('saveTimeout = 1;');
SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 700 }]; fire('wishes'); await sleep(200);
run('saveTimeout = null;');
ok('příchozí změna během čekání na uložení se použije (dřív zahozena)', S().wishes[0].savedAmount === 700);

// ── 5. dvě zařízení najednou: tříbodové sloučení účtenek ──────────────
await pripoj(zaklad);
S().receipts.push({ id: 'r9', store: 'Tesco', items: [] });   // tady: nová účtenka (ještě neodeslaná)
S().receipts[1].note = 'moje poznámka';                       // tady: úprava r2
const srv = clone(SERVER.receipts);
srv[0].store = 'Lidl (telefon)';                              // tam: úprava r1
srv[1].store = 'Albert (telefon)';                            // tam: úprava r2 jiné pole
srv.push({ id: 'r7', store: 'Kaufland', items: [] });         // tam: nová účtenka
SERVER.receipts = srv; fire('receipts'); await sleep(200);
const ids = S().receipts.map(x => x.id).sort().join(',');
ok('sloučeno: moje nová i jeho nová účtenka jsou obě tady', ids === 'r1,r2,r7,r9');
ok('jeho úprava r1 převzatá', S().receipts.find(x => x.id === 'r1').store === 'Lidl (telefon)');
ok('úpravy téže účtenky různých polí se spojí', S().receipts.find(x => x.id === 'r2').note === 'moje poznámka' && S().receipts.find(x => x.id === 'r2').store === 'Albert (telefon)');
await uloz();
ok('…a sloučený výsledek odejde na server (nic se nepřepsalo)', SERVER.receipts.map(x => x.id).sort().join(',') === 'r1,r2,r7,r9');

// ── 6. smazání odjinud ────────────────────────────────────────────────
await pripoj(zaklad);
S().debts[0].remaining = 1; // rozpracovaná jiná sekce
SERVER.receipts = clone(SERVER.receipts).filter(x => x.id !== 'r2'); fire('receipts'); await sleep(200);
ok('účtenka smazaná na jiném zařízení zmizí i tady', !S().receipts.some(x => x.id === 'r2'));
await pripoj(zaklad);
S().receipts[1].note = 'upravuju';
SERVER.receipts = clone(SERVER.receipts).filter(x => x.id !== 'r2'); fire('receipts'); await sleep(200);
ok('…ale když ji tady zrovna upravuju, úprava se neztratí', S().receipts.some(x => x.id === 'r2' && x.note === 'upravuju'));

// ── 7. transakce ──────────────────────────────────────────────────────
await pripoj(zaklad);
const t1 = S().transactions.find(x => x.id === 't1');
t1.note = 'tady';
await uloz();
ok('ozvěna transakce nenahradí objekt', S().transactions.find(x => x.id === 't1') === t1);
zapis('transactions/t2', { id: 't2', amount: 55, name: 'Pivo' }); await sleep(200);
ok('změna transakce odjinud se sloučí na místě', S().transactions.find(x => x.id === 't2').amount === 55);
t1.amount = 120;                         // tady rozpracováno
zapis('transactions/t1', { id: 't1', amount: 100, name: 'Nákup', note: 'tady', tag: 'odjinud' }); await sleep(200);
ok('rozpracovaná transakce + změna odjinud = obojí', t1.amount === 120 && t1.tag === 'odjinud');
run('saveTimeout = 1;');
zapis('transactions/t5', { id: 't5', amount: 9 }); await sleep(200);
run('saveTimeout = null;');
ok('nová transakce odjinud během čekání na uložení dorazí (dřív zahozena)', S().transactions.some(x => x.id === 't5'));

// ── 8. obnova zálohy = plný zápis, i když listener mezitím něco pošle ──
await pripoj(zaklad);
SETS = 0;
run(`S = Object.assign({transactions:[{id:'z1',amount:1}],receipts:[]}, {debts:[], wishes:[]}); S.schemaV = 2; _dw.vynutPlny = true;`);
SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 999 }]; fire('wishes'); await sleep(200);
await uloz();
ok('obnova zálohy zapíše celý uzel (_set)', SETS === 1 && run('_dw.vynutPlny') === false);
ok('obnovené transakce na serveru nahradily staré', Object.keys(SERVER.transactions || {}).join(',') === 'z1');

// ── 9. start bez sítě a bez snímku nesmí přepsat cloud ────────────────
SERVER = clone(zaklad); L.length = 0;
run(`_dw = { ready:false, metaSig:{}, txSig:null }; S = {transactions:[],receipts:[],categories:[{id:'c1'}]}; _ffJenSnimek = true;`);
SETS = 0; UPDATES = 0;
await uloz();
ok('prázdná data z offline startu se do cloudu NEZAPÍŠOU', SETS === 0 && UPDATES === 0 && SERVER.receipts.length === 2);
run('_ffJenSnimek = false;');

// ── 9b. offline práce + změny na jiném zařízení → po připojení sloučit, nic nepřepsat ──
await pripoj(zaklad);
run('_ffZmenaPripojeni(false)'); OFFLINE = true;
S().debts[0].remaining = 500;                                        // tady offline
S().receipts[0].note = 'offline poznámka';
run(`S.transactions.push({id:'tOFF', amount: 77, name:'Offline nákup'})`);
await uloz();
ok('offline se sekce nepíšou (jen transakce do fronty)', FRONTA.length === 1 && Object.keys(FRONTA[0]).every(k => k.startsWith('transactions/')));
SERVER.receipts = clone(SERVER.receipts); SERVER.receipts.push({ id: 'r7', store: 'Kaufland (telefon)', items: [] });   // jinde mezitím
SERVER.debts = [{ id: 'd1', name: 'Auto (přejmenováno)', remaining: 1000 }];
OFFLINE = false; FRONTA.forEach(u => Object.keys(u).forEach(p => zapis(p, u[p]))); FRONTA = [];
run('_ffZmenaPripojeni(true)'); await sleep(600); await uloz();
ok('po připojení: offline úprava dluhu zůstala a přejmenování z telefonu taky', SERVER.debts[0].remaining === 500 && SERVER.debts[0].name === 'Auto (přejmenováno)');
ok('po připojení: účtenka z telefonu i moje offline poznámka jsou na serveru', SERVER.receipts.some(x => x.id === 'r7') && SERVER.receipts.find(x => x.id === 'r1').note === 'offline poznámka');
ok('po připojení: offline transakce je na serveru', !!(SERVER.transactions || {}).tOFF);

// ── 9c. offline START ze snímku se základem podpisů ───────────────────
await pripoj(zaklad);
const zakl = run(`({ meta: Object.assign({}, _dw.metaSig), tx: Array.from(_dw.txSig) })`);
const snimek = clone(run('S'));                                      // poslední snímek
snimek.debts[0].remaining = 400;                                     // offline úprava po startu
snimek.transactions.push({ id: 'tSN', amount: 5 });
SERVER.transactions = clone(SERVER.transactions); delete SERVER.transactions.t2;   // jinde smazali t2
SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 300 }];                    // jinde změnili cíl
L.length = 0;
sb.__sn = snimek; sb.__zk = zakl;
run(`_dw = { ready:false, metaSig:{}, txSig:null }; S = __sn; _dw.metaSig = __zk.meta; _dw.txSig = new Map(__zk.tx); _dw.ready = true;
     _ffZeSnimku = true; _ffJenSnimek = true; _ffPripojeno = null;
     _attachOwnListeners({path:'users/u1/data'}, 'u1', null);`);
await sleep(200); run('_ffZmenaPripojeni(true)'); await sleep(600); await uloz();
ok('offline start: úprava ze snímku přežila připojení a odešla', SERVER.debts[0].remaining === 400 && S().debts[0].remaining === 400);
ok('offline start: nová transakce ze snímku odešla', !!SERVER.transactions.tSN);
ok('offline start: změna z jiného zařízení dorazila', S().wishes[0].savedAmount === 300);
ok('offline start: transakce smazaná jinde zmizela i tady (žádný zombie)', !S().transactions.some(x => x.id === 't2') && !SERVER.transactions.t2);

// ── 9d. úprava během dlouhého plného zápisu se neztratí ───────────────
await pripoj(zaklad);
run('_dw.vynutPlny = true;'); SET_ZPOZDENI = 300;
const prubeh = uloz(); await sleep(50);
S().debts[0].remaining = 123;                                        // uživatel mezitím upravil
await prubeh; SET_ZPOZDENI = 0; await uloz();
ok('úprava během plného zápisu (obnova zálohy) se odešle dalším zápisem', SERVER.debts[0].remaining === 123);

// ── 9e. smazání celé sekce typu objekt (poznámky) na jiném zařízení ─────
await pripoj(Object.assign(clone(zaklad), { calNotes: { '2026-10-01': { text: 'Zubař' } } }));
delete SERVER.calNotes; fire('calNotes'); await sleep(200);
ok('poznámky smazané jinde zmizí i tady', Object.keys(S().calNotes || {}).length === 0);
S().debts[0].remaining = 1; await uloz();
ok('…a další uložení je nevrátí na server', !SERVER.calNotes);

// ── 9f. pole bez id (fixedLog) a smíšené účtenky ──────────────────────
await pripoj(Object.assign(clone(zaklad), { fixedLog: [{ m: '2026-08', v: 1 }] }));
run(`S.fixedLog.push({ m: '2026-09', v: 2 })`);                     // tady (neodesláno)
SERVER.fixedLog = [{ m: '2026-08', v: 1 }, { m: '2026-09b', v: 3 }]; fire('fixedLog'); await sleep(200);
await uloz();
ok('fixedLog (bez id): moje i cizí položka zůstanou obě', SERVER.fixedLog.length === 3);
await pripoj(Object.assign(clone(zaklad), { receipts: [{ store: 'Stará bez id', items: [] }, { id: 'r1', store: 'Lidl', items: [] }] }));
S().receipts[1].note = 'tady';
SERVER.receipts = clone(SERVER.receipts); SERVER.receipts.push({ id: 'r7', store: 'Kaufland', items: [] }); fire('receipts'); await sleep(200);
await uloz();
ok('smíšené účtenky (stará bez id): nová z druhého zařízení se neztratí', SERVER.receipts.some(x => x.id === 'r7') && SERVER.receipts.some(x => x.store === 'Stará bez id') && SERVER.receipts.find(x => x.id === 'r1').note === 'tady');

// ── 9g. transakce bez id ze starého schématu ──────────────────────────
await pripoj(zaklad);
const n0 = S().transactions.length;
zapis('transactions/1', { amount: 9 }); zapis('transactions/1', { amount: 10 }); await sleep(200);
ok('transakce bez id nevytváří duplikáty', S().transactions.length === n0);

// ── 9h. odmítnutý zápis se zkusí znovu ────────────────────────────────
await pripoj(zaklad);
S().debts[0].remaining = 42; UPDATE_CHYBA = true;
await uloz(); UPDATE_CHYBA = false; await uloz();
ok('po odmítnutém zápisu se změna pošle znovu (dřív se tvářila jako uložená)', SERVER.debts[0].remaining === 42);

// ── 9i. režim celého uzlu: tady smazaná, ještě neodeslaná transakce se nevrátí ──
{ const chA = sb.window._onChildAdded; sb.window._onChildAdded = undefined;
  await pripoj(zaklad);
  run(`S.transactions = S.transactions.filter(t => t.id !== 't2')`);
  SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 11 }];
  L.filter(x => x.ev === 'value' && cesta(x.path) === '').forEach(x => x.cb(snap('', SERVER)));
  await sleep(200);
  ok('celý-uzel režim: smazaná transakce se nevrátí, cizí změna dorazí', !S().transactions.some(x => x.id === 't2') && S().wishes[0].savedAmount === 11);
  sb.window._onChildAdded = chA; }

// ── 9j. stejná stará účtenka = stejné id na obou zařízeních ───────────
sb.__r = { date: '2026-01-02', store: 'Billa', total: 120, items: [1, 2] };
const id1 = run(`(S = {receipts:[]}, ffIdUctenky(__r))`), id2 = run(`(S = {receipts:[{id:'x'}]}, ffIdUctenky(__r))`);
ok('id staré účtenky je deterministické (dvě zařízení = stejné id)', id1 === id2 && /^rcs/.test(id1));

// ── 9k. offline: nová transakce + další úprava, appka zabitá, restart offline, připojení ──
await pripoj(zaklad);
OFFLINE = true; run('_ffZmenaPripojeni(false)');
run(`S.transactions.push({id:'tX1', amount: 31, name:'Offline'})`); await uloz();
S().debts[0].remaining = 610; await uloz();
let sn = clone(run('S')), zk = run('_ffZakladProSnimek()');
FRONTA = [];                                                         // zabitím appky fronta Firebase zmizí
await restartZeSnimku(sn, zk);
OFFLINE = false; run('_ffZmenaPripojeni(true)'); await sleep(700); await uloz();
ok('restart po offline práci: nová transakce dorazí na server (dřív smazána jako „cizí“)', !!(SERVER.transactions || {}).tX1 && S().transactions.some(x => x.id === 'tX1'));
ok('restart po offline práci: úprava dluhu dorazí na server', SERVER.debts[0].remaining === 610);

// ── 9l. offline smazání, restart, připojení → smazání platí ───────────
await pripoj(zaklad);
OFFLINE = true; run('_ffZmenaPripojeni(false)');
run(`S.transactions = S.transactions.filter(t => t.id !== 't2')`); await uloz();
sn = clone(run('S')); zk = run('_ffZakladProSnimek()'); FRONTA = [];
await restartZeSnimku(sn, zk);
OFFLINE = false; run('_ffZmenaPripojeni(true)'); await sleep(700); await uloz();
ok('offline smazaná transakce se po restartu nevrátí a smaže se i na serveru', !S().transactions.some(x => x.id === 't2') && !(SERVER.transactions || {}).t2);

// ── 9m. okno těsně po připojení: sekce se nezapíše dřív, než se sloučí ──
await pripoj(zaklad);
OFFLINE = true; run('_ffZmenaPripojeni(false)');
S().wishes[0].note = 'moje';                                         // tady offline
SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 0, pozn2: 'z telefonu' }];   // jinde
OFFLINE = false; run('_ffZmenaPripojeni(true)');
await uloz();                                                        // zápis HNED po připojení (čekající debounce)
ok('hned po připojení se sekce nepřepíše (čeká na sloučení)', SERVER.wishes[0].pozn2 === 'z telefonu' && !SERVER.wishes[0].note);
await sleep(700); await uloz();
ok('…po sloučení jsou na serveru obě změny', SERVER.wishes[0].pozn2 === 'z telefonu' && SERVER.wishes[0].note === 'moje');

// ── 9n. jedna vadná hodnota nezastaví ukládání všeho ostatního ─────────
await pripoj(zaklad);
run(`S.transactions.push({id:'tLong', amount: 1, name: 'x'.repeat(400)})`);
S().debts[0].remaining = 77;
S().wishes[0].bad = undefined; S().wishes[0].nan = NaN;
await uloz();
ok('vadná transakce (moc dlouhý název) neblokuje ostatní: dluh uložen', SERVER.debts[0].remaining === 77);
ok('…a transakce se neztratí: název se zkrátí na povolenou délku (pravidla < 300)', SERVER.transactions.tLong && SERVER.transactions.tLong.name.length === 299);
ok('undefined/NaN v datech nezpůsobí pád zápisu', SERVER.wishes && SERVER.wishes[0].name === 'Kolo');
S().debts[0].remaining = 78; await uloz();
ok('další zápisy pokračují (žádné zaseknutí na vadné položce)', SERVER.debts[0].remaining === 78);

// ── 9o. položky účtenky upravené na obou stranách (bez id) ─────────────
await pripoj(Object.assign(clone(zaklad), { receipts: [{ id: 'r1', store: 'Lidl', items: [{ name: 'ROHLIK', price: 3 }, { name: 'MLEKO', price: 20 }] }] }));
S().receipts[0].items[0].ean = '859';                                // tady EAN
const srv2 = clone(SERVER.receipts); srv2[0].items[0].cat = 'Pečivo'; SERVER.receipts = srv2; fire('receipts'); await sleep(200);
ok('stejná položka upravená na obou stranách = jedna položka s oběma změnami', S().receipts[0].items.length === 2 && S().receipts[0].items[0].ean === '859' && S().receipts[0].items[0].cat === 'Pečivo');
await pripoj(Object.assign(clone(zaklad), { importHistory: [{ at: 1, n: 5 }] }));
run(`S.importHistory.unshift({ at: 3, n: 1 })`);
SERVER.importHistory = [{ at: 2, n: 9 }, { at: 1, n: 5 }]; fire('importHistory'); await sleep(200);
ok('historie importů: obě nové položky, nejnovější nahoře', S().importHistory.length === 3 && S().importHistory[S().importHistory.length - 1].at === 1);

// ── 9p. spojení spadne uprostřed slučování → sloučení neplatí, sekce se pořád nepíšou ──
await pripoj(zaklad);
OFFLINE = true; run('_ffZmenaPripojeni(false)');
S().wishes[0].note = 'moje2';
SERVER.wishes = [{ id: 'w1', name: 'Kolo', savedAmount: 0, pozn2: 'telefon2' }];
OFFLINE = false; PING_ZPOZDENI = 300; run('_ffZmenaPripojeni(true)');
await sleep(450); run('_ffZmenaPripojeni(false)');                  // výpadek během bariéry
await sleep(400);
ok('výpadek během slučování: příznak „nutno sloučit“ zůstane', run('_ffNutnoSloucit') === true);
await uloz();
ok('…a sekce se mezitím nezapíše přes cizí změnu', SERVER.wishes[0].pozn2 === 'telefon2' && !SERVER.wishes[0].note);
PING_ZPOZDENI = 0; run('_ffZmenaPripojeni(true)'); await sleep(1500); await uloz();
ok('…po skutečném připojení jsou na serveru obě změny', SERVER.wishes[0].pozn2 === 'telefon2' && SERVER.wishes[0].note === 'moje2');

// ── 9q. pole čísel se slučuje po pozicích ─────────────────────────────
ok('pole čísel: [0,5,0,0] tady + [0,0,0,7] jinde = [0,5,0,7]', JSON.stringify(run(`_ff3([0,0,0,0],[0,5,0,0],[0,0,0,7])`)) === '[0,5,0,7]');
ok('pole textů (štítky): přidané na obou stranách se spojí', JSON.stringify(run(`_ff3(['a'],['a','b'],['a','c'])`).slice().sort()) === '["a","b","c"]');

// ── 10. kanonické porovnání (tvar dat z Firebase) ─────────────────────
ok('pořadí klíčů ani null/prázdná pole nerozhodují', run(`_ffKanonStr({b:1,a:[],c:null,d:{x:2}}) === _ffKanonStr({d:{x:2},b:1})`));
ok('řídké pole z Firebase = totéž pole', run(`_ffKanonStr([{id:1},null,{id:3}]) === _ffKanonStr({0:{id:1},2:{id:3}})`));
ok('skutečný rozdíl se pozná', run(`_ffKanonStr({a:1}) !== _ffKanonStr({a:2})`));

// ── 11. statické pojistky ─────────────────────────────────────────────
const kod = app.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
ok('listener už nedělá S[k] = snap.val()', !/S\[k\]\s*=\s*snap\.val\(\)/.test(kod));
ok('listener už nezahazuje změny při čekání na uložení', !/if\(saveTimeout\) return;/.test(app));
ok('celý-uzel listener už nenahrazuje S', !/S = Object\.assign\(\{transactions:\[\][^;]*\}, fresh\)/.test(app));
ok('_remoteApply přepočítá podpisy jen poprvé', /if\(!_dw\.ready && typeof _dwSeed==='function'\) _dwSeed\(\);/.test(app));
ok('sendBeacon (POST = push smetí) je pryč', !/navigator\.sendBeacon\(/.test(app));
ok('při skrytí appky se čekající zápis odešle hned', /visibilitychange/.test(app) && /pagehide/.test(app));
ok('offline save() už nekončí jen frontou poslední transakce', !/saveTxOffline\(lastTx\)[\s\S]{0,400}?\n    return;\n  \}\n  clearTimeout\(saveTimeout\)/.test(app));
ok('odhlášení odpojí i rozdělené listenery', /resetAppState[\s\S]{0,1500}_splitRefs\.forEach/.test(app));
ok('účtenky dostanou id při uložení', /S\.receipts\|\|\[\]\)\.forEach\(r=>\{ if\(r && typeof r==='object' && \(r\.id==null/.test(app));
ok('editor účtenky ukládá podle id, ne podle pozice', /S\.receipts\.findIndex\(x => x && x\.id === r\.id\)/.test(rc));
ok('…a smazanou účtenku vrátí, nepřepíše cizí ani nezaloží novou', /if\(cil\) Object\.assign\(cil, upr\); else S\.receipts\.push\(upr\);/.test(rc));
ok('snímek nese základ podpisů pro offline start (jen potvrzené zápisy)', /_zaklad: \(typeof _ffZakladProSnimek === 'function'\)/.test(app));
ok('přihlášení podepíše data hned po načtení (žádný plný zápis při startu)', /S\.schemaV === 2 && typeof _dwSeed === 'function'\) _dwSeed\(\);\n    saveSnapshot\(\);/.test(app));
ok('ochrana rozdělané práce existuje (helpers)', /function ffRozpracovano/.test(helpers) && /function ffRenderBezpecne/.test(helpers));
ok('vzdálená změna kreslí přes ochranu', /ffRenderBezpecne\('vzdalene'\)/.test(app));

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail ? 1 : 0);
})().catch(e => { console.error('PÁD TESTU:', e); process.exit(1); });
