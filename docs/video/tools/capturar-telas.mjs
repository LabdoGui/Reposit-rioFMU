// Captura as telas reais da demonstração usadas no vídeo (docs/video/assets/telas).
//
//   npm run build:demo -w @pulso/frontend
//   (cd frontend/dist-demo && python3 -m http.server 4173)      # em outro terminal
//   node docs/video/tools/capturar-telas.mjs
//
// As capturas saem em PNG (2x) numa pasta temporária e são convertidas para JPEG em assets/telas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.DEMO_URL || 'http://localhost:4173/demo.html';
const RAW = fs.mkdtempSync(path.join(os.tmpdir(), 'telas-'));
const OUT = path.resolve(import.meta.dirname, '../assets/telas');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function session(viewport, scale, email) {
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: scale, locale: 'pt-BR' })).newPage();
  if (email) {
    await page.goto(`${BASE}#/entrar`); await page.waitForTimeout(1200);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('Pulso@2026');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForTimeout(2000);
  }
  return page;
}
// o aviso fixo "Demonstração · dados fictícios" sai das capturas
const clean = (page) => page.evaluate(() => document.querySelectorAll('div[role=note]').forEach((n) => n.remove()));
async function shot(page, route, name, full = false) {
  if (route) { await page.goto(`${BASE}#${route}`); await page.waitForTimeout(2200); }
  await clean(page);
  await page.screenshot({ path: path.join(RAW, `${name}.png`), fullPage: full });
  console.log('ok', name);
}

const desk = { width: 1440, height: 900 };
let p = await session(desk, 2);
await shot(p, '/', 'landing-full', true);
p = await session(desk, 2, 'doador@demo.com');
for (const [r, n] of [['/app/doacoes', 'donor-doacoes'], ['/app/notificacoes', 'donor-notificacoes']]) await shot(p, r, n);
p = await session({ width: 390, height: 844 }, 2, 'doador@demo.com');
for (const [r, n] of [['/app', 'm-donor-home'], ['/app/pre-triagem', 'm-donor-pretriagem'], ['/app/agendar', 'm-donor-agendar']]) await shot(p, r, n);

// equipe: avança até um dia com agendamento, faz o check-in e abre o atendimento
p = await session(desk, 2, 'enfermeiro@demo.com');
await p.goto(`${BASE}#/equipe`); await p.waitForTimeout(2000);
for (let d = 0; d < 10 && !(await p.getByRole('button', { name: /Fazer check-in/i }).count()); d++) {
  await p.getByRole('button', { name: /Próximo dia/i }).click(); await p.waitForTimeout(1200);
}
await p.getByRole('button', { name: /Fazer check-in/i }).first().click(); await p.waitForTimeout(1500);
await shot(p, null, 'staff-agenda2');
await p.locator('a[href*="atendimentos"]').first().click(); await p.waitForTimeout(2200);
await shot(p, null, 'staff-atendimento');

p = await session(desk, 2, 'admin@demo.com');
for (const n of ['dashboard', 'relatorios', 'agendamentos', 'unidades', 'campanhas', 'gamificacao', 'configuracoes', 'auditoria']) {
  await shot(p, n === 'dashboard' ? '/admin' : `/admin/${n}`, `admin-${n}`);
}
await browser.close();

// PNG 2x → JPEG (2000 px de largura no computador, 780 px no celular)
execFileSync('python3', ['-I', '-c', `
import sys, glob, os
from PIL import Image
raw, out = sys.argv[1], sys.argv[2]
for f in glob.glob(os.path.join(raw, '*.png')):
    n = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    w = 780 if n.startswith('m-') else 2000
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(out, n + '.jpg'), quality=88, optimize=True, progressive=True)
`, RAW, OUT], { stdio: 'inherit' });
console.log('telas em', OUT);
