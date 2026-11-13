// FinanceFlow · smoke test · Session 27 (v12.05) · „rovnat stejné se stejným“ + jeden zdroj obchodů
//  Milan: „Zdražování míchá páté přes deváté. Pivo a pivní láhve… nelze brát pivo = pivo. Stejně tak
//  nelze míchat banány a banány v čokoládě. Musíš rovnat stejné se stejným, váhu můžeš přepočítat na
//  cenu za kg“ · „Penny Market byl navštíven 9× s útratou 2 655 Kč“ · „jiné barvy než červenou“ ·
//  „v Inflaci je víc EVO 95 – jen 1 cena“ · tankování: „ceny za litr nejsou reálné“.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const app=R('app.js','../js/app.js');
const cut=(a,b)=>{const i=app.indexOf(a),j=app.indexOf(b,i);return app.slice(i,j);};
const S={categories:[{id:'cat1',name:'Jídlo',type:'expense'}],receipts:[]};
const ctx={console,S,getData:()=>S,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:()=>null,querySelectorAll:()=>[]},fetch:async()=>({ok:true,json:async()=>null}),navigator:{},setTimeout};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(R('helpers.js','../js/helpers.js'),ctx);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),ctx);
ctx.taxNastav(JSON.parse(R('taxonomie.json','../data/taxonomie.json')));
vm.runInContext('var _isLocalMode=false;'+cut('let _catMappingsCache = null;','// Načti mappings po přihlášení')+';this._set=(c,m,t)=>{_catMappingsCache=c;_productMapCache=m;_taxRozpocetCache=t;};',ctx);
vm.runInContext(R('receipts.js','../js/receipts.js'),ctx);
vm.runInContext(R('vozidla.js','../js/vozidla.js'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,400))}};
ctx._set({}, {}, {});

console.log('── záloha za obal není zboží ──');
['Láhev pivo 0,5l *','LAHEV VRATNA','Záloha PET','vratná přepravka','(Láhev pivo 0,5l)'].forEach(n=>t('záloha: '+n,ctx.rpJeZaloha(n)));
['Litovel Vyzrálá 11 4,7%','Pivo Plzeň 0,5l','Mattoni 1,5l','Banány'].forEach(n=>t('zboží: '+n,!ctx.rpJeZaloha(n)));

console.log('── Podle výrobků: stejné se stejným ──');
const I=(name,price,date,store,extra)=>Object.assign({name,price,qty:1,date,store},extra||{});
const items=[
  I('Banány',24.7,'2026-07-27','KAUFLAND',{unit:'kg',qty:1.1}), I('Banány',29.9,'2026-09-01','KAUFLAND',{unit:'kg',qty:1}),
  I('Bio Banány',44.9,'2026-09-07','PENNY MARKET',{unit:'kg',qty:0.9}),
  I('Banán v čokol. 45g Enjoy',15.9,'2026-06-27','PENNY MARKET'), I('Banán v čokol. 45g Enjoy',16.9,'2026-09-27','PENNY MARKET'),
  I('Láhev pivo 0,5l',3,'2026-10-22','KAUFLAND'), I('Láhev pivo 0,5l',3,'2026-07-27','KAUFLAND'),
  I('PIVO ALKO 21% 0,5l',47,'2026-04-06','Krčma u Supa'), I('PIVO ALKO 21% 0,5l',46,'2026-08-06','Krčma u Supa'),
  I('Litovel Vyzrálá 11 0,5l',19.9,'2026-07-22','KAUFLAND'), I('Litovel Vyzrálá 11 0,5l',20.9,'2026-10-22','KAUFLAND')];
