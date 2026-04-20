// ══════════════════════════════════════════════════════
//  SDÍLENÍ & REFERRAL SYSTÉM – FinanceFlow v6.37
// ══════════════════════════════════════════════════════
// Firebase struktura:
//   /referrals/{refCode}  → {uid, createdAt, clicks, conversions}
//   /referral_clicks/{id} → {refCode, ip(hash), date, converted}
//   /users/{uid}/referral → {code, clicks, conversions, earned}

const SHARE_BASE_URL = 'https://financeflow-a249c.web.app';
const SHARE_REWARDS = {
  click:      0,    // body za klik (0 = žádné)
  signup:    50,    // body za registraci přes odkaz
  month1:   100,    // body za první měsíc aktivního užívání
  premium:  300,    // body za upgrade na Premium
};

let _myRefCode = null;
let _refStats = { clicks: 0, conversions: 0, earned: 0, referrals: [] };

// ══════════════════════════════════════════════════════
//  INICIALIZACE – načtení/vytvoření referral kódu
// ══════════════════════════════════════════════════════
async function initReferral() {
  if (!window._currentUser || _isLocalMode) return;
  const uid = window._currentUser.uid;

  try {
    // Načti existující referral data
    const snap = await _get(_ref(_db, `users/${uid}/referral`));
    if (snap.exists()) {
      const data = snap.val();
      _myRefCode = data.code;
      _refStats = {
        clicks:      data.clicks      || 0,
        conversions: data.conversions || 0,
        earned:      data.earned      || 0,
        referrals:   data.referrals   || [],
      };
    } else {
      // První spuštění – vygeneruj unikátní kód
      _myRefCode = await generateRefCode(uid);
      await _set(_ref(_db, `users/${uid}/referral`), {
        code:        _myRefCode,
        clicks:      0,
        conversions: 0,
        earned:      0,
        createdAt:   Date.now(),
      });
      // Zaregistruj kód v globálním indexu
      await _set(_ref(_db, `referrals/${_myRefCode}`), {
        uid,
        createdAt: Date.now(),
        clicks:    0,
        conversions: 0,
      });
    }
  } catch(e) { console.log('initReferral error:', e); }

  // Zkontroluj příchozí referral kód z URL
  checkIncomingRef();
}

