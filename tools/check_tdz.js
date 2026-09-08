// -*- js -*-
// FinanceFlow · kontrola pred dodavkou (v4 - skutecny parser)
//
// Hleda "ReferenceError: X is not defined / before initialization" - chyby,
// ktere `node --check` nezachyti, protoze kod je syntakticky v poradku.
//
// HISTORIE (proc to vypada takhle):
//  v1 (v9.59) - kontrolovala jen nazvy s podtrzitkem  -> propustila `months`
//  v2 (v9.63) - regex nad celou funkci                -> propustila `fs`,
//               protoze NEZNALA BLOKOVY SCOPE: `const fs` uvnitr try{} v jinem
//               bloku povazovala za platnou deklaraci pro celou funkci.
//  v4         - acorn parser + skutecne vyhodnoceni scope. Regexy nestaci.
//
// Pouziti:  node tools/check_tdz.js js/*.js
let acorn, walk;
try { acorn = require('acorn'); walk = require('acorn-walk'); }
catch (e) { console.log('CHYBI ZAVISLOST: npm install acorn acorn-walk'); process.exit(2); }
const fsMod = require('fs');

const FILES = process.argv.slice(2).length ? process.argv.slice(2)
  : ['projects.js', 'premium.js', 'report.js', 'charts.js', 'app.js', 'review.js', 'advisor.js', 'ui.js', 'admin.js'];

let problems = 0;

// ── 1. pruchod: posbirej globaly ze VSECH souboru ──
// Aplikace je multi-file bez modulu, takze funkce z jednoho souboru se bezne
// volaji v jinem. Bez tohoto seznamu by kazde takove volani vypadalo jako chyba.
const KNOWN = new Set(['window','document','console','Math','JSON','Date','Object','Array',
  'String','Number','Boolean','Set','Map','WeakMap','Promise','RegExp','Error','Symbol',
  'localStorage','sessionStorage','navigator','location','history','fetch','setTimeout',
  'clearTimeout','setInterval','clearInterval','requestAnimationFrame','alert','confirm',
  'prompt','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent',
  'Intl','URL','URLSearchParams','FileReader','Blob','FormData','Image','Audio','Notification',
  'IntersectionObserver','ResizeObserver','MutationObserver','CustomEvent','Event','AbortController',
  'structuredClone','btoa','atob','crypto','performance','screen','indexedDB','caches','undefined',
  'globalThis','arguments','require','module','exports','process','__dirname','Function','BigInt',
  'TextEncoder','TextDecoder','Uint8Array','ArrayBuffer','DataView','Proxy','Reflect','queueMicrotask',
  'Infinity','NaN','escape','unescape','WeakSet','Sentry','gtag','dataLayer','firebase',
  'getComputedStyle','File','Response','Request','self']);
// Volitelny allowlist projektovych globalu, ktere zijou mimo kontrolovane soubory
// (inline skripty, jine moduly). Doplnuj, kdyz skript hlasi neco, co existuje.
['toast','closeSidebar','loadData','renderPartnersList','showPage','renderPage'].forEach(n => KNOWN.add(n));
// Globaly sbirame ze VSECH .js v adresari kontrolovanych souboru, ne jen
// z tech, ktere kontrolujeme - jinak by funkce z helpers.js vypadaly jako chyba.
const SCAN = new Set(FILES);
try {
  const dirs = new Set(FILES.map(f => require('path').dirname(f)));
  for (const d of dirs)
    for (const f of fsMod.readdirSync(d))
      if (f.endsWith('.js')) SCAN.add(require('path').join(d, f));
} catch (e) {}
// Funkce definovane v inline <script> v app.html (toast, closeSidebar, showPage...)
try {
  const html = fsMod.readFileSync('app.html', 'utf8');
  for (const m of html.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) KNOWN.add(m[1]);
  for (const m of html.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) KNOWN.add(m[1]);
  for (const m of html.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) KNOWN.add(m[1]);
} catch (e) {}

for (const f of SCAN) {
  let t; try { t = fsMod.readFileSync(f, 'utf8'); } catch (e) { continue; }
  //  firebase.js pouziva import -> potrebuje sourceType 'module'
  let a;
  try { a = acorn.parse(t, { ecmaVersion: 2022, allowReturnOutsideFunction: true }); }
  catch (e) { try { a = acorn.parse(t, { ecmaVersion: 2022, sourceType: 'module' }); } catch (e2) { continue; } }
  a.body.forEach(n => {
    if (n.type === 'FunctionDeclaration' && n.id) KNOWN.add(n.id.name);
    else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => {
      if (d.id.type === 'Identifier') KNOWN.add(d.id.name);
    });
    else if (n.type === 'ClassDeclaration' && n.id) KNOWN.add(n.id.name);
  });
  for (const m of t.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) KNOWN.add(m[1]);
}

