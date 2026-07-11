// FinanceFlow · v8.81 · premium.js · 2026-07-08
//  PREMIUM SYSTEM
// ══════════════════════════════════════════════════════
const PREMIUM_PAGES = ['predikce','grafy','ai','narozeniny','rodina','sdileni','uctenky','nakup'];
const TRIAL_DAYS = 30;

// ══════════════════════════════════════════════════════
//  S12.1p: TIER SYSTÉM free / premium / pro (trial = premium)
//  ADMIN_UID má vždy plný přístup (pro).
// ══════════════════════════════════════════════════════
const TIER_PRICES = { premium: 149, pro: 299 }; // Kč/měsíc

// Funkce vyžadující AI volání – Free je NEMÁ (kromě 1× CSV import řešeného bez AI).
// Hodnota = minimální tier. 'admin' = jen administrátor (skrýt ostatním).
const FEATURE_TIERS = {
  aiRadce:        'premium',  // AI Rádce (advisor + měsíční report poradce)
  bankImport:     'premium',  // Import z PDF výpisu – Premium (CSV/Excel zdarma)
  receiptAnalyze: 'premium',  // Analýza účtenek (foto → AI)
  shoppingList:   'premium',  // Nákupní seznam
  sharing:        'premium',  // Sdílení s partnerem / rodinný souhrn
  reportAdvisor:  'premium',  // Poradce v měsíčním reportu
};

// Vrátí efektivní tier uživatele: 'free' | 'premium' | 'pro'
function getUserTier() {
  if (typeof isAdmin === 'function' && isAdmin()) return 'pro';
  if (!_premiumStatus) return 'premium'; // během načítání nezamykej (UX)
  const t = _premiumStatus.type;
  if (t === 'pro') return 'pro';
  if (t === 'premium' || t === 'trial') return 'premium'; // trial = premium
  return 'free';
}

// Má uživatel aspoň daný tier? (pořadí free < premium < pro)
function hasTier(min) {
  const order = { free: 0, premium: 1, pro: 2 };
  return (order[getUserTier()] || 0) >= (order[min] || 0);
}

// Centrální brána funkce: smí uživatel použít danou funkci?
function canUseFeature(key) {
  const need = FEATURE_TIERS[key];
  if (!need) return true;
  if (need === 'admin') return (typeof isAdmin === 'function' && isAdmin());
  return hasTier(need);
}

// Zamítnutí + výzva k upgradu (zobrazí paywall / hlášku)
function gateFeature(key, label) {
  if (canUseFeature(key)) return true;
  const need = FEATURE_TIERS[key];
  if (need === 'admin') {
    alert('🔒 Tato funkce je zatím dostupná jen pro administrátora.');
  } else {
    if (typeof showPaywall === 'function') showPaywall();
    else alert(`🔒 ${label||'Tato funkce'} je součástí Premium.\n\nPremium ${TIER_PRICES.premium} Kč/měsíc · Pro ${TIER_PRICES.pro} Kč/měsíc.`);
  }
  return false;
}

let _premiumStatus = null; // null=loading, {type:'free'|'trial'|'premium', daysLeft, until}

