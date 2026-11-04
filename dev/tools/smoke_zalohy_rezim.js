// FinanceFlow · smoke_zalohy_rezim.js
// S28 (v12.29, Milan: „proč mají zálohy na plyn a elektřinu ‚auto‘ (auto = automobil)? … navrhni opravu, ať se to
// už nestane“). Štítek „auto“ v Opakovaných šablonách znamenal automatické vytváření, ne kategorii Auto → nový text
// „⚙️ zapíše se samo“. Měřidlo: třetí volba „jen připomínat“ (šablona bez auto) a výběr ukazuje skutečný stav šablony.
// Negativní kontrola: na v12.28 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const M = R('meridla.js', '../js/meridla.js'), P = R('premium.js', '../js/premium.js');
const S = { categories: [{ id: 'cat3', name: 'Bydlení', subs: ['Plyn', 'Energie'] }], sablony: [], transactions: [] };
const c = { S, getData: () => S, Object, Array, String, Math, JSON, save() {}, processAutoSablony() {},
  MER_DRUHY: { plyn: { n: 'Plyn', sub: ['Plyn'] }, elektrina: { n: 'Elektřina', sub: ['Energie'] }, jine: { n: 'Jiné' } },
  merZalohyRozpis: () => [], _merEsc: x => String(x), _merKc: x => x + ' Kč', _merRozpisHTML: () => '',
  _merPole: (l, h, n) => `<label>${l}</label>${h}<small>${n || ''}</small>`, ffPenezenkaSelect: () => '<select></select>' };
c.window = c; vm.createContext(c);
vm.runInContext((M.match(/^const merZalohaSablonaNajdi = [^\n]*/m) || [''])[0].replace('const', 'var') + '\n'
  + ['merVychoziKategorie', 'merZalohaSablona', '_merZalohaBlokHTML'].map(n => vyber(M, n)).join('\n'), c);
const m = { id: 'p1', druh: 'plyn', nazev: 'Plyn', catId: 'cat3', subcat: 'Plyn', zaloha: 1240, zalohaDen: 15 };
const vybrano = h => (h.match(/<option value="(\d)" selected/) || [])[1];
t('bez opakované platby: výběr „ne“', vybrano(c._merZalohaBlokHTML(m)) === '0');
c.merZalohaSablona(m, true, false);
t('„jen připomínat“ založí šablonu BEZ automatického zápisu', S.sablony.length === 1 && S.sablony[0].auto === false, S.sablony[0]);
t('… a výběr ji tak i ukáže (dřív „automaticky“, jakmile šablona existovala)', vybrano(c._merZalohaBlokHTML(m)) === '2');
c.merZalohaSablona(Object.assign({}, m, { zaloha: 1300 }), true);
t('změna rozpisu záloh (bez volby) nechá „jen připomínat“', S.sablony[0].auto === false && S.sablony[0].amount === 1300);
c.merZalohaSablona(m, true, true);
t('„automaticky“ zapne auto', S.sablony[0].auto === true && vybrano(c._merZalohaBlokHTML(m)) === '1');
S.sablony[0].auto = false;   // uživatel v ✎ šablony odškrtl Automatické vytváření
t('vypnutí v Šablonách měřidlo respektuje', vybrano(c._merZalohaBlokHTML(m)) === '2');
t('nápověda vysvětluje obě volby a duplicitu s importem banky', /Jen připomínat/.test(c._merZalohaBlokHTML(m)) && /dvakrát/.test(c._merZalohaBlokHTML(m)));
const L = vyber(P, 'renderSablonaList');
t('Šablony: štítek „⚙️ zapíše se samo“ místo „auto“ (nesplete se s kategorií Auto)', /⚙️ zapíše se samo/.test(L) && !/>auto</.test(L));
t('⚡ má popisek „Zapsat platbu teď“', /title="Zapsat platbu teď/.test(L));
t('uložení měřidla předá volbu (1 = automaticky, 2 = jen připomínat)', /merZalohaSablona\(m, auto, rezim === '1'\)/.test(M) && /rezim === '1' \|\| rezim === '2'/.test(M));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
