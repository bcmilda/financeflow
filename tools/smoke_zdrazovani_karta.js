// S25 – Zdražování (Kč/ks vedle Kč/kg, detail nákupů, hledání), karta výrobku (koš ČSÚ jednou, barevné nadpisy),
// naskenované výrobky (nezmizí po zavření), sdílené ceny bez poznámky pro admina.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js'),ean=R('ean-sken.js','../js/ean-sken.js'),ck=R('ceny-kraje.js','../js/ceny-kraje.js');
const pick=(src,n)=>{let i=src.indexOf('function '+n+'(');if(src.slice(i-6,i)==='async ')i-=6;let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
console.log('── S25 · Zdražování podle výrobků ──');
const sb={window:{},getData:()=>({}),Math,Object,Set,String,normQty:n=>{const m=/(\d+)\s*g/i.exec(n);return m?{hodnota:+m[1],jednotka:'g'}:null},normName:s=>s.toLowerCase(),
  rpMapaNavrh:n=>/kofila/i.test(n)?{tax:{id:'oplatky',nazev:'oplatky',podNazev:'Sušenky',ikona:'🛒'}}:null};
vm.createContext(sb);const i0=rc.indexOf('function taxJednotkovaCena');vm.runInContext(rc.slice(i0,rc.indexOf('window.taxCenyVyvoj',i0)),sb);
const v=sb.taxCenyVyvoj([{name:'KOFILA 42G',price:10.9,qty:1,date:'2026-09-02',store:'Penny'},{name:'KOFILA 42G',price:12.9,qty:2,date:'2026-10-02',store:'Lidl'}],{});
const p=v.polozky[0];
t('vedle Kč/kg i Kč/ks (první a poslední měsíc)',p&&p.prvniKs===10.9&&p.posledniKs===12.9&&p.j==='kg',p&&[p.prvniKs,p.posledniKs]);
t('nákupy zůstávají pro rozbalení detailu',p.nakupy.length===2&&p.nakupy[0].cenaKs===10.9);
t('podkategorie žlutě, klik rozbalí detail, legenda křivky',rc.includes('font-size:.68rem;color:#fbbf24">${escHtml(p.podNazev)}')&&rc.includes("document.getElementById('taxDet${pi}')")&&rc.includes('Modrá křivka = vývoj ceny po měsících'));
t('Sledování ceny: rozbalovací výběr položek přímo nad kartami, bez hledacího pole',!rc.includes('oninput="priceHledej(this.value)"')&&rc.indexOf('html += _pickerHTML')>rc.indexOf('📊 Vývoj cen · <strong>')&&rc.indexOf('html += _pickerHTML')<rc.indexOf('// ── Shrinkflation varování ──'));
t('rozdíl ceny bez chyby plovoucí čárky (↑ 4 Kč, ne 4,00)',rc.includes('Math.round((h.price - prev) * 100) / 100'));
console.log('── S25 · karta výrobku ──');
const s2={escHtml:s=>String(s),pgKodCsu:c=>'01.1.1.3',coicopNorm:c=>c==='01.113'?'01.1.1.3':c,String,Math};vm.createContext(s2);vm.runInContext(pick(rc,'mapaKosRadek'),s2);
const radek=(l,x)=>`[${l}:${x}]`, pg={code:'01.113',group:'Chléb a pekařské výrobky',w:21.399};
t('stejný kód jako COICOP → jen váha, žádné druhé zařazení',/^\[Váha v koši ČSÚ:/.test(s2.mapaKosRadek(pg,'01.113',radek))&&s2.mapaKosRadek(pg,'01.113',radek).includes('21,40 Kč z každých 1 000 Kč'));
t('jiný kód → celé zařazení koše',/^\[Spotřební koš ČSÚ:01\.1\.1\.3 · Chléb/.test(s2.mapaKosRadek(pg,'01.189',radek)));
t('nadpisy sekcí barevně',rc.includes("color:#60a5fa;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px\">${t}"));
console.log('── S25 · naskenované výrobky ──');
const S={uiCfg:{},receipts:[{items:[{name:'X',ean:'111'}]}]};let ul=0;
const s3={S,save(){ul++},setTimeout(){},eanNaskenovaneKresli(){},Date,Set};vm.createContext(s3);vm.runInContext(['eanZapamatuj','eanNaskenovane'].map(n=>pick(ean,n)).join('\n'),s3);
s3.eanZapamatuj('222');s3.eanZapamatuj('111');s3.eanZapamatuj('222');
const l=s3.eanNaskenovane(S);
t('sken se zapamatuje (nejnovější nahoře, bez duplicit)',l.length===2&&l[0].ean==='222'&&ul===3);
t('pozná, co už je přiřazené k účtence',l.find(x=>x.ean==='111').prirazeno&&!l[0].prirazeno);
t('zapamatuje se při každém nalezeném kódu; seznam ve Skenovat i v Mapě položek',pick(ean,'eanNalezen').includes('eanZapamatuj(ean)')&&(rc.match(/class="eanNaskBox"/g)||[]).length===2);
t('karta výrobku v okně ukazuje i složení',ean.includes('<summary style="font-size:.74rem;font-weight:700;cursor:pointer">Složení'));
t('ceny v kraji: bez poznámky pro admina',!ck.includes('admin vidí i pod prahem'));
console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
