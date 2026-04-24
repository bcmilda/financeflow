//  IMPORT DAT
// ══════════════════════════════════════════════════════
function renderImport() {
  const el = document.getElementById('importContent'); if(!el) return;
  el.innerHTML = `
    <!-- Záložky -->
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <button class="tx-filt-btn active" id="itab-csv" onclick="switchImportTab('csv',this)">📊 CSV / Excel <span style="background:var(--income);color:#071a0c;font-size:.62rem;font-weight:800;padding:1px 6px;border-radius:8px;margin-left:4px">DOPORUČENO</span></button>
      <button class="tx-filt-btn" id="itab-pdf" onclick="switchImportTab('pdf',this)">📄 PDF výpis</button>
      <button class="tx-filt-btn" id="itab-history" onclick="switchImportTab('history',this)">📋 Historie importů</button>
    </div>

    <!-- CSV/Excel tab -->
    <div id="itab-csv-content">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">📊 Import z CSV / Excel</span><span style="font-size:.72rem;color:var(--income)">✓ Rychlejší · přesnější · bez AI limitu</span></div>
        <div class="card-body">
          <div style="font-size:.8rem;color:var(--text2);margin-bottom:14px">
            Podporované formáty: <strong>CSV</strong> (Fio, Air Bank, ČSOB, KB), <strong>XLSX/XLS</strong>, nebo naše šablona.
            <br><span style="font-size:.74rem;color:var(--text3)">Max. 5 000 transakcí najednou · detekce duplikátů automaticky</span>
          </div>

          <!-- Drop zone -->
          <div id="importDropZone"
            style="border:2px dashed var(--border);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:14px"
            onclick="document.getElementById('importFileInput').click()"
            ondragover="event.preventDefault();this.style.borderColor='var(--income)'"
            ondragleave="this.style.borderColor='var(--border)'"
            ondrop="handleImportDrop(event)">
            <div style="font-size:2.5rem;margin-bottom:8px">📂</div>
            <div style="font-weight:600;margin-bottom:4px">Klikněte nebo přetáhněte soubor</div>
            <div style="font-size:.76rem;color:var(--text3)">CSV, XLSX, XLS</div>
            <input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display:none" onchange="handleImportFile(this.files[0]);this.value=''">
          </div>

          <!-- Banky shortcut -->
          <div style="margin-bottom:14px">
            <div style="font-size:.76rem;color:var(--text2);margin-bottom:6px;font-weight:600">Rychlý import dle banky:</div>
            <div style="font-size:.72rem;color:var(--text3);margin-bottom:8px">1️⃣ Vyberte svou banku &nbsp;→&nbsp; 2️⃣ Nahrajte CSV soubor výše</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${[['Fio','fio'],['Air Bank','airbank'],['ČSOB','csob'],['KB','kb'],['Raiffeisenbank','rb'],['Naše šablona','template']].map(([name,id])=>
                `<button class="tx-filt-btn" onclick="setImportBank('${id}')" id="bank-${id}">${name}</button>`
              ).join('')}
            </div>
          </div>

          <div id="importStatus" style="display:none"></div>
          <div id="importPreview" style="display:none"></div>
        </div>
      </div>
      <!-- Stáhnout šablonu -->
      <div class="card">
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:.88rem">📋 Šablona pro import</div>
            <div style="font-size:.74rem;color:var(--text2);margin-top:2px">Prázdná šablona s popisem sloupců</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="downloadImportTemplate()">⬇️ Stáhnout</button>
        </div>
      </div>
    </div>

    <!-- PDF tab -->
    <div id="itab-pdf-content" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header"><span class="card-title">📄 Import z PDF výpisu</span><span style="font-size:.72rem;color:var(--text3)">⚠️ Max ~200 transakcí · vyžaduje přihlášení</span></div>
        <div class="card-body">
          <div style="font-size:.8rem;color:var(--text2);margin-bottom:14px">
            Claude přečte PDF výpis z banky a extrahuje transakce. Funguje s výpisy z Fio, Air Bank, ČSOB a dalších.
          </div>
          <div id="pdfDropZone"
            style="border:2px dashed var(--border);border-radius:12px;padding:32px;text-align:center;cursor:pointer;margin-bottom:14px"
            onclick="document.getElementById('pdfFileInput').click()"
            ondragover="event.preventDefault();this.style.borderColor='var(--income)'"
            ondragleave="this.style.borderColor='var(--border)'"
            ondrop="handlePdfDrop(event)">
            <div style="font-size:2.5rem;margin-bottom:8px">📄</div>
            <div style="font-weight:600;margin-bottom:4px">Klikněte nebo přetáhněte PDF výpis</div>
            <div style="font-size:.76rem;color:var(--text3)">PDF · max. 10 MB</div>
            <input type="file" id="pdfFileInput" accept=".pdf" style="display:none" onchange="handlePdfFile(this.files[0]);this.value=''">
          </div>
          <div id="pdfStatus" style="display:none"></div>
          <div id="pdfPreview" style="display:none"></div>
        </div>
      </div>
    </div>

    <!-- Historie importů -->
    <div id="itab-history-content" style="display:none">
      <div class="card">
        <div class="card-header"><span class="card-title">📋 Historie importů</span></div>
        <div id="importHistoryList" class="card-body">
          ${(S.importHistory||[]).length === 0
            ? '<div class="empty"><div class="ei">📥</div><div class="et">Zatím žádné importy</div></div>'
            : (S.importHistory||[]).map(h=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-size:.84rem;font-weight:600">${h.filename||'Import'}</div>
                  <div style="font-size:.72rem;color:var(--text2)">${h.date||''} · ${h.count||0} transakcí · ${h.bank||'vlastní formát'}</div>
                </div>
                <span style="font-size:.72rem;color:var(--income)">${h.duplicates>0?'⚠️ '+h.duplicates+' duplikátů':'✅ OK'}</span>
              </div>`).join('')
          }
        </div>
      </div>
    </div>`;
}

function switchImportTab(tab, btn) {
  ['csv','pdf','history'].forEach(t => {
    const c = document.getElementById('itab-'+t+'-content');
    const b = document.getElementById('itab-'+t);
    if(c) c.style.display = 'none';
    if(b) b.classList.remove('active');
  });
  const c = document.getElementById('itab-'+tab+'-content');
  if(c) c.style.display = 'block';
  if(btn) btn.classList.add('active');
}

// ── Detekce formátu banky ──
let _importBank = null;
function setImportBank(bank) {
  _importBank = bank;
  document.querySelectorAll('[id^="bank-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('bank-'+bank);
  if(btn) btn.classList.add('active');
}

function handleImportDrop(e) {
  e.preventDefault();
  document.getElementById('importDropZone').style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if(file) handleImportFile(file);
}

async function handleImportFile(file) {
  if(!file) return;
  const status = document.getElementById('importStatus');
  const preview = document.getElementById('importPreview');
  status.style.display = 'block';
  status.innerHTML = '<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Zpracovávám soubor...</div></div>';
  preview.style.display = 'none';

  try {
    let rows = [];
    const ext = file.name.split('.').pop().toLowerCase();

    if(ext === 'csv') {
      rows = await parseCSV(file);
    } else if(ext === 'xlsx' || ext === 'xls') {
      rows = await parseExcel(file);
    } else {
      throw new Error('Nepodporovaný formát. Použijte CSV nebo XLSX.');
    }

    if(!rows.length) throw new Error('Soubor je prázdný nebo nelze přečíst.');

    // Detekuj formát a namapuj sloupce
    const mapped = mapImportRows(rows, _importBank);
    if(!mapped.length) throw new Error('Nepodařilo se rozpoznat formát. Zkuste vybrat banku nebo použijte naši šablonu.');

    status.style.display = 'none';
    showImportPreview(mapped, file.name);
  } catch(e) {
    status.innerHTML = `<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text"><strong>Chyba:</strong> ${e.message}</div></div>`;
  }
}

