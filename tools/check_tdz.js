// -*- js -*-
// Kontrola třídy chyb "ReferenceError: X is not defined / before initialization".
// node --check ji NEZACHYTÍ – kód je syntakticky v pořádku a spadne až za běhu.
// Dnes se stala dvakrát (_ffrD, _s1pts), takže radši kontrola než pozornost.
const fs = require('fs');

const FILES = ['projects.js', 'premium.js', 'report.js', 'charts.js', 'app.js'];
let problems = 0;

for (const file of FILES) {
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // globální deklarace (na začátku řádku, tedy mimo funkce)
  const globals = new Set();
  for (const m of src.matchAll(/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) globals.add(m[1]);
  for (const m of src.matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=/gm)) globals.add(m[1]);

  // rozsekat na top-level funkce
  const fnStarts = [...src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)];
  for (let i = 0; i < fnStarts.length; i++) {
    const name = fnStarts[i][1];
    const start = fnStarts[i].index;
    const end = i + 1 < fnStarts.length ? fnStarts[i + 1].index : src.length;
    const body = src.slice(start, end);

    // lokální deklarace v této funkci: název -> pozice první deklarace
    const decl = new Map();
    for (const m of body.matchAll(/(?:^|[;{}\s(])(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) {
      if (!decl.has(m[1])) decl.set(m[1], m.index);
    }
    // parametry funkce považuj za deklarované na pozici 0
    const sig = body.slice(0, body.indexOf(')') + 1);
    for (const m of sig.matchAll(/([A-Za-z_$][\w$]*)\s*(?:=[^,)]*)?[,)]/g)) decl.set(m[1], 0);

    // použití identifikátorů začínajících podtržítkem (naše pomocné proměnné)
    for (const m of body.matchAll(/[^\w$.]_([\w$]+)/g)) {
      const id = '_' + m[1];
      if (globals.has(id)) continue;          // globální – v pořádku
      if (!decl.has(id)) continue;            // nedeklarované lokálně = nejspíš globální z jiného souboru
      if (m.index < decl.get(id)) {
        console.log(`❌ ${file} · ${name}(): '${id}' použito na ${m.index} PŘED deklarací na ${decl.get(id)}`);
        problems++;
        break;
      }
    }
  }
}
console.log(problems ? `\n❌ ${problems} problémů` : '\n✅ Žádná proměnná není použita před svou deklarací');
process.exit(problems ? 1 : 0);
