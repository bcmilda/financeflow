// FinanceFlow · v8.97 · advisor.js · 2026-07-02
// ══════════════════════════════════════════════════════
//  REPORT PRO FINANČNÍHO PORADCE – FinanceFlow v6.51
//  TODO-059 · Záložka "📋 Poradce" v Měsíčním reportu
// ══════════════════════════════════════════════════════

let _advisorLoading = false;
let _advisorData    = null; // cache výsledku AI
let _advisorLastSig = null; // Session 10: anti-flicker – podpis dat posledního renderu

// ── Vstupní bod – volán z renderReport() v projects.js ──
async function renderAdvisor() {
  const el = document.getElementById('advisorContainer') ||
             document.getElementById('reportContent');
  if (!el) return;

  try {
    const D = getData();
    const data = advisorBuildData(D);

    // Session 10 FIX: anti-flicker. renderAdvisor() se spouští i z Firebase
    // onValue listeneru (renderPage) při každé synchronizaci dat. Pokud se
    // relevantní data nezměnila, přeskočíme re-render → konec problikávání.
    const sig = JSON.stringify({
      m:data.curM, y:data.curY, inc:data.inc, exp:data.exp,
      nd:(data.debts||[]).length, nw:data.nw?.netWorth,
      tw:data.totalWallet, p:_reportPeriod
    });
    if (_advisorLastSig === sig && el.querySelector('#advisorAIBox')) {
      return; // nic se nezměnilo, neblikej
    }
    _advisorLastSig = sig;

    el.innerHTML = advisorRenderHTML(data);

    // Nakresli grafy po DOM render
    setTimeout(() => {
      try { advisorDrawCashflowChart(data.cashflow12M); } catch(e) { console.warn('cashflow chart err', e); }
      try { advisorDrawExpenseBar(data.expenseStructure); } catch(e) { console.warn('expense bar err', e); }
      try { renderHealthScoreChart(data); } catch(e) { console.warn('health chart err', e); }
    }, 60);

    // Session 10 FIX: AI doporučení se NEVOLÁ automaticky. Uživatel ho spustí
    // tlačítkem (advisorAIBox obsahuje tlačítko "Vygenerovat doporučení").
    // Pokud už máme výsledek v cache pro stejný měsíc, zobrazíme ho.
    if (_advisorData && _advisorData.sig === sig) {
      const box = document.getElementById('advisorAIBox');
      if (box) advisorShowAIResult(box, _advisorData.text);
    }
  } catch(e) {
    console.error('renderAdvisor error:', e);
    el.innerHTML = `<div style="padding:20px;color:var(--expense)">⚠️ Chyba při načítání reportu: ${e.message}</div>`;
  }
}

