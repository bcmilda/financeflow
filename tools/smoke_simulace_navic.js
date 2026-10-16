// FinanceFlow · smoke test · S26 (v11.80) · simulace přesčasů, přivýdělek nad rámec, výplata v měsíci, dovolená z pásek
//  Milan: „kdybych v kalendáři nasimuloval 2 přesčasy a viděl, o kolik si finančně polepším“
//         „sledujeme, kolik Kč jsem si přivydělal nad rámec běžné výplaty? Kumulativní sumář přesčasů, svátků, příplatků“
//         „myslel jsem, že řešíme výplatu V listopadu“ · „sledujeme i vyčerpanou dovolenou?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('vyplatnice.js','../js/vyplatnice.js'),'utf8');
const kal=fs.readFileSync(najdi('kalendar.js','../js/kalendar.js'),'utf8');
const realne=najdi('vyplatnice-import.json','../vyplatnice-import.json');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
const CZ_M=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);
const c={CZ_M,fmt,fmtP:fmt,Math,JSON,Intl,String,Number,Object,Array,Set,Date,isFinite,parseFloat,console,window:{},document:{getElementById:()=>null},
  S:{payslips:[],workCal:{hpd:12,breakMin:60,days:{}}},showToast(m){c.toast=m},renderKalendar(){c.prekresleno=(c.prekresleno||0)+1}};
vm.createContext(c);
vm.runInContext(src.replace(/^const VYPL_POVAHY/m,'var S=this.S;\nconst VYPL_POVAHY')+'\nthis.S=S;'
  +['_workCfg','_workVacH','_czHolidays','_workDay','_workHodiny','workOdhadVyplaty','_ck','workSimToggle','workSimKlik','workSimZrusit','workSimVysledek'].map(n=>pick(kal,n)).join('\n'),c);
if(!realne){ console.log('  (bez skutečných pásek – přeskočeno)'); console.log(`\n${ok} OK, ${bad} chyb`); return; }
const data=JSON.parse(fs.readFileSync(realne,'utf8')).sort((a,b)=>a.m.localeCompare(b.m));
c.S.payslips=data;

console.log('── simulace přesčasů v kalendáři ──');
[2,3,6,7,10,11,14,15,17,18,21,22,25,26,29,30].forEach((d,i)=>c.S.workCal.days[`2026-11-${String(d).padStart(2,'0')}`]={type:'smena',hours:12,shift:i%2?'nocni':'ranni'});
const pred=JSON.stringify(c.S.workCal.days);
c.workSimToggle();
t('zapnutí simulace',c.window._workSim.on===true);
c.workSimKlik(2,10,2026);
t('na směnu se simulovat nedá (jen volný den)',!Object.keys(c.window._workSim.days).length&&/volný den/.test(c.toast));
c.workSimKlik(4,10,2026); c.workSimKlik(5,10,2026); c.workSimKlik(5,10,2026);
t('1× denní přesčas, 2× noční',c.window._workSim.days['2026-11-04'].shift==='ranni'&&c.window._workSim.days['2026-11-05'].shift==='nocni');
const r=c.workSimVysledek(2026,10);
t('2 simulované přesčasy = 22 h (bez přestávek), z toho 11 h noční',r&&r.dny===2&&r.h===22&&r.nocni===11,r);
t('na účet víc o 3–4 tisíce (hrubého ~4,9 tis., odvody ~26,6 %)',r.navic>3000&&r.navic<4200&&Math.abs(r.odvodyNavic/r.hrubaNavic-0.266)<0.02,{navic:r.navic,hr:r.hrubaNavic,od:r.odvodyNavic});
t('nic se neuložilo do kalendáře a příznak simulace je po výpočtu vypnutý',JSON.stringify(c.S.workCal.days)===pred&&c.window._workSimAktivni===false);
c.workSimKlik(5,10,2026);
t('3. klepnutí den zruší',!c.window._workSim.days['2026-11-05']);
c.workSimToggle();
t('ukončení simulace vše vyčistí',!c.window._workSim.on&&!Object.keys(c.window._workSim.days).length);
t('kalendář: klepnutí v simulaci jde na workSimKlik, simulovaný den je čárkovaně s 🧪',/SIM\.on \? `workSimKlik\(/.test(kal)&&/dashed rgba\(225,29,72/.test(kal)&&/🧪/.test(kal));

console.log('── přivýdělek nad rámec ──');
const srp=data.find(z=>z.m==='2026-08'), n=c.vyplNavicMesic(srp);
t('srpen 2026: přesčas 4 534, noční 1 231, So+Ne 1 677 Kč',n.prescas===4534&&n.nocni===1231&&n.vikend===1677&&n.celkem===4534+1231+1677,n);
t('čistá část přesně (páska bez nich): ~73,4 % z hrubého',Math.abs(n.cisty/n.celkem-0.734)<0.01,n.cisty/n.celkem);
t('odměny se počítají taky (květen 2026 roční prémie)',c.vyplNavicMesic(data.find(z=>z.m==='2026-05')).odmeny===5688);
c.window._vyplStav={}; vm.runInContext('window._vyplRadaVse=S.payslips.slice().sort((a,b)=>a.m.localeCompare(b.m)); window._vyplKarty={}',c);
const h=vm.runInContext('_vyplNavicObsah()',c);
t('karta: rok 2026 předvybraný, výběr roků i „Vše“',/vg-chip on" onclick="vyplNavicRok\('2026'\)"/.test(h)&&/vyplNavicRok\('2025'\)/.test(h)&&/vyplNavicRok\('vse'\)/.test(h));
t('KPI čistý přivýdělek v roce, rozpad přesčas / svátek / noční / So+Ne / odměny',/Nad rámec v roce 2026/.test(h)&&/Přesčas<\/div>/.test(h)&&/So \+ Ne<\/div>/.test(h)&&/Odměny<\/div>/.test(h));
t('graf: skládané sloupce po měsících + kumulativní čára na vedlejší ose, tabulka s kumulací',/id="vgNavic"/.test(h)&&/stroke-dasharray="6 4"/.test(h)&&/<th>Kumulativně<\/th>/.test(h));

console.log('── výplata V měsíci, dovolená ──');
//  v11.81 (Milan): „Listopad: na účet přijde výplata za říjen“ nedává smysl – jeden měsíc = jedna výplata = jedno číslo.
t('Hodinová mzda: jen odhad ZA zobrazený měsíc, žádný řádek „v měsíci přijde výplata za předchozí“',!/na účet přijde výplata za/.test(kal)&&!/const prijde =/.test(kal)&&/📈 Odhad výplaty za \$\{mes\} – přijde \$\{o\.vyplaceno\}/.test(kal));
t('Zůstatek dovolené: za měsíce s výplatnicí z pásky, za ostatní z kalendáře (dřív jen kalendář → moc vysoký)',/vyčerpáno \$\{fmtH\(vacYear\)\} z \$\{fmtH\(cfg\.vacQuotaH\)\} h/.test(kal)&&/z pásek \$\{fmtH\(vacPasky\.h\)\} h/.test(kal)&&/!_mesPasky\.has\(k\.slice\(0, 7\)\)/.test(kal)&&/vacYear \+= vyplHodinyZPasky\(z\)\.dovolenaH/.test(kal));
const dov26=data.filter(z=>z.m.startsWith('2026-')).reduce((a,z)=>a+c.vyplHodinyZPasky(z).dovolenaH,0);
t('dovolená 2026 podle pásek: 88 h (leden 22, červen 11, červenec 33, srpen 22)',dov26===88,dov26);
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
