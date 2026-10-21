// FinanceFlow · smoke test · Session 27 (v11.93) · název z kódu pod položkou + kontrola kódu proti zkratce + 📷 Přidat skenem
//  Milan: „chtěl bych vyzkoušet název z kódu pod položkou – hned uvidíme název“
//         „kontrola kódu proti názvu z účtenky zní jako dobrá pojistka“
//         „u ruční účtenky – můžu i jen skenovat kódy?“ (bez automatické ceny)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), hel=R('helpers.js','../js/helpers.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const PROD={'111':{stav:'nalezeno',nazev:'Orion Milena mléčná tyčinka',znacka:'Orion',mnozstvi:{hodnota:32,jednotka:'g'}},
  '222':{stav:'nalezeno',nazev:'Orion Margot',znacka:'Orion',mnozstvi:{hodnota:80,jednotka:'g'}},
  '333':{stav:'nalezeno',nazev:'Pilsner Urquell',znacka:'Plzeňský Prazdroj',mnozstvi:{hodnota:500,jednotka:'ml'}},
  '444':{stav:'nalezeno',nazev:'Kofola Original',znacka:'Kofola',mnozstvi:{hodnota:2000,jednotka:'ml'}}};
const naceteno=[];
const c={console,window:{},escHtml:s=>String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),
  eanProduktZCache:e=>PROD[e]||null,eanNazevVyrobku:p=>p.nazev,
  eanNactiVse:async l=>{naceteno.push(l);return l.length},rpRender(){c.prekresleno=(c.prekresleno||0)+1},rpUpdateTotal(){},
  rpNakupCat:()=>({id:'nak',name:'Nákup'}),guessItemCatId:n=>/milena/i.test(n)?{catId:'sladke'}:{catId:''},rpPriradOdhad:(it,g)=>{if(g.catId)it.itemCatId=g.catId},
  document:{activeElement:null,getElementById:()=>null},setTimeout:f=>f()};
c.window=c; vm.createContext(c);
//  helpers: fmtP, normQty, baleniZNazvu, gramazZTextu
const h=['normQty','baleniZNazvu','gramazZTextu'].map(n=>{try{return pick(hel,n)}catch(e){return ''}}).join('\n');
vm.runInContext(hel.match(/const fmtP=n=>\{[\s\S]*?\n\};/)[0]+'\n'+hel.match(/const NORM_JEDNOTKY_RE = [^\n]*/)[0]+'\n'+h,c);
vm.runInContext(['rpKodNazev','_rpSlova','_rpGramaz','rpKodSedi','_rpDruhKlic','rpKodRadekHTML','rpKodNazvyNacti','rpPridatSkenem','rpPoSkenu'].map(n=>pick(rc,n)).join('\n')
  +'\nlet _rpKodNacitam=false; const _rpKodZkuseno=new Set();',c);

console.log('── kontrola kódu proti zkratce ──');
t('Milena: zkratka „Milena mléčná 32g Orion“ ↔ Orion Milena 32 g = sedí',c.rpKodSedi('Milena mléčná 32g Orion','Orion Milena mléčná tyčinka',PROD['111']).ok);
t('jiný obchod: „ORION MILENA TYČINKA MLÉČNÁ 32G“ = sedí',c.rpKodSedi('ORION MILENA TYČINKA MLÉČNÁ 32G','Orion Milena mléčná tyčinka',PROD['111']).ok);
const m=c.rpKodSedi('Lindt ml.čok.lísk.oř.300g','Orion Margot',PROD['222']);
t('Lindt 300 g s kódem Margot 80 g → nesedí, důvod gramáž',!m.ok&&/300 g ≠ 80 g/.test(m.proc),m);
const s2=c.rpKodSedi('Rohlík 43G','Orion Margot',{});
t('bez gramáže výrobku: žádné společné slovo → nesedí',!s2.ok&&/název/.test(s2.proc),s2);
t('multipack „PIVO URQUELL 4X0,5L“ s kódem 0,5 l = sedí',c.rpKodSedi('PIVO URQUELL 4X0,5L','Pilsner Urquell',PROD['333']).ok);
t('zkratka „KOFOLA 2L“ (litry vs ml) = sedí',c.rpKodSedi('KOFOLA 2L','Kofola Original',PROD['444']).ok);
t('bez názvu výrobku se nesoudí',c.rpKodSedi('cokoli 100g','',null).ok);

