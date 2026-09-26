// S23 (PLAN F2): Mapa položek v adminu – statistiky a ukládání.
// Spuštění: node tools/smoke_mapa.js
const fs=require('fs');const A=fs.readFileSync(process.argv[2]||'admin.js','utf8');
let ok=0,bad=0;const T=(n,c)=>{c?ok++:(bad++,console.log('❌',n));};
const cut=n=>{let a=A.indexOf('async function '+n+'(');if(a<0)a=A.indexOf('function '+n+'(');let i=A.indexOf('{',a),d=0;for(;i<A.length;i++){if(A[i]==='{')d++;else if(A[i]==='}'){d--;if(!d)break;}}return A.slice(a,i+1);};
const g=n=>{const c=cut(n);eval(c.replace(/^async /,'').replace('function '+n,'global.'+n+'='+(c.startsWith('async')?'async ':'')+'function'));};
['mapaStatistiky','mapaStatKarta'].forEach(g);
const tagy={ 'brambory rane':{zelenina:2,zeleninaa:1}, 'orion kofila':{sladkost:2}, 'rohlik':{pecivo:1,sladke_pecivo:1}, 'kesu':{orechy:1} };
const zaznamy={
  'brambory rane':{obecny:'zelenina',konkretni:'brambory',catId:'cat1',subcat:'Ovoce a zelenina'},
  'orion kofila':{obecny:'sladkost',konkretni:'čokoláda',catId:'cat1',subcat:'Sladkosti'},
  'rohlik':{obecny:'pecivo',konkretni:'rohlík',catId:'cat1',subcat:'Pečivo'},
  'kesu':{obecny:'orechy'},   // bez kategorie → nenamapováno
};
const st=mapaStatistiky(tagy,zaznamy);
T('A) počet namapovaných položek (jen s kategorií)',st.namapovano===3&&st.bezMapovani===1);
T('B) počet kategorií (bez duplicit)',st.kategorie===1);
T('C) počet podkategorií (v rámci kategorie)',st.podkategorie===3);
T('D) počet konkrétních názvů',st.konkretni===3);
T('E) počet obecných názvů z tagů i mapy',st.obecne===6);
T('velká a malá písmena se nepočítají zvlášť',mapaStatistiky({},{a:{obecny:'Zelenina'},b:{obecny:'zelenina'}}).obecne===1);
T('prázdná mapa nespadne',mapaStatistiky({},{}).polozky===0&&mapaStatistiky(null,null).obecne===0);
const k=mapaStatKarta(st);
T('karta ukazuje všech 5 čísel',['Namapované položky','Kategorie','Podkategorie','Konkrétní názvy','Obecné názvy'].every(x=>k.includes(x)));
T('karta hlásí, kolik položek čeká',/1 čeká/.test(k));
// kód
T('zápis do mapy jde jen přes productMap',/community\/productMap\/\$\{encodeURIComponent\(klic\)\}/.test(A));
T('když chybí obecný název, doplní se z nejsilnějšího tagu',/zaznam\.obecny = \(_mapaTagTop\[klic\] \|\| ''\)/.test(A));
T('položka s kategorií je označená jako namapovaná',/✓ namapováno/.test(A));
T('řádek má konkrétní název, kategorii i podkategorii',/'konkretni',this\)/.test(A)&&/'catId',this\)/.test(A)&&/'subcat',this\)/.test(A));
T('klíč položky se escapuje do onchange',/_onEsc\(item\.itemKey\)/.test(A));
T('název položky se escapuje',/_vzEsc\(item\.itemKey/.test(A));
T('záložka se jmenuje Mapa položek',/🗺️/.test(A));
console.log(`Mapa položek: ${ok} OK, ${bad} chyb`);process.exit(bad?1:0);
