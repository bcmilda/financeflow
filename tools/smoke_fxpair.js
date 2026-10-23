// FIX-261 – amtCZK a fxRef musí vždy popisovat TÝŽ stav transakce.
// Simuluje pravidlo ze saveTx nad ověřenými vstupy.
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m)};

// věrná kopie rozhodovací logiky ze saveTx (FIX-261)
function ulozit({prev, amt, currency, czkUserTyped, typedCzk, fxRestamp, kurzDnes}){
  const out={amount:amt, currency, amtCZK: czkUserTyped ? typedCzk : (prev?prev.amtCZK:null)};
  const zmena = !!prev && (Math.abs((prev.amount||0)-amt)>0.005 || (prev.currency||null)!==(currency||null));
  if(currency){
    if(prev && prev.fxRef!=null && !zmena && !fxRestamp){
      out.fxRef=prev.fxRef;
    } else {
      out.fxRef=kurzDnes;
      if((zmena || fxRestamp) && !czkUserTyped && kurzDnes) out.amtCZK=Math.round(amt*kurzDnes*100)/100;
    }
  } else { out.fxRef=null; }
  return out;
}
const kurzBanky=t=>t.amtCZK/t.amount;
const marze=t=>(kurzBanky(t)/t.fxRef-1)*100;

// původní stav: 20 € zaplaceno 594 Kč, ČNB tehdy 24,16
const puvodni={amount:20, currency:'EUR', amtCZK:594, fxRef:24.16};

console.log('── FIX-261 · amtCZK a fxRef jako pár ──');

check('beze změny zůstává vše zmrazené (historie se nepřepisuje)',()=>{
  const t=ulozit({prev:puvodni, amt:20, currency:'EUR', czkUserTyped:false, fxRestamp:false, kurzDnes:25.90});
  assert(t.fxRef===24.16,'fxRef přeražen na '+t.fxRef);
  assert(t.amtCZK===594,'amtCZK '+t.amtCZK);
  assert(Math.abs(marze(t)-22.9)<0.2,'marže '+marze(t).toFixed(1));
});

check('🚩 MILANŮV PŘÍPAD A: změním 20 € na 25 € a zapomenu na Kč',()=>{
  const t=ulozit({prev:puvodni, amt:25, currency:'EUR', czkUserTyped:false, fxRestamp:false, kurzDnes:25.90});
  // bez opravy by zůstalo 594 Kč → kurz 23,76 → VYMYŠLENÁ výhodná směna
  assert(t.amtCZK!==594,'zůstala stará částka → appka by hlásila fiktivní kurz '+(594/25).toFixed(2));
  assert(Math.abs(kurzBanky(t)-25.90)<0.01,'kurz banky '+kurzBanky(t));
  assert(Math.abs(marze(t))<0.01,'marže '+marze(t).toFixed(2)+' – po přepočtu má být nula, ne fikce');
});

check('🚩 MILANŮV PŘÍPAD B: Přepočítat po 2 týdnech přerazí i referenční kurz',()=>{
  const t=ulozit({prev:puvodni, amt:20, currency:'EUR', czkUserTyped:false, fxRestamp:true, kurzDnes:25.90});
  assert(t.fxRef===25.90,'fxRef zůstal starý ('+t.fxRef+') → rozdíl proti novému kurzu by byl smyšlený');
  assert(Math.abs(marze(t))<0.01,'marže '+marze(t).toFixed(2));
});

check('změním částku A ručně přepíšu Kč → moje číslo platí, kurz se přerazí',()=>{
  const t=ulozit({prev:puvodni, amt:25, currency:'EUR', czkUserTyped:true, typedCzk:742, fxRestamp:false, kurzDnes:25.90});
  assert(t.amtCZK===742,'přepsal jsem 742, uloženo '+t.amtCZK);
  assert(t.fxRef===25.90,'fxRef '+t.fxRef+' – nové měření musí mít nový referenční kurz');
  assert(marze(t)>13&&marze(t)<16,'marže '+marze(t).toFixed(1));
});

check('změna MĚNY se bere jako nové měření',()=>{
  const t=ulozit({prev:puvodni, amt:20, currency:'PLN', czkUserTyped:false, fxRestamp:false, kurzDnes:5.90});
  assert(t.fxRef===5.90,'fxRef '+t.fxRef);
  assert(Math.abs(t.amtCZK-118)<0.01,'amtCZK '+t.amtCZK);
});

check('přepnutí na CZK smaže kurzové údaje',()=>{
  const t=ulozit({prev:puvodni, amt:20, currency:null, czkUserTyped:false, fxRestamp:false, kurzDnes:25.90});
  assert(t.fxRef===null,'fxRef '+t.fxRef);
});

check('nová transakce bez předchůdce dostane dnešní kurz',()=>{
  const t=ulozit({prev:null, amt:30, currency:'EUR', czkUserTyped:true, typedCzk:800, fxRestamp:false, kurzDnes:25.90});
  assert(t.fxRef===25.90&&t.amtCZK===800);
});

check('nedostupný kurz ČNB → radši žádný údaj než špatný',()=>{
  const t=ulozit({prev:puvodni, amt:25, currency:'EUR', czkUserTyped:false, fxRestamp:false, kurzDnes:null});
  assert(t.fxRef===null,'fxRef '+t.fxRef);
});

console.log('\n── statická kontrola zapojení ──');
const fs=require('fs');
check('oninput nastavuje _czkUserTyped',()=>{
  assert(/_czkUserTyped=true/.test(fs.readFileSync('app.html','utf8')),'app.html nenastavuje příznak');
});
check('editace příznaky resetuje',()=>{
  assert(/_czkUserTyped = false/.test(fs.readFileSync('ui.js','utf8')),'ui.js neresetuje');
});
check('Přepočítat vyvolá přeražení kurzu',()=>{
  assert(/_fxRestamp = true/.test(fs.readFileSync('debts.js','utf8')),'tlačítko nerazí fxRef');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ PÁR amtCZK + fxRef OVĚŘEN');
process.exit(fails?1:0);