async function loadPremiumStatus(uid) {
  try {
    const snap = await _get(_ref(_db, `users/${uid}/premium`));
    const now = Date.now();
    if (!snap.exists()) {
      // Nový uživatel = FREE (trial je opt-in přes tlačítko, ne automaticky)
      await _set(_ref(_db, `users/${uid}/premium`), {
        type: 'free',
        createdAt: now
      });
      _premiumStatus = { type: 'free', daysLeft: 0, until: 0 };
    } else {
      const p = snap.val();
      if (p.type === 'premium' || p.type === 'pro') {
        const until = p.premiumUntil || 0;
        if (until > now) {
          _premiumStatus = { type: p.type, daysLeft: null, until };
        } else {
          _premiumStatus = { type: 'free', daysLeft: 0, until: 0 };
        }
      } else if (p.type === 'trial') {
        const daysLeft = Math.max(0, Math.ceil((p.trialUntil - now) / (24*60*60*1000)));
        if (daysLeft > 0) {
          _premiumStatus = { type: 'trial', daysLeft, until: p.trialUntil };
        } else {
          // Trial vypršel – přechod na FREE (žádné automatické prodlužování)
          await _update(_ref(_db, `users/${uid}/premium`), { type: 'free' });
          _premiumStatus = { type: 'free', daysLeft: 0, until: 0 };
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
  // Premium přístup = trial nebo zaplacený premium/pro (NE free)
  if (!_premiumStatus) return true; // během načítání nezamykej (UX)
  const t = _premiumStatus.type;
  return t === 'premium' || t === 'pro' || t === 'trial';
}

function updatePremiumUI() {
  if (!_premiumStatus) return;
  // Dynamický tier label v sidebaru
  const tierEl = document.getElementById('sidebarTierLabel');
  if (tierEl) {
    const t = _premiumStatus.type;
    if (t === 'premium') tierEl.textContent = 'Premium';
    else if (t === 'pro') tierEl.textContent = 'Pro';
    else if (t === 'trial') tierEl.textContent = 'Trial';
    else tierEl.textContent = 'Free';
  }
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
  // S12.1p: sdílení/rodina jako Premium funkce
  if ((name==='sdileni'||name==='rodina') && !canUseFeature('sharing')) {
    if(typeof showPaywall==='function') showPaywall();
    return;
  }
  if (hasPremiumAccess()) {
    showPage(name, el);
  } else {
    showPaywall();
  }
}

function showPaywall() {
  // Ulož aktuální sekci aby closePaywall věděl kam se vrátit
  window._paywallReturnPage = (typeof S !== 'undefined' && S.page) ? S.page : null;
  document.getElementById('paywallScreen').classList.add('open');
  // Zastav scroll pod paywallem
  document.body.style.overflow = 'hidden';
}

function closePaywall() {
  document.getElementById('paywallScreen').classList.remove('open');
  document.body.style.overflow = '';
  // Nenaviguj nikam – zůstaň na stránce kde byl uživatel před otevřením paywallu
  // (žádný renderPage() call zde – to způsobovalo "pád" na dashboard)
}

// Normalizace e-mailu na Firebase klíč (tečka/$/#/[/]/ jsou zakázané v RTDB klíčích)
function _emailKey(email) {
  return (email||'').toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
}

async function startTrial() {
  const user = window._currentUser;
  if (!user) { alert('Nejprve se přihlas.'); return; }

  if (_premiumStatus && (_premiumStatus.type === 'trial' || _premiumStatus.type === 'premium' || _premiumStatus.type === 'pro')) {
    closePaywall();
    alert('✅ Už máš aktivní přístup.');
    return;
  }

  const uid = user.uid;
  const eKey = _emailKey(user.email);
  try {
    const psnap = await _get(_ref(_db, `users/${uid}/premium`));
    if (psnap.exists() && psnap.val().trialUsed) {
      alert('⚠️ Trial už byl na tomto účtu využit. Pro další přístup si předplať Premium.');
      return;
    }
    if (eKey) {
      const esnap = await _get(_ref(_db, `trialsUsed/${eKey}`));
      if (esnap.exists()) {
        alert('⚠️ Trial už byl využit pro tento e-mail. Pro další přístup si předplať Premium.');
        return;
      }
    }
    const now = Date.now();
    const trialUntil = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    await _set(_ref(_db, `users/${uid}/premium`), {
      type: 'trial',
      trialUntil,
      trialUsed: true,
      createdAt: (psnap.exists() && psnap.val().createdAt) || now
    });
    if (eKey) {
      await _set(_ref(_db, `trialsUsed/${eKey}`), { uid, at: now });
    }
    _premiumStatus = { type: 'trial', daysLeft: TRIAL_DAYS, until: trialUntil };
    updatePremiumUI();
    closePaywall();
    alert('🎉 Trial aktivován! Máš 30 dní plného přístupu ke všem Premium funkcím zdarma.');
  } catch(e) {
    console.error('startTrial error:', e);
    alert('Nepodařilo se aktivovat trial. Zkus to znovu.');
  }
}

function goPremium() {
  // Placeholder – bude nahrazen Stripe integrací (čeká na živnost)
  alert('💳 Platební brána bude brzy dostupná!\n\nZatím můžeš vyzkoušet Premium na 30 dní zdarma přes tlačítko trial.');
}

// Dokup AI tokenů – placeholder dokud není Stripe (ADR-053). 1 token = 1 AI akce.
const CREDIT_PACKS = {
  small: { tokens: 10, price: 39 },
  big:   { tokens: 20, price: 69 },
};
function buyCredits(pack) {
  const p = CREDIT_PACKS[pack];
  if (!p) return;
  alert('⚡ Dokup ' + p.tokens + ' AI tokenů za ' + p.price + ' Kč bude brzy dostupný.\n\nPlatební brána Stripe se připravuje. Tokeny se po nákupu připíšou jen na tvůj účet a nepropadají s měsíční obnovou.');
}

// Pro testování – admin může ručně nastavit premium
async function activatePremiumManually(uid, months, tier) {
  tier = tier || 'premium';
  const until = Date.now() + months * 30 * 24 * 60 * 60 * 1000;
  await _set(_ref(_db, `users/${uid}/premium`), {
    type: tier,
    premiumUntil: until,
    activatedAt: Date.now(),
    activatedBy: 'manual'
  });
  await loadPremiumStatus(uid);
  alert(`✅ ${tier==='pro'?'Pro':'Premium'} aktivováno na ${months} měsíců!`);
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
  // Virtuální peněženka – cíle spoření (TODO-056)
  if (typeof onPenezenkyRender === 'function') onPenezenkyRender();
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

// Zůstatek peněženky přepočtený na CZK (pro sumarizaci majetku/dashboardu)
function walletBalanceCZK(walletId, D) {
  D = D || getData();
  const w = getWallets(D).find(x => x.id === walletId);
  const bal = computeWalletBalance(walletId, D);
  return (typeof toCZK==='function') ? toCZK(bal, w?.currency||'CZK') : bal;
}

function renderTransferDropdowns(wallets) {
  const D = getData();
  const goals = (D.wishes||[]).filter(w=>w.isGoal && w.done!==true);
  const walletOpts = wallets.map(w => `<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name} (${w.currency||'CZK'})</option>`).join('');
  const goalOpts = goals.length ? `<optgroup label="🎯 Virtuální peněženka – cíle">`
        + goals.map(g=>`<option value="goal:${g.id}">🎯 ${g.name}</option>`).join('')
        + `</optgroup>` : '';
  // transferFrom: peněženky + virtuální cíle (lze převést i Z cíle zpět)
  const sel0 = document.getElementById('transferFrom');
  if(sel0) sel0.innerHTML = walletOpts + goalOpts;
  // transferTo: peněženky + virtuální cíle
  const selTo = document.getElementById('transferTo');
  if(selTo) selTo.innerHTML = walletOpts + goalOpts;
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
// Najdi ID kategorie podle jména v reálných datech uživatele (žádné vymyšlené ID)
function findCatIdByName(name){
  const D = getData();
  const cat = (D.categories||[]).find(c => c.name === name);
  return cat ? cat.id : undefined;
}

// ── Měnový přepočet do CZK (sdílí kurzy s debts.js _FX_RATES) ──
function toCZK(amount, currency){
  if(!currency || currency==='CZK') return amount;
  const rates = (typeof _FX_RATES!=='undefined') ? _FX_RATES : {EUR:25.3,USD:23.1,PLN:5.7,GBP:29.5,CHF:26.8,HUF:0.062,SKK:1.0};
  const r = rates[currency] || 1;
  return amount * r;
}
function doTransfer() {
  const from=document.getElementById('transferFrom').value;
  const to=document.getElementById('transferTo').value;
  let amt=parseFloat(document.getElementById('transferAmt').value)||0;
  const date=document.getElementById('transferDate').value||new Date().toISOString().slice(0,10);
  const note=document.getElementById('transferNote').value.trim();
  if(!from||!to){alert('Vyber obě peněženky');return;}
  if(from===to){alert('Peněženky musí být různé');return;}
  if(amt<=0){alert('Zadej částku');return;}

  // PŘEVOD Z VIRTUÁLNÍHO CÍLE ZPĚT NA PENĚŽENKU (from = goal:ID)
  if(from.startsWith('goal:')) {
    const goalId = from.slice(5);
    const D = getData();
    const goal = (D.wishes||[]).find(w=>w.id===goalId);
    if(!goal){alert('Cíl nenalezen');return;}
    if(to.startsWith('goal:')){alert('Převod mezi cíli není podporován');return;}
    const wDest = getWallets().find(w=>w.id===to);
    const destCur = wDest?.currency || 'CZK';
    // Z cíle (CZK) na peněženku v její měně
    const savedNow = (typeof goalGetSaved==='function')?goalGetSaved(goalId):0;
    if(amt > savedNow){ alert(`V cíli je naspořeno jen ${fmt(savedNow)}. Nelze vybrat víc.`); return; }
    // Přepočet CZK → měna cílové peněženky
    const rate = (destCur==='CZK')?1:((typeof _FX_RATES!=='undefined'?_FX_RATES[destCur]:1)||1);
    const amtDest = parseFloat((amt/rate).toFixed(2));
    // Příjem na peněženku
    const _vtCatId=findCatIdByName('Virtuální přesun');
    const txIn={id:uid(),name:`Výběr z cíle ← ${goal.name}`,amount:amtDest,type:'income',date,wallet:to,note:note||`Cíl: ${goal.name} · výběr na ${wDest?.name||'peněženku'}`,transferId:uid(),category:'transfer',catId:_vtCatId,subcat:'Reverz'};
    if(!S.transactions)S.transactions=[];
    S.transactions.push(txIn);
    // Záporný vklad do cíle (sníží naspořeno)
    const dep={id:uid(),goalId,amount:-parseFloat(amt.toFixed(2)),date,note:note||`Výběr na ${wDest?.name||'peněženku'}`,createdAt:Date.now(),txOutId:txIn.id};
    if(typeof _goalDeposits!=='undefined'){ if(!_goalDeposits[goalId])_goalDeposits[goalId]=[]; _goalDeposits[goalId].push(dep); }
    if(window._currentUser && window._db){ _set(_ref(_db, `users/${window._currentUser.uid}/goal_deposits/${dep.id}`), dep).catch(()=>{}); }
    save();
    document.getElementById('transferAmt').value='';
    document.getElementById('transferNote').value='';
    document.getElementById('transferResult').innerHTML=`<div class="insight-item good"><div class="insight-icon">↩️</div><div class="insight-text">Výběr <strong>${fmt(amt)}</strong> z cíle <strong>${goal.name}</strong> na <strong>${wDest?.name}</strong> proveden!</div></div>`;
    setTimeout(()=>{const r=document.getElementById('transferResult');if(r)r.innerHTML='';},4000);
    return;
  }

  const wFrom=getWallets().find(w=>w.id===from);

  // PŘEVOD DO VIRTUÁLNÍHO CÍLE (goal:ID)
  if(to.startsWith('goal:')) {
    const goalId = to.slice(5);
    const D = getData();
    const goal = (D.wishes||[]).find(w=>w.id===goalId);
    if(!goal){alert('Cíl nenalezen');return;}
    const fromCur = wFrom?.currency || 'CZK';
    // Měnový přepočet: částka v měně peněženky → CZK (cíle jsou v CZK)
    let amtCZK = parseFloat(toCZK(amt, fromCur).toFixed(2));
    // HLÍDÁNÍ CÍLOVÉ ČÁSTKY: nelze překročit cíl
    const savedNow = (typeof goalGetSaved==='function') ? goalGetSaved(goalId) : 0;
    const remainingCZK = Math.max(0, (goal.targetAmount||0) - savedNow);
    if (remainingCZK <= 0) {
      alert(`Cíl „${goal.name}" je už naplněný. Vklad není potřeba.`);
      return;
    }
    if (amtCZK > remainingCZK) {
      const remInCur = (fromCur==='CZK') ? remainingCZK : (remainingCZK / ((typeof _FX_RATES!=='undefined'?_FX_RATES[fromCur]:1)||1));
      if (!confirm(`Vklad ${fmt(amtCZK)} překračuje zbývající částku do cíle (${fmt(remainingCZK)}).\n\nVložit jen zbývající částku ${fmt(remainingCZK)}?`)) return;
      // Vlož jen zbývající (přepočti zpět do měny peněženky pro výdaj)
      amtCZK = remainingCZK;
      amt = parseFloat(remInCur.toFixed(2));
    }
    // 1) Výdaj z peněženky (v měně peněženky) + odečet ze zůstatku
    const transferId=uid();
    const _vtCat=findCatIdByName('Virtuální přesun');
    const txOut={id:uid(),name:`Vklad do cíle → ${goal.name}`,amount:amt,type:'expense',date,wallet:from,note:note||`Cíl: ${goal.name} · převod z ${wFrom?.name||'peněženky'}`,transferId,category:'transfer',catId:_vtCat,subcat:'Vklad do cíle'};
    if(!S.transactions)S.transactions=[];
    S.transactions.push(txOut);
    // 2) Vklad do cíle (goal_deposits) – amount v CZK, originál uložen pro reverz
    const dep={id:uid(),goalId,amount:amtCZK,date,note:note||`Převod z ${wFrom?.name||'peněženky'}`,createdAt:Date.now(),
               transferId,walletId:from,walletAmount:amt,walletCurrency:fromCur,txOutId:txOut.id};
    if(typeof _goalDeposits!=='undefined'){ if(!_goalDeposits[goalId])_goalDeposits[goalId]=[]; _goalDeposits[goalId].push(dep); }
    if(window._currentUser && window._db){
      _set(_ref(_db, `users/${window._currentUser.uid}/goal_deposits/${dep.id}`), dep).catch(()=>{});
    }
    save();
    document.getElementById('transferAmt').value='';
    document.getElementById('transferNote').value='';
    document.getElementById('transferResult').innerHTML=`<div class="insight-item good"><div class="insight-icon">🎯</div><div class="insight-text">Vklad <strong>${fmt(amt)}</strong> z <strong>${wFrom?.name}</strong> do cíle <strong>${goal.name}</strong> proveden!</div></div>`;
    setTimeout(()=>{const r=document.getElementById('transferResult');if(r)r.innerHTML='';},4000);
    return;
  }

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
  // S12.1i: typ Přesun – skrýt kategorii, zobrazit cílovou peněženku
  const stTr=document.getElementById('stt-transfer');
  if(stTr) stTr.className = t==='transfer' ? 'tt sel-transfer' : 'tt';
  const catSec=document.getElementById('sablonaCatSection');
  if(catSec) catSec.style.display = t==='transfer' ? 'none' : 'block';
  const toSec=document.getElementById('sablonaWalletToSection');
  if(toSec) toSec.style.display = t==='transfer' ? 'block' : 'none';
  const wl=document.getElementById('sablonaWalletLabel');
  if(wl) wl.textContent = t==='transfer' ? 'Z peněženky' : 'Peněženka';
  if(t==='transfer' && typeof renderSablonaWalletTo==='function') renderSablonaWalletTo();
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
function renderSablonaWalletTo() {
  const sel=document.getElementById('sablonaWalletTo'); if(!sel) return;
  sel.innerHTML='<option value="">– vyber –</option>'+(S.wallets||[]).map(w=>`<option value="${w.id}">${w.icon||'💼'} ${w.name}</option>`).join('');
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
  if(document.getElementById('sablonaWalletTo')) document.getElementById('sablonaWalletTo').value=s.walletTo||'';
  document.getElementById('sablonaModalTitle').textContent='Upravit šablonu';
  document.getElementById('modalSablona').classList.add('open');
}
function saveSablona() {
  const eid=document.getElementById('editSablonaId').value;
  const name=document.getElementById('sablonaName').value.trim();
  const amount=parseFloat(document.getElementById('sablonaAmt').value)||0;
  if(!name){alert('Zadej název');return;}
  if(!amount){alert('Zadej částku');return;}
  const s={id:eid||uid(),name,amount,type:_sablonaType,catId:selCatId,freq:document.getElementById('sablonaFreq').value,den:parseInt(document.getElementById('sablonaDen').value)||1,auto:document.getElementById('sablonaAuto').checked,endDate:document.getElementById('sablonaEnd').value||null,wallet:document.getElementById('sablonaWallet').value||null,walletTo:document.getElementById('sablonaWalletTo')?.value||null,note:document.getElementById('sablonaNote').value.trim()};
  if(_sablonaType==='transfer'){
    if(!s.wallet||!s.walletTo){alert('U přesunu vyber obě peněženky');return;}
    if(s.wallet===s.walletTo){alert('Peněženky musí být různé');return;}
    s.catId='transfer';
  }
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
  const _dateStr=new Date().toISOString().slice(0,10);
  if(!S.transactions)S.transactions=[];
  if(s.type==='transfer'){
    // S12.1i: opakovaný PŘESUN – pár transakcí s transferId (statistiky ho ignorují, peněženky započítají)
    const transferId=uid();
    const txName=s.name||'Převod (šablona)';
    S.transactions.push(
      {id:uid(),name:txName,amount:s.amount,amt:s.amount,type:'expense',date:_dateStr,wallet:s.wallet||null,note:s.note||'Z šablony: '+s.name,transferId,category:'transfer',catId:'transfer'},
      {id:uid(),name:txName,amount:s.amount,amt:s.amount,type:'income', date:_dateStr,wallet:s.walletTo||null,note:s.note||'Z šablony: '+s.name,transferId,category:'transfer',catId:'transfer'}
    );
  } else {
    S.transactions.push({id:uid(),name:s.name,amount:s.amount,type:s.type,date:_dateStr,category:s.catId||'',note:s.note||'Z šablony: '+s.name,wallet:s.wallet||null});
  }
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
    if(s.type==='transfer'){
      const transferId=uid();
      S.transactions.push(
        {id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:'expense',date:todayStr,wallet:s.wallet||null,note:'Auto-šablona: '+s.name,transferId,category:'transfer',catId:'transfer'},
        {id:uid(),name:s.name,amount:s.amount,amt:s.amount,type:'income', date:todayStr,wallet:s.walletTo||null,note:'Auto-šablona: '+s.name,transferId,category:'transfer',catId:'transfer'}
      );
    } else {
      S.transactions.push({id:uid(),name:s.name,amount:s.amount,type:s.type,date:todayStr,category:s.catId||'',note:'Auto-šablona: '+s.name,wallet:s.wallet||null});
    }
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
  _settings.convCur = document.getElementById('settingConvCur')?.value || ''; // v8.72: preferovaná převodní měna
  _settings.dateFmt = document.getElementById('settingDateFmt')?.value || 'cs';
  _settings.household_adults = parseInt(document.getElementById('settingAdults')?.value) || 2;
  _settings.household_ch013 = parseInt(document.getElementById('settingChildren013')?.value) || 0;
  _settings.household_ch14  = parseInt(document.getElementById('settingChildren14')?.value) || 0;
  // FIX (S12.1): Den výplaty (settingFirstDay) se dosud vůbec neukládal. 0 = automaticky z transakcí.
  const _fdEl = document.getElementById('settingFirstDay');
  if(_fdEl) _settings.firstDay = parseInt(_fdEl.value) || 0;
  // S13: frekvence výplaty (Runway cyklus) – monthly/biweekly/weekly/semimonthly/irregular
  const _pfEl = document.getElementById('settingPayFreq');
  if(_pfEl) _settings.payFreq = _pfEl.value || 'monthly';
  const _mrEl = document.getElementById('settingMinReserve');
  if(_mrEl) _settings.minReserve = Math.max(0, parseInt(_mrEl.value) || 0);   // S12.1: nedotknutelná rezerva pro Runway
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
  // Session 10: stavové tlačítko – po uložení zešedne + banner „Máte uloženo"
  if(typeof markSettingsSaved === 'function') markSettingsSaved();
  const bar = document.getElementById('settingsSaveBar');
  if(bar) bar.style.display = 'none';
  // Toast zpráva
  if(typeof showToast === 'function') {
    showToast(_settings.lang==='en'?'✅ Settings saved!':_settings.lang==='sk'?'✅ Nastavenia uložené!':'✅ Nastavení uloženo!');
  }
  // v8.60 (TODO-150): změna základní měny se projeví hned (překreslit aktuální stránku)
  if(typeof renderPage === 'function') { try { renderPage(); } catch(_){} }
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
  let txs=(D.transactions||[]).filter(t=>!t.splitParent);
  if(from)txs=txs.filter(t=>t.date>=from);
  if(to)txs=txs.filter(t=>t.date<=to);
  if(type!=='all')txs=txs.filter(t=>t.type===type);
  txs=txs.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const esc=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
  const header='Datum;Název;Částka;Měna;Typ;Kategorie;Podkategorie;Peněženka;Typ platby;Poznámka\n';
  const pts=(typeof getPayTypes==='function')?getPayTypes(D):(D.payTypes||[]);
  const rows=txs.map(t=>{
    const cat=(D.categories||[]).find(c=>c.id===(t.catId||t.category));
    const w=(D.wallets||[]).find(x=>x.id===t.wallet);
    const pt=pts.find(p=>p.id===t.payType);
    const amt=t.amount||t.amt||0;
    return [t.date, esc(t.name), amt, (t.currency||'CZK'),
      (t.type==='income'?'Příjem':t.type==='expense'?'Výdaj':'Převod'),
      esc(cat?.name||''), esc(t.subcat||''), esc(w?.name||''), esc(pt?.name||''), esc(t.note||'')
    ].join(';');
  }).join('\n');
  if(!txs.length){ if(typeof showToast==='function') showToast('⚠️ Žádné transakce k exportu'); return; }
  const blob=new Blob(['\uFEFF'+header+rows],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='financeflow-transakce-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  if(typeof showToast==='function') showToast(`📊 Exportováno ${txs.length} transakcí`);
  if(typeof closeModal==='function') closeModal('modalExportCsv');
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
    status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Prosím vyplňte email.</div></div>';
    return;
  }
  if(!message) {
    status.innerHTML='<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Prosím vyplňte zprávu.</div></div>';
    return;
  }

  status.innerHTML='<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Odesílám...</div></div>';

  let saved = false;

  // 1. Ulož do Firebase
  try {
    if(window._db) {
      const key = Date.now()+'_'+Math.random().toString(36).slice(2,6);
      const uid = window._currentUser?.uid||'anon';
      await _set(_ref(_db,'support/'+key),{
        name,email,type,message,uid,
        date:new Date().toISOString(),version:'6.41',status:'new'
      });
      saved = true;
    }
  } catch(e) { console.log('Firebase save error:',e); }

  // 2. EmailJS - pošle email přímo (nevyžaduje doménu)
  try {
    const EMAILJS_SERVICE = 'service_financeflow';
    const EMAILJS_TEMPLATE = 'template_contact';
    const EMAILJS_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // TODO: doplnit z emailjs.com
    
    if(EMAILJS_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY' && window.emailjs) {
      await window.emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
        from_name: name||'Anonymní',
        from_email: email,
        msg_type: type,
        message,
        to_email: 'bc.milda@gmail.com'
      }, EMAILJS_KEY);
    } else {
      // Fallback: Worker s Resend
      const typeLabel = type==='bug'?'🐛 Chyba':type==='feature'?'💡 Návrh':type==='support'?'❓ Podpora':'📧 Zpráva';
      // Získej Firebase ID token pro autorizaci Workeru
      let idToken = '';
      try {
        if(window._currentUser) idToken = await window._currentUser.getIdToken();
      } catch(e) { console.log('Token error:', e); }
      const headers = {'Content-Type':'application/json'};
      if(idToken) headers['Authorization'] = 'Bearer ' + idToken;
      const workerRes = await fetch('https://misty-limit-0523.bc-milda.workers.dev',{
        method:'POST',
        headers,
        body:JSON.stringify({type:'contact_form',payload:{from_name:name,from_email:email,msg_type:type,message}})
      });
      const workerData = await workerRes.json().catch(()=>({}));
      console.log('Worker response:', workerData);
    }
  } catch(e) { console.log('Email send error:',e); }

  if(saved) {
    status.innerHTML='<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text"><strong>Děkujeme!</strong> Vaše zpráva byla přijata. Odpovíme na <strong>'+email+'</strong>.</div></div>';
    setTimeout(()=>{
      document.getElementById('contactName').value='';
      document.getElementById('contactEmail').value='';
      document.getElementById('contactMessage').value='';
      status.innerHTML='';
      closeModal('modalContact');
    },2500);
  } else {
    status.innerHTML='<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">Nepodařilo se uložit. Napište přímo na <strong>bc.milda@gmail.com</strong>.</div></div>';
  }
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
    // Pro součet majetku přepočti na CZK; v řádku ukaž originál v měně peněženky
    const balCZK = (typeof toCZK==='function') ? toCZK(bal, w.currency||'CZK') : bal;
    total += balCZK;
    return { name: w.name, type: w.type, balance: bal, balanceCZK: balCZK, currency: w.currency||'CZK', color: w.color || '#4ade80' };
  });
  // Add bank savings if no wallets defined
  if(!rows.length) {
    const bankBal = computeBank(D);
    total = bankBal;
    rows.push({ name: 'Úspory (Bank)', type: 'savings', balance: bankBal, color: '#60a5fa' });
  }
  // Virtuální peněženka (naspořeno v aktivních cílech) jako řádek majetku
  if (typeof goalGetSaved === 'function') {
    const activeGoals = (D.wishes||[]).filter(w => w.isGoal && w.done !== true);
    const vwSaved = activeGoals.reduce((s,g) => s + goalGetSaved(g.id), 0);
    if (vwSaved > 0) {
      total += vwSaved;
      rows.push({ name: 'Virtuální peněženka', type: 'savings', balance: vwSaved, balanceCZK: vwSaved, currency: 'CZK', color: '#f59e0b', isVirtual: true });
    }
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
// ══════════════════════════════════════════════════════
// FINANČNÍ SKÓRE v2 – computeFinancialScore()
// Session 8, FIX-078 — Přepracování dle ADR-042 (Option C)
//
// 4 NEZÁVISLÉ složky (bez dvojitého postihu za záporné saldo):
//   S1: Cash flow (0–25)   expRatio = výdaje/příjmy AKTUÁLNÍ měsíc
//   S2: Zadluženost (0–25) DTI (0–13) + DSTI (0–12) NEZÁVISLE
//   S3: Rezerva (0–25)     monthsReserve = úspory/baseIncome HISTORICKÁ
//   S4: Spoření (0–25)     activeSavingRate = isSaving kategorií/baseIncome
//
// + Konzistenční bonus (+2/+5/+9/+13/+15) za nepřetržité zlepšení
// Lookup tabulky s 1-bodovými rozestupy. Max 100 (cap).
// ══════════════════════════════════════════════════════
// v8.72: bodovací tabulky S1/S4 sdílené s Měsíčním reportem (3 složky zdraví)
const _FIN_S1_TABLE = [
  [0.50,25],[0.54,24],[0.58,23],[0.62,22],[0.66,21],[0.70,20],
  [0.73,19],[0.76,18],[0.79,17],[0.82,16],[0.85,15],[0.88,14],
  [0.91,13],[0.94,12],[0.97,11],[1.00,10],[1.04,9],[1.08,8],
  [1.12,7],[1.17,6],[1.22,5],[1.28,4],[1.35,3],[1.45,2],[1.60,1],
];
const _FIN_S4_TABLE = [
  [25,25],[23,24],[21,23],[19,22],[17,21],[15,20],
  [13,18],[11,16],[9,14],[7,12],[5,10],[4,8],[3,6],[2,4],[1,2],[0.1,1],
];
function finScoreS1(expRatio){ // výdaje/příjmy → 0–25 b (Milanova tabulka Cash flow)
  if(expRatio==null) return 12;
  for(const [t,p] of _FIN_S1_TABLE){ if(expRatio<=t) return p; }
  return 0;
}
function finScoreS4(rate){ // % základu odloženo do investic → 0–25 b (tabulka Spoření)
  if(rate==null) return 12;
  for(const [t,p] of _FIN_S4_TABLE){ if(rate>=t) return p; }
  return 0;
}

function computeFinancialScore(D) {
  const baseIncome = computeBaseIncome(D);
  const txs = getTx(S.curMonth, S.curYear, D);
  const totalInc = incSum(txs);
  const totalExp = expSum(txs);
  const debts = D.debts || [];

  // v8.72 (FIX-188): sjednocené splátky (installments + freq) a příjem – stejné jako
  // Bankovní hodnocení a Dluhový stres index (dřív DSTI 732 % vs 753 %).
  const monthlyPayments = computeMonthlyDebtPayments(D);
  // S16 (TODO-160): DTI = 12M klouzavý průměr, DSTI = 3–12M adaptivní (stabilní napříč měsíci)
  const incDTI  = computeEffectiveIncome(D, 12);
  const incDSTI = computeEffectiveIncome(D, 12);
  const totalDebt = debts.reduce((a,d)=>a+(d.remaining||0),0);
  const annualIncome = (incDTI||totalInc) * 12;

  // ── S1: Cash Flow (0–75 b) – v8.74 (TODO-159): plná Milanova tabulka ──
  let expRatio = null, score1;
  if (totalInc > 0) { expRatio = totalExp / totalInc; score1 = msc_S1(expRatio) ?? 36; }
  else score1 = 36; // neutral (polovina)
  const s1max = _SCORING.max.S1;
  const s1label = score1>=s1max*0.8?'🟢 Cash flow OK':score1>=s1max*0.45?'🟡 Výdaje '+Math.round((expRatio||0)*100)+'% příjmu':'🔴 Výdaje překračují příjmy';

  // ── S2: Zadluženost = DTI (0–60) + DSTI (0–40) = 0–100 b ──
  const dti  = annualIncome > 0 ? totalDebt / annualIncome * 100 : 0;
  const dsti = (incDSTI||totalInc) > 0 ? monthlyPayments / (incDSTI||totalInc||1) * 100 : 0;
  const scoreDTI  = debts.length>0 ? msc_DTI(dti)  : _SCORING.max.DTI;
  const scoreDSTI = debts.length>0 ? msc_DSTI(dsti): _SCORING.max.DSTI;
  const score2 = scoreDTI + scoreDSTI;
  const s2max = _SCORING.max.DTI + _SCORING.max.DSTI;
  const s2label = score2>=s2max*0.8?'🟢 Nízké zadlužení':score2>=s2max*0.45?`🟡 DTI ${Math.round(dti)}% / DSTI ${Math.round(dsti)}%`:`🔴 Vysoké zadlužení – DSTI ${Math.round(dsti)}%`;

  // ── S3: Rezerva (0–50 b) – měsíce rezervy ──
  const savWallets = (D.wallets||[]).filter(w=>w.type==='savings'||w.type==='investment');
  let savBalance = savWallets.reduce((a,w)=>a+(w.balance||0),0);
  if(typeof assetTier==='function'){
    savBalance += (D.assets||[]).filter(a=>assetTier(a)==='reserve').reduce((a2,x)=>a2+(x.value||0),0);
  }
  const monthsReserve = (baseIncome||0) > 0 ? savBalance / (baseIncome||1) : null;
  const s3max = _SCORING.max.S3;
  const score3 = monthsReserve!==null ? (msc_S3(monthsReserve) ?? Math.round(s3max/2)) : Math.round(s3max/2);
  const s3label = score3>=s3max*0.8?`🟢 Rezerva ${monthsReserve?monthsReserve.toFixed(1):'?'} měs.`:score3>=s3max*0.45?`🟡 Rezerva ${monthsReserve?monthsReserve.toFixed(1):'?'} měs.`:`🔴 Nízká rezerva`;

  // ── S4: Aktivní spoření (0–35 b) – 📈 isInvest → % základu ──
  let savCats = (D.categories||[]).filter(c=>c.isInvest && c.name!=='Virtuální přesun');
  if(!savCats.length) savCats = (D.categories||[]).filter(c=>c.isSaving && c.name!=='Virtuální přesun');
  const s4max = _SCORING.max.S4;
  let score4 = Math.round(s4max/2), activeSavingRate = null;
  if (savCats.length > 0 && (baseIncome||0) > 0) {
    const totalSaved = savCats.reduce((a,c)=>a+getActual(c.id,null,S.curMonth,S.curYear,D),0);
    activeSavingRate = totalSaved / (baseIncome||1) * 100;
    score4 = msc_S4(activeSavingRate) ?? 0;
  }
  const s4label = score4>=s4max*0.8?`🟢 Spoříš ${activeSavingRate?Math.round(activeSavingRate):'?'}% příjmu`:score4>=s4max*0.45?`🟡 Spoříš ${activeSavingRate?Math.round(activeSavingRate):'?'}%`:`🔴 Spoření nízké / nenastaveno`;

  // ── S5: Rozpočet (0–50 b) – v8.74 (TODO-159): napojeno na Měsíční report
  //     (průměr skóre kategorií vs limity 0–100) přeškálováno na 0–50. ──
  const s5max = 50;
  let score5 = Math.round(s5max/2), budgetPct = null;
  if (typeof computeHealthScores==='function') {
    try {
      const hs = computeHealthScores(D, S.curMonth, S.curYear);
      budgetPct = hs.budgetScore; // 0–100
      score5 = Math.round(budgetPct/100*s5max);
    } catch(e){}
  }
  const s5label = score5>=s5max*0.8?`🟢 Rozpočet drží (${budgetPct??'?'}/100)`:score5>=s5max*0.45?`🟡 Rozpočet ${budgetPct??'?'}/100`:`🔴 Limity překročeny (${budgetPct??'?'}/100)`;

  // ── KONZISTENČNÍ BONUS ───────────────────────────────────────
  // Session 10 FIX: PŮVODNĚ se počítadlo `consistencyMonths` MUTOVALO do
  // D.scoreState při KAŽDÉM volání funkce (inkrement/reset). Protože se
  // computeFinancialScore() volá z mnoha míst (render, networth, ai.js) a při
  // každém přepnutí měsíce, počítadlo skákalo nepředvídatelně → skóre se měnilo
  // bez zjevného důvodu (např. 18 → 25 → 31 po překliknutí měsíců).
  // OPRAVA: bonus se počítá DETERMINISTICKY z historie dat – projdeme posledních
  // 6 měsíců zpět od aktuálního a spočítáme, kolik PO SOBĚ JDOUCÍCH měsíců se
  // výdaje meziměsíčně snižovaly. Žádná mutace stavu, čistá funkce.
  let pm=S.curMonth-1,py=S.curYear;if(pm<0){pm=11;py--;}
  const prevTxs=getTx(pm,py,D);
  const prevExp=expSum(prevTxs), prevInc=incSum(prevTxs);
  const prevSal=prevInc-prevExp, curSal=totalInc-totalExp;

  // Deterministický výpočet konzistence: kolik po sobě jdoucích měsíců (zpět od
  // aktuálního) měl uživatel meziměsíční pokles výdajů + nějaký příjem.
  let cm=0;
  {
    let m=S.curMonth, y=S.curYear;
    for(let i=0;i<6;i++){
      let pmm=m-1,pyy=y;if(pmm<0){pmm=11;pyy--;}
      const curT=getTx(m,y,D), prvT=getTx(pmm,pyy,D);
      const curE=expSum(curT), prvE=expSum(prvT), prvI=incSum(prvT);
      // Trvá řetězec, jen pokud měl předchozí měsíc příjem a výdaje klesly
      if(prvI>0 && curE<prvE){ cm++; m=pmm; y=pyy; }
      else break;
    }
  }
  const consistencyBonus = (typeof msc_BONUS==='function') ? msc_BONUS(cm) : ([0,1,3,6,9,15,18,21,24,27,30][Math.min(10,cm)]||0); // v8.74: Milanova BONUS tabulka (0–30)

  // Trend label (pro dashboard kartu)
  const incImprove=totalInc>=prevInc, expImprove=totalExp<=prevExp, salImprove=curSal>=prevSal;
  const posCount=[incImprove,expImprove,salImprove].filter(Boolean).length;
  const trendScore = prevInc>0?[5,12,20,25][posCount]:17;
  const trendLabel = trendScore>=20?'🟢 Pozitivní trend':trendScore>=12?'🟡 Stabilní trend':'🔴 Zhoršující se trend';

  // ── CELKOVÝ VÝSLEDEK ─ v8.74 (TODO-159): plné škály
  //   S1 75 + S2 100 + S3 50 + S4 35 + S5 50 = 310 b (+ bonus 30) → normalizace na 0–100.
  const rawMax = s1max + s2max + s3max + s4max + s5max; // 310
  const baseTotal = score1+score2+score3+score4+score5;
  const rawTotal = Math.min(rawMax, baseTotal + consistencyBonus);
  const total = Math.round(rawTotal / rawMax * 100);

  // S16 (TODO-169): hodnocení přepočítáno na REÁLNÉ body z Milanových tabulek (0–310).
  //   Prahy = stejné poměry jako dřívější %: 90/75/60/45/30 % z 310 → 279/233/186/140/93 b.
  //   `total` (0–100) zůstává interně pro kruh a ai.js.
  const grade = rawTotal>=Math.round(rawMax*0.90)?{label:'Výborné',   emoji:'🏆',color:'#4ade80'}:
                rawTotal>=Math.round(rawMax*0.75)?{label:'Velmi dobré',emoji:'⭐',color:'#60a5fa'}:
                rawTotal>=Math.round(rawMax*0.60)?{label:'Dobré',      emoji:'👍',color:'#a78bfa'}:
                rawTotal>=Math.round(rawMax*0.45)?{label:'Průměrné',   emoji:'📊',color:'#fbbf24'}:
                rawTotal>=Math.round(rawMax*0.30)?{label:'Rizikové',   emoji:'⚠️',color:'#fb923c'}:
                           {label:'Kritické',   emoji:'🚨',color:'#f87171'};

  return {
    total, baseTotal, consistencyBonus, grade, rawTotal, rawMax,
    components: [
      {label:'💰 Cash flow',   score:score1, max:s1max, detail:s1label},
      {label:'🏦 Zadluženost', score:score2, max:s2max, detail:s2label,
       sub:[{label:'DTI',score:scoreDTI,max:_SCORING.max.DTI},{label:'DSTI',score:scoreDSTI,max:_SCORING.max.DSTI}]},
      {label:'🐷 Rezerva',     score:score3, max:s3max, detail:s3label},
      {label:'💎 Spoření',     score:score4, max:s4max, detail:s4label},
      {label:'📊 Rozpočet',    score:score5, max:s5max, detail:s5label},
    ],
    trend:{score:trendScore,label:trendLabel,consistencyMonths:cm,bonus:consistencyBonus},
  };
}

function renderFinancialScore(D) {
  const el = document.getElementById('financialScoreCard'); if(!el) return;
  const sc = computeFinancialScore(D);
  const {total, baseTotal, consistencyBonus, grade, components, trend} = sc;
  const borderColor = grade.color + '44';
  const bgColor = grade.color + '0d';

  const barColor = (score, max) => score/max>=0.8?'var(--income)':score/max>=0.5?'var(--debt)':'var(--expense)';

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
          <div style="font-size:1.15rem;color:${grade.color}">${sc.rawTotal}</div>
          <div style="font-size:.55rem;color:#a8aec8">/ ${sc.rawMax}</div>
        </div>
      </div>
      <!-- Info -->
      <div style="flex:1;min-width:140px">
        <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">Finanční skóre</div>
        <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:${grade.color}">${grade.emoji} ${grade.label}</div>
        <div style="font-size:.74rem;color:var(--text3);margin-top:4px">Celkové hodnocení vaší finanční situace</div>
        ${consistencyBonus>0?`<div style="font-size:.68rem;margin-top:4px;color:var(--income)">🎯 Konzistentní trend: +${consistencyBonus} bodů (${trend.consistencyMonths} měs.)</div>`:''}
        <button class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:.72rem" onclick="showPage('obraz',null)">📈 Podrobná analýza →</button>
      </div>
      <!-- 4 složky -->
      <div style="flex:2;min-width:200px">
        ${components.map(c => `
          <div class="fscore-row">
            <div style="font-size:.74rem;color:var(--text2);min-width:130px">${c.label}</div>
            <div class="fscore-bar">
              <div class="fscore-bar-fill" style="width:${Math.round(c.score/c.max*100)}%;background:${barColor(c.score,c.max)}"></div>
            </div>
            <div style="font-size:.74rem;font-weight:700;min-width:36px;text-align:right;color:${barColor(c.score,c.max)}">${c.score}/${c.max}</div>
          </div>
          ${c.sub?c.sub.map(s=>`
            <div class="fscore-row" style="padding-left:16px">
              <div style="font-size:.72rem;color:#c9cede;font-weight:700;min-width:130px">↳ ${s.label}</div>
              <div class="fscore-bar" style="height:4px">
                <div class="fscore-bar-fill" style="width:${Math.round(s.score/s.max*100)}%;background:${barColor(s.score,s.max)}"></div>
              </div>
              <div style="font-size:.72rem;font-weight:700;min-width:40px;text-align:right;color:${barColor(s.score,s.max)}">${s.score}/${s.max}</div>
            </div>`).join(''):''}
        `).join('')}
      </div>
    </div>
    <!-- Detail labels -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:12px">
      ${components.map(c=>`<div style="font-size:.72rem;color:var(--text3);padding:5px 8px;background:var(--surface2);border-radius:7px">${c.detail}</div>`).join('')}
      <div style="font-size:.72rem;color:var(--text3);padding:5px 8px;background:var(--surface2);border-radius:7px">${trend.label}</div>
      ${consistencyBonus>0?`<div style="font-size:.72rem;color:var(--income);padding:5px 8px;background:var(--surface2);border-radius:7px">🎯 Bonus +${consistencyBonus} za ${trend.consistencyMonths} měs. bez zlomu</div>`:''}
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
    <div class="networth-total" style="color:${totalColor}">${fmtB(displayTotal)}</div>
    <div style="display:flex;flex-direction:column;gap:0">
      ${nw.rows.map(r=>`<div class="networth-row">
        <div class="networth-dot" style="background:${r.color}"></div>
        <span style="flex:1;color:var(--text2)">${r.isVirtual?'🟡':(typeIcons[r.type]||'👛')} ${r.name}${r.currency&&r.currency!=='CZK'?` <span style="font-size:.7rem;color:var(--text3)">(${r.currency})</span>`:''}</span>
        <span style="font-weight:600;color:${r.balance>=0?'var(--text)':'var(--expense)'}">${r.currency&&r.currency!=='CZK'?fmtP(r.balanceCZK)+' Kč':fmtB(r.balance)}</span>
      </div>`).join('')}
      ${nw.totalDebt>0&&_networthShowDebt?`<div class="networth-row">
        <div class="networth-dot" style="background:var(--expense)"></div>
        <span style="flex:1;color:var(--text3)">💸 Celkový dluh</span>
        <span style="font-weight:600;color:var(--expense)">−${fmtB(nw.totalDebt)}</span>
      </div>`:''}
    </div>
    ${nw.totalDebt>0&&!_networthShowDebt?`<div style="font-size:.7rem;color:var(--text3);margin-top:6px;text-align:center">Dluhy skryty · celkový dluh: <span style="color:var(--expense)">${fmt(nw.totalDebt)}</span></div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════════════