for (const file of FILES) {
  let src;
  try { src = fsMod.readFileSync(file, 'utf8'); }
  catch (e) { console.log('skip ' + file + ' (nenalezen)'); continue; }

  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, locations: true, allowReturnOutsideFunction: true }); }
  catch (e) {
    try { ast = acorn.parse(src, { ecmaVersion: 2022, locations: true, sourceType: 'module' }); }
    catch (e2) { console.log('CHYBA ' + file + ': nelze parsovat - ' + e.message); problems++; continue; }
  }

  const scopeOf = new Map();
  const mkScope = (parent, kind) => ({ parent, kind, names: new Map() });
  const global = mkScope(null, 'function');

  function declare(scope, name, start, isVar) {
    let t = scope;
    if (isVar) while (t.kind === 'block' && t.parent) t = t.parent;
    if (!t.names.has(name)) t.names.set(name, { start, isVar });
  }
  function bind(scope, pat, start, isVar) {
    if (!pat) return;
    if (pat.type === 'Identifier') declare(scope, pat.name, start, isVar);
    else if (pat.type === 'ObjectPattern') pat.properties.forEach(p => bind(scope, p.value || p.argument, start, isVar));
    else if (pat.type === 'ArrayPattern') pat.elements.forEach(el => bind(scope, el, start, isVar));
    else if (pat.type === 'AssignmentPattern') bind(scope, pat.left, start, isVar);
    else if (pat.type === 'RestElement') bind(scope, pat.argument, start, isVar);
  }

  (function build(node, scope) {
    if (!node || typeof node.type !== 'string') return;
    scopeOf.set(node, scope);
    let inner = scope;

    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      if (node.type === 'FunctionDeclaration' && node.id) declare(scope, node.id.name, 0, true);
      inner = mkScope(scope, 'function');
      if (node.id && node.type === 'FunctionExpression') declare(inner, node.id.name, 0, true);
      node.params.forEach(p => bind(inner, p, 0, true));
    } else if (['BlockStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'SwitchStatement'].includes(node.type)) {
      inner = mkScope(scope, 'block');
    } else if (node.type === 'CatchClause') {
      inner = mkScope(scope, 'block');
      bind(inner, node.param, 0, true);
    } else if (node.type === 'VariableDeclaration') {
      node.declarations.forEach(d => bind(scope, d.id, node.start, node.kind === 'var'));
    } else if (node.type === 'ClassDeclaration' && node.id) {
      declare(scope, node.id.name, node.start, false);
    }

    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && build(c, inner));
      else if (v && typeof v.type === 'string') build(v, inner);
    }
  })(ast, global);

  const seen = new Set();
  walk.ancestor(ast, {
    Identifier(node, _st, ancestors) {
      const parent = ancestors[ancestors.length - 2];
      if (!parent) return;
      if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
      if (parent.type === 'Property' && parent.key === node && !parent.computed) return;
      if (parent.type === 'VariableDeclarator' && parent.id === node) return;
      if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
           'LabeledStatement', 'BreakStatement', 'ContinueStatement'].includes(parent.type)) return;
      // `typeof X` na nedeklarovane promenne chybu NEVYHODI - je to legitimni
      // obrana pouzivana napric aplikaci (typeof toast === 'function').
      if (parent.type === 'UnaryExpression' && parent.operator === 'typeof') return;

      let scope = scopeOf.get(node) || global;
      let crossedFn = false;      // presli jsme hranici funkce?
      while (scope) {
        const d = scope.names.get(node.name);
        if (d) {
          // Deklarace v NADRAZENE funkci je v poradku: vnitrni funkce se vola az
          // po nacteni souboru. Chyba je jen v ramci TEHOZ funkcniho scope.
          if (!crossedFn && d.start > 0 && node.start < d.start && !d.isVar) {
            const key = file + ':' + node.start;
            if (!seen.has(key)) {
              seen.add(key);
              const line = node.loc.start.line;
              const declLine = src.slice(0, d.start).split('\n').length;
              console.log('CHYBA ' + file + ':' + line + ' - "' + node.name + '" pouzito PRED deklaraci (deklarace az na radku ' + declLine + ')');
              console.log('   ' + src.split('\n')[line - 1].trim().slice(0, 100));
              problems++;
            }
          }
          return;
        }
        if (scope.kind === 'function') crossedFn = true;
        scope = scope.parent;
      }
      // Nikde nedeklarovane a neni to znamy globalni identifikator z jineho
      // souboru ani browser API -> presne pripad `fs` z FIX-241.
      if (!KNOWN.has(node.name)) {
        const key = file + ':' + node.start;
        if (!seen.has(key)) {
          seen.add(key);
          const line = node.loc.start.line;
          console.log('CHYBA ' + file + ':' + line + ' - "' + node.name + '" NENI NIKDE DEKLAROVANE');
          console.log('   ' + src.split('\n')[line - 1].trim().slice(0, 100));
          problems++;
        }
      }
    }
  });
}

console.log(problems ? ('\n' + problems + ' problemu - NENASAZOVAT')
                     : '\nOK - zadna promenna neni pouzita pred svou deklaraci');
process.exit(problems ? 1 : 0);
