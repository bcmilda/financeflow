// FinanceFlow · smoke test · S28 (v12.39) · drobnosti z Transakcí a Doručených (Milan, 7. 11.)
//  „při swipu se pohne obrazovka a pohyb je se zpožděním“ · „transakce z 2. 10. za 196,30 – dal jsem upravit, ale nebyla nalezena v historii“
//  „chtěl bych do filtru přidat filtr ceny“ · „proč se mi zobrazují možné duplicity, na pohled jiný obchod, datum i cena“
//  „nechybí tam rámeček Není duplikát?“ · „notifikace pro Revolut mi nedovoluje zapsat transakci“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const dup=R('duplicates.js','../js/duplicates.js'), ui=R('ui.js','../js/ui.js'), rc=R('receipts.js','../js/receipts.js'),
  sms=R('sms-import.js','../js/sms-import.js'), ib=R('inbox.js','../js/inbox.js'), deb=R('debts.js','../js/debts.js'),
  adm=R('admin.js','../js/admin.js'), trx=R('transactions.js','../js/transactions.js'), html=R('app.html','../app.html');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

console.log('── Podezřelé: položka účtenky musí sedět i jinak než cenou ──');
const cats=[{id:'potr',name:'Nákupy potravin'},{id:'rest',name:'Restaurace & Kavárny'},{id:'bar',name:'Hospoda & Bar'},{id:'auto',name:'Auto'}];
const S={uiCfg:{},categories:cats,receipts:[
  {addedAt:1,store:'Penny Market',date:'2026-10-29',total:1361.34,items:[{name:'Piz.Marg.300gSF',lineTotal:30},{name:'Rohlík',lineTotal:1331.34}]},
  {addedAt:2,store:'Kaufland',date:'2026-10-22',total:875,items:[{name:'YO čer.bez. 0,7 l',lineTotal:120},{name:'Maso',lineTotal:755}]},
  {addedAt:3,store:'Hostinec u Svatého Jána',date:'2026-10-18',total:1017,items:[{name:'Kečup',lineTotal:30,itemCatId:'rest'},{name:'Řízek',lineTotal:987,itemCatId:'rest'}]},
  {addedAt:4,store:'MOL',date:'2026-10-16',total:1022.4,items:[{name:'EVO 95',lineTotal:988.4,itemCatId:'auto'},{name:'Caffe Latte',lineTotal:34}]},
  {addedAt:5,store:'Albert',date:'2026-10-10',total:300,items:[{name:'Káva Jacobs',lineTotal:189.9},{name:'Mléko',lineTotal:110.1}]}],
  transactions:[
  {id:'p',type:'expense',name:'Penny Market',amount:1361.34,catId:'potr',date:'2026-10-29',receiptAddedAt:1},
  {id:'jab',type:'expense',name:'Jabka Dobra',amount:30,catId:'potr',date:'2026-10-29'},
  {id:'k',type:'expense',name:'Kaufland',amount:875,catId:'potr',date:'2026-10-22',receiptAddedAt:2},
  {id:'piv',type:'expense',name:'Hospoda & Bar – Pivo',amount:120,catId:'bar',date:'2026-10-21'},
  {id:'h',type:'expense',name:'Hostinec u Svatého Jána',amount:1017,catId:'rest',date:'2026-10-18',receiptAddedAt:3},
  {id:'np',type:'expense',name:'Nákupy potravin',amount:30,catId:'potr',date:'2026-10-18'},
  {id:'m',type:'expense',name:'MOL',amount:1022.4,catId:'auto',date:'2026-10-16',receiptAddedAt:4},
  {id:'ben',type:'expense',name:'',amount:988.4,catId:'auto',date:'2026-10-16'},
  {id:'a',type:'expense',name:'Albert',amount:300,catId:'potr',date:'2026-10-10',receiptAddedAt:5},
  {id:'kav',type:'expense',name:'Káva Jacobs',amount:189.9,catId:'potr',date:'2026-10-10'},
  {id:'alb2',type:'expense',name:'Albert Hypermarket',amount:110.1,catId:'potr',date:'2026-10-11'}]};
const c={S,console,fmt:n=>String(n),Math,Date,String,Number,Object,Array,parseFloat,isFinite,getData:()=>S};
vm.createContext(c);
vm.runInContext(dup.replace(/\nwindow\.[^\n]*/g,'\n')+'\n;var S=this.S;'+'\nthis.dupUctenkaPro=t=>{const r=S.receipts.find(x=>x.addedAt===t.receiptAddedAt);return r?{r}:null};',c);
const pol=c.dupParyPolozka(S.transactions), ma=id=>pol.some(p=>p.b.id===id);
t('„Jabka Dobra 30 Kč“ ≠ položka „Piz.Marg.300gSF 30 Kč“ z Penny (jen stejná cena)',!ma('jab'),pol.map(p=>p.b.id));
t('„Hospoda & Bar – Pivo 120 Kč“ ≠ položka „YO čer.bez. 0,7 l 120 Kč“ z Kauflandu',!ma('piv'));
t('„Nákupy potravin 30 Kč“ ≠ „Kečup 30 Kč“ z Hostince (jiná kategorie, malá částka)',!ma('np'));
t('ručně 988,40 bez názvu vedle účtenky MOL (benzín 988,40) se dál hlásí',ma('ben'));
t('ručně „Káva Jacobs 189,90“ = položka „Káva Jacobs“ (podobný název) se hlásí',ma('kav'));
t('ručně „Albert Hypermarket 110,10“ vedle účtenky z Albertu (podobný obchod) se hlásí',ma('alb2'));
t('banner: „1 podezřelý pár“, „2 podezřelé páry“, „5 podezřelých párů“',/pairCount===1\?'podezřelý pár':pairCount<5\?'podezřelé páry':'podezřelých párů'/.test(dup));

