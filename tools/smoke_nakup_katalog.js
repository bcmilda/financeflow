// FinanceFlow · smoke test · Session 27 (v12.10) · Nákupní seznam: našeptávač bez dvojic
//  Milan: „proč se mi objevují stejné názvy vícekrát? A proč je jednou s cenou a podruhé cena neznámá?“
//  · „ponechej mi našeptávač, stačí mi cena, počet skenů nechci, ať se nepřekrývá název s cenou“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const S={nakupList:[{id:'1',name:'Activia kefír borůvka 280g',catalogKey:'activia_kefír_borůvka_280g',alertPct:10,refPrice:25}]};
const el={nakupCatalogSuggest:{style:{},innerHTML:''}};
const c={console,Math,JSON,String,Object,Map,Set,Array,S,viewingUid:null,save(){c.ulozeno=(c.ulozeno||0)+1},fmtP:v=>String(v).replace('.',','),
  document:{getElementById:id=>el[id]||null},_get:async()=>({exists:()=>true,val:()=>c._db}),_ref:()=>null,_db:null};
c.window=c; vm.createContext(c);
vm.runInContext(R('helpers.js','../js/helpers.js'),c);
vm.runInContext(R('nakup.js','../js/nakup.js')+'\n;this._kat=()=>_nakupCatalog;',c);
//  stav komunitního katalogu jako u Milana: staré názvy bez ceny, staré klíče s cenou, nové klíče s cenou
c._db={
  'activia_ananas_270g':{name:'Activia ananas 270g'},
  'activia ananas':{name:'Activia ananas 270g',latestPrice:21.9,latestDate:'2026-10-01'},
  'activia_kefir_borůvka_280g':{name:'Activia kefir borůvka 280g'},
  'activia_kefír_borůvka_280g':{name:'Activia kefír borůvka 280g'},
  'activia_kefír_borůvka':{name:'Activia kefír borůvka 280g',latestPrice:19.9,latestDate:'2026-05-02'},
  'activia kefir boruvka':{name:'Activia kefir borůvka 280g',latestPrice:21.9,latestDate:'2026-10-12',priceCount:4},
  'apotheke malina jahoda s echinaceou caj x':{name:'Apotheke Malina+jahoda s echinaceou čaj 20x2g',latestPrice:61,latestDate:'2026-09-09'}};
(async()=>{
  await c.nakupLoadCatalog();
  console.log('── sloučení ──');
  const g=c.nakupKatalogSkupiny(c._kat());
  t('7 záznamů → 3 výrobky',g.length===3,g.map(x=>x.name));
  const kef=g.find(x=>/kef/.test(x.name));
  t('kefir/kefír a staré klíče = 1 řádek, cena z nejnovějšího záznamu s cenou (21,90 z 12. 10.)',kef.latestPrice===21.9&&kef.key==='activia kefir boruvka'&&kef.clenove.length===4,kef);
  t('název nejčitelnější (s diakritikou)',kef.name==='Activia kefír borůvka 280g'||kef.name==='Activia kefir borůvka 280g');
  console.log('── našeptávač ──');
  await c.nakupShowCatalogSuggest('Ac');
  const h=el.nakupCatalogSuggest.innerHTML;
  t('„Ac“ → 3 řádky (ananas, kefír, čaj s echinaceou) místo 7, žádná „cena neznámá“',(h.match(/onclick=/g)||[]).length===3&&!/cena neznámá/.test(h),h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
  t('bez počtu skenů',!/sken/.test(h));
  t('název se zalomí, cena má místo vpravo (nepřekrývá se)',/flex:1;min-width:0;overflow-wrap:anywhere/.test(h)&&/flex-shrink:0;white-space:nowrap/.test(h));
  await c.nakupShowCatalogSuggest('kefir');
  t('hledání bez diakritiky najde „kefír“',/kef[ií]r borůvka/.test(el.nakupCatalogSuggest.innerHTML));
  console.log('── vazba na cenu ──');
  t('výběr řádku bez ceny se naváže na záznam s cenou',c.nakupKanonKlic('activia_ananas_270g','Activia ananas 270g')==='activia ananas');
  t('položka už v seznamu navázaná na záznam bez ceny se přepojila (hlídač ceny bude fungovat)',S.nakupList[0].catalogKey==='activia kefir boruvka'&&c.ulozeno===1,S.nakupList[0]);
  console.log('── zápis do katalogu ──');
  const rc=R('receipts.js','../js/receipts.js');
  t('názvy z účtenek se zapisují pod stejný klíč jako ceny a jen jako název (nepřepíšou cenu)',/updates\['catalog\/items\/'\+key\+'\/name'\] = it\.name;/.test(rc)&&/nakupNormKey\(it\.name\)/.test(rc)&&!/updates\['catalog\/items\/'\+key\] = \{name: it\.name\}/.test(rc));
  console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
})();
