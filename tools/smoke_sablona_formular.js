// FinanceFlow · smoke_sablona_formular.js
// S28 (v12.27, Milan: „Opakované šablony → nemůžu se prokliknout na podkategorie a také vzhled a pole
// neodpovídá novým úpravám v porovnání s Transakcemi“): formulář šablony má stejné pořadí a prvky jako
// transakce (peněženka, typ platby, kategorie ve skupinách, podkategorie + vlastní, poznámka, tagy)
// a ukládá podkategorii, typ platby a tagy. Negativní kontrola: na v12.26 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const H = R('app.html', '../app.html'), P = R('premium.js', '../js/premium.js');
const m = H.slice(H.indexOf('id="modalSablona"'), H.indexOf('id="modalSablona"') + 9000);
const pos = id => m.indexOf('id="' + id + '"');
const poradi = ['sablonaName', 'sablonaAmt', 'sablonaWallet', 'sablonaPayType', 'sablonaCatPicker', 'sablonaSubPicker', 'sablonaSubCustom', 'sablonaNote', 'sablonaTags'];
t('formulář má všechna pole jako transakce', poradi.every(id => pos(id) > 0), poradi.filter(id => pos(id) < 0));
t('pořadí: Název, Částka, Peněženka, Typ platby, Kategorie, Podkategorie, …, Poznámka, Tagy', poradi.every((id, i) => !i || pos(id) > pos(poradi[i - 1])));
t('„nebo napiš vlastní…“ u podkategorie', /id="sablonaSubCustom"[^>]*nebo napiš vlastní/.test(m));
// výběr kategorie a podkategorie – v DOM atrapě
const el = {}; const doc = { getElementById: id => (el[id] = el[id] || { id, value: '', innerHTML: '', style: {}, checked: false }) };
const c = { console, Math, JSON, Object, Array, String, Set, document: doc, S: { categories: [
  { id: 'c1', name: 'Bydlení', icon: '🏠', color: '#aa66ff', type: 'expense', subs: ['Nájem', 'Plyn', 'Elektřina'] },
  { id: 'c2', name: 'Výplata', icon: '💰', color: '#22aa55', type: 'income', subs: [] }], transactions: [] },
  selCatId: '', _sablonaType: 'expense', escHtml: s => s };
c.window = c; vm.createContext(c);
const i0 = P.indexOf('let _sabSub'), i1 = P.indexOf('Object.assign(window,{sablonaGrpToggle');
const blok = i0 >= 0 && i1 > i0 ? P.slice(i0, i1).replace(/^let /m, 'var ') : '';
try { vm.runInContext(blok + '\nthis._get=()=>({sub:typeof _sabSub!=="undefined"?_sabSub:undefined,cat:selCatId});', c); } catch (e) { c._get = () => ({}); }
const zkus = f => { try { return f(); } catch (e) { return false; } };
zkus(() => c.sablonaSelCat('c1'));
t('výběr kategorie ukáže podkategorie jako klikací štítky', zkus(() => el.sablonaSubSection.style.display === 'block' && (el.sablonaSubPicker.innerHTML.match(/sub-chip/g) || []).length === 3));
t('kategorie se nabízí jen pro typ výdaj', zkus(() => el.sablonaCatPicker.innerHTML.includes('Bydlení') && !el.sablonaCatPicker.innerHTML.includes('Výplata')));
zkus(() => c.sablonaSelSub('Plyn'));
t('klik na podkategorii ji vybere', zkus(() => c._get().sub === 'Plyn' && /sub-chip sel" data-s="Plyn"/.test(el.sablonaSubPicker.innerHTML)));
zkus(() => c.sablonaSelSub('Plyn'));
t('druhý klik výběr zruší', c._get().sub === '');
zkus(() => c.sablonaSubVlastni('Fond oprav'));
t('vlastní podkategorie z pole', c._get().sub === 'Fond oprav');
zkus(() => c.sablonaSelCat('c1'));
t('stejná kategorie znovu podkategorii nemaže', c._get().sub === 'Fond oprav');
const tx = zkus(() => c.sablonaDoTx({}, { subcat: 'Plyn', payType: 'karta', tags: ['byt'] })) || {};
t('sablonaDoTx přenese podkategorii, typ platby a tagy', tx.subcat === 'Plyn' && tx.payType === 'karta' && (tx.tags || [])[0] === 'byt');
const save = vyber(P, 'saveSablona');
t('saveSablona ukládá subcat (+ensureSubcat), payType a tagy', /s\.subcat=_sabSub/.test(save) && /ensureSubcat/.test(save) && /s\.payType=/.test(save) && /s\.tags=/.test(save));
const ed = vyber(P, 'editSablona');
t('editSablona obnoví podkategorii, typ platby a tagy', /_sabSub=s\.subcat/.test(ed) && /s\.payType/.test(ed) && /s\.tags/.test(ed));
console.log(`\n${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
