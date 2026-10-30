// FinanceFlow · smoke_inbox_kb.js
// S28 (v12.15, Milan, screenshot oznámení KB+ 27. 10.):
//   FIX-496 · „💰 Příchozí platba 200,00 Kč na účet 43-…“ se četla jako VÝDAJ – pravidlo George
//            „Platba X Kč“ chytilo slovo „platba“ uvnitř „Příchozí platba“ a stálo před pravidlem příjmu.
//            Proto Doručené nabízely jen výdajové kategorie.
//   Vlastní účet podle směru: příjem = „na účet“, výdaj = „z účtu“ (dřív u příjmu protiúčet).
//   Protiúčet → kategorie + název (Milan: „podle čísla účtu vím: převod mezi účty, nebo plyn“).
//   Typ platby: kartou → Platební karta, z účtu na účet → Bankovní převod, výběr → přesun do Hotovosti.
//   Negativní kontrola: na v12.14 test padá.
const vm = require('vm'), fs = require('fs'), path = require('path');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
const sms = R('sms-import.js', '../js/sms-import.js'), ib = R('inbox.js', '../js/inbox.js');
let ok = 0, bad = 0;
const t = (n, c, i) => { if (c) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (i === undefined ? '' : ' → ' + JSON.stringify(i).slice(0, 300))); } };

const S = {
  categories: [
    { id: 'cat1', name: 'Jídlo', type: 'expense' }, { id: 'cat3', name: 'Bydlení', icon: '🏠', type: 'expense' },
    { id: 'cat7', name: 'Výplata', icon: '💰', type: 'income' }, { id: 'cat13', name: 'Cashback', icon: '💸', type: 'income' },
    { id: 'cat_t_invest', name: 'Investice', type: 'transfer' },
  ],
  wallets: [{ id: 'wKB', name: 'Účet KB', type: 'account' }, { id: 'wSpor', name: 'Spořák', type: 'savings' },
            { id: 'wKred', name: 'Kreditka', type: 'card' }, { id: 'wHot', name: 'Hotovost', type: 'cash' }],
  receipts: [], transactions: [], uiCfg: {},
};
const els = {};
const c = { S, console, Date, Math, JSON, Object, String, Number, parseFloat, Promise, getData: () => S, getWallets: () => S.wallets,
  getPayTypes: () => [{ id: 'cash', name: 'Hotovost' }, { id: 'card', name: 'Platební karta' }, { id: 'transfer', name: 'Bankovní převod' }],
  save() {}, showToast() {}, genTxId: () => 'n' + (++c.n), n: 0, alert(m) { c.alerted = m }, confirm: () => true,
  document: { getElementById: id => els[id] || null }, fetch: async () => ({ ok: true, status: 200, json: async () => null }),
  window: { _currentUser: { uid: 'U1', getIdToken: async () => 'tok' } }, dupUctenkaPro: () => null };
vm.createContext(c);
vm.runInContext(sms.replace(/^function renderSmsImport[\s\S]*$/m, '') + '\n' + ib + '\n;this._setIb=v=>{_inbox=v};this._ib=()=>_inbox;', c);

const T = Date.parse('2026-10-26T18:00:00');
const KB = { app: 'KB+', pkg: 'cz.kb.mobilnibanka' };
const prich = Object.assign({}, KB, { title: '💰 Příchozí platba', text: '200,00 Kč na účet 43-1062300257/0100 z účtu 1234567890/0800.', postedAt: T });
const prichKratka = Object.assign({}, KB, { title: '💰 Příchozí platba', text: '200,00 Kč na účet 43-1062300257/0100.', postedAt: T + 1 });
const odch = Object.assign({}, KB, { title: '💸 Odchozí platba', text: '1 200,00 Kč z účtu 43-1062300257/0100 na účet 27-4908440207/0100.', postedAt: T + 2 });
const plyn = Object.assign({}, KB, { title: '💸 Odchozí platba', text: '940,00 Kč z účtu 43-1062300257/0100 na účet 35-4567890/0100.', postedAt: T + 3 });
const karta = Object.assign({}, KB, { title: 'Platba kartou', text: '59,00 Kč  u obchodníka POTRAVINY GOCZOL, 💳 VISA Classic 4779 75** **** 2267.', postedAt: T + 4 });
const vyber = Object.assign({}, KB, { title: 'Výběr z bankomatu', text: '2 000,00 Kč z karty 4779 75** **** 2267.', postedAt: T + 5 });

