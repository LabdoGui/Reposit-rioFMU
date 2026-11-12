/*
 * Service worker do SangueConecta (PWA).
 *
 * - Guarda só o "casco" do app (HTML, JS, CSS, fontes e ícones), para ele abrir rápido
 *   e também sem internet.
 * - Nunca guarda respostas da API (/api/): elas têm dados pessoais e de saúde (LGPD) e
 *   sempre vão direto à rede.
 * - Páginas: rede primeiro, então o app se atualiza sozinho sempre que há conexão. Sem
 *   rede, ou com a rede demorando, abre a última versão guardada.
 * - Arquivos com hash no nome (assets/): guardados no primeiro uso, nunca mudam.
 *
 * Serve ao app (escopo "/") e à demonstração publicada numa subpasta do GitHub Pages:
 * todos os caminhos são relativos ao escopo do registro.
 */
const CACHE_PREFIX = 'sangueconecta-';
const SHELL_CACHE = `${CACHE_PREFIX}casco-v1`;
const FILES_CACHE = `${CACHE_PREFIX}arquivos-v1`;
const CURRENT_CACHES = new Set([SHELL_CACHE, FILES_CACHE]);

/** Arquivos com hash de versões antigas saem do aparelho a partir deste limite. */
const MAX_FILES = 150;
/** Rede lenta: depois deste tempo, abre a versão guardada (e atualiza em segundo plano). */
const NAVIGATION_TIMEOUT_MS = 3500;

const scope = new URL(self.registration.scope);
const shellUrl = scope.href;
const apiPath = new URL('api/', scope).pathname;
const staticFiles = [
  'manifest.webmanifest',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/apple-touch-icon.png',
].map((path) => new URL(path, scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(precache().finally(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  // API: sempre a rede, nunca guardada no aparelho.
  if (url.pathname.startsWith(apiPath)) return;

  if (request.mode === 'navigate') {
    const network = fetchPage(request);
    event.waitUntil(network.saved);
    event.respondWith(networkFirst(network.response));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(event));
    return;
  }
  if (staticFiles.includes(url.href)) event.respondWith(staleWhileRevalidate(event));
});

/** Guarda o casco e os arquivos que ele carrega. Sem rede, segue sem eles. */
async function precache() {
  try {
    const response = await fetch(shellUrl, { cache: 'no-cache' });
    if (isPage(response)) {
      const html = await response.clone().text();
      const shell = await caches.open(SHELL_CACHE);
      await shell.put(shellUrl, response);
      await saveAll(assetUrlsIn(html));
    }
  } catch {
    // Sem rede agora: o casco é guardado na próxima página aberta.
  }
  await saveAll(staticFiles);
}

/** Endereços de assets/ citados no HTML (scripts, estilos e pré-carregamentos). */
function assetUrlsIn(html) {
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], shellUrl);
    if (url.origin === scope.origin && url.pathname.includes('/assets/')) urls.add(url.href);
  }
  return [...urls];
}

async function saveAll(urls) {
  const cache = await caches.open(FILES_CACHE);
  await Promise.allSettled(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    }),
  );
}

/** Busca a página na rede e, se for o HTML do app, guarda como novo casco. */
function fetchPage(request) {
  let keeping = Promise.resolve();
  const response = fetch(request).then((page) => {
    if (isPage(page)) {
      const copy = page.clone();
      keeping = caches.open(SHELL_CACHE).then((shell) => shell.put(shellUrl, copy));
    }
    return page;
  });
  // Termina quando o casco acabar de ser guardado (ou quando a rede falhar).
  const saved = response.then(() => keeping).catch(() => undefined);
  return { response, saved };
}

async function networkFirst(network) {
  try {
    return await Promise.race([network, timeout(NAVIGATION_TIMEOUT_MS)]);
  } catch {
    const shell = await caches.open(SHELL_CACHE);
    const cached = await shell.match(shellUrl);
    if (cached) return cached;
    try {
      return await network;
    } catch {
      return offlinePage();
    }
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(FILES_CACHE);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  if (response.ok && response.type === 'basic') {
    event.waitUntil(cache.put(event.request, response.clone()).then(() => trim(cache)));
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(FILES_CACHE);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then(async (response) => {
    if (response.ok && response.type === 'basic') {
      await cache.put(event.request, response.clone());
    }
    return response;
  });
  if (!cached) return network;
  event.waitUntil(network.catch(() => undefined));
  return cached;
}

async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_FILES - staticFiles.length;
  if (excess <= 0) return;
  // keys() vem na ordem em que os arquivos foram guardados: os mais antigos saem primeiro.
  const old = keys.filter((request) => !staticFiles.includes(request.url)).slice(0, excess);
  await Promise.all(old.map((request) => cache.delete(request)));
}

/** HTML do app, vindo do próprio servidor e sem redirecionamento (pode virar casco). */
function isPage(response) {
  return (
    response.ok &&
    response.type === 'basic' &&
    !response.redirected &&
    (response.headers.get('content-type') ?? '').includes('text/html')
  );
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

function offlinePage() {
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#A3123A" />
    <title>Sem conexão — SangueConecta</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; background: #faf8f6; color: #1f2328; font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; text-align: center; }
      h1 { font-size: 1.25rem; margin: 0 0 8px; }
      p { margin: 0 0 20px; color: #57606a; }
      a { display: inline-block; padding: 10px 20px; border-radius: 8px; background: #a3123a; color: #fff; font-weight: 600; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Você está sem internet</h1>
      <p>O SangueConecta abre assim que a conexão voltar.</p>
      <a href="">Tentar de novo</a>
    </main>
  </body>
</html>`;
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
