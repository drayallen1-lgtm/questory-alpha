/**
 * Static import audit — finds identifiers used as calls but not imported/declared.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const GLOBALS = new Set([
  'console', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'Map', 'Set', 'Array', 'Object',
  'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Promise', 'Error',
  'RegExp', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'alert', 'confirm', 'prompt', 'URL', 'URLSearchParams',
  'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request', 'Response',
  'AbortController', 'TextEncoder', 'TextDecoder', 'Intl', 'Symbol', 'BigInt',
  'Proxy', 'Reflect', 'WeakMap', 'WeakSet', 'ArrayBuffer', 'DataView',
  'Uint8Array', 'Int32Array', 'Float32Array', 'performance', 'location',
  'history', 'Image', 'Audio', 'HTMLElement', 'Element', 'Event', 'CustomEvent',
  'MouseEvent', 'KeyboardEvent', 'TouchEvent', 'ResizeObserver', 'IntersectionObserver',
  'MutationObserver', 'queueMicrotask', 'structuredClone', 'atob', 'btoa',
  'undefined', 'NaN', 'Infinity', 'globalThis', 'self', 'import', 'meta',
]);

const REACT_GLOBALS = new Set([
  'React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef',
  'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle',
  'useDebugValue', 'useId', 'useTransition', 'useDeferredValue', 'useSyncExternalStore',
  'Fragment', 'StrictMode', 'Suspense', 'createContext', 'forwardRef', 'memo',
  'lazy', 'createElement', 'cloneElement', 'Children', 'Component', 'PureComponent',
]);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(name)) files.push(full);
  }
  return files;
}

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

function extractImports(code) {
  const names = new Set();
  const importRe = /import\s+(?:(?:\{([^}]+)\})|(?:(\w+)(?:\s*,\s*\{([^}]+)\})?)|(?:\*\s+as\s+(\w+)))/g;
  let m;
  while ((m = importRe.exec(code))) {
    if (m[4]) names.add(m[4]); // namespace
    if (m[2]) names.add(m[2]); // default
    for (const block of [m[1], m[3]]) {
      if (!block) continue;
      for (const part of block.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const alias = trimmed.split(/\s+as\s+/);
        names.add(alias[alias.length - 1].trim());
      }
    }
  }
  return names;
}

function extractDeclarations(code) {
  const names = new Set();
  const patterns = [
    /(?:function|async function)\s+(\w+)/g,
    /(?:const|let|var)\s+(\w+)\s*=/g,
    /(?:const|let|var)\s+\{([^}]+)\}\s*=/g,
    /(?:const|let|var)\s+\[([^\]]+)\]\s*=/g,
    /class\s+(\w+)/g,
    /export\s+(?:async\s+)?function\s+(\w+)/g,
    /export\s+(?:const|let|var|class|function)\s+(\w+)/g,
    /export\s+default\s+(?:function\s+)?(\w+)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code))) {
      if (m[1]?.includes(',')) {
        m[1].split(',').forEach((p) => {
          const n = p.trim().split(':')[0].split('=')[0].trim();
          if (n && /^\w+$/.test(n)) names.add(n);
        });
      } else if (m[1] && /^\w+$/.test(m[1])) {
        names.add(m[1]);
      }
    }
  }
  // function params in same file (component props destructuring in params)
  const paramFn = /(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\(([^)]*)\)/g;
  let pm;
  while ((pm = paramFn.exec(code))) {
    for (const p of pm[1].split(',')) {
      const n = p.trim().split(':')[0].split('=')[0].trim().replace(/^\.\.\./, '');
      if (n && /^\w+$/.test(n)) names.add(n);
    }
  }
  return names;
}

function extractCallSites(code) {
  const calls = new Set();
  const re = /(?<![.\w])([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    const name = m[1];
    if (name === 'if' || name === 'for' || name === 'while' || name === 'switch' || name === 'catch' || name === 'function') continue;
    calls.add(name);
  }
  return calls;
}

function extractExportsFromFile(filePath, code) {
  const exports = [];
  const re = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let m;
  while ((m = re.exec(code))) exports.push({ name: m[1], file: filePath });
  const re2 = /export\s+(?:const|let|var|class)\s+(\w+)/g;
  while ((m = re2.exec(code))) exports.push({ name: m[1], file: filePath });
  const re3 = /export\s*\{([^}]+)\}/g;
  while ((m = re3.exec(code))) {
    for (const part of m[1].split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const bits = trimmed.split(/\s+as\s+/);
      exports.push({ name: bits[0].trim(), file: filePath, exportedAs: bits[bits.length - 1].trim() });
    }
  }
  return exports;
}

const files = walk(SRC);
const allExports = [];
const issues = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

  const imports = extractImports(code);
  const declared = extractDeclarations(code);
  const known = new Set([...GLOBALS, ...REACT_GLOBALS, ...imports, ...declared]);
  const calls = extractCallSites(code);

  for (const call of calls) {
    if (!known.has(call)) {
      issues.push({ file: rel, identifier: call, kind: 'missing-import-or-declaration' });
    }
  }

  allExports.push(...extractExportsFromFile(rel, code));
}

// Dedupe issues
const seen = new Set();
const uniqueIssues = issues.filter((i) => {
  const k = `${i.file}:${i.identifier}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log('=== Import audit ===');
console.log(`Files scanned: ${files.length}`);
console.log(`Exports found: ${allExports.length}`);
console.log(`Potential missing imports: ${uniqueIssues.length}`);

if (uniqueIssues.length) {
  console.log('\n--- Issues ---');
  for (const i of uniqueIssues.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`${i.file}: ${i.identifier}`);
  }
  process.exitCode = 1;
} else {
  console.log('\nNo missing import issues detected.');
}