const v=ctx.taxCenyVyvoj(items,S), P=v.polozky;
const ban=P.filter(p=>p.id==='banan');
t('volně vážené banány zvlášť od banánu v čokoládě',ban.some(p=>p.vazene&&p.nazev==='banán'&&p.pocet===2)&&!ban.some(p=>p.vazene&&p.nakupy.some(n=>/čokol/.test(n.raw))),ban.map(p=>[p.nazev,p.pocet]));
const cok=P.find(p=>p.nakupy.some(n=>/čokol/.test(n.raw)));
t('banán v čokoládě = vlastní výrobek (2 nákupy)',!cok||(cok.pocet===2&&!cok.vazene),cok&&[cok.nazev,cok.pocet]);
t('bio banány nejsou v jedné skupině s obyčejnými',!P.some(p=>p.nakupy.some(n=>/Bio/.test(n.raw))&&p.nakupy.some(n=>n.raw==='Banány')));
t('záloha za láhev v Pivu není',!P.some(p=>p.nakupy.some(n=>/Láhev/.test(n.raw))));
t('pivo z hospody a Litovel z obchodu nejsou jedna skupina',!P.some(p=>p.nakupy.some(n=>/ALKO/.test(n.raw))&&p.nakupy.some(n=>/Litovel/.test(n.raw))),P.map(p=>[p.nazev,p.nakupy.map(n=>n.raw)]));
const D2={...S,receipts:[]};
const eanItems=[I('BL CIZRN.CHIPS 65G',39.9,'2026-07-01','PENNY MARKET',{ean:'8595229909019'}),I('CIZRNOVE CHIPSY BL 65G',44.9,'2026-10-01','KAUFLAND',{ean:'8595229909019'})];
const ve=ctx.taxCenyVyvoj(eanItems,D2).polozky;
t('různé zkratky se stejným čárovým kódem = jeden výrobek',ve.length<=1&&(!ve.length||(ve[0].pocet===2&&ve[0].zkratek===2)),ve.map(p=>[p.nazev,p.pocet]));

console.log('── obchody: jeden zdroj, různé barvy ──');
const d=new Date(), p2=n=>String(n).padStart(2,'0'), mes=`${d.getFullYear()}-${p2(d.getMonth()+1)}`;
const rc=(store,day,total)=>({store,date:`${mes}-${p2(day)}`,total,items:[]});
const recs=[rc('PENNY MARKET',1,300),rc('Penny Market',2,200),rc('Penny Market s.r.o.',3,100),rc('KAUFLAND',4,500),rc('Kaufland Česká republika v.o.s.',5,400),rc('MOL Česká republika, s.r.o.',6,900),rc('Albert',7,50)];
const tr=ctx.buildStoreTrendData(recs);
const pen=tr.series.find(s=>/PENNY/.test(s.store));
t('Trend: varianty názvu Penny = jeden obchod (600 Kč)',tr.series.filter(s=>/penny/i.test(s.store)).length===1&&pen.values[pen.values.length-1]===600,tr.series.map(s=>[s.store,s.values.slice(-1)[0]]));
const barvy=tr.series.map(s=>s.color);
t('Trend: každý obchod jinou barvou (Penny, Kaufland, MOL, Albert mají firemní červenou)',new Set(barvy).size===barvy.length&&barvy.filter(c=>/^#(e|f|d|c)[0-9a-f][0-3]/i.test(c)).length<=1,barvy);
const src=R('receipts.js','../js/receipts.js');
t('Obchody v měsíci seskupují podle normalizeStoreName',/const s = normalizeStoreName\(r\.store\|\|'\?'\);/.test(src));

console.log('── palivo: jen skutečné palivo, reálná cena ──');
t('EVO 95 22,27 l za 988,40 Kč je palivo',ctx.tankJePalivo({name:'EVO 95',qty:22.27,unit:'l',lineTotal:988.4,price:44.9}));
t('Natural 95 bez jednotky je palivo',ctx.tankJePalivo({name:'Natural 95',qty:20,price:44.9}));
t('voda 6 l za 15 Kč palivo není',!ctx.tankJePalivo({name:'Voda pramenitá 6l',qty:6,unit:'l',price:2.5}));
t('cokoli „l“ s cenou 3,90 Kč/l palivo není',!ctx.tankJePalivo({name:'EVO 95',qty:4,unit:'l',price:3.9}));
t('jogurt natural palivo není',!ctx.tankJePalivo({name:'Jogurt natural 150g',qty:1,price:12.9}));
t('AdBlue palivo není',!ctx.tankJePalivo({name:'AdBlue 10 l',qty:10,unit:'l',price:25}));
const rr={items:[{name:'Voda 6l',qty:6,unit:'l',price:2.5},{name:'Káva',qty:1,price:49}]};
t('účtenka bez paliva → žádné tankování',ctx.tankZUctenky(rr)===null);

console.log('── Inflace: palivo vždy za litr ──');
const inf=R('inflace.js','../js/inflace.js');
t('Inflace: palivo bez jednotky se počítá za litr (jeden řádek)',/const _palivo = typeof tankJePalivo === 'function' && tankJePalivo\(it\);/.test(inf)&&/if \(_palivo && it\.unit !== 'l'\) it = Object\.assign\(\{\}, it, \{ unit: 'l' \}\);/.test(inf));
t('Inflace a Detektor bez záloh',/rpJeZaloha\(it\.name\)\) return;/.test(inf)&&(R('projects.js','../js/projects.js').match(/rpJeZaloha\(it\.name\)\) return;/g)||[]).length===2);
console.log('── v12.06: obecně jen ovoce, zelenina, brambory, pečivo ──');
const sy=ctx.taxCenyVyvoj([I('Eidam 30% plátky',189,'2026-07-01','KAUFLAND',{unit:'kg',qty:0.2}),I('Eidam 30% plátky',199,'2026-09-01','KAUFLAND',{unit:'kg',qty:0.2}),
  I('Gouda 48% vážená',229,'2026-07-01','KAUFLAND',{unit:'kg',qty:0.2}),I('Gouda 48% vážená',239,'2026-09-01','KAUFLAND',{unit:'kg',qty:0.2})],S).polozky;
