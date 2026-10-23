// FinanceFlow · smoke test · Session 27 (v11.92) · Mapa položek podle čárového kódu (FIX-485) + ruční účtenka
//  Milan: „u Mileny (čoko) se do karty nezapsal alias – kupoval jsem ji 2× v různých obchodech“
//         „BL Luštěninové chipsy 65g – kupoval jsem 3 různé druhy a název zůstal stejný“
//         „je možné přidat účtenku i ručně? zatím tuto možnost nevidím“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), sp=R('statistika-polozek.js','../js/statistika-polozek.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const ulozeno=[], smazano=[];
const c={console,getData:()=>({categories:[]}),rpMapaNavrh:()=>({}),rpOsobniVolba:()=>null,normName:t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(),
  saveCategoryMapping:async(n,cat,sub)=>{ulozeno.push([n,cat,sub])},deleteCategoryMapping:async n=>{smazano.push(n)},showToast(){},rpNakupCat:()=>({id:'nak',name:'Nákup'})};
vm.createContext(c);
vm.runInContext(['mapaUzivData','mapaAliasySkupiny','mapaUzivFiltruj','_mapaNazvySkupiny','mapaUzivZmen','mapaUzivZrus','rcptRucniUctenka'].map(n=>{try{return (/^mapaUziv(Zmen|Zrus)$/.test(n)?'async ':'')+pick(rc,n)}catch(e){return '/* '+e.message+' */'}}).join('\n')
  +'\nlet _mapaUziv=[], _mapaSynt=[], _mapaUzivReceipts=[]; const MAPA_SYNT=100000; function mapaSyntPolozka(ean){return {klic:"ean_"+ean,ean,synt:true}}\n'
  +pick(rc,'mapaKartaIndex')+'\nfunction _mapaPoZmene(){}\n'+pick(sp,'spRadky')+'\nfunction spNazevKodu(){return ""}',c);

const RC=[
  {store:'Penny',date:'2026-10-01',items:[{name:'MILENA COKO 100G',price:39,ean:'8594001234567'}]},
  {store:'Albert',date:'2026-10-10',items:[{name:'Milena čokoláda',price:42,ean:'8594001234567'}]},
  {store:'Billa',date:'2026-10-05',items:[{name:'BL Luštěninové chipsy 65g',price:35,ean:'111'},{name:'BL Luštěninové chipsy 65g',price:35,ean:'222'}]},
  {store:'Billa',date:'2026-10-12',items:[{name:'BL Luštěninové chipsy 65g',price:35,ean:'333'},{name:'Rohlík',price:3,qty:10}]},
  {store:'Lidl',date:'2026-10-14',items:[{name:'Rohlík',price:3,qty:5}]},
];
const M=c.mapaUzivData(RC);
const milena=M.find(z=>z.ean==='8594001234567');
console.log('── Milena: stejný kód, dva názvy, dva obchody ──');
t('jedna karta pro stejný kód (dřív dvě)',M.filter(z=>z.ean==='8594001234567').length===1&&milena.klic==='ean:8594001234567'&&milena.pocet===2,M.map(z=>z.klic));
const al=c.mapaAliasySkupiny(milena);
t('karta ukáže oba názvy z účtenek, každý se svým obchodem',al.length===2&&al.some(a=>a.nazev==='MILENA COKO 100G'&&a.obchody.includes('Penny'))&&al.some(a=>a.nazev==='Milena čokoláda'&&a.obchody.includes('Albert')),al);
t('název karty = poslední nákup',milena.nazev==='Milena čokoláda');
console.log('── chipsy: jeden název, tři kódy ──');
const ch=M.filter(z=>/chipsy/i.test(z.nazev));
t('tři karty, každá se svým kódem (dřív jedna s posledním kódem 333)',ch.length===3&&['111','222','333'].every(e=>ch.some(z=>z.ean===e&&z.pocet===1)),ch.map(z=>[z.ean,z.pocet]));
console.log('── položky bez kódu dál podle názvu ──');
const roh=M.filter(z=>z.nazev==='Rohlík');
t('Rohlík bez kódu ze dvou obchodů = jedna karta podle názvu',roh.length===1&&roh[0].klic==='rohlik'&&roh[0].pocet===2);
console.log('── karta podle kódu, hledání, Statistika položek ──');
vm.runInContext('_mapaUziv='+JSON.stringify(M),c);
t('mapaKartaIndex(kód) najde skupinu podle kódu',c.mapaKartaIndex('8594001234567')===M.indexOf(milena));
t('hledání najde kartu i podle staršího názvu z účtenky („milena coko“)',c.mapaUzivFiltruj(M,{stav:'vse',hledat:'milena coko',oblast:''}).length===1);
const sr=c.spRadky(RC,M,{categories:[]});
t('Statistika položek: položka s kódem se napojí na skupinu podle kódu',sr.filter(x=>x.ean==='8594001234567').every(x=>x.mapaI===M.indexOf(milena))&&sr.find(x=>x.nazev==='Rohlík').mapaI===M.indexOf(roh[0]),sr.map(x=>[x.nazev,x.mapaI]));
console.log('── kategorie platí pro všechny názvy skupiny ──');
(async()=>{
  const iM=M.indexOf(milena);
  await c.mapaUzivZmen(iM,'cat','sladkosti');
  t('„Zapamatovat kategorii“ uloží oba názvy (dřív jen poslední)',ulozeno.length===2&&ulozeno.some(x=>x[0]==='MILENA COKO 100G')&&ulozeno.some(x=>x[0]==='Milena čokoláda'),ulozeno);
  await c.mapaUzivZrus(iM);
  t('zrušení volby zruší oba názvy',smazano.length===2);
  console.log('── ✍️ ruční účtenka ──');
  const u=c.rcptRucniUctenka(new Date(2026,9,20));
  t('prázdná účtenka: dnešní datum, jedna prázdná položka, bez natištěné částky (kontrola součtu nehlásí rozdíl)',u.date==='2026-10-20'&&u.items.length===1&&u.items[0].name===''&&u.total===null&&u.rucne===true&&u.items[0].itemCatId==='nak');
  t('tlačítko „✍️ Zapsat účtenku ručně“ ve Skenovat',/onclick="rcptRucne\(\)"[^>]*>\s*✍️ Zapsat účtenku ručně/.test(rc));
  t('ruční zápis otevře stejný editor jako sken a nevolá AI',/function rcptRucne\(\)[\s\S]*?buildReceiptPreviewHTML\(receipt, 1\)[\s\S]*?initReceiptEditor\(\)/.test(rc)&&!/function rcptRucne\(\)[\s\S]{0,1200}WORKER_URL/.test(rc));
  console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
})();
