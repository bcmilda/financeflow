// TODO-208 – zálohy: rotace, obnova, pojistky.
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const pick=n=>{const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const pickA=n=>{const i=src.indexOf('async function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};

let DB={}, S={transactions:[],categories:[]}, ONLINE=true, LOCAL=false, VIEWING=null;
const sb={console,Date,Math,Object,JSON,Array,Set,Map,String,Number,isFinite,parseInt,
  get S(){return S}, set S(v){S=v},
  get _isLocalMode(){return LOCAL},
  get viewingUid(){return VIEWING},
  navigator:{get onLine(){return ONLINE}},
  localStorage:{_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v}},
  document:{title:'FinanceFlow v9.87'},
  getData:()=>S,
  sanitizeUserData:d=>d,
  save:()=>{sb._saves=(sb._saves||0)+1},
  _dw:{ready:true,metaSig:{a:1},txSig:new Map([['x','y']])},
  _db:{}, _ref:(db,path)=>({path}),
  _get:async r=>{const parts=r.path.split('/');let n=DB;for(const p of parts){n=n&&n[p]}
    return {exists:()=>n!==undefined&&n!==null, val:()=>n}},
  _update:async(r,obj)=>{const parts=r.path.split('/');let n=DB;
    for(const p of parts){if(!n[p])n[p]={};n=n[p]}
    Object.keys(obj).forEach(k=>{if(obj[k]===null)delete n[k];else n[k]=obj[k]})},
  _set:async(r,v)=>{}};
sb.window={_currentUser:{uid:'u1'}}; sb.self=sb;
vm.createContext(sb);
vm.runInContext(['const BACKUP_KEEP = 5;','const BACKUP_MAX_BYTES = 6*1024*1024;',
  pick('_backupDayKey'),pick('_backupPayload'),pickA('backupRun'),pickA('backupRotate'),
  pickA('backupList'),pickA('backupRestore'),pick('backupMaybeDaily')].join('\n'),sb);

let fails=0;
const check=async(n,f)=>{try{await f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};
const run=(f,...a)=>vm.runInContext(f,sb)(...a);
const today=()=>vm.runInContext('_backupDayKey()',sb);

(async()=>{
console.log('── TODO-208 · zálohy ──');

S={transactions:[{id:'t1',amount:100,date:'2026-08-01'}],categories:[{id:'c1'}],_runtime:'nesmí projít'};
await check('záloha se vytvoří a runtime klíče (_) se nezálohují',async()=>{
  const r=await run('backupRun',true);
  assert(r.ok,'err='+r.err);
  const rec=DB.users.u1.backups[today()];
  assert(rec,'záznam chybí');
  const p=JSON.parse(rec.json);
  assert(p.transactions.length===1,'transakce');
  assert(p._runtime===undefined,'runtime klíč se zálohoval');
});

await check('denní záloha se podruhé týž den přeskočí',async()=>{
  const r=await run('backupRun',false);
  assert(r.skipped===true,'neproběhlo přeskočení');
});

await check('ruční záloha přepíše i dnešní',async()=>{
  S.transactions.push({id:'t2',amount:5,date:'2026-08-02'});
  const r=await run('backupRun',true);
  assert(r.ok);
  assert(JSON.parse(DB.users.u1.backups[today()].json).transactions.length===2);
});

await check('ROTACE: drží se posledních 5',async()=>{
  DB.users.u1.backups={};
  ['2026-08-01','2026-08-02','2026-08-03','2026-08-04','2026-08-05','2026-08-06','2026-08-07']
    .forEach(k=>DB.users.u1.backups[k]={at:1,bytes:10,json:'{"transactions":[]}'});
  await run('backupRotate');
  const keys=Object.keys(DB.users.u1.backups).sort();
  assert(keys.length===5,'zbylo '+keys.length);
  assert(keys[0]==='2026-08-03','nejstarší '+keys[0]+' – smazaly se špatné');
});

await check('offline zálohu nevytvoří (a nespadne)',async()=>{
  ONLINE=false; const r=await run('backupRun',true); ONLINE=true;
  assert(!r.ok && /offline/i.test(r.err),JSON.stringify(r));
});

await check('prohlížení partnera nezálohuje cizí data',async()=>{
  VIEWING='partner'; const r=await run('backupRun',true); VIEWING=null;
  assert(!r.ok && /cizí/i.test(r.err),JSON.stringify(r));
});

await check('seznam vrací metadata, NE obsah (kvůli velikosti)',async()=>{
  const l=await run('backupList');
  assert(l.length===5,'položek '+l.length);
  assert(l[0].json===undefined,'seznam tahá i obsah');
  assert(l[0].key>l[1].key,'není seřazeno od nejnovější');
});

await check('OBNOVA: přepíše data a vynutí PLNÝ zápis (jinak zůstanou sirotci)',async()=>{
  DB.users.u1.backups['2026-08-03']={at:1,bytes:10,ver:'v9.80',
    json:JSON.stringify({transactions:[{id:'old1',amount:1,date:'2026-08-03'}],categories:[{id:'c9'}]})};
  S={transactions:[{id:'a'},{id:'b'},{id:'c'}],categories:[]};
  vm.runInContext('_dw.ready=true',sb);
  const r=await run('backupRestore','2026-08-03');
  assert(r.ok,'err='+r.err);
  assert(r.n===1,'n='+r.n);
  assert(vm.runInContext('S.transactions.length',sb)===1,'data se nepřepsala');
  assert(vm.runInContext('_dw.ready',sb)===false,'diff-write by nechal v DB smazané transakce');
});

await check('OBNOVA vytvoří pojistku „pred-obnovou"',async()=>{
  assert(DB.users.u1.backups['pred-obnovou'],'pojistka chybí');
  const p=JSON.parse(DB.users.u1.backups['pred-obnovou'].json);
  assert(p.transactions.length===3,'pojistka neuložila PŮVODNÍ stav, má '+p.transactions.length);
});

await check('poškozená záloha se odmítne, data zůstanou',async()=>{
  DB.users.u1.backups['2026-08-04']={at:1,bytes:1,json:'{tohle není JSON'};
  const before=vm.runInContext('S.transactions.length',sb);
  const r=await run('backupRestore','2026-08-04');
  assert(!r.ok && /poškozen/i.test(r.err),JSON.stringify(r));
  assert(vm.runInContext('S.transactions.length',sb)===before,'data se změnila i přes chybu');
});

await check('záloha bez transakcí se odmítne (ochrana proti cizímu JSONu)',async()=>{
  DB.users.u1.backups['2026-08-05']={at:1,bytes:1,json:'{"neco":1}'};
  const r=await run('backupRestore','2026-08-05');
  assert(!r.ok && /tvar/i.test(r.err),JSON.stringify(r));
});

await check('prázdný účet se nezálohuje automaticky',async()=>{
  S={transactions:[],categories:[]};
  const n=Object.keys(DB.users.u1.backups).length;
  run('backupMaybeDaily');
  await new Promise(r=>setTimeout(r,10));
  assert(Object.keys(DB.users.u1.backups).length===n,'prázdný účet vytvořil zálohu');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ZÁLOHY OVĚŘENY');
process.exit(fails?1:0);
})();
