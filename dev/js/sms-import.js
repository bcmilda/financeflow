// ══════════════════════════════════════════════════════
//  SMS / NOTIFIKACE IMPORT – FinanceFlow v6.37
// ══════════════════════════════════════════════════════
// Parsuje textové notifikace z bank:
// Revolut, George (Erste), Moneta, KB, ČSOB, Air Bank,
// mBank, Fio, Google Pay, Apple Pay, PayPal

// ── Regex pravidla pro každou banku ──
const BANK_PARSERS = [

  // ── REVOLUT ──────────────────────────────────────────
  // "You spent €12.50 at McDonald's"
  // "Platba €8.99 v Netflix"
  // "Přijato €500.00 od Jan"
  {
    bank: 'Revolut',
    icon: '🔵',
    patterns: [
      {
        re: /(?:You spent|Platba|Zaplaceno)\s+([€$£]|CZK|Kč|EUR|USD)\s*([\d\s,.]+)\s+(?:at|v|u|na)\s+(.+?)(?:\.|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[2]),
          currency: normCurrency(m[1]),
          merchant: m[3].trim(),
        })
      },
      {
        re: /(?:You received|Přijato|Obdrženo)\s+([€$£]|CZK|Kč|EUR|USD)\s*([\d\s,.]+)\s+(?:from|od)\s+(.+?)(?:\.|$)/i,
        parse: m => ({
          type: 'income',
          amount: parseCzNum(m[2]),
          currency: normCurrency(m[1]),
          merchant: m[3].trim(),
        })
      },
      {
        // "Revolut: -250 CZK ALBERT"
        re: /Revolut[:\s]+([+-])\s*([\d\s,.]+)\s*(CZK|EUR|USD|GBP|Kč)\s+(.+?)(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: m[1] === '-' ? 'expense' : 'income',
          amount: parseCzNum(m[2]),
          currency: normCurrency(m[3]),
          merchant: m[4].trim(),
        })
      },
    ]
  },

  // ── GEORGE (Erste / Česká spořitelna) ────────────────
  // "Platba kartou 1 250 Kč ALBERT DÁREK"
  // "George: Platba 450 Kč Shell"
  // "Odešla platba 15 000 Kč"
  {
    bank: 'George',
    icon: '🟢',
    patterns: [
      {
        re: /(?:George[:\s]*)?Platba\s+karton?u?\s+([\d\s,.]+)\s*Kč\s+(.+?)(?:\s*\||\s*Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
      {
        re: /(?:George[:\s]*)?(?:Platba|Odešla platba)\s+([\d\s,.]+)\s*Kč(?:\s+(.+?))?(?:\s*\||\s*Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: (m[2] || '').trim() || 'Platba kartou',
        })
      },
      {
        re: /(?:George[:\s]*)?Příchozí\s+platba\s+([\d\s,.]+)\s*Kč(?:\s+od\s+(.+?))?(?:\s*\||\s*Zůstatek|$)/i,
        parse: m => ({
          type: 'income',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: (m[2] || 'Příchozí platba').trim(),
        })
      },
    ]
  },

  // ── MONETA MONEY BANK ─────────────────────────────────
  // "MONETA: Platba kartou 320 Kč TESCO STORES"
  // "MONETA: Vklad 5 000 Kč"
  {
    bank: 'Moneta',
    icon: '🔴',
    patterns: [
      {
        re: /MONETA[:\s]+Platba\s+karton?u?\s+([\d\s,.]+)\s*Kč\s+(.+?)(?:\s*\||\s*Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
      {
        re: /MONETA[:\s]+(?:Vklad|Příchozí)\s+([\d\s,.]+)\s*Kč(?:\s+(.+?))?(?:\s*\||\s*Zůstatek|$)/i,
        parse: m => ({
          type: 'income',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: (m[2] || 'Příchozí platba').trim(),
        })
      },
    ]
  },

  // ── KOMERČNÍ BANKA (KB) ───────────────────────────────
  // "KB: Platba 780 Kč PENNY MARKET"
  // "KB Alert: Příchozí platba 50 000 Kč"
  {
    bank: 'KB',
    icon: '🟡',
    patterns: [
      {
        re: /KB(?:\s+Alert)?[:\s]+Platba\s+([\d\s,.]+)\s*Kč\s+(.+?)(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
      {
        re: /KB(?:\s+Alert)?[:\s]+Příchozí\s+platba\s+([\d\s,.]+)\s*Kč(?:\s+od\s+(.+?))?(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: 'income',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: (m[2] || 'Příchozí platba').trim(),
        })
      },
      {
        // "KB: -1 250 Kč LIDL"
        re: /KB[:\s]+([+-])([\d\s,.]+)\s*Kč\s+(.+?)(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: m[1] === '-' ? 'expense' : 'income',
          amount: parseCzNum(m[2]),
          currency: 'CZK',
          merchant: m[3].trim(),
        })
      },
    ]
  },

  // ── ČSOB ─────────────────────────────────────────────
  {
    bank: 'ČSOB',
    icon: '🔷',
    patterns: [
      {
        re: /ČSOB[:\s]+(?:Platba|Výběr)\s+([\d\s,.]+)\s*(?:Kč|CZK)\s+(.+?)(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
      {
        re: /ČSOB[:\s]+Příchozí\s+([\d\s,.]+)\s*(?:Kč|CZK)(?:\s+od\s+(.+?))?(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: 'income',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: (m[2] || 'Příchozí platba').trim(),
        })
      },
    ]
  },

  // ── AIR BANK ─────────────────────────────────────────
  {
    bank: 'Air Bank',
    icon: '🩵',
    patterns: [
      {
        re: /Air\s*Bank[:\s]+(?:Zaplatili jste|Platba)\s+([\d\s,.]+)\s*Kč\s+(.+?)(?:\s*\.|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
    ]
  },

  // ── MBANK ─────────────────────────────────────────────
  {
    bank: 'mBank',
    icon: '🟠',
    patterns: [
      {
        re: /mBank[:\s]+(?:Platba|Transakce)\s+([\d\s,.]+)\s*(?:Kč|PLN|EUR)\s+(.+?)(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
    ]
  },

  // ── GOOGLE PAY ───────────────────────────────────────
  // "Google Pay: Zaplaceno 249 Kč v Lidl"
  // "Platba Google Pay 1 450 Kč ALBERT"
  {
    bank: 'Google Pay',
    icon: '🔵',
    patterns: [
      {
        re: /Google\s*Pay[:\s]+(?:Zaplaceno|Platba)\s+([\d\s,.]+)\s*(?:Kč|EUR|CZK)\s+(?:v\s+|u\s+|na\s+)?(.+?)(?:\s*\.|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
      {
        re: /Platba\s+Google\s*Pay\s+([\d\s,.]+)\s*(?:Kč|EUR)\s+(.+?)(?:\s+Zůstatek|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
    ]
  },

  // ── APPLE PAY ────────────────────────────────────────
  {
    bank: 'Apple Pay',
    icon: '⚫',
    patterns: [
      {
        re: /Apple\s*Pay[:\s]+(?:Platba|Payment)\s+([\d\s,.]+)\s*(?:Kč|EUR|CZK|USD)\s+(?:at\s+|v\s+)?(.+?)(?:\s*\.|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: 'CZK',
          merchant: m[2].trim(),
        })
      },
    ]
  },

  // ── PAYPAL ───────────────────────────────────────────
  {
    bank: 'PayPal',
    icon: '🔵',
    patterns: [
      {
        re: /(?:Poslali jste|You sent)\s+([\d\s,.]+)\s*([A-Z]{3})\s+(?:to|na|příjemci)\s+(.+?)(?:\s*\.|$)/i,
        parse: m => ({
          type: 'expense',
          amount: parseCzNum(m[1]),
          currency: normCurrency(m[2]),
          merchant: m[3].trim(),
        })
      },
      {
        re: /(?:Obdrželi jste|You received)\s+([\d\s,.]+)\s*([A-Z]{3})\s+(?:from|od)\s+(.+?)(?:\s*\.|$)/i,
        parse: m => ({
          type: 'income',
          amount: parseCzNum(m[1]),
          currency: normCurrency(m[2]),
          merchant: m[3].trim(),
        })
      },
    ]
  },

  // ── OBECNÝ FALLBACK ──────────────────────────────────
  // Zachytí jakýkoli formát s částkou a Kč
  {
    bank: 'Bankovní notifikace',
    icon: '🏦',
    patterns: [
      {
        re: /([+-]?\s*[\d\s]{1,10}[,.]\d{2}|\d[\d\s]{0,8})\s*(?:Kč|CZK)\s+(.{3,40}?)(?:\s+Zůstatek|\s*$)/i,
        parse: m => {
          const raw = m[1].trim();
          const isNeg = raw.startsWith('-');
          return {
            type: isNeg ? 'expense' : 'expense', // default expense pro neznámé
            amount: parseCzNum(raw.replace(/^[+-]/, '')),
            currency: 'CZK',
            merchant: m[2].trim(),
            uncertain: true,
          };
        }
      },
    ]
  },
];

// ── Pomocné funkce ──
function parseCzNum(str) {
  if (!str) return 0;
  // "1 250,50" nebo "1250.50" nebo "1 250"
  return parseFloat(
    String(str)
      .replace(/\s/g, '')
      .replace(',', '.')
  ) || 0;
}

function normCurrency(str) {
  const map = { '€': 'EUR', '$': 'USD', '£': 'GBP', 'Kč': 'CZK', 'kč': 'CZK' };
  return map[str] || str?.toUpperCase() || 'CZK';
}

// ── Merchanty → kategorie ──
const MERCHANT_CATEGORIES = {
  // Supermarkety
  'albert': 'cat1', 'lidl': 'cat1', 'kaufland': 'cat1', 'tesco': 'cat1',
  'penny': 'cat1', 'globus': 'cat1', 'billa': 'cat1', 'coop': 'cat1',
  'rohlík': 'cat1', 'košík': 'cat1', 'rohlik': 'cat1',
  // Doprava
  'shell': 'cat2', 'omv': 'cat2', 'benzina': 'cat2', 'mol': 'cat2',
  'čepro': 'cat2', 'mhd': 'cat2', 'dpp': 'cat2', 'cd': 'cat2',
  'bolt': 'cat2', 'uber': 'cat2', 'liftago': 'cat2',
  // Bydlení
  'nájem': 'cat3', 'čez': 'cat3', 'eon': 'cat3', 'innogy': 'cat3',
  'o2': 'cat3', 't-mobile': 'cat3', 'vodafone': 'cat3',
  // Zdraví
  'benu': 'cat4', 'dr.max': 'cat4', 'lékárna': 'cat4', 'pharmacy': 'cat4',
  // Zábava
  'netflix': 'cat5', 'spotify': 'cat5', 'hbo': 'cat5', 'disney': 'cat5',
  'kino': 'cat5', 'cinema': 'cat5',
  // Restaurace (→ zábava / jídlo)
  'mcdonald': 'cat1', 'kfc': 'cat1', 'burger': 'cat1', 'pizza': 'cat1',
  'starbucks': 'cat1', 'kavárna': 'cat1',
};

function guessCategoryFromMerchant(merchant) {
  const m = merchant.toLowerCase();
  for (const [key, catId] of Object.entries(MERCHANT_CATEGORIES)) {
    if (m.includes(key)) return catId;
  }
  return null;
}

// ══════════════════════════════════════════════════════
//  HLAVNÍ PARSER
// ══════════════════════════════════════════════════════
function parseBankNotification(text) {
  if (!text || text.trim().length < 5) return null;

  for (const bankDef of BANK_PARSERS) {
    for (const rule of bankDef.patterns) {
      const match = text.match(rule.re);
      if (match) {
        const result = rule.parse(match);
        if (!result || !result.amount || result.amount <= 0) continue;

        const catId = guessCategoryFromMerchant(result.merchant || '');
        const D = getData();
        const cat = catId ? (D.categories||[]).find(c => c.id === catId) : null;

        return {
          bank:     bankDef.bank,
          bankIcon: bankDef.icon,
          type:     result.type,
          amount:   Math.round(result.amount * 100) / 100,
          currency: result.currency || 'CZK',
          merchant: result.merchant || 'Neznámý',
          catId:    catId || '',
          catName:  cat?.name || '',
          catIcon:  cat?.icon || '📋',
          date:     new Date().toISOString().slice(0, 10),
          uncertain: result.uncertain || false,
          raw:      text.trim().slice(0, 200),
        };
      }
    }
  }
  return null;
}

// Parsování více notifikací najednou (odřádkované nebo oddělené ---)
function parseMultipleNotifications(text) {
  const blocks = text
    .split(/\n{2,}|---+|\n(?=[A-Z])/g)
    .map(b => b.trim())
    .filter(b => b.length > 8);

  const results = [];
  for (const block of blocks) {
    const parsed = parseBankNotification(block);
    if (parsed) results.push(parsed);
  }
  return results;
}

// ══════════════════════════════════════════════════════
//  UI – RENDER
// ══════════════════════════════════════════════════════
let _smsResults = [];
let _smsSelected = new Set();

function renderSmsImport() {
  const el = document.getElementById('smsContent'); if (!el) return;
  el.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div style="font-weight:600;font-size:.88rem;margin-bottom:6px">📱 Vložit notifikaci z banky</div>
      <div style="font-size:.76rem;color:var(--text3);margin-bottom:10px;line-height:1.5">
        Zkopíruj text SMS nebo push notifikace z banky a vlož sem. Podporujeme:<br>
        <span style="color:var(--text2)">Revolut · George · Moneta · KB · ČSOB · Air Bank · Google Pay · Apple Pay · PayPal</span>
      </div>
      <textarea class="fta" id="smsInput" rows="5"
        placeholder="Např: George: Platba kartou 1 250 Kč ALBERT PŘEROV | Zůstatek: 12 450 Kč

Nebo více notifikací najednou (oddělené prázdným řádkem):

Revolut: -320 CZK SHELL BENZINA
KB Alert: Platba 180 Kč McDONALD S"
        style="margin-bottom:8px"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="smsParseInput()" style="flex:1">🔍 Rozpoznat transakce</button>
        <button class="btn btn-ghost" onclick="document.getElementById('smsInput').value='';document.getElementById('smsResults').innerHTML=''">✕ Vymazat</button>
      </div>
    </div>

    <!-- Příklady formátů -->
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:.76rem;font-weight:600;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Příklady formátů</div>
      <div style="display:grid;gap:6px">
        ${[
          ['🔵 Revolut', 'Platba €12.50 v McDonald\'s'],
          ['🟢 George', 'George: Platba kartou 450 Kč Shell | Zůstatek 8 200 Kč'],
          ['🟡 KB', 'KB Alert: Platba 1 250 Kč PENNY MARKET Zůstatek 15 400 Kč'],
          ['🔵 Google Pay', 'Google Pay: Zaplaceno 89 Kč v Spotify'],
        ].map(([bank, example]) => `
          <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;cursor:pointer"
            onclick="document.getElementById('smsInput').value='${example.replace(/'/g, "\\'")}';smsParseInput()">
            <div style="font-size:.72rem;font-weight:700;color:var(--text3);margin-bottom:2px">${bank}</div>
            <div style="font-size:.78rem;color:var(--text2);font-family:monospace">${example}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Výsledky -->
    <div id="smsResults"></div>
  `;
}

function smsParseInput() {
  const text = document.getElementById('smsInput')?.value || '';
  if (!text.trim()) return;

  const results = parseMultipleNotifications(text);
  _smsResults = results;
  _smsSelected = new Set(results.map((_, i) => i));

  renderSmsResults(results);
}

function renderSmsResults(results) {
  const el = document.getElementById('smsResults'); if (!el) return;

  if (!results.length) {
    el.innerHTML = `<div class="insight-item bad" style="margin-bottom:10px">
      <div class="insight-icon">❌</div>
      <div class="insight-text">Nepodařilo se rozpoznat transakci. Zkus jiný formát nebo zapiš ručně.</div>
    </div>`;
    return;
  }

  const D = getData();
  const cats = D.categories || [];

  el.innerHTML = `
    <div style="font-size:.76rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px">
      Rozpoznáno ${results.length} ${results.length === 1 ? 'transakce' : results.length < 5 ? 'transakce' : 'transakcí'}
    </div>
    ${results.map((r, i) => `
      <div class="card" style="margin-bottom:8px;border-left:3px solid ${r.type==='income'?'var(--income)':'var(--expense)'}">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <input type="checkbox" id="sms-chk-${i}" ${_smsSelected.has(i)?'checked':''} 
            onchange="smsToggle(${i},this.checked)"
            style="margin-top:3px;flex-shrink:0;width:16px;height:16px;accent-color:var(--income)">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
              <span style="font-size:.75rem;padding:2px 8px;border-radius:5px;background:${r.type==='income'?'var(--income-bg)':'var(--expense-bg)'};color:${r.type==='income'?'var(--income)':'var(--expense)'};font-weight:700">
                ${r.type==='income'?'+ Příjem':'− Výdaj'}
              </span>
              <span style="font-size:.72rem;color:var(--text3)">${r.bankIcon} ${r.bank}</span>
              ${r.uncertain ? `<span style="font-size:.68rem;color:var(--debt);background:rgba(251,191,36,.1);padding:1px 6px;border-radius:4px">⚠️ Neistota</span>` : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;margin-bottom:8px">
              <div>
                <div style="font-weight:700;font-size:.95rem">${fmtP(r.amount)} ${r.currency !== 'CZK' ? r.currency : 'Kč'}</div>
                <div style="font-size:.8rem;color:var(--text2);margin-top:2px">${r.merchant}</div>
              </div>
              <div style="font-size:.78rem;color:var(--text3)">${r.date}</div>
            </div>
            <!-- Kategorie picker -->
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
              <select class="fs" id="sms-cat-${i}" style="font-size:.76rem;padding:4px 8px;flex:1;min-width:120px"
                onchange="smsUpdateCat(${i},this.value)">
                <option value="">📂 Kategorie...</option>
                ${cats.filter(c => c.type === r.type || c.type === 'both').map(c =>
                  `<option value="${c.id}" ${c.id === r.catId ? 'selected' : ''}>${c.icon} ${c.name}</option>`
                ).join('')}
              </select>
              <input class="fi" id="sms-name-${i}" value="${r.merchant}" 
                style="font-size:.76rem;padding:4px 8px;flex:1;min-width:100px" placeholder="Název">
            </div>
          </div>
        </div>
      </div>
    `).join('')}

    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-accent" onclick="smsImportSelected()" style="flex:1">
        ✅ Přidat vybrané (${_smsSelected.size}) do transakcí
      </button>
      <button class="btn btn-ghost btn-sm" onclick="smsSelectAll()">Vše</button>
    </div>
  `;
}

function smsToggle(idx, checked) {
  if (checked) _smsSelected.add(idx);
  else _smsSelected.delete(idx);
}

function smsUpdateCat(idx, catId) {
  if (_smsResults[idx]) _smsResults[idx].catId = catId;
}

function smsSelectAll() {
  _smsSelected = new Set(_smsResults.map((_, i) => i));
  _smsResults.forEach((_, i) => {
    const chk = document.getElementById('sms-chk-' + i);
    if (chk) chk.checked = true;
  });
}

function smsImportSelected() {
  if (viewingUid) return;
  if (!_smsSelected.size) { alert('Vyber alespoň jednu transakci'); return; }

  const D = getData();
  let added = 0;

  for (const idx of _smsSelected) {
    const r = _smsResults[idx]; if (!r) continue;

    // Přečti aktuální hodnoty z UI
    const catEl = document.getElementById('sms-cat-' + idx);
    const nameEl = document.getElementById('sms-name-' + idx);
    const catId = catEl?.value || r.catId || '';
    const name = nameEl?.value.trim() || r.merchant || 'Neznámý';

    // Konverze měny pokud není CZK (hrubá konverze)
    let amt = r.amount;
    if (r.currency === 'EUR') amt = Math.round(amt * 25);
    else if (r.currency === 'USD') amt = Math.round(amt * 23);
    else if (r.currency === 'GBP') amt = Math.round(amt * 29);

    const tx = {
      id:     Date.now() + idx,
      type:   r.type,
      name,
      amount: amt,
      amt,
      catId,
      category: catId,
      date:   r.date,
      note:   `📱 Importováno z ${r.bank}`,
    };

    if (!S.transactions) S.transactions = [];
    S.transactions.push(tx);
    added++;
  }

  if (added > 0) {
    save();
    const inp = document.getElementById('smsInput');
    if (inp) inp.value = '';
    document.getElementById('smsResults').innerHTML = `
      <div class="insight-item good" style="margin-bottom:10px">
        <div class="insight-icon">✅</div>
        <div class="insight-text"><strong>${added} transakce přidány</strong> do záznamu. Zobrazit v <span style="cursor:pointer;color:var(--bank);text-decoration:underline" onclick="showPage('transakce',null)">Transakcích</span>.</div>
      </div>`;
    _smsResults = [];
    _smsSelected.clear();
    renderPage();
  }
}