// ── CSV parser ──
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    const tryParse = (text) => {
      const sep = text.includes(';') ? ';' : ',';
      const allLines = text.split('\n').map(l => l.trim()).filter(l => l);
      // Najdi řádek s hlavičkou (první řádek kde je datum/castka/amount)
      let headerIdx = 0;
      for(let i = 0; i < Math.min(allLines.length, 30); i++) {
        const lower = allLines[i].toLowerCase();
        if(lower.includes('datum') && (lower.includes('castka') || lower.includes('částka') || lower.includes('amount') || lower.includes('objem'))) {
          headerIdx = i;
          break;
        }
      }
      const lines = allLines.slice(headerIdx);
      return lines.map(l => l.split(sep).map(c => c.replace(/^"|"$/g,'').trim()));
    };
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const textUtf8 = new TextDecoder('utf-8', {fatal:true}).decode(e.target.result);
        resolve(tryParse(textUtf8));
      } catch(e1) {
        try {
          const text1250 = new TextDecoder('windows-1250').decode(e.target.result);
          resolve(tryParse(text1250));
        } catch(e2) {
          reject(new Error('Nelze přečíst soubor'));
        }
      }
    };
    reader.onerror = () => reject(new Error('Nelze přečíst soubor'));
    reader.readAsArrayBuffer(file);
  });
}

// ── Excel parser (bez externích knihoven) ──
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        // Základní XLSX parsing – přečteme shared strings a sheet
        const data = e.target.result;
        const rows = parseXLSXBasic(data);
        resolve(rows);
      } catch(err) {
        reject(new Error('Nelze přečíst Excel soubor: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Nelze přečíst soubor'));
    reader.readAsArrayBuffer(file);
  });
}

