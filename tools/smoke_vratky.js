// FinanceFlow · smoke test · S26 (v11.76) · vratné lahve na účtence, sloupec Celkem v editoru
//  Milan (Kaufland): „na konci účtenky je odečet za vrácené lahve, dokonce i znaménko mínus.
//                    Ale analyzér ho sečetl… rozdíl cca 38 Kč, seznam pro slevu nebyl úplný.“
//                   „mohl bys k editoru přidat sloupec s celkovou cenou?“
const vm=require('vm'),fs=require('fs'),path=require('path'),cp=require('child_process');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const soubor=najdi('receipts.js','../js/receipts.js');
const rc=fs.readFileSync(soubor,'utf8');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const re=rc.match(/const RCPT_VRATKA_RE = [^\n]+/)[0];
const mk=(src,extra)=>{const c={Math,parseFloat,parseInt,isFinite,isNaN,String,Array,Error,window:{},rcptPobockaNorm(){},showToast(m){c.toast=m},...(extra||{})};
  vm.createContext(c);vm.runInContext(src,c);return c;};
const c=mk([re,...['lineAmt','rcptVratkyNavrh','rcptVratkyOprav','rpVratkyOdecti','validateReceiptJSON'].map(n=>pick(rc,n))].join('\n'),
  {rpRender(){c.prekresleno=(c.prekresleno||0)+1},rpUpdateTotal(){}});
const soucet=r=>Math.round(r.items.reduce((a,it)=>a+c.lineAmt(it),0)*100)/100;

//  Milanův Kaufland: zaplaceno 1 012,12 Kč, na konci dvě vratky lahví (−12 a −7).
const nakup=()=>[
  {name:'Pilsner Urquell 0,5l',price:32.90,qty:8,lineTotal:263.20},
  {name:'Kuřecí prsní řízky',price:189.90,qty:1},
  {name:'Máslo 250g',price:49.90,qty:2,lineTotal:79.80},
  {name:'Káva zrnková 1kg',price:349.00,qty:1,lineTotal:299.00,discount:50},
  {name:'Banány',price:34.90,qty:1.236,unit:'kg',lineTotal:43.14},
  {name:'Rohlík',price:2.90,qty:10,lineTotal:29.00},
  {name:'Mléko 1,5%',price:19.90,qty:1,lineTotal:19.90},
  {name:'Okurka hadovka',price:24.90,qty:1,lineTotal:24.90},
  {name:'Sýr Eidam plátky',price:82.28,qty:1,lineTotal:82.28}];
const lahve=zn=>[{name:'Láhev pivo 0,5l',price:zn*3,qty:4,lineTotal:zn*12},{name:'Lah.pivo Bernard',price:zn*7,qty:1,lineTotal:zn*7}];

console.log('── čtení účtenky (validateReceiptJSON) ──');
let r=c.validateReceiptJSON({store:'Kaufland',date:'2026-10-11',total:1012.12,items:[...nakup(),...lahve(-1)]});
t('AI přečte lahve s mínusem → mínus zůstane (dřív Math.abs udělal nákup)',r.items.slice(-2).every(it=>it.price<0&&it.lineTotal<0&&it._vratka),r.items.slice(-2));
t('součet položek = 1 012,12 Kč (sedí na účtenku)',soucet(r)===1012.12,soucet(r));
t('řádková částka i sleva z AI se nezahazují (Káva 349 − 50 = 299)',r.items[3].lineTotal===299&&r.items[3].discount===50);
t('vážené zboží: kg i řádková částka zůstanou',r.items[4].unit==='kg'&&r.items[4].lineTotal===43.14);

r=c.validateReceiptJSON({store:'Kaufland',date:'2026-10-11',total:1012.12,items:[...nakup(),...lahve(1)]});
t('AI přečte lahve KLADNĚ (přesah 38 Kč = 2 × 19) → appka znaménko otočí sama',r.items.slice(-2).every(it=>it.lineTotal<0&&it._vratka)&&soucet(r)===1012.12,r.items.slice(-2));

const pivo={name:'Pivo Bernard 0,5l',price:19,qty:1};
r=c.validateReceiptJSON({store:'Kaufland',total:1012.12,items:[...nakup(),pivo,...lahve(-1)]});
t('obyčejné pivo za 19 Kč se neotočí (není to láhev/záloha)',r.items.find(x=>x.name===pivo.name).price===19);

