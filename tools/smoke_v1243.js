// FinanceFlow · smoke test · S29 (v12.43) · editor účtenky podle návrhu D1/D2 + TODO-385 (propojit už při zápisu) + TODO-386 (opakovaná platba u běžné transakce)
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), ui=R('ui.js','../js/ui.js'), deb=R('debts.js','../js/debts.js'), css=R('styles.css','../css/styles.css'), html=R('app.html','../app.html');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const nb=s=>String(s).replace(/ /g,' ');

console.log('── editor účtenky: částka s Kč, sleva v % ──');
const e={Intl,Math,parseFloat,String,window:{},_rpUvolni:()=>{},rpRender:()=>{e.kresleno=(e.kresleno||0)+1}};
vm.createContext(e);
vm.runInContext(pick(rc,'rpKc')+'\n'+pick(rc,'rpSlevaPct')+'\n'+pick(rc,'rpItemNazev')+'\nvar _polozky=[];function _rpIt(i){return _polozky[i]}',e);
t('35 → „35,00 Kč“ (dřív jen „35“ bez měny)',nb(e.rpKc(35))==='35,00 Kč',e.rpKc(35));
t('18,06 a 1 234,5 → dvě desetinná místa a Kč',nb(e.rpKc(18.06))==='18,06 Kč'&&nb(e.rpKc(1234.5))==='1 234,50 Kč',[e.rpKc(18.06),e.rpKc(1234.5)]);
t('sleva 1,52 Kč při zaplacených 18,06 = 8 % (sleva ÷ cena před slevou 19,58)',e.rpSlevaPct(18.06,1.52)===8);
t('sleva 20 Kč při zaplacených 9,90 = 67 %',e.rpSlevaPct(9.9,20)===67);
t('bez slevy 0 %, nulová cena nedělí nulou',e.rpSlevaPct(35,0)===0&&e.rpSlevaPct(0,0)===0);

console.log('── název položky: text z účtenky není „tvůj název“ ──');
vm.runInContext('_polozky=[{name:"ROHLÍK 43G"},{name:"KRAJ JOG",nazevAI:"Krajanka jogurt"},{name:"Mag.S Penny"}]',e);
e.rpItemNazev(0,'ROHLÍK 43G');
t('bez návrhu AI: stejný text jako na účtence se neuloží jako vlastní název',vm.runInContext('_polozky[0].nazev',e)===undefined);
e.rpItemNazev(1,'KRAJ JOG');
t('s návrhem AI: přepsání na text z účtenky JE vlastní název',vm.runInContext('_polozky[1].nazev',e)==='KRAJ JOG');
e.rpItemNazev(2,'Časopis Penny');
t('vlastní název se uloží, text z účtenky (párování) zůstává',vm.runInContext('_polozky[2].nazev',e)==='Časopis Penny'&&vm.runInContext('_polozky[2].name',e)==='Mag.S Penny');
e.rpItemNazev(2,'');
t('smazaný název = zpět text z účtenky',vm.runInContext('_polozky[2].nazev',e)===undefined);

