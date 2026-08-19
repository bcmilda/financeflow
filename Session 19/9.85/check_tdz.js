// check_tdz.js – detekce "použito před deklarací" (TDZ) přes skutečný parser.
// Rekonstrukce tools/check_tdz.js ze Session 18 (SKILL 23) pro ověření nových souborů.
// Použití: node check_tdz.js soubor.js [další.js ...]
const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

let problems = 0;

function checkFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, locations: true, allowReturnOutsideFunction: true }); }
  catch (e) { console.log(`❌ ${file}: parse error – ${e.message}`); problems++; return; }

  // Sestav strom scope: každý blok/funkce má vlastní mapu let/const → pozice deklarace
  const scopes = [];
  function pushScope(node, isFn) { scopes.push({ node, isFn, decls: new Map() }); }
  function declare(name, pos) { const s = scopes[scopes.length - 1]; if (s && !s.decls.has(name)) s.decls.set(name, pos); }

  function collectPattern(pat, pos) {
    if (!pat) return;
    if (pat.type === 'Identifier') declare(pat.name, pos);
    else if (pat.type === 'ObjectPattern') pat.properties.forEach(p => collectPattern(p.value || p.argument, pos));
    else if (pat.type === 'ArrayPattern') pat.elements.forEach(e => collectPattern(e, pos));
    else if (pat.type === 'AssignmentPattern') collectPattern(pat.left, pos);
    else if (pat.type === 'RestElement') collectPattern(pat.argument, pos);
  }

  // Vrací {pos, deferred}. deferred = mezi použitím a deklarací leží HRANICE FUNKCE,
  // tedy kód se spustí až při volání → textové pořadí nic neznamená (žádná TDZ).
  function lookup(name) {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].decls.has(name)) {
        let deferred = false;
        for (let j = i + 1; j < scopes.length; j++) if (scopes[j].isFn) { deferred = true; break; }
        return { pos: scopes[i].decls.get(name), deferred };
      }
    }
    return null;
  }

  const state = {};
  const base = Object.create(walk.base);

  function scopedBlock(node, st, c, isFn) {
    pushScope(node, isFn);
    const body = node.body ? (Array.isArray(node.body) ? node.body : [node.body]) : [];
    if (isFn && node.params) node.params.forEach(p => collectPattern(p, -1));
    body.forEach(stmt => {
      if (stmt.type === 'VariableDeclaration' && (stmt.kind === 'let' || stmt.kind === 'const'))
        stmt.declarations.forEach(d => collectPattern(d.id, d.start));
      if (stmt.type === 'ClassDeclaration' && stmt.id) declare(stmt.id.name, stmt.start);
    });
    body.forEach(stmt => c(stmt, st));
    scopes.pop();
  }

  base.Program = (node, st, c) => scopedBlock(node, st, c, false);
  base.BlockStatement = (node, st, c) => scopedBlock(node, st, c, false);
  base.FunctionDeclaration = base.FunctionExpression = base.ArrowFunctionExpression = (node, st, c) => {
    pushScope(node, true);
    if (node.params) node.params.forEach(p => collectPattern(p, -1));
    if (node.body.type === 'BlockStatement') {
      node.body.body.forEach(stmt => {
        if (stmt.type === 'VariableDeclaration' && (stmt.kind === 'let' || stmt.kind === 'const'))
          stmt.declarations.forEach(d => collectPattern(d.id, d.start));
        if (stmt.type === 'ClassDeclaration' && stmt.id) declare(stmt.id.name, stmt.start);
      });
      node.body.body.forEach(stmt => c(stmt, st));
    } else c(node.body, st);
    scopes.pop();
  };
  base.ForStatement = base.ForInStatement = base.ForOfStatement = (node, st, c) => {
    pushScope(node, false);
    if (node.init && node.init.type === 'VariableDeclaration' && node.init.kind !== 'var')
      node.init.declarations.forEach(d => collectPattern(d.id, d.start));
    if (node.left && node.left.type === 'VariableDeclaration' && node.left.kind !== 'var')
      node.left.declarations.forEach(d => collectPattern(d.id, d.start));
    ['init', 'left', 'right', 'test', 'update', 'body'].forEach(k => { if (node[k]) c(node[k], st); });
    scopes.pop();
  };

  base.Identifier = (node, st) => {
    const found = lookup(node.name);
    // -1 = parametr funkce (vždy dostupný). deferred = uvnitř funkce → spustí se až při volání.
    if (found !== null && !found.deferred && found.pos >= 0 && node.start < found.pos) {
      console.log(`❌ ${file}:${node.loc.start.line} – '${node.name}' použito před deklarací (TDZ)`);
      problems++;
    }
  };

  walk.recursive(ast, state, {}, base);
}

const files = process.argv.slice(2);
if (!files.length) { console.log('Použití: node check_tdz.js soubor.js ...'); process.exit(1); }
files.forEach(checkFile);
console.log(problems ? `\n❌ Nalezeno ${problems} problémů` : `\n✅ TDZ kontrola OK (${files.length} souborů)`);
process.exit(problems ? 1 : 0);
