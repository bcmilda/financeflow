// FinanceFlow · smoke_presun_mena.js
// FIX-494 (S28, v12.13, Milan) – přesun mezi peněženkami s různou měnou MIMO ➕ Přidat.
//   FIX-176 (v8.59) opravil jen ➕ Přidat → ↔️ Přesun (debts.js). Peněženky → 🔄 Převod
//   a šablony přesunu (ruční použití, auto měsíční, auto jednorázová) psaly do cílové
//   peněženky surové číslo: 2 530 Kč → +2 530 €. Po převodu se navíc zůstatky
//   neukázaly, dokud se stránka nepřepnula (chybělo renderPage).
//   Negativní kontrola: na v12.12 tenhle test padá (EUR peněženka +2530, žádné renderPage).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const PREM = fs.readFileSync(najdi('premium.js', '../js/premium.js'), 'utf8');
const DEBTS = fs.readFileSync(najdi('debts.js', '../js/debts.js'), 'utf8');
const APP = fs.readFileSync(najdi('app.html', '../app.html'), 'utf8');

function pick(src, n, volitelne) {
  let i = src.indexOf('\nfunction ' + n + '(');
  if (i < 0) i = src.indexOf('\nfunction ' + n + ' (');
  if (i < 0) { if (volitelne) return ''; throw new Error('nenalezeno: ' + n); }
  i++;
  let d = 0; const j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
}

let ok = 0, fail = 0;
const t = (nazev, podminka, detail) => { if (podminka) { ok++; console.log('  ✓ ' + nazev); } else { fail++; console.log('  ✗ ' + nazev + (detail ? ' → ' + detail : '')); } };

function prostredi() {
  const el = {};
  const mk = (id, v) => (el[id] = { id, value: v == null ? '' : v, innerHTML: '', textContent: '', style: { display: '' }, options: [] });
  const sb = {
    console, JSON, Object, Array, Set, Map, Math, String, Number, isFinite, parseFloat, parseInt, Promise, setTimeout: () => 0,
    S: { wallets: [
      { id: 'wCZK', name: 'Účet KB', currency: 'CZK', balance: 10000 },
      { id: 'wEUR', name: 'Revolut EUR', currency: 'EUR', balance: 100 },
      { id: 'wHot', name: 'Hotovost', currency: 'CZK', balance: 500 },
    ], transactions: [], sablony: [] },
    _FX_RATES: { EUR: 25.3, USD: 23.1 },
    _n: 0, renders: 0, saves: 0,
    document: { getElementById: id => el[id] || null, querySelector: () => null },
    window: {}, viewingUid: null, Date,
    alert: () => {}, confirm: () => true,
    fmtP: v => String(v), fmtB: v => String(v) + ' Kč',
    showPageByName: () => {},
  };
  sb.uid = () => 'id' + (++sb._n);
  sb.getData = () => sb.S;
  sb.findWallet = (id) => (sb.S.wallets || []).find(w => w.id === id);
  sb.save = () => { sb.saves++; };
  sb.renderPage = () => { sb.renders++; };
  sb.el = el; sb.mk = mk;
  vm.createContext(sb);
  vm.runInContext([
    'const _FX=0;',
    pick(DEBTS, '_walletCur'), pick(DEBTS, '_fxToCzk'),
    pick(PREM, '_txVytvorenoMs'), pick(PREM, '_walletTxPoStavu'), pick(PREM, '_walletTxZnak'), pick(PREM, 'computeWalletBalance'),
    pick(PREM, 'presunPar', true), pick(PREM, '_presunMena', true),
    pick(PREM, 'updatePrevodConv', true), pick(PREM, '_prevodVycisti', true), pick(PREM, '_prevodHotovo', true),
    'let _prevodConvTouched=false;',
    pick(PREM, 'doTransfer'), pick(PREM, 'useSablonaId'), pick(PREM, 'processAutoSablony'),
  ].join('\n'), sb);
  return sb;
}
const bal = (sb, id) => vm.runInContext(`computeWalletBalance('${id}', S)`, sb);
const formular = (sb, from, to, amt, pripsat) => {
  sb.mk('transferFrom', from); sb.mk('transferTo', to); sb.mk('transferAmt', String(amt));
  sb.mk('transferDate', '2026-10-26'); sb.mk('transferNote', ''); sb.mk('transferResult');
  sb.mk('prevodAmtCur'); sb.mk('prevodConvCur'); sb.mk('prevodConvHint'); sb.mk('prevodConvAmt', '');
  sb.mk('prevodConvRow').style.display = 'none';
  if (typeof sb.updatePrevodConv === 'function') vm.runInContext('updatePrevodConv()', sb);
  if (pripsat != null) { sb.el.prevodConvAmt.value = String(pripsat); vm.runInContext('_prevodConvTouched=true', sb); }
};

