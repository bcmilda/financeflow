// FinanceFlow · smoke test · S26 (v11.68) · TODO-334 přehled nových karet pro admina + zámek v pravidlech DB
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const adm=R('admin.js','../js/admin.js');
const pick=n=>{const i=adm.indexOf('function '+n+'(');let d=0,j=adm.indexOf('{',i);for(let k=j;k<adm.length;k++){if(adm[k]==='{')d++;else if(adm[k]==='}'){d--;if(!d)return adm.slice(i,k+1)}}};
const ctx={console,Math,Object,Set,String,Date,window:{}};vm.createContext(ctx);
vm.runInContext(pick('adminKartyPrehled'),ctx);
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i))}};
const den=86400000, ted=Date.parse('2026-10-12T12:00:00Z');
const log={
  '8595237405947':{u1:{kdy:ted-2*den,nazev:'Oreo',znacka:'Mondelez'},u2:{kdy:ted-1*den,nazev:'Oreo'}},
  '8590000000008':{u3:{kdy:ted-20*den,nazev:'Kofila',mnozstvi:{hodnota:42,jednotka:'g'}}},
  '8591234000000':{u1:{kdy:ted-60*den,nazev:'Staré'}},
  'prazdny':{}};
const pr=ctx.adminKartyPrehled(log,{'8595237405947':{nazev:'Oreo Double',nazevCesky:true,mnozstvi:{hodnota:157,jednotka:'g'}}},ted);
console.log('── TODO-334 · přehled nových karet ──');
t('počty: 7 dní / 30 dní / celkem / lidí',pr.tyden===1&&pr.mesic===2&&pr.celkem===3&&pr.lidi===3,pr);
t('nejnovější nahoře',pr.polozky[0].ean==='8595237405947'&&pr.polozky[2].ean==='8591234000000');
t('kolik lidí kartu založilo',pr.polozky[0].lidi===2);
t('název a gramáž z karty, jinak ze záznamu',pr.polozky[0].nazev==='Oreo Double'&&pr.polozky[0].mnozstvi==='157 g'&&pr.polozky[1].mnozstvi==='42 g');
t('prázdný záznam se přeskočí',!pr.polozky.some(x=>x.ean==='prazdny'));
t('prázdný log nespadne',ctx.adminKartyPrehled(null,{},ted).celkem===0);
console.log('── pravidla DB v11.68 ──');
const rules=R('database_rules.json','database.rules.json','../database.rules.json');
const js=JSON.parse(rules.split('\n').filter(l=>!l.trim().startsWith('//')).join('\n'));
const c=js.rules.community;
t('eanKartyLog čte jen admin, nikdo nezapisuje',/LNEC8VNB2QPwIv6WWQ9lqgR4O5v1/.test(c.eanKartyLog['.read'])&&c.eanKartyLog['.write']===false);
t('eanZamky čte přihlášený, zapisuje jen admin',c.eanZamky['.read']==='auth != null'&&/LNEC8VNB2QPwIv6WWQ9lqgR4O5v1/.test(c.eanZamky['.write'])&&!/auth != null/.test(c.eanZamky['.write']));
t('zámek: kód jen číslice 8–14',/\[0-9\]\{8,14\}/.test(c.eanZamky.$klic.ean['.validate'])&&c.eanZamky.$klic.$jine['.validate']===false);
t('admin panel: zámek i přehled jsou v Čárových kódech',/mapaAdminZamkni\('\$\{e\}'/.test(adm)&&adm.includes('id="mapaAdminKarty"'));
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
