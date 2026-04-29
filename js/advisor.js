// ══════════════════════════════════════════════════════
//  REPORT PRO FINANČNÍHO PORADCE – FinanceFlow v6.51
//  TODO-059 · Záložka "📋 Poradce" v Měsíčním reportu
// ══════════════════════════════════════════════════════

let _advisorLoading = false;
let _advisorData    = null; // cache výsledku AI

// ── Vstupní bod – volán z renderReport() v projects.js ──
async function renderAdvisor() {
  const el = document.getElementById('advisorContainer') ||
             document.getElementById('reportContent');
  if (!el) return;

  try {
    const D = getData();
    const data = advisorBuildData(D);
    el.innerHTML = advisorRenderHTML(data);

    // Nakresli grafy po DOM render
    setTimeout(() => {
      try { advisorDrawCashflowChart(data.cashflow12M); } catch(e) { console.warn('cashflow chart err', e); }
      try { advisorDrawExpenseBar(data.expenseStructure); } catch(e) { console.warn('expense bar err', e); }
    }, 60);

    // AI doporučení – načti async
    advisorLoadAI(data, D);
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
      <div style="font-size:1.2rem;font-weight:800;font-family:Syne,sans-serif;color:${d.saldo>=0?'var(--income)':'var(--expense)'}">${d.saldo>=0?'+':''}${fmt(d.saldo)} Kč</div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${savLight} ${d.savPct}% úspor${d.savTrend!==null?` · ${d.savTrend>=0?'↑':'↓'}${Math.abs(d.savTrend)}% vs min.`:''}</div>
    </div>
    <!-- Zadlužení -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${d.dsti!==null&&d.dsti>45?'var(--expense)':d.dsti>35?'var(--debt)':'var(--income)'}">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">🏦 Zadlužení</div>
      <div style="font-size:1rem;font-weight:800;font-family:Syne,sans-serif">${d.dsti !== null ? `DSTI: ${dstiLight} ${d.dsti}%` : '–'}</div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">DTI: ${dtiLight} ${d.dti !== null ? d.dti : '–'} · splátky ${fmt(d.monthlyPayments)} Kč/měs</div>
    </div>
    <!-- Rezerva -->
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;border-left:3px solid ${d.reserveMonths!==null&&d.reserveMonths<3?'var(--expense)':d.reserveMonths<6?'var(--debt)':'var(--income)'}">
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">🛡️ Rezerva</div>
      <div style="font-size:1.2rem;font-weight:800;font-family:Syne,sans-serif;color:${d.reserveMonths!==null&&d.reserveMonths<3?'var(--expense)':d.reserveMonths<6?'var(--debt)':'var(--income)'}">${d.reserveMonths !== null ? d.reserveMonths : '–'} měs.</div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${resLight} ${fmt(d.totalWallet)} Kč · doporučeno 6 měs.</div>
    </div>
  </div>

  <!-- Net Worth karta – celá šířka -->
  ${d.nw ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div>
      <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">📈 Net Worth – Čisté jmění</div>
      <div style="font-size:1.5rem;font-weight:800;font-family:Syne,sans-serif;color:${d.nw.netWorth>=0?'var(--income)':'var(--expense)'}">${fmtP(d.nw.netWorth)} Kč</div>
    </div>
    <div style="display:flex;gap:14px;font-size:.78rem">
      <div style="text-align:center"><div style="font-weight:700;color:var(--income)">${fmtP(d.nw.totalAssets)} Kč</div><div style="color:var(--text3)">Aktiva</div></div>
      <div style="text-align:center"><div style="font-weight:700;color:var(--bank)">${fmtP(d.nw.totalWallets)} Kč</div><div style="color:var(--text3)">Hotovost</div></div>
      <div style="text-align:center"><div style="font-weight:700;color:var(--expense)">−${fmtP(d.nw.totalDebts)} Kč</div><div style="color:var(--text3)">Závazky</div></div>
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
                  <td style="padding:7px 8px;text-align:right;color:var(--expense)">${fmtP(debt.remaining||0)} Kč</td>
                  <td style="padding:7px 8px;text-align:right">${fmtP(debt.payment||0)} Kč</td>
                  <td style="padding:7px 8px;text-align:right;color:${(debt.interest||0)>8?'var(--expense)':'var(--text2)'}">${debt.interest||0} %</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr style="background:var(--surface3)">
                <td style="padding:7px 8px;font-weight:700">Celkem</td>
                <td style="padding:7px 8px;text-align:right;font-weight:700;color:var(--expense)">${fmtP(d.totalDebt)} Kč</td>
                <td style="padding:7px 8px;text-align:right;font-weight:700">${fmtP(d.monthlyPayments)} Kč</td>
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
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${fmt(d.totalWallet)} Kč celkem · při výdajích ${fmt(d.exp)} Kč/měs</div>
        </div>
        <!-- Peněženky seznam -->
        ${d.wallets.slice(0,4).map(w => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:.78rem">
            <span style="color:var(--text2)">${w.icon||'💳'} ${w.name}</span>
            <strong>${fmtP(w.balance||0)} Kč</strong>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 5. TRENDY – progress příjmů / výdajů / úspor -->
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
        <div style="font-size:1.2rem;margin-bottom:8px">🤖</div>
        <div style="font-size:.82rem;color:var(--text3);margin-bottom:12px">Analyzuji tvé finance...</div>
        <div style="display:flex;justify-content:center"><div class="ai-msg-thinking" style="font-size:.8rem;padding:8px 16px;border-radius:10px;background:var(--surface3)">✦ Připravuji doporučení...</div></div>
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
    <div style="font-size:.92rem;font-weight:800;font-family:Syne,sans-serif;color:${color}">${fmt(cur)} Kč</div>
    <div style="font-size:.72rem;color:${trendColor};margin:3px 0">${arrow} ${pct !== null ? Math.abs(pct)+'%' : 'bez dat'}</div>
    <!-- Mini progress -->
    <div style="height:4px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-top:6px">
      <div style="height:100%;width:${curPct}%;background:${color};border-radius:3px;opacity:.8"></div>
    </div>
    <div style="height:4px;background:var(--surface3);border-radius:3px;overflow:hidden;margin-top:3px;opacity:.4">
      <div style="height:100%;width:${prevPct}%;background:${color};border-radius:3px"></div>
    </div>
    <div style="font-size:.64rem;color:var(--text3);margin-top:3px">min. ${fmt(prev)} Kč</div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  GRAFY
// ══════════════════════════════════════════════════════
function advisorDrawCashflowChart(data) {
  const canvas = document.getElementById('advisorCashflowCanvas'); if (!canvas) return;
  const W = canvas.parentElement.clientWidth || 320;
  canvas.width = W; canvas.height = 120;
  const ctx = canvas.getContext('2d');
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
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const maxV = data[0].value;
  const total = data.reduce((s,d) => s+d.value, 0);
  const barW = W - 110;

  data.forEach((d, i) => {
    const y    = i * 26 + 4;
    const barL = Math.round((d.value / maxV) * barW);
    const pct  = total > 0 ? Math.round(d.value/total*100) : 0;

    // Label
    ctx.fillStyle = 'rgba(168,173,196,.85)'; ctx.font = '9px Instrument Sans';
    ctx.textAlign = 'right';
    ctx.fillText(`${d.icon} ${d.name.slice(0,10)}`, 96, y+13);

    // Bar
    ctx.fillStyle = d.color + '33';
    ctx.fillRect(100, y+2, barW, 16);
    ctx.fillStyle = d.color + 'cc';
    ctx.fillRect(100, y+2, barL, 16);

    // Value + pct
    ctx.fillStyle = 'rgba(168,173,196,.9)'; ctx.textAlign = 'left';
    ctx.fillText(`${fmt(d.value)} Kč  ${pct}%`, 100 + barL + 5, y+13);
  });
}

// ══════════════════════════════════════════════════════
//  AI DOPORUČENÍ (async)
// ══════════════════════════════════════════════════════
async function advisorLoadAI(data, D) {
  const box = document.getElementById('advisorAIBox'); if (!box) return;
  if (_advisorLoading) return;
  _advisorLoading = true;

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
    `${b.name}: ${fmtP(b.remaining||0)} Kč, splátka ${fmtP(b.payment||0)} Kč/měs, úrok ${b.interest||0}%`
  ).join('\n');

  const trendStr = d.cashflow12M.slice(-6).map(m =>
    `${m.label}: příjmy ${fmt(m.inc)}, výdaje ${fmt(m.exp)}, saldo ${fmt(m.saldo)}`
  ).join('\n');

  const assetsStr = d.nw ? `Aktiva: ${fmtP(d.nw.totalAssets)} Kč\nHotovost: ${fmtP(d.nw.totalWallets)} Kč\nZávazky: ${fmtP(d.nw.totalDebts)} Kč\nČisté jmění: ${fmtP(d.nw.netWorth)} Kč` : 'Aktiva: nejsou zadána';

  return `FINANČNÍ PROFIL KLIENTA (${CZ_M[d.curM]} ${d.curY}):

CASHFLOW:
Příjmy: ${fmt(d.inc)} Kč | Výdaje: ${fmt(d.exp)} Kč | Saldo: ${fmt(d.saldo)} Kč
Míra úspor: ${d.savPct}% | Základní příjem (prům. 3M): ${fmt(d.baseInc)} Kč

ZADLUŽENÍ:
DSTI: ${d.dsti ?? 'N/A'}% (limit ČNB 45%) | DTI: ${d.dti ?? 'N/A'} (limit ČNB 9×)
Celkový dluh: ${fmtP(d.totalDebt)} Kč | Měsíční splátky: ${fmt(d.monthlyPayments)} Kč
${debtsStr || 'Žádné závazky'}

REZERVA:
${fmt(d.totalWallet)} Kč = ${d.reserveMonths ?? '?'} měsíců výdajů (doporučeno min. 6)

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
