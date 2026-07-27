// FinanceFlow · v9.17 · coicop.js · 2026-07-25
// COICOP agregace – COMPUTE oddělený od renderu. Roll-up SKUTEČNÝCH výdajů uživatele
// z položek účtenek na jemné COICOP úrovně (podtřída 01.1, třída 01.11, kód 01.113)
// přes productGroupLookup z produktové DB.
//   coicopSubclassTotals(month,year) – sumy po úrovních za měsíc (Komunitní přehled, fáze 2)
//   coicopBreakdown(items)           – struktura sekce→podskupiny pro zobrazení (fáze 3)
//   coicopBreakdownCard(items)       – hotová HTML karta (render, fáze 3)

// Cena řádku položky = price × qty (staré záznamy: price = cena/ks → fallback × qty||1).
// S17.13 (FIX-211, Milan): preferuj lineTotal (skutečně zaplaceno vč. slev) – dřív se počítalo
// vždy price×qty, takže slevy se ignorovaly a součty nesouhlasily se zbytkem Analýzy účtenek.
function _coicopLineTotal(it){
  if(it && it.lineTotal != null) return parseFloat(it.lineTotal) || 0;
  return (parseFloat(it && it.price) || 0) * (parseFloat(it && it.qty) || 1);
}
function _coicopSub(code){ const m = String(code||'').match(/^(\d{2})\.(\d)/);  return m ? (m[1]+'.'+m[2]) : ''; }   // 01.113 → 01.1
function _coicopClass(code){ const m = String(code||'').match(/^(\d{2})\.(\d)(\d)/); return m ? (m[1]+'.'+m[2]+'.'+m[3]) : ''; } // 01.113 → 01.1.1 (formát ČSÚ tabulky)

// Jádro: roll-up nad polem položek. Vrací sumy po úrovních + matched/unmatched.
function _coicopRollupItems(items){
  const out = { sub:{}, cls:{}, code:{}, matched:0, unmatched:0, items:0 };
  if(typeof productGroupLookup !== 'function') return out;
  (items || []).forEach(it => {
    const amt = _coicopLineTotal(it);
    if(amt <= 0) return;
    out.items++;
    const hit = productGroupLookup(it.name || '');
    if(hit && hit.code){
      out.code[hit.code] = (out.code[hit.code] || 0) + amt;
      const s = _coicopSub(hit.code);   if(s) out.sub[s] = (out.sub[s] || 0) + amt;
      const c = _coicopClass(hit.code); if(c) out.cls[c] = (out.cls[c] || 0) + amt;
      out.matched += amt;
    } else {
      out.unmatched += amt;
    }
  });
  ['sub','cls','code'].forEach(k => Object.keys(out[k]).forEach(code => { out[k][code] = Math.round(out[k][code]); }));
  out.matched = Math.round(out.matched); out.unmatched = Math.round(out.unmatched);
  return out;
}

// Položky z účtenek (S.receipts) za období (month 0–11, year). Vynechané = všechna data.
function _coicopItemsFor(month, year){
  const receipts = (typeof S !== 'undefined' && Array.isArray(S.receipts)) ? S.receipts : [];
  const ym = (month != null && year != null) ? (year + '-' + String(month + 1).padStart(2, '0')) : null;
  const items = [];
  receipts.forEach(r => { if(ym && String(r.date || '').slice(0, 7) !== ym) return; (r.items || []).forEach(it => items.push(it)); });
  return items;
}

// FÁZE 2: sumy po úrovních za měsíc (používá Komunitní přehled).
function coicopSubclassTotals(month, year){ return _coicopRollupItems(_coicopItemsFor(month, year)); }
window.coicopSubclassTotals = coicopSubclassTotals;

// FÁZE 3: struktura sekce → podskupiny pro zobrazení. items vynechané = všechna data.
function coicopBreakdown(items){
  const src = items || _coicopItemsFor();
  const t = _coicopRollupItems(src);
  const G = (typeof COICOP_GROUPS_DEF !== 'undefined') ? COICOP_GROUPS_DEF : [];
  const sections = {};
  Object.keys(t.sub).forEach(code => {
    const secNum = parseInt(code.slice(0, 2), 10);
    const g = G.find(x => x.id === secNum);
    if(!sections[secNum]) sections[secNum] = { id: secNum, name: g ? g.name : ('Oddíl ' + secNum), icon: g ? g.icon : '📦', color: g ? g.color : '#8b90a8', total: 0, subs: [] };
    const label = g && (g.groups || []).find(l => l.split(' ')[0] === code);
    const name = label ? label.split(' ').slice(1).join(' ') : code;
    sections[secNum].subs.push({ code, name, amount: t.sub[code] });
    sections[secNum].total += t.sub[code];
  });
  const arr = Object.values(sections).sort((a, b) => b.total - a.total);
  arr.forEach(s => s.subs.sort((a, b) => b.amount - a.amount));
  return { sections: arr, matched: t.matched, unmatched: t.unmatched, items: t.items };
}
window.coicopBreakdown = coicopBreakdown;

