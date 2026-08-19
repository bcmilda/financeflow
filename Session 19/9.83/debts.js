//  FinanceFlow · v9.83 · debts.js · 2026-08-17
//  ADD / EDIT TX
// ══════════════════════════════════════════════════════
function openAddTx(){
  if(viewingUid)return;
  document.getElementById('editTxId').value='';
  document.getElementById('txName').value='';
  document.getElementById('txAmt').value='';
  document.getElementById('txDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('txNote').value='';
  { const tg=document.getElementById('txTags'); if(tg){ tg.value=''; if(typeof updateTagsPreview==='function') updateTagsPreview(); } }
  // v8.58 (TODO-144): reset pole „Skutečně v Kč“ (zafixovaný kurz)
  _czkTouched=false; { const cf=document.getElementById('txAmtCZK'); if(cf) cf.value=''; }
  // v8.73 (FIX-190): nová transakce → převodník se předvolí dle Nastavení (Převodní měna)
  if(typeof updateTxCurrency==='function') setTimeout(updateTxCurrency, 0);
  // v8.59 (TODO-149): reset přepočtu přesunu mezi měnami
  _transferConvTouched=false; { const tf=document.getElementById('txTransferConvAmt'); if(tf) tf.value=''; }
  document.getElementById('modalAddTitle').textContent='Přidat transakci';
  _transferMode='wallets';_assetCatId='';_assetSub='';_debtSub='';
  const _dr=document.getElementById('debtRecurring'); if(_dr)_dr.checked=false;
  const _dro=document.getElementById('debtRecurringOpts'); if(_dro)_dro.style.display='none';
  setTxType('expense');selCatId='';selSub='';customSub='';
  populateTxProjectSelect();
  populateTxTransferWallets();
  populateTxWalletSelect();
  populateTxPayTypeSelect();
  // S17.5 (Milan): viditelné předvybrání výchozí peněženky + typu platby z Nastavení
  { const wSel=document.getElementById('txWalletId');
    if(wSel && !wSel.value && typeof _settings!=='undefined' && _settings.defWallet && (S.wallets||[]).some(w=>w.id===_settings.defWallet)) wSel.value=_settings.defWallet; }
  { const pSel=document.getElementById('txPayTypeId');
    if(pSel && !pSel.value && typeof _settings!=='undefined' && _settings.defPayType) pSel.value=_settings.defPayType; }
  updateTxConverter();
  updateTxCzkField();
  updateTransferConv();
  // Reset kalkulačka
  _calcVal=''; _calcOp=''; _calcPrev='';
  const cd=document.getElementById('txCalcDisplay'); if(cd) cd.value='0';
  const cp=document.getElementById('txCalcPanel'); if(cp) cp.style.display='none';
  renderCatPicker();
  // S12.1i: u nové transakce akční tlačítka (Smazat/Rozdělit) skrýt
  const _bd=document.getElementById('btnTxDelete'); if(_bd)_bd.style.display='none';
  const _bs=document.getElementById('btnTxSplit'); if(_bs)_bs.style.display='none';
  window._modalTxId=null;
  document.getElementById('modalAdd').classList.add('open');
}

// Naplnit select peněženek
// S17.34 (Milan): peněženka je POVINNÁ – bez ní transakce visí ve vzduchoprázdnu a nesedí
// zůstatky. Prázdná volba „– výchozí –" odebrána; předvybere se peněženka z Nastavení,
// jinak první v seznamu.
function populateTxWalletSelect() {
  const sel = document.getElementById('txWalletId'); if(!sel) return;
  const wallets = S.wallets||[];
  if(!wallets.length){ sel.innerHTML = '<option value="">– nejdřív si vytvoř peněženku –</option>'; return; }
  sel.innerHTML = wallets.map(w=>`<option value="${w.id}">${w.icon||'💼'} ${w.name}${w.currency&&w.currency!=='CZK'?' ('+w.currency+')':''}</option>`).join('');
  const pref = (typeof _settings!=='undefined' && _settings.defWallet) || '';
  sel.value = wallets.some(w=>w.id===pref) ? pref : wallets[0].id;
}

// Naplnit select typů plateb
function populateTxPayTypeSelect() {
  // Použij stejný zdroj jako tabulka Typy plateb (getPayTypes) – jinak chybí Edenred apod.
  const types = (typeof getPayTypes==='function') ? getPayTypes() : [
    {id:'cash',name:'Hotovost',icon:'💵'},
    {id:'card',name:'Platební karta',icon:'💳'},
    {id:'transfer',name:'Bankovní převod',icon:'🏦'},
    {id:'edenred',name:'Edenred / Stravenky',icon:'🍽️'},
    ...(S.payTypes||[])
  ];
  // S17.34 (Milan): typ platby POVINNÝ – kvůli evidenci musí být každá transakce navázaná.
  // Prázdná volba odebrána, předvybere se typ z Nastavení, jinak kreditní/platební karta.
  const opts = types.map(t=>`<option value="${t.id}">${t.icon||'💳'} ${t.name}</option>`).join('');
  const pref = (typeof _settings!=='undefined' && _settings.defPayType) || '';
  const fallback = (types.find(t=>/kredit/i.test(t.name)) || types.find(t=>/karta/i.test(t.name)) || types[0] || {}).id || '';
  ['txPayTypeId','txTransferPayType'].forEach(id=>{
    const sel=document.getElementById(id); if(!sel) return;
    const cur=sel.value; sel.innerHTML=opts;
    if(cur && types.some(t=>t.id===cur)) sel.value=cur;
    else sel.value = types.some(t=>t.id===pref) ? pref : fallback;
  });
}

// Aktualizovat měnu z vybrané peněženky
function updateTxCurrency() {
  const sel = document.getElementById('txWalletId'); if(!sel) return;
  const wallet = (S.wallets||[]).find(w=>w.id===sel.value);
  const curSel = document.getElementById('txConverterCur');
  if(curSel){
    _fillConverterCurrencies(); // v8.73: měny 1:1 s Kurzy měn
    const ec=(typeof _txEntryCur==='function')?_txEntryCur():'CZK'; // v8.62
    const _pref=(typeof _settings!=='undefined'&&_settings&&_settings.convCur)||''; // v8.72: Nastavení → Převodní měna
    if(ec!=='CZK') curSel.value = 'CZK';                              // zadávám v cizí/základní měně → ukaž kolik je to v Kč
    else if(_pref && _pref!==ec) curSel.value = _pref;                // v8.72: uživatelova preferovaná měna (např. Kč→EUR)
    else if(typeof baseCur==='function' && baseCur()!=='CZK') curSel.value = baseCur(); // zadávám v Kč + základní ≠ CZK → ukaž základní
    updateTxConverter();
  }
  updateTxCzkField(); // v8.58 (TODO-144)
}

// v8.58 (TODO-144): ZAFIXOVANÁ ČÁSTKA V KČ u transakcí v cizí měně.
// Při výběru cizíměnové peněženky se pod Částkou ukáže pole „Skutečně v Kč“ –
// předvyplněné kurzem ČNB, ale volně editovatelné (každá banka má jiný kurz).
// Hodnota se uloží do t.amtCZK a už se NIKDY nepřepočítává živým kurzem.
let _czkTouched=false;
function _txSelWalletCur(){
  // měna peněženky vybrané v modalu dle režimu (běžná tx / dluh = txWalletId, přesun do aktiv = txAssetFrom)
  const isTransfer = (typeof curTxType!=='undefined' && curTxType==='transfer');
  const isAsset = isTransfer && typeof _transferMode!=='undefined' && _transferMode==='assets';
  if(isTransfer && !isAsset) return 'CZK'; // přesun mezi peněženkami → pole Skutečně v Kč se nezobrazuje
  const id = isAsset ? (document.getElementById('txAssetFrom')?.value||'') : (document.getElementById('txWalletId')?.value||'');
  const w=(S.wallets||[]).find(x=>x.id===id);
  return (w&&w.currency)?w.currency:'CZK';
}
function updateTxCzkField(){
  const row=document.getElementById('txCzkRow'); if(!row) return;
  const cur=_txEntryCur(); // v8.62: měna zadávání (peněženka, nebo základní měna u výchozí)
  const curEl=document.getElementById('txAmtCur'); if(curEl) curEl.textContent = (cur==='CZK'?'KČ':cur);
  if(cur==='CZK'){ row.style.display='none'; return; }
  row.style.display='block';
  const amt=parseFloat(document.getElementById('txAmt')?.value)||0;
  const rate=_FX_RATES[cur]||1;
  if(!_czkTouched){
    const f=document.getElementById('txAmtCZK');
    if(f) f.value = amt>0 ? String(Math.round(amt*rate*100)/100) : '';
  }
  const h=document.getElementById('txCzkHint');
  if(h){
    const isAsset=(typeof curTxType!=='undefined'&&curTxType==='transfer'&&typeof _transferMode!=='undefined'&&_transferMode==='assets');
    const wid=isAsset?(document.getElementById('txAssetFrom')?.value||''):(document.getElementById('txWalletId')?.value||'');
    h.textContent = wid
      ? `Předvyplněno kurzem ČNB (1 ${cur} = ${rate} Kč) – uprav podle skutečně stržené částky z výpisu banky. Kurz se zafixuje.`
      : `Částku zadáváš v ${cur} (základní měna). Uloží se přepočet v Kč kurzem ČNB (1 ${cur} = ${rate} Kč) – můžeš ho upravit.`;
  }
}
// Přečte pole „Skutečně v Kč“ při uložení. CZK peněženka → null (klíč se smaže).
function _readTxCzk(walletId, amt){
  const w=(S.wallets||[]).find(x=>x.id===walletId);
  const cur=(w&&w.currency)?w.currency:'CZK';
  if(cur==='CZK') return null;
  const v=parseFloat(document.getElementById('txAmtCZK')?.value);
  const rate=_FX_RATES[cur]||1;
  const out=(isFinite(v)&&v>0)?v:amt*rate;
  return Math.round(out*100)/100;
}

// v8.62 (TODO-150): MĚNA ZADÁVÁNÍ ČÁSTKY. Peněženka s měnou → měna peněženky;
// BEZ peněženky (výchozí) → ZÁKLADNÍ měna uživatele (např. EUR). Částka zadaná
// v základní měně se při uložení převede do Kč (kurz ČNB, editovatelné v poli Skutečně v Kč).
function _txEntryCur(){
  const isTransfer=(typeof curTxType!=='undefined'&&curTxType==='transfer');
  const isAsset=isTransfer&&typeof _transferMode!=='undefined'&&_transferMode==='assets';
  if(isTransfer&&!isAsset) return 'CZK';
  const id=isAsset?(document.getElementById('txAssetFrom')?.value||''):(document.getElementById('txWalletId')?.value||'');
  if(!id) return (typeof baseCur==='function')?baseCur():'CZK';
  const w=(S.wallets||[]).find(x=>x.id===id);
  return (w&&w.currency)?w.currency:'CZK';
}
// Bez peněženky + základní měna ≠ CZK → vrátí Kč hodnotu k uložení do amount; jinak null
function _entryAmtCZK(walletId, amt){
  if(walletId) return null;
  const bc=(typeof baseCur==='function')?baseCur():'CZK';
  if(bc==='CZK') return null;
  const v=parseFloat(document.getElementById('txAmtCZK')?.value);
  const czk=(isFinite(v)&&v>0)?v:amt*_fxToCzk(bc);
  return Math.round(czk*100)/100;
}

// v8.59 (TODO-149): PŘESUN MEZI PENĚŽENKAMI S RŮZNOU MĚNOU.
// Dříve se do cílové peněženky připsala surová částka (100 EUR → 100 Kč). Nyní se při
// rozdílných měnách ukáže pole „Připsat do cílové peněženky“ – předvyplněné křížovým
// kurzem ČNB (přes CZK), ale volně editovatelné (kurz banky). Kurz se ZAFIXUJE uložením.
let _transferConvTouched=false;
function _walletCur(id){ const w=(S.wallets||[]).find(x=>x.id===id); return (w&&w.currency)?w.currency:'CZK'; }
function _fxToCzk(cur){ return cur==='CZK'?1:(_FX_RATES[cur]||1); }
function updateTransferConv(){
  const row=document.getElementById('txTransferConvRow'); if(!row) return;
  const isWalletTransfer=(typeof curTxType!=='undefined'&&curTxType==='transfer'&&typeof _transferMode!=='undefined'&&_transferMode==='wallets');
  const from=document.getElementById('txTransferFrom')?.value||'';
  const to=document.getElementById('txTransferTo')?.value||'';
  const curF=_walletCur(from), curT=_walletCur(to);
  // v8.62: label ČÁSTKA u přesunu ukazuje měnu ZDROJOVÉ peněženky
  if(isWalletTransfer){ const cl=document.getElementById('txAmtCur'); if(cl) cl.textContent=(curF==='CZK'?'KČ':curF); }
  if(!isWalletTransfer||!from||!to||curF===curT){ row.style.display='none'; return; }
  row.style.display='block';
  const curEl=document.getElementById('txTransferConvCur'); if(curEl) curEl.textContent=(curT==='CZK'?'KČ':curT);
  const amt=parseFloat(document.getElementById('txAmt')?.value)||0;
  const cross=_fxToCzk(curF)/_fxToCzk(curT); // křížový kurz přes CZK
  if(!_transferConvTouched){
    const f=document.getElementById('txTransferConvAmt');
    if(f) f.value = amt>0 ? String(Math.round(amt*cross*100)/100) : '';
  }
  const h=document.getElementById('txTransferConvHint');
  if(h) h.textContent=`Předvyplněno kurzem ČNB (1 ${curF} ≈ ${Math.round(cross*10000)/10000} ${curT}) – uprav podle skutečně připsané částky. Kurz se zafixuje.`;
}

// Orientační kurzy CZK (aktualizovat ručně nebo z API)
const _FX_RATES = {EUR:25.3, USD:23.1, PLN:5.7, GBP:29.5, CHF:26.8, HUF:0.062, SKK:1.0};

// v8.73: měny převodníku 1:1 s Kurzy měn – options se generují z _FX_RATES
// (po startu přepsáno živými ČNB kurzy včetně všech ~33 měn), CZK vždy první.
function _fillConverterCurrencies(){
  const sel=document.getElementById('txConverterCur'); if(!sel) return;
  const cur=sel.value;
  const codes=['CZK'].concat(Object.keys(_FX_RATES).sort());
  sel.innerHTML=codes.map(c=>`<option value="${c}">${c}</option>`).join('');
  if(codes.includes(cur)) sel.value=cur;
}

// v8.61 (TODO-151): převodník umí i CZK a počítá z MĚNY VYBRANÉ PENĚŽENKY
// (dříve předpokládal zadání v Kč – princip: platím v eurech, chci vidět kolik utrácím v Kč).
function updateTxConverter() {
  const amt = parseFloat(document.getElementById('txAmt')?.value)||0;
  const target = document.getElementById('txConverterCur')?.value||'EUR';
  // FIX-255 (S19): u PŘESUNU mezi peněženkami vrací _txEntryCur() natvrdo 'CZK'
  //   (schválně – aby se skrylo pole „Skutečně v Kč", to řeší vlastní řádek přesunu).
  //   Převodník to ale bral doslova: přesun 100 € z eurové peněženky počítal jako
  //   100 Kč a hlásil „≈ 3,95 €" místo „≈ 2 530 Kč". Jen orientační číslo pod polem,
  //   uložená data byla vždy správně (saveTx bere měnu z peněženek přímo).
  //   Zdrojová měna přesunu = měna peněženky, ze které se posílá.
  let srcCur = (typeof _txEntryCur==='function') ? _txEntryCur() : 'CZK'; // v8.62: měna zadávání
  if(typeof curTxType!=='undefined' && curTxType==='transfer'
     && typeof _transferMode!=='undefined' && _transferMode==='wallets'){
    const from=document.getElementById('txTransferFrom')?.value||'';
    if(from && typeof _walletCur==='function') srcCur=_walletCur(from);
  }
  const czk = amt * _fxToCzk(srcCur);
  const converted = amt > 0 ? (czk/_fxToCzk(target)).toFixed(2) : '0';
  const el = document.getElementById('txConverterAmt');
  if(el) el.textContent = converted + ' ' + (target==='CZK'?'Kč':target);
  const re = document.getElementById('txConverterRate');
  if(re){
    if(srcCur===target){ re.textContent=''; }
    else if(srcCur==='CZK'){ re.textContent = `(1 ${target} = ${_fxToCzk(target)} Kč)`; }
    else { const cross=Math.round(_fxToCzk(srcCur)/_fxToCzk(target)*10000)/10000; re.textContent = `(1 ${srcCur} ≈ ${cross} ${target==='CZK'?'Kč':target})`; }
  }
}

// ── Kalkulačka ──
let _calcVal='', _calcOp='', _calcPrev='';

function toggleTxCalc() {
  const p = document.getElementById('txCalcPanel');
  if(!p) return;
  p.style.display = p.style.display==='none' ? 'block' : 'none';
}

function calcBtn(k) {
  const d = document.getElementById('txCalcDisplay');
  if(!d) return;
  if(k==='C') { _calcVal=''; _calcOp=''; _calcPrev=''; d.value='0'; return; }
  if(k==='⌫') { _calcVal=_calcVal.slice(0,-1)||''; d.value=_calcVal||'0'; return; }
  if(k==='±') { _calcVal = _calcVal.startsWith('-') ? _calcVal.slice(1) : (_calcVal?'-'+_calcVal:'-'); d.value=_calcVal; return; }
  if(['÷','×','−','+'].includes(k)) {
    _calcPrev = _calcVal||d.value; _calcOp=k; _calcVal=''; return;
  }
  if(k==='=') {
    const a=parseFloat(_calcPrev||'0'), b=parseFloat(_calcVal||'0');
    let r=0;
    if(_calcOp==='÷') r = b?a/b:0;
    else if(_calcOp==='×') r = a*b;
    else if(_calcOp==='−') r = a-b;
    else if(_calcOp==='+') r = a+b;
    else r = b||a;
    _calcVal = String(Math.round(r*100)/100);
    _calcOp=''; _calcPrev='';
    d.value = _calcVal;
    return;
  }
  if(k==='.' && _calcVal.includes('.')) return;
  _calcVal += k;
  d.value = _calcVal;
}

function calcInsert() {
  const d = document.getElementById('txCalcDisplay');
  const a = document.getElementById('txAmt');
  if(!d||!a) return;
  const val = parseFloat(d.value)||0;
  if(val>0) { a.value=val; updateTxConverter(); }
  toggleTxCalc();
}
function setTxType(type){
  curTxType=type;
  ['income','expense','debt','transfer'].forEach(t=>{
    const el=document.getElementById('tt-'+t);
    if(el)el.className='tt';
  });
  const el=document.getElementById('tt-'+type);
  if(el)el.className='tt sel-'+type;
  // Show/hide transfer picker
  const tp=document.getElementById('transferPickerInModal');
  if(tp)tp.style.display=type==='transfer'?'block':'none';
  // v8.72: detaily Přesunu (Typ platby + peněženky/KAM) jsou nově POD Částkou/Datem
  const td=document.getElementById('transferDetailsBlock');
  if(td)td.style.display=type==='transfer'?'block':'none';
  // Show/hide debt picker
  const dp=document.getElementById('debtPickerInModal');
  if(dp){
    dp.style.display=type==='debt'?'block':'none';
    if(type==='debt'){ populateTxDebtSelect(); renderDebtSubPicker(); }
  }
  // Show/hide cat/sub pickers
  // FIX (S12.1h): cílit explicitní #catSection – řetěz parentElement.parentElement po
  // přestavbě modalu (kalkulačka) vylezl až na .modal-body a schoval CELÝ formulář.
  const cp=document.getElementById('catSection')||document.getElementById('catPicker')?.parentElement;
  const sp=document.getElementById('subPicker');
  const hideCP = type==='transfer'||type==='debt';
  if(cp)cp.style.display=hideCP?'none':'block';
  if(sp&&hideCP)sp.style.display='none';
  if(!hideCP)renderCatPicker();
  // S14: řádek Peněženka+Typ platby skrytý u Přesunu (Přesun má vlastní výběr peněženek)
  const wr=document.getElementById('txWalletRow');
  if(wr)wr.style.display=type==='transfer'?'none':'block';
  // S14: po přepnutí na Přesun nastav pod-režim (výchozí mezi peněženkami)
  if(type==='transfer'&&typeof setTransferMode==='function')setTransferMode(_transferMode||'wallets');
  if(typeof updateTxCzkField==='function') updateTxCzkField(); // v8.58 (TODO-144)
  if(typeof updateTransferConv==='function') updateTransferConv(); // v8.59 (TODO-149)
}
// S14: ── PŘESUN → INVESTICE & SPOŘENÍ ──────────────────────────────
// Pod-režim tlačítka „Přesun": 'wallets' = klasický převod mezi peněženkami,
// 'assets' = vklad do transfer-kategorie (Investice/Spoření/Rezerva…). Vklad je
// jediná transakce type:expense v transfer-kategorii → sníží peněženku, ale NEpočítá
// se jako výdaj (isTransferTx) a roste v kartě „Moje úspory a investice".
function setTransferMode(mode){
  _transferMode=mode;
  const bw=document.getElementById('ttm-wallets'); if(bw)bw.className='tt'+(mode==='wallets'?' sel-transfer':'');
  const ba=document.getElementById('ttm-assets');  if(ba)ba.className='tt'+(mode==='assets'?' sel-income':'');
  const wb=document.getElementById('transferWalletsBlock'); if(wb)wb.style.display=mode==='wallets'?'block':'none';
  const ab=document.getElementById('transferAssetsBlock');  if(ab)ab.style.display=mode==='assets'?'block':'none';
  if(mode==='assets'){ populateAssetFrom(); renderAssetCatPicker(); }
  if(typeof updateTxCzkField==='function') updateTxCzkField(); // v8.58 (TODO-144)
  if(typeof updateTransferConv==='function') updateTransferConv(); // v8.59 (TODO-149)
}
function populateAssetFrom(){
  const sel=document.getElementById('txAssetFrom'); if(!sel) return;
  const wallets=getWallets();
  sel.innerHTML=wallets.length
    ? wallets.map(w=>`<option value="${w.id}">${WALLET_TYPES[w.type]?.split(' ')[0]||'👛'} ${w.name}${w.currency&&w.currency!=='CZK'?' ('+w.currency+')':''}</option>`).join('')
    : '<option value="">– žádná peněženka –</option>';
}
function renderAssetCatPicker(){
  const picker=document.getElementById('assetCatPicker'); if(!picker) return;
  const cats=(S.categories||[]).filter(c=>c.type==='transfer'&&c.name!=='Virtuální přesun'); // v8.71: virtuální přesun nepatří do investic
  if(!cats.length){
    picker.innerHTML='<div style="font-size:.78rem;color:#a8aec8;padding:8px;line-height:1.45">Zatím nemáš žádné přesunové kategorie. Vytvoř je v sekci <strong>Kategorie</strong> (typ „🔄 Přesun") nebo spusť <strong>migraci</strong> v Admin panelu → Údržba dat.</div>';
    const w=document.getElementById('assetSubPicker'); if(w)w.style.display='none';
    return;
  }
  // v8.70 (TODO-155): KAM rozděleno na Finanční rezervu (🛟 isSaving) a Investice (📈 isInvest)
  const chip=c=>`<div class="cat-chip ${_assetCatId===c.id?'sel':''}" style="${_assetCatId===c.id?`background:${c.color}`:'border-color:'+c.color}" onclick="selAssetCat('${c.id}')">${c.icon} ${c.name}</div>`;
  const rez=cats.filter(c=>c.isSaving), inv=cats.filter(c=>c.isInvest&&!c.isSaving), rest=cats.filter(c=>!c.isSaving&&!c.isInvest);
  const grp=(title,arr)=>arr.length?`<div style="font-size:.68rem;font-weight:700;color:#a8aec8;text-transform:uppercase;letter-spacing:.06em;margin:8px 0 5px">${title}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${arr.map(chip).join('')}</div>`:'';
  picker.innerHTML=(rez.length||inv.length)
    ? grp('🛟 Finanční rezerva (spoření)',rez)+grp('📈 Investice (aktivní spoření)',inv)+grp(rest.length?'🔄 Další přesuny':'',rest)
    : `<div style="display:flex;flex-wrap:wrap;gap:6px">${cats.map(chip).join('')}</div><div style="font-size:.66rem;color:#a8aec8;margin-top:6px">Tip: v Kategoriích označ kategorie jako 🛟 rezervu nebo 📈 investice a KAM se rozdělí do skupin.</div>`;
  renderAssetSubPicker();
}
function selAssetCat(id){ _assetCatId=id; _assetSub=''; const ci=document.getElementById('assetCustomSub'); if(ci)ci.value=''; renderAssetCatPicker(); }
function renderAssetSubPicker(){
  const wrap=document.getElementById('assetSubPicker'); const inner=document.getElementById('assetSubInner');
  const cat=(S.categories||[]).find(c=>c.id===_assetCatId);
  if(!cat||!(cat.subs||[]).length){ if(wrap)wrap.style.display='none'; return; }
  if(wrap)wrap.style.display='block';
  const col=cat.color||'var(--accent)';
  if(inner)inner.innerHTML=(cat.subs||[]).map(s=>`<div class="sub-chip ${_assetSub===s?'sel':''}" onclick="selAssetSub('${s}')" style="border-color:${col};${_assetSub===s?`background:${col};color:#fff;font-weight:600;`:'color:var(--text);'}">${s}</div>`).join('');
}
function selAssetSub(s){ _assetSub=s; const ci=document.getElementById('assetCustomSub'); if(ci)ci.value=''; renderAssetSubPicker(); }

function saveTx(){
  if(viewingUid)return;
  const eid=document.getElementById('editTxId').value;
  const name=document.getElementById('txName').value.trim();
  const amt=parseFloat(document.getElementById('txAmt').value);
  const date=document.getElementById('txDate').value;
  const note=document.getElementById('txNote').value.trim();
  const projectId=document.getElementById('txProject')?.value||'';
  customSub=document.getElementById('customSubInput').value.trim();
  if(curTxType==='transfer'){
    // S14: Přesun DO INVESTIC & SPOŘENÍ – jediná transakce v transfer-kategorii
    if(_transferMode==='assets'){
      if(!_assetCatId){alert('Vyber kam peníze směřují (investice / spoření)');return;}
      if(!amt||!date){alert('Vyplň částku a datum');return;}
      const aCat=(S.categories||[]).find(c=>c.id===_assetCatId);
      const aSub=(document.getElementById('assetCustomSub')?.value.trim())||_assetSub;
      const aFrom=document.getElementById('txAssetFrom')?.value||'';
      const aName=name||(aCat?aCat.name+(aSub?' – '+aSub:''):'Přesun do aktiv');
      const aObj={type:'expense',name:aName,amount:amt,amt,catId:_assetCatId,category:_assetCatId,date,note};
      if(aSub){aObj.subcat=aSub;ensureSubcat(_assetCatId,aSub);}
      if(aFrom)aObj.wallet=aFrom;
      const _aCzk=_entryAmtCZK(aFrom,amt); // v8.62
      if(_aCzk!=null){ aObj.amount=_aCzk; aObj.amt=_aCzk; aObj.amtCZK=null; }
      else aObj.amtCZK=_readTxCzk(aFrom,amt); // v8.58 (TODO-144/148): zafixovaný kurz vkladu
      const _aPay=document.getElementById('txTransferPayType')?.value||''; if(_aPay)aObj.payType=_aPay;
      if(projectId)aObj.projectId=projectId;
      const aTagsRaw=document.getElementById('txTags')?.value||'';aObj.tags=parseTags(aTagsRaw);
      if(eid){const t=S.transactions.find(x=>x.id==eid);if(t)Object.assign(t,aObj);}
      else{if(!S.transactions)S.transactions=[];S.transactions.push({id:genTxId(),...aObj});}
      save();closeModal('modalAdd');{const pid=selProjectId;selProjectId='';if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();}}
      return;
    }
    // Handle transfer
    const from=document.getElementById('txTransferFrom')?.value;
    const to=document.getElementById('txTransferTo')?.value;
    if(!from||!to){alert('Vyber obě peněženky');return;}
    if(from===to){alert('Peněženky musí být různé');return;}
    if(!amt||!date){alert('Vyplň částku a datum');return;}
    const wFrom=getWallets().find(w=>w.id===from);
    const wTo=getWallets().find(w=>w.id===to);
    const transferId=uid();
    const txName=name||(wFrom&&wTo?`Převod: ${wFrom.name} → ${wTo.name}`:'Převod');
    const _tPay=document.getElementById('txTransferPayType')?.value||'';
    // v8.59 (TODO-149): různé měny → cílová noha v měně cílové peněženky (pole / křížový kurz ČNB)
    const curF=(wFrom&&wFrom.currency)?wFrom.currency:'CZK';
    const curT=(wTo&&wTo.currency)?wTo.currency:'CZK';
    let inAmt=amt;
    if(curF!==curT){
      const v=parseFloat(document.getElementById('txTransferConvAmt')?.value);
      const cross=_fxToCzk(curF)/_fxToCzk(curT);
      inAmt=Math.round(((isFinite(v)&&v>0)?v:amt*cross)*100)/100;
    }
    // zafixovaná hodnota přesunu v Kč (pro ≈ Kč popisek; přesuny jsou mimo statistiky)
    const _tCzk=(curF!=='CZK'||curT!=='CZK')?Math.round(amt*_fxToCzk(curF)*100)/100:null;
    const txOut={id:uid(),name:txName,amount:amt,amt,type:'expense',date,wallet:from,note:note||'Přesun',transferId,category:'transfer',catId:'transfer',payType:_tPay||undefined,projectId:projectId||undefined,amtCZK:_tCzk};
    const txIn={id:uid(),name:txName,amount:inAmt,amt:inAmt,type:'income',date,wallet:to,note:note||'Přesun',transferId,category:'transfer',catId:'transfer',payType:_tPay||undefined,projectId:projectId||undefined,amtCZK:_tCzk};
    if(!S.transactions)S.transactions=[];
    S.transactions.push(txOut,txIn);
    save();closeModal('modalAdd');{ const pid=selProjectId; selProjectId=''; if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();} }
    return;
  }
  if(!amt||!date){alert('Vyplň částku a datum');return;}
  // Dluh/Splátka – propojení s půjčkou
  if(curTxType==='debt') {
    const debtId = document.getElementById('txDebtId')?.value;
    const debt = debtId ? S.debts.find(x=>x.id===debtId) : null;
    const txName = name || (debt ? 'Splátka: '+debt.name : 'Splátka dluhu');
    // f4: směřuj přes REÁLNOU kategorii „Splátka" (ne syntetické debt-payment) → žádné „?"
    const sCat = (typeof getSplatkaCat==='function') ? getSplatkaCat() : null;
    const catId = sCat ? sCat.id : 'debt-payment';
    const txObj = {type:'expense', name:txName, amount:amt, amt, catId, category:catId, date, note, debtId:debtId||null};
    if(_debtSub) txObj.subcat = _debtSub;
    const _dWal=document.getElementById('txWalletId')?.value||''; if(_dWal) txObj.wallet=_dWal;
    const _dCzk=_entryAmtCZK(_dWal,amt); // v8.62
    if(_dCzk!=null){ txObj.amount=_dCzk; txObj.amt=_dCzk; txObj.amtCZK=null; }
    else txObj.amtCZK=_readTxCzk(_dWal,amt); // v8.58 (TODO-144)
    const _dPay=document.getElementById('txPayTypeId')?.value||''; if(_dPay) txObj.payType=_dPay;
    if(projectId) txObj.projectId = projectId;
    if(eid) { const t=S.transactions.find(x=>x.id==eid); if(t) Object.assign(t,txObj); }
    else S.transactions.push({id:genTxId(),...txObj});
    // Snížit zbývající částku půjčky (jen u nové transakce)
    if(debt && !eid) {
      debt.remaining = Math.max(0, debt.remaining - amt);
      if(debt.schedule) {
        const unpaid = debt.schedule.find(s=>!s.paid);
        if(unpaid) unpaid.paid = true;
      }
    }
    // f3: opakovaná splátka → nastav u půjčky pravidelnou splátku (objeví se v Budoucích platbách)
    const _recur = document.getElementById('debtRecurring')?.checked;
    if(_recur && debt){
      const _freq = document.getElementById('debtRecurringFreq')?.value || 'monthly';
      debt.freq = _freq;
      if(!debt.payment || debt.payment<=0 || !(debt.schedule&&debt.schedule.length)){
        debt.payment = amt;
        debt.startDate = _nextPeriodDate(date, _freq);
        if(typeof generateSchedule==='function') debt.schedule = generateSchedule(debt);
      }
    }
    save(); closeModal('modalAdd'); { const pid=selProjectId; selProjectId=''; if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();} }
    return;
  }
  const type = curTxType;
  const finalSub = customSub||selSub; if(finalSub)ensureSubcat(selCatId,finalSub);
  const D2 = getData();
  const cat = getCat(selCatId, D2.categories);
  const autoName = name||(cat.name!=='❓'?cat.name+(finalSub?' – '+finalSub:''):'Transakce');
  const txObj = {type, name:autoName, amount:amt, amt, catId:selCatId, category:selCatId, subcat:finalSub, date, note};
  if(projectId) txObj.projectId = projectId;
  const walletId = document.getElementById('txWalletId')?.value||'';
  const payTypeId = document.getElementById('txPayTypeId')?.value||'';
  if(walletId) txObj.wallet = walletId;
  if(payTypeId) txObj.payType = payTypeId;
  const _eCzk=_entryAmtCZK(walletId,amt); // v8.62: výchozí peněženka + základní měna ≠ CZK → zadáno v základní měně
  if(_eCzk!=null){ txObj.amount=_eCzk; txObj.amt=_eCzk; txObj.amtCZK=null; }
  else txObj.amtCZK=_readTxCzk(walletId,amt); // v8.58 (TODO-144): zafixovaná částka v Kč
  // Tagy
  const tagsRaw = document.getElementById('txTags')?.value || '';
  const tags = parseTags(tagsRaw);
  txObj.tags = tags; // vždy (i prázdné) – aby se smazání tagů propsalo
  if(eid) { const t=S.transactions.find(x=>x.id==eid); if(t) Object.assign(t,txObj); }
  else S.transactions.push({id:genTxId(),...txObj});
  save(); closeModal('modalAdd'); { const pid=selProjectId; selProjectId=''; if(pid&&curPage==='projektDetail'){renderProjectDetail(pid);}else{renderPage();} }
}
// S14: ── DLUH / SPLÁTKA – pomocné funkce (f2,f3,f4) ──────────────────
// f4: najdi reálnou kategorii „Splátka" (default cat35) – splátky se kategorizují sem.
function getSplatkaCat(){
  const cats=S.categories||[];
  return cats.find(c=>(c.name||'').trim().toLowerCase()==='splátka' && c.type!=='income')
      || cats.find(c=>c.id==='cat35')
      || null;
}
// f4: výběr druhu splátky (podkategorie kategorie Splátka)
function renderDebtSubPicker(){
  const picker=document.getElementById('debtSubPicker'); const wrap=document.getElementById('debtSubWrap');
  if(!picker) return;
  const cat=getSplatkaCat();
  if(!cat||!(cat.subs||[]).length){ if(wrap)wrap.style.display='none'; return; }
  if(wrap)wrap.style.display='block';
  const col=cat.color||'var(--accent)';
  picker.innerHTML=(cat.subs||[]).map(s=>`<div class="sub-chip ${_debtSub===s?'sel':''}" onclick="selDebtSub('${s}')" style="border-color:${col};${_debtSub===s?`background:${col};color:#fff;font-weight:600;`:'color:var(--text);'}">${s}</div>`).join('');
}
function selDebtSub(s){ _debtSub=(_debtSub===s?'':s); renderDebtSubPicker(); }
// f4: při výběru půjčky nabídni odpovídající druh splátky (jen pokud uživatel zatím nevybral)
function onDebtSelectChange(){
  const id=document.getElementById('txDebtId')?.value;
  const d=id?(S.debts||[]).find(x=>x.id===id):null;
  if(d && !_debtSub){
    const map={mortgage:'Splátka hypotéky',credit:'Splátka kreditní karty',personal:'Splátka úvěru',nonbank:'Splátka půjčky',ico:'Splátka úvěru',friend:'Splátka půjčky'};
    const cat=getSplatkaCat(); const guess=map[d.type];
    if(cat&&guess&&(cat.subs||[]).includes(guess)){ _debtSub=guess; renderDebtSubPicker(); }
  }
}
// f3: zobraz/skryj možnosti opakované splátky
function toggleDebtRecurring(){
  const on=document.getElementById('debtRecurring')?.checked;
  const opts=document.getElementById('debtRecurringOpts'); if(opts)opts.style.display=on?'block':'none';
}
// f3: datum příští splátky podle frekvence
function _nextPeriodDate(dateStr, freq){
  const d=new Date(dateStr||new Date());
  if(freq==='weekly') d.setDate(d.getDate()+7);
  else if(freq==='biweekly') d.setDate(d.getDate()+14);
  else d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,10);
}
// f2: zaplaceno / na jistině / na úrocích – počítáno z REÁLNÝCH transakcí (debtId),
// nezávisle na schedule.paid (odolné proti driftu). Jistina/úrok = mapování na kalendář.
function computeDebtPaid(d, D){
  D = D || getData();
  const txs=(D.transactions||[]).filter(t => t.debtId===d.id && !t.splitParent)
              .sort((a,b)=> new Date(a.date)-new Date(b.date));
  const paidSum=txs.reduce((a,t)=>a+txCZK(t,D),0);  // FIX-252/A: splátka v cizí měně
  const sched=d.schedule||[];
  let pPrin=0, pInt=0;
  if((d.interest||0)<=0 || !sched.length){
    pPrin=paidSum; pInt=0;
  } else {
    let consumed=paidSum;
    for(const s of sched){
      if(consumed<=0) break;
      const pay=s.payment||0;
      if(consumed>=pay){ pPrin+=(s.principal||0); pInt+=(s.interest||0); consumed-=pay; }
      else { const f=pay>0?consumed/pay:0; pPrin+=(s.principal||0)*f; pInt+=(s.interest||0)*f; consumed=0; }
    }
  }
  return { txs, paidSum, paidPrincipal:Math.round(pPrin), paidInterest:Math.round(pInt), count:txs.length };
}