function parseXLSXBasic(buffer) {
  // Rozbal ZIP (XLSX je ZIP)
  try {
    const bytes = new Uint8Array(buffer);
    const str = String.fromCharCode(...bytes.slice(0, 4));
    if(str !== 'PK\x03\x04') throw new Error('Neplatný Excel soubor');

    // Použijeme jednoduché regex parsing ze ZIP obsahu
    const text = new TextDecoder('utf-8', {fatal:false}).decode(bytes);

    // Extrahuj shared strings
    const ssMatch = text.match(/<sst[^>]*>([\s\S]*?)<\/sst>/);
    const sharedStrings = [];
    if(ssMatch) {
      const siMatches = ssMatch[1].matchAll(/<si>([\s\S]*?)<\/si>/g);
      for(const m of siMatches) {
        const tMatch = m[1].match(/<t[^>]*>([^<]*)<\/t>/g);
        const val = tMatch ? tMatch.map(t=>t.replace(/<[^>]+>/g,'')).join('') : '';
        sharedStrings.push(val);
      }
    }

    // Extrahuj první sheet
    const sheetMatch = text.match(/<sheetData>([\s\S]*?)<\/sheetData>/);
    if(!sheetMatch) return [];

    const rows = [];
    const rowMatches = sheetMatch[1].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
    for(const rowM of rowMatches) {
      const cells = [];
      const cellMatches = rowM[1].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g);
      for(const cellM of cellMatches) {
        const attrs = cellM[1];
        const content = cellM[2];
        const vMatch = content.match(/<v>([^<]*)<\/v>/);
        const val = vMatch ? vMatch[1] : '';
        const isShared = attrs.includes('t="s"');
        cells.push(isShared ? (sharedStrings[parseInt(val)]||'') : val);
      }
      if(cells.some(c=>c)) rows.push(cells);
    }
    return rows;
  } catch(e) {
    throw new Error('Excel parsing selhal: ' + e.message);
  }
}