console.log('── řádek pod položkou ──');
let html=c.rpKodRadekHTML({name:'Milena mléčná 32g Orion',ean:'111'},0);
t('zelený řádek ▮▮ s názvem výrobku',/▮▮ Orion Milena mléčná tyčinka/.test(html)&&/var\(--income\)/.test(html),html);
html=c.rpKodRadekHTML({name:'Lindt ml.čok.lísk.oř.300g',ean:'222'},1);
t('žlutý řádek ⚠️ s důvodem',/⚠️ Orion Margot · gramáž 300 g ≠ 80 g/.test(html)&&/#fbbf24/.test(html),html);
t('položka bez kódu nemá řádek',c.rpKodRadekHTML({name:'Rohlík'},2)==='');
html=c.rpKodRadekHTML({name:'X',ean:'999'},3);
t('neznámý kód: „název se načítá…“',/kód 999 · název se načítá/.test(html));
t('starší položka s uloženým eanNazev bez načtené karty ukáže uložený název',/▮▮ Uložený název/.test(c.rpKodRadekHTML({name:'Uložený 1',ean:'998',eanNazev:'Uložený název'},4)));

console.log('── načtení názvů: jednou, bez smyčky ──');
(async()=>{
  const r={items:[{ean:'999'},{ean:'999'},{ean:'111'},{name:'bez'}]}; c._editReceipt=r;
  c.rpKodNazvyNacti(r); await new Promise(z=>setImmediate(z));
  t('načte jen chybějící kód, jednou (ne 111, který je v mezipaměti)',naceteno.length===1&&JSON.stringify(naceteno[0])==='["999"]',naceteno);
  t('po pokusu jedno překreslení',c.prekresleno===1);
  c.rpKodNazvyNacti(r); await new Promise(z=>setImmediate(z));
  t('podruhé se už nenačítá ani nepřekresluje (dřív nekonečná smyčka offline)',naceteno.length===1&&c.prekresleno===1);
  t('po neúspěšném pokusu: „název výrobku zatím neznáme“',/zatím neznáme/.test(c.rpKodRadekHTML({name:'X',ean:'999'},0)));

  console.log('── 📷 Přidat skenem (ruční účtenka) ──');
  let cil=null; c.eanSkenujPolozku=x=>{cil=x};
  const rr={store:'Penny',rucne:true,items:[{name:'',price:0,qty:1,itemCatId:'nak'}]}; c._editReceipt=rr;
  c.rpPridatSkenem();
  t('použije prázdnou položku (nepřidá novou) a otevře skener bez zkratky',rr.items.length===1&&cil&&cil.i===0&&cil.raw===''&&cil.obchod==='Penny');
  rr.items[0].ean='111'; rr.items[0].eanNazev='Orion Milena mléčná tyčinka';
  cil.hotovo('111',PROD['111']);
  t('po skenu: název z kódu, kategorie odhadnutá, cena zůstává prázdná (Milan: bez automatické ceny)',rr.items[0].name==='Orion Milena mléčná tyčinka'&&rr.items[0].itemCatId==='sladke'&&rr.items[0].price===0,rr.items[0]);
  c.rpPridatSkenem();
  t('další sken přidá novou položku',rr.items.length===2&&cil.i===1);
  rr.items[1].name='Můj název'; cil.hotovo('222',PROD['222']);
  t('ručně napsaný název se nepřepíše',rr.items[1].name==='Můj název');
  t('tlačítko „📷 Přidat skenem“ jen u ruční účtenky',/\$\{r\.rucne \? `<button class="btn btn-ghost btn-sm" onclick="rpPridatSkenem\(\)"/.test(rc));
  t('editor kreslí řádek pod názvem a dočítá názvy',/\$\{rpKodRadekHTML\(it, i\)\}/.test(rc)&&/rpKodNazvyNacti\(r\);/.test(rc));
  console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
})();
