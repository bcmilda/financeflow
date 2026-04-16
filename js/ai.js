//  AI RÁDCE
// ══════════════════════════════════════════════════════
// Worker URL – sem doplňte URL po vytvoření Workeru
const WORKER_URL = 'https://misty-limit-0523.bc-milda.workers.dev';

let _aiChatHistory = [];

function renderAiPage() {
  const banner = document.getElementById('aiKeyBanner'); if(!banner) return;
  const isLoggedIn = window._currentUser && !window._currentUser.isAnonymous;
  if(isLoggedIn) {
    banner.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--income-bg);border:1px solid rgba(74,222,128,.3);border-radius:10px;font-size:.8rem;color:var(--text2)">
      <span style="font-size:1.1rem">✅</span>
      <span>AI poradce aktivní · Přihlášen jako <strong>${window._currentUser.email||'uživatel'}</strong></span>
    </div>`;
    // Spusť proaktivní kontrolu
    setTimeout(()=>aiProactiveCheck(), 1000);
  } else {
    banner.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--debt-bg);border:1px solid rgba(251,191,36,.3);border-radius:10px;font-size:.8rem;color:var(--text2)">
      <span style="font-size:1.1rem">⚠️</span>
      <span>AI poradce vyžaduje přihlášení přes Google. <strong>Přihlaste se</strong> v Nastavení.</span>
    </div>`;
  }
}

async function getAuthToken() {
  if(!window._currentUser || window._currentUser.isAnonymous) return null;
  try {
    return await window._currentUser.getIdToken();
  } catch(e) {
    return null;
  }
}