// ── Mapování sloupců dle banky/formátu ──
function mapImportRows(rows, bank) {
  if(!rows.length) return [];
  const header = rows[0].map(h => (h||'').toLowerCase().replace(/\s+/g,' ').trim());

  // Detekuj formát automaticky pokud není určena banka
  let format = bank;
  if(!format) {
    if(header.some(h=>h.includes('protiúčet') || h.includes('protiucet'))) format = 'fio';
    else if(header.some(h=>h.includes('popis transakce'))) format = 'airbank';
    else if(header.some(h=>h.includes('datum zaúčtování'))) format = 'csob';
    else if(header.some(h=>h.includes('nazev protiuctu') || h.includes('datum zauctovani') || h.includes('castka'))) format = 'kb';
    else if(header.some(h=>h.includes('datum'))) format = 'template';
  }

  // Mapování sloupců dle formátu
  const maps = {
    fio: {date:'datum', amount:'objem', name:'název', note:'zpráva pro příjemce', type:'typ'},
    airbank: {date:'datum provedení', amount:'částka', name:'popis transakce', note:'poznámka'},
    csob: {date:'datum zaúčtování', amount:'částka v měně účtu', name:'popis', note:''},
    kb: {date:'datum provedeni', amount:'castka', name:'nazev protiuctu', note:'popis pro me'},
    rb: {date:'datum', amount:'částka', name:'název protistrany', note:''},
    template: {date:'datum', amount:'částka', name:'název', note:'poznámka', cat:'kategorie', subcat:'podkategorie', tags:'tagy'},
  };
  const colMap = maps[format] || maps.template;

  // Najdi indexy sloupců
  const idx = {};
  Object.entries(colMap).forEach(([field, colName]) => {
    if(!colName) return;
    const i = header.findIndex(h => h.includes(colName.toLowerCase()));
    if(i >= 0) idx[field] = i;
  });

  if(idx.date === undefined || idx.amount === undefined) return [];

  // Parsuj řádky (přeskoč header)
  const D = getData();
  return rows.slice(1).map(row => {
    const rawDate = row[idx.date]||'';
    const rawAmt  = row[idx.amount]||'';
    const name    = row[idx.name||-1]||'';
    const note    = row[idx.note||-1]||'';
    const catName = row[idx.cat||-1]||'';
    const subcat  = row[idx.subcat||-1]||'';
    const tags    = row[idx.tags||-1]||'';

    // Parsuj datum
    const date = parseImportDate(rawDate);
    if(!date) return null;

    // Parsuj částku
    const amtStr = rawAmt.toString().replace(/\s/g,'').replace(',','.').replace(/[^0-9.\-]/g,'');
    const amt = parseFloat(amtStr);
    if(isNaN(amt) || amt === 0) return null;

    // Detekuj kategorii
    const cat = (D.categories||[]).find(c =>
      catName && (c.name.toLowerCase().includes(catName.toLowerCase()) || catName.toLowerCase().includes(c.name.toLowerCase()))
    );

    return {
      date,
      amount: Math.abs(amt),
      type: amt < 0 ? 'expense' : 'income',
      name: name || (amt < 0 ? 'Výdaj' : 'Příjem'),
      note,
      catId: cat?.id || '',
      subcat,
      tags: tags ? tags.split(/[,\s]+/).map(t=>t.replace(/^#+/,'')).filter(Boolean) : [],
      _raw: rawAmt,
      _catName: catName, // pro mapování
    };
  }).filter(Boolean);
}

function parseImportDate(str) {
  str = str.trim();
  // DD.MM.YYYY
  let m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // YYYY-MM-DD
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m) return str.slice(0,10);
  // MM/DD/YYYY
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  return null;
}

// ── Preview importu + mapování kategorií ──
let _importRows = [];
let _catMappings = {}; // {catName: catId}

function showImportPreview(rows, filename) {
  _importRows = rows;
  const preview = document.getElementById('importPreview');
  preview.style.display = 'block';

  // Zjisti neznámé kategorie
  const D = getData();
  const unknownCats = [...new Set(rows.filter(r=>r._catName && !r.catId).map(r=>r._catName))];

  const totalInc = rows.filter(r=>r.type==='income').reduce((a,r)=>a+r.amount,0);
  const totalExp = rows.filter(r=>r.type==='expense').reduce((a,r)=>a+r.amount,0);

  // Detekce duplikátů
  const existing = (D.transactions||[]);
  const dups = rows.filter(r => existing.some(t =>
    t.date===r.date && Math.abs((t.amount||t.amt||0)-r.amount)<0.01 && (t.name||'').slice(0,10)===(r.name||'').slice(0,10)
  ));

  preview.innerHTML = `
    <div style="background:var(--surface2);border-radius:12px;padding:14px;border:1px solid var(--border)">
      <!-- Shrnutí -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div class="stat-card income"><div class="stat-label">Celkem k importu</div><div class="stat-value up">${rows.length}</div></div>
        <div class="stat-card expense"><div class="stat-label">Výdaje</div><div class="stat-value down">−${fmt(Math.round(totalExp))} Kč</div></div>
        <div class="stat-card income"><div class="stat-label">Příjmy</div><div class="stat-value up">+${fmt(Math.round(totalInc))} Kč</div></div>
      </div>
      ${dups.length > 0 ? `<div class="insight-item warn" style="margin-bottom:10px"><div class="insight-icon">⚠️</div><div class="insight-text">Detekováno <strong>${dups.length} možných duplikátů</strong> – tyto transakce budou přeskočeny</div></div>` : ''}

      <!-- Mapování neznámých kategorií (Varianta C) -->
      ${unknownCats.length > 0 ? `
        <div style="background:var(--surface3);border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="font-size:.8rem;font-weight:700;margin-bottom:8px">🗂️ Namapuj neznámé kategorie:</div>
          ${unknownCats.map(uc => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:.8rem;color:var(--expense);flex-shrink:0">❓ "${uc}"</span>
              <span style="color:var(--text3)">→</span>
              <select class="fi" style="flex:1;font-size:.78rem" id="catmap-${encodeURIComponent(uc)}" onchange="setCatMapping('${uc}',this.value)">
                <option value="">– přeskočit –</option>
                <option value="__new__">➕ Vytvořit novou kategorii</option>
                ${(D.categories||[]).map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>` : ''}

      <!-- Náhled prvních řádků -->
      <div style="max-height:200px;overflow-y:auto;margin-bottom:12px;font-size:.76rem">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 6px;color:var(--text2)">Datum</th>
            <th style="text-align:left;padding:4px 6px;color:var(--text2)">Název</th>
            <th style="text-align:right;padding:4px 6px;color:var(--text2)">Částka</th>
            <th style="text-align:left;padding:4px 6px;color:var(--text2)">Typ</th>
          </tr></thead>
          <tbody>
            ${rows.slice(0,10).map(r => `
              <tr style="border-bottom:1px solid var(--border);opacity:${dups.some(d=>d===r)?'.4':'1'}">
                <td style="padding:4px 6px">${r.date}</td>
                <td style="padding:4px 6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</td>
                <td style="padding:4px 6px;text-align:right;color:${r.type==='income'?'var(--income)':'var(--expense)'}">
                  ${r.type==='income'?'+':'−'}${fmtP(r.amount)} Kč
                </td>
                <td style="padding:4px 6px;color:var(--text2)">${r.type==='income'?'příjem':'výdaj'}</td>
              </tr>`).join('')}
            ${rows.length > 10 ? `<tr><td colspan="4" style="padding:6px;text-align:center;color:var(--text3)">... a dalších ${rows.length-10} transakcí</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <!-- Tlačítka -->
      <div style="display:flex;gap:8px">
        <button class="btn btn-accent" style="flex:1" onclick="confirmImportAndEdit('${filename}')">✅ Potvrdit a otevřít Editor (${rows.filter(r=>!dups.includes(r)).length} nových)</button>
        <button class="btn btn-ghost" onclick="confirmImport('${filename}')">⚡ Importovat rovnou</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('importPreview').style.display='none'">✕</button>
      </div>
    </div>`;
}

function setCatMapping(catName, catId) {
  _catMappings[catName] = catId;
}

function confirmImportAndEdit(filename) {
  openImportEditor(filename);
}

function confirmImport(filename, openEditor) {
  const D = getData();
  const existing = D.transactions||[];
  let imported = 0, skipped = 0;

  _importRows.forEach(r => {
    // Aplikuj mapování kategorií
    if(r._catName && !r.catId && _catMappings[r._catName]) {
      r.catId = _catMappings[r._catName] === '__new__' ? createCategoryFromImport(r._catName) : _catMappings[r._catName];
    }
    if(!r.catId) {
      // Auto-přiřaď dle COICOP engine
      const {coicopId} = mapToCOICOP({name:r.name, catId:'', note:r.note||''});
      const coicopGroup = COICOP_GROUPS_DEF.find(g=>g.id===coicopId);
      r.catId = (D.categories||[]).find(c=>c.name===coicopGroup?.name)?.id || '';
    }

    // Detekce duplikátů
    const isDup = existing.some(t =>
      t.date===r.date && Math.abs((t.amount||t.amt||0)-r.amount)<0.01 && (t.name||'').slice(0,10)===(r.name||'').slice(0,10)
    );
    if(isDup) { skipped++; return; }

    S.transactions.push({
      id: Date.now() + imported,
      name: r.name,
      amount: r.amount, amt: r.amount,
      type: r.type,
      date: r.date,
      catId: r.catId, category: r.catId,
      subcat: r.subcat||'',
      note: r.note||'',
      tags: r.tags||[],
    });
    imported++;
  });

  // Ulož historii importu
  if(!S.importHistory) S.importHistory = [];
  S.importHistory.unshift({
    filename, date: new Date().toISOString().slice(0,10),
    count: imported, duplicates: skipped,
    bank: _importBank || 'auto'
  });
  if(S.importHistory.length > 20) S.importHistory = S.importHistory.slice(0,20);

  save();
  const preview = document.getElementById('importPreview');
  const statusEl = document.getElementById('importStatus');
  if(preview) preview.style.display = 'none';
  
  const msg = `<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">
    Importováno <strong>${imported} transakcí</strong>${skipped>0?' · přeskočeno '+skipped+' duplikátů':''}.
  </div></div>`;
  
  // Zobraz hlášku na správné záložce
  if(statusEl) { statusEl.style.display = 'block'; statusEl.innerHTML = msg; }
  const pdfSt = document.getElementById('pdfStatus');
  if(pdfSt) { pdfSt.style.display = 'block'; pdfSt.innerHTML = msg; }
  
  _importRows = []; _catMappings = {};
  
  if(openEditor) {
    // Přepni do editoru transakcí
    setTimeout(() => showPage('transakce', document.querySelector('.nav-item[onclick*="transakce"]')), 300);
  } else {
    renderPage();
  }
}

function createCategoryFromImport(name) {
  const icons = ['📦','🛍️','💡','🏷️'];
  const newCat = {id:'cat_imp_'+Date.now(), name, icon:icons[Math.floor(Math.random()*icons.length)], color:'#94a3b8', type:'expense', subs:[]};
  if(!S.categories) S.categories = [];
  S.categories.push(newCat);
  return newCat.id;
}

// ── PDF import přes Worker (s pdf.js text extraction + chunking) ──
const PDF_PAGES_PER_BATCH = 15;
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let _pdfjsLoaded = false;
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (_pdfjsLoaded && window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    if (window.pdfjsLib) { _pdfjsLoaded = true; resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      _pdfjsLoaded = true;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Nepodařilo se načíst pdf.js z CDN'));
    document.head.appendChild(script);
  });
}

async function extractPdfPages(arrayBuffer) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(it => it.str).join(' ');
    pages.push(text);
  }
  return pages;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function updatePdfStatus(msg) {
  const el = document.getElementById('pdfStatus');
  if (el) { el.style.display = 'block'; el.innerHTML = msg; }
}

function handlePdfDrop(e) {
  e.preventDefault();
  document.getElementById('pdfDropZone').style.borderColor = 'var(--border)';
  const file = e.dataTransfer.files[0];
  if(file) handlePdfFile(file);
}

async function handlePdfFile(file) {
  if(!file) return;
  const preview = document.getElementById('pdfPreview');
  if(preview) preview.style.display = 'none';

  updatePdfStatus('<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Načítám PDF a extrahuji text...</div></div>');

  const token = await getAuthToken();
  if(!token) {
    updatePdfStatus('<div class="insight-item bad"><div class="insight-icon">⚠️</div><div class="insight-text">Pro import PDF se musíte přihlásit.</div></div>');
    return;
  }

  try {
    // 1) Načti PDF jako ArrayBuffer a extrahuj text přes pdf.js
    const arrayBuffer = await file.arrayBuffer();
    let pages;
    try {
      pages = await extractPdfPages(arrayBuffer);
    } catch(e) {
      throw new Error('Nepodařilo se přečíst PDF: ' + e.message);
    }

    if (!pages.length || pages.every(p => !p.trim())) {
      throw new Error('PDF neobsahuje čitelný text (možná skenovaný dokument).');
    }

    // 2) Rozděl stránky na dávky
    const batches = chunkArray(pages, PDF_PAGES_PER_BATCH);
    const totalBatches = batches.length;
    let allTransactions = [];
    let bank = null, account = null;

    for (let i = 0; i < batches.length; i++) {
      updatePdfStatus(`<div class="insight-item warn"><div class="insight-icon">⏳</div><div class="insight-text">Claude analyzuje část ${i+1} z ${totalBatches}... (stránky ${i*PDF_PAGES_PER_BATCH+1}–${Math.min((i+1)*PDF_PAGES_PER_BATCH, pages.length)} z ${pages.length})</div></div>`);

      const batchText = batches[i].join('\n\n--- Nová stránka ---\n\n');

      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({
          type: 'bank_statement_text',
          payload: {
            text: batchText,
            batchIndex: i,
            totalBatches
          }
        })
      });

      if(!response.ok) throw new Error('HTTP ' + response.status + ' při zpracování části ' + (i+1));
      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      if(!text) continue; // prázdná dávka – přeskoč

      let result;
      try { result = JSON.parse(text.replace(/```json[\s\S]*?```|```/g,'').trim()); }
      catch(e) { continue; } // špatný JSON v dávce – přeskoč a pokračuj

      if(result.bank && !bank) bank = result.bank;
      if(result.account && !account) account = result.account;
      if(Array.isArray(result.transactions)) {
        allTransactions = allTransactions.concat(result.transactions);
      }
    }

    if(!allTransactions.length) throw new Error('Nepodařilo se extrahovat žádné transakce z PDF.');

    updatePdfStatus(`<div class="insight-item good"><div class="insight-icon">✅</div><div class="insight-text">PDF úspěšně analyzován${bank ? ' ('+bank+')' : ''}. Zkontrolujte transakce níže a potvrďte import.</div></div>`);

    // 3) Přepni na CSV záložku a zobraz preview
    switchImportTab('csv', document.getElementById('itab-csv'));
    await new Promise(r => setTimeout(r, 100));

    showImportPreview(allTransactions.map(t => ({
      date: parseImportDate(t.date||'') || new Date().toISOString().slice(0,10),
      amount: Math.abs(parseFloat(t.amount)||0),
      type: parseFloat(t.amount||0) < 0 ? 'expense' : 'income',
      name: t.name||t.description||'Transakce',
      note: t.note||'',
      catId: '', _catName: t.category||'', subcat:'', tags:[],
    })).filter(t=>t.amount>0), file.name);

  } catch(e) {
    updatePdfStatus(`<div class="insight-item bad"><div class="insight-icon">❌</div><div class="insight-text"><strong>Chyba:</strong> ${e.message}</div></div>`);
  }
}

