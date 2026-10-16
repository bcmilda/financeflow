// FinanceFlow · smoke test · S27 (v11.84) · měřidla: karta místo oken, VT/NT, úprava a mazání odečtů, odhad podle loňska
//  Milan: „chtěl jsem zapsat odečet pro elektřinu, ale nemám VT a NT" · „udělej stabilnější kartu místo vyskakovacího okna"
//         „data navíc nejdou smazat, upravit" · srovnání s aplikací dodavatele (období, spotřebováno VT/NT, odhad)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('meridla.js','../js/meridla.js'),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const els={};const el=id=>({id,style:{},innerHTML:'',value:'',type:'text'});
const S={categories:[{id:'cat3',name:'Bydlení',subs:['Energie']}],transactions:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},confirm:()=>true,setTimeout:()=>{},
  showToast(m){ctx.toast=m},document:{getElementById:id=>els[id]||(els[id]=el(id)),createElement:()=>el(),body:{appendChild(){}}}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(najdi('vozidla.js','../js/vozidla.js'),'utf8'),ctx);
vm.runInContext(src+'\n;_isLocalMode=true;',ctx);
vm.runInContext('var _isLocalMode=true;',ctx);
const nastav=m=>vm.runInContext('_meridla='+JSON.stringify(m),ctx);
const meridlo=id=>vm.runInContext(`_meridla[${JSON.stringify(id)}]`,ctx);
const stranka=()=>{els.energieContent=el('energieContent');ctx.renderEnergiePage();return els.energieContent.innerHTML;};

console.log('── hromadný zápis odečtů ──');
let r=ctx.merParseOdecty(`1.10.2026 30 895 52 650
1.9.2026; 30812; 52620
2026-08-01	30718	52581
31.12.2025 VT 30 047 kWh NT 52 300 kWh
31.12.2025 30 047 52 300
nějaký text
1.13.2026 1 2`,true);
t('mezery v tisících, středník, tabulátor, ISO datum i „VT … kWh“ v textu',r.zaznamy.length===4&&JSON.stringify(r.zaznamy[3])==='{"datum":"2026-10-01","vt":30895,"nt":52650}'&&r.zaznamy[0].datum==='2025-12-31'&&r.zaznamy[0].nt===52300,r);
t('stejné datum jen jednou, nečitelné řádky a nesmyslné datum hlášené',r.chyby.length===2,r.chyby);
r=ctx.merParseOdecty('1.10.2026; 12480,5\n1.9.2026 12 350',false);
t('jeden tarif: desetinná čárka a mezera v tisících',r.zaznamy.length===2&&r.zaznamy[1].stav===12480.5&&r.zaznamy[0].stav===12350,r);
t('VT bez NT = nečitelný řádek',ctx.merParseOdecty('1.10.2026; 30895',true).chyby.length===1);

console.log('── odhad období (jako u dodavatele) ──');
const odecty={a:{datum:'2026-05-30',vt:1000,nt:500},b:{datum:'2026-07-01',vt:1096,nt:539},c:{datum:'2026-10-01',vt:1369,nt:642}};
const m={id:'e',druh:'elektrina',jednotka:'kWh',dvoutarif:true,obdobi:'rok',obdobiOd:'2026-05-30',cena:10,zaloha:1200,catId:'cat3',subcat:'Energie',odecty};
let o=ctx.merOdhad(m,S,'2026-10-16');
t('fakturační období od zadaného dne, ročně (30. 5. 2026 – 29. 5. 2027)',o.start==='2026-05-30'&&o.konec==='2027-05-30',o);
t('změřeno 511 kWh, z toho VT 369 a NT 142',Math.abs(o.spotrebaZmerena-511)<1e-6&&Math.abs(o.vtZmereno-369)<1e-6&&Math.abs(o.ntZmereno-142)<1e-6,o);
t('bez loňských dat zbytek podle průměru (sezonni = null)',o.sezonni===null&&o.spotrebaObdobi>o.spotrebaZmerena);
t('pozdější z kotev: konec vyúčtování po zadaném začátku období',ctx.merOdhad(Object.assign({},m,{vyuctovani:{v:{od:'2025-06-01',do:'2026-06-15',spotreba:1500}}}),S,'2026-10-16').start==='2026-06-15');
//  dva roky: zima 10 kWh/den, léto 4 kWh/den; letos o 10 % víc
const roky={};let st=0,d0=Date.UTC(2025,0,1);
for(let i=0;i<=640;i+=1){const d=new Date(d0+i*864e5),mes=d.getUTCMonth(),zima=mes<3||mes>9;if(i%30===0){roky['o'+i]={datum:d.toISOString().slice(0,10),stav:Math.round(st*100)/100};}st+=(zima?10:4)*(i>=365?1.1:1);}
const ms={id:'s',druh:'elektrina',jednotka:'kWh',obdobi:'rok',obdobiOd:'2026-01-01',odecty:roky};
const den=ctx.merDenne(ms);
const f=ctx.merSezonniFaktor(den);
t('poměr letos / loni ze stejných dní ≈ 1,1',f!=null&&Math.abs(f-1.1)<0.03,f);
o=ctx.merOdhad(ms,S,'2026-09-20');
const posl=Object.values(roky).map(x=>x.datum).sort().pop();
let ocek=0;for(let tt=Date.parse(posl+'T00:00:00Z');tt<Date.parse('2027-01-01T00:00:00Z');tt+=864e5){const mm=new Date(tt).getUTCMonth();ocek+=(mm<3||mm>9?10:4)*1.1;}
const zbytek=o.spotrebaObdobi-o.spotrebaZmerena;
t('dny bez odečtu podle loňského průběhu: zima se počítá zimní spotřebou (ne letním průměrem)',o.sezonni!=null&&Math.abs(zbytek-ocek)/ocek<0.06,{zbytek,ocek,prumer:o.prumerDenni});
t('loni za stejné dny k porovnání',o.loniZmereno>0&&Math.abs(o.spotrebaZmerena/o.loniZmereno-1.1)<0.03,o.loniZmereno);

