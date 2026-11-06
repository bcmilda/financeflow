// FinanceFlow · smoke test · Session 27 (v11.94) · jedna zkratka → víc výrobků („víc druhů“)
//  Milan: „BL Luštěninové chipsy 65g – kupoval jsem 3 různé druhy a název zůstal stejný“
//         „paměť ti vytáhne jeden společný ean kód … zpětně to upravovat nemá smysl“
//         „otázkou je, kde ten výběr bude dostupný, viditelný a spravovatelný“ → řádek položky v editoru
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const es=R('ean-sken.js','../js/ean-sken.js'), rc=R('receipts.js','../js/receipts.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);const a=s.lastIndexOf('async ',i)===i-6;let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return (a?'async ':'')+s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

//  platné EAN-13 (kontrolní číslice)
const ean=b=>{const c=b.split('').map(Number);let s=0;c.forEach((n,j)=>{s+=n*(j%2===0?1:3)});return b+((10-s%10)%10)};
const CIZ=ean('859401234561'), COC=ean('859401234578'), HRA=ean('859401234585');
const PROD={[CIZ]:{stav:'nalezeno',nazev:'BL Luštěninové cizrnové chipsy',mnozstvi:{hodnota:65,jednotka:'g'}},[COC]:{stav:'nalezeno',nazev:'BL Luštěninové čočkové chipsy',mnozstvi:{hodnota:65,jednotka:'g'}},[HRA]:{stav:'nalezeno',nazev:'BL Hrachové chipsy'}};
const dotazy=[];
const S={uiCfg:{},receipts:[
  {store:'Billa',date:'2026-10-05',items:[{name:'BL Luštěninové chipsy 65g',price:35.9,ean:CIZ}]},
  {store:'Billa',date:'2026-10-12',items:[{name:'BL Luštěninové chipsy 65g',price:35.9,ean:CIZ}]}],transactions:[]};
const c={console,S,window:{},Date,
  normName:t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(),
  normalizeStoreName:s=>s,escHtml:s=>String(s==null?'':s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])),fmtP:v=>String(v),
  eanProduktZCache:e=>PROD[e]||null,eanNazevVyrobku:p=>p.nazev,_eanNazevZCache:e=>PROD[e]?PROD[e].nazev:'',
  eanDotaz:async b=>{dotazy.push(b);return {ok:true,alias:{pocet:1}}},save(){c.ulozeno=(c.ulozeno||0)+1},showToast(m){c.toast=m},confirm:()=>true,
  eanZavri(){},rpRender(){c.prekresleno=(c.prekresleno||0)+1},document:{getElementById:()=>null},getData:()=>S};
c.window=c; vm.createContext(c);
vm.runInContext(['eanKontrola','eanAliasKlic','eanDruhy','eanDruhyKody','eanJeViceDruhu','_eanDruhyUloz','eanDruhPridej','eanDruhOdeber','eanDruhNakupu',
  '_eanOdmitnutoMa','eanKodProKlic','eanAliasPro','eanZapamatujOdmitnuti','_eanOdmitnute','eanPrirad','eanPriradKPolozce'].map(n=>pick(es,n)).join('\n')
  +'\nlet _eanAliasy={}, _eanZamky={}, _eanStav={}, _eanProdukty={};',c);
vm.runInContext(['_rpDruhNazev','_rpDruhKlic','rpDruhyPodRadkem','rpDruhyHTML','rpDruhVyber','rpDruhNevim','rpDruhRozbal','rpDruhOdeber','rpKodNazev','_rpSlova','_rpGramaz','rpKodSedi','rpKodRadekHTML'].map(n=>pick(rc,n)).join('\n')
  +'\nlet _rpKodNacitam=false; const _rpKodZkuseno=new Set();',c);
const K=c.eanAliasKlic('Billa','BL Luštěninové chipsy 65g');