console.log('── editor účtenky: karta a rozložení ──');
const rr=pick(rc,'rpRender');
t('karta má číslo položky, třídy pro telefon i počítač a tři názvy',/class="rp-k-cislo"[^>]*>\$\{cislo\}/.test(rr)&&/class="rp-k-nazev"/.test(rr)&&/class="rp-k-nazvy"/.test(rr)&&/class="rp-k-akce"/.test(rr)&&/🧾 z účtenky:/.test(rr)&&/\$\{kodRadek\}/.test(rr));
t('bez názvu se ukáže text z účtenky jako hodnota (ne šedý placeholder) + popisek',/const nazevUkaz = nazev \|\| it\.name \|\| '';/.test(rr)&&/value="\$\{_esc\(nazevUkaz\)\}"/.test(rr)&&/název z účtenky · klepni a pojmenuj po svém/.test(rr));
t('sleva: přeškrtnutá cena s Kč, štítek −%, „ušetřeno“',/id="rp_puv_\$\{i\}"[\s\S]{0,200}rpKc\(puvodne\)/.test(rr)&&/id="rp_pct_\$\{i\}"/.test(rr)&&/ušetřeno <b id="rp_uset_\$\{i\}"/.test(rr));
t('přepočet při psaní drží Kč i procenta',/getElementById\('rp_pct_' \+ i\)/.test(pick(rc,'rpUpdateTotal'))&&/rpKc\(a\)/.test(pick(rc,'rpUpdateTotal')));
t('styly: šipky u čísel pryč, počítač na dva řádky podle šířky editoru (ne okna)',/\.rp-karta input\[type=number\]::-webkit-inner-spin-button\{-webkit-appearance:none/.test(css)&&/\.rp-polozky\{container-type:inline-size\}/.test(css)&&/@container \(min-width:980px\)/.test(css)&&/\.rp-k-dolni\{display:contents\}/.test(css));
t('hlavička účtenky beze změny (obchod, město, kraj, datum, Použít na všechny položky)',/Použít na všechny položky/.test(rc));

console.log('── TODO-385: propojit už při zápisu ──');
const mk=()=>{const c={S:{transactions:[{id:'v1',type:'expense',name:'Alza',amount:500,date:'2026-11-01'},{id:'v2',type:'expense',name:'Lidl',amount:120,date:'2026-11-05'},{id:'p1',type:'income',name:'Výplata',amount:30000,date:'2026-11-10'}]},
  viewingUid:null,curTxType:'income',pole:{txDate:'2026-11-12',txAmt:'500'},box:{style:{},innerHTML:''},toasty:[],save:()=>{c.ulozeno=(c.ulozeno||0)+1},showToast:m=>c.toasty.push(m),fmtP:n=>String(n),escHtml:s=>String(s),
  Math,parseFloat,Date,String,Array,isFinite};
  c.window=c; c.getData=()=>c.S; c.document={getElementById:id=>id==='txPropojBox'?c.box:(id in c.pole?{value:c.pole[id]}:null)};
  vm.createContext(c);
  const i0=ui.indexOf('const _txPropId'), i1=ui.indexOf('Object.assign(window, { txPropojene');
  vm.runInContext('var S=this.S;'+ui.slice(i0,i1)+'\nthis._nove=()=>_txPropNove;',c); return c;};
let c=mk();
c.txPropojNovaReset();
t('nová transakce (příjem): tlačítko 🔗 je vidět hned, bez uložení',c.box.style.display==='block'&&/Propojit s jinou transakcí/.test(c.box.innerHTML),c.box);
const k=c.txPropojKandidati(c.txPropojKoncept(),c.S);
t('k příjmu 500 Kč nabídne výdaje, stejná částka první',k.length===2&&k[0].id==='v1',k.map(x=>x.id));
c.txPropoj('','v1');
t('výběr u neuložené transakce nic nezapíše do dat a neukládá',!c.S.transactions[0].propojeno&&!c.ulozeno&&c._nove().length===1&&/Alza/.test(c.box.innerHTML));
c.S.transactions.push({id:'n1',type:'income',name:'Cashback',amount:500,date:'2026-11-12'});
t('po uložení: propojeno na obou stranách',c.txPropojUloz('n1')===1&&c.S.transactions[3].propojeno[0]==='v1'&&c.S.transactions[0].propojeno[0]==='n1'&&c._nove().length===0,c.S.transactions);
c=mk(); c.txPropojNovaReset(); c.txPropoj('','v1'); c.txOdpoj('','v1');
t('odebrání před uložením',c._nove().length===0);
c.txPropoj('','v2'); c.txPropojNovaReset();
t('zrušený zápis nic nezanechá (další nová transakce začíná čistá)',c._nove().length===0&&!c.S.transactions.some(x=>x.propojeno));
c=mk(); c.curTxType='transfer'; c.txPropojNovaReset();
t('u přesunu a splátky se nenabízí',c.box.style.display==='none');
c=mk(); c.txPropoj('p1','v1');
t('uložená transakce se propojuje jako dřív (hned, s uložením)',c.S.transactions[2].propojeno[0]==='v1'&&c.ulozeno===1);
t('saveTx zapíše propojení nové transakce, openAddTx ho vynuluje',/txPropojUloz\(_savedId\)/.test(pick(deb,'saveTx'))&&/txPropojNovaReset\(\)/.test(pick(deb,'openAddTx')));

console.log('── TODO-386: opakovaná platba u běžné transakce ──');
const mo=()=>{const d={S:{sablony:[]},pole:{txOpak:{checked:true},txOpakFreq:{value:'monthly'},txOpakOpts:{style:{}}},toasty:[],showToast:m=>d.toasty.push(m),ffDnes:()=>'2026-11-12',Math,parseInt,String,Array,Object};
  let n=0; d.uid=()=>'s'+(++n); d.window=d; d.document={getElementById:id=>d.pole[id]||null};
  vm.createContext(d);
  vm.runInContext('var S=this.S;'+['txOpakReset','txOpakPrepni','txOpakSablona','txOpakZaloz'].map(f=>pick(deb,f)).join('\n'),d); return d;};
const tx={type:'expense',name:'Netflix',amount:259,catId:'cat7',subcat:'Netflix',date:'2026-11-12',note:'',walletId:'w1',payTypeId:'card',tags:['zabava']};
let d=mo(), s=d.txOpakZaloz(tx);
t('měsíčně: šablona se stejným názvem, částkou, kategorií, podkategorií, peněženkou, typem platby a tagy',s&&s.name==='Netflix'&&s.amount===259&&s.type==='expense'&&s.catId==='cat7'&&s.subcat==='Netflix'&&s.wallet==='w1'&&s.payType==='card'&&s.tags[0]==='zabava'&&s.freq==='monthly'&&s.den===12&&s.auto===true,s);
t('měsíc transakce už je zapsaný – šablona ho nezapíše podruhé',s.posledniZapis==='2026-11'&&d.S.sablony.length===1);
t('zaškrtnutí se po uložení vrátí (další transakce šablonu nezaloží)',d.pole.txOpak.checked===false&&d.txOpakZaloz(tx)===null&&d.S.sablony.length===1);
d.pole.txOpak.checked=true;
t('stejná šablona podruhé nevznikne',d.txOpakZaloz(tx)===null&&d.S.sablony.length===1&&/už existuje/.test(d.toasty[d.toasty.length-1]));
d=mo(); d.pole.txOpakFreq.value='yearly'; s=d.txOpakZaloz(Object.assign({},tx,{name:'Pojištění auta',amount:4200,date:'2026-03-31'}));
t('ročně: první splatnost = datum transakce (další výskyty se počítají od ní)',s&&s.freq==='yearly'&&s.prvni==='2026-03-31'&&!s.posledniZapis,s);
d=mo(); d.pole.txOpak.checked=false;
t('nezaškrtnuto = žádná šablona',d.txOpakZaloz(tx)===null&&d.S.sablony.length===0);
d=mo();
t('přesun ani nulová částka šablonu nezaloží',d.txOpakSablona({type:'transfer',name:'x',amount:5,date:'2026-11-12'},'monthly')===null&&d.txOpakSablona({type:'expense',name:'x',amount:0,date:'2026-11-12'},'monthly')===null);
t('formulář: blok 🔁 u příjmu a výdaje, skrytý u přesunu a splátky',/id="txOpakBox"/.test(html)&&/id="txOpak" onchange="txOpakPrepni\(\)"/.test(html)&&/ob\.style\.display=\(type==='income'\|\|type==='expense'\)\?'block':'none'/.test(pick(deb,'setTxType')));
t('saveTx šablonu zakládá, nová i upravovaná transakce začíná nezaškrtnutá',/txOpakZaloz\(/.test(pick(deb,'saveTx'))&&/txOpakReset\(\)/.test(pick(deb,'openAddTx'))&&/txOpakReset\(\)/.test(ui));

console.log(`\nv12.43: ${ok} ✓  ${bad} ✗`);
process.exit(bad?1:0);
