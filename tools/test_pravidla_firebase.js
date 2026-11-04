// FinanceFlow · test_pravidla_firebase.js
// S28 (audit body 17 a 18, 1. 11. 2026): test pravidel Firebase RTDB offline přes targaryen
// (vyhodnocuje pravidla stejně jako Firebase: .write se dědí dolů, .validate se při mazání nespouští).
// Spustit před KAŽDÝM nasazením pravidel:
//   npm i --no-save targaryen && node tools/test_pravidla_firebase.js database.rules.json
// Režim „puvodni“ ověří, že útoky na pravidlech z v11.89 opravdu procházely (důkaz, že test díru zachytí).
// Není to smoke_*.js – potřebuje targaryen, který appka nemá v závislostech.
// Každý případ: [popis, funkce(db) → result, očekáváno na původních, očekáváno na opravených]
// Oprava 2 (1. 11. večer): AI čítač mimo users/, smazání účtu jen s náhrobkem, trial jen s trialsUsed,
//   kliky a štítky jen +1, katalog jen známá pole.
'use strict';
const fs = require('fs');
const targaryen = require('targaryen');

const soubor = process.argv[2] || require('path').join(__dirname, '..', 'database.rules.json'), rezim = process.argv[3] || 'opravena';
const text = fs.readFileSync(soubor, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const rules = JSON.parse(text);

const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);
const DEN = 86400000;
const ADMIN = { uid: 'LNEC8VNB2QPwIv6WWQ9lqgR4O5v1', provider: 'google', token: { email: 'admin@financeflow.cz' } };
const U1 = { uid: 'u1', provider: 'google', token: { email: 'Jan.Novak@gmail.com' } };
const U2 = { uid: 'u2', provider: 'google', token: { email: 'jan.novak@gmail.com' } };   // nový účet se stejným e-mailem
const ATT = { uid: 'utocnik', provider: 'password', token: { email: 'zly@example.com' } };
const PHONE = { uid: 'telefon1', provider: 'anonymous', token: {} };
const PARTNER = { uid: 'partner1', provider: 'google', token: { email: 'p@x.cz' } };

const DATA = {
  users: {
    u1: {
      premium: { type: 'free', createdAt: NOW - 100 * DEN },
      data: { transactions: { t1: { name: 'Lidl', amount: 100 } } },
      invites: { tok123: true },
      aiUsage: { '2026-11': { chat: 3 } },
      inbox: { n1: { text: 'Platba 100 Kč', postedAt: NOW - DEN, dev: 'telefon1' } },
    },
    obet: { premium: { type: 'premium', premiumUntil: NOW + 30 * DEN } },
  },
  inboxLinks: { telefon1: { uid: 'u1', code: 'KOD12345' } },
  inboxPairing: { KOD12345: { devUid: 'telefon1', created: NOW - 60000 } },
  community: {
    itemTags: { rohlik: { pecivo: 12 } },
    itemTagVotes: { rohlik: { obet: 'pecivo' } },
    suggestionVotes: { lidl: { obet: { chosenId: 'cat1', at: NOW - DEN } } },
    suggestionOverrides: { k1: { x: 1 } },
    '2026-11': { aggregate: { k: 5 } },
  },
  support: { s1: { email: 'a@b.cz', message: 'Pomoc', date: '2026-10-30' } },
  catalog: { mleko: { name: 'Mléko' }, prices: { mleko: { r1: { price: 21.9, date: '2026-10-01', store: 'Lidl' } } }, items: { mleko: { name: 'Mléko' } } },
  referrals: { OBETCODE: { uid: 'obet', createdAt: NOW - 50 * DEN } },
  referral_clicks: { c1: { ref: 'OBETCODE', at: NOW - DEN } },
  coicop_corrections: { obet: { x: { coicop: 1 } } },
  receipt_reports: { obet: { r1: { date: '2026-10-01', store: 'Lidl', printedTotal: 100, itemsSum: 99 } } },
  push_subs: { obet_abc: { uid: 'obet', endpoint: 'https://push.example/abc' } },
};

