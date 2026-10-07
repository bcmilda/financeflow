// S25 (katalog krok 4) – sdílené ceny po krajích: co se posílá, pojistky, souhrn, worker, pravidla DB, nastavení.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const src=R('ceny-kraje.js','../js/ceny-kraje.js'),wk=R('worker.js','../cloudflare-worker/worker.js','../worker.js'),rules=R('database.rules.json','../database.rules.json'),st=R('settings.js','../js/settings.js'),rc=R('receipts.js','../js/receipts.js'),lg=R('legal.html','../legal.html'),app=R('app.html','../app.html');
const kody={'ROHLÍK 43G':'01.113','PRAŽSKÁ VODKA':'02.110','PARALEN':'06.110','JAR 450ML':'05.611','MARLBORO':'02.200','ŽÁROVKA':'05.5.2'};
const sb={window:{},S:{uiCfg:{}},String,Math,Set,normName:s=>String(s).toLowerCase().replace(/\s*\d+\s*(g|ml)\b/g,'').trim(),normalizeStoreName:s=>String(s).toUpperCase(),
  productGroupLookup:n=>kody[n]?{code:kody[n]}:null,coicopNorm:c=>c.includes('.')&&c.split('.')[1].length>1?[c.split('.')[0],...c.split('.')[1].split('')].join('.'):c,
  baleniZNazvu:n=>/43G/.test(n)?{m:43,j:'g'}:null,lineAmt:it=>it.lineTotal!=null?it.lineTotal:(it.price||0)*(it.qty||1),rpVazene:it=>it.qty%1!==0};
sb.window=sb;vm.createContext(sb);vm.runInContext(src,sb);
console.log('── S25 · sdílené ceny po krajích ──');
const r={store:'Lidl',date:'2026-10-05',storeRegion:'Moravskoslezský',storeCity:'Ostrava',items:[
  {name:'ROHLÍK 43G',price:2.9,qty:6},{name:'PRAŽSKÁ VODKA',price:149.9,qty:1},{name:'PARALEN',price:59,qty:1},{name:'JAR 450ML',price:49.9,qty:1},{name:'MARLBORO',price:165,qty:1},{name:'ŽÁROVKA',price:89,qty:1},{name:'NEZNÁMÉ',price:10,qty:1},{name:'ROHLÍK 43G',price:2.9,qty:2}]};
const p=sb.cenyPozorovani(r);
t('posílá se jen kraj, řetězec, měsíc a výrobky – nic osobního',p&&p.kraj==='moravskoslezsky'&&p.obchod==='lidl'&&p.mesic==='2026-10'&&!JSON.stringify(p).includes('Ostrava'),p);
const ks=p.obs.map(o=>o.k);
t('potraviny, alkohol, tabák, drogerie ANO',ks.includes('n_rohlik_43g')&&ks.some(k=>k.includes('vodka'))&&ks.some(k=>k.includes('marlboro'))&&ks.some(k=>k.includes('jar')),ks);
t('lékárna, jiné zboží a neznámé NE',!ks.some(k=>/paralen|zarovka|nezname/.test(k)),ks);
t('stejný výrobek z účtenky jen jednou, cena za kus',ks.filter(k=>k==='n_rohlik_43g').length===1&&p.obs.find(o=>o.k==='n_rohlik_43g').c===2.9);
t('bez kraje se nic neposílá',sb.cenyPozorovani({...r,storeRegion:''})===null);
t('čárový kód = klíč napříč obchody',sb.cenyKlicVyrobku({name:'X',ean:'8003340805528'})==='e8003340805528');
sb.S.uiCfg.sdiletCeny=false; t('vypnuto v Nastavení → neposílá',sb.cenyZapnuto()===false); sb.S.uiCfg={};
t('výchozí stav zapnuto',sb.cenyZapnuto()===true);
const data={'2026-09':{lidl:{n:5,s:50,min:9,max:11,u:5,j:'ks'}},'2026-10':{lidl:{n:4,s:42,min:10,max:11,u:4,j:'ks'},penny:{n:2,s:25,min:12,max:13,u:2,j:'ks'}}};
const s=sb.cenySouhrn(data,false);
t('souhrn: nejnovější měsíc, pod 3 lidmi skryto',s.mesic==='2026-10'&&s.radky.length===1&&s.radky[0].obchod==='lidl'&&s.radky[0].prum===10.5&&s.skryto===1,s);
t('admin vidí i pod prahem',sb.cenySouhrn(data,true).radky.length===2);
t('worker: endpoint /ceny, jen souhrn, 1 údaj od člověka, kraj ze seznamu, max 25',wk.includes("pathname === '/ceny'")&&wk.includes('if (x && x.h && x.h[h]) continue;')&&wk.includes("CENY_KRAJE.includes(kraj)")&&wk.includes('.slice(0, 25)'));
t('pravidla DB: community/ceny čte přihlášený, zapisuje jen worker',/"ceny":\s*\{\s*"\.read":\s*"auth != null",\s*"\.write":\s*false/.test(rules));
t('Nastavení: přepínač, oznámení v Analýze účtenek, text v zásadách',st.includes('onchange="cenyNastav(this.checked)"')&&rc.includes('cenyInfoBannerHTML()')&&lg.includes('Sdílené ceny po krajích'));
t('odeslání při uložení účtenky + sekce na kartě + modul v app.html',rc.includes('cenyOdeslat(_ul)')&&rc.includes("sekce('Ceny v kraji'")&&app.includes('js/ceny-kraje.js?v='));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
