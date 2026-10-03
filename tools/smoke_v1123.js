// FinanceFlow · smoke test · S24 · v11.23 čárový kód: český název a zařazení od AI, přednost před odhadem z názvu; admin sekce
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const TJ=R('taxonomie.json','../data/taxonomie.json');
// ── worker ──
const wsrc=R('worker.js','../cloudflare-worker/worker.js').replace('export default {','globalThis.__w = {');
let aiPrompt='';
const w={console,Date,Math,JSON,Promise,URL,setTimeout,TextEncoder,atob,btoa,crypto:globalThis.crypto,Request:class{},Response:class{},caches:{default:{}},
 fetch:async(u,o)=>{u=String(u);
  if(u.includes('financeflow.cz/data/taxonomie.json')) return {ok:true,json:async()=>JSON.parse(TJ)};
  if(u.includes('api.anthropic.com')){aiPrompt=JSON.parse(o.body).system;return {ok:true,json:async()=>({content:[{text:'{"nazev_cs":"Mléčná čokoláda s mandlemi","obecny":"mléčná čokoláda"}'}]})};}
  throw new Error(u);}};
vm.createContext(w); vm.runInContext(wsrc,w);
(async()=>{
 const prod={ean:'4056489321453',stav:'nalezeno',nazev:'Vollmilch Schokolade mit ganzen Mandeln',nazevCesky:false,nazvyJine:['Whole almond milk chocolate'],znacka:'Fin Carré',kategorie:['chocolates','milk chocolates']};
 const o=await w.eanObohat({ANTHROPIC_API_KEY:'k'},prod);
 t('worker: český název od AI',o.nazevCs==='Mléčná čokoláda s mandlemi');
 t('worker: obecný název z taxonomie (ne Mandle)',o.obecnyId==='mlecna cokolada'&&o.obecny==='mléčná čokoláda',o);
 t('worker: prompt obsahuje taxonomii a pravidlo „ne podle přísady"',aiPrompt.includes('Čokoláda a sladkosti')&&aiPrompt.includes('ne podle přísady'));
 t('worker: český název z databáze se nepřepisuje',!(await w.eanObohat({ANTHROPIC_API_KEY:'k'},Object.assign({},prod,{nazevCesky:true,nazev:'Čokoláda'}))).nazevCs);
 t('worker: obohacení při prvním dotazu i u starších záznamů',/produkt = await eanObohat\(env, produkt\)/.test(wsrc)&&/!produkt\.aiKdy/.test(wsrc));
 // ── klient ──
 const app=R('app.js','../js/app.js'); const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
 const S={categories:[{id:'cat1',name:'Jídlo',type:'expense'}],receipts:[]};
 const c={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{}}),body:{appendChild(){}}},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,URL};
 c.window=c; vm.createContext(c);
 vm.runInContext(R('helpers.js','../js/helpers.js'),c); vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),c); c.taxNastav(JSON.parse(TJ));
 vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(cc,m)=>{_catMappingsCache=cc;_productMapCache=m;};',c);
 vm.runInContext(R('receipts.js','../js/receipts.js'),c); vm.runInContext(R('ean-sken.js','../js/ean-sken.js'),c);
 c._set({},{});
 const bez=c.rpMapaNavrh('MANDLE MLEC COKOL 100G',S);
 vm.runInContext('_eanProdukty["4056489321453"]='+JSON.stringify(o),c);
 const s=c.rpMapaNavrh('MANDLE MLEC COKOL 100G',S,'4056489321453');
 t('klient: kód má přednost před odhadem z názvu',s.tax&&s.tax.nazev==='mléčná čokoláda'&&s.zdrojTax==='ean',{bez:bez&&bez.tax&&bez.tax.nazev,s:s.tax&&s.tax.nazev});
 t('klient: konkrétní název = český název výrobku',s.konkretni==='Mléčná čokoláda s mandlemi');
 c._set({},{'mandle mlec cokol':{obecny:'oplatky',obecnyId:'oplatky'}});
 t('klient: komunitní mapa (admin) má přednost před kódem',c.rpMapaNavrh('MANDLE MLEC COKOL 100G',S,'4056489321453').tax.nazev==='oplatky');
 t('klient: název k zobrazení',c.eanNazevVyrobku(o)==='Mléčná čokoláda s mandlemi'&&c.eanNazevVyrobku({nazevCesky:true,nazev:'Čokoláda'})==='Čokoláda');
 const A=R('admin.js','../js/admin.js');
 t('admin: sekce Čárové kódy, uložení, načíst znovu, smazat tagy',/function mapaAdminEanNacti/.test(A)&&/function mapaAdminEanUloz/.test(A)&&/function mapaAdminEanZnovu/.test(A)&&/function mapaSmazTagy/.test(A));
 t('admin: uložení zapíše i komunitní mapu pro zkratky',/community\/productMap\.json\?auth=\$\{t\}`, \{ method: 'PATCH'/.test(A));
 const RL=R('database.rules.json','../database.rules.json').replace(/^\s*\/\/.*$/mg,'');
 t('pravidla: eanProdukty zapisuje admin',JSON.parse(RL).rules.community.eanProdukty['.write'].includes('LNEC8VNB2QPwIv6WWQ9lqgR4O5v1'));
 console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
