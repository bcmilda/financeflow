// FinanceFlow · smoke_audit_10_23.js
// S28 (v12.37, audit body 10, 12, 14, 21, 22, 23 – Milan):
// 10) bonus za soustavnost: běžící měsíc se nesrovnává,
// 12) poplatky a pojištění na kartě půjčky → skutečné RPSN,
// 14) plyn: cena za m³, přepočet z ceníku v Kč/kWh koeficientem 10,55,
// 21) AI rádce: tip nejvýš 1× denně, uložený, text jako text (ne HTML), jen na stránce AI rádce, „rádce“,
// 22) odznak oznámení: jedno id,
// 23) dvakrát definované funkce (kromě showToast) smazané.
// Negativní kontrola: na v12.36 padá.
const fs = require('fs'), path = require('path'), vm = require('vm');
const najdi = (...c) => c.map(p => path.join(__dirname, p)).find(p => fs.existsSync(p));
const R = (...c) => fs.readFileSync(najdi(...c), 'utf8');
let ok = 0, bad = 0;
const t = (n, p, x) => { if (p) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n + (x === undefined ? '' : ' → ' + JSON.stringify(x))); } };
const vyber = (src, n) => { const i = src.indexOf('function ' + n + '('); if (i < 0) return ''; let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } }
  const a = src.slice(Math.max(0, i - 6), i) === 'async ' ? i - 6 : i; return src.slice(a, k + 1); };
const radek = (src, z) => { const i = src.indexOf(z); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i)); };
const PR = R('premium.js', '../js/premium.js'), DB = R('debts.js', '../js/debts.js'), ME = R('meridla.js', '../js/meridla.js'),
  AI = R('ai.js', '../js/ai.js'), HT = R('app.html', '../app.html'), WK = R('worker.js', '../cloudflare-worker/worker.js');
const JS = {}; const jsDir = fs.existsSync(path.join(__dirname, '../js')) ? path.join(__dirname, '../js') : __dirname;
fs.readdirSync(jsDir).filter(f => /\.js$/.test(f) && !/^smoke|^check_/.test(f)).forEach(f => { JS[f] = fs.readFileSync(path.join(jsDir, f), 'utf8'); });

console.log('── 10) bonus za soustavnost ──');
const sk = vyber(PR, 'computeFinancialScore');
t('u běžícího měsíce řetěz začíná minulým (dokončeným) měsícem', /if\(\+_dn\.slice\(0,4\)===y && \(\+_dn\.slice\(5,7\)-1\)===m\)\{ m--; if\(m<0\)\{m=11;y--;\} \}/.test(sk));

console.log('── 12) RPSN ──');
const c12 = { Math, Object, Date, Number, parseFloat, _debtDnes: () => '2026-11-06', debtStartStr: s => s, debtDatumSplatky: (st, f, i) => { const d = new Date(2026, 10 + i, 15); return d.toISOString().slice(0, 10); } };
vm.createContext(c12);
vm.runInContext(['calcRPSN', 'debtNaklady', 'debtMaPoplatky', 'debtRPSN', 'generateSchedule', 'calcAnnuity'].map(n => vyber(DB, n)).join('\n'), c12);
const P = 300000, rr = 0.01, n = 60, splatka = Math.round(P * rr / (1 - Math.pow(1 + rr, -n)) * 100) / 100;
const pujcka = { total: P, remaining: 120000, interest: 12, payment: splatka, freq: 'monthly' };
t('bez poplatků = efektivní sazba 12,7 % (jako dřív)', c12.debtRPSN(pujcka) === 12.7, c12.debtRPSN(pujcka));
t('s poplatkem za sjednání 3 000 Kč → RPSN 13,2 % (audit)', c12.debtRPSN(Object.assign({}, pujcka, { poplatekSjednani: 3000 })) === 13.2);
t('+ vedení 100 Kč a pojištění 50 Kč měsíčně → vyšší RPSN', c12.debtRPSN(Object.assign({}, pujcka, { poplatekSjednani: 3000, poplatekMesicni: 100, pojisteniMesicni: 50 })) === 14.3);
t('RPSN podle smlouvy – rozjetá půjčka (zbývá 120 000) dá stejné číslo jako nová', c12.debtRPSN(Object.assign({}, pujcka, { remaining: P })) === c12.debtRPSN(pujcka));
t('karta půjčky má pole poplatek za sjednání, vedení, pojištění a ukládá je', /id="dFeeOnce"/.test(HT) && /id="dFeeMonthly"/.test(HT) && /id="dInsMonthly"/.test(HT)
  && /poplatekSjednani:moneyInRead\('dFeeOnce'\)/.test(vyber(DB, 'saveDebt')) && /moneyInFill\('dFeeOnce', d\.poplatekSjednani\)/.test(DB));