// ══════════════════════════════════════════════════════
//  SESTAVENÍ DAT
// ══════════════════════════════════════════════════════
function advisorBuildData(D) {
  const today   = new Date();
  const curM    = S.curMonth, curY = S.curYear;
  const txs     = getTx(curM, curY, D);
  const inc     = incSum(txs), exp = expSum(txs);
  const saldo   = inc - exp;
  const savings = saldo > 0 ? saldo : 0;
  const savPct  = inc > 0 ? Math.round(savings / inc * 100) : 0;

  // Základní příjem (průměr 3 měsíce)
  let baseInc = 0;
  for (let i = 1; i <= 3; i++) {
    let m = curM - i, y = curY; if (m < 0) { m += 12; y--; }
    baseInc += incSum(getTx(m, y, D));
  }
  baseInc = Math.round(baseInc / 3);

  // Předchozí měsíc pro trend
  let pm = curM - 1, py = curY; if (pm < 0) { pm = 11; py--; }
  const prevTxs = getTx(pm, py, D);
  const prevInc = incSum(prevTxs), prevExp = expSum(prevTxs);
  const prevSaldo = prevInc - prevExp;

  // Cashflow trend 12M
  const cashflow12M = [];
  for (let i = 11; i >= 0; i--) {
    let m = curM - i, y = curY; if (m < 0) { m += 12; y--; }
    const t = getTx(m, y, D);
    cashflow12M.push({ label: CZ_M[m].slice(0,3), inc: incSum(t), exp: expSum(t), saldo: incSum(t) - expSum(t) });
  }

  // Struktura výdajů (horizontal bar)
  const expCats = (D.categories||[]).filter(c => c.type==='expense'||c.type==='both');
  const expenseStructure = expCats.map(cat => ({
    name:  cat.name, icon: cat.icon, color: cat.color,
    value: getActual(cat.id, null, curM, curY, D),
  })).filter(c => c.value > 0).sort((a,b) => b.value - a.value).slice(0, 7);

  // Dluhy + DTI / DSTI
  const debts  = D.debts || [];
  const totalDebt = debts.reduce((s,d) => s + (d.remaining||0), 0);
  const monthlyPayments = debts.reduce((s,d) => {
    const f = d.freq||'monthly';
    return s + (f==='weekly'?(d.payment||0)*4.33 : f==='biweekly'?(d.payment||0)*2.17 : (d.payment||0));
  }, 0);
  const avgInterest = debts.length
    ? (debts.reduce((s,d) => s + (d.interest||0), 0) / debts.length).toFixed(1)
    : null;
  const dti  = baseInc > 0 ? Math.round(totalDebt / (baseInc * 12) * 10) / 10 : null;
  const dsti = baseInc > 0 ? Math.round(monthlyPayments / baseInc * 100) : null;

  // Rezerva
  const wallets = D.wallets || [];
  const totalWallet = wallets.reduce((s,w) => s+(w.balance||0), 0);
  const savWallets  = wallets.filter(w => w.type==='savings'||w.type==='investment');
  const savBalance  = savWallets.reduce((s,w) => s+(w.balance||0), 0);
  const reserveMonths = exp > 0 ? Math.round(totalWallet / exp * 10) / 10 : null;

  // Net Worth (z assets.js)
  const nw = typeof computeAssetsNetWorth === "function" ? computeAssetsNetWorth(D) : null;

  // Trend indikátory
  const incTrend  = prevInc  > 0 ? Math.round((inc - prevInc) / prevInc * 100)   : null;
  const expTrend  = prevExp  > 0 ? Math.round((exp - prevExp) / prevExp * 100)   : null;
  const savTrend  = prevSaldo > 0 ? Math.round((saldo - prevSaldo) / prevSaldo * 100) : null;

  // Finanční zdraví skóre
  const scores = typeof computeHealthScores === 'function' ? computeHealthScores(D) : null;

  return {
    curM, curY, inc, exp, saldo, savings, savPct, baseInc,
    prevInc, prevExp, prevSaldo,
    incTrend, expTrend, savTrend,
    cashflow12M, expenseStructure,
    debts, totalDebt, monthlyPayments, avgInterest, dti, dsti,
    wallets, totalWallet, savBalance, reserveMonths,
    nw, scores,
    userName: window._userProfile?.displayName || 'Klient',
    generatedAt: new Date().toLocaleString('cs-CZ'),
  };
}

