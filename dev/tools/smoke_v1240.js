// FinanceFlow · smoke test · S28 (v12.40) · kurzy ČNB, datum účtenky, Historie (Milan, 8. 11.)
//  „proč se platba z Doručených přepočítává pevným kurzem, když máme kurzy od ČNB? mám peněženku v eurech“
//  „co když zadám platbu v cizí měně zpětně? přepočítá se kurzem toho data, nebo dnešního?“
//  „transakce byla 29. 9. 2026, ale vidím ji 2. 10. 2026, i když účtenka hovoří jasně – chyba s propojením“
//  „do Analýza účtenek → Historie přidat filtr ceny a oddělovač měsíců (žlutá čára s názvem měsíce)“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), deb=R('debts.js','../js/debts.js'), ib=R('inbox.js','../js/inbox.js'), ui=R('ui.js','../js/ui.js'), html=R('app.html','../app.html');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);if(s.slice(i-6,i)==='async ')i-=6;let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
(async()=>{
console.log('── Doručené: cizí měna kurzem ČNB ke dni platby, ne pevně 25 Kč/€ ──');
const ulozene=[];
const S={transactions:[],uiCfg:{},wallets:[{id:'we',currency:'EUR'},{id:'wk',currency:'CZK'}]};
const DOM={};
const c={S,console,Date,Math,JSON,Object,String,Number,parseFloat,isFinite,Promise,
  _FX_RATES:{EUR:25.3,USD:23.1},
  fxRatesForDate:async d=>d==='2026-11-06'?{rates:{EUR:24.31,USD:21.02},date:'06.11.2026'}:null,
  document:{getElementById:id=>DOM[id]||null},window:{},save:()=>ulozene.push(1),showToast:()=>{},alert:()=>{},
  getData:()=>S, inboxRender:()=>{}, uid:()=>'u'+Math.random().toString(36).slice(2)};
vm.createContext(c);
vm.runInContext(['inboxPrijmout'].map(n=>pick(ib,n)).join('\n')+`
var S=this.S; var _inbox={};
function _inboxStav(){return Promise.resolve()} function _inboxDupyVyrid(){return Promise.resolve()}
function inboxIdent(){return ''} function inboxProtiucet(){return ''} function inboxTypPlatby(){return ''}
var _rozp={}; function inboxRozpoznej(x){return _rozp[x.k]}
this.nastav=(id,x,p)=>{_inbox[id]=x;_rozp[x.k]=p};`,c);
c.nastav('n1',{k:'a',postedAt:1},{type:'income',amount:20,currency:'EUR',merchant:'DAVID SIMOTA',bank:'Revolut',date:'2026-11-06'});
DOM['ib_wal_n1']={value:'we'}; DOM['ib_cat_n1']={value:'cat9'};
await c.inboxPrijmout('n1');
let tx=S.transactions[0];
t('20 € do eurové peněženky: částka 20 EUR (ne 500 Kč)',tx&&tx.amount===20&&tx.currency==='EUR'&&tx.wallet==='we',tx);
t('Kč kurzem ČNB ke dni platby (6. 11.: 20 × 24,31 = 486,20) + referenční kurz',tx&&tx.amtCZK===486.2&&tx.fxRef===24.31&&tx.fxRefDate==='06.11.2026',tx);
c.nastav('n2',{k:'b',postedAt:2},{type:'expense',amount:10,currency:'USD',merchant:'Shop',bank:'Revolut',date:'2026-10-01'});
DOM['ib_wal_n2']={value:'wk'}; DOM['ib_cat_n2']={value:'cat1'};
await c.inboxPrijmout('n2'); tx=S.transactions[1];
t('lístek ke dni nejde stáhnout → kurz z appky (10 × 23,1 = 231), bez referenčního kurzu',tx&&tx.amount===10&&tx.currency==='USD'&&tx.amtCZK===231&&tx.fxRef==null,tx);
c.nastav('n3',{k:'c',postedAt:3},{type:'expense',amount:150,currency:'CZK',merchant:'Albert',bank:'KB',date:'2026-11-06'});
DOM['ib_wal_n3']={value:'wk'}; DOM['ib_cat_n3']={value:'cat1'};
await c.inboxPrijmout('n3'); tx=S.transactions[2];
t('korunová platba beze změny (bez currency a amtCZK)',tx&&tx.amount===150&&tx.currency==null&&tx.amtCZK==null,tx);
c.nastav('n4',{k:'d',postedAt:4},{type:'expense',amount:20,currency:'EUR',merchant:'Revolut',bank:'Revolut',date:'2026-11-06'});
DOM['ib_wal_n4']={value:'wk'}; DOM['ib_cat_n4']={value:'presun:we'};
await c.inboxPrijmout('n4');
const pr=S.transactions.filter(x=>x.transferId);
t('přesun mezi peněženkami zůstává v Kč (kurzem dne: 486,20)',pr.length===2&&pr.every(x=>x.amount===486.2&&!x.currency),pr);
t('pevné kurzy 25 / 23 / 29 z Doručených zmizely',!/amt \* 25\)|amt \* 23\)|amt \* 29\)/.test(ib));

