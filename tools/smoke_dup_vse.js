// FinanceFlow · smoke test · S26 (v11.73) · podezřelé páry za všechny měsíce, duplicitní účtenky
//  Milan: „podezřelé transakce musím hledat měsíc po měsíci, chci je vidět najednou“
//         „naskenoval jsem 2 stejné účtenky… z transakcí ji smazat nemůžu… která se smaže?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const dj=R('duplicates.js','../js/duplicates.js'), rc=R('receipts.js','../js/receipts.js'), ui=R('ui.js','../js/ui.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};

const S={transactions:[],receipts:[],uiCfg:{},categories:[{id:'jidlo',name:'Jídlo'}]};
const c={S,console,Math,Date,Set,Object,String,Number,JSON,viewingUid:null,getData:()=>S,save(){c.ulozeno=(c.ulozeno||0)+1},renderTx(){},showToast(){},confirm:()=>true,
  fmt:v=>String(Math.round(v)),fmtP:v=>String(v),normalizeStoreName:s=>String(s||'').toUpperCase(),document:{getElementById:()=>null},window:{}};
vm.createContext(c);
vm.runInContext(dj.replace(/^\s*\/\/.*$/m,'')+'\n'+pick(rc,'rcptNajdiTx'),c);
vm.runInContext('showToast=function(){}',c);

console.log('── páry za všechny měsíce ──');
const tx=(id,date,amount,extra)=>Object.assign({id,date,amount,type:'expense',catId:'jidlo',name:'Penny Market'},extra||{});
S.transactions.push(
  tx(1,'2026-03-10',311.41,{receiptAddedAt:1760000000000,receiptStore:'Penny',note:'📸'}),
  tx(2,'2026-03-10',311.41,{receiptAddedAt:1760000500000,receiptStore:'Penny',note:'📸'}),   // kopie z druhého skenu
  tx(3,'2026-08-02',1200,{name:'Nájem'}), tx(4,'2026-08-04',1200,{name:'Nájem'}),
  tx(5,'2026-10-01',55,{name:'Kafe'}), tx(6,'2026-01-01',999,{type:'income',name:'Vratka'}));
for(let i=0;i<3000;i++) S.transactions.push(tx(1000+i,`2025-${String(1+i%12).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`,1000+i*3.7,{name:'Nákup '+i}));
const t0=Date.now(), pary=c.dupParyVse(), ms=Date.now()-t0;
t('najde páry v různých měsících najednou (březen i srpen)',pary.length===2&&pary.some(p=>p.a.id===1&&p.b.id===2)&&pary.some(p=>p.a.id===3),pary.map(p=>[p.a.id,p.b.id,p.type]));
t('přesné duplikáty první',pary[0].type==='exact');
t('3 000+ transakcí za '+ms+' ms (porovnávají se jen stejné částky)',ms<500,ms);
t('„a“ je dřív přidaná, „b“ později (podle času skenu)',pary[0].a.id===1&&pary[0].b.id===2);
const mesic=c.detectDuplicates(S.transactions.filter(x=>x.date.startsWith('2026-08')));
t('stejná pravidla i pro jeden měsíc',mesic[3]&&mesic[3][0].otherId===4&&mesic[3][0].type==='delayed');

console.log('── „Není duplikát“ natrvalo ──');
c.dupIgnore(3,4);
t('pár se uloží do nastavení (přežije obnovení appky)',S.uiCfg.dupNeni&&S.uiCfg.dupNeni['3|4']===1&&c.ulozeno>=1);
vm.runInContext('_dupIgnored={}',c);   // jako po obnovení stránky
t('…a po obnovení se už neukáže',!c.dupParyVse().some(p=>p.a.id===3||p.b.id===3));
t('NEGATIVNÍ KONTROLA: dřív se ignorovaný pár v detekci vůbec nekontroloval',/dupJeNeni\(A\.t\.id, B\.t\.id\)/.test(dj));

console.log('── duplicitní účtenka: smazání z transakce ──');
const rA={store:'Penny',date:'2026-03-10',total:311.41,items:[1,2],addedAt:1760000000000};
const rB={store:'Penny',date:'2026-03-10',total:311.41,items:[1,2],addedAt:1760000500000};
S.receipts=[rB,rA];   // novější první (unshift)
const u=c.dupUctenkaPro(S.transactions.find(x=>x.id===2));
t('transakce zná svou účtenku a ví, že je to kopie',u&&u.r===rB&&u.kopie===true);
c.dupDelete(2);
t('smazání transakce smaže i kopii účtenky, originál zůstane',!S.transactions.some(x=>x.id===2)&&S.receipts.length===1&&S.receipts[0]===rA);
const jedina={store:'Albert',date:'2026-10-10',total:50,items:[1],addedAt:1760100000000};
S.receipts.push(jedina); S.transactions.push(tx(7,'2026-10-10',50,{receiptAddedAt:1760100000000}));
c.confirm=()=>false; c.txSmazSUctenkou(S.transactions.find(x=>x.id===7),true);
t('jediná účtenka (ne kopie): zeptá se, a když ne, účtenka zůstane',!S.transactions.some(x=>x.id===7)&&S.receipts.includes(jedina));
t('Transakce: smazání jde přes stejnou funkci (i na telefonu v rozbalených položkách)',/function deleteTx\(id\)\{[\s\S]{0,500}txSmazSUctenkou\(_t,true\)/.test(ui)&&ui.includes('🗑 Smazat transakci'));

console.log('── Smazat duplikáty v Analýze účtenek: která zůstane ──');
const cr={normalizeStoreName:s=>String(s||'').toUpperCase(),Math};
vm.createContext(cr); vm.runInContext(['rcptPrace','rcptDuplikatyPlan'].map(n=>pick(rc,n)).join('\n'),cr);
const o1={store:'Lidl',date:'2026-10-01',total:99,items:[{}],addedAt:100}, o2={...o1,addedAt:200};
let pl=cr.rcptDuplikatyPlan([o2,o1]);
t('bez úprav zůstane ta naskenovaná DŘÍV (dřív zůstala ta pozdější)',pl.nech.includes(o1)&&pl.smaz.includes(o2));
const p1={store:'Lidl',date:'2026-10-02',total:50,items:[{}],addedAt:100}, p2={...p1,addedAt:200,items:[{ean:'8594001021000'}],updatedAt:5};
pl=cr.rcptDuplikatyPlan([p2,p1]);
t('s čárovými kódy / úpravami zůstane ta upravená, i když je pozdější',pl.nech.includes(p2)&&pl.smaz.includes(p1));
t('před smazáním appka vypíše, co přesně smaže',/🗑 \$\{r\.store \|\| ''\} \$\{r\.date \|\| ''\}/.test(rc));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