// ── Šablona pro stažení ──
function downloadImportTemplate() {
  const csv = 'Datum;Typ;Částka;Kategorie;Podkategorie;Název;Poznámka;Tagy\n' +
    '2026-03-21;výdaj;1250.50;Jídlo & Nákupy;Supermarket;Albert;velký nákup;#rodina\n' +
    '2026-03-22;příjem;45000;Příjem;Mzda;Výplata;;';
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'financeflow-import-sablona.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportData(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='financeflow-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// ══════════════════════════════════════════════════════
//  MISC
// ══════════════════════════════════════════════════════
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o&&o.id!=='modalSplit')o.classList.remove('open');}));
window.addEventListener('resize',()=>renderPage());
updateMLabel();

// Affiliate tracking – zachyť ?ref= parametr
(function trackAffiliate() {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if(!ref) return;
  sessionStorage.setItem('ff_ref', ref);
  // Zaloguj návštěvu po načtení Firebase
  window._pendingAffiliateRef = ref;
})();

// Firebase initialized via module script below


// ══════════════════════════════════════════════════════
//  IMPORT EDITOR – detekce duplikátů
// ══════════════════════════════════════════════════════
let _importEditorRows = [];   // {row, score, color, match, included}
let _importEditorFilter = 'all';
let _importEditorPage = 0;
const IMPORT_PAGE_SIZE = 50;
const IMPORT_MAX = 500;

