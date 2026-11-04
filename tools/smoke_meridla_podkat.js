// FinanceFlow · smoke_meridla_podkat.js
// S28 (v12.26, Milan: „mají se zobrazovat měřidla energie při zadávání transakce Bydlení › Fond oprav?!“):
// blok 📟 Energie a voda ve formuláři transakce jen u energetických podkategorií nebo u podkategorie
// napojené na měřidlo. Negativní kontrola: na v12.25 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const M = R('meridla.js', '../js/meridla.js');
const S = { categories: [{ id: 'cat3', name: 'Bydlení' }, { id: 'cat5', name: 'Volný čas' }] };
const mer = [{ id: 'e1', druh: 'elektrina', nazev: 'Elektřina', catId: 'cat3' }, { id: 'p1', druh: 'plyn', nazev: 'Plyn', catId: 'cat3', subcat: 'Plyn' }, { id: 'v1', druh: 'voda', nazev: 'Voda', catId: 'cat3', subcat: 'Kominík' }];
const c = { S, getData: () => S, meridlaSeznam: () => mer, Object, Array, String }; vm.createContext(c);
vm.runInContext((M.match(/^const MER_ENERGIE_RE = [^\n]*/m) || [''])[0].replace('const', 'var') + '\n' + (M.match(/^const MER_PREPLATEK_RE2 = [^\n]*/m) || [''])[0].replace('const', 'var') + '\n'
  + vyber(M, 'merJeBydleni') + '\n' + vyber(M, 'merPlatbaKontext'), c);
const k = (sub, typ = 'expense', cat = 'cat3') => c.merPlatbaKontext(typ, cat, sub);
t('Bydlení › Fond oprav: blok se NEukáže', k('Fond oprav') === null, k('Fond oprav'));
t('Bydlení › Nájem, Internet, Pojištění: NEukáže', [k('Nájem'), k('Internet'), k('Pojištění')].every(x => x === null));
t('Bydlení › Energie: ukáže a předvybere elektroměr', k('Energie') && k('Energie').tip === 'e1');
t('Bydlení › Plyn: ukáže a předvybere plynoměr (napojený na podkategorii)', k('Plyn') && k('Plyn').tip === 'p1');
t('Bydlení › Voda: ukáže', !!k('Voda'));
t('podkategorie výslovně napojená na měřidlo (i neenergetický název) se ukáže', k('Kominík') && k('Kominík').tip === 'v1');
t('Bydlení bez podkategorie (ještě se vybírá): ukáže', !!k(''));
t('jiná kategorie bez vazby: NEukáže', k('', 'expense', 'cat5') === null);
t('příjem Bydlení › Přeplatek: ukáže', !!k('Přeplatek', 'income'));
t('úprava transakce s uloženou vazbou: blok zůstane i u jiné podkategorie', /_merPlatbaForm\._z && _merPlatbaForm\.meridloId/.test(M));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
