// S25 (v11.51) – tlačítko Zpět na telefonu (okno → předchozí stránka → Dashboard → dvojité Zpět
// pro odchod) a seznam „K vyřízení“ ve Skenovat (jen kódy bez názvu nebo bez položky z účtenky).
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i).slice(0,300));if(!c)bad++;};
const hp=R('helpers.js','../js/helpers.js'),es=R('ean-sken.js','../js/ean-sken.js');
const pick=(s,n)=>{let a=s.indexOf('function '+n+'(');if(a<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',a);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(a,k+1)}}};
console.log('── S25 · Zpět a K vyřízení ──');
// ── Zpět: simulace bez prohlížeče ──
const el=(id,o)=>Object.assign({id,style:{},classList:{_c:new Set(o&&o.cls||[]),contains(c){return this._c.has(c)},remove(c){this._c.delete(c)},add(c){this._c.add(c)}},remove(){body.children=body.children.filter(x=>x!==this)}},o||{});
const body={children:[],style:{}};
const modal=el('modalX',{cls:['overlay','open'],z:400}), sidebar=el('sidebar',{cls:[]});
const karta=el('mapaKarta',{z:10040}); karta.style.position='fixed'; karta.style.inset='0px';
body.children=[karta];
const kroky=[]; let back=0;
const sb={window:{_currentUser:{uid:'u'}},history:{back(){back++},pushState(){},replaceState(){}},Date,console,
  getComputedStyle:e=>({display:'block',visibility:'visible',zIndex:String(e.z||0)}),
  document:{body,getElementById:id=>id==='sidebar'?sidebar:id.startsWith('page-')?{}:null,querySelectorAll:q=>q.includes('.overlay.open')?[modal].filter(m=>m.classList.contains('open')):[]},
  curPage:'uctenky',showPage:(n)=>{kroky.push(n);sb.curPage=n;},showToast:t=>{sb.toast=t},
  mapaUzivKartaZavri:()=>{karta.remove();sb.kartaZavrena=1}};
sb.window=Object.assign(sb.window,{mapaUzivKartaZavri:sb.mapaUzivKartaZavri});
vm.createContext(sb);
vm.runInContext(hp.slice(hp.indexOf('const _ffZpet ='),hp.indexOf('function ffZpetInit('))+'\nvar curPage="uctenky";\nfunction showPage(n){kroky(n)}',sb);
vm.runInContext("_ffZpet.stack=['prehled','transakce'];",sb);
sb.kroky=n=>{kroky.push(n);vm.runInContext('curPage='+JSON.stringify(n),sb);};
vm.runInContext('ffZpetPopstate()',sb); t('Zpět 1: zavře nejvrchnější okno (karta výrobku nad modalem)',sb.kartaZavrena===1&&modal.classList.contains('open'));
vm.runInContext('ffZpetPopstate()',sb); t('Zpět 2: zavře modal',!modal.classList.contains('open')&&!kroky.length);
sidebar.classList.add('open'); vm.runInContext('ffZpetPopstate()',sb); t('Zpět 3: zavře otevřené menu',!sidebar.classList.contains('open'));
vm.runInContext('ffZpetPopstate()',sb); t('Zpět 4: předchozí stránka (Transakce)',kroky[0]==='transakce');
vm.runInContext('ffZpetPopstate()',sb); t('Zpět 5: Dashboard',kroky[1]==='prehled');
vm.runInContext('ffZpetPopstate()',sb); t('Zpět 6: na Dashboardu hláška „stiskni Zpět ještě jednou“, appka zůstane',/ještě jednou/.test(sb.toast)&&back===0);
vm.runInContext('ffZpetPopstate()',sb); t('Zpět 7 do 2,5 s: odchod z appky',back===1);
t('showPage si pamatuje předchozí stránku (ne při návratu)',hp.includes("if(typeof _ffZpet!=='undefined' && !_ffZpet.zpetBezi && typeof curPage!=='undefined' && curPage && curPage!==name)"));
t('strážce se obnoví i při dotyku (Chrome přeskakuje záznamy bez dotyku)',hp.includes("window.addEventListener('pointerdown', dotyk, { capture: true, passive: true });"));
t('na přihlašovací obrazovce se Zpět chová normálně',hp.includes("if (!window._currentUser && !(typeof _isLocalMode !== 'undefined' && _isLocalMode)) { history.back(); return; }"));
// ── K vyřízení ──
const D={receipts:[{store:'Lidl',date:'2026-10-08',items:[{name:'KOSTICI JOG.VAN',ean:'A'},{name:'JOGURT BILY 150G',ean:'B'}]}],
  uiCfg:{eanSken:[{e:'A',k:1},{e:'B',k:2},{e:'C',k:3},{e:'D',k:4}]}};
const se={escHtml:s=>String(s),_eanProdukty:{A:{stav:'nalezeno',nazev:'Kostíci jogurt vanilka',nazevCesky:true,znacka:'Danone'},B:null,C:{stav:'nalezeno',nazev:'Kostíci barvíci',nazevCesky:true},D:null},_eanMojeNazvy:{},Date,Set,Object,String,S:D};
vm.createContext(se);vm.runInContext(['eanProduktZCache','eanNazevVyrobku','eanNaskenovane','eanNazvyZUctenek','eanKVyrizeni','eanNaskenovaneHTML'].map(n=>pick(es,n)).join('\n'),se);
const kv=se.eanKVyrizeni(D);
t('vyřízený výrobek (název + přiřazený) zmizí, zůstanou 3',kv.length===3&&!kv.some(x=>x.ean==='A'),kv.map(x=>x.ean));
const b=kv.find(x=>x.ean==='B'),c=kv.find(x=>x.ean==='C'),d=kv.find(x=>x.ean==='D');
t('přiřazený, ale databáze nezná → chybí název, ukáže se název z účtenky',b.bezNazvu&&b.prirazeno&&b.zUct[0]==='JOGURT BILY 150G');
t('známý, ale nepřiřazený → jen přiřadit',!c.bezNazvu&&!c.prirazeno);
t('neznámý a nepřiřazený → obojí',d.bezNazvu&&!d.prirazeno);
let h=se.eanNaskenovaneHTML(D);
t('seznam: „K vyřízení (3)“, název z účtenky, tlačítka Zapiš název / Přiřadit',h.includes('K vyřízení (3)')&&h.includes('📝 JOGURT BILY 150G')&&(h.match(/✍️ Zapiš název/g)||[]).length===2&&(h.match(/🔗 Přiřadit k položce/g)||[]).length===2);
se._eanMojeNazvy.B={nazev:'Bílý jogurt'};se._eanMojeNazvy.D={nazev:'Neznámé'};D.receipts[0].items.push({name:'X',ean:'C'},{name:'Y',ean:'D'});
h=se.eanNaskenovaneHTML(D);
t('všechno vyřízené → krátká věta s odkazem do Mých výrobků',h.includes('Naskenované výrobky jsou vyřízené (4)')&&h.includes('Moje výrobky'));
t('karta výrobku ukáže, co bylo na účtence (i u neznámého kódu)',(es.match(/\$\{naUct\}/g)||[]).length===2&&es.includes('🧾 Na účtence:'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