function calcDupScore(r, existing) {
  // Vrátí {score: 0-100, match: nejlepší shoda}
  let best = 0, bestTx = null;
  for(const t of existing) {
    let score = 0;
    // Datum ±1 den (30 bodů)
    const d1 = new Date(r.date), d2 = new Date(t.date||t.created);
    const diffDays = Math.abs((d1-d2)/(1000*60*60*24));
    if(diffDays <= 1) score += 30;
    else if(diffDays <= 3) score += 10;
    // Částka ±5 Kč (30 bodů)
    const amt1 = r.amount, amt2 = t.amount||t.amt||0;
    const diffAmt = Math.abs(amt1 - amt2);
    if(diffAmt <= 0.01) score += 30;
    else if(diffAmt <= 5) score += 20;
    else if(diffAmt <= 50) score += 5;
    // Typ (10 bodů)
    if(r.type === t.type) score += 10;
    // Název – fuzzy match (30 bodů)
    const n1 = (r.name||'').toLowerCase().trim();
    const n2 = (t.name||'').toLowerCase().trim();
    if(n1 && n2) {
      if(n1 === n2) score += 30;
      else if(n1.includes(n2) || n2.includes(n1)) score += 20;
      else {
        // Sdílená slova
        const w1 = n1.split(/\s+/), w2 = n2.split(/\s+/);
        const shared = w1.filter(w => w.length > 2 && w2.some(w2w => w2w.includes(w) || w.includes(w2w)));
        if(shared.length > 0) score += Math.min(15, shared.length * 5);
      }
    }
    if(score > best) { best = score; bestTx = t; }
  }
  return {score: best, match: bestTx};
}