async function callClaude(userMessage, systemExtra='') {
  const token = await getAuthToken();
  if(!token) {
    addAiMsg('assistant', '⚠️ Pro AI poradce se musíte přihlásit přes Google účet.');
    return null;
  }
  const ctx = buildFinanceContext();
  const messages = [
    ..._aiChatHistory.slice(-10),
    { role: 'user', content: `${ctx}\n\n${userMessage}` }
  ];
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ type: 'chat', payload: { messages } })
    });
    if(!res.ok) {
      const err = await res.json().catch(()=>({}));
      addAiMsg('assistant', `❌ Chyba: ${err.error||'Nepodařilo se připojit k AI'}`);
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text || '(prázdná odpověď)';
  } catch(e) {
    addAiMsg('assistant', '❌ Nepodařilo se připojit k AI serveru. Zkontrolujte připojení.');
    return null;
  }
}
function buildFinanceContext(){
  const D = getData();
  const txs = getTx(S.curMonth, S.curYear, D);
  const inc = incSum(txs), exp = expSum(txs), bal = inc-exp;
  let pm=S.curMonth-1, py=S.curYear; if(pm<0){pm=11;py--;}
  const prev = getTx(pm,py,D), pExp=expSum(prev), pInc=incSum(prev);

  // Kategorie
  const expCats = (D.categories||[]).filter(c=>c.type==='expense'||c.type==='both');
  const catBreakdown = expCats.map(cat=>{
    const amt = getActual(cat.id,null,S.curMonth,S.curYear,D);
    return amt>0 ? `${cat.icon}${cat.name}: ${fmt(amt)} Kč` : '';
  }).filter(Boolean).join(', ');

  // Saldo 6 měsíců
  const saldoHistory = [];
  for(let i=5;i>=0;i--){
    let m=S.curMonth-i, y=S.curYear; if(m<0){m+=12;y--;}
    const t=getTx(m,y,D);
    saldoHistory.push(`${CZ_M[m].slice(0,3)}: ${fmt(incSum(t)-expSum(t))} Kč`);
  }

  // Dluhy
  const debts = D.debts||[];
  const totalDebt = debts.reduce((a,d)=>a+d.remaining,0);
  const monthlyPayments = debts.reduce((a,d)=>{
    const freq=d.freq||'monthly';
    return a+(freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  },0);
  const debtDetails = debts.map(d=>`${d.name}: ${fmt(d.remaining)} Kč @ ${d.interest}% p.a.`).join(', ');

  // Peněženky
  const wallets = D.wallets||[];
  const walletTotal = wallets.reduce((a,w)=>a+(w.balance||0),0);
  const savWallets = wallets.filter(w=>w.type==='savings'||w.type==='investment');
  const savTotal = savWallets.reduce((a,w)=>a+(w.balance||0),0);

  // Projekty
  const projects = (D.projects||[]).filter(p=>!p.closed);
  const projDetails = projects.map(p=>{
    const ptxs = (D.transactions||[]).filter(t=>t.projectId===p.id);
    const pspent = ptxs.filter(t=>t.type==='expense').reduce((a,t)=>a+(t.amount||t.amt||0),0);
    return `${p.name}: utraceno ${fmt(pspent)} Kč${p.budget?'/rozpočet '+fmt(p.budget)+' Kč':''}`;
  }).join(', ');

  // Finanční skóre
  const score = computeFinancialScore(D);
  const dsti = monthlyPayments && incSum(getTx(S.curMonth,S.curYear,D)) > 0
    ? Math.round(monthlyPayments/incSum(getTx(S.curMonth,S.curYear,D))*100) : 0;

  // Účtenky
  const receipts = S.receipts||[];
  const receiptSummary = receipts.length > 0
    ? `Naskenováno ${receipts.length} účtenek, celkem ${fmt(receipts.reduce((a,r)=>a+(r.total||0),0))} Kč`
    : 'Žádné naskenované účtenky';

  // Bankbook
  const bankBal = computeBank(D);

  return `=== FINANČNÍ PROFIL UŽIVATELE (${CZ_M[S.curMonth]} ${S.curYear}) ===

PŘÍJMY A VÝDAJE:
- Příjmy tento měsíc: ${fmt(inc)} Kč
- Výdaje tento měsíc: ${fmt(exp)} Kč  
- Saldo: ${fmt(bal)} Kč
- Minulý měsíc: příjmy ${fmt(pInc)} Kč, výdaje ${fmt(pExp)} Kč
- Trend výdajů: ${pExp>0?Math.round((exp-pExp)/pExp*100):0}%

VÝDAJE DLE KATEGORIÍ:
${catBreakdown||'žádné transakce'}

SALDO POSLEDNÍCH 6 MĚSÍCŮ:
${saldoHistory.join(' | ')}

DLUHY A PŮJČKY:
- Celkový dluh: ${fmt(totalDebt)} Kč (${debts.length} závazků)
- Měsíční splátky: ${fmt(Math.round(monthlyPayments))} Kč
- DSTI (zatížení příjmu): ${dsti}%
${debtDetails ? '- Detail: '+debtDetails : ''}

ÚSPORY A PENĚŽENKY:
- Kumulované úspory (bank): ${fmt(bankBal)} Kč
- Celkem v peněženkách: ${fmt(walletTotal)} Kč
- Spořicí/investiční: ${fmt(savTotal)} Kč

FINANČNÍ SKÓRE: ${score.total}/100 (${score.grade.label})
- Příjmy vs výdaje: ${score.components[0].score}/25
- Zadluženost: ${score.components[1].score}/25
- Úspory: ${score.components[2].score}/25
- Trend: ${score.components[3].score}/25

AKTIVNÍ PROJEKTY: ${projects.length > 0 ? projDetails : 'žádné'}

ÚČTENKY: ${receiptSummary}

POČET TRANSAKCÍ: ${txs.length} tento měsíc`;
}

function addAiMsg(role, text) {
  const log = document.getElementById('aiChatLog'); if(!log) return;
  const div = document.createElement('div');
  div.className = `ai-msg ai-msg-${role}`;
  div.innerHTML = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-weight:700;font-size:.9rem;margin:8px 0 4px;color:var(--text)">$1</div>')
    .replace(/^[-•]\s+(.+)$/gm, '<li style="margin-left:16px;margin-bottom:2px">$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

async function sendAiChat() {
  const inp = document.getElementById('aiChatInput');
  const msg = inp.value.trim(); if(!msg) return;
  inp.value = '';
  addAiMsg('user', msg);
  const ctx = buildFinanceContext();
  const log = document.getElementById('aiChatLog');
  const thinking = document.createElement('div');
  thinking.className = 'ai-msg ai-msg-thinking';
  thinking.textContent = '✦ Analyzuji tvá data...';
  log.appendChild(thinking); log.scrollTop = log.scrollHeight;
  const btn = document.getElementById('aiSendBtn'); btn.disabled=true; btn.textContent='...';
  const reply = await callClaude(`${ctx}\n\nOtázka uživatele: ${msg}`);
  log.removeChild(thinking); btn.disabled=false; btn.textContent='Odeslat';
  if(reply) { _aiChatHistory.push({role:'user',content:msg},{role:'assistant',content:reply}); addAiMsg('assistant',reply); }
}

function clearAiChat() {
  _aiChatHistory = [];
  const log = document.getElementById('aiChatLog'); if(!log) return;
  log.innerHTML = '<div class="ai-msg ai-msg-assistant">💬 Chat vymazán. Na co se chceš zeptat?</div>';
}

function aiExportChat() {
  const log = document.getElementById('aiChatLog'); if(!log) return;
  const messages = [...log.querySelectorAll('.ai-msg')].map(m=>{
    const isUser = m.classList.contains('ai-msg-user');
    return (isUser ? 'Vy: ' : 'AI: ') + m.innerText;
  }).join('\n\n---\n\n');
  const blob = new Blob([messages], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='financeflow-ai-chat-'+new Date().toISOString().slice(0,10)+'.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function aiQuick(type) {
  const ctx = buildFinanceContext();
  const score = computeFinancialScore(getData());
  const receipts = S.receipts||[];

  const prompts = {
    analyze: `${ctx}

Proveď detailní analýzu výdajů za ${CZ_M[S.curMonth]}. Struktura odpovědi:
1. **Celkové hodnocení** – jak si vedu vs minulý měsíc
2. **Největší výdaje** – top 3 kategorie s čísly
3. **Zvýšené výdaje** – co vzrostlo více než 10% (potraviny, restaurace, atd.)
4. **Pozitivní trendy** – co se zlepšilo
5. **Doporučení** – 2 konkrétní akce na tento měsíc`,

    savings: `${ctx}

Navrhni 5 konkrétních způsobů jak ušetřit. Pro každý tip uveď:
- Co přesně změnit
- Kolik ušetřím v Kč/měsíc
- Jak to udělat (konkrétní kroky)

Také zjisti: Mám dostatečnou finanční rezervu? Kolik měsíců výdajů mám naspořeno? Kolik bych měl/a měsíčně odkládat pro 3měsíční rezervu?`,

    budget: `${ctx}

Zkontroluj můj rozpočet a odpověz na:
1. Jsem na cestě k překročení rozpočtu tento měsíc?
2. Které kategorie jsou rizikové?
3. **Predikce**: Při současném tempu výdajů – za kolik dní/měsíců budu v mínusu?
4. Co konkrétně udělat ještě tento měsíc?`,

    predict: `${ctx}

Předpověz moje výdaje na příští měsíc (${CZ_M[(S.curMonth+1)%12]}) a odpověz:
1. Odhadované výdaje – celkem v Kč
2. Kde hrozí překročení
3. Sezónní vlivy (svátky, prázdniny, atd.)
4. **Varování**: Hrozí mi v příštích 2 měsících záporné saldo?
5. Co udělat preventivně`,

    debts: `${ctx}

Analyzuj moje dluhy a doporučení pro splácení:

**Metoda Snowball** (od nejmenší dluh):
- Pořadí splácení a proč
- Motivační efekt

**Metoda Avalanche** (od nejvyššího úroku):
- Pořadí splácení a proč
- Úspora na úrocích v Kč

**Moje doporučení**: Která metoda je pro mě lepší a proč?
Kolik přeplatím celkem? Doporučuješ konsolidaci?`,

    reserve: `${ctx}

Analyzuj moji finanční rezervu:
1. **Aktuální rezerva** – kolik měsíců výdajů mám pokryto?
2. **Doporučená rezerva** – pro mé výdaje je ideálních X Kč (3-6 měsíců)
3. **Chybí mi** – X Kč pro dosažení bezpečné rezervy
4. **Plán**: Kolik odkládat měsíčně aby jsem rezervu doplnil/a za 6/12 měsíců?
5. Kam rezervu uložit (spořicí účet, termínovaný vklad)?`,

    simulate: `${ctx}

Proveď finanční simulaci spoření. Spočítej:
1. Odložím 500 Kč/měs → za 1/3/5/10 let mám? (při 3% a 5% úroku)
2. Odložím 1 000 Kč/měs → za 1/3/5/10 let mám?
3. Odložím 2 000 Kč/měs → za 1/3/5/10 let mám?
4. Pro můj příjem – kolik % doporučuješ odkládat?
5. Kdy dosáhnu finanční nezávislosti (25× roční výdaje)?`,

    score: `${ctx}

Moje finanční skóre je ${score.total}/100 (${score.grade.label}).
Složky: ${score.components.map(c=>c.label+' '+c.score+'/25').join(', ')}.

1. Co táhne skóre dolů nejvíce?
2. **Top 3 akce** pro zlepšení skóre – seřazené dle dopadu
3. Realisticky – na jaké skóre se mohu dostat za 3 měsíce?
4. Co udělat jako první tento týden?`,

    receipts: receipts.length > 0
      ? `${ctx}

Mám naskenováno ${receipts.length} účtenek.
Top obchody: ${Object.entries(receipts.reduce((a,r)=>{a[r.store||'?']=(a[r.store||'?']||0)+(r.total||0);return a},{})).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s,v])=>s+': '+fmt(v)+' Kč').join(', ')}.

Analyzuj moje nákupní návyky:
1. Kde utrácím nejvíce a je to oprávněné?
2. **Zvýšené výdaje** – vidíš trend zdražování?
3. Kde konkrétně ušetřit (jiný obchod, jiné produkty)?
4. Jak se moje nákupní chování liší od průměru ČR?`
      : `${ctx}\n\nNemám naskenované účtenky. Poraď mi co funkce analýzy účtenek přinese a jak ji využít.`,

    retirement: `${ctx}

Poraď mi ohledně finančních cílů:
1. **Finanční rezerva** – mám dost? Kolik chybí?
2. **Důchod** – při mých příjmech a spoření – jak si stojím?
3. **Finanční nezávislost** – kdy ji dosáhnu při současném tempu?
4. **Investiční doporučení** – ETF, akcie, nebo spořicí účet?
5. **Konkrétní plán** – co udělat tento měsíc jako první krok`,
  };

  const labels = {
    analyze:'📊 Analýza výdajů', savings:'💰 Úspory & rezerva',
    budget:'⚠️ Varování & predikce', predict:'🔮 AI predikce',
    debts:'💳 Snowball vs Avalanche', reserve:'🛡 Finanční rezerva',
    simulate:'📈 Simulace spoření', score:'🏆 Zlepšit skóre',
    receipts:'📸 Z účtenek', retirement:'🎯 Cíle & důchod'
  };

  addAiMsg('user', labels[type]);
  if(curPage !== 'ai') showPageByName('ai');
  const log = document.getElementById('aiChatLog');
  const thinking = document.createElement('div');
  thinking.className = 'ai-msg ai-msg-thinking';
  thinking.textContent = '✦ Analyzuji tvá data...';
  log.appendChild(thinking); log.scrollTop = log.scrollHeight;
  const btn = document.getElementById('aiSendBtn'); if(btn) btn.disabled=true;
  const reply = await callClaude(prompts[type]);
  log.removeChild(thinking); if(btn) btn.disabled=false;
  if(reply) { _aiChatHistory.push({role:'user',content:labels[type]},{role:'assistant',content:reply}); addAiMsg('assistant',reply); }
}

// Proaktivní analýza po přihlášení
async function aiProactiveCheck() {
  const token = await getAuthToken();
  if(!token) return;
  const D = getData();
  const txs = getTx(S.curMonth, S.curYear, D);
  if(txs.length < 3) return; // nedostatek dat

  const ctx = buildFinanceContext();
  const score = computeFinancialScore(D);
  const alertEl = document.getElementById('aiProactiveAlert');
  if(!alertEl) return;

  try {
    const reply = await callClaude(
      `${ctx}\n\nProvéď rychlou kontrolu (max 2 věty). Identifikuj JEDINÝ nejdůležitější poznatek nebo varování. Začni přímo poznatkem bez úvodu. Formát: jedna věta co je problém/pozitivum, druhá věta co udělat.`,
      'Odpověz maximálně 2 větami. Buď velmi konkrétní s čísly.'
    );
    if(reply && alertEl) {
      const isWarning = reply.toLowerCase().includes('pozor')||reply.toLowerCase().includes('překro')||reply.toLowerCase().includes('příliš')||reply.toLowerCase().includes('varován');
      alertEl.innerHTML = `<div style="background:${isWarning?'var(--debt-bg)':'var(--income-bg)'};border:1px solid ${isWarning?'rgba(251,191,36,.3)':'rgba(74,222,128,.2)'};border-radius:10px;padding:10px 14px;display:flex;gap:10px;align-items:flex-start;cursor:pointer" onclick="showPageByName('ai')">
        <span style="font-size:1.2rem;flex-shrink:0">${isWarning?'⚠️':'💡'}</span>
        <div style="flex:1">
          <div style="font-size:.72rem;font-weight:700;color:var(--text3);margin-bottom:2px">AI PORADCE</div>
          <div style="font-size:.82rem;color:var(--text2)">${reply}</div>
        </div>
        <span style="font-size:.72rem;color:var(--text3);flex-shrink:0">Více →</span>
      </div>`;
    }
  } catch(e) { console.log('Proactive check failed:', e); }
}
async function aiCategorizeTx(){
  const name=document.getElementById('aiCatInput').value.trim();if(!name){alert('Zadej název transakce');return;}
  const catNames=S.categories.map(c=>`${c.id}:${c.icon}${c.name}(${c.type})`).join(', ');
  const res=await callClaude(`Mám tyto kategorie: ${catNames}\n\nZařaď transakci "${name}" do nejlepší kategorie. Odpověz POUZE JSON: {"catId":"...", "catName":"...", "subcat":"...", "confidence":"high/mid/low", "reason":"..."}`, 'Odpovídej pouze validním JSON bez markdown bloků.');
  const el=document.getElementById('aiCatResult');if(!el)return;
  if(!res){el.innerHTML='';return;}
  try{
    const j=JSON.parse(res.replace(/```json|```/g,'').trim());
    const cat=S.categories.find(c=>c.id===j.catId);
    const confColor=j.confidence==='high'?'var(--income)':j.confidence==='mid'?'var(--debt)':'var(--text3)';
    el.innerHTML=`<div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border)"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:1.1rem">${cat?.icon||'📋'}</span><strong>${j.catName}</strong>${j.subcat?`<span style="color:var(--text3);font-size:.78rem">→ ${j.subcat}</span>`:''}<span style="margin-left:auto;font-size:.72rem;color:${confColor}">${j.confidence==='high'?'✓ Jistý':j.confidence==='mid'?'~ Pravděpodobný':'? Nejistý'}</span></div><div style="font-size:.76rem;color:var(--text3)">${j.reason}</div><button class="btn btn-accent btn-sm" style="margin-top:8px" onclick="applyAiCat('${j.catId}','${(j.subcat||'').replace(/'/g,"\\'")}')">✓ Použít</button></div>`;
  }catch(e){el.innerHTML=`<div style="color:var(--text3);font-size:.8rem">Nepodařilo se zpracovat odpověď. Zkus znovu.</div>`;}
}
function applyAiCat(catId,subcat){selCatId=catId;selSub=subcat;openAddTx();setTimeout(()=>{renderCatPicker();},100);}

// ══════════════════════════════════════════════════════
