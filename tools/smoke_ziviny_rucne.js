// S25 – ruční zadání / oprava živin na 100 g: kontrola v appce i ve workeru, tlačítka v kartách.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const es=R('ean-sken.js','../js/ean-sken.js'),wk=R('worker.js','../cloudflare-worker/worker.js','../worker.js'),rc=R('receipts.js','../js/receipts.js'),ad=R('admin.js','../js/admin.js');
const pick=(src,n)=>{let a=src.indexOf('function '+n+'(');let d=0,j=src.indexOf('{',a);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(a,k+1)}}};
const konst=(src,n)=>{const a=src.indexOf('const '+n);return src.slice(a,src.indexOf('];',a)+2)};
console.log('── S25 · ruční zadání živin ──');
const sb={};vm.createContext(sb);vm.runInContext([konst(es,'EAN_ZIVINY_POLE'),pick(es,'eanCislo'),pick(es,'eanZivinyKontrola'),pick(es,'eanZivinyZdroj')].join('\n'),sb);
const K=n=>sb.eanZivinyKontrola(n);
const mleko={kcal:64,tuky:3.5,nasycene:2.3,sacharidy:4.8,cukry:4.8,bilkoviny:3.3,sul:0.1};
let k=K(mleko);t('mléko 3,5 %: bez chyb i varování, z živin ~64 kcal',!k.chyby.length&&!k.varovani.length&&Math.round(k.vypocet)===64,k);
k=K({...mleko,nasycene:4});t('nasycené > tuky → chyba',k.chyby.some(c=>c.includes('Nasycené')));
k=K({...mleko,cukry:6});t('cukry > sacharidy → chyba',k.chyby.some(c=>c.includes('Cukry')));
k=K({kcal:2200,tuky:30,sacharidy:55,bilkoviny:7});t('energie v kJ omylem (2200) → chyba s nápovědou kJ',k.chyby.some(c=>c.includes('kJ')));
k=K({kcal:500,tuky:60,sacharidy:50,bilkoviny:10});t('součet gramů > 100 → chyba',k.chyby.some(c=>c.includes('100 g')));
k=K({kcal:300,tuky:30,sacharidy:55,bilkoviny:7});t('čokoláda s chybnou energií 300 místo ~518 → varování, ne chyba',!k.chyby.length&&k.varovani.length===1,k);
k=K({kcal:531,tuky:30,nasycene:18,sacharidy:57,cukry:56,vlaknina:2,bilkoviny:7,sul:0.2});t('mléčná čokoláda 531 kcal → v pořádku (s vlákninou 2 kcal/g)',!k.chyby.length&&!k.varovani.length,k);
k=K({kcal:64});t('jen energie → chyba „aspoň energii a jednu živinu“',k.chyby.some(c=>c.includes('aspoň')));
t('desetinná čárka i mezery: „3,5“ → 3.5, prázdné → null, „abc“ → NaN',sb.eanCislo('3,5')===3.5&&sb.eanCislo(' ')===null&&Number.isNaN(sb.eanCislo('abc')));
k=K({kcal:64,tuky:NaN,bilkoviny:3});t('nečíslo → chyba',k.chyby.some(c=>c.includes('číslo')));
t('zdroj: ručně vs. fotka',sb.eanZivinyZdroj({zdroj:'rucne'}).includes('ručně')&&sb.eanZivinyZdroj({}).includes('fotky'));
// worker
const w={};vm.createContext(w);vm.runInContext(konst(wk,'EAN_ZIVINY_KLICE')+'\n'+pick(wk,'eanZivinyOver'),w);
let o=w.eanZivinyOver(mleko);t('worker: mléko projde, zaokrouhlí na 0,1',o.n&&o.n.tuky===3.5&&!o.nesedi&&!o.chyba,o);
o=w.eanZivinyOver({...mleko,nasycene:9});t('worker: nasycené > tuky → odmítne',!!o.chyba);
o=w.eanZivinyOver({kcal:1500,tuky:1});t('worker: kcal > 900 → odmítne',!!o.chyba);
o=w.eanZivinyOver({kcal:300,tuky:30,sacharidy:55,bilkoviny:7});t('worker: nesoulad energie jen poznačí (nesedi)',o.n&&o.nesedi===true);
o=w.eanZivinyOver({kcal:'<script>',tuky:1});t('worker: text místo čísla → odmítne',!!o.chyba);
t('worker: akce „ziviny“ v routeru, bez potvrzení nesouladu odmítne, záloha předchozích hodnot + log',wk.includes("if (body.akce === 'ziviny') return eanAkceZiviny(")&&wk.includes("if (o.nesedi && !body.potvrzeno)")&&wk.includes('p.nutricePredchozi = p.nutriceObal')&&wk.includes('community/eanZivinyLog/')&&wk.includes("zdroj: 'rucne'"));
t('worker: záloha se zachová při obnově z databáze (EAN_ZACHOVAT)',/EAN_ZACHOVAT = \[[^\]]*'nutricePredchozi'/.test(wk));
t('worker: i fotka živin zálohuje předchozí hodnoty',(wk.match(/p\.nutricePredchozi = p\.nutriceObal/g)||[]).length===2);
// UI
t('tlačítko „✍️ Zadat živiny ručně“ u fotek (skener i karta)',es.includes("onclick=\"eanZivinyForm('${escHtml(ean)}','${poHotovo}')\""));
t('karta v Mapě: „✍️ Opravit ručně“ i „✍️ Zadat ručně“, když živiny chybí',rc.includes("eanZivinyForm('${escHtml(z.ean)}','mapaUzivFotoHotovo')\">✍️ Opravit ručně")&&rc.includes("eanZivinyForm('${escHtml(z.ean)}','mapaUzivFotoHotovo')\">✍️ Zadat ručně"));
t('formulář: na 100 g / 100 ml, kJ přepočet, složení, okno nad kartou i skenerem',es.includes('name="ezNa" value="ml"')&&es.includes('kj / 4.184')&&es.includes('id="ez_slozeni"')&&es.includes('z-index:10070'));
t('admin vidí ruční zadání, nesoulad a předchozí hodnoty',ad.includes("p.nutriceObal.zdroj === 'rucne'")&&ad.includes('p.nutricePredchozi'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
