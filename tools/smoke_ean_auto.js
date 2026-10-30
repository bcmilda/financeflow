// FinanceFlow · smoke test · S26 (v11.64) · automatické přiřazení kódu podle „obchod + zkratka“
//  Milan: „při příštím nákupu stejného výrobku ve stejném obchodě se položka sama přiřadí –
//  nebudu muset znovu skenovat EAN; místo fotoaparátu bude fajfka.“
const vm=require('vm'),fs=require('fs'),path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const el=()=>({style:{},innerHTML:'',remove(){},appendChild(){}});
const EAN_MLEKO='8595237405947', EAN_JOG='8594001021000', EAN_JINY='8590000000008', EAN_DALSI='8591234000000';
let db={}, fetchy=0;
const ctx={console,document:{getElementById:()=>el(),createElement:()=>el(),body:{appendChild(){}},head:{appendChild(){}},querySelectorAll:()=>[]},
  navigator:{},setTimeout,clearTimeout,URL,Promise,Date,Math,Object,Array,Set,JSON,String,Number,
  fetch:async u=>{ fetchy++; const m=/firebasedatabase\.app\/(.+?)\.json/.exec(u); const v=m?db[m[1]]:undefined;
    return {ok:true,status:200,json:async()=>v===undefined?null:JSON.parse(JSON.stringify(v))}; }};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js'),ctx);
const rc=R('receipts.js'); const i=rc.indexOf('function normalizeStoreName'); const j=rc.indexOf('\n}\n',i)+3;
vm.runInContext(rc.slice(i,j),ctx);
vm.runInContext(R('ean-sken.js'),ctx);
vm.runInContext('var S={receipts:[],transactions:[],uiCfg:{}}; var viewingUid=null;',ctx);
let ok=0,bad=0;const t=(n,c)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n)}};
const K=(o,z)=>ctx.eanAliasKlic(o,z);

console.log('── S26 · výběr kódu pro zkratku ──');
const kM=K('Lidl','MLEKO POLOT. 1,5% 1L');
t('tvoje spojení má přednost před komunitou',
  ctx.eanKodProKlic(kM,{[kM]:{ean:EAN_MLEKO}},{[kM]:{[EAN_JINY]:9}},{}).ean===EAN_MLEKO);
t('komunita: jeden kód = automaticky (rozhodnutí Milana)',
  JSON.stringify(ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:1}},{}))===JSON.stringify({ean:EAN_MLEKO,zdroj:'komunita'}));
t('komunita: jasně vedoucí kód vyhraje',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:3,[EAN_JINY]:1}},{}).ean===EAN_MLEKO);
t('komunita: remíza = nic (falešná shoda je horší než žádná)',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:2,[EAN_JINY]:2}},{})===null);
t('odebraný kód se nevrátí',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:5}},{[kM]:{[EAN_MLEKO]:1}})===null);
t('revize #1: po odebrání vedoucího se NEbere druhý v pořadí',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:3,[EAN_JINY]:1}},{[kM]:{[EAN_MLEKO]:1}})===null);
t('revize #1: odebrané obě → nic, ani střídavě',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:3,[EAN_JINY]:1}},{[kM]:{[EAN_MLEKO]:1,[EAN_JINY]:2}})===null);
t('revize #2: odebraný kód se nevrátí ani z tvého spojení (server ho nesmazal)',ctx.eanKodProKlic(kM,{[kM]:{ean:EAN_MLEKO}},{},{[kM]:{[EAN_MLEKO]:1}})===null);
t('starší tvar odmítnutí (text) se čte taky',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:5}},{[kM]:EAN_MLEKO})===null);
t('neplatný kód z komunity se ignoruje',ctx.eanKodProKlic(kM,{}, {[kM]:{'123':5}},{})===null);
t('nula potvrzení = nic',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:0}},{})===null);

