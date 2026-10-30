// S25 (v11.48) – Milanovo hlášení z v11.43: v editoru nové účtenky naskenoval 4 čárové kódy,
// 2 se neuložily, přepsaný štítek musel přepsat znovu a fotka se i přes „uschovávat
// automaticky“ neuložila. Plus odhad položky, když má uživatel jen čárový kód.
const fs=require('fs'),path=require('path'),vm=require('vm');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
let bad=0;const t=(n,c,i)=>{console.log(c?'  ✅':'  ❌',n,c||i===undefined?'':JSON.stringify(i));if(!c)bad++;};
const rc=R('receipts.js','../js/receipts.js'),es=R('ean-sken.js','../js/ean-sken.js'),hp=R('helpers.js','../js/helpers.js');
const pick=(s,n)=>{let a=s.indexOf('function '+n+'(');if(a<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',a);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(a,k+1)}}};
console.log('── S25 · kódy a fotka u nové účtenky ──');
// 1) rozpracovaná nová účtenka se při synchronizaci nepřestaví z původního skenu
{ const form={}; const pv={style:{display:'block'},querySelector:q=>q==='#receiptEditForm'?form:null};
  const S0={}; Object.defineProperty(S0,'receipts',{get(){throw new Error('PŘESTAVĚNO')}});   // čtení účtenek = stránka se staví znovu
  const sb={window:{},S:S0,document:{getElementById:id=>id==='uctenkyContent'?{}:id==='receiptPreview'?pv:null,querySelectorAll:()=>[]}};
  vm.createContext(sb); vm.runInContext('var _lastReceiptResult={receipt:{store:"Lidl"},n:1};\n'+pick(rc,'renderUctenky'),sb);
  sb.window._editReceipt={items:[{name:'MLEKO',ean:'8590000000001'}]};
  let chyba=null; try{ sb.renderUctenky(); }catch(e){ chyba=e.message; }
  t('synchronizace během úprav editor NEPŘESTAVÍ (kódy a štítky zůstanou)',chyba===null,chyba);
  pv.style.display='none'; chyba=null; try{ sb.renderUctenky(); }catch(e){ chyba=e.message; }
  t('bez otevřeného editoru se stránka překreslí normálně',chyba==='PŘESTAVĚNO',chyba);
  pv.style.display='block'; vm.runInContext('_lastReceiptResult={receipt:{},n:1,historyIndex:3}',sb); sb.window._editReceipt={}; sb.window._receiptEditorOpen=false;
  chyba=null; try{ sb.renderUctenky(); }catch(e){ chyba=e.message; }
  t('editor z Historie má dál vlastní ochranu (tahle se ho netýká)',chyba==='PŘESTAVĚNO',chyba);
}
// 2) uschování fotky po synchronizaci, která nahradila objekty v S.receipts
(async()=>{
  const sb={window:{_rpScanFoto:{tok:'sc1',blobs:[{type:'image/jpeg'}]}},S:{uiCfg:{autoDoklad:true},receipts:[]},File:function(){},console,Math,Date,
    save:()=>{sb.ulozeno=JSON.parse(JSON.stringify(sb.S.receipts));},showToast:()=>{}};
  vm.createContext(sb);
  vm.runInContext(['rpFotky','rpAutoDoklad','_rpJakoSoubor','rpPripojFotky'].map(n=>pick(rc,n)).join('\n')+'\nasync '+pick(rc,'rpArchivAuto'),sb);
  const ul={id:'rc1',store:'Lidl'}; sb.S.receipts=[ul];
  sb.archivUlozVse=async()=>{ sb.S.receipts=JSON.parse(JSON.stringify(sb.S.receipts)); return {keys:['k1'],bajtu:1000,pocet:1,limit:300}; };   // sync během nahrávání
  await sb.rpArchivAuto(ul,'sc1');
  t('fotka se po synchronizaci zapíše do AKTUÁLNÍ účtenky a uloží se',sb.ulozeno&&sb.ulozeno[0].photoKey==='k1'&&sb.S.receipts[0].photoKeys[0]==='k1',sb.ulozeno);
  t('nová účtenka dostává stálé id',rc.includes("id: receipt.id || ('rc' + _addedAt.toString(36)"));
  // 3) odhad položky podle kódu
  const se={window:{},console};vm.createContext(se);
  vm.runInContext(hp.slice(hp.indexOf('const NORM_JEDNOTKY'),hp.indexOf('window.normName = normName'))+'\n'+pick(es,'eanShodaPolozky'),se);
  const p={stav:'nalezeno',nazev:'Lindt Excellence Milk',nazevCs:'Mléčná čokoláda',znacka:'Lindt',mnozstvi:{hodnota:100,jednotka:'g'}};
  const s1=se.eanShodaPolozky(p,'1','MLEC.COKOL.LINDT 100G',{}),s2=se.eanShodaPolozky(p,'1','COKOL.HORKA ORION 100G',{}),s3=se.eanShodaPolozky(p,'1','ROHLIK 43G',{});
  t('„MLEC.COKOL.LINDT 100G“ vyhraje (značka + název + gramáž)',s1.skore>s2.skore&&s2.skore>s3.skore&&s1.proc.includes('značka')&&s1.proc.some(x=>x.startsWith('gramáž')),{s1,s2,s3});
  t('rohlík se nenabídne (pod prahem 5)',s3.skore<5);
  t('neznámý výrobek: žádný odhad, místo toho rada vyfotit obal',se.eanShodaPolozky({stav:'nenalezeno'},'1','X',{}).skore===0&&es.includes('Výrobek databáze nezná, takže nevím, podle čeho položku hledat'));
  t('výběr položky ukazuje „🎯 Nejspíš“ nad seznamem účtenek',es.includes('🎯 Nejspíš – podle značky, druhu a gramáže')&&es.includes('${navrhyHTML}'));
  console.log(bad?`❌ ${bad} selhalo`:'✅ vše prošlo'); process.exit(bad?1:0);
})();
