// FinanceFlow · smoke test · S24 · v11.22 TODO-314 přeřazení starých účtenek, menu Měřidla, ilustrace
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo & Nákupy',icon:'🛒',type:'expense',subs:['Pečivo']},{id:'cat17',name:'Domácí potřeby',icon:'🧹',type:'expense'},{id:'cat23',name:'Nákup',icon:'🛍️',type:'expense'}],
 receipts:[{date:'2026-09-01',items:[{name:'Rohlík 43g',itemCatId:'cat23',itemCat:'Nákup'},{name:'JOG OVOC 150G',itemCatId:'cat23'},{name:'XYZ',itemCatId:'cat23'},{name:'Jar 450ml',itemCatId:'cat1'}]}],
 transactions:[{id:'t',type:'expense',receiptItems:[{name:'Rohlík 43g',itemCatId:'cat23'}]}]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
ctx._set({'jar':{catId:'cat17',zdroj:'uzivatel'}},{'jog ovoc':{obecny:'ovocný jogurt',obecnyId:'ovocny jogurt'}},{});
const z=ctx.mapaPrerazeniNavrh(S);
const naz=z.filter(x=>x.kde==='uctenka').map(x=>x.nazev).sort();
t('návrh: taxonomie podle názvu, mapa a vlastní volba; neznámé ne',JSON.stringify(naz)===JSON.stringify(['JOG OVOC 150G','Jar 450ml','Rohlík 43g'].sort()),naz);
t('i kopie v transakci',z.some(x=>x.kde==='transakce'));
t('vlastní volba vyhrává',z.find(x=>x.nazev==='Jar 450ml').na==='cat17');
t('tlačítko s počtem',ctx.mapaPrerazeniTlacitko().includes('3 položek'));
ctx.save=()=>{}; ctx.showToast=()=>{}; ctx.mapaUzivKresli=()=>{};
ctx.mapaPrerazeniProvest();
t('přeřazeno v účtence',S.receipts[0].items[0].itemCatId==='cat1'&&S.receipts[0].items[0].itemCat==='Jídlo & Nákupy'&&S.receipts[0].items[3].itemCatId==='cat17');
t('přeřazeno i v transakci',S.transactions[0].receiptItems[0].itemCatId==='cat1');
t('neznámé zůstalo',S.receipts[0].items[2].itemCatId==='cat23');
t('po přeřazení nic nezbývá',ctx.mapaPrerazeniNavrh(S).length===0&&ctx.mapaPrerazeniTlacitko()==='');
const H=R('app.html','../app.html');
const iL=H.indexOf('nav-label">Měřidla'), iV=H.indexOf("showPage('vozidla'"), iE=H.indexOf("showPage('energie'"), iMaj=H.indexOf('nav-label">Majetek');
t('menu: skupina Měřidla s vozidly a energiemi',iL>iMaj&&iV>iL&&iE>iV&&(H.slice(iMaj,iL).indexOf("showPage('vozidla'")<0));
const c3={window:{},document:{}};c3.window=c3;vm.createContext(c3);vm.runInContext(R('vozidla.js','../js/vozidla.js'),c3);
t('ilustrace: voda, elektřina, plyn, teplo, pumpa',['voda','elektrina','plyn','teplo','pumpa','elektro','jine'].every(x=>c3.ffIlustrace(x).startsWith('<svg')));
t('ilustrace v kartách',/ffIlustrace\(m\.druh, 46\)/.test(R('meridla.js','../js/meridla.js'))&&/ffIlustrace\(ikona === '🔌'/.test(R('vozidla.js','../js/vozidla.js')));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