console.log('── formulář: platba v cizí měně zpětně → kurz ČNB toho dne ──');
const D2={txDate:{value:'2026-09-29'},txAmtCZK:{value:''}};
const c2={_FX_RATES:{EUR:25.3},document:{getElementById:id=>D2[id]||null},ffDnes:()=>'2026-11-08',window:{},
  fxRatesForDate:async d=>d==='2026-09-29'?{rates:{EUR:24.42},date:'29.09.2026'}:null,updateTxCzkField:()=>{c2.prekresleno=(c2.prekresleno||0)+1},
  _txEntryCur:()=>'EUR',Math,parseFloat,isFinite,String};
vm.createContext(c2);
vm.runInContext('let _txKurzDne=null;\n'+pick(deb,'_txKurz')+'\n'+pick(deb,'_txNactiKurzDne')+'\n'+pick(deb,'_readTxCzk')+'\nthis.kd=()=>_txKurzDne;',c2);
t('než se lístek stáhne: dnešní kurz (25,3)',c2._txKurz('EUR').rate===25.3);
await c2._txNactiKurzDne();
t('29. 9.: kurz ČNB toho dne 24,42 a datum lístku pro nápovědu',c2._txKurz('EUR').rate===24.42&&c2._txKurz('EUR').datum==='29.09.2026'&&c2.prekresleno===1);
t('prázdné pole Kč → uloží se 20 × 24,42 = 488,40',c2._readTxCzk('w',20)===488.4);
D2.txDate.value='2026-11-08'; await c2._txNactiKurzDne();
t('dnešní datum → zase dnešní kurz (lístek se nestahuje)',c2._txKurz('EUR').rate===25.3&&c2.kd()===null);
t('změna data ve formuláři načte kurz toho dne',/id="txDate" type="date" onchange="if\(typeof _txNactiKurzDne==='function'\)_txNactiKurzDne\(\)"/.test(html));
t('úprava transakce načte kurz ke dni (pro ↻ Přepočítat), nové okno ho vynuluje',/setTimeout\(_txNactiKurzDne, 0\)/.test(pick(ui,'editTx'))&&/_txKurzDne = null;/.test(pick(deb,'openAddTx')));
const st=pick(deb,'saveTx');
t('saveTx: nová transakce / změněná částka bez ručně přepsaných Kč → po stažení lístku přepočet Kč',/let _kcPrepocet = false;/.test(st)&&/if\(!_prev && !_czkUserTyped\) _kcPrepocet = true;/.test(st)&&/if\(\(_zmena \|\| _fxRestamp\) && !_czkUserTyped\) _kcPrepocet = true;/.test(st)&&/_fxRefBackfill\(_savedId, txObj\.currency, txObj\.date, _kcPrepocet\)/.test(st));
const S3={transactions:[{id:'x',amount:20,currency:'EUR',amtCZK:506}]};
const c3={S:S3,fxRatesForDate:async()=>({rates:{EUR:24.42},date:'29.09.2026'}),save:()=>{},Math,parseFloat,isFinite};
vm.createContext(c3); vm.runInContext(pick(deb,'_fxRefBackfill')+'\nvar S=this.S;',c3);
await c3._fxRefBackfill('x','EUR','2026-09-29',true);
t('_fxRefBackfill s přepočtem: 20 € → 488,40 Kč a referenční kurz dne',S3.transactions[0].amtCZK===488.4&&S3.transactions[0].fxRef===24.42,S3.transactions[0]);
S3.transactions[0].amtCZK=600; await c3._fxRefBackfill('x','EUR','2026-09-29',false);
t('… bez přepočtu (Kč přepsané podle výpisu) zůstane 600',S3.transactions[0].amtCZK===600);

