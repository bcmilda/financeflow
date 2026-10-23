// FinanceFlow · v10.62 · poznamky.js · 2026-09-12
// ══════════════════════════════════════════════════════════════════════
//  DENÍKOVÉ POZNÁMKY K VÝDAJŮM (level 1) · S22, zadání Milana
//
//  „Je to přece deník." Dosavadní revNote() uměl JEDNU poznámku na transakci
//  přes prompt() a ukládal ji do `t.priorityNote` – druhý zápis ten první
//  přepsal. To je políčko, ne deník.
//
//  Level 1: kliknutí na výdaj otevře vlastní stránku, kam lze zapisovat
//  opakovaně. Každý zápis má čas, dá se upravit i smazat.
//
//  DATOVÝ MODEL: t.notes = [{ id, ts, text }]  (ts = Date.now())
//    • Transakce se do Firebase ukládají po jedné jako CELÉ objekty
//      (data/transactions/{id}, diff podle podpisu), takže nové pole se
//      synchronizuje samo – NENÍ potřeba nic přidávat do _DW_META.
//      _DW_META je jen pro meta klíče (debts, wallets…), ne pro transakce.
//    • ZATO se muselo ošetřit VÝDEJNÍ OKÉNKO: `_shTxObj()` v režimu 'full'
//      posílal partnerovi celé objekty transakcí, takže by mu odešly
//      i poznámky. Viz `_TX_OSOBNI` v app.js (S22).
//    • `priorityNote` ze staré verze se NEMAŽE. Při prvním otevření se
//      převezme jako první zápis (`migrated:true`) – nikdo o nic nepřijde.
//
//  Level 2 (hlasový diktát) a level 3 (notifikace) zatím ne – viz todo.
// ══════════════════════════════════════════════════════════════════════

let _pznTxId = null;        // transakce, jejíž poznámky jsou otevřené
let _pznEditId = null;      // zápis, který se právě upravuje (null = nový)
let _pznZpet = 'denik';     // kam se vrátit tlačítkem Zpět

//  Najde transakci podle id. Vrací null, ne výjimku – transakce může být
//  mezitím smazaná v jiné záložce a stránka by spadla.
function pznTx(D){
  const data = D || (typeof getData==='function' ? getData() : null);
  if(!data || !_pznTxId) return null;
  return (data.transactions||[]).find(t=>t && String(t.id)===String(_pznTxId)) || null;
}

//  Seznam zápisů, vždy pole, vždy seřazené od nejnovějšího.
//  Rozhoduje čas; při SHODNÉM čase (dva zápisy ve stejné milisekundě) by
//  stabilní řazení nechalo starší nahoře, proto se dorovnává pořadím v poli –
//  co přibylo později, je novější.
function pznSeznam(t){
  if(!t) return [];
  const arr = Array.isArray(t.notes) ? t.notes : [];
  return arr
    .map((z,i)=>({z,i}))
    .filter(x=>x.z && typeof x.z.text==='string')
    .sort((a,b)=>((b.z.ts||0)-(a.z.ts||0)) || (b.i-a.i))
    .map(x=>x.z);
}

//  Otevření stránky. `zpet` říká, kam vede tlačítko Zpět – ať se uživatel
//  vrátí tam, odkud přišel, a ne vždycky do Deníku.
function pznOtevri(txId, zpet){
  _pznTxId = String(txId);
  _pznEditId = null;
  _pznZpet = zpet || 'denik';

  //  Převzetí staré jednorázové poznámky (revNote → t.priorityNote).
  //  Děje se jen jednou a jen když ještě žádné zápisy nejsou.
  const t = pznTx();
  if(t && t.priorityNote && !(Array.isArray(t.notes) && t.notes.length)){
    t.notes = [{ id: pznNoveId(), ts: (t.priorityNoteAt || Date.now()), text: String(t.priorityNote), migrated: true }];
    if(typeof save==='function') save();
  }

  if(typeof showPage==='function') showPage('poznamky');
  else if(typeof showPageByName==='function') showPageByName('poznamky');
  renderPoznamky();
}

function pznZpet(){
  const kam = _pznZpet || 'denik';
  _pznTxId = null; _pznEditId = null;
  if(typeof showPageByName==='function') showPageByName(kam);
  else if(typeof showPage==='function') showPage(kam);
}