console.log('── FIX-496 · příchozí a odchozí platba KB+ ──');
const pp = c.inboxRozpoznej(prich), pk = c.inboxRozpoznej(prichKratka), po = c.inboxRozpoznej(odch), pc = c.inboxRozpoznej(karta);
t('💰 Příchozí platba 200,00 Kč = PŘÍJEM 200', pp && pp.type === 'income' && pp.amount === 200, pp);
t('příchozí bez protiúčtu = příjem', pk && pk.type === 'income' && pk.amount === 200, pk);
t('💸 Odchozí platba 1 200,00 Kč = výdaj 1200', po && po.type === 'expense' && po.amount === 1200, po);
t('Platba kartou 59,00 Kč = výdaj 59, obchodník POTRAVINY GOCZOL', pc && pc.type === 'expense' && pc.amount === 59 && pc.merchant === 'POTRAVINY GOCZOL', pc);
t('název příchozí: „Platba z účtu 1234567890/0800“', pp && pp.merchant === 'Platba z účtu 1234567890/0800', pp && pp.merchant);
t('název příchozí bez protiúčtu: „Příchozí platba“', pk && pk.merchant === 'Příchozí platba', pk && pk.merchant);
t('název odchozí: „Převod na účet 27-4908440207/0100“', po && po.merchant === 'Převod na účet 27-4908440207/0100', po && po.merchant);
const gIn = c.parseBankNotification('George: Příchozí platba 5 000 Kč od Jan Novák | Zůstatek 12 000 Kč');
t('George „Příchozí platba … od …“ = příjem (dřív ho pravidlo „Platba“ četlo jako výdaj)', gIn && gIn.type === 'income' && gIn.amount === 5000, gIn);
const kbAl = c.parseBankNotification('KB Alert: Příchozí platba 50 000 Kč od Zaměstnavatel');
t('KB Alert „Příchozí platba“ = příjem', kbAl && kbAl.type === 'income' && kbAl.amount === 50000, kbAl);
const gOut = c.parseBankNotification('George: Platba kartou 450 Kč SHELL | Zůstatek 1 000 Kč');
t('George platba kartou dál výdaj', gOut && gOut.type === 'expense' && gOut.amount === 450, gOut);

console.log('── vlastní účet podle směru, protiúčet ──');
t('příjem: vlastní účet = „na účet“ 43-…/0100 (ne protiúčet)', c.inboxIdent(prich) === 'ucet:43-1062300257/0100', c.inboxIdent(prich));
t('výdaj: vlastní účet = „z účtu“ 43-…/0100', c.inboxIdent(odch) === 'ucet:43-1062300257/0100', c.inboxIdent(odch));
t('karta má přednost před účtem', c.inboxIdent(karta) === 'karta:2267', c.inboxIdent(karta));
t('protiúčet příjmu = „z účtu“ 1234567890/0800', c.inboxProtiucet(prich, pp) === 'ucet:1234567890/0800', c.inboxProtiucet(prich, pp));

console.log('── typ platby, výběr z bankomatu ──');
t('platba kartou → Platební karta', typeof c.inboxTypPlatby === 'function' && c.inboxTypPlatby(karta, pc) === 'card');
t('z účtu na účet → Bankovní převod', typeof c.inboxTypPlatby === 'function' && c.inboxTypPlatby(odch, po) === 'transfer' && c.inboxTypPlatby(prich, pp) === 'transfer');
const pv = c.inboxRozpoznej(vyber);
t('výběr z bankomatu rozpoznán (2 000 Kč, výběr)', pv && pv.amount === 2000 && pv.vyber === true, pv);
t('výběr → bez typu platby (je to přesun)', typeof c.inboxTypPlatby === 'function' && c.inboxTypPlatby(vyber, pv) === '');

