/*
 * Service worker de limpeza: o endereço principal deste site já teve um app com
 * service worker próprio. Quando o navegador encontra este arquivo, ele se
 * desinstala e recarrega as abas, para que o endereço principal deixe de abrir
 * uma cópia antiga guardada no aparelho.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) client.navigate(client.url);
    })(),
  );
});