console.log('── mobil: u podezřelé transakce štítek ⚠️ a tlačítka Není duplikát ──');
const row=ui.slice(ui.indexOf('function buildTxRow('), ui.indexOf('function deleteTx('));   // pick nejde – výchozí parametr dupMap={}
t('mobilní karta má štítek (buildDupBadge) i řádek tlačítek (buildDupActions)',/dupBadgeM = _dupJe && typeof buildDupBadge/.test(row)&&/dupRowM = _dupJe && typeof buildDupActions/.test(row)&&/\$\{tagsHtmlM\}\$\{dupBadgeM\}/.test(row)&&/\$\{_mobOut\}\$\{dupRowM\}/.test(row));

console.log('── swipe: směr se rozhodne jednou, stránka při tahu do strany stojí ──');
const a=ui.indexOf('// ── Swipe-to-edit'), sw=ui.slice(a, ui.indexOf('function renderTxPage', a));
t('zámek směru po 8 px (svisle = jen scroll, vodorovně = jen karta)',/ZAMEK = 8/.test(sw)&&/smer = ax > ay \? 'x' : 'y'/.test(sw)&&/if\(smer==='y'\)\{[^}]*el=null; return; \}/.test(sw));
t('touchmove není pasivní a vodorovný tah zastaví posun stránky',/\{passive:false\}/.test(sw)&&/ev\.cancelable\) ev\.preventDefault\(\)/.test(sw));
t('posun karty po snímcích (requestAnimationFrame) s will-change, touchcancel ošetřen',/requestAnimationFrame\(kresli\)/.test(sw)&&/willChange='transform'/.test(sw)&&/'touchcancel', konec/.test(sw));
t('otevřená karta jde tahem doprava zavřít (výchozí poloha base)',/base = \(openEl===fg\) \? OPEN : 0/.test(sw)&&/const poz = base \+ dx/.test(sw));
t('oba řádky se swipem mají touch-action: pan-y',(row.match(/touch-action:pan-y/g)||[]).length===2);
t('jen jedna obsluha swipe (registruje se jednou)',(ui.match(/addEventListener\('touchstart'/g)||[]).length===1);

console.log('── filtr ceny ──');
t('Filtr má pole Částka od / do',/id="txAmtMin"[^>]*placeholder="💰 Částka od"/.test(html)&&/id="txAmtMax"[^>]*placeholder="💰 Částka do"/.test(html));
const rt=pick(ui,'renderTx');
t('seznam se filtruje podle částky od/do a filtr je ve štítcích',/txs = txs\.filter\(t => Math\.abs\(t\.amount \|\| t\.amt \|\| 0\) >= amtMin/.test(rt)&&/<= amtMax/.test(rt)&&/amtMin, amtMax \}\);/.test(rt)&&/f\.amtMin != null \|\| f\.amtMax != null/.test(ui)&&/co === 'amt'/.test(ui));
t('Vymazat i proklik z Predikce filtr ceny zruší',/'txAmtMin','txAmtMax'\]\.forEach/.test(pick(adm,'clearTxFilters'))&&/'txSearchFilter','txAmtMin','txAmtMax'\]/.test(trx));
//  výpočet: 30 / 120 / 988,40 a filtr 100–500
const cis=new Function('v','const _v=String(v).replace(/\\s/g,"").replace(",",".");const n=parseFloat(_v);return isFinite(n)&&n>=0?n:null;');
const tx=[{amount:30},{amount:120},{amount:988.4},{amount:-450}], mn=cis('100'), mx=cis('500');
t('filtr 100–500 Kč nechá 120 a 450 (znaménko se nebere)',tx.filter(x=>Math.abs(x.amount)>=mn-0.005&&Math.abs(x.amount)<=mx+0.005).length===2);

console.log('── Upravit transakci z účtenky, která v Historii chybí ──');
const c2={S:{receipts:[{store:'Řeznictví Groh',date:'2026-10-02',total:196.3,items:[{},{}]},{store:'Lidl',date:'2026-10-01',total:448.4,items:[{}]},{store:'Řeznictví Groh',date:'2026-10-02',total:196.3,items:[{},{}],addedAt:9}]},
  sloty:{'rcpt_hist_0':1,'rcpt_hist_1':1}, normalizeStoreName:s=>String(s||'').toLowerCase()};
