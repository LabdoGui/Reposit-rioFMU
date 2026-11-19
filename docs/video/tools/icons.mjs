// Gera assets/icons.js com os ícones lucide (mesmo pacote do app) como strings SVG.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../../..');
const names = process.argv.slice(2);
const out = {};
for (const name of names) {
  const file = path.join(root, 'node_modules/lucide-react/dist/esm/icons', `${name}.js`);
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/const __iconNode = (\[[\s\S]*?\]);\n/);
  const nodes = Function(`return ${m[1]}`)();
  const inner = nodes
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  out[name] = inner;
}
fs.writeFileSync(
  path.join(import.meta.dirname, '../assets/icons.js'),
  `// Gerado por tools/icons.mjs a partir do lucide-react (ISC).\nwindow.ICONS = ${JSON.stringify(out, null, 1)};\n`,
);
console.log(Object.keys(out).length, 'ícones');
