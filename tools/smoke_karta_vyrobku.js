// S25 (v11.34) – vážené zboží v editoru účtenky (částka z účtenky, ne cena za kg) a rozšířená
// karta výrobku podle návrhu „Produktový katalog“; worker doplňuje další údaje o výrobku.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const rc=fs.readFileSync(najdi('receipts.js','../js/receipts.js'),'utf8');
const wk=fs.readFileSync(najdi('worker.js','../cloudflare-worker/worker.js'),'utf8');
const pick=n=>{let i=rc.indexOf('function '+n+'(');let d=0,j=rc.indexOf('{',i);for(let k=j;k<rc.length;k++){if(rc[k]==='{')d++;else if(rc[k]==='}'){d--;if(!d)return rc.slice(i,k+1)}}};
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const sb={escHtml:s=>String(s),Set,Math,Date,String,_eanMojeNazvy:{}};vm.createContext(sb);
vm.runInContext(['rpVazene','rpVazJed','lineAmt','mapaKartaKatalog'].map(pick).join('\n'),sb);
console.log('── S25 · vážené zboží ──');
t('0,192 kg je vážené, 1 ks ne, unit kg ano',sb.rpVazene({qty:0.192})&&!sb.rpVazene({qty:1})&&sb.rpVazene({qty:1,unit:'kg'}));
t('jednotka l / kg',sb.rpVazJed({unit:'l'})==='l'&&sb.rpVazJed({qty:.2})==='kg');
t('editor ukazuje částku za položku a cenu za kg zvlášť',rc.includes("value=\"${vaz ? (Math.round(lineAmt(it) * 100) / 100) : (it.price||0)}\"")&&rc.includes('id="rp_pkg_${i}"'));
t('změna váhy drží částku z účtenky, cena/kg se dopočítá',rc.includes('const tot = lineAmt(r.items[i]); r.items[i].qty = v; r.items[i].lineTotal = tot; r.items[i].price = Math.round(tot / v * 100) / 100'));
console.log('── S25 · karta výrobku ──');
const radek=(l,v)=>`[${l}:${v}]`;
const z={ean:'8691707062389',tax:{nazev:'bonbony'},mapa:{zdrojTax:'ean'},nakupy:[{raw:'PAPITA S ČOKOLÁDOVOU NÁPLNÍ 33G',obchod:'Lučina',datum:'2026-10-06'},{raw:'PAPITA 33G',obchod:'Penny',datum:'2026-09-01'},{raw:'PAPITA 33G',obchod:'Penny',datum:'2026-09-20'}]};
const p={nazev:'Papita Caramel',nazevCesky:false,nazevCs:'Sušenky Papita',jazyk:'tr',znacka:'ozmo',vyrobce:'Ozmo AŞ',puvod:'Turecko',zeme:['czech republic','turkey'],obal:['plastic'],zdroj:'Open Food Facts',kdy:Date.now(),slozeni:'x',kategorie:['snacks','biscuits']};
const k=sb.mapaKartaKatalog(z,p,{stav:'nalezeno'},radek,'33 g');
t('názvy: originální, český se zdrojem, aliasy z účtenek s obchody a počtem',k.nazvy.includes('[Originální název:Papita Caramel')&&k.nazvy.includes('návrh AI')&&k.nazvy.includes('PAPITA 33G')&&k.nazvy.includes('Penny · 2×'),k.nazvy.slice(0,200));
t('výrobek: značka, výrobce, množství, obal, původ, země',['Značka','Výrobce','Množství','Obal','Země původu','Prodává se v'].every(x=>k.vyrobek.includes('['+x+':')));
t('zdroje: GTIN-13, zdroj údajů, zařazení, poprvé/naposledy',k.zdroje.includes('GTIN-13')&&k.zdroje.includes('Open Food Facts')&&k.zdroje.includes('podle čárového kódu')&&k.zdroje.includes('01. 09. 2026 · 06. 10. 2026'));
const k2=sb.mapaKartaKatalog({nakupy:[]},null,null,radek,'');
t('bez dat nic nevymýšlí',!k2.nazvy&&!k2.vyrobek&&!k2.zdroje);
t('chybějící živiny: karta nabídne vyfotit tabulku',rc.includes('Databáze je u tohoto výrobku zatím nemá.'));
t('worker: výrobce, původ, země, obal, jazyk + jednorázová obnova starých záznamů',['vyrobce:','puvod:','zeme:','obal:','jazyk:','kv: 2','stareSchema'].every(x=>wk.includes(x)));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