function openImportEditor(filename) {
  const D = getData();
  const existing = D.transactions || [];
  
  if(_importRows.length > IMPORT_MAX) {
    alert('Maximum importu je ' + IMPORT_MAX + ' transakcí najednou. Soubor obsahuje ' + _importRows.length + ' transakcí – rozdělte ho prosím na menší části.');
    return;
  }

  _importEditorRows = _importRows.map(r => {
    const {score, match} = calcDupScore(r, existing);
    const color = score >= 75 ? 'red' : score >= 25 ? 'yellow' : 'green';
    return {row: r, score, match, color, included: color !== 'red'};
  });

  // Seřaď: červené nahoře, pak žluté, pak zelené
  _importEditorRows.sort((a,b) => b.score - a.score);

  _importEditorFilter = 'all';
  _importEditorPage = 0;
  window._importEditorFilename = filename;
  renderImportEditor();
  document.getElementById('modalImportEditor').classList.add('open');
}

function getFilteredRows() {
  if(_importEditorFilter === 'all') return _importEditorRows;
  return _importEditorRows.filter(r => r.color === _importEditorFilter);
}

function filterImportEditor(f, btn) {
  _importEditorFilter = f;
  _importEditorPage = 0;
  document.querySelectorAll('[id^="ief-"]').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderImportEditor();
}

