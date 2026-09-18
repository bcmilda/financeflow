// FinanceFlow · v10.78 · tools/smoke_obrazv1.js · 2026-09-16
// S22 · Finanční obraz v1 – tři nové složky + skládací funkce.
// Obraz měří ZMĚNU za okno (6M/12M/Celkově), ne úroveň. Neměřitelná složka
// musí vypadnout z výpočtu i s váhou; nula by lhala, že se nic nezměnilo.
const fs=require('fs'), vm=require('vm');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const noop=()=>{};const el=new Proxy({},{get:(t,k)=>k==='style'?{}:noop});
const sb={console,Math,Date,JSON,Object,Array,String,Number,Boolean,RegExp,Map,Set,Promise,Intl,
 Infinity,NaN,isFinite,isNaN,parseInt,parseFloat,setTimeout,clearTimeout,
 window:{},document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el,addEventListener:noop,body:el,documentElement:el},
 localStorage:{getItem:()=>null,setItem:noop,removeItem:noop},navigator:{language:'cs-CZ'},location:{href:'x',pathname:'/'},
 fetch:()=>Promise.resolve({ok:false}),requestAnimationFrame:c=>setTimeout(c,0),
 IntersectionObserver:class{observe(){}disconnect(){}},confirm:()=>true,alert:noop};
sb.window=sb;sb.globalThis=sb;sb.self=sb;vm.createContext(sb);
['helpers.js','assets.js','debts.js','projects.js'].forEach(f=>{
  try{vm.runInContext(fs.readFileSync(f,'utf8'),sb,{filename:f});}
  catch(e){console.error('❌ '+f+': '+e.message);process.exit(2);}});
sb.S={curMonth:6,curYear:2026,diary:{},payslips:[]};
vm.runInContext("S=globalThis.S; save=()=>{}; _settings={lang:'cs'};",sb);

//  12 měsíců dat: druhá polovina (novější) má vyšší příjem a nižší výdaje
function data(opts){
  const o=Object.assign({incStare:40000,incNove:46000,expStare:30000,expNove:27000,kat:3},opts||{});
  const tx=[];
  for(let i=0;i<12;i++){
    let m=6-i,y=2026; while(m<0){m+=12;y--;}
    const iso=`${y}-${String(m+1).padStart(2,'0')}-15`;
    const nove=i<6;
    tx.push({id:'i'+i,date:iso,type:'income',amount:nove?o.incNove:o.incStare,catId:'v'});
    const e=nove?o.expNove:o.expStare;
    //  rozdělit výdaje do `kat` kategorií, první největší
    const podily=[0.5,0.3,0.2,0.1].slice(0,o.kat);
    const suma=podily.reduce((a,b)=>a+b,0);
    podily.forEach((p,j)=>tx.push({id:'e'+i+'_'+j,date:iso,type:'expense',amount:Math.round(e*p/suma),catId:'c'+j}));
  }
  return {transactions:tx,debts:[],
    wallets:o.rezerva===0?[]:[{id:'w',type:'savings',balance:o.rezerva||180000}],
    assets:[],categories:[{id:'c0',name:'Bydlení'},{id:'c1',name:'Jídlo'},{id:'c2',name:'Doprava'},{id:'c3',name:'Zábava'}],
    shareSettings:{}};
}
const D=data();
vm.runInContext("getData=()=>globalThis.__D;",sb);
const volej=(fn,d,n)=>{sb.__D=d||D; return vm.runInContext(`${fn}(__D,${n||6})`,sb);};

console.log('── 💰 Reálný růst příjmu ──');
check('spočítá roční tempo z porovnání dvou oken',()=>{
  const r=volej('obrazRealnyRustPrijmu');
  assert(r.avail,'nedostupné: '+r.duvod);
  //  46000/40000 = +15 % za 6 měsíců → ×2 = +30 % ročně
  assert(Math.abs(r.hruby-30)<0.5,'hrubý růst '+r.hruby+' místo ~30');
});
check('odečte inflaci (bez účtenek pevná 3 %)',()=>{
  const r=volej('obrazRealnyRustPrijmu');
  assert(Math.abs(r.realny-(r.hruby-r.inflace))<0.01,'neodečetlo inflaci');
  assert(r.inflace===3,'záloha není 3 %, ale '+r.inflace);
});
check('pokles příjmu dá záporné body',()=>{
  const r=volej('obrazRealnyRustPrijmu',data({incNove:34000}));
  assert(r.sub<0,'body '+r.sub);
});
check('bez dost měsíců je NEMĚŘITELNÝ, ne nula',()=>{
  const d={transactions:[{id:'a',date:'2026-07-15',type:'income',amount:40000,catId:'v'}],
    debts:[],wallets:[],assets:[],categories:[],shareSettings:{}};
  const r=volej('obrazRealnyRustPrijmu',d);
  assert(r.avail===false,'tváří se jako měřitelný');
  assert(/chybí dost měsíců/.test(r.duvod||''),'chybí vysvětlení');
});

