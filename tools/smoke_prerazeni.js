// FinanceFlow · smoke test · Session 27 (v12.09) · 🔄 Opravit kategorii u starých účtenek (předělané okno)
//  Milan: „chybí mi kontext, navíc podle obrázku tam je tak polovina věcí správně. Nejde to ani jednotlivě…
//  je to nejapné a nechápu to.“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const S={uiCfg:{},categories:[{id:'cat1',name:'Nákupy potravin',icon:'🛒',type:'expense',subs:['Obchůdek','Supermarket']},{id:'cat17',name:'Domácí potřeby',icon:'🧹',type:'expense'},
  {id:'cat20',name:'Restaurace & Kavárny',icon:'🍽️',type:'expense',coicop:11},{id:'cat23',name:'Nákupy všeobecné',icon:'🛍️',type:'expense'},{id:'cat5',name:'Zábava',icon:'🎬',type:'expense'}],
 receipts:[
  {store:'Penny',date:'2026-09-14',items:[{name:'OYAKATA Ramen Hot 63g',itemCatId:''},{name:'Rohlík 43g',itemCatId:'cat1',itemSubcat:'Supermarket'},{name:'Nektarinky koš(ks)',itemCatId:'cat1'},{name:'Papírová taška velká',itemCatId:'cat1'},{name:'Jar 450ml',itemCatId:'cat1'}]},
  {store:'Lidl',date:'2026-09-02',items:[{name:'Jar 450ml',itemCatId:'cat1'},{name:'Koš na prádlo',itemCatId:'cat23'}]},
  {store:'U Zlatého lva',date:'2026-08-30',items:[{name:'Kečup',itemCatId:'cat20'},{name:'Švestka 0,5',itemCatId:'cat20'}]}],
 transactions:[{id:'t',type:'expense',receiptItems:[{name:'Jar 450ml',itemCatId:'cat1'}]}]};
const el={};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:id=>el[id]||null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,save(){ctx.ulozeno=(ctx.ulozeno||0)+1},showToast(m){ctx.toast=m}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
ctx.mapaUzivKresli=()=>{};
//  tvoje volba: Jar → Domácí potřeby, ramen → potraviny, rohlík → potraviny › Obchůdek (podkategorie obchodu)
ctx._set({'jar':{catId:'cat17',zdroj:'uzivatel'},'oyakata ramen hot':{catId:'cat1',zdroj:'uzivatel'},'rohlik':{catId:'cat1',subcat:'Obchůdek',zdroj:'uzivatel'}},{},{});

console.log('── návrh ──');
const zm=ctx.mapaPrerazeniNavrh(S), u=zm.filter(z=>z.kde==='uctenka');
const p=n=>u.find(z=>z.nazev===n)||{};
t('restaurace se nepřeřazuje (Kečup, Švestka 0,5 zůstanou v Restauraci)',p('Kečup').vynech==='restaurace'||!u.some(z=>z.nazev==='Kečup'),u.map(z=>[z.nazev,z.vynech]));
t('změna jen podkategorie (Rohlík › Obchůdek) se vynechá',p('Rohlík 43g').vynech==='podkategorie');
t('„Nektarinky koš“ už není koš → Domácí potřeby (past)',!u.some(z=>z.nazev==='Nektarinky koš(ks)'&&z.na==='cat17'));
t('„Papírová taška“ už nejde do Zábavy',!u.some(z=>z.nazev==='Papírová taška velká'&&z.na==='cat5'));
t('tvoje volba = jisté (moje), odhad podle názvu = nejisté se slovem',p('Jar 450ml').zdroj==='moje'&&p('Jar 450ml').jiste&&p('Koš na prádlo').zdroj==='nazev'&&!p('Koš na prádlo').jiste&&p('Koš na prádlo').slovo==='koš na prádlo',[p('Koš na prádlo').zdroj,p('Koš na prádlo').slovo]);
const rd=ctx.mapaPrerazeniRadky(zm);
const jar=rd.find(g=>g.nazev==='Jar 450ml');
t('řádek = výrobek se všemi nákupy (Jar: Penny 14. 9., Lidl 2. 9.), jisté nahoře',jar&&jar.nakupy.length===2&&jar.nakupy[0].obchod==='Penny'&&rd[0].jiste&&!rd[rd.length-1].jiste,rd.map(g=>[g.nazev,g.nakupy.length,g.jiste]));
t('tlačítko počítá jen to, co se nabízí (bez restaurace a podkategorií)',/4 položek/.test(ctx.mapaPrerazeniTlacitko())&&/Zkontrolovat/.test(ctx.mapaPrerazeniTlacitko()),ctx.mapaPrerazeniTlacitko().replace(/<[^>]+>/g,'').trim());

console.log('── přeřazení vybraných ──');
const vyb=rd.filter(g=>g.nazev==='Jar 450ml'), nevyb=rd.filter(g=>g.nazev==='Koš na prádlo');
const n=ctx.mapaPrerazeniProvest(vyb,nevyb);
t('přeřazen jen Jar (2 účtenky + kopie v transakci), Koš ne',n===2&&S.receipts[0].items[4].itemCatId==='cat17'&&S.receipts[1].items[0].itemCatId==='cat17'&&S.transactions[0].receiptItems[0].itemCatId==='cat17'&&S.receipts[1].items[1].itemCatId==='cat23',[n,S.receipts[1].items[1].itemCatId]);
t('restaurace a podkategorie nedotčené',S.receipts[2].items[0].itemCatId==='cat20'&&S.receipts[0].items[1].itemSubcat==='Supermarket');
t('nezaškrtnutý Koš se příště nenabídne (uloženo v uiCfg)',Object.keys(S.uiCfg.prerazeniNe||{}).length===1&&!ctx.mapaPrerazeniRadky(ctx.mapaPrerazeniNavrh(S)).some(g=>g.nazev==='Koš na prádlo'));
t('zbývá ramen (tvoje volba)',ctx.mapaPrerazeniRadky(ctx.mapaPrerazeniNavrh(S)).map(g=>g.nazev).join()==='OYAKATA Ramen Hot 63g');
ctx.mapaPrerazeniVratSkryte();
t('„zobrazit znovu“ vrátí skryté',ctx.mapaPrerazeniRadky(ctx.mapaPrerazeniNavrh(S)).some(g=>g.nazev==='Koš na prádlo'));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
