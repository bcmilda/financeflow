// FinanceFlow · v10.79 · tools/smoke_smazani.js · 2026-09-16
// S22 · Průvodce mazáním dat (nahlásil Milan na živé appce).
// Symptom: napoprvé nabídl export bez možnosti odmítnout; napodruhé nabídku
// přeskočil a chtěl rovnou slovo SMAZAT; napotřetí se políčko vůbec neukázalo,
// vypsalo „zadej SMAZAT" a vrátilo uživatele na úvodní obrazovku.
const fs=require('fs'), vm=require('vm');
let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n);}catch(e){fails++;console.log('  ❌',n,'→',e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m);};
const set=fs.readFileSync('settings.js','utf8');
const html=fs.readFileSync('app.html','utf8');

//  Fiktivní DOM se třemi kroky a tlačítkem
function domFactory(){
  const prvky={
    deleteStep1:{style:{display:'block'}}, deleteStep2:{style:{display:'none'}},
    deleteStep3:{style:{display:'none'}},
    deleteConfirmInput:{value:'',focus(){}},
    deleteNextBtn:{textContent:'Pokračovat',onclick:null},
    modalDeleteData:{classList:{add(){},remove(){}}},
  };
  return { getElementById:id=>prvky[id]||null, _p:prvky };
}
function sandbox(){
  const dom=domFactory();
  const sb={console,Math,Object,Array,String,document:dom,alert:()=>{sb.__alert=(sb.__alert||0)+1;},
    exportUserData:()=>{}, closeModal:()=>{},
    //  Atrapa – krok 3 na ni přepíná onclick tlačítka. Skutečné mazání se
    //  v testu spouštět nesmí.
    confirmDeleteAllData:()=>{ sb.__smazano=true; },
    window:{}};
  sb.window=sb; sb.globalThis=sb;
  vm.createContext(sb);
  //  vytáhnout funkce z app.html (inline blok) a settings.js
  const inline=/let _deleteCurrentStep=1;[\s\S]*?window\.resetDeleteWizard = resetDeleteWizard;/.exec(html);
  assert(inline,'inline blok průvodce nenalezen');
  vm.runInContext(inline[0],sb);
  const hds=/function handleDeleteStep\(\)\{[\s\S]*?\n/.exec(html);
  assert(hds,'handleDeleteStep nenalezen');
  vm.runInContext(hds[0],sb);
  ['openDeleteDataModal','deleteDataStep2','deleteDataStep3'].forEach(n=>{
    const i=set.indexOf('function '+n); assert(i>=0,'chybí '+n);
    let d=0; for(let k=set.indexOf('{',i);k<set.length;k++){
      if(set[k]==='{')d++; else if(set[k]==='}'){d--; if(!d){ vm.runInContext(set.slice(i,k+1),sb); break; }}}
  });
  return {sb,dom};
}

console.log('── Průvodce se vždy vrátí na začátek ──');
check('otevření nastaví krok 1 i tlačítko',()=>{
  const {sb,dom}=sandbox();
  vm.runInContext('openDeleteDataModal()',sb);
  assert(dom._p.deleteStep1.style.display==='block','krok 1 není vidět');
  assert(dom._p.deleteNextBtn.textContent==='Pokračovat','tlačítko: '+dom._p.deleteNextBtn.textContent);
  assert(vm.runInContext('_deleteCurrentStep',sb)===1,'počítadlo není 1');
});
check('KLÍČOVÉ · po zavření uprostřed začne druhý pokus zase od kroku 1',()=>{
  const {sb,dom}=sandbox();
  vm.runInContext('openDeleteDataModal()',sb);
  vm.runInContext('handleDeleteStep()',sb);          // → krok 2 (nabídka zálohy)
  assert(vm.runInContext('_deleteCurrentStep',sb)===2,'nepřešlo na krok 2');
  vm.runInContext('resetDeleteWizard()',sb);          // uživatel zavřel křížkem
  vm.runInContext('openDeleteDataModal()',sb);
  assert(vm.runInContext('_deleteCurrentStep',sb)===1,'druhý pokus začal na kroku '+vm.runInContext('_deleteCurrentStep',sb));
  assert(dom._p.deleteStep2.style.display==='none','přeskočilo rovnou na zálohu');
});
check('KLÍČOVÉ · po zavření na kroku 3 nezůstane tlačítko na „Smazat vše"',()=>{
  const {sb,dom}=sandbox();
  vm.runInContext('openDeleteDataModal()',sb);
  vm.runInContext('handleDeleteStep();handleDeleteStep()',sb);   // → krok 3
  assert(dom._p.deleteNextBtn.textContent==='Smazat vše','krok 3 nepřepsal tlačítko');
  vm.runInContext('resetDeleteWizard();openDeleteDataModal()',sb);
  assert(dom._p.deleteNextBtn.textContent==='Pokračovat','tlačítko zůstalo: '+dom._p.deleteNextBtn.textContent);
  assert(dom._p.deleteNextBtn.onclick===sb.handleDeleteStep,'onclick zůstal na potvrzení mazání');
});
check('celý průběh 1→2→3 funguje',()=>{
  const {sb,dom}=sandbox();
  vm.runInContext('openDeleteDataModal()',sb);
  vm.runInContext('handleDeleteStep()',sb);
  assert(dom._p.deleteStep2.style.display==='block','krok 2 se neukázal');
  vm.runInContext('handleDeleteStep()',sb);
  assert(dom._p.deleteStep3.style.display==='block','krok 3 se neukázal');
  assert(dom._p.deleteConfirmInput.value==='','políčko není prázdné');
});
check('vstupní pole se při otevření vyprázdní',()=>{
  const {sb,dom}=sandbox();
  dom._p.deleteConfirmInput.value='SMAZAT';
  vm.runInContext('openDeleteDataModal()',sb);
  assert(dom._p.deleteConfirmInput.value==='','zůstalo předvyplněné SMAZAT – jeden klik od smazání');
});

console.log('\n── Drobnosti z hlášení ──');
check('nabídka zálohy jde odmítnout',()=>{
  assert(/Záloha je nepovinná/.test(html),'uživatel neví, že může pokračovat bez zálohy');
});
check('zavření křížkem i Zrušit vrací stav',()=>{
  assert((html.match(/resetDeleteWizard\(\);closeModal\('modalDeleteData'\)/g)||[]).length===2,
    'reset není na obou cestách ven');
});
check('prázdné pole nevyhodí uživatele z průvodce',()=>{
  assert(/s3\.style\.display === 'none'/.test(set),'krok 3 se při výtce nezobrazí');
  assert(/pole\.focus\(\)/.test(set),'kurzor neskočí do pole');
});
console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ MAZÁNÍ OVĚŘENO');
process.exit(fails?1:0);
