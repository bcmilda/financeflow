// ══════════════════════════════════════════════════════
//  DONATE – Stripe Payment Link integrace (TODO-073)
// ══════════════════════════════════════════════════════
//
// Architektura:
//   - Žádný backend kód, žádné API klíče v klientovi
//   - Otevírá se hosted Stripe Payment Link s prefilled částkou
//   - Stripe sbírá email a posílá účtenku automaticky
//
// Setup v Stripe Dashboard (jednorázově):
//   1. Vytvoř Product "Donate FinanceFlow" s ceníkem typu "Customer chooses price" (CZK)
//   2. Vytvoř Payment Link nad tímto product:
//      - "Collect customer info" → Email: required
//      - "After payment" → Confirmation page (s odkazem zpět) nebo Custom URL
//      - "Limits" → Min. 20 Kč
//   3. Zkopíruj výsledný link URL (např. https://buy.stripe.com/test_abc123)
//   4. Vlož do DONATE_PAYMENT_LINK níže (test pro test mode, live pro produkci)
//
// Prefill částky:
//   ?prefilled_amount=10000 → 100 Kč (částka je v haléřích!)
//   Tento parametr funguje POUZE pokud má Payment Link "Customer chooses price"
//
// Prefill email (volitelně):
//   ?prefilled_email=mail@x.cz – ale my email nesbíráme předem, takže ne
// ══════════════════════════════════════════════════════

// ⚠️ NAHRADIT TĚMITO REÁLNÝMI URL Z STRIPE DASHBOARD
const DONATE_PAYMENT_LINK_TEST = 'https://buy.stripe.com/test_REPLACE_ME';
const DONATE_PAYMENT_LINK_LIVE = 'https://buy.stripe.com/REPLACE_ME';

// Přepínač test/live podle prostředí (firebase.app = live, jinak test)
function getDonateLink() {
  const isLive = location.hostname.includes('financeflow-a249c.web.app') ||
                 location.hostname.includes('financeflow-a249c.firebaseapp.com');
  return isLive ? DONATE_PAYMENT_LINK_LIVE : DONATE_PAYMENT_LINK_TEST;
}

// Stav modalu
let _donateSelectedAmt = null;  // číslo v Kč nebo null

// Otevřít modal
function openDonateModal() {
  _donateSelectedAmt = null;
  // Reset UI
  document.querySelectorAll('.donate-amt-btn').forEach(b => b.classList.remove('sel'));
  const customWrap = document.getElementById('donateCustomWrap');
  if (customWrap) customWrap.style.display = 'none';
  const customInput = document.getElementById('donateCustomAmt');
  if (customInput) customInput.value = '';
  const errEl = document.getElementById('donateError');
  if (errEl) errEl.style.display = 'none';
  // Defaultní výběr 200 Kč
  const defaultBtn = document.querySelector('.donate-amt-btn[data-amt="200"]');
  if (defaultBtn) selectDonateAmt(defaultBtn, 200);
  document.getElementById('modalDonate').classList.add('open');
}

// Výběr částky (kliknutí na tlačítko)
function selectDonateAmt(btn, amt) {
  // Reset všech
  document.querySelectorAll('.donate-amt-btn').forEach(b => {
    b.classList.remove('sel');
    b.style.background = '';
    b.style.color = '';
  });
  // Označit vybraný
  btn.classList.add('sel');

  const customWrap = document.getElementById('donateCustomWrap');
  if (amt === 'custom') {
    customWrap.style.display = 'block';
    const inp = document.getElementById('donateCustomAmt');
    inp.focus();
    _donateSelectedAmt = parseInt(inp.value) || null;
  } else {
    customWrap.style.display = 'none';
    _donateSelectedAmt = amt;
  }
  updateDonateBtn();
}

// Aktualizace stavu hlavního tlačítka podle vybrané částky
function updateDonateBtn() {
  const btn = document.getElementById('donateGoBtn');
  const errEl = document.getElementById('donateError');
  if (!btn) return;

  // Pro custom čteme aktuální hodnotu
  const customWrap = document.getElementById('donateCustomWrap');
  if (customWrap && customWrap.style.display !== 'none') {
    const v = parseInt(document.getElementById('donateCustomAmt').value) || 0;
    _donateSelectedAmt = v;
  }

  let valid = false;
  if (_donateSelectedAmt && _donateSelectedAmt >= 20 && _donateSelectedAmt <= 100000) {
    valid = true;
    btn.textContent = `Pokračovat na platbu ${_donateSelectedAmt} Kč →`;
    if (errEl) errEl.style.display = 'none';
  } else if (_donateSelectedAmt && _donateSelectedAmt < 20) {
    btn.textContent = 'Pokračovat na platbu…';
    if (errEl) { errEl.textContent = 'Minimální částka je 20 Kč.'; errEl.style.display = 'block'; }
  } else if (_donateSelectedAmt && _donateSelectedAmt > 100000) {
    btn.textContent = 'Pokračovat na platbu…';
    if (errEl) { errEl.textContent = 'Maximální částka je 100 000 Kč. Pro vyšší dary mě kontaktuj.'; errEl.style.display = 'block'; }
  } else {
    btn.textContent = 'Pokračovat na platbu…';
  }

  btn.disabled = !valid;
  btn.style.opacity = valid ? '1' : '.5';
  btn.style.cursor = valid ? 'pointer' : 'not-allowed';
}

// Přesměrování na Stripe Payment Link
function startDonate() {
  if (!_donateSelectedAmt || _donateSelectedAmt < 20 || _donateSelectedAmt > 100000) return;

  const link = getDonateLink();
  if (!link || link.includes('REPLACE_ME')) {
    const errEl = document.getElementById('donateError');
    if (errEl) {
      errEl.textContent = '⚠️ Stripe Payment Link ještě není nakonfigurován. Kontaktuj autora.';
      errEl.style.display = 'block';
    }
    console.error('[Donate] Payment Link URL není nastaven – uprav DONATE_PAYMENT_LINK_TEST/LIVE v donate.js');
    return;
  }

  // Stripe prefilled_amount je v nejmenších jednotkách měny (haléře pro CZK)
  const amountInHaler = _donateSelectedAmt * 100;
  // Client reference ID pro dohledání platby (uid pokud je přihlášen)
  const clientRef = (window._currentUser && window._currentUser.uid) ? window._currentUser.uid : 'anon';

  const url = `${link}?prefilled_amount=${amountInHaler}&client_reference_id=${encodeURIComponent(clientRef)}`;

  // Logování (volitelné – Sentry breadcrumb pokud je k dispozici)
  if (typeof Sentry !== 'undefined' && Sentry.addBreadcrumb) {
    try {
      Sentry.addBreadcrumb({ category: 'donate', message: `Redirect to Stripe`, level: 'info', data: { amount: _donateSelectedAmt } });
    } catch(e) {}
  }
  console.log('[Donate] Redirect to Stripe with amount:', _donateSelectedAmt, 'Kč');

  // Zavřít modal před přesměrováním
  closeModal('modalDonate');

  // Otevřít v nové záložce – uživatel se může vrátit
  window.open(url, '_blank', 'noopener,noreferrer');
}