async function generateRefCode(uid) {
  // Kód = prvních 6 znaků uid + 4 náhodné znaky (čitelné, bez 0/O/I/l)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const base = uid.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  const code = (base + suffix).slice(0, 8);

  // Ověř unikátnost
  const check = await _get(_ref(_db, `referrals/${code}`));
  if (check.exists()) {
    // Konflikt – přidej extra znak
    return code.slice(0, 7) + chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function checkIncomingRef() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (!ref) return;

  // Ulož do Firebase (affiliate tabulka – existující logika)
  window._pendingAffiliateRef = ref;

  // Zaloguj klik
  if (window._db && ref !== _myRefCode) {
    _update(_ref(_db), {
      [`referrals/${ref}/clicks`]: (_refStats.clicks + 1),
      [`referral_clicks/${Date.now()}_${Math.random().toString(36).slice(2,6)}`]: {
        refCode: ref,
        date: new Date().toISOString().slice(0,10),
        converted: false,
      }
    }).catch(() => {});
  }
}

// ══════════════════════════════════════════════════════
//  SDÍLENÍ – generování odkazů a zpráv
// ══════════════════════════════════════════════════════
function getShareUrl() {
  const base = SHARE_BASE_URL;
  const code = _myRefCode;
  return code ? `${base}?ref=${code}` : base;
}

function getShareMessage(platform) {
  const url = getShareUrl();
  const name = window._userProfile?.displayName?.split(' ')[0] || 'Já';

  const messages = {
    whatsapp: `Ahoj! Používám FinanceFlow na sledování rodinných financí a je to super 💚\n\nMá to:\n✅ Přehled příjmů & výdajů\n📸 Skenování účtenek\n🤖 AI finanční poradce\n👨‍👩‍👧 Sdílení s partnerem\n\nZkus to zdarma: ${url}`,
    sms:      `Tip na appku: FinanceFlow – rodinné finance pod kontrolou. Zkus zdarma: ${url}`,
    email_subject: 'Tip: FinanceFlow – správa rodinných financí',
    email_body: `Ahoj,\n\nchci ti doporučit aplikaci FinanceFlow, kterou používám pro správu rodinných financí.\n\nCo umí:\n• Přehled příjmů a výdajů s grafy\n• Skenování účtenek pomocí AI\n• AI finanční poradce\n• Sdílení s partnerem\n• Predikce výdajů na další měsíce\n• A mnoho dalšího...\n\nVyzkoušej zdarma (30 dní Premium): ${url}\n\nPozdravuje ${name}`,
    copy:     url,
    native:   {
      title: 'FinanceFlow – rodinné finance',
      text:  'Správa rodinných financí – příjmy, výdaje, AI poradce, sdílení s partnerem',
      url,
    },
  };
  return messages[platform] || url;
}

// ══════════════════════════════════════════════════════
//  AKCE – sdílení přes různé kanály
// ══════════════════════════════════════════════════════
async function shareVia(platform) {
  const url = getShareUrl();

  switch(platform) {
    case 'native':
      if (navigator.share) {
        try {
          await navigator.share(getShareMessage('native'));
          trackShareEvent('native');
          showShareToast('✅ Sdíleno!');
          return;
        } catch(e) { if (e.name === 'AbortError') return; }
      }
      // Fallback na kopírování
      copyShareLink();
      break;

    case 'whatsapp':
      trackShareEvent('whatsapp');
      window.open('https://wa.me/?text=' + encodeURIComponent(getShareMessage('whatsapp')), '_blank');
      break;

    case 'email':
      trackShareEvent('email');
      window.open(
        `mailto:?subject=${encodeURIComponent(getShareMessage('email_subject'))}&body=${encodeURIComponent(getShareMessage('email_body'))}`,
        '_blank'
      );
      break;

    case 'sms':
      trackShareEvent('sms');
      window.open('sms:?body=' + encodeURIComponent(getShareMessage('sms')), '_blank');
      break;

    case 'messenger':
      trackShareEvent('messenger');
      window.open(`fb-messenger://share?link=${encodeURIComponent(url)}`, '_blank');
      // Fallback pro desktop
      setTimeout(() => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      }, 1500);
      break;

    case 'copy':
      copyShareLink();
      break;

    case 'qr':
      openQRModal();
      break;
  }
}

function copyShareLink() {
  const url = getShareUrl();
  navigator.clipboard.writeText(url).then(() => {
    trackShareEvent('copy');
    showShareToast('📋 Odkaz zkopírován!');
  }).catch(() => {
    // Fallback
    const inp = document.createElement('input');
    inp.value = url;
    document.body.appendChild(inp);
    inp.select();
    document.execCommand('copy');
    document.body.removeChild(inp);
    showShareToast('📋 Odkaz zkopírován!');
  });
}

