// FinanceFlow · smoke test · S27 (v11.88) · tankování z naskenované účtenky + zůstatek dovolené
//  Milan: „transakci jsem musel zapsat ručně, jinak by se nezobrazila v tankování – ze skenu účtenky se data
//         nepropsala (navíc je tam vidět sleva za kupony). Chci elegantní řešení.“
//         „kolik dní / hodin dovolené mi zbývá?“
const vm=require('vm'),fs=require('fs'),path=require('path');
const najdi=(...c)=>c.map(p=>path.join(__dirname,p)).find(p=>fs.existsSync(p));
const R=(...c)=>fs.readFileSync(najdi(...c),'utf8');
const voz=R('vozidla.js','../js/vozidla.js'), kal=R('kalendar.js','../js/kalendar.js');
const pick=(s,n)=>{let i=s.indexOf('function '+n+'(');if(i<0)throw new Error('chybí '+n);let d=0,j=s.indexOf('{',i);for(let k=j;k<s.length;k++){if(s[k]==='{')d++;else if(s[k]==='}'){d--;if(!d)return s.slice(i,k+1)}}};
let ok=0,bad=0;const t=(n,c,i)=>{if(c){ok++;console.log('  ✅',n)}else{bad++;console.log('  ❌',n,i===undefined?'':JSON.stringify(i).slice(0,300))}};

console.log('── položka paliva z účtenky ──');
const MOL={addedAt:111,store:'MOL Česká republika',date:'2026-10-16',total:1022.4,items:[
  {name:'EVO 95',qty:22.27,unit:'l',price:44.53,discount:3.34,lineTotal:988.4},{name:'FC Sezónní Caffe Latte M',qty:1,price:34,lineTotal:34}]};
const S={categories:[{id:'cat11',name:'Auto',subs:['Palivo']}],receipts:[MOL],transactions:[
  {id:'u1',type:'expense',name:'MOL',amount:1022.4,amt:1022.4,catId:'cat11',subcat:'Palivo',date:'2026-10-16',receiptAddedAt:111}]};
const els={};
const c={S,console,getData:()=>S,save(){c.ulozeno=(c.ulozeno||0)+1},showToast(m){c.toast=m},localStorage:{getItem:()=>null,setItem(){}},
  document:{getElementById:id=>els[id]||(els[id]={id,value:'',innerHTML:'',style:{}}),addEventListener(){}},
  dupUctenkaPro:t=>{const r=S.receipts.find(x=>x.addedAt===t.receiptAddedAt);return r?{r}:null}};
c.window=c; vm.createContext(c);
vm.runInContext(voz+'\n;var _isLocalMode=true;',c);
let p=c.tankZUctenky(MOL);
t('EVO 95: 22,27 l, zaplaceno za palivo 988,40 (káva 34 Kč se nepočítá), sleva 3,34 Kč, benzín',p&&p.litry===22.27&&p.kc===988.4&&p.sleva===3.34&&p.palivo==='benzin'&&p.nazev==='EVO 95',p);
t('cena u stojanu = (zaplaceno + sleva) ÷ litry → ušetřeno = přesně sleva z účtenky',Math.abs(p.cenaStojan-44.53)<0.01&&Math.abs(p.litry*p.cenaStojan-p.kc-p.sleva)<0.25,p.cenaStojan);
t('nafta, AdBlue a káva se rozliší',c.tankZUctenky({items:[{name:'Diesel MAXX',qty:40,unit:'l',lineTotal:1500}]}).palivo==='nafta'
  &&c.tankZUctenky({items:[{name:'AdBlue 10l',qty:10,unit:'l',lineTotal:250}]})===null&&c.tankZUctenky({items:[{name:'Káva latte',qty:1,lineTotal:45}]})===null);
t('obyčejná účtenka (bez paliva) nic nenabídne',c.tankZUctenky({items:[{name:'Rohlík',qty:6,lineTotal:12}]})===null);

