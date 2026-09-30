// FinanceFlow · smoke test · S24 · v11.09 Mapa položek: statistika taxonomie, karta výrobku, semafor živin, kód
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo & Nákupy',icon:'🛒',type:'expense'},{id:'cat23',name:'Nákup',icon:'🛍️',type:'expense'}],receipts:[]};
const ctx={console,S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{}}),body:{appendChild(){}},head:{appendChild(){}}},
 fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout,URL,getData:()=>S};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
vm.runInContext(R('ean-sken.js','../js/ean-sken.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
ctx._set({}, {}, {});
S.receipts=[
 {date:'2026-09-01',store:'KAUFLAND',items:[{name:'Rohlík 43g',price:3.9,qty:10},{name:'Mléko polotučné 1l',price:24.9,qty:1,ean:'8595237405947'}]},
 {date:'2026-09-10',store:'Albert',items:[{name:'Rohlík 43G',price:4.5,qty:5},{name:'XYZ',price:10}]},
 {date:'2026-09-12',store:'Lidl',items:[{name:'Banány',price:32.9,qty:1.2,unit:'kg'}]}];
const html=ctx.buildMapaTab(S.receipts);
const d=vm.runInContext('_mapaUziv',ctx);
const st=ctx.mapaUzivStatistiky(d);
t('statistika: položky / v taxonomii / mimo',st.polozek===4&&st.vTax===3&&st.mimo===1,st);
t('statistika: procenta',st.pct===75);
t('statistika: obchody a kódy',st.obchodu===3&&st.sKodem===1,st);
t('statistika: oblasti a názvy',st.oblasti[0].id==='potraviny'&&st.obecnych===3&&st.podkategorii===3,st);
t('záložka: statistika + ukazatel',html.includes('V taxonomii 3 z 4')&&html.includes('75 %'));
t('záložka: oblast jako filtr',html.includes("mapaUzivOblast('potraviny')"));
const f=ctx.mapaUzivFiltruj(d,{stav:'vse',hledat:'',oblast:'potraviny'}); t('filtr oblasti',f.length===3);
t('filtr bez kódu',ctx.mapaUzivFiltruj(d,{stav:'bezkodu',hledat:''}).length===3);
const sez=ctx.mapaUzivSeznamHTML();
t('seznam: velký titulek z taxonomie',sez.includes('>Rohlík<'),sez.slice(0,300));
t('seznam: klik otevře kartu',sez.includes('mapaUzivDetail('));
const ir=d.findIndex(z=>z.klic==='rohlik');
t('dvě zkratky = jedna položka se 2 nákupy',d[ir].nakupy.length===2&&d[ir].nakupy[0].obchod==='Albert');
t('cena za kg z gramáže',Math.round(ctx.mapaUzivCenaZaJednotku(d[ir].nakupy[1]).cena)===91);
t('cena za kg u vážené položky',ctx.mapaUzivCenaZaJednotku({cena:32.9,unit:'kg',raw:'Banány'}).cena===32.9);
const ob=ctx.mapaUzivObchody(d[ir]); t('obchody seřazené od nejlevnějšího',ob[0].cena===3.9&&ob.length===2);
let k=ctx.mapaUzivKartaHTML(ir,null);
t('karta bez kódu: výzva a vysvětlení',k.includes('📷 Vyfotit čárový kód')&&k.includes('Na účtence je jen zkratka'));
t('karta: zařazení',k.includes('Pečivo')&&k.includes('COICOP')&&k.includes('01.113'));
t('karta: moje nákupy + nejlevněji',k.includes('Kaufland')||k.includes('KAUFLAND'));
t('karta: nejlevnější obchod se slevou',/Nejlevněji/.test(k)&&/−13 %/.test(k),k.match(/Nejlevněji.{0,120}/));
t('karta: rozpočet je až v rozbalovacím bloku',k.indexOf('💼 Rozpočet')>k.indexOf('Moje nákupy'));
const im=d.findIndex(z=>z.ean);
k=ctx.mapaUzivKartaHTML(im,{stav:'nalezeno',nazev:'Mléko polotučné',znacka:'Madeta',nutriscore:'b',nova:1,aditiva:[],slozeni:'mléko',stitky:['bio'],nutrice:{kcal:46,tuky:1.5,cukry:4.8,sul:0.1},zdroj:'Open Food Facts',foto:'https://x/a.jpg'});
t('karta s výrobkem: identita a značky',k.includes('Madeta')&&k.includes('Nutri-Score B')&&k.includes('NOVA 1')&&k.includes('0 éček')&&k.includes('bio'));
t('karta s výrobkem: semafor živin',k.includes('Nutriční hodnoty')&&k.includes('nízký'));
t('karta s výrobkem: ODbL',k.includes('ODbL'));
t('semafor: hranice FSA',ctx.eanSemaforUroven('cukry',5)==='nizka'&&ctx.eanSemaforUroven('cukry',10)==='stredni'&&ctx.eanSemaforUroven('cukry',23)==='vysoka'&&ctx.eanSemaforUroven('sul',1.6)==='vysoka');
S.receipts[1].items[1].name='<img src=x>'; ctx.buildMapaTab(S.receipts);
const ix=vm.runInContext('_mapaUziv',ctx).findIndex(z=>z.nazev.includes('img'));
t('escapování v seznamu i kartě',!ctx.mapaUzivSeznamHTML().includes('<img src=x>')&&!ctx.mapaUzivKartaHTML(ix,null).includes('<img src=x>'));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