console.log('── S26 v11.68 · zámek od admina ──');
const zam={[kM]:{ean:EAN_JINY,kdy:1}};
t('zámek má přednost před komunitou (i proti víc potvrzením)',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:9}},{},zam).ean===EAN_JINY&&ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:9}},{},zam).zdroj==='zamek');
t('tvoje vlastní spojení má přednost před zámkem',ctx.eanKodProKlic(kM,{[kM]:{ean:EAN_MLEKO}},{},{},zam).ean===EAN_MLEKO);
t('zamčený kód, který sis odebral, nedostaneš – a komunita ho nenahradí jiným',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:9}},{[kM]:{[EAN_JINY]:1}},zam)===null);
t('zámek s neplatným kódem se ignoruje',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:2}},{},{[kM]:{ean:'123'}}).ean===EAN_MLEKO);
t('bez zámků se chová jako dřív',ctx.eanKodProKlic(kM,{}, {[kM]:{[EAN_MLEKO]:2}},{},{}).ean===EAN_MLEKO);

console.log('── doplnění položek ──');
{
  const it=[{name:'MLEKO POLOT. 1,5% 1L'},{name:'JOGURT BILY',ean:EAN_JINY},{name:'ROHLIK'}];
  const n=ctx.eanDoplnSeznam(it,'LIDL ČESKÁ REPUBLIKA v.o.s.',{[kM]:{ean:EAN_MLEKO}},{},{},e=>e===EAN_MLEKO?'Mléko Pilos 1,5 %':'');
  t('stejný obchod (jinak napsaný) + stejná zkratka → kód',it[0].ean===EAN_MLEKO&&n===1);
  t('doplní i název výrobku (pro Inflaci)',it[0].eanNazev==='Mléko Pilos 1,5 %');
  t('kód, který položka už má, se nepřepíše',it[1].ean===EAN_JINY);
  t('neznámá zkratka zůstane bez kódu (📷)',!it[2].ean);
  const jinde=[{name:'MLEKO POLOT. 1,5% 1L'}];
  ctx.eanDoplnSeznam(jinde,'Albert',{[kM]:{ean:EAN_MLEKO}},{},{},null);
  t('jiný obchod se stejnou zkratkou se NEpřiřadí',!jinde[0].ean);
}

