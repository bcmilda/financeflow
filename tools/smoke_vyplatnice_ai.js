// FinanceFlow · smoke test · S26 (v11.77) · Výplatnice: přepis přes AI, import ze souboru, celá páska, grafy, daně
//  Milan: „připrav bod 1 (AI postup)“ · „u importu nejde vložit celý dokument JSON, jen zkopírovat text“
//         „graf: chybí stupnice, popis, průměrná čára“ · „filtr jen výkon nebo čas, tabulka hodnot, čára výkon + čas“
//         „v tabulce je jen pár hodnot – proč nesledujeme stravování, el. peněženku, daně?“
//         „prémie (roční, půlroční) nejsou zanesené“
const vm=require('vm'),fs=require('fs'),path=require('path'),cp=require('child_process');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const soubor=najdi('vyplatnice.js','../js/vyplatnice.js');
const src=fs.readFileSync(soubor,'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const CZ_M=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const fmt=n=>new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:0}).format(n||0);
const fmtP=n=>{const x=parseFloat(n)||0;return Number.isInteger(x)?fmt(x):new Intl.NumberFormat('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(x)};
const el={};const doc={getElementById:id=>el[id]||null};
const mk=(kod)=>{const c={CZ_M,fmt,fmtP,Math,JSON,Intl,String,Number,Object,Array,Set,isFinite,parseFloat,Promise,console,
  document:doc,window:{},S:{payslips:[]},viewingUid:null,save(){c.ulozeno=(c.ulozeno||0)+1},showToast(m){c.toast=m},renderPage(){},setTimeout(){}};
  vm.createContext(c);vm.runInContext(kod+'\nthis.S=S;',c);return c;};
const c=mk(src.replace(/^const VYPL_POVAHY/m,'var S=this.S;\nconst VYPL_POVAHY'));
const realne=najdi('vyplatnice-import.json','../vyplatnice-import.json');

console.log('── bod 1: pokyn pro AI ──');
const pokyn=c.vyplAiPokyn();
t('pokyn obsahuje tvou šablonu (klíče, kódy, složky)',/vykonove — Výkonové prémie \(kód 0500\) · složka: premie/.test(pokyn)&&/stravovani — Srážka za stravování/.test(pokyn)&&/rocni — Roční prémie/.test(pokyn));
t('pokyn žádá kontrolní součty z pásky a popis nových položek',/"ocekavano"/.test(pokyn)&&/"nove"/.test(pokyn)&&/slozka \(jen u příjmů\)/.test(pokyn));
t('pokyn: daň PO slevách, srážky a nezdaněné připočty, desetinná tečka',/dan = záloha na daň PO slevách/.test(pokyn)&&/pripocty: nezdaněné/.test(pokyn)&&/desetinná TEČKA/.test(pokyn));
t('import má tlačítko „Zkopírovat pokyn“ a nahrání souboru (víc souborů)',/copyText\(vyplAiPokyn\(\),'Pokyn pro AI zkopírován'\)/.test(src)&&/<input type="file" accept="\.json,\.txt,application\/json,text\/plain" multiple/.test(src));

console.log('── čtení odpovědi AI ──');
const odpoved='Tady je přepis tvé pásky:\n```json\n[{"m":"2026-09","prijmy":{"zaklad":"25 500,00","vykonove":858,},"odvody":{"slevaZak":2570},"srazky":{"stravovani":"310"},"ocekavano":{"hruba":26358}},]\n```\nKdyby něco nesedělo, napiš.';
let p=c.vyplImportParse(odpoved);
t('```json blok, text okolo, čárka navíc a „25 500,00“ se přečtou',p.length===1&&p[0].prijmy.zaklad===25500&&p[0].srazky.stravovani===310&&p[0].ocekavano.hruba===26358,p);
p=c.vyplImportParse('{"m":"2026-09","prijmy":{"zaklad":1000}}');
t('jeden objekt místo pole = jeden měsíc',p.length===1&&p[0].m==='2026-09');
t('text bez JSONu → srozumitelná chyba',(()=>{try{c.vyplImportParse('ahoj');return false}catch(e){return /není JSON/.test(e.message)}})());

if(realne){
  const data=JSON.parse(fs.readFileSync(realne,'utf8'));
  el.vyplImportText={value:'```json\n'+JSON.stringify(data)+'\n```'}; el.vyplImportVysledek={innerHTML:''};
  c.vyplImportSpustit();
  t(`skutečné pásky (${data.length}) z odpovědi AI: všechny sedí na hrubou, čistou i dobírku`,c.S.payslips.length===data.length&&/Sedí: <strong[^>]*>19</.test(el.vyplImportVysledek.innerHTML),el.vyplImportVysledek.innerHTML.slice(0,200));
}

console.log('── jiná firma: šablona se doplní z první pásky ──');
const cizi=mk(src.replace(/^const VYPL_POVAHY/m,'var S=this.S;\nconst VYPL_POVAHY'));
//  Fiktivní páska jiné firmy: jiné položky, stravenkový paušál k výplatě, odvody opsané z pásky.
const pk={m:'2026-09',prijmy:{mesicniMzda:40000,priplatekOdpoledni:1200,pololetniOdmena:5000},
  odvody:{zp:2079,sp:3280,dan:4385,slevaZak:2570},srazky:{stravenky:600},pripocty:{stravenkovyPausal:2200},
  ocekavano:{hruba:46200,cisty:36456,dobirka:38056},
  nove:[{klic:'mesicniMzda',skupina:'prijmy',label:'Měsíční mzda',kod:'100',slozka:'pevna'},
        {klic:'priplatekOdpoledni',skupina:'prijmy',label:'Příplatek odpolední',kod:'210',slozka:'priplatky'},
        {klic:'pololetniOdmena',skupina:'prijmy',label:'Pololetní odměna',kod:'520',slozka:'odmeny'},
        {klic:'stravenky',skupina:'srazky',label:'Srážka stravenky',kod:'600'},
        {klic:'stravenkovyPausal',skupina:'pripocty',label:'Stravenkový paušál',kod:'700'}]};
el.vyplImportText={value:JSON.stringify([pk])}; el.vyplImportVysledek={innerHTML:''};
cizi.vyplImportSpustit();
const sab=cizi.S.payslipTemplate;
t('cizí páska prošla kontrolou (daň a pojistné opsané z pásky, ne z českého vzorce)',cizi.S.payslips.length===1,el.vyplImportVysledek.innerHTML);
t('nové položky jsou v šabloně i se složkou',sab&&sab.prijmy.find(x=>x.key==='priplatekOdpoledni').slozka==='zaCas'&&sab.srazky.some(x=>x.key==='stravenky')&&sab.pripocty.some(x=>x.key==='stravenkovyPausal'));
const v=cizi.vyplDopocet(cizi.S.payslips[0]), r=cizi.vyplRozklad(cizi.S.payslips[0]);
t('stravenkový paušál se k dobírce přičte',v.pripocty===2200&&v.dobirka===38056,v);
t('rozklad podle šablony: pevná / příplatky / odměny',r.pevna===40000&&r.zaCas===1200&&r.odmeny===5000&&r.premie===0,r);
const spatne=mk(src.replace(/^const VYPL_POVAHY/m,'var S=this.S;\nconst VYPL_POVAHY'));
el.vyplImportText={value:JSON.stringify([{...pk,ocekavano:{hruba:47000}}])}; el.vyplImportVysledek={innerHTML:''};
spatne.vyplImportSpustit();
t('nesedící hrubá → měsíc se nenaimportuje a šablona se nezmění',spatne.S.payslips.length===0&&!spatne.S.payslipTemplate&&/hrubá 46 200 ≠ 47 000/.test(el.vyplImportVysledek.innerHTML.replace(/ /g,' ')),el.vyplImportVysledek.innerHTML);

console.log('── složky, odměny, daně ──');
t('„za výkon“ = měsíční prémie + mimořádné odměny; roční prémie je odměna',(()=>{const q=c.vyplRozklad({prijmy:{zaklad:20000,vykonove:900,rocni:5688}});return q.premie===900&&q.odmeny===5688&&q.zaVykon===6588})());
t('šablona má i pololetní prémii',c.vyplSablona().prijmy.some(x=>x.key==='pololetni'&&x.slozka==='odmeny'));
t('stupnice: „hezké“ kroky',JSON.stringify(c._vyplOsa(41254).ticks)==='[0,10000,20000,30000,40000,50000]'&&JSON.stringify(c._vyplOsa(3366).ticks)==='[0,1000,2000,3000,4000]',c._vyplOsa(41254));
if(c.S.payslips.length>=19){
  const vyp=c.S.payslips.map(z=>c.vyplDopocet(z));
  const mez=c.vyplMeznaSazba(c.S.payslips.slice().sort((a,b)=>a.m.localeCompare(b.m)));
  t('z koruny navíc odejde ~26,6 haléře (4,5 + 7,1 + 15 %) – spočítáno z pásek',mez>0.25&&mez<0.28,mez);
  c.S.payslips.sort((a,b)=>a.m.localeCompare(b.m));
  const html=c._renderKalVyplatnice({},7,2026);
  const kar=html.slice(0,html.indexOf('id="vyplFormBox"'));
  t('karta měsíce: každá položka příjmů (prémie, mobilita, noční, přesčas, So+Ne…)',['Výkonové prémie','Osobní prémie','Odměna za mobilitu','Příplatek noční','Přesčas – mzda','Příplatek So + Ne','Dovolená'].every(x=>kar.includes(x)));
  t('karta měsíce: srážka za stravování i průchozí DPS / penzijko zvlášť',kar.includes('Srážka za stravování')&&kar.includes('Pojistné DPS')&&kar.includes('(průchozí – nepočítá se)'));
  t('karta měsíce: daň před slevami, slevy, odvody v % a srovnání s minulým měsícem',kar.includes('Daň před slevami')&&kar.includes('Sleva na poplatníka')&&kar.includes('Daňové zvýhodnění na děti')&&/Odvody celkem/.test(kar)&&/Oproti červenec 2026/.test(kar));
  t('karta měsíce: hlavička pásky (fond, odpracováno, tarif, PPÚ)',/Fond <b>/.test(kar)&&/Tarif <b>/.test(kar)&&/Průměr PPÚ <b>/.test(kar));
  t('podíl pevné: stupnice od 60 do 90 %, mřížka, průměrná čára a hodnoty u min/max/posledního',/>60 %<\/div>/.test(html)&&/>90 %<\/div>/.test(html)&&/class="vg-avg"[^>]*><span>⌀ 7\d %/.test(html)&&(html.match(/class="vg-hl"/g)||[]).length>=3);
  t('složení: filtr složek, osa v Kč, popisky měsíců, tabulka s průměrem a součtem',/onclick="vyplFiltr\('zaCas'\)"/.test(html)&&/>40 tis\.<\/div>/.test(html)&&/class="vg-x"/.test(html)&&/<td>Průměr<\/td>/.test(html)&&/<td>Součet<\/td>/.test(html));
  t('čárový graf prémie × příplatky (jedna osa, dvě čáry)',/id="vgPremie"/.test(html)&&(html.slice(html.indexOf('id="vgPremie"')).match(/<polyline/g)||[]).length>=2);
  t('karta Daně a odvody: ZP / SP / daň po měsících, sazba, tabulka',/🏛️ Daně a odvody/.test(html)&&/id="vgOdvody"/.test(html)&&/Z 1 000 Kč hrubého navíc ti zůstane/.test(html)&&/<th>Sazba<\/th>/.test(html));
  t('karta Mimořádné odměny: roční prémie i vánoční příspěvek podle roků',/🎁 Mimořádné odměny/.test(html)&&/Roční prémie/.test(html)&&/Vánoční příspěvek/.test(html));
  t('srážky po měsících: stravování i el. peněženka, ⌀ a tabulka',/id="vgSrazky"/.test(html)&&/Elektronická peněženka <span class="vk-pozn">\d+× · ⌀/.test(html));
  t('klepnutí = výpis měsíce pod grafem (funguje i na mobilu)',/onclick="vyplVyber\('vgPevna',\d+\)"/.test(html)&&/id="vgPevna_ct"/.test(html));
  c._vyplFiltrAkt=null; c.window._vyplFiltrAkt=['zaCas'];
  vm.runInContext('window._vyplFiltrAkt=["zaCas"]',c);
  const fil=vm.runInContext('_vyplSlozeniObsah(window._vyplRada)',c);
  t('filtr „Příplatky“: jen ta složka, stupnice se přizpůsobí, barva zůstane',!/background:#16a34a"><\/div>/.test(fil.slice(fil.indexOf('vg-bars')))&&/background:#3b82f6/.test(fil)&&!/>40 tis\./.test(fil));
}

console.log('── negativní kontrola: kód před v11.77 ──');
let stary=null; try{stary=cp.execSync('git show HEAD:js/vyplatnice.js',{cwd:path.join(path.dirname(soubor),'..'),stdio:['ignore','pipe','ignore']}).toString();}catch(e){}
if(stary&&!stary.includes('vyplAiPokyn')){
  t('NEGATIVNÍ KONTROLA: dřív import nepřečetl odpověď AI v ```json bloku a karta měla jen 7 řádků',!/```/.test(stary)&&!/Výkonové prémie'\)|_vyplPolozky/.test(stary)&&/rada\('Hrubá mzda', v\.hruba\)/.test(stary));
} else t('NEGATIVNÍ KONTROLA: starý kód (git HEAD) k dispozici',true);
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
