// FinanceFlow · smoke test · S24 · TODO-312 Mapa položek F3 (osobní vrstva, pořadí zařazení, stránka)
const vm=require('vm'),fs=require('fs');
const app=fs.readFileSync(require('path').join(__dirname,'app.js'),'utf8');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);if(i<0||j<0)throw a;return app.slice(i,j);};
const mapFns=cut('let _catMappingsCache = null;','// Partner data');
const S={categories:[
 {id:'cat1',name:'Jídlo & Nákupy',icon:'🛒',type:'expense',subs:['Sladkosti','Pečivo']},
 {id:'cat5',name:'Drogerie',icon:'🧴',type:'expense',subs:[]},
 {id:'cat23',name:'Nákup',icon:'🛍️',type:'expense'}],receipts:[]};
const fetches=[];
const ctx={console,S,window:{},localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},
  fetch:async(u,o)=>{fetches.push([u,o&&o.method]);return {ok:true,json:async()=>null}},navigator:{},setTimeout,
  getData:()=>S,_isLocalMode:false};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'helpers.js'),'utf8'),ctx);
vm.runInContext('var _isLocalMode=false;'+mapFns+';this._setMaps=(c,m)=>{_catMappingsCache=c;_productMapCache=m;};',ctx);
ctx._currentUser={uid:'u1',getIdToken:async()=>'T'};
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'receipts.js'),'utf8'),ctx);
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const g=n=>ctx.guessItemCatId(n);
// bez mapy i paměti = dřívější chování
ctx._setMaps({}, {});
t('bez mapy: klíčová slova / Nákup', ['cat1','cat23'].includes(g('SEDITA MILA REZY 50G').catId));
t('prázdné jméno nespadne', g('').catId!==undefined);
// mapa navrhne
ctx._setMaps({}, {'sedita mila rezy':{obecny:'cukrovinky',konkretni:'oplatka',catId:'cat1',subcat:'Sladkosti'}});
let r=g('SEDITA MILA REZY 50G');
t('mapa navrhne kategorii', r.catId==='cat1'&&r.fromMap&&r.subcat==='Sladkosti');
t('mapa: řetěz názvů', r.mapa.obecny==='cukrovinky'&&r.mapa.konkretni==='oplatka');
t('gramáž neruší shodu', g('Sedita Mila řezy 50 g').fromMap);
// starý klíč s podtržítky
ctx._setMaps({}, {'mleko_polotucne':{obecny:'mleko',catId:'cat1'}});
t('starý klíč mapy (podtržítka)', g('Mléko polotučné 1l').fromMap);
// osobní volba vyhrává
ctx._setMaps({'sedita mila rezy':{catId:'cat5',zdroj:'uzivatel'}}, {'sedita mila rezy':{obecny:'x',catId:'cat1'}});
r=g('SEDITA MILA REZY 50G'); t('osobní volba přebíjí mapu', r.catId==='cat5'&&r.fromMemory&&!r.fromMap);
// starý automatický Nákup nepřebíjí mapu
ctx._setMaps({'sedita mila rezy':{catId:'cat23'}}, {'sedita mila rezy':{obecny:'x',catId:'cat1'}});
t('automatický „Nákup“ nepřebíjí mapu', g('SEDITA MILA REZY 50G').catId==='cat1');
ctx._setMaps({'sedita mila rezy':{catId:'cat23',zdroj:'uzivatel'}}, {'sedita mila rezy':{obecny:'x',catId:'cat1'}});
t('vědomě zvolený Nákup vyhrává', g('SEDITA MILA REZY 50G').catId==='cat23');
// mapa s kategorií, kterou uživatel nemá
ctx._setMaps({}, {'sedita mila rezy':{obecny:'x',catId:'cat_admin123'}});
t('neznámá kategorie z mapy se přeskočí', !g('SEDITA MILA REZY 50G').fromMap);
// podkategorie, kterou uživatel nemá
ctx._setMaps({}, {'sedita mila rezy':{obecny:'x',catId:'cat1',subcat:'Neexistuje'}});
t('cizí podkategorie se nepřevezme', g('SEDITA MILA REZY 50G').subcat==='');
// rpPriradOdhad nepřepíše ruční podkategorii
const it={name:'x',itemSubcat:'Pečivo'}; ctx.rpPriradOdhad(it,{catId:'cat1',catName:'J',subcat:'Sladkosti',fromMap:true});
t('podkategorie zadaná ručně zůstane', it.itemSubcat==='Pečivo'&&it._fromMap);
// saveCategoryMapping zdroj
(async()=>{
 ctx._setMaps({}, {});
 await ctx.saveCategoryMapping('Rohlík 43g','cat1','', 'uzivatel');
 t('uložení nese zdroj uzivatel', vm.runInContext('_catMappingsCache["rohlik"].zdroj','ctx'===0?ctx:ctx)==='uzivatel');
 await ctx.saveCategoryMapping('Rohlík 43g','cat1','');
 t('opakované uložení zdroj zachová', vm.runInContext('_catMappingsCache["rohlik"].zdroj',ctx)==='uzivatel');
 await ctx.saveCategoryMapping('Rohlík 43g','cat5','');
 t('jiná kategorie bez zdroje = už ne volba', vm.runInContext('_catMappingsCache["rohlik"].zdroj',ctx)===undefined);
 await ctx.deleteCategoryMapping('Rohlík 43g');
 t('zrušení volby smaže záznam', !vm.runInContext('_catMappingsCache["rohlik"]',ctx));
 t('DELETE šel do Firebase', fetches.some(f=>f[1]==='DELETE'&&f[0].includes('categoryMappings/rohlik')));
 // stránka
 S.receipts=[
  {date:'2026-09-01',items:[{name:'SEDITA MILA REZY 50G',itemCatId:'cat23'},{name:'Rohlík 43g',itemCatId:'cat1'}]},
  {date:'2026-09-10',items:[{name:'Sedita Mila řezy 50 g',itemCatId:'cat23'},{name:'Jar 450ml',itemCatId:'cat23'}]}];
 ctx._setMaps({'jar':{catId:'cat5',zdroj:'uzivatel'}}, {'sedita mila rezy':{obecny:'cukrovinky',konkretni:'oplatka',catId:'cat1'},'jar':{obecny:'saponat',catId:'cat1'}});
 const d=ctx.mapaUzivData(S.receipts,S);
 const sed=d.find(x=>x.klic==='sedita mila rezy');
 t('varianty názvu = jedna položka', sed&&sed.pocet===2);
 t('stav Z mapy', sed.stav==='mapa'&&sed.catId==='cat1');
 const jar=d.find(x=>x.klic==='jar');
 t('stav Moje volba + rozdíl s mapou', jar.stav==='moje'&&jar.lisiSe);
 const roh=d.find(x=>x.klic==='rohlik');
 t('bez mapy a volby = odhad', roh.stav==='odhad');
 t('filtr Z mapy', ctx.mapaUzivFiltruj(d,{stav:'mapa',hledat:''}).length===1);
 t('hledání i v názvu z mapy', ctx.mapaUzivFiltruj(d,{stav:'vse',hledat:'oplatka'})[0]?.klic==='sedita mila rezy');
 t('hledání bez diakritiky', ctx.mapaUzivFiltruj(d,{stav:'vse',hledat:'ROHLÍK'}).length===1);
 const html=ctx.buildMapaTab(S.receipts);
 t('záložka se vykreslí', html.includes('utab-mapa-content')&&html.includes('oplatka')&&html.includes('Použít návrh'));
 S.receipts[0].items[0].name='<img src=x onerror=alert(1)>';
 t('název je escapovaný', !ctx.buildMapaTab(S.receipts).includes('<img src=x'));
 console.log(`\n${ok} OK, ${bad} chyb`);
})();