console.log('── Vozidla: účtenky z benzínky → tankování ──');
vm.runInContext(`_vozidla={v1:{id:'v1',nazev:'Chevrolet',typ:'auto',palivo:'benzin',kdy:1}}`,c);
let L=c.tankUctenkyBez(S);
t('transakce účtenky s palivem bez tankování se nabídne',L.length===1&&L[0].t.id==='u1'&&L[0].p.litry===22.27);
els.vozidlaContent={id:'vozidlaContent',innerHTML:''}; c.renderVozidlaPage();
const h=els.vozidlaContent.innerHTML;
t('stránka Vozidla: karta „📷 Účtenky z benzínky → tankování“ s litry, Kč, slevou, výběrem vozidla a tachometrem',/📷 Účtenky z benzínky → tankování \(1\)/.test(h)&&/EVO 95 · <b>22,27 l<\/b>/.test(h)&&/sleva 3 Kč/.test(h)&&/id="tuVoz_u1"/.test(h)&&/id="tuTach_u1"/.test(h)&&/tankZUctenkyUloz\('u1'\)/.test(h));
els.tuVoz_u1={value:'v1'}; els.tuTach_u1={value:'84 100'};
c.tankZUctenkyUloz('u1');
const tk=S.transactions[0].tank;
t('⛽ Zapsat: tankování na transakci účtenky (vozidlo, litry, tachometr, palivo, Kč za palivo, cena u stojanu, z účtenky)',tk&&tk.vozidloId==='v1'&&tk.litry===22.27&&tk.tachometr===84100&&tk.kc===988.4&&tk.cenaStojan===44.53&&tk.zUctenky===true,tk);
const z=c.tankZaznamy(S,'v1');
t('Vozidla počítají jen palivo: zaplaceno 988,40, ne 1 022,40 s kávou',z.length===1&&z[0].zaplaceno===988.4,z);
const st=c.tankStatistiky(z);
t('ušetřeno na kuponech = sleva z účtenky (~3 Kč)',Math.abs(st.usetreno-3.34)<0.25,st.usetreno);
t('po zapsání se už nenabízí',c.tankUctenkyBez(S).length===0);
t('blok ⛽ v úpravě transakce účtenky: „📷 Doplnit z účtenky“',/📷 Doplnit z účtenky: /.test(voz)&&/function tankDoplnZUctenky\(\)/.test(voz)&&/_vozCislo\(f\.kc\) > 0 \? _vozCislo\(f\.kc\)/.test(voz));

console.log('── zůstatek dovolené ──');
const k={CZ_M:['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'],Math,Date,String,Object,Set,
  S:{workCal:{hpd:12,breakMin:60,vacQuotaH:220,days:{'2026-09-07':{type:'dovolena'},'2026-11-02':{type:'dovolena'},'2026-08-03':{type:'dovolena'}}}},
  vyplZaznamy:()=>[{m:'2026-07'},{m:'2026-08'}],vyplHodinyZPasky:z=>({dovolenaH:z.m==='2026-08'?22:33})};
vm.createContext(k); vm.runInContext('var S=this.S;'+['_workCfg','_workVacH','workDovolenaZbyva'].map(n=>pick(kal,n)).join('\n'),k);
const d=k.workDovolenaZbyva(2026,'2026-10-17');
t('nárok 220 h − pásky (červenec 33 + srpen 22) − kalendář (září 11 + listopad 11 naplánováno) = 143 h; den = 11 h',d.narokH===220&&d.zPasekH===55&&d.zKalH===22&&d.planH===11&&d.zbyvaH===143&&d.denH===11&&/srpen 2026/.test(d.paskyDo),d);
t('srpnový den z kalendáře se nepočítá dvakrát (srpen je na pásce)',d.vycerpanoH===77);
console.log(`\n${ok} OK, ${bad} chyb`); if(bad) process.exitCode=1;
