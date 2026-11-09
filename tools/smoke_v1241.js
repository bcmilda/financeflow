// FinanceFlow · smoke test · S28 (v12.41) · úprava rozdělené platby (Milan, 8. 11.: „rozdělenou transakci nemohu editovat! To je chyba.“)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const adm=R('admin.js','../js/admin.js'), ui=R('ui.js','../js/ui.js'), deb=R('debts.js','../js/debts.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

const novy=()=>[{id:'p',type:'expense',name:'U Medveda',amount:545,date:'2026-10-05',payType:'card',splitId:'s1',splitParent:true},
  {id:'c1',type:'expense',name:'U Medveda',amount:496,date:'2026-10-05',payType:'card',splitId:'s1',splitParent:false},
  {id:'c2',type:'expense',name:'U Medveda',amount:49,date:'2026-10-05',payType:'card',splitId:'s1',splitParent:false},
  {id:'x',type:'expense',name:'Hospoda & Bar – Pivo',amount:49,date:'2026-10-05'}];
const c={S:{transactions:novy(),categories:[{id:'r',name:'Restaurace'}]},viewingUid:null,confirm:()=>true,save:()=>{c.ulozeno=(c.ulozeno||0)+1},renderPage:()=>{},showToast:()=>{},
  fmtP:n=>String(n),getCat:(id,cs)=>(cs||[]).find(x=>x.id===id)||{name:'?'},Math,parseFloat};
vm.createContext(c);
vm.runInContext(pick(adm,'splitSyncDeti')+'\n'+pick(adm,'zrusitRozdeleni')+'\nvar S=this.S;',c);

console.log('── ✎ Upravit platbu: části jdou s ní ──');
const p=c.S.transactions[0]; p.date='2026-10-04'; p.amount=600; p.payType='cash'; p.name='U Medvěda';
c.splitSyncDeti(p);
const [c1,c2]=[c.S.transactions[1],c.S.transactions[2]];
t('datum, způsob platby a název částí = rodič',c1.date==='2026-10-04'&&c2.date==='2026-10-04'&&c1.payType==='cash'&&c2.name==='U Medvěda');
t('nová částka 600 rozpočítaná poměrem 496 : 49 (součet sedí na haléř)',Math.round((c1.amount+c2.amount)*100)===60000&&Math.abs(c1.amount-546.06)<0.02,[c1.amount,c2.amount]);
t('samostatná transakce „Hospoda & Bar – Pivo“ se nezmění',c.S.transactions[3].amount===49&&c.S.transactions[3].date==='2026-10-05');
t('rozdělená účtenka (rcptSplit) se tu nesynchronizuje (dělí ji položky)',c.splitSyncDeti({splitParent:true,splitId:'s1',rcptSplit:true})===0);

console.log('── ↩ Zrušit rozdělení ──');
c.zrusitRozdeleni('s1');
t('části pryč, platba zase jedna (bez splitId), uloženo',c.S.transactions.length===2&&!c.S.transactions[0].splitId&&!c.S.transactions[0].splitParent&&c.ulozeno===1,c.S.transactions);

console.log('── ✂️ Upravit rozdělení ──');
const om=pick(adm,'openSplitModal'), ss=pick(adm,'saveSplit');
t('už rozdělená platba se otevře s dosavadními částmi (kategorie, podkategorie, částky)',/const _deti = tx\.splitParent && tx\.splitId/.test(om)&&/_deti\.map\(\(ch, i\) =>\s*buildSplitRow\(i, ch\.catId \|\| ch\.category \|\| '', Math\.round\(\(ch\.amount/.test(om)&&/'✂️ Upravit rozdělení'/.test(om));
t('uložení nahradí staré části a splitId zůstane',/const splitId = \(tx\.splitParent && tx\.splitId\) \? tx\.splitId : 'split_' \+ Date\.now\(\);/.test(ss)&&/S\.transactions = S\.transactions\.filter\(t => !\(t\.splitId === splitId && !t\.splitParent\)\)/.test(ss));
t('rozdělená účtenka → editor účtenky',/if\(tx\.rcptSplit\) \{ if\(typeof openReceiptForTx === 'function'\) openReceiptForTx\(txId\); return; \}/.test(om));

console.log('── telefon: lišta nad částmi, klepnutí na část ──');
const row=ui.slice(ui.indexOf('function buildTxRow('), ui.indexOf('function deleteTx('));
t('rozbalená rozdělená platba má ✎ Upravit platbu / ✂️ Upravit rozdělení / ↩ Zrušit rozdělení',/✎ Upravit platbu<\/button>/.test(row)&&/openSplitModal\('\$\{t\.id\}'\)">✂️ Upravit rozdělení/.test(row)&&/zrusitRozdeleni\('\$\{t\.splitId\}'\)">↩ Zrušit rozdělení/.test(row)&&/childRows = `<div id="split-children-\$\{t\.splitId\}" style="display:none">` \+ _lista/.test(row));
t('klepnutí na část (telefon) otevře úpravu rozdělení, ✕ dál maže jen část',/onclick="openSplitModal\('\$\{_rodic\.id\}'\)"/.test(row)&&/deleteSplitChild\('\$\{t\.id\}'\)/.test(row));
t('formulář: u rozdělené platby tlačítko „✂️ Upravit rozdělení“',/_bs\.textContent = _jeRozd \? '✂️ Upravit rozdělení' : '✂️ Rozdělit';/.test(pick(ui,'editTx')));
t('saveTx po úpravě rozdělené platby zavolá splitSyncDeti',/if\(t\.splitParent && typeof splitSyncDeti==='function'\) splitSyncDeti\(t\);/.test(pick(deb,'saveTx')));

console.log(`\n${ok} ✅ · ${bad} ❌`);process.exit(bad?1:0);
