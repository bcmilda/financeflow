// FinanceFlow · smoke_hlasy.js
// S28 (v12.26, Milan: „+1 na položku u uživatele, hlasy se sčítají komunitně“): štítky položek a návrhy
// kategorií – jeden hlas na uživatele (itemTagVotes/{položka}/{uid}, suggestionVotes/{název}/{uid}),
// admin sčítá nové hlasy se starými počty. Zápis v appce už nepřičítá +1 a nepřepisuje cizí hlasy.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const A = R('admin.js', '../js/admin.js'), RC = R('receipts.js', '../js/receipts.js'), IM = R('import.js', '../js/import.js');
const c = { Object, String }; vm.createContext(c);
vm.runInContext(vyber(A, 'adminSlucTagy') + '\n' + vyber(A, 'adminSlucNavrhy'), c);
const tg = c.adminSlucTagy({ rohlik: { pecivo: 12, svacina: 1 } }, { rohlik: { u1: 'pecivo', u2: 'pecivo', u3: 'svacina' }, mleko: { u1: 'mlecne' } });
t('štítky: staré počty + hlasy (pečivo 12 + 2 = 14, svačina 1 + 1 = 2)', tg.rohlik.pecivo === 14 && tg.rohlik.svacina === 2, tg);
t('štítky: nová položka jen z hlasů', tg.mleko.mlecne === 1);
t('štítky: jeden uživatel = jeden hlas na položku (klíč uid)', JSON.stringify(c.adminSlucTagy(null, { x: { u1: 'a' } })) === '{"x":{"a":1}}');
const nv = c.adminSlucNavrhy({ lidl: { suggested: 'Ostatní', chosen: { cat1: { name: 'Jídlo', catId: 'cat1', count: 3 } } } },
  { lidl: { u1: { chosenId: 'cat1', chosen: 'Jídlo', at: 1 }, u2: { chosenId: 'cat5', chosen: 'Volný čas', at: 2 } }, albert: { u1: { chosenId: 'cat1', chosen: 'Jídlo', suggested: 'Drogerie', at: 3 } } });
t('návrhy: staré 3 + nový hlas = 4, další volba 1', nv.lidl.chosen.cat1.count === 4 && nv.lidl.chosen.cat5.count === 1, nv.lidl);
t('návrhy: nový název jen z hlasů, s doporučením', nv.albert.suggested === 'Drogerie' && nv.albert.chosen.cat1.count === 1);
const sv = vyber(RC, 'saveItemTagMapping');
t('receipts.js: hlas do itemTagVotes/{položka}/{uid}, žádné GET + 1', /itemTagVotes\/\$\{encodeURIComponent\(fbKey\)\}\/\$\{uid\}/.test(sv) && !/current\+1/.test(sv));
t('import.js: hlas do suggestionVotes/{název}/{uid}, žádný přepis celého souhrnu', /suggestionVotes\/\$\{key\}\/\$\{uid\}/.test(IM) && !/cur\.chosen\[choKey\]/.test(IM));
t('admin: obě obrazovky i dlaždice čtou i nové hlasy', /adminSlucNavrhy\(await res\.json\(\)/.test(A) && /adminSlucTagy\(await res\.json\(\)/.test(A) && /community\/itemTagVotes'\]\.map/.test(A));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
