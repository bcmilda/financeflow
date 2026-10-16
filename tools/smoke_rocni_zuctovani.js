// FinanceFlow · smoke test · S26 (v11.83) · roční zúčtování daně z výplatnic
//  Milan: „bod 2 – roční zúčtování zní zajímavě“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const src=fs.readFileSync(najdi('vyplatnice.js','../js/vyplatnice.js'),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const CZ_M=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);
const c={CZ_M,fmt,fmtP:fmt,Math,JSON,Intl,String,Number,Object,Array,Set,Date,isFinite,parseFloat,console,window:{},document:{getElementById:()=>null},S:{payslips:[],uiCfg:{}},save(){c.ulozeno=1}};
vm.createContext(c); vm.runInContext(src.replace(/^const VYPL_POVAHY/m,'var S=this.S;\nconst VYPL_POVAHY')+'\nthis.S=S;',c);
const ted=new Date('2026-10-15T12:00:00');

console.log('── zákon (fiktivní pásky) ──');
//  Celý rok 12 × 30 000 Kč, sleva na poplatníka každý měsíc → roční daň = součet záloh (jen zaokrouhlení).
const rok=[...Array(12)].map((_,i)=>({m:`2025-${String(i+1).padStart(2,'0')}`,prijmy:{zaklad:30000},odvody:{slevaZak:2570},srazky:{}}));
let r=c.vyplRocniZuctovani(2025,rok,ted);
t('12 × 30 000: základ 360 000, daň 54 000 − 30 840 = 23 160',r.zaklad===360000&&r.dan===54000&&r.poSlevach===23160,r);
t('zálohy 12 × (4 500 − 2 570) = 23 160 → přeplatek 0',r.zalohy===23160&&r.vysledek===0,r.vysledek);
//  Nástup v březnu: sleva na poplatníka jen za 10 měsíců → v ročním zúčtování celá → přeplatek 2 × 2 570.
r=c.vyplRocniZuctovani(2025,rok.slice(2),ted);
t('nástup v březnu: přeplatek 5 140 Kč (sleva za leden a únor)',r.vysledek===5140&&r.zSlevy===5140,r);
t('základ zaokrouhlený DOLŮ na stovky (roční), záloha nahoru (měsíční)',/Math\.floor\(\(prijmy - odpocty\) \/ 100\) \* 100/.test(src)&&/_ceil\(hruba \/ 100\) \* 100 \* 0\.15/.test(src));
c.S.uiCfg.rz={2025:{odpocty:20000}};
r=c.vyplRocniZuctovani(2025,rok,ted);
t('odpočty 20 000 → daň o 3 000 nižší → přeplatek 3 000',r.zaklad===340000&&r.vysledek===3000,r.vysledek);
c.S.uiCfg.rz={2025:{jinyPrijem:60000,jineZalohy:5000}};
r=c.vyplRocniZuctovani(2025,rok.slice(2),ted);
t('jiný zaměstnavatel v lednu–únoru: příjmy i zálohy se přičtou',r.prijmy===360000&&r.zalohy===19300+5000,r);
c.S.uiCfg.rz={};
const vysoky=[...Array(12)].map((_,i)=>({m:`2026-${String(i+1).padStart(2,'0')}`,prijmy:{zaklad:200000},odvody:{slevaZak:2570},srazky:{}}));
r=c.vyplRocniZuctovani(2026,vysoky,new Date('2027-03-01'));
t('nad 36násobkem průměrné mzdy (2026: 1 762 812) se platí 23 %',r.hranice===1762812&&r.dan23===Math.round((2400000-1762812)*0.23),r);

console.log('── Milanovy pásky ──');
const realne=najdi('vyplatnice-import.json','../vyplatnice-import.json');
if(realne){
  const d=JSON.parse(fs.readFileSync(realne,'utf8'));
  r=c.vyplRocniZuctovani(2025,d,ted);
  t('2025: 11 pásek (únor–prosinec), přeplatek ≈ 2 800 Kč, hlavně sleva na poplatníka za leden',r.pasky===11&&r.vysledek>2500&&r.vysledek<3100&&r.zSlevy>2500,r);
  r=c.vyplRocniZuctovani(2026,d,ted);
  t('2026 běží: 8 pásek + 4 měsíce průměrem, děti 12 × 1 267 = 15 204',r.bezi&&r.doplnit===4&&r.deti===15204,r);
  c.window._vyplStav={}; vm.runInContext('window._vyplRadaVse=JSON.parse('+JSON.stringify(JSON.stringify(d))+').sort((a,b)=>a.m.localeCompare(b.m)); window._vyplKarty={}',c);
  const h=vm.runInContext('_vyplRzObsah()',c);
  t('karta: předvybraný poslední UKONČENÝ rok (2025), výběr roků, 2026 „běží“',/vg-chip on" onclick="vyplRzRok\('2025'\)"/.test(h)&&/2026 \(běží\)/.test(h));
  t('karta: přeplatek, rozpis (základ, 15 %, sleva, děti, zálohy), termín 15. února, výplata za březen a „termín minul → daňové přiznání“',/Termín u zaměstnavatele \(15\. 2\. 2026\) už minul/.test(h)&&/přeplatek /.test(h)&&/Základ daně \(zaokrouhlený dolů na stovky\)/.test(h)&&/Sleva na poplatníka \(za celý rok\)/.test(h)&&/do <strong>15\. února 2026<\/strong>/.test(h)&&/ve výplatě za březen/.test(h));
  t('karta: vstupy pro jiného zaměstnavatele, odpočty a děti + upozornění na chybějící měsíce',/vyplRzNastav\('2025','jinyPrijem',this\)/.test(h)&&/vyplRzNastav\('2025','odpocty',this\)/.test(h)&&/Za rok 2025 je 11 pásek/.test(h));
}
t('karta je ve Výplatnici hned za Daněmi a odvody',/html \+= _vyplOdvodyKarta\(rada, vyp\);\n[^\n]*\n  html \+= _vyplRzKarta\(zaznamy\);/.test(src));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