console.log('── FIX-494 · Peněženky → 🔄 Převod mezi peněženkami ──');
{
  const sb = prostredi();
  formular(sb, 'wCZK', 'wEUR', 2530);
  t('různé měny → pole „Připsat do cílové peněženky" je vidět', sb.el.prevodConvRow.style.display === 'block', sb.el.prevodConvRow.style.display);
  t('předvyplněno kurzem ČNB: 2 530 Kč = 100 €', sb.el.prevodConvAmt.value === '100', sb.el.prevodConvAmt.value);
  vm.runInContext('doTransfer()', sb);
  t('EUR peněženka 100 € + 100 € = 200 € (ne 2 630)', Math.abs(bal(sb, 'wEUR') - 200) < 0.001, bal(sb, 'wEUR'));
  t('Kč účet 10 000 − 2 530 = 7 470', bal(sb, 'wCZK') === 7470, bal(sb, 'wCZK'));
  t('zůstatky se překreslí hned (renderPage po převodu)', sb.renders >= 1, 'renderPage volán ' + sb.renders + '×');
  const [o, i] = sb.S.transactions;
  t('obě strany: transferId, catId transfer, amt = amount', o && i && o.transferId && o.transferId === i.transferId && o.catId === 'transfer' && i.catId === 'transfer' && o.amt === o.amount && i.amt === i.amount);
  t('obě strany nesou hodnotu v Kč (amtCZK 2530)', o && i && o.amtCZK === 2530 && i.amtCZK === 2530, o && [o.amtCZK, i.amtCZK]);
}
{
  const sb = prostredi();
  formular(sb, 'wCZK', 'wEUR', 2530, 99.5);
  vm.runInContext('doTransfer()', sb);
  t('skutečně připsaná částka (99,50 € po poplatku) má přednost před kurzem', Math.abs(bal(sb, 'wEUR') - 199.5) < 0.001, bal(sb, 'wEUR'));
}
{
  const sb = prostredi();
  formular(sb, 'wEUR', 'wCZK', 10);
  t('EUR → Kč: popisek částky = EUR', sb.el.prevodAmtCur.textContent === 'EUR', sb.el.prevodAmtCur.textContent);
  vm.runInContext('doTransfer()', sb);
  t('EUR → Kč: 10 € připíše 253 Kč', bal(sb, 'wCZK') === 10253, bal(sb, 'wCZK'));
  t('EUR → Kč: z EUR odejde 10 €', Math.abs(bal(sb, 'wEUR') - 90) < 0.001, bal(sb, 'wEUR'));
}
{
  const sb = prostredi();
  formular(sb, 'wCZK', 'wHot', 1000);
  t('stejná měna: pole se neukáže', sb.el.prevodConvRow.style.display === 'none', sb.el.prevodConvRow.style.display);
  vm.runInContext('doTransfer()', sb);
  t('stejná měna: 1 000 Kč → 1 000 Kč', bal(sb, 'wHot') === 1500 && bal(sb, 'wCZK') === 9000, [bal(sb, 'wHot'), bal(sb, 'wCZK')]);
}

console.log('── FIX-494 · Šablona přesunu ──');
{
  const sb = prostredi();
  sb.S.sablony = [{ id: 's1', name: 'Spoření EUR', type: 'transfer', amount: 1265, wallet: 'wCZK', walletTo: 'wEUR', freq: 'monthly', den: 1, auto: false }];
  vm.runInContext("useSablonaId('s1')", sb);
  t('ruční použití: 1 265 Kč → +50 € (kurz dne)', Math.abs(bal(sb, 'wEUR') - 150) < 0.001, bal(sb, 'wEUR'));
}
{
  const sb = prostredi();
  const dnes = new Date(), za = new Date(dnes.getFullYear(), dnes.getMonth(), dnes.getDate());
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  sb.S.sablony = [
    { id: 's1', name: 'Měsíční EUR', type: 'transfer', amount: 2530, wallet: 'wCZK', walletTo: 'wEUR', freq: 'monthly', den: dnes.getDate(), auto: true },
    { id: 's2', name: 'Jednorázově EUR', type: 'transfer', amount: 253, wallet: 'wCZK', walletTo: 'wEUR', freq: 'once', onceDate: iso(za), auto: true },
  ];
  vm.runInContext('processAutoSablony()', sb);
  t('auto měsíční + jednorázová: +100 € +10 € = 210 €', Math.abs(bal(sb, 'wEUR') - 210) < 0.001, bal(sb, 'wEUR'));
  const pary = sb.S.transactions.filter(x => x.type === 'income');
  t('auto přesuny mají transferId a catId transfer', pary.length === 2 && pary.every(x => x.transferId && x.catId === 'transfer'));
  vm.runInContext('processAutoSablony()', sb);
  t('druhé spuštění nic nepřidá (idempotence)', sb.S.transactions.length === 4, sb.S.transactions.length);
}

console.log('── Tvar zápisu = ➕ Přidat → Přesun (debts.js, SKILL 99) ──');
{
  const sb = prostredi();
  if (typeof sb.presunPar === 'function') {
    const [o] = vm.runInContext("presunPar({from:'wCZK',to:'wEUR',amt:100,date:'2026-10-26',name:'x',note:'y'})", sb);
    const m = /const txOut=\{([^}]*)\}/.exec(DEBTS);
    const klice = m ? m[1].split(',').map(s => s.split(':')[0].trim()).filter(k => !['payType', 'projectId'].includes(k)) : [];
    const chybi = klice.filter(k => !(k in o));
    t('presunPar má všechna pole, která zapisuje saveTx v debts.js', klice.length > 8 && !chybi.length, chybi.join(', '));
  } else t('presunPar existuje', false, 'chybí v premium.js');
}

console.log('── UI (app.html) ──');
t('Peněženky → Převod má pole „Připsat do cílové peněženky"', /id="prevodConvAmt"/.test(APP) && /id="prevodConvRow"/.test(APP));
t('výběr peněženky a částka přepočítávají pole', /id="transferFrom"[^>]*updatePrevodConv/.test(APP) && /id="transferAmt"[^>]*updatePrevodConv/.test(APP));
t('šablona přesunu ukazuje poznámku o kurzu dne', /id="sablonaPresunInfo"/.test(APP) && /id="sablonaWalletTo"[^>]*sablonaPresunInfo/.test(APP));
t('výběr peněženek přežije překreslení (renderTransferDropdowns)', /FIX-494: překreslení \(i ze synchronizace\)/.test(PREM));

console.log(`\n${ok} ✓  ${fail} ✗`);
process.exit(fail ? 1 : 0);
