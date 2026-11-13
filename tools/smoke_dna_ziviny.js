// FinanceFlow · smoke test · S26 (v11.67) · Nákupní DNA – živiny v nákupu
//  cesta: Analýza účtenek → 🧠 Učení → 🥗 Živiny v nákupu
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[],receipts:[],uiCfg:{},curMonth:9,curYear:2026};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{}}),body:{appendChild(){}},head:{appendChild(){}}},
  fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,URL,
  CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec']};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení'),ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
vm.runInContext(R('ean-sken.js','../js/ean-sken.js'),ctx);
//  Co je jídlo: v testu pevně (v appce koš ČSÚ / taxonomie)
ctx.cenyKodPolozky=n=>/hrozn|rohl|oreo|halls|voda|smetan/i.test(n)?'01.1':'05.6.1';
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};

const OREO='8595237405947', HALLS='8590000000008', VODA='8591234000000';
vm.runInContext(`
  _eanProdukty['${OREO}']={stav:'nalezeno',nazev:'Oreo Double vanilla',mnozstvi:{hodnota:157,jednotka:'g'},nutriscore:'e',
    nutrice:{kcal:480,tuky:20,nasycene:10,cukry:38,sul:0.8,bilkoviny:5,vlaknina:2}};
  _eanProdukty['${HALLS}']={stav:'nalezeno',nazev:'Halls',nutriscore:'d',nutrice:{kcal:390,cukry:60,sul:0}};
  _eanProdukty['${VODA}']={stav:'nalezeno',nazev:'Voda',nutriscore:'a',nutrice:{kcal:0,cukry:0,sul:0.01}};`,ctx);
const produkt=e=>ctx.eanProduktZCache(e);
const kk=ctx.mapaKartaKlic({klic:ctx.normName('Smetana DeLuxe')});
S.uiCfg.karty={[kk]:{nutrice:{kcal:200,tuky:18,cukry:4,sul:0.1},mnozstvi:'200 g'}};
const kartaLok=it=>it.ean?null:ctx.mapaKartaLok({klic:ctx.normName(it.name||'')});
const R1={store:'Albert',date:'2026-10-05',total:300,items:[
  {name:'Oreo Doub. van.',qty:1,price:39.9,lineTotal:39.9,ean:OREO},                 // 157 g z obalu
  {name:'Halls str. 33,5g',qty:3,price:19.9,lineTotal:59.7,ean:HALLS},                // 3 × 33,5 g ze zkratky
  {name:'Voda 6x0,5l',qty:1,price:59.4,lineTotal:59.4,ean:VODA},                      // multipack 3 l
  {name:'Smetana DeLuxe',qty:1,price:46.9,lineTotal:46.9},                            // osobní karta bez kódu
  {name:'Hrozny růžové',qty:0.934,unit:'kg',price:79.9,lineTotal:74.63},              // jídlo bez živin
  {name:'Jar 450ml',qty:1,price:59.9,lineTotal:59.9}]};                                // není jídlo
const dup=JSON.parse(JSON.stringify(R1));
const jinyMesic={store:'Albert',date:'2026-09-28',total:40,items:[{name:'Oreo Doub. van.',qty:5,price:39.9,lineTotal:199.5,ean:OREO}]};
const d=ctx.dnaZivinyData([R1,dup,jinyMesic],9,2026,produkt,kartaLok);

console.log('── výpočet ──');
const cukry=38*1.57+60*1.005+0+4*2;
t('cukry = Oreo 157 g + Halls 3×33,5 g + smetana 200 g (z osobní karty)',Math.abs(d.sum.cukry-cukry)<1e-6,d.sum.cukry);
t('multipack vody se započítá jako 3 l',Math.abs(d.gramu-(157+100.5+3000+200))<1e-6,d.gramu);
t('jiný měsíc a duplicitní účtenka se nepočítají',Math.abs(d.sum.kcal-(480*1.57+390*1.005+200*2))<1e-6,d.sum.kcal);
t('Jar (ne jídlo) není v útratě za jídlo',Math.abs(d.jidloUtrata-(39.9+59.7+59.4+46.9+74.63))<1e-9,d.jidloUtrata);
t('hrozny bez živin: NEJSOU nula, jen snižují pokrytí',d.pokrytoPolozek===4&&d.jidloPolozek===5&&d.pokryti===Math.round((39.9+59.7+59.4+46.9)/(39.9+59.7+59.4+46.9+74.63)*100),[d.pokrytoPolozek,d.jidloPolozek,d.pokryti]);
t('u čeho chybí, se jmenuje',d.chybi[0]==='Hrozny růžové');
t('nejvíc cukru: Halls, pak Oreo',d.topCukry[0].nazev==='Halls str. 33,5g'&&d.topCukry[1].nazev==='Oreo Doub. van.',d.topCukry);
t('Nutri-Score podle útraty (A voda, D Halls, E Oreo)',d.nutri.a===Math.round(59.4/159*100)&&d.nutri.e===Math.round(39.9/159*100),d.nutri);
t('průměr na 100 g = vážený celým nákupem',Math.abs(d.na100.cukry-cukry/d.gramu*100)<1e-9);

console.log('── zobrazení ──');
const h=ctx.dnaZivinyHTML(d,9,2026);
t('tabulka: měsíc, den, na 100 g',h.includes('>Měsíc<')&&h.includes('>Den<')&&h.includes('Na 100 g'));
t('pokrytí a co chybí jsou vidět',h.includes(d.pokryti+' %')&&h.includes('Hrozny růžové'));
t('bez NaN a undefined',!/NaN|undefined/.test(h));
t('říká „nakoupila (ne snědla)“ a nehodnotí',h.includes('nakoupila')&&h.includes('ne snědla')&&h.includes('ne hodnocení'));
const malo=ctx.dnaZivinyData([{store:'X',date:'2026-10-01',total:500,items:[{name:'Oreo Doub. van.',qty:1,price:10,lineTotal:10,ean:OREO},{name:'Hrozny',qty:2,unit:'kg',price:200,lineTotal:400}]}],9,2026,produkt,kartaLok);
const hm=ctx.dnaZivinyHTML(malo,9,2026);
t('pod 20 % pokrytí: žádná čísla, jen vysvětlení a jak doplnit',hm.includes('málo')&&!hm.includes('>Měsíc<')&&hm.includes('📷'),malo.pokryti);
t('bez jídla v měsíci: vysvětlení místo prázdna',ctx.dnaZivinyHTML(ctx.dnaZivinyData([],9,2026,produkt,kartaLok),9,2026).includes('zatím nemáš'));
const xss=ctx.dnaZivinyData([{store:'X',date:'2026-10-02',total:50,items:[{name:'<img src=x onerror=1> 100g',qty:1,price:50,lineTotal:50,ean:OREO,eanNazev:'<b>zlé</b>'}]}],9,2026,produkt,kartaLok);
t('názvy se escapují',!ctx.dnaZivinyHTML(xss,9,2026).includes('<b>zlé'));
const src=R('receipts.js','../js/receipts.js');
t('karta je v záložce Učení pod Nákupní DNA',src.indexOf("html += '<div id=\"dnaZiviny\"></div>';")>src.indexOf('🧬 Nákupní DNA</span>'));
t('pole Balení bez barev (Milan)',!/rp_bal_[\s\S]{0,400}var\(--income\)55/.test(src));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
