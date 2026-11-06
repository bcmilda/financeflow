// FinanceFlow · smoke test · Session 27 (v11.95) · rozpracovaná účtenka se nesmí ztratit (FIX-486)
//  Milan (OBI): „Použít na všechny položky – nic se nestalo; přepsal jsem název, položka zmizela
//  a objevil se error … reading 'items'“. Ověřeno v Chromiu na v11.94: klepnutí na záložku Skenovat
//  vynulovalo window._editReceipt, editor zůstal na obrazovce → tlačítka nic, ➕ Přidat spadlo.
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const rc=R('receipts.js','../js/receipts.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

//  DOM: #receiptPreview s editorem nové účtenky + záložky
let editorVDom=true; const el=()=>({style:{},classList:{add(){},remove(){}}});
const c={console,window:{},toasty:[],
  document:{getElementById:id=>id==='receiptPreview'?{querySelector:q=>q==='#receiptEditForm'&&editorVDom?{}:null}:el()},
  showToast(m){c.toasty.push(m)},UCTENKY_PREMIUM_TABS:[],uctenkyMaPremium:()=>true,rpUpdateTotal(){c.soucet=(c.soucet||0)+1},rpCheckFutureDate(){}};
c.window=c; vm.createContext(c);
//  přepínač záložek bez dalších větví (jen začátek – nulování stavu)
const sw=pick(rc,'switchUctenkyTab'); const swHlava=sw.slice(0,sw.indexOf("['scan','learn'"))+'}';
vm.runInContext('let _lastReceiptResult=null, _activeUctenkyTab="scan";\n'+['_rpNovaUctenkaOtevrena','_rpNovyEditorVDom','rpEditor','rpHlavicka'].map(n=>pick(rc,n)).join('\n')+'\n'+swHlava,c);

const sken={store:'OBI',items:[{name:'Mramor drcený',price:219,qty:2}]};
console.log('── přepínač záložek nemaže rozpracovanou novou účtenku ──');
vm.runInContext('_lastReceiptResult={receipt:null,n:1}',c);
c._editReceipt=JSON.parse(JSON.stringify(sken)); vm.runInContext('_lastReceiptResult.receipt=window._editReceipt',c);
c._editReceipt.items[0].itemCatId='cat23';
c.switchUctenkyTab('scan');
t('klepnutí na 📸 Skenovat: účtenka zůstane (dřív null)',c._editReceipt&&c._editReceipt.items[0].itemCatId==='cat23');
c.switchUctenkyTab('history');
t('odchod na Historii: nová účtenka v záložce Skenovat zůstane',!!c._editReceipt);
vm.runInContext('_lastReceiptResult={receipt:{store:"Penny",items:[]},n:1,historyIndex:3}',c); c._editReceipt={store:'Penny',items:[]};
c.switchUctenkyTab('scan');
t('editor z Historie se při odchodu zavírá jako dřív',c._editReceipt===null);

console.log('── samooprava ──');
vm.runInContext('_lastReceiptResult={receipt:null,n:1}',c);
const zive=JSON.parse(JSON.stringify(sken)); zive.items[0].name='Mramor bílý';
vm.runInContext('_lastReceiptResult.receipt='+JSON.stringify(zive),c); c._editReceipt=null;
const r=c.rpEditor();
t('chybí-li účtenka a editor ze skenu je na obrazovce, vezme se z výsledku skenu (s úpravami)',r&&r.items[0].name==='Mramor bílý'&&c._editReceipt===r);
c._editReceipt=null; editorVDom=false;
t('bez editoru na obrazovce nic nevzniká',c.rpEditor()===null);
editorVDom=true;
c.rpHlavicka('store','OBI Frýdek');
t('obchod v hlavičce se zapíše i po ztrátě stavu (dřív window._editReceipt.store = … spadlo)',c._editReceipt&&c._editReceipt.store==='OBI Frýdek'&&c.soucet===1);

console.log('── napojení ──');
t('výsledek nového skenu ukazuje na živou kopii (obnovení editoru s úpravami)',/_lastReceiptResult\.historyIndex === undefined && _lastReceiptResult\.receipt === receipt\)\s*_lastReceiptResult\.receipt = window\._editReceipt;/.test(rc));
t('ochrana editoru z Historie s visícím příznakem nemaže novou účtenku',/if \(!_rpNovaUctenkaOtevrena\(\)\) window\._editReceipt = null;\n    \/\/  S26 \(v11\.65, FIX-451/.test(rc));
t('rpRender, ➕ Přidat, ✕, Použít na všechny a Uložit čtou přes rpEditor()',/const r = rpEditor\(\);   \/\/ v11\.95 \(FIX-486\): rozpracovaná/.test(rc)&&/function rpAddItem\(\) \{\n  if\(!rpEditor\(\)\)/.test(rc)&&/if\(!rpEditor\(\)\) return;   \/\/ v11\.95\n  window\._editReceipt\.items\.splice/.test(rc)&&/function rpHromadnePouzij\(\) \{\n  const r = rpEditor\(\);/.test(rc)&&/function rpSave\(\) \{\n  const r = rpEditor\(\);/.test(rc));
t('hlavička bez window._editReceipt.store/date v oninput',!/oninput="window\._editReceipt\.(store|date)=/.test(rc)&&/oninput="rpHlavicka\('store',this\.value\)"/.test(rc));
console.log(`\n${ok} ✅  ${bad} ❌`); process.exit(bad?1:0);