function renderCatPicker(){
  const picker=document.getElementById('catPicker');if(!picker)return;
  const type=curTxType==='debt'?'expense':curTxType;
  const cats=S.categories.filter(c=>c.type===type||c.type==='both');
  picker.innerHTML=cats.map(c=>`<div class="cat-chip ${selCatId===c.id?'sel':''}" style="${selCatId===c.id?`background:${c.color}`:'border-color:'+c.color}" onclick="selCatBtn('${c.id}')">${c.icon} ${c.name}</div>`).join('');
  renderSubPicker();
}
function selCatBtn(id){selCatId=id;selSub='';customSub='';document.getElementById('customSubInput').value='';renderCatPicker();}
function renderSubPicker(){
  const wrap=document.getElementById('subPicker');const inner=document.getElementById('subPickerInner');
  const cat=S.categories.find(c=>c.id===selCatId);
  if(!cat||!(cat.subs||[]).length){if(wrap)wrap.style.display='none';return;}
  if(wrap)wrap.style.display='block';
  const catColor = cat?.color||'var(--accent)';
  inner.innerHTML=(cat.subs||[]).map(s=>`<div class="sub-chip ${selSub===s?'sel':''}" onclick="selSubBtn('${s}')" style="border-color:${catColor};${selSub===s?`background:${catColor};color:#fff;font-weight:600;`:'color:var(--text);'}">${s}</div>`).join('');
}
function selSubBtn(s){selSub=s;customSub='';document.getElementById('customSubInput').value='';renderSubPicker();}
// ══════════════════════════════════════════════════════
//  PŮJČKY – ENGINE
// ══════════════════════════════════════════════════════
const DEBT_TYPES = {
  personal: {label:'🏦 Spotřebitelský úvěr', rate:9.9, freq:'monthly', grace:0, tip:null},
  mortgage: {label:'🏠 Hypotéka', rate:5.5, freq:'monthly', grace:0, tip:null},
  nonbank:  {label:'⚠️ Nebankovní půjčka', rate:89, freq:'weekly', grace:14, tip:'💡 TIP: Mnoho nebankovních půjček má <strong>bezúročné období 14–30 dní</strong>. Splatíte-li celou částku včas, neplatíte žádný úrok! Vždy si ověřte VOP. RPSN může být i přes 100%!'},
  credit:   {label:'💳 Kreditní karta', rate:25, freq:'monthly', grace:45, tip:'💡 TIP: Kreditní karta má obvykle <strong>45 dní bezúročné období</strong>. Splatíte-li celý výpis včas, neplatíte žádné úroky. Po uplynutí se úroky (~25% p.a.) počítají zpětně!'},
  ico:      {label:'💼 Půjčka na IČO', rate:15, freq:'monthly', grace:0, tip:'⚠️ Půjčky na IČO mívají vysoké RPSN (15–60%). Vždy porovnejte nabídky více poskytovatelů.'},
  friend:   {label:'🤝 Od známého', rate:0, freq:'monthly', grace:0, tip:'💡 Doporučujeme sepsat i neformální smlouvu o půjčce – chrání obě strany.'},
};

function selectDebtType(type) {
  document.querySelectorAll('.debt-type-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('.debt-type-btn[data-type="'+type+'"]');
  if(btn) btn.classList.add('active');
  document.getElementById('dType').value = type;
  const dt = DEBT_TYPES[type];
  if(!dt) return;
  if(!document.getElementById('dInterest').value || document.getElementById('dInterest').value === '0')
    document.getElementById('dInterest').value = dt.rate;
  document.getElementById('dFreq').value = dt.freq;
  document.getElementById('dGrace').value = dt.grace;
  const tip = document.getElementById('debtTipBox');
  if(dt.tip) { tip.innerHTML = dt.tip; tip.style.display = 'block'; }
  else tip.style.display = 'none';
  generateSchedulePreview();
}

function calcAnnuity(principal, annualRate, periodsPerYear, totalPeriods) {
  if(annualRate <= 0) return principal / totalPeriods;
  const r = annualRate / 100 / periodsPerYear;
  return principal * r * Math.pow(1+r, totalPeriods) / (Math.pow(1+r, totalPeriods) - 1);
}

function generateSchedule(debt) {
  const principal = debt.remaining || debt.total || 0;
  const annualRate = debt.interest || 0;
  const freq = debt.freq || 'monthly';
  const periodsPerYear = freq === 'weekly' ? 52 : freq === 'biweekly' ? 26 : 12;
  const payment = debt.payment || calcAnnuity(principal, annualRate, periodsPerYear, 24);
  const ratePerPeriod = annualRate / 100 / periodsPerYear;
  const startDate = new Date(debt.startDate || new Date());
  const schedule = [];
  let remaining = principal;
  let periodNum = 0;
  // Zvýšen limit na 600 let (7200 měsíců) – prakticky neomezeno
  const maxPeriods = periodsPerYear * 600;
  while(remaining > 0.5 && periodNum < maxPeriods) {
    const interest = remaining * ratePerPeriod;
    const principalPart = Math.min(payment - interest, remaining);
    // Splátka nepokrývá úroky
    if(principalPart <= 0 && annualRate > 0) break;
    const actualPayment = Math.min(payment, remaining + interest);
    remaining = Math.max(0, remaining - principalPart);
    const d = new Date(startDate);
    if(freq === 'weekly') d.setDate(d.getDate() + periodNum * 7);
    else if(freq === 'biweekly') d.setDate(d.getDate() + periodNum * 14);
    else d.setMonth(d.getMonth() + periodNum);
    schedule.push({
      num: periodNum+1,
      date: d.toISOString().slice(0,10),
      payment: Math.round(actualPayment),
      principal: Math.round(principalPart),
      interest: Math.round(interest),
      remaining: Math.round(remaining),
      paid: false
    });
    periodNum++;
  }
  return schedule;
}

function calcRPSN(principal, schedule) {
  if(!schedule.length || !principal || principal <= 0) return 0;
  const totalPaid = schedule.reduce((a,s) => a + s.payment, 0);
  if(totalPaid <= principal) return 0;

  // Detekuj frekvenci
  const freq = schedule.length > 1
    ? Math.round((new Date(schedule[1].date) - new Date(schedule[0].date)) / (24*60*60*1000))
    : 30;
  const periodsPerYear = freq <= 8 ? 52 : freq <= 16 ? 26 : 12;

  // Použij jen prvních 360 splátek pro výpočet (výkon) – RPSN se nemění po 30 letech
  const sched = schedule.slice(0, 360);

  // Newton-Raphson – více iterací a lepší počáteční odhad
  // Počáteční odhad z jednoduchého vzorce: (totalInterest / principal) / (n/2)
  const totalInterest = sched.reduce((a,s) => a + s.interest, 0);
  const n = sched.length;
  let r = Math.max(0.0001, (totalInterest / principal) / (n / 2) / periodsPerYear);

  for(let iter = 0; iter < 200; iter++) {
    let npv = -principal;
    let dnpv = 0;
    sched.forEach((s, i) => {
      const t = i + 1;
      const disc = Math.pow(1 + r, t);
      npv += s.payment / disc;
      dnpv -= t * s.payment / (disc * (1 + r));
    });
    if(Math.abs(npv) < 0.001) break;
    if(Math.abs(dnpv) < 1e-10) break;
    const delta = npv / dnpv;
    r -= delta;
    if(r <= 0) r = 0.00001;
    if(r > 10) r = 0.5; // zamez divergenci
  }

  if(r <= 0 || r > 10) return 0;
  const annualRate = (Math.pow(1 + r, periodsPerYear) - 1) * 100;
  return Math.round(annualRate * 10) / 10;
}

function generateSchedulePreview() {
  const el = document.getElementById('schedulePreview'); if(!el) return;
  const total = parseFloat(document.getElementById('dTotal')?.value) || 0;
  const interest = parseFloat(document.getElementById('dInterest')?.value) || 0;
  const payment = parseFloat(document.getElementById('dPayment')?.value) || 0;
  const freq = document.getElementById('dFreq')?.value || 'monthly';
  if(!total) { el.innerHTML = ''; return; }
  // v8.71: plán počítá ze ZBÝVAJÍCÍ jistiny (u rozjetých úvěrů), splacenou část přičte zvlášť
  const remainNow = parseFloat(document.getElementById('dRemaining')?.value) || total;
  const alreadyPaid = Math.max(0, total - remainNow);
  const tempDebt = {total, remaining:remainNow, interest, payment:payment||0, freq, startDate:new Date().toISOString().slice(0,10)};
  const schedule = generateSchedule(tempDebt);
  if(!schedule.length) { el.innerHTML = '<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Splátka nepokrývá úroky! Zvyšte splátku.</div></div>'; return; }
  const totalPaid = schedule.reduce((a,s)=>a+s.payment,0);
  const totalInterest = schedule.reduce((a,s)=>a+s.interest,0);
  const rpsn = calcRPSN(total, schedule);
  const ppy = freq==='weekly'?52:freq==='biweekly'?26:12;
  const years = Math.floor(schedule.length/ppy);
  const rem = schedule.length%ppy;
  el.innerHTML = '<div style="background:var(--surface3);border-radius:10px;padding:12px;font-size:.78rem"><div style="font-weight:600;color:var(--text2);margin-bottom:8px">📊 Přehled splácení</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><span style="color:var(--text3)">Počet splátek:</span> <strong>'+schedule.length+' × '+(freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně')+'</strong></div><div><span style="color:var(--text3)">Doba:</span> <strong>'+(years>0?years+'r ':'')+rem+'m</strong></div><div><span style="color:var(--text3)">Ještě zaplatíte:</span> <strong style="color:var(--expense)">'+fmtB(Math.round(totalPaid))+'</strong></div><div style="grid-column:1/-1"><span style="color:var(--text3)">Celý úvěr vás vyjde na (plán, bez sankcí):</span> <strong style="color:var(--expense)">'+fmtB(Math.round(alreadyPaid+totalPaid))+'</strong>'+(alreadyPaid>0?' <span style="color:#8b90a8">(už splaceno '+fmtB(Math.round(alreadyPaid))+')</span>':'')+'</div><div><span style="color:var(--text3)">Z toho úroky:</span> <strong style="color:var(--debt)">'+fmtB(Math.round(totalInterest))+'</strong></div>'+(rpsn>0?'<div style="grid-column:1/-1"><span style="color:var(--text3)">RPSN:</span> <strong style="color:'+(rpsn>50?'var(--expense)':rpsn>20?'var(--debt)':'var(--income)')+'">'+rpsn+'%</strong> '+(rpsn>50?'⚠️ Velmi vysoké!':rpsn>20?'⚠️ Vysoké':'')+'</div>':'')+'</div></div>';
}

function openDebtModal() {
  if(viewingUid) return;
  document.getElementById('editDebtId').value = '';
  ['dName','dCreditor','dTotal','dRemaining','dPayment','dPenaltyPct','dPenaltyFixed','dDueDate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('dInterest').value='0';
  document.getElementById('dGrace').value='0';
  document.getElementById('dAlertDays').value='7';
  document.getElementById('dPriority').value='mid';
  document.getElementById('dFreq').value='monthly';
  document.getElementById('dType').value='personal';
  document.getElementById('dStartDate').value=new Date().toISOString().slice(0,10);
  document.getElementById('debtTipBox').style.display='none';
  document.getElementById('schedulePreview').innerHTML='';
  document.querySelectorAll('.debt-type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.debt-type-btn[data-type="personal"]')?.classList.add('active');
  document.getElementById('debtModalTitle').textContent='Přidat půjčku';
  document.getElementById('modalDebt').classList.add('open');
}

function editDebt(id) {
  if(viewingUid) return;
  const d=S.debts.find(x=>x.id===id); if(!d) return;
  document.getElementById('editDebtId').value=id;
  document.getElementById('dName').value=d.name||'';
  document.getElementById('dCreditor').value=d.creditor||'';
  document.getElementById('dTotal').value=d.total||'';
  document.getElementById('dRemaining').value=d.remaining||'';
  document.getElementById('dInterest').value=d.interest||'0';
  document.getElementById('dPayment').value=d.payment||'';
  document.getElementById('dFreq').value=d.freq||'monthly';
  document.getElementById('dPriority').value=d.priority||'mid';
  document.getElementById('dGrace').value=d.gracePeriod||'0';
  document.getElementById('dAlertDays').value=d.alertDays||'7';
  document.getElementById('dPenaltyPct').value=d.penaltyPct||'';
  document.getElementById('dPenaltyFixed').value=d.penaltyFixed||'';
  document.getElementById('dStartDate').value=d.startDate||'';
  document.getElementById('dDueDate').value=d.dueDate||'';
  document.getElementById('dType').value=d.type||'personal';
  document.querySelectorAll('.debt-type-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.debt-type-btn[data-type="'+(d.type||'personal')+'"]')?.classList.add('active');
  const dt=DEBT_TYPES[d.type];
  const tip=document.getElementById('debtTipBox');
  if(dt?.tip){tip.innerHTML=dt.tip;tip.style.display='block';}else tip.style.display='none';
  generateSchedulePreview();
  document.getElementById('debtModalTitle').textContent='Upravit půjčku';
  document.getElementById('modalDebt').classList.add('open');
}

function saveDebt() {
  if(viewingUid) return;
  const eid=document.getElementById('editDebtId').value;
  const name=document.getElementById('dName').value.trim();
  const total=parseFloat(document.getElementById('dTotal').value)||0;
  const remaining=parseFloat(document.getElementById('dRemaining').value)||total;
  const payment=Math.max(0,parseFloat(document.getElementById('dPayment').value)||0);
  if(!name||!total){alert('Vyplň název a celkovou částku');return;}
  const obj={name,total,remaining,
    interest:parseFloat(document.getElementById('dInterest').value)||0,
    payment,
    creditor:document.getElementById('dCreditor').value.trim(),
    freq:document.getElementById('dFreq').value,
    priority:document.getElementById('dPriority').value,
    type:document.getElementById('dType').value,
    gracePeriod:parseInt(document.getElementById('dGrace').value)||0,
    alertDays:parseInt(document.getElementById('dAlertDays').value)||7,
    penaltyPct:parseFloat(document.getElementById('dPenaltyPct').value)||0,
    penaltyFixed:parseFloat(document.getElementById('dPenaltyFixed').value)||0,
    startDate:document.getElementById('dStartDate').value||new Date().toISOString().slice(0,10),
    dueDate:document.getElementById('dDueDate').value||null,
  };
  obj.schedule=generateSchedule(obj);
  if(eid){const d=S.debts.find(x=>x.id===eid);if(d){obj.id=eid;Object.assign(d,obj);}}
  else S.debts.push({id:uid(),...obj});
  save();closeModal('modalDebt');renderPage();
}

function openDebtSim() {
  if(!S.debts.length){alert('Nejprve přidej půjčku.');return;}
  const sel=document.getElementById('simDebtId');
  sel.innerHTML=S.debts.map(d=>'<option value="'+d.id+'">'+d.name+' – zbývá '+fmt(d.remaining)+' Kč</option>').join('');
  const first=S.debts[0];
  document.getElementById('simAmt').value=first.payment||Math.round(calcAnnuity(first.remaining,first.interest||0,12,24));
  document.getElementById('simLump').value=0;
  runDebtSim();
  document.getElementById('modalDebtSim').classList.add('open');
}

function runDebtSim() {
  const id=document.getElementById('simDebtId')?.value;
  const d=S.debts.find(x=>x.id===id); if(!d) return;
  const simPayment=Math.max(1,parseFloat(document.getElementById('simAmt').value)||0);
  const lump=parseFloat(document.getElementById('simLump').value)||0;
  const rEl=document.getElementById('simResult'); if(!rEl) return;

  const origSchedule=d.schedule?.length?d.schedule:generateSchedule(d);
  const simDebt={...d, remaining:Math.max(0,d.remaining-lump), payment:simPayment};
  const simSchedule=generateSchedule(simDebt);

  if(!simSchedule.length){
    rEl.innerHTML='<div class="insight-item bad"><div class="insight-icon">🚨</div><div class="insight-text">Splátka nepokrývá úroky! Minimální splátka: '+fmt(Math.round(d.remaining*(d.interest/100/12)+1))+' Kč</div></div>';
    return;
  }

  const origTotal=origSchedule.reduce((a,s)=>a+s.payment,0);
  const simTotal=simSchedule.reduce((a,s)=>a+s.payment,0)+lump;
  const origInterest=origSchedule.reduce((a,s)=>a+s.interest,0);
  const simInterest=simSchedule.reduce((a,s)=>a+s.interest,0);

  // RPSN počítáme ze simSchedule s aktuální zbývající jistinou
  const rpsn=calcRPSN(simDebt.remaining, simSchedule);

  const freq=d.freq||'monthly';
  const fl=freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně';
  const mLen=(n)=>freq==='weekly'?Math.round(n/4.33)+' měs':freq==='biweekly'?Math.round(n/2.17)+' měs':n+' měs';

  // Správné porovnání – splácíme stejnou jistinu, porovnáváme jen úroky
  const interestSaved = origInterest - simInterest;
  const monthsSaved = origSchedule.length - simSchedule.length;

  // Nový plán je lepší jen pokud platíme MÉNĚ úroků celkem
  const better = interestSaved > 0;
  // Varování pokud je splátka nižší než původní
  const lowerPayment = simPayment < (d.payment||0);

  rEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border)">
        <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px;font-weight:700;text-transform:uppercase">Aktuální plán</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700">${mLen(origSchedule.length)}</div>
        <div style="font-size:.75rem;color:var(--text3)">${fmtB(d.payment||0)}/${fl}</div>
        <div style="font-size:.75rem;color:var(--debt);margin-top:4px">Úroky: ${fmtB(Math.round(origInterest))}</div>
        <div style="font-size:.75rem;color:var(--expense)">Celkem: ${fmtB(Math.round(origTotal))}</div>
      </div>
      <div style="background:${better?'var(--income-bg)':lowerPayment?'var(--expense-bg)':'var(--surface2)'};border-radius:10px;padding:12px;border:1px solid ${better?'rgba(74,222,128,.3)':lowerPayment?'rgba(248,113,113,.3)':'var(--border)'}">
        <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px;font-weight:700;text-transform:uppercase">Nový plán</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:${better?'var(--income)':lowerPayment?'var(--expense)':'var(--text)'}">${mLen(simSchedule.length)}</div>
        <div style="font-size:.75rem;color:var(--text3)">${fmtB(simPayment)}/${fl}${lump?' +'+fmt(lump)+' jednorázově':''}</div>
        <div style="font-size:.75rem;color:var(--debt);margin-top:4px">Úroky: ${fmtB(Math.round(simInterest))}</div>
        <div style="font-size:.75rem;color:var(--expense)">Celkem: ${fmtB(Math.round(simTotal))}</div>
      </div>
    </div>
    ${rpsn>0?`<div class="insight-item ${rpsn>50?'bad':rpsn>20?'warn':'good'}">
      <div class="insight-icon">📊</div>
      <div class="insight-text">RPSN nového plánu: <strong>${rpsn}%</strong> ${rpsn>50?'⚠️ Velmi vysoké!':rpsn>20?'Poměrně vysoké':'Přijatelné'}</div>
    </div>`:''}
    ${lowerPayment?`<div class="insight-item bad">
      <div class="insight-icon">⚠️</div>
      <div class="insight-text">Nižší splátka prodlouží splácení o <strong>${Math.abs(monthsSaved)} měsíců</strong> a zaplatíte o <strong>${fmtB(Math.round(Math.abs(interestSaved)))} více</strong> na úrocích.</div>
    </div>`:''}
    ${better&&!lowerPayment?`<div class="insight-item good">
      <div class="insight-icon">🎯</div>
      <div class="insight-text">Ušetříte <strong>${fmtB(Math.round(interestSaved))}</strong> na úrocích!</div>
    </div>`:''}
    ${monthsSaved>0&&!lowerPayment?`<div class="insight-item good">
      <div class="insight-icon">⏱️</div>
      <div class="insight-text">Zkrácení o <strong>${monthsSaved} splátek</strong> (${Math.floor(monthsSaved/12)}r ${monthsSaved%12}m)</div>
    </div>`:''}`;

  window._lastSimSchedule = simSchedule;
  drawSimChart(origSchedule, simSchedule);
}

function drawSimChart(origSchedule, simSchedule) {
  // Pokud voláno se starým API (jen jeden parametr), použij jako sim
  if(!simSchedule) { simSchedule = origSchedule; origSchedule = null; }
  setTimeout(() => {
    const canvas=document.getElementById('simChart'); if(!canvas) return;
    const W=canvas.parentElement?.clientWidth||480;
    if(W < 10) { setTimeout(()=>drawSimChart(origSchedule, simSchedule), 100); return; }
    canvas.width=W; canvas.height=230;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,230);
    if(!simSchedule.length) return;

    const step=Math.max(1,Math.floor(simSchedule.length/60));
    const pts=simSchedule.filter((_,i)=>i%step===0||i===simSchedule.length-1);
    const simTotal=simSchedule.reduce((a,s)=>a+s.payment,0);
    const origTotal=origSchedule?origSchedule.reduce((a,s)=>a+s.payment,0):simTotal;
    const maxVal=Math.max(simSchedule[0]?.remaining||0, simTotal, origTotal);
    if(!maxVal) return;

    // Více pravého paddingu aby label nepřetékal
    const pad={l:65,r:16,t:14,b:50};
    const cH=230-pad.t-pad.b;
    const cW=W-pad.l-pad.r;
    const x=i=>pad.l+(i/(pts.length-1||1))*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;

    // Build cumulative arrays
    let cumPaid=0, cumInterest=0;
    const cumPts=[], cumIntPts=[];
    pts.forEach((_,i)=>{
      const origIdx=i*step;
      for(let j=(i===0?0:((i-1)*step)+1); j<=Math.min(origIdx,simSchedule.length-1); j++){
        cumPaid+=simSchedule[j].payment;
        cumInterest+=simSchedule[j].interest;
      }
      cumPts.push(cumPaid);
      cumIntPts.push(cumInterest);
    });

    // Grid
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const yv=pad.t+cH*(1-f);
      ctx.beginPath(); ctx.moveTo(pad.l,yv); ctx.lineTo(W-pad.r,yv); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Interest area (red stacked)
    ctx.beginPath();
    pts.forEach((p,i)=>{
      const sy=y(p.remaining+cumIntPts[i]);
      i===0?ctx.moveTo(x(i),sy):ctx.lineTo(x(i),sy);
    });
    for(let i=pts.length-1;i>=0;i--) ctx.lineTo(x(i),y(pts[i].remaining));
    ctx.closePath(); ctx.fillStyle='rgba(248,113,113,.3)'; ctx.fill();
    ctx.beginPath();
    pts.forEach((p,i)=>{ const sy=y(p.remaining+cumIntPts[i]); i===0?ctx.moveTo(x(i),sy):ctx.lineTo(x(i),sy); });
    ctx.strokeStyle='rgba(248,113,113,.6)'; ctx.lineWidth=1.5; ctx.stroke();

    // Principal area (green)
    ctx.beginPath();
    ctx.moveTo(x(0),y(pts[0].remaining));
    pts.forEach((p,i)=>ctx.lineTo(x(i),y(p.remaining)));
    ctx.lineTo(x(pts.length-1),pad.t+cH); ctx.lineTo(x(0),pad.t+cH);
    ctx.closePath(); ctx.fillStyle='rgba(74,222,128,.2)'; ctx.fill();
    ctx.beginPath();
    pts.forEach((p,i)=>i===0?ctx.moveTo(x(i),y(p.remaining)):ctx.lineTo(x(i),y(p.remaining)));
    ctx.strokeStyle='#4ade80'; ctx.lineWidth=2.5; ctx.setLineDash([]); ctx.stroke();

    // Cumulative paid line (blue dashed)
    ctx.beginPath();
    cumPts.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='#60a5fa'; ctx.lineWidth=2; ctx.setLineDash([6,4]); ctx.stroke();
    ctx.setLineDash([]);

    // End dot + label – zarovnat doleva pokud je blízko pravého okraje
    const endX=x(pts.length-1);
    const endY=y(simTotal);
    ctx.beginPath(); ctx.moveTo(endX,pad.t); ctx.lineTo(endX,pad.t+cH);
    ctx.strokeStyle='rgba(96,165,250,.25)'; ctx.lineWidth=1; ctx.setLineDash([4,3]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(endX,endY,5,0,Math.PI*2);
    ctx.fillStyle='#60a5fa'; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1.5; ctx.stroke();

    // Label – vždy viditelný, posun doleva pokud u pravého okraje
    const lbl=fmtB(Math.round(simTotal));
    ctx.font='bold 10px Instrument Sans';
    const lblW=ctx.measureText(lbl).width+10;
    const lblX = endX+6+lblW > W-4 ? endX-lblW-8 : endX+6;
    const lblY = Math.max(pad.t+14, Math.min(endY, pad.t+cH-4));
    ctx.fillStyle='rgba(26,29,46,.92)';
    ctx.beginPath(); ctx.roundRect(lblX-2,lblY-13,lblW,16,4); ctx.fill();
    ctx.fillStyle='#60a5fa'; ctx.textAlign='left';
    ctx.fillText(lbl,lblX+3,lblY);
    ctx.font='9px Instrument Sans'; ctx.fillStyle='rgba(168,173,196,.7)';
    ctx.fillText('celkem',lblX+3,lblY-15);

    // Y labels
    ctx.fillStyle='rgba(168,173,196,.8)'; ctx.font='10px Instrument Sans'; ctx.textAlign='right';
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const v=maxVal*f;
      ctx.fillText(v>=1000?Math.round(v/1000)+'k':Math.round(v), pad.l-4, pad.t+cH*(1-f)+4);
    });

    // X labels
    ctx.textAlign='center'; ctx.font='10px Instrument Sans'; ctx.fillStyle='rgba(168,173,196,.7)';
    [0,Math.floor(pts.length/3),Math.floor(pts.length*2/3),pts.length-1].forEach(i=>{
      if(pts[i]) ctx.fillText(pts[i].date.slice(0,7), x(i), 230-34);
    });

    // Legend
    const legY=230-22;
    ctx.textAlign='left'; ctx.font='10px Instrument Sans';
    [{c:'#4ade80',l:'Zbývá jistina'},{c:'rgba(248,113,113,.7)',l:'Úroky'},{c:'#60a5fa',l:'Zaplaceno celkem',dash:true}].forEach((it,i)=>{
      const lx=pad.l+(i*120);
      if(it.dash){ctx.setLineDash([5,3]);ctx.strokeStyle=it.c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,legY+3);ctx.lineTo(lx+14,legY+3);ctx.stroke();ctx.setLineDash([]);}
      else{ctx.fillStyle=it.c;ctx.fillRect(lx,legY,14,4);}
      ctx.fillStyle='rgba(168,173,196,.8)'; ctx.fillText(it.l,lx+17,legY+7);
    });
  }, 50);
}

function openScheduleFromSim() {
  const id=document.getElementById('simDebtId')?.value;
  if(!id) { alert('Vyberte půjčku'); return; }
  // Don't close simulation – open schedule on top
  showDebtSchedule(id);
}

function showDebtSchedule(id) {
  const d=S.debts.find(x=>x.id===id); if(!d) return;
  const schedule=d.schedule?.length?d.schedule:generateSchedule(d);
  if(!schedule.length){
    document.getElementById('scheduleContent').innerHTML='<div style="text-align:center;padding:30px 16px;color:#a8aec8"><div style="font-size:2rem;margin-bottom:8px">📋</div><div style="font-weight:600;color:var(--text);margin-bottom:6px">Kalendář zatím nelze sestavit</div><div style="font-size:.82rem;line-height:1.5">Tato půjčka nemá nastavenou <strong>částku</strong> nebo <strong>měsíční splátku</strong>, takže nejde spočítat rozpis splátek. Doplň je v editaci půjčky (tlačítko \u270e).</div></div>';
    document.getElementById('modalSchedule').classList.add('open');
    return;
  }
  const today=new Date().toISOString().slice(0,10);
  const totalPaid=schedule.reduce((a,s)=>a+s.payment,0);
  const totalInterest=schedule.reduce((a,s)=>a+s.interest,0);
  const rpsn=calcRPSN(d.total||d.remaining,schedule);
  const rows=schedule.slice(0,120).map((s,i)=>{
    const isOverdue=!s.paid&&s.date<today;
    const isCurrent=!s.paid&&s.date>=today&&(i===0||schedule[i-1]?.paid);
    return '<div class="debt-schedule-row '+(s.paid?'paid':'')+(isOverdue?' overdue':'')+(isCurrent?' current':'')+'"><span>'+s.date+'</span><span style="text-align:right">'+fmt(s.payment)+' Kč</span><span style="text-align:right;color:var(--income)">'+fmt(s.principal)+' Kč</span><span style="text-align:right;color:var(--debt)">'+fmt(s.interest)+' Kč</span><span style="text-align:right;color:var(--text3)">'+fmt(s.remaining)+' Kč</span><span style="text-align:center">'+(s.paid?'✅':isOverdue?'⚠️':isCurrent?'▶':'○')+'</span></div>';
  }).join('');
  document.getElementById('scheduleContent').innerHTML='<div class="sched-stats" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px"><div class="stat-card expense"><div class="stat-label">Celkem zaplatíte</div><div class="stat-value down">'+fmt(Math.round(totalPaid))+' Kč</div></div><div class="stat-card debt"><div class="stat-label">Z toho úroky</div><div class="stat-value warn">'+fmt(Math.round(totalInterest))+' Kč</div></div><div class="stat-card income"><div class="stat-label">Počet splátek</div><div class="stat-value up">'+schedule.length+'</div></div><div class="stat-card bank"><div class="stat-label">RPSN</div><div class="stat-value '+(rpsn>50?'down':rpsn>20?'warn':'up')+'">'+rpsn+'%</div></div></div><div class="debt-schedule-row header"><span>Datum</span><span style="text-align:right">Splátka</span><span style="text-align:right">Jistina</span><span style="text-align:right">Úrok</span><span style="text-align:right">Zbývá</span><span>Stav</span></div><div style="max-height:380px;overflow-y:auto">'+rows+'</div>'+(schedule.length>120?'<div style="text-align:center;padding:8px;font-size:.74rem;color:var(--text3)">Zobrazeno prvních 120 z '+schedule.length+' splátek</div>':'');
  document.getElementById('modalSchedule').classList.add('open');
}

function showTransferInfo() {
  const box=document.getElementById('transferInfoBox');
  if(box) box.style.display=box.style.display==='none'?'block':'none';
}

function populateTxDebtSelect() {
  const sel=document.getElementById('txDebtId'); if(!sel) return;
  sel.innerHTML='<option value="">– vyberte půjčku –</option>'+(S.debts||[]).map(d=>'<option value="'+d.id+'">'+d.name+' – zbývá '+fmt(d.remaining)+' Kč</option>').join('');
}

function getCurInst(d) { return d?.payment || 0; }

// ══════════════════════════════════════════════════════
//  WIDGET: KALKULAČKA DLUHOVÉ REALITY
// ══════════════════════════════════════════════════════
function renderDebtRealityWidget(D) {
  const el = document.getElementById('debtRealityWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const totalRemaining = debts.reduce((a,d)=>a+d.remaining,0);
  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d)=>{
    const freq=d.freq||'monthly';
    return a+(freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  },0);

  // Celkové úroky ze všech splátkových kalendářů
  let totalWillPay=0, totalInterest=0;
  debts.forEach(d=>{
    const s=d.schedule?.length?d.schedule:generateSchedule(d);
    const paid=d.total-d.remaining;
    const futureTotal=s.reduce((a,p)=>a+p.payment,0);
    totalWillPay+=paid+futureTotal;
    totalInterest+=s.reduce((a,p)=>a+p.interest,0);
  });

  // Kolik stojí každý den
  // v8.71 (FIX-186): dřív se dělilo SOUČTEM délek všech úvěrů (jakoby běžely za sebou) → 125 Kč/den,
  // zatímco banner dělil délkou nejdelšího úvěru → 215 Kč/den. Sjednoceno na dobu nejdelšího úvěru.
  const _allSch2 = debts.map(d=>d.schedule?.length?d.schedule:generateSchedule(d));
  const _maxMo2 = Math.max(...(_allSch2.map(s=>s.length)), 1);
  const dailyCost = Math.round(totalInterest / (_maxMo2 * 30));

  // Kolik let/měsíců splácení zbývá
  const allSchedules = debts.map(d=>d.schedule?.length?d.schedule:generateSchedule(d));
  const maxMonths = Math.max(...allSchedules.map(s=>s.length),0);
  const years = Math.floor(maxMonths/12);
  const months = maxMonths%12;

  // Ekvivalenty přeplatku
  const overpay = Math.round(totalInterest);
  const vacations = Math.round(overpay/25000); // průměrná dovolená
  const iphones = Math.round(overpay/30000);
  const coffees = Math.round(overpay/65);

  // Příjem věnovaný dluhům
  const incomePct = baseIncome>0 ? Math.round(monthlyPayments/baseIncome*100) : 0;
  const yearsOfWork = baseIncome>0 ? Math.round(totalWillPay/baseIncome/12*10)/10 : 0;

  el.innerHTML=`<div class="reality-card">
    <div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">💥 Kalkulačka dluhové reality</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--expense)">${fmtB(overpay)}</div>
        <div class="reality-lbl">přeplatíte celkem na úrocích</div>
      </div>
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--debt)">${dailyCost} Kč</div>
        <div class="reality-lbl">stojí vás dluh každý den</div>
      </div>
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--expense)">${years>0?years+'r ':''} ${months}m</div>
        <div class="reality-lbl">ještě budete splácet</div>
      </div>
      <div class="reality-metric">
        <div class="reality-big" style="color:var(--debt)">${incomePct}%</div>
        <div class="reality-lbl">příjmu jde na splátky</div>
      </div>
    </div>
    <!-- Ekvivalenty -->
    <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);margin-bottom:10px">
      <div style="font-size:.74rem;font-weight:600;color:var(--text2);margin-bottom:8px">Za přeplacené úroky (${fmtB(overpay)}) byste mohli mít:</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:10px">
        <div style="text-align:center;min-width:0">
          <div style="font-size:1.6rem">✈️</div>
          <div style="font-family:Syne,sans-serif;font-size:clamp(.82rem,3.4vw,1.1rem);font-weight:800;color:var(--income);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${vacations}×</div>
          <div style="font-size:.68rem;color:#a8aec8">dovolených</div>
        </div>
        <div style="text-align:center;min-width:0">
          <div style="font-size:1.6rem">📱</div>
          <div style="font-family:Syne,sans-serif;font-size:clamp(.82rem,3.4vw,1.1rem);font-weight:800;color:var(--income);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${iphones}×</div>
          <div style="font-size:.68rem;color:#a8aec8">nových telefonů</div>
        </div>
        <div style="text-align:center;min-width:0">
          <div style="font-size:1.6rem">☕</div>
          <div style="font-family:Syne,sans-serif;font-size:clamp(.82rem,3.4vw,1.1rem);font-weight:800;color:var(--income);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fmt(coffees)}×</div>
          <div style="font-size:.68rem;color:#a8aec8">káv</div>
        </div>
        <div style="text-align:center;min-width:0">
          <div style="font-size:1.6rem">💼</div>
          <div style="font-family:Syne,sans-serif;font-size:clamp(.82rem,3.4vw,1.1rem);font-weight:800;color:var(--income);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${yearsOfWork}r</div>
          <div style="font-size:.68rem;color:#a8aec8">práce celkem</div>
        </div>
      </div>
    </div>
    <!-- Cena dluhu za hodinu – virální číslo -->
    <div class="hourly-cost-card" onclick="openFutureSim()" style="margin-bottom:10px">
      <div style="font-size:.72rem;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">💰 Vaše dluhy vás stojí</div>
      <div style="display:flex;align-items:baseline;justify-content:center;gap:8px;flex-wrap:wrap">
        <div class="hourly-big">${Math.round(totalInterest/Math.max(1,maxMonths*30*24))} Kč</div>
        <div style="font-size:clamp(.85rem,3.6vw,1.1rem);color:var(--text2);font-weight:600">každou hodinu</div>
      </div>
      <div style="font-size:.76rem;color:var(--text3);margin-top:6px">
        ${Math.round(totalInterest/Math.max(1,maxMonths*30))} Kč/den · ${Math.round(totalInterest/Math.max(1,maxMonths))} Kč/měsíc jen na úrocích
      </div>
      <div style="font-size:.68rem;color:#a8aec8;margin-top:4px">Klikněte pro simulaci jak to snížit →</div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  WIDGET: DLUHOVÝ STRES INDEX
// ══════════════════════════════════════════════════════
// S16 (TODO-162): Konfigurace Dluhového stres indexu – váhy (součet 100 b) + prahy metrik.
//   Zdroj pravdy shodný s doprovodným Excelem (FinanceFlow_StresIndex_Konfigurace.xlsx).
//   Váhy dle Milana; prahy nastaveny na základě ČNB praxe a finančních standardů – lze ladit.
const _STRESS_CFG = {
  w: { dsti:20, emergency:15, dti:15, interestCost:10, debtQuality:10, loanCount:8, avgRate:7, liquidity:5, trend:5, velocity:5 },
  emergencyMonthsFull: 6,     // ≥6 měsíců výdajů v hotovosti = 0 stresu (lineárně dolů k 0 měs. = max)
  interestCostMax: 0.15,      // úroky ≥15 % měsíčního příjmu = max stres
  avgRateMin: 3, avgRateMax: 20,   // vážený úrok: ≤3 % → 0, ≥20 % → max
  liquidityMonthsFull: 12,    // likvidní aktiva pokryjí ≥12 měsíců splátek = 0 stresu
  velocityFastMonths: 60, velocitySlowMonths: 360,  // horizont splacení jistiny: ≤5 let → 0, ≥30 let → max
  expensiveRate: 15,          // půjčka s úrokem > 15 % (nebo nebankovní/kreditka) = „drahý dluh"
  bands: { stable: 30, risk: 60 }   // <30 stabilní · <60 rizikové · jinak spirála
};

// ══ S16.8: VÝPOČET ODDĚLEN OD RENDERU (S11 princip) ══
//   computeStressIndex(D) → {total, level, color, label, bg, border, factors, incomeTrend}
//   Používá: render widgetu, Deník v2.1 (snímek stresu) i smoke-testy (tests/smoke.js).
function computeStressIndex(D) {
  const debts = D.debts || [];
  if(!debts.length) return null;

  // ══ S16 (TODO-162): 10 metrik, váhy dle Milana (součet 100 b). Každá metrika → STRES 0..váha
  //    (0 = zdravé, váha = maximální stres). Vyšší součet = horší. Prahy v _STRESS_CFG (viz Excel).
  const CFG = _STRESS_CFG, W = CFG.w;
  const _cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // — Sdílené vstupy —
  const incMonthly = computeEffectiveIncome(D, 12);          // 12M klouzavý průměr příjmu (S16/TODO-160)
  const monthlyPayments = computeMonthlyDebtPayments(D);
  const totalDebt = debts.reduce((a, d) => a + (d.remaining || 0), 0);
  const annualIncome = incMonthly * 12;
  const monthlyInterest = debts.reduce((a, d) => a + (d.remaining || 0) * (d.interest || 0) / 100 / 12, 0);
  const wAvgRate = totalDebt > 0 ? debts.reduce((a, d) => a + (d.remaining || 0) * (d.interest || 0), 0) / totalDebt : 0;
  const monthlyPrincipal = monthlyPayments - monthlyInterest;   // úbytek jistiny za měsíc
  const liq = (typeof assetLiqTotals === 'function') ? assetLiqTotals(D) : { wallets: 0, reserve: 0, mid: 0, fixed: 0 };
  // S16.6 (Milan, P2-2): Emergency Fund = KOLIK MĚSÍCŮ PŘEŽIJU BEZ PŘÍJMU.
  //   Likvidní = hotovost/účty (wallets) + likvidní rezerva (reserve: spořicí účet,
  //   termínovaný vklad). VYLOUČENO: penzijko/DIP a dlouhodobé (assetTier 'fixed' –
  //   assets.js už je tam řadí automaticky dle názvu/liq), i investice (mid: akcie/ETF –
  //   nejsou okamžitě k dispozici bez prodeje). Jmenovatel = avgMonthlyExp (níže) = VŠECHNY
  //   měsíční výdaje vč. splátek, pokud jsou vedené jako výdajová transakce ("pokrytí splátek atd").
  const emergencyCash = (liq.wallets || 0) + (liq.reserve || 0);
  const liquidAssets = (liq.reserve || 0) + (liq.mid || 0);     // Likvidita (jiná otázka: kryjí likvidní+investiční aktiva splátky dluhu?)
  let _et = 0, _en = 0; for (let i = 1; i <= 3; i++) { let mm = S.curMonth - i, yy = S.curYear; if (mm < 0) { mm += 12; yy--; } const e = expSum(getTx(mm, yy, D), D); if (e > 0) { _et += e; _en++; } }
  const avgMonthlyExp = _en ? _et / _en : 0;

  // 1. DSTI (splátky / měsíční příjem) – Milanova tabulka msc_DSTI invertovaná na stres
  const dsti = incMonthly > 0 ? monthlyPayments / incMonthly * 100 : 0;
  const dstiStress = (typeof msc_DSTI === 'function') ? Math.round((1 - msc_DSTI(dsti) / _SCORING.max.DSTI) * W.dsti) : Math.round(_cl(dsti / 50, 0, 1) * W.dsti);

  // 2. Emergency Fund (měsíce výdajů pokryté hotovostí)
  const emMonths = avgMonthlyExp > 0 ? emergencyCash / avgMonthlyExp : (emergencyCash > 0 ? CFG.emergencyMonthsFull : 0);
  const emStress = Math.round(_cl(W.emergency * (1 - emMonths / CFG.emergencyMonthsFull), 0, W.emergency));

  // 3. DTI (dluh / roční příjem) – Milanova tabulka msc_DTI invertovaná na stres
  const dti = annualIncome > 0 ? totalDebt / annualIncome * 100 : 0;
  const dtiStress = (typeof msc_DTI === 'function') ? Math.round((1 - msc_DTI(dti) / _SCORING.max.DTI) * W.dti) : Math.round(_cl(dti / 900, 0, 1) * W.dti);

  // 4. Interest Cost Ratio (úroky / měsíční příjem)
  const icRatio = incMonthly > 0 ? monthlyInterest / incMonthly : 1;
  const icStress = Math.round(_cl(W.interestCost * icRatio / CFG.interestCostMax, 0, W.interestCost));

  // 5. Debt Quality (podíl drahého dluhu dle OBJEMU – nahrazuje dřívější „Rizikové typy")
  const expensiveDebt = debts.filter(d => (d.interest || 0) > CFG.expensiveRate || d.type === 'nonbank' || d.type === 'creditcard' || d.type === 'kreditka').reduce((a, d) => a + (d.remaining || 0), 0);
  const expShare = totalDebt > 0 ? expensiveDebt / totalDebt : 0;
  const dqStress = Math.round(W.debtQuality * expShare);

  // 6. Počet půjček (1→0, každá další +2, strop = váha)
  const loanCount = debts.length;
  const lcStress = Math.round(_cl((loanCount - 1) * 2, 0, W.loanCount));

  // 7. Vážený průměr úroků
  const arStress = Math.round(_cl(W.avgRate * (wAvgRate - CFG.avgRateMin) / (CFG.avgRateMax - CFG.avgRateMin), 0, W.avgRate));

  // 8. Likvidita (kolik měsíců splátek pokryjí likvidní aktiva)
  const liqMonths = monthlyPayments > 0 ? liquidAssets / monthlyPayments : (liquidAssets > 0 ? CFG.liquidityMonthsFull : 0);
  const liqStress = Math.round(_cl(W.liquidity * (1 - liqMonths / CFG.liquidityMonthsFull), 0, W.liquidity));

  // 9. Trend splácení (klesá jistina? splácím všechny půjčky?)
  const unpaidLoans = debts.filter(d => (d.payment || 0) <= 0).length;
  const trendStress = monthlyPrincipal <= 0 ? W.trend : Math.round(_cl(unpaidLoans * 2, 0, W.trend));

  // 10. Debt Velocity (rychlost úbytku jistiny → horizont splacení)
  const payoffMonths = monthlyPrincipal > 0 ? totalDebt / monthlyPrincipal : Infinity;
  const velStress = monthlyPrincipal <= 0 ? W.velocity : Math.round(_cl(W.velocity * (payoffMonths - CFG.velocityFastMonths) / (CFG.velocitySlowMonths - CFG.velocityFastMonths), 0, W.velocity));

  // Příjmový trend – jen pro popisek pod gauge (není součást skóre)
  let pm = S.curMonth - 1, py = S.curYear; if (pm < 0) { pm = 11; py--; }
  const prevInc = incSum(getTx(pm, py, D), D);
  const curInc = incSum(getTx(S.curMonth, S.curYear, D), D);
  const incomeTrend = prevInc > 0 ? (curInc - prevInc) / prevInc * 100 : 0;

  const totalScore = Math.min(100, dstiStress + emStress + dtiStress + icStress + dqStress + lcStress + arStress + liqStress + trendStress + velStress);
  const stressLevel = totalScore < CFG.bands.stable ? 'stable' : totalScore < CFG.bands.risk ? 'risk' : 'spiral';
  const stressColor = stressLevel === 'stable' ? 'var(--income)' : stressLevel === 'risk' ? 'var(--debt)' : 'var(--expense)';
  const stressLabel = stressLevel === 'stable' ? '🟢 Stabilní' : stressLevel === 'risk' ? '🟡 Rizikové' : '🔴 Dluhová spirála';
  const stressBg = stressLevel === 'stable' ? 'rgba(74,222,128,.06)' : stressLevel === 'risk' ? 'rgba(251,191,36,.06)' : 'rgba(248,113,113,.06)';
  const stressBorder = stressLevel === 'stable' ? 'rgba(74,222,128,.2)' : stressLevel === 'risk' ? 'rgba(251,191,36,.2)' : 'rgba(248,113,113,.25)';

  // Hodnocení dle POMĚRU stres/váha (SKILL 6: hodnocení odděleně od hodnoty)
  const _note = (sc, mx) => { const r = mx ? sc / mx : 0; return r < 0.34 ? '✅ OK' : r < 0.67 ? '⚠️ Zvýšené' : '🚨 Kritické'; };
  const factors = [
    { label: 'Zatížení příjmu (DSTI)', val: Math.round(dsti) + '%', score: dstiStress, max: W.dsti, note: _note(dstiStress, W.dsti) },
    { label: 'Nouzová rezerva', val: emMonths >= CFG.emergencyMonthsFull ? '6+ měs.' : emMonths.toFixed(1) + ' měs.', score: emStress, max: W.emergency, note: _note(emStress, W.emergency) },
    { label: 'Celková zadluženost (DTI)', val: Math.round(dti) + '%', score: dtiStress, max: W.dti, note: _note(dtiStress, W.dti) },
    { label: 'Náklady na úroky', val: Math.round(icRatio * 100) + '% příjmu', score: icStress, max: W.interestCost, note: _note(icStress, W.interestCost) },
    { label: 'Kvalita dluhu (drahý podíl)', val: Math.round(expShare * 100) + '%', score: dqStress, max: W.debtQuality, note: _note(dqStress, W.debtQuality) },
    { label: 'Počet půjček', val: loanCount, score: lcStress, max: W.loanCount, note: _note(lcStress, W.loanCount) },
    { label: 'Vážený úrok', val: wAvgRate.toFixed(1) + '%', score: arStress, max: W.avgRate, note: _note(arStress, W.avgRate) },
    { label: 'Likvidita (kryje splátky)', val: liqMonths >= CFG.liquidityMonthsFull ? '12+ měs.' : liqMonths.toFixed(1) + ' měs.', score: liqStress, max: W.liquidity, note: _note(liqStress, W.liquidity) },
    { label: 'Trend splácení', val: monthlyPrincipal > 0 ? 'jistina klesá' : 'jistina neklesá', score: trendStress, max: W.trend, note: _note(trendStress, W.trend) },
    { label: 'Rychlost splácení', val: isFinite(payoffMonths) ? Math.round(payoffMonths / 12) + ' let' : '∞', score: velStress, max: W.velocity, note: _note(velStress, W.velocity) },
  ];

  return { total: totalScore, level: stressLevel, color: stressColor, label: stressLabel,
           bg: stressBg, border: stressBorder, factors, incomeTrend,
           inputs: { dsti, dti, emMonths, liqMonths, wAvgRate, payoffMonths, totalDebt, monthlyPayments } };
}

function renderDebtStressWidget(D) {
  const el = document.getElementById('debtStressWidget'); if(!el) return;
  const R = computeStressIndex(D);
  if(!R) { el.innerHTML=''; return; }
  const { total: totalScore, level: stressLevel, color: stressColor, label: stressLabel,
          bg: stressBg, border: stressBorder, factors, incomeTrend } = R;

  // S17.23 (Milan): redesign – gauge ve stylu Finančního obrazu (jednoduchý pruh s ukazatelem),
  // faktory jako KOMPAKTNÍ KARTY v mřížce místo dlouhého seznamu přes celou šířku.
  const _fCol = r => r<0.34?'var(--income)':r<0.67?'var(--debt)':'var(--expense)';
  el.innerHTML=`<div class="stress-card" style="background:${stressBg};border-color:${stressBorder}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div style="font-size:.72rem;font-weight:700;color:#a8aec8;text-transform:uppercase;letter-spacing:.06em">🧠 Dluhový stres index</div>
      <div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;color:${stressColor}">${totalScore}<span style="font-size:.9rem;color:#a8aec8">/100</span></div>
    </div>

    <!-- S17.24 (Milan): kompaktní ukazatel podle vzoru „Váš finanční trend" – užší pruh (200 px),
         vystředěný, s bílým jezdcem a popiskem pod ním. Nezabírá celou šířku karty. -->
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-family:Syne,sans-serif;font-size:1.5rem;font-weight:800;color:${stressColor}">${stressLabel}</div>
      <div style="margin:10px auto 6px;width:200px;max-width:80%;height:12px;background:linear-gradient(90deg,var(--income),var(--debt),var(--expense));border-radius:6px;position:relative">
        <div style="position:absolute;top:-4px;left:${Math.min(99,Math.max(1,totalScore))}%;transform:translateX(-50%);width:8px;height:20px;background:#fff;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.45);transition:left .8s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;width:200px;max-width:80%;margin:0 auto 4px;font-size:.62rem;color:#a8aec8">
        <span>Stabilní</span><span>Rizikové</span><span>Spirála</span>
      </div>
      ${incomeTrend!==0?`<div style="font-size:.7rem;color:#a8aec8;margin-top:4px">Příjem ${incomeTrend>0?'↑ roste':'↓ klesá'} o ${Math.abs(Math.round(incomeTrend))} % vs. minulý měsíc</div>`:''}
    </div>

    <!-- faktory jako kompaktní karty -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:8px">
      ${factors.map(f=>{
        const r=f.max?f.score/f.max:0, col=_fCol(r);
        return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:8px 9px;min-width:0">
          <div style="font-size:.62rem;font-weight:700;color:${col};text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.note}</div>
          <div style="font-size:.68rem;color:#a8aec8;line-height:1.25;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${f.label}">${f.label}</div>
          <div style="font-family:Syne,sans-serif;font-size:.98rem;font-weight:800;color:#e8eaf2;line-height:1.15;margin-bottom:5px">${f.val}</div>
          <div style="height:5px;background:var(--surface3);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${Math.round(r*100)}%;background:${col};border-radius:3px;transition:width .6s"></div>
          </div>
          <div style="font-size:.63rem;font-weight:700;color:${col};text-align:right;margin-top:3px">${f.score}/${f.max}</div>
        </div>`;
      }).join('')}
    </div>

    ${stressLevel!=='stable'?`<div style="margin-top:12px;padding:8px 12px;background:var(--surface2);border-radius:8px;font-size:.76rem;color:#c9cede">
      💡 ${stressLevel==='risk'?'Zvažte konsolidaci půjček nebo refinancování na nižší úrok.':'Váš finanční stres je kritický. Okamžitě kontaktujte finančního poradce nebo zvažte restrukturalizaci dluhů.'}
    </div>`:''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  SIMULACE BUDOUCNOSTI
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  DLUH VS INVESTOVÁNÍ
// ══════════════════════════════════════════════════════
function openDebtVsInvest() {
  if(!S.debts?.length) { alert('Nejprve přidejte půjčku.'); return; }
  const sel = document.getElementById('dviDebtId');
  sel.innerHTML = S.debts.map(d=>`<option value="${d.id}">${d.name} – ${d.interest}% p.a. – zbývá ${fmtB(d.remaining)}</option>`).join('');
  document.getElementById('dviAmount').value = Math.round((S.debts[0].payment||2000)*0.3);
  runDebtVsInvest();
  document.getElementById('modalDebtVsInvest').classList.add('open');
}

function runDebtVsInvest() {
  const id = document.getElementById('dviDebtId')?.value;
  const d = S.debts?.find(x=>x.id===id); if(!d) return;
  const monthly = parseFloat(document.getElementById('dviAmount')?.value)||0;
  const investReturn = parseFloat(document.getElementById('dviReturn')?.value)||7;
  const years = parseInt(document.getElementById('dviYears')?.value)||10;
  const rEl = document.getElementById('dviResult'); if(!rEl) return;
  if(!monthly) { rEl.innerHTML=''; return; }

  const debtRate = d.interest;
  const months = years * 12;

  // Varianta A: Extra splátka na půjčku
  const scheduleOrig = d.schedule?.length?d.schedule:generateSchedule(d);
  const debtWithExtra = {...d, payment:(d.payment||0)+monthly};
  const scheduleExtra = generateSchedule(debtWithExtra);
  const interestSaved = scheduleOrig.reduce((a,s)=>a+s.interest,0) - scheduleExtra.reduce((a,s)=>a+s.interest,0);
  const monthsSaved = scheduleOrig.length - scheduleExtra.length;
  // Po splacení investuj dál zbývající čas
  const remainingMonths = Math.max(0, months - scheduleExtra.length);
  const investAfterDebt = remainingMonths > 0 ?
    monthly * ((Math.pow(1+investReturn/100/12, remainingMonths)-1)/(investReturn/100/12)) : 0;
  const totalRepayBenefit = Math.round(interestSaved + investAfterDebt);

  // Varianta B: Investovat místo splácení
  const investTotal = Math.round(monthly * ((Math.pow(1+investReturn/100/12, months)-1)/(investReturn/100/12)));
  const extraInterestPaid = Math.round(monthly * monthsSaved); // úroky zaplacené navíc kvůli pomalejšímu splácení

  const netInvestBenefit = investTotal - extraInterestPaid;
  const breakeven = debtRate; // pokud výnos > úrok → investuj, jinak splácet

  const investWins = investReturn > debtRate;
  const winner = investWins ? 'invest' : 'repay';
  const winnerLabel = investWins ? '📈 Investování' : '💳 Splácení dluhu';
  const winnerColor = investWins ? 'var(--income)' : 'var(--bank)';
  const diff = Math.abs(totalRepayBenefit - netInvestBenefit);

  rEl.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div class="dvi-winner repay">
        <div style="font-size:.7rem;font-weight:700;color:var(--text3);margin-bottom:6px">💳 EXTRA SPLÁTKA</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--bank)">${fmtB(totalRepayBenefit)}</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:4px">ušetříte na úrocích + investice po splacení</div>
        <div style="font-size:.72rem;color:var(--income);margin-top:3px">Splatíte o ${Math.floor(monthsSaved/12)}r ${monthsSaved%12}m dříve</div>
      </div>
      <div class="dvi-winner invest">
        <div style="font-size:.7rem;font-weight:700;color:var(--text3);margin-bottom:6px">📈 INVESTOVÁNÍ (${investReturn}% p.a.)</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--income)">${fmtB(netInvestBenefit)}</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:4px">čistý výnos za ${years} let minus extra úroky</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:3px">Celkový výnos: ${fmtB(investTotal)}</div>
      </div>
    </div>
    <div style="background:${investWins?'rgba(74,222,128,.08)':'rgba(96,165,250,.08)'};border:1px solid ${investWins?'rgba(74,222,128,.2)':'rgba(96,165,250,.2)'};border-radius:12px;padding:14px;text-align:center;margin-bottom:10px">
      <div style="font-size:.8rem;color:var(--text3);margin-bottom:4px">Vítěz při úroku ${debtRate}% vs výnos ${investReturn}%</div>
      <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;color:${winnerColor}">${winnerLabel} 🏆</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:4px">o <strong>${fmtB(diff)}</strong> výhodnější za ${years} let</div>
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;font-size:.76rem;color:var(--text2);border:1px solid var(--border)">
      📐 <strong>Zlaté pravidlo:</strong> Pokud je výnos investice <strong>vyšší než úrok půjčky</strong> → investuj.
      Zlomový bod je při <strong>${debtRate}% výnosu</strong>.
      ${investReturn > debtRate ?
        `Váš očekávaný výnos ${investReturn}% > úrok ${debtRate}% → <span style="color:var(--income)">investování vychází lépe</span>.` :
        `Váš očekávaný výnos ${investReturn}% < úrok ${debtRate}% → <span style="color:var(--bank)">splácet je jistější volba</span>.`}
    </div>`;

  // Draw chart
  drawDviChart(scheduleOrig.length, scheduleExtra.length, monthly, investReturn, years);
}

// ══════════════════════════════════════════════════════
//  v8.71 (TODO-156): AVALANCHE vs SNĚHOVÁ KOULE – strategie splácení dluhů.
//  Avalanche = extra peníze na dluh s NEJVYŠŠÍM úrokem (matematicky optimální).
//  Sněhová koule = extra na NEJMENŠÍ zůstatek (psychologická rychlá vítězství).
//  Splátky splacených dluhů se valí dál na další dluh (kaskáda).
// ══════════════════════════════════════════════════════
function _payoffSim(strategy, extra, capMonths){
  const debts=(S.debts||[]).filter(d=>d.remaining>0).map((d,i)=>({
    idx:i, name:d.name, bal:d.remaining, rate:(d.interest||0)/100/12,
    pay:d.payment||Math.max(500, Math.round(d.remaining*0.02)), paidMonth:null
  }));
  if(!debts.length) return null;
  const cap=capMonths||600;
  let months=0, totalInterest=0; const curve=[debts.reduce((a,d)=>a+d.bal,0)];
  const intCurve=[0]; let firstPaidMonth=null, firstPaidName=null;
  const aliveCurve=[debts.length];                          // v8.74: počet živých půjček v čase
  const perDebt=debts.map(d=>({name:d.name, bal:[d.bal]})); // v8.74: zůstatek každé půjčky po měsících
  const focusCurve=[null];                                   // v8.74: na kterou půjčku šly extra peníze (S16.10: zarovnáno s ostatními křivkami)
  while(debts.some(d=>d.bal>0.5) && months<cap){
    months++;
    debts.forEach(d=>{ if(d.bal>0){ const ir=d.bal*d.rate; d.bal+=ir; totalInterest+=ir; } });
    let budget = debts.reduce((a,d)=>a+d.pay,0) + extra; // uvolněné splátky se valí dál (koule/lavina)
    debts.forEach(d=>{ if(d.bal>0){ const p=Math.min(d.pay,d.bal,budget); d.bal-=p; budget-=p; } });
    let focus=null;
    while(budget>0.5){
      const alive=debts.filter(d=>d.bal>0.5);
      if(!alive.length) break;
      // S16.10 (FIX-199): tie-break – při shodné sazbě/zůstatku rozhodne druhé kritérium
      alive.sort(strategy==='avalanche' ? (a,b)=>(b.rate-a.rate)||(a.bal-b.bal) : (a,b)=>(a.bal-b.bal)||(b.rate-a.rate));
      const t=alive[0]; if(focus===null) focus=t.name; const p=Math.min(budget,t.bal); t.bal-=p; budget-=p;
    }
    debts.forEach(d=>{ if(d.paidMonth===null && d.bal<=0.5) d.paidMonth=months; });
    curve.push(Math.max(0,debts.reduce((a,d)=>a+Math.max(0,d.bal),0)));
    intCurve.push(Math.round(totalInterest));
    aliveCurve.push(debts.filter(d=>d.bal>0.5).length);
    perDebt.forEach((pd,k)=>pd.bal.push(Math.max(0,debts[k].bal)));
    focusCurve.push(focus);
    if(firstPaidMonth===null){ const done=debts.find(d=>d.bal<=0.5); if(done){ firstPaidMonth=months; firstPaidName=done.name; } }
  }
  return { months, totalInterest:Math.round(totalInterest), curve, intCurve, aliveCurve, perDebt, focusCurve,
           firstPaidMonth, firstPaidName, paidMonths:debts.map(d=>({name:d.name, m:d.paidMonth})) };
}

function openAvalanche(){
  const debts=(S.debts||[]).filter(d=>d.remaining>0);
  if(debts.length<2){ alert('Strategie dává smysl při 2+ dluzích. Přidej půjčky.'); return; }
  let ov=document.getElementById('avalancheOverlay'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='avalancheOverlay';
  ov.style.cssText='position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:14px';
  ov.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)">
      <strong>🏔️ Avalanche vs ⚪ Sněhová koule</strong>
      <button onclick="document.getElementById('avalancheOverlay').remove()" style="background:none;border:none;color:var(--text3);font-size:1.1rem;cursor:pointer">✕</button>
    </div>
    <div style="padding:14px 16px">
      <div style="font-size:.74rem;color:#a8aec8;line-height:1.5;margin-bottom:10px">
        <strong style="color:#60a5fa">🏔️ Avalanche</strong> = extra peníze na dluh s <strong>nejvyšším úrokem</strong> (ušetří nejvíc).
        <strong style="color:#f472b6">⚪ Koule</strong> = na <strong>nejmenší zůstatek</strong> (rychlá vítězství, motivace). Splátka splaceného dluhu se valí na další.
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:600"><span>💰 Extra měsíčně navíc</span><span id="avaExtraLbl" style="color:var(--income)">+2 000 Kč</span></div>
        <input type="range" id="avaExtra" min="0" max="20000" step="500" value="2000" style="width:100%" oninput="renderAvalanche()">
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:600"><span>📅 Horizont grafu</span><span id="avaYearsLbl" style="color:var(--bank)">30 let</span></div>
        <input type="range" id="avaYears" min="5" max="30" step="1" value="30" style="width:100%" oninput="renderAvalanche()">
      </div>
      <div id="avaResult"></div>
    </div>
    <div style="display:flex;justify-content:flex-end;padding:12px 16px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" onclick="document.getElementById('avalancheOverlay').remove()">Zavřít</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  renderAvalanche();
}

function renderAvalanche(){
  const extra=parseFloat(document.getElementById('avaExtra')?.value)||0;
  const years=parseInt(document.getElementById('avaYears')?.value)||30;
  const lbl=document.getElementById('avaExtraLbl'); if(lbl) lbl.textContent='+'+fmtB(extra);
  const yl=document.getElementById('avaYearsLbl'); if(yl) yl.textContent=years+' let';
  const el=document.getElementById('avaResult'); if(!el) return;
  const cap=years*12;
  const av=_payoffSim('avalanche',extra,cap), sn=_payoffSim('snowball',extra,cap);
  if(!av||!sn){ el.innerHTML=''; return; }
  const dur=m=>`${Math.floor(m/12)}r ${m%12}m`;
  const saved=sn.totalInterest-av.totalInterest;

  // ── Graf 1: kumulativní zaplacené úroky (rozdíl strategií) ──
  const maxM=Math.max(av.intCurve.length,sn.intCurve.length), maxV=Math.max(sn.totalInterest,av.totalInterest,1);
  const W=520,H=170,pad={l:52,r:10,t:22,b:26};
  const cw=W-pad.l-pad.r, ch=H-pad.t-pad.b;
  const X=i=>pad.l+i/Math.max(1,maxM-1)*cw, Y=v=>pad.t+ch*(1-v/maxV);
  const path=c=>c.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  let grid=''; [0,0.5,1].forEach(f=>{ const v=maxV*f,yy=Y(v); const b=czkToBase(v);
    grid+=`<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="rgba(168,174,200,.18)" stroke-dasharray="3,3"/><text x="${pad.l-6}" y="${yy+3.5}" text-anchor="end" font-size="9.5" fill="#a8aec8">${b>=1e6?(Math.round(b/1e5)/10)+'M':Math.round(b/1000)+'k'}</text>`; });
  const yrs=Math.ceil(maxM/12);
  let xt=''; [0,0.5,1].forEach(f=>{ xt+=`<text x="${X((maxM-1)*f)}" y="${H-8}" text-anchor="middle" font-size="9.5" fill="#a8aec8">${Math.round(yrs*f)}. rok</text>`; });

  // S16.10: graf zůstatku dluhu (čitelnější než kumulativní úroky, kde je rozdíl <2 %)
  const maxDebt=Math.max(av.curve[0],sn.curve[0],1);
  const Xd=i=>pad.l+i/Math.max(1,maxM-1)*cw, Yd=v=>pad.t+ch*(1-v/maxDebt);
  const pathD=c=>c.map((v,i)=>`${i?'L':'M'}${Xd(i).toFixed(1)},${Yd(v).toFixed(1)}`).join(' ');
  let gridD=''; [0,0.5,1].forEach(f=>{ const v=maxDebt*f,yy=Yd(v); const b=czkToBase(v);
    gridD+=`<line x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}" stroke="rgba(168,174,200,.18)" stroke-dasharray="3,3"/><text x="${pad.l-6}" y="${yy+3.5}" text-anchor="end" font-size="9.5" fill="#a8aec8">${b>=1e6?(Math.round(b/1e5)/10)+'M':Math.round(b/1000)+'k'}</text>`; });
  // S16.10 (Milan): milníky = kdy Avalanche splatí půjčku → svislice PROPOJUJÍ oba grafy
  const milestones=av.paidMonths.filter(x=>x.m!=null&&x.m<=maxM).sort((a,b)=>a.m-b.m);

  // ── Graf 2: počet půjček v čase (schodovitý, klesající) ──
  const maxAlive=Math.max(av.aliveCurve[0],1);
  const H2=110, pad2={l:52,r:10,t:16,b:24}, ch2=H2-pad2.t-pad2.b, cw2=W-pad2.l-pad2.r;
  const Xa=i=>pad2.l+i/Math.max(1,maxM-1)*cw2, Ya=v=>pad2.t+ch2*(1-v/maxAlive);
  const stepPath=c=>{ let p=''; c.forEach((v,i)=>{ const x=Xa(i),y=Ya(v); if(i===0)p+=`M${x},${y}`; else p+=`L${x},${Ya(c[i-1])} L${x},${y}`; }); return p; };
  let ygrid=''; for(let k=0;k<=maxAlive;k++){ const yy=Ya(k); ygrid+=`<line x1="${pad2.l}" y1="${yy}" x2="${W-pad2.r}" y2="${yy}" stroke="rgba(168,174,200,.12)"/><text x="${pad2.l-6}" y="${yy+3.5}" text-anchor="end" font-size="9" fill="#a8aec8">${k}</text>`; }

  // ── Tabulka toku peněz (Avalanche): kdy je která půjčka splacená ──
  const rowsPaid=av.paidMonths.slice().sort((a,b)=>(a.m||9999)-(b.m||9999));
  const debtsInfo=(S.debts||[]).filter(d=>d.remaining>0);
  const tbl=`<div style="overflow-x:auto;margin-top:4px"><table style="width:100%;border-collapse:collapse;font-size:.72rem">
    <thead><tr style="color:#a8aec8;text-align:left"><th style="padding:5px 6px">Půjčka</th><th style="padding:5px 6px;text-align:right">Úrok</th><th style="padding:5px 6px;text-align:right">Zbývá</th><th style="padding:5px 6px;text-align:right">🏔️ Splaceno za</th><th style="padding:5px 6px;text-align:right">⚪ Splaceno za</th></tr></thead>
    <tbody>${rowsPaid.map(r=>{
      const di=debtsInfo.find(d=>d.name===r.name)||{};
      const snM=(sn.paidMonths.find(x=>x.name===r.name)||{}).m;
      const avDone=r.m!==null, snDone=snM!=null;
      return `<tr style="border-top:1px solid var(--border)">
        <td style="padding:5px 6px;${avDone?'color:#8b90a8':'color:var(--text)'}">${avDone?'✅ ':''}${r.name}</td>
        <td style="padding:5px 6px;text-align:right;color:#a8aec8">${(di.interest||0)}%</td>
        <td style="padding:5px 6px;text-align:right">${fmtB(di.remaining||0)}</td>
        <td style="padding:5px 6px;text-align:right;color:${avDone?'#4ade80':'#a8aec8'}">${avDone?dur(r.m):'—'}</td>
        <td style="padding:5px 6px;text-align:right;color:${snDone?'#4ade80':'#a8aec8'}">${snDone?dur(snM):'—'}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;

  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div style="background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:.7rem;color:#60a5fa;font-weight:700">🏔️ AVALANCHE</div>
        <div style="font-size:1.05rem;font-weight:800;font-family:Syne">${dur(av.months)}</div>
        <div style="font-size:.72rem;color:#a8aec8">úroky ${fmtB(av.totalInterest)}</div>
      </div>
      <div style="background:rgba(244,114,182,.08);border:1px solid rgba(244,114,182,.3);border-radius:10px;padding:10px;text-align:center">
        <div style="font-size:.7rem;color:#f472b6;font-weight:700">⚪ SNĚHOVÁ KOULE</div>
        <div style="font-size:1.05rem;font-weight:800;font-family:Syne">${dur(sn.months)}</div>
        <div style="font-size:.72rem;color:#a8aec8">úroky ${fmtB(sn.totalInterest)}</div>
      </div>
    </div>
    <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.3);border-radius:10px;padding:9px 12px;font-size:.78rem;margin-bottom:12px;line-height:1.55">
      ${saved>100?`🏔️ <strong>Avalanche ušetří <span style="color:var(--income)">${fmtB(saved)}</span> na úrocích</strong>${av.months<sn.months?` a je o ${dur(sn.months-av.months)} rychlejší`:''}.`
        :`Rozdíl úroků je zanedbatelný (${fmtB(Math.abs(saved))}) – sazby dluhů jsou podobné, vyber co tě víc motivuje.`}
      ${sn.firstPaidMonth?`<br>⚪ Koule splatí první dluh (${sn.firstPaidName}) už za <strong>${dur(sn.firstPaidMonth)}</strong>${av.firstPaidMonth?` · 🏔️ Avalanche první až za <strong>${dur(av.firstPaidMonth)}</strong>`:''} – rychlé vítězství = motivace.`:''}
    </div>

    <div style="font-size:.72rem;color:#c9cede;font-weight:700;margin-bottom:2px">📉 Zbývající dluh v čase <span style="font-weight:400;color:#a8aec8">· svislice = splacená půjčka</span></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block;margin-bottom:4px">
      <text x="${pad.l}" y="12" font-size="9.5" fill="#60a5fa" font-weight="700">— Avalanche</text>
      <text x="${pad.l+90}" y="12" font-size="9.5" fill="#f472b6" font-weight="700">— Koule</text>
      <text x="11" y="${pad.t+ch/2}" font-size="9" fill="#a8aec8" transform="rotate(-90 11 ${pad.t+ch/2})" text-anchor="middle">Dluh (${curSym()})</text>
      <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t+ch}" stroke="rgba(168,174,200,.45)"/>
      <line x1="${pad.l}" y1="${pad.t+ch}" x2="${W-pad.r}" y2="${pad.t+ch}" stroke="rgba(168,174,200,.45)"/>
      ${gridD}${xt}
      ${milestones.map(ms=>`<line x1="${Xd(ms.m).toFixed(1)}" y1="${pad.t}" x2="${Xd(ms.m).toFixed(1)}" y2="${pad.t+ch}" stroke="rgba(74,222,128,.45)" stroke-width="1" stroke-dasharray="4,3"><title>${ms.name} splacena (${dur(ms.m)})</title></line>
        <circle cx="${Xd(ms.m).toFixed(1)}" cy="${pad.t+4}" r="3" fill="#4ade80"><title>${ms.name} splacena (${dur(ms.m)})</title></circle>`).join('')}
      <path d="${pathD(sn.curve)}" fill="none" stroke="#f472b6" stroke-width="2.5"/>
      <path d="${pathD(av.curve)}" fill="none" stroke="#60a5fa" stroke-width="2.5"/>
    </svg>
    <div style="font-size:.68rem;color:#a8aec8;margin-bottom:10px">🟢 Zelené svislice = okamžik, kdy Avalanche splatí půjčku – v tu chvíli se její splátka „valí" na další (proto křivka pak klesá strměji). Úroky celkem: 🏔️ ${fmtB(av.totalInterest)} vs ⚪ ${fmtB(sn.totalInterest)}.</div>

    <div style="font-size:.72rem;color:#c9cede;font-weight:700;margin-bottom:2px">🔢 Počet aktivních půjček (Avalanche) <span style="font-weight:400;color:#a8aec8">· stejné svislice jako výše</span></div>
    <svg viewBox="0 0 ${W} ${H2}" preserveAspectRatio="xMidYMid meet" style="width:100%;max-width:${W}px;height:auto;display:block;margin-bottom:4px">
      <text x="11" y="${pad2.t+ch2/2}" font-size="9" fill="#a8aec8" transform="rotate(-90 11 ${pad2.t+ch2/2})" text-anchor="middle">Půjček</text>
      ${ygrid}
      <line x1="${pad2.l}" y1="${pad2.t+ch2}" x2="${W-pad2.r}" y2="${pad2.t+ch2}" stroke="rgba(168,174,200,.45)"/>
      ${[0,0.5,1].map(f=>`<text x="${Xa((maxM-1)*f)}" y="${H2-6}" text-anchor="middle" font-size="9" fill="#a8aec8">${Math.round(yrs*f)}.r</text>`).join('')}
      ${milestones.map(ms=>`<line x1="${Xa(ms.m).toFixed(1)}" y1="${pad2.t}" x2="${Xa(ms.m).toFixed(1)}" y2="${pad2.t+ch2}" stroke="rgba(74,222,128,.45)" stroke-width="1" stroke-dasharray="4,3"><title>${ms.name} splacena (${dur(ms.m)})</title></line>`).join('')}
      <path d="${stepPath(av.aliveCurve)}" fill="none" stroke="#4ade80" stroke-width="2.5"/>
      ${milestones.map(ms=>`<text x="${Xa(ms.m).toFixed(1)}" y="${pad2.t-4}" text-anchor="middle" font-size="8.5" fill="#4ade80" font-weight="700">${dur(ms.m)}</text>`).join('')}
    </svg>
    <div style="font-size:.68rem;color:#a8aec8;margin-bottom:12px">Každý schod dolů = o jednu půjčku míň. Svislice sedí přesně na svislicích v horním grafu – vidíš, jak se v tom okamžiku zrychlí pokles dluhu.</div>

    <div style="font-size:.72rem;color:#c9cede;font-weight:700;margin-bottom:2px">💸 Kam tečou volné peníze (pořadí splácení)</div>
    ${tbl}
    <div style="font-size:.66rem;color:#a8aec8;margin-top:6px;line-height:1.5">✅ = splacená půjčka (zešedne). Volné peníze po splacení se valí na další dluh v pořadí dle strategie.</div>`;
}

function drawDviChart(origMonths, extraMonths, monthly, investReturn, years) {
  // v8.71: přepis dle standardů – canvas neumí CSS var() (čáry byly neviditelné),
  // chyběly popisky os, legenda kolidovala, žádný tooltip, rozmazané na mobilu.
  setTimeout(()=>{
    const canvas = document.getElementById('dviChart'); if(!canvas) return;
    const W = canvas.parentElement?.clientWidth||480, H = 210;
    const dpr = window.devicePixelRatio||1;
    canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.width=W+'px'; canvas.style.height=H+'px';
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,H);
    const months = years*12, r = investReturn/100/12;
    const pad={l:58,r:12,t:26,b:34};
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
    const investSeries=[], repaySeries=[];
    let cumInvest=0, cumSaved=0;
    for(let i=1;i<=months;i++){
      cumInvest = cumInvest*(1+r)+monthly;
      if(i<=extraMonths) cumSaved=0; else cumSaved = cumSaved*(1+r)+monthly;
      investSeries.push(cumInvest); repaySeries.push(cumSaved);
    }
    const maxVal = Math.max(...investSeries, ...repaySeries, 1);
    const x=i=>pad.l+(i/months)*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;
    // Mřížka + ticky Y (v základní měně)
    ctx.setLineDash([3,3]); ctx.lineWidth=1;
    ctx.font='10px Instrument Sans'; ctx.textAlign='right';
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const v=maxVal*f, yy=y(v);
      ctx.strokeStyle='rgba(168,174,200,.18)';
      ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(W-pad.r,yy);ctx.stroke();
      ctx.fillStyle='#a8aec8';
      const b=czkToBase(v);
      ctx.fillText(b>=1e6?(Math.round(b/1e5)/10)+'M':b>=1000?Math.round(b/1000)+'k':Math.round(b), pad.l-6, yy+3.5);
    });
    ctx.setLineDash([]);
    // Osy
    ctx.strokeStyle='rgba(168,174,200,.45)';
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+cH);ctx.lineTo(W-pad.r,pad.t+cH);ctx.stroke();
    // Čáry
    ctx.beginPath(); investSeries.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.stroke();
    ctx.beginPath(); repaySeries.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
    // Popisky X (roky) + názvy os
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';
    [0,0.25,0.5,0.75,1].forEach(f=>ctx.fillText(Math.round(years*f)+'. rok', x(months*f), pad.t+cH+14));
    ctx.font='9px Instrument Sans';
    ctx.save();ctx.translate(11,pad.t+cH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Hodnota ('+curSym()+')',0,0);ctx.restore();
    // Legenda NAHOŘE
    ctx.textAlign='left';ctx.font='10.5px Instrument Sans';
    let lx=pad.l;
    [['#4ade80','Investice hned',false],['#60a5fa','Splácet → pak investovat',true]].forEach(([c,l,dash])=>{
      ctx.strokeStyle=c;ctx.lineWidth=3;if(dash)ctx.setLineDash([5,3]);
      ctx.beginPath();ctx.moveTo(lx,12);ctx.lineTo(lx+16,12);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#c9cede';ctx.fillText(l,lx+20,15);
      lx+=20+ctx.measureText(l).width+18;
    });
    // Tooltip (myš i dotyk)
    canvas.onmousemove = canvas.ontouchstart = function(ev){
      const e=ev.touches?ev.touches[0]:ev;
      const rect=canvas.getBoundingClientRect();
      const i=Math.max(0,Math.min(months-1,Math.round((e.clientX-rect.left-pad.l)/cW*months)));
      const html=`<b>${Math.floor(i/12)}r ${i%12}m</b><br><span style="color:#4ade80">●</span> Investice hned: ${fmtB(investSeries[i])}<br><span style="color:#60a5fa">●</span> Splácet→investovat: ${fmtB(repaySeries[i])}`;
      if(typeof _obrazTip==='function') _obrazTip(ev, html);
    };
    canvas.onmouseleave=function(){ if(typeof _obrazTipHide==='function') _obrazTipHide(); };
  },50);
}
function openDelayCost() {
  if(!S.debts?.length) { alert('Nejprve přidejte půjčku.'); return; }
  const sel = document.getElementById('delayDebtId');
  sel.innerHTML = S.debts.map(d=>`<option value="${d.id}">${d.name} – ${d.interest}% p.a.</option>`).join('');
  const firstDebt = S.debts[0];
  document.getElementById('delayNewRate').value = Math.max(1, Math.round((firstDebt.interest||10) * 0.6 * 10)/10);
  runDelayCost();
  document.getElementById('modalDelayCost').classList.add('open');
}

function runDelayCost() {
  const id = document.getElementById('delayDebtId')?.value;
  const d = S.debts?.find(x=>x.id===id); if(!d) return;
  const newRate = parseFloat(document.getElementById('delayNewRate')?.value)||0;
  const rEl = document.getElementById('delayCostResult'); if(!rEl) return;
  if(!newRate || newRate >= d.interest) {
    rEl.innerHTML=`<div class="insight-item warn"><div class="insight-icon">⚠️</div><div class="insight-text">Nový úrok musí být nižší než současný (${d.interest}%)</div></div>`;
    return;
  }

  const origSchedule = d.schedule?.length?d.schedule:generateSchedule(d);
  const origInterest = origSchedule.reduce((a,s)=>a+s.interest,0);

  // Refinancování dnes
  const refinNow = {...d, interest:newRate};
  refinNow.schedule = generateSchedule(refinNow);
  const refinNowInterest = refinNow.schedule.reduce((a,s)=>a+s.interest,0);
  const saveNow = Math.round(origInterest - refinNowInterest);

  // Refinancování za X měsíců
  const delays = [3,6,12,24,36];
  const delayRows = delays.map(delayMonths => {
    // After delay months, remaining debt
    let rem = d.remaining;
    let extraInterest = 0;
    const r = d.interest/100/12;
    for(let i=0;i<delayMonths && rem>0;i++) {
      const interest = rem*r;
      const principal = Math.min((d.payment||0)-interest, rem);
      if(principal<=0) break;
      extraInterest += interest;
      rem = Math.max(0, rem-principal);
    }
    const delayedDebt = {...d, remaining:rem, interest:newRate, payment:d.payment};
    const delayedSchedule = generateSchedule(delayedDebt);
    const delayedInterest = delayedSchedule.reduce((a,s)=>a+s.interest,0) + extraInterest;
    const saveDelayed = Math.round(origInterest - delayedInterest);
    const costOfDelay = saveNow - saveDelayed;
    return {months:delayMonths, save:saveDelayed, cost:costOfDelay};
  });

  const costPerMonth = delayRows[0].cost / 3;

  rEl.innerHTML=`
    <div style="background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:10px;padding:12px;margin-bottom:12px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px">Refinancujete-li DNES (${d.interest}% → ${newRate}%)</div>
      <div style="font-family:Syne,sans-serif;font-size:1.8rem;font-weight:800;color:var(--income)">Ušetříte ${fmtB(saveNow)}</div>
      <div style="font-size:.76rem;color:var(--text3);margin-top:4px">Každý měsíc čekání vás stojí ~${fmtB(Math.round(costPerMonth))}</div>
    </div>
    <div style="margin-bottom:10px">
      <div class="delay-row today">
        <span style="font-weight:700;color:var(--income)">✅ Refinancování DNES</span>
        <span style="font-weight:800;color:var(--income);font-family:Syne,sans-serif">${fmtB(saveNow)}</span>
      </div>
      ${delayRows.map(r=>`
        <div class="delay-row later">
          <div>
            <div style="font-weight:600">Za ${r.months < 12 ? r.months+' měsíců' : Math.floor(r.months/12)+(r.months%12?' r '+r.months%12+' m':' rok')}</div>
            <div style="font-size:.72rem;color:var(--expense)">Přijdete o ${fmtB(r.cost)} odkládáním</div>
          </div>
          <span style="font-weight:700;color:${r.save>0?'var(--text2)':'var(--expense)'};font-family:Syne,sans-serif">${r.save>0?fmtB(r.save):'nevýhodné'}</span>
        </div>
      `).join('')}
    </div>
    <div style="font-size:.74rem;color:var(--text3);text-align:center;padding:8px">
      ⏰ Každý den bez refinancování vás stojí <strong style="color:var(--expense)">${fmtB(Math.round(costPerMonth/30))}</strong>
    </div>`;
}

function openFutureSim() {
  if(!S.debts?.length) { alert('Nejprve přidejte půjčku.'); return; }
  const sel = document.getElementById('futureSimDebtId');
  sel.innerHTML = S.debts.map(d=>`<option value="${d.id}">${d.name} – zbývá ${fmtB(d.remaining)}</option>`).join('');
  document.getElementById('futureSlider').value = 1000;
  document.getElementById('futureSliderVal').textContent = '+1 000 Kč';
  runFutureSim();
  document.getElementById('modalFutureSim').classList.add('open');
}

function runFutureSim() {
  const id = document.getElementById('futureSimDebtId')?.value;
  const d = S.debts?.find(x=>x.id===id); if(!d) return;
  const extra = parseInt(document.getElementById('futureSlider')?.value)||0;
  const rEl = document.getElementById('futureSimResult'); if(!rEl) return;

  // Original
  const origSchedule = d.schedule?.length?d.schedule:generateSchedule(d);
  const origTotal = origSchedule.reduce((a,s)=>a+s.payment,0);
  const origInterest = origSchedule.reduce((a,s)=>a+s.interest,0);

  // With extra payment
  const newDebt = {...d, payment:(d.payment||0)+extra};
  const newSchedule = generateSchedule(newDebt);
  const newTotal = newSchedule.reduce((a,s)=>a+s.payment,0);
  const newInterest = newSchedule.reduce((a,s)=>a+s.interest,0);

  const savedMoney = Math.round(origTotal - newTotal);
  const savedMonths = origSchedule.length - newSchedule.length;
  const savedYears = Math.floor(savedMonths/12);
  const savedMonthsRem = savedMonths%12;
  const freq = d.freq||'monthly';
  const freqLabel = freq==='weekly'?'týdně':freq==='biweekly'?'2 týdny':'měsíčně';

  if(extra === 0) {
    rEl.innerHTML=`<div style="text-align:center;padding:16px;color:var(--text3)">Pohybujte sliderem pro zobrazení výsledku</div>`;
    return;
  }

  rEl.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);text-align:center">
        <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px;font-weight:600">BEZ ZMĚNY</div>
        <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:700">${origSchedule.length} splátek</div>
        <div style="font-size:.76rem;color:var(--text3)">${fmtB(d.payment||0)}/${freqLabel}</div>
        <div style="font-size:.76rem;color:var(--debt);margin-top:4px">Úroky: ${fmtB(Math.round(origInterest))}</div>
      </div>
      <div style="background:var(--income-bg);border-radius:10px;padding:12px;border:1px solid rgba(74,222,128,.3);text-align:center">
        <div style="font-size:.68rem;color:#a8aec8;margin-bottom:4px;font-weight:600">S EXTRA +${fmtB(extra)}</div>
        <div style="font-family:Syne,sans-serif;font-size:1rem;font-weight:700;color:var(--income)">${newSchedule.length} splátek</div>
        <div style="font-size:.76rem;color:var(--text3)">${fmtB((d.payment||0)+extra)}/${freqLabel}</div>
        <div style="font-size:.76rem;color:var(--income);margin-top:4px">Úroky: ${fmtB(Math.round(newInterest))}</div>
      </div>
    </div>
    ${savedMoney>0?`
    <div style="background:linear-gradient(135deg,rgba(74,222,128,.1),rgba(96,165,250,.05));border:1px solid rgba(74,222,128,.2);border-radius:12px;padding:14px;text-align:center">
      <div style="font-size:.74rem;color:var(--text3);margin-bottom:4px">Přidáním ${fmtB(extra)}/${freqLabel} navíc:</div>
      <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">
        <div>
          <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:var(--income)">💰 ${fmtB(savedMoney)}</div>
          <div style="font-size:.72rem;color:var(--text3)">ušetříte na úrocích</div>
        </div>
        <div>
          <div style="font-family:Syne,sans-serif;font-size:1.6rem;font-weight:800;color:var(--income)">⏱️ ${savedYears>0?savedYears+'r ':''} ${savedMonthsRem}m</div>
          <div style="font-size:.72rem;color:var(--text3)">dříve splatíte</div>
        </div>
      </div>
    </div>`:''}`;

  // Draw comparison chart
  drawFutureSimChart(origSchedule, newSchedule);
}

