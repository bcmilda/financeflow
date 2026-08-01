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
const DONATE_PAYMENT_LINK_LIVE = 'https://buy.stripe.com/9B6bJ2db3950cD58JxcfK06';

// FIX-065 (Session 8): Premium SUBSCRIPTION Payment Links (recurring monthly/yearly).
// V Stripe Dashboard vytvoř SEPARÁTNÍ Product "FinanceFlow Premium" s recurring price:
//   - Monthly: 99 Kč / měsíc
//   - Yearly: 999 Kč / rok (úspora 2 měsíce)
// Customer Portal aktivuj v Stripe Dashboard → Settings → Customer Portal,
// aby uživatel mohl předplatné zrušit bez kontaktu s tebou.
const PREMIUM_MONTHLY_LINK_TEST = 'https://buy.stripe.com/test_REPLACE_ME_MONTHLY';
const PREMIUM_MONTHLY_LINK_LIVE = 'https://buy.stripe.com/6oU28s1sl1Cy5aD2l9cfK04';   // 149 Kč/měs
// S17.27 (Milan): ZAKLÁDAJÍCÍ CENA – 99 Kč/měs pro prvních 100 uživatelů.
// Ve Stripe je to SAMOSTATNÝ Payment Link nad samostatnou cenou 99 Kč (ne kupón), protože
// zakládající cena má platit NAVŽDY – kupón by po X měsících vypršel a cena by skočila na 149.
const PREMIUM_FOUNDER_LINK_TEST = 'https://buy.stripe.com/test_REPLACE_ME_FOUNDER';
const PREMIUM_FOUNDER_LINK_LIVE = 'https://buy.stripe.com/14A14ofjb4OKeLdgbZcfK01';   // 99 Kč/měs (zakládající)
// S17.30 (Milan): zakládající ROČNÍ varianta – 990 Kč/rok pro stejných 100 míst.
const PREMIUM_FOUNDER_YEARLY_LINK_TEST = 'https://buy.stripe.com/test_REPLACE_ME_FOUNDER_YEARLY';
const PREMIUM_FOUNDER_YEARLY_LINK_LIVE = 'https://buy.stripe.com/aFa5kEb2V3KG6eH8JxcfK07';  // 990 Kč/rok (zakládající) – S17.32: nový odkaz, původní měl špatnou frekvenci
const FOUNDER_LIMIT = 100;   // kolik zakládajících míst celkem

const PREMIUM_YEARLY_LINK_TEST = 'https://buy.stripe.com/test_REPLACE_ME_YEARLY';
const PREMIUM_YEARLY_LINK_LIVE = 'https://buy.stripe.com/eVqbJ28UN1Cy7iL2l9cfK08';    // 1490 Kč/rok – S17.32: nový odkaz, původní měl špatnou frekvenci

// Stripe Customer Portal pro správu předplatného (zrušení atd.)
// Vytvoří se v Stripe Dashboard po aktivaci Customer Portal
const STRIPE_PORTAL_LINK_TEST = 'https://billing.stripe.com/p/login/test_REPLACE_ME';
const STRIPE_PORTAL_LINK_LIVE = 'https://billing.stripe.com/p/login/6oU9AU6MFgxsbz16BpcfK00';  // S17.31 (Milan)

// Přepínač test/live podle prostředí (firebase.app = live, jinak test)
function getDonateLink() {
  return isLiveEnv() ? DONATE_PAYMENT_LINK_LIVE : DONATE_PAYMENT_LINK_TEST;  // S17.30: sjednoceno s isLiveEnv
}

// S17.30 (FIX-218, Milan): DŘÍV se testovala jen Firebase doména, ale ostrý web běží na
// financeflow.cz → isLiveEnv() tam vracelo false a appka nabízela TESTOVACÍ odkazy
// (nevyplněné REPLACE_ME). Platba by na produkci vůbec nešla spustit.
function isLiveEnv() {
  const h = location.hostname;
  return h.includes('financeflow.cz') ||
         h.includes('financeflow-a249c.web.app') ||
         h.includes('financeflow-a249c.firebaseapp.com');
}

