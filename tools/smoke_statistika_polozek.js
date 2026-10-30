// S25 – Statistika položek (statistika-polozek.js): řádky, filtry, seskupení, tabulka položek.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('statistika-polozek.js','../js/statistika-polozek.js'),'utf8');
const rc=fs.readFileSync(najdi('receipts.js','../js/receipts.js'),'utf8');
const app=fs.readFileSync(najdi('app.html','../app.html'),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const sb={window:{},Math,Date,String,Set,Object,normName:s=>String(s).toLowerCase().replace(/\s*\d+\s*(g|kg|ml|l)\b/g,'').trim(),normalizeStoreName:s=>String(s).toUpperCase(),
  lineAmt:it=>it.lineTotal!=null?it.lineTotal:(it.price||0)*(it.qty||1),rpVazene:it=>(it.qty%1)!==0,pgKodCsu:c=>c.replace('.','.').replace(/^(\d\d)\.(\d)(\d)(\d)$/,'$1.$2.$3.$4'),
  productGroupLookup:n=>/rohl/i.test(n)?{code:'01.113',group:'Chléb a pekařské výrobky'}:/vodka/i.test(n)?{code:'02.110',group:'Lihoviny'}:null,
  COICOP_GROUPS_DEF:[{id:1,name:'Potraviny a nealkoholické nápoje'},{id:2,name:'Alkoholické nápoje, tabák'}]};
sb.window=sb;vm.createContext(sb);vm.runInContext(src,sb);
const rec=[{date:'2026-10-02',store:'Lidl',items:[{name:'Rohlík',price:3,qty:10,tag:'Pečivo'},{name:'PRAŽSKÁ VODKA',price:149.9,qty:1,tag:'Lihoviny'}]},
  {date:'2026-09-15',store:'Penny',items:[{name:'Rohlík',price:2.5,qty:4,tag:'Pečivo'},{name:'KLOBÁSA',price:289,qty:0.192,lineTotal:55.49}]},
  {date:'2025-01-10',store:'Lidl',items:[{name:'Rohlík',price:2,qty:1}]}];
const mapa=[{klic:'rohlík',nazev:'Rohlík',tax:{oblastNazev:'Potraviny',podNazev:'Pečivo',nazev:'rohlík'},catId:'cat1',ean:''}];
const D={categories:[{id:'cat1',name:'Jídlo',icon:'🛒'}]};
const r=sb.spRadky(rec,mapa,D);
console.log('── S25 · Statistika položek ──');
t('řádek na každou položku, s COICOP v zápisu ČSÚ a taxonomií',r.length===5&&r[0].coicop==='01.1.1.3'&&r[0].oblast==='Potraviny'&&r[0].kat==='🛒 Jídlo'&&r[0].mapaI===0,r[0]);
t('vážené zboží: částka z účtenky, cena za kg',r[3].castka===55.49&&Math.round(r[3].cenaJed)===289&&r[3].vazene);
const dnes=new Date(2026,9,6);
t('období 12 měsíců vyřadí starší nákupy',sb.spFiltruj(r,{obdobi:'12'},dnes).length===4);
t('filtr oddílu COICOP 02 = jen alkohol',sb.spFiltruj(r,{obdobi:'vse',coicop:'02'},dnes).length===1);
t('filtr třídy 01.1.1.3 = rohlíky',sb.spFiltruj(r,{obdobi:'vse',coicop:'01.1.1.3'},dnes).length===3);
t('filtr obchod + štítek',sb.spFiltruj(r,{obdobi:'vse',obchod:'LIDL',stitek:'Pečivo'},dnes).length===1);
t('jen s čárovým kódem',sb.spFiltruj(r,{obdobi:'vse',kod:true},dnes).length===0);
const g=sb.spSeskup(sb.spFiltruj(r,{obdobi:'vse'},dnes),'csu');
t('seskupení podle skupiny ČSÚ, seřazené podle útraty',g[0].klic.startsWith('02.1.1.0')&&g.some(x=>x.klic==='— nezařazeno v COICOP'),g.map(x=>x.klic));
t('seskupení podle oddílu má název z číselníku',sb.spSeskup(r,'oddil').some(x=>x.klic==='01 · Potraviny a nealkoholické nápoje'));
const p=sb.spPolozky(r).find(x=>x.klic==='rohlík');
t('tabulka položek: útrata, počet, nejlevnější obchod',p.castka===42&&p.pocet===3&&p.nejlevneji&&p.obchodu===2,p);
t('záložka v Analýze účtenek + modul v app.html',rc.includes("id=\"utab-polstat\"")&&rc.includes("tab==='polstat'")&&app.includes('js/statistika-polozek.js?v='));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
