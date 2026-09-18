const fs=require('fs');const src=fs.readFileSync('receipts.js','utf8');
function fn(name){const a=src.indexOf('function '+name+'(');if(a<0)throw new Error('chybí '+name);let i=src.indexOf('{',a),d=0;for(;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(!d)break;}}return src.slice(a,i+1);}
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
global.window={};global.RECEIPT_TOLERANCE=1;
eval(fn('lineAmt'));eval(fn('receiptCompleteness'));eval(fn('rpDiscountCandidates'));eval(fn('rpApplyNegativeLines'));eval(fn('rpNakupCat'));eval(fn('guessItemCatId'));eval(fn('receiptSavings'));
// — Kaufland: 2×49,90 bez slevy, natištěno o 49,90 méně
const mk=()=>({total:150.00,items:[{name:'Rohlík',price:2.9,qty:6,lineTotal:17.4},{name:'OYAKATA Ramen',price:49.9,qty:2,lineTotal:99.8},{name:'Mléko',price:82.7,qty:1,lineTotal:82.7}]});
let r=mk(); r.printedTotal=150.00; // součet 199,90
let c=receiptCompleteness(r); T('kontrola hlásí přesah', c&&!c.ok&&!c.chybi&&Math.abs(c.diff+49.9)<0.01);
let k=rpDiscountCandidates(r,49.9); T('silný kandidát je Ramen', k[0].name==='OYAKATA Ramen'&&k[0].silny);
T('rohlík (řádek 17,40 < sleva) není kandidát', !k.some(x=>x.name==='Rohlík'));
// — negativeLines: přesná shoda → doplní
r=mk(); r.negativeLines=[{label:'Tvoje cena s',amount:-49.9,itemIndex:1}];
T('negLines doplní 1 slevu', rpApplyNegativeLines(r)===1 && r.items[1].discount===49.9 && Math.abs(r.items[1].lineTotal-49.9)<0.001);
T('pak součet sedí', receiptCompleteness(r).ok); T('sleva se počítá do ušetřeno', Math.abs(receiptSavings(r)-49.9)<0.001);
T('podruhé už nic (idempotence)', rpApplyNegativeLines(r)===0);
// — negativeLines: nesedí → nesahat
r=mk(); r.negativeLines=[{amount:20,itemIndex:1}]; T('nesedící částka → beze změny', rpApplyNegativeLines(r)===0 && !r.items[1].discount);
// — sleva už promítnutá → nezdvojit
r=mk(); r.items[1].discount=49.9; r.items[1].lineTotal=49.9; r.negativeLines=[{amount:49.9,itemIndex:1}];
T('už započtená sleva se nezdvojí', rpApplyNegativeLines(r)===0 && r.items[1].lineTotal===49.9);
// — Nákup
global.lookupCategoryMapping=()=>null;global.RP_ITEM_CATS={'Jídlo & Nákupy':['rohlík']};global.getRpCatId=()=>'cat1';
let D={categories:[{id:'cat1',name:'Jídlo & Nákupy',type:'expense'},{id:'cat23',name:'Nákup',type:'expense'}]};global.getData=()=>D;
let g=guessItemCatId('SEDITA MILA REZY 50G','Jídlo & Nákupy'); T('neznámá položka → skutečný Nákup cat23', g.catId==='cat23'&&g.catName==='Nákup');
T('známá položka dál podle klíčových slov', guessItemCatId('ROHLÍK 43G').catId==='cat1');
D={categories:[{id:'cat1',name:'Jídlo & Nákupy',type:'expense'}]}; T('bez kategorie Nákup → nouzová virtuální', guessItemCatId('xyz').catId==='');
T('„Jídlo & Nákupy" se neplete s Nákupem', rpNakupCat({categories:[{id:'cat1',name:'Jídlo & Nákupy',type:'expense'}]})===null);
// — ceny podle balení: vyříznout blok a spustit
const a=src.indexOf('  const PKG_TOL = 1.25;'),b=src.indexOf('  const priceChanges = Object.entries(mergedPrices)');
const run=(itemPrices)=>{return eval('(function(){var _genericSkipped=0,_genericNames=new Set();'+src.slice(a,b)+';return mergedPrices;})()');};
let m=run({'sojové kostky':[{price:19.9,originalWeight:.1},{price:59.9,originalWeight:.3}]});
T('100 g a 300 g = DVĚ skupiny', Object.keys(m).length===2);
m=run({'čokoláda':[{price:30,originalWeight:.1},{price:30,originalWeight:.09}]}); T('100 g → 90 g zůstává spolu (shrinkflace)', Object.keys(m).length===1);
m=run({'rohlík':[{price:2.9,originalWeight:.043},{price:3.5,originalWeight:.043},{price:3,originalWeight:null}]}); T('stejné balení + bez gramáže = jedna skupina', Object.keys(m).length===1&&Object.values(m)[0].length===3);
m=run({'rohlík':[{price:2.9,originalWeight:null}],'rohlík 2':[{price:3,originalWeight:null}]}); T('klíče lišící se jen číslem se dál slévají', Object.keys(m).length===1);

