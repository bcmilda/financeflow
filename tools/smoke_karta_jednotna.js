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
//  S25 (v11.60, Milan): karta výrobku jednotná – stejná políčka s kódem i bez, prázdné „----“,
//  vše jde doplnit; živiny bez kódu do osobní karty; COICOP: sbalený jen číselník.
ctx._set({}, {}, {});
global.S = S; S.uiCfg = {};
let saved = 0; ctx.save = () => { saved++; };
S.receipts=[
 {date:'2026-09-01',store:'Penny Market',items:[{name:'Margot 80g Orion',price:14.9},{name:'Smet.jogurt bílý 1kg KK',price:69.9,ean:'8590000000017'}]},
 {date:'2026-09-08',store:'Penny Market',items:[{name:'Margot 80g Orion',price:14.9}]}];
ctx.buildMapaTab(S.receipts);
const d=vm.runInContext('_mapaUziv',ctx);
const iN=d.findIndex(z=>/margot/i.test(z.nazev)), iE=d.findIndex(z=>z.ean);
const zN=d[iN], zE=d[iE];
// klíče
const kN=ctx.mapaKartaKlic(zN), kE=ctx.mapaKartaKlic(zE);
t('klíč bez kódu: „n“ + otisk, bez znaků zakázaných ve Firebase',/^n[0-9a-z]+$/.test(kN),kN);
t('klíč stabilní pro stejnou položku',ctx.mapaKartaKlic({klic:zN.klic,nazev:'jiný'})===kN);
t('klíč s kódem: „e“ + číslice',kE==='e8590000000017',kE);
t('živiny poznají osobní kartu podle klíče',ctx.eanZivinyLokalni(kN)&&!ctx.eanZivinyLokalni('8590000000017'));
// stejná políčka
const POLE=['EAN / GTIN','Název z EAN','Obal – přední strana','Obal – CZ popisek','Značka','Výrobce','Dovozce','Čisté množství','Typ výrobku','>Obal<','Země původu','Prodává se v','Nutri-Score','Složení','Alergeny','Nutriční hodnoty'];
const kartaN=ctx.mapaUzivKartaHTML(iN,null);
const kartaE=ctx.mapaUzivKartaHTML(iE,{stav:'nalezeno',nazev:'Jogurt bílý',zdroj:'Open Food Facts'});
t('karta BEZ kódu má všechna políčka',POLE.every(x=>kartaN.includes(x)),POLE.filter(x=>!kartaN.includes(x)));
t('karta S kódem má stejná políčka',POLE.every(x=>kartaE.includes(x)),POLE.filter(x=>!kartaE.includes(x)));
t('prázdná políčka = „----“',(kartaN.match(/class="mk-nic">----</g)||[]).length>=10);
t('bez kódu: ručně doplnit přední stranu, CZ popisek, značku, výrobce, dovozce',['nazevObal','nazevPopisek','znacka','vyrobce','dovozce'].every(p=>kartaN.includes(`mapaKartaUprav(${iN},'${p}')`)));
t('s kódem: přední strana i vyfotit, i opsat ručně (Milan)',kartaE.includes("eanFoto('8590000000017','obal',mapaUzivFotoHotovo)")&&kartaE.includes(`mapaKartaUprav(${iE},'nazevObal')`));
t('s kódem: CZ popisek opravit + vyfotit',kartaE.includes("eanNazevUprav('8590000000017','mk_8590000000017')")&&kartaE.includes("eanFoto('8590000000017','popisek',mapaUzivFotoHotovo)"));
t('bez kódu: živiny zadat ručně do osobní karty, bez fotky',kartaN.includes(`eanZivinyForm('${kN}','mapaUzivFotoHotovo')">✍️ Zadat ručně`)&&!kartaN.includes("'ziviny',mapaUzivFotoHotovo"));
t('s kódem: živiny vyfotit i zadat ručně',kartaE.includes("eanFoto('8590000000017','ziviny',mapaUzivFotoHotovo)")&&kartaE.includes("eanZivinyForm('8590000000017','mapaUzivFotoHotovo')\">✍️ Zadat ručně"));
// uložení
ctx.mapaKartaLokUloz(zN,{nazevObal:'Margot Orion',znacka:'Orion',vyrobce:''});
const lk=S.uiCfg.karty[kN];
t('uložení: do S.uiCfg.karty + save()',lk&&lk.nazevObal==='Margot Orion'&&lk.znacka==='Orion'&&saved>0,lk);
t('uložení: prázdné se nezapisuje, zkratka a čas ano',!('vyrobce' in lk)&&lk.zkratka==='Margot 80g Orion'&&lk.kdy>0);
ctx.mapaKartaLokUloz(zN,{znacka:''});
t('prázdné = smazat jen to políčko',!('znacka' in S.uiCfg.karty[kN])&&S.uiCfg.karty[kN].nazevObal==='Margot Orion');
S.uiCfg.karty[kN].nutrice={kcal:530,tuky:30,sacharidy:58,bilkoviny:6,na:'g',zdroj:'rucne',kdy:Date.now()};
S.uiCfg.karty[kN].slozeni='cukr, kakaové máslo';
const kartaN2=ctx.mapaUzivKartaHTML(iN,null);
t('osobní údaje se ukážou: přední strana, titulek, živiny, složení',kartaN2.includes('Margot Orion')&&kartaN2.includes('✍️ opsáno ručně')&&kartaN2.includes('Nutriční hodnoty na 100 g')&&kartaN2.includes('zadáno ručně – jen pro tebe')&&kartaN2.includes('cukr, kakaové máslo'));
t('seznam ukáže název opsaný z obalu',ctx.mapaUzivSeznamHTML().includes('Margot Orion'));
t('ručně opsaná přední strana přebije fotku (s kódem)',(()=>{ctx.mapaKartaLokUloz(zE,{nazevObal:'Můj opis'});const k=ctx.mapaUzivKartaHTML(iE,{stav:'nalezeno',nazev:'X',nazevObal:'Z fotky'});return k.includes('Můj opis')&&!k.includes('>Z fotky<');})());
// COICOP (číselník a váhy ČSÚ jako v appce)
vm.runInContext(R('product-db.js','../js/product-db.js'),ctx);
vm.runInContext("_productDB={groups:{'01.146':{n:'Jogurty',w:4},'01.113':{n:'Chléb',w:21}}};",ctx);
if (typeof ctx.coicopNastav === 'function') { try { ctx.coicopNastav(JSON.parse(R('coicop2018.json','../data/coicop2018.json')).polozky); } catch(e){} }
const ij=d.findIndex(z=>z.tax&&/jogurt/.test(z.tax.nazev));
const kj=ctx.mapaUzivKartaHTML(ij,null);
const _d0=kj.indexOf('ontoggle="_mapaKoicopOtevreno=this.open"'); const det=_d0<0?'':kj.slice(_d0, kj.indexOf('</details>', _d0));
t('COICOP: v rozbalovacím jen číselník, Srovnání výdajů mimo (vždy vidět)',kj.includes('Srovnání výdajů')&&!det.includes('Srovnání výdajů')&&det.includes('mk-hier'));
t('Váha ČSÚ a Tvůj podíl: žlutý, větší nadpis',/<div class="t">Váha ČSÚ – průměrná domácnost<\/div>/.test(kj)&&/<div class="t">Tvůj podíl<\/div>/.test(kj)&&R('receipts.js','../js/receipts.js').includes('.mk-cislo .t{font-size:.8rem;font-weight:700;color:#fbbf24'));
t('přepnutí období/základu už nerozbaluje číselník',!R('receipts.js','../js/receipts.js').includes('_mapaKoicopOtevreno=true;mapaVahaObdobi'));
console.log(`\nsmoke_karta_jednotna: ${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
