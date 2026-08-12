// -*- js -*-
// FinanceFlow · kontrola před dodávkou
//
// Hledá chyby typu "ReferenceError: X is not defined / before initialization",
// které `node --check` NEZACHYTÍ – kód je syntakticky v pořádku a spadne až za běhu.
//
// v2 (po FIX-237): první verze kontrolovala jen identifikátory začínající
// podtržítkem, takže propustila `months` použité 280 řádků před svou deklarací.
// Nyní kontroluje VŠECHNY lokální const/let/var v každé funkci.
//
// Spuštění z kořene repozitáře:  node tools/check_tdz.js js/*.js
const fs = require('fs');

const FILES = process.argv.slice(2).length ? process.argv.slice(2)
  : ['projects.js', 'premium.js', 'report.js', 'charts.js', 'app.js', 'review.js', 'advisor.js'];

const SKIP = new Set(['S', 'D', 'window', 'document', 'console', 'Math', 'Object', 'Array',
  'JSON', 'Date', 'String', 'Number', 'Boolean', 'Set', 'Map', 'Promise', 'localStorage',
  'return', 'const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'typeof',
  'new', 'this', 'try', 'catch', 'throw', 'async', 'await', 'of', 'in', 'break', 'continue',
  'true', 'false', 'null', 'undefined']);

let problems = 0;

for (const file of FILES) {
  let src;
  try { src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); }
  catch (e) { console.log('skip ' + file + ' (nenalezen)'); continue; }

  // globálně deklarované = na začátku řádku (mimo funkce)
  const globals = new Set();
  for (const m of src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) globals.add(m[1]);
  for (const m of src.matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=/gm)) globals.add(m[1]);
  for (const m of src.matchAll(/^(?:const|let|var)\s+([^;\n]+)/gm)) {
    for (const part of m[1].split(',')) {
      const id = part.trim().match(/^([A-Za-z_$][\w$]*)/);
      if (id) globals.add(id[1]);
    }
  }

  const fnStarts = [...src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)];
  for (let i = 0; i < fnStarts.length; i++) {
    const name = fnStarts[i][1];
    const start = fnStarts[i].index;
    const end = i + 1 < fnStarts.length ? fnStarts[i + 1].index : src.length;
    const body = src.slice(start, end);

    const decl = new Map();
    for (const m of body.matchAll(/(?:^|[;{}\s(])(?:const|let|var)\s+([^;\n=]+)/g)) {
      for (const part of m[1].split(',')) {
        const id = part.trim().match(/^([A-Za-z_$][\w$]*)/);
        if (id && !decl.has(id[1])) decl.set(id[1], m.index);
      }
    }
    for (const m of body.matchAll(/(?:const|let|var)\s*\{([^}]+)\}/g)) {
      for (const part of m[1].split(',')) {
        const id = part.trim().match(/^([A-Za-z_$][\w$]*)/);
        if (id && !decl.has(id[1])) decl.set(id[1], m.index);
      }
    }
    // parametry a proměnné vázané jinde -> pozice 0 (vždy dostupné)
    const sigEnd = body.indexOf(')');
    for (const m of body.slice(0, sigEnd + 1).matchAll(/([A-Za-z_$][\w$]*)\s*(?:=[^,)]*)?[,)]/g)) decl.set(m[1], 0);
    // parametry callbacků: .map((cat,i)=>...), .forEach(x=>...)
    for (const m of body.matchAll(/(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/g)) {
      for (const part of (m[1] || m[2] || '').split(',')) {
        const id = part.trim().match(/^([A-Za-z_$][\w$]*)/);
        if (id) decl.set(id[1], 0);
      }
    }
    for (const m of body.matchAll(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) decl.set(m[1], 0);
    for (const m of body.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) decl.set(m[1], 0);
    for (const m of body.matchAll(/function\s*\(([^)]*)\)/g)) {
      for (const part of m[1].split(',')) {
        const id = part.trim().match(/^([A-Za-z_$][\w$]*)/);
        if (id) decl.set(id[1], 0);
      }
    }
    // parametry callbacků: .map((cat,i)=>…), .filter(x=>…) – arrow uvnitř výrazu
    for (const m of body.matchAll(/\.\s*(?:map|filter|forEach|reduce|find|some|every|sort|flatMap)\s*\(\s*(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/g)) {
      for (const part of (m[1] || m[2] || '').split(',')) {
        const id = part.trim().match(/^([A-Za-z_$][\w$]*)/);
        if (id) decl.set(id[1], 0);
      }
    }

    for (const [id, dpos] of decl) {
      // Krátké názvy (a, m, n, e...) se v řetězcích a HTML vyskytují všude a
      // generovaly by samé falešné poplachy. Chyby, které nás pálí, mají popisné
      // názvy (months, _ffrD, _s1pts), takže kontrolujeme jen 3+ znaků.
      if (!dpos || id.length < 3 || SKIP.has(id) || globals.has(id)) continue;
      const esc = id.replace(/[$]/g, '\\$');
      // pomlčka vylučuje CSS vlastnosti typu box-shadow, grid-template…
      const useRe = new RegExp('[^\\w$.\'"`-]' + esc + '\\s*[^\\w$:=-]', 'g');
      let m;
      while ((m = useRe.exec(body))) {
        if (m.index >= dpos) break;
        const lineStart = body.lastIndexOf('\n', m.index) + 1;
        let lineEnd = body.indexOf('\n', m.index); if (lineEnd < 0) lineEnd = body.length;
        const line = body.slice(lineStart, lineEnd);
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;                 // celý řádek je komentář
        // koncový komentář za kódem: `const x = 1;  // ...zmínka o proměnné...`
        const cmt = line.indexOf('//');
        if (cmt >= 0 && (m.index - lineStart) > cmt) continue;
        // uvnitř řetězce / HTML atributu -> falešný poplach
        const col = m.index - lineStart;
        const pre = line.slice(0, col);
        const q = (ch) => (pre.split(ch).length - 1) % 2 === 1;
        if (q("'") || q('"')) continue;
        // uvnitř ${...} v šabloně je to skutečný kód -> hlásit; jinak text šablony
        const tickOdd = (pre.split('`').length - 1) % 2 === 1;
        if (tickOdd && pre.lastIndexOf('${') <= pre.lastIndexOf('}')) continue;
        const absLn = src.slice(0, start + m.index).split('\n').length;
        console.log('CHYBA ' + file + ':' + absLn + ' - ' + name + '(): "' + id + '" pouzito PRED deklaraci');
        console.log('   ' + line.trim().slice(0, 100));
        problems++;
        break;
      }
    }
  }
}
console.log(problems ? ('\n' + problems + ' problemu - NENASAZOVAT') : '\nOK - zadna promenna neni pouzita pred svou deklaraci');
process.exit(problems ? 1 : 0);