console.log('── jeden stav × VT/NT se nemíchá ──');
const mix={id:'x',dvoutarif:true,odecty:{a:{datum:'2026-01-01',stav:5000},b:{datum:'2026-02-01',vt:30000,nt:50000},c:{datum:'2026-03-01',vt:30100,nt:50040}}};
t('interval mezi starým jedním stavem a VT/NT se přeskočí',ctx.merIntervaly(mix).odecty.length===1&&ctx.merIntervaly(mix).odecty[0].spotreba===140);
t('v tabulce detailu „jiný typ“',ctx.merUseky(mix)[1].jinyTyp===true&&ctx.merUseky(mix)[1].spotreba==null);

console.log('── karta místo oken ──');
nastav({e:Object.assign({},m,{dvoutarif:false,odecty:{}})});
let h=stranka();
t('žádné vyskakovací okno v modulu (position:fixed)',!/position:fixed/.test(src)&&!/_merOkno|merDetailOkno/.test(src));
t('karta: tlačítka Zapsat odečet / vyúčtování / Odečty a vyúčtování / Detail, bez otevřeného panelu',/merOtevri\('e','odecet'\)/.test(h)&&/merOtevri\('e','odecty'\)/.test(h)&&/merOtevri\('e','detail'\)/.test(h)&&!/id="merPanel"/.test(h));
ctx.merOtevri('e','odecet'); h=els.energieContent.innerHTML;
t('odečet se otevře v kartě; u elektřiny volba „jeden tarif / ☀️ VT + 🌙 NT“ přímo v odečtu',/id="merPanel"/.test(h)&&/merDvoutarif\('e',true\)/.test(h)&&/jeden tarif/.test(h));
t('pole stavu bez vzorového čísla, které vypadalo jako zapsaná hodnota (12480)',!/placeholder="12480"/.test(h)&&/placeholder="stav v kWh"/.test(h));
ctx.merOtevri('e','odecet'); t('druhé klepnutí panel zavře',!/id="merPanel"/.test(els.energieContent.innerHTML));
(async()=>{
  ctx.merOtevri('e','odecet');
  await ctx.merDvoutarif('e',true); h=els.energieContent.innerHTML;
  t('po přepnutí VT + NT: dvě pole VT (T1) a NT (T2), panel zůstane otevřený',meridlo('e').dvoutarif===true&&/VT – vysoký tarif \(T1\)/.test(h)&&/NT – nízký tarif \(T2\)/.test(h)&&/id="merOdVt"/.test(h));
  els.merOdDatum={value:'2026-10-01'};els.merOdVt={value:'30 895'};els.merOdNt={value:'52650'};
  await ctx.merUlozOdecet('e');
  t('uložení odečtu VT/NT (mezera v tisících nevadí), panel se zavře',JSON.stringify(Object.values(meridlo('e').odecty))==='[{"datum":"2026-10-01","vt":30895,"nt":52650}]'&&!/id="merPanel"/.test(els.energieContent.innerHTML));
  //  hromadně
  ctx.merOtevri('e','odecet'); ctx.merHromadneOtevri(); h=els.energieContent.innerHTML;
  t('📋 víc odečtů najednou + pokyn pro AI',/id="merHromadne"/.test(h)&&/merHromadnePokyn\('e'\)/.test(h));
  els.merHromadne={value:'1.10.2026 30 895 52 650\n1.9.2026 30 812 52 620\n1.8.2026 30 718 52 581\n31.12.2025 30 047 52 300\n31.12.2025 30 047 52 300'};
  await ctx.merHromadneUloz('e');
  t('hromadně: 3 nové, 1.10. už byl zapsaný, 31. 12. jen jednou',Object.keys(meridlo('e').odecty).length===4&&/Přidáno 3 · 1 už bylo zapsáno/.test(ctx.toast),ctx.toast);
  h=els.energieContent.innerHTML;
  t('po hromadném zápisu se otevře 📋 seznam: stav VT/NT s přírůstkem (+83), ✎ upravit, 🗑 smazat',/📋 Odečty a vyúčtování/.test(h)&&/\+83/.test(h)&&/\+30/.test(h)&&/merOtevri\('e','odecet','[^']+','odecty'\)/.test(h)&&/merSmazZaznam\('e','odecet','/.test(h));
  //  úprava
  const k1=Object.entries(meridlo('e').odecty).find(([,x])=>x.datum==='2026-09-01')[0];
  ctx.merOtevri('e','odecet',k1,'odecty'); h=els.energieContent.innerHTML;
  t('✎ úprava: předvyplněné hodnoty, „Uložit změny“ a „Smazat odečet“',/value="30812"/.test(h)&&/value="52620"/.test(h)&&/Uložit změny/.test(h)&&/Smazat odečet/.test(h)&&/value="2026-09-01"/.test(h));
  els.merOdDatum={value:'2026-09-01'};els.merOdVt={value:'30813'};els.merOdNt={value:'52620'};
  await ctx.merUlozOdecet('e');
  t('úprava přepíše stejný záznam (žádný duplikát) a vrátí se do seznamu',meridlo('e').odecty[k1].vt===30813&&Object.keys(meridlo('e').odecty).length===4&&/📋 Odečty a vyúčtování<\/div>/.test(els.energieContent.innerHTML));
  //  prohozené VT a NT → dotaz
  let dotaz='';ctx.confirm=q=>{dotaz=q;return false};
  ctx.merOtevri('e','odecet');els.merOdDatum={value:'2026-10-10'};els.merOdVt={value:'52700'};els.merOdNt={value:'30900'};
  await ctx.merUlozOdecet('e');
  t('pokles VT nebo NT → „Nejsou VT a NT prohozené?“ a bez souhlasu se neuloží',/prohozené/.test(dotaz)&&Object.keys(meridlo('e').odecty).length===4,dotaz);
  ctx.confirm=()=>true;
  //  smazání
  await ctx.merSmazZaznam('e','odecet',k1);
  t('🗑 smazání odečtu',!meridlo('e').odecty[k1]&&Object.keys(meridlo('e').odecty).length===3);
  //  rozepsané hodnoty přežijí překreslení
  ctx.merOtevri('e','odecet');
  els.energieContent.querySelectorAll=()=>[{id:'merOdVt',value:'31000',type:'text'}];
  const pole={id:'merOdVt',value:'',type:'text'};els.merOdVt=pole;
  ctx.renderEnergiePage();
  t('rozepsaný stav přežije překreslení (synchronizace)',pole.value==='31000');
  //  karta s obdobím
  vm.runInContext(`_merPanel=null`,ctx);
  nastav({e:m}); h=stranka();
  t('karta: aktuální období, spotřebováno, VT/NT, odhad za celé období, zbývá podle průměru',/Aktuální období/.test(h)&&/30\. 5\. 2026 – 29\. 5\. 2027/.test(h)&&/Spotřebováno do 1\. 10\. 2026/.test(h)&&/Odhad za celé období/.test(h)&&/VT 369/.test(h)&&/NT 142/.test(h)&&/podle průměru/.test(h));
  t('karta: odhad vyúčtování „k 29. 5. 2027“, štítek VT + NT u názvu, graf VT/NT',/Odhad vyúčtování k 29\. 5\. 2027/.test(h)&&/☀️ VT \+ 🌙 NT<\/span>/.test(h)&&/■<\/span> NT · po měsících/.test(h));
  ctx.merOtevri('e','nastaveni'); h=els.energieContent.innerHTML;
  t('⚙️ nastavení v kartě: fakturační období a dvoutarif VT (T1) / NT (T2)',/id="merObdobiOd"/.test(h)&&/value="2026-05-30"/.test(h)&&/vysoký tarif VT \(T1\)/.test(h));
  ctx.merDetail('e'); h=els.energieContent.innerHTML;
  t('📊 detail v kartě s ✎ u každého odečtu',/📊 Detail spotřeby/.test(h)&&/merOtevri\('e','odecet','[abc]','detail'\)/.test(h));
  ctx.merFormMeridlo(); h=els.energieContent.innerHTML;
  t('➕ nové měřidlo v kartě nahoře, výchozí vyúčtování ročně',/➕ Nové měřidlo/.test(h)&&/<option value="rok" selected>/.test(h));
  console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