// ═══ v10.85 ═══
// — obecné názvy
const rs=src; eval(rs.slice(rs.indexOf('const RP_GENERIC_NAMES'), rs.indexOf('function rpIsGenericName')).replace('const RP_GENERIC_NAMES','global.RP_GENERIC_NAMES'));eval(fn('rpIsGenericName'));
['Uzeniny','UZENINY','Pečivo','Zboží 21%','Ovoce a zelenina','  ','12345','Maso'].forEach(n=>T('obecný: '+n, rpIsGenericName(n)===true));
['Vysočina 100g','ROHLÍK 43G','Uzeniny Vysočina','Sojové kostky 300g','Pečivo Kaiserka','Maso mleté 500g'].forEach(n=>T('konkrétní: '+n, rpIsGenericName(n)===false));
// — záložka Slevy
global.fmt=v=>v+' Kč';global.czkToBase=v=>v;global.curSym=()=>'Kč';global.escHtml=x=>String(x);eval('var _cNum = v => fmt(Math.round(czkToBase(v)));');eval(fn('buildDiscountsTab'));
let h0=buildDiscountsTab([{store:'Kaufland',date:'2026-09-12',total:100,items:[{name:'A',price:10,qty:1}]}]);
T('Slevy: bez slev se karta NESCHOVÁ a řekne proč', /Ušetřeno slevami/.test(h0)&&/Zatím <b>0 Kč<\/b>/.test(h0));
let h1=buildDiscountsTab([{store:'Kaufland',date:new Date().toISOString().slice(0,10),total:150,items:[{name:'Ramen',price:49.9,qty:2,lineTotal:49.9,discount:49.9}]},{store:'KAUFLAND',date:'2026-01-02',total:50,items:[]}]);
T('Slevy: tabulka podle obchodů', /Kde jsi ušetřil/.test(h1)); T('Slevy: obchod sloučen bez ohledu na velikost písmen (1 z 2 účtenek)', /1 z 2/.test(h1));
T('Slevy: seznam položek ve slevě', /Položky ve slevě/.test(h1)&&/Ramen/.test(h1)&&/−50 %/.test(h1));
T('Slevy: má vlastní záložku a přepínač ji zná', /id="utab-discounts"/.test(src)&&/'prices','discounts','stores'/.test(src));
T('Statistiky už kartu slev neobsahují dvakrát', (src.match(/💸 Ušetřeno slevami<\/span>/g)||[]).length===2); // prázdný + plný stav, oba v buildDiscountsTab
// — skóre: obě čísla na dosažitelné škále
const ps=fs.readFileSync('premium.js','utf8');
const pf=(n)=>{const a=ps.indexOf('function '+n+'(');let i=ps.indexOf('{',a),d=0;for(;i<ps.length;i++){if(ps[i]==='{')d++;else if(ps[i]==='}'){d--;if(!d)break;}}return ps.slice(a,i+1);};
eval(ps.slice(ps.indexOf('const _FSCORE_ZONES'), ps.indexOf('];',ps.indexOf('const _FSCORE_ZONES'))+2).replace('const ','var '));
eval(pf('_scoreArcGauge'));eval(pf('_scoreNextGrade'));eval(pf('renderFinancialScore'));
const card={innerHTML:''};global.document={getElementById:()=>card};global.showPage=()=>{};
const mkSc=(cov)=>({total:100,baseTotal:310,consistencyBonus:0,grade:{color:'#4ade80',emoji:'🏆',label:'Výborné'},rawTotal:310,rawMax:310,availMax:Math.round(cov/100*310),coverage:cov,
  missing:cov<100?['S3','S4']:[],missingNames:cov<100?['rezerva','spoření']:[],components:[{label:'💰 Cash flow',score:93,max:93,detail:'',avail:true}],trend:{score:0,label:'',consistencyMonths:0,bonus:0}});
