/**
 * Cross-reference exported symbols vs call sites missing imports.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(name)) files.push(full);
  }
  return files;
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

function parseExports(filePath, code) {
  const names = [];
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  for (const re of [
    /export\s+async\s+function\s+(\w+)/g,
    /export\s+function\s+(\w+)/g,
    /export\s+(?:const|let|var|class)\s+(\w+)/g,
  ]) {
    let m;
    while ((m = re.exec(code))) names.push({ name: m[1], from: rel });
  }
  const reExport = /export\s*\{([^}]+)\}/g;
  let m;
  while ((m = reExport.exec(code))) {
    for (const part of m[1].split(',')) {
      const bits = part.trim().split(/\s+as\s+/);
      if (bits[0]) names.push({ name: bits[bits.length - 1].trim(), from: rel });
    }
  }
  return names;
}

function parseImports(code) {
  const names = new Set();
  const re = /import\s+(?:(\{([^}]+)\})|(?:(\w+)(?:\s*,\s*\{([^}]+)\})?)|(?:\*\s+as\s+(\w+)))/g;
  let m;
  while ((m = re.exec(code))) {
    if (m[5]) names.add(m[5]);
    if (m[3]) names.add(m[3]);
    for (const block of [m[2], m[4]]) {
      if (!block) continue;
      for (const part of block.split(',')) {
        const alias = part.trim().split(/\s+as\s+/);
        names.add(alias[alias.length - 1].trim());
      }
    }
  }
  return names;
}

function parseDeclarations(code) {
  const names = new Set();
  for (const re of [
    /(?:function|async function)\s+(\w+)/g,
    /(?:const|let|var)\s+(\w+)\s*=/g,
    /class\s+(\w+)/g,
  ]) {
    let m;
    while ((m = re.exec(code))) names.add(m[1]);
  }
  return names;
}

const files = walk(SRC);
const exportMap = new Map(); // name -> [from files]

for (const file of files) {
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  for (const exp of parseExports(file, code)) {
    if (!exportMap.has(exp.name)) exportMap.set(exp.name, []);
    exportMap.get(exp.name).push(exp.from);
  }
}

const issues = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const imports = parseImports(code);
  const declared = parseDeclarations(code);
  const known = new Set([...imports, ...declared]);

  const callRe = /(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  const called = new Set();
  while ((m = callRe.exec(code))) called.add(m[1]);

  for (const name of called) {
    if (known.has(name)) continue;
    if (!exportMap.has(name)) continue;
    const sources = exportMap.get(name).filter((s) => s !== rel);
    if (!sources.length) continue;
    issues.push({ file: rel, name, importFrom: sources });
  }
}

console.log('=== Export/call cross-reference ===');
console.log(`Exports indexed: ${exportMap.size}`);
console.log(`Missing imports: ${issues.length}`);
for (const i of issues.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name))) {
  console.log(`${i.file}: ${i.name}  ← import from ${i.importFrom.join(' | ')}`);
}

if (issues.length) process.exitCode = 1;