console.log('── 1 kód: automatika jako dřív ──');
vm.runInContext(`_eanAliasy[${JSON.stringify(K)}]={ean:'${CIZ}'}`,c);
t('zkratka s jedním kódem se doplní sama (tvé spojení)',(c.eanKodProKlic(K,vm.runInContext('_eanAliasy',c),{},{},{})||{}).ean===CIZ);
t('eanAliasPro vrací kód',c.eanAliasPro('Billa','BL Luštěninové chipsy 65g')===CIZ);

console.log('── sken jiného kódu v editoru = další druh, nic se nepřepíše ──');
(async()=>{
  c._editReceipt={store:'Billa',items:[{name:'BL Luštěninové chipsy 65g',price:35.9,ean:CIZ,eanNazev:'BL Luštěninové cizrnové chipsy'}]};
  vm.runInContext(`_eanStav={cil:{i:0,obchod:'Billa',raw:'BL Luštěninové chipsy 65g'},vysledek:{ean:'${COC}',produkt:${JSON.stringify(PROD[COC])}}}`,c);
  await c.eanPrirad();
  const it=c._editReceipt.items[0];
  t('položka dostane nový kód',it.ean===COC&&it.eanNazev==='BL Luštěninové čočkové chipsy');
  t('zkratka vede ke 2 výrobkům (první doplněn z tvého dřívějšího kódu)',c.eanDruhyKody(K).length===2&&c.eanDruhyKody(K).includes(CIZ)&&c.eanDruhyKody(K).includes(COC),S.uiCfg.eanDruhy);
  t('starší účtenky zůstaly (cizrnové)',S.receipts.every(r=>r.items[0].ean===CIZ));
  t('komunitě se přidání druhu NEposílá (worker by prvnímu kódu ubral hlas)',dotazy.length===0,dotazy);
  t('hláška „přidán další druh“',/další druh/.test(c.toast||''));

  console.log('── 2+ druhy: nic se nedoplní samo ──');
  t('eanKodProKlic: víc druhů → nic (ani tvé spojení, ani komunita)',c.eanKodProKlic(K,vm.runInContext('_eanAliasy',c),{[K]:{[CIZ]:5}},{},{})===null);
  t('eanAliasPro: víc druhů → prázdné (Mapa položek nepřiřadí kartu naslepo)',c.eanAliasPro('Billa','BL Luštěninové chipsy 65g')==='');
  t('jiná zkratka dál normálně',(c.eanKodProKlic('billa__jine',{billa__jine:{ean:CIZ}},{},{},{})||{}).ean===CIZ);

  console.log('── výběr na řádku položky ──');
  c._editReceipt={store:'Billa',items:[{name:'BL Luštěninové chipsy 65g',price:35.9}]};
  t('ve sloupci názvu jen krátká poznámka „Který druh? ↓“',/🔀 Který druh\? ↓/.test(c.rpKodRadekHTML(c._editReceipt.items[0],0)));
  let h=c.rpDruhyPodRadkem(c._editReceipt.items[0],0);
  t('výběr pod řádkem na šířku telefonu',/max-width:370px/.test(h));
  t('bez kódu: „Který druh?“ s plnými názvy obou výrobků + 📷 Jiný + Nevím',/Který druh\?/.test(h)&&/BL Luštěninové cizrnové chipsy/.test(h)&&/BL Luštěninové čočkové chipsy/.test(h)&&/📷 Jiný/.test(h)&&/Nevím/.test(h)&&/vede k 2 výrobkům/.test(h),h);
  c.rpDruhVyber(0,COC);
  t('klepnutí vybere druh (kód + název k položce)',c._editReceipt.items[0].ean===COC&&c._editReceipt.items[0].eanNazev==='BL Luštěninové čočkové chipsy');
  t('ve sloupci názvu vybraný druh zeleně',/▮▮ BL Luštěninové čočkové chipsy/.test(c.rpKodRadekHTML(c._editReceipt.items[0],0)));
  h=c.rpDruhyPodRadkem(c._editReceipt.items[0],0);
  t('vybraný druh označen ✓',/✓ BL Luštěninové čočkové chipsy/.test(h)&&/🔀 Druh/.test(h));
  c.rpDruhRozbal(0,COC); h=c.rpDruhyPodRadkem(c._editReceipt.items[0],0);
  t('▾ rozbalí kód, gramáž, počet nákupů a „✕ Odebrat ze zkratky“',new RegExp('kód '+COC).test(h)&&/65 g/.test(h)&&/koupeno 0×/.test(h)&&/Odebrat ze zkratky/.test(h),h);
  t('počet nákupů druhu z tvých účtenek',c.eanDruhNakupu(K,CIZ)===2);
  c.rpDruhNevim(0);
  t('Nevím = položka bez kódu',!c._editReceipt.items[0].ean);

  console.log('── samostatný sken „Přiřadit k položce z účtenky“ ──');
  vm.runInContext(`window._eanKandidati=[{klic:${JSON.stringify(K)},obchod:'Billa',raw:'BL Luštěninové chipsy 65g',stav:'jiny'}]; _eanStav={vysledek:{ean:'${HRA}',produkt:${JSON.stringify(PROD[HRA])}}}`,c);
  await c.eanPriradKPolozce(0);
  t('jiný kód u zkratky = další (3.) druh, starší účtenky beze změny, komunitě nic',c.eanDruhyKody(K).length===3&&S.receipts.every(r=>r.items[0].ean===CIZ)&&dotazy.length===0);

  console.log('── omyl: ✕ Odebrat ze zkratky ──');
  c._editReceipt={store:'Billa',items:[{name:'BL Luštěninové chipsy 65g',price:35.9,ean:HRA}]};
  await c.rpDruhOdeber(0,HRA);
  t('odebraný kód pryč ze seznamu i z položky, zůstávají 2 druhy',c.eanDruhyKody(K).length===2&&!c._editReceipt.items[0].ean);
  t('odebraný kód se už nevrátí (odmítnutí)',c._eanOdmitnutoMa(S.uiCfg.eanOdmitnute,K,HRA));
  c._editReceipt={store:'Billa',items:[{name:'BL Luštěninové chipsy 65g',price:35.9}]};
  await c.rpDruhOdeber(0,COC);
  t('zbyl jeden druh → zkratka zpět k automatice (položka dostane cizrnové)',c.eanDruhyKody(K).length===1&&c._editReceipt.items[0].ean===CIZ&&!c.eanJeViceDruhu(K));
  t('…a tvé spojení + komunita se srovnají na zbylý kód',dotazy.some(d=>d.potvrdit&&d.ean===CIZ&&d.klic===K)&&vm.runInContext('_eanAliasy',c)[K].ean===CIZ,dotazy);
  t('řádek je zase obyčejný zelený (bez výběru)',/▮▮ BL Luštěninové cizrnové chipsy/.test(c.rpKodRadekHTML(c._editReceipt.items[0],0))&&c.rpDruhyPodRadkem(c._editReceipt.items[0],0)==='');

  console.log('── první kód zkratky ──');
  dotazy.length=0;
  c._editReceipt={store:'Albert',items:[{name:'MILENA COKO 32G',price:10.9}]};
  vm.runInContext(`_eanStav={cil:{i:0,obchod:'Albert',raw:'MILENA COKO 32G'},vysledek:{ean:'${CIZ}',produkt:null}}`,c);
  await c.eanPrirad();
  t('první kód: spojení se uloží komunitě jako dřív (potvrdit)',dotazy.length===1&&dotazy[0].potvrdit===true);
  t('napojení: editor kreslí výběr, automatika i Mapa ho respektují',/\$\{rpDruhyPodRadkem\(it, i\)\}/.test(rc)&&/if \(eanJeViceDruhu\(klic\)\) return null;/.test(es)&&/eanJeViceDruhu\(k\)\) return '';/.test(es));
  console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
})();
