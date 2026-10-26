// FinanceFlow · smoke test · Session 27 (v12.11) · 💱 převodník měn · 🎂 druh a věk u narozenin
//  Milan: „do kurzů měn mi můžeš přidat převodník?“ · „rozbalovací menu: narozeniny, svátek, výročí… věk,
//  který by se každý rok zvyšoval… nebo ročník narození a z něj by se počítal věk osoby“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const els={};
const c={console,Date,Math,JSON,Object,String,parseFloat,isFinite,localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:id=>els[id]||null},fetch:async()=>({ok:false}),setTimeout:()=>0};
c.window=c; vm.createContext(c);
vm.runInContext(R('kurzy.js','../js/kurzy.js')+'\n;this._setFx=d=>{_fxData=d};',c);
console.log('── převodník ──');
const r={EUR:24.5,USD:22.8,HUF:0.0625};
t('100 EUR = 2 450 Kč',Math.abs(c.fxPrevod('100','EUR','CZK',r)-2450)<1e-9);
t('2 450 Kč = 100 EUR',Math.abs(c.fxPrevod(2450,'CZK','EUR',r)-100)<1e-9);
t('EUR → USD přes Kč (24,5 / 22,8)',Math.abs(c.fxPrevod(1,'EUR','USD',r)-24.5/22.8)<1e-9);
t('desetinná čárka a mezery („1 000,5“)',Math.abs(c.fxPrevod('1 000,5','EUR','CZK',r)-24512.25)<1e-6);
t('neznámá měna / prázdná částka = nic',c.fxPrevod('10','XYZ','CZK',r)===null&&c.fxPrevod('','EUR','CZK',r)===null);
c._setFx({date:'24.10.2026',rates:r});
const h=c.fxPrevodHTML(r,['EUR','USD','HUF']);
t('karta převodníku: částka, z, ⇅, do, výsledek, kurz ČNB',/id="fxPrCastka"/.test(h)&&/id="fxPrZ"/.test(h)&&/id="fxPrNa"/.test(h)&&/fxPrevodOtoc\(\)/.test(h)&&/2\s450,00 CZK/.test(h)&&/1 EUR = 24,50 CZK · kurz ČNB 24\.10\.2026/.test(h),h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
els.fxPrVysledek={textContent:''}; els.fxPrKurz={textContent:''}; els.fxPrZ={value:'EUR'}; els.fxPrNa={value:'CZK'};
c.fxPrevodOtoc(); c.fxPrevodZmen('castka','2450');
t('⇅ prohodí měny a přepočítá jen výsledek (psaní se nepřeruší)',els.fxPrVysledek.textContent==='100,00 EUR'&&els.fxPrZ.value==='CZK',els.fxPrVysledek.textContent);
t('kurzy.js: převodník nad připnutými měnami',/html \+= fxPrevodHTML\(rates, pinned\.concat/.test(R('kurzy.js','../js/kurzy.js')));

console.log('── narozeniny, svátek, výročí ──');
const ch=R('charts.js','../js/charts.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
const i0=ch.indexOf('const BDAY_DRUHY'), i1=ch.indexOf('};',i0)+2;
vm.runInContext(ch.slice(i0,i1)+'\n'+['bdayDruh','_bdayLet','bdayVek','bdayVekPristi','bdayVekText'].map(n=>pick(ch,n)).join('\n'),c);
const dnes=new Date(2026,9,25,10);
const petr={name:'Petr',day:15,month:3,rok:1985};
t('bez druhu = narozeniny 🎂',c.bdayDruh(petr).kod==='narozeniny'&&c.bdayDruh(petr).ikona==='🎂');
t('věk z ročníku: 15. 3. 1985 → 41 let (25. 10. 2026)',c.bdayVek(petr,dnes)===41&&c.bdayVekText(petr,dnes)==='41 let');
t('příště bude 42 let',c.bdayVekPristi(petr,dnes)===42);
const den={name:'Eva',day:30,month:10,rok:1990};
t('narozeniny za 5 dní: zatím 35, bude 36',c.bdayVek(den,dnes)===35&&c.bdayVekPristi(den,dnes)===36);
const dnesNar={name:'Jan',day:25,month:10,rok:2024};
t('narozeniny dnes: 2 roky (a „bude“ = dnešní věk)',c.bdayVek(dnesNar,dnes)===2&&c.bdayVekPristi(dnesNar,dnes)===2&&c._bdayLet(2)==='2 roky');
t('1 rok / 5 let',c._bdayLet(1)==='1 rok'&&c._bdayLet(5)==='5 let');
t('svátek bez věku',c.bdayVek({name:'Milan',day:18,month:6,druh:'svatek',rok:1980},dnes)===null&&c.bdayDruh({druh:'svatek'}).ikona==='🌸');
t('výročí svatby 2016 → 10 let',c.bdayVek({name:'Svatba',day:1,month:6,druh:'vyroci',rok:2016},dnes)===10&&c.bdayDruh({druh:'vyroci'}).nazev==='Výročí');
t('bez roku žádný věk',c.bdayVek({name:'X',day:1,month:1},dnes)===null);
const html=R('app.html','../app.html');
t('formulář: Druh (narozeniny / svátek / výročí) a Rok',/id="bdayDruh" onchange="bdayDruhZmen\(\)"/.test(html)&&/<option value="svatek">🌸 Svátek<\/option>/.test(html)&&/<option value="vyroci">💍 Výročí<\/option>/.test(html)&&/id="bdayRok"/.test(html));
t('uložení: druh a rok (u svátku bez roku, rok 1900 až letos)',/const rok=\(druh!=='svatek'&&rokV>=1900&&rokV<=letos\)\?rokV:null;/.test(ch)&&/Object\.assign\(b,\{name,day,month,gift,note,druh\}\)/.test(ch));
t('seznam, nadcházející, Dashboard a Budoucí platby ukazují druh',/bdayDruh\(b\)\.ikona/.test(ch)&&/bdayDruh\(b\)\.nazev/.test(R('ui.js','../js/ui.js'))&&/bdayDruh\(b\)\.nazev : 'Narozeniny'/.test(R('budouci.js','../js/budouci.js')));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