// ══════════════════════════════════════════════════════
//  HTML RENDER
// ══════════════════════════════════════════════════════
function advisorRenderHTML(d) {
  const score = d.scores?.overall ?? '–';
  const scoreColor = typeof healthColor === 'function' ? healthColor(score) : '#60a5fa';

  // Semafor helper
  const light = (val, ok, warn) => val === null ? '⚪' : val <= ok ? '🟢' : val <= warn ? '🟡' : '🔴';
  const lightInv = (val, ok, warn) => val === null ? '⚪' : val >= ok ? '🟢' : val >= warn ? '🟡' : '🔴';

  const dstiLight = light(d.dsti, 35, 45);
  const dtiLight  = light(d.dti, 700, 900);
  const resLight  = lightInv(d.reserveMonths, 6, 3);
  const savLight  = lightInv(d.savPct, 15, 10);

  return `
  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--text3)">Report pro finančního poradce</div>
      <div style="font-size:1rem;font-weight:700;margin-top:2px">${d.userName} · ${CZ_M[d.curM]} ${d.curY}</div>
      <div style="font-size:.7rem;color:var(--text3)">Vygenerováno: ${d.generatedAt}</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm" onclick="window.print()" style="font-size:.74rem">🖨️ Tisk / PDF</button>
    </div>
  </div>

  <!-- 1. QUICK SUMMARY – 5 karet -->
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px">
    <!-- Finanční zdraví -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${scoreColor}">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">💚 Finanční zdraví</div>
      <div style="font-size:1.5rem;font-weight:800;font-family:Syne,sans-serif;color:${scoreColor}">${score}<span style="font-size:.8rem;color:var(--text3)">/100</span></div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${typeof healthLabel === 'function' ? healthLabel(score) : ''}</div>
    </div>
    <!-- Cashflow -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${d.saldo>=0?'var(--income)':'var(--expense)'}">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">💸 Cashflow</div>
      <div style="font-size:1.2rem;font-weight:800;font-family:Syne,sans-serif;color:${d.saldo>=0?'var(--income)':'var(--expense)'}">${d.saldo>=0?'+':''}${fmtB(d.saldo)}</div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${savLight} ${d.savPct}% úspor${d.savTrend!==null?` · ${d.savTrend>=0?'↑':'↓'}${Math.abs(d.savTrend)}% vs min.`:''}</div>
    </div>
    <!-- Zadlužení -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${d.dsti!==null&&d.dsti>45?'var(--expense)':d.dsti>35?'var(--debt)':'var(--income)'}">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">🏦 Zadlužení</div>
      <div style="font-size:1rem;font-weight:800;font-family:Syne,sans-serif">${d.dsti !== null ? `DSTI: ${dstiLight} ${d.dsti}%` : '–'}</div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">DTI: ${dtiLight} ${d.dti !== null ? d.dti : '–'} · splátky ${fmtB(d.monthlyPayments)}/měs</div>
    </div>
    <!-- Rezerva -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${d.reserveMonths!==null&&d.reserveMonths<3?'var(--expense)':d.reserveMonths<6?'var(--debt)':'var(--income)'}">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">🛡️ Rezerva</div>
      <div style="font-size:1.2rem;font-weight:800;font-family:Syne,sans-serif;color:${d.reserveMonths!==null&&d.reserveMonths<3?'var(--expense)':d.reserveMonths<6?'var(--debt)':'var(--income)'}">${d.reserveMonths !== null ? d.reserveMonths : '–'} měs.</div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${resLight} ${fmtB(d.totalWallet)} · doporučeno 6 měs.</div>
    </div>
  </div>

  <!-- Net Worth karta – celá šířka -->
  ${d.nw ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div>
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">📈 Net Worth – Čisté jmění</div>
      <div style="font-size:1.5rem;font-weight:800;font-family:Syne,sans-serif;color:${d.nw.netWorth>=0?'var(--income)':'var(--expense)'}">${fmtBP(d.nw.netWorth)}</div>
    </div>
    <div style="display:flex;gap:14px;font-size:.78rem">
      <div style="text-align:center"><div style="font-weight:700;color:var(--income)">${fmtBP(d.nw.totalAssets)}</div><div style="color:var(--text3)">Aktiva</div></div>
      <div style="text-align:center"><div style="font-weight:700;color:var(--bank)">${fmtBP(d.nw.totalWallets)}</div><div style="color:var(--text3)">Hotovost</div></div>
      <div style="text-align:center"><div style="font-weight:700;color:var(--expense)">−${fmtBP(d.nw.totalDebts)}</div><div style="color:var(--text3)">Závazky</div></div>
    </div>
  </div>` : ''}

  <!-- 2. GRAFY – Cashflow 12M + Struktura výdajů -->
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">📈 Cashflow – 12 měsíců</div>
    <div class="card">
      <div class="card-body" style="padding:10px 6px">
        <canvas id="advisorCashflowCanvas" height="120" style="width:100%;display:block"></canvas>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:6px;font-size:.68rem">
          <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:3px;background:var(--income);display:inline-block;border-radius:2px"></span>Příjmy</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:3px;background:var(--expense);display:inline-block;border-radius:2px"></span>Výdaje</span>
          <span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:3px;background:var(--bank);display:inline-block;border-radius:2px;border-top:1px dashed var(--bank)"></span>Saldo</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Struktura výdajů – horizontal bar -->
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">🧾 Struktura výdajů</div>
    <div class="card">
      <div class="card-body">
        <canvas id="advisorExpenseCanvas" style="width:100%;display:block"></canvas>
      </div>
    </div>
  </div>

  <!-- 3. DLUHY – tabulka -->
  ${d.debts.length ? `
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">💳 Přehled závazků</div>
    <div class="card">
      <div class="card-body" style="padding:10px">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.76rem">
            <thead>
              <tr style="border-bottom:1px solid var(--border);color:var(--text3)">
                <th style="text-align:left;padding:6px 8px;font-weight:600">Závazek</th>
                <th style="text-align:right;padding:6px 8px;font-weight:600">Zůstatek</th>
                <th style="text-align:right;padding:6px 8px;font-weight:600">Splátka</th>
                <th style="text-align:right;padding:6px 8px;font-weight:600">Úrok</th>
              </tr>
            </thead>
            <tbody>
              ${d.debts.map(debt => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:7px 8px;font-weight:600">${debt.name}</td>
                  <td style="padding:7px 8px;text-align:right;color:var(--expense)">${fmtBP(debt.remaining||0)}</td>
                  <td style="padding:7px 8px;text-align:right">${fmtBP(debt.payment||0)}</td>
                  <td style="padding:7px 8px;text-align:right;color:${(debt.interest||0)>8?'var(--expense)':'var(--text2)'}">${debt.interest||0} %</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--surface3)">
                <td style="padding:7px 8px;font-weight:700">Celkem</td>
                <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--expense)">${fmtBP(d.totalDebt)}</td>
                <td style="padding:7px 8px;text-align:right;font-weight:700">${fmtBP(d.monthlyPayments)}</td>
                <td style="padding:7px 8px;text-align:right;color:var(--text3)">${d.avgInterest ? d.avgInterest+'% prům.' : '–'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <div style="font-size:.74rem;padding:5px 10px;background:var(--surface3);border-radius:8px">DSTI: ${dstiLight} <strong>${d.dsti ?? '–'}%</strong> <span style="color:var(--text3)">(limit ČNB 45%)</span></div>
          <div style="font-size:.74rem;padding:5px 10px;background:var(--surface3);border-radius:8px">DTI: ${dtiLight} <strong>${d.dti ?? '–'}</strong> <span style="color:var(--text3)">(limit ČNB 9×)</span></div>
        </div>
      </div>
    </div>
  </div>` : ''}

  <!-- 4. REZERVA + LIKVIDITA -->
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">🛡️ Rezervy a likvidita</div>
    <div class="card">
      <div class="card-body">
        <!-- Progress bar rezervy -->
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:5px">
            <span>Finanční rezerva</span>
            <strong style="color:${d.reserveMonths!==null&&d.reserveMonths<3?'var(--expense)':d.reserveMonths<6?'var(--debt)':'var(--income)'}">${d.reserveMonths ?? '–'} / 6 měsíců</strong>
          </div>
          <div style="height:10px;background:var(--surface3);border-radius:6px;overflow:hidden;position:relative">
            <div style="height:100%;width:${d.reserveMonths ? Math.min(100, d.reserveMonths/6*100) : 0}%;background:${d.reserveMonths!==null&&d.reserveMonths<3?'var(--expense)':d.reserveMonths<6?'var(--debt)':'var(--income)'};border-radius:6px;transition:width .4s"></div>
            <!-- Cílová čára 6M -->
            <div style="position:absolute;top:0;right:0;width:2px;height:100%;background:var(--text3);opacity:.4"></div>
          </div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${fmtB(d.totalWallet)} celkem · při výdajích ${fmtB(d.exp)}/měs</div>
        </div>
        <!-- Peněženky seznam -->
        ${d.wallets.slice(0,4).map(w => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:.78rem">
            <span style="color:var(--text2)">${w.icon||'💳'} ${w.name}</span>
            <strong>${fmtBP(w.balance||0)}</strong>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 5. GRAF FINANČNÍHO SKÓRE V ČASE – spojnicový graf (rok) -->
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">🏥 Finanční skóre – vývoj za rok</div>
    <div class="card">
      <div class="card-body" style="padding:12px 8px">
        <div id="healthScoreChartContainer">
          <div style="color:var(--text3);font-size:.8rem;padding:16px;text-align:center">Načítám...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 6. TRENDY – progress příjmů / výdajů / úspor -->
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">📊 Trendy (vs. předchozí měsíc)</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${advisorTrendCard('Příjmy', d.inc, d.prevInc, d.incTrend, 'var(--income)')}
      ${advisorTrendCard('Výdaje', d.exp, d.prevExp, d.expTrend, 'var(--expense)', true)}
      ${advisorTrendCard('Úspory', d.savings, Math.max(0,d.prevSaldo), d.savTrend, 'var(--bank)')}
    </div>
  </div>

  <!-- 6. AI DOPORUČENÍ -->
  <div style="margin-bottom:16px">
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px">🤖 AI Doporučení</div>
    <div class="card" id="advisorAIBox">
      <div class="card-body" style="text-align:center;padding:24px">
        <div style="font-size:1.4rem;margin-bottom:8px">🤖</div>
        <div style="font-size:.82rem;color:var(--text3);margin-bottom:14px">Nech si od AI připravit doporučení na míru pro tvou finanční situaci.</div>
        <button class="btn btn-primary" onclick="advisorLoadAI(advisorBuildData(getData()), getData())" style="font-size:.82rem">✨ Vygenerovat AI doporučení</button>
        <div style="font-size:.68rem;color:var(--text3);margin-top:8px">Doporučení se vygeneruje pouze na vyžádání</div>
      </div>
    </div>
  </div>

  <!-- Print styles (inline) -->
  <style>
    @media print {
      .sidebar, .top-bar, .fab, nav, .btn, #advisorAIBox button { display: none !important; }
      .page { padding: 0 !important; }
      body { background: white !important; color: black !important; }
      .card { border: 1px solid #ddd !important; box-shadow: none !important; }
    }
  </style>`;
}

// ── Trend karta helper ──
function advisorTrendCard(label, cur, prev, pct, color, invertColor) {
  const arrow = pct === null ? '→' : pct > 5 ? '↑' : pct < -5 ? '↓' : '→';
  const trendColor = pct === null ? 'var(--text3)'
    : invertColor
      ? (pct > 5 ? 'var(--expense)' : pct < -5 ? 'var(--income)' : 'var(--text3)')
      : (pct > 5 ? 'var(--income)' : pct < -5 ? 'var(--expense)' : 'var(--text3)');

  // Progress bar: aktuální vs předchozí
  const max = Math.max(cur, prev, 1);
  const curPct = Math.round(cur / max * 100);
  const prevPct = Math.round(prev / max * 100);

  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:10px">
    <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px">${label}</div>
    <div style="font-size:.92rem;font-weight:800;font-family:Syne,sans-serif;color:${color}">${fmtB(cur)}</div>
    <div style="font-size:.72rem;color:${trendColor};margin:3px 0">${arrow} ${pct !== null ? Math.abs(pct)+'%' : 'bez dat'}</div>
    <!-- Mini progress -->
    <div style="height:4px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-top:6px">
      <div style="height:100%;width:${curPct}%;background:${color};border-radius:3px;opacity:.8"></div>
    </div>
    <div style="height:4px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-top:3px;opacity:.4">
      <div style="height:100%;width:${prevPct}%;background:${color};border-radius:3px"></div>
    </div>
    <div style="font-size:.64rem;color:var(--text3);margin-top:3px">min. ${fmtB(prev)}</div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  GRAFY
// ══════════════════════════════════════════════════════
function advisorDrawCashflowChart(data) {
  const canvas = document.getElementById('advisorCashflowCanvas'); if (!canvas) return;
  const W = canvas.parentElement.clientWidth || 320;
  // S16.15 (Milan): canvas bez devicePixelRatio = ROZMAZANÉ písmo na HiDPI → render v nativním rozlišení
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W*dpr; canvas.height = 120*dpr;
  canvas.style.width = W+'px'; canvas.style.height = '120px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  const n = data.length;
  const pad = { l:40, r:10, t:12, b:22 };
  const cW = W - pad.l - pad.r, cH = 120 - pad.t - pad.b;

  const allVals = data.flatMap(d => [d.inc, d.exp]);
  const maxV = Math.max(...allVals, 1);

  const xf = i => pad.l + (i / (n-1)) * cW;
  const yf = v => pad.t + cH - (v / maxV) * cH;

  // Gridlines
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
  [0.25, 0.5, 0.75, 1].forEach(f => {
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + cH*(1-f)); ctx.lineTo(W-pad.r, pad.t + cH*(1-f)); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Příjmy – zelená area
  ctx.beginPath();
  data.forEach((d,i) => i===0 ? ctx.moveTo(xf(i), yf(d.inc)) : ctx.lineTo(xf(i), yf(d.inc)));
  ctx.lineTo(xf(n-1), yf(0)); ctx.lineTo(xf(0), yf(0)); ctx.closePath();
  ctx.fillStyle = 'rgba(74,222,128,.12)'; ctx.fill();
  ctx.beginPath();
  data.forEach((d,i) => i===0 ? ctx.moveTo(xf(i), yf(d.inc)) : ctx.lineTo(xf(i), yf(d.inc)));
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5; ctx.stroke();

  // Výdaje – červená area
  ctx.beginPath();
  data.forEach((d,i) => i===0 ? ctx.moveTo(xf(i), yf(d.exp)) : ctx.lineTo(xf(i), yf(d.exp)));
  ctx.lineTo(xf(n-1), yf(0)); ctx.lineTo(xf(0), yf(0)); ctx.closePath();
  ctx.fillStyle = 'rgba(248,113,113,.08)'; ctx.fill();
  ctx.beginPath();
  data.forEach((d,i) => i===0 ? ctx.moveTo(xf(i), yf(d.exp)) : ctx.lineTo(xf(i), yf(d.exp)));
  ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5; ctx.stroke();

  // Saldo – modrá přerušovaná linka
  ctx.beginPath(); ctx.setLineDash([4,3]);
  data.forEach((d,i) => {
    const sy = pad.t + cH - (Math.max(0, d.saldo) / maxV) * cH;
    i===0 ? ctx.moveTo(xf(i), sy) : ctx.lineTo(xf(i), sy);
  });
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.setLineDash([]);

  // X labels
  ctx.fillStyle = 'rgba(168,173,196,.7)'; ctx.font = '8px Instrument Sans'; ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(n/6));
  data.forEach((d,i) => { if(i%step===0||i===n-1) ctx.fillText(d.label, xf(i), 120-6); });

  // Y labels
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(168,173,196,.6)';
  [0.5, 1].forEach(f => {
    const v = Math.round(maxV * f);
    ctx.fillText(v>=1000 ? Math.round(v/1000)+'k' : v, pad.l-3, pad.t + cH*(1-f) + 3);
  });
}

function advisorDrawExpenseBar(data) {
  const canvas = document.getElementById('advisorExpenseCanvas'); if (!canvas || !data.length) return;
  const W   = canvas.parentElement.clientWidth || 320;
  const H   = data.length * 26 + 10;
  const dpr = window.devicePixelRatio || 1;   // S16.15: DPR fix (rozmazané popisky v barech)
  canvas.width = W*dpr; canvas.height = H*dpr;
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  const maxV = data[0].value;
  const total = data.reduce((s,d) => s+d.value, 0);
  const barW = W - 110;

  data.forEach((d, i) => {
    const y    = i * 26 + 4;
    const barL = Math.round((d.value / maxV) * barW);
    const pct  = total > 0 ? Math.round(d.value/total*100) : 0;

    // Label
    ctx.fillStyle = 'rgba(168,173,196,.85)'; ctx.font = '10px Instrument Sans';
    ctx.textAlign = 'right';
    ctx.fillText(`${d.icon} ${d.name.slice(0,10)}`, 96, y+13);

    // Bar
    ctx.fillStyle = d.color + '33';
    ctx.fillRect(100, y+2, barW, 16);
    ctx.fillStyle = d.color + 'cc';
    ctx.fillRect(100, y+2, barL, 16);

    // Value + pct
    ctx.fillStyle = 'rgba(168,173,196,.9)'; ctx.textAlign = 'left';
    ctx.fillText(`${fmt(czkToBase(d.value))} ${curSym()}  ${pct}%`, 100 + barL + 5, y+13);
  });
}

// ══════════════════════════════════════════════════════
//  AI DOPORUČENÍ (async)
// ══════════════════════════════════════════════════════
async function advisorLoadAI(data, D) {
  if(typeof gateFeature==='function' && !gateFeature('aiRadce','AI Rádce')) return; // S12.1p: Premium
  const box = document.getElementById('advisorAIBox'); if (!box) return;
  if (_advisorLoading) return;
  _advisorLoading = true;

  // Session 10: zobraz loader hned po kliknutí (dříve to dělal auto-render)
  box.innerHTML = `<div class="card-body" style="text-align:center;padding:24px">
    <div style="font-size:1.2rem;margin-bottom:8px">🤖</div>
    <div style="font-size:.82rem;color:var(--text3);margin-bottom:12px">Analyzuji tvé finance...</div>
    <div style="display:flex;justify-content:center"><div class="ai-msg-thinking" style="font-size:.8rem;padding:8px 16px;border-radius:10px;background:var(--surface3)">✦ Připravuji doporučení...</div></div>
  </div>`;

  try {
    const token = await getAuthToken();
    if (!token) { advisorShowAIError(box, 'Nepřihlášen'); return; }

    const context = advisorBuildAIContext(data, D);

    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ type: 'advisor_report', payload: { context } })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const text = json.content?.[0]?.text || json.recommendations || '';

    if (!text) throw new Error('Prázdná odpověď');
    // Session 10: ulož do cache s podpisem aktuálních dat → po re-renderu se
    // zobrazí bez nového API volání.
    _advisorData = {
      sig: JSON.stringify({
        m:data.curM, y:data.curY, inc:data.inc, exp:data.exp,
        nd:(data.debts||[]).length, nw:data.nw?.netWorth,
        tw:data.totalWallet, p:_reportPeriod
      }),
      text
    };
    advisorShowAIResult(box, text);
  } catch(e) {
    console.error('advisorLoadAI error', e);
    advisorShowAIError(box, e.message);
  } finally {
    _advisorLoading = false;
  }
}

function advisorBuildAIContext(d, D) {
  const debtsStr = d.debts.map(b =>
    `${b.name}: ${fmtBP(b.remaining||0)}, splátka ${fmtBP(b.payment||0)}/měs, úrok ${b.interest||0}%`
  ).join('\n');

  const trendStr = d.cashflow12M.slice(-6).map(m =>
    `${m.label}: příjmy ${fmt(m.inc)}, výdaje ${fmt(m.exp)}, saldo ${fmt(m.saldo)}`
  ).join('\n');

  const assetsStr = d.nw ? `Aktiva: ${fmtBP(d.nw.totalAssets)}\nHotovost: ${fmtBP(d.nw.totalWallets)}\nZávazky: ${fmtBP(d.nw.totalDebts)}\nČisté jmění: ${fmtBP(d.nw.netWorth)}` : 'Aktiva: nejsou zadána';

  return `FINANČNÍ PROFIL KLIENTA (${CZ_M[d.curM]} ${d.curY}):

CASHFLOW:
Příjmy: ${fmtB(d.inc)} | Výdaje: ${fmtB(d.exp)} | Saldo: ${fmtB(d.saldo)}
Míra úspor: ${d.savPct}% | Základní příjem (prům. 3M): ${fmtB(d.baseInc)}

ZADLUŽENÍ:
DSTI: ${d.dsti ?? 'N/A'}% (limit ČNB 45%) | DTI: ${d.dti ?? 'N/A'} (limit ČNB 9×)
Celkový dluh: ${fmtBP(d.totalDebt)} | Měsíční splátky: ${fmtB(d.monthlyPayments)}
${debtsStr || 'Žádné závazky'}

REZERVA:
${fmtB(d.totalWallet)} = ${d.reserveMonths ?? '?'} měsíců výdajů (doporučeno min. 6)

MAJETEK:
${assetsStr}

FINANČNÍ ZDRAVÍ: ${d.scores?.overall ?? '?'}/100

TREND (posledních 6 měsíců):
${trendStr}`;
}

function advisorShowAIResult(box, text) {
  // Parsuj JSON pokud ho AI vrátí, jinak zobraz jako markdown
  let recommendations = [];
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
    recommendations = parsed.recommendations || parsed;
  } catch { recommendations = null; }

  if (Array.isArray(recommendations) && recommendations.length) {
    box.innerHTML = `<div class="card-body">
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:10px">🤖 AI Doporučení pro poradce</div>
      ${recommendations.map((r, i) => `
        <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:24px;height:24px;border-radius:50%;background:${i===0?'rgba(248,113,113,.2)':i===1?'rgba(251,191,36,.2)':'rgba(96,165,250,.2)'};display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0;color:${i===0?'var(--expense)':i===1?'var(--debt)':'var(--bank)'}">P${i+1}</div>
          <div>
            <div style="font-size:.82rem;font-weight:700;margin-bottom:2px">${r.title||r}</div>
            ${r.detail ? `<div style="font-size:.76rem;color:var(--text3)">${r.detail}</div>` : ''}
            ${r.saving ? `<div style="font-size:.74rem;color:var(--income);margin-top:2px">💰 ${r.saving}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
  } else {
    // Fallback – markdown render
    box.innerHTML = `<div class="card-body">
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:10px">🤖 AI Doporučení</div>
      <div style="font-size:.8rem;line-height:1.65;color:var(--text2)">
        ${text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^#{1,3}\s+(.+)$/gm,'<div style="font-weight:700;margin:8px 0 4px">$1</div>').replace(/^[-•]\s+(.+)$/gm,'<div style="padding:3px 0 3px 12px;border-left:2px solid var(--bank)">$1</div>').replace(/\n\n/g,'<br>').replace(/\n/g,'<br>')}
      </div>
    </div>`;
  }
}

function advisorShowAIError(box, msg) {
  box.innerHTML = `<div class="card-body" style="text-align:center;padding:20px">
    <div style="font-size:.8rem;color:var(--text3)">⚠️ AI doporučení nelze načíst</div>
    <div style="font-size:.72rem;color:var(--text3);margin-top:4px">${msg}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="advisorLoadAI(advisorBuildData(getData()), getData())">Zkusit znovu</button>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  GRAF FINANČNÍHO SKÓRE V ČASE – TODO-088 (Session 10)
//  Spojnicový graf: osa X = měsíce, osa Y = skóre (vyšší = výš).
//  V Poradci vždy 12 měsíců (rok), nebo max. dostupný počet.
// ══════════════════════════════════════════════════════
function renderHealthScoreChart(data) {
  const container = document.getElementById('healthScoreChartContainer');
  if (!container) return;
  const D = getData();

  // Poradce zobrazuje vždy 12 měsíců (rok). Jinde respektuje _reportPeriod.
  const periodMap = { '7D':1, '1M':1, '3M':3, '6M':6, '12M':12, 'advisor':12 };
  const n = periodMap[typeof _reportPeriod !== 'undefined' ? _reportPeriod : '12M'] || 12;

  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    let m = S.curMonth - i, y = S.curYear;
    while (m < 0) { m += 12; y--; }
    const txs = getTx(m, y, D);
    const inc = incSum(txs), exp = expSum(txs);
    // Session 10 FIX: sjednoceno s kruhy/tabulkou – computeHealthScores().overall
    const score = (typeof computeHealthScores === 'function')
      ? computeHealthScores(D, m, y).overall
      : advisorMonthScore(inc, exp, D);
    months.push({ m, y, score, label: CZ_M[m].slice(0, 3) });
  }

  // Pokud žádná data (n=1 a prázdné) – fallback
  if (!months.length) { container.innerHTML = '<div style="color:var(--text3);font-size:.8rem;padding:16px;text-align:center">Žádná data</div>'; return; }

  container.innerHTML = `<canvas id="healthScoreCanvas" style="width:100%;display:block"></canvas>`;
  setTimeout(() => drawHealthScoreLineChart('healthScoreCanvas', months), 30);
}

function drawHealthScoreLineChart(canvasId, months) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const parent = canvas.parentElement;
  let W = parent.getBoundingClientRect().width || parent.clientWidth || 320;
  if (W < 50) W = 320;
  const n = months.length;
  // Session 10: hybridní graf – KRUHY S ČÍSLY propojené spojnicovou čarou
  // (dle náčrtu uživatele). Vyšší skóre = kruh výš. Osa Y 0–100 vlevo.
  const ringR = n > 8 ? 16 : n > 4 ? 22 : 28;          // poloměr kruhu
  const H = n > 8 ? 220 : 240;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  // Posun grafu výš (menší horní padding) + místo vlevo pro osu Y s popisky
  const axisW = 26;
  const padL = axisW + ringR + 6, padR = ringR + 12, padT = ringR + 6, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  // Osa Y: gridlines + popisky 0/25/50/75/100
  ctx.lineWidth = 1;
  ctx.font = '10px Instrument Sans';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = 0; v <= 100; v += 25) {
    const y = padT + plotH * (1 - v / 100);
    ctx.strokeStyle = v === 0 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.05)';
    ctx.beginPath(); ctx.moveTo(padL - ringR, y); ctx.lineTo(W - padR + ringR, y); ctx.stroke();
    ctx.fillStyle = 'rgba(168,173,196,.6)';
    ctx.fillText(v, axisW + 2, y);
  }
  // svislá osa Y
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath(); ctx.moveTo(padL - ringR, padT); ctx.lineTo(padL - ringR, padT + plotH); ctx.stroke();

  const xAt = i => n === 1 ? W / 2 : padL + plotW * (i / (n - 1));
  const yAt = s => padT + plotH * (1 - Math.max(0, Math.min(100, s)) / 100);
  const colorFor = s => (typeof healthColor === 'function')
    ? healthColor(s)
    : (s >= 71 ? '#4ade80' : s >= 41 ? '#fbbf24' : '#f87171');

  // 1) Spojnicová čára mezi STŘEDY kruhů (kreslí se první, pod kruhy)
  if (n > 1) {
    ctx.strokeStyle = 'rgba(96,165,250,.85)';
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    months.forEach((mo, i) => {
      const x = xAt(i), y = yAt(mo.score);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // 2) Kruhy s čísly (mini health ring) v každém bodě
  months.forEach((mo, i) => {
    const x = xAt(i), y = yAt(mo.score);
    const color = colorFor(mo.score);
    const lw = Math.max(3, ringR * 0.22);

    // pozadí kruhu (vyplň ať čára nepřesvítá střed)
    ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.fillStyle = 'var(--surface)'; // canvas nezná CSS var → fallback níže
    ctx.fillStyle = '#161a2b';
    ctx.fill();

    // prstenec pozadí
    ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = lw; ctx.stroke();

    // oblouk dle skóre
    ctx.beginPath();
    ctx.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + (mo.score / 100) * Math.PI * 2);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();

    // číslo uprostřed
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.round(ringR * 0.78)}px Syne, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mo.score, x, y);

    // popisek měsíce dole
    ctx.fillStyle = 'rgba(168,173,196,.75)';
    ctx.font = '10px Instrument Sans';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(mo.label, x, H - 10);
  });
}

function advisorMonthScore(inc, exp, D) {
  if (inc === 0) return 0;
  const savRate = Math.max(0, (inc - exp) / inc);
  // 50 bodů za úspory > 0, +50 za optimální míru (>20%)
  let score = savRate > 0 ? Math.min(50, Math.round(savRate * 250)) : 0;
  // Bonus za rezervu: pokud má peněženky > 3M výdajů
  const walletTotal = (D.wallets || []).reduce((s, w) => s + (w.balance || 0), 0);
  if (exp > 0 && walletTotal / exp >= 3) score += 30;
  else if (exp > 0 && walletTotal / exp >= 1) score += 15;
  // Bonus za žádné dluhy
  const debts = (D.debts || []);
  if (!debts.length) score += 20;
  return Math.min(100, Math.round(score));
}

// Session 10: drawHealthRing() odstraněna z advisor.js – byla to mrtvá kopie po
// nahrazení kruhů spojnicovým grafem (v7.08) a navíc PŘEPISOVALA verzi z projects.js
// jinými prahy barev (≥75/≥50 vs healthColor ≥71/≥41) → kruh „Celkové zdraví" měl
// jinou barvu než textový štítek. Sjednoceno – používá se jen projects.js verze.
