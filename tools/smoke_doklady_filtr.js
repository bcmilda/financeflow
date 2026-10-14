// FinanceFlow · smoke test · S26 (v11.74) · Doklady: filtr záruky, řazení, hledání; rychlejší překreslení
//  Milan: „u Dokladů bych přidal filtr podle záruky / data, ať se v tom člověk vyzná“
//         „když se akce nepropíše hned, vypadá to, že appka nefunguje“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'), hp=R('helpers.js','../js/helpers.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const dnes=new Date('2026-10-13T12:00:00').getTime();
const S={receipts:[]};
const c={S,Date,Math,String,parseInt,isNaN,escHtml:x=>String(x),DOKLAD_VAROVANI_DNI:60};
vm.createContext(c);
vm.runInContext(['dokladZaruka','dokladySeznam','dokladyFiltrHTML'].map(n=>pick(rc,n)).join('\n')+';var _dokFiltr="vse",_dokRazeni="zaruka";',c);
const kopie={store:'Lidl',date:'2026-09-01',photoKey:'k0'};
const pracka={store:'Datart',date:'2024-11-01',warrantyMonths:24,photoKey:'k1',photoNote:'Pračka'};
const tv={store:'Alza',date:'2025-12-01',warrantyMonths:24,photoKey:'k2'};
const stara={store:'OBI',date:'2022-01-01',warrantyMonths:24,photoKey:'k3'};
S.receipts.push(kopie,pracka,tv,stara);
const uniq=[pracka,tv,stara];                       // seznam BEZ duplikátu (kopie schovaná)
const l=c.dokladySeznam(uniq,dnes);
t('index dokladu = pozice v S.receipts (ne v seznamu bez duplikátů)',l.find(x=>x.r===pracka).i===1&&l.find(x=>x.r===stara).i===3,l.map(x=>x.i));
t('NEGATIVNÍ KONTROLA: dřív by „Otevřít“ u pračky sáhl na pozici 0 = jinou účtenku',uniq.indexOf(pracka)===0&&S.receipts[0]!==pracka);
t('stavy záruky: končí / platí / po záruce',l.map(x=>x.z.stav).join()==='konci,plati,propadla',l.map(x=>x.z.stav));
const h=c.dokladyFiltrHTML(l);
t('filtr: Vše, V záruce, Končí, Po záruce (prázdné kategorie se neukazují)',h.includes('Vše (3)')&&h.includes('🛡️ V záruce (1)')&&h.includes('⏰ Končí (1)')&&h.includes('⌛ Po záruce (1)')&&!h.includes('Bez záruky'));
t('řazení: záruka / nejnovější / nejstarší / částka a hledání v obchodě a poznámce',['zaruka','novy','stary','castka'].every(v=>h.includes(`value="${v}"`))&&h.includes('id="dokHledat"'));
t('řádky nesou stav, datum, konec záruky a text pro hledání',/class="dok-radek" data-stav="\$\{z\.stav\}" data-datum=/.test(rc)&&/data-text="\$\{escHtml\(\(\(r\.store/.test(rc));
t('filtr se po překreslení i přepnutí záložky použije znovu',/tab==='doklady'[^\n]*dokladyFiltruj\(\)/.test(rc));
console.log('── rychlejší překreslení ──');
t('rozepsaný formulář brzdí překreslení nejvýš 60 s (dřív 5 min)',/const FF_ROZPRAC_VYPRSI = 60 \* 1000;/.test(hp));
t('klepnutí na Uložit / Přidat / Potvrdit brzdu hned uvolní',/Uložit\|Přidat\|Potvrdit/.test(hp)&&hp.includes('_ffRozprac.formular = null; setTimeout(_ffCekaPill, 900);'));
t('čekající změna je vidět: „🔄 Ukázat změny“ (klepnutí = hned)',hp.includes("p.textContent = '🔄 Ukázat změny';"));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