function trackShareEvent(platform) {
  if (!window._currentUser || _isLocalMode) return;
  try {
    const uid = window._currentUser.uid;
    _update(_ref(_db), {
      [`users/${uid}/referral/shares/${platform}`]: Date.now(),
      [`users/${uid}/referral/lastShared`]: Date.now(),
    });
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  QR KÓD (generování bez externích závislostí)
// ══════════════════════════════════════════════════════
function openQRModal() {
  const modal = document.getElementById('modalShareQR');
  if (!modal) return;

  const url = getShareUrl();
  const canvas = document.getElementById('shareQRCanvas');

  // Generuj QR kód pomocí jednoduché knihovny přes CDN
  if (canvas) {
    canvas.width = 200; canvas.height = 200;
    drawSimpleQR(canvas, url);
  }

  document.getElementById('shareQRUrl').textContent = url;
  modal.classList.add('open');
}

function drawSimpleQR(canvas, text) {
  // Zjednodušený QR – pouze vizuální placeholder s URL
  // Pro produkci: použít qrcode.js knihovnu
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Bílé pozadí
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Načti qrcode.js z CDN dynamicky
  if (window.QRCode) {
    canvas.style.display = 'none';
    const div = document.getElementById('shareQRDiv');
    if (div) {
      div.innerHTML = '';
      new window.QRCode(div, {
        text,
        width: 180, height: 180,
        colorDark: '#0f1117',
        colorLight: '#ffffff',
      });
    }
    return;
  }

  // Fallback vizuál
  ctx.fillStyle = '#0f1117';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';

  // Finder patterns (rohy)
  [[10,10],[W-42,10],[10,H-42]].forEach(([x,y]) => {
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x+4, y+4, 24, 24);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(x+8, y+8, 16, 16);
  });

  // Data placeholder (random dots)
  const seed = text.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  let s = seed;
  for (let i = 0; i < 200; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const x = 48 + (Math.abs(s) % (W - 96));
    const y2 = 48 + (Math.abs(s * 2) % (H - 96));
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(x, y2, 4, 4);
  }

  ctx.fillStyle = '#333';
  ctx.font = '10px sans-serif';
  ctx.fillText('QR · ' + text.slice(0, 30) + (text.length > 30 ? '…' : ''), W/2, H - 8);

  // Async load real QR library
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  script.onload = () => {
    canvas.style.display = 'none';
    const div = document.getElementById('shareQRDiv');
    if (div) {
      div.innerHTML = '';
      new window.QRCode(div, {
        text, width: 180, height: 180,
        colorDark: '#0f1117', colorLight: '#ffffff',
      });
    }
  };
  document.head.appendChild(script);
}

// ══════════════════════════════════════════════════════
//  STATS – načtení statistik referralu
// ══════════════════════════════════════════════════════
async function loadRefStats() {
  if (!window._currentUser || !_myRefCode) return;
  try {
    const snap = await _get(_ref(_db, `users/${window._currentUser.uid}/referral`));
    if (snap.exists()) {
      const d = snap.val();
      _refStats = {
        clicks:      d.clicks      || 0,
        conversions: d.conversions || 0,
        earned:      d.earned      || 0,
        referrals:   d.referrals   || [],
      };
    }
    // Načti také globální statistiky pro tento kód
    const gSnap = await _get(_ref(_db, `referrals/${_myRefCode}`));
    if (gSnap.exists()) {
      const g = gSnap.val();
      _refStats.clicks = g.clicks || _refStats.clicks;
      _refStats.conversions = g.conversions || _refStats.conversions;
    }
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  RENDER – stránka sdílení (vložena do oAplikaci)
// ══════════════════════════════════════════════════════
async function renderShareSection() {
  const el = document.getElementById('shareSection');
  if (!el) return;

  if (_isLocalMode || !window._currentUser) {
    el.innerHTML = `<div class="insight-item warn" style="margin-bottom:10px">
      <div class="insight-icon">⚠️</div>
      <div class="insight-text">Přihlaste se přes Google pro získání vlastního referral odkazu.</div>
    </div>`;
    return;
  }

  if (!_myRefCode) await initReferral();
  await loadRefStats();

  const url = getShareUrl();
  const hasNativeShare = !!navigator.share;

  el.innerHTML = `
    <!-- Referral stats -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      <div style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700;font-family:'Syne',sans-serif;color:var(--income)">${_refStats.clicks}</div>
        <div style="font-size:.7rem;color:var(--text3)">Kliknutí</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700;font-family:'Syne',sans-serif;color:var(--bank)">${_refStats.conversions}</div>
        <div style="font-size:.7rem;color:var(--text3)">Registrací</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:11px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:1.4rem;font-weight:700;font-family:'Syne',sans-serif;color:var(--premium)">${_refStats.earned}</div>
        <div style="font-size:.7rem;color:var(--text3)">Bodů</div>
      </div>
    </div>

    <!-- Tvůj odkaz -->
    <div style="background:var(--surface2);border-radius:10px;padding:12px 14px;border:1px solid var(--border);margin-bottom:14px">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">Tvůj osobní odkaz</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;font-size:.8rem;color:var(--bank);font-family:monospace;word-break:break-all;background:var(--surface);padding:8px 10px;border-radius:8px;border:1px solid var(--border)">${url}</div>
        <button class="btn btn-ghost btn-sm" onclick="copyShareLink()" style="flex-shrink:0;white-space:nowrap">📋 Kopírovat</button>
      </div>
      <div style="font-size:.68rem;color:var(--text3);margin-top:6px">Kód: <strong style="color:var(--text2);font-family:monospace">${_myRefCode}</strong> · Za každou registraci získáš ${SHARE_REWARDS.signup} bodů</div>
    </div>

    <!-- Tlačítka sdílení -->
    <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-bottom:8px">Sdílet přes</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
      ${hasNativeShare ? `
      <button class="btn btn-accent" onclick="shareVia('native')" style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:8px;font-size:.9rem">
        <span>📤</span> Sdílet (systémový dialog)
      </button>` : ''}
      <button class="btn" onclick="shareVia('whatsapp')" style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1.1rem">💬</span>
        <div style="text-align:left"><div style="font-size:.82rem;font-weight:600">WhatsApp</div><div style="font-size:.7rem;color:var(--text3)">Přidat zprávu</div></div>
      </button>
      <button class="btn" onclick="shareVia('sms')" style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1.1rem">💬</span>
        <div style="text-align:left"><div style="font-size:.82rem;font-weight:600">SMS</div><div style="font-size:.7rem;color:var(--text3)">Textová zpráva</div></div>
      </button>
      <button class="btn" onclick="shareVia('email')" style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1.1rem">📧</span>
        <div style="text-align:left"><div style="font-size:.82rem;font-weight:600">Email</div><div style="font-size:.7rem;color:var(--text3)">Otevře klienta</div></div>
      </button>
      <button class="btn" onclick="shareVia('qr')" style="display:flex;align-items:center;gap:8px">
        <span style="font-size:1.1rem">📱</span>
        <div style="text-align:left"><div style="font-size:.82rem;font-weight:600">QR kód</div><div style="font-size:.7rem;color:var(--text3)">Ukázat na obrazovce</div></div>
      </button>
    </div>

    <!-- Odměny -->
    <div style="background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px 14px">
      <div style="font-size:.8rem;font-weight:700;color:var(--income);margin-bottom:8px">🎁 Referral program</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        <div style="display:flex;justify-content:space-between;font-size:.76rem">
          <span style="color:var(--text2)">Za každou registraci přes tvůj odkaz</span>
          <span style="font-weight:700;color:var(--income)">+${SHARE_REWARDS.signup} bodů</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.76rem">
          <span style="color:var(--text2)">Přihlašuje se měsíc aktivně</span>
          <span style="font-weight:700;color:var(--income)">+${SHARE_REWARDS.month1} bodů</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.76rem">
          <span style="color:var(--text2)">Upgraduje na Premium</span>
          <span style="font-weight:700;color:var(--income)">+${SHARE_REWARDS.premium} bodů</span>
        </div>
      </div>
      <div style="font-size:.68rem;color:var(--text3);margin-top:8px">Body budou převedeny na prodloužení Premium po spuštění platebního systému.</div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════
function showShareToast(msg) {
  if (typeof showToast === 'function') { showToast(msg); return; }
  let el = document.getElementById('shareToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shareToast';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);' +
      'background:var(--surface2);border:1px solid var(--border);border-radius:10px;' +
      'padding:10px 18px;font-size:.82rem;font-weight:600;color:var(--text);' +
      'z-index:9999;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;' +
      'box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// Spusť inicializaci po přihlášení
document.addEventListener('DOMContentLoaded', () => {
  // Hook do onUserSignedIn
  const _origInit = window.onUserSignedIn;
  if (_origInit) {
    window.onUserSignedIn = async function(user) {
      await _origInit(user);
      await initReferral();
    };
  }
});

