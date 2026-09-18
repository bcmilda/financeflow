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
const run=(itemPrices)=>{return eval('(function(){'+src.slice(a,b)+';return mergedPrices;})()');};
let m=run({'sojové kostky':[{price:19.9,originalWeight:.1},{price:59.9,originalWeight:.3}]});
T('100 g a 300 g = DVĚ skupiny', Object.keys(m).length===2);
m=run({'čokoláda':[{price:30,originalWeight:.1},{price:30,originalWeight:.09}]}); T('100 g → 90 g zůstává spolu (shrinkflace)', Object.keys(m).length===1);
m=run({'rohlík':[{price:2.9,originalWeight:.043},{price:3.5,originalWeight:.043},{price:3,originalWeight:null}]}); T('stejné balení + bez gramáže = jedna skupina', Object.keys(m).length===1&&Object.values(m)[0].length===3);
m=run({'rohlík':[{price:2.9,originalWeight:null}],'rohlík 2':[{price:3,originalWeight:null}]}); T('klíče lišící se jen číslem se dál slévají', Object.keys(m).length===1);
console.log(`S23: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
