// FinanceFlow · smoke test · S24 · E2 měřidla, spotřeba a odhad vyúčtování (meridla.js)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const els={};const el=()=>({style:{},innerHTML:'',value:''});
const S={categories:[{id:'cat3',name:'Bydlení',subs:['Nájem','Energie','Plyn','Voda']}],transactions:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},txCZK:t=>t.amount||0,
 document:{getElementById:id=>els[id]||(els[id]=el()),createElement:()=>el(),body:{appendChild(){}}},fetch:async()=>({ok:true,json:async()=>null})};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('vozidla.js','../js/vozidla.js'),ctx);   // sdílený graf ffGrafSloupce
vm.runInContext(R('meridla.js','../js/meridla.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
t('přičtení měsíců (konec měsíce)',ctx._merPlusMesice('2026-01-31',1)==='2026-02-28'&&ctx._merPlusMesice('2026-07-01',3)==='2026-10-01');
t('výchozí napojení záloh: Bydlení › Energie / Plyn / Voda',ctx.merVychoziKategorie('elektrina',S).subcat==='Energie'&&ctx.merVychoziKategorie('voda',S).subcat==='Voda'&&ctx.merVychoziKategorie('plyn',S).catId==='cat3');
// jen vyúčtování (bez odečtů) – čtvrtletní cyklus
const m={id:'m1',druh:'elektrina',jednotka:'kWh',obdobi:'ctvrtleti',catId:'cat3',subcat:'Energie',
  vyuctovani:{v1:{od:'2026-04-01',do:'2026-07-01',spotreba:546,castka:3276,zalohy:3000}}};
const iv=ctx.merIntervaly(m); t('interval z vyúčtování',iv.vyuctovani.length===1&&iv.odecty.length===0);
const den=ctx.merDenne(m); t('denní rozprostření (91 dní × 6 kWh)',Object.keys(den).length===91&&Math.abs(den['2026-05-10']-6)<1e-9);
t('cena z vyúčtování vč. stálých plateb',Math.abs(ctx.merCena(m).cena-6)<1e-9&&ctx.merCena(m).zdroj==='vyuctovani');
S.transactions=[
 {id:1,type:'expense',catId:'cat3',subcat:'Energie',amount:1000,date:'2026-07-15'},
 {id:2,type:'expense',catId:'cat3',subcat:'Energie',amount:1000,date:'2026-08-15'},
 {id:3,type:'expense',catId:'cat3',subcat:'Nájem',amount:9000,date:'2026-08-01'},
 {id:4,type:'expense',catId:'cat3',subcat:'Energie',amount:1000,date:'2026-06-15'}];
const z=ctx.merZalohy(S,m,'2026-07-01','2026-09-29');
t('zálohy jen z napojené podkategorie a od konce vyúčtování',z.soucet===2000&&z.pocet===2);
let o=ctx.merOdhad(m,S,'2026-09-01');
t('období navazuje na vyúčtování',o.start==='2026-07-01'&&o.konec==='2026-10-01');
t('spotřeba za období podle průměru',Math.abs(o.spotrebaObdobi-92*6)<1e-6,o.spotrebaObdobi);
t('cena za období',Math.abs(o.kcObdobi-92*6*6)<1e-6);
t('zálohy za období = zaplaceno + zbývající',Math.abs(o.zalohyObdobi-(2000+o.mesicniZaloha*1))<1e-6,o);
t('saldo = zálohy − cena (záporné = doplatek)',Math.abs(o.saldoObdobi-(o.zalohyObdobi-o.kcObdobi))<1e-6);
t('doporučená záloha zaokrouhlená na 50',o.doporucenaZaloha%50===0&&o.doporucenaZaloha*3>=o.kcObdobi);
// zadaná záloha má přednost
o=ctx.merOdhad(Object.assign({},m,{zaloha:1200}),S,'2026-09-01'); t('zadaná měsíční záloha',o.mesicniZaloha===1200);
// odečty přebijí vyúčtování a zpřesní
const m2=Object.assign({},m,{odecty:{a:{datum:'2026-07-01',stav:10000},b:{datum:'2026-08-01',stav:10310}}});
const d2=ctx.merDenne(m2); t('odečet přepíše vyúčtování',Math.abs(d2['2026-07-10']-10)<1e-9&&Math.abs(d2['2026-05-10']-6)<1e-9);
o=ctx.merOdhad(m2,S,'2026-09-01'); t('změřené dny + zbytek odhadem',o.zmerenoDni===31&&o.spotrebaDosud>310);
// výměna měřidla (pokles) se přeskočí
const m3={id:'x',odecty:{a:{datum:'2026-01-01',stav:5000},b:{datum:'2026-02-01',stav:100},c:{datum:'2026-03-01',stav:400}}};
t('výměna měřidla',ctx.merIntervaly(m3).odecty.length===1&&ctx.merIntervaly(m3).odecty[0].spotreba===300);
// bez ceny
o=ctx.merOdhad({id:'y',obdobi:'mesic',odecty:{a:{datum:'2026-08-01',stav:0},b:{datum:'2026-09-01',stav:10}}},S,'2026-09-10');
t('bez ceny: spotřeba ano, saldo ne',o.spotrebaDosud>0&&o.saldoObdobi===null&&o.start==='2026-09-01');
t('prázdné měřidlo',ctx.merOdhad({id:'z'},S,'2026-09-10')===null);
// chybějící vyúčtování → další období
o=ctx.merOdhad(m,S,'2026-12-15'); t('bez nového vyúčtování se posune období',o.start==='2026-10-01'&&o.konec==='2027-01-01');
// stránka
vm.runInContext('_meridla={m1:'+JSON.stringify(m)+'}',ctx);
els.energieContent=el(); ctx.renderEnergiePage();
const h=els.energieContent.innerHTML;
t('stránka: karta, odhad a tlačítka',h.includes('Elektřina')||h.includes('⚡'));
t('stránka: doplatek/přeplatek',/doplatek ≈|přeplatek ≈/.test(h));
t('stránka: napojení záloh',h.includes('zálohy z')&&h.includes('Energie'));
vm.runInContext('_meridla={m1:'+JSON.stringify(Object.assign({},m,{nazev:'<img src=x>'}))+'}',ctx); ctx.renderEnergiePage();
t('escapování názvu',!els.energieContent.innerHTML.includes('<img src=x>'));
const U=R('ui.js','../js/ui.js'); t('renderPage volá stránku',/renderEnergiePage\(\)/.test(U));
// v11.14: dvoutarif, tabulka, zálohy od data, vyhodnocení
const mt={id:'d',druh:'elektrina',jednotka:'kWh',dvoutarif:true,obdobi:'ctvrtleti',catId:'cat3',subcat:'Energie',
  odecty:{a:{datum:'2026-07-01',vt:1000,nt:500},b:{datum:'2026-08-01',vt:1150,nt:600},c:{datum:'2026-09-01',vt:1280,nt:720}},
  vyuctovani:{v:{od:'2026-04-01',do:'2026-07-01',spotreba:546,castka:3276}}};
t('stav dvoutarifu = VT + NT',ctx.merStav(mt.odecty.a)===1500&&ctx.merStav({stav:7})===7);
const us=ctx.merUseky(mt);
t('řádek za každý odečet',us.length===3&&us[0].spotreba===undefined&&us[1].spotreba===250&&us[1].spVt===150&&us[1].spNt===100);
t('průměr za den',Math.abs(us[1].naDen-250/31)<1e-9);
t('intervaly z dvoutarifu',ctx.merIntervaly(mt).odecty.length===2);
const zo=ctx.merZalohyOd(mt,S,'2026-07-01','2026-09-01');
t('zálohy od data (včetně)',zo.zaplaceno===2000&&zo.pocet===2,zo);
t('spotřeba od data',Math.abs(zo.spotreba-500)<1e-6,zo.spotreba);
t('saldo zálohy − náklad',Math.abs(zo.saldo-(2000-500*6))<1e-6);
const q=ctx.merObdobiSouhrn(mt,S,3,'2026-09-15');
t('čtvrtletí Q2 a Q3',q.length===2&&q[0].popis==='Q2 2026'&&q[1].popis==='Q3 2026',q.map(x=>x.popis));
t('Q3 má VT/NT',q[1].vt>0&&q[1].nt>0&&Math.abs(q[1].vt+q[1].nt-500)<1e-6,q[1]);
t('rok',ctx.merObdobiSouhrn(mt,S,12,'2026-09-15')[0].popis==='2026');
t('pololetí',ctx.merObdobiSouhrn(mt,S,6,'2026-09-15').map(x=>x.popis).join()==='1. pololetí 2026,2. pololetí 2026');
vm.runInContext('_meridla={d:'+JSON.stringify(mt)+'}',ctx);
let w=null; ctx.document.createElement=()=>{w={style:{},innerHTML:'',addEventListener(){},remove(){}};return w;};
ctx.document.getElementById=id=>id==='merDetailOkno'?w:(els[id]||(els[id]=el()));
ctx.merDetail('d');
t('detail: statistika, graf, tabulka VT/NT, zálohy, vyhodnocení',w.innerHTML.includes('Poslední odečet')&&w.innerHTML.includes('Stav VT')&&w.innerHTML.includes('Zálohy počítat od')&&w.innerHTML.includes('Vyhodnocení')&&w.innerHTML.includes('■ NT'));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
