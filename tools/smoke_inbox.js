// FinanceFlow · smoke test · S27 (v11.89) · 📲 FinanceFlow Inbox – notifikace z banky z telefonu
//  Milan: „nativní část appky pro parser notifikací, data převést do webového rozhraní“
//         „připojit k notifikacím i naskenovanou účtenku – sken ji převezme, protože je detailnější“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const sms=R('sms-import.js','../js/sms-import.js'), ib=R('inbox.js','../js/inbox.js'), uc=R('ucet.js','../js/ucet.js'), html=R('app.html','../app.html');
const rules=R('database.rules.json','database_rules.json','../database.rules.json');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const S={categories:[{id:'cat1',name:'Jídlo',type:'expense',icon:'🛒'},{id:'cat11',name:'Auto',type:'expense'}],wallets:[{id:'w1',name:'Běžný účet'}],
  receipts:[{addedAt:111,store:'Penny Market',date:'2026-10-16',total:145.4,items:[{name:'Rohlík',lineTotal:12},{name:'Mléko',lineTotal:133.4}]}],
  transactions:[{id:'r1',type:'expense',name:'Penny Market',amount:145.4,amt:145.4,catId:'cat1',date:'2026-10-16',receiptAddedAt:111}]};
const els={};
const c={S,console,Date,Math,JSON,Object,String,Number,parseFloat,Promise,getData:()=>S,save(){c.ulozeno=(c.ulozeno||0)+1},showToast(m){c.toast=m},genTxId:()=>'n'+(++c.n),n:0,
  document:{getElementById:id=>els[id]||null},fetch:async(u,o)=>{c.volani=(c.volani||[]).concat([[u,o&&o.method]]);return{ok:true,status:200,json:async()=>null}},
  window:{_currentUser:{uid:'U1',getIdToken:async()=>'tok'}},
  dupUctenkaPro:tx=>{const r=S.receipts.find(x=>x.addedAt===tx.receiptAddedAt);return r?{r}:null}};
vm.createContext(c);
vm.runInContext(sms.replace(/^function renderSmsImport[\s\S]*$/m,'')+'\n'+ib+'\n;this._ib=()=>_inbox;this._setIb=v=>{_inbox=v};',c);

console.log('── rozpoznání notifikace (parser webu) ──');
const x1={app:'George',title:'Platba kartou',text:'450 Kč SHELL BENZINA',postedAt:Date.parse('2026-10-16T08:12:00')};
let p=c.inboxRozpoznej(x1);
t('„George: Platba kartou 450 Kč SHELL“ → výdaj 450 Kč, datum z času notifikace',p&&p.type==='expense'&&p.amount===450&&p.date==='2026-10-16',p);
t('text pro parser = název appky + titulek + text',c.inboxText(x1)==='George: Platba kartou 450 Kč SHELL BENZINA');
t('nerozpoznaný text vrací null (karta „nerozpoznáno“ s ručním zápisem)',c.inboxRozpoznej({app:'Banka',text:'Vaše heslo vyprší za 3 dny',postedAt:0})===null);

console.log('── naskenovaná účtenka převezme platbu ──');
const x2={app:'George',title:'Platba kartou',text:'145,40 Kč PENNY MARKET',postedAt:Date.parse('2026-10-16T18:40:00')};
p=c.inboxRozpoznej(x2);
const u=c.inboxUctenkaK(p,S);
t('platba 145,40 Kč = naskenovaná účtenka Penny 145,40 Kč (± 1 Kč, ± 2 dny) → nabídne spojení',p&&u&&u.id==='r1',{p,u:u&&u.id});
t('jiná částka účtenku nenabídne',c.inboxUctenkaK(Object.assign({},p,{amount:300}),S)===null);
(async()=>{
  c._setIb({a1:Object.assign({},x2),a2:Object.assign({},x1)});
  await c.inboxSpojitSUctenkou('a1','r1');
  t('spojit s účtenkou: žádná nová transakce, účtenka nese vazbu na notifikaci, položka „sparovano“',S.transactions.length===1&&S.transactions[0].zNotifikace&&S.transactions[0].zNotifikace.id==='a1'&&c._ib().a1.stav==='sparovano'&&c._ib().a1.txId==='r1');
  els.ib_cat_a2={value:'cat11'}; els.ib_name_a2={value:'Shell'}; els.ib_wal_a2={value:'w1'};
  await c.inboxPrijmout('a2');
  const n=S.transactions.find(x=>x.name==='Shell');
  t('přidat do Transakcí: kategorie, název, peněženka z karty, datum notifikace, vazba zNotifikace, položka „prijato“',n&&n.catId==='cat11'&&n.wallet==='w1'&&n.amount===450&&n.date==='2026-10-16'&&n.zNotifikace.id==='a2'&&c._ib().a2.stav==='prijato');
  t('stav se zapíše do users/U1/inbox/{id} (PATCH)',c.volani.some(([u,m])=>/users\/U1\/inbox\/a2\.json/.test(u)&&m==='PATCH'));
  //  účtenka přibude až po transakci z notifikace
  S.receipts.push({addedAt:222,store:'Shell',date:'2026-10-16',total:450,items:[{name:'Natural 95',lineTotal:420},{name:'Káva',lineTotal:30}]});
  S.transactions.push({id:'r2',type:'expense',name:'Shell',amount:450,amt:450,catId:'cat11',date:'2026-10-16',receiptAddedAt:222});
  const pr=c.inboxPrevzetiUctenkou(S);
  t('účtenka naskenovaná POZDĚJI se nabídne k převzetí transakce z notifikace',pr.length===1&&pr[0].n.name==='Shell'&&pr[0].u.id==='r2');
  c.inboxRender=()=>{}; c.renderPage=()=>{};
  vm.runInContext('inboxPrevzit('+JSON.stringify(n.id)+')',c);
  const r2=S.transactions.find(x=>x.id==='r2');
  t('převzetí: transakce z notifikace zmizí, účtenka dostane peněženku a vazbu',!S.transactions.some(x=>x.id===n.id)&&r2.wallet==='w1'&&r2.zNotifikace&&r2.zNotifikace.prevzato===true);

  console.log('── napojení a bezpečnost ──');
  t('stránka Import z banky ukazuje 📲 Telefon (inboxBox) a app.html načítá inbox.js',/<div id="inboxBox"><\/div>/.test(sms)&&/inboxRender\(\)/.test(sms)&&/js\/inbox\.js\?v=/.test(html));
  t('smazání účtu odpojí telefony (inboxLinks mimo users/)',/inboxOdpojVse\(\)/.test(uc));
  t('pravidla: telefon smí do users/$uid/inbox jen přidat (propojený přes inboxLinks), nesmí číst',/"inbox": \{\s*"\$id": \{\s*"\.write": "auth != null && root\.child\('inboxLinks'\)\.child\(auth\.uid\)\.child\('uid'\)\.val\(\) === \$uid/.test(rules)&&!/"inbox":[^}]*"\.read"/.test(rules));
  t('pravidla: propojení jen s platným kódem (max 15 minut) a jen na vlastní účet',/"inboxLinks"[\s\S]*newData\.child\('uid'\)\.val\(\) === auth\.uid[\s\S]*now - 900000/.test(rules));
  console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
})();