console.log('\n── 🛒 Dopad životního stylu ──');
check('nižší výdaje prodlouží dobu, kterou rezerva vydrží',()=>{
  const r=volej('obrazDopadStylu');
  assert(r.avail,'nedostupné: '+r.duvod);
  assert(r.zmena>0,'změna '+r.zmena+' – pokles výdajů měl rezervu prodloužit');
  assert(r.sub>0,'body '+r.sub);
});
check('vyšší výdaje ji zkrátí a dají mínus',()=>{
  const r=volej('obrazDopadStylu',data({expNove:36000}));
  assert(r.zmena<0,'změna '+r.zmena);
  assert(r.sub<0,'body '+r.sub);
});
check('bez rezervy je NEMĚŘITELNÝ (není co krátit)',()=>{
  const r=volej('obrazDopadStylu',data({rezerva:0}));
  assert(r.avail===false,'počítá i bez rezervy');
});

console.log('\n── 📊 Koncentrační riziko ──');
check('najde největší kategorii a její podíl',()=>{
  const r=volej('obrazKoncentrace');
  assert(r.avail,'nedostupné: '+r.duvod);
  assert(Math.abs(r.podil-50)<1,'podíl '+r.podil+' místo ~50');
  assert(r.kategorie==='Bydlení','kategorie '+r.kategorie);
});
check('vyšší koncentrace = horší body',()=>{
  const nizka=volej('obrazKoncentrace',data({kat:4}));
  const vysoka=volej('obrazKoncentrace',data({kat:3}));
  assert(vysoka.sub<nizka.sub,'koncentrovanější dostal víc bodů');
});
check('pod třemi kategoriemi se neměří (jinak trestá za netřídění)',()=>{
  const r=volej('obrazKoncentrace',data({kat:2}));
  assert(r.avail===false,'měří i se dvěma kategoriemi');
});

console.log('\n── Skládací funkce ──');
check('vrátí hodnotu kolem základu 100 na škále 0–200',()=>{
  const v=volej('computeObrazV1');
  assert(v,'nic nevrátilo');
  assert(v.zaklad===100 && v.max===200,'škála '+v.zaklad+'/'+v.max);
  assert(v.hodnota>=0,'hodnota '+v.hodnota);
});
check('zlepšení dá víc než 100, zhoršení míň',()=>{
  const dobry=volej('computeObrazV1');
  const spatny=volej('computeObrazV1',data({incNove:34000,expNove:36000}));
  assert(dobry.hodnota>100,'zlepšení dalo '+dobry.hodnota);
  assert(spatny.hodnota<100,'zhoršení dalo '+spatny.hodnota);
});
check('KLÍČOVÉ · neměřitelná složka vypadne i s váhou',()=>{
  const v=volej('computeObrazV1',data({rezerva:0}));
  //  styl (25 %) i jmění (30 %, chybí historie) vypadnou → zbývá 45 %
  const zive=v.slozky.filter(s=>s.avail);
  const soucet=zive.reduce((a,s)=>a+s.vaha,0);
  assert(v.pokryti===soucet,'pokrytí '+v.pokryti+' ≠ součet vah živých '+soucet);
  assert(v.slozky.some(s=>!s.avail && s.sub===null),'neměřitelná složka dostala body');
});
check('pod prahem pokrytí se známka NEUKÁŽE',()=>{
  const d={transactions:[{id:'a',date:'2026-07-15',type:'expense',amount:1000,catId:'c0'}],
    debts:[],wallets:[],assets:[],categories:[{id:'c0',name:'X'}],shareSettings:{}};
  const v=volej('computeObrazV1',d);
  assert(v.hodnota===null,'vydalo číslo '+v.hodnota+' bez podkladu');
  assert(/nemám co porovnat/.test(v.znamka.label),'známka '+v.znamka.label);
});
check('delší okno dá jiné číslo (a to je správně)',()=>{
  const a=volej('computeObrazV1',D,6);
  const b=volej('computeObrazV1',D,12);
  assert(a && b,'nespočítalo');
  assert(a.mesicu===6 && b.mesicu===12,'okno se nepropsalo');
});
check('známka odpovídá hodnotě podle konfigurace',()=>{
  //  Neporovnávat proti vlastnímu slovníku – ten se rozejde s _OBRAZ_V1.
  //  Ověřit rovnou proti prahům v konfiguraci: to je jediný zdroj pravdy.
  const v=volej('computeObrazV1');
  assert(v.znamka && v.znamka.label,'chybí známka');
  const znamky=vm.runInContext('_OBRAZ_V1.znamky',sb);
  const ocekavana=znamky.find(z=>v.hodnota>=z.min);
  assert(v.znamka.label===ocekavana.label,
    'hodnota '+v.hodnota+' dala „'+v.znamka.label+'", podle prahů má být „'+ocekavana.label+'"');
});
check('hranice pásem sedí na konfiguraci',()=>{
  const znamky=vm.runInContext('_OBRAZ_V1.znamky',sb);
  assert(znamky[0].min===170,'nejvyšší pásmo začíná na '+znamky[0].min);
  const drzi=znamky.find(z=>z.min===95);
  assert(drzi && /krok/i.test(drzi.label),'chybí úzké pásmo „Držíš krok"');
});