t('náhled, detail i simulace počítají s poplatky; konsolidace = efektivní sazba bez poplatků nové půjčky',
  /debtRPSN\(Object\.assign\(\{\}, tempDebt, _fNak/.test(vyber(DB, 'generateSchedulePreview')) && /const rpsn=debtRPSN\(d\)/.test(vyber(DB, 'showDebtSchedule'))
  && /mesicne: debtNaklady\(d\)\.mesicne/.test(vyber(DB, 'runDebtSim')) && /efektivní sazba \$\{rpsn\}%/.test(DB));
t('u RPSN je vidět, jestli je s poplatky', /bez poplatků – doplň je na kartě půjčky/.test(DB) && /_debtRpsnPozn\(d\)/.test(vyber(DB, 'showDebtSchedule')));

console.log('── 14) plyn ──');
const c14 = { parseFloat }; vm.createContext(c14); vm.runInContext(radek(ME, 'const MER_KWH_NA_M3') + '\nthis.MER_KWH_NA_M3=MER_KWH_NA_M3;\n' + vyber(ME, 'merKoef'), c14);
t('plynoměr v m³: koeficient 10,55 kWh/m³ (nebo z faktury), elektřina žádný', c14.merKoef({ druh: 'plyn', jednotka: 'm³' }) === 10.55
  && c14.merKoef({ druh: 'plyn', jednotka: 'm³', koef: 10.7 }) === 10.7 && c14.merKoef({ druh: 'elektrina', jednotka: 'kWh' }) === null);
const c14b = { document: { getElementById: id => c14b.el[id] }, el: { merCenaKwh: { value: '2,45' }, merKoef: { value: '10,55' }, merCena: { value: '' } }, String, Math };
vm.createContext(c14b); vm.runInContext(radek(ME, 'const _merCislo') + '\n' + vyber(ME, 'merPrepoctiKwh'), c14b); c14b.merPrepoctiKwh();
t('cena z ceníku 2,45 Kč/kWh × 10,55 → 25,85 Kč za m³ v poli Cena', c14b.el.merCena.value === '25,85', c14b.el.merCena.value);
t('pole se jmenuje „Cena za m³“ a ukládá ceník v kWh i koeficient', /Cena za <span id="merCenaJed">/.test(ME) && /m\.cenaKwh = _ck/.test(vyber(ME, 'merUlozMeridlo')));
t('detail ukáže i Kč/kWh a spotřebu v kWh', /≈ \$\{_merDes\(c\.cena \/ _kf, 2\)\} Kč\/kWh/.test(ME) && /letos \* _kf/.test(ME));

console.log('── 21) AI rádce ──');
const c21 = { S: { uiCfg: {} }, window: {}, viewingUid: null, volano: 0, ulozeno: 0, ffDnes: () => '2026-11-06', String, Math };
const el = { innerHTML: '' }; c21.document = { getElementById: id => id === 'aiProactiveAlert' ? el : null };
c21.getAuthToken = async () => 'tok'; c21.getData = () => ({}); c21.getTx = () => [1, 2, 3]; c21.buildFinanceContext = () => ''; c21.computeFinancialScore = () => ({});
c21.callClaude = async () => { c21.volano++; return 'Pozor <img src=x onerror=alert(1)> výdaje rostou'; }; c21.save = () => { c21.ulozeno++; };
c21.escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
vm.createContext(c21); vm.runInContext(['_aiTipHTML', 'aiProactiveCheck', '_aiProactiveZeptej'].map(n => vyber(AI, n)).join('\n'), c21);
(async () => {
  await c21.aiProactiveCheck(); const prvni = el.innerHTML;
  await c21.aiProactiveCheck(); await c21.aiProactiveCheck();
  t('za den se AI zeptá jen jednou, tip se uloží (uiCfg.aiTip) a další otevření ho jen ukáže', c21.volano === 1 && c21.ulozeno === 1 && c21.S.uiCfg.aiTip.den === '2026-11-06' && el.innerHTML === prvni, { volano: c21.volano });
  t('text od AI je text, ne HTML (<img onerror> se nespustí)', !/<img/.test(prvni) && /&lt;img/.test(prvni));
  c21.ffDnes = () => '2026-11-07'; await c21.aiProactiveCheck();
  t('další den nový tip', c21.volano === 2);
  c21.ffDnes = () => '2026-11-08'; c21.viewingUid = 'partner'; await c21.aiProactiveCheck();
  t('při prohlížení partnera se AI neptá', c21.volano === 2);
  t('#aiProactiveAlert je v appce jen jednou (stránka AI rádce)', (HT.match(/id="aiProactiveAlert"/g) || []).length === 1 && HT.indexOf('id="aiProactiveAlert"') > HT.indexOf('id="page-ai"'));
  t('„AI poradce“ → „AI rádce“ (tip, banner, karta, chat)', /AI RÁDCE · DNEŠNÍ TIP/.test(AI) && !/AI poradce|AI PORADCE/.test(AI) && !/AI [Pp]oradce|AI poradcem/.test(HT));

  console.log('── 22) odznak oznámení ──');
  t('id navAnnounceBadge je jen jedno (menu), Zprávy mají announceBadge', (HT.match(/id="navAnnounceBadge"/g) || []).length === 1 && (HT.match(/id="announceBadge"/g) || []).length === 1);

  console.log('── 23) dvakrát definované funkce ──');
  const def = n => Object.entries(JS).filter(([, s]) => new RegExp('(^|\\n)\\s*(async\\s+)?function ' + n + '\\s*\\(').test(s)).map(([f]) => f);
  t('getCurInst smazaná všude (nikdo ji nevolal)', def('getCurInst').length === 0 && !Object.values(JS).some(s => /getCurInst\(/.test(s)), def('getCurInst'));
  t('maybeShowOnboarding jen v onboarding.js', JSON.stringify(def('maybeShowOnboarding')) === '["onboarding.js"]', def('maybeShowOnboarding'));
  t('confirmDeleteAllData jen v settings.js (s potvrzovacím slovem SMAZAT)', JSON.stringify(def('confirmDeleteAllData')) === '["settings.js"]', def('confirmDeleteAllData'));
  t('showToast jen jednou – platná kopie z nakup.js (v12.38, Milan: „ponech novější verzi“)', JSON.stringify(def('showToast')) === '["nakup.js"]', def('showToast'));

  console.log('── worker ──');
  t('/inflace?obnovit=1 načte ČSÚ znovu bez 24h cache', /searchParams\.get\('obnovit'\)/.test(WK) && /if \(cache && !_obnovit\)/.test(WK) && /handleInflace\(corsHeaders, env, request\)/.test(WK));
  console.log(`\n${ok} ✓  ${bad} ✗`);
  process.exit(bad ? 1 : 0);
})();
