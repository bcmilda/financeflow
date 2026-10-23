// FinanceFlow · smoke test · Session 27 (v12.09) · PASTI V ZAŘAZENÍ
//  Milan: „bude lepší použít i dvouslovný název, ne jedno známé slovo. Nepřidávej podmínku. Zkusíme ty
//  pasti zapsat a podchytit.“ · „drůbeží hamburger byl jen flák masa bez housky → maso“
//  NOVÁ PAST = jeden řádek v PASTI níž (+ název nebo past v data/taxonomie.json, klíčové slovo v product-groups.json).
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};
const c={console,Math,JSON,String,Object,Set,Array,Promise,fetch:()=>Promise.resolve({ok:false})}; c.window=c; vm.createContext(c);
vm.runInContext(R('helpers.js','../js/helpers.js'),c);
vm.runInContext(R('taxonomie.js','../js/taxonomie.js'),c);
vm.runInContext(R('product-db.js','../js/product-db.js')+'\n;this._pgNastav=j=>{_productDB=j;_pgKeysSorted=Object.keys(j.keywords).sort((a,b)=>b.length-a.length)};',c);
const T=JSON.parse(R('taxonomie.json','../data/taxonomie.json'));
c.taxNastav(T); c._pgNastav(JSON.parse(R('product-groups.json','../data/product-groups.json')));
const kos=k=>{const g=c.productGroupLookup(k);return g?g.code:'';};

//  [text z účtenky, obecný název, podkategorie, kód koše ČSÚ (když položka mimo taxonomii) | '' = nekontroluje se]
const PASTI=[
  ['Makový HREBEN BOCE 30G','makový hřeben','pecivo','01.113'],        // ne hřeben → Osobní péče
  ['Makový hřeben boček 80g','makový hřeben','pecivo','01.113'],
  ['Smet.krem Vilik 80g mix','smetanový krém','mlecne-dezerty','01.147'],  // ne krém → 13.1.2 Osobní péče
  ['Drůbeží hamburger 250g','drůbeží hamburger','drubez','01.122.4'],     // ne hamburger → 11.1.1 Restaurace
  ['Nektarinky koš(ks)','nektarinka','ovoce',''],                       // ne koš → Domácí potřeby
];
console.log('── pasti ──');
PASTI.forEach(([txt,obec,pod,kod])=>{
  const n=c.taxNavrh(txt), z=n&&n.info;
  t(`„${txt}“ → ${obec} (${pod})`+(kod?` · koš ČSÚ ${kod}`:''),z&&z.nazev===obec&&z.podId===pod&&(!kod||kos(txt)===kod),[z&&z.nazev,z&&z.podId,n&&n.jistota,kos(txt)]);
});
console.log('── co má zůstat ──');
t('„Hřeben na vlasy“ dál hřeben (Osobní péče)',(c.taxNavrh('Hřeben na vlasy')||{}).info?.podId===c.taxInfo('hřeben').podId&&c.taxInfo('hřeben').oblastNazev.startsWith('Osobní'));
t('„Krém na ruce 100ml“ dál kosmetika v koši ČSÚ (13.120)',kos('Krém na ruce 100ml')==='13.120');
t('„Nektarinky“ samotné → nektarinka',(c.taxNavrh('Nektarinky')||{}).info?.nazev==='nektarinka');
console.log('── rozpočet ──');
const ta=c.taxInfo('taška');
t('„Papírová taška velká“ → taška bez výchozí kategorie (dřív Zábava)',(c.taxNavrh('Papírová taška velká')||{}).info?.nazev==='taška'&&ta.rozpocet==='',ta);
t('drůbeží hamburger → rozpočet potravin (cat1), COICOP drůbeží maso',c.taxInfo('drůbeží hamburger').rozpocet==='cat1'&&c.taxInfo('drůbeží hamburger').coicop5==='01.1.2.2.4');
console.log('── napojení ──');
const rc=R('receipts.js','../js/receipts.js');
t('odhad podle názvu bere i past (rpMapaNavrh)',/n\.jistota === 'tvar' \|\| n\.jistota === 'past'/.test(rc));
t('nové verze dat se stáhnou (cache)',/taxonomie\.json\?v=1\.3-/.test(R('taxonomie.js','../js/taxonomie.js'))&&/product-groups\.json\?v=20261023/.test(R('product-db.js','../js/product-db.js')));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