// FIX-065: Premium subscription – přesměrování na Stripe Subscription Payment Link
function startPremiumSubscription(period) {
  let link;
  if (period === 'yearly') {
    link = isLiveEnv() ? PREMIUM_YEARLY_LINK_LIVE : PREMIUM_YEARLY_LINK_TEST;
  } else if (period === 'founder_yearly') {
    link = isLiveEnv() ? PREMIUM_FOUNDER_YEARLY_LINK_LIVE : PREMIUM_FOUNDER_YEARLY_LINK_TEST;
  } else if (period === 'founder') {
    link = isLiveEnv() ? PREMIUM_FOUNDER_LINK_LIVE : PREMIUM_FOUNDER_LINK_TEST;
  } else {
    link = isLiveEnv() ? PREMIUM_MONTHLY_LINK_LIVE : PREMIUM_MONTHLY_LINK_TEST;
  }
  if (!link || link.includes('REPLACE_ME')) {
    // S17.30: testovací odkazy zatím nejsou vytvořené (Milan přešel rovnou na ostrý režim).
    // Na testovací doméně proto nabídneme přechod na ostrý odkaz – ale s jasným varováním,
    // že půjde o SKUTEČNOU platbu, ať nikdo omylem nezaplatí při vývoji.
    const liveFallback = period === 'yearly' ? PREMIUM_YEARLY_LINK_LIVE
                       : period === 'founder' ? PREMIUM_FOUNDER_LINK_LIVE
                       : period === 'founder_yearly' ? PREMIUM_FOUNDER_YEARLY_LINK_LIVE
                       : PREMIUM_MONTHLY_LINK_LIVE;
    if (liveFallback && !liveFallback.includes('REPLACE_ME')) {
      if (!confirm('⚠️ Jsi v testovacím prostředí, ale testovací platební odkaz není nastavený.\n\nPokračovat na OSTROU platbu? Bude to SKUTEČNÁ transakce.')) return;
      link = liveFallback;
    } else {
      alert('⚠️ Stripe Premium subscription ještě není nakonfigurován.\n\nKontaktuj autora aplikace.');
      console.error('[Premium] Subscription link not set in donate.js');
      return;
    }
  }
  const clientRef = window._currentUser?.uid || 'anon';
  const url = `${link}?client_reference_id=${encodeURIComponent(clientRef)}&prefilled_email=${encodeURIComponent(window._currentUser?.email || '')}`;
  console.log('[Premium] Redirect to subscription:', period);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// FIX-065: Otevřít Customer Portal pro správu existujícího předplatného (zrušení, změna karty atd.)
function openStripeCustomerPortal() {
  let link = isLiveEnv() ? STRIPE_PORTAL_LINK_LIVE : STRIPE_PORTAL_LINK_TEST;
  // S17.31: testovací portál neexistuje (Milan přešel rovnou na ostrý režim) – na testovací
  // doméně použij ostrý odkaz. Portál je jen SPRÁVA předplatného, ne platba, takže tu na rozdíl
  // od checkoutu nehrozí omylem provedená transakce a nepotřebuje potvrzení.
  if ((!link || link.includes('REPLACE_ME')) && STRIPE_PORTAL_LINK_LIVE && !STRIPE_PORTAL_LINK_LIVE.includes('REPLACE_ME')) {
    link = STRIPE_PORTAL_LINK_LIVE;
  }
  if (!link || link.includes('REPLACE_ME')) {
    alert('⚠️ Stripe Customer Portal ještě není nakonfigurován.\n\nKontaktuj autora aplikace pro zrušení předplatného.');
    return;
  }
  window.open(link, '_blank', 'noopener,noreferrer');
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

// ══════════════════════════════════════════════════════
//  S17.27 (Milan): ZAKLÁDAJÍCÍ MÍSTA – kolik z FOUNDER_LIMIT ještě zbývá.
//  Počítadlo `stats/founderCount` inkrementuje Stripe webhook při každé platbě přes
//  zakládající Payment Link. Klient ho jen ČTE (zápis blokován pravidly), takže si nikdo
//  nemůže zakládající cenu vynutit resetem počítadla.
// ══════════════════════════════════════════════════════
async function getFounderSlotsLeft() {
  try {
    const res = await fetch('https://financeflow-a249c-default-rtdb.europe-west1.firebasedatabase.app/stats/founderCount.json');
    if (!res.ok) return null;
    const used = (await res.json()) || 0;
    return Math.max(0, FOUNDER_LIMIT - used);
  } catch (e) { return null; }
}