t('vážené sýry: každý druh zvlášť (Eidam ≠ Gouda)',!sy.some(p=>p.nakupy.some(n=>/Eidam/.test(n.raw))&&p.nakupy.some(n=>/Gouda/.test(n.raw))),sy.map(p=>[p.nazev,p.nakupy.map(n=>n.raw)]));
['Mléč. sýry','mléč.výrobky','Sýry','Uzeniny'].forEach(n=>t('obecný název mimo sledování cen: '+n,ctx.rpIsGenericName(n)));
t('Grafy → Denní: šipky přepínají měsíc Denního grafu',/onclick="denniMesic\(-1\)"/.test(R('charts.js','../js/charts.js'))&&/function denniMesic\(d\)/.test(R('charts.js','../js/charts.js'))&&/if\(_grafMonth == null\)/.test(R('charts.js','../js/charts.js')));
console.log('── vzhled ──');
const pj=R('projects.js','../js/projects.js'), sp=R('statistika-polozek.js','../js/statistika-polozek.js'), vz=R('vozidla.js','../js/vozidla.js');
t('Deník: čára poznámky od osy událostí (y 34) a tenká (1 px)',/const xx = xp\(n\.pos\)\.toFixed\(1\), top = 34, bot = padT \+ plotH;/.test(pj)&&/stroke-width="\$\{vybr\?2:1\}"/.test(pj));
t('Statistika položek: širší tabulka, čísla nezalomená',/min-width:600px/.test(sp)&&/text-align:right;white-space:nowrap">\$\{p\.pocet\}/.test(sp));
t('Seznam položek: širší sloupec Ks',/const COLS = 'minmax\(0,1fr\) 40px 52px 74px 62px'/.test(src));
t('Tankování: úprava a odebrání záznamu, kontrola tachometru',/function tankUpravUloz\(/.test(vz)&&/function tankOdeber\(/.test(vz)&&/if \(!tankTachometrOk\(D, vid, t\.date, tach, txId\)\) return;/.test(vz));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
