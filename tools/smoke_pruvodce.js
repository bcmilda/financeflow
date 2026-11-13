// FinanceFlow · smoke_pruvodce.js
// S29 (v12.45, Milan: „průvodce používání aplikace – popis, příklady, přesměrování a návaznost na další karty“)
// Hlídá, že každá kapitola má všechny části, odkazy „Navazuje“ vedou na existující kapitoly, každé „Otevřít“
// míří na existující stránku / funkci / cílový prvek, hledání funguje bez diakritiky, přečtené se ukládají do
// S.uiCfg (synchronizuje se), karta 🚀 Začínáme odkazuje na kapitoly a Průvodce je nahoře v Přehledu.
// Negativní kontrola: na v12.44 padá (pruvodce.js neexistuje).
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x).slice(0, 400))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(i, k + 1); };
const PR = R('pruvodce.js', '../js/pruvodce.js'), H = R('app.html', '../app.html'), UI = R('ui.js', '../js/ui.js'), APP = R('app.js', '../js/app.js'),
  DEB = R('debts.js', '../js/debts.js'), SET = R('settings.js', '../js/settings.js'), CSS = R('styles.css', '../css/styles.css');
const c = { console, S: { uiCfg: {} }, viewingUid: null, ulozeno: 0, document: { getElementById: () => null, querySelector: () => null }, escHtml: s => String(s).replace(/</g, '&lt;') };
c.window = c; c.save = () => c.ulozeno++; vm.createContext(c);
vm.runInContext(PR + '\nthis._prVse=_prVse;this._prKapitolaHTML=_prKapitolaHTML;this._prRozcestnikHTML=_prRozcestnikHTML;this._prKap=_prKap;', c);
const vse = c._prVse();

console.log('── obsah kapitol ──');
t('4 oddíly, 18 kapitol', c.PRUVODCE.length === 4 && vse.length === 18, vse.length);
t('id kapitol jsou jedinečná', new Set(vse.map(k => k.id)).size === vse.length);
const neuplne = vse.filter(k => !(k.nazev && k.cesta && k.co && k.proc && k.priklad && k.priklad.text && (k.kroky || []).length >= 2 && (k.otevrit || []).length && (k.navazuje || []).length));
t('každá kapitola má popis, proč, příklad, kroky, Otevřít a Navazuje', !neuplne.length, neuplne.map(k => k.id));
const spatneOdkazy = vse.flatMap(k => k.navazuje.filter(n => !c._prKap(n) || n === k.id).map(n => k.id + '→' + n));
t('Navazuje vede jen na existující jiné kapitoly', !spatneOdkazy.length, spatneOdkazy);