function drawFutureSimChart(orig, newSched) {
  // v8.71: přepis dle standardů – hex barvy, DPR, osy s popisky, legenda nahoře, tooltip.
  setTimeout(()=>{
    const canvas = document.getElementById('futureSimChart'); if(!canvas) return;
    const W = canvas.parentElement?.clientWidth||480, H = 210;
    const dpr = window.devicePixelRatio||1;
    canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.width=W+'px'; canvas.style.height=H+'px';
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,H);
    if(!orig.length) return;
    const maxMonths = Math.max(orig.length, newSched.length);
    const s0=[orig[0]?.remaining||0], s1=[newSched[0]?.remaining||0];
    orig.forEach(p=>s0.push(p.remaining)); newSched.forEach(p=>s1.push(p.remaining));
    const maxVal=Math.max(s0[0],s1[0],1);
    const pad={l:58,r:12,t:26,b:34};
    const cW=W-pad.l-pad.r, cH=H-pad.t-pad.b;
    const x=i=>pad.l+(i/maxMonths)*cW;
    const y=v=>pad.t+cH-(v/maxVal)*cH;
    ctx.setLineDash([3,3]);ctx.lineWidth=1;ctx.font='10px Instrument Sans';ctx.textAlign='right';
    [0,0.25,0.5,0.75,1].forEach(f=>{
      const v=maxVal*f, yy=y(v);
      ctx.strokeStyle='rgba(168,174,200,.18)';
      ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(W-pad.r,yy);ctx.stroke();
      ctx.fillStyle='#a8aec8';
      const b=czkToBase(v);
      ctx.fillText(b>=1e6?(Math.round(b/1e5)/10)+'M':b>=1000?Math.round(b/1000)+'k':Math.round(b), pad.l-6, yy+3.5);
    });
    ctx.setLineDash([]);
    ctx.strokeStyle='rgba(168,174,200,.45)';
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+cH);ctx.lineTo(W-pad.r,pad.t+cH);ctx.stroke();
    // Čáry: bez změny (šedá) vs s extra splátkou (zelená)
    ctx.beginPath(); s0.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='#8b90a8';ctx.lineWidth=2.5;ctx.stroke();
    ctx.beginPath(); s1.forEach((v,i)=>i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle='#4ade80';ctx.lineWidth=2.5;ctx.stroke();
    // Konec splácení – zvýrazněné body
    ctx.fillStyle='#8b90a8';ctx.beginPath();ctx.arc(x(orig.length),y(0),4,0,7);ctx.fill();
    ctx.fillStyle='#4ade80';ctx.beginPath();ctx.arc(x(newSched.length),y(0),5,0,7);ctx.fill();
    // Popisky X (roky) + osy
    ctx.fillStyle='#a8aec8';ctx.font='10px Instrument Sans';ctx.textAlign='center';
    const yrs=Math.ceil(maxMonths/12);
    [0,0.25,0.5,0.75,1].forEach(f=>ctx.fillText(Math.round(yrs*f)+'. rok', x(maxMonths*f), pad.t+cH+14));
    ctx.font='9px Instrument Sans';
    ctx.save();ctx.translate(11,pad.t+cH/2);ctx.rotate(-Math.PI/2);ctx.fillText('Zbývá jistina ('+curSym()+')',0,0);ctx.restore();
    // Legenda NAHOŘE
    ctx.textAlign='left';ctx.font='10.5px Instrument Sans';
    let lx=pad.l;
    [['#8b90a8','Bez změny'],['#4ade80','S extra splátkou']].forEach(([c,l])=>{
      ctx.strokeStyle=c;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(lx,12);ctx.lineTo(lx+16,12);ctx.stroke();
      ctx.fillStyle='#c9cede';ctx.fillText(l,lx+20,15);
      lx+=20+ctx.measureText(l).width+18;
    });
    // Tooltip
    canvas.onmousemove = canvas.ontouchstart = function(ev){
      const e=ev.touches?ev.touches[0]:ev;
      const rect=canvas.getBoundingClientRect();
      const i=Math.max(0,Math.min(maxMonths,Math.round((e.clientX-rect.left-pad.l)/cW*maxMonths)));
      const v0=s0[Math.min(i,s0.length-1)], v1=s1[Math.min(i,s1.length-1)];
      const html=`<b>${Math.floor(i/12)}r ${i%12}m</b><br><span style="color:#8b90a8">●</span> Bez změny: ${fmtB(v0)}<br><span style="color:#4ade80">●</span> S extra: ${fmtB(v1)}`;
      if(typeof _obrazTip==='function') _obrazTip(ev, html);
    };
    canvas.onmouseleave=function(){ if(typeof _obrazTipHide==='function') _obrazTipHide(); };
  },50);
}
function renderDebtFreedomWidget(D) {
  const el = document.getElementById('debtFreedomWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d) => {
    const freq = d.freq||'monthly';
    const monthly = freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0);
    return a + monthly;
  }, 0);
  if(!baseIncome || !monthlyPayments) { el.innerHTML=''; return; }

  const pct = Math.min(100, Math.round(monthlyPayments / baseIncome * 100));
  const _now = new Date();
  const daysPerMonth = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).getDate(); // 28–31 dle měsíce
  const rawRatio = baseIncome > 0 ? monthlyPayments / baseIncome : 1;
  const daysForDebt = Math.min(daysPerMonth, Math.round(daysPerMonth * rawRatio));
  const daysForSelf = daysPerMonth - daysForDebt;
  const safe = pct <= 30;
  const warning = pct > 30 && pct <= 50;
  const barColor = safe?'var(--income)':warning?'var(--debt)':'var(--expense)';

  // Fun metrics
  const coffeePrice = 65; // Kč za kávu
  const coffeesPerMonth = Math.round(monthlyPayments / coffeePrice);
  const pizzaPrice = 180;
  const pizzasPerMonth = Math.round(monthlyPayments / pizzaPrice);
  const netflixPrice = 239;
  const netflixMonths = Math.round(monthlyPayments / netflixPrice);
  const hourlyWage = Math.round(baseIncome / (21 * 8)); // Kč/hod
  const hoursForDebt = Math.round(monthlyPayments / hourlyWage);

  // Debt-free day
  const allSchedules = debts.map(d => d.schedule?.length ? d.schedule : generateSchedule(d));
  const lastPaymentDate = allSchedules.reduce((latest, schedule) => {
    if(!schedule.length) return latest;
    const last = schedule[schedule.length-1].date;
    return last > latest ? last : latest;
  }, new Date().toISOString().slice(0,10));
  const debtFreeDate = new Date(lastPaymentDate);
  const today = new Date();
  const daysUntilFree = Math.ceil((debtFreeDate - today) / (24*60*60*1000));
  const yearsUntilFree = Math.floor(daysUntilFree / 365);
  const monthsUntilFree = Math.floor((daysUntilFree % 365) / 30);
  const debtFreeDateStr = debtFreeDate.toLocaleDateString('cs-CZ', {day:'numeric', month:'long', year:'numeric'});

  el.innerHTML = `<div class="debt-freedom-card">
    <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">💸 Jak pracuješ pro banky</div>

    <!-- Hlavní číslo -->
    <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:14px">
      <div style="text-align:center;min-width:80px">
        <div class="debt-days-big" style="color:${barColor}">${daysForDebt}</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:2px">dní / měsíc<br>pro banky</div>
      </div>
      <div style="flex:1;min-width:160px">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text3);margin-bottom:3px">
          <span>0 dní</span>
          <span style="color:${barColor};font-weight:700">${pct}% příjmu</span>
          <span>21 dní</span>
        </div>
        <div class="trap-bar" style="height:14px">
          <div class="trap-bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div style="font-size:.74rem;margin-top:5px">
          ${safe?`<span style="color:var(--income)">✅ Bezpečné pásmo</span>`:
            warning?`<span style="color:var(--debt)">⚠️ Zvýšené zatížení</span>`:
            `<span style="color:var(--expense)">🚨 Kritické! Hrozí finanční potíže</span>`}
        </div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:3px">
          Splátky <strong>${fmtB(Math.round(monthlyPayments))}</strong> z příjmu <strong>${fmtB(Math.round(baseIncome))}</strong>
        </div>
      </div>
    </div>

    <!-- Vizuální kalendář -->
    <div style="display:flex;gap:2px;flex-wrap:wrap;margin-bottom:8px">
      ${Array.from({length:daysPerMonth},(_,i)=>`
        <div title="${i<daysForDebt?'Pro banky':'Pro tebe'}" style="width:24px;height:24px;border-radius:4px;background:${i<daysForDebt?barColor:'var(--income)'};opacity:${i<daysForDebt?'.8':'.75'};display:flex;align-items:center;justify-content:center;font-size:.66rem;color:white;font-weight:700">${i+1}</div>
      `).join('')}
    </div>
    <div style="font-size:.68rem;color:#a8aec8;margin-bottom:14px">
      <span style="background:${barColor};padding:1px 8px;border-radius:3px;color:white;opacity:.8">■ ${daysForDebt} dní pro banky</span>
      &nbsp;
      <span style="background:var(--income);padding:1px 8px;border-radius:3px;color:white;opacity:.4">■ ${daysForSelf} dní pro tebe</span>
    </div>

    <!-- Fun metriky -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px">
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">☕</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${coffeesPerMonth}×</div>
        <div style="font-size:.72rem;color:var(--text3)">káv měsíčně místo splátky</div>
        <div style="font-size:.68rem;color:#a8aec8;margin-top:2px">(při ceně ${coffeePrice} Kč/káva)</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">🍕</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${pizzasPerMonth}×</div>
        <div style="font-size:.72rem;color:var(--text3)">pizz měsíčně místo splátky</div>
        <div style="font-size:.68rem;color:#a8aec8;margin-top:2px">(při ceně ${pizzaPrice} Kč/pizza)</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">📺</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${netflixMonths}×</div>
        <div style="font-size:.72rem;color:var(--text3)">Netflix měsíců místo splátky</div>
        <div style="font-size:.68rem;color:#a8aec8;margin-top:2px">(${netflixPrice} Kč/měs)</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:10px 12px;border:1px solid var(--border)">
        <div style="font-size:1.4rem;margin-bottom:2px">⏱️</div>
        <div style="font-family:Syne,sans-serif;font-size:1.2rem;font-weight:800;color:var(--debt)">${hoursForDebt}h</div>
        <div style="font-size:.72rem;color:var(--text3)">práce měsíčně jen na dluhy</div>
        <div style="font-size:.68rem;color:#a8aec8;margin-top:2px">(${hourlyWage} Kč/hod)</div>
      </div>
    </div>

    <!-- Debt-free day -->
    <div style="background:linear-gradient(135deg,rgba(74,222,128,.1),rgba(96,165,250,.1));border:1px solid rgba(74,222,128,.25);border-radius:12px;padding:12px 14px;text-align:center">
      <div style="font-size:.72rem;color:var(--text3);margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.06em">🎉 Debt-free day</div>
      <div style="font-family:Syne,sans-serif;font-size:1.3rem;font-weight:800;color:var(--income)">${debtFreeDateStr}</div>
      <div style="font-size:.78rem;color:var(--text2);margin-top:4px">
        za <strong>${yearsUntilFree > 0 ? yearsUntilFree+'r ' : ''}${monthsUntilFree}m</strong> budete zcela bez dluhů! 🥳
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  WIDGET: MAPA DLUHOVÉ PASTI
// ══════════════════════════════════════════════════════
function renderDebtTrapWidget(D) {
  const el = document.getElementById('debtTrapWidget'); if(!el) return;
  const debts = D.debts || [];
  if(!debts.length) { el.innerHTML=''; return; }

  const totalBorrowed = debts.reduce((a,d) => a + (d.total||0), 0);
  const totalRemaining = debts.reduce((a,d) => a + (d.remaining||0), 0);

  // Calculate total to be paid (from schedules)
  let totalWillPay = 0;
  debts.forEach(d => {
    const schedule = d.schedule?.length ? d.schedule : generateSchedule(d);
    const paid = d.total - d.remaining; // already paid
    totalWillPay += paid + schedule.reduce((a,s)=>a+s.payment,0);
  });

  const totalInterest = totalWillPay - totalBorrowed;
  const overpayCurrent = totalWillPay - totalBorrowed;
  const overpayPct = totalBorrowed > 0 ? Math.round(overpayCurrent/totalBorrowed*100) : 0;

  // Already paid back
  const alreadyPaid = debts.reduce((a,d) => a + (d.total - d.remaining), 0);
  const progressPct = totalBorrowed > 0 ? Math.min(100, Math.round(alreadyPaid/totalBorrowed*100)) : 0;

  const severity = overpayPct < 20 ? 'low' : overpayPct < 50 ? 'mid' : 'high';
  const severityColor = severity==='low'?'var(--income)':severity==='mid'?'var(--debt)':'var(--expense)';
  const severityLabel = severity==='low'?'Výhodné půjčky':'mid'===severity?'Průměrné zatížení':'🔴 Dluhová past';

  el.innerHTML = `<div class="debt-trap-card">
    <div style="font-size:.72rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">🗺️ Mapa dluhové pasti</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
      <div>
        <div style="font-size:.68rem;color:#a8aec8">Půjčeno celkem</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700">${fmtB(totalBorrowed)}</div>
      </div>
      <div>
        <div style="font-size:.68rem;color:#a8aec8">Celkem zaplatíte</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:var(--expense)">${fmtB(Math.round(totalWillPay))}</div>
      </div>
      <div>
        <div style="font-size:.68rem;color:#a8aec8">Přeplatíte</div>
        <div style="font-family:Syne,sans-serif;font-size:1.1rem;font-weight:700;color:${severityColor}">+${fmtB(Math.round(totalInterest))}</div>
      </div>
    </div>
    <!-- Přeplatek bar -->
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text3);margin-bottom:3px">
        <span>Jistina ${fmtB(totalBorrowed)}</span>
        <span style="color:${severityColor};font-weight:700">+${overpayPct}% přeplatek</span>
      </div>
      <div style="height:16px;border-radius:8px;background:var(--surface3);overflow:hidden;position:relative">
        <div style="height:100%;width:${Math.min(100,100/(1+overpayPct/100))}%;background:var(--income);border-radius:8px 0 0 8px;position:absolute"></div>
        <div style="height:100%;left:${Math.min(100,100/(1+overpayPct/100))}%;right:0;background:${severityColor};opacity:.7;position:absolute;border-radius:0 8px 8px 0"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.68rem;margin-top:2px">
        <span style="color:var(--income)">■ Jistina</span>
        <span style="color:${severityColor}">■ Úroky +${fmtB(Math.round(totalInterest))}</span>
        <span style="color:${severityColor};font-weight:700">${severityLabel}</span>
      </div>
    </div>
    <!-- Pokrok splácení -->
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text3);margin-bottom:3px">
        <span>Pokrok splácení</span>
        <span style="font-weight:600;color:var(--income)">${progressPct}% splaceno</span>
      </div>
      <div class="trap-bar"><div class="trap-bar-fill" style="width:${progressPct}%;background:var(--income)"></div></div>
      <div style="font-size:.7rem;color:var(--text3);margin-top:2px">Splaceno: ${fmtB(alreadyPaid)} · Zbývá: ${fmtB(totalRemaining)}</div>
    </div>
    ${buildDebtSpiralWarnings(D)}
    ${debts.length > 0 ? `<div style="margin-top:10px;text-align:center">
      <button class="btn btn-ghost btn-sm" onclick="openBetterLoanPage()" style="font-size:.76rem">
        🔍 Najdeme vám výhodnější refinancování →
      </button>
    </div>` : ''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  VAROVNÉ SIGNÁLY DLUHOVÉ SPIRÁLY
// ══════════════════════════════════════════════════════
function buildDebtSpiralWarnings(D) {
  const debts = D.debts || [];
  if(!debts.length) return '';
  const baseIncome = computeBaseIncome(D);
  const monthlyPayments = debts.reduce((a,d) => {
    const freq = d.freq||'monthly';
    return a + (freq==='weekly'?(d.payment||0)*4.33:freq==='biweekly'?(d.payment||0)*2.17:(d.payment||0));
  }, 0);
  const dsti = baseIncome > 0 ? monthlyPayments/baseIncome*100 : 0;

  const warnings = [];
  const good = [];

  // Signál 1 – splátky > 50% příjmu
  if(dsti > 50) warnings.push('🔴 Splátky tvoří ' + Math.round(dsti) + '% příjmu (> 50%) – kritické zatížení');
  else if(dsti > 35) warnings.push('🟡 Splátky tvoří ' + Math.round(dsti) + '% příjmu (> 35%) – zvýšené riziko');
  else good.push('✅ Splátky ' + Math.round(dsti) + '% příjmu – v bezpečném pásmu');

  // Signál 2 – více než 4 půjčky
  if(debts.length > 4) warnings.push('🔴 Máte ' + debts.length + ' půjček – typický znak dluhové spirály');
  else if(debts.length > 2) warnings.push('🟡 Máte ' + debts.length + ' půjčky – zvažte konsolidaci');
  else good.push('✅ Počet půjček (' + debts.length + ') je v pořádku');

  // Signál 3 – nebankovní půjčky
  const nonbank = debts.filter(d => d.type==='nonbank');
  if(nonbank.length > 0) warnings.push('🔴 ' + nonbank.length + ' nebankovní půjčka – velmi vysoké RPSN');

  // Signál 4 – kreditní karty
  const credit = debts.filter(d => d.type==='credit');
  if(credit.length > 0) {
    const creditDebt = credit.reduce((a,d)=>a+d.remaining,0);
    const creditTotal = credit.reduce((a,d)=>a+d.total,0);
    const creditPct = creditTotal > 0 ? creditDebt/creditTotal*100 : 0;
    if(creditPct > 70) warnings.push('🔴 Kreditní karta využita na ' + Math.round(creditPct) + '% limitu (> 70%)');
    else if(creditPct > 40) warnings.push('🟡 Kreditní karta využita na ' + Math.round(creditPct) + '% limitu');
    else good.push('✅ Kreditní karta využita na ' + Math.round(creditPct) + '% – OK');
  }

  // Signál 5 – vysoké RPSN
  const highRpsnDebts = debts.filter(d => d.interest > 30);
  if(highRpsnDebts.length > 0) warnings.push('🔴 ' + highRpsnDebts.length + ' půjčka s úrokem > 30% p.a. – drahé peníze');

  // Signál 6 – po splatnosti
  const today = new Date().toISOString().slice(0,10);
  const overdueDebts = debts.filter(d => d.dueDate && d.dueDate < today && d.remaining > 0);
  if(overdueDebts.length > 0) warnings.push('🔴 ' + overdueDebts.length + ' půjčka po datu splatnosti!');

  if(!warnings.length && !good.length) return '';

  const spiralRisk = warnings.filter(w=>w.startsWith('🔴')).length;
  const overallStatus = spiralRisk >= 3 ? 'danger' : spiralRisk >= 1 ? 'warn' : 'safe';

  return `
    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div style="font-size:.74rem;font-weight:700;color:var(--text2);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        ${overallStatus==='danger'?'🚨 Riziko dluhové spirály!':overallStatus==='warn'?'⚠️ Varovné signály':'✅ Žádné varovné signály'}
        <span style="font-size:.68rem;font-weight:400;color:var(--text3)">(${warnings.length} varování, ${good.length} v pořádku)</span>
      </div>
      ${warnings.map(w=>`<div style="font-size:.76rem;padding:5px 0;border-bottom:1px solid var(--border)">${w}</div>`).join('')}
      ${good.map(g=>`<div style="font-size:.74rem;padding:4px 0;color:var(--text3)">${g}</div>`).join('')}
      ${spiralRisk >= 2 ? `<div style="margin-top:8px;padding:8px 10px;background:var(--expense-bg);border-radius:8px;border:1px solid rgba(248,113,113,.2);font-size:.76rem;color:var(--text2)">
        ⚠️ <strong>Riziko dluhové spirály:</strong> Více červených signálů najednou znamená, že nové půjčky jsou nutné jen pro splácení starých. Okamžitě zvažte konsolidaci nebo refinancování.
      </div>` : ''}
    </div>`;
}

function openBetterLoanPage() {
  // Open the standalone better loan page
  window.open('https://bcmilda.github.io/financeflow/lepsi-uver.html', '_blank');
}

// ══════════════════════════════════════════════════════
//  KONSOLIDACE PŮJČEK
// ══════════════════════════════════════════════════════
function openConsolidate() {
  if(!S.debts?.length) { alert('Nemáte žádné půjčky ke konsolidaci.'); return; }
  // Build checklist
  const el = document.getElementById('consolidateCheckList'); if(!el) return;
  el.innerHTML = '<div style="font-size:.74rem;font-weight:600;color:var(--text2);margin-bottom:6px">Vyberte půjčky ke sloučení:</div>' +
    S.debts.map(d => `<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border-radius:8px;margin-bottom:5px;cursor:pointer">
      <input type="checkbox" checked class="cons-check" data-id="${d.id}" onchange="runConsolidate()" style="width:16px;height:16px;accent-color:var(--income)">
      <div style="flex:1">
        <div style="font-size:.82rem;font-weight:600">${d.name}</div>
        <div style="font-size:.72rem;color:var(--text3)">Zbývá: ${fmtB(d.remaining)} · ${d.interest}% p.a. · ${fmtB(d.payment||0)}/${d.freq==='weekly'?'týdně':'měsíčně'}</div>
      </div>
      <div style="font-weight:700;color:var(--expense);font-size:.9rem">${fmtB(d.remaining)}</div>
    </label>`).join('');
  // Set default new rate as average of selected
  const avgRate = Math.round(S.debts.reduce((a,d)=>a+d.interest,0)/S.debts.length * 10)/10;
  document.getElementById('consRate').value = Math.max(avgRate - 2, 3); // suggest lower rate
  document.getElementById('consPayment').value = '';
  document.getElementById('consMonths').value = 60;
  runConsolidate();
  document.getElementById('modalConsolidate').classList.add('open');
}

function runConsolidate() {
  const checked = [...document.querySelectorAll('.cons-check:checked')].map(c => c.dataset.id);
  const selected = (S.debts||[]).filter(d => checked.includes(d.id));
  const result = document.getElementById('consolidateResult'); if(!result) return;
  if(!selected.length) { result.innerHTML = '<div class="insight-item warn"><div class="insight-icon">⚠️</div><div class="insight-text">Vyberte alespoň jednu půjčku</div></div>'; return; }

  const totalRemaining = selected.reduce((a,d) => a + d.remaining, 0);
  const newRate = parseFloat(document.getElementById('consRate')?.value) || 8;
  const newMonths = parseInt(document.getElementById('consMonths')?.value) || 60;
  const customPayment = parseFloat(document.getElementById('consPayment')?.value) || 0;

  // Current state – total monthly payments and total interest
  const currentMonthly = selected.reduce((a,d) => {
    const freq = d.freq||'monthly';
    const monthly = freq==='weekly' ? (d.payment||0)*4.33 : freq==='biweekly' ? (d.payment||0)*2.17 : (d.payment||0);
    return a + monthly;
  }, 0);
  const currentSchedules = selected.map(d => d.schedule?.length ? d.schedule : generateSchedule(d));
  const currentTotalPaid = currentSchedules.reduce((a,s) => a + s.reduce((b,p)=>b+p.payment,0), 0);
  const currentInterest = currentTotalPaid - totalRemaining;
  const currentMaxMonths = Math.max(...currentSchedules.map(s => s.length));

  // New consolidated loan
  const consDebt = {
    remaining: totalRemaining, total: totalRemaining,
    interest: newRate, freq: 'monthly',
    payment: customPayment || calcAnnuity(totalRemaining, newRate, 12, newMonths),
    startDate: new Date().toISOString().slice(0,10)
  };
  const consSchedule = generateSchedule(consDebt);
  const consTotalPaid = consSchedule.reduce((a,s) => a+s.payment, 0);
  const consInterest = consTotalPaid - totalRemaining;
  const consMonthly = consDebt.payment;
  const rpsn = calcRPSN(totalRemaining, consSchedule);

  const saving = currentInterest - consInterest;
  const monthlyDiff = currentMonthly - consMonthly;
  const isBetter = saving > 0 || monthlyDiff > 0;

  result.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border)">
        <div style="font-size:.68rem;color:#a8aec8;margin-bottom:6px;font-weight:600">AKTUÁLNÍ STAV (${selected.length} půjček)</div>
        <div style="font-size:.82rem;margin-bottom:3px">Celkem dluh: <strong>${fmtB(totalRemaining)}</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:var(--expense)">Splátky: <strong>${fmtB(Math.round(currentMonthly))}/měs</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:var(--debt)">Celkem zaplatíte: <strong>${fmtB(Math.round(currentTotalPaid))}</strong></div>
        <div style="font-size:.82rem;color:var(--debt)">Úroky celkem: <strong>${fmtB(Math.round(currentInterest))}</strong></div>
        <div style="font-size:.78rem;color:var(--text3);margin-top:3px">Doba: ~${currentMaxMonths} měs</div>
      </div>
      <div style="background:${isBetter?'var(--income-bg)':'var(--expense-bg)'};border-radius:10px;padding:12px;border:1px solid ${isBetter?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'}">
        <div style="font-size:.68rem;color:#a8aec8;margin-bottom:6px;font-weight:600">KONSOLIDACE (${newRate}% p.a.)</div>
        <div style="font-size:.82rem;margin-bottom:3px">Celkem dluh: <strong>${fmtB(totalRemaining)}</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:${monthlyDiff>=0?'var(--income)':'var(--expense)'}">Splátka: <strong>${fmtB(Math.round(consMonthly))}/měs</strong></div>
        <div style="font-size:.82rem;margin-bottom:3px;color:var(--debt)">Celkem zaplatíte: <strong>${fmtB(Math.round(consTotalPaid))}</strong></div>
        <div style="font-size:.82rem;color:var(--debt)">Úroky celkem: <strong>${fmtB(Math.round(consInterest))}</strong></div>
        <div style="font-size:.78rem;color:var(--text3);margin-top:3px">Doba: ${consSchedule.length} měs · RPSN: ${rpsn}%</div>
      </div>
    </div>
    ${saving > 0 ? `<div class="insight-item good"><div class="insight-icon">💰</div><div class="insight-text">Konsolidací ušetříte <strong>${fmtB(Math.round(saving))}</strong> na úrocích!</div></div>` : ''}
    ${monthlyDiff > 0 ? `<div class="insight-item good"><div class="insight-icon">📉</div><div class="insight-text">Měsíční splátka nižší o <strong>${fmtB(Math.round(monthlyDiff))}</strong></div></div>` : ''}
    ${monthlyDiff < 0 ? `<div class="insight-item warn"><div class="insight-icon">⚠️</div><div class="insight-text">Měsíční splátka vyšší o <strong>${fmtB(Math.round(-monthlyDiff))}</strong> – ale celkem zaplatíte ${saving>0?'méně':'více'}</div></div>` : ''}
    ${!isBetter ? `<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text">Konsolidace za těchto podmínek nevýhodná – zkuste nižší úrok nebo kratší splatnost</div></div>` : ''}
  `;
  // Store for import
  window._lastConsDebt = { ...consDebt, name: 'Konsolidovaná půjčka', creditor: 'Nový věřitel', type: 'personal', priority: 'mid' };
  window._lastConsSelected = checked;
}

// S16.10 (FIX-200, Milan): Konsolidace SLUČUJE původní půjčky, nepřidává je navrch.
//   Dřív se konsolidovaná půjčka jen PUSHNULA vedle původních → celkový dluh se ZDVOJNÁSOBIL
//   (a s ním DTI, DSTI, stres index, splátky) dokud si uživatel původní ručně nesmazal.
//   Nově: původní se označí jako splacené konsolidací a archivují (remaining=0, consolidatedInto),
//   takže mizí ze všech výpočtů, ale zůstává historie. Volitelně je lze rovnou smazat.
function importConsolidated() {
  const d = window._lastConsDebt;
  const sel = window._lastConsSelected || [];
  if(!d) { alert('Nejprve spusťte výpočet'); return; }
  // POZOR: _lastConsSelected je pole ID (stringů), ne objektů – dohledat v S.debts
  const selDebts = (S.debts||[]).filter(x=>sel.includes(x.id));
  if(!selDebts.length) { alert('Nepodařilo se dohledat vybrané půjčky.'); return; }
  const names = selDebts.map(x=>x.name).join(', ');
  if(!confirm(`Vytvořit konsolidovanou půjčku ${fmtB(d.remaining)}?\n\nSloučí se tyto půjčky: ${names}\n\nPůvodní půjčky budou označeny jako splacené konsolidací (přestanou se počítat do dluhu, zůstanou v historii).`)) return;
  if(!S.debts) S.debts = [];
  d.id = uid();
  d.consolidatedFrom = selDebts.map(x=>x.id);
  d.schedule = generateSchedule(d);

  // Uzavřít původní půjčky – zmizí z výpočtů (remaining 0), zůstanou dohledatelné
  let closed = 0;
  d.consolidatedFrom.forEach(oid=>{
    const od = S.debts.find(x=>x.id===oid);
    if(od){
      od.remaining = 0;
      od.closed = true;
      od.closedReason = 'consolidated';
      od.consolidatedInto = d.id;
      od.closedAt = new Date().toISOString().slice(0,10);
      closed++;
    }
  });

  S.debts.push(d);
  clearTimeout(saveTimeout); saveTimeout = null;
  saveToFirebase();
  closeModal('modalConsolidate');
  renderPage();
  alert(`✅ Konsolidace hotová!\n\nNová půjčka: ${fmtB(d.remaining)}\nSloučeno a uzavřeno půjček: ${closed}\n\nCelkový dluh se nezvýšil – původní půjčky se už nepočítají.`);
}

// ══════════════════════════════════════════════════════