function renderImportEditor() {
  const filtered = getFilteredRows();
  const total = _importEditorRows.length;
  const included = _importEditorRows.filter(r => r.included).length;
  const red = _importEditorRows.filter(r => r.color === 'red').length;
  const yellow = _importEditorRows.filter(r => r.color === 'yellow').length;
  const green = _importEditorRows.filter(r => r.color === 'green').length;

  document.getElementById('importEditorStats').textContent =
    `Celkem: ${total} · 🔴 ${red} · 🟡 ${yellow} · 🟢 ${green}`;
  document.getElementById('importEditorCount').textContent =
    `K importu: ${included} transakcí`;

  const start = _importEditorPage * IMPORT_PAGE_SIZE;
  const page = filtered.slice(start, start + IMPORT_PAGE_SIZE);

  const D = getData();
  const list = document.getElementById('importEditorList');
  if(!page.length) { list.innerHTML = '<div class="empty"><div class="ei">🎉</div><div class="et">Žádné transakce v tomto filtru</div></div>'; return; }

  list.innerHTML = page.map((item) => {
    const globalIdx = _importEditorRows.indexOf(item);
    const r = item.row;
    const m = item.match;
    const borderColor = item.color === 'red' ? 'var(--expense)' :
                        item.color === 'yellow' ? 'var(--debt)' : 'var(--income)';
    const bgColor = item.color === 'red' ? 'rgba(248,113,113,.08)' :
                    item.color === 'yellow' ? 'rgba(251,191,36,.06)' : 'rgba(74,222,128,.05)';
    const catImp = (D.categories||[]).find(c => c.id === r.catId);
    const catEx  = m ? (D.categories||[]).find(c => c.id === (m.catId||m.category)) : null;

    // Porovnej pole – zvýrazni rozdíly
    const diffDate  = m && r.date !== (m.date||'');
    const diffAmt   = m && Math.abs(r.amount - (m.amount||m.amt||0)) > 0.01;
    const diffName  = m && (r.name||'').toLowerCase() !== (m.name||'').toLowerCase();
    const diffCat   = m && r.catId !== (m.catId||m.category||'');
    const diffStyle = 'color:var(--debt);font-weight:700';

    const scoreLabel = item.score >= 75
      ? `<span style="background:var(--expense-bg);color:var(--expense);padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:700">🔴 ${item.score}% duplikát</span>`
      : item.score >= 25
      ? `<span style="background:var(--debt-bg);color:var(--debt);padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:700">🟡 ${item.score}% možný</span>`
      : `<span style="background:var(--income-bg);color:var(--income);padding:2px 8px;border-radius:10px;font-size:.7rem;font-weight:700">🟢 nová</span>`;

    const colStyle = 'flex:1;background:var(--surface2);border-radius:8px;padding:10px 12px;min-width:0';

    const impCol = `
      <div style="${colStyle}">
        <div style="font-size:.68rem;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-weight:700;border-bottom:1px solid var(--border);padding-bottom:5px">📥 Importovaná</div>
        <div style="font-size:.88rem;font-weight:700;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${diffName?diffStyle:''}">${r.name||'–'}</div>
        <div style="font-size:.82rem;font-weight:700;color:${r.type==='income'?'var(--income)':'var(--expense)'};margin-bottom:4px;${diffAmt?diffStyle:''}">${r.type==='income'?'+':'−'}${fmtP(r.amount)} Kč</div>
        <div style="font-size:.73rem;color:var(--text2);${diffDate?diffStyle:''}">${r.date}</div>
        <div style="font-size:.73rem;color:var(--text2);margin-top:2px;${diffCat?diffStyle:''}">${catImp?catImp.icon+' '+catImp.name:'Bez kategorie'}</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${r.type==='income'?'Příjem':'Výdaj'}</div>
      </div>`;

    const exCol = m ? `
      <div style="${colStyle};border:1px solid var(--border)">
        <div style="font-size:.68rem;color:var(--text2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-weight:700;border-bottom:1px solid var(--border);padding-bottom:5px">📂 Existující</div>
        <div style="font-size:.88rem;font-weight:700;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${diffName?diffStyle:''}">${m.name||'–'}</div>
        <div style="font-size:.82rem;font-weight:700;color:${(m.type||m.typ)==='income'?'var(--income)':'var(--expense)'};margin-bottom:4px;${diffAmt?diffStyle:''}">${(m.type||m.typ)==='income'?'+':'−'}${fmtP(m.amount||m.amt||0)} Kč</div>
        <div style="font-size:.73rem;color:var(--text2);${diffDate?diffStyle:''}">${m.date||''}</div>
        <div style="font-size:.73rem;color:var(--text2);margin-top:2px;${diffCat?diffStyle:''}">${catEx?catEx.icon+' '+catEx.name:'Bez kategorie'}</div>
        <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${(m.type||m.typ)==='income'?'Příjem':'Výdaj'}</div>
      </div>` : `
      <div style="${colStyle};border:1px dashed var(--border);display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:.78rem">
        Žádná podobná transakce
      </div>`;

    return `
    <div style="border:2px solid ${borderColor};background:${bgColor};border-radius:10px;padding:10px 12px;margin-bottom:10px;opacity:${item.included?'1':'.5'}" id="ier-${globalIdx}">
      <!-- Hlavička řádku -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <input type="checkbox" ${item.included?'checked':''} onchange="toggleImportRow(${globalIdx},this.checked)"
          style="width:16px;height:16px;accent-color:var(--income);flex-shrink:0;cursor:pointer">
        ${scoreLabel}
        <div style="flex:1"></div>
        <button class="btn btn-ghost btn-sm" onclick="markImportRowGreen(${globalIdx})" title="Označit jako novou transakci – ignorovat shodu" style="font-size:.72rem">🟢 Není duplikát</button>
      </div>
      <!-- Dvousloupcový layout -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;position:relative">
        ${impCol}
        ${exCol}
      </div>
      ${diffDate||diffAmt||diffName||diffCat ? `
      <div style="font-size:.7rem;color:var(--text3);margin-top:6px">
        ⚠️ Rozdíly: ${[diffName?'název':'',diffAmt?'částka':'',diffDate?'datum':'',diffCat?'kategorie':''].filter(Boolean).join(' · ')}
      </div>` : ''}
    </div>`;
  }).join('');

  // Stránkování
  const totalPages = Math.ceil(filtered.length / IMPORT_PAGE_SIZE);
  const paging = document.getElementById('importEditorPaging');
  if(totalPages <= 1) { paging.innerHTML = ''; return; }
  paging.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="importEditorChangePage(-1)" ${_importEditorPage===0?'disabled':''}>‹ Předchozí</button>
    <span style="font-size:.8rem;color:var(--text2);padding:0 8px">Strana ${_importEditorPage+1} / ${totalPages}</span>
    <button class="btn btn-ghost btn-sm" onclick="importEditorChangePage(1)" ${_importEditorPage>=totalPages-1?'disabled':''}>Další ›</button>`;
}

function toggleImportRow(idx, checked) {
  if(_importEditorRows[idx]) {
    _importEditorRows[idx].included = checked;
    // Pokud uživatel zaškrtne červenou/žlutou = chce importovat = přebarví na zelenou
    if(checked && (_importEditorRows[idx].color === 'red' || _importEditorRows[idx].color === 'yellow')) {
      _importEditorRows[idx].color = 'green';
      _importEditorRows[idx].score = 0;
      _importEditorRows[idx].match = null;
    }
    // Pokud odškrtne = nezahrne do importu
    if(!checked) _importEditorRows[idx].color = 'red';
    renderImportEditor();
  }
}

function markImportRowGreen(idx) {
  if(_importEditorRows[idx]) {
    _importEditorRows[idx].color = 'green';
    _importEditorRows[idx].score = 0;
    _importEditorRows[idx].included = true;
    _importEditorRows[idx].match = null;
    renderImportEditor();
  }
}

function importEditorChangePage(dir) {
  const filtered = getFilteredRows();
  const totalPages = Math.ceil(filtered.length / IMPORT_PAGE_SIZE);
  _importEditorPage = Math.max(0, Math.min(totalPages-1, _importEditorPage + dir));
  renderImportEditor();
}

function executeImport() {
  const toImport = _importEditorRows.filter(r => r.included).map(r => r.row);
  _importRows = toImport;
  closeModal('modalImportEditor');
  confirmImport(window._importEditorFilename || 'import');
}
