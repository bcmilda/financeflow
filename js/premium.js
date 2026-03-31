//  PREMIUM SYSTEM
// ══════════════════════════════════════════════════════
const PREMIUM_PAGES = ['predikce','grafy','ai','narozeniny','rodina','sdileni'];
const TRIAL_DAYS = 30;

let _premiumStatus = null; // null=loading, {type:'free'|'trial'|'premium', daysLeft, until}

async function loadPremiumStatus(uid) {
  try {
    const snap = await _get(_ref(_db, `users/${uid}/premium`));
    const now = Date.now();
    if (!snap.exists()) {
      // Nový uživatel – nastav trial automaticky
      const trialUntil = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;
      await _set(_ref(_db, `users/${uid}/premium`), {
        type: 'trial',
        trialUntil,
        createdAt: now
      });
      _premiumStatus = { type: 'trial', daysLeft: TRIAL_DAYS, until: trialUntil };
    } else {
      const p = snap.val();
      if (p.type === 'premium') {
        const until = p.premiumUntil || 0;
        if (until > now) {
          _premiumStatus = { type: 'premium', daysLeft: null, until };
        } else {
          _premiumStatus = { type: 'free', daysLeft: 0, until: 0 };
        }
      } else if (p.type === 'trial') {
        const daysLeft = Math.max(0, Math.ceil((p.trialUntil - now) / (24*60*60*1000)));
        if (daysLeft > 0) {
          _premiumStatus = { type: 'trial', daysLeft, until: p.trialUntil };
        } else {
          // Trial vypršel – automaticky prodloužit o dalších 30 dní
          // (do doby než bude GoPay implementován)
          const newTrialUntil = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;
          await _set(_ref(_db, `users/${uid}/premium`), {
            type: 'trial',
            trialUntil: newTrialUntil,
            createdAt: p.createdAt || now,
            extended: true
          });
          _premiumStatus = { type: 'trial', daysLeft: TRIAL_DAYS, until: newTrialUntil };
        }
      } else {
        _premiumStatus = { type: 'free', daysLeft: 0, until: 0 };
      }
    }
  } catch(e) {
    console.error('Premium load error:', e);
    _premiumStatus = { type: 'trial', daysLeft: TRIAL_DAYS, until: Date.now() + TRIAL_DAYS*24*60*60*1000 };
  }
  updatePremiumUI();
}

function hasPremiumAccess() {
  // Dokud není GoPay – vždy povolíme přístup přihlášeným uživatelům
  if (!_premiumStatus) return true;
  return _premiumStatus.type === 'premium' || _premiumStatus.type === 'trial' || _premiumStatus.type === 'free';
}

function updatePremiumUI() {
  if (!_premiumStatus) return;
  const banner = document.getElementById('premiumBanner');
  const locks = document.querySelectorAll('[id^="navlock-"]');

  if (_premiumStatus.type === 'premium') {
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `<div style="display:flex;align-items:center;gap:7px;padding:8px 12px;background:var(--premium-bg);border:1px solid var(--premium-border);border-radius:10px;cursor:pointer" onclick="showPaywall()">
        <span style="font-size:1rem">💎</span>
        <div style="flex:1"><div style="font-size:.75rem;font-weight:700;color:var(--premium)">PREMIUM AKTIVNÍ</div>
        <div style="font-size:.65rem;color:var(--text3)">Platné do ${new Date(_premiumStatus.until).toLocaleDateString('cs-CZ')}</div></div>
      </div>`;
    }
    locks.forEach(l => l.style.display = 'none');
  } else if (_premiumStatus.type === 'trial') {
    if (banner) {
      banner.style.display = 'block';
      const urgent = _premiumStatus.daysLeft <= 7;
      banner.innerHTML = `<div class="trial-banner" onclick="showPaywall()">
        <div class="trial-banner-days">${_premiumStatus.daysLeft}</div>
        <div style="flex:1"><div style="font-size:.76rem;font-weight:700;color:${urgent?'#f87171':'#60a5fa'}">${urgent?'⚠️ Trial brzy vyprší!':'🎁 Trial zdarma'}</div>
        <div style="font-size:.67rem;color:var(--text3)">dní zbývá · klikni pro upgrade</div></div>
        <span style="font-size:.7rem;color:var(--text3)">→</span>
      </div>`;
    }
    locks.forEach(l => l.style.display = 'none');
  } else {
    // Free – zobraz zámky
    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `<div style="padding:8px 12px;background:var(--expense-bg);border:1px solid rgba(248,113,113,.3);border-radius:10px;cursor:pointer;font-size:.76rem;color:var(--text2);text-align:center" onclick="showPaywall()">
        🔒 Trial vypršel · <strong style="color:var(--premium)">Upgradovat na Premium</strong>
      </div>`;
    }
    locks.forEach(l => l.style.display = 'inline-flex');
  }
}

function showPagePremium(name, el) {
  // Block sharing features in local mode
  if(_isLocalMode && (name==='sdileni'||name==='rodina')) {
    alert('📱 Sdílení s partnerem není dostupné v režimu "Bez účtu".\n\nPro sdílení se přihlaste přes Google účet v Nastavení.');
    return;
  }
  if (hasPremiumAccess()) {
    showPage(name, el);
  } else {
    showPaywall();
  }
}

function showPaywall() {
  document.getElementById('paywallScreen').classList.add('open');
}

function closePaywall() {
  document.getElementById('paywallScreen').classList.remove('open');
}

function startTrial() {
  // Trial je nastaven automaticky při prvním přihlášení
  // Toto tlačítko jen zavře paywall a ukáže trial info
  closePaywall();
  if (_premiumStatus && _premiumStatus.type === 'trial') {
    alert(`✅ Trial je aktivní! Máte ještě ${_premiumStatus.daysLeft} dní plného přístupu zdarma.`);
  } else {
    alert('Váš trial bohužel vypršel. Pro pokračování si předplaťte Premium.');
  }
}

function goPremium() {
  // Placeholder – bude nahrazen GoPay integrací
  alert('💳 Platební brána GoPay bude brzy dostupná!\n\nZatím kontaktujte podporu pro aktivaci Premium účtu.');
}