r=c.validateReceiptJSON({store:'Kaufland',total:1000,items:[...nakup(),...lahve(1)]});
t('když lahve rozdíl nevysvětlí, nesahá se na nic (nic se nehádá)',r.items.slice(-2).every(it=>it.lineTotal>0&&!it._vratka));

r=c.validateReceiptJSON({store:'Kaufland',total:1012,items:[...nakup(),...lahve(1)]});
t('placeno zaokrouhleně na koruny (1 012 Kč) → shoda do 50 haléřů stačí',r.items.slice(-2).every(it=>it._vratka));

r=c.validateReceiptJSON({store:'Albert',total:120,items:[{name:'Chléb',price:40,qty:1},{name:'Záloha přepravka',price:80,qty:1},{name:'Hlavička',price:0,qty:1}]});
t('kladná záloha, která sedí na účtenku, zůstane nákupem; řádek bez ceny se vyhodí',r.items.length===2&&r.items[1].price===80);

console.log('── už naskenovaná účtenka v editoru (✎) ──');
const ulozena={store:'Kaufland',date:'2026-10-11',total:1012.12,items:[...nakup(),...lahve(1)]};   // tak, jak se uložila dřív
t('návrh najde obě lahve',c.rcptVratkyNavrh(ulozena).length===2);
c.window._editReceipt=ulozena; vm.runInContext('window=this.window',c);
c.rpVratkyOdecti();
t('„♻️ Odečíst vrácené lahve“ otočí znaménko a překreslí editor',soucet(ulozena)===1012.12&&c.prekresleno===1&&/vratné lahve odečteny/.test(c.toast),c.toast);
t('druhé klepnutí už nic nemění',c.rcptVratkyNavrh(ulozena).length===0);
t('v kontrole rozdílu je tlačítko PŘED výběrem slevy',/const vr = rcptVratkyNavrh\(r\);\s*if\(vr\.length\) return[\s\S]{0,600}rpVratkyOdecti\(\)[\s\S]{0,200}const kand = rpDiscountCandidates/.test(rc));
t('u výběru slevy je vysvětleno, proč seznam není úplný',rc.includes('nabízím jen položky dražší než rozdíl'));
t('cena v editoru může být záporná (vratka zadaná ručně)',!/id="rp_price_\$\{i\}"[^>]*min="0"/.test(rc)&&!/rp_price_[^\n]{0,300}min="0"/.test(rc));

console.log('── sloupec Celkem ──');
t('každý řádek má Celkem za položku (♻️ a zeleně u vratky)',/<span id="rp_sum_\$\{i\}"[\s\S]{0,400}?\$\{lineAmt\(it\) < 0 \? '♻️ ' : ''\}\$\{fmtP\(lineAmt\(it\)\)\}<\/span>/.test(rc));
t('Celkem se přepočítá při psaní (rpUpdateTotal)',/function rpUpdateTotal[\s\S]{0,3000}getElementById\('rp_sum_' \+ i\)/.test(rc));
t('změna ks / ceny přepočítá i uloženou řádkovou částku (jinak by Celkem stál)',rc.includes("if (x.lineTotal != null) x.lineTotal = Math.round(((parseFloat(x.price) || 0) * (parseFloat(x.qty) || 1) - (parseFloat(x.discount) || 0)) * 100) / 100;"));
t('editor je širší kvůli novému sloupci',/<div style="min-width:(\d+)px">/.test(rc)&&+rc.match(/<div style="min-width:(\d+)px">/)[1]>=680);

console.log('── negativní kontrola: kód před v11.76 ──');
let stary=null; try{stary=cp.execSync('git show HEAD:js/receipts.js',{cwd:path.join(path.dirname(soubor),'..'),stdio:['ignore','pipe','ignore']}).toString();}catch(e){}
if(stary&&!stary.includes('RCPT_VRATKA_RE')){
  const o=mk(['lineAmt','validateReceiptJSON'].map(n=>pick(stary,n)).join('\n'));
  const ro=o.validateReceiptJSON({store:'Kaufland',total:1012.12,items:[...nakup(),...lahve(-1)]});
  const so=Math.round(ro.items.reduce((a,it)=>a+o.lineAmt(it),0)*100)/100;
  t('NEGATIVNÍ KONTROLA: starý kód z −12 a −7 udělal +12 a +7 a zahodil řádkové částky → přesah ≥ 38 Kč',ro.items.slice(-2).every(it=>it.price>0&&it.lineTotal==null)&&so-1012.12>=38,so);
} else t('NEGATIVNÍ KONTROLA: starý kód (git HEAD) k dispozici',true);
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
