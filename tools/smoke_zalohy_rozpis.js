// FinanceFlow · smoke_zalohy_rozpis.js
// S28 (v12.17, Milan): 📅 ROZPIS ZÁLOH na aktuální období + porovnání zaplacených záloh se spotřebou
// a návrh zálohy od nejbližší platby, když by vyšel nedoplatek. Opakovaná platba se v den změny přepne
// (sablonaCastka v premium.js) – automatický zápis, ruční použití i Budoucí platby.
// Negativní kontrola: na v12.16 test padá (funkce neexistují, odhad počítá jednu zálohu na celé období).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, c, i) => { if (c) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (i === undefined ? '' : ' → ' + JSON.stringify(i).slice(0, 300))); } };

const S = { transactions: [], sablony: [] };
const c = { console, S, getData: () => S, Date, Math, JSON, Object, String, Number, parseFloat, parseInt, isFinite, Array, Promise,
  localStorage: { getItem: () => null, setItem() {} }, document: { getElementById: () => null }, window: {}, save() {}, showToast() {} };
c.window = c; vm.createContext(c);
vm.runInContext(R('meridla.js', '../js/meridla.js'), c);

// Plyn: období 30. 3. 2026 – 29. 3. 2027, záloha 1 240 Kč 15. v měsíci, cena z vyúčtování 36 Kč/m³.
const odecty = {}; let st = 3000, i = 0;
for (let d = new Date(Date.UTC(2025, 2, 30)); d <= new Date(Date.UTC(2026, 9, 27)); d = new Date(d.getTime() + 7 * 864e5)) {
  odecty['o' + i] = { id: 'o' + i, datum: d.toISOString().slice(0, 10), stav: st }; i++;
  const mm = d.getUTCMonth() + 1; st += (mm >= 10 || mm <= 4) ? 14 : 3;
}
const m = { id: 'm1', druh: 'plyn', nazev: 'Plyn', jednotka: 'm³', obdobi: 'rok', obdobiOd: '2026-03-30', zaloha: 1240, zalohaDen: 15,
  odecty, vyuctovani: { v1: { id: 'v1', od: '2025-03-30', do: '2026-03-30', spotreba: 400, castka: 14400 } } };
const DNES = '2026-10-28';
['2026-04-15', '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15'].forEach((d, k) =>
  S.transactions.push({ id: 'z' + k, type: 'expense', amount: 1240, date: d, energie: { meridloId: 'm1', typ: 'zaloha' } }));

console.log('── rozpis: částka ke dni, dny plateb ──');
t('bez rozpisu: záloha ke dni = základní 1 240', c.merZalohaKDni && c.merZalohaKDni(m, '2026-12-15') === 1240);
const m2 = Object.assign({}, m, { zalohyRozpis: { a: { id: 'a', od: '2026-12-01', kc: 1500 } } });
t('rozpis: 15. 11. = 1 240, 15. 12. = 1 500', c.merZalohaKDni(m2, '2026-11-15') === 1240 && c.merZalohaKDni(m2, '2026-12-15') === 1500);
const dny = c.merDnyPlateb ? c.merDnyPlateb(m, DNES, '2027-03-30') : [];
t('zbývající platby 15. 11. 2026 – 15. 3. 2027 (5)', dny.join(',') === '2026-11-15,2026-12-15,2027-01-15,2027-02-15,2027-03-15', dny);
t('den platby 31 v únoru = 28. 2.', c.merDnyPlateb(Object.assign({}, m, { zalohaDen: 31 }), '2027-01-31', '2027-03-30')[0] === '2027-02-28');

console.log('── odhad s rozpisem ──');
const o1 = c.merOdhad(m, S, DNES), o2 = c.merOdhad(m2, S, DNES);
t('zaplaceno 7 × 1 240 = 8 680', o1 && o1.zalohyDosud === 8680, o1 && o1.zalohyDosud);
t('zálohy za období s rozpisem: 8 680 + 1 240 + 4 × 1 500 = 15 920', o2 && o2.zalohyObdobi === 15920, o2 && o2.zalohyObdobi);
t('cena z vyúčtování 36 Kč/m³', o1 && o1.cena && Math.abs(o1.cena.cena - 36) < 1e-9);
t('porovnání do dneška: saldoDosud = zaplaceno − spotřeba × cena', o1 && Math.abs(o1.saldoDosud - (o1.zalohyDosud - o1.spotrebaDosud * 36)) < 0.01, o1 && [o1.saldoDosud, o1.spotrebaDosud]);

console.log('── návrh zálohy při nedoplatku ──');
const n = o1 && o1.navrhZalohy;
t('nedoplatek → návrh od nejbližší platby 15. 11. 2026', o1 && o1.saldoObdobi < 0 && n && n.od === '2026-11-15' && n.plateb === 5, { saldo: o1 && o1.saldoObdobi, n });
t('návrh = (náklady období − zaplaceno) ÷ 5, nahoru na 50 Kč', n && n.kc === Math.ceil((o1.kcObdobi - 8680) / 5 / 50) * 50 && n.kc > 1240, n);
const m3 = Object.assign({}, m, { zalohyRozpis: { a: { id: 'a', od: n.od, kc: n.kc } } });
const o3 = c.merOdhad(m3, S, DNES);
t('po přidání návrhu do rozpisu vyjde období ≈ 0 (do +250 Kč)', o3.saldoObdobi >= 0 && o3.saldoObdobi < 250, o3.saldoObdobi);
t('a další návrh už není', !o3.navrhZalohy);
t('přeplatek → žádný návrh', !c.merNavrhZalohy(5000, 8680, [{ d: '2026-11-15', kc: 1240 }]));
t('žádná zbývající platba → žádný návrh', !c.merNavrhZalohy(20000, 8680, []));

console.log('── opakovaná platba s rozpisem (premium.js) ──');
const P = R('premium.js', '../js/premium.js');
const fn = P.slice(P.indexOf('function sablonaCastka('), P.indexOf('window.sablonaCastka'));
const cp = { Array }; vm.createContext(cp); vm.runInContext(fn, cp);
const sab = { amount: 1240, rozpis: [{ od: '2026-12-01', kc: 1500 }] };
t('šablona: 15. 11. = 1 240, 15. 12. = 1 500, bez rozpisu = amount', cp.sablonaCastka && cp.sablonaCastka(sab, '2026-11-15') === 1240 && cp.sablonaCastka(sab, '2026-12-15') === 1500 && cp.sablonaCastka({ amount: 99 }, '2026-12-15') === 99);
t('automatický zápis (měsíční i jednorázový) bere částku ke dni platby', /const _k=typeof sablonaCastka==='function'\?sablonaCastka\(s,dateStr\)/.test(P) && /const _k1=typeof sablonaCastka==='function'\?sablonaCastka\(s,s\.onceDate\)/.test(P));
t('ruční použití šablony bere částku ke dnešku', /sablonaCastka\(s,_dateStr\)/.test(P));
t('Budoucí platby berou částku ke dni výskytu', /sablonaCastka\(s, _bIso\(date\)\)/.test(R('budouci.js', '../js/budouci.js')));
const M = R('meridla.js', '../js/meridla.js');
t('šablona zálohy nese rozpis z měřidla', /rozpis: merZalohyRozpis\(m\)\.length/.test(M));

console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