function pznNoveId(){
  return 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

//  Uložení zápisu. Prázdný text se neuloží – prázdná bublina v deníku
//  nikomu nic neřekne a jde smazat jen dalším klikáním.
function pznUloz(){
  const box = document.getElementById('pznText');
  if(!box) return;
  const text = (box.value||'').trim();
  if(!text){ if(typeof showToast==='function') showToast('Zápis je prázdný'); return; }

  const t = pznTx();
  if(!t){ if(typeof showToast==='function') showToast('Transakce už neexistuje'); pznZpet(); return; }
  if(!Array.isArray(t.notes)) t.notes = [];

  if(_pznEditId){
    const z = t.notes.find(x=>x && x.id===_pznEditId);
    if(z){ z.text = text; z.editedAt = Date.now(); }
    _pznEditId = null;
  } else {
    t.notes.push({ id: pznNoveId(), ts: Date.now(), text });
  }

  //  Zrcadlení do priorityNote: Hodnocení útrat a Detektor čtou pořád staré
  //  pole. Držíme v něm NEJNOVĚJŠÍ zápis, aby se tam poznámka neztratila –
  //  ale zdrojem pravdy je `notes`.
  const nej = pznSeznam(t)[0];
  t.priorityNote = nej ? nej.text : '';
  if(!t.priorityNote) delete t.priorityNote;

  box.value = '';
  if(typeof save==='function') save();
  if(typeof showToast==='function') showToast('📝 Zapsáno');
  renderPoznamky();
}

function pznUprav(id){
  const t = pznTx(); if(!t) return;
  const z = (t.notes||[]).find(x=>x && x.id===id); if(!z) return;
  _pznEditId = id;
  renderPoznamky();
  const box = document.getElementById('pznText');
  if(box){ box.value = z.text; box.focus(); }
}

function pznZrusUpravu(){
  _pznEditId = null;
  const box = document.getElementById('pznText'); if(box) box.value='';
  renderPoznamky();
}

function pznSmaz(id){
  //  Tlačítko v potvrzovacím dialogu se v prohlížeči jmenuje „Zrušit", ne
  //  „Storno" – text musí sedět na to, co uživatel uvidí.
  if(!confirm('Smazat tenhle zápis? (Zrušit = nechat)')) return;
  const t = pznTx(); if(!t) return;
  t.notes = (t.notes||[]).filter(x=>x && x.id!==id);
  if(_pznEditId===id) _pznEditId=null;
  const nej = pznSeznam(t)[0];
  t.priorityNote = nej ? nej.text : '';
  if(!t.priorityNote) delete t.priorityNote;
  if(typeof save==='function') save();
  renderPoznamky();
}

//  „před 3 hodinami" čte člověk líp než „12. 9. 2026 14:03" u čerstvého
//  zápisu – u starších je naopak přesné datum užitečnější.
function pznKdy(ts){
  if(!ts) return '';
  const d = new Date(ts); if(isNaN(d)) return '';
  const rozdil = Date.now() - ts;
  const min = Math.floor(rozdil/60000);
  if(min < 1) return 'právě teď';
  if(min < 60) return `před ${min} min`;
  const hod = Math.floor(min/60);
  if(hod < 24) return `před ${hod} h`;
  const dny = Math.floor(hod/24);
  if(dny === 1) return 'včera';
  if(dny < 7) return `před ${dny} dny`;
  const cas = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()} · ${cas}`;
}

function pznEsc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function renderPoznamky(){
  const el = document.getElementById('poznamkyContent'); if(!el) return;
  const D = (typeof getData==='function') ? getData() : null;
  const t = pznTx(D);

  if(!t){
    el.innerHTML = `<div class="card"><div class="card-body">
      <div class="empty"><div class="ei">📝</div>
        <div class="et">Transakce není vybraná</div>
        <div style="font-size:.8rem;color:#a8aec8;margin-top:6px">Vrať se do Deníku a klikni na výdaj, ke kterému si chceš psát.</div>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="pznZpet()">← Zpět</button>
    </div></div>`;
    return;
  }

  const zapisy = pznSeznam(t);
  const castka = (typeof txCZK==='function' && D) ? txCZK(t, D) : (t.amount || t.amt || 0);
  //  fmtB() = převod z CZK do základní měny + symbol. Samotné fmt() by
  //  u uživatele s jinou základní měnou ukázalo korunovou částku bez měny.
  const castkaTxt = (typeof fmtB==='function') ? fmtB(castka) : String(Math.round(castka));
  const d = new Date(t.date);
  const datum = isNaN(d) ? '' : `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
  const jePrijem = t.type==='income';

  //  Jméno kategorie – uživatel si transakce rozlišuje názvem a kategorií,
  //  samotná částka je k poznání útraty málo.
  let kat = '';
  if(D){
    const c = (D.categories||[]).find(c=>c && String(c.id)===String(t.catId ?? t.category));
    if(c) kat = c.name || '';
  }

  const zapisyHTML = zapisy.length ? zapisy.map(z=>`
    <div style="position:relative;padding:11px 12px;background:var(--surface3);border-radius:11px;margin-bottom:9px;border:1px solid ${_pznEditId===z.id?'#8b7cf6':'var(--border)'}">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px">
        <span style="font-size:.68rem;color:#a8aec8">${pznEsc(pznKdy(z.ts))}</span>
        ${z.editedAt?`<span style="font-size:.64rem;color:#8b91a8">· upraveno</span>`:''}
        ${z.migrated?`<span style="font-size:.64rem;color:#8b91a8" title="Převzato ze starší poznámky">· ze starší poznámky</span>`:''}
        <span style="flex:1"></span>
        <button onclick="pznUprav('${z.id}')" title="Upravit"
          style="background:transparent;border:none;color:#a8aec8;cursor:pointer;font-size:.82rem;padding:2px 5px">✏️</button>
        <button onclick="pznSmaz('${z.id}')" title="Smazat"
          style="background:transparent;border:none;color:#a8aec8;cursor:pointer;font-size:.82rem;padding:2px 5px">🗑️</button>
      </div>
      <div style="font-size:.86rem;color:#e8eaf2;line-height:1.6;white-space:pre-wrap;word-break:break-word">${pznEsc(z.text)}</div>
    </div>`).join('')
    : `<div style="padding:16px 12px;text-align:center;color:#a8aec8;font-size:.82rem;line-height:1.55">
         Zatím tu nic není.<br>Napiš první zápis — proč jsi to koupil, jestli to stálo za to, co bys udělal jinak.
       </div>`;

  el.innerHTML = `
  <div class="card" style="margin-bottom:12px">
    <div class="card-body">
      <button class="btn btn-ghost btn-sm" style="margin-bottom:10px" onclick="pznZpet()">← Zpět</button>
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.02rem;color:#e8eaf2;word-break:break-word">${pznEsc(t.name||t.note||'Bez názvu')}</div>
          <div style="font-size:.74rem;color:#a8aec8;margin-top:3px">${pznEsc(datum)}${kat?' · '+pznEsc(kat):''}</div>
        </div>
        <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.05rem;white-space:nowrap;color:${jePrijem?'var(--income)':'var(--expense)'}">
          ${jePrijem?'+':'−'}${pznEsc(castkaTxt)}
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:12px">
    <div class="card-body">
      <div style="font-family:Syne,sans-serif;font-weight:800;font-size:.9rem;color:#e8eaf2;margin-bottom:8px">
        ${_pznEditId ? '✏️ Úprava zápisu' : '📝 Nový zápis'}
      </div>
      <textarea id="pznText" rows="4" placeholder="Co tě k tomu vedlo? Stálo to za to?"
        style="width:100%;padding:11px;border-radius:11px;border:1px solid var(--border);background:var(--surface3);color:#e8eaf2;font-size:.88rem;line-height:1.55;font-family:inherit;resize:vertical"></textarea>
      <div style="display:flex;gap:8px;margin-top:9px;flex-wrap:wrap">
        <button class="btn btn-accent btn-sm" onclick="pznUloz()">${_pznEditId?'Uložit změnu':'Zapsat'}</button>
        ${_pznEditId?`<button class="btn btn-ghost btn-sm" onclick="pznZrusUpravu()">Zrušit úpravu</button>`:''}
      </div>
      <div style="font-size:.7rem;color:#8b91a8;margin-top:8px;line-height:1.5">
        Zápisů může být kolik chceš — deník se píše průběžně. Zůstávají jen u tebe,
        partnerovi se neposílají.
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <span class="card-title">📖 Zápisy${zapisy.length?` (${zapisy.length})`:''}</span>
    </div>
    <div class="card-body">${zapisyHTML}</div>
  </div>`;

  //  Po překreslení vrátit rozepsaný text, když se právě edituje
  if(_pznEditId){
    const z = (t.notes||[]).find(x=>x && x.id===_pznEditId);
    const box = document.getElementById('pznText');
    if(z && box && !box.value) box.value = z.text;
  }
}

//  Počet zápisů u transakce – pro odznak v seznamech (Deník, Hodnocení).
function pznPocet(t){
  return Array.isArray(t && t.notes) ? t.notes.filter(z=>z && z.text).length : 0;
}

window.pznOtevri = pznOtevri;
window.pznZpet = pznZpet;
window.pznUloz = pznUloz;
window.pznUprav = pznUprav;
window.pznZrusUpravu = pznZrusUpravu;
window.pznSmaz = pznSmaz;
window.pznPocet = pznPocet;
window.renderPoznamky = renderPoznamky;