(async () => {
  console.log('── zapamatování: protiúčet → kategorie a název ──');
  c._setIb({ a: Object.assign({}, plyn) });
  els.ib_cat_a = { value: 'cat3' }; els.ib_wal_a = { value: 'wKB' }; els.ib_name_a = { value: 'Plyn innogy' }; els.ib_pay_a = { value: 'transfer' };
  await c.inboxPrijmout('a');
  const tx = S.transactions.at(-1);
  t('transakce: Bydlení, Plyn innogy, Účet KB, Bankovní převod', tx && tx.catId === 'cat3' && tx.name === 'Plyn innogy' && tx.wallet === 'wKB' && tx.payType === 'transfer', tx);
  const pam = (S.uiCfg.inboxProtiucty || {})['ucet:35-4567890/0100'];
  t('zapamatováno: účet 35-4567890/0100 → Bydlení + „Plyn innogy“', pam && pam.catId === 'cat3' && pam.nazev === 'Plyn innogy', S.uiCfg);
  t('vlastní účet 43-…/0100 → Účet KB', (S.uiCfg.inboxPenezenky || {})['ucet:43-1062300257/0100'] === 'wKB', S.uiCfg.inboxPenezenky);
  const dalsi = Object.assign({}, plyn, { text: '1 010,00 Kč z účtu 43-1062300257/0100 na účet 35-4567890/0100.', postedAt: T + 9e6 });
  const nav = typeof c.inboxNavrh === 'function' ? c.inboxNavrh(dalsi, c.inboxRozpoznej(dalsi)) : null;
  t('další platba na stejný účet: návrh Bydlení + Plyn innogy + Účet KB + převod', nav && nav.catId === 'cat3' && nav.nazev === 'Plyn innogy' && nav.wallet === 'wKB' && nav.pay === 'transfer', nav);

  console.log('── zapamatování: převod mezi vlastními účty ──');
  c._setIb({ b: Object.assign({}, odch) });
  els.ib_cat_b = { value: 'presun:wSpor' }; els.ib_wal_b = { value: 'wKB' }; els.ib_name_b = { value: '' }; els.ib_pay_b = { value: 'transfer' };
  await c.inboxPrijmout('b');
  t('účet 27-…/0100 zapamatován jako vlastní (Spořák)', (S.uiCfg.inboxPenezenky || {})['ucet:27-4908440207/0100'] === 'wSpor', S.uiCfg.inboxPenezenky);
  const nav2 = c.inboxNavrh(Object.assign({}, odch, { postedAt: T + 9e7 }), po);
  t('příště: návrh ↔️ přesun na Spořák', nav2 && nav2.catId === 'presun:wSpor' && nav2.wallet === 'wKB', nav2);

  console.log('── výběr z bankomatu = přesun do Hotovosti ──');
  const nav3 = c.inboxNavrh(vyber, pv);
  t('návrh: ↔️ přesun do peněženky Hotovost', nav3 && nav3.catId === 'presun:wHot', nav3);

  console.log('── přehled zapamatovaných ──');
  t('seznam zapamatovaných (karta, účty, protiúčty)', typeof c.inboxZapamatovane === 'function' && c.inboxZapamatovane().length >= 3, typeof c.inboxZapamatovane === 'function' ? c.inboxZapamatovane() : 'chybí');
  if (typeof c.inboxZapomen === 'function') {
    c.inboxZapomen('protiucet', 'ucet:35-4567890/0100');
    t('✕ zapomene protiúčet', !(S.uiCfg.inboxProtiucty || {})['ucet:35-4567890/0100']);
  } else t('inboxZapomen existuje', false);

  console.log(`\n${ok} ✓  ${bad} ✗`);
  process.exit(bad ? 1 : 0);
})();
