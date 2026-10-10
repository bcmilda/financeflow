// S25 (v11.49) – 📦 Moje výrobky (Analýza účtenek → Mapa položek) a 🔎 fotky bez účtenky (Doklady).
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i).slice(0,300));if(!c)bad++;};
const es=R('ean-sken.js','../js/ean-sken.js'),rc=R('receipts.js','../js/receipts.js');
const pick=(s,n)=>{let a=s.indexOf('function '+n+'(');let d=0,j=s.indexOf('{',a);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(a,k+1)}}};
console.log('── S25 · Moje výrobky a fotky bez účtenky ──');
const D={receipts:[{store:'Lidl',date:'2026-10-01',items:[{name:'MLEC.COKOL.LINDT 100G',price:59.9,ean:'111'},{name:'ROHLIK',price:3}]},
                   {store:'Albert',date:'2026-10-05',items:[{name:'LINDT MLECNA 100G',price:64.9,ean:'111'},{name:'JOGURT BILY',price:12.9,ean:'222'}]}],
         uiCfg:{eanSken:[{e:'333',k:Date.parse('2026-10-07')},{e:'111',k:Date.parse('2026-09-01')}]}};
const sb={escHtml:s=>String(s).replace(/</g,'&lt;'),normName:t=>String(t||'').toLowerCase(),_eanProdukty:{'111':{stav:'nalezeno',nazev:'Lindt Excellence',nazevCs:'Mléčná čokoláda',znacka:'Lindt',mnozstvi:{hodnota:100,jednotka:'g'},nutrice:{kcal:530},nutriscore:'e'},'222':{stav:'nalezeno',nazev:'Natural Yoghurt'},'333':null},
  _eanMojeNazvy:{},EAN_NUTRI_BARVA:{e:'#e63e11'},Date,Math,Object,Set,String};
vm.createContext(sb);
vm.runInContext("var _eanMoje={f:'vse',q:'',vic:false};\n"+['eanProduktZCache','eanNazevVyrobku','eanMojeVyrobky','eanMojeStav','eanMojeVyrobkyHTML'].map(n=>pick(es,n)).join('\n'),sb);
const v=sb.eanMojeVyrobky(D);
t('výrobky z účtenek i čistých skenů, nejnovější nahoře',v.length===3&&v[0].ean==='333'&&v.find(x=>x.ean==='111').nakupy===2,v.map(x=>x.ean));
const l=v.find(x=>x.ean==='111');
t('Lindt: 2× koupeno, 2 obchody, poslední cena z posledního nákupu, obě zkratky',l.obchody.length===2&&l.cena===64.9&&l.posledni==='2026-10-05'&&l.nazvy.length===2);
t('čistý sken bez účtenky = nepřiřazený; databáze ho nezná',sb.eanMojeStav(v[0],null).neprirazeny&&sb.eanMojeStav(v[0],null).neznamy);
t('jogurt bez živin a bez českého názvu',(s=>s.bezZivin&&s.bezCz&&!s.neprirazeny)(sb.eanMojeStav(v.find(x=>x.ean==='222'),sb._eanProdukty['222'])));
let h=sb.eanMojeVyrobkyHTML(D);
t('karta: název, značka, gramáž, 2× koupeno, cena, Nutri-Score, štítek „kompletní“',h.includes('Mléčná čokoláda')&&h.includes('Lindt · 100 g · 2× koupeno')&&h.includes('64,9 Kč')&&h.includes('✓ kompletní')&&h.includes('>E<'));
t('filtry Vše 3 / Nepřiřazené 1 / Chybí údaje 2',/Vše <span[^>]*>3/.test(h)&&/Nepřiřazené <span[^>]*>1/.test(h)&&/Chybí údaje <span[^>]*>2/.test(h));
vm.runInContext("_eanMoje.f='neprirazene'",sb); h=sb.eanMojeVyrobkyHTML(D);
t('filtr Nepřiřazené ukáže jen sken bez účtenky',h.includes('Kód 333')&&!h.includes('Mléčná čokoláda'));
vm.runInContext("_eanMoje.f='vse';_eanMoje.q='mlecna'",sb); h=sb.eanMojeVyrobkyHTML(D);
t('hledání i podle zkratky z účtenky („mlecna“)',h.includes('Mléčná čokoláda')&&!h.includes('Kód 333'));
t('klepnutí otevře kartu výrobku',h.includes("eanOtevriKartu('111')"));   // v11.61 (TODO-333): stejná karta jako Mapa položek
t('čisté skeny se pamatují až 300 (dřív 40)',es.includes('S.uiCfg.eanSken = a.slice(0, 300);'));
t('Moje výrobky mají vlastní záložku a kreslí se při otevření (v11.55)',rc.includes('<div class="eanMojeBox" data-samostatne="1"></div>')&&/if\(tab==='vyrobky' && typeof eanMojeVyrobkyKresli==='function'\) \{\s*eanMojeVyrobkyKresli\(\);/.test(rc));
// fotky bez účtenky
const sd={};vm.createContext(sd);vm.runInContext([pick(rc,'rpFotky'),pick(rc,'dokladySirotci')].join('\n'),sd);
const ts=Date.parse('2026-10-08T19:00:00Z');
const rec=[{store:'Lidl',addedAt:ts-60000},{store:'Penny',addedAt:ts-86400000,photoKey:'u/x/aaa-rc.jpg',photoKeys:['u/x/aaa-rc.jpg']}];
const sir=sd.dokladySirotci([{key:'u/x/aaa-rc.jpg',size:1},{key:'u/x/'+ts.toString(36)+'-u.jpg',size:250000,uploaded:new Date(ts).toISOString()}],rec);
t('fotka připojená k účtence se nehlásí, osiřelá ano',sir.length===1&&sir[0].key.endsWith('-u.jpg'));
t('doporučí účtenku uloženou nejblíž času nahrání (Lidl, minuta před)',sir[0].tip===0);
t('bez data nahrání se čas vezme z názvu souboru',sd.dokladySirotci([{key:'u/x/'+ts.toString(36)+'-u.jpg'}],rec)[0].ts===ts);
t('Doklady: tlačítko „Najít fotky bez účtenky“ i v prázdném stavu',(rc.match(/\$\{dokladySirotciBlok\(\)\}/g)||[]).length===2);
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