console.log('── datum účtenky je pravda (29. 9. vs. 2. 10.) ──');
const c4={normalizeStoreName:s=>String(s||'').toLowerCase().replace(/[^a-z0-9á-ž]/g,''),console};
vm.createContext(c4);
vm.runInContext(pick(rc,'rcptOpravVazby')+'\n'+pick(rc,'syncReceiptToTransactions')+'\nvar S=null;this.set=x=>{S=x;};var viewingUid=null;',c4);
const uct=(o)=>Object.assign({addedAt:5,store:'Nakupní Centrum Řeznictví Groh Lubomír',date:'2026-09-29',total:196.3,items:[{name:'Klobása',lineTotal:96.3,itemCatId:'c1'},{name:'Šunka',lineTotal:100,itemCatId:'c1'}]},o);
let D={receipts:[uct()],transactions:[{id:'t1',type:'expense',name:'Nakupní Centrum Řeznictví Groh Lubomír',amount:196.3,date:'2026-10-02',receiptDate:'2026-09-29',receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír',receiptAddedAt:5}]};
c4.set(D); c4.rcptOpravVazby(D);
t('propojená transakce s rozjetým datem 2. 10. dostane datum účtenky 29. 9.',D.transactions[0].date==='2026-09-29');
D={receipts:[uct()],transactions:[{id:'t1',type:'expense',name:'Nakupní Centrum Řeznictví Groh Lubomír',amount:196.3,date:'2026-10-02',receiptDate:'2026-10-02',receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír',receiptAddedAt:999}]};
c4.set(D); let n=c4.rcptOpravVazby(D);
t('vazba vede na neexistující účtenku → napojí se na účtenku stejného obchodu a částky (±7 dní) a dostane její datum',D.transactions[0].receiptAddedAt===5&&D.transactions[0].date==='2026-09-29'&&n>0,D.transactions[0]);
D={receipts:[uct()],transactions:[{id:'t1',type:'expense',name:'Řeznictví',amount:196.3,date:'2026-10-02',receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír'}]};
c4.set(D); c4.rcptOpravVazby(D);
t('starší transakce bez vazby (jen obchod účtenky) se napojí taky',D.transactions[0].receiptAddedAt===5&&D.transactions[0].date==='2026-09-29');
D={receipts:[uct(),uct({addedAt:6,date:'2026-10-01'})],transactions:[{id:'t1',type:'expense',name:'x',amount:196.3,date:'2026-10-02',receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír',receiptAddedAt:999}]};
c4.set(D); c4.rcptOpravVazby(D);
t('dvě možné účtenky → nic se nehádá',D.transactions[0].receiptAddedAt===999&&D.transactions[0].date==='2026-10-02');
D={receipts:[uct()],transactions:[{id:'t2',type:'expense',name:'Nakupní Centrum Řeznictví Groh Lubomír',amount:196.3,date:'2026-10-02'}]};
c4.set(D); c4.rcptOpravVazby(D);
t('ruční transakce bez stopy účtenky se nepáruje',D.transactions[0].receiptAddedAt==null&&D.transactions[0].date==='2026-10-02');
D={receipts:[uct()],transactions:[{id:'a',type:'expense',amount:196.3,date:'2026-09-29',receiptAddedAt:5,receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír'},{id:'b',type:'expense',amount:196.3,date:'2026-10-02',receiptAddedAt:999,receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír'}]};
c4.set(D); c4.rcptOpravVazby(D);
t('účtenka, ke které už transakce patří, se druhé nepřiřadí (zůstane jako možný duplikát)',D.transactions[1].receiptAddedAt===999);
D={receipts:[uct({store:'Jiný obchod'})],transactions:[{id:'t1',type:'expense',amount:196.3,date:'2026-10-02',receiptAddedAt:999,receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír'}]};
c4.set(D); c4.rcptOpravVazby(D);
t('jiný obchod → nepáruje se',D.transactions[0].receiptAddedAt===999);
D={receipts:[uct()],transactions:[{id:'t1',type:'expense',amount:196.3,date:'2026-02-03',receiptDate:'2026-01-10',receiptAddedAt:5,receiptStore:'Nakupní Centrum Řeznictví Groh Lubomír'}]};
c4.set(D); c4.syncReceiptToTransactions(D.receipts[0], {date:'2026-01-10',store:'x'});
t('uložení účtenky: datum transakce = datum účtenky vždy',D.transactions[0].date==='2026-09-29');

console.log('── Historie: filtr ceny a žlutý oddělovač měsíců ──');
const c5={console};vm.createContext(c5);
vm.runInContext(rc.slice(rc.indexOf('const HIST_MESICE'),rc.indexOf('function filterHistory()'))+'\nthis.HM=HIST_MESICE;',c5);
const m=c5.histMesice([{date:'2026-10-06',total:'253.4'},{date:'2026-09-29',total:196.3},{date:'2026-09-02',total:100}]);
t('součty po měsících',m['2026-10'].n===1&&Math.abs(m['2026-09'].kc-296.3)<1e-9&&m['2026-09'].n===2);
const h1=c5.histOddelovacHTML('2026-09',m['2026-09']);
t('oddělovač: „Září 2026“, žlutá čára, „2 účtenky · 296,30 Kč“',/Září 2026/.test(h1)&&/background:#fbbf24/.test(h1)&&/2 účtenky · 296,30 Kč/.test(h1)&&/class="hist-mesic"/.test(h1),h1);
t('1 účtenka / 5 účtenek / bez data',/1 účtenka ·/.test(c5.histOddelovacHTML('2026-10',{n:1,kc:1}))&&/5 účtenek/.test(c5.histOddelovacHTML('2026-10',{n:5,kc:1}))&&/Bez data/.test(c5.histOddelovacHTML('',{n:1,kc:1})));
const bt=pick(rc,'buildHistoryTab'), fh=pick(rc,'filterHistory');
t('Historie má pole „💰 od Kč“ a „💰 do Kč“ a počet „X z Y účtenek“',/id="histAmtMin"[^>]*placeholder="💰 od Kč"/.test(bt)&&/id="histAmtMax"[^>]*placeholder="💰 do Kč"/.test(bt)&&/id="histPocet"/.test(bt)&&/\$\{visible\.length\} z \$\{c\} účtenek/.test(fh));
t('oddělovače se kreslí při prvním vykreslení i po filtru, jen při řazení podle data',/histOddelovacHTML\(_m, _mes\[_m\]\)/.test(bt)&&/const podleData = sortOrder\.startsWith\('date'\)/.test(fh)&&/querySelectorAll\('\.hist-mesic'\)\.forEach\(x => x\.remove\(\)\)/.test(fh));
t('filtr ceny ve filterHistory (od − 0,005 / do + 0,005)',/kc >= od - 0\.005/.test(fh)&&/kc <= d0 \+ 0\.005/.test(fh));

console.log(`\n${ok} ✅ · ${bad} ❌`);process.exit(bad?1:0);
})().catch(e=>{console.log('  ❌ výjimka',e&&e.stack||e);process.exit(1)});
