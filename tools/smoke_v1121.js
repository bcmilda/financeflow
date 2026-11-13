// FinanceFlow · smoke test · S24 · v11.21 karty Reportu po položkách účtenky, ruční karta, odečty v checklistu, záloha modulů
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{c?ok++:(bad++,console.log('❌',n,i===undefined?'':JSON.stringify(i)));};
const P=R('projects.js','../js/projects.js');
const TAX={'rohlik':{coicop:'01.113',ikona:'🛒',podNazev:'Pečivo'},'jar':{coicop:'05.611',ikona:'🧴',podNazev:'Mytí nádobí'},'nabijecka':{coicop:'08.120',ikona:'💻',podNazev:'Telefony'}};
const ctx={console,window:{},isTransferTx:()=>false,txCZK:t=>t.amount,fmtB:v=>v+' Kč',escHtml:s=>String(s),
  rpMapaNavrh:n=>{const k=String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');return TAX[k]?{tax:TAX[k]}:null;}};
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(P.slice(P.indexOf('const REPORT_KARTY = ['),P.indexOf('function renderReport() {')).replace(/const (REPORT_\w+) =/g,'var $1 ='),ctx);
const D={categories:[{id:'cat1',name:'Jídlo',coicop:1},{id:'cx',name:'Moje',coicop:1,reportKarta:'zabava'}]};
const tx={type:'expense',catId:'cat1',amount:900,name:'Albert',receiptItems:[{name:'Rohlík',price:5,qty:20},{name:'Jar',price:50,qty:1},{name:'Nabíječka',price:300,qty:1},{name:'Neznámé',price:50,qty:1}]};
// položky 100 + 50 + 300 + 50 = 500 → přepočet na 900
const r=ctx.reportKartaPolozky(tx,D);
t('rozdělení účtenky po položkách',Math.abs(r.jidlo.castka-(100+50)/500*900)<1e-9&&Math.abs(r.bydleni.castka-50/500*900)<1e-9&&Math.abs(r.nakupy.castka-300/500*900)<1e-9,r);
t('elektronika (08) = Nákupy, ne Předplatné',!r.predplatne&&r.nakupy);
t('položka bez taxonomie jde podle kategorie',Math.abs(r.jidlo.castka-270)<1e-9);
const s=ctx.reportKartySoucty([tx],D);
t('součet karet = částka transakce',Math.abs(Object.values(s).reduce((a,k)=>a+k.celkem,0)-900)<1e-9);
t('top položky karty z podkategorií taxonomie',Object.keys(s.jidlo.kat).some(k=>k.includes('Pečivo')));
t('ruční karta kategorie bere celou transakci',ctx.reportKartaPolozky(Object.assign({},tx,{catId:'cx'}),D)===null&&ctx.reportKartySoucty([Object.assign({},tx,{catId:'cx'})],D).zabava.celkem===900);
t('bez účtenky podle kategorie',ctx.reportKartySoucty([{type:'expense',catId:'cat1',amount:200}],D).jidlo.celkem===200);
// editor kategorie
const ST=R('stats.js','../js/stats.js'), H=R('app.html','../app.html');
t('editor: volba karty',H.includes('id="catReportKarta"')&&/obj\.reportKarta = \(kr && type!=='income'\) \? kr : null/.test(ST));
// checklist + záloha
const M=R('meridla.js','../js/meridla.js'), U=R('ui.js','../js/ui.js');
const S={transactions:[{date:'2026-10-01',name:'Shell',amount:900,tank:{litry:20}},{date:'2026-10-01',name:'Doplatek',amount:600,energie:{meridloId:'e',typ:'doplatek'}}],payslips:[{m:'2026-09'}]};
let stazeno=null;
const c2={console,S,getData:()=>S,txCZK:t=>t.amount,localStorage:{getItem:()=>null},URL:{createObjectURL:b=>{stazeno=b;return 'blob:x';},revokeObjectURL(){}},
  Blob:class{constructor(p){this.text=p.join('');}},setTimeout:()=>{},
  document:{getElementById:()=>null,createElement:()=>({click(){},remove(){},style:{}}),body:{appendChild(){}}},fetch:async()=>({ok:true,json:async()=>null})};
c2.window=c2; vm.createContext(c2); vm.runInContext(M,c2);
vm.runInContext('_meridla={e:{id:"e",druh:"elektrina",nazev:"Elektřina",kdy:1,odecty:{a:{datum:"2026-10-01",stav:1}}},v:{id:"v",druh:"voda",nazev:"Voda",kdy:2}}',c2);
const u=c2.merChecklistUkol(2026,9);
t('checklist: 1 ze 2 měřidel, chybí Voda',u.celkem===2&&u.hotovo===1&&u.chybi[0]==='Voda',u);
vm.runInContext('_meridla={}',c2); t('checklist: bez měřidel žádný úkol',c2.merChecklistUkol(2026,9)===null);
t('checklist v Dashboardu',/merChecklistUkol\(S\.curYear, S\.curMonth\)/.test(U));
vm.runInContext('_meridla={e:{id:"e",druh:"elektrina",nazev:"Elektřina",kdy:1}}',c2);
(async()=>{ const z=await c2.ffZalohaModuly();
  t('záloha: výplatnice, tankování, energie',z.vyplatnice.length===1&&z.tankovani.tankovani.length===1&&z.energie.meridla.length===1&&z.energie.platby.length===1,z);
  t('záloha se stáhne jako JSON',stazeno&&stazeno.text.includes('"vyplatnice"'));
  t('tlačítko zálohy ve Vymazat data',H.includes('ffZalohaModuly()'));
  console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1; })();
