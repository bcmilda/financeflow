// FinanceFlow · smoke test · S24 · v11.18 karty útraty v Reportu, blok 📟 v transakci, zavření menu
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const P=R('projects.js','../js/projects.js');
const ctx={console,window:{},isTransferTx:t=>!!t.transferId,txCZK:t=>t.amount,fmtB:v=>v+' Kč',escHtml:s=>String(s).replace(/</g,'&lt;')};
ctx.window=ctx; vm.createContext(ctx);
const a=P.indexOf('const REPORT_KARTY = ['), b=P.indexOf('function renderReport() {');
vm.runInContext(P.slice(a,b).replace(/const (REPORT_\w+) =/g,'var $1 ='),ctx);
const D={categories:[
 {id:'cat3',name:'Bydlení',coicop:4,icon:'🏠'},{id:'cat1',name:'Jídlo',coicop:1},{id:'cat30',name:'Předplatné',coicop:9},
 {id:'cat5',name:'Zábava',coicop:9,coicopOverrides:{'Kavárna':11}},{id:'cx',name:'Kočka',coicop:9},{id:'cy',name:'Moje streamy',coicop:9},
 {id:'cz',name:'Vlastní',coicop:7,reportKarta:'nakupy'},{id:'cat35',name:'Splátka',coicop:13}]};
const k=(cat,sub)=>ctx.reportKartaTx({catId:cat,subcat:sub},D);
t('výchozí kategorie podle id',k('cat3')==='bydleni'&&k('cat1')==='jidlo'&&k('cat30')==='predplatne'&&k('cat35')==='ostatni');
t('vlastní kategorie podle COICOP',k('cx')==='zabava');
t('ruční přepsání vyhrává',k('cz')==='nakupy');
t('výchozí kategorie má přednost před výjimkou podkategorie',k('cat5','Kavárna')==='zabava');
const txs=[{type:'expense',catId:'cat3',amount:10000,subcat:'Nájem'},{type:'expense',catId:'cat1',amount:5000},{type:'expense',catId:'cat30',amount:300},
 {type:'expense',catId:'cat1',amount:999,transferId:'x'},{type:'income',catId:'cat1',amount:50000}];
const s=ctx.reportKartySoucty(txs,D);
t('součty bez přesunů a příjmů',s.bydleni.celkem===10000&&s.jidlo.celkem===5000&&s.predplatne.celkem===300);
const h=ctx.reportKartyUtratyHTML(txs,[{type:'expense',catId:'cat3',amount:8000}],D,'srpen');
t('karty: nadpis a 6 skupin',h.includes('Kam šly peníze')&&['Bydlení','Doprava','Předplatné','Nákupy','Zábava','Jídlo a pití'].every(x=>h.includes(x)));
t('karty: procento a srovnání',h.includes('↑25 %')&&h.includes('vs srpen'));
t('karty: top podkategorie',h.includes('Bydlení › Nájem'));
t('karty jsou v reportu',/reportKartyUtratyHTML\(txs, prevW, D, pop\)/.test(P));
t('bez výdajů nic',ctx.reportKartyUtratyHTML([],[],D,'x')==='');
// blok 📟
const M=R('meridla.js','../js/meridla.js');
const S={categories:[{id:'cat3',name:'Bydlení',subs:['Energie','Zálohy','Nájem']},{id:'cat8',name:'Ostatní příjmy',type:'income'}],transactions:[]};
const els={};const el=()=>({style:{},innerHTML:'',value:''});
const c2={console,S,getData:()=>S,txCZK:t=>t.amount,localStorage:{getItem:()=>null},document:{getElementById:id=>els[id]||(els[id]=el()),createElement:()=>el(),body:{appendChild(){}}},fetch:async()=>({ok:true,json:async()=>null})};
c2.window=c2; vm.createContext(c2); vm.runInContext(M,c2);
vm.runInContext('_meridla={e:{id:"e",druh:"elektrina",nazev:"Elektřina",jednotka:"kWh",kdy:1,dvoutarif:true},p:{id:"p",druh:"plyn",nazev:"Plyn",jednotka:"kWh",kdy:2}}',c2);
let x=c2.merPlatbaKontext('expense','cat3','Zálohy'); t('Bydlení › Zálohy: blok, bez tipu (víc měřidel)',x&&x.tip===''&&x.typTip==='zaloha');
x=c2.merPlatbaKontext('expense','cat3','Plyn'); t('Bydlení › Plyn: tip plyn',x.tip==='p');
x=c2.merPlatbaKontext('expense','cat3','Nájem'); t('Bydlení › Nájem: blok, ale nepropojovat',x&&x.tip==='');
t('jiná kategorie bez vazby: žádný blok',c2.merPlatbaKontext('expense','cat1','Pečivo')===null);
t('příjem Přeplatek: blok',c2.merPlatbaKontext('income','cat8','Přeplatek z vyúčtování').typTip==='preplatek');
c2.merPlatbaNaplnFormular(null);
t('nový zápis Bydlení › Elektřina → záloha elektřiny',JSON.stringify(c2.merPlatbaZFormulare('expense','cat3','Elektřina'))==='{"meridloId":"e","typ":"zaloha"}');
t('nový zápis Nájem → bez vazby',c2.merPlatbaZFormulare('expense','cat3','Nájem')===null);
c2.merPlatbaNaplnFormular(null); c2.merPlatbaPole('meridloId','e',1); c2.merPlatbaPole('typ','doplatek',1);
t('Bydlení › Doplatky s ručním výběrem',JSON.stringify(c2.merPlatbaZFormulare('expense','cat3','Doplatky'))==='{"meridloId":"e","typ":"doplatek"}');
// explicitní vazba se počítá do záloh bez ohledu na podkategorii
S.transactions=[{type:'expense',catId:'cat3',subcat:'Zálohy',amount:1500,date:'2026-09-15',energie:{meridloId:'e',typ:'zaloha'}},
 {type:'expense',catId:'cat3',subcat:'Zálohy',amount:900,date:'2026-09-15',energie:{meridloId:'p',typ:'zaloha'}}];
t('zálohy podle vazby, ne podkategorie',c2.merZalohy(S,{id:'e'},'2026-09-01','2026-09-30').soucet===1500);
// odečet z transakce
c2.merPlatbaNaplnFormular(null); c2.merPlatbaPole('meridloId','e',1); c2.merPlatbaPole('odecet',true,1); c2.merPlatbaPole('vt','1200',1); c2.merPlatbaPole('nt','700',1);
(async()=>{ await c2.merPlatbaOdecet('2026-09-15');
  const od=Object.values(vm.runInContext('_meridla.e.odecty',c2)||{});
  t('odečet VT/NT uložený z transakce',od.length===1&&od[0].vt===1200&&od[0].nt===700&&od[0].datum==='2026-09-15');
  const U=R('ui.js','../js/ui.js'), DB=R('debts.js','../js/debts.js');
  t('saveTx volá odečet',/merPlatbaOdecet\(date\)/.test(DB));
  t('menu se zavře klepnutím vedle',/sb\.classList\.remove\('open'\)/.test(U)&&/closest\('\.hamburger'\)/.test(U));
  console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1; })();
