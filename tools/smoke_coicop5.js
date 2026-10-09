// S25 – 5. úroveň CZ-COICOP v taxonomii (c5) pro kartu a Statistiku položek; Srovnání ČR dál na 4. úrovni.
// Karta: řádek COICOP s oficiální váhou ČSÚ a tvým podílem z účtenek.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const T=JSON.parse(R('taxonomie.json','../data/taxonomie.json')), C=JSON.parse(R('coicop2018.json','../data/coicop2018.json')).polozky;
const sb={window:{},console,fetch:()=>Promise.resolve({ok:false})};sb.window=sb;vm.createContext(sb);
vm.runInContext(R('helpers.js','../js/helpers.js'),sb);vm.runInContext(R('product-db.js','../js/product-db.js'),sb);vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),sb);
sb.taxNastav(T);sb.coicopNastav(C);
console.log('── S25 · 5. úroveň COICOP ──');
const i=n=>sb.taxInfo(n);
t('rohlík → 01.1.1.3.1 Chléb a pečivo, oplatky/croissant → 01.1.1.3.9',i('rohlík').coicop5==='01.1.1.3.1'&&i('oplatky').coicop5==='01.1.1.3.9'&&i('croissant').coicop5==='01.1.1.3.9'&&sb.coicopNazev('01.1.1.3.1')==='Chléb a pečivo');
t('Srovnání ČR beze změny: 4. úroveň v poli coicop zůstává',i('rohlík').coicop==='01.113'&&i('oplatky').coicop==='01.113');
t('další příklady: rýže, jablko, banán, losos, máslo',i('rýže').coicop5==='01.1.1.1.2'&&i('jablko').coicop5==='01.1.6.3.1'&&i('banán').coicop5==='01.1.6.1.2'&&i('losos').coicop5==='01.1.3.1.2'&&i('máslo').coicop5==='01.1.5.2.1');
let n=0,chyb=[],bez=[];
T.oblasti.forEach(o=>o.podkategorie.forEach(p=>(p.nazvy||[]).forEach(x=>{const nm=typeof x==='string'?x:x.n;const k4=sb.coicopNorm((typeof x==='object'&&x.coicop)||p.coicop||'');
  if(!k4.startsWith('01'))return;const c5=p.c5&&p.c5[nm];if(!c5){bez.push(nm);return;}n++;
  if(!C[c5]||C[c5].u!==5||!c5.startsWith(k4))chyb.push(nm+'→'+c5);})));
t('každý obecný název potravin a nápojů má platný kód 5. úrovně pod svou podtřídou',!chyb.length&&!bez.length,{n,chyb:chyb.slice(0,5),bez:bez.slice(0,5)});
console.log('     přiřazeno:',n,'názvů');
const rc=R('receipts.js','../js/receipts.js'),sp=R('statistika-polozek.js','../js/statistika-polozek.js');
t('karta: řádek COICOP s 5. úrovní + váha ČSÚ a tvůj podíl, koš zvlášť jen bez taxonomie',rc.includes("const zarPanel = z.tax ? mapaKoicopPanelHTML(z.tax.coicop5 || z.tax.coicop, D) : '';")&&rc.includes("mkR('COICOP', posl ?")&&rc.includes("if (!z.tax) zar += mapaKosRadek(pg, '', radek)"));
const pick=n=>{let a=rc.indexOf('function '+n+'(');let d=0,j=rc.indexOf('{',a);for(let k=j;k<rc.length;k++){if(rc[k]==='{')d++;else if(rc[k]==='}'){d--;if(!d)return rc.slice(a,k+1)}}};
const s2={escHtml:s=>String(s),coicopNorm:sb.coicopNorm,Math,Date,getData:()=>({}),_productDB:{groups:{'01.113':{n:'Chléb',w:21.399},'01.145':{n:'Sýry',w:20},'02.110':{n:'Lihoviny',w:10}}},coicopNazev:k=>k==='01'?'Potraviny a nealkoholické nápoje':'',_mapaUziv:[],_mapaUzivReceipts:[{}],
  spRadky:()=>[{mesic:'2099-01',castka:48,coicop:'01.1.1.3.1'},{mesic:'2099-01',castka:952,coicop:'01.1.4.5.0'},{mesic:'2020-05',castka:500,coicop:'01.1.1.3.1'},{mesic:'2020-05',castka:500,coicop:'01.1.4.5.0'}]};
vm.createContext(s2);vm.runInContext("let _mapaVahaObdobi='12';\n"+['mapaObdobiOd','mapaVyberObdobi','mapaVahaPodtridy','mapaVahaOddilu','mapaVahaRadky','mapaVahaRoky','mapaVahaObdobiNazev','mapaMujPodil','mapaVahaHTML'].map(pick).join('\n'),s2);
const h=s2.mapaVahaHTML('01.113',{});
t('váha ČSÚ 21,4 ‰ + srovnání uvnitř oddílu: průměr 51,7 % · ty 4,8 % (−91 %)',h.includes('váha ČSÚ 21,4 ‰')&&h.includes('průměr 51,7 %')&&h.includes('ty 4,8 %')&&h.includes('(-91 %)'),h.replace(/\s+/g,' ').slice(0,200));
t('na kartě je vidět, z jakého období se počítá + volba období (12 měsíců / roky z účtenek / celá doba)',h.includes('počítá se z účtenek za posledních 12 měsíců')&&h.includes('48 Kč z 1')&&h.includes('<option value="2099"')&&h.includes('<option value="2020"')&&h.includes('<option value="vse"')&&h.includes('mapaVahaObdobi(this.value)'));
vm.runInContext("_mapaVahaObdobi='2020'",s2);const h20=s2.mapaVahaHTML('01.113',{});
t('rok 2020: jen účtenky z toho roku (500 z 1 000 Kč → 50 %)',h20.includes('ty 50 %')&&h20.includes('z účtenek za rok 2020')&&h20.includes('<option value="2020" selected'));
vm.runInContext("_mapaVahaObdobi='vse'",s2);const hv=s2.mapaVahaHTML('01.113',{});
t('vše: 548 z 2 000 Kč → 27,4 %',hv.includes('ty 27,4 %')&&hv.includes('z účtenek za celou dobu'),hv.replace(/\s+/g,' ').slice(180,420));
t('statistika bere 5. úroveň, když ji taxonomie má',sp.includes('tax.coicop5 || tax.coicop'));
t('taxonomie se po změně načte znovu (nová verze v adrese)',R('taxonomie.js','../js/taxonomie.js').includes("taxonomie.json?v=1.2-20261007"));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