try{
  global.computeFinancialScore=()=>mkSc(65); renderFinancialScore({});
  T('skóre 65 %: NEukazuje 310 / 310', !/>310<\/tspan>/.test(card.innerHTML));
  T('skóre 65 %: ukazuje 202 z 202 dosažitelných', />202<\/tspan>/.test(card.innerHTML)&&/\/ 202/.test(card.innerHTML));
  T('skóre 65 %: řekne, kolik bodů je mimo hru', /202 z 310 bodů/.test(card.innerHTML)&&/\(108\)/.test(card.innerHTML));
  global.computeFinancialScore=()=>mkSc(100); renderFinancialScore({});
  T('skóre 100 %: plná škála 310 beze změny', />310<\/tspan>/.test(card.innerHTML)&&!/z 310 bodů/.test(card.innerHTML));
  const half=mkSc(65); half.rawTotal=155; global.computeFinancialScore=()=>half; renderFinancialScore({});
  T('skóre 65 %, polovina bodů → 101 / 202 (poměr zachován)', />101<\/tspan>/.test(card.innerHTML));
}catch(e){ T('render skóre spadl: '+e.message,false); }
// — checklist: hotové sbalené
const us=fs.readFileSync('ui.js','utf8');
const uf=(n)=>{const a=us.indexOf('function '+n+'(');let i=us.indexOf('{',a),d=0;for(;i<us.length;i++){if(us[i]==='{')d++;else if(us[i]==='}'){d--;if(!d)break;}}return us.slice(a,i+1);};
const LS={};global.localStorage={getItem:k=>LS[k]??null,setItem:(k,v)=>{LS[k]=String(v);}};global.viewingUid=null;global._settings={firstDay:10,hasDebts:false};global.S={};
eval(uf('_chkFoldOpen'));eval(uf('_chkFoldHTML'));eval(uf('renderOnboardingCard'));
try{
  const DD={transactions:[{type:'income',catId:'moje',amount:1},{type:'expense',catId:'cat1',amount:1}],categories:[{id:'moje',name:'Brigáda',type:'income'},{id:'cat7',name:'Výplata',type:'income',stable:true}],debts:[]};
  renderOnboardingCard(DD);
  T('checklist: hotové kroky nejsou ve výchozím stavu vidět', !/text-decoration:line-through/.test(card.innerHTML)&&/Hotovo \(\d\)/.test(card.innerHTML));
  T('checklist: nový krok stabilita příjmů hlásí vlastní kategorii bez nastavení', /Nastav stabilitu u příjmových kategorií/.test(card.innerHTML)&&/Brigáda/.test(card.innerHTML));
  LS['ff_chkDone_onboard']='1'; renderOnboardingCard(DD);
  T('checklist: po rozbalení se hotové ukážou', /text-decoration:line-through/.test(card.innerHTML)&&/skrýt/.test(card.innerHTML));
  DD.categories[0].stabilityWeight=0.3; LS['ff_chkDone_onboard']='0'; renderOnboardingCard(DD);
  T('checklist: po nastavení stability krok zmizí mezi hotové', !/chybí u „Brigáda/.test(card.innerHTML));
}catch(e){ T('render checklistu spadl: '+e.message,false); }
console.log(`S23: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
