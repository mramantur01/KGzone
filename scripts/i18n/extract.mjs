// Collects every Cyrillic string that can reach the page: string literals, template literals
// (with "{}" in place of ${...}) and JSX text from src/ and server.ts.
// Strings in the `isKg ? '...' : ...` branch are skipped — they are already Kyrgyz.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default;
const CYRILLIC = /[А-Яа-яЁё]/;
const normalize = (s) => s.replace(/\s+/g, ' ').trim();

const isKgTest = (t) =>
  (t.type === 'Identifier' && t.name === 'isKg') ||
  (t.type === 'BinaryExpression' && /^(===|==)$/.test(t.operator) &&
    ((t.left.type === 'Identifier' && t.left.name === 'language' && t.right.value === 'kg') ||
      (t.right.type === 'Identifier' && t.right.name === 'language' && t.left.value === 'kg')));

const PASS_THROUGH = new Set([
  'JSXExpressionContainer', 'TemplateLiteral', 'BinaryExpression', 'ParenthesizedExpression', 'JSXElement', 'JSXFragment',
]);

function isKgBranch(p) {
  for (let cur = p; cur.parentPath; cur = cur.parentPath) {
    const par = cur.parentPath.node;
    if (par.type === 'ConditionalExpression') return par.consequent === cur.node && isKgTest(par.test);
    if (par.type === 'LogicalExpression' && par.operator === '&&' && par.right === cur.node && isKgTest(par.left)) return true;
    if (!PASS_THROUGH.has(par.type)) return false;
  }
  return false;
}

function isConsoleArg(p) {
  const call = p.findParent((x) => x.isCallExpression());
  const c = call?.node.callee;
  return c?.type === 'MemberExpression' && c.object.name === 'console';
}

function collectFile(file, rel, out) {
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  const add = (raw) => {
    const k = normalize(raw);
    if (!k || !CYRILLIC.test(k)) return;
    if (!out.has(k)) out.set(k, new Set());
    out.get(k).add(rel);
  };
  traverse(ast, {
    StringLiteral(p) {
      if (p.parent.type === 'ImportDeclaration' || p.parent.type === 'TSLiteralType') return;
      if (p.parent.type === 'ObjectProperty' && p.parent.key === p.node) return;
      if (p.parent.type === 'JSXAttribute' && p.parent.name.name === 'className') return;
      if (isKgBranch(p) || isConsoleArg(p)) return;
      add(p.node.value);
    },
    TemplateLiteral(p) {
      if (p.parent.type === 'TaggedTemplateExpression' || isKgBranch(p) || isConsoleArg(p)) return;
      add(p.node.quasis.map((q) => q.value.cooked).join('{}'));
    },
    JSXText(p) {
      if (!isKgBranch(p)) add(p.node.value);
    },
  });
}

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(d, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : walk(full);
    return /\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [full] : [];
  });

/** @returns {Map<string, Set<string>>} Russian string -> files it appears in */
export function extractStrings(projectRoot) {
  const out = new Map();
  for (const file of walk(path.join(projectRoot, 'src'))) {
    collectFile(file, path.relative(projectRoot, file).replace(/\\/g, '/'), out);
  }
  const server = new Map();
  collectFile(path.join(projectRoot, 'server.ts'), 'server.ts', server);
  for (const [k, files] of server) {
    // The Gemini system prompt never reaches the page
    if (k.length > 350 || k.startsWith('Ты —')) continue;
    if (!out.has(k)) out.set(k, new Set());
    files.forEach((f) => out.get(k).add(f));
  }
  return out;
}
