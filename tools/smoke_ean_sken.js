// FinanceFlow · smoke test · S24 · TODO-306/308 čárový kód k položce účtenky (klient)
const vm=require('vm'),fs=require('fs'),path=require('path');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const calls=[];
const els={};
const el=()=>({style:{},innerHTML:'',remove(){},appendChild(){}});
const ctx={console,window:{},document:{getElementById:id=>els[id]||(els[id]=el()),createElement:()=>el(),body:{appendChild(){}},head:{appendChild(){}}},
  navigator:{},setTimeout,URL,
  fetch:async(u,o)=>{const b=JSON.parse(o.body);calls.push(b);return {ok:true,status:200,json:async()=>({ok:true,ean:b.ean,produkt:{stav:'nalezeno',nazev:'Ovesné vločky',znacka:'K-Classic'},alias:b.potvrdit?{pocet:2}:null})};}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js'),ctx);
const rc=R('receipts.js'); const i=rc.indexOf('function normalizeStoreName'); const j=rc.indexOf('\n}\n',i)+3;
vm.runInContext(rc.slice(i,j),ctx);
vm.runInContext(R('ean-sken.js'),ctx);
let ok=0,bad=0;const t=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
t('platný EAN',ctx.eanKontrola('8595237405947')); t('neplatný EAN',!ctx.eanKontrola('8595237405948'));
t('kód obchodu',ctx.eanJeObchodni('2001234567893')&&!ctx.eanJeObchodni('8595237405947'));
const k1=ctx.eanAliasKlic('Kaufland Česká republika v.o.s.','K EXO VLOCK 500G'), k2=ctx.eanAliasKlic('KAUFLAND','k exo vlock 500 g');
t('klíč: stejná zkratka = stejný klíč',k1===k2);
t('klíč: gramáž zůstává',ctx.eanAliasKlic('KAUFLAND','K EXO VLOCK 250G')!==k1);
t('klíč projde validací workeru',/^[a-z0-9_,-]{3,150}$/.test(k1));
t('klíč s desetinnou gramáží',/^[a-z0-9_,-]{3,150}$/.test(ctx.eanAliasKlic('Lidl','Máslo 0,25kg')));
t('prázdná zkratka = žádný klíč',ctx.eanAliasKlic('Lidl','')==='');
const h=ctx.eanKartaHTML({stav:'nalezeno',nazev:'<img src=x onerror=1>',nutriscore:'b',nova:4,foto:'https://x/"onload="a'},'8595237405947');
t('karta escapuje',!h.includes('<img src=x')&&!h.includes('"onload="'));
t('karta: Nutri-Score a NOVA',h.includes('Nutri-Score B')&&h.includes('NOVA 4'));
t('karta: nenalezeno',ctx.eanKartaHTML({stav:'nenalezeno'},'123').includes('nezná'));
(async()=>{
  ctx._currentUser={getIdToken:async()=>'T'};
  ctx.window._editReceipt={store:'KAUFLAND',items:[{name:'K EXO VLOCK 500G'}]};
  let rendered=0; ctx.rpRender=()=>rendered++; ctx.showToast=()=>{}; ctx.escHtml=ctx.escHtml||(s=>String(s));
  await ctx.eanSkenuj(0).catch(()=>{});
  await ctx.eanNalezen('8595237405947');
  t('dotaz bez potvrzení',calls[0]&&calls[0].ean==='8595237405947'&&!calls[0].potvrdit);
  await ctx.eanPrirad();
  const it=ctx.window._editReceipt.items[0];
  t('položka dostala kód a název',it.ean==='8595237405947'&&it.eanNazev==='Ovesné vločky');
  t('potvrzení poslalo klíč, obchod a zkratku',calls[1]&&calls[1].potvrdit&&calls[1].klic===k1&&calls[1].raw==='K EXO VLOCK 500G');
  t('editor se překreslil',rendered===1);
  calls.length=0; await ctx.eanNalezen('2001234567893'); t('kód obchodu se neposílá',calls.length===0);
  console.log(`\n${ok} OK, ${bad} chyb`);
})();