// Pro testování – admin může ručně nastavit premium
async function activatePremiumManually(uid, months) {
  const until = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
  await _set(_ref(_db, `users/${uid}/premium`), {
    type: 'premium',
    premiumUntil: until,
    activatedAt: Date.now(),
    activatedBy: 'manual'
  });
  await loadPremiumStatus(uid);
  alert(`✅ Premium aktivováno na ${months} měsíců!`);
}

// ══════════════════════════════════════════════════════
//  PENĚŽENKY
// ══════════════════════════════════════════════════════
const WALLET_TYPES = {cash:'💵 Hotovost',account:'🏦 Běžný účet',savings:'🐷 Spořicí',investment:'📈 Investice',card:'💳 Kreditní karta',other:'📦 Jiné'};

function getWallets(D) { return (D||getData()).wallets || []; }

function renderWalletList() {
  const D = getData(); const ro = viewingUid !== null;
  const el = document.getElementById('walletList'); if(!el) return;
  const wallets = getWallets(D);
  if(!wallets.length) { el.innerHTML='<div class="empty"><div class="ei">👛</div><div class="et">Žádné peněženky. Přidej první!</div></div>'; return; }
  el.innerHTML = wallets.map(w => {
    const bal = computeWalletBalance(w.id, D);
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:12px;background:${w.color||'#4ade80'}22;border:2px solid ${w.color||'#4ade80'}44;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.9rem">${w.name}</div>
        <div style="font-size:.74rem;color:var(--text3)">${WALLET_TYPES[w.type]||'Jiné'} · ${w.currency||'CZK'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:.95rem;color:${bal>=0?'var(--income)':'var(--expense)'}">${fmt(bal)}</div>
        <div style="font-size:.7rem;color:var(--text3)">${w.currency||'CZK'}</div>
      </div>
      ${!ro?`<div style="display:flex;gap:4px"><button class="btn btn-edit btn-icon btn-sm" onclick="editWallet('${w.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deleteWallet('${w.id}')">✕</button></div>`:''}
    </div>`;
  }).join('');
  // Refresh transfer dropdowns
  renderTransferDropdowns(wallets);
}

function computeWalletBalance(walletId, D) {
  D = D || getData();
  const wallet = getWallets(D).find(w => w.id === walletId);
  const startBal = wallet?.balance || 0;
  const txs = (D.transactions||[]).filter(t => t.wallet === walletId);
  return startBal + txs.reduce((a,t) => {
    if(t.type==='income') return a + t.amount;
    if(t.type==='expense') return a - t.amount;
    return a;
  }, 0);
}

function renderTransferDropdowns(wallets) {
  ['transferFrom','transferTo'].forEach(id => {
    const sel = document.getElementById(id); if(!sel) return;
    sel.innerHTML = wallets.map(w => `<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name} (${w.currency||'CZK'})</option>`).join('');
  });
  const d = document.getElementById('transferDate');
  if(d && !d.value) d.value = new Date().toISOString().slice(0,10);
}

function openWalletModal() {
  ['editWalletId','walletName','walletBalance'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('walletType').value='account';
  document.getElementById('walletCurrency').value='CZK';
  document.getElementById('walletColor').value='#4ade80';
  document.getElementById('walletModalTitle').textContent='Přidat peněženku';
  document.getElementById('modalWallet').classList.add('open');
}
function editWallet(id) {
  const w = getWallets().find(x=>x.id===id); if(!w) return;
  document.getElementById('editWalletId').value=id;
  document.getElementById('walletName').value=w.name;
  document.getElementById('walletType').value=w.type||'account';
  document.getElementById('walletCurrency').value=w.currency||'CZK';
  document.getElementById('walletBalance').value=w.balance||0;
  document.getElementById('walletColor').value=w.color||'#4ade80';
  document.getElementById('walletModalTitle').textContent='Upravit peněženku';
  document.getElementById('modalWallet').classList.add('open');
}
function saveWallet() {
  const eid=document.getElementById('editWalletId').value;
  const name=document.getElementById('walletName').value.trim();
  if(!name){alert('Zadej název');return;}
  const w={id:eid||uid(),name,type:document.getElementById('walletType').value,currency:document.getElementById('walletCurrency').value,balance:parseFloat(document.getElementById('walletBalance').value)||0,color:document.getElementById('walletColor').value};
  if(!S.wallets) S.wallets=[];
  if(eid){const i=S.wallets.findIndex(x=>x.id===eid);if(i>=0)S.wallets[i]=w;}
  else S.wallets.push(w);
  save(); closeModal('modalWallet'); renderWalletList();
}
function deleteWallet(id) {
  if(!confirm('Smazat peněženku? Transakce zůstanou.'))return;
  S.wallets=(S.wallets||[]).filter(w=>w.id!==id);
  save(); renderWalletList();
}
function doTransfer() {
  const from=document.getElementById('transferFrom').value;
  const to=document.getElementById('transferTo').value;
  const amt=parseFloat(document.getElementById('transferAmt').value)||0;
  const date=document.getElementById('transferDate').value||new Date().toISOString().slice(0,10);
  const note=document.getElementById('transferNote').value.trim();
  if(!from||!to){alert('Vyber obě peněženky');return;}
  if(from===to){alert('Peněženky musí být různé');return;}
  if(amt<=0){alert('Zadej částku');return;}
  const wFrom=getWallets().find(w=>w.id===from);
  const wTo=getWallets().find(w=>w.id===to);
  // Create two linked transactions
  const transferId=uid();
  const txOut={id:uid(),name:`Převod → ${wTo?.name||''}`,amount:amt,type:'expense',date,wallet:from,note:note||'Převod mezi peněženkami',transferId,category:'transfer'};
  const txIn={id:uid(),name:`Převod ← ${wFrom?.name||''}`,amount:amt,type:'income',date,wallet:to,note:note||'Převod mezi peněženkami',transferId,category:'transfer'};
  if(!S.transactions)S.transactions=[];
  S.transactions.push(txOut,txIn);
  save();
  document.getElementById('transferAmt').value='';
  document.getElementById('transferNote').value='';
  document.getElementById('transferResult').innerHTML=`<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">Převod <strong>${fmt(amt)}</strong> z <strong>${wFrom?.name}</strong> do <strong>${wTo?.name}</strong> proveden!</div></div>`;
  setTimeout(()=>{const r=document.getElementById('transferResult');if(r)r.innerHTML='';},4000);
}

// ══════════════════════════════════════════════════════
//  TYPY PLATEB
// ══════════════════════════════════════════════════════
const DEFAULT_PAY_TYPES = [
  {id:'cash',name:'Hotovost',icon:'💵',color:'#4ade80',builtin:true},
  {id:'card',name:'Platební karta',icon:'💳',color:'#60a5fa',builtin:true},
  {id:'transfer',name:'Bankovní převod',icon:'🏦',color:'#a78bfa',builtin:true},
  {id:'edenred',name:'Edenred / Stravenky',icon:'🍽️',color:'#fbbf24',builtin:true},
];
function getPayTypes(D) {
  D = D || getData();
  const custom = D.payTypes || [];
  return [...DEFAULT_PAY_TYPES, ...custom];
}
function renderPayTypeList() {
  const D=getData(); const ro=viewingUid!==null;
  const el=document.getElementById('payTypeList'); if(!el) return;
  const types=getPayTypes(D);
  el.innerHTML=types.map(t=>{
    const btns = t.builtin
      ? '<span style="font-size:.7rem;color:var(--text3)">výchozí</span>'
      : (!ro ? `<div style="display:flex;gap:4px"><button class="btn btn-edit btn-icon btn-sm" onclick="editPayType('${t.id}')">✎</button><button class="btn btn-danger btn-icon btn-sm" onclick="deletePayType('${t.id}')">✕</button></div>` : '');
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:36px;height:36px;border-radius:10px;background:${t.color}22;display:flex;align-items:center;justify-content:center;font-size:1.1rem">${t.icon}</div>
      <div style="flex:1;font-weight:600;font-size:.88rem">${t.name}</div>
      ${btns}
    </div>`;
  }).join('');
}
function openPayTypeModal() {
  ['editPayTypeId','payTypeName','payTypeIcon'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('payTypeColor').value='#60a5fa';
  document.getElementById('payTypeModalTitle').textContent='Přidat typ platby';
  document.getElementById('modalPayType').classList.add('open');
}
function editPayType(id) {
  const t=(S.payTypes||[]).find(x=>x.id===id); if(!t) return;
  document.getElementById('editPayTypeId').value=id;
  document.getElementById('payTypeName').value=t.name;
  document.getElementById('payTypeIcon').value=t.icon||'💳';
  document.getElementById('payTypeColor').value=t.color||'#60a5fa';
  document.getElementById('payTypeModalTitle').textContent='Upravit typ platby';
  document.getElementById('modalPayType').classList.add('open');
}
function savePayType() {
  const eid=document.getElementById('editPayTypeId').value;
  const name=document.getElementById('payTypeName').value.trim();
  const icon=document.getElementById('payTypeIcon').value.trim()||'💳';
  const color=document.getElementById('payTypeColor').value;
  if(!name){alert('Zadej název');return;}
  if(!S.payTypes)S.payTypes=[];
  if(eid){const i=S.payTypes.findIndex(x=>x.id===eid);if(i>=0)S.payTypes[i]={...S.payTypes[i],name,icon,color};}
  else S.payTypes.push({id:uid(),name,icon,color});
  save(); closeModal('modalPayType'); renderPayTypeList();
}
function deletePayType(id) {
  if(!confirm('Smazat typ platby?'))return;
  S.payTypes=(S.payTypes||[]).filter(t=>t.id!==id);
  save(); renderPayTypeList();
}

// ══════════════════════════════════════════════════════
//  OPAKOVANÉ ŠABLONY
// ══════════════════════════════════════════════════════
const FREQ_LABELS={weekly:'Týdně',biweekly:'Každé 2 týdny',monthly:'Měsíčně',quarterly:'Čtvrtletně',yearly:'Ročně'};
let _sablonaType='expense';

function setSablonaType(t) {
  _sablonaType=t;
  document.getElementById('stt-income').className='tt'+(t==='income'?' sel-income':'');
  document.getElementById('stt-expense').className='tt'+(t==='expense'?' sel-expense':'');
}
function renderSablonaList() {
  const D=getData(); const ro=viewingUid!==null;
  const el=document.getElementById('sablonaList'); if(!el) return;
  const sablony=D.sablony||[];
  if(!sablony.length){el.innerHTML='<div class="empty"><div class="ei">🔄</div><div class="et">Žádné šablony</div></div>';return;}
  el.innerHTML=sablony.map(s=>{
    const cat=(D.categories||[]).find(c=>c.id===s.catId);
    const nextDate=getNextSablonaDate(s);
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:1.2rem">${s.type==='income'?'💰':'💸'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.88rem">${s.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
          <span style="font-size:.78rem;font-weight:700;color:${s.type==='income'?'var(--income)':'var(--expense)'}">${s.type==='income'?'+':'−'}${fmt(s.amount)}</span>
          <span style="font-size:.74rem;color:var(--text3)">${FREQ_LABELS[s.freq]||s.freq}</span>
          ${cat?`<span style="font-size:.74rem;color:var(--text3)">${cat.icon} ${cat.name}</span>`:''}
          ${s.auto?'<span style="font-size:.7rem;background:var(--income-bg);color:var(--income);padding:1px 6px;border-radius:5px">auto</span>':''}
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:3px">Příště: ${nextDate}</div>
      </div>
      ${!ro?`<div style="display:flex;flex-direction:column;gap:4px">
        <button class="btn btn-accent btn-sm" style="font-size:.7rem;padding:3px 8px" onclick="useSablonaId('${s.id}')">⚡</button>
        <button class="btn btn-edit btn-icon btn-sm" onclick="editSablona('${s.id}')">✎</button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="deleteSablona('${s.id}')">✕</button>
      </div>`:''}
    </div>`;
  }).join('');
}
function getNextSablonaDate(s) {
  const today=new Date();
  const day=s.den||1;
  let next=new Date(today.getFullYear(),today.getMonth(),day);
  if(next<=today){
    if(s.freq==='weekly')next=new Date(today.getTime()+7*86400000);
    else if(s.freq==='biweekly')next=new Date(today.getTime()+14*86400000);
    else if(s.freq==='monthly')next=new Date(today.getFullYear(),today.getMonth()+1,day);
    else if(s.freq==='quarterly')next=new Date(today.getFullYear(),today.getMonth()+3,day);
    else if(s.freq==='yearly')next=new Date(today.getFullYear()+1,today.getMonth(),day);
  }
  return next.toLocaleDateString('cs-CZ');
}
function renderSablonaCatPicker() {
  const el=document.getElementById('sablonaCatPicker'); if(!el) return;
  const cats=(S.categories||[]).filter(c=>c.type===_sablonaType||c.type==='both');
  el.innerHTML=cats.map(c=>`<div class="cat-chip ${c.id===selCatId?'selected':''}" onclick="selCatId='${c.id}';renderSablonaCatPicker()" style="background:${c.color}22;border-color:${c.id===selCatId?c.color:'transparent'}">${c.icon} ${c.name}</div>`).join('');
}
function renderSablonaWallets() {
  const sel=document.getElementById('sablonaWallet'); if(!sel) return;
  const wallets=getWallets();
  sel.innerHTML='<option value="">– bez peněženky –</option>'+wallets.map(w=>`<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name}</option>`).join('');
}
function openSablonaModal(prefill) {
  _sablonaType='expense'; setSablonaType('expense');
  ['editSablonaId','sablonaName','sablonaEnd','sablonaNote'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('sablonaAmt').value='';
  document.getElementById('sablonaFreq').value='monthly';
  document.getElementById('sablonaDen').value='1';
  document.getElementById('sablonaAuto').checked=true;
  selCatId='';
  renderSablonaCatPicker();
  renderSablonaWallets();
  if(prefill){
    document.getElementById('sablonaName').value=prefill.name||'';
    document.getElementById('sablonaAmt').value=prefill.amount||'';
    if(prefill.type)setSablonaType(prefill.type);
  }
  document.getElementById('sablonaModalTitle').textContent='Přidat šablonu';
  document.getElementById('modalSablona').classList.add('open');
}
function editSablona(id) {
  const s=(S.sablony||[]).find(x=>x.id===id); if(!s) return;
  setSablonaType(s.type||'expense');
  document.getElementById('editSablonaId').value=id;
  document.getElementById('sablonaName').value=s.name;
  document.getElementById('sablonaAmt').value=s.amount;
  document.getElementById('sablonaFreq').value=s.freq||'monthly';
  document.getElementById('sablonaDen').value=s.den||1;
  document.getElementById('sablonaAuto').checked=!!s.auto;
  document.getElementById('sablonaEnd').value=s.endDate||'';
  document.getElementById('sablonaNote').value=s.note||'';
  selCatId=s.catId||'';
  renderSablonaCatPicker();
  renderSablonaWallets();
  document.getElementById('sablonaWallet').value=s.wallet||'';
  document.getElementById('sablonaModalTitle').textContent='Upravit šablonu';
  document.getElementById('modalSablona').classList.add('open');
}
function saveSablona() {
  const eid=document.getElementById('editSablonaId').value;
  const name=document.getElementById('sablonaName').value.trim();
  const amount=parseFloat(document.getElementById('sablonaAmt').value)||0;
  if(!name){alert('Zadej název');return;}
  if(!amount){alert('Zadej částku');return;}
  const s={id:eid||uid(),name,amount,type:_sablonaType,catId:selCatId,freq:document.getElementById('sablonaFreq').value,den:parseInt(document.getElementById('sablonaDen').value)||1,auto:document.getElementById('sablonaAuto').checked,endDate:document.getElementById('sablonaEnd').value||null,wallet:document.getElementById('sablonaWallet').value||null,note:document.getElementById('sablonaNote').value.trim()};
  if(!S.sablony)S.sablony=[];
  if(eid){const i=S.sablony.findIndex(x=>x.id===eid);if(i>=0)S.sablony[i]=s;}
  else S.sablony.push(s);
  save(); closeModal('modalSablona'); renderSablonaList();
}
function deleteSablona(id) {
  if(!confirm('Smazat šablonu?'))return;
  S.sablony=(S.sablony||[]).filter(s=>s.id!==id);
  save(); renderSablonaList();
}
function useSablonaId(id) {
  const s=(S.sablony||[]).find(x=>x.id===id); if(!s) return;
  const tx={id:uid(),name:s.name,amount:s.amount,type:s.type,date:new Date().toISOString().slice(0,10),category:s.catId||'',note:s.note||'Z šablony: '+s.name,wallet:s.wallet||null};
  if(!S.transactions)S.transactions=[];
  S.transactions.push(tx);
  save();
  showPageByName('transakce');
  setTimeout(()=>renderPage(),200);
  alert(`✅ Transakce "${s.name}" přidána!`);
}
function useSablonaNow() {
  // Save first, then use
  saveSablona();
  const last=S.sablony?.[S.sablony.length-1];
  if(last)useSablonaId(last.id);
}
// Auto-process templates on login
function processAutoSablony() {
  if(!S.sablony)return;
  const today=new Date();
  const todayStr=today.toISOString().slice(0,10);
  let added=0;
  S.sablony.filter(s=>s.auto).forEach(s=>{
    if(s.endDate && s.endDate < todayStr)return;
    const den=s.den||1;
    if(today.getDate()!==den)return;
    // Check if already added today
    const alreadyToday=(S.transactions||[]).some(t=>t.date===todayStr&&t.name===s.name&&t.note&&t.note.includes('Auto-šablona'));
    if(alreadyToday)return;
    S.transactions=S.transactions||[];
    S.transactions.push({id:uid(),name:s.name,amount:s.amount,type:s.type,date:todayStr,category:s.catId||'',note:'Auto-šablona: '+s.name,wallet:s.wallet||null});
    added++;
  });
  if(added>0){save();renderPage();}
}

// ══════════════════════════════════════════════════════
//  NASTAVENÍ
// ══════════════════════════════════════════════════════
let _settings = {lang:'cs', currency:'CZK', dateFmt:'cs'};

async function loadSettings(uid) {
  try {
    const snap = await _get(_ref(_db, `users/${uid}/settings`));
    if(snap.exists()) _settings = Object.assign(_settings, snap.val());
  } catch(e) {}
  applySettings();
  applyLanguage();
}
function saveSettingsBtn() {
  _settings.lang = document.getElementById('settingLang')?.value || 'cs';
  _settings.currency = document.getElementById('settingCurrency')?.value || 'CZK';
  _settings.dateFmt = document.getElementById('settingDateFmt')?.value || 'cs';
  _settings.household_adults = parseInt(document.getElementById('settingAdults')?.value) || 2;
  _settings.household_ch013 = parseInt(document.getElementById('settingChildren013')?.value) || 0;
  _settings.household_ch14  = parseInt(document.getElementById('settingChildren14')?.value) || 0;
  _settings.household = calcOECD(_settings.household_adults, _settings.household_ch013, _settings.household_ch14);
  // Save settings separately from data
  if(window._currentUser && !_isLocalMode) {
    _set(_ref(_db, `users/${window._currentUser.uid}/settings`), _settings)
      .catch(e => console.error('Settings save error:', e));
  } else if(_isLocalMode) {
    try { localStorage.setItem('ff_v43_settings', JSON.stringify(_settings)); } catch(e) {}
  }
  // Apply language to UI
  applyLanguage();
  const badge = document.getElementById('settingsSavedBadge');
  if(badge) {
    badge.textContent = _settings.lang==='en'?'✅ Saved!':_settings.lang==='sk'?'✅ Uložené!':'✅ Uloženo!';
    badge.style.display='block';
    setTimeout(()=>badge.style.display='none', 2500);
  }
}

const TRANSLATIONS = {
  cs: {
    dashboard:'Dashboard', expenses:'Souhrn výdajů', transactions:'Transakce', bank:'Bank',
    prediction:'Predikce', loans:'Půjčky', charts:'Grafy', birthdays:'Narozeniny a přání',
    stats:'Statistiky', categories:'Kategorie', ai:'AI Rádce', family:'Rodinný souhrn',
    sharing:'Sdílení & partneři', wallets:'Peněženky', payTypes:'Typy plateb',
    templates:'Opakované šablony', settings:'Nastavení', about:'O aplikaci',
    projects:'Projekty', report:'Měsíční report',
    income:'Příjmy', outcome:'Výdaje', balance:'Saldo', savings:'Úspory',
    addTx:'Přidat transakci', save:'Uložit', cancel:'Zrušit',
    overview:'Přehled', planning:'Plánování', management:'Správa',
    noTransactions:'Žádné transakce', currency:'Kč'
  },
  en: {
    dashboard:'Dashboard', expenses:'Expense Summary', transactions:'Transactions', bank:'Bank',
    prediction:'Prediction', loans:'Loans', charts:'Charts', birthdays:'Birthdays & Wishes',
    stats:'Statistics', categories:'Categories', ai:'AI Advisor', family:'Family Summary',
    sharing:'Sharing & Partners', wallets:'Wallets', payTypes:'Payment Types',
    templates:'Recurring Templates', settings:'Settings', about:'About',
    projects:'Projects', report:'Monthly Report',
    income:'Income', outcome:'Expenses', balance:'Balance', savings:'Savings',
    addTx:'Add Transaction', save:'Save', cancel:'Cancel',
    overview:'Overview', planning:'Planning', management:'Management',
    noTransactions:'No transactions', currency:'CZK'
  },
  sk: {
    dashboard:'Dashboard', expenses:'Prehľad výdavkov', transactions:'Transakcie', bank:'Banka',
    prediction:'Predikcia', loans:'Pôžičky', charts:'Grafy', birthdays:'Narodeniny a priania',
    stats:'Štatistiky', categories:'Kategórie', ai:'AI Radca', family:'Rodinný prehľad',
    sharing:'Zdieľanie & partneri', wallets:'Peňaženky', payTypes:'Typy platieb',
    templates:'Opakované šablóny', settings:'Nastavenia', about:'O aplikácii',
    projects:'Projekty', report:'Mesačný report',
    income:'Príjmy', outcome:'Výdavky', balance:'Zostatok', savings:'Úspory',
    addTx:'Pridať transakciu', save:'Uložiť', cancel:'Zrušiť',
    overview:'Prehľad', planning:'Plánovanie', management:'Správa',
    noTransactions:'Žiadne transakcie', currency:'Kč'
  }
};

function t(key) {
  const lang = _settings.lang || 'cs';
  return (TRANSLATIONS[lang] || TRANSLATIONS.cs)[key] || key;
}

function applyLanguage() {
  const lang = _settings.lang || 'cs';
  // Update nav labels
  const navMap = {
    'prehled': t('dashboard'), 'souhrn': t('expenses'), 'transakce': t('transactions'),
    'bank': t('bank'), 'predikce': t('prediction'), 'dluhy': t('loans'),
    'grafy': t('charts'), 'narozeniny': t('birthdays'), 'statistiky': t('stats'),
    'kategorie': t('categories'), 'ai': t('ai'), 'rodina': t('family'),
    'sdileni': t('sharing'), 'penezenky': t('wallets'), 'typy': t('payTypes'),
    'sablony': t('templates'), 'nastaveni': t('settings'), 'oAplikaci': t('about'),
    'projekty': t('projects'), 'report': t('report')
  };
  // Update PAGE_TITLES
  Object.assign(PAGE_TITLES, navMap);
  // Update current page title
  const titleEl = document.getElementById('pageTitle');
  if(titleEl && PAGE_TITLES[curPage]) titleEl.textContent = PAGE_TITLES[curPage];
  // Update nav items text
  document.querySelectorAll('.nav-item[onclick*="showPage"]').forEach(el => {
    const match = el.getAttribute('onclick')?.match(/showPage[^']*'([^']+)'/);
    if(match && navMap[match[1]]) {
      const icon = el.querySelector('.nav-icon');
      if(icon) el.innerHTML = el.innerHTML.replace(/(<\/span>\s*)([^<💎]+)/, `$1 ${navMap[match[1]]} `);
    }
  });
  // Update FAB tooltip
  const fab = document.getElementById('mainFab');
  if(fab) fab.title = t('addTx');
  // Update html lang attribute
  document.documentElement.lang = lang;
}

function saveSettings() {
  const l=document.getElementById('settingLang')?.value;
  const c=document.getElementById('settingCurrency')?.value;
  const d=document.getElementById('settingDateFmt')?.value;
  if(l) _settings.lang=l;
  if(c) _settings.currency=c;
  if(d) _settings.dateFmt=d;
}

function applySettings() {
  // Only updates UI to reflect current _settings – does NOT save
  const el1=document.getElementById('settingLang'); if(el1 && el1.value !== _settings.lang) el1.value=_settings.lang;
  const el2=document.getElementById('settingCurrency'); if(el2 && el2.value !== _settings.currency) el2.value=_settings.currency;
  const el3=document.getElementById('settingDateFmt'); if(el3 && el3.value !== _settings.dateFmt) el3.value=_settings.dateFmt;
  const el4=document.getElementById('settingAdults'); if(el4) el4.value=_settings.household_adults||2;
  const el5=document.getElementById('settingChildren013'); if(el5) el5.value=_settings.household_ch013||0;
  const el6=document.getElementById('settingChildren14'); if(el6) el6.value=_settings.household_ch14||0;
  updateHouseholdEquiv();
  // Set export date defaults
  const today=new Date().toISOString().slice(0,10);
  const firstOfMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const ef=document.getElementById('exportFrom');if(ef&&!ef.value)ef.value=firstOfMonth;
  const et=document.getElementById('exportTo');if(et&&!et.value)et.value=today;
  // Show/hide local mode card
  const lc=document.getElementById('localModeCard');
  if(lc)lc.style.display=_isLocalMode?'block':'none';
}

async function migrateToGoogle() {
  if(!_isLocalMode) return;
  // Save current local data to temp
  const localData = Object.assign({}, S);
  // Sign in with Google
  if(!window._signInGoogle) { alert('Firebase se načítá...'); return; }
  // Store data for after login
  window._pendingMigration = localData;
  window._signInGoogle();
}
function importDataPrompt() {
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!confirm('Přepsat všechna stávající data importovanými daty?'))return;
        S=Object.assign({transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[],projects:[]},data);
        S.curMonth=new Date().getMonth();S.curYear=new Date().getFullYear();
        save();renderPage();alert('✅ Data úspěšně importována!');
      }catch(e){alert('Chyba: soubor není platný JSON');}
    };
    r.readAsText(f);
  };
  inp.click();
}
function confirmDeleteAllData() {
  if(!confirm('⚠️ Opravdu smazat VŠECHNA data? Tato akce je nevratná!'))return;
  if(!confirm('Jste si 100% jisti? Všechny transakce, dluhy a nastavení budou smazány.'))return;
  S={transactions:[],debts:[],categories:[],bank:{startBalance:0},birthdays:[],wishes:[],wallets:[],payTypes:[],sablony:[]};
  S.curMonth=new Date().getMonth();S.curYear=new Date().getFullYear();
  save();renderPage();alert('✅ Všechna data smazána.');
}
function exportCSV() {
  const from=document.getElementById('exportFrom')?.value;
  const to=document.getElementById('exportTo')?.value;
  const type=document.getElementById('exportType')?.value||'all';
  const D=getData();
  let txs=D.transactions||[];
  if(from)txs=txs.filter(t=>t.date>=from);
  if(to)txs=txs.filter(t=>t.date<=to);
  if(type!=='all')txs=txs.filter(t=>t.type===type);
  const header='Datum;Název;Částka;Typ;Kategorie;Poznámka\n';
  const rows=txs.map(t=>{
    const cat=(D.categories||[]).find(c=>c.id===t.category);
    return `${t.date};"${t.name}";${t.amount};"${t.type==='income'?'Příjem':'Výdaj'}";"${cat?.name||''}";"${t.note||''}"`;
  }).join('\n');
  const blob=new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='financeflow-export-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showPrivacyPolicy() { openPrivacyPolicy(); }
function showTerms() { openTerms(); }

function rateApp() {
  // Až bude na Google Play, sem přijde odkaz
  const playUrl = 'https://play.google.com/store/apps/details?id=com.financeflow.app';
  // Prozatím zobrazíme info
  alert('⭐ Děkujeme za zájem!\n\nAž bude FinanceFlow na Google Play, budete moci aplikaci ohodnotit přímo tam. Sledujte novinky v sekci O aplikaci!');
  // Až bude URL: window.open(playUrl, '_blank');
}

function openPrivacyPolicy() {
  document.getElementById('modalPrivacy').classList.add('open');
}
function openTerms() {
  document.getElementById('modalTerms').classList.add('open');
}
function openContactForm() {
  document.getElementById('modalContact').classList.add('open');
  document.getElementById('contactStatus').innerHTML = '';
  // Vyčisti formulář
  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactMessage').value = '';
}
function switchPrivacyLang(lang, btn) {
  document.getElementById('privacyCZ').style.display = lang==='cz' ? 'block' : 'none';
  document.getElementById('privacyEN').style.display = lang==='en' ? 'block' : 'none';
  document.querySelectorAll('#modalPrivacy .tx-filt-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}
function switchTermsLang(lang, btn) {
  document.getElementById('termsCZ').style.display = lang==='cz' ? 'block' : 'none';
  document.getElementById('termsEN').style.display = lang==='en' ? 'block' : 'none';
  document.querySelectorAll('#modalTerms .tx-filt-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}
async function sendContactForm() {
  const name    = (document.getElementById('contactName')?.value||'').trim();
  const email   = (document.getElementById('contactEmail')?.value||'').trim();
  const type    = document.getElementById('contactType')?.value||'other';
  const message = (document.getElementById('contactMessage')?.value||'').trim();
  const status  = document.getElementById('contactStatus');

  if(!email) {
    status.innerHTML = '<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Prosím vyplňte váš email pro odpověď.</div></div>';
    return;
  }
  if(!message) {
    status.innerHTML = '<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Prosím vyplňte zprávu.</div></div>';
    return;
  }

  status.innerHTML = '<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Odesílám...</div></div>';

  let saved = false;
  try {
    if(window._db) {
      const r = _ref(_db, 'support/' + Date.now());
      await _set(r, { name, email, type, message, date: new Date().toISOString(), version: '6.37' });
      saved = true;
    }
  } catch(e) { console.log('Support save error:', e); }

  if(saved) {
    status.innerHTML = '<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text"><strong>Děkujeme!</strong> Vaše zpráva byla odeslána. Odpovíme na <strong>' + email + '</strong>.</div></div>';
  } else {
    status.innerHTML = '<div class="insight-item warn"><div class="insight-icon">📧</div><div class="insight-text">Nepodařilo se uložit. Napište přímo na <strong>bc.milda@gmail.com</strong>.</div></div>';
  }
  document.getElementById('contactMessage').value = '';
  document.getElementById('contactName').value = '';
  document.getElementById('contactEmail').value = '';
}

function showEmailSuggest(val) {
  const el = document.getElementById('emailSuggest');
  if(!el) return;
  const atIdx = val.indexOf('@');
  if(atIdx < 0) { el.style.display='none'; return; }
  const prefix = val.slice(0, atIdx+1);
  const typed = val.slice(atIdx+1).toLowerCase();
  const domains = ['gmail.com','seznam.cz','email.cz','outlook.com','hotmail.com','icloud.com','yahoo.com','centrum.cz','volny.cz'];
  const matches = typed ? domains.filter(d => d.startsWith(typed)) : domains;
  if(!matches.length) { el.style.display='none'; return; }
  el.style.display = 'block';
  el.innerHTML = matches.map(d =>
    `<div style="padding:8px 12px;cursor:pointer;font-size:.84rem" onmouseover="this.style.background='var(--surface3)'" onmouseout="this.style.background=''" onclick="document.getElementById('contactEmail').value='${prefix}${d}';hideEmailSuggest()">${prefix}<strong>${d}</strong></div>`
  ).join('');
}
function hideEmailSuggest() {
  const el = document.getElementById('emailSuggest');
  if(el) el.style.display = 'none';
}

// ══════════════════════════════════════════════════════
//  CELKOVÝ MAJETEK (NET WORTH)
// ══════════════════════════════════════════════════════
function computeNetWorth(D) {
  D = D || getData();
  const wallets = D.wallets || [];
  let total = 0;
  const rows = wallets.map(w => {
    const bal = computeWalletBalance(w.id, D);
    total += bal;
    return { name: w.name, type: w.type, balance: bal, color: w.color || '#4ade80' };
  });
  // Add bank savings if no wallets defined
  if(!rows.length) {
    const bankBal = computeBank(D);
    total = bankBal;
    rows.push({ name: 'Úspory (Bank)', type: 'savings', balance: bankBal, color: '#60a5fa' });
  }
  // Subtract debts
  const totalDebt = (D.debts||[]).reduce((a,d) => a + d.remaining, 0);
  return { total: total - totalDebt, rows, totalDebt };
}

let _networthShowDebt = true;

function toggleNetworthDebt() {
  _networthShowDebt = !_networthShowDebt;
  renderNetWorth();
}

// ══════════════════════════════════════════════════════
//  FINANČNÍ SKÓRE – Dashboard karta
// ══════════════════════════════════════════════════════
function computeFinancialScore(D) {
  const baseIncome = computeBaseIncome(D);
  const txs = getTx(S.curMonth, S.curYear, D);
  const totalInc = incSum(txs);
  const totalExp = expSum(txs);
  const debts = D.debts || [];

  const monthlyPayments = debts.reduce((a,d) => {
    const freq = d.freq||'monthly';
    return a + (freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  }, 0);
  const totalDebt = debts.reduce((a,d)=>a+d.remaining, 0);
  const annualIncome = (baseIncome||totalInc) * 12;

  // ── Složka 1: Příjmy vs Výdaje (25 bodů) ──
  let incExpScore = 25;
  if(totalInc > 0) {
    const expRatio = totalExp / totalInc;
    if(expRatio <= 0.5) incExpScore = 25;
    else if(expRatio <= 0.7) incExpScore = 20;
    else if(expRatio <= 0.85) incExpScore = 14;
    else if(expRatio <= 1.0) incExpScore = 7;
    else incExpScore = 0;
  } else { incExpScore = 12; } // no data
  const incExpRatio = totalInc>0 ? Math.round(totalExp/totalInc*100) : null;
  const incExpLabel = incExpScore>=20?'🟢 Výdaje pod kontrolou':incExpScore>=12?'🟡 Výdaje '+incExpRatio+'% příjmu':'🔴 Výdaje překračují příjmy';

  // ── Složka 2: Zadluženost (25 bodů) ──
  let debtScore = 25;
  const dsti = baseIncome>0 ? monthlyPayments/baseIncome*100 : 0;
  const dti = annualIncome>0 ? totalDebt/annualIncome*100 : 0;
  if(!debts.length) { debtScore = 25; }
  else if(dsti <= 20 && dti <= 300) debtScore = 25;
  else if(dsti <= 35 && dti <= 600) debtScore = 18;
  else if(dsti <= 50 && dti <= 900) debtScore = 10;
  else debtScore = 3;
  const debtLabel = debtScore>=20?'🟢 Nízké zadlužení':debtScore>=12?'🟡 DSTI '+Math.round(dsti)+'% – střední':'🔴 Vysoké zadlužení – DSTI '+Math.round(dsti)+'%';

  // ── Složka 3: Úspory & rezerva (25 bodů) ──
  let savScore = 25;
  const savingRate = totalInc>0 ? (totalInc-totalExp)/totalInc*100 : 0;
  // Check savings wallets
  const savWallets = (D.wallets||[]).filter(w=>w.type==='savings'||w.type==='investment');
  const savBalance = savWallets.reduce((a,w)=>a+(w.balance||0),0);
  const monthsReserve = baseIncome>0 ? savBalance/baseIncome : 0;
  if(savingRate >= 20 && monthsReserve >= 3) savScore = 25;
  else if(savingRate >= 10 && monthsReserve >= 1) savScore = 18;
  else if(savingRate >= 5 || monthsReserve >= 0.5) savScore = 10;
  else if(totalInc === 0) savScore = 12;
  else savScore = 3;
  const savLabel = savScore>=20?'🟢 Výborné úspory ('+Math.round(savingRate)+'%)':savScore>=12?'🟡 Úspory '+Math.round(savingRate)+'% – lze zlepšit':'🔴 Nízké nebo žádné úspory';

  // ── Složka 4: Trend (25 bodů) ──
  let trendScore = 17; // default střed
  let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
  let pm2=S.curMonth-2, py2=S.curYear; if(pm2<0){pm2+=12;py2--;}
  const prevTxs = getTx(pm, py, D);
  const prev2Txs = getTx(pm2, py2, D);
  const prevInc = incSum(prevTxs), prevExp = expSum(prevTxs);
  const prev2Inc = incSum(prev2Txs), prev2Exp = expSum(prev2Txs);
  if(prevInc > 0 && prev2Inc > 0 && totalInc > 0) {
    const incImprove = totalInc >= prevInc;
    const expImprove = totalExp <= prevExp;
    const salImprove = (totalInc-totalExp) >= (prevInc-prevExp);
    const pos = [incImprove, expImprove, salImprove].filter(Boolean).length;
    trendScore = pos === 3 ? 25 : pos === 2 ? 20 : pos === 1 ? 12 : 5;
  }
  const trendLabel = trendScore>=20?'🟢 Pozitivní trend':trendScore>=12?'🟡 Stabilní trend':'🔴 Zhoršující se trend';

  const total = incExpScore + debtScore + savScore + trendScore;
  const grade = total>=90?{label:'Výborné',emoji:'🏆',color:'#4ade80'}:
                total>=75?{label:'Velmi dobré',emoji:'⭐',color:'#60a5fa'}:
                total>=60?{label:'Dobré',emoji:'👍',color:'#a78bfa'}:
                total>=45?{label:'Průměrné',emoji:'📊',color:'#fbbf24'}:
                total>=30?{label:'Rizikové',emoji:'⚠️',color:'#fb923c'}:
                           {label:'Kritické',emoji:'🚨',color:'#f87171'};

  return {
    total, grade,
    components: [
      {label:'💰 Příjmy vs výdaje', score:incExpScore, max:25, detail:incExpLabel},
      {label:'🏦 Zadluženost', score:debtScore, max:25, detail:debtLabel},
      {label:'🐷 Úspory & rezerva', score:savScore, max:25, detail:savLabel},
      {label:'📈 Trend', score:trendScore, max:25, detail:trendLabel},
    ]
  };
}

function renderFinancialScore(D) {
  const el = document.getElementById('financialScoreCard'); if(!el) return;
  const sc = computeFinancialScore(D);
  const {total, grade, components} = sc;
  const borderColor = grade.color + '44';
  const bgColor = grade.color + '0d';

  el.innerHTML = `<div class="fscore-card" style="background:linear-gradient(135deg,${bgColor},var(--surface));border-color:${borderColor}">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <!-- Ring -->
      <div class="fscore-ring" style="flex-shrink:0">
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r="36" fill="none" stroke="var(--surface3)" stroke-width="8"/>
          <circle cx="45" cy="45" r="36" fill="none" stroke="${grade.color}" stroke-width="8"
            stroke-dasharray="${2*Math.PI*36}" stroke-dashoffset="${2*Math.PI*36*(1-total/100)}"
            stroke-linecap="round" transform="rotate(-90 45 45)"
            style="transition:stroke-dashoffset .8s ease"/>
        </svg>
        <div class="fscore-number">
          <div style="font-size:1.4rem;color:${grade.color}">${total}</div>
          <div style="font-size:.55rem;color:var(--text3)">/ 100</div>
        </div>
      </div>
      <!-- Info -->
      <div style="flex:1;min-width:140px">
        <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Finanční skóre</div>
        <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:${grade.color}">${grade.emoji} ${grade.label}</div>
        <div style="font-size:.74rem;color:var(--text3);margin-top:4px">Celkové hodnocení vaší finanční situace</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:.72rem" onclick="showPage('obraz',null)">📈 Podrobná analýza →</button>
      </div>
      <!-- 4 složky -->
      <div style="flex:2;min-width:200px">
        ${components.map(c => `
          <div class="fscore-row">
            <div style="font-size:.74rem;color:var(--text2);min-width:130px">${c.label}</div>
            <div class="fscore-bar">
              <div class="fscore-bar-fill" style="width:${Math.round(c.score/c.max*100)}%;background:${c.score/c.max>=0.8?'var(--income)':c.score/c.max>=0.5?'var(--debt)':'var(--expense)'}"></div>
            </div>
            <div style="font-size:.74rem;font-weight:700;min-width:36px;text-align:right;color:${c.score/c.max>=0.8?'var(--income)':c.score/c.max>=0.5?'var(--debt)':'var(--expense)'}">${c.score}/${c.max}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <!-- Detail -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:12px">
      ${components.map(c=>`<div style="font-size:.72rem;color:var(--text3);padding:5px 8px;background:var(--surface2);border-radius:7px">${c.detail}</div>`).join('')}
    </div>
  </div>`;
}

function renderNetWorth() {
  const el = document.getElementById('networthCard'); if(!el) return;
  const D = getData();
  const nw = computeNetWorth(D);
  if(!nw.rows.length) { el.innerHTML = ''; return; }
  const typeIcons = {cash:'💵',account:'🏦',savings:'🐷',investment:'📈',card:'💳',other:'📦'};
  const displayTotal = _networthShowDebt ? nw.total : nw.total + nw.totalDebt;
  const totalColor = displayTotal >= 0 ? 'var(--income)' : 'var(--expense)';
  const label = _networthShowDebt ? '💰 Čistý majetek (vč. dluhů)' : '💰 Hrubý majetek (bez dluhů)';
  el.innerHTML = `<div class="networth-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="font-size:.75rem;color:var(--text3);font-weight:600;letter-spacing:.06em;text-transform:uppercase">${label}</div>
      ${nw.totalDebt>0?`<button onclick="toggleNetworthDebt()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:.7rem;color:var(--text3);cursor:pointer">${_networthShowDebt?'👁 Skrýt dluhy':'👁 Zobrazit dluhy'}</button>`:''}
    </div>
    <div class="networth-total" style="color:${totalColor}">${fmt(displayTotal)}</div>
    <div style="display:flex;flex-direction:column;gap:0">
      ${nw.rows.map(r=>`<div class="networth-row">
        <div class="networth-dot" style="background:${r.color}"></div>
        <span style="flex:1;color:var(--text2)">${typeIcons[r.type]||'👛'} ${r.name}</span>
        <span style="font-weight:600;color:${r.balance>=0?'var(--text)':'var(--expense)'}">${fmt(r.balance)}</span>
      </div>`).join('')}
      ${nw.totalDebt>0&&_networthShowDebt?`<div class="networth-row">
        <div class="networth-dot" style="background:var(--expense)"></div>
        <span style="flex:1;color:var(--text3)">💸 Celkový dluh</span>
        <span style="font-weight:600;color:var(--expense)">−${fmt(nw.totalDebt)}</span>
      </div>`:''}
    </div>
    ${nw.totalDebt>0&&!_networthShowDebt?`<div style="font-size:.7rem;color:var(--text3);margin-top:6px;text-align:center">Dluhy skryty · celkový dluh: <span style="color:var(--expense)">${fmt(nw.totalDebt)}</span></div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════════════
