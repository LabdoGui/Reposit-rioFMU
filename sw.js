/*
 * O jogo Tycoon Empire, que ficava no endereço principal, agora está em /tycoon/
 * (com o próprio service worker). Este arquivo substitui o service worker antigo
 * da raiz: quando o navegador o encontra, ele se desinstala e recarrega as abas,
 * para que o endereço principal deixe de abrir a cópia guardada do jogo.
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