// FÁZE 3: hotová HTML karta (render). Vrací '' když nejsou data.
function coicopBreakdownCard(items){
  if(typeof fmt !== 'function') return '';
  const b = coicopBreakdown(items);
  const total = b.matched + b.unmatched;
  // S17.15 (FIX-214, Milan): DŘÍV se při prázdných datech vrátil prázdný řetězec → po přepnutí
  // na „Tento měsíc" bez účtenek zmizela CELÁ karta včetně přepínače a nešlo se přepnout zpět.
  // Nově se vždy vykreslí hlavička s přepínačem + prázdný stav.
  const _emptyBody = '<div style="font-size:.78rem;color:#a8aec8;padding:14px 0;line-height:1.5">V tomto období nejsou žádné naskenované položky. Přepni na <strong>∞ Vše</strong>, nebo naskenuj účtenku.</div>';
  if(!b.sections.length && !b.unmatched) return _coicopCardShell(_emptyBody);
  const rows = b.sections.map(s => {
    const w = total > 0 ? Math.round(s.total / total * 100) : 0;
    const subs = s.subs.map(sub =>
      '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text2);padding:2px 0 2px 26px">'
      + '<span>' + sub.name + '</span><span style="font-weight:600">' + fmt(sub.amount) + ' Kč</span></div>'
    ).join('');
    return '<div style="margin-bottom:11px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
      +   '<span style="font-size:.84rem;font-weight:600;display:flex;align-items:center;gap:6px">'
      +     '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:' + s.color + ';font-size:.7rem">' + s.icon + '</span> ' + s.name + '</span>'
      +   '<span style="font-weight:700;color:var(--text)">' + fmt(s.total) + ' Kč</span></div>'
      + '<div style="height:6px;background:rgba(139,144,168,.15);border-radius:4px;overflow:hidden;margin-bottom:3px"><div style="height:100%;width:' + w + '%;background:' + s.color + ';border-radius:4px"></div></div>'
      + subs + '</div>';
  }).join('');
  const unm = b.unmatched > 0
    ? '<div style="display:flex;justify-content:space-between;font-size:.78rem;color:#a8aec8;border-top:1px solid var(--border);padding-top:8px;margin-top:4px"><span>❓ Nezařazeno (DB netrefila)</span><span>' + fmt(b.unmatched) + ' Kč</span></div>'
    : '';
  return _coicopCardShell(rows + unm);
}

// S17.15 (FIX-214): sdílený obal karty – hlavička s přepínačem období musí být
// dostupná i v prázdném stavu, jinak se z režimu „Tento měsíc" nedá vrátit zpět.
function _coicopCardShell(bodyHtml){
  return '<div class="card" style="margin-bottom:14px">'
    + '<div class="card-header"><span class="card-title">🧾 Co nakupuješ – z účtenek</span>'
      + '<span style="display:flex;gap:4px">'
      + ['month','all'].map(function(p){
          var on = (window._coicopPeriod||'all') === p;
          var lbl = p==='month' ? '📅 Tento měsíc' : '∞ Vše';
          return '<button onclick="coicopSetPeriod(\''+p+'\')" style="padding:3px 9px;border-radius:7px;font-size:.7rem;font-weight:600;cursor:pointer;border:1px solid '+(on?'rgba(139,124,246,.5)':'var(--border)')+';background:'+(on?'rgba(139,124,246,.14)':'transparent')+';color:'+(on?'#b9aefc':'#a8aec8')+'">'+lbl+'</button>';
        }).join('')
      + '</span></div>'
    + '<div class="card-body">'
    + '<div style="font-size:.72rem;color:#a8aec8;margin-bottom:10px"><strong>Jen naskenované položky z účtenek</strong>, zařazené podle oficiálních skupin ČSÚ – '
      + ((window._coicopPeriod||'all')==='month'
          ? 'jen <strong>' + ((typeof CZ_M!=='undefined'&&typeof S!=='undefined')?(CZ_M[S.curMonth]+' '+S.curYear):'zvolený měsíc') + '</strong>.'
          : '<strong>celá historie</strong> účtenek (ne jen zvolený měsíc).')
      + ' Nepokrývá výdaje bez účtenky (nájem, splátky, benzín) – ty najdeš v <strong>Jak utrácíš proti průměru</strong>, která počítá ze všech transakcí jako měsíční průměr. Proto se čísla obou tabulek liší.</div>'
    + bodyHtml + '</div></div>';
}

window.coicopBreakdownCard = coicopBreakdownCard;

// S17.13 (FIX-211, Milan): přepínač období pro COICOP kartu. Dřív karta ignorovala zvolený
// měsíc (dostávala vždy VŠECHNY položky), takže přepínání měsíců v hlavičce nic nedělalo.
function coicopSetPeriod(p){
  window._coicopPeriod = p;
  if(typeof renderUctenky === 'function') renderUctenky();
  else if(typeof renderPage === 'function') renderPage();
}
window.coicopSetPeriod = coicopSetPeriod;