const db0 = targaryen.database(rules, DATA, NOW);
const W = (auth, path, val, db) => (db || db0).as(auth).write(path, val, undefined, NOW);
const UPD = (auth, path, patch, db) => (db || db0).as(auth).update(path, patch, NOW);
const withData = (path, val) => db0.as(ADMIN).write(path, val, undefined, NOW).newDatabase;

// db, kde u1 už trial vyčerpal
const dbTrialUsed = withData('users/u1/premium', { type: 'free', trialUsed: true, trialUntil: NOW - 5 * DEN, createdAt: NOW - 100 * DEN });
// db, kde u1 smazal účet (náhrobek) a appka mu znovu založila premium free
const dbNahrobek = withData('deletedAccounts/u1', { at: NOW - DEN, melPredplatne: false });
// db, kde e-mail už trial měl (starý účet)
const dbEmail = withData('trialsUsed/jan_novak@gmail_com', { uid: 'stary', at: NOW - 200 * DEN });
const dbEmailU2 = (() => { let d = withData('trialsUsed/jan_novak@gmail_com', { uid: 'stary', at: NOW - 200 * DEN }); return d.as(ADMIN).write('users/u2/premium', { type: 'free', createdAt: NOW }, undefined, NOW).newDatabase; })();

const T = [
  // ── BOD 17: útoky cizího uživatele na sdílená data ──
  ['17 útok: smazat celé community/itemTags', () => W(ATT, 'community/itemTags', null), true, false],
  ['17 útok: smazat celé community/suggestionOverrides', () => W(ATT, 'community/suggestionOverrides', null), true, false],
  ['17 útok: smazat celou podporu (support)', () => W(ATT, 'support', null), true, false],
  ['17 útok: přepsat cizí zprávu podpory', () => W(ATT, 'support/s1', { email: 'x@x.cz', message: 'smazáno', date: '2026-11-01' }), true, false],
  ['17 útok: smazat celý catalog', () => W(ATT, 'catalog', null), true, false],
  ['17 útok: smazat catalog/prices', () => W(ATT, 'catalog/prices', null), true, false],
  ['17 útok: smazat catalog/items', () => W(ATT, 'catalog/items', null), true, false],
  ['17 útok: převzít cizí doporučovací kód', () => W(ATT, 'referrals/OBETCODE', { uid: 'utocnik', createdAt: NOW }), true, false],
  ['17 útok: smazat cizí doporučovací kód', () => W(ATT, 'referrals/OBETCODE', null), true, false],
  ['17 útok: smazat všechny doporučovací kódy', () => W(ATT, 'referrals', null), true, false],
  ['17 útok: smazat referral_clicks', () => W(ATT, 'referral_clicks', null), true, false],
  ['17 útok: smazat coicop_corrections', () => W(ATT, 'coicop_corrections', null), true, false],
  ['17 útok: smazat receipt_reports', () => W(ATT, 'receipt_reports', null), true, false],
  ['17 útok: smazat cizí push odběr', () => W(ATT, 'push_subs/obet_abc', null), true, false],
  ['17 útok: smazat jeden štítek komunity', () => W(ATT, 'community/itemTags/rohlik/pecivo', null), true, false],

  // ── BOD 17: běžné zápisy aplikace musí dál fungovat ──
  ['17 appka: nová zpráva podpory', () => W(U1, 'support/fb_' + NOW, { email: 'jan@x.cz', message: 'Ahoj', date: '2026-11-01' }), true, true],
  ['17 appka: žádost o odměnu (support/redeem_…)', () => W(U1, 'support/redeem_u1_' + NOW, { email: 'jan@x.cz', message: 'redeem', date: '2026-11-01' }), true, true],
  //  Oprava 3 (1. 11. večer, Milan: „+1 na položku u uživatele, hlasy se sčítají komunitně“)
  ['17 appka: hlas štítku (1 uživatel = 1 hlas, receipts.js)', () => W(U1, 'community/itemTagVotes/rohlik/u1', 'pecivo'), false, true],
  ['17 appka: změna vlastního štítku hlas přepíše', () => W(U1, 'community/itemTagVotes/rohlik/u1', 'svacina', W(U1, 'community/itemTagVotes/rohlik/u1', 'pecivo').newDatabase), false, true],
  ['17 appka: hlas návrhu kategorie (import.js)', () => W(U1, 'community/suggestionVotes/lidl/u1', { chosenId: 'cat1', chosen: 'Jídlo', suggested: 'Ostatní', at: NOW }), false, true],
  ['17 útok: hlasovat za cizího uživatele (štítek)', () => W(ATT, 'community/itemTagVotes/rohlik/u1', 'alkohol'), false, false],
  ['17 útok: smazat cizí hlas štítku', () => W(ATT, 'community/itemTagVotes/rohlik/obet', null), false, false],
  ['17 útok: smazat všechny hlasy štítků', () => W(ATT, 'community/itemTagVotes', null), false, false],
  ['17 útok: přepsat cizí hlas návrhu kategorie', () => W(ATT, 'community/suggestionVotes/lidl/obet', { chosenId: 'cat9', at: NOW }), false, false],
  ['17 útok: dlouhý/neplatný štítek', () => W(U1, 'community/itemTagVotes/rohlik/u1', '<script>alert(1)</script>'), false, false],
  ['17 útok: zvýšit starý počet štítku', () => W(ATT, 'community/itemTags/rohlik/pecivo', 13), true, false],
  ['17 útok: přepsat starý souhrn návrhů', () => W(ATT, 'community/suggestionOverrides/k2', { x: 2 }), true, false],
  ['17 appka: admin smaže hlasy štítků', () => W(ADMIN, 'community/itemTagVotes', null), false, true],
  ['17 appka: vlastní doporučovací kód', () => W(U1, 'referrals/JANCODE', { uid: 'u1', createdAt: NOW }), true, true],
  ['17 appka: konverze u vlastního kódu', () => W(U1, 'referrals/JANCODE/conversions/k1', { points: 5, type: 'manual', confirmed: true, addedAt: '2026-11-01' }, W(U1, 'referrals/JANCODE', { uid: 'u1', createdAt: NOW }).newDatabase), true, true],
  ['17 appka: klik na doporučení', () => W(U1, 'referral_clicks/c2', { ref: 'OBETCODE', at: NOW }), true, true],
  ['17 appka: vlastní push odběr – přidat', () => W(U1, 'push_subs/u1_abc', { uid: 'u1', endpoint: 'https://push.example/u1' }), true, true],
  ['17 appka: vlastní push odběr – odebrat', () => W(U1, 'push_subs/u1_abc', null, W(U1, 'push_subs/u1_abc', { uid: 'u1', endpoint: 'https://push.example/u1' }).newDatabase), true, true],
  //  Kontrola záplaty (1. 11.): zápisy, které první verze záplaty rozbila
  ['17 appka: klik na cizí odkaz (clicks + referral_clicks naráz, share.js)', () => UPD(U1, '/', { 'referrals/OBETCODE/clicks': 1, 'referral_clicks/1_abcd': { refCode: 'OBETCODE', date: '2026-11-01', converted: false } }), true, true],
  ['17 appka: konverze nového uživatele u cizího kódu', () => W(U1, 'referrals/OBETCODE/conversions/u1', { points: 5, type: 'signup', confirmed: false, addedAt: '2026-11-01' }), true, true],
  ['17 appka: potvrzení vlastní konverze (confirmed)', () => UPD(U1, 'referrals/OBETCODE/conversions/u1', { confirmed: true, confirmedAt: '2026-11-14' },
      W(U1, 'referrals/OBETCODE/conversions/u1', { points: 5, type: 'signup', confirmed: false, addedAt: '2026-11-01' }).newDatabase), true, true],
  ['17 appka: druhá cena téhož výrobku týž den (vlastní záznam)', () => UPD(U1, '/', { 'catalog/prices/mleko/20261101_u1': { price: 22.9, date: '2026-11-01', store: 'Albert', uid: 'u1' }, 'catalog/items/mleko/latestPrice': 22.9, 'catalog/items/mleko/name': 'Mléko' },
      W(U1, 'catalog/prices/mleko/20261101_u1', { price: 21.9, date: '2026-11-01', store: 'Lidl', uid: 'u1' }).newDatabase), true, true],
  ['17 appka: admin smaže všechny item tagy', () => W(ADMIN, 'community/itemTags', null), true, true],
  ['17 útok: zapsat konverzi za někoho jiného', () => W(ATT, 'referrals/OBETCODE/conversions/u1', { points: 999, type: 'signup', confirmed: true }), true, false],
  ['17 útok: smazat cizí konverze', () => W(ATT, 'referrals/OBETCODE/conversions', null), true, false],
  ['17 útok: přepsat vlastníka kódu přes uid', () => W(ATT, 'referrals/OBETCODE/uid', 'utocnik'), true, false],
  ['17 útok: přepsat cizí záznam ceny', () => W(ATT, 'catalog/prices/mleko/r1', { price: 1, date: '2026-11-01', store: 'X', uid: 'utocnik' }), true, false],
  ['17 útok: zapsat cenu za cizí uid', () => W(ATT, 'catalog/prices/mleko/20261101_utocnik', { price: 1, date: '2026-11-01', store: 'X', uid: 'obet' }), true, false],
  //  Oprava 2 (1. 11. večer): kliky a štítky jen +1, katalog jen známá pole s rozumnou hodnotou
  ['17 appka: další klik na kód (5 → 6)', () => W(U1, 'referrals/OBETCODE/clicks', 6, withData('referrals/OBETCODE/clicks', 5)), true, true],
  ['17 útok: nastavit cizímu kódu 999 kliků', () => W(ATT, 'referrals/OBETCODE/clicks', 999, withData('referrals/OBETCODE/clicks', 5)), true, false],
  ['17 útok: nastavit štítek na 999 999', () => W(ATT, 'community/itemTags/rohlik/pecivo', 999999), true, false],
  ['17 útok: vynulovat štítek (0)', () => W(ATT, 'community/itemTags/rohlik/pecivo', 0), true, false],
  ['17 útok: cena výrobku v katalogu 0 Kč', () => W(ATT, 'catalog/items/mleko/latestPrice', 0), true, false],
  ['17 útok: cizí pole do výrobku v katalogu', () => W(ATT, 'catalog/items/mleko/reklama', 'kup u nás'), true, false],
  ['17 útok: nesmyslné datum ceny', () => W(ATT, 'catalog/items/mleko/latestDate', 'zítra'), true, false],
  ['17 appka: nový výrobek s cenou (nakup.js)', () => UPD(U1, '/', { 'catalog/items/rohlik/name': 'Rohlík', 'catalog/items/rohlik/latestPrice': 3.9, 'catalog/items/rohlik/latestDate': '2026-11-01', 'catalog/items/rohlik/latestStore': 'Lidl' }), true, true],
  ['17 appka: hlášení účtenky', () => W(U1, 'receipt_reports/u1/' + NOW, { date: '2026-11-01', store: 'Lidl', printedTotal: 100, itemsSum: 98 }), true, true],
  ['17 appka: oprava COICOP', () => W(U1, 'coicop_corrections/u1/x', { coicop: 1 }), true, true],

  // ── BOD 18: zkušební Premium ──
  ['18 útok: prodloužit vyčerpaný trial (trialUntil)', () => UPD(U1, 'users/u1/premium', { type: 'trial', trialUntil: NOW + 30 * DEN }, dbTrialUsed), true, false],
  ['18 útok: smazat trialUsed', () => W(U1, 'users/u1/premium/trialUsed', null, dbTrialUsed), true, false],
  ['18 útok: smazat celé premium', () => W(U1, 'users/u1/premium', null, dbTrialUsed), true, false],
  ['18 útok: přepsat premium na nový trial', () => W(U1, 'users/u1/premium', { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true, createdAt: NOW }, dbTrialUsed), true, false],
  ['18 útok: obejít přes users/u1 (update premium)', () => UPD(U1, 'users/u1', { premium: { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true } }, dbTrialUsed), true, false],
  ['18 útok: trial bez příznaku trialUsed (opakovatelný)', () => W(U1, 'users/u1/premium', { type: 'trial', trialUntil: NOW + 30 * DEN }), true, false],
  ['18 útok: trial znovu po smazání účtu (náhrobek)', () => W(U1, 'users/u1/premium', { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true, createdAt: NOW }, dbNahrobek), true, false],
  ['18 útok: nový účet se stejným e-mailem → trial znovu', () => W(U2, 'users/u2/premium', { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true, createdAt: NOW }, dbEmailU2), true, false],
  ['18 útok: dát si placené Premium', () => W(U1, 'users/u1/premium', { type: 'premium', premiumUntil: NOW + 365 * DEN }), false, false],
  ['18 útok: cizí uživatel mění premium oběti', () => W(ATT, 'users/obet/premium', { type: 'free' }), false, false],

  // ── BOD 18: běžné zápisy aplikace ──
  ['18 appka: nový uživatel dostane free', () => W(U1, 'users/u1/premium', { type: 'free', createdAt: NOW }, withData('users/u1/premium', null)), true, true],
  ['18 appka: aktivace trialu poprvé (premium + trialsUsed jedním zápisem)', () => UPD(U1, '/', { 'users/u1/premium': { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true, createdAt: NOW - 100 * DEN }, 'trialsUsed/jan_novak@gmail_com': { uid: 'u1', at: NOW } }), true, true],
  ['18 útok: trial z konzole bez záznamu trialsUsed', () => W(U1, 'users/u1/premium', { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true, createdAt: NOW - 100 * DEN }), true, false],
  ['18 útok: smazat celý svůj uzel bez náhrobku (pak trial znovu)', () => W(U1, 'users/u1', null, dbTrialUsed), true, false],
  ['18 útok: zablokovat trial cizímu e-mailu (trialsUsed)', () => W(ATT, 'trialsUsed/jan_novak@gmail_com', { uid: 'utocnik', at: NOW }), true, false],
  ['18 útok: vynulovat si AI limit (smazat users/u1/aiUsage)', () => W(U1, 'users/u1/aiUsage', null), true, false],
  ['18 útok: přepsat si nový čítač AI (aiUsage/u1)', () => W(U1, 'aiUsage/u1/2026-11', { chat: 0 }), false, false],
  ['18 appka: přečíst vlastní čítač AI (aiUsage/u1)', () => db0.as(U1).read('aiUsage/u1/2026-11', NOW), false, true],
  ['18 útok: přečíst cizí čítač AI', () => db0.as(ATT).read('aiUsage/u1/2026-11', NOW), false, false],
  ['18 appka: aktivace trialu, e-mail má trialsUsed se stejným uid', () => W(U2, 'users/u2/premium', { type: 'trial', trialUntil: NOW + 30 * DEN, trialUsed: true, createdAt: NOW },
      withData('trialsUsed/jan_novak@gmail_com', { uid: 'u2', at: NOW })), true, true],
  ['18 appka: zápis trialsUsed po aktivaci', () => W(U1, 'trialsUsed/jan_novak@gmail_com', { uid: 'u1', at: NOW }), true, true],
  ['18 appka: trial vypršel → free', () => UPD(U1, 'users/u1/premium', { type: 'free' }, withData('users/u1/premium', { type: 'trial', trialUntil: NOW - DEN, trialUsed: true, createdAt: NOW - 40 * DEN })), true, true],
  ['18 appka: admin nastaví placené Premium', () => W(ADMIN, 'users/u1/premium', { type: 'premium', premiumUntil: NOW + 365 * DEN, activatedBy: 'manual' }), true, true],
  ['18 appka: smazání účtu (náhrobek, pak users/u1 = null – ucet.js)', () => W(U1, 'users/u1', null, dbNahrobek), true, true],

  // ── Regrese: ostatní zápisy pod users/$uid ──
  ['users: transakce', () => W(U1, 'users/u1/data/transactions/t2', { name: 'Albert', amount: 50 }), true, true],
  ['users: celá data najednou', () => W(U1, 'users/u1/data', { transactions: { t1: { name: 'Lidl' } }, debts: {} }), true, true],
  ['users: settings', () => W(U1, 'users/u1/settings', { currency: 'CZK' }), true, true],
  ['users: profile', () => W(U1, 'users/u1/profile', { name: 'Jan' }), true, true],
  ['users: shared', () => W(U1, 'users/u1/shared/transactions/t1', { name: 'Lidl' }), true, true],
  ['users: householdId', () => W(U1, 'users/u1/householdId', 'hh_123456789'), true, true],
  ['users: invites', () => W(U1, 'users/u1/invites/tok999', true), true, true],
  ['users: partners (vlastník)', () => W(U1, 'users/u1/partners/partner1', true), true, true],
  ['users: partners (pozvaný s tokenem)', () => W(PARTNER, 'users/u1/partners/partner1', { token: 'tok123' }), true, true],
  ['users: categoryMappings', () => W(U1, 'users/u1/categoryMappings/lidl', { catId: 'cat1', updatedAt: NOW }), true, true],
  ['users: itemStats', () => W(U1, 'users/u1/itemStats/rohlik', { name: 'Rohlík', count: 3, avgPrice: 3.9, updatedAt: NOW }), true, true],
  ['users: uživatel nemění starý čítač AI (píše jen worker)', () => W(U1, 'users/u1/aiUsage/2026-11/chat', 4), true, false],
  ['users: inbox – vlastník označí zpracované', () => W(U1, 'users/u1/inbox/n1/stav', 'hotovo'), true, true],
  ['users: inbox – vlastník smaže položku', () => W(U1, 'users/u1/inbox/n1', null), true, true],
  ['users: inbox – spárovaný telefon přidá notifikaci', () => W(PHONE, 'users/u1/inbox/n2', { text: 'Platba 200 Kč', postedAt: NOW, dev: 'telefon1' }), true, true],
  ...['goal_deposits', 'backups', 'referral', 'referredBy', 'activity', 'inboxZarizeni', 'notifications', 'security', 'push', 'notifPrefs', 'meta',
      'communityId', 'vozidla', 'taxRozpocet', 'syncPing', 'reportAI', 'meridla', 'eanNazvy', 'eanAliasy', 'dataBackupV2']
    .map(k => ['users: ' + k, () => W(U1, 'users/u1/' + k, { x: 1, at: NOW }), true, true]),
  ['users: cizí uživatel nezapíše do cizích dat', () => W(ATT, 'users/u1/data/transactions/t9', { name: 'X' }), false, false],
  ['users: cizí uživatel nezapíše do cizího meridla', () => W(ATT, 'users/u1/meridla', { x: 1 }), false, false],
  ['users: cizí uživatel nesmaže cizí účet', () => W(ATT, 'users/u1', null), false, false],

  // ── Kontrola: ostatní uzly beze změny ──
  ['beze změny: aggregate jen worker', () => W(U1, 'community/2026-11/aggregate', { k: 99 }), false, false],
  ['beze změny: náhrobek jen sám sobě a jednou', () => W(U1, 'deletedAccounts/u1', { at: NOW, melPredplatne: false }), true, true],
];

let ok = 0, bad = 0;
for (const [popis, fn, ocekPuv, ocekOpr] of T) {
  const ocek = rezim === 'puvodni' ? ocekPuv : ocekOpr;
  let res; try { res = fn(); } catch (e) { res = { allowed: 'CHYBA ' + e.message }; }
  const sedi = res.allowed === ocek;
  if (sedi) ok++; else bad++;
  console.log(`${sedi ? '✓' : '✗'} ${res.allowed === true ? 'POVOLENO' : res.allowed === false ? 'zamítnuto' : res.allowed}  ${popis}${sedi ? '' : '  ← čekáno ' + (ocek ? 'POVOLENO' : 'zamítnuto')}`);
}
console.log(`\n${rezim}: ${ok} ✓  ${bad} ✗  (z ${T.length})`);
process.exit(bad ? 1 : 0);