c2.document={getElementById:id=>c2.sloty[id]||null};
vm.createContext(c2);
vm.runInContext(pick(rc,'rcptUnikKlic')+'\n'+pick(rc,'rcptUnikatni')+'\n'+pick(rc,'rcptSlotPro')+'\nvar S=this.S;',c2);
t('Historie ukazuje dvojitou kopii účtenky jen jednou',c2.rcptUnikatni(c2.S.receipts).length===2);
t('skrytá kopie (pozice 2) se otevře v řádku viditelné kopie (pozice 0)',c2.rcptSlotPro(2)===0&&c2.rcptSlotPro(1)===1);
c2.sloty={}; t('Historie ještě nevykreslená → −1 (počká se / formulář transakce)',c2.rcptSlotPro(0)===-1);
const oh=pick(rc,'openReceiptInHistory'), of=pick(rc,'openReceiptForTx');
t('openReceiptInHistory čeká na vykreslení (8 pokusů) a pak volá naNenalezeno',/if\(\+\+pokus < 8\) \{ setTimeout\(otevri, 180\)/.test(oh)&&/naNenalezeno\(\)/.test(oh)&&/editReceiptFromHistory\(idx, .*, slotIdx\);/.test(oh));
t('editReceiptFromHistory umí otevřít účtenku v řádku jiné kopie',/function editReceiptFromHistory\(index, klic, slotPrimo\)/.test(rc)&&/const slotIdx = slotPrimo != null \? slotPrimo : index;/.test(rc));
t('nenalezená účtenka → formulář transakce (editTx s bezUctenky)',/editTx\(t\.id, true\)/.test(of)&&/showPage\('transakce'\)/.test(of)&&/function editTx\(id, bezUctenky\)/.test(ui)&&/if\(!bezUctenky && typeof rcptJeTxUctenky/.test(ui));

console.log('── Revolut: „DAVID SIMOTA Vám posílá 20 €“ ──');
const c3={S:{categories:[]},console,Date,Math,JSON,Object,String,Number,parseFloat,getData:()=>({categories:[]}),document:{getElementById:()=>null},window:{}};
vm.createContext(c3);
vm.runInContext(sms.replace(/^function renderSmsImport[\s\S]*$/m,'')+'\n'+ib,c3);
const txt='Revolut: DAVID SIMOTA Vám posílá 20 €. Klepnutím poděkujte 💰';
let p=c3.parseBankNotification(txt);
t('rozpoznáno: příjem 20 EUR od DAVID SIMOTA',p&&p.type==='income'&&p.amount===20&&p.currency==='EUR'&&p.merchant==='DAVID SIMOTA',p);
p=c3.parseBankNotification('Revolut: Jana Nováková vám poslala €12,50');
t('i „vám poslala €12,50“ → příjem 12,5 EUR',p&&p.type==='income'&&p.amount===12.5&&p.currency==='EUR'&&p.merchant==='Jana Nováková',p);
p=c3.parseBankNotification('Revolut: John Smith sent you €15.00');
t('anglicky „sent you €15.00“ → příjem 15 EUR',p&&p.type==='income'&&p.amount===15&&p.currency==='EUR',p);
p=c3.parseBankNotification('Revolut: Platba €8.99 v Netflix');
t('dosavadní „Platba €8.99 v Netflix“ zůstává výdaj',p&&p.type==='expense'&&p.amount===8.99,p);
t('bez měny se nic nehádá („Vám posílá zprávu 3“ = nic)',!c3.parseBankNotification('Revolut: Petr Vám posílá zprávu 3'));
const x={app:'Revolut',text:'DAVID SIMOTA Vám posílá 20 €. Klepnutím poděkujte 💰',postedAt:Date.parse('2026-11-06T12:37:00')};
t('v Doručených se notifikace rozpozná (už ne „nerozpoznáno“)',(p=c3.inboxRozpoznej(x))&&p.type==='income'&&p.amount===20&&p.date==='2026-11-06',p);
const o=c3.inboxOdhad({app:'Revolut',text:'Někdo Vám posílá 1 250,50 Kč. Díky',postedAt:Date.parse('2026-11-06T12:37:00')});
t('✎ Zapsat ručně předvyplní typ, částku, měnu, datum a název',o.type==='income'&&o.amount===1250.5&&o.currency==='CZK'&&o.date==='2026-11-06'&&o.name==='Někdo Vám posílá 1 250,50 Kč',o);
const ir=pick(ib,'inboxRucne');
t('✎ Zapsat ručně otevře formulář transakce, notifikaci vyřídí až uložení',/openAddTx\(\)/.test(ir)&&/window\._inboxPoUlozeni = async/.test(ir)&&!/inboxZahodit\(id\);\s*\}$/.test(ir)&&/setTxCurOverride\(o\.currency\)/.test(ir));
const st=pick(deb,'saveTx');
t('saveTx po úspěšném uložení zavolá _txPoUlozeni (4 větve), nové otevření ho zruší',(st.match(/_txPoUlozeni\(\);/g)||[]).length===4&&/window\._inboxPoUlozeni = null;/.test(pick(deb,'openAddTx')));

console.log(`\n${ok} ✅ · ${bad} ❌`);process.exit(bad?1:0);
