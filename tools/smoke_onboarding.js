// TODO-234 – onboarding krok 1 (jazyk, měna, typ peněženky, typ platby,
// formát data, frekvence výplaty + den, dotaz na půjčku/hypotéku).
// Klíčové riziko (SKILL 31): "_settings.onboardingDone chybí" NENÍ totéž jako
// "je to nový uživatel" – existující účty založené před touto funkcí musí
// příznak dostat potichu, bez vyskočení dialogu.
const fs=require('fs');

function mkSandbox(){
  const els={};
  const doc={
    getElementById(id){
      if(!els[id]) els[id]={value:'',innerHTML:'',classList:{_c:new Set(),
        add(c){this._c.add(c)}, remove(c){this._c.delete(c)}, contains(c){return this._c.has(c)}}};
      return els[id];
    }
  };
  const sb={
    window:{}, document:doc, els,
    S:{wallets:[{id:'w1',name:'Můj účet',type:'account',currency:'CZK',balance:0}]},
    _settings:{lang:'cs',currency:'CZK',dateFmt:'cs'},
    _isLocalMode:false, viewingUid:null,
    _persisted:null, _saveCalled:false, _closedModal:null, _toast:null, _rendered:false,
    _set(ref,val){ sb._persisted=val; return Promise.resolve(); },
    _ref(db,path){ return path; },
    _db:{},
    save(){ sb._saveCalled=true; },
    closeModal(id){ sb._closedModal=id; },
    showToast(m){ sb._toast=m; },
    renderPage(){ sb._rendered=true; },
    applyLanguage(){},
    getPayTypes(){ return [{id:'cash',name:'Hotovost',icon:'💵'},{id:'card',name:'Platební karta',icon:'💳'}]; }
  };
  sb.window._currentUser={uid:'testuser'};
  const vm=require('vm'); vm.createContext(sb);
  const src=fs.readFileSync('onboarding.js','utf8');
  vm.runInContext(src, sb);
  return sb;
}

let fails=0;
const check=(n,f)=>{try{f();console.log('  ✅',n)}catch(e){fails++;console.log('  ❌',n,'→',e.message)}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert')};

console.log('── TODO-234 · onboarding krok 1 ──');

check('existující uživatel (isNewSignup=false) NEOTEVŘE modal, jen tiše doplní příznak',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(false);
  assert(sb._settings.onboardingDone===true,'onboardingDone se nenastavilo');
  assert(!sb.document.getElementById('modalOnboarding').classList.contains('open'),'modal se otevřel existujícímu uživateli');
  assert(sb._persisted && sb._persisted.onboardingDone===true,'nepersistovalo se');
});

check('nový uživatel (isNewSignup=true) modal OTEVŘE a nic zatím neuloží',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(true);
  assert(sb.document.getElementById('modalOnboarding').classList.contains('open'),'modal se neotevřel');
  assert(!sb._settings.onboardingDone,'onboardingDone se nastavilo jen otevřením – uživatel ještě nic nepotvrdil');
  assert(sb.document.getElementById('modalOnboardingBody').innerHTML.includes('onbWalletType'),'chybí pole typu peněženky ve vykreslení');
});

check('viewingUid (prohlížení dat partnera) modal NIKDY neotevře',()=>{
  const sb=mkSandbox();
  sb.viewingUid='partner-uid';
  sb.maybeShowOnboarding(true);
  assert(!sb.document.getElementById('modalOnboarding').classList.contains('open'),'modal se otevřel při prohlížení partnera');
  assert(!sb._settings.onboardingDone,'příznak se nastavil, i když se o uživatele vůbec nejednalo');
});

check('Ano/Ne/Nevím: hidden pole + obarvení jen jedné možnosti',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(true); // vyrenderuje pole
  sb.onbSetHasDebts('true');
  assert(sb.document.getElementById('onbHasDebts').value==='true');
  assert(sb.document.getElementById('onbDebtYes').classList.contains('sel-transfer'));
  assert(!sb.document.getElementById('onbDebtNo').classList.contains('sel-transfer'));
  sb.onbSetHasDebts('false');
  assert(sb.document.getElementById('onbDebtNo').classList.contains('sel-transfer'));
  assert(!sb.document.getElementById('onbDebtYes').classList.contains('sel-transfer'),'stará volba zůstala obarvená');
});

check('uložení: zapíše hasDebts, typ+název peněženky, zavolá save() a zavře modal',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(true);
  const set=(id,v)=>{ sb.document.getElementById(id).value=v; };
  set('onbHasDebts','false'); set('onbLang','cs'); set('onbCurrency','CZK');
  set('onbPayType','card'); set('onbDateFmt','cs'); set('onbPayFreq','monthly'); set('onbFirstDay','0');
  set('onbWalletType','cash'); set('onbWalletName','Peněženka');
  sb.onboardingSave();
  assert(sb._settings.hasDebts===false,'hasDebts nezapsáno');
  assert(sb._settings.onboardingDone===true,'onboardingDone nezapsáno');
  assert(sb._settings.defPayType==='card','typ platby se nezapsal');
  assert(sb.S.wallets[0].type==='cash','typ peněženky se nezměnil');
  assert(sb.S.wallets[0].name==='Peněženka','název peněženky se nezměnil');
  assert(sb._saveCalled===true,'save() se nezavolalo – peněženka by se neuložila');
  assert(sb._persisted && sb._persisted.hasDebts===false,'nastavení se nepersistovalo do Firebase/local');
  assert(sb._closedModal==='modalOnboarding','modal se nezavřel');
  assert(sb._toast,'chybí potvrzující toast');
});

check('„Zatím nevím" (prázdná volba) NEVYMÝŠLÍ odpověď – hasDebts zůstane nezapsané',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(true);
  sb.document.getElementById('onbHasDebts').value='';
  sb.onboardingSave();
  assert(!('hasDebts' in sb._settings),'appka si vymyslela odpověď, kterou uživatel nedal');
  assert(sb._settings.onboardingDone===true,'i bez odpovědi na dluh se onboarding má považovat za dokončený');
});

check('skip: nastaví JEN onboardingDone, nic jiného se nemění',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(true);
  sb.onboardingSkip();
  assert(sb._settings.onboardingDone===true);
  assert(!('hasDebts' in sb._settings),'skip nesmí vyplnit dluh');
  assert(!('defPayType' in sb._settings),'skip nesmí měnit typ platby');
  assert(sb.S.wallets[0].type==='account','skip nesmí sáhnout na peněženku');
  assert(sb._closedModal==='modalOnboarding');
});

check('opakované volání maybeShowOnboarding už modal znovu neotevře',()=>{
  const sb=mkSandbox();
  sb.maybeShowOnboarding(true);
  sb.onboardingSkip();
  sb.document.getElementById('modalOnboarding').classList.remove('open');
  sb.maybeShowOnboarding(true); // i kdyby appka omylem znovu poslala isNewSignup=true
  assert(!sb.document.getElementById('modalOnboarding').classList.contains('open'),'modal se otevřel podruhé');
});

console.log(fails?`\n❌ SELHALO ${fails}`:'\n✅ ONBOARDING KROK 1 OVĚŘEN');
process.exit(fails?1:0);
