// FinanceFlow · smoke test · S24 · T3 uživatelská Mapa položek nad taxonomií + převod podkategorie → rozpočet
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);if(i<0||j<0)throw new Error(a);return app.slice(i,j);};
const S={categories:[
 {id:'cat1',name:'Jídlo & Nákupy',icon:'🛒',type:'expense',subs:[]},
 {id:'cat5',name:'Zábava',icon:'🎬',type:'expense'},
 {id:'cat17',name:'Domácí potřeby',icon:'🧹',type:'expense'},
 {id:'cat23',name:'Nákup',icon:'🛍️',type:'expense'}],receipts:[]};
const fetches=[];
const ctx={console,S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},
 fetch:async(u,o)=>{fetches.push([String(u),o&&o.method]);return {ok:true,json:async()=>null};},navigator:{},setTimeout,getData:()=>S};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
ctx._currentUser={uid:'u1',getIdToken:async()=>'T'};
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const g=n=>ctx.guessItemCatId(n);
(async()=>{
 ctx._set({}, {}, {});
 let r=g('Rohlík 43g');
 t('podle názvu v taxonomii (bez mapy)',r.fromMap&&r.catId==='cat1'&&r.mapa.zdrojTax==='nazev'&&r.mapa.tax.podId==='pecivo',r);
 t('zkratka bez mapy taxonomii nepoužije',!g('JOG OVOC 150G').fromMap);
 ctx._set({}, {'jog ovoc':{obecny:'ovocný jogurt',obecnyId:'ovocny jogurt',konkretni:'Ovocný jogurt jahoda'}}, {});
 r=g('JOG OVOC 150G');
 t('záznam mapy → taxonomie',r.fromMap&&r.mapa.zdrojTax==='mapa'&&r.mapa.tax.podId==='jogurty'&&r.catId==='cat1',r);
 t('řetěz pro zobrazení',ctx.rpTaxRetez(r.mapa)==='🛒 Potraviny › Jogurty a zakysané výrobky › ovocný jogurt');
 ctx._set({}, {'jog ovoc':{obecny:'ovocný jogurt',obecnyId:'ovocny jogurt'}}, {'jogurty':'cat5'});
 r=g('JOG OVOC 150G'); t('převod podkategorie vyhrává nad výchozí',r.catId==='cat5'&&r.mapa.podlePrevodu,r);
 ctx._set({'jog ovoc':{catId:'cat17',zdroj:'uzivatel'}}, {'jog ovoc':{obecny:'ovocný jogurt',obecnyId:'ovocny jogurt'}}, {'jogurty':'cat5'});
 t('osobní volba položky vyhrává nad převodem',g('JOG OVOC 150G').catId==='cat17');
 ctx._set({}, {'jog ovoc':{obecny:'ovocný jogurt',obecnyId:'ovocny jogurt'}}, {'jogurty':'cat_smazana'});
 t('převod na smazanou kategorii → výchozí',g('JOG OVOC 150G').catId==='cat1');
 ctx._set({}, {'stary':{obecny:'zelenina',catId:'cat17'}}, {});
 t('starý záznam bez taxonomie dál funguje',g('stary').catId==='cat17'&&!g('stary').mapa.tax);
 // ukládání převodu
 ctx._set({}, {}, {});
 await ctx.saveTaxRozpocet('pecivo','cat5');
 t('převod se uloží',ctx.taxRozpocetUzivatel('pecivo')==='cat5'&&fetches.some(f=>f[0].includes('/taxRozpocet/pecivo.json')&&f[1]==='PUT'));
 await ctx.saveTaxRozpocet('pecivo','');
 t('výchozí = smazání',!ctx.taxRozpocetUzivatel('pecivo')&&fetches.some(f=>f[0].includes('/taxRozpocet/pecivo.json')&&f[1]==='DELETE'));
 const n=fetches.length; await ctx.saveTaxRozpocet('../zlo','cat1');
 t('neplatné id podkategorie se ignoruje',fetches.length===n);
 // stránka
 S.receipts=[{date:'2026-09-01',items:[{name:'Rohlík 43g',itemCatId:'cat1'},{name:'Rohlík',itemCatId:'cat1'},{name:'JOG OVOC 150G',itemCatId:'cat23'},{name:'XYZ<b>',itemCatId:'cat23'}]}];
 ctx._set({}, {'jog ovoc':{obecny:'ovocný jogurt',obecnyId:'ovocny jogurt'}}, {'jogurty':'cat5'});
 const d=ctx.mapaUzivData(S.receipts,S);
 t('položky v taxonomii / mimo',d.filter(x=>x.tax).length===2&&d.filter(x=>!x.tax).length===1,d.map(x=>[x.klic,!!x.tax]));
 t('filtr V taxonomii',ctx.mapaUzivFiltruj(d,{stav:'tax',hledat:''}).length===2);
 t('filtr Mimo taxonomii',ctx.mapaUzivFiltruj(d,{stav:'mimo',hledat:''})[0].klic.startsWith('xyz'));
 t('hledání podle podkategorie',ctx.mapaUzivFiltruj(d,{stav:'vse',hledat:'pečivo'}).length===1);
 const pr=ctx.mapaUzivPrevodData(d,S);
 t('převodní tabulka jen použité podkategorie',pr.length===2&&pr.find(p=>p.podId==='pecivo').polozek===1);
 t('převodní tabulka zná vlastní volbu',pr.find(p=>p.podId==='jogurty').vlastni==='cat5');
 const html=ctx.buildMapaTab(S.receipts);
 t('záložka se vykreslí',html.includes('utab-mapa-content')&&html.includes('mapaUzivPrevod'));
 t('seznam: řetěz a mimo taxonomii',ctx.mapaUzivSeznamHTML().includes('Potraviny › Pečivo › rohlík')&&ctx.mapaUzivSeznamHTML().includes('Zatím mimo taxonomii'));
 t('převodní tabulka HTML',ctx.mapaUzivPrevodHTML().includes('Podkategorie → rozpočet')&&ctx.mapaUzivPrevodHTML().includes('1 upraveno'));
 t('escapování názvu',!ctx.mapaUzivSeznamHTML().includes('XYZ<b>'));
 t('filtry mají počty',ctx.mapaUzivFiltryHTML().includes('V taxonomii <span style="opacity:.7">2</span>'));
 console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
