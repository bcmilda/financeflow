/* smoke_archiv.js — TODO-241: archivace místo mazání peněženek a kategorií */
const fs=require('fs'), path=require('path'), vm=require('vm');
const R=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
let pass=0, fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ✅',n)):(fail++,console.log('  ❌',n)); };
console.log('smoke_archiv.js');

const pre=R('premium.js'), st=R('stats.js');
const ctx=vm.createContext({}); ctx.window=ctx;
vm.runInContext(`var _D={
  wallets:[{id:'w1',name:'Hotovost',currency:'CZK'},
           {id:'w2',name:'Eurová',currency:'EUR'},
           {id:'w3',name:'Stará',currency:'CZK',archived:true}],
  transactions:[{id:1,walletId:'w2',amount:100},{id:2,walletId:'w2',amount:50},
                {id:3,fromWallet:'w1',toWallet:'w2'},{id:4,walletId:'w3'}]
};
function getData(){ return _D; }`, ctx);
const i=pre.indexOf('function getWallets(D, vcetneArchivu)');
vm.runInContext(pre.slice(i, pre.indexOf('window.walletUsageCount')), ctx);

// ── Archivovaná peněženka mizí z nabídek, ale ne z dat ────────────
ok('TODO-241 · getWallets bez archivu vrací jen aktivní',
   ctx.getWallets().map(w=>w.id).join()==='w1,w2');
ok('TODO-241 · s archivem vrací všechny', ctx.getWallets(ctx._D,true).length===3);
ok('TODO-241 · findWallet najde I archivovanou (jinak by transakce ztratila měnu)',
   ctx.findWallet('w3')?.currency==='CZK' && ctx.findWallet('w3')?.archived===true);
ok('TODO-241 · findWallet na neexistující vrátí null, ne pád', ctx.findWallet('nic')===null);

// ── Počítání použití ──────────────────────────────────────────────
ok('TODO-241 · započítá se i obě strany přesunu', ctx.walletUsageCount('w2')===3);
ok('TODO-241 · a odchozí strana taky', ctx.walletUsageCount('w1')===1);
ok('TODO-241 · nepoužitá peněženka dá nulu',
   (ctx._D.wallets.push({id:'w9',name:'Nová'}), ctx.walletUsageCount('w9')===0));

// ── Zdroj: co se smí smazat a co ne ───────────────────────────────
ok('TODO-241 · prázdnou peněženku lze smazat úplně',
   /if\(pocet === 0\)\{[\s\S]{0,300}S\.wallets = \(S\.wallets\|\|\[\]\)\.filter/.test(pre));
ok('TODO-241 · použitá se archivuje, nemaže', /w\.archived = true;/.test(pre) &&
   !/pocet[\s\S]{0,200}S\.wallets=\(S\.wallets\|\|\[\]\)\.filter\(w=>w\.id!==id\)/.test(pre));
ok('TODO-241 · u cizí měny se navíc varuje konkrétně',
   /mena !== 'CZK'/.test(pre) && /spočítala by je jako koruny/.test(pre));
ok('TODO-241 · uživatel se dozví POČET dotčených transakcí', /používá \$\{pocet\}/.test(pre));
ok('TODO-241 · archiv jde vrátit zpět', /function unarchiveWallet\(id\)/.test(pre) &&
   /↩ Vrátit/.test(pre));
ok('TODO-241 · archivované se v seznamu ukážou (ne že tiše zmizí)', /📦 Archivované/.test(pre));
ok('TODO-241 · nad cizími daty se nemaže nic', /function deleteWallet\(id\) \{\s*\n\s*if\(viewingUid\) return;/.test(pre));

// ── Kategorie ─────────────────────────────────────────────────────
ok('TODO-241 · kategorie se taky archivuje místo mazání', /c\.archived=true; save\(\); renderPage\(\);/.test(st));
ok('TODO-241 · a jde vrátit', /function unarchiveCat\(id\)/.test(st));
ok('TODO-241 · nepoužitou kategorii lze smazat', /Žádná transakce ji nepoužívá/.test(st));
ok('TODO-241 · vysvětlí se, co se stane (spadne do „nezařazeno“)', /nezařazeno/.test(st));
ok('TODO-241 · původní jednořádkové mazání bez varování je pryč',
   !/if\(!confirm\('Smazat kategorii\?'\)\)return;/.test(st));

// ── Archivovaná peněženka nesmí zmizet z VYHLEDÁVÁNÍ (jinak zase ztráta měny)
{
  const ui=R('ui.js'), set=R('settings.js');
  ok('TODO-241 · vyhledání podle id nikde nefiltruje archiv',
     !/getWallets\(\)\.find|getWallets\(D\)\.find/.test(pre) &&
     !/getWallets\(\)\.find/.test(R('debts.js')));
  ok('TODO-241 · lookupy používají findWallet', (pre.match(/findWallet\(/g)||[]).length >= 8);
  ok('TODO-241 · picker u transakce archiv nenabízí', /\(D\.wallets\|\|\[\]\)\.filter\(w=>!w\.archived\)/.test(ui));
  ok('TODO-241 · výchozí peněženka v Nastavení taky ne', /filter\(w=>!w\.archived\)/.test(set));
  ok('TODO-241 · a selektor v premium.js taky', /\(S\.wallets\|\|\[\]\)\.filter\(w=>!w\.archived\)/.test(pre));
}

console.log(`\n${pass} OK, ${fail} chyb`);
process.exit(fail?1:0);