console.log('── editor nové účtenky ──');
(async()=>{
  ctx._currentUser={uid:'U1',getIdToken:async()=>'T'};
  db={'users/U1/eanAliasy':{[kM]:{ean:EAN_MLEKO,kdy:1}}};
  await ctx.eanNactiAliasy(true);
  let kresli=0; ctx.rpRender=()=>kresli++;
  const kJ=K('Lidl','JOGURT BILY 150G');
  db['community/eanPodleNazvu/'+kJ]={[EAN_JOG]:2};
  const r={store:'Lidl',items:[{name:'MLEKO POLOT. 1,5% 1L'},{name:'JOGURT BILY 150G'},{name:'NEZNAMA VEC'}]};
  ctx._editReceipt=r;
  ctx.eanAutoEditor(r);
  t('tvoje spojení → ✅ hned při otevření editoru (synchronně)',r.items[0].ean===EAN_MLEKO);
  await new Promise(z=>setTimeout(z,30));
  t('komunitní spojení dočteno na pozadí → ✅ a editor překreslen',r.items[1].ean===EAN_JOG&&kresli===1);
  t('neznámá položka dál 📷',!r.items[2].ean);
  const html=rc.slice(rc.indexOf("${it.ean?'✅':'📷'}")-5, rc.indexOf("${it.ean?'✅':'📷'}")+25);
  t('tlačítko v editoru je jen ✅ (bez poznámky – Milan)',/it\.ean\?'✅':'📷'/.test(html));

  console.log('── doplnění starších dat ──');
  db={'users/U1/eanAliasy':{[kM]:{ean:EAN_MLEKO,kdy:1}},['community/eanPodleNazvu/'+kJ]:{[EAN_JOG]:1},
      ['community/eanProdukty/'+EAN_MLEKO]:{stav:'nalezeno',nazev:'Mléko Pilos polotučné 1,5 %'}};
  let ulozeno=0; ctx.save=()=>{ulozeno++}; ctx.ffRenderBezpecne=()=>{};
  vm.runInContext(`S={uiCfg:{},receipts:[
    {id:'r1',store:'Lidl',date:'2026-09-01',items:[{name:'MLEKO POLOT. 1,5% 1L',ean:'${EAN_MLEKO}',price:21.9}]},
    {id:'r2',store:'Lidl',date:'2026-10-05',items:[{name:'MLEKO POLOT. 1,5% 1L',price:22.9},{name:'JOGURT BILY 150G',price:12.9}]}],
    transactions:[{id:'t2',receiptStore:'Lidl',receiptItems:[{name:'MLEKO POLOT. 1,5% 1L'},{name:'JOGURT BILY 150G'}]}]};`,ctx);
  const S=()=>vm.runInContext('S',ctx);
  const predtim=ctx.eanMojeVyrobky(S()).find(z=>z.ean===EAN_MLEKO);
  t('NEGATIVNÍ KONTROLA: bez doplnění Moje výrobky počítají jen 1 nákup a starou cenu',predtim.nakupy===1&&predtim.cena===21.9);
  const n=await ctx.eanAutoDoplnVse(true);
  t('nový nákup dostal kód (mléko i jogurt, v účtence i transakci)',n===4&&S().receipts[1].items[0].ean===EAN_MLEKO&&S().receipts[1].items[1].ean===EAN_JOG);
  t('i položky v transakci (statistiky, Inflace)',S().transactions[0].receiptItems.every(x=>x.ean));
  t('název výrobku doplněn z databáze',S().receipts[1].items[0].eanNazev==='Mléko Pilos polotučné 1,5 %');
  t('uloženo jednou',ulozeno===1);
  const po=ctx.eanMojeVyrobky(S()).find(z=>z.ean===EAN_MLEKO);
  t('📦 Moje výrobky: 2 nákupy, poslední cena 22,9',po.nakupy===2&&po.cena===22.9);
  t('Ceny v kraji: oba nákupy pod stejným klíčem výrobku',
    (()=>{ const ck=R('ceny-kraje.js'); const a=ck.indexOf('function cenyKlicVyrobku'); if(a<0) return true;
      const b=ck.indexOf('\n}\n',a)+3; vm.runInContext(ck.slice(a,b),ctx);
      return ctx.cenyKlicVyrobku(S().receipts[0].items[0])===ctx.cenyKlicVyrobku(S().receipts[1].items[0]); })());

  const f0=fetchy; const n2=await ctx.eanAutoDoplnVse(false);
  t('podruhé do 10 minut nic nestahuje',n2===0&&fetchy===f0);
  vm.runInContext('viewingUid="PARTNER"',ctx);
  t('při prohlížení dat partnera nic nezapisuje',(await ctx.eanAutoDoplnVse(true))===0);
  vm.runInContext('viewingUid=null',ctx);

  console.log('── odebrání ──');
  ctx.eanZapamatujOdmitnuti(kJ,EAN_JOG); ctx.eanZapamatujOdmitnuti(kJ,EAN_DALSI);
  t('odebrané kódy se pamatují všechny (ne jen poslední)',!!S().uiCfg.eanOdmitnute[kJ][EAN_JOG]&&!!S().uiCfg.eanOdmitnute[kJ][EAN_DALSI]);
  ctx.eanZrusOdmitnuti(kJ,EAN_DALSI);
  t('vědomé přiřazení zruší odmítnutí jen toho kódu',!S().uiCfg.eanOdmitnute[kJ][EAN_DALSI]&&!!S().uiCfg.eanOdmitnute[kJ][EAN_JOG]);
  const nova=[{name:'JOGURT BILY 150G'}];
  ctx.eanDoplnSeznam(nova,'Lidl',{},{[kJ]:{[EAN_JOG]:4}},S().uiCfg.eanOdmitnute,null);
  t('po odebrání ho komunita u téže zkratky nevrátí',!nova[0].ean);
  const src=R('ean-sken.js');
  t('Odebrat volá zapamatování odmítnutí',/eanZapamatujOdmitnuti\(x\.klic, v\.ean\)/.test(src));
  t('editor nové účtenky volá automatické přiřazení',/eanAutoEditor\(r\)/.test(rc));
  t('sken v editoru taky ruší odmítnutí',/eanZrusOdmitnuti\(klic, v\.ean\)/.test(src));

  console.log('── revize: účty, offline, transakce ──');
  // #4 jiný účet na stejném zařízení
  db={'users/U1/eanAliasy':{[kM]:{ean:EAN_MLEKO,kdy:1}}};
  ctx._currentUser={uid:'U1',getIdToken:async()=>'T'}; await ctx.eanAutoDoplnVse(true);
  ctx._currentUser={uid:'U2',getIdToken:async()=>'T'};
  db={'users/U2/eanAliasy':{}};
  const cizi={store:'Lidl',items:[{name:'MLEKO POLOT. 1,5% 1L'}]}; ctx._editReceipt=cizi;
  ctx.eanAutoEditor(cizi); await new Promise(z=>setTimeout(z,30));
  t('revize #4: spojení účtu U1 se nedostane do účtenky U2',!cizi.items[0].ean);
  ctx._currentUser=null;
  const odhl={store:'Lidl',items:[{name:'MLEKO POLOT. 1,5% 1L'}]}; ctx.eanAutoEditor(odhl);
  t('odhlášený: nic se nedoplní',!odhl.items[0].ean);
  // #5 offline
  ctx._currentUser={uid:'U2',getIdToken:async()=>'T'};
  ctx.navigator.onLine=false; const f1=fetchy;
  await ctx.eanNactiKomunitu(['lidl__neco_1','lidl__neco_2']);
  t('revize #5: offline se komunita nestahuje',fetchy===f1);
  ctx.navigator.onLine=true;
  // transakce bez účtenky dostane komunitní kód
  const kT=K('Lidl','SYR EIDAM 30% 100G');
  db={'users/U2/eanAliasy':{},['community/eanPodleNazvu/'+kT]:{[EAN_DALSI]:2}};
  vm.runInContext(`S={uiCfg:{},receipts:[{id:'x',store:'Lidl',items:[]}],transactions:[{id:'t9',receiptStore:'Lidl',receiptItems:[{name:'SYR EIDAM 30% 100G'}]}]}`,ctx);
  await ctx.eanAutoDoplnVse(true);
  t('revize: položka jen v transakci dostane i komunitní kód',S().transactions[0].receiptItems[0].ean===EAN_DALSI);

  console.log('── Inflace: název výrobku ──');
  const inf=R('inflace.js');
  vm.runInContext(inf.slice(inf.indexOf('const _median'),inf.indexOf('\n',inf.indexOf('const _median'))+1),ctx);
  const a=inf.indexOf('function _inflCompute'); vm.runInContext(inf.slice(a,inf.indexOf('\n}\n',a)+3),ctx);
  const ob=(ean,nv,d,p)=>({key:'mleko|ks',name:'MLEKO POLOT. 1,5% 1L',ean,nazevVyrobku:nv,store:'Lidl',date:d,ts:Date.parse(d),unit:'ks',unitPrice:p,spend:p});
  let rows=ctx._inflCompute([ob(EAN_MLEKO,'Mléko Pilos 1,5 %','2026-01-05',21),ob(EAN_MLEKO,'Mléko Pilos 1,5 %','2026-09-05',23)]).rows;
  t('stejný kód v celém řádku → název výrobku místo zkratky',rows[0].name==='Mléko Pilos 1,5 %');
  rows=ctx._inflCompute([ob(EAN_MLEKO,'Mléko Pilos 1,5 %','2026-01-05',21),ob('', '', '2026-09-05',23)]).rows;
  t('část nákupů bez kódu → zůstane zkratka (nic se nepředstírá)',rows[0].name==='MLEKO POLOT. 1,5% 1L');
  rows=ctx._inflCompute([ob(EAN_MLEKO,'Mléko A','2026-01-05',21),ob(EAN_JINY,'Mléko B','2026-09-05',23)]).rows;
  t('dva různé kódy pod jednou zkratkou → zkratka',rows[0].name==='MLEKO POLOT. 1,5% 1L');

  console.log(bad?`\n❌ SELHALO ${bad}`:`\n✅ AUTOMATICKÉ PŘIŘAZENÍ OVĚŘENO (${ok})`);
  process.exit(bad?1:0);
})().catch(e=>{console.log('❌ výjimka',e);process.exit(1);});