console.log('── Otevřít: stránky, funkce a cílové prvky existují ──');
const strankyUi = new Set([...UI.matchAll(/curPage==='([a-zA-Z]+)'/g)].map(m => m[1]));
const chyby = [];
vse.forEach(k => k.otevrit.forEach((b, j) => {
  if (!b.page && typeof b.akce !== 'function') chyby.push(k.id + ': bez cíle');
  if (b.page) {
    if (!H.includes(`id="page-${b.page}"`)) chyby.push(k.id + ': chybí page-' + b.page);
    if (!H.includes(`${b.premium ? 'showPagePremium' : 'showPage'}('${b.page}',this)`)) chyby.push(k.id + ': ' + b.page + ' není v menu' + (b.premium ? ' (Premium)' : ''));
    if (!strankyUi.has(b.page)) chyby.push(k.id + ': ' + b.page + ' se nevykresluje');
  }
  if (b.cil) {
    let m;
    if ((m = /^#page-([a-z]+) button\[onclick="([^"]+)"\]$/.exec(b.cil))) {
      const i0 = H.indexOf(`id="page-${m[1]}"`), i1 = H.indexOf('class="page"', i0 + 10);
      if (!H.slice(i0, i1 > 0 ? i1 : undefined).includes(`onclick="${m[2]}"`)) chyby.push(k.id + ': na page-' + m[1] + ' není tlačítko ' + m[2]);
    } else if ((m = /^#([A-Za-z]+)$/.exec(b.cil))) { if (!H.includes(`id="${m[1]}"`) && !SET.includes(`id="${m[1]}"`)) chyby.push(k.id + ': chybí #' + m[1]); }
    else chyby.push(k.id + ': neznámý tvar cíle ' + b.cil);
  }
}));
t('všech ' + vse.reduce((a, k) => a + k.otevrit.length, 0) + ' tlačítek Otevřít míří na existující stránku nebo prvek', !chyby.length, chyby);
//  akce: otevře formulář transakce se správným typem a režimem
const log = []; const d = { openAddTx: () => log.push('open'), setTxType: x => log.push('typ:' + x), setTransferMode: x => log.push('rezim:' + x) };
vm.createContext(d); vm.runInContext(vyber(PR, '_prTx') + '\nthis._prTx=_prTx;', d);
d._prTx('transfer', 'assets')();
t('Zapsat vklad: formulář → Přesun → Do investic & spoření', log.join() === 'open,typ:transfer,rezim:assets', log);
t('typy a režimy z akcí existují ve formuláři', ['income', 'expense', 'debt', 'transfer'].every(x => H.includes(`setTxType('${x}')`)) && /mode==='assets'/.test(DEB) && /mode==='wallets'/.test(DEB));

console.log('── hledání a přečtené ──');
t('„bankomat“ najde Výběr z bankomatu jako první (shoda v názvu)', c.pruvodceHledej('bankomat')[0].id === 'bankomat' && c.pruvodceHledej('bankomat').length > 1);
t('bez diakritiky: „zaloha“ najde šablony, „splatka“ splátky', c.pruvodceHledej('zaloha').some(k => k.id === 'sablony') && c.pruvodceHledej('splatka').some(k => k.id === 'splatky'));
t('víc slov = všechna musí sedět, nesmysl nic', c.pruvodceHledej('eur peněženka').some(k => k.id === 'mena') && !c.pruvodceHledej('xyzzy').length);
c.pruvodceOznac('penezenky', true);
t('✓ Mám hotovo → S.uiCfg.pruvodce.p (synchronizuje se) a uloží', c.S.uiCfg.pruvodce.p.penezenky === 1 && c.ulozeno === 1 && c.pruvodcePrecteno('penezenky'));
t('uiCfg patří mezi ukládané uzly', /const _DW_META = \[[^\]]*'uiCfg'/.test(APP));
c.pruvodceOznac('penezenky', false);
t('↺ zpět na nepřečtené', !c.pruvodcePrecteno('penezenky'));
c.viewingUid = 'partner'; c.pruvodceOznac('vyplata', true);
t('při prohlížení dat partnera se nic neukládá', !c.pruvodcePrecteno('vyplata') && c.ulozeno === 2);
c.viewingUid = null;

console.log('── vzhled ──');
c.pruvodceOznac('penezenky', true);
const roz = c._prRozcestnikHTML();
t('rozcestník: všechny kapitoly, hledání, přečtená zeleně se ✓', vse.every(k => roz.includes(`pruvodceKapitola('${k.id}')`)) && /id="pruvodceHledat"/.test(roz) && /✓ Peněženky a zůstatek ke dni/.test(roz) && /1 z 5 přečteno/.test(roz));
const kap = c._prKapitolaHTML(c._prKap('investice'));
t('kapitola: CO TO JE, PROČ, PŘÍKLAD, JAK NA TO, ČASTÉ CHYBY, NAVAZUJE, dvě tlačítka Otevřít, Další', ['CO TO JE', 'PROČ', 'PŘÍKLAD', 'JAK NA TO', 'ČASTÉ CHYBY', 'NAVAZUJE'].every(x => kap.includes(x)) && /pruvodceOtevri\('investice',0\)/.test(kap) && /pruvodceOtevri\('investice',1\)/.test(kap) && /Další: Cizí měna/.test(kap));
t('lišta Zpět do návodu: nad tlačítkem +, pod formuláři', /#pruvodceLista\{position:fixed;[^}]*z-index:300/.test(CSS) && /\.fab\{[^}]*z-index:200/.test(CSS) && /\.overlay\{[^}]*z-index:400/.test(CSS));

console.log('── menu a Dashboard ──');
t('🧭 Průvodce je první v Přehledu', /<div class="nav-label">Přehled<\/div>\s*<div class="nav-item" onclick="showPage\('pruvodce',this\)">/.test(H));
t('stránka, skript, titulek a vykreslení', /id="page-pruvodce"/.test(H) && /<script src="js\/pruvodce\.js\?v=[0-9a-f]{16}"/.test(H) && /pruvodce:'🧭 Průvodce aplikací'/.test(APP) && /curPage==='pruvodce'&&typeof renderPruvodce==='function'\)renderPruvodce\(\)/.test(UI));
const o = { document: { getElementById: id => id === 'onboardCard' ? o.el : null }, el: { innerHTML: '' }, localStorage: { getItem: () => null }, viewingUid: null, _settings: {},
  _chkFoldHTML: (k, r) => r.join(''), pruvodceKapitola: () => {} };
vm.createContext(o); vm.runInContext(vyber(UI, 'renderOnboardingCard') + '\nthis.r=renderOnboardingCard;', o);
o.r({ transactions: [], wallets: [{ id: 'w1' }], sablony: [], receipts: [], categories: [], debts: [] });
const karta = o.el.innerHTML;
t('Dashboard → 🚀 Začínáme: peněženky, pravidelné platby a první účtenka jako kroky', /🚀 Začínáme/.test(karta) && /Založ peněženky a zůstatek ke dni/.test(karta) && /Přidej pravidelné platby/.test(karta) && /Naskenuj první účtenku/.test(karta));
const navody = [...karta.matchAll(/pruvodceKapitola\('([a-zA-Z]+)'\)/g)].map(m => m[1]);
t('📖 Návod u kroků vede na existující kapitoly', navody.length >= 8 && navody.every(id => c._prKap(id)), navody);
t('peněženka založená = krok hotový (✅), odkaz na celý průvodce', /✅/.test(karta) && /pruvodceKapitola\(null\)/.test(karta));

console.log(`\nprůvodce: ${ok} ✓  ${bad} ✗`);
process.exit(bad ? 1 : 0);
