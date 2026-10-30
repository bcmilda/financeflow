// FinanceFlow · smoke test · S27 (v11.86) · viditelné filtry v Transakcích + zálohy z měřidla jako opakovaná platba
//  Milan: „v Transakcích jsou starší transakce ve výběru a proklikávač ukazuje prosinec 2026“
//         „co kdyby se zálohy z měřidla propsaly do budoucích plateb, ty do transakcí a ty do ročního zúčtování?“
//         „transakce zapisuji ručně; při importu z banky se duplicita pozná a smaže“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const ui=R('ui.js','../js/ui.js'), hel=R('helpers.js','../js/helpers.js'), adm=R('admin.js','../js/admin.js'), prem=R('premium.js','../js/premium.js'), mer=R('meridla.js','../js/meridla.js'), html=R('app.html','../app.html');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

console.log('── Transakce: aktivní filtry jsou vidět ──');
const els={};const el=id=>({id,style:{},innerHTML:'',textContent:'',value:'',checked:false,options:[],classList:{_a:new Set(),toggle(c,on){on?this._a.add(c):this._a.delete(c)},add(c){this._a.add(c)},remove(c){this._a.delete(c)}}});
const c={S:{curMonth:11,curYear:2026},CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'],_txDateFilter:{active:false},
  document:{getElementById:id=>els[id]||(els[id]=el(id))},renderTx(){c.prekresleno=(c.prekresleno||0)+1},window:{}};