console.log('\n── Teploměr a karta ──');
const src=fs.readFileSync('projects.js','utf8');
check('stupnice NEOŘEZÁVÁ – hodnota nad 200 se přizná',()=>{
  assert(/nad běžným pásmem/.test(src),'přetečení se nepřizná');
});
check('u známky je vidět okno',()=>{
  assert(/_obrazV1Card\(D, months, _winTxt,/.test(src),'okno se do karty nepředává');
  assert(/\$\{oknoTxt \|\| ''\}/.test(src),'karta okno nevypisuje');
});
check('nemění se význam staré proměnné score',()=>{
  assert(/const score = _sc\.score;/.test(src),'stará proměnná byla přepsána – tichá záměna 0–100 za 0–200');
});
check('KLÍČOVÉ · úvodní blok stránky ukazuje NOVÝ obraz, ne starý pruh 0–100',()=>{
  //  Milan hlásil „Obraz je pořád nezměněn, škála 0–100": nová karta se sice
  //  vykreslovala, ale až POD úvodním blokem, takže první, co viděl, byl
  //  starý pruh. Dvě skóre nad sebou navíc nedávají smysl.
  assert(!/Skóre: <strong style="color:\$\{trendColor\}">\$\{score\}\/100/.test(src),
    'úvodní blok pořád ukazuje staré skóre 0–100');
  assert(/_obrazTeplomer\(_v1\)/.test(src),'úvodní blok nemá teploměr');
});
check('skóre se počítá JEDNOU a sdílí se mezi blokem a kartou',()=>{
  //  Dvojí výpočet by při rozdílu vyrobil dvě různá čísla na jedné stránce.
  assert(/_obrazV1Card\(D, months, _winTxt, _v1\)/.test(src),'karta si počítá vlastní výsledek');
});
check('KLÍČOVÉ · stupnice se ukáže i BEZ DAT, jen prázdná',()=>{
  //  Milan po vymazání dat hlásil „stupnice se ani nezobrazila". Obraz měří
  //  ZMĚNU, takže bez historie nemá co spočítat – jenže pak není poznat, jestli
  //  je funkce vůbec nasazená, ani co se od ní čekat.
  const prazdny = vm.runInContext("_obrazTeplomer({hodnota:null,znamka:{color:'#a8aec8'}})",sb);
  assert(prazdny.length>200,'prázdná stupnice se nevykreslí');
  //  S23 (Milan): prázdný stav se pozná podle ZTLUMENÍ a chybějícího jezdce, ne podle šedi.
  assert(/filter:saturate/.test(prazdny),'prázdný stav není odlišený ztlumením');
  assert(!/background:white/.test(prazdny),'prázdný stav má jezdce');
  assert(/100 · beze změny/.test(prazdny),'chybí rysky se základem');
});
check('prázdná stupnice nemá výplň (nevypadá jako výsledek)',()=>{
  const prazdny = vm.runInContext("_obrazTeplomer({hodnota:null,znamka:{color:'#a8aec8'}})",sb);
  assert(!/width:50%;background:#a8aec8/.test(prazdny),'kreslí výplň, jako by hodnota existovala');
});
check('bez dat se řekne, co s tím',()=>{
  assert(/stačí pár měsíců zápisů/.test(src),'uživatel neví, kdy se stupnice rozjede');
});
check('selhání výpočtu se PŘIZNÁ, karta mlčky nezmizí',()=>{
  assert(/_chyba:true/.test(src),'chybí příznak selhání');
  assert(/nepodařilo spočítat/.test(src),'uživatel se nedozví, že se něco nepovedlo');
  assert(/_OBRAZ_V1<\/code> v helpers\.js/.test(src),'neřekne, co zkontrolovat');
});
console.log('\n── Teploměr: rysky a barevná škála (S22, Milan) ──');
const tep = (h) => vm.runInContext("_obrazTeplomer("+JSON.stringify({hodnota:h,znamka:{color:'#4ade80'}})+")",sb);
//  S23 (Milan): pravítko na spodním lemu – čárka po 1 bodu, delší po 5 a 10.
//  Test MĚŘÍ vykreslené čáry, ne tvar kódu (SKILL 35).
const cary = (h) => [...tep(h).matchAll(/<line x1="([\d.]+)"[^>]*y2="([\d.]+)"/g)].map(m=>({x:+m[1],y2:+m[2]}));
check('pravítko: 201 čar, jedna na každý bod stupnice',()=>{
  assert(cary(141).length===201,'čar je '+cary(141).length);
});
check('pravítko: po pětkách delší, po desítkách ještě delší, po 50 přes celou výšku',()=>{
  const c = cary(141), d = b => 22 - c[b].y2;      // délka čáry u bodu b
  assert(d(3) < d(5),  'pětka není delší než jednotka');
  assert(d(5) < d(10), 'desítka není delší než pětka');
  assert(d(10) < d(50),'padesátka není delší než desítka');
  assert(d(50)===22 && d(100)===22, 'po 50 nejde čára přes celou výšku');
  assert(d(7)===d(3) && d(15)===d(5) && d(20)===d(10), 'stejné řády nemají stejnou délku');
});
check('pravítko sedí na SPODNÍM lemu (čáry rostou odspodu)',()=>{
  assert(/y1="22"/.test(tep(141)) && !/y1="0"/.test(tep(141)),'čáry nezačínají u spodní hrany');
});
check('barevná škála červená → žlutá → zelená',()=>{
  assert(/linear-gradient\(90deg,#ef4444[^)]*#fbbf24 50%[^)]*#22c55e 100%\)/.test(tep(141)),'není přechod');
});
check('KLÍČOVÉ (S23) · barevná škála je i BEZ DAT',()=>{
  //  V10.83 byla barva jen u stavu s hodnotou. Milan testuje na čerstvém účtu,
  //  viděl šedý pruh a oprava pro něj neexistovala. Původní test tu šeď
  //  VYŽADOVAL – potvrzoval vadu jako správné chování (SKILL 34).
  assert(/linear-gradient\(90deg,#ef4444/.test(tep(null)),'prázdný stav je bez barvy');
});
check('ručička ukazuje přesnou polohu',()=>{
  assert(/background:white/.test(tep(141)),'chybí jezdec');
  assert(!/background:white/.test(tep(null)),'jezdec se kreslí i bez hodnoty');
});
check('popisky osy po 50 bodech',()=>{
  const s = tep(141);
  ['0 · propad','50','100 · beze změny','150','200 · posun'].forEach(t=>
    assert(s.includes(t),'chybí popisek '+t));
});

console.log('\n── Sekce se neschovávají bez vysvětlení (S22, Milan) ──');
check('sekce 3 řekne, proč tu není',()=>{
  assert(/_sekcePrazdna\(3,/.test(src),'sekce 3 pořád mlčky mizí');
});
check('sekce 8 řekne, proč tu není',()=>{
  assert(/_sekcePrazdna\(8,/.test(src),'sekce 8 pořád mlčky mizí');
  assert(/jeden výplatní cyklus/.test(src),'nerozlišuje „jeden cyklus" od „žádný"');
});
check('karta neopakuje nadpis ani stupnici z úvodního bloku',()=>{
  const i = src.indexOf('function _obrazV1Card');
  const usek = src.slice(i, i + 2600);
  assert(!/_obrazTeplomer\(v1\)/.test(usek),'karta kreslí druhou stupnici pod první');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ OBRAZ v1 OVĚŘEN');
process.exit(fails?1:0);
