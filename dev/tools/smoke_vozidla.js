// FinanceFlow · smoke test · S24 · E1 vozidla a tankování (vozidla.js + napojení v debts.js/ui.js)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const els={};
const el=()=>({style:{},innerHTML:'',value:''});
const S={categories:[{id:'cat11',name:'Auto',subs:['Palivo','STK']},{id:'cat1',name:'Jídlo',subs:[]}],transactions:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},
  document:{getElementById:id=>els[id]||(els[id]=el()),addEventListener(){},createElement:()=>el(),body:{appendChild(){}}},
  fetch:async()=>({ok:true,json:async()=>null}),txCZK:t=>t.amount||0};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('vozidla.js','../js/vozidla.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const P=x=>ctx.tankZPoznamky(x);
t('Milanova poznámka „20l 83448"',P('20l 83448').litry===20&&P('20l 83448').tachometr===83448,P('20l 83448'));
t('desetinná čárka a mezera v tisících',P('32,5 l N95 83 448 km').litry===32.5&&P('32,5 l N95 83 448 km').tachometr===83448&&P('32,5 l N95').palivo==='benzin');
t('cena u stojanu',P('40 l 38,90 Kč/l 120500').cenaStojan===38.9&&P('40 l 38,90 Kč/l 120500').tachometr===120500);
t('nafta a plná nádrž',P('45l nafta plná nádrž 99000').palivo==='nafta'&&P('45l nafta plná nádrž 99000').plna===true);
t('bez čísel nic',Object.keys(P('Shell')).length===0);
t('litry nejsou tachometr',P('1500 l').tachometr===undefined);
t('kategorie Auto › Palivo',ctx.tankJeKategorie('cat11','Palivo',S)&&!ctx.tankJeKategorie('cat11','STK',S)&&!ctx.tankJeKategorie('cat1','Palivo',S));
t('normalizace: prázdné = null',ctx.tankNormalizuj({litry:'',tachometr:''})===null);
const n=ctx.tankNormalizuj({vozidloId:'v1',litry:'20,456',tachometr:'83448',cenaStojan:'38,9',palivo:'benzin',plna:false});
t('normalizace: čísla a zaokrouhlení',n.litry===20.46&&n.tachometr===83448&&n.cenaStojan===38.9&&n.palivo==='benzin'&&!('plna' in n),n);
t('neznámé palivo se neuloží',!('palivo' in ctx.tankNormalizuj({litry:5,palivo:'kerosin'})));
// statistiky – klouzavá spotřeba bez plné nádrže
const z=[
 {datum:'2026-07-01',zaplaceno:898,litry:20,tachometr:83000},
 {datum:'2026-07-15',zaplaceno:900,litry:21,tachometr:83300},
 {datum:'2026-08-01',zaplaceno:700,litry:20,tachometr:83620,cenaStojan:40},
 {datum:'2026-08-20',zaplaceno:860,litry:19,tachometr:83900}];
const st=ctx.tankStatistiky(z);
t('ujeto km',st.km===900);
t('klouzavá spotřeba (litry po prvním zápisu)',Math.abs(st.spotreba-60/900*100)<1e-9,st.spotreba);
t('cena za km',Math.abs(st.cenaZaKm-(900+700+860)/900)<1e-9);
t('průměrná cena = zaplaceno / litry',Math.abs(st.cenaEfektivni-3358/80)<1e-9);
t('ušetřeno na kuponech',st.usetreno===100,st.usetreno);
t('spolehlivá po 3 tankováních',st.spolehliva===true);
t('měsíce',st.mesice.length===2&&st.mesice[0].litry===41);
t('jen jeden stav tachometru = bez spotřeby',ctx.tankStatistiky(z.slice(0,1)).spotreba===null);
t('dvě tankování = přibližná',ctx.tankStatistiky(z.slice(0,2)).spolehliva===false);
// data z transakcí + převod poznámek
S.transactions=[
 {id:'a',type:'expense',catId:'cat11',subcat:'Palivo',amount:898,date:'2026-09-01',note:'20l 83448'},
 {id:'b',type:'expense',catId:'cat11',subcat:'Palivo',amount:900,date:'2026-09-15',note:'21l 83760'},
 {id:'c',type:'expense',catId:'cat11',subcat:'STK',amount:1500,date:'2026-09-02',note:'30000'},
 {id:'d',type:'expense',catId:'cat11',subcat:'Palivo',amount:500,date:'2026-09-20',tank:{vozidloId:'v1',litry:10,tachometr:84000}}];
t('záznamy z transakcí podle vozidla',ctx.tankZaznamy(S,'v1').length===1&&ctx.tankZaznamy(S).length===1);
// formulář
ctx.selCatId='cat11'; ctx.selSub='Palivo'; ctx.curTxType='expense';
els.txNote={value:'20l 83448'}; els.customSubInput={value:''};
vm.runInContext('_vozidla={v1:{id:"v1",nazev:"Octavia",typ:"auto",palivo:"nafta",kdy:1}}',ctx);
ctx.tankNaplnFormular(null); ctx.tankObnov();
t('blok se ukáže u Auto › Palivo',els.txTankBlock.style.display==='block'&&els.txTankBlock.innerHTML.includes('Tankování'));
t('předvyplnění z poznámky',els.txTankBlock.innerHTML.includes('value="20"')&&els.txTankBlock.innerHTML.includes('value="83448"'));
t('palivo z vozidla',ctx.tankZFormulare('cat11','Palivo').palivo==='nafta'&&ctx.tankZFormulare('cat11','Palivo').vozidloId==='v1');
t('mimo palivo se neuloží',ctx.tankZFormulare('cat11','STK')===null);
ctx.selSub='STK'; ctx.tankObnov(); t('blok zmizí u jiné podkategorie',els.txTankBlock.style.display==='none');
// editace: uložená data se nepřepíší z poznámky
ctx.selSub='Palivo'; ctx.tankNaplnFormular({vozidloId:'v1',litry:33,tachometr:90000}); els.txNote={value:'20l 83448'}; ctx.tankObnov();
t('editace drží uložené hodnoty',els.txTankBlock.innerHTML.includes('value="33"')&&!els.txTankBlock.innerHTML.includes('value="20"'));
// stránka
ctx.curPage='vozidla'; els.vozidlaContent=el(); ctx.renderVozidlaPage();
const h=els.vozidlaContent.innerHTML;
t('stránka: karta vozidla, bez převodu poznámek',h.includes('Octavia')&&!h.includes('Převést'));
vm.runInContext('_vozidla={v1:{id:"v1",nazev:"<b>X</b>",typ:"auto",kdy:1}}',ctx); ctx.renderVozidlaPage();
t('escapování názvu vozidla',!els.vozidlaContent.innerHTML.includes('<b>X</b>'));
// napojení
const D=R('debts.js','../js/debts.js'), U=R('ui.js','../js/ui.js');
t('saveTx ukládá tank ke stejné transakci',/txObj\.tank = tankZFormulare\(selCatId, finalSub\) \|\| null/.test(D));
t('renderSubPicker obnovuje blok',/setTimeout\(tankObnov,0\)/.test(D));
t('editTx načte tank',/tankNaplnFormular\(t\.tank\|\|null\)/.test(U)&&/renderVozidlaPage\(\)/.test(U));
// v11.14: detail + příspěvky
const us=ctx.tankUseky(z);
t('úseky: ujeto od minula',us[0].ujeto===null&&us[1].ujeto===300&&us[3].ujeto===280);
t('úseky: cena zaplaceno/l a spotřeba úseku',Math.abs(us[1].cenaZaplacenoL-900/21)<1e-9&&Math.abs(us[1].spotrebaUseku-7)<1e-9);
S.transactions.push({id:'p1',type:'income',amount:200,date:'2026-09-21',vozPrispevek:{vozidloId:'v1',od:'Petr'}},{id:'p2',type:'income',amount:150,date:'2026-09-22',vozPrispevek:{vozidloId:'v2',od:'Jana'}});
t('příspěvky podle vozidla',ctx.prispevkyZaznamy(S,'v1').length===1&&ctx.prispevkyZaznamy(S,'v1')[0].od==='Petr');
vm.runInContext('_vozidla={v1:{id:"v1",nazev:"Octavia",typ:"auto",palivo:"benzin",kdy:1}}',ctx);
let okno=null; ctx.document.createElement=()=>{okno={style:{},innerHTML:'',addEventListener(){},remove(){}};return okno;};
ctx.document.getElementById=id=>id==='vozDetailOkno'?okno:(els[id]||(els[id]=el()));
ctx.vozidloDetail('v1');
t('detail: souhrn, tabulka, příspěvky',okno.innerHTML.includes('Zaplaceno celkem')&&okno.innerHTML.includes('<table')&&okno.innerHTML.includes('Petr')&&okno.innerHTML.includes('Čistý náklad'));
t('graf sloupců',ctx.ffGrafSloupce([{popis:'09',a:5,b:2}]).includes('height'));
t('čárový graf potřebuje 2 body',ctx.ffGrafCara([{y:1}])===''&&ctx.ffGrafCara([{y:1},{y:2}]).includes('<svg'));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
