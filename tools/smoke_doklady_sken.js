// S25 – doklad ze skenu: všechny fotky jedním klepnutím (bez alba), automatické uschování, více fotek.
const fs=require('fs'),path=require('path'),vm=require('vm');
const find=f=>{for(const d of ['.','js','../js']){const p=path.join(__dirname,d,f);if(fs.existsSync(p))return p;}throw new Error('nenalezeno '+f)};
const pick=(src,n)=>{let i=src.indexOf('function '+n+'(');if(i<0)throw new Error('nenalezeno: '+n);if(src.slice(i-6,i)==='async ')i-=6;if(i<0)throw new Error('nenalezeno: '+n);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(!d)return src.slice(i,k+1)}}};
const rc=fs.readFileSync(find('receipts.js'),'utf8');
let fails=0;const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};
function mk(){const sb={S:{uiCfg:{}},window:{},Date,Array,console,save(){sb.saved++},saved:0,showToast(){},File:class{constructor(a,n,o){this.parts=a;this.name=n;this.type=o.type}},document:{getElementById:()=>null}};
  sb.window=sb; vm.createContext(sb);
  vm.runInContext(['rpFotky','rpScanPro','rpAutoDoklad','rpArchivBlok','archivUlozVse','rpPripojFotky','_rpJakoSoubor','rpArchivAuto'].map(n=>pick(rc,n)).join('\n'),sb);
  let n=0; sb.archivUloz=async()=>({key:'k'+(++n),bajtu:100,pocet:n,limit:300}); return sb;}
console.log('── S25 · doklad ze skenu ──');
check('čerstvý sken: tlačítko uschová všechny fotky, BEZ výběru z alba',()=>{const sb=mk();sb._rpScanFoto={blobs:[{},{}],tok:'t1',at:Date.now()};
  const h=sb.rpArchivBlok({_scanTok:'t1'}); assert(h.includes('rpArchivUlozScan()')&&h.includes('(2)'),'tlačítko'); assert(!h.includes('type="file"'),'album se neotevírá');});
check('zapnuté automaticky: místo tlačítka info',()=>{const sb=mk();sb.S.uiCfg.autoDoklad=true;sb._rpScanFoto={blobs:[{}],tok:'t1',at:Date.now()};
  const h=sb.rpArchivBlok({_scanTok:'t1'}); assert(h.includes('při uložení')&&!h.includes('rpArchivUlozScan()'));});
check('účtenka z Historie (jiný/žádný sken) → výběr fotky',()=>{const sb=mk();sb._rpScanFoto={blobs:[{}],tok:'t1',at:Date.now()};
  const h=sb.rpArchivBlok({_scanTok:'jiny'}); assert(h.includes('Přidat fotku dokladu')&&h.includes('type="file"'));});
check('uschovaný doklad s více fotkami ukáže počet',()=>{const sb=mk();assert(sb.rpArchivBlok({photoKey:'a',photoKeys:['a','b']}).includes('(2 fotky)'));});
check('rpFotky: stará účtenka jen s photoKey',()=>{const sb=mk();assert(JSON.stringify(sb.rpFotky({photoKey:'x'}))==='["x"]');assert(sb.rpFotky({}).length===0);});
(async()=>{
  const sb=mk(); sb.S.uiCfg.autoDoklad=true; sb._rpScanFoto={blobs:[{type:'image/jpeg'},{type:'image/jpeg'}],tok:'t9',at:Date.now()};
  const r={id:'r1'}; await sb.rpArchivAuto(r,'t9');
  check('auto: 2 fotky → photoKeys, photoKey = první, uloženo',()=>{assert(r.photoKeys&&r.photoKeys.length===2&&r.photoKey===r.photoKeys[0]&&sb.saved===1,JSON.stringify(r));});
  const r2={id:'r2'}; sb.S.uiCfg.autoDoklad=false; await sb.rpArchivAuto(r2,'t9');
  check('auto vypnuto → nic',()=>assert(!r2.photoKey));
  const r3={id:'r3'}; sb.S.uiCfg.autoDoklad=true; await sb.rpArchivAuto(r3,'cizi');
  check('cizí sken (jiný token) → nic',()=>assert(!r3.photoKey));
  check('uložení účtenky spouští auto a maže pomocný token',()=>{const b=pick(rc,'addReceiptAsTx');assert(b.includes('rpArchivAuto(_ul, _tok)')&&b.includes('delete _ul._scanTok'));});
  check('mazání účtenky/dokladu maže všechny fotky',()=>{assert(pick(rc,'deleteReceipt').includes('rpFotky(_r).forEach'));assert(pick(rc,'dokladSmaz').includes('archivSmazVse(r)'));});
  console.log(fails?`❌ ${fails} selhalo`:'✅ vše prošlo'); process.exit(fails?1:0);
})();