vm.createContext(c); vm.runInContext(pick(ui,'_txFiltryUkaz')+'\n'+pick(ui,'txFiltrZrus'),c);
els.txWalletFilter=Object.assign(el('txWalletFilter'),{options:[{value:'',textContent:'👛 Peněženka: Vše'},{value:'w1',textContent:'💳 Hotovost'}]});
c._txFiltryUkaz({},{walletFilter:'w1',searchAllMonths:true,tagFilter:'pečivo'});
t('nadpis „všechny měsíce“ místo prosince, když se hledá ve všech měsících',els.txMonthLabel.textContent==='všechny měsíce');
t('štítky aktivních filtrů s ✕ a „Zrušit filtry“',/všechny měsíce/.test(els.txFiltrChipy.innerHTML)&&/👛 Hotovost/.test(els.txFiltrChipy.innerHTML)&&/🏷️ pečivo/.test(els.txFiltrChipy.innerHTML)&&/txFiltrZrus\('all'\)/.test(els.txFiltrChipy.innerHTML)&&/Zrušit filtry/.test(els.txFiltrChipy.innerHTML)&&els.txFiltrChipy.style.display==='flex');
t('⚙️ Filtr ukáže počet a je zvýrazněný',els['filt-adv'].textContent==='⚙️ Filtr (3)'&&els['filt-adv'].classList._a.has('active'));
els.txSearchAllMonths=Object.assign(el('txSearchAllMonths'),{checked:true}); c.txFiltrZrus('all');
t('✕ u „všech měsíců“ zruší zaškrtnutí',els.txSearchAllMonths.checked===false&&c.prekresleno===1);
c._txFiltryUkaz({},{});
t('bez filtrů: nadpis s měsícem, štítky skryté, „⚙️ Filtr“ bez čísla',els.txMonthLabel.textContent==='Prosinec 2026'&&els.txFiltrChipy.style.display==='none'&&els['filt-adv'].textContent==='⚙️ Filtr');
t('renderTx volá ukazatel filtrů, app.html má místo pro štítky',/_txFiltryUkaz\(D, \{ catFilter/.test(ui)&&/id="txFiltrChipy"/.test(html));
t('„Vymazat“ ruší i „Hledat ve všech měsících“',/function clearTxFilters\(\) \{[\s\S]*?txSearchAllMonths'\); if\(allM\) allM\.checked = false;/.test(adm));
t('přepnutí měsíce šipkou vypne „Hledat ve všech měsících“',/function changeMonth\(d\)\{[^\n]*txSearchAllMonths'\);if\(_am\)_am\.checked=false;/.test(hel));

console.log('── zálohy z měřidla → opakovaná platba → transakce ──');
const S={categories:[{id:'cat3',name:'Bydlení',subs:['Energie']}],transactions:[],sablony:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},confirm:()=>true,setTimeout:()=>{},save(){ctx.ulozeno=(ctx.ulozeno||0)+1},uid:(()=>{let n=0;return()=>'id'+(++n)})(),
  showToast(m){ctx.toast=m},document:{getElementById:id=>ctx.els[id]||(ctx.els[id]={id,style:{},innerHTML:'',value:''}),createElement:()=>({}),body:{appendChild(){}}},els:{}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('vozidla.js','../js/vozidla.js'),ctx);
vm.runInContext(mer+'\n;var _isLocalMode=true;',ctx);
vm.runInContext(pick(prem,'processAutoSablony'),ctx);
const m={id:'e1',druh:'elektrina',nazev:'Elektřina',jednotka:'kWh',obdobi:'rok',catId:'cat3',subcat:'Energie',zaloha:1185,zalohaDen:31};
let r=ctx.merZalohaSablona(m,true);
const sab=S.sablony[0];
t('vznikne opakovaná platba: měsíčně, automaticky, Bydlení › Energie, vazba na měřidlo',r==='nova'&&sab.id==='mer-e1'&&sab.amount===1185&&sab.freq==='monthly'&&sab.auto===true&&sab.catId==='cat3'&&sab.subcat==='Energie'&&sab.energie.meridloId==='e1'&&sab.energie.typ==='zaloha',sab);
const tx=S.transactions.find(x=>x.name==='Záloha – Elektřina');
t('hned zapsaná transakce tohoto měsíce s podkategorií a vazbou t.energie',tx&&tx.subcat==='Energie'&&tx.energie&&tx.energie.meridloId==='e1'&&tx.energie.typ==='zaloha'&&tx.amount===1185,tx);
ctx.processAutoSablony();
t('podruhé se nezapíše (idempotence)',S.transactions.filter(x=>x.name==='Záloha – Elektřina').length===1);
const z=ctx.merZalohy(S,m,'2000-01-01','2100-01-01');
t('měřidlo zálohu započítá (i bez napojené kategorie – vazba z transakce)',z.pocet===1&&z.soucet===1185&&ctx.merZalohy(S,Object.assign({},m,{catId:'',subcat:''}),'2000-01-01','2100-01-01').soucet===1185);
r=ctx.merZalohaSablona(Object.assign({},m,{zaloha:1300}),true);
t('změna zálohy v měřidle upraví stejnou šablonu (žádná druhá)',r==='upravena'&&S.sablony.length===1&&S.sablony[0].amount===1300);
r=ctx.merZalohaSablona(m,false);
t('vypnutí zruší šablonu, zapsané transakce zůstanou',r==='zrusena'&&S.sablony.length===0&&S.transactions.length===1);
t('úprava šablony v 🔄 Šablonách si drží vazbu na měřidlo',/if\(_o&&_o\.energie\)\{ s\.energie=_o\.energie;/.test(prem));
t('i ruční „Použít šablonu“ přenese podkategorii a vazbu',/if\(s\.subcat\) _t\.subcat=s\.subcat; if\(s\.energie\) _t\.energie=Object\.assign\(\{\},s\.energie\);/.test(prem));
vm.runInContext('_meridla={e1:'+JSON.stringify(m)+'}',ctx);
ctx.els.energieContent={id:'energieContent',style:{},innerHTML:''};
ctx.merOtevri('e1','nastaveni'); let h=ctx.els.energieContent.innerHTML;
t('⚙️ blok 🔄 Měsíční záloha: částka, den platby, „Zapisovat do transakcí“, peněženka',/🔄 Měsíční záloha/.test(h)&&/id="merZalDen"/.test(h)&&/id="merZalAuto"/.test(h)&&/ano – každý měsíc automaticky/.test(h)&&/id="merZalWal"/.test(h));
Object.assign(ctx.els,{merNazev:{value:'Elektřina'},merJed:{value:'kWh'},merObdobi:{value:'rok'},merCat:{value:'cat3'},merSub:{value:'Energie'},merObdobiOd:{value:''},merTarif:{value:'1'},merCena:{value:''},merZaloha:{value:'1185'},merZalAuto:{value:'1'},merZalDen:{value:'31'},merZalWal:{value:''}});
(async()=>{
  await ctx.merUlozMeridlo('e1');
  t('uložení nastavení s „ano“ založí opakovanou platbu',S.sablony.length===1&&/záloha se bude zapisovat každý měsíc/.test(ctx.toast),ctx.toast);
  ctx.merOtevri('e1','nastaveni'); h=ctx.els.energieContent.innerHTML;
  t('nastavení ukáže, že opakovaná platba běží',/✓ Opakovaná platba běží: 1 185 Kč každého 31\. v měsíci/.test(h.replace(/ /g,' ')));
  vm.runInContext('_merPanel=null',ctx); ctx.renderEnergiePage(); h=ctx.els.energieContent.innerHTML;
  t('karta: dlaždice záloha „🔄 automaticky 31. v měsíci“',/🔄 automaticky 31\. v měsíci/.test(h));
  //  vyúčtování s doplatkem → rovnou nabídka zápisu do transakcí
  ctx.merOtevri('e1','vyuctovani');
  Object.assign(ctx.els,{merVyOd:{value:'2025-05-30'},merVyDo:{value:'2026-05-30'},merVySpot:{value:'1500'},merVyCena:{value:'14578'},merVyZal:{value:'14210'}});
  await ctx.merUlozVyuctovani('e1'); h=ctx.els.energieContent.innerHTML;
  t('vyúčtování s doplatkem 368 Kč → hned panel „💸 Doplatek zaplacen“ s částkou',/💸 Doplatek zaplacen/.test(h)&&/value="368"/.test(h));
  await ctx.merSmazMeridlo('e1');
  t('smazání měřidla zruší i jeho opakovanou platbu',S.sablony.length===0);
  console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
