// FinanceFlow · smoke test · S26 (v11.72) · neuložené změny v oknech, K vyřízení, kód z fotky
//  Milan: „založil jsem podkategorii, zapomněl uložit a okno se bez varování zavřelo“
//         „karta se samovolně zavřela při pohybu s telefonem“
//         „klobásu jsem vyplnil, a v K vyřízení visela ještě pár minut“
//         „kód z fotky se nepřečetl, na druhý pokus spadla celá aplikace“
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const hp=R('helpers.js','../js/helpers.js'),es=R('ean-sken.js','../js/ean-sken.js'),rc=R('receipts.js','../js/receipts.js'),st=R('stats.js','../js/stats.js'),im=R('import.js','../js/import.js');
const pick=(s,n)=>{let a=s.indexOf('function '+n+'(');if(a<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',a);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(a,k+1)}}};

console.log('── okno s neuloženými změnami ──');
const tl=(txt,cls)=>({textContent:txt,className:cls||'',click(){this.klik=(this.klik||0)+1}});
const mkOkno=(id,tlac)=>({id,dataset:{},style:{position:'fixed',inset:'0px'},z:400,classList:{_c:new Set(['overlay','open']),contains(c){return this._c.has(c)},remove(c){this._c.delete(c)}},
  querySelectorAll:q=>q==='button'?tlac:[],remove(){this.pryc=1}});
const ulozit=tl('Uložit','btn btn-accent'), zrusit=tl('Zrušit','btn btn-ghost');
const kat=mkOkno('modalCat',[tl('✕','btn btn-ghost'),zrusit,ulozit]);
const kalk=mkOkno('modalFutureSim',[tl('✕'),tl('Zavřít','btn btn-ghost')]);
const body={children:[],style:{}};
const sb={console,Date,window:{},getComputedStyle:e=>({display:'block',visibility:'visible',zIndex:String(e.z||0)}),
  document:{body,getElementById:()=>null,querySelectorAll:q=>q.includes('.overlay.open')?[kat,kalk].filter(o=>o.classList.contains('open')):[]}};
vm.createContext(sb);
vm.runInContext(hp.slice(hp.indexOf('const _ffZpet ='),hp.indexOf('function ffZpetPopstate(')),sb);
let dotaz=null; sb.ffOknoDotaz=(o,z)=>{dotaz={o,z};};
vm.runInContext('ffOknoDotaz = this.ffOknoDotaz;',sb);
t('tlačítko Uložit se v okně najde',sb.ffOknoUlozTlacitko(kat)===ulozit);
t('okno bez změn se neptá',!sb.ffOknoJeZmeneno(kat));
sb.ffOknoZmeneno(kat);
t('po změně je okno „neuložené“',sb.ffOknoJeZmeneno(kat));
kalk.z=500; sb.ffOknoZmeneno(kalk);
t('okno bez Uložit (kalkulačka) se neptá nikdy',!sb.ffOknoJeZmeneno(kalk));
kalk.classList.remove('open');
t('Zpět u neuloženého okna: zeptá se a nezavře',vm.runInContext('ffZpetZavriVrchni()',sb)===true&&dotaz&&dotaz.o===kat&&kat.classList.contains('open'));
dotaz.z();
t('„Zahodit“ okno zavře',!kat.classList.contains('open'));
t('klepnutí vedle okna se zeptá (import.js)',/if\(typeof ffOknoHlidej==='function'&&ffOknoHlidej\(o,\(\)=>o\.classList\.remove\('open'\)\)\) return;/.test(im));
t('✕ v hlavičce okna se zeptá (zachycení kliknutí dřív než onclick)',/closeModal\|Zavri\\\(/.test(hp)&&hp.includes("e.stopPropagation(); e.preventDefault();"));
t('otevření okna = čistý stav (sleduje se class open)',hp.includes("attributeFilter: ['class']"));
t('přidání i odebrání podkategorie = neuloženo',/catSubAdd[\s\S]{0,400}ffOknoZmeneno\('modalCat'\)/.test(st)&&/function catSubRemove[^\n]*ffOknoZmeneno\('modalCat'\)/.test(st));
t('Uložit vezme i podkategorii napsanou v poli bez „+ Přidat“',/function saveCat\(\)\{[\s\S]{0,200}catSubAdd\(\)/.test(st));
t('karta výrobku se klepnutím vedle nezavře',!/addEventListener\('click', e => \{ if\(e\.target === o\) mapaUzivKartaZavri\(\); \}\)/.test(rc));

console.log('── K vyřízení ──');
const D={receipts:[{store:'Penny',date:'2026-10-12',items:[{name:'Šunková klob. premium 300g',ean:'K'}]}],uiCfg:{eanSken:[{e:'K',k:1}]}};
const se={escHtml:s=>String(s),_eanProdukty:{K:null},_eanMojeNazvy:null,Date,Set,Object,String,S:D,window:{_currentUser:{uid:'u1'}}};
vm.createContext(se);vm.runInContext(['eanProduktZCache','eanNazevVyrobku','eanNaskenovane','eanNazvyZUctenek','eanKVyrizeni'].map(n=>pick(es,n)).join('\n'),se);
let k=se.eanKVyrizeni(D)[0];
t('tvoje názvy ještě nenačtené → „načítám“, ne „chybí název“',k&&!k.bezNazvu&&!k.nacteno,k);
se._eanMojeNazvy={K:{nazev:'Šunková klobása Premium'}};
t('po načtení tvého názvu výrobek z K vyřízení zmizí',se.eanKVyrizeni(D).length===0);
se._eanMojeNazvy={}; se.window={};
t('nepřihlášený (bez tvých názvů) → seznam funguje dál',se.eanKVyrizeni(D)[0].bezNazvu===true);
t('po uložení názvu se K vyřízení a Moje výrobky hned překreslí',/async function eanNazevUloz[\s\S]{0,1800}eanNaskenovaneKresli\(\);[\s\S]{0,120}eanMojeVyrobkyKresli\(\);/.test(es));
t('seznam si tvoje názvy načte sám (dřív až se skenerem)',/eanNactiMojeNazvy\(\) : null\]\)/.test(es));

console.log('── kód z fotky ──');
t('fotka se čte zmenšená (1600, pak 2600 px), ne celá',/for \(const max of \[1600, 2600\]\)/.test(es)&&/resizeWidth: max/.test(es));
t('obraz i plátno se po čtení uvolní',/if \(bmp && bmp\.close\) bmp\.close\(\);[\s\S]{0,80}cv\.width = 0; cv\.height = 0;/.test(es));
t('NEGATIVNÍ KONTROLA: žádné dekódování celé fotky (createImageBitmap(soubor) bez zmenšení)',!/createImageBitmap\(soubor\)/.test(es)&&!/decodeFromImageUrl/.test(es));
t('kamera: průběžné ostření a tlačítka Přiblížit / Ztmavit, když je telefon umí',/focusMode: 'continuous'/.test(es)&&/id="eanZoom"/.test(es)&&/id="eanJas"/.test(es));

console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
